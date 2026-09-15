import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getD1 } from "@/lib/league-data";
import { DOCUMENT_LIMIT, documentMime } from "@/lib/document-types";
const schema=z.object({id:z.string().max(100).optional(),title:z.string().trim().min(1).max(160),description:z.string().trim().max(2000),sortOrder:z.coerce.number().int().min(0).max(1000),visible:z.enum(["0","1"])});
export async function GET() {
 const auth=await requireAdminApi();if(auth.response)return auth.response;
 const rows=await getD1().prepare("SELECT id,title,description,filename,mime,size,visible,sort_order,updated_at FROM documents ORDER BY sort_order,title").all();
 return Response.json(rows.results,{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request) {
 const auth=await requireAdminApi();if(auth.response)return auth.response;
 try {
 const reader=request.body?.getReader();if(!reader)return Response.json({error:"Brak danych."},{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>DOCUMENT_LIMIT+65536){await reader.cancel();return Response.json({error:"Plik może mieć maksymalnie 10 MB."},{status:413});}chunks.push(value);}
 const body=new Uint8Array(size);let pos=0;for(const chunk of chunks){body.set(chunk,pos);pos+=chunk.length;}
 const form=await new Response(body,{headers:{"Content-Type":request.headers.get("Content-Type")||""}}).formData();
 const parsed=schema.safeParse({id:form.get("id")||undefined,title:form.get("title"),description:form.get("description")||"",sortOrder:form.get("sortOrder")||100,visible:form.get("visible")||"0"});
 if(!parsed.success)return Response.json({error:"Sprawdź nazwę, opis i kolejność dokumentu."},{status:400});
 const v=parsed.data,db=getD1();
 const existing=v.id?await db.prepare("SELECT id FROM documents WHERE id=?").bind(v.id).first():null;
 if(v.id&&!existing)return Response.json({error:"Nie znaleziono dokumentu."},{status:404});
 const file=form.get("file");const upload=file instanceof File&&file.size>0?file:null;
 if(!v.id&&!upload)return Response.json({error:"Wybierz plik dokumentu."},{status:400});
 let bytes:Uint8Array|undefined,mime="";
 if(upload){
 const ext=upload.name.split('.').pop()?.toLowerCase()||"";mime=documentMime[ext];
 if(!mime||upload.size>DOCUMENT_LIMIT)return Response.json({error:"Wybierz plik PDF, DOC, DOCX, XLS lub XLSX do 10 MB."},{status:400});
 bytes=new Uint8Array(await upload.arrayBuffer());
 const signature=Array.from(bytes.subarray(0,8));
 const valid=ext==='pdf'?String.fromCharCode(...signature.slice(0,5))==='%PDF-':ext==='docx'||ext==='xlsx'?signature[0]===80&&signature[1]===75:signature.join(',')==='208,207,17,224,161,177,26,225';
 if(!valid)return Response.json({error:"Zawartość pliku nie odpowiada wybranemu formatowi."},{status:400});
 }
 const id=v.id||crypto.randomUUID(),now=new Date().toISOString();
 const operations=[existing?db.prepare("UPDATE documents SET title=?,description=?,sort_order=?,visible=?,updated_at=? WHERE id=?").bind(v.title,v.description,v.sortOrder,Number(v.visible),now,id):db.prepare("INSERT INTO documents(id,title,description,sort_order,visible,updated_at) VALUES (?,?,?,?,?,?)").bind(id,v.title,v.description,v.sortOrder,Number(v.visible),now)];
 if(upload&&bytes){
 operations.push(db.prepare("UPDATE documents SET filename=?,mime=?,size=?,static_url=NULL WHERE id=?").bind(upload.name.replace(/[\r\n]/g,'').slice(0,180),mime,bytes.length,id));
 operations.push(db.prepare("DELETE FROM document_chunks WHERE document_id=?").bind(id));
 for(let offset=0,part=0;offset<bytes.length;offset+=524288,part++)operations.push(db.prepare("INSERT INTO document_chunks(document_id,part,content) VALUES (?,?,?)").bind(id,part,bytes.slice(offset,offset+524288).buffer));
 }
 await db.batch(operations);
 return Response.json({ok:true,id});
 }catch{return Response.json({error:"Nie udało się zapisać dokumentu. Dotychczasowy plik pozostaje bez zmian."},{status:500});}
}

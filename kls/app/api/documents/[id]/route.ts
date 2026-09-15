import { getD1 } from "@/lib/league-data";
import { getAdminUser } from "@/lib/admin-auth";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const db=getD1();
 const doc=await db.prepare("SELECT filename,mime,size,static_url,visible FROM documents WHERE id=?").bind(id).first<{filename:string;mime:string;size:number;static_url:string|null;visible:number}>();
 if(!doc||(!doc.visible&&!await getAdminUser())||!doc.filename) return new Response("Nie znaleziono dokumentu.",{status:404});
 if(doc.static_url) return Response.redirect(new URL(doc.static_url,request.url).href,302);
 const data=await db.prepare("SELECT content FROM document_chunks WHERE document_id=? ORDER BY part").bind(id).all<{content:number[]}>();
 const bytes=new Uint8Array(doc.size);let offset=0;
 for(const row of data.results) {const chunk=new Uint8Array(row.content);bytes.set(chunk,offset);offset+=chunk.length;}
 if(offset!==doc.size) return new Response("Plik jest chwilowo niedostępny.",{status:503});
 return new Response(bytes,{headers:{"Content-Type":doc.mime,"Content-Disposition":`attachment; filename="document.${doc.filename.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,"Content-Length":String(doc.size),"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

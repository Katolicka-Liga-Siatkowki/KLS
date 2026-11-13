import {env} from 'cloudflare:workers';
import {isEventOrganizer,json,eventHeaders} from '@/lib/event-access';
export async function GET(request:Request){
 if(!await isEventOrganizer())return json({error:'Brak uprawnień do pliku.'},403);
 const id=new URL(request.url).searchParams.get('id');const row=await env.DB.prepare('SELECT file_name,file_data,file_size,file_chunk_count FROM event_registrations WHERE id=?').bind(id).first<{file_name:string,file_data:ArrayBuffer|number[],file_size:number,file_chunk_count:number}>();if(!row||!row.file_name||!row.file_size)return json({error:'Do tego zgłoszenia nie dołączono pliku.'},404);
 const bytes=(value:ArrayBuffer|number[])=>Array.isArray(value)?new Uint8Array(value):new Uint8Array(value);
 let data:Uint8Array<ArrayBuffer>;
 if(row.file_chunk_count){if(row.file_chunk_count>20||row.file_size>10*1024*1024)return json({error:'Nieprawidłowy plik.'},500);data=new Uint8Array(row.file_size);let offset=0;for(let index=0;index<row.file_chunk_count;index++){const chunk=await env.DB.prepare('SELECT data FROM event_roster_chunks WHERE registration_id=? AND chunk_index=?').bind(id,index).first<{data:ArrayBuffer|number[]}>();if(!chunk)return json({error:'Plik jest niekompletny. Skontaktuj się z organizatorem.'},500);const part=bytes(chunk.data);if(offset+part.length>data.length)return json({error:'Nieprawidłowy plik.'},500);data.set(part,offset);offset+=part.length}if(offset!==row.file_size)return json({error:'Nie udało się odczytać pliku.'},500)}else data=bytes(row.file_data);
 return new Response(data,{headers:{...eventHeaders,'Content-Type':'application/octet-stream','Content-Length':String(data.byteLength),'Content-Disposition':"attachment; filename=roster; filename*=UTF-8''"+encodeURIComponent(row.file_name),'X-Content-Type-Options':'nosniff'}});
}

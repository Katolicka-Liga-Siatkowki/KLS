import {env} from 'cloudflare:workers';
import {isEventOrganizer,json,eventHeaders} from '@/lib/event-access';
export async function GET(request:Request){
 if(!await isEventOrganizer())return json({error:'Brak uprawnień do pliku.'},403);
 const id=new URL(request.url).searchParams.get('id');const row=await env.DB.prepare('SELECT file_name,file_data FROM event_registrations WHERE id=?').bind(id).first<{file_name:string,file_data:ArrayBuffer|number[]}>();if(!row)return json({error:'Nie znaleziono pliku.'},404);
 const data=Array.isArray(row.file_data)?new Uint8Array(row.file_data):new Uint8Array(row.file_data);
 return new Response(data,{headers:{...eventHeaders,'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename=roster; filename*=UTF-8''"+encodeURIComponent(row.file_name),'X-Content-Type-Options':'nosniff'}});
}

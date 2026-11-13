import {env} from 'cloudflare:workers';
import {json,eventId,originAllowed,digest,allowRequest} from '@/lib/event-access';
export async function POST(request:Request){
 if(!originAllowed(request))return json({error:'Niedozwolone żądanie.'},403);
 if(!await allowRequest(request,'registration-key',10))return json({error:'Zbyt wiele prób. Spróbuj później.'},429);
 try{const body=await request.json(),event=await eventId();if(body.eventId!==event||typeof body.token!=='string'||body.token.length>200)return json({error:'Nieprawidłowy kod.'},403);const row=await env.DB.prepare('SELECT team_name,token_hash,status FROM event_registrations WHERE id=? AND event_id=?').bind(body.id,event).first<{team_name:string,token_hash:string,status:string}>();if(!row||row.status==='rejected'||await digest(body.token)!==row.token_hash)return json({error:'Kod jest nieprawidłowy lub zgłoszenie zostało odrzucone.'},403);return json({teamName:row.team_name})}catch{return json({error:'Nieprawidłowy kod.'},400)}
}

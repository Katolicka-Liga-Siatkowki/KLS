import {env} from 'cloudflare:workers';
import {json,eventId,originAllowed,digest,allowRequest} from '@/lib/event-access';
export async function POST(request:Request){
 if(!originAllowed(request))return json({error:'Niedozwolone żądanie.'},403);
 if(!await allowRequest(request,'registration-key',10))return json({error:'Zbyt wiele prób. Spróbuj później.'},429);
 try{
  const body=await request.json(),event=await eventId();if(body.eventId!==event)return json({error:'Nieprawidłowy kod.'},403);
  if(typeof body.code==='string'){
   const token=body.code.trim().toUpperCase().replace(/\s/g,'');
   if(!/^[A-Z0-9]{1,5}-[A-HJ-NP-Z2-9]{6}$/.test(token))return json({error:'Nieprawidłowy kod.'},403);
   const row=await env.DB.prepare("SELECT id,team_name FROM event_registrations WHERE event_id=? AND token_hash=? AND status='accepted' AND team_id IS NOT NULL").bind(event,await digest(token)).first<{id:string,team_name:string}>();
   if(!row)return json({error:'Kod jest nieprawidłowy lub został zastąpiony nowym.'},403);
   return json({id:row.id,token,teamName:row.team_name});
  }
  if(typeof body.token!=='string'||body.token.length>200||typeof body.id!=='string')return json({error:'Nieprawidłowy kod.'},403);
  const row=await env.DB.prepare('SELECT team_name,token_hash,status FROM event_registrations WHERE id=? AND event_id=?').bind(body.id,event).first<{team_name:string,token_hash:string,status:string}>();if(!row||row.status==='rejected'||await digest(body.token)!==row.token_hash)return json({error:'Kod jest nieprawidłowy lub zgłoszenie zostało odrzucone.'},403);return json({id:body.id,token:body.token,teamName:row.team_name});
 }catch{return json({error:'Nieprawidłowy kod.'},400)}
}

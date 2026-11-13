import {env} from 'cloudflare:workers';
import {registrationFields,rosterType} from '@/lib/support-items';
import {json,isEventOrganizer,eventId,readableEvent,originAllowed,digest,allowRequest,limitedForm} from '@/lib/event-access';
export async function GET(request:Request){
 if(!await isEventOrganizer())return json({error:'Zgłoszenia są dostępne tylko organizatorowi.'},403);
 const event=await readableEvent(request,true);const rows=await env.DB.prepare('SELECT id,team_name,email,phone,file_name,file_size,status,created_at FROM event_registrations WHERE event_id=? ORDER BY created_at DESC').bind(event).all();return json({eventId:event,registrations:rows.results});
}
export async function POST(request:Request){
 if(!originAllowed(request))return json({error:'Niedozwolone żądanie.'},403);
 if(!await allowRequest(request,'registration',20))return json({error:'Zbyt wiele zgłoszeń. Spróbuj ponownie za 15 minut.'},429);
 try{
 const form=await limitedForm(request);if(form.get('website'))return json({error:'Nie udało się wysłać formularza.'},400);
 const fields=registrationFields(form.get('teamName'),form.get('email'),form.get('phone'));if(form.get('consent')!=='yes')throw Error('Potwierdź przekazanie danych do obsługi zgłoszenia.');
 const current=await eventId();if(form.get('eventId')!==current)return json({error:'Turniej zmienił się. Odśwież formularz.'},409);
 const file=form.get('roster');if(!(file instanceof File))throw Error('Dołącz plik ze składem drużyny.');
 const bytes=new Uint8Array(await file.arrayBuffer()),type=rosterType(file.name,bytes),fileName=file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,160)||'sklad';
 const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token);
 const result=await env.DB.prepare("INSERT INTO event_registrations (id,event_id,team_name,team_key,email,phone,file_name,file_type,file_data,file_size,token_hash,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM tournament_event WHERE id=1 AND event_id=?) AND EXISTS (SELECT 1 FROM tournament WHERE id=1)").bind(id,current,fields.teamName,fields.teamKey,fields.email,fields.phone,fileName,type,bytes.buffer,bytes.length,hash,new Date().toISOString(),current).run();
 if(!result.meta.changes)return json({error:'Zgłoszenia nie są jeszcze dostępne lub turniej się zmienił.'},409);
 return json({ok:true,id,token,teamName:fields.teamName,eventId:current},201);
 }catch(e){const message=e instanceof Error?e.message:'';if(/UNIQUE constraint/i.test(message))return json({error:'Drużyna o tej nazwie została już zgłoszona. Skontaktuj się z organizatorem.'},409);return json({error:/D1_|SQL|database/i.test(message)?'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.':message||'Nie udało się wysłać zgłoszenia.'},400)}
}
export async function PATCH(request:Request){
 if(!originAllowed(request)||!await isEventOrganizer())return json({error:'Brak uprawnień.'},403);
 const body=await request.json();if(!['pending','accepted','rejected'].includes(body.status))return json({error:'Nieprawidłowy status.'},400);
 const result=await env.DB.prepare('UPDATE event_registrations SET status=? WHERE id=? AND event_id=? AND event_id=(SELECT event_id FROM tournament_event WHERE id=1)').bind(body.status,body.id,body.eventId).run();return result.meta.changes?json({ok:true}):json({error:'Zgłoszenie nie istnieje w bieżącym turnieju.'},409);
}

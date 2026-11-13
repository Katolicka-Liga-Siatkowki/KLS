import {env} from 'cloudflare:workers';
import {registrationFields,rosterType} from '@/lib/support-items';
import {json,isEventOrganizer,eventId,readableEvent,originAllowed,digest,allowRequest,limitedForm} from '@/lib/event-access';
import {registrationMailConfigured,notifyRegistration} from '@/lib/registration-mail';
import {teamFromRegistration,removeRegisteredTeam,updateApprovedStateSql,approveRegistrationSql,removeStateSql,unlinkRegistrationSql} from '@/lib/registration-team';
import {prepareSchedule,type State} from '@/lib/tournament';
export async function GET(request:Request){
 if(!await isEventOrganizer())return json({error:'Zgłoszenia są dostępne tylko organizatorowi.'},403);
 const event=await readableEvent(request,true);const rows=await env.DB.prepare('SELECT id,team_name,email,phone,parish_name,brings_supporters,player_count,rules_accepted,file_name,file_size,status,created_at,team_id,withdrawn_at,mail_status,mail_sent_at FROM event_registrations WHERE event_id=? ORDER BY created_at DESC').bind(event).all();return json({eventId:event,registrations:rows.results,mailConfigured:registrationMailConfigured()});
}
export async function POST(request:Request){
 if(!originAllowed(request))return json({error:'Niedozwolone żądanie.'},403);
 if(!await allowRequest(request,'registration',20))return json({error:'Zbyt wiele zgłoszeń. Spróbuj ponownie za 15 minut.'},429);
 try{
  const form=await limitedForm(request);if(form.get('website'))return json({error:'Nie udało się wysłać formularza.'},400);
  const fields=registrationFields(form.get('teamName'),form.get('email'),form.get('phone'));if(form.get('consent')!=='yes')throw Error('Potwierdź przekazanie danych do obsługi zgłoszenia.');
  const parishName=typeof form.get('parishName')==='string'?String(form.get('parishName')).trim():'';if(!parishName||parishName.length>160)throw Error('Podaj nazwę parafii (maksymalnie 160 znaków).');
  if(form.get('rulesAccepted')!=='yes')throw Error('Potwierdź przeczytanie regulaminu turnieju.');
  const supporters=form.get('supporters');if(supporters!=='yes'&&supporters!=='no')throw Error('Wybierz, czy drużyna zabiera kibiców.');
  const playerCount=Number(form.get('playerCount'));if(!Number.isInteger(playerCount)||playerCount<8||playerCount>12)throw Error('Liczba zawodników musi wynosić od 8 do 12.');
  const current=await eventId();if(form.get('eventId')!==current)return json({error:'Turniej zmienił się. Odśwież formularz.'},409);
  const file=form.get('roster'),hasLegacyFile=file instanceof File&&file.size>0;
  const bytes=hasLegacyFile?new Uint8Array(await file.arrayBuffer()):new Uint8Array(),type=hasLegacyFile?rosterType(file.name,bytes):'',fileName=hasLegacyFile?(file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,160)||'sklad'):'';
  const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token),chunkSize=512*1024,chunkCount=Math.ceil(bytes.length/chunkSize);
  // The payload lives in chunks; keep a nonempty marker in the legacy BLOB
  // column to avoid empty-blob/null coercion in older SQLite bindings.
  const statements=[env.DB.prepare('INSERT INTO event_registrations (id,event_id,team_name,team_key,email,phone,parish_name,brings_supporters,player_count,rules_accepted,file_name,file_type,file_data,file_size,token_hash,created_at,file_chunk_count) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM tournament_event WHERE id=1 AND event_id=?) AND EXISTS (SELECT 1 FROM tournament WHERE id=1)').bind(id,current,fields.teamName,fields.teamKey,fields.email,fields.phone,parishName,supporters==='yes'?1:0,playerCount,1,fileName,type,new Uint8Array([0]).buffer,bytes.length,hash,new Date().toISOString(),chunkCount,current)];
  for(let i=0;i<chunkCount;i++)statements.push(env.DB.prepare('INSERT INTO event_roster_chunks (registration_id,chunk_index,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM event_registrations WHERE id=?)').bind(id,i,bytes.slice(i*chunkSize,(i+1)*chunkSize).buffer,id));
  const results=await env.DB.batch(statements);if(!results[0].meta.changes)return json({error:'Zgłoszenia nie są jeszcze dostępne lub turniej się zmienił.'},409);
  let mailStatus='pending';try{mailStatus=await notifyRegistration(id)}catch{/* The registration is saved even if the notification service fails. */}
  return json({ok:true,id,token,teamName:fields.teamName,eventId:current,mailStatus},201);
 }catch(e){const message=e instanceof Error?e.message:'';if(/UNIQUE constraint/i.test(message))return json({error:'Drużyna o tej nazwie została już zgłoszona. Skontaktuj się z organizatorem.'},409);return json({error:/D1_|SQL|database/i.test(message)?'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.':message||'Nie udało się wysłać zgłoszenia.'},400)}
}
export async function PATCH(request:Request){
 if(!originAllowed(request)||!await isEventOrganizer())return json({error:'Brak uprawnień.'},403);
 try{
  const body=await request.json();if(typeof body.id!=='string'||typeof body.eventId!=='string')return json({error:'Nieprawidłowe zgłoszenie.'},400);
  const registration=await env.DB.prepare('SELECT id,team_name,status,team_id FROM event_registrations WHERE id=? AND event_id=?').bind(body.id,body.eventId).first<{id:string,team_name:string,status:string,team_id:string|null}>();
  if(!registration)return json({error:'Nie znaleziono zgłoszenia.'},404);
  if(body.action==='retry-email')return json({ok:true,mailStatus:await notifyRegistration(body.id)});
  if(body.eventId!==await eventId())return json({error:'Archiwalne zgłoszenia są tylko do odczytu.'},409);
  if(body.action==='approve'||body.action==='withdraw'){
   const row=await env.DB.prepare('SELECT state,revision FROM tournament WHERE id=1').first<{state:string,revision:number}>();if(!row)return json({error:'Nie znaleziono turnieju.'},409);
   const state=prepareSchedule(JSON.parse(row.state) as State),marker=crypto.randomUUID();
   if(body.action==='approve'){
    if(registration.team_id&&state.teams.some(t=>t.id===registration.team_id))return json({ok:true,teamId:registration.team_id,alreadyAdded:true});
    if(registration.team_id)return json({error:'Zgłoszenie jest już powiązane z drużyną. Odśwież listę.'},409);
    const team=teamFromRegistration(state,body.id,registration.team_name,body.players,body.existingTeamId);
    const results=await env.DB.batch([env.DB.prepare(updateApprovedStateSql).bind(JSON.stringify(state),marker,row.revision,body.id,body.eventId,registration.status,body.eventId),env.DB.prepare(approveRegistrationSql).bind(team.id,body.id,body.eventId,marker)]);
    if(!results[0].meta.changes||!results[1].meta.changes)return json({error:'Dane zmieniły się na innym urządzeniu. Odśwież listę i zatwierdź ponownie.'},409);
    return json({ok:true,teamId:team.id,needsRoster:team.players.length===0});
   }
   if(!registration.team_id)return json({error:'Zgłoszenie nie jest powiązane z drużyną.'},409);
   removeRegisteredTeam(state,registration.team_id);
   const results=await env.DB.batch([env.DB.prepare(removeStateSql).bind(JSON.stringify(state),marker,row.revision),env.DB.prepare(unlinkRegistrationSql).bind(new Date().toISOString(),registration.team_id,marker)]);
   return results[0].meta.changes?json({ok:true}):json({error:'Dane zmieniły się. Odśwież listę.'},409);
  }
  if(!['pending','rejected'].includes(body.status))return json({error:'Użyj przycisku „Zatwierdź drużynę”, aby ją dodać do rozgrywek.'},400);
  if(registration.team_id)return json({error:'Najpierw użyj opcji „Usuń drużynę — rezygnacja”.'},409);
  const result=await env.DB.prepare('UPDATE event_registrations SET status=? WHERE id=? AND event_id=? AND team_id IS NULL AND event_id=(SELECT event_id FROM tournament_event WHERE id=1)').bind(body.status,body.id,body.eventId).run();return result.meta.changes?json({ok:true}):json({error:'Zgłoszenie zmieniło się. Odśwież listę.'},409);
 }catch(e){const message=e instanceof Error?e.message:'';return json({error:/D1_|SQL|database/i.test(message)?'Nie udało się zmienić zgłoszenia.':message||'Nie udało się zmienić zgłoszenia.'},400)}
}

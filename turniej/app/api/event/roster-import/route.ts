import {env} from 'cloudflare:workers';
import {isEventOrganizer,json,originAllowed,limitedForm,eventId} from '@/lib/event-access';
import {rosterType,maxRosterBytes} from '@/lib/support-items';
import {extractRosterPlayers} from '@/lib/roster-import';

export async function POST(request:Request){
 if(!originAllowed(request)||!await isEventOrganizer())return json({error:'Tylko organizator może wczytać skład.'},403);
 try{
  const form=await limitedForm(request),id=String(form.get('registrationId')||''),event=String(form.get('eventId')||'');
  if(!id||event!==await eventId())return json({error:'Turniej lub zgłoszenie zmieniło się. Odśwież stronę.'},409);
  const registration=await env.DB.prepare('SELECT id,player_count FROM event_registrations WHERE id=? AND event_id=? AND status<>?').bind(id,event,'rejected').first<{id:string,player_count:number}>();
  if(!registration)return json({error:'Nie znaleziono aktywnego zgłoszenia.'},404);
  const file=form.get('roster');if(!(file instanceof File)||!file.size||file.size>maxRosterBytes)throw Error('Wybierz plik DOCX, XLSX, CSV lub TXT do 10 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),players=extractRosterPlayers(file.name,bytes);if(!players.length)throw Error('Nie rozpoznano imion i nazwisk. Wybierz inny plik albo wpisz skład ręcznie.');
  const type=rosterType(file.name,bytes),fileName=file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,160)||'sklad',chunkSize=512*1024,chunkCount=Math.ceil(bytes.length/chunkSize);
  const statements=[env.DB.prepare('UPDATE event_registrations SET file_name=?,file_type=?,file_data=?,file_size=?,file_chunk_count=? WHERE id=? AND event_id=?').bind(fileName,type,new Uint8Array([0]).buffer,bytes.length,chunkCount,id,event),env.DB.prepare('DELETE FROM event_roster_chunks WHERE registration_id=?').bind(id)];
  for(let index=0;index<chunkCount;index++)statements.push(env.DB.prepare('INSERT INTO event_roster_chunks (registration_id,chunk_index,data) VALUES (?,?,?)').bind(id,index,bytes.slice(index*chunkSize,(index+1)*chunkSize).buffer));
  const results=await env.DB.batch(statements);if(!results[0].meta.changes)return json({error:'Nie udało się przypisać pliku do zgłoszenia.'},409);
  return json({ok:true,players,count:players.length,declaredCount:registration.player_count,fileName});
 }catch(error){const message=error instanceof Error?error.message:'';return json({error:/D1_|SQL|database/i.test(message)?'Nie udało się zapisać pliku.':message||'Nie udało się odczytać pliku.'},400)}
}

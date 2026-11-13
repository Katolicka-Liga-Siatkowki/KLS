import {env} from 'cloudflare:workers';
import {supportItems} from '@/lib/support-items';
import {json,isEventOrganizer,eventId,readableEvent,originAllowed,digest,allowRequest} from '@/lib/event-access';
export async function GET(request:Request){
 try{const admin=await isEventOrganizer(),event=await readableEvent(request,admin);const pledges=await env.DB.prepare('SELECT item_id,owner_id,team_name,quantity,delivered FROM event_pledges WHERE event_id=? ORDER BY team_name').bind(event).all();const active=await env.DB.prepare('SELECT id FROM tournament WHERE id=1').first();return json({eventId:event,items:supportItems,pledges:pledges.results,open:!!active})}catch{return json({error:'Nie można pobrać listy.'},403)}
}
export async function POST(request:Request){
 if(!originAllowed(request))return json({error:'Niedozwolone żądanie.'},403);
 try{
 const admin=await isEventOrganizer();if(!admin&&!await allowRequest(request,'pledge',240))return json({error:'Zbyt wiele zmian. Spróbuj później.'},429);
 const body=await request.json(),current=await eventId();if(body.eventId!==current)return json({error:'Turniej zmienił się. Odśwież listę.'},409);
 const item=supportItems.find(i=>i.id===body.itemId);if(!item||!Number.isInteger(body.quantity)||body.quantity<0||body.quantity>10000||typeof body.delivered!=='boolean')return json({error:'Podaj poprawną liczbę sztuk.'},400);
 let ownerId='',teamName='';
 if(body.registrationId){const row=await env.DB.prepare('SELECT id,team_name,token_hash,status FROM event_registrations WHERE id=? AND event_id=?').bind(body.registrationId,current).first<{id:string,team_name:string,token_hash:string,status:string}>();if(!row||(!admin&&(row.status==='rejected'||typeof body.token!=='string'||body.token.length>200||await digest(body.token)!==row.token_hash)))return json({error:'Brak dostępu do deklaracji tej drużyny.'},403);ownerId=row.id;teamName=row.team_name}
 else if(admin){if(typeof body.teamName!=='string'||!body.teamName.trim()||body.teamName.trim().length>100)return json({error:'Wybierz lub wpisz drużynę.'},400);teamName=body.teamName.trim();ownerId='admin:'+teamName.toLocaleLowerCase('pl-PL')}
 else return json({error:'Najpierw zgłoś drużynę w zakładce „Zgłoszenia do turnieju”.'},403);
 if(body.quantity===0){await env.DB.prepare('DELETE FROM event_pledges WHERE event_id=? AND item_id=? AND owner_id=? AND event_id=(SELECT event_id FROM tournament_event WHERE id=1)').bind(current,item.id,ownerId).run();return json({ok:true})}
 const result=await env.DB.prepare('INSERT INTO event_pledges (event_id,item_id,owner_id,team_name,quantity,delivered) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM tournament_event WHERE id=1 AND event_id=?) AND (? IS NULL OR ? <= ? - COALESCE((SELECT SUM(quantity) FROM event_pledges WHERE event_id=? AND item_id=? AND owner_id<>?),0)) ON CONFLICT(event_id,item_id,owner_id) DO UPDATE SET quantity=excluded.quantity,delivered=excluded.delivered,team_name=excluded.team_name').bind(current,item.id,ownerId,teamName,body.quantity,body.delivered?1:0,current,item.target,body.quantity,item.target,current,item.id,ownerId).run();
 return result.meta.changes?json({ok:true}):json({error:'Inna drużyna właśnie zadeklarowała te produkty. Odśwież listę i sprawdź pozostałą ilość.'},409);
 }catch{return json({error:'Nie udało się zapisać deklaracji.'},400)}
}

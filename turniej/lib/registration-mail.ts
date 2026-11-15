import {env} from 'cloudflare:workers';
export const registrationRecipient='zarzad.wpls@gmail.com';
const appUrl='https://kls-turniej.katolickaligasiatkowki.workers.dev';
export function registrationMailConfigured(){return !!(env.TOURNAMENT_GOOGLE_MAIL_URL&&env.TOURNAMENT_GOOGLE_MAIL_SECRET)||!!(env.RESEND_API_KEY&&env.REGISTRATION_MAIL_FROM)}
export async function sendCaptainCode(id:string,event:string,regenerate=false):Promise<string>{
 const row=await env.DB.prepare("SELECT email,team_name,captain_token,captain_message_id,captain_mail_status FROM event_registrations WHERE id=? AND event_id=? AND status='accepted' AND team_id IS NOT NULL AND event_id=(SELECT event_id FROM tournament_event WHERE id=1)").bind(id,event).first<{email:string,team_name:string,captain_token:string|null,captain_message_id:string|null,captain_mail_status:string}>();
 if(!row)throw Error('Kod można wysłać tylko kapitanowi zatwierdzonej drużyny.');
 if(!row.captain_token||regenerate){
  const token=crypto.randomUUID()+crypto.randomUUID(),messageId=crypto.randomUUID();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const changed=await env.DB.prepare("UPDATE event_registrations SET captain_token=?,token_hash=?,captain_message_id=?,captain_mail_status='pending',captain_mail_sent_at=NULL WHERE id=? AND event_id=? AND status='accepted' AND captain_message_id IS ? AND event_id=(SELECT event_id FROM tournament_event WHERE id=1)").bind(token,hash,messageId,id,event,row.captain_message_id).run();
  if(!changed.meta.changes)throw Error('Kod zmienił się na innym urządzeniu. Odśwież zgłoszenia.');
  row.captain_token=token;row.captain_message_id=messageId;row.captain_mail_status='pending';
 }
 if(row.captain_mail_status==='sent')return 'sent';
 if(!registrationMailConfigured())return 'pending';
 const messageId=row.captain_message_id!,subject='[WPLS] Drużyna zatwierdzona — kod do checklisty',text=`Drużyna „${row.team_name}” została zatwierdzona do turnieju.\n\nTwój prywatny kod do zaznaczania rzeczy na checkliście:\n${id}.${row.captain_token}\n\nOtwórz ${appUrl}/?tab=support i rozwiń „Masz prywatny kod deklaracji z innego urządzenia?”. Wklej powyższy kod.\n\nKod pozwala zarządzać deklaracjami tylko Twojej drużyny. Zachowaj go dla siebie. Nowy kod wygenerowany przez zarząd zastępuje poprzedni.\n\nZarząd WPLS`;
 try{
  if(env.TOURNAMENT_GOOGLE_MAIL_URL&&env.TOURNAMENT_GOOGLE_MAIL_SECRET){
   if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.TOURNAMENT_GOOGLE_MAIL_URL)||env.TOURNAMENT_GOOGLE_MAIL_SECRET.length<32)throw Error('mail configuration');
   const payload=JSON.stringify({id:messageId,kind:'captain-code',timestamp:Date.now(),to:row.email,replyTo:registrationRecipient,subject,text});
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TOURNAMENT_GOOGLE_MAIL_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)))));
   const response=await fetch(env.TOURNAMENT_GOOGLE_MAIL_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(10000)});
   if(!response.ok||(await response.json() as any).ok!==true)throw Error('mail rejected');
  }else{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'captain-code-'+messageId},body:JSON.stringify({from:env.REGISTRATION_MAIL_FROM,to:[row.email],reply_to:registrationRecipient,subject,text}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('mail rejected');
  }
  await env.DB.prepare("UPDATE event_registrations SET captain_mail_status='sent',captain_mail_sent_at=? WHERE id=? AND captain_message_id=?").bind(new Date().toISOString(),id,messageId).run();return 'sent';
 }catch{await env.DB.prepare("UPDATE event_registrations SET captain_mail_status='failed' WHERE id=? AND captain_message_id=? AND captain_mail_status<>'sent'").bind(id,messageId).run();return 'failed'}
}
export async function notifyRegistration(id:string):Promise<string>{
 if(!registrationMailConfigured())return 'pending';
 const registration=await env.DB.prepare('SELECT id,team_name,email,phone,parish_name,brings_supporters,player_count,file_name,mail_status FROM event_registrations WHERE id=?').bind(id).first<{id:string,team_name:string,email:string,phone:string,parish_name:string,brings_supporters:number,player_count:number,file_name:string,mail_status:string}>();
 if(!registration)return 'failed';if(registration.mail_status==='sent')return 'sent';
 const lock=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 const claimed=await env.DB.prepare("UPDATE event_registrations SET mail_status='sending',mail_lock=?,mail_lock_at=? WHERE id=? AND mail_status<>'sent' AND (mail_lock IS NULL OR mail_lock_at<?)").bind(lock,now,id,now-120).run();if(!claimed.meta.changes)return 'sending';
 const subject='[WPLS] Nowe zgłoszenie: '+registration.team_name.replace(/[\r\n]/g,' ');
 const legacyFile=registration.file_name?`\nPlik ze składem: ${registration.file_name}\nPobierz skład (wymaga zalogowania):\n${appUrl}/api/event/roster?id=${encodeURIComponent(id)}\n`:'';
 const text=`Nowe zgłoszenie do turnieju.\n\nDrużyna: ${registration.team_name}\nParafia: ${registration.parish_name}\nE-mail kapitana: ${registration.email}\nTelefon: ${registration.phone}\nLiczba zawodników: ${registration.player_count}\nKibice: ${registration.brings_supporters?'tak':'nie'}\nRegulamin: przeczytany i zaakceptowany\n${legacyFile}\nZatwierdź drużynę po zalogowaniu jako organizator:\n${appUrl}/?tab=registrations\n\nIdentyfikator zgłoszenia: ${id}`;
 try{
  if(env.TOURNAMENT_GOOGLE_MAIL_URL&&env.TOURNAMENT_GOOGLE_MAIL_SECRET){
   if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.TOURNAMENT_GOOGLE_MAIL_URL)||env.TOURNAMENT_GOOGLE_MAIL_SECRET.length<32)throw Error('mail configuration');
   const payload=JSON.stringify({id,timestamp:Date.now(),to:registrationRecipient,replyTo:registration.email,subject,text});
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TOURNAMENT_GOOGLE_MAIL_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)))));
   const response=await fetch(env.TOURNAMENT_GOOGLE_MAIL_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(10000)});if(!response.ok||(await response.json() as any).ok!==true)throw Error('mail rejected');
  }else{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'tournament-registration-'+id},body:JSON.stringify({from:env.REGISTRATION_MAIL_FROM,to:[registrationRecipient],reply_to:registration.email,subject,text}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('mail rejected');
  }
  await env.DB.prepare("UPDATE event_registrations SET mail_status='sent',mail_sent_at=?,mail_lock=NULL,mail_lock_at=NULL WHERE id=? AND mail_lock=?").bind(new Date().toISOString(),id,lock).run();return 'sent';
 }catch{await env.DB.prepare("UPDATE event_registrations SET mail_status='failed',mail_lock=NULL,mail_lock_at=NULL WHERE id=? AND mail_lock=?").bind(id,lock).run();return 'failed'}
}

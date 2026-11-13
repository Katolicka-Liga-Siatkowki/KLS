import {env} from 'cloudflare:workers';
export const registrationRecipient='zarzad.wpls@gmail.com';
const appUrl='https://kls-turniej.katolickaligasiatkowki.workers.dev';
export function registrationMailConfigured(){return !!(env.TOURNAMENT_GOOGLE_MAIL_URL&&env.TOURNAMENT_GOOGLE_MAIL_SECRET)||!!(env.RESEND_API_KEY&&env.REGISTRATION_MAIL_FROM)}
export async function notifyRegistration(id:string):Promise<string>{
 if(!registrationMailConfigured())return 'pending';
 const registration=await env.DB.prepare('SELECT id,team_name,email,phone,file_name,mail_status FROM event_registrations WHERE id=?').bind(id).first<{id:string,team_name:string,email:string,phone:string,file_name:string,mail_status:string}>();
 if(!registration)return 'failed';if(registration.mail_status==='sent')return 'sent';
 const lock=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
 const claimed=await env.DB.prepare("UPDATE event_registrations SET mail_status='sending',mail_lock=?,mail_lock_at=? WHERE id=? AND mail_status<>'sent' AND (mail_lock IS NULL OR mail_lock_at<?)").bind(lock,now,id,now-120).run();if(!claimed.meta.changes)return 'sending';
 const subject='[WPLS] Nowe zgłoszenie: '+registration.team_name.replace(/[\r\n]/g,' ');
 const text=`Nowe zgłoszenie do turnieju.\n\nDrużyna: ${registration.team_name}\nE-mail kapitana: ${registration.email}\nTelefon: ${registration.phone}\nPlik ze składem: ${registration.file_name}\n\nZatwierdź drużynę po zalogowaniu jako organizator:\n${appUrl}/?tab=registrations\n\nPobierz skład (wymaga zalogowania):\n${appUrl}/api/event/roster?id=${encodeURIComponent(id)}\n\nIdentyfikator zgłoszenia: ${id}`;
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

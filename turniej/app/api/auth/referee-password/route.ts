import {env} from 'cloudflare:workers';
import {getTournamentUser,sameOrigin} from '@/lib/auth';
import {equalSecret} from '@/lib/session-crypto';
import {hashPassword} from '@/lib/password-hash';
const headers={'Cache-Control':'no-store'};
async function authorized(){
 const user=await getTournamentUser();if(!user)return false;
 const row=await env.DB.prepare('SELECT owner FROM tournament WHERE id=1').first<{owner:string}>();return !!row&&row.owner===user.email.toLowerCase();
}
export async function GET(){
 if(!await authorized())return Response.json({error:'Tylko organizator może zarządzać hasłem sędziów.'},{status:403,headers});
 const row=await env.DB.prepare('SELECT version FROM tournament_referee_credentials WHERE id=1').first();
 return Response.json({configured:!!row||(env.REFEREE_PASSWORD??'').length>=12,managedInPanel:!!row},{headers});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Niedozwolone żądanie.'},{status:403,headers});
 if(!await authorized())return Response.json({error:'Tylko organizator może zmieniać hasło sędziów.'},{status:403,headers});
 try{
  const {password,confirmation}=await request.json();
  if(typeof password!=='string'||password.length<12||password.length>128||password!==confirmation)return Response.json({error:'Podaj takie samo hasło w obu polach, od 12 do 128 znaków.'},{status:400,headers});
  if(equalSecret(password,env.ADMIN_PASSWORD??''))return Response.json({error:'Hasło sędziów musi być inne niż hasło organizatora.'},{status:400,headers});
  const hash=await hashPassword(password);
  await env.DB.prepare('INSERT INTO tournament_referee_credentials (id,password_hash,version) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,version=excluded.version').bind(hash,crypto.randomUUID()).run();
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Nie udało się zapisać hasła. Spróbuj ponownie.'},{status:500,headers})}
}

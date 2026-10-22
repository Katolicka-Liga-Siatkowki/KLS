import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {equalSecret,signSession,verifySession} from './session-crypto';
export const sessionCookie='__Host-kls_turniej_session';
export const sessionSeconds=60*60*24;
export function initialOwner(){return (env.INITIAL_ADMIN_EMAIL??'').trim().toLowerCase()}
export function sameOrigin(request:Request){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin}
export async function getTournamentUser(){
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)return null;
 const session=await verifySession(token,env.ADMIN_PASSWORD??'');if(!session)return null;
 if(session.role==='organizer'&&session.email!==initialOwner())return null;
 if(session.role==='referee'){
  const row=await env.DB.prepare('SELECT state FROM tournament WHERE id=1').first<{state:string}>();
  if(!row||!JSON.parse(row.state).refs.includes(session.email))return null;
 }
 return {email:session.email,displayName:session.email,fullName:null};
}
export async function authenticate(email:string,password:string){
 if(!initialOwner()||(env.ADMIN_PASSWORD??'').length<12)return null;
 const role=email===initialOwner()?'organizer':'referee';
 const secret=role==='organizer'?env.ADMIN_PASSWORD:env.REFEREE_PASSWORD;
 if(!secret||secret.length<12||!equalSecret(secret,password))return null;
 if(role==='referee'){
  const row=await env.DB.prepare('SELECT state FROM tournament WHERE id=1').first<{state:string}>();
  if(!row||!JSON.parse(row.state).refs.includes(email))return null;
 }
 return signSession({email,role,expires:Math.floor(Date.now()/1000)+sessionSeconds},env.ADMIN_PASSWORD!);
}

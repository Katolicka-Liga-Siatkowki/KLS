import {env} from 'cloudflare:workers';
import {getTournamentUser,sameOrigin} from './auth';
export const eventHeaders={'Cache-Control':'no-store'};
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:eventHeaders});
export async function isEventOrganizer(){const user=await getTournamentUser();if(!user)return false;const row=await env.DB.prepare('SELECT owner FROM tournament WHERE id=1').first<{owner:string}>();return !!row&&row.owner===user.email.toLowerCase()}
export async function eventId(){return (await env.DB.prepare('SELECT event_id FROM tournament_event WHERE id=1').first<{event_id:string}>())!.event_id}
export async function readableEvent(request:Request,admin:boolean){const requested=new URL(request.url).searchParams.get('event');if(requested&&!admin)throw Error('Brak dostępu do archiwalnych zgłoszeń.');return requested||await eventId()}
export function originAllowed(request:Request){return sameOrigin(request)}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('')}
export async function allowRequest(request:Request,scope:string,limit:number){
 const id=await digest(scope+':'+(request.headers.get('CF-Connecting-IP')||'local')),now=Math.floor(Date.now()/1000),cutoff=now-900;
 const row=await env.DB.prepare('INSERT INTO event_request_limits (id,started_at,attempts) VALUES (?,?,1) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN started_at < ? THEN 1 ELSE attempts+1 END,started_at=CASE WHEN started_at < ? THEN excluded.started_at ELSE started_at END RETURNING attempts').bind(id,now,cutoff,cutoff).first<{attempts:number}>();
 return !!row&&row.attempts<=limit;
}
export async function limitedForm(request:Request){
 const reader=request.body?.getReader();if(!reader)throw Error('Brak formularza.');const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1200000){await reader.cancel();throw Error('Formularz jest za duży. Maksymalny rozmiar pliku to 1 MB.')}chunks.push(part.value)}
 const body=new Uint8Array(size);let pos=0;for(const chunk of chunks){body.set(chunk,pos);pos+=chunk.length}
 return new Response(body,{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
}

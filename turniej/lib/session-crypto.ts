export type Session={email:string,role:'organizer'|'referee',expires:number};
const encoder=new TextEncoder();
function encode(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decode(value:string){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
async function key(secret:string){return crypto.subtle.importKey('raw',encoder.encode('kls-turniej-session-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function signSession(session:Session,secret:string){
 if(secret.length<12)throw Error('Hasło organizatora musi mieć co najmniej 12 znaków.');
 const payload=encode(encoder.encode(JSON.stringify(session)));
 const signature=await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload));return payload+'.'+encode(new Uint8Array(signature));
}
export async function verifySession(token:string,secret:string,now=Math.floor(Date.now()/1000)):Promise<Session|null>{
 if(secret.length<12||token.length>4096)return null;
 try{const [payload,signature,...extra]=token.split('.');if(!payload||!signature||extra.length)return null;
 if(!await crypto.subtle.verify('HMAC',await key(secret),decode(signature),encoder.encode(payload)))return null;
 const s=JSON.parse(new TextDecoder().decode(decode(payload)));
 if(typeof s.email!=='string'||s.email.length>254||!['organizer','referee'].includes(s.role)||!Number.isInteger(s.expires)||s.expires<=now)return null;
 return s;
 }catch{return null}
}
export function equalSecret(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0}

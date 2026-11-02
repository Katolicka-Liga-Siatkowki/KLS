const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function derive(password:string,salt:Uint8Array<ArrayBuffer>){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt},key,256));
}
export async function hashPassword(password:string){
 if(password.length<12||password.length>128)throw Error('Hasło musi mieć od 12 do 128 znaków.');
 const salt=crypto.getRandomValues(new Uint8Array(16));return 'pbkdf2-sha256:100000:'+hex(salt)+':'+hex(await derive(password,salt));
}
export async function verifyPassword(password:string,stored:string){
 if(password.length<12||password.length>128)return false;
 const match=/^pbkdf2-sha256:100000:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(stored);if(!match)return false;
 const salt=Uint8Array.from(match[1].match(/../g)!,part=>parseInt(part,16));const actual=hex(await derive(password,salt));
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^match[2].charCodeAt(i);return diff===0;
}

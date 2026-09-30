import { env } from 'cloudflare:workers';
export async function GET(request: Request) {
 const id=new URL(request.url).searchParams.get('matchId')||'';
 if(!/^\d+$/.test(id))return Response.json({error:'Nieprawidłowy mecz.'},{status:400});
 const configured=(env as typeof env & {PROTOKOLY_BRIDGE_URL?:string}).PROTOKOLY_BRIDGE_URL || 'https://script.google.com/macros/s/AKfycbxeUGlJLKk_ZOQoRaI4G2dLdCMhKiTtnZqAC-edo3bmV6Ldpwa4MSA4OVrtWhhAbxb9Xg/exec';
 if(!configured)return Response.json({ok:true,live:null},{headers:{'Cache-Control':'no-store'}});
 try {const url=new URL(configured);if(url.protocol!=='https:'||url.hostname!=='script.google.com')throw Error('Configuration');url.searchParams.set('matchId',id);const response=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'follow'});if(!response.ok)throw Error('Upstream');const text=await response.text();if(text.length>20000)throw Error('Oversize');const value=JSON.parse(text);if(value.live&&String(value.live.matchId)!==id)throw Error('Mismatch');return Response.json(value,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Wynik na żywo chwilowo niedostępny.'},{status:502});}
}

import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {authenticate,sameOrigin,sessionCookie,sessionSeconds} from '@/lib/auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Niedozwolone żądanie.'},{status:403});
 if(!env.INITIAL_ADMIN_EMAIL||(env.ADMIN_PASSWORD??'').length<12)return Response.json({error:'Logowanie nie jest jeszcze skonfigurowane. Ustaw INITIAL_ADMIN_EMAIL i sekret ADMIN_PASSWORD w Cloudflare.'},{status:503});
 try{
  const {email,password}=await request.json();
  if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>1024)return Response.json({error:'Nieprawidłowe dane logowania.'},{status:400});
  const ip=request.headers.get('CF-Connecting-IP')??'local';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const now=Math.floor(Date.now()/1000),cutoff=now-900;
  const limit=await env.DB.prepare('INSERT INTO tournament_login_attempts (id, started_at, attempts) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN started_at < ? THEN 1 ELSE attempts+1 END, started_at=CASE WHEN started_at < ? THEN excluded.started_at ELSE started_at END RETURNING attempts').bind(hash,now,cutoff,cutoff).first<{attempts:number}>();
  if(!limit||limit.attempts>10)return Response.json({error:'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.'},{status:429});
  const token=await authenticate(email.trim().toLowerCase(),password);
  if(!token)return Response.json({error:'Nieprawidłowy adres e-mail lub hasło.'},{status:401});
  await env.DB.prepare('DELETE FROM tournament_login_attempts WHERE id=? OR started_at < ?').bind(hash,cutoff).run();
  (await cookies()).set(sessionCookie,token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:sessionSeconds});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Nie udało się zalogować. Sprawdź konfigurację bazy turnieju.'},{status:503})}
}

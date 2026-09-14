import { env } from "cloudflare:workers";
import { z } from "zod";
import { getD1 } from "@/lib/league-data";
const fields = z.object({ name:z.string().trim().min(2).max(100), email:z.string().trim().email().max(200), subject:z.string().trim().min(2).max(160), message:z.string().trim().min(5).max(5000), kind:z.enum(["contact","registration"]) });
const allowedTypes = new Set(["image/png","image/jpeg","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
function base64(bytes: Uint8Array) { let value=""; for(let i=0;i<bytes.length;i+=0x8000) value+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); return btoa(value); }
function error(message:string,status:number) { return Response.json({error:message},{status}); }
export async function POST(request:Request) {
  const reader=request.body?.getReader(); if(!reader) return error("Brak wiadomości.",400);
  let size=0; const chunks:Uint8Array[]=[];
  try {
    while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>11*1024*1024) {await reader.cancel();return error("Wiadomość jest zbyt duża.",413);} chunks.push(value); }
    const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
    let form:FormData;
    try { form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("Content-Type")||""}}).formData(); }
    catch {return error("Nieprawidłowy formularz.",400);}
    if(form.get("website")) return Response.json({ok:true});
    const parsed=fields.safeParse(Object.fromEntries(["name","email","subject","message","kind"].map(key=>[key,form.get(key)])));
    if(!parsed.success) return error("Sprawdź imię, adres e-mail, temat i treść wiadomości.",400);
    if(parsed.data.kind==="registration") {
      const section=await getD1().prepare("SELECT visible FROM site_sections WHERE section_key = 'zgloszenia'").first<{visible:number}>();
      if(!section?.visible) return error("Przyjmowanie zgłoszeń jest wyłączone.",403);
    }
    if(!env.GOOGLE_MAIL_URL||!env.GOOGLE_MAIL_SECRET) return error("Wysyłka wiadomości nie została jeszcze aktywowana przez administratora.",503);
    const url=new URL(env.GOOGLE_MAIL_URL);
    if(url.origin!=="https://script.google.com"||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return error("Nieprawidłowa konfiguracja poczty.",503);
    const files=form.getAll("attachments").filter((item):item is File=>item instanceof File&&item.size>0);
    if(files.length>5||files.some(file=>file.size>5*1024*1024||!allowedTypes.has(file.type))) return error("Dodaj maksymalnie 5 plików JPG, PNG, WebP, PDF, DOC lub DOCX, każdy do 5 MB.",400);
    if(files.reduce((sum,file)=>sum+file.size,0)>10*1024*1024) return error("Łączny rozmiar załączników może wynosić maksymalnie 10 MB.",413);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(request.headers.get("CF-Connecting-IP")||"local"));
    const bucket=`${Math.floor(Date.now()/600000)}:${base64(new Uint8Array(digest))}`;
    await getD1().prepare("DELETE FROM contact_limits WHERE expires_at < ?").bind(Date.now()).run();
    const limit=await getD1().prepare("INSERT INTO contact_limits (bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts").bind(bucket,Date.now()+600000).first<{attempts:number}>();
    if(!limit||limit.attempts>3) return error("Wysłano zbyt wiele wiadomości. Spróbuj ponownie za 10 minut.",429);
    const attachments=await Promise.all(files.map(async file=>({filename:file.name,type:file.type,content:base64(new Uint8Array(await file.arrayBuffer()))})));
    const payload=JSON.stringify({...parsed.data,attachments,id:crypto.randomUUID(),timestamp:Date.now()});
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.GOOGLE_MAIL_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const signature=base64(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload))));
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(30000)});
    const result=await response.json() as {ok?:boolean};
    if(!response.ok||result.ok!==true) return error("Nie udało się wysłać wiadomości. Spróbuj ponownie później lub napisz bezpośrednio na Gmail ligi.",502);
    return Response.json({ok:true});
  } catch {return error("Nie udało się potwierdzić wysyłki. Przed ponowną próbą upewnij się, czy wiadomość dotarła do zarządu.",502);}
}

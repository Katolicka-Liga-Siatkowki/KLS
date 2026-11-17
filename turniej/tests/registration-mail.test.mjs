import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
let status='pending',locked=false;const sent=[];
const env={DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this},async first(){if(sql==='SELECT state FROM tournament WHERE id=1')return {state:JSON.stringify({title:'Turniej testowy z ustawień'})};return {id:'11111111-1111-1111-1111-111111111111',team_name:'Asy\nHeader',parish_name:'Parafia Testowa',email:'captain@example.com',phone:'500600700',brings_supporters:1,player_count:10,file_name:'roster.pdf',mail_status:status}},async run(){if(sql.includes("mail_status='sending'")){if(status==='sent'||locked)return {meta:{changes:0}};locked=true;status='sending'}else if(sql.includes("mail_status='sent'")){status='sent';locked=false}else if(sql.includes("mail_status='failed'")){status='failed';locked=false}return {meta:{changes:1}}}}}}};
globalThis.__registrationMailEnv=env;
const code=ts.transpileModule(readFileSync(new URL('../lib/registration-mail.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'cloudflare:workers'",JSON.stringify(url('export const env=globalThis.__registrationMailEnv;')));
const {notifyRegistration,registrationMailConfigured}=await import(url(code));
test('notifications are queued without credentials; sender is fixed to WPLS and success is not duplicated',async()=>{
 assert.equal(registrationMailConfigured(),false);assert.equal(await notifyRegistration('id'),'pending');assert.equal(status,'pending');
 env.RESEND_API_KEY='test-only-placeholder';env.REGISTRATION_MAIL_FROM='test@example.com';const original=globalThis.fetch;
 globalThis.fetch=async(target,options)=>{sent.push({target,headers:options.headers,body:JSON.parse(options.body)});return Response.json({id:'provider-id'})};
 try{assert.equal(await notifyRegistration('id'),'sent');assert.equal(sent.length,1);assert(sent[0].body.text.includes('Turniej: Turniej testowy z ustawień'));assert(sent[0].body.text.includes('https://turniej.razemgramy.pl/zgloszenia'));assert(!sent[0].body.text.includes('workers.dev'));assert.deepEqual(sent[0].body.to,['zarzad.wpls@gmail.com']);assert(!sent[0].body.subject.includes('\n'));assert(sent[0].body.text.includes('api/event/roster?id='));assert(sent[0].body.text.includes('Parafia: Parafia Testowa'));assert(sent[0].body.text.includes('Liczba zawodników: 10'));assert(sent[0].body.text.includes('Kibice: tak'));assert.equal(await notifyRegistration('id'),'sent');assert.equal(sent.length,1);
 status='pending';globalThis.fetch=async()=>new Response('',{status:503});assert.equal(await notifyRegistration('id'),'failed');assert.equal(status,'failed');
 }finally{globalThis.fetch=original}
});
test('Google notifications are signed and addressed only to the WPLS board',async()=>{
 status='pending';locked=false;env.TOURNAMENT_GOOGLE_MAIL_URL='https://script.google.com/macros/s/test/exec';env.TOURNAMENT_GOOGLE_MAIL_SECRET='test-only-google-signing-secret-123456';const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(target,options)=>{calls++;assert.equal(target,env.TOURNAMENT_GOOGLE_MAIL_URL);const envelope=JSON.parse(options.body),payload=JSON.parse(envelope.payload);assert.equal(payload.to,'zarzad.wpls@gmail.com');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TOURNAMENT_GOOGLE_MAIL_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const expected=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(envelope.payload))).toString('base64');assert.equal(envelope.signature,expected);return Response.json({ok:true})};
 try{assert.equal(await notifyRegistration('11111111-1111-1111-1111-111111111111'),'sent');assert.equal(calls,1)}finally{globalThis.fetch=original}
});

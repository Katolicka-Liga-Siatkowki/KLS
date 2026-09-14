import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {test} from 'node:test';
import ts from 'typescript';
import {z} from 'zod';
const secret='test-only-secret-12345678901234567890';
function setup(visible=1,attempts=1) {
 const sent=[], cache=new Map();
 const gs={ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(p,s)=>createHmac('sha256',s).update(p).digest(),base64Encode:v=>Buffer.from(v).toString('base64'),base64Decode:v=>Buffer.from(v,'base64'),newBlob:(b,t,n)=>({bytes:b,type:t,name:n})},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:v=>sent.push(v)}};
 vm.createContext(gs);vm.runInContext(readFileSync('google-apps-script/Code.gs','utf8'),gs);
 const receive=body=>JSON.parse(gs.doPost({postData:{contents:body}}).text);
 const source=readFileSync('app/api/contact/route.ts','utf8').replace('import { env } from "cloudflare:workers";','const env=globalThis.testEnv;').replace('import { getD1 } from "@/lib/league-data";','const getD1=()=>globalThis.testDB;');
 const env={GOOGLE_MAIL_URL:'https://script.google.com/macros/s/test/exec',GOOGLE_MAIL_SECRET:secret};
 const db={prepare:sql=>({bind(){return this},async run(){},async first(){return sql.includes('site_sections')?{visible}:{attempts};}})};
 const ctx={exports:{},require:()=>({z}),testEnv:env,testDB:db,crypto:webcrypto,TextEncoder,Uint8Array,Response,Request,File,FormData,URL,AbortSignal,btoa,fetch:async(u,o)=>Response.json(receive(o.body))};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 const send=async(kind='contact')=>{const form=new FormData();for(const [k,v] of Object.entries({name:'Test KLS',email:'test@example.com',subject:'Test formularza',message:'Tylko test lokalny',kind}))form.set(k,v);form.set('attachments',new File(['pdf'],'test.pdf',{type:'application/pdf'}));return ctx.exports.POST(new Request('https://kls.example/api/contact',{method:'POST',body:form}));};
 return {sent,send,receive,env};
}
test('contact, attachment and HMAC round trip',async()=>{const r=setup();assert.equal((await r.send()).status,200);assert.equal(r.sent.length,1);assert.equal(r.sent[0].to,'katolickaligasiatkowki@gmail.com');assert.equal(r.sent[0].replyTo,'test@example.com');assert.equal(r.sent[0].attachments[0].name,'test.pdf');});
test('closed registration blocks sending, contact remains open',async()=>{const r=setup(0);assert.equal((await r.send('registration')).status,403);assert.equal(r.sent.length,0);assert.equal((await r.send()).status,200);});
test('rate limit and missing config never send',async()=>{const r=setup(1,4);assert.equal((await r.send()).status,429);delete r.env.GOOGLE_MAIL_URL;assert.equal((await r.send()).status,503);assert.equal(r.sent.length,0);});
test('forged signature rejected, duplicate signed message not resent',()=>{const r=setup();const payload=JSON.stringify({kind:'contact',name:'Test',email:'test@example.com',subject:'Test',message:'Message',attachments:[],id:webcrypto.randomUUID(),timestamp:Date.now()});const signature=createHmac('sha256',secret).update(payload).digest('base64');assert.equal(r.receive(JSON.stringify({payload,signature:'fake'})).ok,false);assert.equal(r.receive(JSON.stringify({payload,signature})).ok,true);assert.equal(r.receive(JSON.stringify({payload,signature})).ok,true);assert.equal(r.sent.length,1);});

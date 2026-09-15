import {Miniflare} from 'miniflare';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],compatibilityDate:'2026-05-22'});
try{
const db=await mf.getD1Database('DB');
await db.exec(readFileSync('drizzle/0008_documents.sql','utf8'));
let authorized=true;
const types={DOCUMENT_LIMIT:10*1024*1024,documentMime:{pdf:'application/pdf'}};
function load(file){const source=readFileSync(file,'utf8');const ctx={exports:{},require:name=>name==='zod'?{z}:name.includes('admin-auth')?{requireAdminApi:async()=>({response:authorized?null:Response.json({error:'Forbidden'},{status:403})}),getAdminUser:async()=>authorized?{}:null}:name.includes('document-types')?types:{getD1:()=>db},crypto:webcrypto,Uint8Array,ArrayBuffer,Response,Request,File,FormData,URL,console};vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports;}
const admin=load('app/api/admin/documents/route.ts'),download=load('app/api/documents/[id]/route.ts'),listing=load('app/api/documents/route.ts');
const bytes=readFileSync('public/files/oficjalne-przepisy-gry-w-pilke-siatkowa-2025-2028.pdf');
async function save(id,content,visible='1'){const f=new FormData();f.set('title','Test dokumentu');f.set('description','Opis');f.set('visible',visible);f.set('sortOrder','50');if(id)f.set('id',id);if(content)f.set('file',new File([content],'przepisy.pdf',{type:'application/pdf'}));return admin.POST(new Request('https://kls.example/api/admin/documents',{method:'POST',body:f}));}
authorized=false;assert.equal((await save(null,bytes)).status,403);authorized=true;
const r=await save(null,bytes);assert.equal(r.status,200,await r.clone().text());const {id}=await r.json();
const get=()=>download.GET(new Request('https://kls.example/api/documents/'+id),{params:Promise.resolve({id})});
const response=await get();assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
assert.equal((await save(id,null,'0')).status,200);authorized=false;assert.equal((await get()).status,404);assert.ok(!(await(await listing.GET()).json()).some(d=>d.id===id));authorized=true;
const small=Buffer.from('%PDF-1.4\nReplacement');assert.equal((await save(id,small)).status,200);assert.equal(await(await get()).text(),small.toString());
assert.equal((await save(id,Buffer.from('bad PDF'))).status,400);assert.equal(await(await get()).text(),small.toString());
console.log('PASS: administrator authorization; 3.3 MB upload/download integrity; metadata without file; hidden document protection; replacement; invalid file preserves existing content.');
}finally{await mf.dispose();}


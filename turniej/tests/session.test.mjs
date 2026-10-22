import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../lib/session-crypto.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {signSession,verifySession,equalSecret}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('sessions reject tampering, expiration and the wrong signing key',async()=>{
 const session={email:'organizer@example.com',role:'organizer',expires:2000};const secret='test-only-admin-password';
 const token=await signSession(session,secret);assert.deepEqual(await verifySession(token,secret,1000),session);
 assert.equal(await verifySession(token,secret,2000),null);assert.equal(await verifySession(token,'different-test-password',1000),null);
 const fake=btoa(JSON.stringify({...session,email:'attacker@example.com'})).replace(/=+$/,'')+'.'+token.split('.')[1];assert.equal(await verifySession(fake,secret,1000),null);
 assert.equal(await verifySession(token+'.extra',secret,1000),null);assert.equal(await verifySession('invalid',secret,1000),null);
 await assert.rejects(()=>signSession(session,'short'));
 assert(equalSecret('pass','pass'));assert(!equalSecret('pass','pass1'));assert(!equalSecret('abcd','abce'));
});

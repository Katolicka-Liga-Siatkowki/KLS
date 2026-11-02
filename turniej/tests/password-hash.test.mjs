import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../lib/password-hash.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {hashPassword,verifyPassword}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('referee passwords use random salted hashes and reject incorrect passwords and malformed hashes',async()=>{
 const password='test-only-referee-password';const a=await hashPassword(password),b=await hashPassword(password);
 assert.notEqual(a,b);assert(!a.includes(password));assert(await verifyPassword(password,a));assert(!await verifyPassword(password+'x',a));
 for(const value of ['','plain password',a.replace('100000','999999999')])assert(!await verifyPassword(password,value));
 await assert.rejects(()=>hashPassword('short'));await assert.rejects(()=>hashPassword('x'.repeat(129)));
});

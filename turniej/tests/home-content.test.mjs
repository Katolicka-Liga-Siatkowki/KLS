import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const module=async path=>{
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
};
const {initial,mutate}=await module('../lib/tournament.ts');
const {defaultHomeContent,safeArticleLink}=await module('../lib/home-content.ts');
test('whole article can be saved only by organizer and survives serialization',()=>{
 const state=initial(),content='# Tytuł\n\n## Wpisowe\n\nNowe zasady\n\n- Produkt\n\n[Kontakt](mailto:board@example.com)';
 assert.throws(()=>mutate(state,{type:'home-content',content},false));
 for(const invalid of ['', '   ', 'x'.repeat(30001),null,{}])assert.throws(()=>mutate(state,{type:'home-content',content:invalid},true));
 mutate(state,{type:'home-content',content},true);
 assert.equal(JSON.parse(JSON.stringify(state)).homeContent,content);
});
test('default article carries forward existing introduction and all later sections',()=>{
 const content=defaultHomeContent('Zmieniony wcześniej wstęp');
 assert(content.includes('Zmieniony wcześniej wstęp'));
 for(const section of ['Kiedy i gdzie','Jak się zapisać','Wpisowe','Lista rzeczy','Kibice','Kontakt','Obserwuj ligę','poprzednich edycjach'])assert(content.includes(section));
 assert(content.includes('58 1870 1045 2078 1072 1222 0003'));assert(content.includes('[zgłoszenia](/zgloszenia)'));
});
test('article links allow normal destinations and reject executable URLs',()=>{
 for(const href of ['/zgloszenia','https://example.com/','mailto:board@example.com'])assert(safeArticleLink(href));
 for(const href of ['javascript:alert(1)','data:text/html,test','//evil.example','/\\evil.example','/\nevil.example'])assert.equal(safeArticleLink(href),null);
});

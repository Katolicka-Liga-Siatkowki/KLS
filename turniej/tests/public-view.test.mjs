import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../lib/public-view.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {publicTournamentState}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('public payload hides all rosters and MVP votes without modifying staff data or scores',()=>{
 const state={title:'Turniej',refs:['ref@example.com'],teams:[{id:'a',name:'Asy',players:['Private Player']}],matches:[{id:1,a:'A',b:'B',status:'live',sets:[[21,19]],score:[4,3],mvp:['Private Player','','A:Private Player']}],slots:{A:'a'},participants:['A','B'],settings:{early:21}};
 const before=structuredClone(state),guest=publicTournamentState(state);
 assert.deepEqual(state,before);
 assert(!JSON.stringify(guest).includes('Private Player'));assert(!JSON.stringify(guest).includes('ref@example.com'));
 assert.deepEqual(guest.teams[0].players,[]);assert.deepEqual(guest.matches[0].mvp,['','','']);
 assert.deepEqual(guest.matches[0].sets,state.matches[0].sets);assert.deepEqual(guest.matches[0].score,[4,3]);assert.equal(guest.teams[0].name,'Asy');
 guest.teams[0].players.push('Another');guest.matches[0].mvp[0]='Another';assert.deepEqual(state,before);
});

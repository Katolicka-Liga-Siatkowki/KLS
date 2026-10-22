import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync(new URL('../lib/view-access.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {visibleTournamentTab,canExportTournament}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('referees have only match schedule and referee panel; export is organizer-only',()=>{
 const tabs=['overview','schedule','table','mvp','bracket','teams','ref','settings'];
 assert.deepEqual(tabs.filter(id=>visibleTournamentTab('referee',id)),['schedule','ref']);
 assert.deepEqual(tabs.filter(id=>visibleTournamentTab('viewer',id)),['overview','schedule','table','bracket','teams']);
 assert(tabs.every(id=>visibleTournamentTab('organizer',id)));
 for(const role of ['viewer','referee','setup',''])assert.equal(canExportTournament(role),false);
 assert(canExportTournament('organizer'));
});

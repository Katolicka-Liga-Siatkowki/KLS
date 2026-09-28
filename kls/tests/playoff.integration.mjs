import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import assert from 'node:assert/strict';
function load(file,extra=''){const ctx={exports:{},require:()=>({}),Date,Intl};vm.createContext(ctx);vm.runInContext(ts.transpileModule(readFileSync(file,'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports;}
const {buildPlayoff,parsePlayoffRows,seriesResult}=load('lib/playoff.ts');
const {csvRows}=load('lib/google-sheets-data.ts');
const real=csvRows(readFileSync('tests/fixtures/playoff-empty.csv','utf8'));const empty=buildPlayoff(real,'2026/2027',[],false);assert.equal(empty.rounds.length,4);assert.equal(empty.rounds[0].ties.length,4);assert.equal(empty.rounds[1].ties.length,2);assert.equal(empty.warnings.length,0);
function row(stage,home,away,a='',b='',gold){const r=Array(29).fill('');r[0]=stage;r[1]='15.04.2027, 20:00';r[4]=home;r[5]=away;r[6]=String(a);r[8]=String(b);if(gold){r[24]=String(gold[0]);r[26]=String(gold[1]);}return r;}
let rows=[row('ĆWIERĆFINAŁ 1','A','H',3,0),row('ĆWIERĆFINAŁ 2','H','A',3,2)];let matches=parsePlayoffRows(rows,'2026/2027').matches;assert.equal(matches[0].matchDate,'2027-04-15T20:00');assert.equal(seriesResult(matches,true).winner,'A');assert.equal(seriesResult(matches.slice(0,1),true).winner,undefined);
rows=[row('ĆWIERĆFINAŁ 1','A','H',3,0),row('ĆWIERĆFINAŁ 2','H','A',3,0)];matches=parsePlayoffRows(rows,'2026/2027').matches;assert.equal(seriesResult(matches,true).winner,undefined);
rows[1]=row('ĆWIERĆFINAŁ 2','H','A',3,0,[13,15]);matches=parsePlayoffRows(rows,'2026/2027').matches;assert.equal(seriesResult(matches,true).winner,'A');assert.equal(seriesResult(matches,true).loser,'H');
rows[1]=row('ĆWIERĆFINAŁ 2','H','A',3,0,[15,14]);assert.equal(seriesResult(parsePlayoffRows(rows,'2026/2027').matches,true).winner,undefined);
rows=[];for(const [a,b] of [['A','H'],['B','G'],['C','F'],['D','E']])rows.push(row('ĆWIERĆFINAŁ 1',a,b,3,0),row('ĆWIERĆFINAŁ 2',b,a,0,3));
let bracket=buildPlayoff(rows,'2026/2027',['A','B','C','D','E','F','G','H'],true);assert.equal(bracket.rounds[1].ties[0].home,'A');assert.equal(bracket.rounds[1].ties[0].away,'D');assert.equal(bracket.rounds[1].ties[1].home,'B');assert.equal(bracket.rounds[1].ties[1].away,'C');assert.equal(bracket.rounds[4].ties[0].home,'E');assert.equal(bracket.rounds[4].ties[0].away,'F');assert.equal(bracket.rounds[5].ties[0].home,'G');assert.equal(bracket.rounds[5].ties[0].away,'H');
const final=parsePlayoffRows([row('FINAŁ','A','B',3,2)],'2026/2027').matches;assert.equal(seriesResult(final,false).winner,'A');
assert.equal(parsePlayoffRows([row('FINAŁ','A','B',0,0)],'2026/2027').matches[0].status,'scheduled');
console.log('PASS: actual blank sheet, all playoff stages, reversed hosts, match points, pending and invalid golden set, golden-set winner, semifinal paths, optional placement games and single final.');

const partial=buildPlayoff([row('ĆWIERĆFINAŁ 1','B','G',3,0)],'2026/2027',['A','B','C','D','E','F','G','H'],false);assert.equal(partial.rounds[0].ties[0].matches.length,0);assert.equal(partial.rounds[0].ties[1].matches.length,1);

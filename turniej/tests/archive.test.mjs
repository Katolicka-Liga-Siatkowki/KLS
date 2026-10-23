import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const code=ts.transpileModule(readFileSync(new URL('../lib/archive-queries.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const queries=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('archive and reset are atomic; stale requests create no history and failed writes preserve the tournament',()=>{
 const script=`import sqlite3,json,sys
q=json.load(open(sys.argv[1]))
db=sqlite3.connect(':memory:')
db.execute('CREATE TABLE tournament(id INTEGER PRIMARY KEY,owner TEXT,revision INTEGER,state TEXT)')
db.executescript(q['migration'])
old=json.dumps({'title':'Previous','teams':[{'name':'Asy','players':['Player'],'logo':'logo'}],'matches':[{'sets':[[21,15]],'mvp':['Player']}],'slots':{'A':'a'}})
new=json.dumps({'matches':[],'slots':{}})
db.execute('INSERT INTO tournament VALUES(1,?,?,?)',('owner',7,old));db.commit()
def run(id,rev,owner='owner',state=new):
 with db:
  db.execute(q['archive'],(id,'2026-10-23T00:00:00Z',rev,owner))
  return db.execute(q['reset'],(state,rev,owner)).rowcount
assert run('one',7)==1
assert db.execute('SELECT state FROM tournament_history').fetchone()[0]==old
assert db.execute('SELECT revision,state FROM tournament').fetchone()==(8,new)
assert run('stale',7)==0
assert run('unauthorized',8,'other')==0
assert db.execute('SELECT COUNT(*) FROM tournament_history').fetchone()[0]==1
# Force an update failure using a trigger, verifying transactional rollback.
db.execute("CREATE TRIGGER stop_reset BEFORE UPDATE ON tournament BEGIN SELECT RAISE(ABORT, 'failure'); END;")
count=db.execute('SELECT COUNT(*) FROM tournament_history').fetchone()[0]
try: run('rollback',8)
except sqlite3.IntegrityError: pass
assert db.execute('SELECT COUNT(*) FROM tournament_history').fetchone()[0]==count
assert db.execute('SELECT revision,state FROM tournament').fetchone()==(8,new)
`;
 const dir=mkdtempSync(join(tmpdir(),'kls-archive-')),input=join(dir,'input.json');
 try{writeFileSync(input,JSON.stringify({archive:queries.archiveTournamentSql,reset:queries.resetTournamentSql,migration:readFileSync(new URL('../drizzle/0002_tournament_history.sql',import.meta.url),'utf8')}));
 const result=spawnSync('python3',['-c',script,input],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr||String(result.error||''));
 }finally{rmSync(dir,{recursive:true,force:true})}
});

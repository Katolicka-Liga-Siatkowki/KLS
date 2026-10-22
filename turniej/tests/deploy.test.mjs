import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('deployment provisions only its own database and applies schema before building and publishing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kls-turniej-deploy-'));
 try{
  for(const p of ['scripts','node_modules/wrangler/bin','node_modules/vinext/dist'])await mkdir(join(dir,p),{recursive:true});
  await copyFile(new URL('../scripts/deploy.mjs',import.meta.url),join(dir,'scripts/deploy.mjs'));
  await writeFile(join(dir,'wrangler.json'),JSON.stringify({name:'kls-turniej',account_id:'test-account',d1_databases:[{binding:'DB',database_name:'kls-turniej-db'}]}));
  await writeFile(join(dir,'node_modules/wrangler/bin/wrangler.js'),`const fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync('calls.log',JSON.stringify(a)+'\\n');if(a[0]==='d1'&&a[1]==='list')fs.writeSync(1,JSON.stringify(fs.existsSync('created')?[{name:'kls-turniej-db',uuid:'fixture-database-id'}]:[]));if(a[0]==='d1'&&a[1]==='execute')fs.writeSync(1,JSON.stringify([{results:[{temporary_count:fs.existsSync('test-data')?1:0}]}]));if(a[0]==='d1'&&a[1]==='create')fs.writeFileSync('created','1');`);
  await writeFile(join(dir,'node_modules/vinext/dist/cli.js'),`require('node:fs').appendFileSync('calls.log',JSON.stringify(['build'])+'\\n');`);
  const run=()=>spawnSync(process.execPath,['scripts/deploy.mjs'],{cwd:dir,encoding:'utf8'});
  const r=run();assert.equal(r.status,0,r.stderr+' CALLS: '+await readFile(join(dir,'calls.log'),'utf8'));
  const calls=(await readFile(join(dir,'calls.log'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls.map(a=>a[0]==='d1'?a[1]:a[0]),['list','create','list','migrations','execute','build','deploy']);
  assert(calls.some(a=>a[1]==='create'&&a[2]==='kls-turniej-db'));assert(!calls.flat().includes('kls-db'));
  assert.equal(JSON.parse(await readFile(join(dir,'wrangler.json'),'utf8')).d1_databases[0].database_id,'fixture-database-id');
  await writeFile(join(dir,'calls.log'),'');assert.equal(run().status,0);assert(!(await readFile(join(dir,'calls.log'),'utf8')).includes('"create"'));
  await writeFile(join(dir,'test-data'),'1');await writeFile(join(dir,'calls.log'),'');assert.notEqual(run().status,0);const guarded=await readFile(join(dir,'calls.log'),'utf8');assert(!guarded.includes('\"build\"')&&!guarded.includes('\"deploy\"'));await rm(join(dir,'test-data'));
  const c=JSON.parse(await readFile(join(dir,'wrangler.json'),'utf8'));c.name='kls';await writeFile(join(dir,'wrangler.json'),JSON.stringify(c));await writeFile(join(dir,'calls.log'),'');assert.notEqual(run().status,0);assert.equal(await readFile(join(dir,'calls.log'),'utf8'),'');
 }finally{await rm(dir,{recursive:true,force:true})}
});

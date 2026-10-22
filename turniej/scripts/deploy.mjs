import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const configPath=new URL('../wrangler.json',import.meta.url);
const config=JSON.parse(await readFile(configPath,'utf8'));
if(config.name!=='kls-turniej'||config.d1_databases[0]?.database_name!=='kls-turniej-db')throw Error('Nieprawidłowy projekt lub baza turnieju.');
function run(args,{capture=false}={}){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',stdio:capture?['ignore','pipe','inherit']:'inherit',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:config.account_id,WRANGLER_SEND_METRICS:'false'}});
 if(r.error)throw r.error;if(r.status!==0)throw Error(`Polecenie nie powiodło się: ${args.slice(0,3).join(' ')}`);return r.stdout;
}
const cli='node_modules/wrangler/bin/wrangler.js';
const list=()=>JSON.parse(run([cli,'d1','list','--json','--config','wrangler.json'],{capture:true}));
let db=list().find(d=>d.name==='kls-turniej-db');
if(!db){run([cli,'d1','create','kls-turniej-db','--config','wrangler.json','--update-config=false']);db=list().find(d=>d.name==='kls-turniej-db')}
if(!db?.uuid)throw Error('Nie udało się uzyskać identyfikatora bazy turnieju.');
config.d1_databases[0].database_id=db.uuid;await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
run([cli,'d1','migrations','apply','DB','--remote','--config','wrangler.json']);
const inspection=JSON.parse(run([cli,'d1','execute','DB','--remote','--json','--config','wrangler.json','--command',"SELECT COUNT(*) AS temporary_count FROM tournament, json_each(tournament.state, '$.teams') AS entry WHERE json_extract(entry.value, '$.temporary') = 1"],{capture:true}));
if(!Array.isArray(inspection)||inspection.length!==1||inspection[0].results?.[0]?.temporary_count!==0)throw Error('Baza zawiera dane testowe lub nie udało się sprawdzić jej zawartości. Przerwano publikację.');
run(['node_modules/vinext/dist/cli.js','build']);
run([cli,'deploy','--config','dist/server/wrangler.json']);

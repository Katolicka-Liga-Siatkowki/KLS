import {readFile,writeFile,appendFile} from 'node:fs/promises';
const log=await readFile('deploy.log','utf8');
const url=log.match(/https:\/\/kls-turniej\.[a-z0-9-]+\.workers\.dev\b/i)?.[0];
if(!url)throw Error('Wrangler nie zwrócił publicznego adresu nowego Workera.');
let lastError;
for(let i=0;i<15;i++){
 try{
  const page=await fetch(url);if(!page.ok)throw Error(`Strona: HTTP ${page.status}`);
  const response=await fetch(url+'/api/tournament',{headers:{'Cache-Control':'no-cache'}});if(!response.ok)throw Error(`API: HTTP ${response.status}`);
  const data=await response.json();if(data.role!=='viewer')throw Error('Anonimowy użytkownik ma nieprawidłową rolę.');
  if(data.state.teams.some(t=>t.temporary))throw Error('Publiczne API zawiera drużyny testowe.');
  const write=await fetch(url+'/api/tournament',{method:'POST',headers:{'Content-Type':'application/json','Origin':url},body:JSON.stringify({type:'setup'})});
  if(write.status!==401)throw Error(`Anonimowa edycja nie została zablokowana: HTTP ${write.status}`);
  const result={url,publicRead:true,anonymousWriteBlocked:true,temporaryTeams:0};
  await writeFile('deployment-result.json',JSON.stringify(result,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Turniej opublikowany\n\n${url}\n\nPubliczny odczyt: OK. Anonimowa edycja: zablokowana. Drużyny testowe: 0.\n`);
  console.log(JSON.stringify(result));process.exit(0);
 }catch(e){lastError=e;if(i<14)await new Promise(r=>setTimeout(r,4000))}
}
throw lastError;

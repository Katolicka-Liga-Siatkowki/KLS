import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=ts.transpileModule(readFileSync(new URL('../lib/tournament.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {initial,mutate,eligible,standings,setWins,matchComplete,usesTwoSets,winner,activeLetters,qualifierCount,prepareSchedule,mvpRanking}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function setup(count=16){const s=initial();for(const l of 'ABCDEFGHIJKLMNOP'.slice(0,count)){mutate(s,{type:'team',name:l,players:l+'1\n'+l+'2'},true);mutate(s,{type:'assign',letter:l,teamId:s.teams.at(-1).id},true)}return s}
function finish(s,m){mutate(s,{type:'start',id:m.id,court:1},true);for(let set=0;set<2;set++)for(let p=0;p<m.rules.target;p++)mutate(s,{type:'point',id:m.id,side:0},true);mutate(s,{type:'mvp',id:m.id,values:[s.teams.find(t=>t.id===s.slots[m.b]).players[0],s.teams.find(t=>t.id===s.slots[m.a]).players[0],m.a+':'+s.teams.find(t=>t.id===s.slots[m.a]).players[0]]},true);mutate(s,{type:'finish',id:m.id},true)}
test('40 reference matches give every letter five matches',()=>{const s=setup();assert.equal(s.matches.length,40);assert.equal(s.matches[7].a,'O');for(const l of 'ABCDEFGHIJKLMNOP')assert.equal(s.matches.filter(m=>m.a===l||m.b===l).length,5)});
test('teams and court cannot overlap, later eligible match can start',()=>{const s=setup();mutate(s,{type:'start',id:1,court:1},true);assert(!eligible(s).some(m=>m.a==='A'||m.b==='A'||m.a==='H'||m.b==='H'));assert.throws(()=>mutate(s,{type:'start',id:9,court:2},true));assert.throws(()=>mutate(s,{type:'start',id:2,court:1},true));mutate(s,{type:'start',id:2,court:2},true);assert.equal(s.matches.filter(m=>m.status==='live').length,2)});
test('deuce, undo across set boundary and tiebreak to 15',()=>{const s=setup();mutate(s,{type:'start',id:1,court:1},true);const m=s.matches[0];for(let p=0;p<20;p++){mutate(s,{type:'point',id:1,side:0},true);mutate(s,{type:'point',id:1,side:1},true)}mutate(s,{type:'point',id:1,side:0},true);assert.equal(m.sets.length,0);mutate(s,{type:'point',id:1,side:0},true);assert.deepEqual(m.sets,[[22,20]]);mutate(s,{type:'undo',id:1},true);assert.deepEqual(m.score,[21,20]);assert.equal(m.sets.length,0);mutate(s,{type:'point',id:1,side:0},true);for(let p=0;p<21;p++)mutate(s,{type:'point',id:1,side:1},true);for(let p=0;p<15;p++)mutate(s,{type:'point',id:1,side:0},true);assert.deepEqual(setWins(m),[2,1]);assert.deepEqual(m.sets.at(-1),[15,0]);assert.throws(()=>mutate(s,{type:'point',id:1,side:0},true));assert.throws(()=>mutate(s,{type:'finish',id:1},true))});
test('MVP captain must nominate opponent, referee can select either side',()=>{const s=setup();mutate(s,{type:'start',id:1,court:1},true);assert.throws(()=>mutate(s,{type:'mvp',id:1,values:['A1','A1','A:A1']},true));mutate(s,{type:'mvp',id:1,values:['H1','A1','H:H1']},false);assert.deepEqual(s.matches[0].mvp,['H1','A1','H:H1']);assert.throws(()=>mutate(s,{type:'refs',emails:[]},false))});
test('full elimination, confirmed points, quarterfinal seeding and medal matches',()=>{const s=setup();for(const m of [...s.matches])finish(s,m);assert.equal(s.matches.length,40);mutate(s,{type:'settings',value:{...s.settings,win20:3,win21:2,loss12:1,confirmed:true}},true);const ranked=standings(s);assert.equal(s.matches.length,44);assert.equal(s.matches[40].a,ranked[0].letter);assert.equal(s.matches[40].b,ranked[7].letter);assert.equal(s.matches[42].a,ranked[1].letter);assert.equal(s.matches[42].b,ranked[6].letter);assert.equal(ranked.reduce((a,r)=>a+r.pts,0),120);for(const m of s.matches.filter(m=>m.stage==='Ćwierćfinał'))finish(s,m);assert.equal(s.matches.length,46);for(const m of s.matches.filter(m=>m.stage==='Półfinał')){finish(s,m);assert.equal(m.rules.target,25)}assert.equal(s.matches.length,48);assert.equal(s.matches[46].stage,'O 3. miejsce');assert.equal(s.matches[47].stage,'Finał');for(const m of s.matches.slice(46))finish(s,m);assert.equal(s.matches.filter(m=>m.status==='done').length,48);assert.throws(()=>mutate(s,{type:'settings',value:{...s.settings,win20:5}},true))});

test('balanced distinct opponents and full medal bracket for every field size 2–16',()=>{
 for(let n=2;n<=16;n++){
  const s=setup(n),games=n<=6?n-1:n%2===0?5:4;
  assert.equal(s.matches.length,n*games/2,`match count for ${n}`);
  const unique=new Set();
  for(const m of s.matches){assert.notEqual(m.a,m.b);const pair=[m.a,m.b].sort().join('');assert(!unique.has(pair),`duplicate ${pair} in ${n}`);unique.add(pair)}
  for(const l of activeLetters(s))assert.equal(s.matches.filter(m=>m.a===l||m.b===l).length,games,`degree ${l} in ${n}`);
  assert.equal(standings(s).length,n);
  mutate(s,{type:'settings',value:{...s.settings,win20:3,win21:2,loss12:1,confirmed:true}},true);
  const eliminationCount=s.matches.length;
  for(const m of [...s.matches])finish(s,m);
  const ranked=standings(s).map(r=>r.letter),q=qualifierCount(s);
  const first=s.matches[eliminationCount];
  assert.equal(first.a,ranked[0]);assert.equal(first.b,ranked[q-1]);
  assert.equal(first.stage,q===8?'Ćwierćfinał':q===4?'Półfinał':'Finał');
  while(s.matches.some(m=>m.status==='waiting'))finish(s,s.matches.find(m=>m.status==='waiting'));
  assert.equal(s.matches.length,eliminationCount+(q===8?8:q===4?4:1));
  assert.equal(s.matches.filter(m=>m.stage==='O 3. miejsce').length,q>=4?1:0);
 }
});
test('assignment removal recomputes automatically and locks after first serve',()=>{
 const s=setup(10);mutate(s,{type:'assign',letter:'C',teamId:''},true);
 assert.equal(s.matches.length,18);assert.equal(standings(s).length,9);assert(!s.matches.some(m=>m.a==='C'||m.b==='C'));
 const m=s.matches[0];mutate(s,{type:'start',id:m.id,court:1},true);
 const before=JSON.stringify(s);
 assert.throws(()=>mutate(s,{type:'assign',letter:'A',teamId:''},true));assert.equal(JSON.stringify(s),before);
 assert.throws(()=>mutate(s,{type:'team',name:'Late team',players:'Late player'},true));
});
test('legacy unstarted tournaments adapt; started records and match IDs stay untouched',()=>{
 const s=setup();delete s.participants;s.slots.C='';prepareSchedule(s);assert.equal(s.matches.length,30);assert.equal(activeLetters(s).length,15);
 const played=setup();delete played.participants;const m=played.matches[0];mutate(played,{type:'start',id:m.id,court:1},true);delete played.participants;
 const old=JSON.stringify(played);prepareSchedule(played);assert.equal(JSON.stringify(played),old);assert.equal(activeLetters(played).length,16);
 const empty=initial();empty.settings.confirmed=true;mutate(empty,{type:'settings',value:empty.settings},true);assert.equal(empty.matches.length,0);
});
test('three elimination courts switch to two from quarterfinals, including legacy settings',()=>{
 const s=setup();assert.equal(s.settings.courts,3);assert.equal(s.settings.knockoutCourts,2);
 mutate(s,{type:'start',id:1,court:3},true);
 assert.throws(()=>mutate(s,{type:'settings',value:{...s.settings,courts:2}},true));
 const t=setup();mutate(t,{type:'settings',value:{...t.settings,confirmed:true}},true);
 for(const m of [...t.matches])finish(t,m);
 const q=t.matches.find(m=>m.stage==='Ćwierćfinał');assert.throws(()=>mutate(t,{type:'start',id:q.id,court:3},true));
 mutate(t,{type:'start',id:q.id,court:2},true);assert.equal(q.court,2);
 const legacy=setup();delete legacy.settings.knockoutCourts;legacy.settings.courts=2;prepareSchedule(legacy);
 assert.equal(legacy.settings.courts,3);assert.equal(legacy.settings.knockoutCourts,2);
});
const demoCode=ts.transpileModule(readFileSync(new URL('../lib/demo-teams.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("from './tournament'",`from 'data:text/javascript;base64,${Buffer.from(source).toString('base64')}'`);
const {addDemoTeams,clearDemoTeams,completeDemoEliminations}=await import('data:text/javascript;base64,'+Buffer.from(demoCode).toString('base64'));
test('sample data adds exactly 16 unassigned squads and cleans test results while preserving real teams',()=>{
 const s=initial();mutate(s,{type:'team',name:'Prawdziwa drużyna',players:'Prawdziwy zawodnik'},true);const real=structuredClone(s.teams[0]);
 addDemoTeams(s);addDemoTeams(s);assert.equal(s.teams.length,17);assert.equal(s.teams.filter(t=>t.temporary).length,16);assert.equal(s.matches.length,0);
 for(const t of s.teams.filter(t=>t.temporary))assert.equal(t.players.length,6);
 for(const l of 'AB')mutate(s,{type:'assign',letter:l,teamId:'demo-team-'+l},true);
 finish(s,s.matches[0]);clearDemoTeams(s);
 assert.deepEqual(s.teams,[real]);assert.equal(s.matches.length,0);assert.equal(Object.keys(s.slots).length,0);
});
test('cleanup refuses to discard completed genuine matches',()=>{
 const s=setup(2);finish(s,s.matches[0]);const before=JSON.stringify(s);assert.throws(()=>clearDemoTeams(s));assert.equal(JSON.stringify(s),before);
});
test('no deuce ends at 21:20 and tiebreak 15:14, with undo and rule snapshots',()=>{
 const s=setup();mutate(s,{type:'settings',value:{...s.settings,winByTwo:false}},true);mutate(s,{type:'start',id:1,court:1},true);
 const m=s.matches[0];
 for(let p=0;p<20;p++){mutate(s,{type:'point',id:1,side:0},true);mutate(s,{type:'point',id:1,side:1},true)}
 mutate(s,{type:'point',id:1,side:0},true);assert.deepEqual(m.sets,[[21,20]]);
 mutate(s,{type:'undo',id:1},true);assert.equal(m.sets.length,0);assert.deepEqual(m.score,[20,20]);
 mutate(s,{type:'point',id:1,side:0},true);
 for(let p=0;p<21;p++)mutate(s,{type:'point',id:1,side:1},true);
 mutate(s,{type:'settings',value:{...s.settings,winByTwo:true}},true);assert.equal(m.rules.winByTwo,false);
 for(let p=0;p<14;p++){mutate(s,{type:'point',id:1,side:0},true);mutate(s,{type:'point',id:1,side:1},true)}
 mutate(s,{type:'point',id:1,side:0},true);assert.deepEqual(m.sets.at(-1),[15,14]);assert.deepEqual(setWins(m),[2,1]);
 mutate(s,{type:'start',id:2,court:2},true);assert.equal(s.matches[1].rules.winByTwo,true);
 const bad={...s.settings,winByTwo:'no'};assert.throws(()=>mutate(s,{type:'settings',value:bad},true));
});
test('each stage has independent advantage rules and keeps its starting rules',()=>{
 const s=setup(8);mutate(s,{type:'settings',value:{...s.settings,confirmed:true,early:2,late:2,winByTwoElimination:false,winByTwoQuarterfinal:true,winByTwoKnockout:false}},true);
 for(const m of [...s.matches]){finish(s,m);assert.equal(m.rules.winByTwo,false)}
 for(const m of s.matches.filter(m=>m.stage==='Ćwierćfinał')){finish(s,m);assert.equal(m.rules.winByTwo,true)}
 const semi=s.matches.find(m=>m.stage==='Półfinał');mutate(s,{type:'start',id:semi.id,court:1},true);assert.equal(semi.rules.winByTwo,false);
 mutate(s,{type:'settings',value:{...s.settings,winByTwoKnockout:true}},true);assert.equal(semi.rules.winByTwo,false);
 for(let i=0;i<4;i++)mutate(s,{type:'point',id:semi.id,side:0},true);
 mutate(s,{type:'mvp',id:semi.id,values:[s.teams.find(t=>t.id===s.slots[semi.b]).players[0],s.teams.find(t=>t.id===s.slots[semi.a]).players[0],semi.a+':'+s.teams.find(t=>t.id===s.slots[semi.a]).players[0]]},true);mutate(s,{type:'finish',id:semi.id},true);
 for(const m of s.matches.filter(m=>m.stage==='Półfinał'&&m.status==='waiting')){finish(s,m);assert.equal(m.rules.winByTwo,true)}
 for(const m of s.matches.filter(m=>['Finał','O 3. miejsce'].includes(m.stage))){finish(s,m);assert.equal(m.rules.winByTwo,true)}
 assert.throws(()=>mutate(s,{type:'settings',value:{...s.settings,winByTwoQuarterfinal:'no'}},true));
});
test('phase point targets and tiebreaks remain editable during competition',()=>{
 const s=setup(8);mutate(s,{type:'settings',value:{...s.settings,confirmed:true,early:2,quarter:3,late:4,tieElimination:2,tieQuarterfinal:3,tieKnockout:4}},true);
 for(const m of [...s.matches]){finish(s,m);assert.equal(m.rules.target,2);assert.equal(m.rules.tie,2)}
 const q=s.matches.find(m=>m.stage==='Ćwierćfinał');mutate(s,{type:'start',id:q.id,court:1},true);assert.equal(q.rules.target,3);
 mutate(s,{type:'settings',value:{...s.settings,quarter:5,tieQuarterfinal:6,winByTwoQuarterfinal:false}},true);
 assert.equal(q.rules.target,3);assert.equal(q.rules.tie,3);assert.equal(q.rules.winByTwo,true);
 for(let i=0;i<6;i++)mutate(s,{type:'point',id:q.id,side:0},true);
 mutate(s,{type:'mvp',id:q.id,values:[s.teams.find(t=>t.id===s.slots[q.b]).players[0],s.teams.find(t=>t.id===s.slots[q.a]).players[0],q.a+':'+s.teams.find(t=>t.id===s.slots[q.a]).players[0]]},true);mutate(s,{type:'finish',id:q.id},true);
 for(const m of s.matches.filter(m=>m.stage==='Ćwierćfinał'&&m.status==='waiting')){finish(s,m);assert.equal(m.rules.target,5);assert.equal(m.rules.tie,6);assert.equal(m.rules.winByTwo,false)}
 mutate(s,{type:'settings',value:{...s.settings,late:7,tieKnockout:8}},true);
 for(const m of s.matches.filter(m=>m.stage==='Półfinał')){finish(s,m);assert.equal(m.rules.target,7);assert.equal(m.rules.tie,8)}
});

test('MVP totals count each nomination and one match per nominated player across regular matches',()=>{
 const s=setup(3);s.teams[0].players=['Jan: Kowalski'];s.teams[1].players=['Jan: Kowalski'];
 const base=s.matches[0];s.matches=[{...base,id:1,a:'A',b:'B',status:'done',mvp:['Jan: Kowalski','Jan: Kowalski','A:Jan: Kowalski']},{...base,id:2,a:'A',b:'B',stage:'Eliminacje',status:'done',mvp:['Jan: Kowalski','Jan: Kowalski','B:Jan: Kowalski']},{...base,id:3,a:'A',b:'B',status:'live',mvp:['Jan: Kowalski','Jan: Kowalski','A:Jan: Kowalski']}];
 const r=mvpRanking(s);assert.equal(r.length,2);assert.deepEqual(r.map(x=>x.total),[3,3]);assert.deepEqual(r.map(x=>x.rank),[1,1]);
 for(const row of r){assert.equal(row.matches,2);assert.equal(row.captainVotes,2);assert.equal(row.refereeVotes,1)}
 s.matches[1].mvp[2]='A:Jan: Kowalski';const ranked=mvpRanking(s);assert.equal(ranked[0].letter,'A');assert.equal(ranked[0].total,4);assert.equal(ranked[1].rank,2);
 s.matches=[];assert.deepEqual(mvpRanking(s),[]);
});
test('live table follows points, completed sets and provisional wins without changing official results',()=>{
 const s=setup(4);mutate(s,{type:'settings',value:{...s.settings,early:3,confirmed:true,win20:3,win21:2,loss12:1}},true);
 const m=s.matches[0];mutate(s,{type:'start',id:m.id,court:1},true);mutate(s,{type:'point',id:m.id,side:0},true);
 let row=standings(s,{live:true}).find(r=>r.letter===m.a);assert.equal(row.pw,1);assert.equal(row.live,true);assert.equal(row.pts,0);assert.equal(row.played,0);
 assert.equal(standings(s).find(r=>r.letter===m.a).pw,0);
 for(let i=0;i<2;i++)mutate(s,{type:'point',id:m.id,side:0},true);
 row=standings(s,{live:true}).find(r=>r.letter===m.a);assert.equal(row.sw,1);assert.equal(row.pw,3);assert.equal(row.pts,0);
 for(let i=0;i<3;i++)mutate(s,{type:'point',id:m.id,side:0},true);
 row=standings(s,{live:true}).find(r=>r.letter===m.a);assert.equal(row.pts,3);assert.equal(row.w,1);assert.equal(row.played,1);assert.equal(row.awaitingApproval,true);
 assert.equal(standings(s).find(r=>r.letter===m.a).pts,0);assert(!s.matches.some(m=>m.stage!=='Eliminacje'));
 mutate(s,{type:'undo',id:m.id},true);row=standings(s,{live:true}).find(r=>r.letter===m.a);assert.equal(row.pts,0);assert.equal(row.played,0);assert.equal(row.pw,5);assert.equal(row.awaitingApproval,false);
 mutate(s,{type:'point',id:m.id,side:0},true);
 mutate(s,{type:'mvp',id:m.id,values:[s.teams.find(t=>t.id===s.slots[m.b]).players[0],s.teams.find(t=>t.id===s.slots[m.a]).players[0],m.a+':'+s.teams.find(t=>t.id===s.slots[m.a]).players[0]]},true);mutate(s,{type:'finish',id:m.id},true);
 assert.deepEqual(standings(s,{live:true}),standings(s));assert.equal(standings(s)[0].pts,3);
});
test('live table merges all courts and excludes knockout match scores',()=>{
 const s=setup(6);for(let i=0;i<3;i++){const m=s.matches[i];mutate(s,{type:'start',id:m.id,court:i+1},true);mutate(s,{type:'point',id:m.id,side:i%2},true)}
 const rows=standings(s,{live:true});assert.equal(rows.filter(r=>r.live).length,6);assert.equal(rows.reduce((sum,r)=>sum+r.pw,0),3);assert.equal(rows.reduce((sum,r)=>sum+r.pl,0),3);
 s.matches[0].stage='Ćwierćfinał';assert.equal(standings(s,{live:true}).reduce((sum,r)=>sum+r.pw,0),2);
});

test('finishing test eliminations preserves completed results and never plays knockout matches',()=>{
 const s=initial();addDemoTeams(s);for(const l of 'ABCDEFGHIJKLMNOP')mutate(s,{type:'assign',letter:l,teamId:'demo-team-'+l},true);
 mutate(s,{type:'settings',value:{...s.settings,early:2,tie:2,confirmed:true}},true);
 finish(s,s.matches[0]);const previous=JSON.stringify(s.matches[0]);
 mutate(s,{type:'start',id:2,court:1},true);mutate(s,{type:'point',id:2,side:0},true);
 assert.equal(completeDemoEliminations(s),39);assert.equal(JSON.stringify(s.matches[0]),previous);
 assert.equal(s.matches.filter(m=>m.stage==='Eliminacje'&&m.status==='done').length,40);
 assert(s.matches.slice(0,40).every(m=>m.mvp.every(Boolean)&&setWins(m).includes(2)));
 assert.equal(s.matches.filter(m=>m.stage==='Ćwierćfinał').length,4);assert(s.matches.filter(m=>m.stage!=='Eliminacje').every(m=>m.status==='waiting'));
 assert.equal(completeDemoEliminations(s),0);
 const real=setup(2);assert.throws(()=>completeDemoEliminations(real));assert(real.matches.every(m=>m.status==='waiting'));
});

test('MVP rankings isolate regular and every knockout stage including third place',()=>{
 const s=setup(2),base=s.matches[0];
 s.matches=['Eliminacje','Ćwierćfinał','Półfinał','Finał','O 3. miejsce'].map((stage,i)=>({...base,id:i+1,a:'A',b:'B',stage,status:'done',mvp:['B1','A1','A:A1']}));
 const regular=mvpRanking(s,'regular'),knockout=mvpRanking(s,'knockout');
 assert.equal(regular.reduce((a,r)=>a+r.total,0),3);assert.equal(knockout.reduce((a,r)=>a+r.total,0),12);
 assert.equal(regular.find(r=>r.letter==='A').total,2);assert.equal(regular.find(r=>r.letter==='A').matches,1);
 assert.equal(knockout.find(r=>r.letter==='A').total,8);assert.equal(knockout.find(r=>r.letter==='A').matches,4);
 s.matches=s.matches.filter(m=>m.stage==='Eliminacje');assert.deepEqual(mvpRanking(s,'knockout'),[]);assert.equal(mvpRanking(s,'regular').length,2);
 s.matches=[{...base,status:'live',stage:'Finał',mvp:['B1','A1','A:A1']}];assert.deepEqual(mvpRanking(s,'knockout'),[]);
});

test('only organizer can upload or remove a logo, including during play',()=>{
 const s=setup(2),teamId=s.teams[0].id;const logo='data:image/png;base64,iVBORw0KGgo=';
 mutate(s,{type:'start',id:1,court:1},true);const before=structuredClone(s.matches);
 assert.throws(()=>mutate(s,{type:'logo',teamId,logo},false));
 for(const bad of ['https://example.com/logo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,aGVsbG8=','x'.repeat(140001)])assert.throws(()=>mutate(s,{type:'logo',teamId,logo:bad},true));
 mutate(s,{type:'logo',teamId,logo},true);assert.equal(s.teams[0].logo,logo);assert.deepEqual(s.matches,before);
 mutate(s,{type:'logo',teamId,logo:''},true);assert.equal(s.teams[0].logo,undefined);
});

test('assigning from the team list moves or clears a letter atomically and rejects occupied letters',()=>{
 const s=setup(4),id=s.teams[0].id;
 mutate(s,{type:'assign-team',teamId:id,letter:'P'},true);
 assert.equal(s.slots.P,id);assert(!s.slots.A);assert(s.matches.every(m=>m.a!=='A'&&m.b!=='A'));
 const before=structuredClone(s);assert.throws(()=>mutate(s,{type:'assign-team',teamId:id,letter:'B'},true));assert.deepEqual(s,before);
 assert.throws(()=>mutate(s,{type:'assign-team',teamId:id,letter:'A'},false));assert.deepEqual(s,before);
 mutate(s,{type:'assign-team',teamId:id,letter:''},true);assert(!Object.values(s.slots).includes(id));assert.equal(activeLetters(s).length,3);
 mutate(s,{type:'start',id:s.matches[0].id,court:1},true);assert.throws(()=>mutate(s,{type:'assign-team',teamId:id,letter:'A'},true));
});

test('new tournament requires organizer confirmation, clears competition and teams while preserving rules',()=>{
 const s=setup(8);s.refs=['ref@example.com'];s.title='Liga';s.teams[0].logo='data:image/png;base64,iVBORw0KGgo=';
 finish(s,s.matches[0]);mutate(s,{type:'start',id:s.matches.find(m=>m.status==='waiting').id,court:1},true);
 const before=structuredClone(s);
 assert.throws(()=>mutate(s,{type:'new-tournament',confirmed:true},false));assert.deepEqual(s,before);
 assert.throws(()=>mutate(s,{type:'new-tournament'},true));assert.deepEqual(s,before);
 mutate(s,{type:'new-tournament',confirmed:true},true);
 assert.deepEqual(s.matches,[]);assert.deepEqual(s.slots,{});assert.deepEqual(s.participants,[]);assert.deepEqual(mvpRanking(s),[]);assert.deepEqual(standings(s),[]);
 assert.deepEqual(s.teams,[]);
 for(const key of ['refs','title','settings'])assert.deepEqual(s[key],before[key]);
 prepareSchedule(s);assert.deepEqual(s.matches,[]);
 for(let i=0;i<2;i++){mutate(s,{type:'team',name:before.teams[i].name,players:'Nowy zawodnik '+i},true);mutate(s,{type:'assign-team',teamId:s.teams[i].id,letter:'AB'[i]},true)}
 assert(s.teams.every(t=>!before.teams.some(old=>old.id===t.id)));assert.deepEqual(s.teams[0].players,['Nowy zawodnik 0']);assert.equal(s.teams[0].logo,undefined);
 assert.equal(s.matches.length,1);assert.equal(s.matches[0].status,'waiting');assert.deepEqual(s.matches[0].mvp,['','','']);
});

function playSet(s,m,side){for(let p=0;p<m.rules.target;p++)mutate(s,{type:'point',id:m.id,side},true)}
function approve(s,m){mutate(s,{type:'mvp',id:m.id,values:[s.teams.find(t=>t.id===s.slots[m.b]).players[0],s.teams.find(t=>t.id===s.slots[m.a]).players[0],m.a+':'+s.teams.find(t=>t.id===s.slots[m.a]).players[0]]},true);mutate(s,{type:'finish',id:m.id},true)}
function drawSettings(s,extra={}){mutate(s,{type:'settings',value:{...s.settings,eliminationTwoSets:true,draw11:2,win20:3,loss02:0,confirmed:true,...extra}},true)}
test('two-set elimination supports 2:0, 1:1 and 0:2 with live draw points, approval and undo',()=>{
 for(const sides of [[0,0],[0,1],[1,0],[1,1]]){
  const s=setup(2);drawSettings(s);const m=s.matches[0];assert(usesTwoSets(s,m));mutate(s,{type:'start',id:m.id,court:1},true);
  playSet(s,m,sides[0]);assert(!matchComplete(m));assert.throws(()=>mutate(s,{type:'finish',id:m.id},true));
  playSet(s,m,sides[1]);assert(matchComplete(m));assert.equal(m.sets.length,2);assert.throws(()=>mutate(s,{type:'point',id:m.id,side:0},true));
  const tied=sides[0]!==sides[1],live=standings(s,{live:true});assert(live.every(r=>r.awaitingApproval&&r.played===1));assert.equal(standings(s).reduce((n,r)=>n+r.played,0),0);
  if(tied){assert.equal(winner(m),'');assert(live.every(r=>r.d===1&&r.w===0&&r.pts===2))}else{assert.equal(winner(m),sides[0]===0?m.a:m.b);assert.equal(live.reduce((n,r)=>n+r.pts,0),3)}
  mutate(s,{type:'undo',id:m.id},true);assert(!matchComplete(m));assert.equal(m.sets.length,1);assert(standings(s,{live:true}).every(r=>r.played===0&&r.d===0&&r.pts===0));
  mutate(s,{type:'point',id:m.id,side:sides[1]},true);assert.throws(()=>mutate(s,{type:'finish',id:m.id},true));approve(s,m);
  assert.equal(m.status,'done');assert.equal(mvpRanking(s).reduce((n,r)=>n+r.total,0),3);
  assert.equal(s.matches.filter(m=>m.stage==='Finał').length,1);
  assert.deepEqual(standings(s).map(r=>[r.pts,r.d,r.w]),live.map(r=>[r.pts,r.d,r.w]));
 }
});
test('draw elimination seeds quarterfinals but knockout always requires a winner and supports tie-breaks',()=>{
 const s=setup(8);drawSettings(s,{early:3,quarter:3,late:3,tie:2,tieQuarterfinal:2});
 for(const m of [...s.matches]){mutate(s,{type:'start',id:m.id,court:1},true);playSet(s,m,0);playSet(s,m,1);approve(s,m)}
 const rows=standings(s),quarters=s.matches.filter(m=>m.stage==='Ćwierćfinał');assert.equal(quarters.length,4);assert.equal(quarters[0].a,rows[0].letter);assert.equal(quarters[0].b,rows[7].letter);assert(rows.every(r=>r.w===0&&r.d===5&&r.pts===10));
 const q=quarters[0];assert(!usesTwoSets(s,q));mutate(s,{type:'start',id:q.id,court:1},true);assert.equal(q.rules.twoSets,false);
 playSet(s,q,0);playSet(s,q,1);assert(!matchComplete(q));assert.throws(()=>mutate(s,{type:'finish',id:q.id},true));
 for(let i=0;i<2;i++)mutate(s,{type:'point',id:q.id,side:1},true);assert(matchComplete(q));assert.equal(winner(q),q.b);approve(s,q);
 assert.throws(()=>drawSettings(s,{draw11:3}));
});
test('format changes apply only to newly started elimination matches and validate draw scoring',()=>{
 const s=setup(4),old=s.matches[0];mutate(s,{type:'start',id:old.id,court:1},true);delete old.rules.twoSets;
 drawSettings(s);assert(!usesTwoSets(s,old));playSet(s,old,0);playSet(s,old,1);assert(!matchComplete(old));
 const fresh=eligible(s)[0];mutate(s,{type:'start',id:fresh.id,court:2},true);assert(usesTwoSets(s,fresh));
 mutate(s,{type:'settings',value:{...s.settings,eliminationTwoSets:false}},true);assert(usesTwoSets(s,fresh));playSet(s,fresh,0);playSet(s,fresh,1);assert(matchComplete(fresh));
 for(const bad of [-1,1.5,'2',100])assert.throws(()=>mutate(s,{type:'settings',value:{...s.settings,draw11:bad}},true));
 assert.throws(()=>mutate(s,{type:'settings',value:{...s.settings,eliminationTwoSets:'yes'}},true));
});

test('test match fixture completes fixed two-set games including draws',()=>{
 const s=initial();addDemoTeams(s);for(let i=0;i<8;i++)mutate(s,{type:'assign',letter:'ABCDEFGH'[i],teamId:s.teams[i].id},true);
 drawSettings(s,{early:3});const count=s.matches.length;assert.equal(completeDemoEliminations(s),count);const matches=s.matches.filter(m=>m.stage==='Eliminacje');assert(matches.every(m=>m.status==='done'&&m.sets.length===2));assert(matches.some(m=>!winner(m)));
});

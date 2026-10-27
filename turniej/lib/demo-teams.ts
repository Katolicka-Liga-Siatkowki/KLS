import {State,prepareSchedule,team,eligible,courtCount,mutate,matchComplete,point} from './tournament';
const names=['Praskie Asy','Lotne Wilki','Mocny Serwis','Złoty Blok','Ekipa z Parkietu','Siatkarskie Iskry','Szybkie Piłki','Błękitne Sokoły','Waleczne Rysie','Drużyna Jutra','Królowie Tie-breaka','Leśne Żubry','Mistrzowie Zagrywki','Nieustraszeni','Ogniste Smoki','Parkietowe Pantery'];
export function addDemoTeams(s:State){
 if(s.matches.some(m=>m.status!=='waiting'))throw Error('Drużyny testowe można dodać tylko przed rozpoczęciem turnieju.');
 names.forEach((name,i)=>{const id='demo-team-'+String.fromCharCode(65+i);if(s.teams.some(t=>t.id===id))return;const l=String.fromCharCode(65+i);s.teams.push({id,name,temporary:true,players:['Adam','Bartek','Celina','Daniel','Ewa','Filip'].map((p,j)=>`${p} ${l}${j+1}`)})});
 return s;
}
export function clearDemoTeams(s:State){
 const ids=new Set(s.teams.filter(t=>t.temporary).map(t=>t.id));
 const slots=new Set(Object.entries(s.slots).filter(([,id])=>ids.has(id)).map(([l])=>l));
 if(s.matches.some(m=>m.status!=='waiting'&&!slots.has(m.a)&&!slots.has(m.b)))throw Error('Istnieją rozegrane mecze prawdziwych drużyn. Dane testowe wymagają indywidualnego uporządkowania.');
 s.teams=s.teams.filter(t=>!ids.has(t.id));
 for(const l of slots)delete s.slots[l];
 s.matches=[];s.participants=[];prepareSchedule(s);return s;
}
export function completeDemoEliminations(s:State){
 const pending=s.matches.filter(m=>m.stage==='Eliminacje'&&m.status!=='done');
 for(const m of pending){if(![m.a,m.b].every(l=>team(s,l)?.temporary))throw Error('Uzupełnianie jest dostępne wyłącznie dla meczów drużyn testowych.')}
 let completed=0;
 while(s.matches.some(m=>m.stage==='Eliminacje'&&m.status!=='done')){
  const m=s.matches.find(m=>m.stage==='Eliminacje'&&m.status==='live')??eligible(s).find(m=>m.stage==='Eliminacje');
  if(!m)throw Error('Nie można wybrać kolejnego meczu testowego.');
  if(m.status==='waiting'){
   const court=Array.from({length:courtCount(s,m.stage)},(_,i)=>i+1).find(c=>!s.matches.some(x=>x.status==='live'&&x.court===c));
   if(!court)throw Error('Brak wolnego boiska.');mutate(s,{type:'start',id:m.id,court},true);
  }
  while(!matchComplete(m)){
   const set=m.sets.length,side=m.id%3===0&&set===1?1-m.id%2:m.id%2;
   const previous=m.sets.length;
   while(m.sets.length===previous)point(m,side);
  }
  const a=team(s,m.a)!,b=team(s,m.b)!;
  const values=[m.mvp[0]||b.players[m.id%b.players.length],m.mvp[1]||a.players[m.id%a.players.length],m.mvp[2]||(m.id%2?m.a+':'+a.players[(m.id+1)%a.players.length]:m.b+':'+b.players[(m.id+1)%b.players.length])];
  mutate(s,{type:'mvp',id:m.id,values},true);mutate(s,{type:'finish',id:m.id},true);completed++;
 }
 return completed;
}

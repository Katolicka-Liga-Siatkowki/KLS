export type Team={id:string,name:string,players:string[],logo?:string,temporary?:boolean};
export type Match={id:number,a:string,b:string,stage:string,status:'waiting'|'live'|'done',court:number|null,sets:number[][],score:number[],history:number[],mvp:string[],rules?:{target:number,tie:number,winByTwo?:boolean}};
export type State={participants?:string[],title:string,teams:Team[],slots:Record<string,string>,matches:Match[],refs:string[],settings:{courts:number,knockoutCourts?:number,winByTwo?:boolean,winByTwoElimination?:boolean,winByTwoQuarterfinal?:boolean,winByTwoKnockout?:boolean,early:number,quarter?:number,late:number,tie:number,tieElimination?:number,tieQuarterfinal?:number,tieKnockout?:number,win20:number,win21:number,loss12:number,loss02:number,confirmed:boolean}};
export const letters='ABCDEFGHIJKLMNOP'.split('');
const pairs='AH BI CJ DK EL FM GN OP AE BF CG DH IM JN KO LP AJ BK CL DM EN FO GP HI AM BN CO DP EI FJ GK HL AN BO CP DI EJ FK GL HM'.split(' ');
export function initial():State{return {participants:[],title:'Charytatywny Turniej Siatkówki',teams:[],slots:{},refs:[],settings:{courts:3,knockoutCourts:2,winByTwo:true,early:21,late:25,tie:15,win20:0,win21:0,loss12:0,loss02:0,confirmed:false},matches:[]}}
export function makeMatch(id:number,a:string,b:string,stage:string):Match{return {id,a,b,stage,status:'waiting',court:null,sets:[],score:[0,0],history:[],mvp:['','','']}}
export function team(s:State,l:string){return s.teams.find(t=>t.id===s.slots[l])}
export function activeLetters(s:State){return s.participants??letters}
export function qualifierCount(s:State){const n=activeLetters(s).length;return n>=8?8:n>=4?4:n>=2?2:0}
export function gamesPerTeam(n:number){return n<2?0:n<=6?n-1:n%2===0?5:4}
export function playoffStages(s:State){const n=qualifierCount(s);return n===8?['Ćwierćfinał','Półfinał','Finał','O 3. miejsce']:n===4?['Półfinał','Finał','O 3. miejsce']:n===2?['Finał']:[]}
export function playoffSummary(s:State){const n=qualifierCount(s);return n===8?'1 vs 8 · 2 vs 7 · 3 vs 6 · 4 vs 5':n===4?'1 vs 4 · 2 vs 3':n===2?'1 vs 2 · finał':'Przypisz co najmniej 2 drużyny'}
// Build a regular schedule: every team has the same number of distinct opponents.
export function scheduleFor(slots:string[]):Match[]{
 const n=slots.length;if(n<2)return [];
 if(n===16&&slots.join('')===letters.join(''))return pairs.map((p,i)=>makeMatch(i+1,p[0],p[1],'Eliminacje'));
 const rotation:(string|null)[]=[...slots];if(n%2)rotation.push(null);
 const result:Match[]=[];const degree=gamesPerTeam(n);
 for(let round=0;round<rotation.length-1;round++){
  for(let i=0;i<rotation.length/2;i++){
   const a=rotation[i],b=rotation[rotation.length-1-i];if(!a||!b)continue;
   // Odd fields above six use a four-regular cyclic graph, ordered by round-robin rounds.
   const distance=Math.abs(slots.indexOf(a)-slots.indexOf(b));
   const include=n<=6||(n%2===0?round<degree:Math.min(distance,n-distance)<=2);
   if(include)result.push(makeMatch(result.length+1,a,b,'Eliminacje'));
  }
  rotation.splice(1,0,rotation.pop()!);
 }
 return result;
}
// Legacy tournaments retain every played match. Before play, assignments drive the schedule.
export function phaseTarget(s:State,stage:string){return stage==='Eliminacje'?s.settings.early:stage==='Ćwierćfinał'?(s.settings.quarter??s.settings.early):s.settings.late}
export function phaseTie(s:State,stage:string){const key=stage==='Eliminacje'?'tieElimination':stage==='Ćwierćfinał'?'tieQuarterfinal':'tieKnockout';return s.settings[key]??s.settings.tie}
export function phaseWinByTwo(s:State,stage:string){const key=stage==='Eliminacje'?'winByTwoElimination':stage==='Ćwierćfinał'?'winByTwoQuarterfinal':'winByTwoKnockout';return s.settings[key]??s.settings.winByTwo??true}
export function courtCount(s:State,stage?:string){return (stage??(s.matches.some(m=>m.stage!=='Eliminacje')?'Pucharowa':'Eliminacje'))==='Eliminacje'?s.settings.courts:(s.settings.knockoutCourts??2)}
export function prepareSchedule(s:State){
 if(s.settings.knockoutCourts===undefined){s.settings.courts=3;s.settings.knockoutCourts=2;}
 if(s.matches.some(m=>m.status!=='waiting'))return s;
 const assigned=letters.filter(l=>team(s,l));
 if(!s.participants||assigned.join('')!==s.participants.join('')){s.participants=assigned;s.matches=scheduleFor(assigned)}
 return s;
}
export function setWins(m:Match){return [m.sets.filter(x=>x[0]>x[1]).length,m.sets.filter(x=>x[1]>x[0]).length]}
export function winner(m:Match){return setWins(m)[0]===2?m.a:m.b}
export function loser(m:Match){return winner(m)===m.a?m.b:m.a}
export function standings(s:State,options:{live?:boolean}={}){
 const rows=activeLetters(s).map(l=>({letter:l,name:team(s,l)?.name||`Drużyna ${l}`,played:0,w:0,pts:0,sw:0,sl:0,pw:0,pl:0,live:false,awaitingApproval:false}));
 for(const m of s.matches.filter(m=>m.stage==='Eliminacje'&&(m.status==='done'||options.live&&m.status==='live'))){
  const a=rows.find(r=>r.letter===m.a),b=rows.find(r=>r.letter===m.b);if(!a||!b)continue;
  const [x,y]=setWins(m),resolved=m.status==='done'||x===2||y===2;
  if(m.status==='live'){a.live=b.live=true;a.awaitingApproval=b.awaitingApproval=resolved}
  a.sw+=x;a.sl+=y;b.sw+=y;b.sl+=x;
  for(const p of m.sets){a.pw+=p[0];a.pl+=p[1];b.pw+=p[1];b.pl+=p[0]}
  if(m.status==='live'){a.pw+=m.score[0];a.pl+=m.score[1];b.pw+=m.score[1];b.pl+=m.score[0]}
  if(resolved){a.played++;b.played++;const win=x>y?a:b,loss=x>y?b:a;win.w++;win.pts+=Math.min(x,y)===0?s.settings.win20:s.settings.win21;loss.pts+=Math.min(x,y)===0?s.settings.loss02:s.settings.loss12}
 }
 const ratio=(a:number,b:number)=>b?a/b:a?Infinity:0;
 return rows.sort((a,b)=>b.pts-a.pts||b.w-a.w||ratio(b.sw,b.sl)-ratio(a.sw,a.sl)||ratio(b.pw,b.pl)-ratio(a.pw,a.pl)||a.letter.localeCompare(b.letter));
}
export function eligible(s:State){const busy=new Set(s.matches.filter(m=>m.status==='live').flatMap(m=>[m.a,m.b]));return s.matches.filter(m=>m.status==='waiting'&&!busy.has(m.a)&&!busy.has(m.b))}
export function advance(s:State){
 if(!s.settings.confirmed)return;
 const stage=(name:string)=>s.matches.filter(m=>m.stage===name);
 const eliminations=stage('Eliminacje');
 const add=(a:string,b:string,name:string)=>s.matches.push(makeMatch(Math.max(0,...s.matches.map(m=>m.id))+1,a,b,name));
 if(eliminations.length&&eliminations.every(m=>m.status==='done')&&!s.matches.some(m=>m.stage!=='Eliminacje')){
  const t=standings(s).map(x=>x.letter),n=qualifierCount(s);
  if(n===8)[[0,7],[3,4],[1,6],[2,5]].forEach(([a,b])=>add(t[a],t[b],'Ćwierćfinał'));
  else if(n===4)[[0,3],[1,2]].forEach(([a,b])=>add(t[a],t[b],'Półfinał'));
  else if(n===2)add(t[0],t[1],'Finał');
 }
 const q=stage('Ćwierćfinał');
 if(q.length===4&&q.every(m=>m.status==='done')&&!stage('Półfinał').length){add(winner(q[0]),winner(q[1]),'Półfinał');add(winner(q[2]),winner(q[3]),'Półfinał')}
 const f=stage('Półfinał');
 if(f.length===2&&f.every(m=>m.status==='done')&&!stage('Finał').length){add(loser(f[0]),loser(f[1]),'O 3. miejsce');add(winner(f[0]),winner(f[1]),'Finał')}
}
export function point(m:Match,side:number){if(setWins(m).includes(2))throw Error('Mecz ma już zwycięzcę. Uzupełnij MVP i zatwierdź wynik.');m.history.push(side);m.score[side]++;const target=m.sets.length===2?m.rules!.tie:m.rules!.target;if(Math.max(...m.score)>=target&&(m.rules?.winByTwo===false||Math.abs(m.score[0]-m.score[1])>=2)){m.sets.push([...m.score]);m.score=[0,0]}}
export function undo(m:Match){const h=m.history.slice(0,-1);m.score=[0,0];m.sets=[];m.history=[];for(const side of h)point(m,side)}
function need(ok:unknown,msg:string):asserts ok{if(!ok)throw Error(msg)}
export function mutate(s:State,action:any,organizer:boolean){prepareSchedule(s);const m=s.matches.find(m=>m.id===action.id);const admin=['team','logo','assign-team','assign','settings','refs','title'].includes(action.type);need(!admin||organizer,'Tylko organizator może zmienić te dane.');switch(action.type){case 'team':{need(!s.matches.some(m=>m.status!=='waiting'),'Składy są zablokowane po rozpoczęciu turnieju.');const name=String(action.name||'').trim();const players=String(action.players||'').split('\n').map(x=>x.trim()).filter(Boolean);need(name.length>0&&name.length<=100&&players.length>0&&players.length<=30&&players.every(x=>x.length<=100),'Podaj nazwę i od 1 do 30 zawodników.');need(new Set(players).size===players.length,'Nazwiska zawodników muszą być unikalne w zespole.');const old=s.teams.find(t=>t.id===action.teamId);need(!s.teams.some(t=>t.name===name&&t!==old),'Drużyna o tej nazwie już istnieje.');if(old){old.name=name;old.players=players}else{s.teams.push({id:crypto.randomUUID(),name,players})}break}
case 'logo':{const t=s.teams.find(t=>t.id===action.teamId);need(!!t,'Nie znaleziono drużyny.');const logo=action.logo;need(typeof logo==='string'&&logo.length<=140000,'Logotyp jest za duży.');if(logo){need(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo),'Wybierz obraz PNG, JPG lub WebP.');let bytes='';try{bytes=atob(logo.split(',')[1])}catch{need(false,'Nieprawidłowy obraz.')}const mime=logo.slice(11,logo.indexOf(';'));need(mime==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):mime==='jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP','Nieprawidłowy format obrazu.')}t!.logo=logo||undefined;break}
case 'assign-team':{need(!s.matches.some(m=>m.status!=='waiting'),'Przypisania są zablokowane po rozpoczęciu turnieju.');need(s.teams.some(t=>t.id===action.teamId),'Nie znaleziono drużyny.');const letter=action.letter;need(letter===''||letters.includes(letter),'Nieprawidłowa litera.');need(!letter||!s.slots[letter]||s.slots[letter]===action.teamId,'Ta litera jest już przypisana do innej drużyny.');for(const [l,id] of Object.entries(s.slots))if(id===action.teamId)delete s.slots[l];if(letter)s.slots[letter]=action.teamId;prepareSchedule(s);break}
case 'assign':{need(!s.matches.some(m=>m.status!=='waiting'),'Przypisania są zablokowane po rozpoczęciu turnieju.');need(letters.includes(action.letter),'Nieprawidłowa litera.');need(!action.teamId||s.teams.some(t=>t.id===action.teamId),'Nie znaleziono drużyny.');need(!action.teamId||!Object.entries(s.slots).some(([l,id])=>l!==action.letter&&id===action.teamId),'Drużyna ma już przypisaną literę.');s.slots[action.letter]=action.teamId;prepareSchedule(s);break}
case 'refs':need(Array.isArray(action.emails)&&action.emails.length<=30&&action.emails.every((x:any)=>typeof x==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)),'Podaj poprawne adresy e-mail.');s.refs=action.emails.map((x:string)=>x.toLowerCase());break;
case 'settings':{const v=action.value;if(v){for(const [key,fallback] of [['quarter','early'],['tieElimination','tie'],['tieQuarterfinal','tie'],['tieKnockout','tie']])if(v[key]===undefined)v[key]=(s.settings as any)[key]??v[fallback];}if(v&&v.winByTwo===undefined)v.winByTwo=s.settings.winByTwo??true;if(v&&v.knockoutCourts===undefined)v.knockoutCourts=s.settings.knockoutCourts??2;need(v&&['courts','knockoutCourts','early','quarter','late','tie','tieElimination','tieQuarterfinal','tieKnockout','win20','win21','loss12','loss02'].every(k=>Number.isInteger(v[k])&&v[k]>= (['courts','knockoutCourts','early','quarter','late','tie','tieElimination','tieQuarterfinal','tieKnockout'].includes(k)?1:0)&&v[k]<=(['courts','knockoutCourts'].includes(k)?8:99)),'Nieprawidłowe ustawienia.');need(typeof v.confirmed==='boolean','Zatwierdź ustawienia.');need(typeof v.winByTwo==='boolean'&&['winByTwoElimination','winByTwoQuarterfinal','winByTwoKnockout'].every(k=>v[k]===undefined||typeof v[k]==='boolean'),'Wybierz grę z przewagami lub bez przewag dla każdej fazy.');need(!s.matches.some(m=>m.status==='live'&&m.court!>(m.stage==='Eliminacje'?v.courts:v.knockoutCourts)),'Na usuwanym boisku trwa mecz.');if(s.matches.some(m=>m.stage!=='Eliminacje'))need(['win20','win21','loss12','loss02','confirmed'].every(k=>(s.settings as any)[k]===v[k]),'Punktacja jest zablokowana po utworzeniu fazy pucharowej.');s.settings={...v};advance(s);break}
case 'title':need(typeof action.title==='string'&&action.title.trim().length>0&&action.title.length<=100,'Podaj nazwę turnieju.');s.title=action.title.trim();break;
case 'start':{need(m&&m.status==='waiting','Mecz nie oczekuje na rozpoczęcie.');need(activeLetters(s).length>=2&&activeLetters(s).every(l=>team(s,l)?.players.length),'Najpierw przypisz co najmniej 2 drużyny ze składami do liter A–P.');need(Number.isInteger(action.court)&&action.court>=1&&action.court<=courtCount(s,m.stage),'Nieprawidłowe boisko.');need(!s.matches.some(x=>x.status==='live'&&x.court===action.court),'Boisko jest zajęte.');need(eligible(s).includes(m),'Jedna z drużyn rozgrywa poprzedni mecz.');m.status='live';m.court=action.court;m.rules={target:phaseTarget(s,m.stage),tie:phaseTie(s,m.stage),winByTwo:phaseWinByTwo(s,m.stage)};break}
case 'point':need(m&&m.status==='live'&&(action.side===0||action.side===1),'Nieprawidłowy mecz.');point(m,action.side);break;
case 'undo':need(m&&m.status==='live','Mecz nie jest w toku.');undo(m);break;
case 'mvp':need(m&&m.status==='live'&&Array.isArray(action.values)&&action.values.length===3,'Nieprawidłowy arkusz MVP.');need(action.values.every((v:string,i:number)=>v===''||(i===0?team(s,m.b)?.players:i===1?team(s,m.a)?.players:[...team(s,m.a)!.players.map(p=>m.a+':'+p),...team(s,m.b)!.players.map(p=>m.b+':'+p)])?.includes(v)),'Wybierz zawodników właściwych drużyn.');m.mvp=action.values;break;
case 'finish':need(m&&m.status==='live'&&setWins(m).includes(2),'Mecz musi zakończyć się dwoma wygranymi setami.');need(m.mvp.every(Boolean),'Uzupełnij trzy wskazania MVP.');m.status='done';advance(s);break;
default:throw Error('Nieznana operacja.')}return s}
export type MvpRow={teamId:string,letter:string,teamName:string,player:string,captainVotes:number,refereeVotes:number,total:number,matches:number,rank:number};
export type MvpPhase='regular'|'knockout';
export function mvpRanking(s:State,phase:MvpPhase='regular'):MvpRow[]{
 const rows=new Map<string,MvpRow>();
 for(const m of s.matches.filter(m=>m.status==='done'&&(phase==='regular'?m.stage==='Eliminacje':['Ćwierćfinał','Półfinał','Finał','O 3. miejsce'].includes(m.stage)))){
  const nominated=new Set<string>();
  for(let i=0;i<3;i++){
   const value=m.mvp[i];if(!value)continue;
   const letter=i===0?m.b:i===1?m.a:value[0];
   const player=i===2?value.slice(2):value;
   if(i===2&&(value[1]!==':'||![m.a,m.b].includes(letter)))continue;
   const t=team(s,letter);if(!t?.players.includes(player))continue;
   const key=JSON.stringify([t.id,player]);
   let row=rows.get(key);
   if(!row){row={teamId:t.id,letter,teamName:t.name,player,captainVotes:0,refereeVotes:0,total:0,matches:0,rank:0};rows.set(key,row)}
   if(i===2)row.refereeVotes++;else row.captainVotes++;
   row.total++;if(!nominated.has(key)){row.matches++;nominated.add(key)}
  }
 }
 const result=[...rows.values()].sort((a,b)=>b.total-a.total||a.player.localeCompare(b.player,'pl')||a.teamName.localeCompare(b.teamName,'pl')||a.letter.localeCompare(b.letter));
 result.forEach((r,i)=>r.rank=i>0&&r.total===result[i-1].total?result[i-1].rank:i+1);
 return result;
}

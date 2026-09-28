import type { LeagueMatch } from "./league-types";

export type PlayoffStage = "quarter" | "semi" | "final" | "third" | "fifth" | "seventh";
export type PlayoffMatch = LeagueMatch & { stage: PlayoffStage; leg: number; referee: string; golden?: [number, number]; points?: [number, number] };
export type PlayoffSeries = { id: string; title: string; home: string; away: string; matches: PlayoffMatch[]; points?: [number, number]; winner?: string; loser?: string; note: string };
export type PlayoffRound = { key: PlayoffStage; title: string; ties: PlayoffSeries[] };
export type PlayoffData = { rounds: PlayoffRound[]; warnings: string[]; updatedAt: string; error?: string };
export const teamKey = (s: string) => s.trim().replace(/\s+/g," ").toLocaleLowerCase("pl");
const score = (s?: string) => s?.trim() && /^\d+$/.test(s.trim()) ? Number(s.trim()) : undefined;
export function matchPoints(a: number, b: number): [number, number] | undefined {
  if (a===3 && b>=0 && b<3) return b===2 ? [2,1] : [3,0];
  if (b===3 && a>=0 && a<3) return a===2 ? [1,2] : [0,3];
}
function identity(value: string) { let h=2166136261; for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0; }
function matchDate(raw: string, season: string): {matchDate:string;timeKnown:boolean} {
  const date=raw.trim().match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}|\d{2}))?(?:[ ,T]+(\d{1,2}):(\d{2}))?\s*$/);
  const uncertain=raw.trim().replace(/\s+\?\?:\?\?$/,"");
  if(!date && uncertain!==raw.trim())return matchDate(uncertain,season);
  const iso=raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  const endYear=season.match(/(\d{4})\D+(\d{4})/)?.[2];
  let y=iso?.[1] ?? date?.[3] ?? endYear;
  if(y?.length===2)y=`20${y}`;
  const m=iso?.[2] ?? date?.[2],d=iso?.[3] ?? date?.[1],h=iso?.[4] ?? date?.[4],min=iso?.[5] ?? date?.[5];
  if(!y || !m || !d)return {matchDate:"9999-12-31T12:00",timeKnown:false};
  const value=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T${(h??"12").padStart(2,"0")}:${min??"00"}`;
  const stamp=new Date(value+"Z");
  if(!Number.isFinite(stamp.getTime()) || stamp.toISOString().slice(0,16)!==value)return {matchDate:"9999-12-31T12:00",timeKnown:false};
  return {matchDate:value,timeKnown:!!h};
}
export function parsePlayoffRows(rows: string[][], season: string) {
  const matches: PlayoffMatch[]=[]; const warnings: string[]=[];
  let stage: PlayoffStage | undefined;let leg=1;const seen=new Set<string>();
  for(const row of rows) {
    const label=(row[0]??"").trim().toLocaleUpperCase("pl");
    if(label.startsWith("ĆWIERĆFINAŁ")){stage="quarter";leg=/2\s*$/.test(label)?2:1;}
    else if(label.startsWith("PÓŁFINAŁ")){stage="semi";leg=/2\s*$/.test(label)?2:1;}
    else if(label==="FINAŁ"){stage="final";leg=1;}
    else if(/MECZ O [357]\.?.*MIEJSCE/.test(label)){stage=label.includes("3")?"third":label.includes("5")?"fifth":"seventh";leg=1;}
    const home=row[4]?.trim(),away=row[5]?.trim();
    if(!stage || !home || !away || home==="Drużyna 1")continue;
    if(teamKey(home)===teamKey(away)){warnings.push(`Nieprawidłowa para: ${home}.`);continue;}
    const key=`${stage}:${leg}:${[teamKey(home),teamKey(away)].sort().join("|")}`;
    if(seen.has(key)){warnings.push(`Powtórzony mecz: ${home} — ${away} (${leg}. mecz).`);continue;}seen.add(key);
    const a=score(row[6]),b=score(row[8]);const points=a!==undefined&&b!==undefined?matchPoints(a,b):undefined;
    if((a!==undefined||b!==undefined)&&!points)warnings.push(`Niepełny lub nieprawidłowy wynik: ${home} — ${away}.`);
    const ga=score(row[24]),gb=score(row[26]);
    const sets:string[]=[];for(const col of [9,12,15,18,21])if(score(row[col])!==undefined&&score(row[col+2])!==undefined)sets.push(`${row[col]}:${row[col+2]}`);
    matches.push({id:identity(key),league:1,stage,leg,homeTeam:home,awayTeam:away,homeTeamId:0,awayTeamId:0,...matchDate(row[1]??"",season),displayDate:row[1]?.trim()||"Termin do ustalenia",venue:row[2]?.trim()||"",referee:row[3]?.trim()||"",status:points?"finished":"scheduled",homeSets:a??0,awaySets:b??0,setScores:sets,published:true,points,golden:ga!==undefined&&gb!==undefined?[ga,gb]:undefined});
    const pa=score(row[27]),pb=score(row[28]);
    if(points&&pa!==undefined&&pb!==undefined&&(points[0]!==pa||points[1]!==pb))warnings.push(`Punkty w arkuszu nie zgadzają się z wynikiem ${home} — ${away}. Sprawdź kolumny „Punkty”.`);
  }
  return {matches,warnings};
}
export function seriesResult(matches: PlayoffMatch[], double: boolean) {
  const first=matches.find(m=>m.leg===1)??matches[0];
  if(!first)return {note:double?"Dwumecz · oczekiwanie na parę":"Jeden mecz · oczekiwanie na parę"};
  if(matches.length!==(double?2:1) || (double&&!matches.some(m=>m.leg===2)) || matches.some(m=>m.status!=="finished"))return {note:double?"Dwumecz w toku — oczekiwanie na oba wyniki":"Oczekiwanie na wynik"};
  const points:[number,number]=[0,0];
  for(const m of matches){const p=m.points!;const normal=teamKey(m.homeTeam)===teamKey(first.homeTeam);points[0]+=p[normal?0:1];points[1]+=p[normal?1:0];}
  let homeWins=points[0]>points[1];
  if(points[0]===points[1]) {
    const second=matches.find(m=>m.leg===2)!;const golden=second.golden;
    if(!golden || Math.max(...golden)<15 || Math.abs(golden[0]-golden[1])<2)return {points,note:"Remis punktów — oczekiwanie na wynik złotego seta w rewanżu"};
    homeWins=(golden[0]>golden[1])===(teamKey(second.homeTeam)===teamKey(first.homeTeam));
  }
  return {points,winner:homeWins?first.homeTeam:first.awayTeam,loser:homeWins?first.awayTeam:first.homeTeam,note:points[0]===points[1]?"Rozstrzygnięcie: złoty set":double?"Rozstrzygnięcie: punkty meczowe":"Wynik końcowy"};
}
export function buildPlayoff(rows: string[][], season: string, seeds: string[], placement: boolean): PlayoffData {
 const {matches,warnings}=parsePlayoffRows(rows,season);
 function round(key:PlayoffStage,title:string,expected:[string,string][],double:boolean):PlayoffRound {
   const groups=new Map<string,PlayoffMatch[]>();
   for(const m of matches.filter(m=>m.stage===key)){const pair=[teamKey(m.homeTeam),teamKey(m.awayTeam)].sort().join("|");groups.set(pair,[...(groups.get(pair)??[]),m]);}
   const unused=[...groups.values()];
   const placeholder=(name:string)=>/^(\d+\. miejsce po|Zwycięzca:|Przegrany półfinału|Najwyżej sklasyfikowany|Drugi najwyżej|Trzeci sklasyfikowany|Czwarty sklasyfikowany)/.test(name);
   const assigned=expected.map(([home,away])=>{
     const index=unused.findIndex(ms=>ms.some(m=>[teamKey(m.homeTeam),teamKey(m.awayTeam)].includes(teamKey(home)))&&ms.some(m=>[teamKey(m.homeTeam),teamKey(m.awayTeam)].includes(teamKey(away))));
     return index<0?undefined:unused.splice(index,1)[0];
   });
   const ties=expected.map(([home,away],i)=>{
     const known=[home,away].filter(name=>!placeholder(name));
     const index=known.length===0?0:known.length===1?unused.findIndex(ms=>ms.some(m=>[teamKey(m.homeTeam),teamKey(m.awayTeam)].includes(teamKey(known[0])))):-1;
     const games=assigned[i]??(index>=0?unused.splice(index,1)[0]:undefined)??[];games.sort((a,b)=>a.leg-b.leg);
     const first=games[0];
     return {id:`${key}-${i+1}`,title:`${title}${expected.length>1?` ${i+1}`:""}`,home:first?.homeTeam??home,away:first?.awayTeam??away,matches:games,...seriesResult(games,double)};
   });
   if(unused.length)warnings.push(`Za dużo par w rundzie „${title}”. Sprawdź nazwy drużyn w obu meczach dwumeczu.`);
   return {key,title,ties};
 }
 const seed=(n:number)=>seeds[n-1]||`${n}. miejsce po rundzie zasadniczej`;
 const q=round("quarter","Ćwierćfinał",[[seed(1),seed(8)],[seed(2),seed(7)],[seed(3),seed(6)],[seed(4),seed(5)]],true);
 const winner=(r:PlayoffRound,i:number)=>r.ties[i].winner||`Zwycięzca: ${r.ties[i].title.toLocaleLowerCase("pl")}`;
 const semi=round("semi","Półfinał",[[winner(q,0),winner(q,3)],[winner(q,1),winner(q,2)]],true);
 const final=round("final","Finał",[[winner(semi,0),winner(semi,1)]],false);
 const third=round("third","Mecz o 3. miejsce",[[semi.ties[0].loser||"Przegrany półfinału 1",semi.ties[1].loser||"Przegrany półfinału 2"]],false);
 const rounds=[q,semi,final,third];
 if(placement){const losers=q.ties.map(t=>t.loser).filter((t):t is string=>!!t);const ranked=losers.length===4&&seeds.length===8&&losers.every(t=>seeds.some(s=>teamKey(s)===teamKey(t)))?losers.sort((a,b)=>seeds.findIndex(s=>teamKey(s)===teamKey(a))-seeds.findIndex(s=>teamKey(s)===teamKey(b))):[];
 rounds.push(round("fifth","Mecz o 5. miejsce",[[ranked[0]||"Najwyżej sklasyfikowany przegrany ćwierćfinału",ranked[1]||"Drugi najwyżej sklasyfikowany przegrany ćwierćfinału"]],false),round("seventh","Mecz o 7. miejsce",[[ranked[2]||"Trzeci sklasyfikowany przegrany ćwierćfinału",ranked[3]||"Czwarty sklasyfikowany przegrany ćwierćfinału"]],false));}
 return {rounds,warnings,updatedAt:new Date().toISOString()};
}

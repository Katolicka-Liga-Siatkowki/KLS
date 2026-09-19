import type { LeagueMatch } from "./league-types";

const zone = new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
export function calendarDate(match: LeagueMatch) {
  if (match.matchDate.startsWith("9999-")) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(match.matchDate);
  if (!parts) return null;
  const [,y,m,d,h,min] = parts;
  const wall = Date.UTC(+y,+m-1,+d,+h,+min);
  if (new Date(wall).toISOString().slice(0,16) !== `${y}-${m}-${d}T${h}:${min}`) return null;
  const allDay = match.timeKnown === false;
  if (allDay) return {start:`${y}${m}${d}`,end:new Date(Date.UTC(+y,+m-1,+d+1)).toISOString().slice(0,10).replaceAll("-",""),allDay};
  let utc = wall;
  for(let i=0;i<3;i++) {
    const local = zone.format(new Date(utc)).replace(" ","T");
    utc += wall - Date.parse(local+"Z");
  }
  if (zone.format(new Date(utc)).slice(0,16) !== `${y}-${m}-${d} ${h}:${min}`) return null;
  const stamp=(n:number)=>new Date(n).toISOString().replace(/[-:]/g,"").replace(".000","");
  return {start:stamp(utc),end:stamp(utc+2*60*60*1000),allDay};
}

export function nextRound(matches: LeagueMatch[], today: string) {
  const pending=matches.filter(m=>m.published && m.status==="scheduled" && (m.matchDate.startsWith("9999-") || m.matchDate.slice(0,10)>=today)).sort((a,b)=>a.matchDate.localeCompare(b.matchDate));
  const numbered=pending.filter(m=>m.round);
  if(numbered.length) {
    const round=Math.min(...numbered.map(m=>m.round!));
    return {label:`${round}. kolejka`,matches:pending.filter(m=>m.round===round)};
  }
  return {label:"Najbliższe spotkania",matches:pending.slice(0,4)};
}

const escapeText=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function fold(line:string) {
  const lines:string[]=[];let part="",length=0;
  for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>75){lines.push(part);part=" ";length=1;}part+=char;length+=bytes;}lines.push(part);return lines.join("\r\n");
}
export function calendarFile(match: LeagueMatch, now=new Date()) {
  const date=calendarDate(match);if(!date)return null;
  const description=date.allDay?"Godzina meczu do ustalenia. Sprawdź aktualny terminarz KLS.":"Przewidywany czas: 2 godziny. Sprawdź aktualny terminarz KLS przed meczem.";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KLS//Terminarz//PL","CALSCALE:GREGORIAN","BEGIN:VEVENT",`UID:kls-${match.league}-${match.id}@katolickaligasiatkowki.workers.dev`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}`,`DTSTART${date.allDay?";VALUE=DATE":""}:${date.start}`,`DTEND${date.allDay?";VALUE=DATE":""}:${date.end}`,`SUMMARY:${escapeText(`${match.homeTeam} — ${match.awayTeam} | KLS`)}`,`LOCATION:${escapeText(match.venue || "Miejsce do ustalenia")}`,`DESCRIPTION:${escapeText(description)}`,"URL:https://kls.katolickaligasiatkowki.workers.dev/mecze","END:VEVENT","END:VCALENDAR"];
  return lines.map(fold).join("\r\n")+"\r\n";
}

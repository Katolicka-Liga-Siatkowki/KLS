"use client";
import type { LeagueMatch } from "@/lib/league-types";
import { calendarDate, calendarFile } from "@/lib/match-calendar";

export function MatchCalendar({match}:{match:LeagueMatch}) {
 const date=calendarDate(match);
 if(match.status!=="scheduled")return null;
 if(!date)return <small className="calendar-note">Kalendarz będzie dostępny po ustaleniu daty.</small>;
 const query=new URLSearchParams({action:"TEMPLATE",text:`${match.homeTeam} — ${match.awayTeam} | KLS`,dates:`${date.start}/${date.end}`,ctz:"Europe/Warsaw",location:match.venue||"Miejsce do ustalenia",details:`${date.allDay?"Godzina do ustalenia.":"Przewidywany czas: 2 godziny."} Sprawdź aktualny terminarz: https://kls.katolickaligasiatkowki.workers.dev/mecze`});
 function download(){const content=calendarFile(match);if(!content)return;const url=URL.createObjectURL(new Blob([content],{type:"text/calendar;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`kls-mecz-${match.id}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details className="match-calendar"><summary>Dodaj do kalendarza</summary><div><a href={`https://calendar.google.com/calendar/render?${query}`} target="_blank" rel="noopener noreferrer">Kalendarz Google</a><button type="button" onClick={download}>Pobierz plik .ics (Apple / Outlook)</button></div><small>{date.allDay?"Godzina do ustalenia — wydarzenie całodniowe.":"Czas polski · przewidywany czas: 2 godziny."} Zmiany terminu nie aktualizują zapisanej kopii.</small></details>;
}

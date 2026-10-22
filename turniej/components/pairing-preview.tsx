'use client';
import {ClipboardList,Volleyball} from 'lucide-react';
import {State,letters,activeLetters,gamesPerTeam,scheduleFor,team} from '@/lib/tournament';

export default function PairingPreview({state,selection,onSelectionChange}:{state:State,selection:string,onSelectionChange:(value:string)=>void}){
 const current=selection==='current';
 const slots=current?activeLetters(state):letters.slice(0,Number(selection));
 const matches=current?state.matches.filter(m=>m.stage==='Eliminacje'):scheduleFor(slots);
 const columnCount=Math.min(3,Math.max(1,Math.ceil(matches.length/5)));
 const size=Math.floor(matches.length/columnCount);
 const columns=Array.from({length:columnCount},(_,i)=>matches.slice(i*size,i===columnCount-1?matches.length:(i+1)*size));
 return <section className="panel pairing-preview" aria-labelledby="pairing-heading">
  <div className="pairing-controls"><div><h2 id="pairing-heading"><ClipboardList size={21}/> Rozpiska par turniejowych</h2><p>Wybierz liczbę drużyn, aby zobaczyć numerowane pary w układzie jak na plakacie.</p></div>
   <label>Liczba drużyn<select value={selection} onChange={e=>onSelectionChange(e.target.value)}><option value="current">Bieżący turniej ({activeLetters(state).length} drużyn)</option>{Array.from({length:15},(_,i)=>i+2).map(n=><option key={n} value={n}>{n} drużyn · podgląd A–{letters[n-1]}</option>)}</select></label>
  </div>
  <p className="pairing-explanation">{current?'Aktualna rozpiska dla przypisanych drużyn, zgodna z terminarzem meczów.':'Podgląd wariantu dla liter A–'+slots[slots.length-1]+'. Wybór nie zmienia uczestników ani terminarza bieżącego turnieju.'} {slots.length>1?`${gamesPerTeam(slots.length)} meczów na zespół · ${matches.length} meczów eliminacyjnych.`:'Przypisz co najmniej 2 drużyny, aby utworzyć pary.'}</p>
  {matches.length>0&&<div className="pairing-poster"><div className="pairing-court" aria-hidden="true"/><div className="pairing-poster-header"><Volleyball size={42}/><span>GRAMY W DOBREJ SPRAWIE</span><h3>{state.title}</h3><p>{slots.length} DRUŻYN <span>·</span> ROZPISKA ELIMINACJI</p></div><div className="pairing-columns" style={{gridTemplateColumns:`repeat(${columnCount},minmax(0,1fr))`}}>{columns.map((column,i)=><ol key={i} className="pairing-column" start={column[0]?.id||1}>{column.map(m=><li key={m.id} value={m.id}><span className="pairing-number">{m.id}.</span><span>{m.a}<span className="pairing-colon">:</span>{m.b}</span>{current&&m.status!=='waiting'&&<span className={'pairing-status '+(m.status==='live'?'playing':'')} aria-label={m.status==='live'?'W grze':'Zakończony'}>{m.status==='live'?'● W grze':'✓'}</span>}</li>)}</ol>)}</div></div>}
  {current&&slots.length>0&&<div className="pairing-legend" aria-label="Przypisania drużyn">{slots.map(l=><span key={l}><b>{l}</b>{team(state,l)?.name||`Drużyna ${l}`}</span>)}</div>}
  {!current&&slots.length>=7&&slots.length%2===1&&<p className="pairing-explanation">Przy nieparzystej liczbie drużyn każda gra 4 mecze, aby liczba spotkań była równa.</p>}
 </section>
}

'use client';
import {useState} from 'react';
import {ChevronDown,Users} from 'lucide-react';
import {letters,type State,type Team} from '@/lib/tournament';
import TeamLogoUpload from './team-logo-upload';
export default function TeamList({state,admin,pending,started,onAction,onEdit}:{state:State,admin:boolean,pending:boolean,started:boolean,onAction:(action:any)=>Promise<unknown>,onEdit:(team:Team)=>void}){
 const [expanded,setExpanded]=useState<string[]>([]);
 if(!state.teams.length)return <div className="panel empty-text">{admin?'Nie dodano jeszcze drużyn. Kliknij „Dodaj drużynę”, aby wpisać nazwę i zawodników.':'Lista drużyn pojawi się po dodaniu zespołów przez organizatora.'}</div>;
 return <div className="teams-list">{state.teams.map(t=>{const letter=letters.find(l=>state.slots[l]===t.id)||'',open=expanded.includes(t.id),panelId='team-roster-'+t.id;return <section className="panel team-list-item" key={t.id}>
  <div className="team-list-row"><div className="team-list-identity"><span className="team-list-logo">{t.logo?<img src={t.logo} alt={'Logotyp: '+t.name}/>:<Users size={22}/>}</span><div><h3>{t.name}</h3><small>{admin?`${t.players.length} zawodników · `:''}{letter?`Litera ${letter}`:'Bez przypisanej litery'}{t.temporary?' · TEST':''}</small></div></div>
  <div className="team-list-actions">{admin&&<><button className="secondary" aria-expanded={open} aria-controls={panelId} onClick={()=>setExpanded(prev=>open?prev.filter(id=>id!==t.id):[...prev,t.id])}>{open?'Zwiń skład':'Rozwiń skład'}<ChevronDown size={16} style={{transform:open?'rotate(180deg)':undefined}}/></button><label className="team-letter-label">Litera losowania<select aria-label={'Litera losowania: '+t.name} value={letter} disabled={pending||started} onChange={e=>onAction({type:'assign-team',teamId:t.id,letter:e.target.value})}><option value="">Nieprzypisana</option>{letters.map(l=><option key={l} value={l} disabled={!!state.slots[l]&&state.slots[l]!==t.id}>{l}{state.slots[l]&&state.slots[l]!==t.id?' · zajęta':''}</option>)}</select></label></>}{!admin&&<span className="badge">{letter||'—'}</span>}</div></div>
  {admin&&open&&<div className="team-list-details" id={panelId}><h4>Skład drużyny</h4><ol className="team-player-list">{t.players.map(p=><li key={p}>{p}</li>)}</ol><button className="secondary" disabled={pending||started} onClick={()=>onEdit(t)}>Edytuj drużynę i skład</button><TeamLogoUpload team={t} disabled={pending} onSave={logo=>onAction({type:'logo',teamId:t.id,logo})}/></div>}
 </section>})}</div>
}

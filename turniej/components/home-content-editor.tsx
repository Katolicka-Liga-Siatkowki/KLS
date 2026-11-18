'use client';
import {useState} from 'react';
import HomeArticle from './home-article';

export default function HomeContentEditor({content,pending,onSave}:{content:string,pending:boolean,onSave:(content:string)=>Promise<boolean|undefined>}){
 const [draft,setDraft]=useState(content),[preview,setPreview]=useState(false),[saved,setSaved]=useState(false);
 return <section className="panel settings-panel home-content-editor" style={{gridColumn:'1 / -1'}}><h2>Cały wpis na stronie startowej</h2><p>Możesz zmienić całą treść: wstęp, termin, miejsce, zapisy, wpisowe, listę darów, kontakt i odnośniki.</p><form onSubmit={async e=>{e.preventDefault();setSaved(false);if(await onSave(draft))setSaved(true)}}><label>Treść całego wpisu<textarea name="homeContent" value={draft} onChange={e=>{setDraft(e.target.value);setSaved(false)}} rows={28} maxLength={30000} required/></label><p className="muted">Nagłówki: # tytuł, ## sekcja, ### podsekcja. Pogrubienie: **tekst**. Lista: - pozycja. Link: [nazwa](adres). Pusta linia rozdziela akapity.</p><div className="button-row"><button className="primary" disabled={pending||!draft.trim()}>Zapisz cały wpis</button><button className="secondary" type="button" aria-expanded={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Ukryj podgląd':'Pokaż podgląd'}</button><span className="muted">{draft.length} / 30000 znaków</span></div>{saved&&<p role="status">Cały wpis został zapisany.</p>}</form>{preview&&<div className="home-content-preview"><h3>Podgląd wpisu</h3><HomeArticle content={draft}/></div>}</section>;
}

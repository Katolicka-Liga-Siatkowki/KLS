'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';

const photos=[
 {src:'/assets/previous-edition/1.webp',alt:'Uczestnicy poprzednich edycji turnieju na wspólnym zdjęciu w hali'},
 {src:'/assets/previous-edition/2.webp',alt:'Spotkanie uczestników poprzednich edycji w hali sportowej'},
 {src:'/assets/previous-edition/3.webp',alt:'Siatkarze witają się przy siatce podczas turnieju'},
 {src:'/assets/previous-edition/4.webp',alt:'Uczestnicy akcji charytatywnej z zebranymi darami'},
 {src:'/assets/previous-edition/5.webp',alt:'Przekazanie darów zebranych podczas akcji charytatywnej'},
];

export default function TournamentHome({onNavigate}:{onNavigate:(tab:string)=>void}){
 const [current,setCurrent]=useState(0),[playing,setPlaying]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  setPlaying(!motion.matches);
  const onMotion=()=>{if(motion.matches)setPlaying(false)};
  const onVisibility=()=>setVisible(!document.hidden);
  onVisibility();motion.addEventListener('change',onMotion);document.addEventListener('visibilitychange',onVisibility);
  return()=>{motion.removeEventListener('change',onMotion);document.removeEventListener('visibilitychange',onVisibility)};
 },[]);
 useEffect(()=>{
  if(!playing||hovered||focused||!visible)return;
  const timer=setInterval(()=>setCurrent(value=>(value+1)%photos.length),5000);
  return()=>clearInterval(timer);
 },[playing,hovered,focused,visible]);
 function select(index:number){setCurrent((index+photos.length)%photos.length);setPlaying(false)}
 return <div className="tournament-home">
  <section className="home-intro panel">
   <div className="eyebrow">SPORT ŁĄCZY. POMOC ZOSTAJE.</div>
   <h2>Gramy razem w dobrej sprawie.</h2>
   <p>Opis turnieju pojawi się wkrótce.</p>
   <div className="button-row"><a className="primary" href="/zgloszenia" onClick={e=>{e.preventDefault();onNavigate('registrations')}}>Zgłoś drużynę <ArrowRight size={17}/></a><a className="secondary" href="/checklista" onClick={e=>{e.preventDefault();onNavigate('support')}}>Zobacz checklistę pomocy</a></div>
  </section>
  <section className="home-gallery" aria-label="Zdjęcia z poprzednich edycji" aria-roledescription="karuzela" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}>
   <div className="section-heading"><div><div className="eyebrow">WSPOMNIENIA</div><h2>Poprzednie edycje w obiektywie</h2></div><button className="secondary" aria-label={playing?'Zatrzymaj pokaz slajdów':'Włącz pokaz slajdów'} onClick={()=>setPlaying(value=>!value)}>{playing?<Pause size={17}/>:<Play size={17}/>}<span>{playing?'Zatrzymaj':'Odtwórz'}</span></button></div>
   <div className="home-slides" aria-live={playing?'off':'polite'}>
    {photos.map((photo,index)=><figure key={photo.src} className={index===current?'home-slide is-current':'home-slide'} aria-hidden={index!==current} role="group" aria-roledescription="slajd" aria-label={`${index+1} z ${photos.length}`}><img src={photo.src} alt={photo.alt} width={1600} height={1067} loading={index===0?'eager':'lazy'}/></figure>)}
    <button className="gallery-arrow previous" aria-label="Poprzednie zdjęcie" onClick={()=>select(current-1)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="Następne zdjęcie" onClick={()=>select(current+1)}><ChevronRight/></button>
    <span className="gallery-counter" aria-hidden="true">{current+1} / {photos.length}</span>
   </div>
   <div className="gallery-thumbnails">{photos.map((photo,index)=><button key={photo.src} className={index===current?'is-current':''} aria-label={`Pokaż zdjęcie ${index+1}: ${photo.alt}`} aria-current={index===current?'true':undefined} onClick={()=>select(index)}><img src={photo.src} alt="" loading="lazy" width={160} height={100}/></button>)}</div>
  </section>
 </div>;
}

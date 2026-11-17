'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,Pause,Play,Instagram} from 'lucide-react';

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
   <p className="home-lead"><strong>Zapraszamy na 3. Warszawsko-Praski Turniej Charytatywny pod szyldem <a href="https://diecezja.waw.pl/warszawsko-praska-liga-siatkowki-wpls/" target="_blank" rel="noopener noreferrer">Warszawsko-Praskiej Ligi Siatkówki</a>. W zawodach mogą wziąć udział członkowie wspólnot działających przy parafiach diecezji warszawsko-praskiej i archidiecezji warszawskiej oraz ich duszpasterze. To nie tylko sportowa rywalizacja, ale także świetna okazja do integracji, wspólnej zabawy i pomagania!</strong></p>
   <div className="button-row"><a className="primary" href="/zgloszenia" onClick={e=>{e.preventDefault();onNavigate('registrations')}}>Zgłoś drużynę <ArrowRight size={17}/></a><a className="secondary" href="/checklista" onClick={e=>{e.preventDefault();onNavigate('support')}}>Zobacz checklistę pomocy</a></div>
   <div className="home-description">
    <section><h3>Kiedy i gdzie zagramy?</h3><p>Wydarzenie odbędzie się w sobotę <strong>12 grudnia 2026 r.</strong> na hali widowiskowo-sportowej w Falenicy (ul. Poezji 5, 04-994 Warszawa).</p></section>
    <section><h3>Jak się zapisać?</h3><p>Zgłoszenia są przyjmowane aż do skompletowania wymaganej liczby drużyn (maksymalnie <strong>16 zespołów</strong>). Aby turniej się odbył, musi zgłosić się minimalnie <strong>12 zespołów</strong>.</p><p><strong>Termin zgłoszeń: do 9 grudnia lub do wyczerpania limitu miejsc.</strong></p><p>Pierwszym krokiem zgłoszenia jest wypełnienie <a href="/zgloszenia" onClick={e=>{e.preventDefault();onNavigate('registrations')}}>formularza</a>. Następnie czekaj na wiadomość mailową potwierdzającą udział oraz dalsze instrukcje.</p></section>
    <section><h3>Wpisowe</h3><p>Opłata wpisowa to wpłata na cele organizacyjne turnieju w kwocie <strong>320 zł od drużyny</strong>, przelana na konto Katolickiego Stowarzyszenia Młodzieży Diecezji Warszawsko-Praskiej <strong className="home-bank-account">58 1870 1045 2078 1072 1222 0003</strong>, zgodnie z instrukcją otrzymaną w mailu zwrotnym potwierdzającym udział w ramach limitu miejsc. Wpłatę należy wnieść <strong>w ciągu 3 dni od otrzymania potwierdzenia</strong>. Nieopłacenie zgłoszenia daje szansę na zapis dla innych drużyn.</p><p>Druga część wpisowego jest związana z charytatywną misją turnieju. Wsparciem otoczymy <strong>Hospicjum Stacjonarne Caritas Archidiecezji Warszawskiej przy Krakowskim Przedmieściu 62</strong>. Każdą drużynę prosimy o skompletowanie paczki, która będzie zawierać produkty z poniższej listy. Wielkość paczki i kwota, jaką przeznaczycie na jej przygotowanie, to Wasza drużynowa decyzja. Zróbcie to w zgodzie z Waszymi możliwościami i otwartością serc. Ważne, aby wszystkie przedmioty w paczce były <strong>nowe i nieużywane</strong>.</p></section>
    <section><h3>Lista rzeczy do skompletowania paczki</h3><ul className="home-donation-list">
     <li>Balsamy nawilżające hypoalergiczne (mogą być oliwkowe dla dzieci)</li>
     <li>Pianki do mycia hypoalergiczne SENI</li>
     <li>Chusteczki nawilżające najlepsze firmy SENI 80</li>
     <li>Kremy do rąk i stóp — mogą być różne</li>
     <li>Żel pod prysznic delikatny zapachowy</li>
     <li>Krem do ciała np. ISANA, np. masło kakaowe</li>
     <li>Dezodorant hypoalergiczny</li>
     <li>Skarpetki bawełniane bezuciskowe XL</li>
     <li>T-shirt L i XL (jasne kolory), bawełniane</li>
     <li>Cienkie bawełniane czapki, najlepiej bezszwowe</li>
     <li>Radio ELTRA Mewa Jasne Drewno, analogowe, tuner FM/LW, obrotowa, teleskopowa, wysuwana antena, zasilanie sieciowe</li>
    </ul><h4>Coś ekstra</h4><ul className="home-donation-list"><li>Projektor nieba</li><li>Dyfuzor zapachowy wraz z naturalnymi olejkami eterycznymi (preferowane zapachy olejków: sosna, pomarańcza, drzewo herbaciane, eukaliptus)</li></ul><p>Wszystkie zebrane podczas turnieju dary przekażemy Hospicjum Stacjonarnemu Caritas Archidiecezji Warszawskiej przy Krakowskim Przedmieściu 62, by sprzyjały rozwojowi placówki i podopiecznych.</p><p><a href="/checklista" onClick={e=>{e.preventDefault();onNavigate('support')}}>Przejdź do checklisty pomocy i zaznacz, co przyniesie Twoja drużyna.</a></p></section>
    <section><h3>Kibice i nagrody</h3><p>Na turniej zapraszamy oczywiście także kibiców z Waszych parafii — trybuny pomieszczą wszystkich zainteresowanych. Kibiców również zachęcamy do włączenia się w zbiórkę. Dla najlepszych drużyn przewidziane są puchary i medale.</p></section>
    <section><h3>Kontakt</h3><p>Kontakt w razie pytań dodatkowych: <a href="mailto:zarzad.wpls@gmail.com">zarzad.wpls@gmail.com</a></p></section>
    <section className="home-social"><h3>Obserwuj ligę</h3><div className="home-social-links"><a href="https://www.facebook.com/diecezjalnasiatkowka" target="_blank" rel="noopener noreferrer"><span className="social-icon facebook-icon" aria-hidden="true">f</span>Facebook</a><a href="https://www.instagram.com/diecezjalnasiatkowka/" target="_blank" rel="noopener noreferrer"><span className="social-icon instagram-icon" aria-hidden="true"><Instagram size={27}/></span>Instagram</a></div></section>
    <section className="home-reports"><h3>Zobacz jak było na poprzednich edycjach</h3><ul><li><a href="https://diecezja.waw.pl/1-warszawsko-praski-turniej-charytatywny-w-siatkowke/" target="_blank" rel="noopener noreferrer">1. WARSZAWSKO-PRASKI TURNIEJ CHARYTATYWNY W SIATKÓWKĘ <ArrowRight size={17} aria-hidden="true"/></a></li><li><a href="https://diecezja.waw.pl/2-warszawsko-praski-turniej-charytatywny/" target="_blank" rel="noopener noreferrer">2. WARSZAWSKO-PRASKI TURNIEJ CHARYTATYWNY W SIATKÓWKĘ <ArrowRight size={17} aria-hidden="true"/></a></li></ul></section>
   </div>
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

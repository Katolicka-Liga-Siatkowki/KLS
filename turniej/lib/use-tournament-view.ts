'use client';
import type {MvpPhase} from './tournament';
import {useEffect,useRef,useState} from 'react';
const key='centrum-turnieju:view:v1';
const tabs=['overview','schedule','table','mvp','bracket','teams','ref','settings','support','registrations'];
const filters=['Wszystkie','Oczekuje','W grze','Zakończone'];
const tabPaths:Record<string,string>={registrations:'/zgloszenia',support:'/checklista'};
function pathTab(){const path=decodeURIComponent(window.location.pathname).replace(/\/$/,'');return path==='/zgloszenia'||path==='/zgłoszenia'?'registrations':path==='/checklista'?'support':null}
type View={tab:string,selected:number|null,filter:string,pairing:string,mvpPhase:MvpPhase};
const defaults:View={tab:'overview',selected:null,filter:'Wszystkie',pairing:'current',mvpPhase:'regular'};
export function useTournamentView(loading:boolean){
 const [view,setView]=useState<View>(defaults),[hydrated,setHydrated]=useState(false);
 const restoreScroll=useRef<number|null>(null);
 useEffect(()=>{
  const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';
  try{
   const saved=JSON.parse(sessionStorage.getItem(key)||'null');
   if(saved&&typeof saved==='object'){
    setView({mvpPhase:saved.mvpPhase==='knockout'?'knockout':'regular',tab:tabs.includes(saved.tab)?saved.tab:defaults.tab,selected:Number.isInteger(saved.selected)&&saved.selected>0?saved.selected:null,filter:filters.includes(saved.filter)?saved.filter:defaults.filter,pairing:saved.pairing==='current'||typeof saved.pairing==='string'&&/^(?:[2-9]|1[0-6])$/.test(saved.pairing)?saved.pairing:defaults.pairing});
    restoreScroll.current=Number.isFinite(saved.scrollY)&&saved.scrollY>=0?saved.scrollY:0;
   }
  }catch{/* Browser storage can be disabled; navigation still works. */}
  const url=new URL(window.location.href),requestedTab=url.searchParams.get('tab');if(requestedTab&&tabs.includes(requestedTab)){setView(v=>({...v,tab:requestedTab}));restoreScroll.current=0;url.searchParams.delete('tab');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)}
  const fromPath=pathTab();if(fromPath){setView(v=>({...v,tab:fromPath}));}
  const onBack=()=>{const requested=pathTab()??new URL(window.location.href).searchParams.get('tab')??'overview';setView(v=>({...v,tab:tabs.includes(requested)?requested:'overview',selected:null}));};
  window.addEventListener('popstate',onBack);
  setHydrated(true);return()=>{window.history.scrollRestoration=previous;window.removeEventListener('popstate',onBack)};
 },[]);
 useEffect(()=>{
  if(!hydrated)return;
  const save=()=>{try{sessionStorage.setItem(key,JSON.stringify({...view,scrollY:restoreScroll.current??window.scrollY}))}catch{}};
  save();window.addEventListener('scroll',save,{passive:true});window.addEventListener('pagehide',save);
  return()=>{window.removeEventListener('scroll',save);window.removeEventListener('pagehide',save)};
 },[view,hydrated]);
 useEffect(()=>{
  if(loading||!hydrated||restoreScroll.current===null)return;
  let cancelled=false,frame=0;
  // Restore only after tournament content and font metrics are available.
  Promise.resolve(document.fonts?.ready).then(()=>{
   if(cancelled)return;
   frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
    if(cancelled||restoreScroll.current===null)return;
    window.scrollTo({top:restoreScroll.current,behavior:'instant'});restoreScroll.current=null;
    try{sessionStorage.setItem(key,JSON.stringify({...view,scrollY:window.scrollY}))}catch{}
   })});
  });
  return()=>{cancelled=true;cancelAnimationFrame(frame)};
 },[loading,hydrated,view]);
 return {...view,setMvpPhase:(mvpPhase:MvpPhase)=>setView(v=>({...v,mvpPhase})),setTab:(tab:string)=>{const path=tabPaths[tab]??(tab==='overview'?'/':'/?tab='+encodeURIComponent(tab));if(window.location.pathname+window.location.search!==path)window.history.pushState(window.history.state,'',path);setView(v=>({...v,tab}));},setSelected:(selected:number|null)=>setView(v=>({...v,selected})),setFilter:(filter:string)=>setView(v=>({...v,filter})),setPairing:(pairing:string)=>setView(v=>({...v,pairing}))};
}

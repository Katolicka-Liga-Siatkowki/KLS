'use client';
import type {MvpPhase} from './tournament';
import {useEffect,useRef,useState} from 'react';
const key='centrum-turnieju:view:v1';
const tabs=['overview','schedule','table','mvp','bracket','teams','ref','settings'];
const filters=['Wszystkie','Oczekuje','W grze','Zakończone'];
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
  setHydrated(true);return()=>{window.history.scrollRestoration=previous};
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
 return {...view,setMvpPhase:(mvpPhase:MvpPhase)=>setView(v=>({...v,mvpPhase})),setTab:(tab:string)=>setView(v=>({...v,tab})),setSelected:(selected:number|null)=>setView(v=>({...v,selected})),setFilter:(filter:string)=>setView(v=>({...v,filter})),setPairing:(pairing:string)=>setView(v=>({...v,pairing}))};
}

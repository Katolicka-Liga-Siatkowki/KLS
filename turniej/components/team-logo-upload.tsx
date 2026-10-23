'use client';
import {useId,useRef,useState} from 'react';
import type {Team} from '@/lib/tournament';
export default function TeamLogoUpload({team,disabled,onSave}:{team:Team,disabled:boolean,onSave:(logo:string)=>Promise<unknown>}){
 const input=useRef<HTMLInputElement>(null),inputId=useId();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function upload(file:File){setBusy(true);setError('');let url='';try{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Wybierz PNG, JPG lub WebP.');
  if(file.size>10*1024*1024)throw Error('Maksymalny rozmiar pliku to 10 MB.');
  url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
  const scale=Math.min(1,256/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);const logo=canvas.toDataURL('image/webp',0.85);
  if(logo.length>140000)throw Error('Obraz jest zbyt złożony. Wybierz mniejszy plik.');await onSave(logo);
 }catch(e){setError(e instanceof Error?e.message:'Nie udało się wczytać obrazu.')}finally{if(url)URL.revokeObjectURL(url);setBusy(false)}}
 return <div className="logo-upload"><button type="button" className="secondary" aria-controls={inputId} disabled={disabled||busy} onClick={()=>input.current?.click()}>{team.logo?'Zmień logotyp':'Dodaj logotyp'}</button><input ref={input} id={inputId} hidden aria-label={'Logotyp: '+team.name} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/>{busy&&<small>Zapisywanie logotypu…</small>}{team.logo&&<button className="text-btn" disabled={disabled||busy} onClick={()=>onSave('')}>Usuń logotyp</button>}{error&&<p role="alert">{error}</p>}</div>
}

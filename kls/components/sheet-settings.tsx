"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
const labels = {table:"Tabela",matches:"Mecze",teams:"Drużyny",players:"Zawodnicy"};
type Links = Record<keyof typeof labels,string>;
export function SheetSettings() {
  const router=useRouter();
  const [links,setLinks]=useState<Links>({table:"",matches:"",teams:"",players:""});
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{let active=true; fetch("/api/admin/sheet-settings",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Nie udało się odczytać ustawień arkusza.");return r.json() as Promise<Links>;}).then(data=>{if(active){setLinks(data);setReady(true);}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[]);
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setMessage("");
    try {const response=await fetch("/api/admin/sheet-settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(links)});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||"Nie udało się zapisać.");setMessage("Zapisano linki. Dane będą pobierane przy otwieraniu strony. Jeśli tabela pozostaje pusta, sprawdź dostęp do arkusza i układ kolumn.");router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:"Błąd połączenia.");}finally{setBusy(false);}
  }
  return <section className="admin-card"><h2>Podłącz Arkusz Google</h2><p>W arkuszu ustaw dostęp „Każda osoba mająca link — Wyświetlający”. Otwórz kolejno cztery zakładki i skopiuj ich pełne adresy z paska przeglądarki. Układ kolumn powinien odpowiadać arkuszowi rozgrywek WPLS; inny układ wymaga dopasowania importu.</p><form onSubmit={save} className="admin-form">{(Object.keys(labels) as (keyof Links)[]).map(key=><label key={key} htmlFor={`sheet-${key}`}>{labels[key]}<input id={`sheet-${key}`} type="url" required maxLength={1000} disabled={!ready||busy} value={links[key]} onChange={e=>setLinks({...links,[key]:e.target.value})} placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0" /></label>)}<button className="btn dark" disabled={!ready||busy} type="submit">{busy?"Zapisywanie…":"Zapisz arkusz"}</button></form><p role="status">{message}</p></section>;
}


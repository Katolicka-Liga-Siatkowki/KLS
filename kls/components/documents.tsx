"use client";
import { useEffect, useState, type FormEvent } from "react";
import { DOCUMENT_LIMIT, type LeagueDocument } from "@/lib/document-types";
export function Documents({admin=false}:{admin?:boolean}) {
 const [items,setItems]=useState<LeagueDocument[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[edit,setEdit]=useState<LeagueDocument|null>(null),[formKey,setFormKey]=useState(0);
 const endpoint=admin?"/api/admin/documents":"/api/documents";
 async function load(){setLoading(true);try{const r=await fetch(endpoint,{cache:"no-store"});if(!r.ok)throw new Error("Nie udało się pobrać dokumentów.");setItems(await r.json() as LeagueDocument[]);}catch(e){setError(e instanceof Error?e.message:"Błąd połączenia.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[endpoint]);
 async function save(event:FormEvent<HTMLFormElement>){
 event.preventDefault();const data=new FormData(event.currentTarget);const file=data.get("file");
 if(file instanceof File&&file.size>DOCUMENT_LIMIT){setError("Plik może mieć maksymalnie 10 MB.");return;}
 data.set("visible",data.get("visible")==="on"?"1":"0");if(edit)data.set("id",edit.id);
 setBusy(true);setError("");setMessage("");
 try{const r=await fetch(endpoint,{method:"POST",body:data});const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error||"Błąd zapisu.");setEdit(null);setFormKey(k=>k+1);setMessage("Zapisano dokument. Zmiany są widoczne na stronie.");await load();}catch(e){setError(e instanceof Error?e.message:"Błąd połączenia.");}finally{setBusy(false);}
 }
 return <>
 {admin&&<form key={`${edit?.id||"new"}-${formKey}`} onSubmit={save} className="admin-card admin-form">
 <h2>{edit?"Edytuj dokument":"Dodaj dokument"}</h2>
 <p>Możesz zmienić nazwę i opis albo wgrać nową wersję pliku. PDF, DOC, DOCX, XLS i XLSX — maksymalnie 10 MB.</p>
 <label>Nazwa dokumentu<input name="title" required maxLength={160} defaultValue={edit?.title} disabled={busy}/></label>
 <label>Opis<textarea name="description" maxLength={2000} rows={3} defaultValue={edit?.description} disabled={busy}/></label>
 <label>{edit?"Nowy plik (opcjonalnie)":"Plik"}<input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" required={!edit} disabled={busy}/></label>
 {edit?.filename&&<p>Obecny plik: {edit.filename}. Pozostaw wybór pliku pusty, aby go zachować.</p>}
 <label>Kolejność<input name="sortOrder" type="number" min={0} max={1000} defaultValue={edit?.sort_order??100} disabled={busy}/></label>
 <label style={{display:"flex",alignItems:"center",gap:8}}><input style={{width:"auto"}} name="visible" type="checkbox" defaultChecked={edit?Boolean(edit.visible):true} disabled={busy}/>Widoczny na stronie</label>
 <div className="form-actions"><button className="btn dark" disabled={busy} type="submit">{busy?"Zapisywanie…":edit?"Zapisz zmiany":"Dodaj dokument"}</button>{edit&&<button type="button" className="btn light" disabled={busy} onClick={()=>{setEdit(null);setFormKey(k=>k+1);}}>Anuluj edycję</button>}</div>
 </form>}
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {loading?<p role="status">Wczytywanie dokumentów…</p>:<div className="rule-grid">{items.map(item=><article key={item.id}>
 <span>{item.filename?item.filename.split('.').pop()?.toUpperCase():"W PRZYGOTOWANIU"}{admin&&!item.visible?" · UKRYTY":""}</span>
 <h3>{item.title}</h3><p>{item.description}</p>
 {item.filename?<><p>{item.filename} · {(item.size/1024/1024).toFixed(2)} MB</p><a className="btn dark" href={`/api/documents/${encodeURIComponent(item.id)}`} download>Pobierz dokument</a></>:<p>Plik zostanie udostępniony po jego dodaniu przez zarząd.</p>}
 {admin&&<button style={{marginTop:12}} className="btn light" type="button" disabled={busy} onClick={()=>{setEdit(item);setFormKey(k=>k+1);setError("");setMessage("");}}>Edytuj / podmień plik</button>}
 </article>)}</div>}
 {!loading&&!items.length&&!error&&<p>Brak dokumentów do pobrania.</p>}
 </>;
}

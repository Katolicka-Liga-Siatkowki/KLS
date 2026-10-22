'use client';
import {useState} from 'react';
import {ShieldCheck,ArrowLeft} from 'lucide-react';
export default function Login(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="login-page"><a href="/" className="text-btn"><ArrowLeft size={16}/> Wróć do turnieju</a><section className="panel login-card"><ShieldCheck size={30}/><h1>Logowanie do turnieju</h1><p>Organizator i sędziowie logują się adresem e-mail oraz hasłem otrzymanym od organizatora. Wyniki można oglądać bez logowania.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.get('email'),password:f.get('password')})});const d=await r.json();if(!r.ok)throw Error(d.error);window.location.replace('/')}catch(e){setError(e instanceof Error?e.message:'Nie udało się zalogować.');setBusy(false)}}}><label>Adres e-mail<input name="email" type="email" autoComplete="username" required/></label><label>Hasło<input name="password" type="password" autoComplete="current-password" required maxLength={1024}/></label>{error&&<div className="error" role="alert">{error}</div>}<button className="primary" disabled={busy}>{busy?'Logowanie…':'Zaloguj się'}</button></form></section></main>
}

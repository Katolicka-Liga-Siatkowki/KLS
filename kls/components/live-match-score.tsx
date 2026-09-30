'use client';
import {useEffect,useState,type ReactNode} from 'react';
type Live={status:string;score:number[];sets:number[];setScores:number[][];updatedAt:string};
export function LiveMatchScore({matchId,fallback}:{matchId:number;fallback:ReactNode}){
 const [live,setLive]=useState<Live|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;const controller=new AbortController();async function poll(){try{const response=await fetch('/api/protokoly/live?matchId='+matchId,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Unavailable');const data=await response.json();if(alive){setLive(data.live);setFailed(false);}}catch{if(alive)setFailed(true);}}void poll();const timer=setInterval(()=>{if(!document.hidden)void poll();},10000);return()=>{alive=false;controller.abort();clearInterval(timer);};},[matchId]);
 if(!live||live.status==='scheduled')return <>{fallback}</>;
 const finished=['finished','approved'].includes(live.status),stale=failed||Date.now()-new Date(live.updatedAt).getTime()>120000;
 return <div className="score finished"><strong>{live.sets.join(' : ')}</strong><small>{finished?(live.status==='approved'?'WYNIK ZATWIERDZONY':'MECZ ZAKOŃCZONY · DO ZATWIERDZENIA'):'NA ŻYWO · PUNKTY '+live.score.join(':')}</small><small>{live.setScores.map(s=>s.join(':')).join(' · ')}</small>{!finished&&stale&&<small>Ostatni zapis · oczekiwanie na aktualizację</small>}</div>;
}

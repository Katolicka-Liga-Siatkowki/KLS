import { z } from "zod";
import { getD1 } from "./league-data";
import { csvRows } from "./google-sheets-data";
import { buildPlayoff, type PlayoffData } from "./playoff";

export const playoffSettingsSchema=z.object({url:z.string().max(1000),visible:z.boolean(),placement:z.boolean(),seeds:z.array(z.string().trim().min(1).max(160)).max(8)}).refine(v=>v.seeds.length===0 || (v.seeds.length===8 && new Set(v.seeds.map(s=>s.toLocaleLowerCase("pl"))).size===8),"Wpisz osiem różnych drużyn w kolejności końcowej tabeli albo pozostaw listę pustą.");
export type PlayoffSettings=z.infer<typeof playoffSettingsSchema>;
export function playoffExportUrl(value:string){const u=new URL(value);const id=u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];const gid=u.searchParams.get("gid")??new URLSearchParams(u.hash.slice(1)).get("gid");if(u.protocol!=="https:"||u.hostname!=="docs.google.com"||!id||!gid||!/^\d+$/.test(gid))throw new Error("Wklej link do zakładki play-off w Arkuszu Google, zawierający gid.");return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}&headers=0`;}
export async function getPlayoffSettings():Promise<PlayoffSettings>{
 const db=getD1();const [row,section]=await Promise.all([db.prepare("SELECT value FROM settings WHERE key='playoff_settings'").first<{value:string}>(),db.prepare("SELECT visible FROM site_sections WHERE section_key='play-off'").first<{visible:number}>()]);
 return playoffSettingsSchema.parse({...row?JSON.parse(row.value):{url:"",placement:false,seeds:[]},visible:!!section?.visible});
}
export async function loadPlayoff(settings:PlayoffSettings,season:string):Promise<PlayoffData>{
 try{const response=await fetch(playoffExportUrl(settings.url),{cache:"no-store",signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error("Arkusz niedostępny");const text=await response.text();if(/<html[\s>]/i.test(text)||!text.trim())throw new Error("Nieprawidłowa odpowiedź arkusza");const rows=csvRows(text);if(!rows.some(r=>r.some(c=>c.trim()==="Złoty set")))throw new Error("Zmieniony układ kolumn");return buildPlayoff(rows,season,settings.seeds,settings.placement);}
 catch{return {...buildPlayoff([],season,settings.seeds,settings.placement),error:"Nie udało się pobrać play-off. Spróbuj ponownie za chwilę.",updatedAt:""};}
}

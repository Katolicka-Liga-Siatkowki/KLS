export type RegistrationKey={id:string,token:string,teamName:string,eventId:string};
const key='kls:registration-keys:v1';
export function registrationKeys(eventId:string):RegistrationKey[]{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter((v:any)=>v.eventId===eventId&&typeof v.id==='string'&&typeof v.token==='string'&&typeof v.teamName==='string'):[]}catch{return []}}
export function saveRegistrationKey(value:RegistrationKey){try{const previous=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([...(Array.isArray(previous)?previous:[]).filter((v:any)=>v.id!==value.id),value]));return true}catch{return false}}
export async function eventJson(url:string,options?:RequestInit){const response=await fetch(url,{cache:'no-store',...options}),data=await response.json();if(!response.ok)throw Error(data.error||'Nie udało się wykonać operacji.');return data}

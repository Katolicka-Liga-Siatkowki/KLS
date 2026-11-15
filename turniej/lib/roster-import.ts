import {unzipSync} from 'fflate';

const maxPlayers=30;
const header=/^(lp\.?|nr|imi[eę]|nazwisko|imi[eę]\s+i\s+nazwisko|zawodnik|zawodnicy|skład|drużyna|data\s+urodzenia)$/i;
const entities=(value:string)=>value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const clean=(value:string)=>entities(value).replace(/<[^>]+>/g,' ').replace(/^\s*\d+[.)-]?\s*/,'').replace(/\s+/g,' ').trim();
const plausible=(value:string)=>value.length>=3&&value.length<=100&&!header.test(value)&&!/@|https?:|\d{3,}/i.test(value)&&/^[\p{L}][\p{L}'’.-]+(?:\s+[\p{L}][\p{L}'’.-]+)+$/u.test(value);
function unique(values:string[]){const seen=new Set<string>();return values.map(clean).filter(plausible).filter(value=>{const key=value.toLocaleLowerCase('pl-PL');if(seen.has(key))return false;seen.add(key);return true}).slice(0,maxPlayers)}
function rows(text:string){return text.replace(/\r/g,'').split('\n').map(line=>line.split(/[;\t,]/).map(clean).filter(Boolean).filter(cell=>!/^\d+$/.test(cell)&&!header.test(cell)).join(' '))}
function xmlText(xml:string){return entities(xml.replace(/<\/(?:w:p|row)>/g,'\n').replace(/<[^>]+>/g,' ')).replace(/\s*\n\s*/g,'\n')}
function decode(bytes:Uint8Array){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw Error('Plik tekstowy musi być zapisany w UTF-8.')}}

export function extractRosterPlayers(name:string,bytes:Uint8Array){
 const ext=name.split('.').pop()?.toLowerCase();
 if(ext==='txt'||ext==='csv')return unique(rows(decode(bytes)));
 if(ext!=='docx'&&ext!=='xlsx')throw Error('Automatyczny odczyt obsługuje pliki DOCX, XLSX, CSV i TXT.');
 let archive:Record<string,Uint8Array>;try{archive=unzipSync(bytes)}catch{throw Error('Nie udało się otworzyć pliku. Sprawdź, czy nie jest uszkodzony.');}
 if(ext==='docx'){
  const document=archive['word/document.xml'];if(!document)throw Error('Plik DOCX nie zawiera dokumentu.');
  return unique(xmlText(decode(document)).split('\n'));
 }
 const shared=archive['xl/sharedStrings.xml'];
 const sharedValues=shared?[...decode(shared).matchAll(/<si[\s>][\s\S]*?<\/si>/g)].map(match=>clean(xmlText(match[0]))):[];
 const values:string[]=[];
 for(const [path,data] of Object.entries(archive).filter(([path])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(path)).sort()){
  const xml=decode(data);
  for(const row of xml.matchAll(/<row[\s>][\s\S]*?<\/row>/g)){
   const cells:string[]=[];
   for(const cell of row[0].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)){
    const attrs=cell[1],body=cell[2],raw=body.match(/<v>([\s\S]*?)<\/v>/)?.[1]??body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]??'';
    const value=/\bt="s"/.test(attrs)?sharedValues[Number(raw)]??'':clean(raw);if(value&&!/^\d+$/.test(value)&&!header.test(value))cells.push(value);
   }
   values.push(cells.join(' '));
  }
 }
 return unique(values);
}

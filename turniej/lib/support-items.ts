export type SupportItem={id:string,name:string,target:number|null,extra?:boolean,note?:string,url?:string};
// Transcribed from the organizer's attached “Lista produktów.docx”. Prices are
// estimates from that document, not current prices or purchase instructions.
export const supportItems:SupportItem[]=[
 {id:'balsamy',name:'Balsamy nawilżające hypoalergiczne',target:80,note:'Mogą być oliwkowe dla dzieci.'},
 {id:'pianki',name:'Pianki do mycia hypoalergiczne SENI',target:60},
 {id:'chusteczki',name:'Chusteczki nawilżające',target:80,note:'Najlepiej firmy SENI.'},
 {id:'kremy-rece',name:'Kremy do rąk i stóp',target:80,note:'Mogą być różne.'},
 {id:'zele',name:'Żel pod prysznic',target:40,note:'Delikatny, zapachowy.'},
 {id:'kremy-cialo',name:'Krem do ciała',target:40,note:'Np. ISANA, masło kakaowe.'},
 {id:'dezodoranty',name:'Dezodorant hypoalergiczny',target:40},
 {id:'skarpetki',name:'Skarpetki bawełniane bezuciskowe XL',target:60},
 {id:'koszulki',name:'T-shirt L i XL',target:70,note:'Bawełniane, jasne kolory.'},
 {id:'czapki',name:'Cienkie bawełniane czapki',target:20,note:'Najlepiej bezszwowe.'},
 {id:'radia',name:'Radio ELTRA Mewa — jasne drewno',target:13,note:'Analogowe FM/LW, antena obrotowa teleskopowa, zasilanie sieciowe. W dokumencie: 129 zł/szt.',url:'https://www.mediaexpert.pl/telewizory-i-rtv/drobny-sprzet-rtv/radia/radio-mewa-jasne-drewno'},
 {id:'projektory',name:'Projektor nieba',target:13,extra:true,note:'Dodatkowo, jeśli się uda. W dokumencie: 114,99 zł/szt.',url:'https://allegro.pl/produkt/lampka-projektor-led_rgb_planetarium_czarny-wielokolorowy-a4263f4e-f572-4040-ace2-76634bc44e17?offerId=17245389387'},
 {id:'dyfuzory',name:'Dyfuzor zapachowy',target:4,extra:true,note:'Wraz z naturalnymi olejkami eterycznymi. W dokumencie: 79 zł/szt.',url:'https://www.euro.com.pl/aromatyzery/raven-ceramiczny-ena005.bhtml'},
 {id:'olejki',name:'Naturalne olejki eteryczne do dyfuzora',target:null,extra:true,note:'Sosna, pomarańcza, drzewo herbaciane, eukaliptus. Liczba sztuk do ustalenia; w dokumencie ok. 10 zł/szt.',url:'https://mojaapteka.pl/1386-olejki-eteryczne-do-dyfuzora'},
];
export const maxRosterBytes=10*1024*1024;
export function registrationFields(team:unknown,email:unknown,phone:unknown){
 const teamName=typeof team==='string'?team.trim():'',mail=typeof email==='string'?email.trim().toLowerCase():'',number=typeof phone==='string'?phone.trim():'';
 if(!teamName||teamName.length>100)throw Error('Podaj nazwę drużyny, do 100 znaków.');
 if(mail.length>254||!/^\S+@\S+\.\S+$/.test(mail))throw Error('Podaj poprawny e-mail kapitana.');
 if(number.length>30||!/^[+\d ()-]+$/.test(number)||number.replace(/\D/g,'').length<7||number.replace(/\D/g,'').length>15)throw Error('Podaj poprawny numer telefonu.');
 return {teamName,teamKey:teamName.toLocaleLowerCase('pl-PL'),email:mail,phone:number};
}
export function rosterType(name:string,bytes:Uint8Array){
 if(!bytes.length||bytes.length>maxRosterBytes)throw Error('Plik ze składem musi mieć od 1 bajta do 10 MB.');
 const ext=name.split('.').pop()?.toLowerCase(),head=Array.from(bytes.slice(0,8)),starts=(values:number[])=>values.every((n,i)=>head[i]===n);
 if(ext==='pdf'&&starts([37,80,68,70,45]))return 'application/pdf';
 if(['docx','xlsx','odt'].includes(ext||'')&&starts([80,75,3,4]))return 'application/octet-stream';
 if(['doc','xls'].includes(ext||'')&&starts([208,207,17,224,161,177,26,225]))return 'application/octet-stream';
 if(['txt','csv'].includes(ext||'')&&!bytes.includes(0)){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return 'text/plain'}catch{}}
 if(['jpg','jpeg'].includes(ext||'')&&starts([255,216,255]))return 'image/jpeg';
 if(ext==='png'&&starts([137,80,78,71,13,10,26,10]))return 'image/png';
 throw Error('Dołącz PDF, DOC, DOCX, XLS, XLSX, ODT, TXT, CSV, JPG lub PNG (do 10 MB).');
}

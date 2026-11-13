// Oddzielny skrypt powiadomień turnieju. Nie zastępuje skryptu kontaktowego KLS.
// Ustaw TOURNEY_MAIL_SECRET (minimum 32 znaki) we Właściwościach skryptu.
// Wdróż jako aplikację internetową, wykonuj jako właściciel, dostęp: każdy.
function doPost(event) {
 const out=value=>ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
 let lock;
 try {
  if(!event||!event.postData||event.postData.contents.length>20000)return out({ok:false});
  const envelope=JSON.parse(event.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('TOURNEY_MAIL_SECRET');
  if(!secret||secret.length<32||typeof envelope.payload!=='string'||typeof envelope.signature!=='string')return out({ok:false});
  const expected=Utilities.base64Encode(Utilities.computeHmacSha256Signature(envelope.payload,secret,Utilities.Charset.UTF_8));let difference=expected.length^envelope.signature.length;
  for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^(envelope.signature.charCodeAt(i)||0);if(difference)return out({ok:false});
  const data=JSON.parse(envelope.payload);
  if(data.to!=='zarzad.wpls@gmail.com'||!Number.isFinite(data.timestamp)||Math.abs(Date.now()-data.timestamp)>300000||!/^[a-f0-9-]{36}$/.test(data.id)||typeof data.text!=='string'||data.text.length>10000||typeof data.subject!=='string'||data.subject.length>200||!/^\S+@\S+\.\S+$/.test(data.replyTo))return out({ok:false});
  lock=LockService.getScriptLock();if(!lock.tryLock(10000))return out({ok:false});
  const sent=PropertiesService.getScriptProperties(),key='sent:'+data.id;if(sent.getProperty(key))return out({ok:true});
  if(MailApp.getRemainingDailyQuota()<1)return out({ok:false});
  MailApp.sendEmail({to:'zarzad.wpls@gmail.com',replyTo:data.replyTo,subject:data.subject.replace(/[\r\n]/g,' '),body:data.text,name:'WPLS — zgłoszenia turnieju'});
  sent.setProperty(key,String(Date.now()));return out({ok:true});
 }catch{return out({ok:false})}finally{if(lock&&lock.hasLock())lock.releaseLock()}
}

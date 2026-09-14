// Ustaw GOOGLE_MAIL_SECRET we Właściwościach skryptu (Ustawienia projektu).
// Wdróż jako aplikację internetową: wykonuj jako właściciel, dostęp: każdy.
function doPost(event) {
  const output=value=>ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    if(!event||!event.postData||event.postData.contents.length>15000000) return output({ok:false});
    const envelope=JSON.parse(event.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('GOOGLE_MAIL_SECRET');
    if(!secret||secret.length<32||typeof envelope.payload!=='string'||typeof envelope.signature!=='string') return output({ok:false});
    const expected=Utilities.base64Encode(Utilities.computeHmacSha256Signature(envelope.payload,secret,Utilities.Charset.UTF_8));
    let difference=expected.length^envelope.signature.length;
    for(let i=0;i<expected.length;i++) difference|=expected.charCodeAt(i)^(envelope.signature.charCodeAt(i)||0);
    if(difference) return output({ok:false});
    const data=JSON.parse(envelope.payload);
    if(!Number.isFinite(data.timestamp)||Math.abs(Date.now()-data.timestamp)>300000||!/^[a-f0-9-]{36}$/.test(data.id)) return output({ok:false});
    if(!['contact','registration'].includes(data.kind)||typeof data.name!=='string'||data.name.length>100||typeof data.subject!=='string'||data.subject.length>160||typeof data.message!=='string'||data.message.length>5000||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return output({ok:false});
    if(!Array.isArray(data.attachments)||data.attachments.length>5) return output({ok:false});
    let total=0;
    const allowed=['image/png','image/jpeg','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const attachments=data.attachments.map(file=>{
      if(!allowed.includes(file.type)||typeof file.filename!=='string'||typeof file.content!=='string') throw new Error('attachment');
      const bytes=Utilities.base64Decode(file.content);total+=bytes.length;
      if(bytes.length>5*1024*1024||total>10*1024*1024) throw new Error('size');
      return Utilities.newBlob(bytes,file.type,file.filename.replace(/[\r\n]/g,''));
    });
    lock=LockService.getScriptLock();if(!lock.tryLock(10000)) return output({ok:false});
    const cache=CacheService.getScriptCache();if(cache.get(data.id)) return output({ok:true});
    if(MailApp.getRemainingDailyQuota()<1) return output({ok:false});
    MailApp.sendEmail({to:'katolickaligasiatkowki@gmail.com',replyTo:data.email,name:'KLS — formularz strony',subject:'[KLS] '+data.subject.replace(/[\r\n]/g,' '),body:'Od: '+data.name+' <'+data.email+'>\n\n'+data.message,attachments});
    cache.put(data.id,'sent',600);return output({ok:true});
  } catch(error) {return output({ok:false});}
  finally {if(lock&&lock.hasLock()) lock.releaseLock();}
}

(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const KEY='aoqatReminderInboxV1',TTL=86400000;
  const excluded=new Set(['prayer','adhan','iqama','prayer-alarm','prayer-notice','tomorrow-publish-alarm']);
  function read(now=Date.now()){
    let rows;try{rows=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){rows=[];}
    if(!Array.isArray(rows))rows=[];
    rows=rows.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.body==='string'&&Number.isFinite(x.createdAt)&&now-x.createdAt<TTL&&x.createdAt<=now&&!excluded.has(x.kind));
    try{localStorage.setItem(KEY,JSON.stringify(rows));}catch(_){}
    return rows;
  }
  function add(event){
    if(!event||excluded.has(event.kind)||event.kind==='preview')return null;
    const now=Date.now(),createdAt=Number.isFinite(event.createdAt)?event.createdAt:now;if(now-createdAt>=TTL||createdAt>now)return null;const entry={id:String(event.id||event.key||('reminder-'+now)),kind:String(event.kind||'reminder'),title:String(event.title||'تذكير'),body:String(event.body||''),createdAt,section:event.section==='fasting'?'fasting':'friday',topicId:String(event.topicId||''),action:event.action==='post'?'post':'detail',targetDate:/^\d{4}-\d{2}-\d{2}$/.test(event.targetDate||'')?event.targetDate:''};
    const rows=read(now);if(rows.some(x=>x.id===entry.id))return rows.find(x=>x.id===entry.id);
    rows.unshift(entry);try{localStorage.setItem(KEY,JSON.stringify(rows));}catch(_){}
    window.dispatchEvent(new Event('aoqatInboxChanged'));return entry;
  }
  function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
  function createView(id){
    const wrap=document.createElement('section');wrap.id='reminderInbox';wrap.dir='rtl';
    const rows=read(),entry=id?rows.find(x=>x.id===id):null;
    if(id){
      if(!entry){wrap.append(text('p','انتهت مدة هذا الإشعار أو لم يعد متاحاً.'));return wrap;}
      wrap.append(text('h3',entry.title),text('p',entry.body));
      const b=text('button',entry.action==='post'?'معاينة البوست ونشره':entry.section==='fasting'?'عرض شرح صيام التطوع والمصادر':'عرض سنن يوم الجمعة و آدابها والمصادر');b.type='button';b.className='main-action';b.onclick=()=>entry.action==='post'?window.aoqatOpenCommunityPost?.(entry.section,entry.topicId,entry.targetDate):window.aoqatOpenMuslimBagSection?.(entry.section,entry.topicId);wrap.append(b);
    }else{
      wrap.append(text('p','تظهر هنا التذكيرات لمدة 24 ساعة من صدورها.'));
      if(!rows.length)wrap.append(text('p','لا توجد إشعارات حالياً.'));
      for(const item of rows){const b=document.createElement('button');b.type='button';b.className='main-action';b.dataset.reminderId=item.id;b.append(text('strong',item.title),text('small',new Date(item.createdAt).toLocaleString('ar-IQ',{timeZone:'Asia/Baghdad'})));b.onclick=()=>window.aoqatOpenNotification?.(item.id);wrap.append(b);}
    }
    return wrap;
  }
  window.AoqatReminderInbox={add,read,createView};
  const style=document.createElement('style');style.textContent='#reminderInbox{line-height:1.9}#reminderInbox .main-action{width:100%;margin:10px 0;text-align:right}#reminderInbox small{display:block;font-size:12px;margin-top:5px}#reminderInbox p{white-space:pre-line}';document.head.append(style);
  setInterval(()=>{read();window.dispatchEvent(new Event('aoqatInboxChanged'));},60000);
  navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='AOQAT_OPEN_REMINDER'){if(e.data.entry)add(e.data.entry);window.aoqatOpenNotification?.(e.data.id);}});
})();
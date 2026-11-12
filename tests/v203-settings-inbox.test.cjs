'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {test}=require('node:test');
const C=require('../js/azkar-reminders-core.js');
const read=p=>fs.readFileSync(p,'utf8');

function inboxTestContext() {
 const saved=new Map();
 const listeners=[];
 const localStorage={
  getItem:key=>saved.has(key)?saved.get(key):null,
  setItem:(key,value)=>saved.set(key,String(value))
 };
 const document={
  head:{append(){}},
  createElement:tag=>({textContent:'',style:{},setAttribute(){},append(){},addEventListener(){}})
 };
 const window={dispatchEvent:e=>listeners.push(e.type)};
 const context={window,localStorage,document,navigator:{},setInterval(){},Event:function(type){this.type=type;},Date,console};
 vm.runInNewContext(read('js/reminder-inbox.js'),context);
 return {inbox:window.AoqatReminderInbox,saved,localStorage,listeners};
}

test('new interface controls start ON while a saved user OFF stays OFF',()=>{
 const code=read('js/compact-design-menu.js');
 for(const token of ['clock:true','date:true','adhan:true','iqama:true','state[k]!==false'])assert.ok(code.includes(token),token);
 assert.ok(code.includes('state[k]=state[k]===false'));
 assert.ok(code.includes("state[slide.dataset.visibilityKey]!==false"),'Design visibility must remain independent');
 const prep=read('android-native/prepare-web-assets.py');
 assert.ok(!prep.includes("transform('compact-design-menu.js', [(\"let state={};try{state="));
});

test('tomorrow day-switch originals exist only in alert settings and retain native handlers',()=>{
 const menu=read('js/web-menu-order.js'),hub=read('js/alerts-hub.js');
 assert.ok(!menu.includes('["switch","⏰","التبديل التلقائي و التنبيه","switchPanel"]'));
 assert.ok(menu.includes('showShortButtonHelp(wrap,ALERT_HELP)'));
 assert.ok(menu.includes("data.alertSection")||menu.includes("dataset.alertSection"));
 assert.ok(hub.includes("'autoTomorrowToggle'")&&hub.includes("'tomorrowNotifyToggle'"));
 assert.ok(hub.includes("root.append(node)")&&hub.includes("parked.appendChild(node)"));
 assert.ok(menu.includes('aoqat-help-dot'));
});

test('daily repeated adhkar never enter 24h inbox, Friday salawat and other reminders do',()=>{
 const {inbox,saved}=inboxTestContext();
 const make=(topicId,kind='azkar-reminder')=>({
  id:topicId+':1',topicId,kind,section:'azkar',title:'تذكير: '+topicId,
  body:'اختبار التذكير'
 });
 for(const kind of ['morning','evening','prayer','sleep','waking','tasbih'])
  assert.equal(inbox.add(make(kind)),null,kind);
 const friday=inbox.add(make('salawat'));
 assert.ok(friday);
 const sunnah=inbox.add({...make('friday-sunnah','sunnah'),section:'friday'});
 assert.ok(sunnah);
 const fasting=inbox.add({...make('fasting','fasting'),section:'fasting'});
 assert.ok(fasting);
 assert.equal(inbox.read().length,3);
 // A previously recorded row must also disappear after the upgrade.
 const old=JSON.parse(saved.get('aoqatReminderInboxV1'));
 old.push({...make('morning'),createdAt:Date.now()});
 old.push({...make('tasbih'),createdAt:Date.now()});
 saved.set('aoqatReminderInboxV1',JSON.stringify(old));
 assert.equal(inbox.read().length,3);
 assert.equal(inbox.read().filter(x=>x.topicId==='salawat').length,1);
});

test('Friday salawat reminder is independent and keeps its Friday-only title',()=>{
 const thursday=new Date('2026-10-15T09:00:00+03:00');
 const friday=new Date('2026-10-16T09:00:00+03:00');
 const row={gregorian_month:10,gregorian_day:16,fajr:'4:45',sunrise:'6:08',dhuhr:'11:55',asr:'3:08',maghrib:'5:34',isha:'6:54'};
 assert.equal(C.events(thursday,{}, {...row,gregorian_day:15}).filter(e=>e.topicId==='salawat').length,0);
 const due=C.events(friday,{},row),salawat=due.filter(e=>e.topicId==='salawat');
 assert.equal(salawat.length,1);
 assert.equal(salawat[0].title,'تذكير: الصلاة على النبي ﷺ يوم الجمعة');
 assert.equal(new Date(salawat[0].at).toISOString().slice(11,16),'06:00');
 assert.equal(due.filter(e=>e.topicId==='tasbih').length,2);
 assert.equal(C.events(friday,{salawat:{enabled:false}},row).filter(e=>e.topicId==='salawat').length,0);
});

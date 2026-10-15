(function(root){'use strict';
 const DAY=86400000,names=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
 function key(date){return root.AoqatFridayRemindersCore.dateParts(date).key;}
 function baseline(date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).map(x=>[x.type,x.value]));return {year:+p.year,month:+p.month,day:+p.day};}
 const calendar={DAY,key,baseline};
 const idList=['monday','thursday','white-days','tasua','ashura','shawwal','dhul-hijjah','arafah'];
 function date(date){const C=calendar,k=C.key(date),h=C.baseline(date);return {...h,key:k,weekday:new Date(k+'T12:00:00Z').getUTCDay()};}
 function allowed(h){return h.month!==9&&!(h.month===10&&h.day===1)&&!(h.month===12&&h.day>=10&&h.day<=13);}
 function candidates(now=new Date()){
  const C=calendar,k=C.key(now),mid=Date.parse(k+'T12:00:00+03:00'),today=date(new Date(mid)),tomorrow=date(new Date(mid+C.DAY)),out=[];
  const add=(id,target,label)=>{if(!out.some(x=>x.id===id))out.push({id,topicId:id,targetDate:target,title:label});};
  if(allowed(tomorrow)){
   if(tomorrow.weekday===1)add('monday',tomorrow.key,'صيام يوم الاثنين');
   if(tomorrow.weekday===4)add('thursday',tomorrow.key,'صيام يوم الخميس');
   if(today.day>=12&&today.day<=14&&today.month!==9&&!(today.month===12&&today.day===12)){
    add('white-days',tomorrow.key,'صيام الأيام البيض');
   }
   if(tomorrow.month===1&&tomorrow.day===9)add('tasua',tomorrow.key,'صيام تاسوعاء');
   if(tomorrow.month===1&&tomorrow.day===10)add('ashura',tomorrow.key,'صيام عاشوراء');
   if(tomorrow.month===12&&tomorrow.day===9)add('arafah',tomorrow.key,'صيام يوم عرفة');
   if(tomorrow.month===12&&tomorrow.day===1)add('dhul-hijjah',tomorrow.key,'صيام التسعة الأولى من ذي الحجة');
   if(tomorrow.month===10&&tomorrow.day===2)add('shawwal',tomorrow.key,'ستة أيام من شوال');
  }
  // At the beginning of Shawwal the poster prepares for fasting after Eid, never on Eid.
  if((tomorrow.month===10&&tomorrow.day===1)||(today.month===10&&today.day===1)){
   const target=new Date(mid+(tomorrow.month===10&&tomorrow.day===1?2:1)*C.DAY);add('shawwal',C.key(target),'ستة أيام من شوال');
  }
  return out;
 }
 function topic(id){
  const base=root.AoqatMuslimBag?.topics||[],find=(name)=>base.find(x=>x.id===name);
  if(id==='monday'||id==='thursday')return {...find('monday-thursday'),id,title:id==='monday'?'صيام يوم الاثنين':'صيام يوم الخميس',text:(id==='monday'?'يُستحب صيام يوم الاثنين. ':'يُستحب صيام يوم الخميس. ')+'تُعرض الأعمال يومي الاثنين والخميس، وكان النبي ﷺ يحب أن يُعرض عمله وهو صائم.'};
  if(id==='tasua')return {...find('ashura'),id,title:'صيام تاسوعاء مع عاشوراء'};
  if(id==='dhul-hijjah')return {id,title:'صيام التسعة الأولى من ذي الحجة',text:'يُستحب الصيام في الأيام التسعة الأولى من ذي الحجة، وآكدها يوم عرفة لغير الحاج. أمّا اليوم العاشر فهو عيد الأضحى ولا يجوز صيامه.',ref:'سنن أبي داود 2437؛ صحيح البخاري 1990',url:'https://sunnah.com/abudawud:2437'};
  return find(id);
 }
 function selectedTopics(raw,version2=false){if(!Array.isArray(raw))return [...idList];const ids=new Set(raw);if(!version2&&ids.has('monday-thursday')){ids.add('monday');ids.add('thursday');}if(!version2&&ids.has('ashura'))ids.add('tasua');if(!version2&&['monday-thursday','white-days','arafah','ashura','shawwal','muharram'].every(x=>ids.has(x)))ids.add('dhul-hijjah');return idList.filter(x=>ids.has(x));}
 const api={DAY,key,baseline,names,idList,date,allowed,candidates,topic,selectedTopics};root.AoqatFastingPostsCalendar=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

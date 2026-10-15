const assert=require('node:assert/strict');
module.exports=()=>{
 globalThis.AoqatFridayRemindersCore=require('../js/friday-reminders-core.js');
 const P=globalThis.AoqatFastingPostsCalendar=require('../js/fasting-posts-calendar.js');
 const H=P;
 const dates=new Map();for(let n=0;n<800;n++){const d=new Date(Date.UTC(2026,0,1+n,9)),h=H.baseline(d);dates.set(`${h.year}/${h.month}/${h.day}`,d);}
 const date=(m,d,y=1448)=>{const t=dates.get(`${y}/${m}/${d}`);assert.ok(t,`${y}/${m}/${d}`);return t;};
 const ids=d=>P.candidates(d).map(x=>x.id);
 assert.ok(ids(new Date('2026-10-18T12:00:00+03:00')).includes('monday'));
 assert.ok(ids(new Date('2026-10-21T12:00:00+03:00')).includes('thursday'));
 for(const d of [12,13,14])assert.ok(ids(date(5,d)).includes('white-days'));
 assert.ok(!ids(date(5,15)).includes('white-days'));
 assert.deepEqual(ids(date(9,12)),[]);
 assert.ok(!ids(date(12,12)).includes('white-days'));for(const d of [13,14])assert.ok(ids(date(12,d)).includes('white-days'));
 assert.ok(ids(date(1,8)).includes('tasua'));assert.ok(ids(date(1,9)).includes('ashura'));
 assert.ok(ids(date(12,8)).includes('arafah'));
 const lastDhul=new Date(+date(12,1)-H.DAY);assert.ok(ids(lastDhul).includes('dhul-hijjah'));
 const lastRamadan=new Date(+date(10,1)-H.DAY);for(const d of [lastRamadan,date(10,1)])assert.ok(ids(d).includes('shawwal'));
 for(const d of [lastRamadan,date(10,1)]){const target=P.candidates(d).find(x=>x.id==='shawwal').targetDate;assert.equal(H.baseline(new Date(target+'T12:00:00+03:00')).day,2);}
 assert.ok(!P.allowed({month:10,day:1}));for(let d=10;d<=13;d++)assert.ok(!P.allowed({month:12,day:d}));
 assert.deepEqual(P.selectedTopics(['monday','ashura'],true),['monday','ashura']);assert.ok(P.selectedTopics(['monday-thursday','ashura']).includes('tasua'));
 assert.ok(!P.idList.includes('monday-thursday'));assert.ok(!P.idList.includes('muharram'));
 console.log('Individual fasting schedules, white-day availability, Eid exclusions and saved-topic migration passed');
};
if(require.main===module)module.exports();

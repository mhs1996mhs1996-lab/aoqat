const assert=require('node:assert/strict');
module.exports=()=>{
 const H=globalThis.AoqatHijriCore=require('../js/hijri-calendar-core.js');
 const P=globalThis.AoqatFastingPostsCalendar=require('../js/fasting-posts-calendar.js');
 const parser=require('../server/hijri-announcement-parser.js');
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
 const base=date(9,1),start=new Date(+base+H.DAY),eve=H.key(base),anchor={year:1448,month:9,startDate:H.key(start),publishedAt:eve+'T15:00:00Z',source:'https://dws.gov.iq/test'};
 assert.equal(H.validate(anchor).offset,-1);assert.equal(H.parts(start,[anchor]).day,1);assert.equal(H.parts(new Date(+start+H.DAY),[anchor]).day,2);assert.equal(H.parts(base,[anchor]).month,8);
 const next={year:1448,month:10,startDate:H.key(date(10,1)),publishedAt:new Date(+date(10,1)-H.DAY).toISOString()};assert.equal(H.parts(date(10,1),[anchor,next]).day,1);
 assert.deepEqual(H.parts(new Date('2026-10-15T12:00:00+03:00'),[anchor]),H.baseline(new Date('2026-10-15T12:00:00+03:00')));
 assert.deepEqual(H.parts(date(10,1),[next]),H.baseline(date(10,1)));
 assert.equal(H.validate({...anchor,month:11}),null);assert.equal(H.validate({...anchor,startDate:'2026-02-31'}),null);assert.equal(H.validate({...anchor,startDate:H.key(new Date(+start+5*H.DAY))}),null);
 const pub=new Date(+base-H.DAY),item={title:'أعلن ديوان الوقف السني أن غداً أول أيام شهر رمضان 1448',body:'',url:'https://ina.iq/ar/local/test.html',publishedAt:pub.toISOString()};
 assert.equal(parser.parse(item,base).startDate,H.key(base));
 assert.equal(parser.parse({...item,body:item.title},base).startDate,H.key(base));
 assert.equal(parser.parse({...item,url:'https://example.com/test'},base),null);
 assert.equal(parser.parse(item,new Date(+base+50*H.DAY)),null);
 assert.equal(parser.parse({...item,publishedAt:new Date(+base+H.DAY).toISOString()},base),null);
 assert.equal(parser.parse({...item,title:'أعلن ديوان الوقف السني أن غدا متمم شعبان ولا إعلان لأول أيام رمضان'},base),null);
 assert.equal(parser.parse({...item,title:'أعلن ديوان الوقف السني أن أول شهر رمضان '+H.key(base)+' الموافق '+H.key(start)},base),null);
 console.log('Individual fasting schedules, Eid exclusions, saved-topic migration, official anchors and strict announcement parser passed');
};
if(require.main===module)module.exports();

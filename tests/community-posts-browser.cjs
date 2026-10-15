const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs');
require('./fasting-calendar-checks.cjs')();
globalThis.AoqatFridayRemindersCore=require('../js/friday-reminders-core.js');
globalThis.AoqatFastingRemindersCore=require('../js/fasting-reminders-core.js');
const C=require('../js/community-posts-core.js');
function AoqatPostIds(){return ['monday','thursday','white-days','tasua','ashura','shawwal','dhul-hijjah','arafah'];}
module.exports=async()=>{
 const thursday=new Date('2026-10-15T17:00:00+03:00'),row={gregorian_month:10,gregorian_day:15,maghrib:'5:35',isha:'7:00'},on={enabled:true};
 assert.equal(C.defaults().enabled,false);assert.deepEqual(C.events(thursday,{},row),[]);
 assert.equal(new Date(C.events(thursday,{friday:on},row)[0].at).toISOString(),'2026-10-15T14:55:00.000Z');
 assert.deepEqual(C.events(thursday,{friday:{...on,mode:'clock',time:'17:35'}},row),[]);
 assert.deepEqual(C.events(thursday,{friday:{...on,mode:'clock',time:'19:00'}},row),[]);
 assert.deepEqual(C.events(thursday,{friday:on},{...row,isha:null}),[]);
 assert.deepEqual(C.events(thursday,{friday:on},{...row,gregorian_day:16}),[]);
 const sunday=new Date('2026-10-18T17:00:00+03:00'),sunRow={...row,gregorian_day:18};
 assert.equal(C.events(sunday,{fasting:on},sunRow)[0].topicId,'monday');
 assert.deepEqual(C.events(sunday,{fasting:{...on,topics:[]}},sunRow),[]);
 assert.equal(C.themeIndex(new Date('2026-10-15T01:00:00+03:00')),C.themeIndex(new Date('2026-10-21T23:00:00+03:00')));
 assert.notEqual(C.themeIndex(thursday),C.themeIndex(new Date('2026-10-22T17:00:00+03:00')));
 const server=spawn('python3',['-m','http.server','8794'],{stdio:'ignore'});let browser;
 try{
  await new Promise(r=>setTimeout(r,600));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Asia/Baghdad'}),errors=[];
  await p.clock.install({time:new Date('2026-10-18T10:00:00+03:00')});
  await p.route('**/functions/v1/hijri-sync',r=>r.abort());
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.postShares=[];window.postShareMode='ok';window.postNotices=[];window.Notification=class{static permission='granted';constructor(title,options){postNotices.push({title,options});}};
   Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.[0]?.type==='image/jpeg'});
   Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{postShares.push(files[0]);if(postShareMode==='cancel')throw new DOMException('cancelled','AbortError');}});
  });
  await p.route('**/rest/**',r=>r.abort());await p.goto('http://127.0.0.1:8794',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.aoqatUIReady&&window.AoqatCommunityPosts);
  const before=await p.evaluate(()=>({friday:localStorage.aoqatFridayRemindersV1,fasting:localStorage.aoqatFastingRemindersV1,adhan:localStorage.aoqatAdhanV1}));
  await p.locator('#designSideMenuBtn').click();await p.locator('[data-drawer="muslimBag"]').click();await p.locator('[data-bag-section="friday"]').click();
  assert.equal(await p.locator('#adAzkarPage').evaluate(e=>e.lastElementChild.id),'communityPostControls-friday');
  assert.equal(await p.locator('[data-post-reminder="friday"]').getAttribute('aria-pressed'),'false');
  await p.locator('[data-post-reminder="friday"]').click();
  assert.equal(await p.locator('[data-post-reminder="friday"]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 133, 76)');
  await p.locator('[data-post-delay="friday"]').fill('25');await p.locator('[data-post-delay="friday"]').dispatchEvent('change');
  await p.locator('[data-open-community-post="friday"]').click();
  await p.waitForFunction(()=>document.querySelector('#communityPostPreview')?.naturalWidth===1080);
  assert.deepEqual(await p.locator('#communityPostPreview').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1080,1350]);
  await p.locator('#communityPostShare').click();await p.locator('#communityPostShare').click();
  assert.equal(await p.evaluate(()=>postShares.length===2&&postShares[0]===postShares[1]&&postShares[0].size>30000),true);
  await p.evaluate(()=>window.postShareMode='cancel');await p.locator('#communityPostShare').click();assert.equal(await p.locator('#communityPostView').isVisible(),true);
  const download=p.waitForEvent('download');await p.locator('#communityPostSave').click();assert.match((await download).suggestedFilename(),/^aoqat-friday-.*\.jpg$/);
  // Save actual canvas images for visual review; all six weekly variants and fasting.
  for(let i=0;i<6;i++){
   const data=await p.evaluate(async i=>(await AoqatPostRenderer.render('friday','',new Date('2026-10-15T17:00:00+03:00'),String(i))).canvas.toDataURL('image/png'),i);
   fs.writeFileSync('/tmp/aoqat-adhan-post-friday-'+i+'.png',Buffer.from(data.split(',')[1],'base64'));
  }
  for(const id of AoqatPostIds()){const data=await p.evaluate(async id=>(await AoqatPostRenderer.render('fasting',id,new Date(),'0','2026-10-19')).canvas.toDataURL('image/png'),id);fs.writeFileSync('/tmp/aoqat-adhan-post-'+id+'.png',Buffer.from(data.split(',')[1],'base64'));}
  const fastingImage=await p.evaluate(async()=>(await AoqatPostRenderer.render('fasting','white-days',new Date(),'0')).canvas.toDataURL('image/png'));
  fs.writeFileSync('/tmp/aoqat-adhan-post-fasting.png',Buffer.from(fastingImage.split(',')[1],'base64'));
  await p.locator('.web-back').click();assert.equal(await p.locator('[data-post-reminder="friday"]').getAttribute('aria-pressed'),'true');
  await p.locator('.web-back').click();await p.locator('[data-bag-section="fasting"]').click();
  assert.equal(await p.locator('#muslimBagFasting').evaluate(e=>e.lastElementChild.id),'communityPostControls-fasting');
  assert.equal(await p.locator('[data-post-reminder="fasting"]').getAttribute('aria-pressed'),'false');
  await p.locator('[data-post-reminder="fasting"]').click();await p.locator('[data-post-mode="fasting"]').selectOption('clock');await p.locator('[data-post-time="fasting"]').fill('18:05');await p.locator('[data-post-time="fasting"]').dispatchEvent('change');
  await p.locator('[data-post-topic="arafah"]').uncheck();
  await p.locator('[data-open-community-post="fasting"]').click();await p.waitForFunction(()=>!document.querySelector('#communityPostSave').disabled);
  await p.clock.setSystemTime(new Date('2026-10-23T10:00:00+03:00'));
  await p.evaluate(()=>document.querySelector('#communityPostView').aoqatRefresh());
  await p.locator('#communityPostTopic').selectOption('white-days');await p.waitForFunction(()=>document.querySelector('#communityPostView').dataset.postTopic==='white-days');
  await p.locator('#communityPostDesign').selectOption('2');await p.waitForFunction(()=>document.querySelector('#communityPostView').dataset.postTheme==='2');
  await p.evaluate(()=>window.postShareMode='ok');await p.locator('#communityPostShare').click();
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.aoqatUIReady);
  assert.equal(await p.evaluate(()=>AoqatCommunityPosts.read().friday.delay),25);
  assert.equal(await p.evaluate(()=>AoqatCommunityPosts.read().fasting.time),'18:05');
  assert.equal(await p.evaluate(()=>AoqatCommunityPosts.read().fasting.topics.includes('arafah')),false);
  assert.equal(await p.evaluate(()=>AoqatCommunityPosts.read().fasting.design),'2');
  assert.deepEqual(await p.evaluate(()=>({friday:localStorage.aoqatFridayRemindersV1,fasting:localStorage.aoqatFastingRemindersV1,adhan:localStorage.aoqatAdhanV1})),before);
  // Due reminder, deduplication and inbox-to-post route.
  const result=await p.evaluate(()=>{const now=new Date('2026-10-15T16:00:00+03:00'),d=AoqatFridayRemindersCore.dateParts(now),r=cachedAnnualPrayer(d.month,d.day);
   const event=AoqatCommunityPostsCore.events(now,AoqatCommunityPosts.read(),r).find(x=>x.section==='friday');
   AoqatCommunityPosts.tick(new Date(event.at-1000));const early=!!document.getElementById('communityPostBanner');
   AoqatCommunityPosts.tick(new Date(event.at));AoqatCommunityPosts.tick(new Date(event.at+1000));
   return {early,rows:AoqatReminderInbox.read().filter(x=>x.action==='post').length};});
  assert.equal(result.early,false);assert.equal(result.rows,1);
  await p.evaluate(()=>aoqatOpenNotification(AoqatReminderInbox.read().find(x=>x.action==='post').id));
  await p.locator('#reminderInbox button').click();await p.waitForFunction(()=>!document.querySelector('#communityPostSave').disabled);
  assert.equal(await p.locator('#webSubTitle').textContent(),'بوست سنن الجمعة');
  await p.evaluate(()=>Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}));await p.locator('#communityPostDesign').selectOption('3');
  await p.waitForFunction(()=>document.querySelector('#communityPostView').dataset.postTheme==='3');assert.equal(await p.locator('#communityPostShare').isDisabled(),true);assert.equal(await p.locator('#communityPostSave').isDisabled(),false);
  await p.route('https://**',r=>r.abort());await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.aoqatUIReady);await p.clock.setSystemTime(new Date('2027-06-14T10:00:00+03:00'));await p.evaluate(()=>aoqatOpenCommunityPost('fasting','ashura','2027-06-15'));
  await p.waitForFunction(()=>document.querySelector('#communityPostPreview')?.naturalWidth===1080);
  // A verified future announcement updates every conversion, persists offline and leaves current dates alone.
  const hp=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Asia/Baghdad'});
  await hp.clock.install({time:new Date('2027-02-09T12:00:00+03:00')});
  await hp.route('**/rest/**',r=>r.abort());
  await hp.route('**/functions/v1/hijri-sync',r=>r.fulfill({json:{status:'ok',anchors:[{year:1448,month:9,startDate:'2027-02-09',publishedAt:'2027-02-08T15:00:00Z',source:'https://dws.gov.iq/test-fixture'}]}}));
  await hp.goto('http://127.0.0.1:8794',{waitUntil:'domcontentloaded'});await hp.waitForFunction(()=>window.aoqatUIReady);
  await hp.evaluate(async()=>{await AoqatHijriCalendar.sync();setTodayDateAutomatically();});
  assert.equal(await hp.locator('#hijriDay').inputValue(),'1');
  assert.equal(await hp.locator('#hijriMonth').inputValue(),'رمضان');
  assert.equal(await hp.evaluate(()=>AoqatHijriCalendar.parts(new Date('2026-10-15T12:00:00+03:00')).day===AoqatHijriCore.baseline(new Date('2026-10-15T12:00:00+03:00')).day),true);
  await hp.unroute('**/functions/v1/hijri-sync');await hp.route('https://**',r=>r.abort());
  await hp.reload({waitUntil:'domcontentloaded'});await hp.waitForFunction(()=>window.aoqatUIReady);
  assert.equal(await hp.locator('#hijriDay').inputValue(),'1');await hp.close();
  assert.deepEqual(errors,[]);console.log('Community posts: weekly designs, 1080x1350 JPEG, repeated/cancelled shares, saving, independent opt-in schedules, topic selection, inbox routing and offline assets passed');
 }finally{await browser?.close();server.kill();}
};


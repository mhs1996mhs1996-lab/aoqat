'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.resolve(__dirname,'../js/web-menu-order.js'),'utf8');
const main=js.split('const MENU_ROWS=[',2)[1].split('];',1)[0];

test('pilot-only new OTA menu is conditional and has no permanent update badge',()=>{
  assert.match(main,/ownerPilotOta/);
  assert.match(main,/AndroidNative\?\.readOwnerPilotOtaState/);
  assert.match(main,/AndroidNative\?\.configureAdhan/);
  assert.match(main,/appassets\.androidplatform\.net/);
  assert.match(js,/const PILOT_OTA_BUNDLED_SEQUENCE=6/);
  assert.match(js,/const PILOT_OTA_FEED="https:\/\/raw\.githubusercontent\.com\/mhs1996mhs1996-lab\/aoqat\/owner-pilot-ota\/android-updates\/owner-pilot\/build-150\/manifest\.json"/);
  assert.match(js,/pilotLatest>pilotActiveSequence\(\)/);
  assert.match(js,/notice\.style\.display=update\?"inline-block":"none"/);
  assert.match(js,/if\(id==="ownerPilotOta"\)\{pilotOtaView\(\);return;\}/);
  assert.doesNotMatch(js,/AndroidNative\.saveDataUrl\(.*json/);
});
test('compact styling applies only to profile and experimental OTA screen',()=>{
  assert.match(js,/#aoqatPersonalProfile button\.aoqat-profile-row\{/);
  assert.match(js,/min-height:42px!important/);
  assert.match(js,/#aoqatPilotOtaPanel \.pilot-command/);
  assert.match(js,/min-height:33px!important/);
  assert.match(js,/check\.onclick=async\(\)=>/);
  assert.match(js,/fetch\(PILOT_OTA_FEED,\{cache:"no-store"\}\)/);
});
test('existing local profile, privacy, backup and Quran links persist',()=>{
  for(const id of ['aoqatProfileEdit','aoqatProfileEmail','aoqatProfileAvatar','aoqatProfileBackupExport','aoqatProfileBackupRestore','aoqatProfilePrivacy','aoqatProfileContact','aoqatProfileQuranBookmarks','aoqatProfileQuranLastPage'])assert.ok(js.includes(id),id);
  assert.doesNotMatch(main,/\["privacyPolicy"|\["contactWhatsApp"/);
  assert.match(js,/openSub\("سياسة الخصوصية",wrap,"profile"\)/);
  assert.doesNotMatch(js,/aoqatOwnerSeq4Buttons/);
});

test('pilot native status, activation and advanced ZIP remain behind settings icon',()=>{
  for(const action of ['readOwnerPilotOtaState','reopenOwnerPilotForUpdate','openOwnerPilotOtaAdvanced'])
    assert.ok(js.includes(action),action);
  assert.match(js,/installed\.textContent="التحديث المفعّل:/);
  assert.match(js,/saved\.pending/);
});

test('owner-pilot restores three compact update buttons with no verbose help',()=>{
  const file=fs.readFileSync(path.resolve(__dirname,
    '../android-native/app/src/main/java/com/aoqat/calendar/OwnerPilotActivity.kt'),'utf8');
  for(const label of ['التحقق من تحديث جديد','إعادة فتح التطبيق','خيارات متقدمة (ZIP احتياطي)']){
    assert.ok(file.includes(label),label);
  }
  assert.doesNotMatch(file,/val instructions = TextView/);
  assert.doesNotMatch(js,/hint\.textContent="الاستلام تلقائي/);
});

test('owner-pilot prayer icon is not duplicated and iqama indicator remains independent',()=>{
  const file=fs.readFileSync(path.resolve(__dirname,
    '../android-native/app/src/main/java/com/aoqat/calendar/PrayerWidget.kt'),'utf8');
  assert.match(file,/\.setCustomBigContentView\(views\)/);
  assert.match(file,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(file,/setImageViewResource\(R\.id\.lock_prayer_state_icon,R\.drawable\.pilot_notify_exact_wait\)/);
  assert.match(file,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(file,/setImageViewResource\(R\.id\.lock_iqama_state_icon,/);
  assert.match(file,/views\.setViewVisibility\(R\.id\.lock_iqama_row,\s*if\(extra!=null\)android\.view\.View\.VISIBLE else android\.view\.View\.GONE\)/);
  assert.match(file,/setUsesChronometer\(!BuildConfig\.OWNER_PILOT_ENABLED && next!=null\)/);
});

test('reference icon assets are exact and only one compact notification is rendered',()=>{
  const base=path.resolve(__dirname,'../android-native/app/src/main');
  const cpp=fs.readFileSync(path.join(base,'java/com/aoqat/calendar/PrayerWidget.kt'),'utf8');
  const icon=fs.readFileSync(path.join(base,'java/com/aoqat/calendar/PilotNotificationIcons.kt'),'utf8');
  for(const state of ['adhan','wait','elapsed']){
    const file=path.join(base,'res/drawable-nodpi/pilot_notify_exact_'+state+'.webp');
    const b=fs.readFileSync(file);
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.match(icon,new RegExp('R\\.drawable\\.pilot_notify_exact_'+state));
  }
  assert.doesNotMatch(cpp,/setStyle\(Notification\.DecoratedCustomViewStyle\(\)\)/);
  assert.match(cpp,/val compactViews = views/);
  assert.match(cpp,/setCustomContentView\(compactViews\)/);
  assert.match(cpp,/\.setCustomBigContentView\(views\)/);
});


test('three rolling backups and cross-device restore guard',()=>{
  const vm=require('node:vm');
  const start=js.indexOf('  // Owner-pilot-only browser backup service.');
  const end=js.indexOf('  function profileView(){',start);
  assert.ok(start>=0&&end>start,'isolated web backup module');
  let raw=new Map([['aoqatQuranReaderV1',JSON.stringify({page:304,bookmarks:[{i:10,page:2}]})]]);
  const localStorage={
    get length(){return raw.size;},key:i=>[...raw.keys()][i]||null,
    getItem:k=>raw.get(k)||null,setItem:(k,v)=>raw.set(k,String(v)),
    removeItem:k=>raw.delete(k)
  };
  const context={window:{},document:{addEventListener(){}},localStorage,
    PROFILE_BACKUP_KEYS:['aoqatQuranReaderV1','aoqatLocalProfileNameV1'],
    setTimeout:()=>1,setInterval:()=>1,confirm:()=>true,Date,Math};
  vm.runInNewContext(js.slice(start,end)+
    '\nthis.api={allow:profileBackupAllowedKey,validate:profileBackupValidate,pack:profileBackupMakeData}',context);
  assert.equal(context.api.allow('aoqatLocalProfileNameV1'),true);
  assert.equal(context.api.allow('aoqatQuranReaderV1'),true);
  assert.equal(context.api.allow('aoqatPrayerUserSettingV1'),true);
  assert.equal(context.api.allow('aoqatUpdatePrivateKey'),false);
  assert.equal(context.api.allow('aoqatProfileBackupLastAutoV2'),false);
  const backup=context.api.pack();
  assert.equal(backup.version,2);
  assert.equal(JSON.parse(backup.data.aoqatQuranReaderV1).page,304);
  raw=new Map(); // New phone has no matching localStorage keys.
  const entries=context.api.validate(JSON.stringify(backup));
  assert.equal(entries.length,1);
  assert.throws(()=>context.api.validate(JSON.stringify({
    format:'aoqat-local-backup',version:2,data:{aoqatUpdatePrivateKey:'secret'}
  })));
  assert.ok(js.includes('const PROFILE_BACKUP_LIMIT=3;'));
  assert.ok(js.includes('all.slice(PROFILE_BACKUP_LIMIT-1)'));
  for(const item of ['aoqatProfileBackupShare','aoqatProfileBackupDownload',
    'aoqatProfileBackupSchedule','aoqatProfileRestoreFile','aoqatProfileBackupRestore']){
    assert.ok(js.includes(item),item);
  }
  assert.ok(js.includes('document.addEventListener("visibilitychange"'));
  assert.ok(js.includes('profileBackupAutoTick'));
});


test('lossless backup image codec rejects compressed or altered copies and preserves JSON',()=>{
  const vm=require('node:vm');
  const {TextEncoder,TextDecoder}=require('node:util');
  const from=js.indexOf('  // Lossless PNG carrying a validated backup payload.');
  const to=js.indexOf('  function profileView(){',from);
  assert.ok(from>0&&to>from,'isolated PNG backup codec');
  const context={Uint8Array,DataView,TextEncoder,TextDecoder,document:{},URL:{},Image:function(){}};
  vm.runInNewContext(js.slice(from,to)+
    '\nthis.codec={encode:profileBackupImageEncode,decode:profileBackupImageDecode}',context);
  const raw=JSON.stringify({format:'aoqat-local-backup',version:2,data:{
    aoqatLocalProfileNameV1:'احمد',aoqatQuranReaderV1:JSON.stringify({page:304,bookmarks:[{page:2}]})
  }});
  const packed=context.codec.encode(raw);
  assert.equal(context.codec.decode(packed),raw);
  packed[25]^=1;
  assert.throws(()=>context.codec.decode(packed),/تغيّرت الصورة/);
  assert.throws(()=>context.codec.decode(new Uint8Array(12)));
  assert.match(js,/backupNativeAction\("shareBackupFile"\)/);
  assert.match(js,/backupNativeAction\("saveBackupFile"\)/);
  assert.match(js,/new File\(\[exportJson\],exportFilename,\{type:"application\/json"\}\)/);
  assert.doesNotMatch(js,/window\.AndroidNative\.sharePrayerImage\(exportPng/);
  assert.doesNotMatch(js,/window\.AndroidNative\.savePrayerImage\(exportPng/);
  assert.match(js,/window\.aoqatBackupNativeResult/);
  assert.match(js,/await profileBackupReadPng\(file\)/);
  assert.match(js,/file\.type==="image\/png"/);
  assert.match(js,/profileBackupValidate\(content\)/);
  assert.doesNotMatch(js,/aoqatProfileBackupText/);
  assert.doesNotMatch(js,/aoqatProfileBackupCopy"/);
  assert.doesNotMatch(js,/AndroidNative\.saveDataUrl\(.*json/);
});

test('backup document bridge is isolated to pilot and uses real JSON MIME with URI permission',()=>{
  const root=path.resolve(__dirname,'../android-native/app/src/main');
  const native=fs.readFileSync(path.join(root,'java/com/aoqat/calendar/MainActivity.kt'),'utf8');
  const helper=fs.readFileSync(path.join(root,'java/com/aoqat/calendar/ProfileBackupFile.kt'),'utf8');
  const paths=fs.readFileSync(path.join(root,'res/xml/prayer_image_paths.xml'),'utf8');
  for(const method of ['shareBackupFile','saveBackupFile']) assert.ok(native.includes('fun '+method+'('));
  assert.match(native,/if \(!BuildConfig\.OWNER_PILOT_ENABLED\) return/);
  assert.match(native,/Intent\.ACTION_CREATE_DOCUMENT/);
  assert.match(native,/window\.aoqatBackupNativeResult/);
  assert.match(helper,/const val MIME = "application\/json"/);
  assert.match(helper,/Intent\.ACTION_SEND/);
  assert.match(helper,/FLAG_GRANT_READ_URI_PERMISSION/);
  assert.match(helper,/aoqat-local-backup/);
  assert.match(paths,/shared-backups\//);
});

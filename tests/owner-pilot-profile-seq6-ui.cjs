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

test('owner-pilot single prayer card has one visible state symbol and no expanded continuation',()=>{
  const file=fs.readFileSync(path.resolve(__dirname,
    '../android-native/app/src/main/java/com/aoqat/calendar/PrayerWidget.kt'),'utf8');
  assert.match(file,/setCustomBigContentView\(if\(BuildConfig\.OWNER_PILOT_ENABLED\) compactViews else views\)/);
  assert.match(file,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(file,/setViewVisibility\(R\.id\.lock_iqama_row,android\.view\.View\.GONE\)/);
  assert.match(file,/setUsesChronometer\(!BuildConfig\.OWNER_PILOT_ENABLED && next!=null\)/);
});

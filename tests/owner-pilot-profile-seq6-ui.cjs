'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.resolve(__dirname,'../js/web-menu-order.js'),'utf8');
const main=js.split('const MENU_ROWS=[',2)[1].split('];',1)[0];

test('pilot-only new OTA menu is conditional and has no permanent update badge',()=>{
  assert.match(main,/ownerPilotOta/);
  assert.match(main,/AndroidNative\?\.configureAdhan/);
  assert.match(main,/appassets\.androidplatform\.net/);
  assert.match(js,/const PILOT_OTA_BUNDLED_SEQUENCE=6/);
  assert.match(js,/const PILOT_OTA_FEED="https:\/\/raw\.githubusercontent\.com\/mhs1996mhs1996-lab\/aoqat\/owner-pilot-ota\/android-updates\/owner-pilot\/build-150\/manifest\.json"/);
  assert.match(js,/pilotLatest>PILOT_OTA_BUNDLED_SEQUENCE/);
  assert.match(js,/notice\.style\.display=update\?"inline-block":"none"/);
  assert.match(js,/if\(id==="ownerPilotOta"\)\{pilotOtaView\(\);return;\}/);
  assert.doesNotMatch(js,/AndroidNative\.saveDataUrl\(.*json/);
});
test('compact styling applies only to profile and experimental OTA screen',()=>{
  assert.match(js,/#aoqatPersonalProfile button\.aoqat-profile-row\{/);
  assert.match(js,/min-height:42px!important/);
  assert.match(js,/#aoqatPilotOtaPanel \.pilot-command/);
  assert.match(js,/min-height:37px!important/);
  assert.match(js,/check\.onclick=async\(\)=>/);
  assert.match(js,/fetch\(PILOT_OTA_FEED,\{cache:"no-store"\}\)/);
});
test('existing local profile, privacy, backup and Quran links persist',()=>{
  for(const id of ['aoqatProfileEdit','aoqatProfileEmail','aoqatProfileAvatar','aoqatProfileBackupExport','aoqatProfileBackupRestore','aoqatProfilePrivacy','aoqatProfileContact','aoqatProfileQuranBookmarks','aoqatProfileQuranLastPage'])assert.ok(js.includes(id),id);
  assert.doesNotMatch(main,/\["privacyPolicy"|\["contactWhatsApp"/);
  assert.match(js,/openSub\("سياسة الخصوصية",wrap,"profile"\)/);
  assert.doesNotMatch(js,/aoqatOwnerSeq4Buttons/);
});

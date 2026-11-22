'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android-native/app/src/main/';
const native=name=>fs.readFileSync(root+'java/com/aoqat/calendar/'+name+'.kt','utf8');
test('after iqama is ringer-only, never the DND fallback',()=>{
  const service=native('AdhanPlaybackService');
  assert.match(service,/if\(!silentApplied && ringerOnlyRequested\)/);
  assert.match(service,/ringerOnly\(am,nm,AudioManager\.RINGER_MODE_SILENT\)/);
  assert.match(service,/putBoolean\("ringerOnly",ringerOnlyRequested\)/);
  assert.match(service,/if\(p\.getBoolean\("ringerOnly",false\)\)/);
  assert.match(native('AfterIqamaQuiet'),/preserveUserDnd=true/);
});
test('prayer azkar has one notification id and a thirty minute cooldown',()=>{
  const s=native('CommunityReminders');
  assert.match(s,/ownerPrayerAzkar=BuildConfig\.OWNER_PILOT_ENABLED/);
  assert.match(s,/lastPrayerAzkarNotifiedAt/);
  assert.match(s,/30L\*60000L/);
  assert.match(s,/63941 else e\.getString\("id"\)\.hashCode\(\)/);
});
test('all six lockscreen states have isolated text settings and do not alter visibility',()=>{
  const s=native('LockScreenTextStyle'),w=native('PrayerWidget');
  for(const key of ['prayer','iqama_wait','iqama_elapsed','friday_first','sermon_wait','sermon_elapsed'])
    assert.match(s,new RegExp('"'+key+'"'));
  assert.match(s,/v\.setTextViewTextSize\(id/);
  assert.match(s,/v\.setColorStateList\(id,"setTextColor"/);
  assert.doesNotMatch(s,/setViewVisibility|setChronometer\(/);
  assert.match(w,/LockScreenTextStyle\.apply\(c,views,"prayer"/);
  assert.match(w,/LockScreenSupplement\.Kind\.FRIDAY_SERMON_ELAPSED -> "sermon_elapsed"/);
});
test('secondary icon remains inside the row so Honor does not crop it',()=>{
  const xml=fs.readFileSync(root+'res/layout/notification_lock_next.xml','utf8');
  assert.doesNotMatch(xml,/android:translationX="[1-9][0-9]*dp"/);
  assert.ok(xml.includes('android:id="@+id/lock_iqama_state_icon"'),'supplementary icon is in the custom row');
  assert.ok(xml.includes('android:layout_width="30dp"'),'icon stays inside its reserved native cell');
  assert.match(xml,/android:clipChildren="false"/);
  const widget=native('PrayerWidget');
  assert.match(widget,/PilotNotificationIcons\.exactSmall\(c,true\)/);
  assert.doesNotMatch(widget,/setImageViewResource\(R\.id\.lock_prayer_state_icon,R\.drawable\.pilot_notify_exact_wait\)/);
});
test('format button appears in owner pilot alerts only, never in visibility switches',()=>{
  const s=fs.readFileSync('js/web-menu-order.js','utf8');
  assert.match(s,/button\.id="aoqatLockScreenNotificationTextStyle"/);
  assert.match(s,/button\.onclick=\(\)=>window\.AndroidNative\.openLockScreenTextStyle\(\)/);
  assert.match(s,/openSub\("تعديل بطاقات الشاشة الرئيسية",panel,"appearance"\)/);
  assert.doesNotMatch(s,/\["lockFont","🔤","تنسيق خطوط إشعار شاشة القفل"\]/);
  assert.match(native('MainActivity'),/if\(!BuildConfig\.OWNER_PILOT_ENABLED\)return\s*runOnUiThread \{ LockScreenTextStyle\.showEditor/);
});
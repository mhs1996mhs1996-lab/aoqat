'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const java='android-native/app/src/main/java/com/aoqat/calendar/';
const source=name=>fs.readFileSync(path.join(__dirname,'..',java+name+'.kt'),'utf8');

test('ongoing lock-screen and next-prayer notifications never borrow adhan icon',()=>{
  const widget=source('PrayerWidget');
  assert.match(widget,/val pilotIconIsAdhan = false/);
  assert.match(widget,/PilotNotificationIcons\.smallPhase\(pilotIconIsWaiting\)/);
  assert.match(widget,/PilotNotificationIcons\.exactSmall\(c,pilotIconIsWaiting,pilotIconIsAdhan\)/);
  assert.match(widget,/if\(BuildConfig\.OWNER_PILOT_ENABLED \|\| LockScreenPrayer\.enabled\(this\)\)lockNotification\(this\)/);
  assert.doesNotMatch(widget,/now - it\.at < 90_000L/);
});

test('normal prayer reminders do not carry adhan visual markers',()=>{
  const notification=source('PrayerNotifications');
  assert.match(notification,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallPhase\(true\)/);
  assert.match(notification,/PilotNotificationIcons\.large\(c,PilotNotificationIcons\.coloredPhase\(true\)\)/);
  assert.doesNotMatch(notification,/PilotNotificationIcons\.smallAdhan\(\)/);
  assert.doesNotMatch(notification,/PilotNotificationIcons\.coloredAdhan\(\)/);
});

test('real adhan foreground notification uses adhan icon and tapping opens adhan screen',()=>{
  const adhan=source('AdhanPlaybackService');
  assert.match(adhan,/Intent\(this,AdhanScreenActivity::class\.java\)/);
  assert.match(adhan,/val content=show/);
  assert.match(adhan,/\.setContentIntent\(content\)/);
  assert.match(adhan,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)\s*PilotNotificationIcons\.smallAdhan\(\)/);
  // Auto wake remains controlled by the existing opt-in, unlike explicit taps.
  assert.match(adhan,/if\(screenAlert\)builder\.setFullScreenIntent\(show,true\)/);
  assert.doesNotMatch(adhan,/val content=if\(screenAlert\)show else/);
  const manifest=fs.readFileSync(path.join(__dirname,'../android-native/app/src/main/AndroidManifest.xml'),'utf8');
  assert.match(manifest,/android\.permission\.USE_FULL_SCREEN_INTENT/);
  assert.match(manifest,/android:name="\.AdhanScreenActivity"/);
});

test('all pilot prayer alarms and reminders replace the old Android clock icon',()=>{
  const alarm=source('PrayerAlarm');
  const ahead=source('AdhanSchedule');
  for(const s of [alarm,ahead,source('AlarmCore')]){
    assert.match(s,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallPhase\(true\) else android\.R\.drawable\.ic_lock_idle_alarm\)/);
  }
  assert.match(source('PilotNotificationIcons'),/fun smallAdhan\(\)/);
  assert.match(source('PilotNotificationIcons'),/fun smallPhase\(countDown: Boolean\)/);
});

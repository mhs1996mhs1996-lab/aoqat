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
  assert.match(widget,/if\(BuildConfig\.OWNER_PILOT_ENABLED \|\| LockScreenPrayer\.enabled\(this\)\)lockNotification\(this,BuildConfig\.OWNER_PILOT_ENABLED\)/);
  assert.doesNotMatch(widget,/now - it\.at < 90_000L/);
  assert.match(widget,/fun lockNotification\(c:Context, persistent:Boolean=false\)/);
  assert.doesNotMatch(widget,/setImageViewResource\(R\.id\.lock_prayer_state_icon,/);
  assert.match(widget,/setImageViewResource\(R\.id\.lock_iqama_state_icon,/);
  assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_wait else R\.drawable\.pilot_notify_elapsed/);
  assert.doesNotMatch(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(widget,/if\(!BuildConfig\.OWNER_PILOT_ENABLED \|\| !persistent\) setCustomBigContentView\(views\)/);
  assert.match(widget,/if\(BuildConfig\.OWNER_PILOT_ENABLED && !persistent\)/);
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
  assert.match(adhan,/PilotNotificationIcons\.exactSmall\(\s*this@AdhanPlaybackService, countDown = true, atAdhan = true\s*\)\?\.let \{ setSmallIcon\(it\) \}/);
  assert.doesNotMatch(adhan,/setLargeIcon\(/);
  // Auto wake remains controlled by the existing opt-in, unlike explicit taps.
  assert.match(adhan,/if\(screenAlert\)builder\.setFullScreenIntent\(show,true\)/);
  assert.match(adhan,/val deviceLocked = \(getSystemService\(KEYGUARD_SERVICE\) as KeyguardManager\)\.isKeyguardLocked/);
  assert.match(adhan,/PhoneScreenAlerts\.enabled\(this\) && deviceLocked && !preview && mode=="sound"/);
  assert.match(adhan,/if\(BuildConfig\.OWNER_PILOT_ENABLED\)"إيقاف الأذان" else "إيقاف"/);
  assert.match(adhan,/if\(BuildConfig\.OWNER_PILOT_ENABLED && !intent\.hasExtra\("reminderMessage"\)\)window\.addFlags\(android\.view\.WindowManager\.LayoutParams\.FLAG_FULLSCREEN\)/);
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


test('ordinary and lock-screen cards keep distinct icons without repeating next-prayer symbol',()=>{
  const widget=source('PrayerWidget'), lock=source('LockScreenPrayer');
  assert.match(widget,/AdhanSchedule\.settings\(c\)\.optBoolean\("persistent"\) &&\s*\(BuildConfig\.OWNER_PILOT_ENABLED \|\| !LockScreenPrayer\.enabled\(c\)\)/);
  assert.match(widget,/\.notify\(NOTIFICATION_ID,lockNotification\(c,true\)\)/);
  assert.match(widget,/val compactViews = if \(BuildConfig\.OWNER_PILOT_ENABLED && persistent\)/);
  assert.doesNotMatch(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(widget,/views\.setViewVisibility\(R\.id\.lock_iqama_state_icon,/);
  assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_wait else R\.drawable\.pilot_notify_elapsed/);
  assert.match(widget,/if\(BuildConfig\.OWNER_PILOT_ENABLED && !persistent\)/);
  assert.match(lock,/manager\.notify\(LOCK_NOTIFICATION_ID,NextPrayerService\.lockNotification\(c\)\)/);
  assert.match(lock,/if\(LockScreenPrayer\.enabled\(c\)\) LockScreenPrayer\.showNow\(c\)/);
  assert.match(lock,/if\(usesPilotPersistentCard\(c\)\)/);
  assert.doesNotMatch(lock,/\.cancel\(NextPrayerService\.NOTIFICATION_ID\)/);
});


test('Honor notifications: blue adhan symbol occupies system right icon and never appears again as left large icon',()=>{
 const adhan=source('AdhanPlaybackService'), icons=source('PilotNotificationIcons'), next=source('PrayerWidget');
 assert.match(icons,/atAdhan -> R\.drawable\.pilot_notify_exact_adhan/);
 assert.match(icons,/Icon\.createWithBitmap\(it\)/);
 assert.match(adhan,/PilotNotificationIcons\.exactSmall\(\s*this@AdhanPlaybackService, countDown = true, atAdhan = true/);
 assert.doesNotMatch(adhan,/\.setLargeIcon\(/);
 assert.doesNotMatch(next,/setImageViewResource\(R\.id\.lock_prayer_state_icon,/);
 assert.match(next,/views\.setImageViewResource\(R\.id\.lock_iqama_state_icon,/);
});

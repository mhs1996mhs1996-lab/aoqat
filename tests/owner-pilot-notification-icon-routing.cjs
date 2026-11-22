'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const java='android-native/app/src/main/java/com/aoqat/calendar/';
const source=name=>fs.readFileSync(path.join(__dirname,'..',java+name+'.kt'),'utf8');

test('ongoing lock-screen and next-prayer notifications never borrow adhan icon',()=>{
  const widget=source('PrayerWidget');
  assert.doesNotMatch(widget,/val pilotIconIsAdhan = false/);
  assert.match(widget,/PilotNotificationIcons\.smallAppMarker\(\)/);
  assert.doesNotMatch(widget,/setStyle\(Notification\.DecoratedCustomViewStyle\(\)\)/);
  assert.match(widget,/if\(BuildConfig\.OWNER_PILOT_ENABLED \|\| LockScreenPrayer\.enabled\(this\)\)lockNotification\(this,BuildConfig\.OWNER_PILOT_ENABLED\)/);
  assert.doesNotMatch(widget,/now - it\.at < 90_000L/);
  assert.match(widget,/fun lockNotification\(c:Context, persistent:Boolean=false\)/);
  assert.match(widget,/setImageViewResource\(R\.id\.lock_prayer_state_icon,R\.drawable\.pilot_notify_exact_wait\)/);
  assert.match(widget,/setImageViewResource\(R\.id\.lock_iqama_state_icon,/);
  assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_exact_wait else R\.drawable\.pilot_notify_exact_elapsed/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(widget,/\.setCustomBigContentView\(views\)/);
  assert.match(widget,/\.setCustomBigContentView\(views\)/);
});

test('due-prayer system notifications use the exact blue adhan icon',()=>{
  const notification=source('PrayerNotifications');
  assert.match(notification,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallAdhan\(\)/);
  assert.match(notification,/PilotNotificationIcons\.exactSmall\(c,true,true\)/);
  assert.doesNotMatch(notification,/PilotNotificationIcons\.large\(c,PilotNotificationIcons\.coloredPhase\(true\)\)/);
  assert.doesNotMatch(notification,/setLargeIcon\(/);
  assert.doesNotMatch(notification,/PilotNotificationIcons\.coloredPhase\(/);
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
  for(const s of [ahead,source('AlarmCore')]){
    assert.match(s,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallPhase\(true\) else android\.R\.drawable\.ic_lock_idle_alarm\)/);
  }
  assert.match(alarm,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallAdhan\(\)/);
  assert.match(alarm,/PilotNotificationIcons\.exactSmall\(this,true,true\)/);
  assert.match(source('PilotNotificationIcons'),/fun smallAdhan\(\)/);
  assert.match(source('PilotNotificationIcons'),/fun smallPhase\(countDown: Boolean\)/);
});


test('ordinary and lock-screen cards keep distinct icons without repeating next-prayer symbol',()=>{
  const widget=source('PrayerWidget'), lock=source('LockScreenPrayer');
  assert.match(widget,/AdhanSchedule\.settings\(c\)\.optBoolean\("persistent"\) &&\s*\(BuildConfig\.OWNER_PILOT_ENABLED \|\| !LockScreenPrayer\.enabled\(c\)\)/);
  assert.match(widget,/\.notify\(NOTIFICATION_ID,lockNotification\(c,true\)\)/);
  assert.match(widget,/val compactViews = views/);
  assert.match(widget,/\.setCustomContentView\(compactViews\)/);
  assert.match(widget,/\.setCustomBigContentView\(views\)/);
  assert.doesNotMatch(widget,/setViewVisibility\(R\.id\.lock_iqama_row,android\.view\.View\.GONE\)/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(widget,/setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.GONE\)/);
  assert.match(widget,/views\.setViewVisibility\(R\.id\.lock_iqama_state_icon,/);
  assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_exact_wait else R\.drawable\.pilot_notify_exact_elapsed/);
  assert.match(widget,/\.setCustomBigContentView\(views\)/);
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
 assert.match(next,/setImageViewResource\(R\.id\.lock_prayer_state_icon,R\.drawable\.pilot_notify_exact_wait\)/);
 assert.match(next,/views\.setImageViewResource\(R\.id\.lock_iqama_state_icon,/);
});


test('one original phase icon per active row, identical icon and countdown measurements',()=>{
  const xml=fs.readFileSync(path.join(__dirname,'../android-native/app/src/main/res/layout/notification_lock_next.xml'),'utf8');
  const tag=id=>{
    const match=xml.match(new RegExp('<(?:ImageView|Chronometer|TextView)\\b[^>]*android:id="@\\+id/'+id+'"[^>]*\\/?>','s'));
    assert.ok(match,'notification element '+id);
    return match[0];
  };
  const prop=(tag,name)=>{
    const match=tag.match(new RegExp('android:'+name+'="([^"]+)"'));
    return match?.[1];
  };
  const upper=tag('lock_prayer_state_icon'),lower=tag('lock_iqama_state_icon');
  for(const attribute of ['layout_width','layout_height','layout_marginEnd','scaleType']){
    assert.equal(prop(upper,attribute),prop(lower,attribute),attribute);
  }
  assert.equal(prop(upper,'layout_width'),'30dp');
  assert.equal(prop(upper,'layout_height'),'26dp');
  // Retain approved icon measurements; only remove the oversized OEM decoration.
  assert.equal(prop(upper,'layout_marginEnd'),'6dp');
  const firstClock=tag('lock_prayer_clock'),secondClock=tag('lock_iqama_clock');
  for(const attribute of ['layout_width','layout_marginStart','textSize','gravity','layoutDirection']){
    assert.equal(prop(firstClock,attribute),prop(secondClock,attribute),attribute);
  }
  assert.equal(prop(firstClock,'layout_width'),'105dp');
  assert.equal(prop(firstClock,'layoutDirection'),'ltr');
  for(const id of ['lock_prayer_title','lock_iqama_title']){
    assert.equal(prop(tag(id),'layout_weight'),'1');
    assert.equal(prop(tag(id),'layout_width'),'0dp');
  }
  assert.match(xml,/android:id="@\+id\/lock_iqama_row"[\s\S]*?android:visibility="gone"/);
  const widget=source('PrayerWidget');
  assert.match(widget,/views\.setViewVisibility\(R\.id\.lock_prayer_state_icon,android\.view\.View\.VISIBLE\)/);
  assert.match(widget,/views\.setViewVisibility\(R\.id\.lock_iqama_row,\s*if\(extra!=null\)android\.view\.View\.VISIBLE else android\.view\.View\.GONE\)/);
  assert.match(widget,/views\.setViewVisibility\(R\.id\.lock_iqama_state_icon,\s*if\(extra!=null\)android\.view\.View\.VISIBLE else android\.view\.View\.GONE\)/);
  assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_exact_wait else R\.drawable\.pilot_notify_exact_elapsed/);
  assert.doesNotMatch(widget,/setStyle\(Notification\.DecoratedCustomViewStyle\(\)\)/);
});


test('exact approved model images are only shown once per active countdown and system marker is distinct',()=>{
 const widget=source('PrayerWidget');
 const activity=source('MainActivity');
 const icons=source('PilotNotificationIcons');
 const systemSmall=widget.match(/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)\s*PilotNotificationIcons\.smallAppMarker\(\)/g)||[];
 assert.equal(systemSmall.length,2,'lock-screen and ordinary notifications both use neutral OS icon');
 assert.match(icons,/fun smallAppMarker\(\): Int = R\.drawable\.pilot_notify_small_app/);
 assert.doesNotMatch(widget,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)\s*PilotNotificationIcons\.smallPhase/);
 assert.match(widget,/views\.setImageViewResource\(R\.id\.lock_prayer_state_icon,R\.drawable\.pilot_notify_exact_wait\)/);
 assert.match(widget,/if\(extra\.countDown\)R\.drawable\.pilot_notify_exact_wait else R\.drawable\.pilot_notify_exact_elapsed/);
 assert.match(activity,/setImageViewResource\(R\.id\.iqama_state_icon,\s*if\(display\.countDown\)R\.drawable\.pilot_notify_exact_wait\s*else R\.drawable\.pilot_notify_exact_elapsed\)/);
 assert.match(activity,/\.setSmallIcon\(if\(BuildConfig\.OWNER_PILOT_ENABLED\)PilotNotificationIcons\.smallAppMarker\(\)/);
 assert.doesNotMatch(activity,/PilotNotificationIcons\.large\(context,PilotNotificationIcons\.coloredPhase/);
 const manifest=fs.readFileSync(path.join(__dirname,'../android-native/app/src/main/res/drawable/pilot_notify_small_app.xml'),'utf8');
 assert.match(manifest,/<vector /);
 assert.doesNotMatch(manifest,/pilot_notify_exact_wait|pilot_notify_wait|pilot_notify_adhan/);
});

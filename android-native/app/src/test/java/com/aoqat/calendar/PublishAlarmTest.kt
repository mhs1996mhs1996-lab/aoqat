package com.aoqat.calendar
import android.app.*
import android.content.*
import android.os.Looper
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PublishAlarmTest {
 private val c:Context get()=RuntimeEnvironment.getApplication()
 @Test fun snoozeUsesSavedDurationAndOffRemainsOff(){
  assertEquals(10,AlarmScheduler.snoozeMinutes(c));AlarmScheduler.setSnoozeMinutes(c,7);assertEquals(7,AlarmScheduler.snoozeMinutes(c))
  on();val now=System.currentTimeMillis();AlarmScheduler.scheduleSnooze(c)
  val alarm=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.first()
  assertTrue(alarm.triggerAtTime-now in 420000L..421000L)
  AlarmScheduler.setEnabled(c,false);AlarmScheduler.scheduleSnooze(c)
  assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.isEmpty())
 }
 @Test fun volumeKeySnoozesPublishingWithUserDuration(){on();AlarmScheduler.setSnoozeMinutes(c,6)
  val activity=Robolectric.buildActivity(AlarmActivity::class.java).create().start().resume().get()
  assertTrue(activity.onKeyDown(android.view.KeyEvent.KEYCODE_VOLUME_DOWN,android.view.KeyEvent(0,android.view.KeyEvent.KEYCODE_VOLUME_DOWN)))
  assertTrue(activity.isFinishing)
  assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.any{it.triggerAtTime-System.currentTimeMillis() in 359000L..360000L})
 }
 private fun on(){c.getSharedPreferences("publish_alarm_settings",0).edit().putBoolean("enabled",true).commit();if(android.os.Build.VERSION.SDK_INT>=31)org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)}
 @Test fun freshInstallAndOldPendingBroadcastNeverStartPublishingAlarm(){assertFalse(AlarmScheduler.enabled(c));AlarmScheduler.scheduleFromDatabase(c);AlarmReceiver().onReceive(c,Intent(c,AlarmReceiver::class.java).putExtra("at",System.currentTimeMillis()));assertNull(shadowOf(c as Application).nextStartedService);assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE)as AlarmManager).scheduledAlarms.isEmpty());val service=Robolectric.buildService(AlarmSoundService::class.java).create().get();assertEquals(Service.START_NOT_STICKY,service.onStartCommand(null,0,1))}
 @Test fun disablingCancelsSnoozeAndRejectsRacingReceiver(){on();AlarmScheduler.scheduleSnooze(c);val am=c.getSystemService(Context.ALARM_SERVICE)as AlarmManager;assertFalse(shadowOf(am).scheduledAlarms.isEmpty());AlarmScheduler.setEnabled(c,false);assertTrue(shadowOf(am).scheduledAlarms.isEmpty());AlarmReceiver().onReceive(c,Intent(c,AlarmReceiver::class.java).putExtra("at",System.currentTimeMillis()));assertNull(shadowOf(c as Application).nextStartedService)}
 @Test fun eachOccurrenceRingsOnlyOnceAndRejectsLateBroadcasts(){on();val at=System.currentTimeMillis();assertFalse(AlarmScheduler.claim(c,0));assertFalse(AlarmScheduler.claim(c,at-180000));assertTrue(AlarmScheduler.claim(c,at));assertFalse(AlarmScheduler.claim(c,at))}
 @Test fun notificationHasLockScreenActionAndDismissStopsTheService(){on();val n=AlarmUi.buildAlarmNotification(c);assertNotNull(n.fullScreenIntent);assertNotNull(n.deleteIntent);assertEquals("STOP",shadowOf(n.deleteIntent).savedIntent.action);assertNull((c.getSystemService(Context.NOTIFICATION_SERVICE)as NotificationManager).getNotificationChannel(AlarmUi.CHANNEL_ID).sound);val activity=Robolectric.buildActivity(AlarmActivity::class.java).create().start().resume().get();AlarmActionReceiver().onReceive(c,Intent().setAction("STOP"));shadowOf(Looper.getMainLooper()).idle();assertTrue(activity.isFinishing);assertTrue(AlarmScheduler.enabled(c))}
 @Test fun staleWebOnCannotEnableANewNativeAlarm(){assertFalse(AlarmScheduler.migrate(c,true));assertFalse(AlarmScheduler.enabled(c))}
 @Test fun aSavedOffChoiceCannotBeOverwrittenByOldBrowserPreferences(){assertFalse(AlarmScheduler.migrate(c,false));assertFalse(AlarmScheduler.migrate(c,true))}
}

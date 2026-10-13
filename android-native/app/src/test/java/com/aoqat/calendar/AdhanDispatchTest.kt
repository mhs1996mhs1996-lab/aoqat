package com.aoqat.calendar
import android.app.AlarmManager
import android.app.Application
import android.content.Context
import android.content.Intent
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class AdhanDispatchTest {
 private val c:Context get()=RuntimeEnvironment.getApplication()
 private fun enable(){c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings","{\"enabled\":true}").commit();if(android.os.Build.VERSION.SDK_INT>=31)org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)}
 @After fun cleanup(){AdhanDispatch.release()}
 @Test fun receiverKeepsCpuAwakeUntilServiceTakesOver(){enable();AdhanReceiver().onReceive(c,Intent(c,AdhanReceiver::class.java).setAction("PLAY").putExtra("prayerId","asr").putExtra("prayerAt",System.currentTimeMillis()));assertTrue(AdhanDispatch.held());assertEquals(AdhanPlaybackService::class.java.name,shadowOf(c as Application).nextStartedService.component!!.className);AdhanDispatch.release();assertFalse(AdhanDispatch.held())}
 @Test fun failedStartHasTwoBoundedLocalRetriesAndDoesNotLockDelivery(){enable();val at=System.currentTimeMillis();assertTrue(AdhanSchedule.claim(c,"asr",at));AdhanSchedule.retry(c,"asr",at);assertTrue(AdhanSchedule.claim(c,"asr",at));AdhanSchedule.retry(c,"asr",at);AdhanSchedule.retry(c,"asr",at);val p=c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE);assertEquals(2,p.getInt("retryCount_asr",0));val alarm=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.first{shadowOf(it.operation).savedIntent.getStringExtra("prayerId")=="asr"};assertTrue(alarm.triggerAtTime>=at);assertEquals(at,shadowOf(alarm.operation).savedIntent.getLongExtra("prayerAt",0))}
 @Test fun staleAndDisabledEventsAreNeverRetried(){enable();AdhanSchedule.retry(c,"asr",System.currentTimeMillis()-180000);c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings","{\"enabled\":false}").commit();AdhanSchedule.retry(c,"asr",System.currentTimeMillis());assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.none{shadowOf(it.operation).savedIntent.action=="PLAY"})}
}

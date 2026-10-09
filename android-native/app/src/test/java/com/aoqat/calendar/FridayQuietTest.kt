package com.aoqat.calendar
import android.app.*
import android.content.*
import android.media.AudioManager
import android.os.SystemClock
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class FridayQuietTest {
 private val c:Context get()=RuntimeEnvironment.getApplication()
 private fun seed(mode:String){val s=JSONObject().put("friday",JSONObject().put("enabled",true).put("quiet",true).put("quietMode",mode).put("sermon",35));c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings",s.toString()).commit();shadowOf(c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).setNotificationPolicyAccessGranted(true)}
 @Test fun silentRestoresPreviousRingerAndHonorsManualChanges(){seed("silent");val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager;am.ringerMode=AudioManager.RINGER_MODE_VIBRATE;FridaySchedule.quiet(c,System.currentTimeMillis());assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode);FridaySchedule.restore(c);assertEquals(AudioManager.RINGER_MODE_VIBRATE,am.ringerMode);FridaySchedule.quiet(c,System.currentTimeMillis());am.ringerMode=AudioManager.RINGER_MODE_NORMAL;FridaySchedule.restore(c);assertEquals(AudioManager.RINGER_MODE_NORMAL,am.ringerMode)}
 @Test fun dndRestoresOnlyTheFilterAppliedByTheApp(){seed("dnd");val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager;nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);FridaySchedule.quiet(c,System.currentTimeMillis());assertEquals(NotificationManager.INTERRUPTION_FILTER_ALARMS,nm.currentInterruptionFilter);FridaySchedule.restore(c);assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL,nm.currentInterruptionFilter);FridaySchedule.quiet(c,System.currentTimeMillis());nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);FridaySchedule.restore(c);assertEquals(NotificationManager.INTERRUPTION_FILTER_PRIORITY,nm.currentInterruptionFilter)}
 @Test fun everyPhaseUsesOneRunningNotificationIncludingThePublicLockScreenSurface(){val t=FridayCycle.Timing(System.currentTimeMillis(),20,40);for(now in listOf(t.start,t.first,t.second)){val f=FridayCycle.frame(t,now)!!;val d=IqamaCycle.Display(if(f.down)IqamaCycle.Phase.REMAINING else IqamaCycle.Phase.ELAPSED,SystemClock.elapsedRealtime()+f.base-now,f.down,SystemClock.elapsedRealtime()+f.boundary-now);val n=IqamaNotificationRenderer.build(c,d,f.title);assertEquals(f.title,n.extras.getString(Notification.EXTRA_TITLE));assertEquals(f.title,n.publicVersion.extras.getString(Notification.EXTRA_TITLE));assertTrue(n.flags and Notification.FLAG_NO_CLEAR !=0);assertNotNull(n.contentView);assertNotNull(n.bigContentView)}}
}

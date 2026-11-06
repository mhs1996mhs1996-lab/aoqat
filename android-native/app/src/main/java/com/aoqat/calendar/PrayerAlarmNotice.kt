package com.aoqat.calendar

import android.app.*
import android.content.*

/** One notification ID serves prayer alarms while ringing and during snooze. */
object PrayerAlarmNotice {
    const val ID = 73100
    private const val CHANNEL = "prayer_alarm_v1"
    fun showSnoozed(c: Context, id: String) {
        if (id !in PrayerAlarm.ids || !PrayerAlarm.settings(c).optBoolean("enabled")) return
        val at = PrayerAlarm.prefs(c).getLong("snooze_$id", 0L)
        if (at <= System.currentTimeMillis()) return
        val count = PrayerAlarm.prefs(c).getInt("snoozeCount_$id", 1)
        val item = PrayerAlarm.item(c, id)
        val title = item.optString("label", PrayerAlarm.names[id] ?: "منبّه الصلاة")
        val state = "غفوة حتى " + java.text.SimpleDateFormat("h:mm a", java.util.Locale("ar")).format(java.util.Date(at))
        fun action(type: String) = PendingIntent.getBroadcast(
            c, 72000 + PrayerAlarm.ids.indexOf(id) * 2 + if (type == "SNOOZE") 1 else 0,
            Intent(c, PrayerAlarmActionReceiver::class.java).setAction(type)
                .putExtra("id", id).putExtra("count", count),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val stop = action("STOP")
        val snooze = if (count < item.optInt("count", 3)) action("SNOOZE") else null
        val label = "غفوة " + item.optInt("snooze",10) + " دقائق"
        val compact = AlarmNotificationControls.view(c,title,state,stop,snooze,label)
        val notification = Notification.Builder(c, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title).setContentText(state)
            .setCustomContentView(compact).setCustomBigContentView(compact)
            .setStyle(Notification.DecoratedCustomViewStyle())
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true)
            .setContentIntent(PendingIntent.getActivity(c,73000,
                Intent(c,PrayerAlarmActivity::class.java).putExtra("id",id).putExtra("count",count),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            .addAction(Notification.Action.Builder(null,"إيقاف التنبيه",stop).build())
        if (snooze != null) notification.addAction(Notification.Action.Builder(null,label,snooze).build())
        (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(ID,notification.build())
    }
    fun dismiss(c: Context) {
        (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(ID)
    }
}

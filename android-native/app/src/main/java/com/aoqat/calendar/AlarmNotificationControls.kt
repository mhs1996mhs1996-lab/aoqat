package com.aoqat.calendar

import android.app.PendingIntent
import android.content.Context
import android.view.View
import android.widget.RemoteViews

/** One compact, non-duplicated notification surface for active and snoozed alarms.
 * Android may still rearrange its collapsed notifications on particular OEM skins.
 */
object AlarmNotificationControls {
    fun view(
        c: Context,
        title: String,
        status: String,
        stop: PendingIntent,
        snooze: PendingIntent?,
        snoozeLabel: String = "غفوة 10 دقائق"
    ): RemoteViews = RemoteViews(c.packageName, R.layout.notification_alarm_controls).apply {
        setTextViewText(R.id.alarm_notice_title, title)
        setTextViewText(R.id.alarm_notice_status, status)
        setTextViewText(R.id.alarm_notice_snooze, snoozeLabel)
        setOnClickPendingIntent(R.id.alarm_notice_stop, stop)
        if (snooze == null) setViewVisibility(R.id.alarm_notice_snooze, View.GONE)
        else {
            setViewVisibility(R.id.alarm_notice_snooze, View.VISIBLE)
            setOnClickPendingIntent(R.id.alarm_notice_snooze, snooze)
        }
    }
}

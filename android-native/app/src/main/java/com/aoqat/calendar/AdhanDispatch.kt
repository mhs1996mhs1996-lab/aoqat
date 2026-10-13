package com.aoqat.calendar
import android.content.Context
import android.os.PowerManager
/** Keep the receiver-to-service handoff awake, with a bounded fallback timeout. */
object AdhanDispatch {
 private var wake: PowerManager.WakeLock?=null
 @Synchronized fun acquire(c:Context){if(wake?.isHeld==true)return;wake=(c.getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"aoqat:adhanDispatch").apply{setReferenceCounted(false);acquire(30000L)}}
 @Synchronized fun release(){if(wake?.isHeld==true)wake?.release();wake=null}
 @Synchronized fun held()=wake?.isHeld==true
}

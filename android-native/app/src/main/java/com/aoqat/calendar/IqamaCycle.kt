package com.aoqat.calendar

/** Absolute prayer boundaries, with the user's independent before/after durations. */
object IqamaCycle {
    const val PHASE_MS = 600_000L
    const val TOTAL_MS = PHASE_MS * 2
    data class Durations(val beforeMinutes: Int = 10, val afterMinutes: Int = 10) {
        init { require(beforeMinutes in OPTIONS && afterMinutes in OPTIONS) }
        val beforeMs get() = beforeMinutes * 60_000L
        val totalMs get() = beforeMs + afterMinutes * 60_000L
    }
    private val OPTIONS = setOf(5, 10, 15, 20, 25, 30)
    fun minutes(value: Int, fallback: Int): Int = if (value in OPTIONS) value else fallback
    enum class Phase { WAITING, REMAINING, ELAPSED, FINISHED }
    data class Frame(val phase: Phase, val seconds: Long) {
        fun clock(): String = String.format(java.util.Locale.US, "%02d:%02d", seconds / 60, seconds % 60)
    }
    data class Display(val phase: Phase, val baseRealtime: Long, val countDown: Boolean, val nextBoundary: Long)

    // Every notification surface receives this same absolute, monotonic zero point.
    // Reading a notification later never restarts a timer or uses a cached text value.
    fun display(startRealtime: Long, nowRealtime: Long, durations: Durations = Durations()): Display? {
        val phase = frame(nowRealtime - startRealtime, durations).phase
        if (phase != Phase.REMAINING && phase != Phase.ELAPSED) return null
        return Display(phase, startRealtime + durations.beforeMs, phase == Phase.REMAINING,
            startRealtime + if (phase == Phase.REMAINING) durations.beforeMs else durations.totalMs)
    }
    fun frame(ageMillis: Long, durations: Durations = Durations()): Frame = when {
        ageMillis < 0 -> Frame(Phase.WAITING, durations.beforeMs / 1000)
        ageMillis < durations.beforeMs -> Frame(Phase.REMAINING, (durations.beforeMs - ageMillis + 999) / 1000)
        ageMillis < durations.totalMs -> Frame(Phase.ELAPSED, (ageMillis - durations.beforeMs) / 1000)
        else -> Frame(Phase.FINISHED, durations.afterMinutes * 60L)
    }
}

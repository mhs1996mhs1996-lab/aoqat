package com.aoqat.calendar

/** One immutable 20-minute cycle: ten minutes down, ten minutes up, then done. */
object IqamaCycle {
    const val PHASE_MS = 600_000L
    const val TOTAL_MS = PHASE_MS * 2
    enum class Phase { WAITING, REMAINING, ELAPSED, FINISHED }
    data class Frame(val phase: Phase, val seconds: Long) {
        fun clock(): String = String.format(java.util.Locale.US, "%02d:%02d", seconds / 60, seconds % 60)
    }
    fun frame(ageMillis: Long): Frame = when {
        ageMillis < 0 -> Frame(Phase.WAITING, 600)
        ageMillis < PHASE_MS -> Frame(Phase.REMAINING, (PHASE_MS - ageMillis + 999) / 1000)
        ageMillis < TOTAL_MS -> Frame(Phase.ELAPSED, (ageMillis - PHASE_MS) / 1000)
        else -> Frame(Phase.FINISHED, 600)
    }
}

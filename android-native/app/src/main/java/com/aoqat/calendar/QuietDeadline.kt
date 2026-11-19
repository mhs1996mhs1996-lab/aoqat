package com.aoqat.calendar

/**
 * Ringer deadlines belong to the user's enabled quiet periods, never to the
 * independently displayed "مضى على الإقامة" counter.
 */
internal object QuietDeadline {
    fun merge(requestedEnd: Long, savedEnd: Long, alreadyOwned: Boolean): Long =
        if (alreadyOwned) maxOf(requestedEnd, savedEnd) else requestedEnd
}

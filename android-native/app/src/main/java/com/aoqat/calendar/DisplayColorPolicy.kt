package com.aoqat.calendar

import android.content.res.Configuration

// Scope the host UI to light mode; web appearance remains the user's own choice.
object DisplayColorPolicy {
    fun light(source: Configuration): Configuration = Configuration(source).apply {
        uiMode = (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or Configuration.UI_MODE_NIGHT_NO
    }
}

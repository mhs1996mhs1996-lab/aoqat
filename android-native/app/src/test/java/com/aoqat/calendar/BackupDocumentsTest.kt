package com.aoqat.calendar

import android.content.Intent
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class BackupDocumentsTest {
    private val valid = """{"format":"aoqat-local-backup","version":2,"data":{"aoqatQuranReaderV1":"saved","aoqatAdhanV1":"settings"}}"""

    @Test fun validatesJsonAsRealBackupAndNeverTreatsImageAsBackup() {
        assertTrue(BackupDocuments.encode(valid).isNotEmpty())
        assertThrows(IllegalArgumentException::class.java) {
            BackupDocuments.encode("""{"format":"other","version":2,"data":{"foo":"bar"}}""")
        }
        assertThrows(IllegalArgumentException::class.java) {
            BackupDocuments.encode("""{"format":"aoqat-local-backup","version":2,"data":{}}""")
        }
        assertThrows(IllegalArgumentException::class.java) {
            BackupDocuments.encode("x".repeat(BackupDocuments.MAX_BYTES+1))
        }
    }

    @Test fun choosesSafeUserSelectedDocumentOnly() {
        val chooser=BackupDocuments.createFileIntent("AOQAT-backup-2026.json")
        assertEquals(Intent.ACTION_CREATE_DOCUMENT,chooser.action)
        assertEquals("application/json",chooser.type)
        assertEquals("AOQAT-backup-2026.json",
            chooser.getStringExtra(Intent.EXTRA_TITLE))
        assertEquals("AOQAT-backup.json",BackupDocuments.safeFileName("../secret.json"))
        assertTrue(BackupDocuments.safeRequestId("aoqat-backup-123456-xyz"))
        assertFalse(BackupDocuments.safeRequestId("';window.run()"))
    }
}

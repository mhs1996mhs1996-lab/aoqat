package com.aoqat.calendar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ProfileBackupFileTest {
    @Test fun backupIsARealJsonDocument() {
        val json = """{"format":"aoqat-local-backup","version":2,"data":{"aoqatQuranReaderV1":"{}"}}"""
        assertEquals(json, String(ProfileBackupFile.checkedBytes(json), Charsets.UTF_8))
        assertEquals("application/json", ProfileBackupFile.MIME)
        assertEquals("AOQAT-backup-2026.json",
            ProfileBackupFile.safeName("AOQAT-backup-2026.json"))
    }
    @Test fun rejectsUnrelatedContentAndUnsafeFileNames() {
        assertThrows(IllegalArgumentException::class.java) {
            ProfileBackupFile.checkedBytes("""{"format":"other","version":2,"data":{"a":"x"}}""")
        }
        assertThrows(IllegalArgumentException::class.java) {
            ProfileBackupFile.checkedBytes("""{"format":"aoqat-local-backup","version":20,"data":{"a":"x"}}""")
        }
        val safe = ProfileBackupFile.safeName("../../private.pem")
        assertTrue(safe.endsWith(".json"))
        assertTrue(!safe.contains("/"))
        assertTrue(!safe.contains("\\"))
    }
}

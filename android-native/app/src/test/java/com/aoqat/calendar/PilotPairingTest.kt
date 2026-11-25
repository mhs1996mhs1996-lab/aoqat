package com.aoqat.calendar
import org.junit.Assert.*
import org.junit.Test

class PilotPairingTest {
    @Test fun matchesDatabaseHashUuid(){assertEquals("66687aad-f862-bd77-6c8f-c18b8e9f8e20",PilotPairing.id("00".repeat(32)))}
    @Test fun independentSecretAndCanonicalId(){
        val a=PilotPairing.newSecret();val b=PilotPairing.newSecret()
        assertTrue(a.matches(Regex("[0-9a-f]{64}")));assertNotEquals(a,b)
        assertNotEquals(PilotPairing.id(a),PilotPairing.id(b))
        assertEquals(PilotPairing.id(a),java.util.UUID.fromString(PilotPairing.id(a)).toString())
    }
    @Test(expected=IllegalArgumentException::class) fun rejectMalformedSecret(){PilotPairing.id("invalid")}
}

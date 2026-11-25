package com.aoqat.calendar
import java.security.MessageDigest
import java.security.SecureRandom

/** Public enrollment ID is a truncated SHA-256 of an independently generated
 * 256-bit secret. No device hardware identity is involved. */
internal object PilotPairing {
    private fun hex(bytes:ByteArray):String=bytes.joinToString(""){"%02x".format(java.util.Locale.ROOT,it.toInt() and 255)}
    fun newSecret():String=hex(ByteArray(32).also{SecureRandom().nextBytes(it)})
    fun id(secret:String):String{
        require(secret.matches(Regex("[0-9a-f]{64}")))
        val bytes=ByteArray(32){i->secret.substring(i*2,i*2+2).toInt(16).toByte()}
        val h=hex(MessageDigest.getInstance("SHA-256").digest(bytes)).substring(0,32)
        return h.substring(0,8)+"-"+h.substring(8,12)+"-"+h.substring(12,16)+"-"+h.substring(16,20)+"-"+h.substring(20,32)
    }
}

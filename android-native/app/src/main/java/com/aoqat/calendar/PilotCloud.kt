package com.aoqat.calendar

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Pilot-only explicit consent. No account email, hardware ID, location, prayer
 * settings, or other personal data sent. No remote control of prayer logic. */
internal object PilotCloud {
    private const val ROOT="https://ytdvhiijxxaqofduorwm.supabase.co"
    private const val PUBLIC_KEY="sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1"
    private const val ALIAS="aoqat_pilot_pair_secret_v2"
    private val worker=Executors.newSingleThreadExecutor()
    private fun requirePilot(c:Context) {
        require(BuildConfig.OWNER_PILOT_ENABLED && c.packageName.endsWith(".ownerpilot"))
    }
    private fun stateFile(c:Context)=File(c.noBackupFilesDir,"pilot-cloud-pair-v2")
    private fun key():SecretKey{
        val ks=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        (ks.getKey(ALIAS,null) as? SecretKey)?.let{return it}
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{
            init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun load(c:Context):JSONObject?{
        requirePilot(c);val f=stateFile(c);if(!f.exists())return null
        val bytes=f.readBytes();require(bytes.size in 29..32768)
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,bytes.copyOfRange(0,12)))
        return JSONObject(String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)),Charsets.UTF_8))
    }
    private fun save(c:Context,s:JSONObject){
        requirePilot(c);val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key())
        require(cipher.iv.size==12)
        val f=android.util.AtomicFile(stateFile(c));val out=f.startWrite()
        try{out.write(cipher.iv+cipher.doFinal(s.toString().toByteArray(Charsets.UTF_8)));f.finishWrite(out)}
        catch(e:Exception){f.failWrite(out);throw e}
    }
    private fun request(path:String,method:String="GET",body:JSONObject?=null):String{
        require(path=="/rest/v1/rpc/aoqat_pilot_report"||path.startsWith("/rest/v1/aoqat_pilot_preview_feed?"))
        val c=URL(ROOT+path).openConnection() as HttpURLConnection
        try{
            c.instanceFollowRedirects=false;c.connectTimeout=8000;c.readTimeout=10000;c.requestMethod=method
            c.setRequestProperty("apikey",PUBLIC_KEY)
            if(body!=null){c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
            val code=c.responseCode;require(code in 200..299){"Cloud HTTP "+code}
            if(code==204)return ""
            return c.inputStream.use{input->ByteArrayOutputStream().use{out->
                val buf=ByteArray(8192);while(true){val n=input.read(buf);if(n<0)break;require(out.size()+n<=1024*1024);out.write(buf,0,n)}
                out.toString("UTF-8")
            }}
        }finally{c.disconnect()}
    }
    private fun submit(secret:String,operation:String,build:Int?=null,sequence:Long?=null,state:String?=null):String{
        require(secret.matches(Regex("[0-9a-f]{64}")))
        val body=JSONObject().put("secret",secret).put("operation",operation)
            .put("build",build?:JSONObject.NULL).put("sequence",sequence?:JSONObject.NULL).put("state",state?:JSONObject.NULL)
        val result=org.json.JSONTokener(request("/rest/v1/rpc/aoqat_pilot_report","POST",body)).nextValue()
        require(result is String && result in listOf("accepted","waiting","removed","invalid"))
        return result
    }
    private fun task(c:Context,callback:(String)->Unit,work:(Context)->String){
        val app=c.applicationContext
        worker.execute{val result=try{requirePilot(app);work(app)}catch(_:Exception){"تعذر الاتصال أو التسجيل. تحقق من إعدادات الخدمة واعتماد الجهاز. لم تتغير بيانات الصلاة."};callback(result)}
    }
    fun register(c:Context,cb:(String)->Unit)=task(c,cb){app->
        var s=load(app)
        if(s==null){
            val secret=PilotPairing.newSecret()
            s=JSONObject().put("id",PilotPairing.id(secret)).put("secret",secret).put("enabled",true)
            save(app,s)
        }else{s.put("enabled",true);save(app,s)}
        "معرّف المشاركة: "+s.getString("id")+"\nانسخه للمالك لاعتماد الجهاز، ثم اضغط إرسال تقرير."
    }
    fun status(c:Context,cb:(String)->Unit)=task(c,cb){app->
        val s=load(app);if(s==null)"المشاركة متوقفة. لا يوجد معرّف سحابي." else "المشاركة: "+(if(s.optBoolean("enabled"))"مفعّلة" else "متوقفة")+"\nمعرّف المشاركة: "+s.getString("id")
    }
    private fun report(c:Context,s:JSONObject):String{
        if(!s.optBoolean("enabled"))return "المشاركة متوقفة."
        s.put("lastAttempt",System.currentTimeMillis());save(c,s)
        require(PilotPairing.id(s.getString("secret"))==s.getString("id"))
        val build=c.packageManager.getPackageInfo(c.packageName,0).versionCode
        val p=c.getSharedPreferences("web_updates_v3_owner_pilot",Context.MODE_PRIVATE)
        val active=p.getString("active",null);val trial=p.getString("trial",null)
        val seq=if(active!=null&&active.matches(Regex("[a-f0-9]{64}"))&&p.getInt("build",-1)==build&&trial==null&&p.getBoolean("trialConfirmed",false))try{
            val m=JSONObject(File(c.filesDir,"web-updates-v3-owner-pilot/"+active+"/verified-manifest.json").readText())
            require(m.getInt("nativeBuild")==build&&m.getString("channel")=="owner-pilot")
            m.getLong("sequence").coerceAtLeast(0)
        }catch(_:Exception){0L}else 0L
        val state=when{p.getString("pending",null)!=null||trial!=null->"pending";p.getString("blocked",null)!=null->"failed";seq>0->"applied";else->"none"}
        val outcome=submit(s.getString("secret"),"report",build,seq,state)
        if(outcome=="waiting")return "الجهاز ينتظر اعتماد المالك: "+s.getString("id")
        require(outcome=="accepted")
        s.put("lastSent",System.currentTimeMillis());save(c,s)
        return "✓ تم إرسال تقرير التجريبية B"+build+" · OTA "+seq+" · "+when(state){"applied"->"مستلم";"pending"->"قيد التطبيق";"failed"->"فشل التحديث";else->"لا تحديث"}
    }
    fun send(c:Context,cb:(String)->Unit)=task(c,cb){app->val s=load(app);if(s==null)"سجّل المشاركة أولاً." else report(app,s)}
    fun maybeSend(c:Context){
        if(!BuildConfig.OWNER_PILOT_ENABLED||!c.packageName.endsWith(".ownerpilot"))return
        val app=c.applicationContext
        // No I/O or network on the main thread, no registration on app launch.
        worker.execute{try{val s=load(app)?:return@execute;if(s.optBoolean("enabled")&&System.currentTimeMillis()-s.optLong("lastSent")>=86400000L&&System.currentTimeMillis()-s.optLong("lastAttempt")>=900000L)report(app,s)}catch(_:Exception){}}
    }
    fun stop(c:Context,cb:(String)->Unit)=task(c,cb){app->
        val s=load(app)
        if(s==null)"المشاركة متوقفة." else{
            s.put("enabled",false);save(app,s)
            try{require(submit(s.getString("secret"),"remove")=="removed")
                "تم إيقاف المشاركة وحذف التقرير السحابي. يبقى معرّف التسجيل المشفر محلياً."
            }catch(_:Exception){"تم إيقاف الإرسال محلياً. تعذر حذف التقرير السحابي؛ أعد المحاولة عند الاتصال."}
        }
    }
    fun preview(c:Context,cb:(String)->Unit)=task(c,cb){_->
        val rows=JSONArray(request("/rest/v1/aoqat_pilot_preview_feed?select=kind,payload,published_at&order=published_at.desc&limit=20"))
        if(rows.length()==0)"لا يوجد محتوى معتمد للتجريبية." else buildString{
            append("معاينة فقط — لا تغيير للأذان أو المواقيت\n")
            for(i in 0 until rows.length()){
                val r=rows.getJSONObject(i);val kind=when(r.getString("kind")){"announcement"->"إعلان";"notification"->"تنبيه عام";"prayer"->"مواقيت الصلاة";"hijri"->"بداية شهر هجري";else->"محتوى"}
                val date=try{java.time.OffsetDateTime.parse(r.getString("published_at")).atZoneSameInstant(java.time.ZoneId.of("Asia/Baghdad")).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy · HH:mm"))}catch(_:Exception){r.getString("published_at")}
                append("\n").append(kind).append(" · ").append(date).append("\n")
                val data=r.getJSONObject("payload");val labels=linkedMapOf("title" to "العنوان","body" to "النص","date" to "التاريخ","year" to "السنة الهجرية","month" to "الشهر","start_date" to "بداية الشهر","fajr" to "الفجر","sunrise" to "الشروق","dhuhr" to "الظهر","asr" to "العصر","maghrib" to "المغرب","isha" to "العشاء","source" to "المصدر")
                for((k,label) in labels)if(data.has(k))append(label).append(": ").append(data.optString(k)).append("\n")
            }
        }
    }
}

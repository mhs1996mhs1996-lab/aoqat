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
    private const val ALIAS="aoqat_pilot_report_session_v1"
    private val worker=Executors.newSingleThreadExecutor()
    private fun requirePilot(c:Context) {
        require(BuildConfig.OWNER_PILOT_ENABLED && c.packageName.endsWith(".ownerpilot"))
    }
    private fun stateFile(c:Context)=File(c.noBackupFilesDir,"pilot-cloud-session-v1")
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
    private fun request(path:String,method:String="GET",jwt:String?=null,body:JSONObject?=null,prefer:String?=null):String{
        require(path=="/auth/v1/signup"||path=="/auth/v1/token?grant_type=refresh_token"||
            path.startsWith("/rest/v1/aoqat_admin_device_reports")||
            path.startsWith("/rest/v1/aoqat_admin_report_enrollment?")||
            path.startsWith("/rest/v1/aoqat_pilot_preview_feed?"))
        val c=URL(ROOT+path).openConnection() as HttpURLConnection
        try{
            c.instanceFollowRedirects=false;c.connectTimeout=8000;c.readTimeout=10000;c.requestMethod=method
            c.setRequestProperty("apikey",PUBLIC_KEY)
            if(jwt!=null)c.setRequestProperty("Authorization","Bearer "+jwt)
            if(prefer!=null)c.setRequestProperty("Prefer",prefer)
            if(body!=null){c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
            val code=c.responseCode;require(code in 200..299){"Cloud HTTP "+code}
            if(code==204)return ""
            return c.inputStream.use{input->ByteArrayOutputStream().use{out->
                val buf=ByteArray(8192);while(true){val n=input.read(buf);if(n<0)break;require(out.size()+n<=1024*1024);out.write(buf,0,n)}
                out.toString("UTF-8")
            }}
        }finally{c.disconnect()}
    }
    private fun session(c:Context,s:JSONObject):Pair<JSONObject,String>{
        val now=System.currentTimeMillis()/1000
        if(s.optLong("expires",0)>now+120 && s.optString("access").isNotEmpty())return s to s.getString("access")
        val auth=JSONObject(request("/auth/v1/token?grant_type=refresh_token","POST",body=JSONObject().put("refresh_token",s.getString("refresh"))))
        val user=auth.getJSONObject("user");require(user.optBoolean("is_anonymous")&&user.getString("id")==s.getString("id"))
        s.put("access",auth.getString("access_token")).put("refresh",auth.getString("refresh_token")).put("expires",now+auth.optLong("expires_in",3600));save(c,s)
        return s to s.getString("access")
    }
    private fun task(c:Context,callback:(String)->Unit,work:(Context)->String){
        val app=c.applicationContext
        worker.execute{val result=try{requirePilot(app);work(app)}catch(_:Exception){"تعذر الاتصال أو التسجيل. تحقق من إعدادات الخدمة واعتماد الجهاز. لم تتغير بيانات الصلاة."};callback(result)}
    }
    fun register(c:Context,cb:(String)->Unit)=task(c,cb){app->
        var s=load(app)
        if(s==null){
            val a=JSONObject(request("/auth/v1/signup","POST",body=JSONObject()))
            val u=a.getJSONObject("user");require(u.optBoolean("is_anonymous"))
            s=JSONObject().put("id",u.getString("id")).put("access",a.getString("access_token")).put("refresh",a.getString("refresh_token"))
                .put("expires",System.currentTimeMillis()/1000+a.optLong("expires_in",3600)).put("enabled",true)
            save(app,s)
        }else{s.put("enabled",true);save(app,s)}
        "معرّف المشاركة: "+s.getString("id")+"\nانسخه للمالك لاعتماد الجهاز، ثم اضغط إرسال تقرير."
    }
    fun status(c:Context,cb:(String)->Unit)=task(c,cb){app->
        val s=load(app);if(s==null)"المشاركة متوقفة. لا يوجد معرّف سحابي." else "المشاركة: "+(if(s.optBoolean("enabled"))"مفعّلة" else "متوقفة")+"\nمعرّف المشاركة: "+s.getString("id")
    }
    private fun report(c:Context,s:JSONObject):String{
        if(!s.optBoolean("enabled"))return "المشاركة متوقفة."
        val (_,jwt)=session(c,s)
        val enrollment=JSONArray(request("/rest/v1/aoqat_admin_report_enrollment?select=user_id&limit=1",jwt=jwt))
        if(enrollment.length()!=1)return "الجهاز ينتظر اعتماد المالك: "+s.getString("id")
        val build=c.packageManager.getPackageInfo(c.packageName,0).versionCode
        val p=c.getSharedPreferences("web_updates_v3_owner_pilot",Context.MODE_PRIVATE)
        val active=p.getString("active",null);val trial=p.getString("trial",null)
        val seq=if(active!=null&&active.matches(Regex("[a-f0-9]{64}"))&&p.getInt("build",-1)==build&&trial==null)try{
            val m=JSONObject(File(c.filesDir,"web-updates-v3-owner-pilot/"+active+"/verified-manifest.json").readText())
            require(m.getInt("nativeBuild")==build&&m.getString("channel")=="owner-pilot")
            m.getLong("sequence").coerceAtLeast(0)
        }catch(_:Exception){0L}else 0L
        val state=when{p.getString("pending",null)!=null||trial!=null->"pending";p.getString("blocked",null)!=null->"failed";seq>0->"applied";else->"none"}
        val body=JSONObject().put("user_id",s.getString("id")).put("channel","owner-pilot").put("native_build",build)
            .put("ota_sequence",seq).put("update_status",state)
        request("/rest/v1/aoqat_admin_device_reports?on_conflict=user_id","POST",jwt,body,"resolution=merge-duplicates,return=minimal")
        s.put("lastSent",System.currentTimeMillis());save(c,s)
        return "✓ تم إرسال تقرير التجريبية B"+build+" · OTA "+seq+" · "+state
    }
    fun send(c:Context,cb:(String)->Unit)=task(c,cb){app->val s=load(app);if(s==null)"سجّل المشاركة أولاً." else report(app,s)}
    fun maybeSend(c:Context){
        if(!BuildConfig.OWNER_PILOT_ENABLED||!c.packageName.endsWith(".ownerpilot"))return
        val app=c.applicationContext
        // No I/O or network on the main thread, no registration on app launch.
        worker.execute{try{val s=load(app)?:return@execute;if(s.optBoolean("enabled")&&System.currentTimeMillis()-s.optLong("lastSent")>=86400000L)report(app,s)}catch(_:Exception){}}
    }
    fun stop(c:Context,cb:(String)->Unit)=task(c,cb){app->
        val s=load(app)
        if(s==null)"المشاركة متوقفة." else{
            s.put("enabled",false);save(app,s)
            try{val (_,jwt)=session(app,s);request("/rest/v1/aoqat_admin_device_reports?user_id=eq."+s.getString("id"),"DELETE",jwt,null,"return=minimal")
                "تم إيقاف المشاركة وحذف التقرير السحابي. يبقى معرّف التسجيل المشفر محلياً."
            }catch(_:Exception){"تم إيقاف الإرسال محلياً. تعذر حذف التقرير السحابي؛ أعد المحاولة عند الاتصال."}
        }
    }
    fun preview(c:Context,cb:(String)->Unit)=task(c,cb){_->
        val rows=JSONArray(request("/rest/v1/aoqat_pilot_preview_feed?select=kind,payload,published_at&order=published_at.desc&limit=20"))
        if(rows.length()==0)"لا يوجد محتوى معتمد للتجريبية." else buildString{
            append("معاينة فقط — لا تغيير للأذان أو المواقيت\n")
            for(i in 0 until rows.length()){val r=rows.getJSONObject(i);append("\n").append(r.getString("kind")).append(" · ").append(r.getString("published_at")).append("\n").append(r.getJSONObject("payload").toString(2)).append("\n")}
        }
    }
}

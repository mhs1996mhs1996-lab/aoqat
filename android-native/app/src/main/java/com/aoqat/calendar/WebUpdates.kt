package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Only a complete, checksum-verified snapshot compatible with this native build is activated.
 * Large Quran/audio assets always remain in the installed APK. Native code needs an APK update. */
class WebUpdates(private val context:Context, private val fetch:(String,Int)->ByteArray={path,limit->download(path,limit)}) {
    private val root=File(context.filesDir,"web-updates-v1")
    private val prefs=context.getSharedPreferences("web_updates_v1",Context.MODE_PRIVATE)
    private val nativeBuild=context.packageManager.getPackageInfo(context.packageName,0).versionCode
    private var active:File?=(if(prefs.getInt("nativeBuild",-1)==nativeBuild)prefs.getString("active",null)else null)?.takeIf{it.matches(Regex("[a-f0-9]{64}"))}?.let{File(root,it)}?.takeIf{File(it,"complete").isFile}
    fun response(uri:Uri):WebResourceResponse? {
        if(uri.scheme!="file"||uri.host?.isNotEmpty()==true)return null
        val path=uri.path?.removePrefix("/android_asset/www/")?:return null
        if(!uri.path.orEmpty().startsWith("/android_asset/www/")||!allowed(path))return null
        val file=active?.let{File(it,path)}?.takeIf{it.isFile}?:return null
        val mime=when(file.extension){"js"->"application/javascript";"css"->"text/css";"html"->"text/html";"json"->"application/json";else->"application/octet-stream"}
        return WebResourceResponse(mime,"UTF-8",file.inputStream())
    }
    fun check() {
        if(System.currentTimeMillis()-prefs.getLong("checked",0)<6*60*60*1000)return
        Thread { checkNow() }.start()
    }
    internal fun checkNow(){
            try {
                val manifest=JSONObject(fetch("manifest.json",1024*1024).toString(Charsets.UTF_8))
                if(manifest.getInt("nativeBuild")!=nativeBuild)return
                val files=manifest.getJSONObject("files")
                val paths=files.keys().asSequence().toList().sorted()
                require(paths.size in 1..250 && "index.html" in paths && paths.all{allowed(it)})
                val canonical=paths.joinToString("\n"){it+":"+files.getString(it)}
                val revision=digest(canonical.toByteArray())
                require(revision==manifest.getString("revision"))
                if(prefs.getString("active",null)==revision){prefs.edit().putLong("checked",System.currentTimeMillis()).apply();return}
                val stage=File(root,"staging");stage.deleteRecursively();stage.mkdirs()
                var total=0
                for(path in paths){
                    val hash=files.getString(path);require(hash.matches(Regex("[a-f0-9]{64}")))
                    val cached=active?.let{File(it,path)}?.takeIf{it.isFile}?.readBytes()
                    val packaged=try{context.assets.open("www/$path").use{it.readBytes()}}catch(_:Exception){null}
                    val bytes=when{cached!=null&&digest(cached)==hash->cached;packaged!=null&&digest(packaged)==hash->packaged;else->fetch("files/$path",6*1024*1024)}
                    total+=bytes.size;require(total<=24*1024*1024&&digest(bytes)==hash)
                    File(stage,path).apply{parentFile?.mkdirs();writeBytes(bytes)}
                }
                File(stage,"complete").writeText(revision)
                val destination=File(root,revision)
                if(!destination.exists())require(stage.renameTo(destination))else stage.deleteRecursively()
                // Applied on the next app launch; the running WebView keeps one consistent version.
                prefs.edit().putString("active",revision).putInt("nativeBuild",nativeBuild).putLong("checked",System.currentTimeMillis()).commit()
            }catch(e:Exception){android.util.Log.w("WebUpdates","Keep installed offline version",e)}
    }
    companion object {
        fun allowed(path:String)=!path.contains("..")&&!path.contains('%')&&!path.contains('\\')&&(
            path=="index.html"||path.matches(Regex("(js|css)/[a-zA-Z0-9_./-]+\\.(js|css)")))
        fun digest(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
        private fun download(path:String,limit:Int):ByteArray {
            val c=URL("https://aoqat.vercel.app/android-updates/$path").openConnection() as HttpURLConnection
            c.connectTimeout=15000;c.readTimeout=20000;c.instanceFollowRedirects=false
            try{require(c.responseCode==200);return c.inputStream.use{val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(16384);var total=0;while(true){val count=it.read(buffer);if(count<0)break;total+=count;require(total<=limit);out.write(buffer,0,count)};out.toByteArray()}}finally{c.disconnect()}
        }
    }
}

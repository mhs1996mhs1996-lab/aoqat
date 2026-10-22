package com.aoqat.calendar

import android.app.*
import android.content.*
import android.os.Build
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.time.*
import java.time.chrono.HijrahDate
import java.time.temporal.ChronoField
import java.util.concurrent.Executors

/** Independent of prayer/iqama alarms: local calendar, annual rows and retained opt-in choices. */
object CommunityReminderPlan {
 val zone: ZoneId = ZoneId.of("Asia/Baghdad")
 val topics=listOf("monday","thursday","white-days","tasua","ashura","shawwal","dhul-hijjah","arafah")
 val titles=mapOf("monday" to "صيام يوم الاثنين","thursday" to "صيام يوم الخميس","white-days" to "صيام الأيام البيض","tasua" to "صيام تاسوعاء مع عاشوراء","ashura" to "صيام عاشوراء","shawwal" to "ستة أيام من شوال","dhul-hijjah" to "صيام التسعة الأولى من ذي الحجة","arafah" to "صيام يوم عرفة لغير الحاج","muharram" to "الإكثار من الصيام في محرم")
 fun hijri(d:LocalDate):Pair<Int,Int>{val h=HijrahDate.from(d);return h.get(ChronoField.MONTH_OF_YEAR) to h.get(ChronoField.DAY_OF_MONTH)}
 fun allowed(d:LocalDate):Boolean{val(m,n)=hijri(d);return m!=9&&!(m==10&&n==1)&&!(m==12&&n in 10..13)}
 fun posters(d:LocalDate):List<Pair<String,LocalDate>>{
  val tomorrow=d.plusDays(1);val(m,n)=hijri(d);val(tm,tn)=hijri(tomorrow);val out=mutableListOf<Pair<String,LocalDate>>()
  fun add(id:String,target:LocalDate=tomorrow){if(out.none{it.first==id})out.add(id to target)}
  if(allowed(tomorrow)){
   if(tomorrow.dayOfWeek==DayOfWeek.MONDAY)add("monday")
   if(tomorrow.dayOfWeek==DayOfWeek.THURSDAY)add("thursday")
   if(n in 12..14&&m!=9&&!(m==12&&n==12))add("white-days")
   if(tm==1&&tn==9)add("tasua");if(tm==1&&tn==10)add("ashura")
   if(tm==12&&tn==9)add("arafah");if(tm==12&&tn==1)add("dhul-hijjah")
   if(tm==10&&tn==2)add("shawwal")
  }
  if(tm==10&&tn==1)add("shawwal",d.plusDays(2))
  if(m==10&&n==1)add("shawwal")
  return out
 }
 fun fasting(d:LocalDate):List<String>{val t=d.plusDays(1);if(!allowed(t))return emptyList();val(m,n)=hijri(t);val ids=mutableListOf<String>()
  if(m==12&&n==9)ids.add("arafah");if(m==12&&n==1)ids.add("dhul-hijjah")
  if(m==1&&n in 9..10)ids.add(if(n==9)"tasua" else "ashura")
  if(n in 13..15)ids.add("white-days")
  if(t.dayOfWeek==DayOfWeek.MONDAY)ids.add("monday");if(t.dayOfWeek==DayOfWeek.THURSDAY)ids.add("thursday")
  if(m==10&&n==2)ids.add("shawwal");if(m==1&&n==1)ids.add("muharram");return ids
 }
 fun clock(s:String):Int?{if(!Regex("^(?:[01]\\d|2[0-3]):[0-5]\\d$").matches(s))return null;val p=s.split(":");return p[0].toInt()*60+p[1].toInt()}
 fun events(d:LocalDate,config:JSONObject,row:JSONObject?):List<JSONObject>{
  val out=mutableListOf<JSONObject>();val fr=config.optJSONObject("friday")?:JSONObject();val fast=config.optJSONObject("fasting")?:JSONObject()
  val mag=PrayerTimes.minutes(row?.optString("maghrib")?:"","maghrib");val isha=PrayerTimes.minutes(row?.optString("isha")?:"","isha");val fajr=PrayerTimes.minutes(row?.optString("fajr")?:"","fajr")
  fun add(id:String,minute:Int,kind:String,title:String,body:String,section:String,topic:String="",action:String="detail",target:String=""){
   out.add(JSONObject().put("id",id+":"+d).put("key",id+":"+d).put("kind",kind).put("at",d.atStartOfDay(zone).plusMinutes(minute.toLong()).toInstant().toEpochMilli()).put("title",title).put("body",body).put("section",section).put("topicId",topic).put("action",action).put("targetDate",target))
  }
  if(fr.optBoolean("enabled",true)){
   if(d.dayOfWeek==DayOfWeek.THURSDAY&&fr.optBoolean("sunnah",true)&&mag!=null&&isha!=null){val at=mag+fr.optInt("afterMaghrib",20).coerceIn(0,120);if(at>=mag&&at<isha)add("friday-sunnah",at,"sunnah","تذكير بسنن يوم الجمعة","تذكير بسنن يوم الجمعة وآدابها. افتح التذكير لقراءة السنن ومصادرها.","friday")}
   val at=clock(fr.optString("kahfTime","09:00"));if(d.dayOfWeek==DayOfWeek.FRIDAY&&fr.optBoolean("kahf",true)&&at!=null&&fajr!=null&&mag!=null&&at>=fajr&&at<mag)add("friday-kahf",at,"kahf","تذكير بقراءة سورة الكهف","تذكير بقراءة سورة الكهف يوم الجمعة.","friday")
  }
  if(fast.optBoolean("enabled",true)){val ids=fasting(d);val at=clock(fast.optString("time","20:00"));if(ids.isNotEmpty()&&at!=null)add("fasting",at,"fasting","تذكير بصيام التطوع","تذكير للغد: "+ids.mapNotNull{titles[it]}.joinToString("، ")+". تُراعى رؤية الهلال المحلية.","fasting",if(ids[0]=="tasua")"ashura" else if(ids[0] in listOf("monday","thursday"))"monday-thursday" else ids[0])}
  for(kind in listOf("friday","fasting")){
   val s=config.optJSONObject("posts")?.optJSONObject(kind)?:JSONObject();if(!s.optBoolean("enabled",false)||mag==null||isha==null)continue
   val at=if(s.optString("mode")=="clock")clock(s.optString("time","18:00")) else mag+s.optInt("delay",20).coerceIn(1,120)
   if(at==null||at<=mag||at>=isha)continue
   if(kind=="friday"){if(d.dayOfWeek==DayOfWeek.THURSDAY)add("publish:friday",at,"community-post","حان وقت نشر بوست سنن الجمعة","جهّز بوست سنن الجمعة وشاركه قبل أذان العشاء.","friday",action="post")}
   else {val selected=s.optJSONArray("topics");for((id,target)in posters(d))if(selected==null||(0 until selected.length()).any{selected.optString(it)==id})add("publish:fasting:"+id,at,"community-post","حان وقت نشر بوست "+titles[id],"جهّز بوست التذكير بالصيام وشاركه قبل أذان العشاء.","fasting",id,"post",target.toString())}
  }
  return out
 }
}

object CommunityReminders {
 internal const val CHANNEL="muslim_bag_reminders_sound_v2"
 private const val TTL=86400000L
 private val worker=Executors.newSingleThreadExecutor()
 private fun prefs(c:Context)=c.getSharedPreferences("community_reminders_v1",Context.MODE_PRIVATE)
 fun settings(c:Context):String=prefs(c).getString("settings","{}")?:"{}"
 fun configure(c:Context,json:String){try{JSONObject(json);if(json!=settings(c)){prefs(c).edit().putString("settings",json).commit();refresh(c)}}catch(_:Exception){}}
 fun inbox(c:Context):JSONArray{val now=System.currentTimeMillis();val old=try{JSONArray(prefs(c).getString("inbox","[]"))}catch(_:Exception){JSONArray()};val out=JSONArray();for(i in 0 until old.length()){val e=old.optJSONObject(i)?:continue;val age=now-e.optLong("createdAt");if(age in 0 until TTL)out.put(e)};prefs(c).edit().putString("inbox",out.toString()).apply();return out}
 fun refreshNow(c:Context){try{schedule(c)}catch(e:Exception){android.util.Log.e("CommunityReminders","Schedule failed",e)}}
 private fun events(c:Context,d:LocalDate,config:JSONObject,row:JSONObject?):List<JSONObject> = CommunityReminderPlan.events(d,config,row) + (config.optJSONObject("azkar")?.let { AzkarReminderPlan.events(d,it,row){id->IqamaNativeScheduler.durations(c,id)} } ?: emptyList())
 fun deliverDue(c:Context){val today=LocalDate.now(CommunityReminderPlan.zone);val rows=PrayerTimes.rows(c);val config=JSONObject(settings(c));for(d in listOf(today.minusDays(1),today)){val row=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.firstOrNull{it.optInt("gregorian_month")==d.monthValue&&it.optInt("gregorian_day")==d.dayOfMonth};for(e in events(c,d,config,row))deliver(c,e.toString())}}
 fun refresh(c:Context){val app=c.applicationContext;worker.execute{try{schedule(app)}catch(e:Exception){android.util.Log.e("CommunityReminders","Schedule failed",e)}}}
 private fun alarm(c:Context,id:Int,at:Long,event:JSONObject?){val am=c.getSystemService(Context.ALARM_SERVICE)as AlarmManager;val intent=Intent(c,CommunityReminderReceiver::class.java).setAction("DELIVER").putExtra("event",event?.toString());val pi=PendingIntent.getBroadcast(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE);if(Build.VERSION.SDK_INT<31||am.canScheduleExactAlarms())am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi)else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi)}
 @Synchronized private fun schedule(c:Context){deliverDue(c);val am=c.getSystemService(Context.ALARM_SERVICE)as AlarmManager
  for(id in 88000..88299){val pi=PendingIntent.getBroadcast(c,id,Intent(c,CommunityReminderReceiver::class.java).setAction("DELIVER"),PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE);if(pi!=null){am.cancel(pi);pi.cancel()}}
  val config=JSONObject(settings(c));val rows=PrayerTimes.rows(c);val today=LocalDate.now(CommunityReminderPlan.zone);val now=System.currentTimeMillis();var id=88000
  for(offset in 0L..7L){val d=today.plusDays(offset);val row=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.firstOrNull{it.optInt("gregorian_month")==d.monthValue&&it.optInt("gregorian_day")==d.dayOfMonth};for(e in events(c,d,config,row))if(e.getLong("at")>now)alarm(c,id++,e.getLong("at"),e)}
  alarm(c,88299,today.plusDays(1).atStartOfDay(CommunityReminderPlan.zone).plusMinutes(2).toInstant().toEpochMilli(),null);inbox(c)
 }
 @Synchronized fun deliver(c:Context,raw:String?){if(raw.isNullOrBlank())return;val e=try{JSONObject(raw)}catch(_:Exception){return};val now=System.currentTimeMillis();if(now-e.optLong("at") !in 0 until (if(e.optString("kind")=="azkar-reminder")120000L else 1800000L))return
  val rows=PrayerTimes.rows(c);val d=if(e.optString("kind")=="azkar-reminder")try{LocalDate.parse(e.getString("sourceDate"))}catch(_:Exception){return}else Instant.ofEpochMilli(e.optLong("at")).atZone(CommunityReminderPlan.zone).toLocalDate();val row=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.firstOrNull{it.optInt("gregorian_month")==d.monthValue&&it.optInt("gregorian_day")==d.dayOfMonth};val cutoff=when(e.optString("kind")){"community-post","sunnah"->PrayerTimes.minutes(row?.optString("isha")?:"","isha");"kahf"->PrayerTimes.minutes(row?.optString("maghrib")?:"","maghrib");else->null};if(cutoff!=null&&now>=d.atStartOfDay(CommunityReminderPlan.zone).plusMinutes(cutoff.toLong()).toInstant().toEpochMilli())return
  if(events(c,d,JSONObject(settings(c)),row).none{it.optString("id")==e.optString("id")&&it.optLong("at")==e.optLong("at")})return
  val entries=inbox(c);if((0 until entries.length()).any{entries.getJSONObject(it).optString("id")==e.optString("id")})return
  e.put("createdAt",now);val updated=JSONArray().put(e);for(i in 0 until entries.length())updated.put(entries.getJSONObject(i));prefs(c).edit().putString("inbox",updated.toString()).commit()
  notify(c,e)
 }
 internal fun preview(c:Context,kind:String){val e=JSONObject().put("id","azkar-preview:"+kind).put("title","معاينة: "+AzkarReminderPlan.titles[kind]).put("body","تجربة تذكير الأذكار");notify(c,e)}
 private fun notify(c:Context,e:JSONObject){
  val nm=c.getSystemService(Context.NOTIFICATION_SERVICE)as NotificationManager;nm.createNotificationChannel(NotificationChannel(CHANNEL,"تذكيرات الأذكار والجمعة والصيام",NotificationManager.IMPORTANCE_DEFAULT).apply{setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())})
  val code=e.getString("id").hashCode();val open=Intent(c,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("communityReminderId",e.getString("id"));val pi=PendingIntent.getActivity(c,code,open,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  try{nm.notify(code,NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(e.getString("title")).setContentText(e.getString("body")).setStyle(NotificationCompat.BigTextStyle().bigText(e.getString("body"))).setContentIntent(pi).setAutoCancel(true).setTimeoutAfter(TTL).build())}catch(_:SecurityException){}
 }
}
class CommunityReminderReceiver:BroadcastReceiver(){override fun onReceive(context:Context,intent:Intent){val pending=goAsync();Thread{try{CommunityReminders.deliver(context,intent.getStringExtra("event"));CommunityReminders.deliverDue(context);CommunityReminders.refreshNow(context)}finally{pending.finish()}}.start()}}

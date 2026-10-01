package com.aoqat.calendar
import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.hardware.*
import android.location.*
import android.os.Bundle
import android.view.Gravity
import android.widget.*
import kotlin.math.*
class QiblaActivity:Activity(),SensorEventListener{
    private lateinit var sensor:SensorManager
    private lateinit var arrow:TextView
    private lateinit var info:TextView
    private var bearing:Float?=null
    private var declination=0f
    private var listener:LocationListener?=null
    private fun bearing(lat:Double,lon:Double):Float{val a=Math.toRadians(lat);val b=Math.toRadians(21.4225);val d=Math.toRadians(39.8262-lon);return ((Math.toDegrees(atan2(sin(d)*cos(b),cos(a)*sin(b)-sin(a)*cos(b)*cos(d)))+360)%360).toFloat()}
    override fun onCreate(b:Bundle?){super.onCreate(b);sensor=getSystemService(SENSOR_SERVICE) as SensorManager;val l=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(24,24,24,24)};l.addView(TextView(this).apply{text="اتجاه القبلة";textSize=26f});arrow=TextView(this).apply{text="↑";textSize=110f;gravity=Gravity.CENTER};l.addView(arrow);info=TextView(this).apply{text="نحتاج الموقع وحساس الاتجاه. أبعد الهاتف عن المعادن.";textSize=17f;gravity=Gravity.CENTER};l.addView(info);l.addView(Button(this).apply{text="تحديد الموقع وتحديث القبلة";setOnClickListener{locate()}});l.addView(Button(this).apply{text="رجوع";setOnClickListener{finish()}});setContentView(l);locate()}
    private fun locate(){if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION),810);return};val m=getSystemService(LOCATION_SERVICE) as LocationManager;val providers=m.getProviders(true);val last=providers.mapNotNull{m.getLastKnownLocation(it)}.maxByOrNull{it.time};last?.let{applyLocation(it)};if(!providers.contains(LocationManager.NETWORK_PROVIDER)){info.text=if(last==null)"فعّل خدمة الموقع ثم أعد المحاولة" else info.text;return};listener?.let{m.removeUpdates(it)};listener=object:LocationListener{override fun onLocationChanged(l:Location){applyLocation(l);m.removeUpdates(this)};override fun onProviderEnabled(p:String){};override fun onProviderDisabled(p:String){};@Deprecated("Deprecated")override fun onStatusChanged(p:String,s:Int,b:Bundle?){}};m.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,0L,0f,listener!!);info.text="جاري تحديد موقعك…"}
    private fun applyLocation(l:Location){bearing=bearing(l.latitude,l.longitude);declination=GeomagneticField(l.latitude.toFloat(),l.longitude.toFloat(),l.altitude.toFloat(),System.currentTimeMillis()).declination;info.text="القبلة ${"%.1f".format(bearing)}° من الشمال؛ أبعد الهاتف عن المعادن"}
    override fun onResume(){super.onResume();val s=sensor.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);if(s==null)info.text="لا يوجد حساس بوصلة. يُعرض اتجاه القبلة بالدرجات بعد تحديد موقعك." else sensor.registerListener(this,s,SensorManager.SENSOR_DELAY_UI)}
    override fun onPause(){sensor.unregisterListener(this);super.onPause()}
    override fun onDestroy(){listener?.let{(getSystemService(LOCATION_SERVICE) as LocationManager).removeUpdates(it)};super.onDestroy()}
    override fun onSensorChanged(e:SensorEvent){val b=bearing?:return;val m=FloatArray(9);SensorManager.getRotationMatrixFromVector(m,e.values);val remapped=FloatArray(9);@Suppress("DEPRECATION") val rotation=windowManager.defaultDisplay.rotation;val x=when(rotation){1->SensorManager.AXIS_Y;2->SensorManager.AXIS_MINUS_X;3->SensorManager.AXIS_MINUS_Y;else->SensorManager.AXIS_X};val y=when(rotation){1->SensorManager.AXIS_MINUS_X;2->SensorManager.AXIS_MINUS_Y;3->SensorManager.AXIS_X;else->SensorManager.AXIS_Y};SensorManager.remapCoordinateSystem(m,x,y,remapped);val a=FloatArray(3);SensorManager.getOrientation(remapped,a);val heading=Math.toDegrees(a[0].toDouble()).toFloat()+declination;arrow.rotation=b-heading}
    override fun onAccuracyChanged(s:Sensor?,a:Int){if(a==SensorManager.SENSOR_STATUS_UNRELIABLE)info.text="عاير البوصلة بتحريك الهاتف بشكل رقم 8 بعيدًا عن المعادن"}
    override fun onRequestPermissionsResult(r:Int,p:Array<out String>,g:IntArray){super.onRequestPermissionsResult(r,p,g);if(r==810&&g.firstOrNull()==PackageManager.PERMISSION_GRANTED)locate()else info.text="لم يُسمح بالموقع؛ لا يمكن حساب القبلة لموقعك"}
}

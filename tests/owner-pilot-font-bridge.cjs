const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..','android-native','app','src','main','java','com','aoqat','calendar');
const style=fs.readFileSync(path.join(base,'LockScreenTextStyle.kt'),'utf8');
const bridge=fs.readFileSync(path.join(base,'MainActivity.kt'),'utf8');
test('owner-only state persistence is bounded and isolated',()=>{
  for(const key of ['prayer','iqama_wait','iqama_elapsed','friday_first','sermon_wait','sermon_elapsed'])
    assert.ok(style.includes('"'+key+'"'));
  assert.match(style,/fun readState\(c:Context,key:String\):String/);
  assert.match(style,/fun updateState\(c:Context,key:String,title:Int,clock:Int,color:Int\):Boolean/);
  assert.match(style,/key !in keys/);
  assert.match(style,/title !in 12\.\.24/);
  assert.match(style,/clock !in 12\.\.24/);
  assert.match(style,/color !in palette\.indices/);
  assert.match(style,/\.commit\(\)/);
});
test('native bridge requires owner pilot and refreshes notifications only after successful save',()=>{
  assert.match(bridge,/@JavascriptInterface fun readLockScreenTextStyle\(key:String\):String/);
  assert.match(bridge,/@JavascriptInterface fun configureLockScreenTextStyle\(/);
  assert.match(bridge,/if\(!BuildConfig\.OWNER_PILOT_ENABLED\)return false/);
  assert.match(bridge,/LockScreenTextStyle\.updateState/);
  assert.match(bridge,/if\(saved\)runOnUiThread/);
  assert.match(bridge,/LockScreenPrayer\.showNow/);
  assert.match(bridge,/NextPrayerService\.start/);
});

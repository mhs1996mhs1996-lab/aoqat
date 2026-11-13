'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const get=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('APK Iqama submenu includes the ORIGINAL toggle, permissions and appearance group',()=>{
  const hub=get('js/alerts-hub.js'),ui=get('android-native/apk-overrides/android-ui-fixes.js');
  assert.match(hub,/parked\.appendChild\(group\)/);
  assert.match(hub,/if\(toggle&&!web\.contains\(toggle\)\)web\.insertBefore/);
  assert.match(hub,/root\.append\(web\);return root/);
  assert.match(ui,/getElementById\('aoqatAlertSettingsParking'\)/);
  assert.match(ui,/configureIqamaAppearance/);
});
test('Arabic locale cannot turn quiet minute inputs into Arabic numerals',()=>{
  const native=get('android-native/apk-overrides/native-quiet-menu.js');
  assert.match(native,/type="text" inputmode="numeric" pattern="\[0-9\]\*"/);
  assert.match(native,/lang="en" dir="ltr"/);
  assert.match(native,/latinDigits/);
  assert.match(native,/data-quiet-adjust/);
  assert.doesNotMatch(native,/type="number" inputmode="numeric"/);
});
test('help circles remain small, themed and exempt from normal button paint',()=>{
  assert.match(get('js/adhan-settings.js'),/id="adAudibilityHelp"[\s\S]{0,700}width:22px!important/);
  assert.match(get('js/web-menu-button-theme.js'),/#adAudibilityHelp,.aoqat-help-circle/);
  assert.match(get('js/settings-help-live.js'),/aoqat-help-eligible::before\{width:18px!important/);
});
test('new installable upgrade has a higher code',()=>{
  const gradle=get('android-native/app/build.gradle');
  assert.match(gradle,/versionCode 143/);
  assert.match(gradle,/versionName '2\.08'/);
});

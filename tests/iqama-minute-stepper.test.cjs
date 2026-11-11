const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('js/iqama-timing.js','utf8'),context={window:{}};
vm.runInNewContext(source,context);
const {OPTIONS,normalize,state}=context.window.AoqatIqamaTiming;
assert.equal(OPTIONS.length,30);
for(let minute=1;minute<=30;minute++){
 assert.equal(OPTIONS[minute-1],minute);
 assert.equal(normalize({maghrib:minute},{maghrib:10}).maghrib,minute);
}
for(const invalid of [0,-1,31,12.5,null,'bad']){
 assert.equal(normalize({maghrib:invalid},{maghrib:10}).maghrib,10);
}
const prayers=[{id:'maghrib',startSeconds:17*3600}],before={maghrib:12},after={maghrib:13};
assert.equal(state(17*3600,prayers,before,after).seconds,720);
assert.equal(state(17*3600+719,prayers,before,after).phase,'remaining');
assert.equal(state(17*3600+720,prayers,before,after).phase,'elapsed');
assert.equal(state(17*3600+720,prayers,before,after).seconds,0);
assert.equal(state(17*3600+720+779,prayers,before,after).seconds,779);
assert.equal(state(17*3600+720+780,prayers,before,after),null);
const ui=fs.readFileSync('js/prayer-countdown.js','utf8');
assert.ok(ui.includes('function minuteStepperMarkup('));
assert.ok(ui.includes('function bindMinuteSteppers('));
assert.ok(ui.includes('Math.max(1,Math.min(30,before+delta))'));
assert.ok(ui.includes('data-after-iqama')&&ui.includes('data-iqama'));
assert.ok(!ui.includes('<select data-iqama'));
assert.ok(!ui.includes('<select data-after-iqama'));
assert.ok(fs.readFileSync('android-native/app/src/main/java/com/aoqat/calendar/IqamaCycle.kt','utf8').includes('(1..30).toSet()'));
console.log('PASS: 1–30 minute choices, 12/13 minute phases, both controls and native acceptance');

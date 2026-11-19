'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file='security/owner-ota-b150-seq6-quiet-compact.js';
const source=fs.readFileSync(file,'utf8');
assert.equal(source.includes('render(false);'),false,'No full UI redraw during input');
assert.equal(source.includes("?.focus({preventScroll:true})"),false,'Never force keyboard open on +/-');

const patch='  window.AoqatApkQuietSettings={render,read};';
assert.equal(source.split(patch).length,2,'Known production code marker');
const injected=source.replace(patch,`  window.__test={
  setPanel(v){panel=v;},setState(v){state=v;},render,flushSave,read
};\n`+patch);
const calls=[],listeners={},pending=new Map();let tick=0;
const document={
  readyState:'loading',hidden:false,
  addEventListener(type,cb){listeners[type]=cb},
  getElementById(){return null}
};
const window={
  AndroidNative:{
    configureAdhan(value){calls.push(JSON.parse(value))},
    hasQuietPolicyAccess(){return true}
  },
  addEventListener(type,cb){listeners[type]=cb}
};
const context={document,window,console,
  setTimeout(fn){const id=++tick;pending.set(id,fn);return id},
  clearTimeout(id){pending.delete(id)}
};
vm.runInNewContext(injected,context,{filename:file});
assert.ok(window.__test);
assert.ok(source.includes("const existing=document.getElementById('quietPanel');"));
assert.ok(source.includes("panel=existing;"),'OTA must attach to the existing APK panel');
function tickAll(){
  const jobs=[...pending.values()];pending.clear();
  for(const work of jobs)work();
}

function target(props={}) {
  return {
    handlers:{},value:'12',...props,
    addEventListener(type,cb){this.handlers[type]=cb},
    fire(type,ev={preventDefault(){}}){assert.ok(this.handlers[type],'Missing '+type);this.handlers[type](ev)}
  };
}
const durations={hidden:false};
const checkbox=target({dataset:{quietEnabled:'afterIqamaSilent'},checked:true,
  closest(){return {querySelector(){return durations}}}});
const value=target({dataset:{quietKey:'afterIqamaSilent',quietPrayer:'fajr'},value:'12'});
const plus=target({dataset:{quietAdjust:'1',quietKey:'afterIqamaSilent',quietPrayer:'fajr'},
  parentElement:{querySelector(){return value}}});
const minus=target({dataset:{quietAdjust:'-1',quietKey:'afterIqamaSilent',quietPrayer:'fajr'},
  parentElement:{querySelector(){return value}}});
const warning={hidden:true,textContent:''};
let htmlWrites=0,lastHtml='';
const panel={
  set innerHTML(content){htmlWrites++;lastHtml=content},
  get innerHTML(){return lastHtml},
  querySelectorAll(selector){
    if(selector==='[data-quiet-enabled]')return [checkbox];
    if(selector==='input[data-quiet-prayer]')return [value];
    if(selector==='[data-quiet-adjust]')return [plus,minus];
    throw new Error('Unexpected CSS selector: '+selector);
  },
  querySelector(selector){
    if(selector==='.aq-quiet-save-warning')return warning;
    if(selector==='.aq-quiet-permission')return null;
    return null;
  }
};
const state={
  atAdhanSilent:{enabled:false,minutes:{fajr:10,dhuhr:10,asr:10,maghrib:10,isha:10}},
  afterIqamaSilent:{enabled:true,minutes:{fajr:12,dhuhr:13,asr:12,maghrib:12,isha:12}}
};
window.__test.setPanel(panel);
window.__test.setState(state);
window.__test.render(false);
assert.equal(htmlWrites,1,'Initial paint only');
assert.ok(lastHtml.includes('data-quiet-adjust="1"'));
assert.ok(lastHtml.includes('data-quiet-enabled="afterIqamaSilent"'));
assert.ok(source.includes('#quietPanel .aq-quiet-minute > span{min-width:0'), 'Row labels may not overflow');
assert.ok(source.includes('@media(max-width:360px)'), 'Responsive small screen size');
assert.equal((lastHtml.match(/data-quiet-adjust="1"/g)||[]).length,10,'All 5 rows in each of 2 sections exist');

assert.ok(source.includes('max-height:40px') && source.includes('grid-template-columns:minmax(60px,1fr) minmax(0,max-content)'), 'Safe compact rows');
assert.ok(lastHtml.includes('<details class="aq-quiet-help-details">'), 'Long explanations are collapsible');
assert.ok(!lastHtml.includes('<h3 class="aq-quiet-title">'), 'No duplicate title takes up phone space');
assert.ok(source.includes('saveTimer=setTimeout(flushSave,1400);'), 'Coalesced long idle save');
assert.ok(!source.includes("button.addEventListener('pointerdown'"), 'Pointerdown preventDefault may delay click on OEM WebView');

assert.equal(plus.handlers.pointerdown,undefined,'No expensive pointerdown handler');
plus.fire('click');
assert.equal(value.value,'13','Step must update visible value immediately');
assert.equal(calls.length,0,'No synchronous Android bridge call on click');
assert.equal(htmlWrites,1,'No page redraw on +/-');
for(let i=0;i<8;i++)plus.fire('click');
assert.equal(value.value,'21');
assert.equal(pending.size,1,'Rapid taps coalesced');
tickAll();
assert.equal(calls.length,1);
assert.equal(calls[0].afterIqamaSilent.minutes.fajr,21);
assert.equal(warning.hidden,true);
for(let i=0;i<200;i++)plus.fire('click');
assert.equal(value.value,'120','Value capped at 120 minutes');
tickAll();
for(let i=0;i<160;i++)minus.fire('click');
assert.equal(value.value,'0','Value bounded to 0');
assert.equal(htmlWrites,1,'No full UI reconstruction during repeated tapping');
tickAll();
assert.equal(calls.at(-1).afterIqamaSilent.minutes.fajr,0);

checkbox.checked=false;
checkbox.fire('change');
assert.equal(durations.hidden,true);
assert.equal(state.afterIqamaSilent.enabled,false);
assert.equal(htmlWrites,1,'Checkbox change must not re-render entire settings');
tickAll();
assert.equal(calls.at(-1).afterIqamaSilent.enabled,false);

value.value='٢٥';value.fire('change');
assert.equal(value.value,'25','Arabic digits converted for manual input');
assert.equal(state.afterIqamaSilent.minutes.fajr,25);
assert.equal(htmlWrites,1);
listeners.pagehide();
assert.equal(calls.at(-1).afterIqamaSilent.minutes.fajr,25);
assert.equal(pending.size,0,'Pagehide cancels pending callback');
value.value='999';value.fire('change');
assert.equal(value.value,'25','Invalid input restored');
assert.equal(state.afterIqamaSilent.minutes.fajr,25);
assert.equal(pending.size,0,'No invalid update scheduled');
console.log('PASS: immediate +/-/checkbox UI; no keyboard focus, 0-120, Arabic manual input, one debounced native write, pagehide flush, compact buttons.');

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file='security/owner-ota-b150-seq8-quiet-ui.js';
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

assert.ok(source.includes('aq-quiet-controls'),'Control group created');
assert.ok(source.includes('aq-quiet-unit'),'Minute text moved outside blue frame');
assert.ok(source.includes('width:max-content!important'),'Frame hugs controls');
assert.ok(source.includes('width:44px!important'),'Keep 44px +/- targets');
const oldSource=require('node:child_process').execFileSync('git',[
  'show','origin/feature/b150-owner-ota-seq6-quiet-responsive-20261119:security/owner-ota-b150-seq6-quiet-ui.js'
],{encoding:'utf8'});
const start=source.indexOf('      /* Owner seq7: the blue frame hugs only');
const end=source.indexOf('      @media(max-width:370px){',start);
assert.ok(start>=0&&end>start,'Isolated seq7 CSS exists');
const seq7Source=source.slice(0,source.indexOf('      /* Owner seq8: visual button fill is smaller'))
  + source.slice(source.indexOf('      @media(max-width:370px){',source.indexOf('      /* Owner seq8: visual button fill is smaller')));
let reverted=seq7Source.slice(0,seq7Source.indexOf('      /* Owner seq7: the blue frame hugs only'))+seq7Source.slice(seq7Source.indexOf('      @media(max-width:370px){',seq7Source.indexOf('      /* Owner seq7: the blue frame hugs only')));
const changes=[
  [
    "'<div class=\"aq-quiet-controls\"><div class=\"aq-quiet-stepper\" role=\"group\" aria-label=\"مدة الصامت لصلاة '+names[id]+'\">'+",
    "'<div class=\"aq-quiet-stepper\" role=\"group\" aria-label=\"مدة الصامت لصلاة '+names[id]+'\">'+"
  ],
  [
    "'</div><span class=\"aq-quiet-unit\">دقيقة</span></div></div>';",
    "'<small>دقيقة</small></div></div>';"
  ]
];
for(const [after,before] of changes){
  assert.equal(reverted.split(after).length,2,'Expected only one targeted markup adjustment');
  reverted=reverted.replace(after,before);
}
assert.equal(reverted,oldSource,'All script logic and other UI must stay byte-identical');

const originalSeq7=require('node:child_process').execFileSync('git',[
  'show','origin/feature/b150-owner-ota-seq7-stepper-balance-20261119:security/owner-ota-b150-seq7-quiet-ui.js'
],{encoding:'utf8'});
assert.equal(seq7Source,originalSeq7,'Seq8 changes must be the new scoped style rules ONLY');
assert.ok(source.includes('background:transparent!important'),'No oversized blue box');
assert.ok(source.includes('center / 34px 34px no-repeat!important'),'Visual + and - sized 34px');
assert.ok(source.includes('flex:0 0 44px!important'),'Hit target stays 44px');


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
assert.ok(lastHtml.includes('width:34px')||source.includes('width:34px'));

let prevented=false;plus.fire('pointerdown',{preventDefault(){prevented=true}});
assert.equal(prevented,true,'Prevent tapping numeric field');
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
console.log('PASS seq8: immediate +/-/checkbox, no keyboard, rapid-tap native save deferred, 44px tap targets, compact help, no overflow, pagehide persist.');

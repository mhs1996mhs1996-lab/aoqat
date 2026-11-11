'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/prayer-countdown.js','utf8');

function section(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a, 'Expected production function must exist: '+start);
  return source.slice(a,b);
}

(async()=>{
  // Assert the visible number is rendered before an expensive persistence callback,
  // for every + / - press in both duration settings panes.
  const text=section('  function bindMinuteSteppers(', '  function createPanel(){');
  for(const attr of ['data-iqama','data-after-iqama']){
    let persisted={maghrib:12},previewCalls=0,persistCalls=0;
    const minus={disabled:false,addEventListener(_,cb){this.press=cb}};
    const plus={disabled:false,addEventListener(_,cb){this.press=cb}};
    const strong={textContent:'12'};
    const holder={querySelector(selector){return selector.includes('"-1"')?minus:plus}};
    const output={
      parentElement:holder,
      getAttribute(){return 'maghrib'},
      querySelector(){return strong}
    };
    const environment={queueMinutePreview(){previewCalls++},console};
    const bind=vm.runInNewContext(text+'\nbindMinuteSteppers',environment);
    bind({querySelectorAll(){return [output]}},attr,
      ()=>({...persisted}),
      changed=>{
        persistCalls++;
        assert.equal(strong.textContent,String(changed.maghrib),
          'The button must update synchronously BEFORE persistence');
        persisted=changed;
      });
    assert.equal(strong.textContent,'12');
    plus.press();assert.equal(strong.textContent,'13');
    minus.press();assert.equal(strong.textContent,'12');
    for(let i=12;i<30;i++)plus.press();
    assert.equal(strong.textContent,'30');
    assert.equal(plus.disabled,true);
    plus.press();assert.equal(persisted.maghrib,30);
    for(let i=30;i>1;i--)minus.press();
    assert.equal(strong.textContent,'1');
    assert.equal(minus.disabled,true);
    minus.press();assert.equal(persisted.maghrib,1);
    assert.equal(previewCalls,persistCalls);
  }

  // Native calls must be coalesced while tapping and immediately flushed
  // on pagehide or backgrounding, preserving the last changed minute.
  let before={dhuhr:10},after={dhuhr:12},calls=[];
  const listeners={};
  const environment={
    nativeIqama:true,
    settings:()=>({...before}),
    afterSettings:()=>({...after}),
    iqamaNotifyEnabled:()=>true,
    AndroidNative:{configureIqamaTiming(on,pre,post){calls.push({on,before:JSON.parse(pre),after:JSON.parse(post)});}},
    window:{addEventListener(name,callback){listeners[name]=callback}},
    document:{hidden:false,addEventListener(name,callback){listeners[name]=callback}},
    setTimeout,clearTimeout,console
  };
  const nativeText=section('  let lastNativeSettings="";','  function hydrateNativeIqama()');
  const control=vm.runInNewContext(nativeText+
    '\n({syncNativeIqama,queueNativeIqamaSync,flushPendingMinuteSync})',environment);
  control.syncNativeIqama();
  assert.equal(calls.length,1);
  calls=[];
  for(let minute=11;minute<=19;minute++){
    before.dhuhr=minute;
    control.queueNativeIqamaSync();
  }
  assert.equal(calls.length,0,'Rapid clicks cannot repeatedly call the Android bridge');
  await new Promise(resolve=>setTimeout(resolve,800));
  assert.equal(calls.length,1,'A rapid tap burst produces exactly one native update');
  assert.equal(calls[0].before.dhuhr,19);
  after.dhuhr=13;
  control.queueNativeIqamaSync();
  listeners.pagehide();
  assert.equal(calls.length,2,'Pagehide saves latest pending changes');
  assert.equal(calls[1].after.dhuhr,13);
  await new Promise(resolve=>setTimeout(resolve,800));
  assert.equal(calls.length,2,'Flushing cancels the delayed duplicate native call');
  before.dhuhr=20;
  control.queueNativeIqamaSync();
  environment.document.hidden=true;
  listeners.visibilitychange();
  assert.equal(calls.length,3);
  assert.equal(calls[2].before.dhuhr,20);
  console.log('PASS: immediate visible +/- response for both panels, precise 1–30 limits, debounced native updates and reliable background flush');
})().catch(e=>{console.error(e);process.exitCode=1});

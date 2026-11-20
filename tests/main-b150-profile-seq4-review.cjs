'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const from = fs.readFileSync(path.join(root,'android-updates/build-150/files/index.html'),'utf8');
const to = fs.readFileSync(path.join(root,'security/review-b150-main-profile-seq4-index.html'),'utf8');
const published = JSON.parse(fs.readFileSync(path.join(root,'android-updates/build-150/manifest.json'),'utf8'));
const sha = s => crypto.createHash('sha256').update(s,'utf8').digest('hex');
assert.equal(published.nativeBuild,150);
assert.equal(published.sequence,3);
assert.equal(sha(from),published.files['index.html'],'Production baseline must be the signed seq3 bytes');
const needle = "      panel.dir = 'rtl';\n      nav.sub('الملف الشخصي', panel, 'main');";
assert.equal(from.split(needle).length,2,'Exactly one empty owner profile');
const marker = 'AOQAT_MAIN_PROFILE_OTA_SEQ4_TEST';
assert.equal(to.split(marker).length,2,'Exactly one candidate marker');
const start = to.indexOf("      panel.dir = 'rtl';");
const endMarker = "      nav.sub('الملف الشخصي', panel, 'main');";
const end = to.indexOf(endMarker,start)+endMarker.length;
assert.ok(start>0 && end>start,'Profile patch bounds');
const inserted = to.slice(start,end);
assert.ok(inserted.includes('aoqatMainProfileSeq4Test'));
assert.equal(to.replace(inserted,needle),from,'Candidate must change ONLY the empty profile handler');
for(const disallowed of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage',
                         'navigator.geolocation', 'AndroidNative.', 'Notification(']) {
  assert.ok(!inserted.includes(disallowed),'Profile test cannot use '+disallowed);
}
assert.ok(/min-height:44px/.test(inserted),'Touch target must not be too small');
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.style={};this.textContent='';this.id='';}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(event,fn){this.listeners[event]=fn;}
  fire(name){assert.equal(typeof this.listeners[name],'function');this.listeners[name]({preventDefault(){},stopPropagation(){}});}
}
const list=new Element('section');list.id='webDrawerMain';
let navigation=null;
const document={
  readyState:'complete',
  createElement:tag=>new Element(tag),
  getElementById(id){
    function find(node){if(node.id===id)return node;for(const c of node.children){const found=find(c);if(found)return found;}return null;}
    return find(list);
  },
  addEventListener(){throw Error('unexpected pending DOM load');}
};
const window={AndroidNative:{configureAdhan(){}},
              AoqatWebSettingsNavigation:{sub(title,panel,parent){navigation={title,panel,parent};}}};
const blocks=[...to.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const inline=blocks.map(x=>x[1]).find(s=>s.includes('AOQAT_OTA_PROFILE_PROOF_B150_SEQUENCE2'));
assert.ok(inline,'Expected existing profile bridge inline script');
vm.runInNewContext(inline,{window,document,setInterval(){throw Error('Unexpected polling with ready menu');},clearInterval(){}});
assert.equal(list.children.length,1,'Exactly one profile entry');
list.children[0].fire('click');
assert.equal(navigation.title,'الملف الشخصي');
assert.equal(navigation.parent,'main');
const button=navigation.panel.children.find(x=>x.id==='aoqatMainProfileSeq4Test');
const result=navigation.panel.children.find(x=>x.id==='aoqatMainProfileSeq4Result');
assert.ok(button&&result,'Profile contains test button and status');
assert.match(result.textContent,/اضغط تيست/);
button.fire('click');
assert.match(result.textContent,/نجح اختبار وصول OTA رقم 4/);
assert.equal(published.sequence,3,'Review never publishes seq4');
const files={'index.html':sha(to)};
const canonical='index.html:'+files['index.html'];
const unsigned={nativeBuild:150,sequence:4,
  expiresAt:Date.now()+14*24*60*60*1000,
  revision:sha(canonical),files};
assert.equal(unsigned.revision,sha(canonical));
assert.ok(!Object.hasOwn(unsigned,'signature'),'Unsigned preview must NOT be installable');
fs.mkdirSync(path.join(root,'review-profile-seq4'),{recursive:true});
fs.writeFileSync(path.join(root,'review-profile-seq4','manifest-UNSIGNED.json'),
  JSON.stringify(unsigned,null,2)+'\n');
fs.copyFileSync(path.join(root,'security/review-b150-main-profile-seq4-index.html'),
  path.join(root,'review-profile-seq4','index.html'));
console.log('PASS: exact signed production seq3 baseline, single local test button works, zero unrelated changes.');
console.log('REVIEW_ONLY index SHA256:',sha(to));
console.log('SEQUENCE=4; UNSIGNED PREVIEW ONLY; production manifest remains sequence 3.');

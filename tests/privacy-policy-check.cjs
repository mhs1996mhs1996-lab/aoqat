'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(project,'js/web-menu-order.js'),'utf8');
const page=fs.readFileSync(path.join(project,'privacy.html'),'utf8');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const match=app.match(/const PRIVACY_SECTIONS=(\[[\s\S]*?\]);\s*function privacyView\(/);
assert.ok(match,'offline policy content is included in the settings code');
const sections=JSON.parse(match[1]);
test('Arabic privacy page is a valid static app-specific policy draft',()=>{
  assert.match(page,/<html lang="ar" dir="rtl">/);
  assert.match(page,/<title>سياسة الخصوصية \| أوقات الصلاة في الحويجة وضواحيها<\/title>/);
  assert.match(page,/<meta name="viewport"/);
  assert.ok(!/<script\b/i.test(page),'privacy policy needs no JavaScript');
  assert.ok(!/<iframe\b/i.test(page));
  assert.match(page,/20 تشرين الثاني 2026/);
  assert.match(page,/wa\.me\/9647857994000/);
});
test('Every policy section and paragraph matches offline app copy',()=>{
  assert.equal(sections.length,7);
  for(const section of sections){
    assert.match(section.title,/\S/);
    assert.ok(section.paragraphs.length>=1);
    assert.ok(page.includes('<h2>'+escape(section.title)+'</h2>'),section.title);
    for(const paragraph of section.paragraphs)
      assert.ok(page.includes('<p>'+escape(paragraph)+'</p>'),section.title+' text');
  }
});
test('Privacy is a real main menu icon and opens its full offline contents',()=>{
  assert.match(app,/function privacyView\(\)/);
  assert.match(app,/\["privacyPolicy","🔒","سياسة الخصوصية"\]/);
  assert.match(app,/if\(id==="privacyPolicy"\)\{privacyView\(\);return;\}/);
  assert.match(app,/openSub\("سياسة الخصوصية",wrap,"main"\)/);
  assert.ok(!app.includes('id="aoqatPrivacySettings"'),'avoid duplicate settings button');
  assert.ok(!app.includes('id="aoqatAboutApp"'),'privacy is one menu option');
  assert.ok(!/fetch\(.+privacy/i.test(app));
});
test('Policy acknowledges actual permissions and network operations',()=>{
  for(const snippet of ['ACCESS_COARSE_LOCATION','Supabase','المنطقة الزمنية','HTTPS','عدم الإزعاج','واتساب','إلغاء الاشتراك']){
    assert.ok(page.includes(snippet),snippet);
  }
});

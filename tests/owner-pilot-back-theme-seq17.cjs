const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const button=fs.readFileSync(path.join(base,'js/web-menu-button-theme.js'),'utf8');
const menu=fs.readFileSync(path.join(base,'js/web-menu-order.js'),'utf8');
test('generic button painter never repaints the shared Back button',()=>{
  const skipped=button.match(/const skip='([^']+)'/);
  assert.ok(skipped,'generic skip list exists');
  assert.ok(skipped[1].split(',').includes('.web-back'),'Back must be excluded from generic accent renderer');
  assert.match(button,/if\(button\.matches\(skip\)\|\|button\.closest\(/);
  assert.match(button,/button\.style\.setProperty\('background',bg,'important'\)/);
});
test('Back style uses current app theme gradient and text in all nested menus',()=>{
  const style=menu.match(/function cardsAndLockBackButton\(sub,enabled\)\{([\s\S]*?)\n  \}/);
  assert.ok(style,'shared Back style handler remains present');
  assert.match(style[1],/\.web-sub-head \.web-back/);
  assert.match(style[1],/var\(--wt-surface,/);
  assert.match(style[1],/var\(--wt-surface2,/);
  assert.match(style[1],/var\(--wt-text,/);
  assert.match(style[1],/setProperty\(name,value,"important"\)/);
  const opener=menu.match(/function openSub\(title,node,backTo="main"\)\{([\s\S]*?)\n  \}/);
  assert.ok(opener,'openSub remains present');
  assert.match(opener[1],/cardsAndLockBackButton\(sub,true\); sub\.classList\.add\("open"\);/);
  assert.match(opener[1],/overlay\.appendChild\(sub\);overlay\.hidden=false/);
  assert.doesNotMatch(opener[1],/future views\.sub\.classList/,'avoid OTA15 swallowed line regression');
});

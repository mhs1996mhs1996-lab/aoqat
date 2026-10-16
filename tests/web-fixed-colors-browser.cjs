const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
(async()=>{const server=spawn('python3',['-m','http.server','8812'],{stdio:'ignore'});let browser;
try{
 await new Promise(r=>setTimeout(r,1500));
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--single-process','--no-zygote']});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),cdp=await page.context().newCDPSession(page),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/rest/**',r=>r.abort());
 // Verify that the renderer actually recolors the previous conflicting CSS.
 await page.setContent('<meta name="color-scheme" content="only light"><style>html{color-scheme:only light!important}body{color-scheme:dark}.card{background:#fff5d6;color:#273b22;width:240px;height:160px;padding:20px}</style><div class="card">Original poster palette</div>');
 const control=await page.locator('.card').screenshot();await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:true});
 const darkControl=await page.locator('.card').screenshot();assert.notDeepEqual(control,darkControl,'Forced dark mode must be active for this regression test');
 await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:false});
 await page.goto('http://127.0.0.1:8812',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.aoqatUIReady&&document.querySelector('#designRef'));await page.waitForTimeout(1800);
 for(const theme of ['cream-blue','dark-night']){
  await page.evaluate(id=>window.applyWebTheme(id),theme);await page.emulateMedia({colorScheme:'light'});
  const before=await page.locator('#designRef').screenshot({animations:'disabled',caret:'hide'});
  const appearance=await page.evaluate(()=>({theme:document.body.dataset.webTheme,bg:getComputedStyle(document.body).backgroundColor}));
  await page.emulateMedia({colorScheme:'dark'});await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:true});
  const after=await page.locator('#designRef').screenshot({animations:'disabled',caret:'hide'});assert.deepEqual(after,before,'Poster colors must stay identical in '+theme);
  assert.deepEqual(await page.evaluate(()=>({theme:document.body.dataset.webTheme,bg:getComputedStyle(document.body).backgroundColor})),appearance);
  assert.deepEqual(await page.evaluate(()=>[document.documentElement,document.body,document.getElementById('designRef'),...document.querySelectorAll('#designRef *')].map(e=>getComputedStyle(e).colorScheme).filter(s=>s!=='light only')),[]);
  await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:false});
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.dataset.webTheme==='dark-night');
 assert.equal(await page.evaluate(()=>document.documentElement.getAttribute('data-aoqat-web-colors')),'fixed');
 // The native bridge must not activate the new web-only selector.
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('index.html','utf8'),script=html.match(/<script>\s*\/\/ Keep system[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
 vm.runInNewContext(script,{window:{AndroidNative:{configureAdhan(){}}},document:{documentElement:{setAttribute(){throw Error('Native rendering changed');}}}});
 assert.deepEqual(errors,[]);console.log('Web color isolation passed: active forced-dark control, identical poster pixels, light/dark user palettes, saved theme and native guard');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});

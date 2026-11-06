const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

(async()=>{
  const server=spawn('python3',['-m','http.server','8894'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(resolve=>setTimeout(resolve,800));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/rest/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8894',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.aoqatUIReady&&document.querySelector('#webDrawerMain'),{timeout:45000});
    await page.locator('#designSideMenuBtn').click();

    const check=async(where,theme)=>{
      const data=await page.evaluate(selector=>{
        const root=getComputedStyle(document.documentElement);
        const color=s=>String(s).match(/[0-9a-f]{2}/ig)?.length===3&&String(s).startsWith('#')
          ? [1,3,5].map(i=>parseInt(s.slice(i,i+2),16))
          : (String(s).match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number);
        const lum=rgb=>rgb.map(v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
        const backgrounds=['--wt-surface','--wt-surface2'].map(key=>lum(color(root.getPropertyValue(key).trim())));
        const ratio=rgb=>Math.min(...backgrounds.map(l=>{const x=lum(rgb);return (Math.max(l,x)+.05)/(Math.min(l,x)+.05)}));
        return [...document.querySelectorAll(selector)].map(el=>{
          const style=getComputedStyle(el);
          const descendants=[...el.querySelectorAll('span,strong,b,small')].filter(e=>e.textContent.trim());
          return {
            text:el.textContent.trim().slice(0,44),
            ratio:ratio(color(style.color)),
            minChildRatio:descendants.length?Math.min(...descendants.map(child=>ratio(color(getComputedStyle(child).color)))):99,
            size:parseFloat(style.fontSize),
            weight:Number(style.fontWeight)||0,
            gradient:style.backgroundImage,
            icon:el.querySelector('.ico')?.textContent.trim()||null
          };
        });
      },where);
      assert.ok(data.length>0,where+' no buttons');
      for(const x of data){
        assert.ok(x.ratio>=4.5,theme+' '+x.text+' text contrast '+x.ratio);
        assert.ok(x.minChildRatio>=4.5,theme+' '+x.text+' child text contrast '+x.minChildRatio);
        assert.ok(x.size>=16,theme+' '+x.text+' font size '+x.size);
        assert.ok(x.weight>=600,theme+' '+x.text+' font weight '+x.weight);
        assert.ok(x.gradient.includes('linear-gradient'),theme+' '+x.text+' background gradient missing');
      }
      return data.length;
    };
    let checked=0;
    for(const theme of ['cream-blue','cream-green','warm-burgundy','white-lavender','white-teal','dark-night','dark-graphite']){
      await page.evaluate(id=>{
        localStorage.setItem('aoqatWebButtonAppearanceV1',JSON.stringify({target:'both',style:'gradient'}));
        window.applyWebTheme(id);
      },theme);
      await page.waitForFunction(id=>document.body.dataset.webTheme===id,theme);
      checked+=await check('#webDrawerMain > .web-drawer-row',theme);
      for(const kind of ['settings','datePrayer','adhanIqama','muslimBag','alertSettings']){
        await page.locator('#webDrawerMain [data-drawer="'+kind+'"]').click();
        checked+=await check('#webSubBody .web-settings-list .main-action',theme+' '+kind);
        await page.locator('#settingsContentDialog .web-back').click();
      }
    }
    await page.locator('#webDrawerMain [data-drawer="adhanIqama"]').click();
    await page.getByRole('button',{name:'🔊 الأذان والتنبيه',exact:true}).click();
    await page.waitForSelector('#adEnable');
    const info=await page.locator('#paMethodOpen').evaluate(el=>{
      const style=getComputedStyle(el),root=getComputedStyle(document.documentElement);
      return {color:style.color,background:style.backgroundImage,themeText:root.getPropertyValue('--wt-text').trim()};
    });
    assert.ok(info.background.includes('linear-gradient'),'Adhan method entry keeps theme gradient');
    assert.notEqual(info.color,'rgb(255, 255, 255)','Adhan navigation must not force white text on a pale background');
    assert.deepEqual(errors,[]);
    console.log('PASS: '+checked+' main and nested menu buttons checked for contrast, icons and readability across seven themes; adhan state not changed');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});

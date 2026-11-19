const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:5189}});await server.listen();
 const browser=await chromium.launch({executablePath:'/tmp/mm-chromium',args:['--no-sandbox','--single-process','--no-zygote']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',r=>{if(r.request().method()!=='GET')writes.push(r.request().url());return r.fulfill({json:[]});});
  await page.goto('http://127.0.0.1:5189/');const nav=page.locator('.metal-side');await nav.getByRole('button',{name:'주요 정보',exact:true}).click();const root=page.getByRole('region',{name:'주요 정보 보관함'});await root.waitFor();
  const menuNames=await nav.getByRole('button').allTextContents();assert.equal(menuNames.findIndex(x=>x.trim()==='주요 정보'),menuNames.findIndex(x=>x.trim()==='메모')+1);
  assert.equal(await root.locator('.ii-card').count(),8);
  assert.equal(await root.locator('textarea:not([readonly]),[contenteditable=true]').count(),0);
  const search=root.getByRole('searchbox');await search.fill('서울더원 영문주소');assert.equal(await root.locator('.ii-card').count(),1);assert.equal(await root.getByRole('button',{name:/영문주소 복사/}).isDisabled(),true);
  await search.fill('검색결과없음');await root.getByText('일치하는 정보가 없어요',{exact:true}).waitFor();await root.getByRole('button',{name:'전체 정보 보기',exact:true}).click();assert.equal(await root.locator('.ii-card').count(),8);
  await root.getByRole('group',{name:'정보 종류'}).getByRole('button',{name:'계좌',exact:true}).click();assert.equal(await root.locator('.ii-card').count(),3);assert.equal(await root.locator('.ii-card button:not(:disabled)').count(),0);
  await root.getByRole('group',{name:'정보 종류'}).getByRole('button',{name:'전체',exact:true}).click();await root.getByRole('group',{name:'이름별 찾기'}).getByRole('button',{name:'마니페스타',exact:true}).click();assert.equal(await root.locator('.ii-card').count(),2);
  await root.getByRole('button',{name:'마니페스타 기본 정보 이름 복사',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'마니페스타');await root.getByRole('article',{name:'마니페스타 기본 정보'}).getByRole('button',{name:'전체 복사',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'이름: 마니페스타');
  await page.evaluate(()=>{Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{throw Error('blocked')}})});await root.getByRole('button',{name:'마니페스타 기본 정보 이름 복사',exact:true}).click();const fallback=root.getByLabel('복사용 텍스트',{exact:true});assert.equal(await fallback.inputValue(),'마니페스타');assert(await fallback.getAttribute('readonly')!==null);
  await page.screenshot({path:'/tmp/important-info-desktop.png'});await page.setViewportSize({width:390,height:844});assert(await search.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/important-info-mobile.png'});
  await page.goto('http://127.0.0.1:5189/?view=info');await page.getByRole('heading',{name:'주요 정보 읽기 전용'}).waitFor();assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,navigation:true,search:true,filters:true,multipleAccounts:true,readonly:true,copy:true,copyFallback:true,mobile:true,directLink:true,noServerWrites:true}));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1)});

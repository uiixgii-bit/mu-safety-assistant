// Real Chromium, isolated synthetic origin. No Google service or user profile is used.
const assert=require('assert'),fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true});
 await context.route('**/*',route=>route.request().url()==='https://mu-test.invalid/'?route.fulfill({contentType:'text/html',body:'<!doctype html><body><h1>Synthetic test fixture</h1></body>'}):route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.6.js','utf8');
 const key='muSafety.v150',rk='muSafety.v150.rc7Records';
 let prompts=[],alerts=[],confirmations=[],confirmAnswers=[];
 page.on('dialog',async d=>{if(d.type()==='prompt'){assert(prompts.length,'Unexpected prompt '+d.message());await d.accept(prompts.shift())}else if(d.type()==='confirm'){confirmations.push(d.message());const answer=confirmAnswers.length?confirmAnswers.shift():false;answer?await d.accept():await d.dismiss()}else{alerts.push(d.message());await d.accept()}});
 const run=()=>page.evaluate(source);
 await page.goto('https://mu-test.invalid/');await run();
 const onboarding=page.locator('#muSafetyAssistantV150RC86Onboarding');
 assert.strictEqual(await onboarding.count(),1);await onboarding.getByText('儲存並開始使用',{exact:true}).click();assert((await onboarding.getByText('請輸入姓名',{exact:true}).count())===1);
 const inputs=onboarding.locator('input');for(const [i,v] of ['虛構員','test01','測試客戶','一廠','test01'].entries())await inputs.nth(i).fill(v);
 await onboarding.getByText('儲存並開始使用',{exact:true}).click();assert.strictEqual(await onboarding.count(),0);
 let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.strictEqual(saved.e,'TEST01');assert.deepStrictEqual(saved.cp,[{c:'測試客戶',s:['一廠']}]);
 console.log('BROWSER PASS onboarding required fields, normalized identity and optional customer/site/project');
 await page.getByRole('button',{name:'⚙️ 設定',exact:true}).click();let cfg=page.locator('#muSafetyAssistantV150RC8SettingsHost');
 await cfg.locator('[data-custom-client]').fill('客戶乙');await cfg.locator('[data-add-client]').click();await cfg.locator('[data-custom-target]').selectOption('客戶乙');await cfg.locator('[data-custom-site]').fill('乙廠');await cfg.locator('[data-add-site]').click();await cfg.locator('[data-new]').fill('test02');await cfg.locator('[data-new-note]').fill('測試案號備註');await cfg.locator('[data-add]').click();await cfg.locator('[data-save]').click();await cfg.waitFor({state:'detached'});
 saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert(saved.cp.some(x=>x.c==='客戶乙'&&x.s.includes('乙廠')));assert(saved.pm.some(x=>x.code==='TEST02'&&x.note==='測試案號備註'));
 console.log('BROWSER PASS settings customer/site/project add and save');
 // Upgrade preservation uses fictional RC8.5 storage; opening RC8.6 must not write it.
 const records=[{id:'legacy-test',date:'2026-09-01',projectId:'TEST01',employeeId:'TEST01',status:'draft'}];
 await page.evaluate(({rk,records})=>localStorage.setItem(rk,JSON.stringify(records)),{rk,records});
 const before=await page.evaluate(()=>({...localStorage}));await page.reload();await run();assert.strictEqual(await onboarding.count(),0);assert.deepStrictEqual(await page.evaluate(()=>({...localStorage})),before);
 await page.getByRole('button',{name:'📋 我的工作紀錄',exact:true}).click();assert((await page.locator('#muSafetyAssistantV150RC8RecordsHost').getByText('2026-09-01',{exact:true}).count())>=1);await page.locator('#muSafetyAssistantV150RC8RecordsHost').getByRole('button',{name:/關閉/}).click();
 console.log('BROWSER PASS fictional RC8.5 opening preserves all storage bytes and renders legacy records');
 // Restore UI cancellation, merge, stale-editor closure and overwrite second confirmation.
 await page.getByRole('button',{name:'⚙️ 設定',exact:true}).click();cfg=page.locator('#muSafetyAssistantV150RC8SettingsHost');
 const backup={format:'mu-safety-assistant-backup',formatVersion:1,appVersion:'V1.50 RC8.5 試作版',createdAt:'2026-11-01T00:00:00Z',recordCount:1,data:{[rk]:records,[key]:{...saved,cp:[{c:'測試客戶',s:['一廠','新增二廠']}],p:['RESTORED'],pm:[{code:'RESTORED',note:'備份案'}]}}};
 const upload=async()=>{await cfg.locator('[data-backup-file]').setInputFiles({name:'fictional-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await cfg.locator('[data-backup-merge]').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#muSafetyAssistantV150RC8SettingsHost').shadowRoot.querySelector('[data-backup-merge]').disabled)};
 await upload();const cancelBefore=await page.evaluate(()=>({...localStorage}));await cfg.locator('[data-backup-merge]').click();assert.deepStrictEqual(await page.evaluate(()=>({...localStorage})),cancelBefore);
 confirmAnswers=[true];await cfg.locator('[data-backup-merge]').click();await cfg.waitFor({state:'detached'});saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert(saved.cp.find(x=>x.c==='測試客戶').s.includes('新增二廠'));
 await page.getByRole('button',{name:'⚙️ 設定',exact:true}).click();cfg=page.locator('#muSafetyAssistantV150RC8SettingsHost');assert((await cfg.getByText('新增二廠',{exact:false}).count())>=1);await upload();
 const overwriteBefore=await page.evaluate(()=>({...localStorage}));confirmAnswers=[true,false];const dl=page.waitForEvent('download');await cfg.locator('[data-backup-overwrite]').click();await dl;assert.deepStrictEqual(await page.evaluate(()=>({...localStorage})),overwriteBefore);
 confirmAnswers=[true,true];const dl2=page.waitForEvent('download');await cfg.locator('[data-backup-overwrite]').click();await dl2;await cfg.waitFor({state:'detached'});assert.deepStrictEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).p,key),['RESTORED']);
 console.log('BROWSER PASS backup upload, cancel, merge same-client site, stale editor closure, safety download, overwrite double-confirmation');
 // Synthetic Google Form skeleton, submit tripwire and prompt-driven document fill.
 await page.evaluate(({key})=>{let o=JSON.parse(localStorage.getItem(key));o.p=['TEST01'];o.pm=[{code:'TEST01',note:'測試專案'}];o.lp='TEST01';o.cp=[{c:'測試客戶',s:['一廠']}];o.lf='測試客戶 → 一廠';localStorage.setItem(key,JSON.stringify(o));
 window.__submits=0;document.addEventListener('submit',e=>{e.preventDefault();window.__submits++},true);HTMLFormElement.prototype.submit=function(){window.__submits++};HTMLFormElement.prototype.requestSubmit=function(){window.__submits++};window.__scroll=[];window.scrollTo=o=>window.__scroll.push(o);
 const form=document.createElement('form');for(const [title,type] of [['發生日期','date'],['員工編號','text'],['填表人姓名','text'],['今日 工安 工作要項','text'],['專案代碼','text'],['總工班人數','number'],['監工幾人','number'],['工安幾人','number']]){let item=document.createElement('div');item.setAttribute('role','listitem');item.append(document.createTextNode(title));let input=document.createElement('input');input.type=type;input.dataset.test=title;item.append(input);form.append(item)}let btn=document.createElement('button');btn.type='submit';btn.textContent='測試送出';form.append(btn);document.body.append(form);
 },{key});await run();
 prompts=['2026/9/02','1','4','虛構文書測試','1','8','1','2'];await page.getByRole('button',{name:'🚀 一般填表',exact:true}).click();await page.waitForFunction(()=>window.__scroll.length>0);assert.strictEqual(prompts.length,0);assert.strictEqual(await page.evaluate(()=>window.__submits),0);assert.strictEqual(await page.locator('[data-test="專案代碼"]').inputValue(),'TEST01');assert.strictEqual(await page.locator('[data-test="今日 工安 工作要項"]').inputValue(),'辦公室／文書作業');
 const all=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),rk);assert(all.some(x=>x.documentWork==='虛構文書測試'&&x.status==='draft'));assert(alerts.some(x=>x.includes('請檢查表單內容後手動提交')));
 console.log('BROWSER PASS synthetic Google Form document fill, pure project code, saved draft, completion alert, bottom-scroll, ZERO submits (not live Google validation)');
 // UI filtering and actual browser XLSX downloads from the RC8.6 report menu.
 await page.getByRole('button',{name:'📋 我的工作紀錄',exact:true}).click();
 const recordsHost=page.locator('#muSafetyAssistantV150RC8RecordsHost');
 await recordsHost.getByText('🔎 搜尋／篩選',{exact:true}).click();
 await recordsHost.locator('[data-filter=start-date]').fill('2026-10-01');
 await recordsHost.locator('[data-apply-filter]').click();
 assert((await recordsHost.locator('[data-record-count]').innerText()).includes('0 筆'));
 await recordsHost.locator('[data-reset-filter]').click();
 assert((await recordsHost.locator('[data-record-count]').innerText()).includes('2 筆'));
 await recordsHost.getByRole('button',{name:'關閉',exact:true}).click();
 await page.getByRole('button',{name:'📊 報表輸出中心',exact:true}).click();
 await page.locator('input[type=month]').fill('2026-09');
 fs.mkdirSync('test-results',{recursive:true});
 for(const [label,kind] of [['匯出月報 .xlsx','month'],['匯出季報 .xlsx','quarter']]){
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await pending;
  assert(download.suggestedFilename().endsWith('.xlsx'));const target=`test-results/browser-${kind}.xlsx`;await download.saveAs(target);assert.strictEqual(fs.readFileSync(target).subarray(0,2).toString(),'PK');
 }
 console.log('BROWSER PASS records filter/reset and actual monthly/quarterly XLSX downloads');
 assert.deepStrictEqual(errors,[]);await browser.close();console.log('RC8.6 REAL CHROMIUM ISOLATED SUITE PASS');
})().catch(e=>{console.error(e);process.exit(1)});

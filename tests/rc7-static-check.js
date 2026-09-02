const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('src/mu-safety-assistant-v1.50-rc7.js', 'utf8');
new vm.Script(source);
assert(source.includes("v:'V1.50 RC7'"), 'Displayed version must remain V1.50 RC7');
assert(source.includes("k:'muSafety.v150'") && source.includes("rk:'muSafety.v150.rc7Records'"), 'RC7 storage keys must remain stable');
for (const noise of ['debugger','console.log(','console.debug(','console.trace(']) assert(!source.includes(noise), `Release source contains debug noise: ${noise}`);
for (const unsafe of ['innerHTML','outerHTML','insertAdjacentHTML','document.write']) assert(!source.includes(unsafe), `Release source must not use ${unsafe}`);
assert(!source.includes('requestSubmit(') && !source.includes('.submit('), 'RC7 must never submit Google Form automatically');
const expected = [
  ['general','一般駐廠工安','參加施工前工具箱會議，執行現場安全衛生巡檢、PIP安全檢查、施工安全巡查及承攬商作業安全管理。','site'],
  ['followup','駐廠工安＋缺失追蹤','執行日常駐廠工安管理及現場安全巡檢，追蹤工安缺失改善情形並進行複查確認。','site'],
  ['supervisor','作業主管／工安支援','執行現場作業安全確認、作業監督及相關工安管理。','site'],
  ['office','辦公室文書／入場作業','辦理工安文件及表單、資料彙整、人員辦證、入場資格及權限申請等行政作業。','office'],
  ['plan','防護計畫／工程送審資料','製作、修訂及整理施工安全、防護計畫與工程送審相關資料。','office'],
  ['siteoffice','工務所作業','於工務所辦理工安文件、施工資料整理、現場支援準備及相關行政作業。','office-site']
];
const wtMatch = source.match(/WT=(\[.*?\]),NT=\[/s);
assert(wtMatch, 'Unable to locate RC7 work-template library');
const templates = vm.runInNewContext(wtMatch[1]);
assert.strictEqual(JSON.stringify(templates), JSON.stringify(expected.map(x => x.slice(0,3))), 'Six exact IDs, order, names, or full texts differ');
const locationMatch = source.match(/function workLocation\(id\)\{.*?\}(?=\nfunction systemWorkContent)/s);
assert(locationMatch, 'Unable to locate work-location mapping');
const locationFor = vm.runInNewContext(`(${locationMatch[0].replace('function workLocation','function')})`);
for (const [id,,,location] of expected) assert.strictEqual(locationFor('system:'+id), location, `${id} location differs`);
for (const id of ['custom:kept','','unknown','system:training','system:submission']) assert.strictEqual(locationFor(id), null, `${id} must not bypass migration/custom rules`);
const defaultMatch = source.match(/function workDefaultId\(id\)\{.*?\}(?=\nfunction workLocation)/s);
assert(defaultMatch, 'Unable to locate old-ID migration');
const normalize = vm.runInNewContext(`const WT=${wtMatch[1]}; (${defaultMatch[0].replace('function workDefaultId','function')})`);
const migration = {
  site:'general',toolbox:'general',pip:'general',patrol:'general',contractor:'general',training:'general',paperwork:'general',
  followup:'followup',supervisor:'supervisor',support:'supervisor',documents:'office',office:'office',plan:'plan',submission:'plan',siteoffice:'siteoffice'
};
for (const [oldId,newId] of Object.entries(migration)) assert.strictEqual(normalize('system:'+oldId),'system:'+newId, `${oldId} migration differs`);
assert.strictEqual(normalize('system:unknown'),'system:general');
assert.strictEqual(normalize(''),'system:general');
assert.strictEqual(normalize('custom:kept'),'custom:kept');
const contentMatch = source.match(/function systemWorkContent\(o,id,fallback\)\{.*?\}(?=\nfunction allWorkTemplates)/s);
assert(contentMatch, 'Unable to locate system override resolver');
const resolveContent = vm.runInNewContext(`(${contentMatch[0].replace('function systemWorkContent','function')})`);
assert.strictEqual(resolveContent({systemTemplateOverrides:{siteoffice:'使用者覆寫工務所內容'}},'siteoffice','原始內容'),'使用者覆寫工務所內容');
assert.strictEqual(resolveContent({systemTemplateOverrides:{}},'siteoffice','原始內容'),'原始內容');
assert.strictEqual(resolveContent({systemTemplateOverrides:{siteoffice:'  '}},'siteoffice','原始內容'),'原始內容');
assert.strictEqual(locationFor('system:siteoffice'),'office-site','Content override must not affect ID-based location');
const choiceMatch = source.match(/function resolveWorkTemplateChoice\(input,templates\)\{.*?\}(?=\nfunction chooseWorkTemplate)/s);
assert(choiceMatch, 'Unable to locate numeric work-template resolver');
const resolveChoice = vm.runInNewContext(`(${choiceMatch[0].replace('function resolveWorkTemplateChoice','function')})`);
const effectiveTemplates=expected.map(([id,name,content])=>['system:'+id,name,id==='siteoffice'?'覆寫後的工務所內容':content]);
for(let number=1;number<=6;number++){
  const selected=resolveChoice(String(number),effectiveTemplates);
  assert(Array.isArray(selected), `${number} must resolve to a template tuple`);
  assert.strictEqual(selected[2],effectiveTemplates[number-1][2], `${number} content differs`);
  assert.notStrictEqual(selected[2],String(number), `${number} must never become work content`);
}
assert.strictEqual(resolveChoice('6',effectiveTemplates)[2],'覆寫後的工務所內容','Override content must win for numeric choice');
assert.strictEqual(resolveChoice('整理工安文件及施工資料',effectiveTemplates),'整理工安文件及施工資料','Ad-hoc content must remain unchanged');
const modeMatch=source.match(/function shouldAutofillDefect\(mode,section\)\{.*?\}(?=\nasync function fill)/s);
assert(modeMatch,'Unable to locate general/defect mode rule');
const shouldAutofill=vm.runInNewContext(`(${modeMatch[0].replace('function shouldAutofillDefect','function')})`);
assert.strictEqual(shouldAutofill('normal','11-3'),true,'General fill must autofill 11-3 defaults');
assert.strictEqual(shouldAutofill('defect','11-3'),false,'Defect fill must reserve 11-3 for primary defect');
assert.strictEqual(shouldAutofill('defect','11-4'),true,'Defect fill must keep 11-4 no-defect defaults');
const fillMatch=source.match(/async function fill\(o,mode='normal'\)\{.*?\}(?=\nfunction normalizeRecord)/s);
assert(fillMatch&&fillMatch[0].includes("if(!shouldAutofillDefect(mode,s)){z('11-3 缺失性質',await ac([s,'今日是否有','違規','缺失','事項記錄']"),'Defect branch must select 11-3 nature in its exact question container');
const evidenceMatch=source.match(/function isRealDefectValue\(value\)\{.*?\}(?=\nfunction currentDefectAt)/s);
assert(evidenceMatch,'Unable to locate defect fallback rules');
const evidenceApi=vm.runInNewContext(`(()=>{const nd=${source.match(/function nd\(s\)\{.*?\}/s)[0].replace('function nd','function')};${evidenceMatch[0]};return {hasDefectEvidence}})()`);
assert.strictEqual(evidenceApi.hasDefectEvidence({nature:'',vendor:'慶源/黃自強',workerCount:'0',supervisor:'NA',category:'今日無缺失',description:'使用a字梯安全帶未確實勾掛'}),true);
assert.strictEqual(evidenceApi.hasDefectEvidence({nature:'',vendor:'NA',workerCount:'0',supervisor:'NA',category:'今日無缺失',description:'NA'}),false);
assert(source.includes("await ac([s,'違規','缺失','屬於何種缺失類型']"),'11-3 category must use container-scoped verified click');
const crud=(items,op,index,value)=>{let next=[...items];if(op==='add'&&value&&!next.includes(value))next.push(value);if(op==='edit'&&value)next[index]=value;if(op==='delete')next.splice(index,1);return next};
for(const name of ['常用廠商','常用監工','常用缺失內容']){let list=crud([],'add',0,name+'A');list=crud(list,'edit',0,name+'B');list=crud(list,'delete',0);assert.deepStrictEqual(list,[],`${name} CRUD regression`)}
const descriptionMatch=source.match(/function collectDefectDescription\(items\)\{.*?\}(?=\nfunction collectDefect)/s);assert(descriptionMatch,'Unable to locate single description flow');
function testDescription(items,input,expected){let calls=0,title='',api=vm.runInNewContext(`(()=>{const prompt=(t)=>{calls++;title=t;return input};${descriptionMatch[0]};return collectDefectDescription})()`,{get input(){return input},get calls(){return calls},set calls(v){calls=v},get title(){return title},set title(v){title=v}}),actual=api(items);assert.strictEqual(actual,expected);assert.strictEqual(calls,1,'Defect description must call prompt exactly once');assert(title.startsWith('常用缺失內容（可選常用編號或直接輸入此次內容）'))}
testDescription(['高架作業未勾掛安全帶'],'1','高架作業未勾掛安全帶');testDescription(['範本A'],'高架作業安全帶未確實勾掛','高架作業安全帶未確實勾掛');testDescription([],'此次直接內容','此次直接內容');
assert(!descriptionMatch[0].includes('缺失簡述（請依現場事實確認或修改）'),'Second description prompt must not exist');
const shortcutMatch=source.match(/function workTemplateChoices\(o\)\{.*?\}(?=\nfunction chooseNightOvertimeContent)/s);assert(shortcutMatch,'Unable to locate night shortcut choices');
assert(source.includes("'一般駐廠工安＋夜間加班'")&&source.includes("'駐廠工安＋缺失追蹤＋夜間加班'"));
const shortcutTemplates=[...effectiveTemplates,[effectiveTemplates[0][0],'一般駐廠工安＋夜間加班',effectiveTemplates[0][2],{night:true,baseName:effectiveTemplates[0][1]}],[effectiveTemplates[1][0],'駐廠工安＋缺失追蹤＋夜間加班',effectiveTemplates[1][2],{night:true,baseName:effectiveTemplates[1][1]}]];
for(const number of [7,8]){let selected=resolveChoice(String(number),shortcutTemplates);assert.strictEqual(selected[2],effectiveTemplates[number-7][2]);assert.strictEqual(selected[3].night,true);assert.strictEqual(selected[0],effectiveTemplates[number-7][0]);}
assert(source.includes("shortcutNight?await ac(['12-1','夜間加班'],[['是']])"),'Shortcut must verify Google Form 12-1 yes');
assert(source.includes("workTemplateName:Array.isArray(chosen)?chosen[3]?.baseName||chosen[1]"),'Shortcut record must keep base template name');
const required = ["rk:'muSafety.v150.rc7Records'", "['11-1','責任監工','工具箱會議']", "place==='site'?'是':'否'", "place==='office-site'?[['工務所']]", "['12-1','夜間加班']", "['12-2','夜間加班','內容']", 'function saveRecord', "status:'draft'", 'RC7 draft 工作紀錄', 'function openRecordsModal', "data-action','open-records", "addEventListener('click'", '目前尚無工作紀錄', '最近 30 筆紀錄', 'data-delete-record', 'data-export-records', 'data-clear-records', "['11-3','11-4']", 'attempt<3', 'systemTemplateOverrides', '✏️ 可編輯內容', 'function editSystemTemplate', "'readonly':''", "'aria-label':'工作內容'", '恢復此範本預設內容', 'delete systemTemplateOverrides', 'draft.systemTemplateOverrides=systemTemplateOverrides', 'workTemplates.push', 'workTemplates=workTemplates.filter', 'function chooseWorkTemplate', 'function workTemplateChoices', 'function chooseNightOvertimeContent', 'initial=Array.isArray(chosen)?chosen[2]', "t(['今日','工安','工作要項'],w)", 'workContent:w', "fill(L(),'normal')", "fill(L(),'defect')", '💾 更新今日紀錄', 'function updateCurrentDraft', 'hasDefect', 'defectType', 'defectVendor', 'defectWorkerCount', 'defectSupervisor', 'defectDescription', 'data-view-record', 'defectVendors', 'defectSupervisors', 'defectDescriptions', 'function collectDefect', 'function collectDefectDescription', 'DEFECT_NATURES', 'DEFECT_CATEGORIES', "currentDefectAt('11-3')", "currentDefectAt('11-4')", 'primaryDefect', 'secondaryDefect', 'function hasDefectEvidence', "'⚠️ 2 件'", "'⚠️ 1 件'"];
for (const marker of ['function openRecordsModal',"data-action','open-records","addEventListener('click'",'目前尚無工作紀錄','最近 30 筆紀錄','data-delete-record','data-export-records','data-clear-records','RC7 draft 工作紀錄']) assert(source.includes(marker), `Missing records marker: ${marker}`);
const recordsUiMatch=source.match(/function openRecordsModal\(\)\{.*?\}(?=\n+function showRecordsError)/s);
assert(recordsUiMatch,'Unable to locate Records modal implementation');
for(const forbidden of ['innerHTML','outerHTML','insertAdjacentHTML','document.write']) assert(!recordsUiMatch[0].includes(forbidden),`Records UI must not use ${forbidden}`);
const recordFunctions=source.match(/function defectShape\(d\)\{.*?\}(?=\n+function exportRecords)/s);
assert(recordFunctions, 'Unable to locate records persistence functions');
const memory=new Map();
const recordApi=vm.runInNewContext(`(()=>{const A={rk:'muSafety.v150.rc7Records'},st=()=>({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)});${recordFunctions[0]};return {records,saveRecord,normalizeRecord,applyDefectUpdate,defectShape}})()`,{memory});
const first=recordApi.saveRecord({date:'2026-08-28',projectId:'P1',employeeId:'E1',workContent:'第一次',status:'draft'});
assert(first&&recordApi.records().length===1,'Draft must be written to RC7 records');
const second=recordApi.saveRecord({date:'2026-08-28',projectId:'P1',employeeId:'E1',workContent:'更新',status:'draft'});
assert(second&&recordApi.records().length===1&&recordApi.records()[0].workContent==='更新','Same date/project/employee draft must update');
const legacy=recordApi.normalizeRecord({id:'old'});
assert.deepStrictEqual(JSON.parse(JSON.stringify(legacy)),{hasDefect:false,defectType:'',defectVendor:'',defectWorkerCount:'',defectSupervisor:'',defectDescription:'',primaryDefect:null,secondaryDefect:null,id:'old'},'Legacy records need safe defect defaults');
const primary={nature:'不安全行為',vendor:'廠商甲',workerCount:'2',supervisor:'監工乙',category:'(7)個人防護具',description:'未依規定防護'},secondary={nature:'不安全環境',vendor:'廠商乙',workerCount:'3',supervisor:'監工丙',category:'(6)整理整頓',description:'材料未整理'};
const updated=recordApi.applyDefectUpdate(legacy,{hasDefect:true,primaryDefect:primary,secondaryDefect:secondary});
assert.deepStrictEqual(JSON.parse(JSON.stringify(updated.primaryDefect)),primary);assert.deepStrictEqual(JSON.parse(JSON.stringify(updated.secondaryDefect)),secondary);
const oldSingle=recordApi.normalizeRecord({hasDefect:true,defectType:'(5)紀律',defectVendor:'舊廠商',defectWorkerCount:'1',defectSupervisor:'舊監工',defectDescription:'舊內容'});assert.strictEqual(oldSingle.primaryDefect.category,'(5)紀律');assert.strictEqual(oldSingle.secondaryDefect,null);
const combined=recordApi.normalizeRecord({hasDefect:true,primaryDefect:primary,secondaryDefect:null,nightOvertime:true,nightOvertimeContent:'夜間安全巡檢'});
assert.strictEqual(combined.hasDefect,true,'A record must preserve defect and night overtime together');
assert.strictEqual(combined.primaryDefect.description,primary.description);
assert.strictEqual(combined.secondaryDefect,null);
assert.strictEqual(combined.nightOvertime,true);
assert.strictEqual(combined.nightOvertimeContent,'夜間安全巡檢');
for (const marker of required) assert(source.includes(marker), `Missing regression marker: ${marker}`);
assert(!source.includes("label(habits,'預設工作地點'"));
const factoryMatch=source.match(/f\.onclick=.*?(?=;p\.appendChild\(f\))/s);
assert(factoryMatch&&factoryMatch[0].includes('removeItem(A.k)'), 'Factory reset must clear all settings and overrides');
assert(!factoryMatch[0].includes('removeItem(A.rk)'), 'Factory reset must preserve RC7 records');
const clearAllMatch=recordsUiMatch[0].match(/data-clear-records[\s\S]*?confirm\([\s\S]*?confirm\(/);
assert(clearAllMatch, 'Clear-all records must retain two confirmations');
const bookmark = 'javascript:' + encodeURIComponent(source) + ';';
assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC7.txt','utf8').trim(), bookmark, 'Backup bookmarklet differs from source');
const html = fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC7_一鍵安裝.html','utf8');
const href = html.match(/class="bookmark" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
assert.strictEqual(href, bookmark, 'Installer bookmarklet differs from source');
console.log('RC7 Final static checks passed: version/storage stability, six scenarios, migration, combined defect+night records, safety, and package parity.');

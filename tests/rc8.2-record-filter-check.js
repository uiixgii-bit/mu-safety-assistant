const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.2.js','utf8');
new vm.Script(source);
assert(source.includes("v:'V1.50 RC8.2'"),'RC8.2 version must be displayed');
assert(source.includes("rk:'muSafety.v150.rc7Records'"),'RC8.2 must continue to use the RC7 Records key');
for(const key of [...source.matchAll(/muSafety\.v150\.[A-Za-z0-9.]*Records/g)].map(match=>match[0]))assert.strictEqual(key,'muSafety.v150.rc7Records',`Unexpected Records key: ${key}`);
for(const unsafe of ['innerHTML','outerHTML','insertAdjacentHTML','document.write'])assert(!source.includes(unsafe),`Unsafe DOM API found: ${unsafe}`);
assert(!source.includes('requestSubmit(')&&!source.includes('.submit('),'RC8.2 must never submit a Google Form automatically');
for(const marker of ['📊 工作統計中心','🔎 搜尋／篩選','套用篩選','清除篩選','找到 ${selected.length} 筆紀錄','沒有符合目前篩選條件的工作紀錄','replaceChildren'])assert(source.includes(marker),`Missing RC8.2 UI marker: ${marker}`);
const ndMatch=source.match(/function nd\(s\)\{.*?\}/s);
const realMatch=source.match(/function isRealDefectValue\(value\)\{.*?\}(?=\nfunction currentDefectAt)/s);
const filters=source.match(/function recordHasDefect\(record\)\{.*?\}(?=\nfunction exportRecords)/s);
assert(ndMatch&&realMatch&&filters,'Unable to locate RC8.2 record filter helpers');
const api=vm.runInNewContext(`(()=>{${ndMatch[0]};${realMatch[0]};${filters[0]};return {recordHasDefect,recordSites,recordFilterOptions,filterRecords}})()`);
const records=[
 {id:'new-defect-night',date:'2026-09-09',createdAt:'2026-09-09T10:00:00Z',projectId:'P2',site:'自訂廠區',plant:'二期',workLocation:'在上述廠區',employeeId:'E1',primaryDefect:{category:'(1)高架'},secondaryDefect:null,nightOvertime:true},
 {id:'same-date-other-project',date:'2026-09-09',createdAt:'2026-09-09T09:00:00Z',projectId:'P1',site:'廠區甲',employeeId:'E2',hasDefect:false,nightOvertime:false},
 {id:'same-date-same-project-other-worker',date:'2026-09-09',createdAt:'2026-09-09T08:00:00Z',projectId:'P1',site:'廠區甲',employeeId:'E3',defectType:'(2)動火',nightOvertime:false},
 {id:'legacy-defect',date:'2026-08-31',createdAt:'2026-08-31T10:00:00Z',projectId:'P1',plant:'舊廠區',hasDefect:true,defectVendor:'舊廠商',nightOvertime:false},
 {id:'no-project',date:'2026-08-01',createdAt:'2026-08-01T10:00:00Z',workLocation:'辦公室',nightOvertime:false},
 {id:'old',date:'2026-07-15',createdAt:'2026-07-15T10:00:00Z',projectId:'P3',site:'廠區乙',nightOvertime:true}
];
const snapshot=JSON.stringify(records);
const filter=criteria=>api.filterRecords(records,criteria).map(record=>record.id);
assert.deepStrictEqual(filter({}),records.map(record=>record.id),'No filter must preserve the input order and all records');
assert.deepStrictEqual(filter({startDate:'2026-09-01'}),['new-defect-night','same-date-other-project','same-date-same-project-other-worker']);
assert.deepStrictEqual(filter({endDate:'2026-08-31'}),['legacy-defect','no-project','old']);
assert.deepStrictEqual(filter({startDate:'2026-08-01',endDate:'2026-08-31'}),['legacy-defect','no-project']);
assert.deepStrictEqual(api.filterRecords([{id:'missing-date'}],{endDate:'2026-09-30'}),[],'Records without a valid date must not match a date filter');
assert.deepStrictEqual(filter({projectId:'P2'}),['new-defect-night']);
assert.deepStrictEqual(filter({site:'自訂廠區'}),['new-defect-night'],'Custom sites must be filterable');
assert.deepStrictEqual(filter({site:'二期'}),['new-defect-night'],'plant must contribute dynamic site values');
assert.deepStrictEqual(filter({site:'在上述廠區'}),['new-defect-night'],'workLocation must contribute dynamic site values');
assert.deepStrictEqual(filter({defect:'yes'}),['new-defect-night','same-date-same-project-other-worker','legacy-defect'],'New and legacy defect schemas must be detected');
assert.deepStrictEqual(filter({defect:'no'}),['same-date-other-project','no-project','old']);
assert.deepStrictEqual(filter({overtime:'yes'}),['new-defect-night','old']);
assert.deepStrictEqual(filter({overtime:'no'}),['same-date-other-project','same-date-same-project-other-worker','legacy-defect','no-project']);
assert.deepStrictEqual(filter({startDate:'2026-09-01',projectId:'P2',site:'自訂廠區',defect:'yes',overtime:'yes'}),['new-defect-night'],'Combined defect and night-overtime filters must work on the same record');
assert.deepStrictEqual(filter({projectId:'不存在'}),[],'No-match filters must return an empty list');
const options=api.recordFilterOptions(records);
assert.strictEqual(JSON.stringify(options.projects),JSON.stringify(['P1','P2','P3']),'Project choices must be dynamic and omit missing values');
for(const value of ['自訂廠區','二期','在上述廠區','舊廠區','辦公室'])assert(options.sites.includes(value),`Dynamic site choices must include ${value}`);
assert.strictEqual(JSON.stringify(records),snapshot,'Filtering must not mutate original Records');
console.log('RC8.2 record filter checks passed: ordering, date bounds/range, dynamic project/site, legacy/new defects, overtime, combinations, empty results, and immutable Records.');
const bookmark='javascript:'+encodeURIComponent(source)+';';
assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC8.2.txt','utf8').trim(),bookmark,'RC8.2 backup bookmarklet must match source');
const installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.2_一鍵安裝.html','utf8');
const href=installer.match(/class="bookmark" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
assert.strictEqual(href,bookmark,'RC8.2 installer bookmarklet must match source');
console.log('RC8.2 package parity check passed.');

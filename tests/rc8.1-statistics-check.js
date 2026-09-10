const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.1.js','utf8');
new vm.Script(source);
assert(source.includes("v:'V1.50 RC8.1'"),'RC8.1 version must be displayed');
assert(source.includes("rk:'muSafety.v150.rc7Records'"),'Statistics must read the RC7 Records key');
assert(!source.includes('muSafety.v150.rc8Records'),'RC8.1 must not create a second Records key');
for(const unsafe of ['innerHTML','outerHTML','insertAdjacentHTML','document.write'])assert(!source.includes(unsafe),`Unsafe DOM API found: ${unsafe}`);
assert(!source.includes('requestSubmit(')&&!source.includes('.submit('),'RC8.1 must never submit a Google Form automatically');
assert(source.includes("data-action','open-statistics")&&source.includes('📊 工作統計中心'),'Statistics entry must be present');
const normalize=source.match(/function defectShape\(d\)\{.*?\}(?=\nfunction readRecords)/s)[0];
const statistics=source.match(/function statisticMonth\(value\)\{.*?\}(?=\nfunction exportRecords)/s)[0];
const api=vm.runInNewContext(`(()=>{${normalize};${statistics};return {buildStatistics,statisticDefects}})()`);
const records=[
 {date:'2026-09-01',workLocation:'在上述廠區',workTemplateName:'一般駐廠工安',projectId:'P260305300'},
 {date:'2026-09-02',workLocation:'在上述廠區',workTemplateName:'一般駐廠工安',projectId:'P260305300',nightOvertime:true,nightOvertimeContent:'PIP教育訓練'},
 {date:'2026-09-03',workLocation:'辦公室',workTemplateName:'自訂巡檢範本',projectId:'P260305300',hasDefect:true,defectType:'(1)高架',defectVendor:'慶源/黃自強'},
 {date:'2026-09-03',workLocation:'工務所',workTemplateName:'作業主管／工安支援',projectId:'P260305300',primaryDefect:{category:'(2)動火',vendor:'廠商甲'},secondaryDefect:{category:'(3)感電',vendor:'廠商乙'}},
 {date:'2026-08-31',workLocation:'其他',workTemplateName:'一般駐廠工安',projectId:'P260305300'}
];
let september=api.buildStatistics(records,'2026-09');
assert.strictEqual(september.selected.length,4,'This month must filter by record.date');
assert.strictEqual(september.days.size,3,'Same-date records must count as one work day');
assert.strictEqual(september.locations['在上述廠區'],2);
assert.strictEqual(september.locations['辦公室'],1);
assert.strictEqual(september.templates['自訂巡檢範本'],1,'Custom templates must be counted dynamically');
assert.strictEqual(september.nightDays.size,1);
assert.strictEqual(september.nightContents['PIP教育訓練'],1);
assert.strictEqual(september.defectDays.size,1);
assert.strictEqual(september.noDefectDays.size,2);
assert.strictEqual(september.defectCount,3,'Legacy defect plus primary/secondary defects must be counted');
assert.strictEqual(september.categories['(1)高架'],1);
assert.strictEqual(september.categories['(2)動火'],1);
assert.strictEqual(september.vendors['慶源/黃自強'],1);
assert.strictEqual(september.projects.P260305300.records,4);
assert.strictEqual(september.projects.P260305300.days.size,3);
let august=api.buildStatistics(records,'2026-08');
assert.strictEqual(august.selected.length,1,'Previous month data must be selectable');
let empty=api.buildStatistics(records,'2026-07');
assert.strictEqual(empty.selected.length,0,'Empty months must not throw');
assert.strictEqual(empty.days.size,0);
assert.strictEqual(empty.defectCount,0);
console.log('RC8.1 statistics checks passed: month filtering, empty state, dynamic template/location/category/vendor/project counts, legacy/new defects, overtime, and duplicate dates.');
const bookmark='javascript:'+encodeURIComponent(source)+';';
assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC8.1.txt','utf8').trim(),bookmark,'RC8.1 backup bookmarklet must match source');
const installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.1_一鍵安裝.html','utf8');
const href=installer.match(/class="bookmark" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
assert.strictEqual(href,bookmark,'RC8.1 installer bookmarklet must match source');
console.log('RC8.1 package parity check passed.');

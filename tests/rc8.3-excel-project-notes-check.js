const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.3.js','utf8');
assert(source.includes("v:'V1.50 RC8.3'"),'RC8.3 version marker is required');
assert(source.includes("rk:'muSafety.v150.rc7Records'"),'RC8.3 must retain the RC7 Records key');
for(const key of [...source.matchAll(/muSafety\.v150\.[A-Za-z0-9.]*Records/g)].map(x=>x[0]))assert.strictEqual(key,'muSafety.v150.rc7Records',`Unexpected Records key: ${key}`);
for(const marker of ['📊 工作統計中心','🔎 搜尋／篩選','匯出月報 Excel','匯出季報 Excel','data-new-note','備註／廠區／工程名稱（可留空）'])assert(source.includes(marker),`Missing RC8.3 marker: ${marker}`);

const projectFns=source.match(/normalizeProjects=.*?(?=,PR=o=>)/s)[0];
const projects=vm.runInNewContext(`(()=>{const SP=['P260305300','P240508000','P250704500'];const ${projectFns};return {normalizeProjects,projectLabel}})()`);
assert.deepStrictEqual(JSON.parse(JSON.stringify(projects.normalizeProjects({p:['old1','P2']}))),[{code:'OLD1',note:''},{code:'P2',note:''}],'Legacy string project IDs must remain compatible');
assert.deepStrictEqual(JSON.parse(JSON.stringify(projects.normalizeProjects({p:['P1','P2'],pm:[{code:'p1',note:'華邦 24K'}]}))),[{code:'P1',note:'華邦 24K'},{code:'P2',note:''}],'Notes must overlay legacy IDs without losing projects');
assert.strictEqual(projects.projectLabel({code:'P1',note:'華邦 24K'}),'P1｜華邦 24K');
assert.strictEqual(projects.projectLabel({code:'P2',note:''}),'P2');
assert(source.includes("draft.p=projects.map(x=>x.code)"),'Legacy p array must remain pure project codes');
assert(source.includes("draft.pm=projects.map(x=>({code:x.code,note:x.note}))"),'Project notes must be saved separately in settings');
assert(source.includes("pj=String(Array.isArray(pj)?pj[0]:pj).trim().toUpperCase()"),'Google Form project value must resolve to the pure project code');
assert(!/saveRecord\(\{[^}]*projectNote/s.test(source),'Records schema must not receive project notes');

const scrollFn=source.match(/function scrollToFormBottom\(\).*?(?=\nasync function fill)/s)[0];
let scrollCall=null;
vm.runInNewContext(`(()=>{${scrollFn};scrollToFormBottom()})()`,{
 window:{scrollTo:value=>{scrollCall=value}},
 document:{body:{scrollHeight:1200},documentElement:{scrollHeight:1800}}
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(scrollCall)),{top:1800,left:0,behavior:'auto'},'Completed fill must scroll to the Google Form bottom');
assert(source.includes('`);scrollToFormBottom()}'),'Bottom scroll must run only after the completion alert is dismissed');
assert(!/\.requestSubmit\s*\(/.test(source),'RC8.3 must never call requestSubmit()');
assert(!/\.submit\s*\(/.test(source),'RC8.3 must never call submit()');

const stat=source.match(/function defectShape\(d\).*?(?=\nfunction openStatisticsModal)/s)[0];
const reports=vm.runInNewContext(`(()=>{${stat};return {reportWindow,excelSafe,excelReportData,buildExcelReport}})()`);
assert.deepStrictEqual(JSON.parse(JSON.stringify(reports.reportWindow('quarter','2026-09'))),{label:'2026 年第 3 季',slug:'2026-Q3',start:'2026-07-01',end:'2026-09-31'});
const records=[
 {date:'2026-07-01',name:'甲',employeeId:'E1',projectId:'P1',workContent:'巡檢',nightOvertime:false,status:'draft'},
 {date:'2026-09-30',name:'乙',employeeId:'E2',projectId:'P2',workContent:'=HYPERLINK("bad")',nightOvertime:true,nightOvertimeContent:'PIP',primaryDefect:{category:'高架',vendor:'廠商甲',description:'未繫安全帶'},status:'draft'},
 {date:'2026-10-01',projectId:'P3',status:'draft'}
];
const quarter=reports.excelReportData(records,'quarter','2026-09');
assert.strictEqual(quarter.selected.length,2,'Quarter export must include exactly the selected quarter');
assert.strictEqual(quarter.days.size,2);
assert.strictEqual(quarter.defects.length,1);
assert.strictEqual(quarter.nightDays.size,1);
const month=reports.excelReportData(records,'month','2026-09');
assert.strictEqual(month.selected.length,1,'Month export must include exactly the selected month');
const html=reports.buildExcelReport(records,'quarter','2026-09');
for(const label of ['工作天數','工作紀錄筆數','缺失總件數','夜間加班天數','案號','缺失內容'])assert(html.includes(label),`Excel report is missing ${label}`);
assert(html.includes("'=HYPERLINK(&quot;bad&quot;)"),'Excel formula injection must be neutralized');
assert(!html.includes('<script>'),'Excel report must escape user content');

const bookmark='javascript:'+encodeURIComponent(source)+';';
assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC8.3.txt','utf8').trim(),bookmark,'RC8.3 backup bookmarklet must match source');
const installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.3_一鍵安裝.html','utf8');
const href=installer.match(/class="install" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
assert.strictEqual(href,bookmark,'RC8.3 installer bookmarklet must match source');

console.log('RC8.3 checks passed: project notes/pure-code isolation, reports, bottom-scroll without submit, and package parity.');

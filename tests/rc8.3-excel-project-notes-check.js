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

for(const marker of ['📊 報表輸出中心','統計摘要','工作明細','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xlsx'])assert(source.includes(marker),`Missing XLSX report marker: ${marker}`);
assert(!source.includes(".xls'"),'Legacy .xls download must be removed');
assert(source.includes("if(!result.data.selected.length)return alert('此期間沒有工作紀錄')"),'Empty periods must alert without creating a download');
for(const forbidden of ['innerHTML','outerHTML','insertAdjacentHTML','document.write'])assert(!source.includes(forbidden),`Forbidden DOM API: ${forbidden}`);

const stat=source.match(/function defectShape\(d\).*?(?=\/\* RC8\.3_XLSX_START \*\/)/s)[0];
const xlsx=source.match(/\/\* RC8\.3_XLSX_START \*\/([\s\S]*?)\/\* RC8\.3_XLSX_END \*\//)[1];
const reports=vm.runInNewContext(`(()=>{${stat};${xlsx};return {reportWindow,excelReportData,reportSummaryRows,reportDetailRows,buildXlsxReport}})()`,{TextEncoder});
for(const [month,label,start,end] of [['2026-01','2026 年第 1 季','2026-01-01','2026-03-31'],['2026-04','2026 年第 2 季','2026-04-01','2026-06-31'],['2026-09','2026 年第 3 季','2026-07-01','2026-09-31'],['2026-12','2026 年第 4 季','2026-10-01','2026-12-31']])assert.deepStrictEqual(JSON.parse(JSON.stringify(reports.reportWindow('quarter',month))),{label,slug:`2026-Q${Math.ceil(Number(month.slice(5))/3)}`,start,end});
const records=[
 {date:'2026-07-01',employeeId:'E1',projectId:'P1',status:'draft'},
 {date:'2026-09-02',client:'華邦',site:'高雄華邦',employeeId:'E2',projectId:'P260305300',workTemplateName:'一般駐廠工安',workLocation:'在上述廠區',crewCount:'8',nightOvertime:true,nightOvertimeContent:'PIP',status:'draft'},
 {date:'2026-09-07',employeeId:'E2',projectId:'P260305300',hasDefect:true,defectType:'高架',defectVendor:'廠商甲',defectDescription:'未繫安全帶',secondaryDefect:{nature:'一般',vendor:'廠商乙',workerCount:'2',supervisor:'王員',category:'PPE',description:'未戴護目鏡'},status:'draft'},
 {date:'2026-10-01',projectId:'P3',status:'draft'}
];
const snapshot=JSON.stringify(records);
const quarter=reports.excelReportData(records,'quarter','2026-09');
assert.strictEqual(quarter.selected.length,3,'Q3 export must include July through September');
assert.strictEqual(quarter.defects.length,2,'Legacy primary plus secondary defect must both export');
assert.strictEqual(quarter.nightDays.size,1);
const month=reports.excelReportData(records,'month','2026-09');
assert.strictEqual(month.selected.length,2,'September export must include exactly September records');
assert.strictEqual(reports.excelReportData(records,'month','2026-08').selected.length,0,'Empty month must be detected before download');
const workbook=reports.buildXlsxReport(records,'quarter','2026-09');
if(process.env.RC83_XLSX_FIXTURE)fs.writeFileSync(process.env.RC83_XLSX_FIXTURE,workbook.bytes);
assert.strictEqual(String.fromCharCode(...workbook.bytes.slice(0,4)),'PK\u0003\u0004','Output must be a real ZIP-based XLSX');
function unzipStored(bytes){let out={},at=0,decoder=new TextDecoder();while(bytes[at]===80&&bytes[at+1]===75&&bytes[at+2]===3&&bytes[at+3]===4){let view=new DataView(bytes.buffer,bytes.byteOffset+at),size=view.getUint32(18,true),nameLength=view.getUint16(26,true),extraLength=view.getUint16(28,true),start=at+30+nameLength+extraLength,name=decoder.decode(bytes.slice(at+30,at+30+nameLength));out[name]=decoder.decode(bytes.slice(start,start+size));at=start+size}return out}
const files=unzipStored(workbook.bytes);
assert(files['[Content_Types].xml'].includes('spreadsheetml.sheet.main+xml'),'Package must declare XLSX workbook content');
assert(files['xl/workbook.xml'].includes('name="統計摘要"')&&files['xl/workbook.xml'].includes('name="工作明細"'),'Workbook must contain exactly named report sheets');
for(const value of ['報表期間','工作天數','工作紀錄數','工作地點統計','工作情境統計','案號統計','夜間加班統計','缺失統計'])assert(files['xl/worksheets/sheet1.xml'].includes(value),`Summary sheet missing ${value}`);
for(const value of ['P260305300','一般駐廠工安','在上述廠區'])assert(files['xl/worksheets/sheet1.xml'].includes(value),`Summary values missing ${value}`);
for(const value of ['P260305300','PIP','未繫安全帶','未戴護目鏡','缺失 1 內容','缺失 2 內容','紀錄狀態'])assert(files['xl/worksheets/sheet2.xml'].includes(value),`Detail sheet missing ${value}`);
assert(!/undefined|null/.test(files['xl/worksheets/sheet2.xml']),'Missing fields must export as blanks');
assert.strictEqual(JSON.stringify(records),snapshot,'Report generation must not mutate Records');

const bookmark='javascript:'+encodeURIComponent(source)+';';
assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC8.3.txt','utf8').trim(),bookmark,'RC8.3 backup bookmarklet must match source');
const installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.3_一鍵安裝.html','utf8');
const href=installer.match(/class="install" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
assert.strictEqual(href,bookmark,'RC8.3 installer bookmarklet must match source');

console.log('RC8.3 checks passed: project notes/pure-code isolation, reports, bottom-scroll without submit, and package parity.');

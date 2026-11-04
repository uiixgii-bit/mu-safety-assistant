const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.6.js','utf8');
const section=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b)};
const A={v:'V1.50 RC8.6 試作版',rk:'muSafety.v150.rc7Records',k:'muSafety.v150',h:'muSafety.v150.rc4History',old:'muSafety.v140'};
const api=vm.runInNewContext(`(()=>{const A=${JSON.stringify(A)},st=()=>null;${section('const MU_BACKUP_FORMAT=','function muBackupSettingsSection')};${section('function nd(s)','function askDate')};${section('function defectShape(d)','function openStatisticsModal')};${section('function recordHasDefect(record)','function exportRecords')};return{muCreateBackup,muRestoreBackup,muPlanRestore,filterRecords,buildStatistics,buildXlsxReport,excelReportData,reportSummaryRows,reportDetailRows}})()`,{TextEncoder,JSON,Date,Map,Object,Array,String,Number,Error});
class Storage{constructor(data={}){this.data={...data}}getItem(k){return this.data[k]??null}setItem(k,v){this.data[k]=String(v)}removeItem(k){delete this.data[k]}}
const settings={n:'虛構測試員',e:'TEST01',p:['TEST01'],pm:[{code:'TEST01',note:'測試專案'}],cp:[{c:'測試客戶',s:['一廠']}],lastDocumentWork:'測試計畫'};
const rec=(id,date,extra={})=>({id,date,projectId:'TEST01',employeeId:'TEST01',status:'draft',...extra});
const records=[rec('1','2026-09-01',{documentWork:'測試計畫',workTemplateName:'辦公室／文書作業'}),rec('2','2026-09-02',{documentWork:'測試計畫'}),rec('3','2026-09-03',{documentWork:'測試計畫',nightOvertime:true,primaryDefect:{category:'高架',vendor:'測試商'}}),rec('4','2026-07-01'),rec('5','2026-10-01')];
const store=new Storage({[A.rk]:JSON.stringify(records),[A.k]:JSON.stringify(settings),'unrelated':'keep'}),snapshot=JSON.stringify(store.data),backup=api.muCreateBackup(store);
const incoming=JSON.parse(JSON.stringify(backup));incoming.appVersion='V1.50 RC8.5 試作版';incoming.data[A.k].cp[0].s.push('二廠');
const merged=api.muPlanRestore(incoming,{[A.rk]:records,[A.k]:settings},'merge');
assert.deepStrictEqual(JSON.parse(JSON.stringify(merged.data[A.k].cp[0].s)),['一廠','二廠'],'Same-client merge must retain existing and incoming sites');
assert.strictEqual(JSON.stringify(store.data),snapshot);
const restored=new Storage({'unrelated':'keep'});api.muRestoreBackup(incoming,'overwrite',restored);assert.strictEqual(restored.getItem('unrelated'),'keep');assert.deepStrictEqual(JSON.parse(restored.getItem(A.rk)),records);api.muRestoreBackup(incoming,'merge',restored);assert.strictEqual(JSON.parse(restored.getItem(A.rk)).length,5);
for(const bad of ['{',JSON.stringify({...backup,recordCount:99})]){const before=JSON.stringify(restored.data);assert.throws(()=>api.muRestoreBackup(bad,'overwrite',restored));assert.strictEqual(JSON.stringify(restored.data),before)}
class FailingStorage extends Storage{setItem(k,v){if(!this.failed&&k===A.k){this.failed=true;throw Error('quota')}super.setItem(k,v)}}
const failed=new FailingStorage(store.data),before=JSON.stringify(failed.data);assert.throws(()=>api.muRestoreBackup(backup,'overwrite',failed),/已回復/);assert.strictEqual(JSON.stringify(failed.data),before);
assert.strictEqual(api.filterRecords(records,{startDate:'2026-09-01',endDate:'2026-09-30',defect:'yes',overtime:'yes'}).length,1);
assert.strictEqual(api.buildStatistics(records,'2026-09').selected.length,3);
for(const [kind,count] of [['month',3],['quarter',4]]){const result=api.buildXlsxReport(records,kind,'2026-09');assert.strictEqual(result.data.selected.length,count);assert.strictEqual(String.fromCharCode(...result.bytes.slice(0,2)),'PK');fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/rc8.6-${kind}.xlsx`,result.bytes);const summary=JSON.stringify(api.reportSummaryRows(result.data));assert(summary.includes('測試計畫')&&summary.includes('3 個工作日'));assert(JSON.stringify(api.reportDetailRows(result.data)).includes('文書作業內容'))}
assert.strictEqual(JSON.stringify(store.data),snapshot);
console.log('RC8.6 CURRENT SOURCE runtime PASS: same-client sites, RC8.5 JSON roundtrip/merge/idempotence/rollback/invalid inputs, filters, statistics, monthly/quarterly OOXML and 3-day document aggregation.');

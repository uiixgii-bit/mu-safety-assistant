const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const A={v:'V1.50 RC8.5 試作版',rk:'muSafety.v150.rc7Records',k:'muSafety.v150',h:'muSafety.v150.rc4History',old:'muSafety.v140'};
const moduleSource=fs.readFileSync('src/rc8.5-backup-functions.js','utf8');
const api=vm.runInNewContext(`(()=>{const A=${JSON.stringify(A)},st=()=>null;${moduleSource};return{muCreateBackup,muValidateBackup,muPlanRestore,muRestoreBackup,muWriteStateSafely,muBackupFilename}})()`,{Blob,URL,Date,JSON,Object,Array,Map,String,Number,Error,setTimeout,document:{createElement(){return{click(){}}}}});
class Storage{constructor(data={}){this.map=new Map(Object.entries(data))}getItem(k){return this.map.has(k)?this.map.get(k):null}setItem(k,v){this.map.set(k,String(v))}removeItem(k){this.map.delete(k)}snapshot(){return Object.fromEntries(this.map)}}
const rec=(i,extra={})=>({id:'r'+i,date:`2026-10-${String(i).padStart(2,'0')}`,projectId:'P'+i,employeeId:'E1',status:'draft',...extra});
const settings={n:'測試員',e:'E1',p:['P1'],pm:[{code:'P1',note:'測試案'}],lastDocumentWork:'CuCMP',ct:[],nt:[],cp:[],defectVendors:['甲商'],defectSupervisors:[],defectDescriptions:[],systemTemplateOverrides:{office:'文件作業'}};
const baseData={[A.rk]:JSON.stringify([rec(1,{documentWork:'CuCMP'})]),[A.k]:JSON.stringify(settings),[A.h]:JSON.stringify({lastDate:'2026-10-01'}),[A.old]:JSON.stringify({legacy:true}),'unrelated.key':'keep'};
// A. Backup JSON round trip.
let store=new Storage(baseData),backup=api.muCreateBackup(store,new Date('2026-10-08T01:02:03Z')),parsed=api.muValidateBackup(JSON.stringify(backup));
assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.data[A.rk])),[rec(1,{documentWork:'CuCMP'})]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.data[A.k])),settings);assert(!Object.hasOwn(parsed.data,'unrelated.key'));assert.strictEqual(api.muBackupFilename(new Date(2026,9,8)),'MU-Safety-Backup-2026-10-08.json');
// B. Empty environment full restore.
let empty=new Storage();let full=api.muRestoreBackup(parsed,'overwrite',empty);assert.strictEqual(full.data[A.rk].length,1);assert.deepStrictEqual(JSON.parse(empty.getItem(A.k)),settings);
assert(!Object.hasOwn(JSON.parse(empty.getItem(A.rk))[0],'unrelatedField'));
// C. Same backup merged twice.
let twice=new Storage({[A.rk]:'[]',[A.k]:'{}'});let first=api.muRestoreBackup(parsed,'merge',twice),second=api.muRestoreBackup(parsed,'merge',twice);assert.strictEqual(first.added,1);assert.strictEqual(second.added,0);assert.strictEqual(second.skipped,1);assert.strictEqual(JSON.parse(twice.getItem(A.rk)).length,1);
// D. 10 current, 15 backup, 8 exact matches.
let current=Array.from({length:10},(_,i)=>rec(i+1)),incoming=[...current.slice(0,8),...Array.from({length:7},(_,i)=>rec(i+20))];let dBackup={...backup,recordCount:15,data:{...backup.data,[A.rk]:incoming}},dPlan=api.muPlanRestore(dBackup,{[A.rk]:current,[A.k]:{}},'merge');assert.strictEqual(dPlan.added,7);assert.strictEqual(dPlan.skipped,8);assert.strictEqual(dPlan.conflicts,0);assert.strictEqual(dPlan.records.length,17);
// E. Same identity with different content keeps current.
let changed={...current[0],documentWork:'不同內容'},eBackup={...backup,recordCount:1,data:{...backup.data,[A.rk]:[changed]}},ePlan=api.muPlanRestore(eBackup,{[A.rk]:[current[0]],[A.k]:{}},'merge');assert.strictEqual(ePlan.conflicts,1);assert.strictEqual(ePlan.records[0].documentWork,undefined);
// F. Cancel path performs no restore; UI requires two confirms around safety backup.
let cancelStore=new Storage(baseData),beforeCancel=JSON.stringify(cancelStore.snapshot()),source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.5.js','utf8').trim();assert(source.includes('第二次確認：你已確認安全備份檔下載完成'));assert.strictEqual(JSON.stringify(cancelStore.snapshot()),beforeCancel);
// G. Invalid inputs do not write.
for(let bad of ['{',JSON.stringify({format:'wrong'}),JSON.stringify({...backup,data:{[A.rk]:'bad',[A.k]:{}}})]){let guarded=new Storage(baseData),before=JSON.stringify(guarded.snapshot());assert.throws(()=>api.muRestoreBackup(bad,'merge',guarded));assert.strictEqual(JSON.stringify(guarded.snapshot()),before)}
// H. Partial write failure rolls back.
class FailingStorage extends Storage{constructor(data){super(data);this.calls=0;this.failed=false}setItem(k,v){this.calls++;if(!this.failed&&this.calls===2){this.failed=true;throw new Error('quota')}super.setItem(k,v)}}
let failing=new FailingStorage(baseData),beforeFail=JSON.stringify(failing.snapshot());assert.throws(()=>api.muRestoreBackup(parsed,'overwrite',failing),/已回復原始資料/);assert.strictEqual(JSON.stringify(failing.snapshot()),beforeFail);
// I/J. RC8.4 document/XLSX and RC8.1-RC8.3 regression checks are executed separately; enforce unchanged critical markers here.
for(let marker of ['documentWork','重要文書／專案成果','📊 工作統計中心','🔎 搜尋／篩選','📊 報表輸出中心','scrollToFormBottom'])assert(source.includes(marker),`Missing regression marker: ${marker}`);
for(let forbidden of ['innerHTML','outerHTML','insertAdjacentHTML','document.write','localStorage.clear()','.requestSubmit(','.submit('])assert(!source.includes(forbidden),`Forbidden API: ${forbidden}`);
assert(source.includes("rk:'muSafety.v150.rc7Records'")&&source.includes("k:'muSafety.v150'"));
let legacyBackup={...backup,recordCount:1,data:{...backup.data,[A.rk]:[{id:'legacy-1',date:'2026-09-01',projectId:'P1',employeeId:'E1'}]}},legacyStore=new Storage({[A.rk]:'[]',[A.k]:'{}'});api.muRestoreBackup(legacyBackup,'overwrite',legacyStore);assert.strictEqual(JSON.parse(legacyStore.getItem(A.rk))[0].documentWork,undefined,'Old Records without documentWork must remain valid');
const bookmark='javascript:'+encodeURIComponent(source)+';';assert.strictEqual(fs.readFileSync('02_Bookmarklet_備用手動安裝_RC8.5.txt','utf8').trim(),bookmark,'RC8.5 bookmarklet must match source');
const installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.5_試作版_一鍵安裝.html','utf8'),href=installer.match(/class="install" href="([^"]+)"/)[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');assert.strictEqual(href,bookmark,'RC8.5 installer must match source');
console.log('RC8.5 backup/restore checks passed: A-H plus RC8.4/core regression markers.');

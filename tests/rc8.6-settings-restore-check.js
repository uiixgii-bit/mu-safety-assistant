const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

// RC8.6 專項隔離測試：合併還原保留目前單一設定值；完整覆蓋才使用備份設定。
// 全程使用純記憶體物件，不連接瀏覽器 localStorage，也不讀取正式 Records。
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.6.js','utf8');
const start=source.indexOf('const MU_BACKUP_FORMAT=');
const end=source.indexOf('function muBackupSettingsSection',start);
assert(start>=0&&end>start,'Backup/restore helper section must exist in RC8.6 source');
const helperSource=source.slice(start,end);
const A={v:'V1.50 RC8.6 試作版',rk:'muSafety.v150.rc7Records',k:'muSafety.v150',h:'muSafety.v150.rc4History',old:'muSafety.v140'};
const api=vm.runInNewContext(`(()=>{const A=${JSON.stringify(A)},st=()=>null;${helperSource};return{muPlanRestore,muValidateBackup}})()`,{JSON,Date,Object,Array,Map,String,Number,Error});

const currentSettings={
  n:'目前姓名',e:'NOW001',s:true,w:'目前工作設定',dw:'目前模板',
  a:'目前預設A',b:'目前預設B',g:'目前預設G',lp:'目前案號',
  lf:'目前客戶 → 目前廠區',lastDocumentWork:'目前文書工作',dnt:'目前夜間模板',
  p:['CUR001'],pm:[{code:'CUR001',note:'目前備註'}],
  cp:[{c:'目前客戶',s:['目前廠區']}],ct:[],nt:[],
  defectVendors:['目前廠商'],defectSupervisors:[],defectDescriptions:[],
  systemTemplateOverrides:{office:'目前自訂範本'},no:false
};
const backupSettings={
  n:'備份姓名',e:'BACKUP002',s:false,w:'備份工作設定',dw:'備份模板',
  a:'備份預設A',b:'備份預設B',g:'備份預設G',lp:'備份案號',
  lf:'備份客戶 → 備份廠區',lastDocumentWork:'備份文書工作',dnt:'備份夜間模板',
  p:['BACK001'],pm:[{code:'BACK001',note:'備份備註'}],
  cp:[{c:'備份客戶',s:['備份廠區']}],ct:[],nt:[],
  defectVendors:['備份廠商'],defectSupervisors:[],defectDescriptions:[],
  systemTemplateOverrides:{office:'備份自訂範本'},no:true
};
const backup={
  format:'mu-safety-assistant-backup',formatVersion:1,appVersion:'V1.50 RC8.6 試作版',
  createdAt:'2026-10-16T00:00:00.000Z',recordCount:0,
  data:{[A.rk]:[],[A.k]:backupSettings}
};
const currentData={[A.rk]:[],[A.k]:currentSettings};
const merged=api.muPlanRestore(backup,currentData,'merge');
for(const key of ['n','e','s','w','dw','a','b','g','lp','lf','lastDocumentWork','dnt','no']){
  assert.strictEqual(merged.data[A.k][key],currentSettings[key],`Merge must preserve current scalar setting: ${key}`);
}
assert(merged.data[A.k].p.includes('CUR001')&&merged.data[A.k].p.includes('BACK001'),'Merge should retain current project and add backup project');
assert(merged.data[A.k].cp.some(x=>x.c==='目前客戶')&&merged.data[A.k].cp.some(x=>x.c==='備份客戶'),'Merge should retain current customer/site and add backup customer/site');
assert(merged.data[A.k].defectVendors.includes('目前廠商')&&merged.data[A.k].defectVendors.includes('備份廠商'),'Merge should combine vendor lists');
assert.strictEqual(merged.data[A.k].systemTemplateOverrides.office,'目前自訂範本','Merge should preserve conflicting current template override');
assert(merged.settingsConflicts>=1,'Conflicting custom template should be reported');
assert.strictEqual(currentData[A.k].n,'目前姓名','Merge plan must not mutate current input');

const overwritten=api.muPlanRestore(backup,currentData,'overwrite');
assert.strictEqual(overwritten.data[A.k].n,'備份姓名','Overwrite should use backup scalar settings');
assert.strictEqual(overwritten.data[A.k].e,'BACKUP002','Overwrite should use backup employee ID');
assert.deepStrictEqual(JSON.parse(JSON.stringify(overwritten.data[A.k].p)),['BACK001'],'Overwrite should replace current project list with backup list');
console.log('RC8.6 settings restore isolation checks passed: merge preserves current scalar settings and combines lists; overwrite restores backup settings.');

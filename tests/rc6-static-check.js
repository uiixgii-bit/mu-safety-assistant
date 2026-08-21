const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/mu-safety-assistant-v1.50-rc6.js', 'utf8');
new vm.Script(source);
const expected = [
  ['general','一般駐廠工安','參加施工前工具箱會議，執行現場安全衛生巡檢、PIP安全檢查、施工安全巡查及承攬商作業安全管理。'],
  ['followup','駐廠工安＋缺失追蹤','執行日常駐廠工安管理及現場安全巡檢，追蹤工安缺失改善情形並進行複查確認。'],
  ['training','駐廠工安＋教育訓練','執行日常駐廠工安管理及現場安全巡檢，並辦理或參加安全衛生教育訓練及安全宣導。'],
  ['paperwork','駐廠工安＋文書作業','執行日常駐廠工安管理及現場安全巡檢，並辦理工安文件、表單及相關資料整理。'],
  ['supervisor','作業主管','擔任現場作業主管，執行作業前安全確認、作業監督及相關安全管理。'],
  ['support','工安支援','協助現場安全衛生巡檢、施工安全確認及工安管理。'],
  ['office','辦公室文書／入場作業','辦理工安相關文件及表單作業、資料彙整、協助廠商人員辦證、教育訓練資料確認、入場資格及權限申請等相關行政作業。'],
  ['plan','防護計畫製作／修訂','製作、修訂及整理施工安全、局限空間等相關防護計畫及安全文件。'],
  ['submission','工程送審資料','整理、檢查及修訂工程安全衛生送審資料與相關附件。'],
];
const match = source.match(/WT=(\[.*?\]),P=\[/s);
if (!match) throw new Error('Unable to locate built-in template library');
const actual = vm.runInNewContext(match[1]);
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('The nine built-in template IDs, names, order, or full text do not match the RC6 specification');
const compatibility = {site:'general',toolbox:'general',pip:'general',patrol:'general',contractor:'general',training:'training',followup:'followup',documents:'office',plan:'plan',submission:'submission'};
const normalizerMatch = source.match(/function workDefaultId\(id\)\{.*?\}(?=\nfunction workLocation)/s);
if (!normalizerMatch) throw new Error('Unable to locate legacy default-ID compatibility function');
const normalize = vm.runInNewContext(`const WT=${match[1]}; (${normalizerMatch[0].replace('function workDefaultId', 'function')})`);
for (const [oldId,newId] of Object.entries(compatibility)) if (normalize(`system:${oldId}`) !== `system:${newId}`) throw new Error(`Legacy default system:${oldId} did not map to system:${newId}`);
if (normalize('') !== 'system:general' || normalize('system:unknown') !== 'system:general') throw new Error('Missing/unknown system defaults must fall back to general');
if (normalize('custom:kept') !== 'custom:kept') throw new Error('Custom template default IDs must be preserved');
const locationMatch = source.match(/function workLocation\(id\)\{.*?\}(?=\nfunction allWorkTemplates)/s);
if (!locationMatch) throw new Error('Unable to locate work-template location mapping');
const locationFor = vm.runInNewContext(`(${locationMatch[0].replace('function workLocation', 'function')})`);
for (const id of ['general','followup','training','paperwork','supervisor','support']) if (locationFor(`system:${id}`) !== 'site') throw new Error(`${id} must select the current site option`);
for (const id of ['office','plan','submission']) if (locationFor(`system:${id}`) !== 'office') throw new Error(`${id} must select the office option`);
for (const id of ['custom:kept','', 'unknown']) if (locationFor(id) !== null) throw new Error(`${id || 'empty'} must not change question 7`);
for (const marker of ["c(['7','今天駐廠地點'],placeOptions)", "['今日在','辦公室','未進入客戶廠區']", "workPlace=Array.isArray(chosen)?workLocation(chosen[0]):null"]) if (!source.includes(marker)) throw new Error(`Missing question-7 linkage marker: ${marker}`);
for (const marker of ["dw:'system:general'", 'workDefaultId', "site:'general'", "documents:'office'", 'draft.ct=workTemplates', 'draft.dw=defaultWork', "['11-3','11-4']", 'attempt<3', "removeItem(A.k)"]) if (!source.includes(marker)) throw new Error(`Missing compatibility/regression marker: ${marker}`);
console.log(`RC6 static checks passed (${expected.length} exact built-in templates, legacy-ID compatibility, question-7 linkage, and RC5 regression markers).`);

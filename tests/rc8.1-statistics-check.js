const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'mu-safety-assistant-v1.50-rc8.1.js');
const installerPath = path.join(root, '01_MU_Safety_Assistant_V1.50_RC8.1_一鍵安裝.html');
const bookmarkletPath = path.join(root, '02_Bookmarklet_備用手動安裝_RC8.1.txt');

const source = fs.readFileSync(sourcePath, 'utf8');
const installer = fs.readFileSync(installerPath, 'utf8');
const bookmarklet = fs.readFileSync(bookmarkletPath, 'utf8').trim();

function includesAll(haystack, needles, label) {
  for (const needle of needles) {
    assert(haystack.includes(needle), `${label} should contain: ${needle}`);
  }
}

assert(source.includes("v:'V1.50 RC8.1'"), 'RC8.1 version marker missing');
assert(source.includes("rk:'muSafety.v150.rc7Records'"), 'must reuse RC7 records key');

includesAll(source, [
  '📊 工作統計中心',
  '本月',
  '上月',
  "monthInput.type='month'",
  'primaryDefect',
  'secondaryDefect',
  'nightOvertime',
  'nightOvertimeContent',
  'projectId'
], 'source');

for (const token of [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  '.submit(',
  'requestSubmit('
]) {
  assert(!source.includes(token), `forbidden API found: ${token}`);
}

assert(!source.includes('muSafety.v150.rc8Records'), 'must not create RC8 records DB');
assert(!source.includes('muSafety.v150.rc8.1Records'), 'must not create RC8.1 records DB');

const encoded = 'javascript:' + encodeURIComponent(source) + ';';
assert.strictEqual(bookmarklet, encoded, 'bookmarklet/source mismatch');

const hrefMatch = installer.match(/href="(javascript:[^"]+)"/);
assert(hrefMatch, 'installer bookmarklet href not found');
const htmlDecoded = hrefMatch[1]
  .replace(/&#x27;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');
const installerSource = decodeURIComponent(htmlDecoded.slice('javascript:'.length));
assert.strictEqual(installerSource, source + ';', 'installer/source mismatch');

includesAll(installer, [
  'MU Safety Assistant V1.50 RC8.1',
  '📊 工作統計中心',
  'muSafety.v150.rc7Records',
  '恢復原廠設定'
], 'installer');

function normalizeDefects(record) {
  const defects = [];
  if (record.primaryDefect) defects.push(record.primaryDefect);
  if (record.secondaryDefect) defects.push(record.secondaryDefect);
  if (!record.primaryDefect && !record.secondaryDefect && record.hasDefect) {
    defects.push({
      nature: record.defectType || '',
      vendor: record.defectVendor || '',
      workerCount: record.defectWorkerCount || '',
      supervisor: record.defectSupervisor || '',
      category: record.defectCategory || record.defectType || '',
      description: record.defectDescription || ''
    });
  }
  return defects;
}

assert.strictEqual(normalizeDefects({
  primaryDefect: { category: '(1)高架' },
  secondaryDefect: null
}).length, 1);

assert.strictEqual(normalizeDefects({
  primaryDefect: { category: '(1)高架' },
  secondaryDefect: { category: '(2)施工架' }
}).length, 2);

assert.strictEqual(normalizeDefects({
  hasDefect: true,
  defectType: '(1)高架',
  defectVendor: '測試廠商',
  defectDescription: '測試缺失'
}).length, 1);

assert.strictEqual(normalizeDefects({ hasDefect: false }).length, 0);

const records = [
  { date: '2026-09-01', projectId: 'P1', workTemplateName: '一般駐廠工安', workLocation: '在上述廠區' },
  { date: '2026-09-01', projectId: 'P2', workTemplateName: '自訂範本', workLocation: '辦公室' },
  { date: '2026-09-02', projectId: 'P1', workTemplateName: '一般駐廠工安', workLocation: '在上述廠區', nightOvertime: true, nightOvertimeContent: 'PIP教育訓練' }
];

assert.strictEqual(new Set(records.map(r => r.date)).size, 2);
assert.strictEqual(records.length, 3);

const templates = records.reduce((acc, r) => {
  const key = r.workTemplateName || '未指定';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
assert.strictEqual(templates['一般駐廠工安'], 2);
assert.strictEqual(templates['自訂範本'], 1);

assert.strictEqual(new Set(records.filter(r => r.nightOvertime).map(r => r.date)).size, 1);
assert.strictEqual(records.filter(r => r.date.startsWith('2026-07')).length, 0);

console.log('RC8.1 statistics checks passed');

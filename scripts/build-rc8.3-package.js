const fs=require('fs');

const sourcePath='src/mu-safety-assistant-v1.50-rc8.3.js';
const backupPath='02_Bookmarklet_備用手動安裝_RC8.3.txt';
const installerPath='01_MU_Safety_Assistant_V1.50_RC8.3_一鍵安裝.html';
const source=fs.readFileSync(sourcePath,'utf8');
const bookmark='javascript:'+encodeURIComponent(source)+';';
fs.writeFileSync(backupPath,bookmark+'\n');
const escaped=bookmark.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
const installer=fs.readFileSync(installerPath,'utf8');
if(!/<a class="install" href="[^"]+"[^>]*>/.test(installer))throw new Error('RC8.3 installer bookmark link was not found');
const updated=installer
  .replace(/(<a class="install" href=")[^"]+("[^>]*>)/,`$1${escaped}$2`)
  .replace(/MU Safety Assistant V1\.50 RC8\.3(?: XLSX Hotfix 2)?<\/h1>/,'MU Safety Assistant V1.50 RC8.3 XLSX Hotfix 3</h1>')
  .replace(/>MU Safety V1\.50 RC8\.3(?: XLSX Hotfix 2)?<\/a>/,'>MU Safety V1.50 RC8.3 XLSX Hotfix 3</a>')
  .replace(/<div class="note">[\s\S]*?<\/div>/,'<div class="note"><b>RC8.3 XLSX Hotfix 3：</b><br>• 請先刪除舊 RC8.3 書籤，再拖曳本頁的新書籤。<br>• 右側主選單直接包含「📊 工作統計中心」與獨立的「📊 報表輸出中心」。<br>• 工作統計中心只保留 RC8.1 統計功能；月報與季報只從報表輸出中心匯出。<br>• 報表為真正 ZIP/OOXML .xlsx，包含「統計摘要」與「工作明細」。<br>• 不修改 Records schema、不上傳資料、不自動提交 Google Form。</div>');
fs.writeFileSync(installerPath,updated);

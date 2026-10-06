const fs=require('fs');

const sourcePath='src/mu-safety-assistant-v1.50-rc8.4.js';
const backupPath='02_Bookmarklet_備用手動安裝_RC8.4.txt';
const installerPath='01_MU_Safety_Assistant_V1.50_RC8.4_試作版_一鍵安裝.html';
const source=fs.readFileSync(sourcePath,'utf8');
const bookmark='javascript:'+encodeURIComponent(source)+';';
fs.writeFileSync(backupPath,bookmark+'\n');
const escaped=bookmark.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
const installer=fs.readFileSync(installerPath,'utf8');
if(!/<a class="install" href="[^"]+"[^>]*>/.test(installer))throw new Error('RC8.4 installer bookmark link was not found');
const updated=installer
  .replace(/<title>MU Safety Assistant V1\.50 RC8\.3 一鍵安裝<\/title>/,'<title>MU Safety Assistant V1.50 RC8.4 試作版 一鍵安裝</title>')
  .replace(/(<a class="install" href=")[^"]+("[^>]*>)/,`$1${escaped}$2`)
  .replace(/MU Safety Assistant V1\.50 RC8\.3(?: XLSX Hotfix 3)?<\/h1>/,'MU Safety Assistant V1.50 RC8.4 試作版</h1>')
  .replace(/>MU Safety V1\.50 RC8\.3(?: XLSX Hotfix 3)?<\/a>/,'>MU Safety V1.50 RC8.4 試作版</a>')
  .replace(/<div class="note">[\s\S]*?<\/div>/,'<div class="note"><b>RC8.4 試作版：</b><br>• 4＝辦公室／文書作業；5＝工務所／文書作業。<br>• 選擇 4 或 5 時會詢問「今天主要做什麼文書作業？」並預帶上次內容。<br>• Google Form 只填工作情境名稱；詳細文書名稱只保存於 Records 與 Excel。<br>• .xlsx 工作明細新增「文書作業內容」，統計摘要新增「重要文書／專案成果」。<br>• 保留 RC8.3 全部既有功能，不自動提交 Google Form。</div>');
fs.writeFileSync(installerPath,updated);

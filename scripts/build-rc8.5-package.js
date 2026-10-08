const fs=require('fs');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.5.js','utf8').trim();
const bookmark='javascript:'+encodeURIComponent(source)+';';
fs.writeFileSync('02_Bookmarklet_備用手動安裝_RC8.5.txt',bookmark+'\n');
const escaped=bookmark.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
let installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.4_試作版_一鍵安裝.html','utf8');
installer=installer
 .replace(/<title>[^<]*<\/title>/,'<title>MU Safety Assistant V1.50 RC8.5 試作版 一鍵安裝</title>')
 .replace(/(<a class="install" href=")[^"]+("[^>]*>)/,`$1${escaped}$2`)
 .replace(/MU Safety Assistant V1\.50 RC8\.4 試作版<\/h1>/,'MU Safety Assistant V1.50 RC8.5 試作版</h1>')
 .replace(/>MU Safety V1\.50 RC8\.4 試作版<\/a>/,'>MU Safety V1.50 RC8.5 試作版</a>')
 .replace(/<div class="note">[\s\S]*?<\/div>/,'<div class="note"><b>RC8.5 試作版：</b><br>• 設定中心新增「資料備份／還原」。<br>• 可下載完整 JSON 備份，並使用合併還原或進階完整覆蓋還原。<br>• 還原會先驗證檔案並顯示結果摘要；完整覆蓋前會先下載安全備份並二次確認。<br>• 資料只在瀏覽器處理，不會上傳；保留 RC8.1～RC8.4 全部正式功能。</div>');
fs.writeFileSync('01_MU_Safety_Assistant_V1.50_RC8.5_試作版_一鍵安裝.html',installer);

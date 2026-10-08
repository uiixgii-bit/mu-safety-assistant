const fs=require('fs');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.6.js','utf8').trim();
const bookmark='javascript:'+encodeURIComponent(source)+';';
fs.writeFileSync('02_Bookmarklet_備用手動安裝_RC8.6.txt',bookmark+'\n');
const escaped=bookmark.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
let installer=fs.readFileSync('01_MU_Safety_Assistant_V1.50_RC8.5_試作版_一鍵安裝.html','utf8');
installer=installer
 .replace(/<title>[^<]*<\/title>/,'<title>MU Safety Assistant V1.50 RC8.6 試作版 一鍵安裝</title>')
 .replace(/(<a class="install" href=")[^"]+("[^>]*>)/,`$1${escaped}$2`)
 .replace(/MU Safety Assistant V1\.50 RC8\.5 試作版<\/h1>/,'MU Safety Assistant V1.50 RC8.6 試作版</h1>')
 .replace(/>MU Safety V1\.50 RC8\.5 試作版<\/a>/,'>MU Safety V1.50 RC8.6 試作版</a>')
 .replace(/<div class="note">[\s\S]*?<\/div>/,'<div class="note"><b>RC8.6 多人使用前整備試作版：</b><br>• 新安裝不再內建原開發者的客戶、廠區或案號。<br>• 首次使用引導設定姓名與員工編號；客戶、廠區、案號可稍後補充。<br>• 已有 RC8.5 設定及 Records 完整保留，不會重新進入首次設定。<br>• 不含帳號或雲端同步；共用同一瀏覽器設定檔時，資料仍會共用。</div>');
fs.writeFileSync('01_MU_Safety_Assistant_V1.50_RC8.6_試作版_一鍵安裝.html',installer);

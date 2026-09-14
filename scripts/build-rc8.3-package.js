const fs=require('fs');

const sourcePath='src/mu-safety-assistant-v1.50-rc8.3.js';
const backupPath='02_Bookmarklet_備用手動安裝_RC8.3.txt';
const installerPath='01_MU_Safety_Assistant_V1.50_RC8.3_一鍵安裝.html';
const source=fs.readFileSync(sourcePath,'utf8');
const bookmark='javascript:'+encodeURIComponent(source)+';';
fs.writeFileSync(backupPath,bookmark+'\n');
const escaped=bookmark.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
const installer=fs.readFileSync(installerPath,'utf8');
const updated=installer.replace(/(<a class="install" href=")[^"]+("[^>]*>)/,`$1${escaped}$2`);
if(updated===installer)throw new Error('RC8.3 installer bookmark link was not found');
fs.writeFileSync(installerPath,updated);

const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync('src/mu-safety-assistant-v1.50-rc8.6.js','utf8');
const panel='p.appendChild(reports);';
if(source.split(panel).length!==2) throw Error('RC8.6 report button anchor changed');
const code=source.replace("v:'V1.50 RC8.6 試作版'","v:'V1.50 RC8.7 驗收版'")
 .replace('function panel(o)',fs.readFileSync('src/rc8.7-bookmarklet-export.js','utf8')+'\nfunction panel(o)')
 .replace(panel,panel+"let travel=btn('🚗 交通津貼與報銷中心',0);travel.style.cssText='width:100%;margin-top:8px';travel.onclick=e=>{e.preventDefault();e.stopPropagation();muTransportExport()};p.appendChild(travel);");
if(!code.includes('function muTransportExport()') || !code.includes("v:'V1.50 RC8.7 驗收版'")) throw Error('RC8.7 build anchors changed');
const folder=process.argv[2]??'dist-rc8.7';
fs.mkdirSync(folder,{recursive:true});
const link='javascript:'+encodeURIComponent(code.trim())+';';
fs.writeFileSync(path.join(folder,'02_RC8.7_備用書籤碼.txt'),link+'\n');
fs.writeFileSync(path.join(folder,'01_RC8.7_一鍵安裝.html'),'<!doctype html><html lang="zh-Hant"><meta charset="UTF-8"><title>MU Safety Assistant RC8.7 驗收版</title><main style="font:18px sans-serif;max-width:680px;margin:4rem auto"><h1>MU Safety Assistant RC8.7 驗收版</h1><p>將下方連結拖到 Chrome 書籤列。建議在獨立測試設定檔使用，並保留正式書籤。</p><a style="display:inline-block;padding:16px;background:#1565c0;color:white;border-radius:6px" href="'+link.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">MU Safety RC8.7 驗收版</a><p>開啟工安表單並點選新書籤。從交通津貼中心下載月份資料，再開啟 03_RC8.7_離線報銷中心.html。</p></main></html>');

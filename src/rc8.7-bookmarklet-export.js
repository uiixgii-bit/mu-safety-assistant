function muTransportExport() {
 document.getElementById('muTransportExport')?.remove();
 const dialog=document.createElement('dialog');
 dialog.id='muTransportExport';
 dialog.style.cssText='padding:24px;border:1px solid #aabcca;border-radius:10px;font:16px Arial,sans-serif;max-width:420px';
 const title=document.createElement('h2'); title.textContent='交通津貼與報銷中心';
 const guide=document.createElement('p'); guide.textContent='選擇月份並下載交通資料 JSON，再用 Chrome 開啟 RC8.7 離線報銷中心匯入。';
 const month=document.createElement('input'); month.type='month'; month.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,7);
 const result=document.createElement('p');
 const download=document.createElement('button'); download.type='button'; download.textContent='下載當月工作日誌 JSON';
 const close=document.createElement('button'); close.type='button'; close.textContent='關閉';
 close.onclick=()=>dialog.close();
 dialog.onclose=()=>dialog.remove();
 download.onclick=()=>{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)) {result.textContent='請選擇月份';return;}
  const {items,error}=readRecords();
  if(error) {result.textContent=error;return;}
  const records=items.filter(r=>String(r.date??'').startsWith(month.value+'-')).map(r=>{
   const selected={};
   for(const field of ['date','client','site','projectId','workLocation','workTemplateName','status']) selected[field]=String(r[field]??'');
   return selected;
  });
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,month:month.value,records})],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='MU-交通資料-'+month.value+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  result.textContent='已產生 '+records.length+' 筆工作日誌資料';
 };
 dialog.append(title,guide,month,download,close,result);document.body.append(dialog);dialog.showModal();
}

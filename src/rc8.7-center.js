(() => {
 const $=id=>document.getElementById(id);
 let logs=[], logMonth='', etc={rows:[],errors:['尚未匯入 ETC PDF']}, templateBytes, baseline={}, edits={}, rows=[];
 const removedDates=new Set();
 let busy=false;
 const rates=Object.create(null);
 try {Object.assign(rates,JSON.parse(localStorage.getItem('mu-transport-rc87-rates')??'{}'));} catch {}
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const report=(id,text)=>{$(id).textContent=text;};
 const download=(bytes,name)=>{
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const updateExportButtons=()=>{
  $('export-fuel').disabled=busy || !templateBytes || !rows.some(r=>r.claimFuel);
  $('export-etc').disabled=busy || !templateBytes || !rows.some(r=>r.claimEtc);
 };
 const invalidate=()=>{
  rows=[];$('review').replaceChildren();$('removed-days').replaceChildren();updateExportButtons();report('result','請重新產生試算。');
 };
 const reset=()=>{edits={};invalidate();};
 const load=(id,read)=>{
  $(id).onchange=async()=>{
   busy=true;reset();
   for(const input of ['logs','pdf','template','calculate']) $(input).disabled=true;
   const status=id==='template'?'template-status':'source';
   report(status,'正在讀取 '+($(id).files[0]?.name??'')+'…');
   try {report(status,await read($(id).files[0]));}
   catch(error){report(status,error.message||String(error));}
   finally {busy=false;for(const input of ['logs','pdf','template','calculate']) $(input).disabled=false;}
  };
 };
 load('logs',async file=>{
  removedDates.clear();
  logs=[];logMonth='';$('rates').replaceChildren();
  if(!file) return '未匯入工作日誌';
  const data=JSON.parse(await file.text());
  if(data?.version!==1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month) || !Array.isArray(data.records) || data.records.some(r=>!r || typeof r.date!=='string' || !r.date.startsWith(data.month+'-'))) throw Error('請匯入 RC8.7 下載的當月工作日誌 JSON');
  logs=data.records;logMonth=data.month;$('month').value=data.month;
  const sites=new Map(logs.filter(r=>r.site).map(r=>[MuTransport.key(r.client,r.site),[r.client,r.site].filter(Boolean).join('／')]));
  for(const [key,label] of sites){
   const line=node('label',label+'　'), input=node('input');input.type='number';input.min='0';input.step='0.01';input.value=rates[key]??'';
   input.oninput=()=>{rates[key]=input.value;try{localStorage.setItem('mu-transport-rc87-rates',JSON.stringify(rates));}catch{} reset();};
   line.append(input);$('rates').append(line);
  }
  return '工作日誌：'+logs.length+' 筆';
 });
 load('pdf',async file=>{
  etc={rows:[],errors:['遠通 PDF 無法辨識或尚未匯入']};
  if(!file) return etc.errors[0];
  const lib=await loadMuPdf();
  etc=await MuTransport.readPdf(lib,new Uint8Array(await file.arrayBuffer()));
  return '遠通：'+etc.rows.length+' 筆。'+etc.errors.join('；');
 });
 load('template',async file=>{
  templateBytes=undefined;baseline={};
  if(!file) return '未匯入 Excel 範本';
  const bytes=await file.arrayBuffer();
  baseline=await MuTransport.readBaseline(JSZip,bytes);templateBytes=bytes;
  return 'Excel 範本已讀取，可用同月舊資料核對地點。';
 });
 $('month').onchange=reset;
 function render(){
  if(busy) return;
  const month=$('month').value;
  if(month!==logMonth) throw Error('請先匯入所選月份的工作日誌 JSON');
  rows=MuTransport.calculate(month,logs,etc,rates,edits,baseline).filter(r=>!removedDates.has(r.date));
  const restoreButtons=[...removedDates].sort().map(date=>{
   const restore=node('button','復原 '+date);
   restore.onclick=()=>{removedDates.delete(date);render();report('message',date+' 已復原。');};
   return restore;
  });
  $('removed-days').replaceChildren(...restoreButtons);
  const sum=(claim,key)=>rows.reduce((n,r)=>n+(r[claim]?r[key]:0),0);
  report('result','油資入表 '+sum('claimFuel','fuel').toFixed(2)+' 元　ETC 入表 '+sum('claimEtc','etcAmount')+' 元　油資待確認 '+rows.filter(r=>r.fuelStatus==='待確認').length+' 天');
  updateExportButtons();
  const table=node('table'), head=node('tr');
  for(const name of ['日期','客戶／廠區','油資 km／元','ETC km／元','遠通實扣','核對狀態','確認／修正'])head.append(node('th',name));
  const thead=node('thead'), body=node('tbody');thead.append(head);table.append(thead,body);
  const display=(n,d=1)=>n===null?'—':String(n/d);
  for(const r of rows){
   const tr=node('tr');
   for(const value of [r.date,[r.final.client,r.final.site].filter(Boolean).join('／'),display(r.final.fuelKm,100)+'／'+display(r.fuel),display(r.final.etcKm,1000)+'／'+display(r.etcAmount),display(r.charge),[['油資',r.fuelStatus,r.fuelIssues],['ETC',r.claimEtc?r.etcStatus:etc.errors.length?'未入表':r.etcStatus,r.etcIssues]].map(([name,status,issues])=>name+' '+status+(issues.length?' · '+issues.join('、'):'')).join(' ／ ')]) tr.append(node('td',value));
   const td=node('td'), details=node('details'), fields={}, patch=edits[r.date]??{};
   details.append(node('summary','檢視或修改'));
   if(r.prior.length) details.append(node('p','舊報銷：'+r.prior.map(x=>x.description).join('；')));
   details.append(node('p','原工作日誌：'+r.logs.map(x=>[x.site,x.projectId,x.workLocation].filter(Boolean).join('／')).join('；')));
   const specs=[['client','客戶',r.final.client],['site','廠區',r.final.site],['projectId','工程案號',r.final.projectId],['fuelKm','油資公里',r.final.fuelKm===null?'':r.final.fuelKm/100],['etcKm','ETC 里程',r.final.etcKm===null?'':r.final.etcKm/1000],['note','人工核對理由',r.note]];
   for(const [field,label,value] of specs){
    const line=node('label',label), input=node('input');input.value=value;fields[field]={input,value};line.append(input);details.append(line);
   }
   const decision=node('select');
   for(const [value,label] of [['','維持試算'],['approve','確認列入'],['exclude','排除']]){const option=node('option',label);option.value=value;decision.append(option);}
   decision.value=patch.decision??'';
   const save=node('button','套用本日核對');
   save.onclick=()=>{
    const note=fields.note.input.value.trim(), next={...patch,note,decision:decision.value};
    for(const [field,{input,value}] of Object.entries(fields)) if(field!=='note' && input.value!==String(value)) next[field]=input.value;
    if((decision.value || Object.keys(next).some(k=>k!=='note' && k!=='decision')) && !note) {report('message','請填寫核對理由。');return;}
    edits[r.date]=next;render();report('message',r.date+' 核對已套用。');
   };
   const remove=node('button','刪除此日');
   remove.onclick=()=>{
    if(!window.confirm('將 '+r.date+' 從本次報銷與核對明細移除？原工作日誌會保留。')) return;
    removedDates.add(r.date);render();report('message',r.date+' 已從本次報銷移除。');
   };
   details.append(decision,save,remove);td.append(details);tr.append(td);body.append(tr);
  }
  $('review').replaceChildren(table);
 }
 $('calculate').onclick=()=>{try{render();report('message',etc.errors.join('；'));}catch(error){report('message',error.message);}};
 for(const [mode,label] of [['fuel','油資'],['etc','ETC']]) $('export-'+mode).onclick=async()=>{
  $('export-'+mode).disabled=true;
  const month=$('month').value;
  try{
   download(await MuTransport.workbook(JSZip,templateBytes,month,rows,etc.errors,mode),'MU-'+label+'報銷-'+month+'-驗收.xlsx');
   report('message','已匯出 '+label+'。請核對「核對明細」並依公司流程簽核。');
  }catch(error){report('message',error.message);}
  finally{updateExportButtons();}
 };
})();

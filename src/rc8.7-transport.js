/* Shared, offline calculation and workbook export for the RC8.7 companion. */
const MuTransport = (() => {
 const clean = value => String(value ?? '').trim();
 const iso = value => {
  const m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(clean(value));
  if (!m) return '';
  const date = m.slice(1).join('-');
  const t = new Date(date + 'T00:00:00Z');
  return Number.isFinite(+t) && t.toISOString().slice(0,10) === date ? date : '';
 };
 const units = (value, places) => {
  const m = /^(\d{1,7})(?:\.(\d+))?$/.exec(clean(value));
  if (!m || (m[2]?.length ?? 0) > places) return null;
  return Number(m[1]) * 10 ** places + Number((m[2] ?? '').padEnd(places,'0'));
 };
 const key = (client, site) => JSON.stringify([clean(client),clean(site)]);
 function parseEtc(pages) {
  const rows = [], errors = [], pageNumbers = [];
  for (const [index, page] of pages.entries()) {
   const marker = page.trim().split('\n').map(s=>/^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(s)).find(Boolean);
   if (marker) pageNumbers.push([Number(marker[1]), Number(marker[2])]);
   let found = 0;
   for (const line of page.split('\n')) {
    const normalized = line.normalize('NFKC').trim();
    if (!/^\d{4}[/-]\d/.test(normalized)) continue;
    const m = /^(\d{4}[/-]\d{2}[/-]\d{2})\s+(\d+(?:\.\d+)?)\s*公里\s+(\d+(?:\.\d+)?)\s*元(?:\s|$)/.exec(normalized);
    const date = m && iso(m[1]), distance = m && units(m[2],3), charge = m && units(m[3],2);
    if (!date || distance === null || charge === null) { errors.push('第 '+(index+1)+' 頁有無法辨識的通行列'); continue; }
    const posted=/已於|已扣款/.test(normalized) && !/未扣款|尚未扣款/.test(normalized);
    rows.push({date,distance,charge:posted?charge:null,toll:charge,page:index+1,source:normalized});
    found++;
   }
   if (!found) errors.push('第 '+(index+1)+' 頁沒有可辨識的通行列');
  }
  if (!rows.length) errors.push('PDF 沒有可用的遠通通行資料');
  if (pageNumbers.length !== pages.length || pageNumbers.some(([n,total],i)=>n!==i+1 || total!==pages.length)) errors.push('無法確認遠通 PDF 頁次完整');
  return {rows,errors};
 }
 async function readPdf(pdfjs, bytes) {
  const task = pdfjs.getDocument({data:bytes, isEvalSupported:false, useSystemFonts:false, disableFontFace:true});
  try {
   const pdf = await task.promise, pages = [];
   for (let n=1;n<=pdf.numPages;n++) {
    const page = await pdf.getPage(n), content = await page.getTextContent(), lines = [];
    for (const item of content.items) {
     if (!item.str?.trim()) continue;
     const [, , , , x, y] = item.transform;
     let line = lines.find(l=>Math.abs(l.y-y)<2);
     if (!line) { line={y,items:[]}; lines.push(line); }
     line.items.push({x,text:item.str});
    }
    pages.push(lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n'));
   }
   return parseEtc(pages);
  } finally { await task.destroy(); }
 }
 function calculate(month, records, etc, rates, edits={}, baseline={}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('請選擇有效月份');
  const work = new Map(), travel = new Map();
  for (const [items,map] of [[records,work],[etc.rows,travel]]) {
   for (const item of items) {
    const date=iso(item.date);
    if (!date) throw Error('來源含有無效日期，請重新匯入');
    if (!date.startsWith(month+'-')) continue;
    if (!map.has(date)) map.set(date,[]);
    map.get(date).push(item);
   }
  }
  return [...new Set([...work.keys(),...travel.keys(),...Object.keys(baseline).filter(date=>date.startsWith(month+'-'))])].sort().map(date=>{
   const logs=work.get(date)??[], trips=travel.get(date)??[], first=logs[0]??{};
   const original={client:clean(first.client),site:clean(first.site),projectId:clean(first.projectId),
    fuelKm:units(rates[key(first.client,first.site)],2), etcKm:trips.length?trips.reduce((n,t)=>n+t.distance,0):null};
   const patch=edits[date]??{}, final={...original};
   for(const field of ['client','site','projectId']) if(field in patch) final[field]=clean(patch[field]);
   for(const [field,places] of [['fuelKm',2],['etcKm',3]]) if(field in patch) final[field]=units(patch[field],places);
   const commonIssues=[];
   if (!logs.length) commonIssues.push('無工作日誌／非工作日通行');
   const prior=baseline[date]??[];
   if (logs.length>1) commonIssues.push('同日多筆工作紀錄，僅產生一列');
   if (new Set(logs.map(l=>key(l.client,l.site))).size>1) commonIssues.push('跨廠支援');
   if (logs.some(l=>/休假|請假|非工作日|工務所|辦公室|文書/.test([l.status,l.workLocation,l.workTemplateName].join(' ')))) commonIssues.push('休假或非駐廠紀錄');
   if (!final.site || !final.projectId) commonIssues.push('缺少廠區或案號');
   const issueList=mode=>{
    const issues=[...commonIssues], old=prior.filter(entry=>!entry.mode || entry.mode===mode);
    if(logs.length && old.some(entry=>entry.site && !logs.some(log=>clean(log.site).includes(entry.site)))) issues.push('工作日誌與舊報銷地點不同');
    if(logs.length && old.some(entry=>entry.projectId && !logs.some(log=>clean(log.projectId)===entry.projectId))) issues.push('工作日誌與舊報銷案號不同');
    const kmField=mode==='fuel'?'fuelKm':'etcKm';
    if(['client','site','projectId',kmField].some(field=>original[field]!==final[field])) issues.push('人工修正');
    return issues;
   };
   const fuelIssues=issueList('fuel'), etcIssues=issueList('etc');
   if (final.fuelKm===null) fuelIssues.push('缺少有效核定油資公里數');
   if (trips.some(t=>t.charge===null)) etcIssues.push('通行費扣款狀態未確認');
   if (!trips.length) etcIssues.push('無 ETC 紀錄');
   if (trips.length>1) etcIssues.push('同日多筆 ETC，已先加總里程');
   if (etc.errors.length) etcIssues.push('ETC 來源待確認');
   if (final.etcKm===null && trips.length) etcIssues.push('缺少有效 ETC 里程');
   const note=clean(patch.note), approval=patch.decision==='approve' && !!note;
   const statusFor=issues=>patch.decision==='exclude'?'排除':issues.length?(approval?'人工確認':'待確認'):'可列入';
   const eligible=issues=>patch.decision!=='exclude' && !!final.site && !!final.projectId && (!issues.length || approval);
   const fuel=final.fuelKm===null?null:final.fuelKm*6/100;
   const etcAmount=final.etcKm===null?null:Math.floor((final.etcKm+500)/1000);
   const charge=trips.length && trips.every(t=>t.charge!==null)?trips.reduce((n,t)=>n+t.charge,0)/100:null;
   const issues=[...new Set([...fuelIssues,...etcIssues])];
   const changed=Object.keys(original).some(k=>original[k]!==final[k]);
   const claimFuel=eligible(fuelIssues) && fuel!==null;
   const claimEtc=eligible(etcIssues) && etcAmount!==null && trips.length>0 && !etc.errors.length;
   return {date,logs,trips,prior,original,final,issues,note,changed,fuel,etcAmount,charge,claimFuel,claimEtc,
    fuelIssues,etcIssues,fuelStatus:statusFor(fuelIssues),etcStatus:statusFor(etcIssues),status:statusFor(issues)};

  });
 }
 const xml = value => String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function cell(attrs, value) {
  attrs=attrs.replace(/\s+t="[^"]*"/g,'');
  if(value===null || value==='') return '<c'+attrs+'/>';
  if(typeof value==='number') return '<c'+attrs+'><v>'+value+'</v></c>';
  return '<c'+attrs+' t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
 }
 function patchForm(source, rows, last, mode) {
  if(rows.length>last-6) throw Error('範本僅有 '+(last-6)+' 個明細列，請分批匯出以保留公式與核簽區');
  let expected=0;
  const claimKm=r=>mode==='fuel'?r.final.fuelKm/100:r.etcAmount;
  const totals={
   D:rows.reduce((sum,r)=>sum+claimKm(r),0),
   F:rows.reduce((sum,r)=>sum+(mode==='fuel'?r.fuel:r.etcAmount),0)
  };
  totals.H=totals.F;
  return source.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(raw,number)=>{
   const n=Number(number);
   if(n<7 || n>last) return raw;
   expected++;
   const r=rows[n-7];
   const prior=r?.prior.find(p=>p.mode===mode && p.site && r.final.site.includes(p.site));
   const category=mode==='fuel'?'私車公用油資':'私車公用通行費';
   const site=r?.final.site.replace(/^(?:北區|中區|南區|東區)\s*[-－–—]\s*/,'');
   const description=prior?.description || (mode==='fuel'?category+'(南辦→'+site+'→南辦)':category+'（'+r?.final.site+'）');
   const values=r?[
    Math.round((Date.parse(r.date)-Date.UTC(1899,11,30))/86400000),r.final.projectId,
    description,claimKm(r),
    null,mode==='fuel'?r.fuel:r.etcAmount,0,mode==='fuel'?r.fuel:r.etcAmount,prior?.remark || (mode==='fuel'?'汽車/上下班':'汽車/上下班通行費')
   ]:Array(9).fill(null);
   const found=new Set();
   raw=raw.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,(full,attrs,body)=>{
    const match=/\br="([A-I])(\d+)"/.exec(attrs);
    if(!match || Number(match[2])!==n) return full;
    found.add(match[1]);
    if (/<f[\s/>]/.test(body??'')) return full.replace(/<v>[^<]*<\/v>/,'');
    return cell(attrs,values[match[1].charCodeAt(0)-65]);
   });
   const added=values.map((v,i)=>v!==null && !found.has(String.fromCharCode(65+i))?cell(' r="'+String.fromCharCode(65+i)+n+'"',v):'').join('');
   if (added) throw Error('報銷範本缺少必要儲存格，第 '+n+' 列');
   return raw;
  }).replace(/(<f(?:\s[^>]*)?>SUM\(([DFH])7:\2\d+\)<\/f>)(?:<v>[^<]*<\/v>)?/g,(_,formula,col)=>formula+'<v>'+totals[col]+'</v>').replace(/(?=<\/worksheet>)/,()=>{
   if(expected!==last-6) throw Error('範本明細列結構不符');
   return '';
  });
 }
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 function auditSheet(rows, month, errors) {
  const data=[['交通津貼核對明細',month],['來源問題',errors.join('；')],['油資核定公里 × 6；ETC 申報公里及金額依每日合計里程四捨五入；實際公里與實扣保留'],
   ['日期','原始客戶','原始廠區','原始案號','原始油資公里','原始 ETC 公里','實際扣款','確認客戶','確認廠區','確認案號','確認油資公里','確認 ETC 公里','試算油資','試算 ETC','入表油資','入表 ETC','狀態','異常','人工註記','工作日誌來源','遠通 PDF 來源','原報銷範本同日資料'],
   ...rows.map(r=>[r.date,r.original.client,r.original.site,r.original.projectId,r.original.fuelKm===null?null:r.original.fuelKm/100,r.original.etcKm===null?null:r.original.etcKm/1000,r.charge,r.final.client,r.final.site,r.final.projectId,r.final.fuelKm===null?null:r.final.fuelKm/100,r.final.etcKm===null?null:r.final.etcKm/1000,r.fuel,r.etcAmount,r.claimFuel?r.fuel:null,r.claimEtc?r.etcAmount:null,r.status,r.issues.join('；'),r.note,JSON.stringify(r.logs),r.trips.map(t=>'第 '+t.page+' 頁 '+t.source).join('；'),JSON.stringify(r.prior)])];
  return '<worksheet xmlns="'+ns+'"><cols><col min="1" max="17" width="18" customWidth="1"/><col min="18" max="22" width="36" customWidth="1"/></cols><sheetData>'+
   data.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>cell(' r="'+String.fromCharCode(65+j)+(i+1)+'"',v)).join('')+'</row>').join('')+'</sheetData></worksheet>';
 }
 async function template(JSZip, bytes) {
  const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});
  const read=async path=>{const file=zip.file(path);if(!file) throw Error('範本缺少 '+path);return file.async('string');};
  let book=await read('xl/workbook.xml'), rels=await read('xl/_rels/workbook.xml.rels'), types=await read('[Content_Types].xml');
  if(/\bdate1904="(?:1|true)"/.test(book)) throw Error('範本須使用 Excel 1900 日期系統');
  const sheets=[...book.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)];
  if(sheets.some(sheet=>sheet[1]==='核對明細')) throw Error('你選到已匯出的報銷檔。請改選公司原始報銷範本 XLSX。');
  if(sheets.length!==3 || !['各類報銷清單','各類報銷清單 (2)','通行費'].every(name=>sheets.some(s=>s[1]===name)) || !book.includes('</sheets>') || !rels.includes('</Relationships>') || !types.includes('</Types>')) throw Error('請使用相同版型的 10 月報銷 XLSX 範本');
  const forms=[];
  for(const [name,mode,last] of [['各類報銷清單','fuel',23],['各類報銷清單 (2)','unused',28],['通行費','etc',23]]) {
   const id=sheets.find(s=>s[1]===name)[2];
   const link=[...rels.matchAll(/<Relationship\b[^>]*\/>/g)].find(m=>m[0].includes('Id="'+id+'"'))?.[0];
   const target=link && /\bTarget="([^"]+)"/.exec(link)?.[1];
   if(!target || !/^(?:\/xl\/)?worksheets\/sheet\d+\.xml$/.test(target)) throw Error('範本工作表路徑無法辨識');
   const path=target.startsWith('/')?target.slice(1):'xl/'+target;
   const input=await read(path);
   if(!input.includes('SUM(F7:F'+last+')') || !input.includes('SUM(H7:H'+last+')') || !input.includes('</worksheet>')) throw Error('範本公式結構不符');
   forms.push({path,input,mode,last});
  }

  return {zip,book,rels,types,forms};
 }
 const unxml=s=>s.replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#\d+);/gi,entity=>{
  const name=entity.slice(1,-1);
  if(name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2),16));
  if(name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)));
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name];
 });
 const strings=s=>[...s.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>unxml(m[1])).join('');
 async function readBaseline(JSZip,bytes) {
  const {zip,forms}=await template(JSZip,bytes);
  const shared=await zip.file('xl/sharedStrings.xml')?.async('string')??'';
  const table=[...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>strings(m[1]));
  const baseline={};
  for(const {input,mode,last} of forms) {
   if(mode==='unused') continue;
   for(const row of input.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    if(Number(row[1])<7 || Number(row[1])>last) continue;
    const values={};
    for(const c of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
     const col=/\br="([A-I])\d+"/.exec(c[1])?.[1], body=c[2]??'';
     if(!col) continue;
     const v=/<v>([^<]+)<\/v>/.exec(body)?.[1];
     values[col]=c[1].includes('t="s"')?table[Number(v)]:c[1].includes('t="inlineStr"')?strings(body):v;
    }
    if(!/^\d{5}$/.test(values.A??'')) continue;
    const date=new Date(Date.UTC(1899,11,30)+Number(values.A)*86400000).toISOString().slice(0,10);
    const site=clean(values.C?.split(/[→➝]/)[1]);
    (baseline[date]??=[]).push({mode,site,description:values.C,remark:values.I,projectId:values.B,km:Number(values.D),amount:Number(values.F)});
   }
  }
  return baseline;
 }
 async function workbook(JSZip, bytes, month, rows, errors, mode) {
  let {zip,book,rels,types,forms}=await template(JSZip,bytes);
  if(mode==='fuel') {
   rows=rows.filter(r=>r.logs.length || r.prior.some(p=>p.mode==='fuel') || r.claimFuel).map(r=>({...r,
    original:{...r.original,etcKm:null},final:{...r.final,etcKm:null},trips:[],charge:null,etcAmount:null,claimEtc:false,
    issues:r.fuelIssues,status:r.fuelStatus,prior:r.prior.filter(p=>p.mode==='fuel')}));
   errors=[];
  }
  if(mode==='etc') rows=rows.filter(r=>r.trips.length || r.prior.some(p=>p.mode==='etc')).map(r=>({...r,
   original:{...r.original,fuelKm:null},final:{...r.final,fuelKm:null},fuel:null,claimFuel:false,
   issues:r.etcIssues,status:r.etcStatus,prior:r.prior.filter(p=>p.mode==='etc')}));
  for(const {path,input,mode,last} of forms) zip.file(path,patchForm(input,rows.filter(r=>mode==='fuel'?r.claimFuel:mode==='etc'&&r.claimEtc),last,mode));
  const newPath='xl/worksheets/muTransportAudit.xml';
  if (zip.file(newPath) || rels.includes('rIdMuTransport') || /\bsheetId="9999"/.test(book)) throw Error('核對工作表識別碼重複');
  zip.file(newPath,auditSheet(rows,month,errors));
  book=book.replace('</sheets>','<sheet name="核對明細" sheetId="9999" r:id="rIdMuTransport"/></sheets>');
  if(book.includes('<calcPr')) book=book.replace(/<calcPr\b([^>]*?)(\/?)>/,(_,a,end)=>'<calcPr'+a.replace(/\s+(?:fullCalcOnLoad|forceFullCalc|calcMode)="[^"]*"/g,'')+' calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"'+end+'>');
  zip.file('xl/workbook.xml',book);
  zip.file('xl/_rels/workbook.xml.rels',rels.replace('</Relationships>','<Relationship Id="rIdMuTransport" Type="'+rel+'/worksheet" Target="worksheets/muTransportAudit.xml"/></Relationships>'));
  zip.file('[Content_Types].xml',types.replace('</Types>','<Override PartName="/'+newPath+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 }
 return {parseEtc,readPdf,calculate,workbook,readBaseline,key};
})();
if(typeof module==='object' && module.exports) module.exports=MuTransport;

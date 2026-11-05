/* Read-only source validation. Real input files and outputs stay outside Git. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const Zip=require('jszip');
const M=require('../src/rc8.7-transport');
async function main(){
 const [excel,pdf,logs,ratesFile,out,summary]=process.argv.slice(2);
 if(!summary) throw Error('Usage: node scripts/verify-rc8.7-october.js TEMPLATE.xlsx ETC.pdf RECORDS.json RATES.json OUTPUT.xlsx SUMMARY.json');
 // The PDF.js text-only path does not use these browser graphics APIs.
 globalThis.DOMMatrix??=class {};
 globalThis.ImageData??=class {};
 globalThis.Path2D??=class {};
 const pdfModule=path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'legacy/build/pdf.mjs');
 const lib=await import(pathToFileURL(pdfModule));
 const bytes=fs.readFileSync(excel);
 const e=await M.readPdf(lib,new Uint8Array(fs.readFileSync(pdf)));
 assert.deepEqual(e.errors,[]);
 assert.equal(e.rows.length,17);
 const prior=await M.readBaseline(Zip,bytes);
 const month='2026-10';
 const data=JSON.parse(fs.readFileSync(logs));
 const keys=['date','client','site','projectId','workLocation','workTemplateName','status'];
 const source=(data.records??data).map(r=>Object.fromEntries(keys.map(k=>[k,r[k]??''])));
 const rates=Object.fromEntries(JSON.parse(fs.readFileSync(ratesFile)).map(({client,site,km})=>[M.key(client,site),km]));
 const rows=M.calculate(month,source,e,rates,{},prior);
 assert.equal(rows.length,18);
 fs.writeFileSync(out,await M.workbook(Zip,bytes,month,rows,e.errors));
 fs.writeFileSync(summary,JSON.stringify({rows,prior},null,2));
 console.log('October source PASS: PDF text extraction, historical template comparison and XLSX generation');
}
main().catch(e=>{console.error(e);process.exitCode=1});

const fs=require('node:fs');
const path=require('node:path');
const deps=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const load=(pkg,file)=>fs.readFileSync(deps?path.join(deps,pkg,file):path.join(path.dirname(require.resolve(pkg+'/package.json')),file),'utf8');
const pdf=load('pdfjs-dist','build/pdf.min.mjs');
const worker=load('pdfjs-dist','build/pdf.worker.min.mjs');
const zip=load('jszip','dist/jszip.min.js');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
const text=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const scripts='<script>'+safe(zip)+'</script>\n<script>\n'+
 'let muPdf; function loadMuPdf(){return muPdf??=(async()=>{const blob=s=>URL.createObjectURL(new Blob([s],{type:"text/javascript"}));'+
 'const url=blob('+text(pdf)+');try{const lib=await import(url);lib.GlobalWorkerOptions.workerSrc=blob('+text(worker)+');return lib;}finally{URL.revokeObjectURL(url);}})();}\n'+
 ['src/rc8.7-transport.js','src/rc8.7-center.js'].map(f=>safe(fs.readFileSync(f,'utf8'))).join('\n')+'</script>';
const out=process.argv[2]??'dist-rc8.7';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'03_RC8.7_離線報銷中心.html'),fs.readFileSync('src/rc8.7-center.html','utf8').replace('<!-- APP_SCRIPTS -->',()=>scripts));
for(const [pkg,filename] of [['pdfjs-dist','LICENSE'],['jszip','LICENSE.markdown']]) fs.writeFileSync(path.join(out,pkg+'-LICENSE.txt'),load(pkg,filename));

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.attributes={};this.listeners={};this.style={cssText:'',setProperty(){}};this.textContent='';this.shadowRoot=null;}
  append(...nodes){for(const node of nodes){if(node==null)continue;this.children.push(node);node.parentNode=this}}
  appendChild(node){this.append(node);return node}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  attachShadow(){this.shadowRoot=new Element('shadow-root');this.shadowRoot.host=this;return this.shadowRoot}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatchEvent(event){event.target??=this;event.preventDefault??=()=>{};event.stopPropagation??=()=>{event.stopped=true};event.stopImmediatePropagation??=()=>{event.stopped=true};for(const fn of this.listeners[event.type]||[])fn(event);if(!event.stopped&&this.parentNode)this.parentNode.dispatchEvent(event);return true}
  click(){this.dispatchEvent({type:'click'})}
  closest(selector){if(selector==='[data-action]'){for(let x=this;x;x=x.parentNode)if(x.attributes['data-action']!=null)return x}return null}
  querySelector(selector){return walk(this).find(x=>selector==='[data-records-error]'?x.attributes['data-records-error']!=null:false)||null}
  querySelectorAll(){return []}
  matches(){return false}
  set innerHTML(v){throw new Error('Trusted Types test: innerHTML assignment forbidden')}
  set outerHTML(v){throw new Error('Trusted Types test: outerHTML assignment forbidden')}
  insertAdjacentHTML(){throw new Error('Trusted Types test: insertAdjacentHTML forbidden')}
}
const walk=root=>[root,...root.children.flatMap(walk),...(root.shadowRoot?walk(root.shadowRoot):[])];
const body=new Element('body');
const document={body,createElement:t=>new Element(t),createTextNode:t=>{let n=new Element('#text');n.textContent=t;return n},getElementById:id=>walk(body).find(x=>x.id===id)||null,querySelectorAll:()=>[]};
const storage=new Map([['muSafety.v150.rc7Records','[]']]);
const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const context={document,localStorage,alert:()=>{},confirm:()=>true,prompt:()=>null,console,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout:()=>{},Date,Math,JSON,String,Array,Object,Number,Boolean,RegExp,Event:class{constructor(type){this.type=type}},HTMLInputElement:class{},HTMLTextAreaElement:class{}};
vm.runInNewContext(fs.readFileSync('src/mu-safety-assistant-v1.50-rc7.js','utf8'),context);
const button=walk(body).find(x=>x.textContent==='📋 我的工作紀錄');
assert(button,'Records button must be rendered');
button.dispatchEvent({type:'click'});
const modal=document.getElementById('muSafetyAssistantV150RC7RecordsHost');
assert(modal&&modal.shadowRoot,'Click must create an independent records Shadow DOM modal');
assert(walk(modal.shadowRoot).some(x=>x.textContent==='目前尚無工作紀錄'),'Empty records modal must render its empty-state message');
storage.set('muSafety.v150.rc7Records',JSON.stringify([{id:'legacy',date:'2026-08-27',site:'舊廠區',projectId:'OLD',workTemplateName:'一般駐廠工安',workLocation:'在上述廠區',nightOvertime:false,status:'draft',createdAt:'2026-08-27T10:00:00.000Z'},{id:'draft-1',date:'2026-08-28',site:'測試廠區<script>',projectId:'P-TRUSTED',workTemplateName:'工務所作業',workLocation:'工務所',nightOvertime:true,nightOvertimeContent:'夜間巡檢內容<script>',hasDefect:true,primaryDefect:{nature:'不安全行為',vendor:'廠商<script>',workerCount:'2',supervisor:'監工甲',category:'(7)個人防護具',description:'缺失<&>內容'},secondaryDefect:{nature:'不安全環境',vendor:'第二廠商',workerCount:'1',supervisor:'監工乙',category:'(6)整理整頓',description:'第二筆內容'},status:'draft',createdAt:'2026-08-28T10:00:00.000Z'}]));
button.dispatchEvent({type:'pointerdown'});
const populated=document.getElementById('muSafetyAssistantV150RC7RecordsHost');
const rendered=walk(populated.shadowRoot).map(x=>x.textContent);
for(const value of ['2026-08-28','測試廠區<script>','P-TRUSTED','工務所作業','工務所','是','⚠️ 2 件','✅ 無缺失','draft']) assert(rendered.includes(value),`Records modal must safely render ${value} via textContent`);
assert(walk(populated.shadowRoot).some(x=>x.tagName==='THEAD'),'Populated records modal must build its table header with DOM APIs');
const view=walk(populated.shadowRoot).find(x=>x.textContent==='查看');
assert(view&&typeof view.onclick==='function','Defect record must provide a details action');
view.onclick();
const details=walk(populated.shadowRoot).map(x=>x.textContent);
for(const value of ['夜間巡檢內容<script>','第一筆／主要缺失','不安全行為','廠商<script>','2','監工甲','(7)個人防護具','缺失<&>內容','第二筆缺失','不安全環境','第二廠商','監工乙','第二筆內容']) assert(details.includes(value),`Defect detail must safely render ${value}`);
console.log('RC7 records DOM runtime check passed: delegated events render empty and populated modals without HTML injection APIs.');

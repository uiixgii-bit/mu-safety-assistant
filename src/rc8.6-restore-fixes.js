// RC8.6 only: merge sites within the same customer without replacing current settings.
function muMergeCustomerSites(current,incoming,result){
 let out=muClone(Array.isArray(current)?current:[]);
 for(let item of Array.isArray(incoming)?incoming:[]){
  let name=String(item?.c||'').trim();if(!name)continue;
  let found=out.find(value=>String(value?.c||'').trim()===name);
  if(!found){out.push(muClone(item));result.settingsAdded++;continue}
  found.s=muMergeUniqueStrings(found.s,item.s,result);
 }
 return out;
}
// A restored configuration must not be overwritten by the settings editor's stale draft.
function muAfterRestore(plan){
 alert(muRestoreSummary(plan));
 document.getElementById(A.sid)?.remove();
 panel(L());
}

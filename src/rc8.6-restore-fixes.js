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
// Old releases kept built-in customer/site choices outside persisted cp.
// Recover the last selected pair from existing settings without writing storage on open.
function muUpgradeSettings(settings){
 let pair=String(settings.lf||'').split(' → ');
 if(pair.length!==2||!pair.every(x=>x.trim()))return settings;
 let client=pair[0].trim(),site=pair[1].trim();
 let customers=Array.isArray(settings.cp)?settings.cp:[];
 let found=customers.find(x=>String(x?.c||'').trim()===client);
 if(!found)customers.push({c:client,s:[site]});
 else if(!Array.isArray(found.s))found.s=[site];
 else if(!found.s.includes(site))found.s.push(site);
 settings.cp=customers;return settings;
}

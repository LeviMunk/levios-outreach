/* JobOS Apply isolated content script. Fills fields only after clicking the extension popup.
   Never presses Submit, never uploads a document, never sends application data to JobOS. */
(() => {
 'use strict';
 const deny=/\b(?:race|ethnic|gender|sex|pronoun|disab|veteran|religio|birth|ssn|social security|passport|citizenship|nationality|visa|sponsor|work authoriz|legally authoriz|criminal|convict|arrest|background|drug|salary|compensation|pay expectation|age|marital|pregnan|accommodation|equal opportunity|consent|terms|agree|signature)\b/i;
 const patterns=[
  ['firstName',/(?:^|[\s_-])(?:first[\s_-]*name|given[\s_-]*name|fname)(?:$|[\s_-])/i],
  ['lastName',/(?:^|[\s_-])(?:last[\s_-]*name|family[\s_-]*name|surname|lname)(?:$|[\s_-])/i],
  ['email',/(?:^|[\s_-])(?:e[\s_-]*mail(?:[\s_-]*address)?)(?:$|[\s_-])/i],
  ['phone',/(?:^|[\s_-])(?:phone(?:[\s_-]*(?:number|mobile))?|mobile[\s_-]*number|telephone)(?:$|[\s_-])/i],
  ['city',/(?:^|[\s_-])city(?:$|[\s_-])/i],
  ['state',/(?:^|[\s_-])(?:state|province|region)(?:$|[\s_-])/i],
  ['postalCode',/(?:^|[\s_-])(?:zip(?:[\s_-]*code)?|postal[\s_-]*code)(?:$|[\s_-])/i],
  ['linkedinUrl',/(?:^|[\s_-])linkedin(?:[\s_-]*(?:url|profile))?(?:$|[\s_-])/i],
  ['portfolioUrl',/(?:^|[\s_-])(?:portfolio|personal[\s_-]*(?:website|site)|website)(?:[\s_-]*(?:url|link))?(?:$|[\s_-])/i],
  ['currentCompany',/(?:^|[\s_-])(?:current[\s_-]*(?:company|employer))(?:$|[\s_-])/i],
  ['currentTitle',/(?:^|[\s_-])(?:current[\s_-]*(?:title|job[\s_-]*title|position))(?:$|[\s_-])/i]
 ];
 function labelFor(el){
   const parts=[];
   for(const x of [el.getAttribute('aria-label'),el.getAttribute('placeholder'),el.getAttribute('name'),el.id])if(x)parts.push(x);
   const labelIds=el.getAttribute('aria-labelledby');
   if(labelIds)for(const id of labelIds.split(/\s+/)){const node=document.getElementById(id);if(node)parts.push(node.textContent||'');}
   if(el.labels)for(const lbl of el.labels)parts.push(lbl.textContent||'');
   const outer=el.closest('label');if(outer)parts.push(outer.textContent||'');
   return parts.join(' | ').trim().slice(0,500);
 }
 function fieldFor(el,label){
   const segments=label.split(' | ').map(t=>t.trim().toLowerCase());
   if(segments.some(t=>/^(?:full[\s_-]*name|name|applicant[\s_-]*name)$/.test(t))&&!/company|employer|reference|supervisor/i.test(label))return 'fullName';
   const ac=(el.getAttribute('autocomplete')||'').toLowerCase();
   const byAuto={'given-name':'firstName','family-name':'lastName','email':'email','tel':'phone','address-level2':'city','address-level1':'state','postal-code':'postalCode'};
   if(byAuto[ac])return byAuto[ac];
   for(const [key,pattern] of patterns)if(pattern.test(' '+label+' '))return key;
   return null;
 }
 function updateValue(el,value){
   if(el.tagName==='SELECT'){
     const option=[...el.options].find(o=>o.value.toLowerCase()===value.toLowerCase()||o.textContent.trim().toLowerCase()===value.toLowerCase());
     if(!option)return false;
     el.value=option.value;
   }else{
     const prototype=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
     const setter=Object.getOwnPropertyDescriptor(prototype,'value')?.set;
     if(setter)setter.call(el,value);else el.value=value;
   }
   el.dispatchEvent(new Event('input',{bubbles:true}));
   el.dispatchEvent(new Event('change',{bubbles:true}));
   return true;
 }
 function fill(pack){
   const parsed=JobOSApply.parsePackage(pack);
   const els=[...document.querySelectorAll('input,textarea,select')];
   let filled=0,skipped=0;
   for(const el of els){
     if(el.disabled||el.readOnly||el.type==='hidden'||el.type==='password'||el.type==='file'||el.type==='submit'||el.type==='button'||el.type==='radio'||el.type==='checkbox'||el.type==='date'||el.type==='number'){skipped++;continue;}
     if(!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||(!['','text','email','tel','url','search'].includes(el.type||'')&&el.tagName==='INPUT')){skipped++;continue;}
     if(el.value?.trim()){skipped++;continue;} // never overwrite applicant edits
     const label=labelFor(el);
     if(deny.test(label)||JobOSApply.isSensitiveQuestion(label)){skipped++;continue;}
     const key=fieldFor(el,label);
     const value=(key==='fullName'?[parsed.profile.firstName,parsed.profile.lastName].filter(Boolean).join(' '):key&&parsed.profile[key])||label.split(' | ').map(part=>JobOSApply.matchingAnswer(parsed.answers,part)).find(Boolean);
     if(!value){skipped++;continue;}
     if(updateValue(el,value))filled++;else skipped++;
   }
   return {ok:true,filled,skipped};
 }
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
   if(msg?.type!=='JOBOS_APPLY_FILL')return;
   try{reply(fill(msg.pack));}catch(e){reply({ok:false,error:e.message});}
 });
})();

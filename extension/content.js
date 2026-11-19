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
 function historyField(label,pack){
   const text=String(label||'').toLowerCase().replace(/[_-]/g,' ');
   // Never map unlabeled or ambiguous history inputs to an arbitrary employer or school.
   const work=/(?:employment|work experience|experience|previous employer|job history)/i.test(text);
   const school=/(?:education|school history|academic|institution|university)/i.test(text);
   if(work===school)return '';
   const source=work?pack.experience:pack.education;
   const numeric=text.match(/(?:employment|work experience|experience|education|school history|academic)(?:\s*\[|\s+|_)(\d+)(?:\s*\]|(?:\s|_))/i);
   // Counted labels are one-based, explicit bracket-index selectors are zero-based.
   const zeroIndex=text.match(/(?:experience|education)\s*\[\s*(\d+)\s*\]/i);
   const index=zeroIndex?Number(zeroIndex[1]):numeric?Number(numeric[1])-1:-1;
   if(index<0||index>=source.length)return '';
   const mapping=work?[
     ['company',/\b(?:company|employer|organization)\b/],
     ['title',/\b(?:title|position|job role)\b/],
     ['location',/\blocation\b/],
     ['startDate',/\b(?:start|from)\b/],
     ['endDate',/\b(?:end|to date)\b/],
     ['description',/\b(?:description|responsibilities|duties)\b/]
   ]:[
     ['school',/\b(?:school|institution|university|college)\b/],
     ['degree',/\b(?:degree|credential|qualification)\b/],
     ['field',/\b(?:major|field of study|discipline)\b/],
     ['startDate',/\b(?:start|from)\b/],
     ['endDate',/\b(?:end|graduation|completed)\b/]
   ];
   const matches=mapping.filter(([,pattern])=>pattern.test(text));
   return matches.length===1?String(source[index]?.[matches[0][0]]||''):'';
 }
 function attachDocument(kind,documentInfo){
   if(!['resume','coverLetter'].includes(kind)||!documentInfo)return {ok:false,error:'Document type is not supported.'};
   const filename=String(documentInfo.name||'');
   const mime=String(documentInfo.type||'');
   const bytes=documentInfo.bytes;
   if(!/^[\w .()\-]+$/.test(filename)||!/\.(?:pdf|docx?)$/i.test(filename)||!Array.isArray(bytes)||bytes.length<1||bytes.length>3*1024*1024||!bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255))
     return {ok:false,error:'Select a PDF, DOC, or DOCX file up to 3 MB.'};
   const inputs=[...document.querySelectorAll('input[type="file"]')].filter(el=>!el.disabled);
   const targets=inputs.filter(el=>{
     const label=labelFor(el);
     if(deny.test(label))return false;
     return kind==='resume'?/\b(?:resume|résumé|curriculum vitae|cv)\b/i.test(label):/\b(?:cover[\s_-]*letter|motivation[\s_-]*letter)\b/i.test(label);
   });
   if(targets.length!==1)return {ok:false,error:targets.length?'Multiple matching upload fields found; attach manually.':'No uniquely labeled '+(kind==='resume'?'résumé':'cover letter')+' upload field found; attach manually.'};
   const input=targets[0];
   if(input.files?.length)return {ok:false,error:'Upload field already contains a file; nothing replaced.'};
   if(input.accept){
     const accept=input.accept.toLowerCase();
     if(!accept.includes('pdf')&&!accept.includes('doc')&&!accept.includes('application/')&&!accept.includes('*'))return {ok:false,error:'The employer upload field may not accept this document type.'};
   }
   try{
     const type=mime||(/\.pdf$/i.test(filename)?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
     const file=new File([new Uint8Array(bytes)],filename,{type});
     const transfer=new DataTransfer();transfer.items.add(file);
     input.files=transfer.files;
     input.dispatchEvent(new Event('input',{bubbles:true}));
     input.dispatchEvent(new Event('change',{bubbles:true}));
     return {ok:true,filename,attached:input.files?.length===1};
   }catch(e){return {ok:false,error:'This site blocked automatic file attachment: '+e.message};}
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
 function fillVerifiedRadioGroups(answers){
   let changed=0,skipped=0;
   for(const group of document.querySelectorAll('fieldset')){
     const legend=group.querySelector('legend');
     const question=legend?.textContent?.trim()||'';
     if(!question||deny.test(question)||JobOSApply.isSensitiveQuestion(question)){skipped++;continue;}
     const answer=JobOSApply.matchingAnswer(answers,question);
     if(!answer)continue;
     const radios=[...group.querySelectorAll('input[type="radio"]')].filter(el=>!el.disabled);
     if(!radios.length||radios.some(el=>el.checked)){skipped++;continue;}
     const matches=radios.filter(el=>{
       const label=el.labels?.[0]?.textContent?.trim()||el.value||'';
       return label.toLowerCase()===answer.toLowerCase()||el.value.toLowerCase()===answer.toLowerCase();
     });
     if(matches.length!==1){skipped++;continue;}
     const el=matches[0];
     const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'checked')?.set;
     if(setter)setter.call(el,true);else el.checked=true;
     el.dispatchEvent(new Event('input',{bubbles:true}));
     el.dispatchEvent(new Event('change',{bubbles:true}));
     changed++;
   }
   return {changed,skipped};
 }
 function fill(pack){
   const parsed=JobOSApply.parsePackage(pack);
   const els=[...document.querySelectorAll('input,textarea,select')];
   let filled=0,skipped=0;
   for(const el of els){
     if(el.disabled||el.readOnly||el.type==='hidden'||el.type==='password'||el.type==='file'||el.type==='submit'||el.type==='button'||el.type==='radio'||el.type==='checkbox'||el.type==='date'||el.type==='number'){skipped++;continue;}
     if(!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||(!['','text','email','tel','url','search'].includes(el.type||'')&&el.tagName==='INPUT')){skipped++;continue;}
     if(el.value?.trim()&&!(el.tagName==='SELECT'&&(!el.selectedIndex||/^(?:select|choose|please select|--|n\/a)$/i.test(el.value.trim())))){skipped++;continue;} // never overwrite applicant edits
     const label=labelFor(el);
     if(deny.test(label)||JobOSApply.isSensitiveQuestion(label)){skipped++;continue;}
     const key=fieldFor(el,label);
     const value=historyField(label,parsed)||(key==='fullName'?[parsed.profile.firstName,parsed.profile.lastName].filter(Boolean).join(' '):key&&parsed.profile[key])||label.split(' | ').map(part=>JobOSApply.matchingAnswer(parsed.answers,part)).find(Boolean);
     if(!value){skipped++;continue;}
     if(updateValue(el,value))filled++;else skipped++;
   }
   const radio=fillVerifiedRadioGroups(parsed.answers);filled+=radio.changed;skipped+=radio.skipped;
   return {ok:true,filled,skipped};
 }
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
   if(msg?.type!=='JOBOS_APPLY_FILL'&&msg?.type!=='JOBOS_APPLY_ATTACH')return;
   try{reply(msg.type==='JOBOS_APPLY_FILL'?fill(msg.pack):attachDocument(msg.kind,msg.document));}catch(e){reply({ok:false,error:e.message});}
 });
})();

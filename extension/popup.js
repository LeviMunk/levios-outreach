(() => {
 'use strict';
 const $=id=>document.getElementById(id), status=$('status');
 const hosts=new Set(['boards.greenhouse.io','job-boards.greenhouse.io','jobs.lever.co','apply.lever.co','jobs.ashbyhq.com']);
 function allowed(url){try{const u=new URL(url);return u.protocol==='https:'&&(hosts.has(u.hostname)||u.hostname.endsWith('.ashbyhq.com'));}catch{return false;}}
 function show(message){status.textContent=message;}
 async function restore(){
  const data=await chrome.storage.session.get('jobosApplyPack');
  show(data.jobosApplyPack?'Verified profile loaded for this browser session.':'No verified profile loaded yet.');
 }
 $('load').addEventListener('click',async()=>{
  try{
   const pack=JobOSApply.parsePackage($('data').value);
   if(!pack.profile.firstName||!pack.profile.lastName||!pack.profile.email)throw Error('Verified first name, last name, and email required.');
   await chrome.storage.session.set({jobosApplyPack:pack});
   $('data').value='';
   show('Loaded '+pack.answers.length+' verified screening answers for this browser session.');
  }catch(error){show('Not loaded: '+error.message);}
 });
 $('clear').addEventListener('click',async()=>{
  await chrome.storage.session.remove('jobosApplyPack');
  $('data').value='';show('Session data cleared.');
 });
 $('fill').addEventListener('click',async()=>{
  try{
   const pack=(await chrome.storage.session.get('jobosApplyPack')).jobosApplyPack;
   if(!pack)throw Error('Load your verified JobOS Apply data first.');
   const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
   if(!tab?.id||!allowed(tab.url))throw Error('Open a Greenhouse, Lever, or Ashby application tab first.');
   const response=await chrome.tabs.sendMessage(tab.id,{type:'JOBOS_APPLY_FILL',pack});
   if(!response?.ok)throw Error(response?.error||'No supported form found. Reload the application and try again.');
   show(response.filled+' field(s) filled. '+response.skipped+' left untouched. Review the entire application, upload documents, and submit manually.');
  }catch(error){show(error.message);}
 });
 restore().catch(e=>show('Session storage unavailable: '+e.message));
})();

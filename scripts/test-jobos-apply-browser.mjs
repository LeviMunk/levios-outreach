import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const pack={
 format:'jobos-apply-v1',profile:{
  firstName:'Test',lastName:'Candidate',email:'candidate@example.com',phone:'920-555-0144',
  city:'Appleton',state:'WI',postalCode:'54911',linkedinUrl:'https://www.linkedin.com/in/test',
  portfolioUrl:'https://example.com',currentCompany:'Example Co',currentTitle:'Marketing Analyst'
 },
 answers:[{question:'Which analytics tools have you used?',answer:'Google Analytics and Excel',verifiedAt:'2026-11-18T23:00:00Z'}],
 experience:[{company:'Example Co',title:'Marketing Analyst',location:'Appleton',startDate:'2025-08',endDate:'Present',description:'Reporting and analytics',verifiedAt:'2026-11-19T00:00:00Z'}],
 education:[{school:'Test University',degree:'Bachelor of Science',field:'Media',startDate:'2010-09',endDate:'2014-05',verifiedAt:'2026-11-19T00:00:00Z'}]
};
const fixtures=[
 {name:'Greenhouse',markup:'<form><label>First Name<input name="first_name"></label><label>Last Name<input name="last_name"></label><label>Email<input name="email" type="email"></label><label>Which analytics tools have you used?<textarea name="question_1"></textarea></label><label>Are you legally authorized to work in the US?<input name="authorization"></label><label>Upload Resume<input type="file"></label><button type="submit">Submit Application</button></form>',expected:4},
 {name:'Lever',markup:'<form><label>First name<input name="applicant_first_name"></label><label>Last name<input name="applicant_last_name"></label><label>Email<input name="email"></label><label>Phone<input name="phone"></label><label>Full Name<input name="name"></label><label>Expected salary<input name="salary"></label><button type="submit">Submit</button></form>',expected:5},
 {name:'History',markup:'<form><label>Experience 1 Company<input name="experience[0][company]"></label><label>Experience 1 Title<input name="experience[0][title]"></label><label>Experience 1 Start<input name="experience[0][start]"></label><label>Education 1 School<input name="education[0][school]"></label><label>Education 1 Degree<input name="education[0][degree]"></label><label>Education 1 Field of study<input name="education[0][field]"></label><label>Experience 2 Company<input name="experience[1][company]"></label><button type="submit">Submit</button></form>',expected:6},
 {name:'Ashby',markup:'<form><input aria-label="First Name" id="first"><input aria-label="Last Name" id="last"><input aria-label="Email Address" id="email"><input aria-label="LinkedIn URL" id="linkedin"><input aria-label="Personal website" id="site"><label>Which analytics tools have you used?<textarea name="essay"></textarea></label><label>Veteran Status<select><option value="">Select</option><option>Yes</option></select></label><button type="submit">Apply</button></form>',expected:6}
];
try{
 for(const fixture of fixtures){
  const page=await browser.newPage(),failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  await page.setContent(fixture.markup);
  await page.evaluate(()=>{window.__submitCount=0;document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.__submitCount++;});window.chrome={runtime:{onMessage:{addListener(fn){window.__jobosHandler=fn;}}}};});
  await page.addScriptTag({path:path.join(root,'extension/jobos-apply.js')});
  await page.addScriptTag({path:path.join(root,'extension/content.js')});
  const output=await page.evaluate(data=>new Promise(resolve=>window.__jobosHandler({type:'JOBOS_APPLY_FILL',pack:data},{},resolve)),pack);
  const values=await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map(x=>({name:x.name,aria:x.getAttribute('aria-label'),value:x.value,type:x.type,question:x.labels?.[0]?.textContent||''})));
  assert.deepEqual(failures,[],fixture.name+' browser errors');
  assert.equal(output.ok,true,fixture.name+' returned error '+JSON.stringify(output));
  assert.equal(output.filled,fixture.expected,fixture.name+' wrong fill count '+JSON.stringify(values));
  if(fixture.name==='Lever')assert.equal(values.find(x=>x.name==='name').value,'Test Candidate');
  if(fixture.name==='History'){assert.equal(values.find(x=>x.name==='experience[0][company]').value,'Example Co');assert.equal(values.find(x=>x.name==='education[0][degree]').value,'Bachelor of Science');assert.equal(values.find(x=>x.name==='experience[1][company]').value,'');}
  assert.equal(await page.evaluate(()=>window.__submitCount),0,'Extension must never submit');
  const question=values.find(x=>x.question.includes('Which analytics tools'));
  if(question)assert.equal(question.value,'Google Analytics and Excel');
  for(const item of values)if(/authoriz|salary|veteran/i.test(item.name+' '+item.aria+' '+item.question))assert.equal(item.value,'','Sensitive field changed');
  if(fixture.name==='Greenhouse'){
    await page.locator('[name="first_name"]').fill('Edited by applicant');
    await page.evaluate(data=>new Promise(resolve=>window.__jobosHandler({type:'JOBOS_APPLY_FILL',pack:data},{},resolve)),pack);
    assert.equal(await page.locator('[name="first_name"]').inputValue(),'Edited by applicant');
  }
  console.log('PASS '+fixture.name+': '+output.filled+' fields, no sensitive answers, no submission');
  await page.close();
 }

 const uploadPage=await browser.newPage();
 await uploadPage.setContent('<form><label>Upload Resume<input type="file" id="resume"></label><label>Cover Letter<input type="file" id="cover"></label><label>Expected salary<input name="salary"></label><button type="submit">Submit</button></form>');
 await uploadPage.evaluate(()=>{window.__submitted=0;document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.__submitted++;});window.chrome={runtime:{onMessage:{addListener(fn){window.__jobosHandler=fn;}}}};});
 await uploadPage.addScriptTag({path:path.join(root,'extension/jobos-apply.js')});
 await uploadPage.addScriptTag({path:path.join(root,'extension/content.js')});
 const documentInfo={name:'Levi_Resume.pdf',type:'application/pdf',bytes:[37,80,68,70,45,49,46,55]};
 const resume=await uploadPage.evaluate(documentInfo=>new Promise(resolve=>window.__jobosHandler({type:'JOBOS_APPLY_ATTACH',kind:'resume',document:documentInfo},{},resolve)),documentInfo);
 assert.equal(resume.ok,true,'User-chosen résumé did not attach: '+JSON.stringify(resume));
 assert.equal(await uploadPage.locator('#resume').evaluate(el=>el.files?.[0]?.name),'Levi_Resume.pdf');
 const conflicting=await uploadPage.evaluate(documentInfo=>new Promise(resolve=>window.__jobosHandler({type:'JOBOS_APPLY_ATTACH',kind:'resume',document:documentInfo},{},resolve)),documentInfo);
 assert.equal(conflicting.ok,false,'Existing upload overwritten');
 const cover=await uploadPage.evaluate(documentInfo=>new Promise(resolve=>window.__jobosHandler({type:'JOBOS_APPLY_ATTACH',kind:'coverLetter',document:documentInfo},{},resolve)),{...documentInfo,name:'Levi_Cover.pdf'});
 assert.equal(cover.ok,true,'Cover letter did not attach: '+JSON.stringify(cover));
 assert.equal(await uploadPage.locator('#cover').evaluate(el=>el.files?.[0]?.name),'Levi_Cover.pdf');
 assert.equal(await uploadPage.locator('[name="salary"]').inputValue(),'');
 assert.equal(await uploadPage.evaluate(()=>window.__submitted),0,'Document upload submitted application');
 console.log('PASS explicit résumé/cover letter uploads; files are not overwritten; never submitted');
 await uploadPage.close();
}finally{await browser.close();}

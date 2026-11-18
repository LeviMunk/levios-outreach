import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync('app.js','utf8');
const source=readFileSync('job-documents.js','utf8');
const html=readFileSync('index.html','utf8');
assert.match(html,/job-documents\.js/);
assert.match(app,/data-action="downloadkit"/);
assert.match(app,/data-action="pdfresume"/);
assert.match(app,/data-action="pdfcover"/);
assert.match(app,/document-download-requested/);
assert.doesNotMatch(app,/Both PDFs downloaded/);
assert.doesNotMatch(app,/kind\+' PDF downloaded'/);

const saves=[];
class FakePDF {
  constructor(){this.pages=1;}
  setFont(){} setFontSize(){} setTextColor(){} setDrawColor(){} line(){}
  splitTextToSize(text){return [text];}
  text(){}
  addPage(){this.pages++;}
  save(name){saves.push({name,pages:this.pages});}
}
const window={jspdf:{jsPDF:FakePDF}};
vm.runInNewContext(source,{window,document:{}},{filename:'job-documents.js'});
const docs=window.JobOSDocuments;
const honeycomb={jobUrl:'https://boards.greenhouse.io/honeycomb/jobs/5451111008'};
const harrow={jobUrl:'https://boards.greenhouse.io/harrow/jobs/4727766006'};
assert.equal(docs.has(honeycomb),true);
assert.equal(docs.has(harrow),true);
assert.equal(docs.has({jobUrl:'https://example.org/jobs/123'}),false);
await docs.downloadBoth(honeycomb);
assert.equal(saves.length,2);
assert.match(saves[0].name,/Resume\.pdf$/);
assert.match(saves[1].name,/Cover_Letter\.pdf$/);
assert.notEqual(saves[0].name,saves[1].name);
docs.save(harrow,'Resume');
assert.equal(saves.length,3);
assert.match(saves[2].name,/Harrow/);
console.log('JobOS document download wiring and PDF save-contract checks passed (mock PDF engine; browser downloads not verified).');

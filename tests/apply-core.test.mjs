import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=require('../jobos-apply.js');

test('verified JobOS Apply export contains profile and only verified non-sensitive answers',()=>{
 const pack=api.packageForExtension({firstName:'Levi',lastName:'Van Stappen',email:'test@example.com',portfolioUrl:'https://example.com'},[
  {question:'Which analytics tools have you used?',answer:'Google Analytics and Excel',verifiedAt:'2026-11-18T23:00:00Z'},
  {question:'What is your disability status?',answer:'Prefer not to say',verifiedAt:'2026-11-18T23:00:00Z'},
  {question:'Describe your project management experience?',answer:'Not yet verified',verifiedAt:''}
 ]);
 assert.equal(pack.format,'jobos-apply-v1');
 assert.equal(pack.answers.length,1);
 assert.equal(api.matchingAnswer(pack.answers,'Which ANALYTICS tools have you used?'),'Google Analytics and Excel');
 assert.equal(api.matchingAnswer(pack.answers,'Have you used analytics tools?'),null);
 assert.equal(api.matchingAnswer(pack.answers,'What is your disability status?'),null);
});
test('export is rejected for invalid email and non-https portfolio',()=>{
 assert.throws(()=>api.packageForExtension({email:'invalid'},[]),/email/);
 assert.throws(()=>api.packageForExtension({email:'ok@example.com',portfolioUrl:'http://example.com'},[]),/https/);
});
test('extension imports only the expected validated format',()=>{
 const pack=api.packageForExtension({firstName:'Levi',lastName:'Van Stappen',email:'test@example.com'},[]);
 assert.equal(api.parsePackage(JSON.stringify(pack)).profile.firstName,'Levi');
 assert.throws(()=>api.parsePackage('{"format":"not-jobos"}'),/Not a JobOS/);
 assert.equal(api.isSensitiveQuestion('Are you legally authorized to work in the US?'),true);
 assert.equal(api.isSensitiveQuestion('Expected salary?'),true);
});

test('only individually verified history is exported; invalid or unverified dates are rejected',()=>{
 const experience=[
  {company:'Example LLC',title:'Marketing Coordinator',startDate:'2025-08',endDate:'Present',description:'Verified campaign coordination',verifiedAt:'2026-11-19T00:00:00Z'},
  {company:'Unverified LLC',title:'Manager',startDate:'2020-01',endDate:'2021-01'},
  {company:'Unknown Dates LLC',title:'Assistant',startDate:'last summer',verifiedAt:'2026-11-19T00:00:00Z'}
 ];
 const education=[{school:'Example University',degree:'Bachelors',field:'Media',endDate:'2013-05',verifiedAt:'2026-11-19T00:00:00Z'}];
 const pack=api.packageForExtension({firstName:'Test',lastName:'User',email:'test@example.com'},[],experience,education);
 assert.equal(pack.experience.length,1);
 assert.equal(pack.education.length,1);
 assert.equal(api.entryValue(pack.experience,'experience',0,'title'),'Marketing Coordinator');
 assert.equal(api.entryValue(pack.education,'education',0,'field'),'Media');
 assert.equal(api.entryValue(pack.experience,'experience',1,'company'),'');
 assert.equal(api.parsePackage(pack).experience.length,1);
});

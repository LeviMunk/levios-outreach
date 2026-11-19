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

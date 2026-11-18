import test from 'node:test';
import assert from 'node:assert/strict';
import {candidate} from '../scripts/discover-prospects.mjs';
const e={type:'node',id:123,lat:43.0748,lon:-89.3848,tags:{name:'Test Local Plumbing',craft:'plumber',website:'https://example.org','contact:instagram':'https://instagram.com/testlocalplumbing'}};
test('directory business is labelled unverified and not contacted',()=>{
 const r=candidate(e,'Madison','2026-11-15');assert.equal(r.verification,'directory');assert.equal(r.email,'');assert.equal(r.profile,'https://instagram.com/testlocalplumbing');assert.equal(r.stage,'Researched');assert.equal(r.sourceUrl,'https://www.openstreetmap.org/node/123');
});
test('excludes bakery and missing sites',()=>{
 assert.equal(candidate({...e,tags:{...e.tags,name:'City Bakery'}},'Madison'),null);
 assert.equal(candidate({...e,tags:{...e.tags,website:''}},'Madison'),null);
});
test('rejects prospects within 50 miles of Appleton',()=>assert.equal(candidate({...e,lat:44.2619,lon:-88.4154},'Appleton'),null));
test('rejects non-http sites',()=>assert.equal(candidate({...e,tags:{...e.tags,website:'javascript:alert(1)'}},'Madison'),null));

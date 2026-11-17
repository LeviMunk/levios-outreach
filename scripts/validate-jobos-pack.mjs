// Validate mixed business and career research. Invalid records cannot enter owner inbox.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateResearchPack} from './validate-research-pack.mjs';
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v<=new Date().toISOString().slice(0,10);
const url=v=>{try{const x=new URL(v);return x.protocol==='https:'&&['job-boards.greenhouse.io','job-boards.eu.greenhouse.io','boards.greenhouse.io','boards.eu.greenhouse.io','jobs.lever.co'].includes(x.hostname.toLowerCase())}catch{return false}};
export function validateMixed(pack){
 const errors=[];
 if(!pack||!Array.isArray(pack.records)||!pack.records.length||pack.records.length>12)return {valid:false,errors:['Expected 1–12 records']};
 const businesses=pack.records.filter(r=>r?.type==='Business'),jobs=pack.records.filter(r=>r?.type==='Career'),employerOutreach=pack.records.filter(r=>r?.type==='Career Outreach');
 if(businesses.length){const check=validateResearchPack({records:businesses,strategies:[]});errors.push(...check.errors);}
 if(businesses.length+jobs.length+employerOutreach.length!==pack.records.length)errors.push('Unsupported record type');
 for(const [i,r] of employerOutreach.entries()){
  const profile=url(r.profile),site=url(r.website),source=url(r.sourceUrl);
  if(r.stage!=='Researched'||!r.name||!r.person||r.contactVerified!=='public-profile'||r.verification!=='official-site'||!site||!source||site.hostname.replace(/^www\./,'')!==source.hostname.replace(/^www\./,'')||!profile||!/^((www)\.)?linkedin\.com$/i.test(profile.hostname)||!date(r.researchDate)||r.email||r.draft||r.subject||r.cc||r.followup)errors.push('Career Outreach '+i+': public employer and professional contact evidence required');
 }
 const seen=new Set();
 for(const [i,r] of jobs.entries()){
  if(!r||!r.name||!r.jobTitle||!url(r.jobUrl)||r.jobUrl!==r.sourceUrl||r.verification!=='official-site'||!date(r.researchDate)||r.stage!=='Discovered')errors.push('Career '+i+': source/job metadata invalid');
  if(!['local20','remote'].includes(r.locationBucket))errors.push('Career '+i+': location unsupported');
  if(r.locationBucket==='local20'&&!(r.distanceMiles!==''&&Number.isFinite(Number(r.distanceMiles))&&Number(r.distanceMiles)>=0&&Number(r.distanceMiles)<=20))errors.push('Career '+i+': local distance unverified');
  if(r.locationBucket==='remote'&&r.remoteWisconsinEligible!=='yes')errors.push('Career '+i+': Wisconsin eligibility unverified');
  if(!['strong','moderate'].includes(r.roleFit))errors.push('Career '+i+': role-fit missing');
  const location=r.locationBucket==='local20'?30:r.locationBucket==='remote'&&r.remoteWisconsinEligible==='yes'?22:0;
  const role=r.roleFit==='strong'?25:r.roleFit==='moderate'?15:0;
  const pay=r.compensationFit==='target'?20:r.compensationFit==='minimum'?12:0;
  const ease=r.applicationFriction==='low'?15:r.applicationFriction==='medium'?7:0;
  if(location+role+pay+ease+10<75||['high','workday'].includes(r.applicationFriction))errors.push('Career '+i+': below 75-point minimum or high-friction application');

  if(r.email||r.draft||r.subject||r.cc||r.followup)errors.push('Career '+i+': outbound data not allowed');
  const key=String(r.jobUrl||'').split('?')[0].toLowerCase();if(seen.has(key))errors.push('Duplicate career URL');seen.add(key);
 }
 return {valid:!errors.length,errors,count:pack.records.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const r=validateMixed(JSON.parse(readFileSync(process.argv[2]||'','utf8')));if(!r.valid){r.errors.forEach(x=>console.error(x));process.exitCode=1}else console.log('Validated '+r.count+' sourced opportunities; no sends or applications.');}
 catch(e){console.error(e.message);process.exitCode=1}
}
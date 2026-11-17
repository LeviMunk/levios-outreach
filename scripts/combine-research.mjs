// Merge job and business research, prioritizing qualified Appleton-area jobs.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
function load(file){try{const x=JSON.parse(readFileSync(file,'utf8'));return Array.isArray(x.records)?x.records:[]}catch{return []}}
const jobs=load('research-output/jobs.json'),business=load('research-output/business.json');
const local=jobs.filter(r=>r.locationBucket==='local20'),remote=jobs.filter(r=>r.locationBucket==='remote');
const businessSlots=Math.min(4,business.length);const jobSlots=12-businessSlots;
const records=[...local,...remote].slice(0,jobSlots).concat(business.slice(0,businessSlots));
mkdirSync('research-output',{recursive:true});
writeFileSync('research-output/candidates.json',JSON.stringify({records,strategies:[]},null,2));
console.log('JobOS research: '+local.length+' local jobs, '+remote.length+' eligible remote jobs, '+business.length+' business prospects; '+records.length+' records queued for validation.');
if(!records.length)throw Error('No qualified source-backed opportunities; no batch submitted.');

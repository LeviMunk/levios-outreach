// JobOS public employer-hosted job feed. No login, applications, or outbound communication.
import {mkdirSync,writeFileSync} from 'node:fs';
const SOURCES=[
 ['gh','michelscorporation','Michels Corporation'],['gh','maxcessinternational','Maxcess International'],['gh','cafortune','C.A. Fortune'],['gh','bestversionmedia','Best Version Media'],
 ['gh','horacemannagents','Horace Mann'],['lever','ppwi','Planned Parenthood of Wisconsin'],
 ['lever','allegiantair','Allegiant Air'],['gh','twilio','Twilio'],
 ['gh','algolia','Algolia'],['gh','medispend','MediSpend'],
 ['gh','guidelighthealth','Guidelight Health'],['gh','harrowhealth','Harrow'],
 ['gh','oneimaging','OneImaging'],['gh','talkdesk2','Talkdesk'],
 ['gh','gomotive','Motive'],['gh','newsela','Newsela'],['gh','honeycomb','Honeycomb'],['gh','supplyhouse','SupplyHouse.com'],['gh','muckrack','Muck Rack'],['gh','peoplefinders','PeopleFinders'],['gh','mergeworld','MERGE'],
 ['gh','surgerypartners','Surgery Partners'],['gh','reddit','Reddit'],['gh','mercury','Mercury']
];
// Approximate city-centre straight-line distances, NOT exact workplace or driving distances.
// Conservatively include only cities safely inside a 20-mile radius.
const MILES={appleton:0,menasha:4.3,neenah:6.2,kimberly:3.8,'little chute':5,kaukauna:9.2,'grand chute':4,greenville:8,'combined locks':5.6,'fox crossing':7,darboy:6,sherwood:11.9};
const TITLE=/automation analyst|business (?:systems? )?analyst|business intelligence|marketing (?:data |performance |operations |analytics |insights |strategy )?(?:analyst|specialist|coordinator|strategist|manager)|revenue operations|crm (?:analyst|specialist|manager)|customer insights|growth analyst|social media (?:manager|strategist|analyst)|digital marketing (?:analyst|strategist|manager)/i;
const EXCLUDE=/internship|vice president|head of |executive director|merchandis|insurance agent|sales representative/i;
const clean=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
const website=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['job-boards.greenhouse.io','job-boards.eu.greenhouse.io','boards.greenhouse.io','boards.eu.greenhouse.io','jobs.lever.co'].includes(x.hostname.toLowerCase())}catch{return false}};
function place(location,body){
 const l=String(location||'').toLowerCase(),d=String(body||'').toLowerCase();
 for(const [city,miles] of Object.entries(MILES)){
  const rx=new RegExp('\\b'+city+'\\s*,?\\s*(?:wi|wisconsin)\\b','i');
  if(rx.test(l))return {locationBucket:'local20',distanceMiles:String(miles),remoteWisconsinEligible:'',local:true};
 }
 const remote=/\bremote\b/i.test(l)&&/\b(us|usa|u\.s\.|united states)\b/i.test(l);
 const eligible=/anywhere (?:in|within) (?:the )?(?:united states|u\.s\.|usa)|all 50 states|any (?:us|u\.s\.) state/i.test(d);
 const exclusion=/(?:except|excluding|not available in|cannot hire in).{0,150}wisconsin/i.test(d);
 return remote&&eligible&&!exclusion?{locationBucket:'remote',distanceMiles:'',remoteWisconsinEligible:'yes',local:false}:null;
}
function compensation(body){
 const x=String(body||'').match(/\$\s*(\d{2,3}),\d{3}\s*(?:-|–|—|to)\s*\$\s*(\d{2,3}),\d{3}/);
 if(!x)return {salary:'',compensationFit:'unknown'};
 const a=Number(x[1])*1000,b=Number(x[2])*1000;
 if(a<40000||a>250000||b<a)return {salary:'',compensationFit:'unknown'};
 return {salary:'$'+a.toLocaleString('en-US')+'–$'+b.toLocaleString('en-US'),compensationFit:a>=75000?'target':b>=60000?'minimum':'below'};
}
export function candidate(job,day=new Date().toISOString().slice(0,10)){
 if(!job||!website(job.url)||!TITLE.test(job.title||'')||EXCLUDE.test(job.title||''))return null;
 const geo=place(job.location,job.body);if(!geo)return null;
 const pay=compensation(job.body);if(pay.compensationFit==='below')return null;
 return {name:job.company,type:'Career',stage:'Discovered',industry:'Marketing / Business Analytics',
  jobTitle:job.title.slice(0,180),jobUrl:job.url,sourceUrl:job.url,researchDate:day,verification:'official-site',
  location:String(job.location).slice(0,120),...geo,roleFit:'strong',applicationFriction:'',...pay,
  channel:'Email',email:'',person:'',draft:'',subject:'',cc:'',followup:'',
  angle:'Employer-hosted application. Review requirements and application form.',
  notes:'Source: public employer ATS. Local distance is approximate city-centre straight-line miles, not driving distance.'};
}
export async function discover(fetcher=fetch){
 const output=[],errors=[];
 for(const [kind,slug,company] of SOURCES){
  try{
   const endpoint=kind==='gh'?'https://boards-api.greenhouse.io/v1/boards/'+slug+'/jobs?content=true':'https://api.lever.co/v0/postings/'+slug+'?mode=json';
   const response=await fetcher(endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const raw=await response.json(),jobs=kind==='gh'?raw.jobs:raw;
   if(!Array.isArray(jobs))throw Error('not a job list');
   for(const x of jobs.slice(0,1000)){
    const job=kind==='gh'?{company,title:x.title,location:x.location?.name||'',body:clean(x.content),url:x.absolute_url}:{company,title:x.text,location:x.categories?.location||'',body:clean(x.descriptionPlain||x.description),url:x.hostedUrl};
    const record=candidate(job);if(record)output.push(record);
   }
  }catch(e){errors.push(slug+': '+e.message)}
 }
 const seen=new Set();
 const records=output.filter(r=>{const k=r.jobUrl.split('?')[0].toLowerCase();if(seen.has(k))return false;seen.add(k);return true})
  .sort((a,b)=>Number(b.locationBucket==='local20')-Number(a.locationBucket==='local20')||Number(b.compensationFit==='target')-Number(a.compensationFit==='target')).slice(0,12);
 return {records,errors,sources:SOURCES.length};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const r=await discover();mkdirSync('research-output',{recursive:true});
 writeFileSync('research-output/jobs.json',JSON.stringify({records:r.records,strategies:[]},null,2));
 writeFileSync('research-output/job-report.json',JSON.stringify({sources:r.sources,qualified:r.records.length,errors:r.errors},null,2));
 console.log('JobOS: '+r.sources+' employer boards checked, '+r.records.length+' qualified matches, '+r.errors.length+' source errors.');
}

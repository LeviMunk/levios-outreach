/* Stage validated unsent candidates in the existing owner-only Research Inbox.
 * The service-role key MUST live in GitHub Actions secrets, not public source.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateResearchPack} from './validate-research-pack.mjs';
const base='https://yfqtyuynsumvwhnmnswk.supabase.co/rest/v1';
const key=process.env.SUPABASE_SERVICE_ROLE_KEY, owner=process.env.OUTREACH_OWNER_USER_ID;
if(!key||!owner)throw Error('Missing GitHub Actions secrets SUPABASE_SERVICE_ROLE_KEY and/or OUTREACH_OWNER_USER_ID. No batch staged.');
if(!/^[a-f0-9-]{36}$/i.test(owner))throw Error('Invalid OUTREACH_OWNER_USER_ID UUID.');
const headers={'apikey':key,'authorization':'Bearer '+key,'content-type':'application/json'};
async function api(path,options={}){
  const r=await fetch(base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`Supabase research API HTTP ${r.status}: ${(await r.text()).slice(0,250)}`);
  if(r.status===204)return [];
  return r.json();
}
function norm(v){return String(v||'').toLowerCase().trim()}
function domain(v){try{return new URL(v).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}
function id(r){return norm(r.name)+'|'+domain(r.website)}
const candidatePack=JSON.parse(readFileSync('research-output/candidates.json','utf8'));
const validation=validateResearchPack(candidatePack);
if(!validation.valid)throw Error('Research pack invalid: '+validation.errors.join('; '));
const existing=await api('/outreach_research_batches?select=payload&user_id=eq.'+encodeURIComponent(owner)+'&limit=1000');
if(existing.length>=1000)throw Error('Research batch history exceeds 1000 records; refusing incomplete deduplication.');
const seen=new Set(existing.flatMap(b=>(b.payload?.records||[]).map(id)));
const newRecords=candidatePack.records.filter(r=>!seen.has(id(r)));
const selected=newRecords.slice(0,12);
writeFileSync('research-output/report.json',JSON.stringify({discovered:candidatePack.records.length,alreadyInResearchInbox:candidatePack.records.length-newRecords.length,staging:selected.length,source:'OpenStreetMap directory tags; human verification required'},null,2));
if(!selected.length){console.log('No new directory candidates. No batch staged.');process.exit(0)}
const payload={records:selected,strategies:[]};
const checked=validateResearchPack(payload);
if(!checked.valid)throw Error('Selected research batch invalid: '+checked.errors.join('; '));
const digest=createHash('sha256').update(JSON.stringify(selected.map(id).sort())).digest('hex').slice(0,24);
const batch_key='osm-weekly-'+digest;
await api('/outreach_research_batches?on_conflict=user_id,batch_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({user_id:owner,batch_key,origin:'research',payload,status:'queued'})});
console.log(`Staged up to ${selected.length} unsent directory candidates. No email or Gmail action performed.`);

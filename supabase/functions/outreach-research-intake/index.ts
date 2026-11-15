// LeviOS Outreach: OIDC-gated research intake; no user-provided secrets in GitHub.
// verify_jwt=false is intentional: this route verifies a *GitHub-signed* OIDC JWT.
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="levios-outreach-research";
const REPO="LeviMunk/levios-outreach";
const WORKFLOW=REPO+"/.github/workflows/weekly-research.yml@refs/heads/main";
const OWNER_EMAIL="levivanstap@gmail.com";
const bytes=x=>Uint8Array.from(atob(x.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(x.length/4)*4,"=")),c=>c.charCodeAt(0));
function fail(status,message){return new Response(JSON.stringify({error:message}),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
async function authorize(auth){
 const raw=auth?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
 if(!raw)return false;
 const sections=raw.split(".");if(sections.length!==3||raw.length>12000)return false;
 let header,claims;try{header=JSON.parse(new TextDecoder().decode(bytes(sections[0])));claims=JSON.parse(new TextDecoder().decode(bytes(sections[1])))}catch{return false}
 if(header.alg!=="RS256"||typeof header.kid!=="string"||header.kid.length>180||header.typ&&header.typ!=="JWT")return false;
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!==ISSUER||claims.aud!==AUDIENCE||claims.repository!==REPO||
 claims.workflow_ref!==WORKFLOW||claims.ref!=="refs/heads/main"||
 !["schedule","workflow_dispatch"].includes(claims.event_name)||
 claims.repository_visibility!=="public"||
 typeof claims.exp!=="number"||claims.exp<=now||claims.exp>now+600||
 typeof claims.iat!=="number"||claims.iat>now+60||claims.iat<now-600||
 typeof claims.nbf==="number"&&claims.nbf>now+60)return false;
 try{
  const jwksResponse=await fetch(ISSUER+"/.well-known/jwks",{signal:AbortSignal.timeout(8000)});
  if(!jwksResponse.ok)return false;
  const {keys}=await jwksResponse.json();
  const jwk=keys?.find(k=>k.kid===header.kid&&k.kty==="RSA"&&k.use==="sig");
  if(!jwk)return false;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(sections[2]),new TextEncoder().encode(sections[0]+"."+sections[1]));
 }catch{return false}
}
function isUrl(v){try{const u=new URL(v);return u.protocol==="https:"||u.protocol==="http:"}catch{return false}}
function host(v){try{return new URL(v).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}}
function validRecord(r){
 if(!r||typeof r!=="object"||Array.isArray(r))return false;
 if(typeof r.name!=="string"||!r.name.trim()||r.name.length>150||
 r.type!=="Business"||r.stage!=="Researched"||r.email!==""||
 r.verification!=="directory"||!isUrl(r.website)||!isUrl(r.sourceUrl)||
 !/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(r.sourceUrl)||
 typeof r.location!=="string"||!["Madison, WI","Milwaukee, WI"].includes(r.location)||
 typeof r.industry!=="string"||!r.industry.trim()||
 typeof r.angle!=="string"||r.angle.length<15||r.angle.length>1200||
 !/^\d{4}-\d{2}-\d{2}$/.test(r.researchDate)||
 r.researchDate>new Date().toISOString().slice(0,10)||
 r.draft||r.subject||r.cc||r.followup)return false;
 return true;
}
const headers=(key)=>({apikey:key,Authorization:"Bearer "+key,"content-type":"application/json"});
async function db(url,key,path,opts={}){
 const res=await fetch(url+"/rest/v1/"+path,{...opts,headers:{...headers(key),...opts.headers},signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error("Database operation failed: "+res.status);
 return res.status===204?[]:res.json();
}
Deno.serve(async req=>{
 if(req.method!=="POST")return fail(405,"Method not allowed");
 if(!await authorize(req.headers.get("authorization")))return fail(401,"Invalid GitHub workflow identity");
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return fail(503,"Server configuration unavailable");
 let pack;try{const body=await req.text();if(body.length>100000)return fail(413,"Research payload too large");pack=JSON.parse(body)}catch{return fail(400,"Invalid JSON")}
 if(!pack||!Array.isArray(pack.records)||pack.records.length<1||pack.records.length>12||
 !pack.records.every(validRecord)||pack.strategies?.length)return fail(422,"Only sourced, unsent directory research is accepted");
 const inBatch=new Set();
 for(const r of pack.records){const k=r.name.trim().toLowerCase()+"|"+host(r.website);if(inBatch.has(k))return fail(422,"Duplicate lead within submitted batch");inBatch.add(k)}
 try{
  // Existing owner-only inbox provides stable identity. This endpoint never takes user_id from caller.
  const existing=await db(url,key,"outreach_research_batches?select=user_id,payload&limit=1000");
  if(existing.length>=1000)return fail(409,"History exceeds safe deduplication window");
  const owners=[...new Set(existing.map(x=>x.user_id))];
  if(owners.length!==1)return fail(409,"Owner-only Research Inbox not uniquely initialized");
  const ownerId=owners[0];
  const identity=await fetch(url+"/auth/v1/admin/users/"+ownerId,{headers:headers(key),signal:AbortSignal.timeout(12000)});
  if(!identity.ok)return fail(503,"Owner identity unavailable");
  const owner=await identity.json();
  if(owner?.email?.toLowerCase()!==OWNER_EMAIL)return fail(403,"Owner identity mismatch");
  const seen=new Set(existing.flatMap(b=>(b.payload?.records||[]).map(r=>r.name?.trim().toLowerCase()+"|"+host(r.website))));
  const fresh=pack.records.filter(r=>!seen.has(r.name.trim().toLowerCase()+"|"+host(r.website)));
  if(!fresh.length)return new Response(JSON.stringify({staged:0,skipped:pack.records.length,status:"duplicates"}),{headers:{"content-type":"application/json"}});
  const ids=fresh.map(r=>r.name.toLowerCase()+"|"+host(r.website)).sort().join("\n");
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ids))),b=>b.toString(16).padStart(2,"0")).join("").slice(0,24);
  const batch={user_id:ownerId,batch_key:"osm-weekly-"+hash,origin:"research",payload:{records:fresh,strategies:[]},status:"queued"};
  await db(url,key,"outreach_research_batches?on_conflict=user_id,batch_key",{
   method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(batch)
  });
  return new Response(JSON.stringify({staged:fresh.length,skipped:pack.records.length-fresh.length,status:"queued"}),{headers:{"content-type":"application/json"}});
 }catch(err){console.error("Research intake error:",String(err));return fail(500,"Research intake unavailable")}
});

/* Weekly, rate-limited candidate discovery from public OpenStreetMap tags.
 * This is DIRECTORY research, not verified decision-maker or email discovery.
 * Avoid bulk-copied Google Places data, inbox outreach, and fabricated claims.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
const ENDPOINT='https://overpass.kumi.systems/api/interpreter';
const box={
  'Madison':[42.99,-89.57,43.18,-89.23],
  'Milwaukee':[42.92,-88.14,43.18,-87.85],
  'Sheboygan':[43.66,-87.79,43.84,-87.65]
};
const origin=[44.2619,-88.4154];
const distanceMiles=(lat,lon)=>{const rad=Math.PI/180,dLat=(lat-origin[0])*rad,dLon=(lon-origin[1])*rad,a=Math.sin(dLat/2)**2+Math.cos(origin[0]*rad)*Math.cos(lat*rad)*Math.sin(dLon/2)**2;return 3958.76*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
const categories={office:'Professional services',shop:'Retail services',craft:'Trades and contractors',amenity:'Local services'};
const today=()=>new Date().toISOString().slice(0,10);
const host=v=>{try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol))return '';return u.hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}};
const web=v=>{if(typeof v!=='string')return '';const s=v.trim();try{const u=new URL(s.startsWith('www.')?'https://'+s:s);return host(u.href)?u.href:''}catch{return ''}};
const banned=/bakery|pastry|bread|alcohol|casino|tobacco|vape|pharmacy|medical|gun|firearm/i;
export function candidate(element,city,stamp=today()){
  const lat=element.lat??element.center?.lat,lon=element.lon??element.center?.lon;
  // Strict geographic gate for newly discovered outreach prospects.
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||distanceMiles(lat,lon)<50)return null;
  const t=element?.tags||{};
  const name=String(t.name||'').trim(), site=web(t.website||t['contact:website']||'');
  if(!name||name.length>150||!site||!element?.id||!['node','way','relation'].includes(element.type))return null;
  const kind=Object.keys(categories).find(k=>t[k]&&t[k]!=='yes');
  if(!kind||banned.test([name,t.shop,t.amenity,t.office,t.craft].join(' ')))return null;
  // Exclude chains and generic directory/marketplace sites: relevant seller website only.
  const email=String(t['contact:email']||t.email||'').trim().slice(0,160);
  const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
  const possibleSocial=web(t['contact:instagram']||t['contact:facebook']||t['contact:linkedin']||t.facebook||t.instagram||'');
  const socialHost=host(possibleSocial);
  const profile=/^(instagram\.com|facebook\.com|linkedin\.com)$/.test(socialHost)?possibleSocial:'';
  // A website alone is not an actionable outreach lead.
  if(!validEmail&&!profile)return null;
  const websiteHost=host(site);
  if(!websiteHost||/(facebook|instagram|linktr.ee|yelp|google|wixsite|wordpress|maps\.apple)\./i.test(websiteHost))return null;
  const category=String(t[kind]).replace(/_/g,' ').slice(0,64);
  const cleaning=/clean(?:er|ing|ers)?|maid|housekeep|janitorial|carpet wash|window wash|power wash|pressure wash/i.test([name,category,t.shop,t.amenity,t.office,t.craft].join(' '));
  const industry=cleaning?'Cleaning Services':kind==='office'?'Professional services':kind==='craft'?'Trades and contractors':kind==='shop'?'Retail services':'Local services';
  return {name,type:'Business',industry,location:city+', WI',website:site,email:validEmail,profile,channel:validEmail?'Email':(socialHost==='instagram.com'?'Instagram':'Other'),
    stage:'Researched',sourceUrl:`https://www.openstreetmap.org/${element.type}/${element.id}`,offerModule:'Customer Follow-Up & Revenue Dashboard',
    distanceMiles:Math.round(distanceMiles(lat,lon)),researchDate:stamp,verification:'directory',angle:cleaning?'Hypothesis: repeat-booking reminders and customer reactivation may be valuable for cleaning services. No actual rebooking problem has been established.':`Explore whether a ${category} business could benefit from faster inquiry follow-up, conversion measurement, or customer reactivation; no site defect has been established.`,
    notes:'Contact route is published in OpenStreetMap directory tags and may be stale; confirm on business site or social profile before sending. No decision-maker identity inferred. © OpenStreetMap contributors; openstreetmap.org/copyright.'};
}
function query() {
  // Small, bounded queries once weekly; do not request contacts or private personal data.
  const blocks=Object.values(box).flatMap(([s,w,n,e])=>
    ['office','shop','craft','amenity'].map(k=>`nwr["${k}"]["name"]["website"](${s},${w},${n},${e});nwr["${k}"]["name"]["contact:website"](${s},${w},${n},${e});`)).join('');
  return '[out:json][timeout:40];('+blocks+');out tags center 400;';
}
export async function discover({fetcher=fetch,stamp=today()}={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),55000);
  try {
    const r=await fetcher(ENDPOINT,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','User-Agent':'LeviOS-Outreach-Research/1.0 (https://github.com/LeviMunk/levios-outreach)'},body:new URLSearchParams({data:query()}),signal:controller.signal});
    if(!r.ok)throw Error('Overpass returned HTTP '+r.status);
    const data=await r.json();
    if(!Array.isArray(data.elements))throw Error('Invalid directory response');
    const items=[];
    for(const e of data.elements){
      const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
      const city=Object.entries(box).find(([,b])=>lat>=b[0]&&lat<=b[2]&&lon>=b[1]&&lon<=b[3])?.[0];
      if(!city)continue;
      const c=candidate(e,city,stamp);
      if(c)items.push(c);
    }
    const seen=new Set();
    return items.filter(x=>{const key=x.name.toLowerCase()+'|'+host(x.website);if(seen.has(key))return false;seen.add(key);return true;})
      .sort((a,b)=>Number(b.industry==='Cleaning Services')-Number(a.industry==='Cleaning Services')||a.name.localeCompare(b.name)).slice(0,40);
  }finally{clearTimeout(timeout)}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const records=await discover();
  if(!records.length)throw Error('No eligible directory prospects. Refusing empty research batch.');
  mkdirSync('research-output',{recursive:true});
  writeFileSync('research-output/business.json',JSON.stringify({records,strategies:[]},null,2));
  console.log(`Collected ${records.length} directory-sourced candidates with contact routes for review.`);
}

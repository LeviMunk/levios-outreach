/* Validate sourced LeviOS research before staging an owner-only inbox batch.
 * This is a quality gate, NOT a sender or a Supabase credential client.
 * Usage: node scripts/validate-research-pack.mjs path/to/pack.json
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function url(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch { return null; }
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0,10) === value;
}
function norm(value) { return String(value || '').trim().toLowerCase(); }
function domain(value) {
  const parsed = url(value);
  return parsed?.hostname.toLowerCase().replace(/^www\./, '') || '';
}
export function validateResearchPack(pack, { today = new Date().toISOString().slice(0,10) } = {}) {
  const errors = [], warnings = [];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { valid:false, errors:['Pack must be an object.'], warnings };
  if (!Array.isArray(pack.records) || pack.records.length < 1 || pack.records.length > 50)
    errors.push('records must contain 1–50 prospects.');
  if (pack.strategies !== undefined && (!Array.isArray(pack.strategies) || pack.strategies.length > 50))
    errors.push('strategies must be an array of at most 50.');
  if (errors.length) return {valid:false, errors, warnings};
  const seen = new Set();
  for (const [i, r] of pack.records.entries()) {
    const p = `records[${i}]`;
    if (!r || typeof r !== 'object' || Array.isArray(r)) {errors.push(`${p}: expected an object.`);continue;}
    if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 150) errors.push(`${p}: valid company name required.`);
    if (r.type !== 'Business') errors.push(`${p}: research inbox only accepts Business prospects.`);
    if (!['', 'Researched', undefined].includes(r.stage)) errors.push(`${p}: stage must be Researched or unset.`);
    if (typeof r.industry !== 'string' || !r.industry.trim()) errors.push(`${p}: industry required.`);
    if (typeof r.location !== 'string' || !r.location.trim()) errors.push(`${p}: location required.`);
    if (!url(r.website)) errors.push(`${p}: valid website URL required.`);
    if (!url(r.sourceUrl)) errors.push(`${p}: direct public research source URL required.`);
    if (!date(r.researchDate) || r.researchDate > today) errors.push(`${p}: valid, nonfuture researchDate required.`);
    if (!['official-site','directory','unverified'].includes(r.verification)) errors.push(`${p}: verification label required.`);
    if (typeof r.angle !== 'string' || r.angle.trim().length < 15) errors.push(`${p}: concrete nonempty opportunity hypothesis required.`);
    if (r.email && (!emailPattern.test(r.email) || r.verification !== 'official-site'))
      errors.push(`${p}: populated email needs valid format and official-site verification.`);
    if (r.email && domain(r.website) !== domain(r.sourceUrl))
      warnings.push(`${p}: contact email must be manually verified on the cited official site.`);
    if (r.draft || r.subject || r.cc || r.followup) errors.push(`${p}: research batches cannot pre-fill outreach or follow-ups.`);
    const key = norm(r.name) + '|' + domain(r.website);
    if (seen.has(key)) errors.push(`${p}: duplicate business and domain in batch.`);
    seen.add(key);
    if (r.verification === 'unverified') warnings.push(`${p}: unverified; review before contacting.`);
  }
  const strategies = new Set();
  for (const [i,s] of (pack.strategies || []).entries()) {
    const p = `strategies[${i}]`;
    if (!s || typeof s !== 'object' || Array.isArray(s) ||
        !/^[A-Za-z0-9_-]{3,80}$/.test(String(s.id || '')) ||
        !['name','question','a','b'].every(k => typeof s[k] === 'string' && s[k].trim()))
      errors.push(`${p}: id, name, question and both variants required.`);
    else if (strategies.has(s.id)) errors.push(`${p}: duplicate strategy id.`);
    else strategies.add(s.id);
  }
  return {valid:errors.length === 0, errors, warnings, count:pack.records.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) {console.error('Usage: node scripts/validate-research-pack.mjs pack.json');process.exitCode=2;}
  else {
    try {
      const result = validateResearchPack(JSON.parse(readFileSync(file,'utf8')));
      for (const w of result.warnings) console.warn('Warning:', w);
      for (const e of result.errors) console.error('Error:', e);
      if (result.valid) console.log(`Validated ${result.count} sourced prospects; no messages sent.`);
      else process.exitCode=1;
    } catch(e) {console.error('Invalid research pack:',e.message);process.exitCode=1;}
  }
}

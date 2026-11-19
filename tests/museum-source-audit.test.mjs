import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const data=JSON.parse(read('research/case-data.json'));
test('all 37 case pages distinguish source grades from docket review',()=>{
 let checked=0;
 for(const [folder,group] of [['cases',data.county],['federal',data.federal]]){
  for(const rec of group){
   const html=read(folder+'/'+rec.slug+'/index.html');
   assert.match(html,/class="record-audit"/,rec.slug);
   assert.match(html,/Source and docket status/,rec.slug);
   assert.match(html,/Last documented source review:.*November 18, 2026/,rec.slug);
   assert.match(html,/full (?:federal )?trial-court docket has not been independently reviewed/i,rec.slug);
   assert.match(html,/corrections\//,rec.slug);
   if(folder==='cases')assert.match(html,/Sonoma court number:/,rec.slug);
   else assert.match(html,/Federal court/,rec.slug);
   checked++;
  }
 }
 assert.equal(checked,36);
 const petros=read('cases/constantine-petros/index.html');
 assert.match(petros,/SCR-715528-1/);
 assert.match(petros,/class="record-audit"/);
 assert.match(petros,/export itself is not hosted/);
});
test('every county profile is included in records-acquisition checklist',()=>{
 const csv=read('research/court-records-checklist.csv');
 const md=read('research/COURT-RECORDS-CHECKLIST.md');
 for(const rec of data.county){
  assert.ok(csv.includes('"'+rec.name.replace(/"/g,'""')+'"'),rec.slug);
  assert.ok(md.includes('../cases/'+rec.slug+'/'),rec.slug);
  if(rec.caseNo)assert.ok(md.includes(rec.caseNo),rec.slug);
 }
 assert.equal(data.county.filter(c=>!!c.caseNo).length,2);
 assert.ok(md.includes('SCR-715528-1'));
 assert.equal((md.match(/\| \*\*Pending\*\* \|/g)||[]).length,28);
});
test('plain-language grade explanation and corrections are publicly accessible',()=>{
 assert.match(read('index.html'),/Documented case summaries/);
 assert.doesNotMatch(read('index.html'),/Verified case files/);
 assert.match(read('cases/index.html'),/What the source grades mean/);
 assert.match(read('federal/index.html'),/What the source grades mean/);
 assert.match(read('corrections/index.html'),/Do not post sealed/);
 assert.match(read('sitemap.xml'),/\/corrections\//);
});

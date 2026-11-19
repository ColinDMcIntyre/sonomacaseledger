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
   assert.ok(html.includes('Last documented source review:</strong> '+(rec.courtRecordReviewedOn?'November 19, 2026':'November 18, 2026')),rec.slug);
   assert.match(html,/full (?:federal )?trial-court docket has not been independently reviewed/i,rec.slug);
   assert.match(html,/corrections\//,rec.slug);
   if(folder==='cases'){
    assert.match(html,/Sonoma court number:/,rec.slug);
    if(rec.caseNo)assert.ok(html.includes('<code>'+rec.caseNo+'</code>'),rec.slug);
   }
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
 assert.equal(data.county.filter(c=>!!c.caseNo).length,12);
 assert.ok(md.includes('SCR-715528-1'));
 assert.equal((md.match(/\| \*\*Pending\*\* \|/g)||[]).length,18);
});
test('plain-language grade explanation and corrections are publicly accessible',()=>{
 assert.match(read('index.html'),/Documented case summaries/);
 assert.doesNotMatch(read('index.html'),/Verified case files/);
 assert.match(read('cases/index.html'),/What the source grades mean/);
 assert.match(read('federal/index.html'),/What the source grades mean/);
 assert.match(read('corrections/index.html'),/Do not post sealed/);
 assert.match(read('sitemap.xml'),/\/corrections\//);
});

test('matched criminal cases stay distinct from unrelated same-name files',()=>{
 const bySlug=Object.fromEntries(data.county.map(r=>[r.slug,r]));
 assert.equal(bySlug['karen-holzworth'].caseNo,'SCR-627215-2');
 assert.equal(bySlug['jeffrey-holzworth'].caseNo,'SCR-627215-1');
 assert.equal(bySlug['tina-cabudoy'].caseNo,'24CR08926');
 assert.equal(bySlug['amanda-rodgers-graton-casino'].caseNo,'SCR-729817-1');
 for(const slug of ['michael-rosen','suede-lee-barganski','ana-carrillo','miguel-martinez-herrera','gabriel-desantos','casey-harding']){
  assert.equal(bySlug[slug].caseNo,'',slug+' has no matched criminal docket');
 }
 assert.ok(read('research/COURT-PDF-AUDIT.md').includes('28'));
});

test('court record status register matches JSON case-number coverage',()=>{
 const html=read('records/index.html');
 assert.match(html,/13<\/strong>/);
 assert.match(html,/18<\/strong>/);
 assert.match(html,/28<\/strong>/);
 assert.match(read('sitemap.xml'),/\/records\//);
 assert.equal((html.match(/class="record-entry"/g)||[]).length,31);
 assert.equal((html.match(/Court match found/g)||[]).length,13);
 for(const rec of data.county){
  assert.ok(html.includes('id="'+rec.slug+'"'),rec.slug);
  if(rec.caseNo)assert.ok(html.includes('<code>'+rec.caseNo+'</code>'),rec.slug);
 }
 assert.doesNotMatch(html,/drive\.google\.com\/file/);
 assert.match(read('cases/elana-cohen-roth/index.html'),/August 7, 2026/);
 assert.match(read('index.html'),/Read the court record, not just the headline/);
 assert.doesNotMatch(read('index.html'),/class="kicker">Criminal case · Updated 2020 disposition/);
});

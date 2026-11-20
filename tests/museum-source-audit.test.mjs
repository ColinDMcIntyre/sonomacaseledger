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
 assert.match(petros,/unredacted export itself is not hosted/);
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

test('every county case page links to its match status',()=>{
 for(const rec of data.county)assert.ok(read('cases/'+rec.slug+'/index.html').includes('../../records/#'+rec.slug),rec.slug);
 assert.ok(read('cases/constantine-petros/index.html').includes('../../records/#constantine-petros'));
});

test('court PDF intake manifest blocks accidental raw-file publication',()=>{
 const manifest=JSON.parse(read('research/COURT-PDF-MANIFEST.json'));
 assert.equal(manifest.documents.length,28);
 assert.equal(manifest.documents.reduce((sum,x)=>sum+x.pages,0),537);
 const matched=manifest.documents.filter(x=>x.classification==='criminal_match');
 assert.equal(matched.length,14);
 assert.equal(matched.reduce((sum,x)=>sum+x.pages,0),474);
 assert.equal(new Set(matched.map(x=>x.profileSlug)).size,13);
 assert.equal(manifest.documents.filter(x=>x.searchableTextLayer).length,4);
 assert.equal(manifest.documents.filter(x=>x.publicationStatus!=='WITHHELD_PENDING_FULL_PAGE_PRIVACY_AND_DISPOSITION_REVIEW').length,0);
 for(const x of manifest.documents)assert.ok(data.county.some(y=>y.slug===x.profileSlug)||x.profileSlug==='constantine-petros');
 assert.match(read('records/index.html'),/COURT-PDF-MANIFEST.md/);
});

test('public redacted source PDFs are full printout reproductions, not original leaks',()=>{
 const fs=readFileSync;
 const manifest=JSON.parse(read('research/COURT-PDF-MANIFEST.json'));
 assert.equal(manifest.publicPDFsHosted,5);
 assert.equal(manifest.privacyReviewedOriginalPages,44);
 const sources={
  'constantine-petros':'SCR-715528-1_PublicCopy.pdf',
  'tina-cabudoy':'24CR08926_PublicCopy.pdf',
  'amanda-rodgers-graton-casino':'SCR-729817-1_PublicCopy.pdf',
  'lisa-fatu':'SCR-757420-1_PublicCopy.pdf',
  'frances-farias':'SCR-706951-1_PublicCopy.pdf'
 };
 for(const [slug,filename] of Object.entries(sources)){
  const bytes=fs(new URL('../public-records/'+filename,import.meta.url));
  assert.ok(bytes.length>100000,filename);
  assert.ok(bytes.subarray(0,7).toString().startsWith('%PDF-'),filename);
  assert.ok(read('cases/'+slug+'/index.html').includes('public-records/'+filename),slug);
  assert.ok(read('records/index.html').includes('public-records/'+filename),slug);
 }
 for(const doc of manifest.documents){
  assert.equal(doc.publicationStatus,'WITHHELD_PENDING_FULL_PAGE_PRIVACY_AND_DISPOSITION_REVIEW','originals remain withheld');
 }
 assert.equal(manifest.documents.filter(x=>x.publicRedactedCopy).length,5);
});

test('Broin and Karen Holzworth retain verified post-conviction relief dates',()=>{
 const keyed=Object.fromEntries(data.county.map(x=>[x.slug,x]));
 assert.equal(keyed['daniel-broin'].laterRelief.orderDate,'2021-06-10');
 assert.equal(keyed['karen-holzworth'].laterRelief.orderDate,'2018-07-17');
 for(const slug of ['daniel-broin','karen-holzworth']){
  assert.equal(keyed[slug].laterRelief.notAcquittal,true);
  assert.match(read('cases/'+slug+'/index.html'),/post-conviction relief/i);
  assert.match(read('cases/'+slug+'/index.html'),/1203\.4/);
 }
 assert.match(read('research/COURT-PDF-AUDIT.md'),/June 10, 2021/);
 assert.match(read('research/COURT-PDF-AUDIT.md'),/July 17, 2018/);
});

test('PDF relevance audit preserves category distinctions',()=>{
 const report=read('research/RECORD-MATCHING-REVIEW.md');
 const manifest=JSON.parse(read('research/COURT-PDF-MANIFEST.json'));
 assert.equal(manifest.documents.filter(d=>d.classification.startsWith('unrelated_')).length,8);
 assert.equal(manifest.documents.filter(d=>d.classification==='search_result').length,6);
 assert.equal(manifest.documents.filter(d=>d.classification==='criminal_match').length,14);
 for(const item of manifest.documents)assert.ok(report.includes(item.filename),item.filename);
 assert.match(report,/430 pages/);
 assert.match(read('records/index.html'),/RECORD-MATCHING-REVIEW.md/);
});

test('search-result PDFs preserve strong leads without falsely verifying criminal dockets',()=>{
 const manifest=JSON.parse(read('research/COURT-PDF-MANIFEST.json'));
 const lead=read('research/COURT-SEARCH-LEADS.md');
 const expected={
  'Malfa.List.CourtRecords.pdf':'SCR-701902-2',
  'WEBB.CourtRecords.pdf':'SCR-508159-1'
 };
 for(const [filename,num] of Object.entries(expected)){
  const file=manifest.documents.find(x=>x.filename===filename);
  assert.equal(file.classification,'search_result');
  assert.ok(file.candidateCriminalDockets.some(x=>x.caseNumber===num&&x.matchStatus==='strong_candidate_unverified'));
  assert.ok(lead.includes(num));
 }
 assert.equal(manifest.documents.find(x=>x.filename==='BARGANSKI.CourtRecords.pdf').searchResultsVisible,10);
 assert.equal(manifest.documents.find(x=>x.filename==='BARGANSKI.CourtRecords.pdf').searchResultsTotal,13);
 for(const slug of ['christopher-miranda-pamela-malfa','timothy-charles-webb-jr']){
  assert.equal(data.county.find(x=>x.slug===slug).caseNo,'');
 }
});

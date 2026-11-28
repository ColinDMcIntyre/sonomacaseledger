#!/usr/bin/env node
// Edit research/case-briefs.json and run: node scripts/sync-case-briefs.mjs
// Verify without writing: node scripts/sync-case-briefs.mjs --check
import {readFileSync, writeFileSync} from 'node:fs';

const urlFor = path => new URL('../' + path, import.meta.url);
const read = path => readFileSync(urlFor(path),'utf8');
const write = (path,content) => writeFileSync(urlFor(path),content,'utf8');
const source = JSON.parse(read('research/case-briefs.json'));
const caseData = JSON.parse(read('research/case-data.json'));
const esc = v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const countyMap = new Map(caseData.county.map(x=>[x.slug,x]));
const federalMap = new Map(caseData.federal.map(x=>[x.slug,x]));
if(countyMap.size!==30||federalMap.size!==6)throw Error('Unexpected case inventory; review counts before regenerating.');

function evidenceNote(group,slug){
  if(group==='federal')
    return 'Based on the cited federal prosecution or sentencing material; the full federal docket has not been independently audited.';
  if(group==='special')
    return 'Based on Sonoma Superior Court docket SCR-715528-1. The developer has a professional relationship with this defendant; see the disclosure below.';
  if(countyMap.get(slug)?.caseNo)
    return 'Based on the supplied matching Sonoma case-detail export and cited sources; the record is not certified, complete, or continuously monitored.';
  return 'No matching Sonoma criminal case-detail docket has been independently verified. This summary relies on cited reporting or regulatory material and may not include later court actions.';
}

function renderBrief(b,note){
  const row=(heading,value)=>'<div><dt>'+heading+'</dt><dd>'+esc(value)+'</dd></div>';
  return '<!-- READER-BRIEF:START --><section class="reader-brief" aria-label="Plain-language summary">'+
    '<h2>What happened in this case?</h2><p class="reader-brief-lead">'+esc(b.lead)+'</p>'+
    '<dl class="reader-brief-list">'+
    row('What was alleged',b.allegation)+row('Plea or verdict',b.disposition)+
    row('Sentence or restitution',b.sentence)+row('Later developments',b.later)+
    '</dl><p class="reader-brief-source">'+esc(note)+
    ' <a href="#sources">Read the supporting evidence and sources</a>.</p></section><!-- READER-BRIEF:END -->';
}


// The brief register owns all public-facing summary wording. The case register
// owns identity, source links and evidence fields; derived summaries are synced.
const allBriefs={...source.county,...source.federal,...source.special};
const special=caseData.special||{
  'constantine-petros':{
    slug:'constantine-petros',name:'Constantine William Petros',era:'2016–2020',
    subject:'Insurance-related proceeding and post-conviction dismissal',
    details:'The 2020 dismissal was post-conviction relief, not an acquittal or a finding of factual innocence. The available docket does not establish actual time served in custody.',
    amount:'No independently established victim-loss amount displayed',
    amountType:'The case page does not equate an alleged insurance claim value with established financial loss.',
    verification:'Public docket reviewed',caseNo:'SCR-715528-1',
    courtRecordReviewedOn:'2026-11-19',
    courtRecordStatus:'The 11-page Sonoma court-portal export was reviewed; a privacy-redacted reproduction is public. It is not a certified or continuously monitored record.',
    publicRedactedRecordPath:'public-records/SCR-715528-1_PublicCopy.pdf',
    sources:[{label:'Sonoma County Superior Court public case portal',url:'https://sonoma.courts.ca.gov/online-services/case-portal'}]
  }
};
caseData.special=special;
const allRows=[...caseData.county,...caseData.federal,...Object.values(special)];
const rowBySlug=new Map(allRows.map(r=>[r.slug,r]));
function syncData(){
  for(const r of allRows){
    const brief=allBriefs[r.slug];
    if(!brief)throw Error('Missing brief: '+r.slug);
    r.outcome=brief.lead;
    r.brief={allegation:brief.allegation,disposition:brief.disposition,sentence:brief.sentence,later:brief.later};
  }
  const cohen=rowBySlug.get('elana-cohen-roth');
  cohen.courtRecordStatus=cohen.courtRecordStatus.replace('May 2025 jury outcomes','March 2025 jury verdict and May 2025 sentencing');
  for(const r of allRows)if(r.courtRecordStatus)r.courtRecordStatus=r.courtRecordStatus.replaceAll('.. Selected','. Selected');
  const jeff=rowBySlug.get('jeffrey-holzworth');
  jeff.courtRecordStatus=jeff.courtRecordStatus.replace('with only case-header excerpt public','with a case-header and selected evidence excerpts public');
  save('research/case-data.json',JSON.stringify(caseData,null,2)+'\n');
}
function syncIndex(path,group){
  const html=read(path);
  const seen=new Set();
  const next=html.replace(/<article class="card archive-card"[\s\S]*?<\/article>/g,card=>{
    const match=card.match(/<h3><a href="(?:\.\.\/)?(?:cases|federal)\/([^/]+)\/">/);
    if(!match)throw Error('Missing card slug: '+path);
    const slug=match[1],r=rowBySlug.get(slug),brief=allBriefs[slug];
    if(!r||!brief||seen.has(slug))throw Error('Unknown or duplicate card: '+slug);
    seen.add(slug);
    const keywords=[r.name,r.slug,r.subject,r.era,r.caseNo,brief.lead,brief.later].filter(Boolean).join(' ').toLowerCase();
    return card.replace(/data-filter="[^"]*"/,'data-filter="'+esc(keywords)+'"')
      .replace(/<\/h3><p>[\s\S]*?<\/p>/,'</h3><p>'+esc(brief.lead)+'</p>');
  });
  const expected=group==='county'?31:6;
  if(seen.size!==expected)throw Error(path+': expected '+expected+' cards, got '+seen.size);
  save(path,next);
}
function save(path,next){
  const previous=read(path);
  if(next!==previous){changed++;if(!onlyCheck)write(path,next);else console.error('Out of sync:',path);}
}

let changed=0,checked=0;
const onlyCheck=process.argv.includes('--check');
function update(group,slug,b){
  const path=(group==='federal'?'federal/':'cases/')+slug+'/index.html';
  const html=read(path),exp=renderBrief(b,evidenceNote(group,slug));
  const marker=/<!-- READER-BRIEF:START -->[\s\S]*?<!-- READER-BRIEF:END -->/;
  if(!marker.test(html))throw Error('Missing existing summary: '+path);
  let next=html.replace(marker,exp);
  next=next.replace(/(<meta name="description" content=")[^"]*(")/,(_,a,z)=>a+esc(b.lead)+z);
  next=next.replace(/(<meta property="og:description" content=")[^"]*(")/,(_,a,z)=>a+esc(b.lead)+z);
  next=next.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,raw)=>{
    const metadata=JSON.parse(raw);
    metadata.description=b.lead;
    metadata.dateModified=source.editorialRevision||source.asOf;
    return '<script type="application/ld+json">'+JSON.stringify(metadata)+'</script>';
  });
  if(group==='county'&&countyMap.get(slug)?.caseNo){
    next=next.replace('Published reporting is the primary source; the underlying trial-court docket has not been independently reviewed.','Published reporting supports some facts; selected matching court material has also been reviewed. This is not a complete current docket audit.');
  }
  if(slug==='constantine-petros'){
    next=next.replace('Final recorded status: dismissed','Latest documented court action: post-conviction dismissal')
      .replace('The accurate description is that the case ultimately received the dismissals recorded above.','The record documents the four earlier dismissals and the later post-conviction dismissal of the remaining count.')
      .replace('The web developer responsible for this archive has also worked on Constantine Petros\'s personal website.','The web developer responsible for this archive has a professional relationship with Constantine Petros and has worked on his personal website.');
  }
  save(path,next);
  checked++;
}

for(const [slug,b] of Object.entries(source.county)){
  if(!countyMap.has(slug))throw Error('Unrecognized county case slug '+slug);
  update('county',slug,b);
}
for(const [slug,b] of Object.entries(source.federal)){
  if(!federalMap.has(slug))throw Error('Unrecognized federal case slug '+slug);
  update('federal',slug,b);
}
update('special','constantine-petros',source.special['constantine-petros']);
syncData();
syncIndex('cases/index.html','county');
syncIndex('federal/index.html','federal');
if(checked!==37)throw Error('Expected to process 37 cases; processed '+checked);
if(onlyCheck&&changed)process.exitCode=1;
console.log(onlyCheck?'Checked':'Updated',checked,'case profiles;',changed,'need changes');

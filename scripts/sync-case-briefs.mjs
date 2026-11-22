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
    return 'Based on Sonoma Superior Court docket SCR-715528-1. The developer\'s connection to this defendant is disclosed below.';
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
    metadata.dateModified=source.asOf;
    return '<script type="application/ld+json">'+JSON.stringify(metadata)+'</script>';
  });
  if(next!==html){
    changed++;
    if(!onlyCheck)write(path,next);
    else console.error('Out of sync:',path);
  }
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
if(checked!==37)throw Error('Expected to process 37 cases; processed '+checked);
if(onlyCheck&&changed)process.exitCode=1;
console.log(onlyCheck?'Checked':'Updated',checked,'case profiles;',changed,'need changes');

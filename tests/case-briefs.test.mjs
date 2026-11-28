import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const canonical = JSON.parse(read('research/case-data.json'));
const briefs = JSON.parse(read('research/case-briefs.json'));
const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function checkCase(path, brief, opts = {}) {
  const html = read(path);
  const startCount = (html.match(/READER-BRIEF:START/g) || []).length;
  const endCount = (html.match(/READER-BRIEF:END/g) || []).length;
  assert.equal(startCount, 1, path + ': must have exactly one summary start');
  assert.equal(endCount, 1, path + ': must have exactly one summary end');
  const s = html.indexOf('READER-BRIEF:START');
  const e = html.indexOf('READER-BRIEF:END', s);
  const section = html.slice(s, e);
  assert.ok(e > s, path + ': summary markers in order');
  assert.ok(s < html.indexOf('id="sources"'), path + ': summary must come before sources');
  assert.ok(s < html.indexOf('class="summary-grid"'), path + ': summary must come before facts');
  assert.match(section, /What happened in this case\?/);
  assert.match(section, /<dt>What was alleged<\/dt>/);
  assert.match(section, /<dt>Plea or verdict<\/dt>/);
  assert.match(section, /<dt>Sentence or restitution<\/dt>/);
  assert.match(section, /<dt>Later developments<\/dt>/);
  for (const key of ['lead', 'allegation', 'disposition', 'sentence', 'later']) {
    assert.equal(typeof brief[key], 'string', path + ': missing ' + key);
    assert.ok(brief[key].length > 25, path + ': too terse on ' + key);
    assert.ok(section.includes(escapeHtml(brief[key])), path + ': stale ' + key);
  }
  assert.ok(section.includes('href="#sources"'), path + ': missing evidence link');
  assert.match(html, /<ol class="source-list">/, path + ': missing source list');
  const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(script, path + ': JSON-LD is missing');
  const meta = JSON.parse(script[1]);
  assert.equal(meta.description, brief.lead, path + ': structured description out of sync');
  assert.equal(meta.dateModified, briefs.editorialRevision || briefs.asOf, path + ': modification date out of sync');
  if (opts.caseNo) {
    assert.ok(html.includes('<code>' + opts.caseNo + '</code>'), path + ': court ID missing');
    assert.ok(section.includes('matching Sonoma case-detail export'), path + ': matching docket qualification absent');
  }
  if (opts.unmatched) {
    assert.ok(/not (?:been )?(?:independently )?verified|no matching|not established/i.test(section),
      path + ': unmatched outcome must retain explicit limitations');
  }
}

test('all 31 county cases have clear summaries before supporting evidence', () => {
  assert.equal(canonical.county.length, 30);
  assert.equal(Object.keys(briefs.county).length, 30);
  for (const caseRow of canonical.county) {
    const b = briefs.county[caseRow.slug];
    assert.ok(b, 'missing summary for ' + caseRow.slug);
    checkCase('cases/' + caseRow.slug + '/index.html', b, {
      caseNo: caseRow.caseNo,
      unmatched: !caseRow.caseNo
    });
  }
  checkCase('cases/constantine-petros/index.html', briefs.special['constantine-petros']);
});

test('all six federal cases have outcomes and cautions', () => {
  assert.equal(canonical.federal.length, 6);
  assert.equal(Object.keys(briefs.federal).length, 6);
  for (const caseRow of canonical.federal) {
    const b = briefs.federal[caseRow.slug];
    assert.ok(b, 'missing federal summary for ' + caseRow.slug);
    checkCase('federal/' + caseRow.slug + '/index.html', b);
    assert.match(read('federal/' + caseRow.slug + '/index.html'), /full federal docket has not been independently audited/i);
  }
});

test('critical disposition nuances are visible before the evidence', () => {
  for (const slug of ['constantine-petros','karen-holzworth','daniel-broin','amanda-rodgers-graton-casino']) {
    const html = read('cases/' + slug + '/index.html');
    const segment = html.slice(html.indexOf('READER-BRIEF:START'), html.indexOf('READER-BRIEF:END'));
    assert.match(segment, /not an acquittal/i, slug);
    assert.match(segment, /1203\.4/, slug);
  }
  const cb = read('cases/tina-cabudoy/index.html');
  assert.doesNotMatch(cb, /restitution of <h2>Case background<\/h2>/);
  assert.match(cb, /restitution of \$179,306\.98/);
  const lemoine = read('cases/kim-louise-lemoine/index.html');
  assert.match(lemoine, /execution suspended/i);
  assert.match(read('cases/elana-cohen-roth/index.html'), /no reversal or final appellate decision is established/i);
});

test('case index reflects the current court-record inventory', () => {
  const html = read('cases/index.html');
  assert.match(html, /14 criminal case files have been matched/);
  assert.match(html, /17 remain unresolved/);
  assert.match(html, /allegation, plea or verdict, sentence or restitution/);
});

test('all public archive cards, metadata and museum data share the canonical outcome',()=>{
  const all=[...canonical.county,...canonical.federal,...Object.values(canonical.special)];
  const registry={...briefs.county,...briefs.federal,...briefs.special};
  assert.equal(all.length,37);
  for(const row of all){
    const brief=registry[row.slug];
    assert.equal(row.outcome,brief.lead,row.slug);
    for(const k of ['allegation','disposition','sentence','later'])assert.equal(row.brief[k],brief[k],row.slug+': '+k);
    const group=canonical.federal.some(x=>x.slug===row.slug)?'federal':'cases';
    const index=read(group+'/index.html');
    const card=(index.match(/<article class="card archive-card"[\s\S]*?<\/article>/g)||[]).find(c=>c.includes('/'+row.slug+'/'));
    assert.ok(card,row.slug);
    assert.ok(card.includes('<p>'+escapeHtml(brief.lead)+'</p>'),row.slug);
  }
  assert.match(read('museum/museum.js'),/data\.special\?\.\['constantine-petros'\]/);
  assert.match(read('museum/museum.js'),/r\.brief\[key\]/);
  assert.match(canonical.special['constantine-petros'].outcome,/2017.*conviction.*September 17, 2020.*not an acquittal/);
});

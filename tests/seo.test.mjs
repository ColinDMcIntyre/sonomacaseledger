import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {siteOrigin,metaValue,plain} from '../scripts/seo/config.mjs';
import {metadata} from '../scripts/seo/metadata.mjs';
import {visibleSourceLinks} from '../scripts/seo/sources.mjs';
import {caseRegistry} from '../scripts/seo/discovery.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const origin=siteOrigin(process.env.SITE_ORIGIN||undefined);
test('metadata preserves evidence qualifications and rejects stale visible text',()=>{
 const page={path:'/cases/example/',html:'<html><head><title>Example | Sonoma Case Ledger</title><meta name="description" content="Old"></head><body><p class="reader-brief-lead">Later relief has not been verified.</p></body></html>'};
 const record={row:{name:'Example'},brief:{lead:'Later relief has not been verified.'}};
 const result=metadata(page,record,origin);
 assert.equal(metaValue(result.html,'description'),record.brief.lead);
 assert.ok(result.html.includes('href="'+origin+page.path+'"'));
 assert.throws(()=>metadata(page,{...record,brief:{lead:'New claim'}},origin),/differs from data/);
 assert.throws(()=>siteOrigin('https://example.org/sub/'),/HTTPS origin/);
});
test('citations use only visible source links, never private dataset paths',()=>{
 const html='<a href="https://example.org/unrelated">Unrelated</a><ol class="source-list"><li><a href="../../public-records/source.pdf">Record</a></li><li><a href="javascript:alert(1)">Bad</a></li></ol>';
 assert.deepEqual(visibleSourceLinks(html,origin+'/cases/example/'),[origin+'/public-records/source.pdf']);
});
test('every approved case is included with matching metadata and visible navigation',()=>{
 const data=JSON.parse(read('research/case-data.json')),briefs=JSON.parse(read('research/case-briefs.json'));
 const registry=caseRegistry(data,briefs);
 const urls=[...read('dist/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.ok(urls.includes(origin+'/methodology/'));
 for(const [path,record] of registry){
  assert.ok(urls.includes(origin+path));
  const html=read('dist'+path+'index.html'),source=read(path.slice(1)+'index.html');
  assert.equal(metaValue(html,'description'),record.brief.lead);
  assert.equal(metaValue(html,'og:description'),record.brief.lead);
  assert.equal(metaValue(html,'twitter:description'),record.brief.lead);
  const schema=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
  const article=schema.find(o=>o['@type']==='Article');
  assert.equal(article.description,record.brief.lead);
  assert.equal(article.mainEntityOfPage['@id'],origin+path);
  assert.ok(schema.some(o=>o['@type']==='BreadcrumbList'));
  assert.ok(html.includes('data-seo="case-navigation"'));
  assert.equal(html.match(/<!-- READER-BRIEF:START -->[\s\S]*?<!-- READER-BRIEF:END -->/)[0],source.match(/<!-- READER-BRIEF:START -->[\s\S]*?<!-- READER-BRIEF:END -->/)[0]);
 }
});
test('deployment report and social preview are valid; diagnostics stay private',()=>{
 const report=JSON.parse(read('.build-reports/seo-report.json'));
 assert.deepEqual(report.errors,[]);
 assert.equal(report.validCanonicals,report.pages);
 assert.equal(report.structuredPages,report.pages);
 assert.ok(report.sourceProfiles>=37);
 const png=readFileSync(new URL('../dist/assets/social-preview.png',import.meta.url));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),1200);
 assert.equal(png.readUInt32BE(20),630);
 assert.equal(existsSync(new URL('../dist/.build-reports',import.meta.url)),false);
 assert.match(read('dist/methodology/index.html'),/professional relationship with Constantine Petros/);
});

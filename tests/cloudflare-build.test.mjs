import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>readFileSync(resolve(root,p),'utf8');

test('Cloudflare bundle contains every public page and case source',()=>{
 const dir=resolve(root,'dist');
 assert.ok(existsSync(resolve(dir,'index.html')),'Run SKIP_HD_DOWNLOAD=1 node scripts/build-cloudflare.mjs first');
 for(const p of ['robots.txt','sitemap.xml','cases/index.html','federal/index.html',
  'museum/index.html','museum/character.js','museum/museum.js',
  'museum/assets/characters/visitor.glb','museum/assets/manifest.json',
  'research/case-data.json','research/case-briefs.json',
  'research/COURT-RECORDS-CHECKLIST.md','research/RECORD-MATCHING-REVIEW.md',
  'public-records/SCR-715528-1_PublicCopy.pdf']){
  assert.ok(existsSync(resolve(dir,p)),'Missing Cloudflare public asset: '+p);
 }
});

test('research links still work after the source GitHub repository becomes private',()=>{
 for(const path of ['cases/index.html','records/index.html','corrections/index.html','museum/index.html']){
  const page=read('dist/'+path);
  assert.doesNotMatch(page,/github\.com\/ColinDMcIntyre\/sonomacaseledger\/blob\/main\//i,
   'Broken private-source reference in '+path);
 }
 assert.ok(read('dist/records/index.html').includes('/research/RECORD-MATCHING-REVIEW.md'));
});

test('Cloudflare deployment excludes GitHub internals and private source packages',()=>{
 const dir=resolve(root,'dist');
 for(const p of ['.github','.git','.gitignore','README.md','scripts','tests',
  'research/RENDERPEOPLE-INTEGRATION-STATUS-2026-11-22.md',
  'research/COURT-PDF-MANIFEST.json','museum/assets/characters/renderpeople.glb']){
  assert.equal(existsSync(resolve(dir,p)),false,'Unwanted public file '+p);
 }
 const character=JSON.parse(read('dist/museum/assets/manifest.json')).character;
 assert.equal(character.path,'./assets/characters/visitor.glb');
 assert.match(character.license,/CC0/);
 assert.equal(character.highDetail,undefined,
  'Offline test must not claim that the heavy CC0 character is installed');
});

test('Cloudflare build validates GLB and restricts download hosts',()=>{
 const s=read('scripts/build-cloudflare.mjs');
 assert.match(s,/www\.innerscene\.com/);
 assert.match(s,/files\.innerscene\.com/);
 assert.match(s,/inspectGlb\(data\)/);
 assert.match(s,/MODEL_NAME='realistic_guide_cc0\.glb'/);
 assert.match(s,/MAX_FILE=25\*1024\*1024/);
 assert.match(s,/manifest\.character\.highDetail=/);
 assert.match(s,/catch\(error\)\{/);
 assert.match(s,/process\.env\.SITE_ORIGIN/);
 assert.doesNotMatch(s,/renderpeople\.com\/.*download/i);
});

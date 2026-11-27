import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../museum/case-dioramas.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../museum/asset-library.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../museum/world.js',import.meta.url),'utf8');
const museum=readFileSync(new URL('../museum/museum.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../museum/assets/manifest.json',import.meta.url),'utf8'));
const data=JSON.parse(readFileSync(new URL('../research/case-data.json',import.meta.url),'utf8'));
const catalogSlugs=[...source.matchAll(/^\s*'([^']+)':\[/gm)].map(m=>m[1]);
const dataSlugs=[...data.county,...data.federal].map(r=>r.slug).concat('constantine-petros');

test('all 37 published case files have individual contextual 3D recipes',()=>{
 assert.equal(dataSlugs.length,37);
 assert.equal(catalogSlugs.length,37);
 assert.equal(new Set(catalogSlugs).size,37);
 assert.deepEqual(catalogSlugs.slice().sort(),dataSlugs.slice().sort());
});
test('museum installs case models and keeps glass cases visible',()=>{
 assert.match(loader,/await buildDioramas\(world,loaded,caseProps\)/);
 assert.match(loader,/installCaseDioramas\(\{\.\.\.world,assetSlots:\[slot\]\},loaded,configs,normalize\)/);
 assert.match(loader,/if\(slot\.kind==='case'\)continue/);
 assert.match(world,/assetSlots\.push\(\{kind:type,group:g,mount,fallback,record\}\)/);
 assert.match(museum,/caseIllustrationFor\(r\.slug\)/);
 assert.match(museum,/not an object or document from the legal case/);
});
test('every external case model is an explicitly licensed local Poly Haven option',()=>{
 assert.ok(Object.keys(manifest.caseProps).length>=7);
 for(const [role,asset] of Object.entries(manifest.caseProps)){
  assert.match(role,/^[A-Za-z]+$/);
  assert.equal(asset.license,'CC0-1.0');
  assert.match(asset.source,/^https:\/\/polyhaven\.com\/a\/[A-Za-z0-9_]+$/);
  assert.ok(asset.path===null||/^\.\/assets\/models\/[^/]+\/[^/]+\.gltf$/.test(asset.path));
 }
 assert.match(source,/ILLUSTRATIVE · NOT EVIDENCE/);
 assert.match(source,/SPECIMEN \/ FICTIONAL/);
});

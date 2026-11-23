import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');

test('realistic guide is selected first, pre-posed and correctly scaled',()=>{
 const character=read('museum/character.js'),museum=read('museum/museum.js');
 const museumHtml=read('museum/index.html');
 assert.match(character,/async function upgradeToHighDetail\(preselected=null,availableMotions=null\)/);
 assert.match(character,/highDetail\?\.license!=='CC0-1\.0'/);
 assert.match(character,/createHumanoidPoseCorrector\(THREE,obj\)/);
 assert.match(character,/loadNaturalLocomotion\(obj,availableMotions\)/);
 assert.match(character,/corrector\.apply\(0,0\)/);
 assert.match(character,/2\.64\/size\.y/);
 assert.match(character,/const ready=\(async\(\)=>\{/);
 assert.match(character,/Promise\.race\(\[upgradeToHighDetail\(config\.highDetail,config\.animationLibrary\),expiry\]\)/);
 assert.match(character,/if\(privatePreview\|\|initialExpired\)return false/);
 assert.match(museum,/await visitor\.ready/);
 assert.match(museum,/if\(!visitor\.usesHighDetail\)installHighDetailGuideOption\(\)/);
 assert.doesNotMatch(museum,/window\.setTimeout\(upgrade,1400\)/,
  'No delayed HD swap once the museum is already visible');
 assert.match(museum,/6\.5:11\.2/,'Closer follow camera for larger character');
 assert.match(museumHtml,/museum\.js\?v=kinemiq-20261122/);
 assert.ok(!read('index.html').includes('realistic_guide_cc0.glb'));
});

test('only verified public domain model may be published as high detail',()=>{
 const cfg=JSON.parse(read('museum/assets/manifest.json')).character;
 assert.equal(cfg.path,'./assets/characters/visitor.glb');
 assert.match(cfg.license,/CC0/i);
 if(cfg.highDetail){
  assert.equal(cfg.highDetail.license,'CC0-1.0');
  assert.equal(cfg.highDetail.path,'./assets/characters/realistic_guide_cc0.glb');
  assert.equal(cfg.highDetail.source,'https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584');
  assert.ok(existsSync(resolve(root,cfg.highDetail.path.replace(/^\.\//,'museum/'))),'Approved GLB must exist locally');
 }
});

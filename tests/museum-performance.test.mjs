import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../museum/'+name,import.meta.url),'utf8');
const museum=read('museum.js'),character=read('character.js'),materials=read('materials.js');
const pipeline=read('render-pipeline.js'),reflections=read('reflection-manager.js'),startup=read('startup-performance.js');

test('sprint is faster than normal walking and both Shift keys are supported',()=>{
 const source=museum.match(/function sprintSpeed[^\n]+/)[0];
 const sprint=new Function(source+'\nreturn sprintSpeed;')();
 for(const speed of [1.4,2,3,3.5]){
  assert.ok(sprint(speed)>speed);
  assert.ok(sprint(speed)<=6.8);
 }
 assert.match(museum,/heldKeys\.has\('ShiftLeft'\)\|\|heldKeys\.has\('ShiftRight'\)/);
 assert.match(museum,/keyup',e=>heldKeys\.delete\(e\.code\)/);
 assert.match(museum,/sprintHeld\(\)\?sprintSpeed\(walk\):walk/);
 assert.match(character,/nativeRun!==walkAction\?\.getClip\(\)/);
 assert.match(character,/runAction\.setEffectiveWeight/);
 assert.match(character,/sprinting\|\|runBlend>\.05/);
});

test('all material, prop and lighting preparation precedes interactive rendering',()=>{
 const main=museum.slice(museum.indexOf('async function main()'));
 const order=['await setupThree()','await populateMuseum()','await visitor.ready','await Promise.allSettled([materialReady,propsReady,lighting?.ready,pipelineReady])','await batchExhibits(world)','await warmTextures(renderer,scene)','await renderer.compileAsync(scene,camera)','await reflections.prepare()','pipeline.render(0)','clock.start();animate()'];
 let previous=-1;
 for(const step of order){
  const index=main.indexOf(step);
  assert.ok(index>previous,'Startup ordering: '+step);
  previous=index;
 }
 assert.match(materials,/await Promise\.all\(requested\.map/);
 assert.match(startup,/renderer\.initTexture\(tex\)/);
 assert.match(read('architecture.js'),/async function buildArchitectureAsync/);
 assert.match(read('architecture.js'),/await yieldFrame\(\);step=stages\.next\(\)/);
});

test('reflection captures no longer run during animation or room changes',()=>{
 const animation=museum.slice(museum.indexOf('function animate()'),museum.indexOf('function installGuideActions()'));
 assert.doesNotMatch(animation,/reflections\?*\.update|reflections\.prepare|CubeCamera/);
 assert.match(reflections,/for\(let face=0;face<6;face\+\+\)/);
 assert.match(reflections,/renderer\.render\(scene,probe\.children\[face\]\)/);
 assert.match(reflections,/await yieldFrame\(\)/);
 assert.match(reflections,/floorMaterials\(null\)/);
 assert.match(museum,/options\.get\('reflections'\)==='local'/);
});

test('static batching preserves materials and excludes interactive or animated objects',()=>{
 assert.match(startup,/slot\.kind==='timeline'/);
 assert.match(startup,/o\.isSkinnedMesh\|\|o\.isInstancedMesh/);
 assert.match(startup,/m\.transparent/);
 assert.match(startup,/o\.userData\.action/);
 assert.match(startup,/new THREE\.Mesh\(merged,first\.material\)/);
 assert.match(startup,/batch\.castShadow=first\.castShadow;batch\.receiveShadow=first\.receiveShadow/);
 assert.match(startup,/mergeGeometries\(copies,false\)/);
 assert.match(museum,/options\.get\('batch'\)!=='0'/);
});

test('AO quality scales before the final fallback',()=>{
 assert.match(pipeline,/aoPass\.setSize/);
 assert.match(pipeline,/composer\.readBuffer/);
 assert.match(pipeline,/for\(const o of transparentMeshes\)/);
 assert.match(museum,/pipeline\.setAOScale\(pipeline\.aoScale>\.8\?\.75:\.5\)/);
 assert.match(museum,/quality!=='auto'/);
 assert.match(museum,/renderer\.setPixelRatio\(Math\.max\(\.85/);
});

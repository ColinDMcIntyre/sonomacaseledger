import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../museum/'+name,import.meta.url),'utf8');
const museum=read('museum.js'),character=read('character.js');
const materials=read('materials.js'),lighting=read('lighting.js'),daylight=read('daylight.js');

test('changed browser modules parse',()=>{
 for(const source of [museum,character,materials,lighting,daylight]){
  const body=source.replace(/^import .*?;\s*$/gm,'')
   .replace(/^export\s+(?=(?:async\s+)?function|const|let|class)/gm,'');
  assert.doesNotThrow(()=>new Function(body));
 }
});

test('walking speed accelerates and decelerates without overshooting',()=>{
 const declarations=museum.match(/const WALK_SPEED=.*?;\nfunction approachSpeed[^\n]+/);
 assert.ok(declarations);
 const advance=new Function(declarations[0]+'\nreturn approachSpeed;')();
 let speed=0;
 for(let i=0;i<60;i++){speed=advance(speed,3,1/60);assert.ok(speed>=0&&speed<=3);}
 assert.equal(speed,3);
 for(let i=0;i<60;i++){speed=advance(speed,0,1/60);assert.ok(speed>=0&&speed<=3);}
 assert.equal(speed,0);
 assert.match(museum,/visitor\.updateMotion\(\{speed,lookTarget:/);
 assert.match(character,/motionSpeed\/nominalSpeed/);
});

test('animation variants avoid immediate repetition and restore additive head pose',()=>{
 assert.match(character,/idleVariants\.filter\(c=>c!==lastIdle\)/);
 assert.match(character,/!gestureAction&&!reduced&&!legacy/);
 assert.match(character,/resetAttention\(\);\s*if\(detailInstalled/);
 assert.match(character,/attentionBone\.quaternion\.copy\(attentionBase\)/);
 assert.match(character,/MathUtils\.clamp\(yaw\*\.55,-\.28,\.28\)/);
});

test('daylight shafts remain and new detail is reversible and optional',()=>{
 assert.match(daylight,/shaftMap\(\)/);
 assert.match(daylight,/new THREE\.Points\(g,/);
 assert.match(museum,/daylight\?\.update\(clock\.elapsedTime,state\.fx&&!reducedMotion\.matches\)/);
 assert.match(materials,/roughnessFactor=clamp/);
 assert.match(materials,/museumMeso/);
 assert.match(lighting,/legacy\?1\.08:\.58/);
 for(const source of [museum,character,materials,lighting,daylight]){
  assert.match(source,/get\('realism'\)==='0'/);
 }
});

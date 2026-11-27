import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../museum/'+name,import.meta.url),'utf8');
const museum=read('museum.js'),character=read('character.js');
const materials=read('materials.js'),lighting=read('lighting.js'),daylight=read('daylight.js');
const foot=read('foot-contact.js'),pipeline=read('render-pipeline.js'),reflections=read('reflection-manager.js');

test('changed browser modules parse',()=>{
 for(const source of [museum,character,materials,lighting,daylight,foot,pipeline,reflections]){
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
 assert.match(character,/resetAttention\(\);footController\?\.reset\(\);\s*if\(detailInstalled/);
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


test('sampled stance speed is correct and static or invalid tracks fall back',()=>{
 const body=foot.replace(/^import .*?;\s*$/gm,'').replace(/^export\s+(?=function)/gm,'');
 const analyze=new Function(body+'\nreturn analyzeStrideSamples;')();
 const sample=shift=>Array.from({length:48},(_,i)=>{
  const t=((i+shift)%48)/48;
  return {y:t<.5?0:.2*Math.sin((t-.5)*Math.PI*2),z:t<.5?1-2*t:2*t-1};
 });
 const result=analyze(new Map([['left',sample(0)],['right',sample(24)]]),1);
 assert.ok(Math.abs(result.speed-2)<.001);
 assert.equal(result.contacts.size,2);
 const flat=Array.from({length:48},()=>({y:0,z:0}));
 assert.equal(analyze(new Map([['left',flat],['right',flat]]),1).speed,0);
 assert.equal(analyze(new Map(),1).speed,0);
});

test('AO and room probes are optional and preserve direct rendering',()=>{
 assert.match(pipeline,/EXT_color_buffer_float/);
 assert.match(pipeline,/GTAOPass\.OUTPUT\.Default/);
 assert.match(pipeline,/m\.transparent\|\|m\.depthWrite===false/);
 assert.match(pipeline,/renderer\.render\(scene,camera\)/);
 assert.match(museum,/pipeline\.disable\(\)/);
 assert.match(museum,/options\.get\('ao'\)!=='0'/);
 assert.match(museum,/options\.get\('reflections'\)!=='0'/);
 assert.match(reflections,/probes\.has\(room\.id\)/);
 assert.match(reflections,/visitor\.root\.visible=visitorVisible/);
 assert.match(reflections,/pmrem\.fromCubemap\(cube\.texture\)/);
 assert.match(foot,/active\.length!==2/);
 assert.match(foot,/if\(distance>\.32\)/);
});

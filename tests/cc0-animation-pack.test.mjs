import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>readFileSync(resolve(root,p),'utf8');

test('live build includes 35 approved CC0 motion clips and the Jordan guide',()=>{
 const config=JSON.parse(read('dist/museum/assets/manifest.json')).character;
 assert.equal(config.highDetail?.license,'CC0-1.0','Realistic guide missing from full build');
 const lib=config.animationLibrary;
 assert.equal(lib.license,'CC0-1.0');
 assert.equal(lib.preferredIdle,'Idle_relaxed');
 assert.equal(lib.preferredWalk,'Walk_formal');
 assert.ok(lib.totalClips>=30);
 assert.equal(lib.totalClips,lib.clips.length);
 const dir='dist/museum/assets/animations/kinemiq';
 for(const name of ['Idle_relaxed','Walk_formal','Walk_forwards','Run_jog_forwards',
  'Action_interact','Idle_talking','Action_sit_down','Action_dance']){
  assert.ok(lib.clips.includes(name),'Missing animation '+name);
  const p=resolve(root,dir,name+'.glb');
  assert.ok(existsSync(p),'Missing published CC0 clip '+p);
  assert.ok(statSync(p).size<600000,'Clip is unexpectedly large '+name);
 }
 assert.equal(existsSync(resolve(root,dir,'KinemIQ_Mannequin.glb')),false,
  'Do not publish unused model');
});
test('runtime maps rotation tracks to matching Jordan bones and keeps translation out',()=>{
 const source=read('museum/animation-library.js');
 assert.match(source,/target\.traverse\(n=>\{if\(n\.isBone\)/);
 assert.match(source,/src\.quaternion\.clone\(\)\.invert\(\)/);
 assert.match(source,/sample\.premultiply\(offset\)\.normalize\(\)/);
 assert.match(source,/QuaternionKeyframeTrack/);
 assert.match(source,/tracks\.length<40\|\|coverage<\.65/);
 assert.doesNotMatch(source,/VectorKeyframeTrack/);
 const visitor=read('museum/character.js');
 assert.match(visitor,/loadNaturalLocomotion\(obj,availableMotions\)/);
 assert.match(visitor,/original Jordan clips retained/);
 assert.match(visitor,/loadCc0Motion\(model,motionLibraryConfig,name\)/);
});

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
 assert.match(source,/prepareIdleCalibration\(target,jordanOriginalIdle,rawIdle\)/);
 assert.match(source,/dst\.clone\(\)\.multiply\(src\.clone\(\)\.invert\(\)\)/);
 assert.match(source,/sample\.premultiply\(offset\)\.normalize\(\)/);
 assert.match(source,/QuaternionKeyframeTrack/);
 assert.match(source,/tracks\.length<40\|\|coverage<\.65/);
 assert.doesNotMatch(source,/VectorKeyframeTrack/);
 const visitor=read('museum/character.js');
 assert.match(visitor,/loadNaturalLocomotion\(obj,availableMotions,idle\)/);
 assert.match(visitor,/CC0 walk unavailable; using built-in Walk_Brisk/);
 assert.match(visitor,/walkClip=result\.walk/);
 assert.match(visitor,/let idleClip=idle,walkClip=nativeBrisk/);
 assert.match(visitor,/nextWalk\.timeScale=usedNaturalMotions\?\.92:\.82/);
 assert.match(visitor,/Using retargeted CC0 walking/);
 assert.match(visitor,/availableMotions\?\.clips\?\.includes\('Walk_formal'\)/);
 assert.match(visitor,/loadCc0Motion\(model,motionLibraryConfig,name\)/);
});


function parsedGlb(path){
 const buf=readFileSync(resolve(root,path));
 assert.equal(buf.toString('ascii',0,4),'glTF');
 const length=buf.readUInt32LE(12);
 return JSON.parse(buf.subarray(20,20+length).toString('utf8').trim());
}
test('real idle and walk tracks match enough Jordan bones for safe quaternion retarget',()=>{
 const jordan=parsedGlb('dist/museum/assets/characters/realistic_guide_cc0.glb');
 const boneNames=new Set((jordan.skins||[]).flatMap(s=>(s.joints||[])
  .map(id=>jordan.nodes[id].name)));
 for(const name of ['Idle_relaxed','Walk_formal']){
  const gltf=parsedGlb('dist/museum/assets/animations/kinemiq/'+name+'.glb');
  const animation=gltf.animations[0];
  const channels=animation.channels.filter(ch=>ch.target?.path==='rotation');
  const matching=channels.filter(ch=>boneNames.has(gltf.nodes[ch.target.node]?.name));
  assert.ok(channels.length>=60,name+': expected humanoid rotation tracks');
  assert.ok(matching.length>=40,name+': enough retargetable joints');
  assert.ok(matching.length/channels.length>=.65,name+': compatible target coverage');
  for(const sampler of animation.samplers){
   assert.ok(!sampler.interpolation||['LINEAR','STEP'].includes(sampler.interpolation),
    name+': unsupported cubic quaternion interpolation');
  }
 }
});

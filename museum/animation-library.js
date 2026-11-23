import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/**
 * KinemIQ/Quaternius -> Jordan rest-motion alignment.
 *
 * Shared bone names are not shared rest poses (e.g. upper arms differ 102°).
 * Comparing GLTF node rest rotations still yielded an unnaturally spread idle.
 * Instead calibrate EVERY matching bone against the first keyed frame of
 * *KinemIQ Idle_relaxed* and *Jordan Idle_Standing*.
 *
 * For each source animation frame:
 * targetPose = JordanIdlePose × inverse(KinemIQIdlePose) × sourcePose.
 * This guarantees the replacement idle begins at Jordan's own neutral
 * animated stance, without adding ongoing shoulder/hip/leg overrides.
 */
const calibratedOffsets=new WeakMap();
function initialRotations(clip){
 const result=new Map();
 for(const track of clip?.tracks||[]){
  if(!track.name.endsWith('.quaternion')||track.values.length<4)continue;
  const name=track.name.slice(0,-'.quaternion'.length);
  const v=track.values;
  result.set(name,new THREE.Quaternion(v[0],v[1],v[2],v[3]).normalize());
 }
 return result;
}
export function prepareIdleCalibration(target,jordanIdle,kinemiqIdle){
 const jordan=initialRotations(jordanIdle),kinemiq=initialRotations(kinemiqIdle);
 const bones=new Set();
 target.traverse(n=>{if(n.isBone)bones.add(n.name);});
 const offsets=new Map();
 for(const [name,src] of kinemiq){
  const dst=jordan.get(name);
  if(!dst||!bones.has(name))continue;
  offsets.set(name,dst.clone().multiply(src.clone().invert()).normalize());
 }
 if(offsets.size<40)throw Error('Cannot align KinemIQ motions to Jordan neutral pose: only '+offsets.size+' matches');
 calibratedOffsets.set(target,offsets);
 return offsets.size;
}
export function retargetHumanoidClip(target,source,clip){
 const targetBones=new Map(),sourceNodes=new Map();
 target.traverse(n=>{if(n.isBone)targetBones.set(n.name,n);});
 source.traverse(n=>sourceNodes.set(n.name,n));
 const aligned=calibratedOffsets.get(target);
 const tracks=[];
 let sourceRotations=0;
 for(const track of clip?.tracks||[]){
  if(!track.name.endsWith('.quaternion'))continue;
  sourceRotations++;
  const name=track.name.slice(0,-'.quaternion'.length);
  const dst=targetBones.get(name),src=sourceNodes.get(name);
  if(!dst||!src||!track.values?.length||track.values.length!==track.times.length*4)continue;
  // Never mix the raw skeleton rest pose with the animated neutral pose.
  // If this bone lacks a valid idle calibration, keep its original pose
  // rather than guessing an offset that might dislocate shoulders/legs.
  const offset=aligned?.get(name);
  if(!offset)continue;
  const out=new Float32Array(track.values.length);
  const sample=new THREE.Quaternion();
  for(let i=0;i<track.values.length;i+=4){
   sample.set(track.values[i],track.values[i+1],track.values[i+2],track.values[i+3]);
   sample.premultiply(offset).normalize();
   out[i]=sample.x;out[i+1]=sample.y;out[i+2]=sample.z;out[i+3]=sample.w;
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(dst.name+'.quaternion',track.times,out,
   track.getInterpolation()));
 }
 const coverage=sourceRotations?tracks.length/sourceRotations:0;
 if(tracks.length<40||coverage<.65)
  throw Error('Incompatible retarget coverage: '+tracks.length+'/'+sourceRotations);
 return new THREE.AnimationClip(clip.name,clip.duration,tracks);
}
export async function loadCc0Motion(target,library,name){
 if(library?.license!=='CC0-1.0'||
  library.path!=='./assets/animations/kinemiq/'||
  !library.clips?.includes(name)||!/^[a-zA-Z0-9_-]+$/.test(name))
  throw Error('Motion is not an approved CC0 clip');
 const gltf=await new GLTFLoader().loadAsync(library.path+name+'.glb');
 const raw=gltf.animations?.[0];
 if(!raw?.tracks?.length)throw Error('Empty CC0 motion: '+name);
 return retargetHumanoidClip(target,gltf.scene,raw);
}
export async function loadNaturalLocomotion(target,library,jordanOriginalIdle){
 const idleName=library?.preferredIdle,walkName=library?.preferredWalk;
 if(!idleName||!walkName||!jordanOriginalIdle)throw Error('Missing idle pose calibration source');
 // Load and anchor the new motions to the known good Jordan idle silhouette.
 const source=await new GLTFLoader().loadAsync(library.path+idleName+'.glb');
 const rawIdle=source.animations?.[0];
 if(!rawIdle?.tracks?.length)throw Error('Missing CC0 idle calibration clip');
 const matched=prepareIdleCalibration(target,jordanOriginalIdle,rawIdle);
 const idle=retargetHumanoidClip(target,source.scene,rawIdle);
 const walk=await loadCc0Motion(target,library,walkName);
 console.info('Calibrated KinemIQ to Jordan original idle:',matched,'joint rotations');
 return {idle,walk,source:'KinemIQ / Quaternius CC0',available:library.clips||[]};
}

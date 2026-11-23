import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/**
 * Retarget KinemIQ/Quaternius CC0 humanoid rotations onto Jordan's own rig.
 * Both have matching joint names, but their authored rest poses differ by
 * 20-100 degrees at important joints. Applying the source tracks directly
 * would twist arms and legs. Retarget each local rotation against the TWO
 * bone rest quaternions before it reaches Jordan's AnimationMixer.
 *
 * Translation and scale channels are intentionally omitted; the museum's
 * navigation already controls position. No skeleton or mesh swapping occurs.
 */
export function retargetHumanoidClip(target, source, clip){
 const targetBones=new Map();
 target.traverse(n=>{if(n.isBone)targetBones.set(n.name,n);});
 const sourceNodes=new Map();
 source.traverse(n=>sourceNodes.set(n.name,n));
 const tracks=[];
 let sourceRotations=0;
 for(const track of clip?.tracks||[]){
  if(!track.name.endsWith('.quaternion'))continue;
  sourceRotations++;
  const name=track.name.slice(0,-'.quaternion'.length);
  const dst=targetBones.get(name),src=sourceNodes.get(name);
  if(!src||!dst||!track.values?.length||track.values.length%4)continue;
  // bone-local baseline correction: animated target = targetRest *
  // inverse(sourceRest) * sourceAnimationQuaternion.
  const offset=dst.quaternion.clone().multiply(src.quaternion.clone().invert());
  const out=new Float32Array(track.values.length);
  const sample=new THREE.Quaternion();
  for(let i=0;i<track.values.length;i+=4){
   sample.set(track.values[i],track.values[i+1],track.values[i+2],track.values[i+3]);
   sample.premultiply(offset).normalize();
   out[i]=sample.x;out[i+1]=sample.y;out[i+2]=sample.z;out[i+3]=sample.w;
  }
  const result=new THREE.QuaternionKeyframeTrack(dst.name+'.quaternion',track.times,out,
   track.getInterpolation());
  tracks.push(result);
 }
 // Exact names are insufficient: reject underspecified/incompatible rigs.
 const coverage=sourceRotations?tracks.length/sourceRotations:0;
 if(tracks.length<40||coverage<.65){
  throw Error('KinemIQ rig is incompatible with Jordan: '+tracks.length+
   '/'+sourceRotations+' rotation tracks matched.');
 }
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
export async function loadNaturalLocomotion(target,library){
 const idleName=library?.preferredIdle,walkName=library?.preferredWalk;
 if(!idleName||!walkName)throw Error('No natural locomotion set');
 const [idle,walk]=await Promise.all([
  loadCc0Motion(target,library,idleName),
  loadCc0Motion(target,library,walkName)
 ]);
 return {idle,walk,source:'KinemIQ / Quaternius CC0',
  available:library.clips||[]};
}

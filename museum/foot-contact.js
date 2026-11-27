import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

const COUNT=48;
const normalized=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(mixamorig|bip001|bip01|def|org)/,'');
const isFoot=(n,side)=>{
 const name=normalized(n),letter=side[0];
 return [side+'foot','foot'+side,letter+'foot','foot'+letter,side+'ankle','ankle'+side,letter+'ankle','ankle'+letter].includes(name);
};
function chains(model){
 const result=[];
 for(const side of ['left','right']){
  let foot=null;
  model.traverse(n=>{if(n.isBone&&!foot&&isFoot(n.name,side))foot=n;});
  if(!foot)continue;
  const knee=foot.parent,hip=knee?.parent;
  const valid=knee?.isBone&&hip?.isBone&&/shin|calf|lowerleg|tibia|knee|leftleg|rightleg|legl$|legr$/.test(normalized(knee.name))&&/thigh|upperleg|upleg|femur|hip/.test(normalized(hip.name));
  result.push({side,foot,knee:valid?knee:null,hip:valid?hip:null});
 }
 return result;
}
const median=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:0;};

// Sample a separate skeleton, leaving the visible character, original mixer
// and calibrated wrist poses untouched. Estimate in-place stance speed in
// actual scaled world units, not from an assumed human stride.
export function measureStride(model,clip){
 const empty={speed:0,contacts:new Map()};
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<.3)return empty;
 const copy=clone(model),legs=chains(copy);
 if(legs.length!==2)return empty;
 const mixer=new THREE.AnimationMixer(copy),action=mixer.clipAction(clip);
 action.play();
 const samples=new Map(legs.map(l=>[l.side,[]]));
 const pos=new THREE.Vector3(),rootPos=new THREE.Vector3();
 try{
  for(let i=0;i<COUNT;i++){
   mixer.setTime(i*clip.duration/COUNT);copy.updateMatrixWorld(true);
   copy.getWorldPosition(rootPos);
   for(const l of legs)samples.get(l.side).push(l.foot.getWorldPosition(pos).clone().sub(rootPos));
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(copy);}
 return analyzeStrideSamples(samples,clip.duration);
}

export function analyzeStrideSamples(samples,duration){
 const empty={speed:0,contacts:new Map()};
 if(!Number.isFinite(duration)||duration<.3||samples.size!==2)return empty;
 const speeds=[],contacts=new Map(),step=duration/COUNT;
 for(const [side,points] of samples){
  if(points.length!==COUNT||points.some(p=>!Number.isFinite(p.y)||!Number.isFinite(p.z)))return empty;
  const low=Math.min(...points.map(p=>p.y)),high=Math.max(...points.map(p=>p.y));
  if(high-low<.025)continue;
  const flags=points.map((p,i)=>{
   const prev=points[Math.max(0,i-1)],next=points[Math.min(COUNT-1,i+1)];
   const velocity=(next.z-prev.z)/((i===0||i===COUNT-1?1:2)*step);
   const stance=p.y<low+Math.max(.025,(high-low)*.28)&&velocity<-.35;
   if(stance)speeds.push(-velocity);
   return stance;
  });
  if(flags.filter(Boolean).length>=5)contacts.set(side,flags);
 }
 const speed=median(speeds);
 if(contacts.size!==2||!Number.isFinite(speed)||speed<.7||speed>6)return empty;
 return {speed,contacts};
}

// Limited two-joint CCD correction for the flat museum floor. Preserve
// ankle orientation; restore all changed quaternions before the next mix.
export function createFootContactController(model,root,clip){
 const legs=chains(model),calibration=measureStride(model,clip);
 const active=legs.filter(l=>l.knee&&l.hip&&calibration.contacts.has(l.side));
 const saved=new Map(),anchors=new Map();
 const ankle=new THREE.Vector3(),goal=new THREE.Vector3(),jointPos=new THREE.Vector3();
 const from=new THREE.Vector3(),to=new THREE.Vector3(),delta=new THREE.Quaternion();
 const parentQ=new THREE.Quaternion(),worldQ=new THREE.Quaternion(),footQ=new THREE.Quaternion();
 let previousYaw=root.rotation.y;
 function reset(){
  for(const [bone,q] of saved)bone.quaternion.copy(q);
  saved.clear();
 }
 function save(bone){if(!saved.has(bone))saved.set(bone,bone.quaternion.clone());}
 function aim(joint,foot,target){
  joint.getWorldPosition(jointPos);foot.getWorldPosition(ankle);
  from.subVectors(ankle,jointPos);to.subVectors(target,jointPos);
  if(from.lengthSq()<1e-7||to.lengthSq()<1e-7)return;
  from.normalize();to.normalize();delta.setFromUnitVectors(from,to);
  const angle=2*Math.acos(THREE.MathUtils.clamp(Math.abs(delta.w),0,1));
  if(angle>.12)delta.slerp(new THREE.Quaternion(),1-.12/angle);
  save(joint);
  joint.getWorldQuaternion(worldQ);worldQ.premultiply(delta);
  joint.parent.getWorldQuaternion(parentQ).invert();
  joint.quaternion.copy(parentQ.multiply(worldQ));
  joint.updateWorldMatrix(true,true);
 }
 function update(action,dt,{speed,blend,gesture=false}){
  const yaw=root.rotation.y;
  const turn=Math.abs(Math.atan2(Math.sin(yaw-previousYaw),Math.cos(yaw-previousYaw)));
  previousYaw=yaw;
  if(!active.length||!action||blend<.85||speed<.45||gesture||turn>dt*1.8){anchors.clear();return;}
  const index=Math.floor(((action.time%clip.duration+clip.duration)%clip.duration)/clip.duration*COUNT)%COUNT;
  root.updateMatrixWorld(true);
  for(const leg of active){
   const flags=calibration.contacts.get(leg.side);
   if(!flags[index]){anchors.delete(leg.side);continue;}
   leg.foot.getWorldPosition(ankle);
   let anchor=anchors.get(leg.side);
   if(!anchor){anchor=ankle.clone();anchors.set(leg.side,anchor);continue;}
   goal.set(anchor.x,ankle.y,anchor.z);
   const distance=goal.distanceTo(ankle);
   // Release instead of stretching or visibly snapping a badly matched rig.
   if(distance>.32){anchors.delete(leg.side);continue;}
   if(distance<.008)continue;
   goal.lerp(ankle,Math.max(.25,1-.12/distance));
   leg.foot.getWorldQuaternion(footQ);
   for(let i=0;i<2;i++){aim(leg.knee,leg.foot,goal);aim(leg.hip,leg.foot,goal);}
   save(leg.foot);
   leg.foot.parent.getWorldQuaternion(parentQ).invert();
   leg.foot.quaternion.copy(parentQ.multiply(footQ));
   leg.foot.updateWorldMatrix(true,true);
  }
 }
 return {reset,update,speed:calibration.speed,supported:active.length===2};
}

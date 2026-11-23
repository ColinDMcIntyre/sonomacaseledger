/**
 * Minimal wrist-only pose correction for the CC0 museum guide.
 *
 * The original Idle and Walk animation owns ALL shoulders, upper arms,
 * forearms, hips, thighs, calves and feet. This module NEVER changes them.
 *
 * Some exported models have hands pointed sideways even in an idle pose.
 * After the animation frame, gently aim ONLY the hand->finger direction down
 * beside the torso, limited to a single wrist pivot. No accumulated rotation.
 */
function boneKey(name){
 return String(name||'').toLowerCase()
  .replace(/mixamorig|bip001|bip01/g,'').replace(/[^a-z0-9]/g,'');
}
function belongsToSide(key,side){
 const word=side<0?'left':'right',suffix=side<0?'l':'r';
 return key.includes(word)||
  (key.endsWith(suffix)&&/(hand|wrist|finger|middle|index|thumb)/.test(key))||
  new RegExp('^'+suffix+'(hand|wrist|finger|middle|index|thumb)').test(key);
}
function isDescendant(node,parent){
 for(let p=node?.parent;p;p=p.parent)if(p===parent)return true;
 return false;
}
export function locateHumanoidBones(scene){
 const bones=[];
 scene.traverse(node=>{if(node.isBone)bones.push({node,key:boneKey(node.name)});});
 return [-1,1].map(side=>{
  // A hand/wrist is the ONLY bone this module is allowed to rotate.
  const hand=bones.find(b=>belongsToSide(b.key,side)&&
    ((/(^|left|right|l|r)hand/.test(b.key)&&
      !/ik|twist|finger|index|thumb|middle|ring|pinky/.test(b.key))||
      b.key.includes('wrist')))?.node||null;
  // First finger knuckle acts as a measured hand-forward reference.
  const finger=bones.find(b=>belongsToSide(b.key,side)&&hand&&
    isDescendant(b.node,hand)&&/middle|index/.test(b.key)&&
    !/metacarpal|twist/.test(b.key))?.node||null;
  return {side,hand,finger};
 });
}
export function createHumanoidPoseCorrector(THREE,scene){
 const joints=locateHumanoidBones(scene);
 // Restore the untouched hand pose before each mixer update. Some imported
 // clips omit wrist tracks; without this, a correction can compound per frame.
 const handRest=joints.filter(j=>j.hand&&j.finger)
   .map(j=>({hand:j.hand,rest:j.hand.quaternion.clone()}));
 function reset(){
  for(const j of handRest)j.hand.quaternion.copy(j.rest);
 }

 const handPosition=new THREE.Vector3(),fingerPosition=new THREE.Vector3();
 const current=new THREE.Vector3(),target=new THREE.Vector3();
 const sceneQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 const desiredWorld=new THREE.Quaternion(),worldCorrection=new THREE.Quaternion(),localCorrection=new THREE.Quaternion();
 const inverseParent=new THREE.Quaternion(),neutral=new THREE.Quaternion();
 const MAX_CORRECTION=Math.PI/2; // maximum 90 degrees at the wrist

 function apply(walkBlend=0){
  // Always update *after* AnimationMixer.update(): pose changes never
  // accumulate and the original imported animation remains authoritative.
  scene.updateMatrixWorld(true);
  scene.getWorldQuaternion(sceneQ);
  const walking=Math.max(0,Math.min(1,walkBlend));
  for(const j of joints){
   if(!j.hand||!j.finger||!j.hand.parent)continue;
   j.hand.getWorldPosition(handPosition);
   j.finger.getWorldPosition(fingerPosition);
   current.copy(fingerPosition).sub(handPosition);
   if(current.lengthSq()<1e-10)continue;
   current.normalize();
   // Neutral reference: fingers alongside the body, rather than sticking
   // sideways from the wrist. This does not move the shoulder or elbow.
   target.set(j.side*.075,-.995,-.055).normalize().applyQuaternion(sceneQ);
   const angle=current.angleTo(target);
   if(angle<.20)continue;
   desiredWorld.setFromUnitVectors(current,target);
   const fraction=Math.min(1,MAX_CORRECTION/angle)*(walking>.45?.55:.85);
   worldCorrection.copy(neutral).slerp(desiredWorld,fraction);
   j.hand.parent.getWorldQuaternion(parentQ);
   inverseParent.copy(parentQ).invert();
   localCorrection.copy(inverseParent).multiply(worldCorrection).multiply(parentQ);
   j.hand.quaternion.premultiply(localCorrection).normalize();
   j.hand.updateWorldMatrix(true,true);
  }
 }
 return {
  apply,reset,
  hasSkeleton:joints.some(j=>j.hand&&j.finger),
  describe:()=>joints.map(j=>({
   side:j.side<0?'left':'right',hand:j.hand?.name||null,
   finger:j.finger?.name||null
  }))
 };
}

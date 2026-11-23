/**
 * Skeleton-aware humanoid pose correction for CC0 museum guide.
 * Works AFTER AnimationMixer.update(): it steers over-wide T-pose shoulders,
 * sideways pointing wrists and split legs to a comfortable standing/walking
 * silhouette without guessing fixed 90-degree angles in unknown bone axes.
 *
 * Bones whose roles cannot be determined are left unchanged.
 */
function boneKey(name){
 return String(name||'').toLowerCase()
  .replace(/mixamorig|bip001|bip01/g,'').replace(/[^a-z0-9]/g,'');
}
function belongsToSide(key,side){
 const word=side<0?'left':'right',suffix=side<0?'l':'r';
 return key.includes(word)||
  (key.endsWith(suffix)&&/(arm|leg|thigh|calf|shin|wrist|hand|finger|middle|index|foot)/.test(key))||
  new RegExp('^'+suffix+'(upperarm|lowerarm|forearm|arm|hand|wrist|upperleg|lowerleg|thigh|calf|shin|leg|foot|finger)').test(key);
}
function selectBone(bones,side,patterns){
 for(const test of patterns){
  const found=bones.find(b=>belongsToSide(b.key,side)&&test(b.key));
  if(found)return found.node;
 }
 return null;
}
export function locateHumanoidBones(scene){
 const bones=[];
 scene.traverse(node=>{if(node.isBone)bones.push({node,key:boneKey(node.name)});});
 const out=[];
 for(const side of [-1,1]){
  const arm=selectBone(bones,side,[
   n=>n.includes('upperarm'),n=>/(leftarm|rightarm|larm|rarm)/.test(n)&&
     !/forearm|lowerarm|twist|hand/.test(n)
  ]);
  const elbow=selectBone(bones,side,[
   n=>n.includes('lowerarm'),n=>n.includes('forearm')
  ]);
  const hand=selectBone(bones,side,[
   n=>n.includes('hand')&&!n.includes('handik'),n=>n.includes('wrist')
  ]);
  const finger=selectBone(bones,side,[
   n=>n.includes('middle')&&!/metacarpal/.test(n),
   n=>n.includes('index')&&!/metacarpal/.test(n),
   n=>n.includes('finger')
  ]);
  const thigh=selectBone(bones,side,[
   n=>n.includes('upperleg'),n=>n.includes('thigh'),n=>n.includes('upleg')
  ]);
  const shin=selectBone(bones,side,[
   n=>n.includes('lowerleg'),n=>n.includes('calf'),n=>n.includes('shin'),
   n=>/^(leftleg|rightleg|lleg|rleg)$/.test(n)
  ]);
  const foot=selectBone(bones,side,[
   n=>n.includes('foot')&&!n.includes('toe'),n=>n.includes('ankle')
  ]);
  out.push({side,arm,elbow,hand,finger,thigh,shin,foot});
 }
 return out;
}
export function createHumanoidPoseCorrector(THREE,scene){
 const joints=locateHumanoidBones(scene);
 const positionA=new THREE.Vector3(),positionB=new THREE.Vector3();
 const from=new THREE.Vector3(),target=new THREE.Vector3();
 const worldModelQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
 const desiredQ=new THREE.Quaternion(),turnQ=new THREE.Quaternion();
 const inverseQ=new THREE.Quaternion(),localQ=new THREE.Quaternion();
 const identity=new THREE.Quaternion();
 let lastState='';

 function alignSegment(fromBone,toBone,desiredLocal,strength,deadzone=0.14){
  if(!fromBone?.isBone||!toBone?.isBone||strength<=0)return;
  fromBone.updateWorldMatrix(true,true);
  fromBone.getWorldPosition(positionA);
  toBone.getWorldPosition(positionB);
  from.copy(positionB).sub(positionA);
  if(from.lengthSq()<1e-8)return;
  from.normalize();
  target.copy(desiredLocal).normalize().applyQuaternion(worldModelQ);
  // Avoid constantly "fixing" already-natural animation.
  const angle=from.angleTo(target);
  if(angle<deadzone)return;
  desiredQ.setFromUnitVectors(from,target);
  turnQ.copy(identity).slerp(desiredQ,Math.min(1,strength));
  if(fromBone.parent)fromBone.parent.getWorldQuaternion(parentQ);
  else parentQ.identity();
  inverseQ.copy(parentQ).invert();
  // Quaternion is a change in world space. Express the correction in
  // parent-local coordinates, then apply it to the animated bone rotation.
  localQ.copy(inverseQ).multiply(turnQ).multiply(parentQ);
  fromBone.quaternion.premultiply(localQ).normalize();
  fromBone.updateWorldMatrix(true,true);
 }
 function apply(walkBlend=0,cycle=0){
  scene.updateMatrixWorld(true);
  scene.getWorldQuaternion(worldModelQ);
  const moving=Math.max(0,Math.min(1,walkBlend));
  const wave=Math.sin(cycle);
  for(const j of joints){
   const side=j.side;
   // Relax the upper arms from the source T-pose (up to ~90°), leaving a
   // small natural gap between the elbows and torso. Animate a gentle swing.
   if(j.arm&&j.elbow){
    alignSegment(j.arm,j.elbow,
      new THREE.Vector3(side*.16,-.97,-.06-side*wave*.22*moving),
      .96,.09);
   }
   if(j.elbow&&j.hand){
    alignSegment(j.elbow,j.hand,
      new THREE.Vector3(side*.02,-.96,-.18-side*wave*.10*moving),
      .83,.15);
   }
   // Align fingers with the line of the forearm, rather than applying an
   // arbitrary fixed 90° wrist bend that can invert left vs right.
   if(j.hand&&j.finger&&j.elbow){
    j.elbow.getWorldPosition(positionA);
    j.hand.getWorldPosition(positionB);
    const wristDirection=positionB.clone().sub(positionA).normalize();
    // World direction -> model-local direction for the pose solver.
    const localDirection=wristDirection.applyQuaternion(worldModelQ.clone().invert());
    alignSegment(j.hand,j.finger,localDirection,.78,.17);
   }
   // Close the source's wide stance while leaving the existing walk cycle
   // intact. On moving frames, preserve the clip's forward/back leg motion.
   if(j.thigh&&j.shin){
    alignSegment(j.thigh,j.shin,
      new THREE.Vector3(side*.095,-.99,side*wave*.30*moving),
      moving>.35?.40:.86,.24);
   }
   if(j.shin&&j.foot){
    alignSegment(j.shin,j.foot,
      new THREE.Vector3(side*.035,-.99,-.05),
      moving>.35?.16:.47,.40);
   }
  }
 }
 function describe(){
  return joints.map(j=>({
   side:j.side<0?'left':'right',
   arm:j.arm?.name||null,elbow:j.elbow?.name||null,
   hand:j.hand?.name||null,finger:j.finger?.name||null,
   thigh:j.thigh?.name||null,shin:j.shin?.name||null
  }));
 }
 return {apply,describe,hasSkeleton:joints.some(j=>j.arm&&j.elbow)};
}

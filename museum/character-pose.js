/**
 * Jordan CC0 museum visitor — EXACT mirrored 90-degree wrist twist.
 *
 * Verified against the actual source GLB in the inspect-guide-rig GitHub
 * Actions job: hand_l/r are direct children of lowerarm_l/r and the wrist
 * offset is (0, 0.266244, 0) in each forearm's LOCAL frame.
 *
 * Therefore local forearm +Y is the twist axis. This is an AXIAL rotation
 * of each wrist (correcting palm orientation), not a wrist bend, shoulder
 * repositioning, or guessed world-space direction. No other joints change.
 */
function key(name){
 return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
export function locateHumanoidBones(scene){
 let left=null,right=null;
 scene.traverse(node=>{
  if(!node.isBone)return;
  const name=key(node.name);
  if(name==='handl')left=node;
  if(name==='handr')right=node;
 });
 return [
  {side:-1,hand:left,parentName:left?.parent?.name||null},
  {side:1,hand:right,parentName:right?.parent?.name||null}
 ];
}
export function createHumanoidPoseCorrector(THREE,scene){
 const joints=locateHumanoidBones(scene);
 const valid=joints.filter(({hand,side})=>
  hand?.isBone &&
  key(hand.parent?.name)===(side<0?'lowerarml':'lowerarmr') &&
  Math.abs(hand.position.y)>1e-5 &&
  Math.abs(hand.position.x)<1e-3 &&
  Math.abs(hand.position.z)<1e-3
 );
 const axis=new THREE.Vector3(0,1,0);
 const twist=new Map();
 for(const j of valid){
  // Exactly 90°, opposite signs to turn each palm inward symmetrically.
  // Geometry is mirrored, so opposite quaternion signs are required.
  twist.set(j.hand,new THREE.Quaternion().setFromAxisAngle(
   axis,j.side*Math.PI/2
  ));
 }
 const rest=valid.map(j=>({hand:j.hand,rotation:j.hand.quaternion.clone()}));
 function reset(){
  for(const j of rest)j.hand.quaternion.copy(j.rotation);
 }
 function apply(){
  // Called after AnimationMixer.update. ALL animation clips key wrists.
  // Offset the clip's current wrist quaternion in forearm-parent space,
  // preserving the original skeletal walk/idles everywhere else.
  for(const j of valid){
   j.hand.quaternion.premultiply(twist.get(j.hand)).normalize();
  }
 }
 return {
  reset,apply,
  hasSkeleton:valid.length===2,
  describe:()=>joints.map(j=>({
   side:j.side<0?'left':'right',
   hand:j.hand?.name||null,
   forearm:j.parentName,
   correctionDegrees:j.side*90,
   enabled:valid.includes(j)
  }))
 };
}

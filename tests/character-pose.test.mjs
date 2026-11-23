import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=readFileSync(resolve(root,'museum/character-pose.js'),'utf8');
const {locateHumanoidBones}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function skeleton(names){
 const nodes=names.map(name=>({name,isBone:true}));
 return {traverse(fn){nodes.forEach(fn);}};
}
function limbNames(layout){
 return layout.map(j=>({
   side:j.side,arm:j.arm?.name,elbow:j.elbow?.name,hand:j.hand?.name,
   finger:j.finger?.name,thigh:j.thigh?.name,shin:j.shin?.name,foot:j.foot?.name
 }));
}

test('reads L/R suffixes from common T-pose humanoid rigs',()=>{
 const scene=skeleton([
  'upperarm_l','lowerarm_l','hand_l','middle_01_l',
  'upperleg_l','lowerleg_l','foot_l',
  'upperarm_r','lowerarm_r','hand_r','middle_01_r',
  'upperleg_r','lowerleg_r','foot_r'
 ]);
 const [l,r]=limbNames(locateHumanoidBones(scene));
 assert.equal(l.arm,'upperarm_l');
 assert.equal(r.arm,'upperarm_r');
 assert.equal(l.hand,'hand_l');
 assert.equal(r.finger,'middle_01_r');
 assert.equal(l.shin,'lowerleg_l');
 assert.equal(r.thigh,'upperleg_r');
});

test('reads Mixamo LeftArm/RightArm bones without confusing forearms with upper arms',()=>{
 const scene=skeleton([
  'mixamorigLeftArm','mixamorigLeftForeArm','mixamorigLeftHand',
  'mixamorigLeftHandIndex1','mixamorigLeftUpLeg','mixamorigLeftLeg','mixamorigLeftFoot',
  'mixamorigRightArm','mixamorigRightForeArm','mixamorigRightHand',
  'mixamorigRightHandIndex1','mixamorigRightUpLeg','mixamorigRightLeg','mixamorigRightFoot'
 ]);
 const [l,r]=limbNames(locateHumanoidBones(scene));
 assert.equal(l.arm,'mixamorigLeftArm');
 assert.equal(l.elbow,'mixamorigLeftForeArm');
 assert.equal(r.hand,'mixamorigRightHand');
 assert.equal(r.shin,'mixamorigRightLeg');
 assert.equal(l.finger,'mixamorigLeftHandIndex1');
});

test('never assigns bones if the rig lacks the matching joint names',()=>{
 const [l,r]=locateHumanoidBones(skeleton(['Hips','Spine','Neck','Head']));
 for(const joint of [l,r]){
  assert.equal(joint.arm,null);
  assert.equal(joint.thigh,null);
  assert.equal(joint.hand,null);
 }
});

test('solver implements parent-local quaternion changes rather than guessing bone axes',()=>{
 assert.match(source,/setFromUnitVectors\(from,target\)/);
 assert.match(source,/inverseQ\.copy\(parentQ\)\.invert\(\)/);
 assert.match(source,/fromBone\.quaternion\.premultiply\(localQ\)/);
 assert.match(source,/alignSegment\(j\.hand,j\.finger,localDirection/);
 assert.match(source,/alignSegment\(j\.thigh,j\.shin/);
});

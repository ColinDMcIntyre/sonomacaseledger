import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=readFileSync(resolve(root,'museum/character-pose.js'),'utf8');
const {locateHumanoidBones}=await import('data:text/javascript;base64,'+
 Buffer.from(source).toString('base64'));

function skeleton(names,handPairs){
 const root={isBone:false,name:'Root',parent:null},nodes=new Map();
 for(const name of names)nodes.set(name,{name,isBone:true,parent:root});
 for(const [finger,hand] of handPairs)nodes.get(finger).parent=nodes.get(hand);
 return {traverse(fn){for(const n of nodes.values())fn(n);}};
}

test('corrector identifies wrist and finger bones on L/R suffix rigs',()=>{
 const scene=skeleton([
  'upperarm_l','lowerarm_l','hand_l','middle_01_l','upperleg_l','lowerleg_l',
  'upperarm_r','lowerarm_r','hand_r','middle_01_r','upperleg_r','lowerleg_r'
 ],[['middle_01_l','hand_l'],['middle_01_r','hand_r']]);
 const [left,right]=locateHumanoidBones(scene);
 assert.equal(left.hand.name,'hand_l');
 assert.equal(left.finger.name,'middle_01_l');
 assert.equal(right.hand.name,'hand_r');
 assert.equal(right.finger.name,'middle_01_r');
 assert.ok(!('thigh' in left) && !('arm' in right),'Shoulder/leg bones must not be selected for modification');
});

test('corrector identifies Mixamo wrist/finger bones and ignores legs',()=>{
 const scene=skeleton([
  'mixamorigLeftArm','mixamorigLeftForeArm','mixamorigLeftHand',
  'mixamorigLeftHandIndex1','mixamorigLeftUpLeg','mixamorigLeftLeg',
  'mixamorigRightArm','mixamorigRightForeArm','mixamorigRightHand',
  'mixamorigRightHandIndex1','mixamorigRightUpLeg','mixamorigRightLeg'
 ],[['mixamorigLeftHandIndex1','mixamorigLeftHand'],
    ['mixamorigRightHandIndex1','mixamorigRightHand']]);
 const [left,right]=locateHumanoidBones(scene);
 assert.equal(left.hand.name,'mixamorigLeftHand');
 assert.equal(left.finger.name,'mixamorigLeftHandIndex1');
 assert.equal(right.hand.name,'mixamorigRightHand');
 assert.equal(right.finger.name,'mixamorigRightHandIndex1');
});

test('missing named finger bone produces safe no-op',()=>{
 const joints=locateHumanoidBones(skeleton(['Hips','LeftHand','RightHand'],[]));
 assert.equal(joints[0].finger,null);
 assert.equal(joints[1].finger,null);
});

test('only wrist quaternions can be modified and they cannot accumulate indefinitely',()=>{
 const character=readFileSync(resolve(root,'museum/character.js'),'utf8');
 assert.match(source,/j\.hand\.quaternion\.premultiply\(localCorrection\)/);
 assert.doesNotMatch(source,/j\.(arm|elbow|thigh|shin|foot)\.quaternion/);
 assert.doesNotMatch(source,/alignSegment\(j\.(arm|elbow|thigh|shin)/);
 assert.match(source,/const MAX_CORRECTION=Math\.PI\/2/);
 assert.match(source,/function reset\(\)/);
 assert.match(source,/j\.hand\.quaternion\.copy\(j\.rest\)/);
 assert.match(character,/detailPose\.reset\(\)/);
 assert.match(character,/if\(detailInstalled&&detailPose\)detailPose\.apply\(blend,phase\)/);
 assert.match(source,/localCorrection\.copy\(inverseParent\)\.multiply\(worldCorrection\)\.multiply\(parentQ\)/);
});

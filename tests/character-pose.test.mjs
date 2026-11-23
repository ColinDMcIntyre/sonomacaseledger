import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=readFileSync(resolve(root,'museum/character-pose.js'),'utf8');
const {locateHumanoidBones,createHumanoidPoseCorrector}=await import(
 'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
);

class FakeQuaternion{
 constructor(){this.applied=[];this.angle=0;}
 setFromAxisAngle(axis,angle){this.axis={x:axis.x,y:axis.y,z:axis.z};this.angle=angle;return this;}
 clone(){const q=new FakeQuaternion();q.angle=this.angle;return q;}
 copy(q){this.angle=q.angle;this.applied=[];return this;}
 premultiply(q){this.applied.push(q.angle);return this;}
 normalize(){return this;}
}
class FakeVector3{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}
const THREE={Quaternion:FakeQuaternion,Vector3:FakeVector3};
const bone=(name,parent=null,pos={x:0,y:.266244,z:0})=>({
 name,parent,isBone:true,position:pos,quaternion:new FakeQuaternion()
});
function scene(){
 const leftForearm=bone('lowerarm_l'),rightForearm=bone('lowerarm_r');
 const leftHand=bone('hand_l',leftForearm),rightHand=bone('hand_r',rightForearm);
 const hip=bone('pelvis'),leftLeg=bone('thigh_l',hip),rightLeg=bone('thigh_r',hip);
 const list=[leftForearm,rightForearm,leftHand,rightHand,hip,leftLeg,rightLeg];
 return {traverse(fn){list.forEach(fn);},list,leftHand,rightHand,leftLeg,rightLeg};
}
test('identify only Jordan hands, with the exact verified forearm parents',()=>{
 const x=scene(),joints=locateHumanoidBones(x);
 assert.equal(joints[0].hand,x.leftHand);
 assert.equal(joints[0].parentName,'lowerarm_l');
 assert.equal(joints[1].hand,x.rightHand);
 assert.equal(joints[1].parentName,'lowerarm_r');
});
test('exact mirrored 90-degree wrist twist leaves arm/leg animation untouched',()=>{
 const x=scene(),solver=createHumanoidPoseCorrector(THREE,x);
 assert.equal(solver.hasSkeleton,true);
 solver.apply();
 assert.equal(x.leftHand.quaternion.applied[0],-Math.PI/2);
 assert.equal(x.rightHand.quaternion.applied[0],Math.PI/2);
 assert.deepEqual(x.leftLeg.quaternion.applied,[]);
 assert.deepEqual(x.rightLeg.quaternion.applied,[]);
 assert.deepEqual(solver.describe().map(x=>x.correctionDegrees),[-90,90]);
 solver.reset();
 assert.deepEqual(x.leftHand.quaternion.applied,[]);
 assert.deepEqual(x.rightHand.quaternion.applied,[]);
});
test('missing or incompatible wrist hierarchy never gets arbitrary rotations',()=>{
 const x=scene();x.leftHand.parent=bone('not_lowerarm');
 const solver=createHumanoidPoseCorrector(THREE,x);
 assert.equal(solver.hasSkeleton,false);
 solver.apply();
 assert.deepEqual(x.leftHand.quaternion.applied,[]);
 assert.equal(x.rightHand.quaternion.applied[0],Math.PI/2);
});
test('no floating hand-direction correction or other joint modifications',()=>{
 const character=readFileSync(resolve(root,'museum/character.js'),'utf8');
 assert.match(source,/j\.side\*Math\.PI\/2/);
 assert.match(source,/new THREE\.Vector3\(0,1,0\)/);
 assert.match(source,/j\.hand\.quaternion\.premultiply\(twist\.get\(j\.hand\)\)/);
 assert.doesNotMatch(source,/setFromUnitVectors|fingerPosition|alignSegment|thigh\.quaternion|arm\.quaternion/);
 assert.match(character,/detailPose\.reset\(\)/);
 assert.match(character,/detailPose\.apply\(blend,phase\)/);
});

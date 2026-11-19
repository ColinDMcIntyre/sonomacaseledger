import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const VISITOR_URL = 'https://gobkit.com/freebies/human001/OfficeLady.glb';
// Prototype CDN asset: Gobkit CC0. For production bundle a local GLB instead.
// The procedural visitor below is the fallback when a remote asset is unavailable.

export function createVisitor(scene,onStatus){
 const root=new THREE.Group();scene.add(root);
 const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.78});
 const coat=mat(0x445b5d),trousers=mat(0x354149),skin=mat(0xb79275),trim=mat(0xc0a679);
 const fallback=new THREE.Group();root.add(fallback);
 function part(g,m,x,y,z,where){
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);where.add(o);o.castShadow=true;return o;
 }
 part(new THREE.CylinderGeometry(.38,.3,.86,9),coat,0,1.19,0,fallback);
 part(new THREE.SphereGeometry(.29,12,8),skin,0,1.87,0,fallback);
 part(new THREE.BoxGeometry(.36,.08,.19),trim,0,1.71,.17,fallback);
 const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();fallback.add(leftLeg,rightLeg);
 leftLeg.position.set(-.16,.81,0);rightLeg.position.set(.16,.81,0);
 part(new THREE.CylinderGeometry(.115,.125,.74,8),trousers,0,-.39,0,leftLeg);
 part(new THREE.CylinderGeometry(.115,.125,.74,8),trousers,0,-.39,0,rightLeg);
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.55,0);fallback.add(arm);
  part(new THREE.CylinderGeometry(.11,.08,.7,8),coat,side*.035,-.3,0,arm);
  arms.push(arm);
 }
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,20),new THREE.MeshBasicMaterial({color:0x14252b,transparent:true,opacity:.24,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;root.add(shadow);
 let model=null,mixer=null,idleAction=null,walkAction=null,usingAsset=false,walking=false,phase=0,loadFailed=false;
 function setWalking(on){
  if(walking===on)return;
  walking=on;
  if(mixer&&idleAction&&walkAction){
   const next=walking?walkAction:idleAction;
   const previous=walking?idleAction:walkAction;
   next.reset();next.enabled=true;next.setEffectiveWeight(1);next.fadeIn(.24).play();
   previous.fadeOut(.24);
  }
 }
 function tick(dt,time){
  phase+=dt*(walking?8.5:1.4);
  if(mixer)mixer.update(dt);
  if(!usingAsset){
   const a=walking?Math.sin(phase)*.53:0;
   leftLeg.rotation.x=a;rightLeg.rotation.x=-a;
   arms[0].rotation.x=-a*.65;arms[1].rotation.x=a*.65;
   fallback.position.y=walking?Math.abs(Math.sin(phase))*.035:Math.sin(phase)*.012;
  }
  if(model&&usingAsset){model.position.y=model.userData.restY;}
 }
 async function load(){
  onStatus('Character: loading CC0 animation');
  try{
   const gltf=await new GLTFLoader().loadAsync(VISITOR_URL);
   const object=gltf.scene;
   if(!object)throw new Error('Character model missing');
   const bounds=new THREE.Box3().setFromObject(object);
   const size=bounds.getSize(new THREE.Vector3());
   const scale=2.02/Math.max(1,size.y);
   object.scale.setScalar(scale);
   const adjusted=new THREE.Box3().setFromObject(object);
   object.position.y=-adjusted.min.y;
   object.userData.restY=object.position.y;
   root.add(object);
   const clips=gltf.animations||[];
   const idle=THREE.AnimationClip.findByName(clips,'Idle')||THREE.AnimationClip.findByName(clips,'idle');
   const walk=THREE.AnimationClip.findByName(clips,'Walk')||THREE.AnimationClip.findByName(clips,'walk');
   if(idle&&walk){
    mixer=new THREE.AnimationMixer(object);
    idleAction=mixer.clipAction(idle);walkAction=mixer.clipAction(walk);
    idleAction.play();walkAction.play().setEffectiveWeight(0);
   }
   model=object;usingAsset=true;fallback.visible=false;
   if(walking){walking=false;setWalking(true);}
   onStatus('Character: Gobkit CC0, Idle / Walk');
  }catch(error){
   loadFailed=true;
   onStatus('Character: built-in animated visitor');
  }
 }
 load();
 return {root,setWalking,tick,get usesAsset(){return usingAsset;},get fallbackActive(){return loadFailed;}};
}

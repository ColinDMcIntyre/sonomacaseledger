import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const VISITOR_URL = 'https://gobkit.com/freebies/human001/OfficeLady.glb';
// Prototype CDN asset: Gobkit CC0. For production bundle a local GLB instead.
// The procedural visitor below is the fallback when a remote asset is unavailable.

export function createVisitor(scene,onStatus){
 const root=new THREE.Group();root.scale.setScalar(1.19);scene.add(root);
 const mat=(c,roughness=.65,metalness=0)=>new THREE.MeshPhysicalMaterial({color:c,roughness,metalness,clearcoat:.12,envMapIntensity:.75});
 const coat=mat(0x405867,.85),trousers=mat(0x252e37,.84),skin=mat(0xc99a78,.85);
 const trim=mat(0xc0a679,.37,.42),hair=mat(0x32251e,.9),shoe=mat(0x231b1a,.45);
 const shirt=mat(0xe2d7c0,.82);
 const fallback=new THREE.Group();root.add(fallback);
 function part(g,m,x,y,z,where){
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);where.add(o);o.castShadow=true;return o;
 }
 part(new THREE.CylinderGeometry(.33,.29,.88,16),coat,0,1.2,0,fallback);
 const shoulders=part(new THREE.SphereGeometry(.42,20,14),coat,0,1.57,0,fallback);shoulders.scale.set(1,.4,.55);
 part(new THREE.CylinderGeometry(.12,.12,.18,12),skin,0,1.7,0,fallback);
 const head=part(new THREE.SphereGeometry(.27,28,18),skin,0,1.91,.025,fallback);head.scale.set(.89,1.06,.86);
 const haircut=part(new THREE.SphereGeometry(.28,26,16),hair,0,2.03,-.025,fallback);haircut.scale.set(.95,.58,.91);
 for(const x of [-.12,.12]){
  const eye=part(new THREE.SphereGeometry(.023,9,8),hair,x,1.94,.248,fallback);
  eye.castShadow=false;
 }
 part(new THREE.BoxGeometry(.24,.25,.04),shirt,0,1.45,.31,fallback);
 part(new THREE.BoxGeometry(.1,.04,.08),trim,0,1.39,.35,fallback);
 const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();fallback.add(leftLeg,rightLeg);
 leftLeg.position.set(-.16,.81,0);rightLeg.position.set(.16,.81,0);
 part(new THREE.CylinderGeometry(.11,.14,.76,12),trousers,0,-.39,0,leftLeg);
 part(new THREE.CylinderGeometry(.11,.14,.76,12),trousers,0,-.39,0,rightLeg);
 const leftShoe=part(new THREE.BoxGeometry(.28,.16,.42),shoe,0,-.76,.095,leftLeg);
 const rightShoe=part(new THREE.BoxGeometry(.28,.16,.42),shoe,0,-.76,.095,rightLeg);
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.55,0);fallback.add(arm);
  part(new THREE.CylinderGeometry(.125,.095,.67,12),coat,side*.035,-.3,0,arm);
  part(new THREE.SphereGeometry(.103,12,10),skin,side*.055,-.67,0,arm);
  arms.push(arm);
 }
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(64,64,10,64,64,63);
 gradient.addColorStop(0,'rgba(20,17,14,.46)');gradient.addColorStop(1,'rgba(20,17,14,0)');
 sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
 const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.45),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.8}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.013;root.add(shadow);
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
   const scale=2.15/Math.max(1,size.y);
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
   onStatus('Character: animated CC0 GLB');
  }catch(error){
   loadFailed=true;
   onStatus('Character: procedural animated visitor');
  }
 }
 load();
 return {root,setWalking,tick,get usesAsset(){return usingAsset;},get fallbackActive(){return loadFailed;}};
}

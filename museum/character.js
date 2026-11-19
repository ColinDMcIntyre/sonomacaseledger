import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/*
 * Reliable third-person character and locomotion.
 * A CC0 GLB is used ONLY when real Idle and Walk clips can be identified.
 * Otherwise the built-in articulated rig remains visible and animates every
 * frame. This prevents the previous motionless GLB bug.
 */
const LEGACY_ASSET='https://gobkit.com/freebies/human001/OfficeLady.glb';
async function characterSource(){
 try{
  const response=await fetch('./assets/manifest.json',{cache:'no-store'});
  if(response.ok){
   const config=(await response.json()).character;
   if(typeof config?.path==='string' &&
      /^\.\/assets\/characters\/[a-zA-Z0-9_\/-]+\.glb$/.test(config.path))
    return {url:config.path,local:true};
  }
 }catch{}
 return {url:LEGACY_ASSET,local:false};
}
const cyl=(r1,r2,h,n=14)=>new THREE.CylinderGeometry(r1,r2,h,n);
export function createVisitor(scene,onStatus){
 const root=new THREE.Group();scene.add(root);
 const mat=(color,roughness=.78,metalness=0)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,envMapIntensity:.58});
 const coat=mat(0x46545a,.86),coatDark=mat(0x29383f,.87),pants=mat(0x273139,.86);
 const leather=mat(0x2c241f,.66),skin=mat(0xc69d7e,.91),hair=mat(0x362820,.96),shirt=mat(0xe6ddcf,.8),brass=mat(0x9b814e,.45,.53);
 function part(parent,geo,material,x,y,z,shadow=true){
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);
  m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
 }
 const proxy=new THREE.Group();root.add(proxy);
 // Proportionally correct walking rig, ~2.1 metres tall in museum units.
 const body=new THREE.Group();proxy.add(body);
 part(body,new THREE.CylinderGeometry(.34,.27,.77,22),coat,0,1.4,0);
 const shoulders=part(body,new THREE.SphereGeometry(.385,20,14),coat,0,1.68,0);shoulders.scale.set(1,.32,.52);
 part(body,cyl(.104,.11,.17,12),skin,0,1.82,0);
 const collar=part(body,new THREE.ConeGeometry(.18,.24,4),shirt,0,1.68,.23);
 collar.rotation.y=Math.PI/4;
 // Lapel strips and lower jacket seam.
 const lapelL=part(body,new THREE.BoxGeometry(.085,.46,.06),coatDark,-.16,1.49,.27);
 const lapelR=part(body,new THREE.BoxGeometry(.085,.46,.06),coatDark,.16,1.49,.27);
 lapelL.rotation.z=-.22;lapelR.rotation.z=.22;
 for(let y=1.15;y<1.54;y+=.18)part(body,new THREE.SphereGeometry(.018,9,7),brass,.03,y,.32);
 const head=part(body,new THREE.SphereGeometry(.245,24,20),skin,0,2.04,.025);head.scale.set(.92,1.12,.92);
 const hairCap=part(body,new THREE.SphereGeometry(.256,24,20),hair,0,2.15,-.02);hairCap.scale.set(.98,.66,.98);
 const sideHair=part(body,new THREE.BoxGeometry(.48,.15,.31),hair,0,2.19,-.11);
 for(const sign of [-1,1]){
  const ear=part(body,new THREE.SphereGeometry(.046,9,8),skin,sign*.225,2.035,0);
  const eye=part(body,new THREE.SphereGeometry(.020,10,7),coatDark,sign*.096,2.075,.232,false);
  const brow=part(body,new THREE.BoxGeometry(.078,.016,.019),hair,sign*.096,2.13,.237,false);
 }
 part(body,new THREE.SphereGeometry(.038,10,7),skin,0,1.98,.238,false);
 const hips=part(body,new THREE.CylinderGeometry(.27,.275,.22,16),pants,0,1.02,0);
 const legs=[];
 for(const sign of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(sign*.158,.99,0);proxy.add(pivot);
  part(pivot,cyl(.14,.105,.49),pants,0,-.26,0);
  const knee=new THREE.Group();knee.position.y=-.53;pivot.add(knee);
  part(knee,cyl(.107,.085,.51),pants,0,-.26,0);
  const shoe=part(knee,new THREE.BoxGeometry(.232,.135,.36),leather,0,-.56,.075);
  part(knee,new THREE.BoxGeometry(.23,.04,.38),coatDark,0,-.63,.07);
  legs.push({hip:pivot,knee});
 }
 const arms=[];
 for(const sign of [-1,1]){
  const arm=new THREE.Group();arm.position.set(sign*.38,1.68,0);body.add(arm);
  part(arm,cyl(.15,.115,.43),coat,sign*.018,-.24,0);
  const elbow=new THREE.Group();elbow.position.set(sign*.02,-.47,0);arm.add(elbow);
  part(elbow,cyl(.115,.075,.39),coat,0,-.21,0);
  part(elbow,new THREE.SphereGeometry(.089,12,10),skin,0,-.435,.01);
  arms.push({shoulder:arm,elbow,sign});
 }
 // Soft ground contact shadow: stays at floor height while body bobs.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,5,64,64,64);
 grad.addColorStop(0,'rgba(15,12,10,.5)');grad.addColorStop(1,'rgba(15,12,10,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 const tex=new THREE.CanvasTexture(canvas);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),
  new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.66}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;root.add(shadow);
 let model=null,mixer=null,idleAction=null,walkAction=null,usingAsset=false;
 const modelRestPosition=new THREE.Vector3();
 let walking=false,blend=0,phase=0;
 function setWalking(value){walking=Boolean(value);}
 function tick(dt){
  const smooth=1-Math.exp(-dt*11);
  blend+=(Number(walking)-blend)*smooth;
  phase+=dt*(walking?10:1.8);
  if(usingAsset&&mixer){
   idleAction.setEffectiveWeight(1-blend);
   walkAction.setEffectiveWeight(blend);
   mixer.update(dt);
   // Preserve the imported model's measured local centering. Resetting X/Z
   // to zero undid the GLB centering and shifted the visible avatar right.
   if(model){
    model.position.x=modelRestPosition.x;
    model.position.z=modelRestPosition.z;
   }
  }
  // The procedural rig always has genuine walk and idle animation.
  if(!usingAsset){
   const gait=Math.sin(phase),bob=Math.abs(Math.sin(phase));
   proxy.position.y=blend*(bob*.055)+(1-blend)*Math.sin(phase)*.012;
   body.rotation.y=gait*blend*.055;
   body.rotation.z=Math.cos(phase)*blend*.022;
   body.scale.y=1+(1-blend)*Math.sin(phase*.73)*.005;
   for(let i=0;i<2;i++){
    const sign=i===0?1:-1;
    legs[i].hip.rotation.x=sign*gait*.64*blend;
    legs[i].knee.rotation.x=Math.max(0,-sign*gait)*.64*blend;
    arms[i].shoulder.rotation.x=-sign*gait*.47*blend+(1-blend)*(i===0?-.025:.025);
    arms[i].elbow.rotation.x=-.14-.22*Math.max(0,sign*gait)*blend;
   }
   head.rotation.y=Math.sin(phase*.41)*.015*(1-blend);
  }
 }
 async function tryAnimatedModel(){
  onStatus('Visitor: checking installed Walk/Idle model');
  try{
   const selected=await characterSource();
   const gltf=await new GLTFLoader().loadAsync(selected.url);
   const clips=(gltf.animations||[]).filter(c=>c.tracks?.length>0);
   const find=(rx)=>clips.find(c=>rx.test(c.name||''));
   const walk=find(/walk|walking|locomotion|run|stride/i);
   const idle=find(/idle|standing|rest|breathe|breathing/i);
   if(!walk||!idle||walk===idle){
    console.warn('GLB does not contain named Idle and Walk animation clips:',clips.map(x=>x.name));
    onStatus('Visitor: native Walk + Idle animation');
    return;
   }
   const obj=gltf.scene;
   if(!obj)throw new Error('Model missing');
   // Center model at local origin and scale to human height.
   const bb=new THREE.Box3().setFromObject(obj),size=bb.getSize(new THREE.Vector3());
   const scale=2.12/Math.max(.1,size.y);obj.scale.setScalar(scale);
   const next=new THREE.Box3().setFromObject(obj);
   obj.position.set(-(next.min.x+next.max.x)/2,-next.min.y,-(next.min.z+next.max.z)/2);
   modelRestPosition.copy(obj.position);
   obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   mixer=new THREE.AnimationMixer(obj);
   idleAction=mixer.clipAction(idle);walkAction=mixer.clipAction(walk);
   idleAction.play();walkAction.play();idleAction.setEffectiveWeight(1);walkAction.setEffectiveWeight(0);
   root.add(obj);model=obj;usingAsset=true;proxy.visible=false;
   onStatus('Visitor: '+(selected.local?'installed realistic rig':'legacy placeholder')+' Walk/Idle');
  }catch(e){
   console.warn('Animated character unavailable. Using native Walk/Idle rig.',e);
   onStatus('Visitor: native Walk + Idle animation');
  }
 }
 // The character is visible and animating immediately; remote asset is optional.
 onStatus('Visitor: native Walk + Idle animation');
 tryAnimatedModel();
 return {root,setWalking,tick,get usesAsset(){return usingAsset;}};
}

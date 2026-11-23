import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHumanoidPoseCorrector} from './character-pose.js?v=wrist-only-20261122';
import {loadNaturalLocomotion,loadCc0Motion} from './animation-library.js';

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
 // Developer-only local preview. No proprietary file is hosted or uploaded.
 let privatePreview=false, privateBonePose=[];
 function installPrivateModel(obj){
  if(!obj?.isObject3D)throw new Error('Private asset is not a Three.js scene');
  const bounds=new THREE.Box3().setFromObject(obj),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.05)throw new Error('Private character has invalid dimensions');
  initialExpired=true;detailPose=null;detailInstalled=false;
  if(model)root.remove(model);
  if(mixer){mixer.stopAllAction();mixer=null;}
  obj.scale.multiplyScalar(2.12/size.y);
  const next=new THREE.Box3().setFromObject(obj);
  obj.position.x-=(next.min.x+next.max.x)/2;
  obj.position.y-=next.min.y;
  obj.position.z-=(next.min.z+next.max.z)/2;
  modelRestPosition.copy(obj.position);
  root.add(obj);model=obj;usingAsset=true;privatePreview=true;proxy.visible=false;
  obj.updateMatrixWorld(true);
  const bones=new Map();
  obj.traverse(node=>{
   if(!node.isBone)return;
   const name=node.name.toLowerCase().replace(/^.*::/,'');
   const parentQ=node.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
   bones.set(name,{node,rest:node.quaternion.clone(),
    xAxis:new THREE.Vector3(1,0,0).applyQuaternion(parentQ),
    zAxis:new THREE.Vector3(0,0,1).applyQuaternion(parentQ)});
  });
  privateBonePose=[
   ['upperarm_l','z',1.00,.15,0],['upperarm_r','z',-1.00,-.15,Math.PI],
   ['upperleg_l','x',0,.37,0],['upperleg_r','x',0,.37,Math.PI],
   ['lowerleg_l','x',0,.23,0],['lowerleg_r','x',0,.23,Math.PI],
   ['spine_02','x',0,.015,0]
  ].map(([name,axis,rest,swing,offset])=>({...bones.get(name),name,axis,angle:rest,swing,offset}))
   .filter(p=>p.node);
  onStatus('Visitor: private Renderpeople local preview');
 }
 function animatePrivatePose(){
  if(!privatePreview||!model)return;
  const wave=Math.sin(phase);
  model.position.y=modelRestPosition.y+blend*.028*Math.abs(wave);
  for(const p of privateBonePose){
   const rhythm=Math.sin(phase+p.offset);
   const bend=p.name.startsWith('lowerleg')?Math.max(0,rhythm)*p.swing*blend:rhythm*p.swing*blend;
   const q=new THREE.Quaternion().setFromAxisAngle(p.axis==='x'?p.xAxis:p.zAxis,p.angle+bend);
   p.node.quaternion.copy(p.rest).premultiply(q);
  }
 }

 let walking=false,blend=0,phase=0;
 function setWalking(value){walking=Boolean(value);}
 function tick(dt){
  const smooth=1-Math.exp(-dt*11);
  blend+=(Number(walking)-blend)*smooth;
  phase+=dt*(walking?10:1.8);
  // Only hands are pose-corrected. Restore them before each mixer step
  // so unkeyed wrist tracks never accumulate our prior correction.
  if(detailInstalled&&detailPose)detailPose.reset();
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
  if(detailInstalled&&detailPose)detailPose.apply(blend,phase);
  if(privatePreview)animatePrivatePose();
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
  if(privatePreview||detailInstalled)return true;
  onStatus('Visitor: loading lightweight animated fallback');
  try{
   const selected=await characterSource();
   const gltf=await new GLTFLoader().loadAsync(selected.url);
   const clips=(gltf.animations||[]).filter(c=>c.tracks?.length>0);
   const walk=clips.find(c=>/walk|walking|locomotion|run|stride/i.test(c.name||''));
   const idle=clips.find(c=>/idle|standing|rest|breathe|breathing/i.test(c.name||''));
   if(!walk||!idle||walk===idle){
    console.warn('Lightweight model missing Idle + Walk clips:',clips.map(c=>c.name));
    onStatus('Visitor: native animated fallback');
    return false;
   }
   if(privatePreview||detailInstalled)return true;
   const obj=gltf.scene;
   if(!obj)throw Error('Lightweight visitor missing scene');
   const bb=new THREE.Box3().setFromObject(obj,true);
   const size=bb.getSize(new THREE.Vector3());
   if(size.y<.1)throw Error('Lightweight visitor has invalid height');
   obj.scale.multiplyScalar(2.28/size.y);
   const box=new THREE.Box3().setFromObject(obj,true);
   obj.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
   modelRestPosition.copy(obj.position);
   obj.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=true;}});
   mixer=new THREE.AnimationMixer(obj);
   idleAction=mixer.clipAction(idle);walkAction=mixer.clipAction(walk);
   idleAction.play();walkAction.play();
   idleAction.setEffectiveWeight(1-blend);
   walkAction.setEffectiveWeight(blend);
   root.add(obj);model=obj;usingAsset=true;proxy.visible=false;
   onStatus('Visitor: lightweight animated guide');
   return true;
  }catch(error){
   console.warn('Lightweight animated model unavailable; using native fallback',error);
   proxy.visible=true;usingAsset=false;
   onStatus('Visitor: native animated fallback');
   return false;
  }
 }

 // High-detail guide is the FIRST choice, not a delayed skin swap. The museum
 // loading screen stays up while this model initializes. If it fails, the
 // lightweight animated visitor remains a functional fallback.
 let detailLoading=false,detailInstalled=false,detailPose=null,initialExpired=false;
 let motionLibraryConfig=null,motionCatalog=[];
 async function upgradeToHighDetail(preselected=null,availableMotions=null){
  if(privatePreview)return false;
  if(detailInstalled)return true;
  if(detailLoading)return false;
  if(!preselected)initialExpired=false; // explicit user retry after timeout
  detailLoading=true;
  let candidate=null;
  try{
   let highDetail=preselected;
   if(!highDetail){
    const response=await fetch('./assets/manifest.json',{cache:'no-store'});
    if(!response.ok)return false;
    const config=(await response.json())?.character;
    highDetail=config?.highDetail;
    availableMotions=config?.animationLibrary;
   }
   // Only publicly redistributable, self-hosted human models are accepted.
   if(highDetail?.license!=='CC0-1.0'||
      highDetail.path!=='./assets/characters/realistic_guide_cc0.glb')return false;
   onStatus('Visitor: preparing realistic animated guide');
   const gltf=await new GLTFLoader().loadAsync(highDetail.path);
   if(privatePreview||initialExpired)return false;
   const clips=(gltf.animations||[]).filter(c=>c.tracks?.length);
   const idle=clips.find(c=>/idle|standing|rest/i.test(c.name||''));
   const walk=clips.find(c=>/walk|stride|locomotion/i.test(c.name||''));
   if(!idle||!walk||idle===walk)throw Error('Missing separate idle and walk clips');
   const obj=gltf.scene;
   if(!obj)throw Error('No scene in high-detail GLB');
   candidate=obj;
   obj.traverse(node=>{
    if(node.isMesh||node.isSkinnedMesh){node.receiveShadow=true;node.castShadow=false;}
   });
   // Prefer the CC0 KinemIQ walking library, retargeted to Jordan's
   // original skeleton. A rig mismatch or download failure must NEVER
   // substitute invalid animations or break the visible character.
   let idleClip=idle,walkClip=walk,usedNaturalMotions=false;
   if(availableMotions?.license==='CC0-1.0'){
    try{
     const result=await loadNaturalLocomotion(obj,availableMotions);
     idleClip=result.idle;walkClip=result.walk;
     usedNaturalMotions=true;
     console.info('Using retargeted CC0 locomotion:',idleClip.name,walkClip.name);
    }catch(error){
     console.warn('Motion retargeting unavailable; original Jordan clips retained:',error);
    }
   }
   const nextMixer=new THREE.AnimationMixer(obj);
   const nextIdle=nextMixer.clipAction(idleClip),nextWalk=nextMixer.clipAction(walkClip);
   nextIdle.play();nextWalk.play();
   nextIdle.setEffectiveWeight(1);nextWalk.setEffectiveWeight(0);
   nextMixer.update(0);
   // The source animation owns the full body. Only wrist orientation is
   // adjusted for neutral hand position, before measuring avatar size.
   const corrector=createHumanoidPoseCorrector(THREE,obj);
   if(corrector.hasSkeleton){
    corrector.apply(0,0);
    console.info('Wrist-only correction mapping:',corrector.describe());
   }else{
    console.warn('Could not identify both hand/finger chains; keeping original animation.');
   }
   const bounds=new THREE.Box3().setFromObject(obj,true);
   const size=bounds.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<.25||size.y>1000)
    throw Error('Invalid high-detail standing character height');
   // Larger than the old visitor: framed like a person, not a miniature.
   obj.scale.multiplyScalar(2.64/size.y);
   const aligned=new THREE.Box3().setFromObject(obj,true);
   obj.position.set(-(aligned.min.x+aligned.max.x)/2,-aligned.min.y,
     -(aligned.min.z+aligned.max.z)/2);
   if(privatePreview||initialExpired)return false;
   if(mixer)mixer.stopAllAction();
   if(model)root.remove(model);
   root.add(obj);
   model=obj;modelRestPosition.copy(obj.position);
   mixer=nextMixer;idleAction=nextIdle;walkAction=nextWalk;
   motionLibraryConfig=usedNaturalMotions?availableMotions:null;
   motionCatalog=motionLibraryConfig?.clips||[];
   detailPose=corrector;
   usingAsset=true;detailInstalled=true;proxy.visible=false;shadow.visible=true;
   onStatus('Visitor: realistic guide · '+(usedNaturalMotions?'retargeted CC0 motion':'original Walk/Idle')+' · exact 90° wrists');
   candidate=null;
   return true;
  }catch(error){
   console.warn('Realistic guide unavailable; existing visitor preserved.',error);
   return false;
  }finally{
   if(candidate?.parent===root)root.remove(candidate);
   detailLoading=false;
  }
 }
 // Resolve the preferred visitor before exposing the museum canvas:
 // no wrong avatar first, no mid-visit change in size or appearance.
 onStatus('Visitor: loading museum guide');
 const ready=(async()=>{
  try{
   const response=await fetch('./assets/manifest.json',{cache:'no-store'});
   const config=response.ok?(await response.json())?.character:null;
   const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
   const limited=connection?.saveData||/^(slow-2g|2g|3g)$/.test(connection?.effectiveType||'');
   if(config?.highDetail?.license==='CC0-1.0'&&!limited){
    proxy.visible=false;shadow.visible=false;
    let handle;
    const expiry=new Promise(resolve=>{
     handle=setTimeout(()=>{initialExpired=true;resolve('timeout');},24000);
    });
    const result=await Promise.race([upgradeToHighDetail(config.highDetail,config.animationLibrary),expiry]);
    clearTimeout(handle);
    if(result===true){shadow.visible=true;return true;}
    if(result==='timeout')onStatus('Visitor: using fast animated fallback');
    proxy.visible=true;shadow.visible=true;
   }
   return await tryAnimatedModel();
  }catch(error){
   console.warn('Visitor preparation failed; native guide remains available.',error);
   proxy.visible=true;shadow.visible=true;usingAsset=false;
   onStatus('Visitor: native animated fallback');
   return false;
  }
 })();
 return {root,setWalking,tick,ready,installPrivateModel,upgradeToHighDetail,
  get usesAsset(){return usingAsset;},
  get usesHighDetail(){return detailInstalled;},
  get availableAnimations(){return motionCatalog.slice();}};
}

import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'three/addons/utils/SkeletonUtils.js';
import {installCaseDioramas} from './case-dioramas.js';

/**
 * Local-only asset mount system. It never calls a public model API at runtime.
 * The import workflow writes museum/assets/manifest.json after downloading
 * verified CC0 files. Existing museum geometry remains visible on errors.
 */
const safeLocalPath=(path)=>typeof path==='string'
 && path.startsWith('./assets/models/')
 && !path.split('/').includes('..')
 && /\.(glb|gltf)$/i.test(path);
const cache=new Map();
const loader=new GLTFLoader();
function load(path){
 if(!cache.has(path))cache.set(path,loader.loadAsync(path).then(gltf=>gltf.scene).catch(error=>{
  cache.delete(path);throw error;
 }));
 return cache.get(path);
}
function hashSeed(value){
 let h=2166136261;
 for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 return (h>>>0)/4294967295;
}
/**
 * Distinguish repeated cabinets without altering authored/atlased UVs or
 * duplicating GPU image textures. Only physical finish and color vary.
 */
function variationMaterial(material,seed){
 if(!material?.isMaterial||material.transparent||material.opacity<.97)return material;
 if(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)return material;
 const clone=material.clone();
 const tone=.944+hashSeed(String(seed)+'tone')*.11;
 if(clone.color)clone.color.multiplyScalar(tone);
 if(typeof clone.roughness==='number')
  clone.roughness=Math.max(.13,Math.min(1,clone.roughness+
   (hashSeed(String(seed)+'rough')-.5)*.075));
 return clone;
}
function normalize(original,config,seed='museum'){
 const clone=skeletonClone(original);
 clone.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(clone);
 if(bounds.isEmpty())throw new Error('Model contains no renderable geometry');
 const size=bounds.getSize(new THREE.Vector3());
 const target=config.targetSize||[1.7,2.3,1.35];
 const fit=Math.min(
  target[0]/Math.max(size.x,.01),
  target[1]/Math.max(size.y,.01),
  target[2]/Math.max(size.z,.01)
 );
 const scale=THREE.MathUtils.clamp(fit,.05,20);
 clone.scale.multiplyScalar(scale*(.987+hashSeed(String(seed)+'scale')*.026));
 clone.updateMatrixWorld(true);
 const fitted=new THREE.Box3().setFromObject(clone);
 const center=fitted.getCenter(new THREE.Vector3());
 clone.position.set(-center.x,-fitted.min.y,-center.z);
 clone.rotation.y=THREE.MathUtils.degToRad(config.yawDegrees||0);
 clone.traverse(object=>{
  if(!object.isMesh)return;
  object.castShadow=true;object.receiveShadow=true;
  if(object.material){
   const tweak=(m,i)=>{
    const result=variationMaterial(m,String(seed)+':'+object.name+':'+i);
    if(result?.envMapIntensity!==undefined)
     result.envMapIntensity=Math.min(1.5,result.envMapIntensity);
    return result;
   };
   object.material=Array.isArray(object.material)
    ?object.material.map(tweak):tweak(object.material,0);
  }
 });
 return clone;
}
export async function installMuseumAssets(world,onStatus=()=>{}){
 let manifest;
 try{
  const response=await fetch('./assets/manifest.json',{cache:'no-store'});
  if(!response.ok)throw Error('Asset manifest could not be loaded');
  manifest=await response.json();
 }catch(error){
  const caseCount=installCaseDioramas(world,{}, {},normalize);
  onStatus('Case illustrations: '+caseCount+' procedural displays (asset manifest unavailable)');
  return {installed:0,caseCount,errors:[String(error)]};
 }
 const props=manifest.props||{};
 const caseProps=manifest.caseProps||{};
 const available=Object.entries({...props,...caseProps}).filter(([,v])=>safeLocalPath(v?.path));
 const loaded={};const errors=[];
 await Promise.all(available.map(async ([key,config])=>{
  try{loaded[key]=await load(config.path);}
  catch(error){errors.push(key+': '+String(error));}
 }));
 let installed=0;
 for(const slot of world.assetSlots||[]){
  // Case exhibits retain the purpose-built transparent vitrines: imported
  // opaque cabinets could otherwise conceal contextual case models.
  if(slot.kind==='case')continue;
  const role=slot.kind==='archive'?'displayCase':
   slot.kind==='directory'?'directoryDesk':null;
  const config=props[role],model=loaded[role];
  if(!model||!config)continue;
  try{
   const instance=normalize(model,config,slot.record?.name||slot.group.position.toArray().join(':'));
   slot.mount.add(instance);
   slot.fallback.visible=false;
   installed++;
  }catch(error){errors.push(slot.kind+': '+String(error));}
 }
 // Decorative models stay away from the center circulation paths. If a
 // decoration fails, don't add its collision blocker.
 const locations=[
  {role:'armchair',roomId:'archive',x:-6.1,z:0,rot:90,r:.62},
  {role:'armchair',roomId:'archive',x:6.1,z:0,rot:-90,r:.62},
  {role:'gothicCabinet',roomId:'archive',x:-6.4,z:5.9,rot:90,r:.7}
 ];
 for(const place of locations){
  const config=props[place.role],model=loaded[place.role];
  const room=world.rooms[place.roomId];
  if(!room||!model||!config)continue;
  try{
   const anchor=new THREE.Group();
   anchor.position.set(room.x+place.x,0,room.z+place.z);
   const instance=normalize(model,config,
    place.role+':'+place.x+':'+place.z);
   instance.rotation.y+=THREE.MathUtils.degToRad(place.rot);
   anchor.add(instance);world.group.add(anchor);
   world.obstacles.push({x:anchor.position.x,z:anchor.position.z,r:place.r});
   installed++;
  }catch(error){errors.push(place.role+': '+String(error));}
 }
 const caseCount=installCaseDioramas(world,loaded,caseProps,normalize);
 onStatus('Case illustrations: '+caseCount+' · Museum props: '+installed+(errors.length?' ('+errors.length+' unavailable)':''));
 return {installed,caseCount,errors};
}

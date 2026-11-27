import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE} from './layout.js';
import {yieldFrame} from './startup-performance.js?v=performance1';

// Reflection work belongs to the loading screen, never the movement loop.
// Auto uses one actual nave capture shared by the floor materials; local
// mode retains the exact per-room probes, all prepared before entry.
export function createReflectionManager(renderer,scene,world,visitor,daylight,{enabled=true,local=false,onStatus=()=>{}}={}){
 const rooms=[...ROOM_DEFS,VESTIBULE],probes=new Map(),position=new THREE.Vector3();
 let disposed=false,preparing=null;
 function floorMaterials(room){
  return [...new Set((world.floors||[]).filter(mesh=>{
   if(!room)return true;
   mesh.getWorldPosition(position);
   return Math.abs(position.x-room.x)<.15&&Math.abs(position.z-room.z)<.15;
  }).flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(m=>m?.isMeshStandardMaterial))];
 }
 async function capture(room,materials,pmrem){
  if(!materials.length||disposed)return;
  const oldMaps=[];
  for(const p of probes.values())for(const m of p.materials){oldMaps.push([m,m.envMap]);m.envMap=null;}
  const visitorVisible=visitor.root.visible,dayVisible=daylight?.group?.visible;
  const oldTarget=renderer.getRenderTarget(),oldFace=renderer.getActiveCubeFace(),oldMip=renderer.getActiveMipmapLevel();
  const oldShadowUpdate=renderer.shadowMap.needsUpdate,oldXR=renderer.xr.enabled;
  let cube=null,filtered=null;
  try{
   visitor.root.visible=false;
   if(daylight?.group)daylight.group.visible=false;
   renderer.shadowMap.needsUpdate=false;
   renderer.xr.enabled=false;
   cube=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:false,minFilter:THREE.LinearFilter});
   const probe=new THREE.CubeCamera(.15,150,cube);
   probe.position.set(room.x,Math.min(2.8,room.height*.45),room.z);
   probe.coordinateSystem=renderer.coordinateSystem;
   probe.updateCoordinateSystem();probe.updateMatrixWorld(true);
   // One face per browser turn instead of six scene renders in one long task.
   // No animation loop is running while this is called.
   for(let face=0;face<6;face++){
    renderer.setRenderTarget(cube,face);renderer.render(scene,probe.children[face]);
    renderer.setRenderTarget(oldTarget,oldFace,oldMip);
    await yieldFrame();
   }
   filtered=pmrem.fromCubemap(cube.texture);
   probes.set(room.id,{target:filtered,materials});
   filtered=null;
   onStatus('Local reflection probe: '+room.id);
  }catch(error){console.warn('Room reflection fallback:',room.id,error);}
  finally{
   filtered?.dispose();cube?.dispose();
   renderer.setRenderTarget(oldTarget,oldFace,oldMip);
   renderer.shadowMap.needsUpdate=oldShadowUpdate;renderer.xr.enabled=oldXR;
   visitor.root.visible=visitorVisible;
   if(daylight?.group)daylight.group.visible=dayVisible;
   for(const [m,map] of oldMaps)m.envMap=map;
  }
  const result=probes.get(room.id);
  if(result)for(const m of materials){m.envMap=result.target.texture;m.needsUpdate=true;}
 }
 function prepare(){
  if(!enabled||disposed||!renderer.extensions.has('EXT_color_buffer_float'))return Promise.resolve();
  if(preparing)return preparing;
  preparing=(async()=>{
   const pmrem=new THREE.PMREMGenerator(renderer);
   try{
    pmrem.compileCubemapShader();
    if(local){
     for(const room of rooms){await yieldFrame();await capture(room,floorMaterials(room),pmrem);}
    }else{
     await yieldFrame();
     await capture(rooms.find(r=>r.id==='rotunda'),floorMaterials(null),pmrem);
    }
   }finally{pmrem.dispose();}
  })();
  return preparing;
 }
 function dispose(){
  disposed=true;
  for(const p of probes.values()){
   for(const m of p.materials){if(m.envMap===p.target.texture){m.envMap=null;m.needsUpdate=true;}}
   p.target.dispose();
  }
  probes.clear();
 }
 // Compatibility for older cached museum.js entrypoints. Neither legacy
 // method may trigger a capture during gameplay; the HDR stays active.
 function update(){}
 function markReady(){}
 return {prepare,dispose,update,markReady,get count(){return probes.size;},get mode(){return !probes.size?'HDR':local?'local':'shared';}};
}

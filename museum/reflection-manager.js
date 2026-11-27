import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE} from './layout.js';

// Capture the actual static cathedral once per visited room. Keep the original
// scene HDRI for diffuse lighting, and use local reflections on room floors.
// No per-frame cube rendering, no visitor frozen into the reflections.
export function createReflectionManager(renderer,scene,world,visitor,daylight,{enabled=true,onStatus=()=>{}}={}){
 const rooms=[...ROOM_DEFS,VESTIBULE],probes=new Map(),failures=new Set();
 const position=new THREE.Vector3();
 let ready=false,lastRoom=null,dwell=0,disposed=false;
 const roomFor=(x,z)=>rooms.find(r=>Math.abs(x-r.x)<r.w/2-.4&&Math.abs(z-r.z)<r.d/2-.4);
 function floorMaterials(room){
  return [...new Set((world.floors||[]).filter(mesh=>{
   mesh.getWorldPosition(position);
   return Math.abs(position.x-room.x)<.15&&Math.abs(position.z-room.z)<.15;
  }).flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(m=>m?.isMeshStandardMaterial))];
 }
 function capture(room){
  const materials=floorMaterials(room);
  if(!materials.length){failures.add(room.id);return;}
  const oldMaps=[];
  for(const p of probes.values())for(const m of p.materials){oldMaps.push([m,m.envMap]);m.envMap=null;}
  const visitorVisible=visitor.root.visible,dayVisible=daylight?.group?.visible;
  const oldTarget=renderer.getRenderTarget();
  const oldShadowUpdate=renderer.shadowMap.needsUpdate;
  let cube=null,pmrem=null,filtered=null;
  try{
   visitor.root.visible=false;
   if(daylight?.group)daylight.group.visible=false;
   renderer.shadowMap.needsUpdate=false;
   cube=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:false,minFilter:THREE.LinearFilter});
   const probe=new THREE.CubeCamera(.15,150,cube);
   probe.position.set(room.x,Math.min(2.8,room.height*.45),room.z);
   probe.updateMatrixWorld(true);
   probe.update(renderer,scene);
   pmrem=new THREE.PMREMGenerator(renderer);
   filtered=pmrem.fromCubemap(cube.texture);
   probes.set(room.id,{target:filtered,materials});
   filtered=null;
   onStatus('Local reflection probe: '+room.id);
  }catch(error){failures.add(room.id);console.warn('Room reflection fallback:',room.id,error);}
  finally{
   filtered?.dispose();cube?.dispose();pmrem?.dispose();
   renderer.setRenderTarget(oldTarget);
   renderer.shadowMap.needsUpdate=oldShadowUpdate;
   visitor.root.visible=visitorVisible;
   if(daylight?.group)daylight.group.visible=dayVisible;
   for(const [m,map] of oldMaps)m.envMap=map;
  }
  const result=probes.get(room.id);
  if(result)for(const m of materials){m.envMap=result.target.texture;m.needsUpdate=true;}
 }
 function update(dt,speed){
  if(!enabled||!ready||disposed)return;
  const p=visitor.root.position,room=roomFor(p.x,p.z);
  if(!room||probes.has(room.id)||failures.has(room.id))return;
  if(lastRoom!==room.id){lastRoom=room.id;dwell=0;}
  dwell+=dt;
  // Prefer a quiet moment; do not re-render six faces every frame.
  if(dwell>1.2&&speed<.15||dwell>5){capture(room);dwell=0;}
 }
 function dispose(){
  disposed=true;
  for(const p of probes.values()){
   for(const m of p.materials){if(m.envMap===p.target.texture){m.envMap=null;m.needsUpdate=true;}}
   p.target.dispose();
  }
  probes.clear();
 }
 return {update,dispose,markReady(){ready=true;},get count(){return probes.size;}};
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Let the browser paint between CPU-heavy startup phases. This is not a
// promise that individual GPU driver calls can never block.
export const yieldFrame=()=>new Promise(resolve=>{
 if(document.hidden)setTimeout(resolve,16);
 else requestAnimationFrame(()=>setTimeout(resolve,0));
});

// Preserve original material, UVs, normals and shadow flags. Restrict batches
// to static opaque meshes inside one exhibit, so culling remains spatially
// local and navigation / interaction / animation objects are untouched.
export async function batchExhibits(world,{onProgress=()=>{}}={}){
 let removed=0,added=0;
 const inverse=new THREE.Matrix4(),relative=new THREE.Matrix4();
 for(const [index,slot] of (world.assetSlots||[]).entries()){
  if(slot.kind==='timeline')continue;
  for(const root of [slot.fallback,slot.mount]){
   if(!root?.visible)continue;
   root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
   const buckets=new Map();
   root.traverseVisible(o=>{
    const m=o.material,g=o.geometry;
    if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.children.length||
      !g?.isBufferGeometry||Array.isArray(m)||!m||m.transparent||
      m.depthWrite===false||m.opacity<1||g.morphAttributes?.position?.length||
      g.drawRange.start!==0||g.drawRange.count!==Infinity||o.userData.action||
      o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender)return;
    const attrs=Object.entries(g.attributes).map(([k,a])=>k+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name).sort().join('|');
    const key=[m.uuid,o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,Boolean(g.index),attrs].join(':');
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(o);
   });
   for(const meshes of buckets.values()){
    if(meshes.length<3)continue;
    const copies=[];
    try{
     for(const o of meshes){
      relative.multiplyMatrices(inverse,o.matrixWorld);
      copies.push(o.geometry.clone().applyMatrix4(relative));
     }
     const merged=mergeGeometries(copies,false);
     if(!merged)continue;
     const first=meshes[0],batch=new THREE.Mesh(merged,first.material);
     batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
     batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
     batch.name='static exhibit batch';merged.computeBoundingSphere();
     root.add(batch);
     for(const o of meshes)o.removeFromParent();
     removed+=meshes.length;added++;
    }catch(error){console.warn('Exhibit batch skipped:',error);}
    finally{for(const copy of copies)copy.dispose();}
   }
  }
  if(index%3===2){onProgress(index+1,world.assetSlots.length);await yieldFrame();}
 }
 return {removed,added,saved:removed-added};
}

// Unique texture objects can share image storage in Three.js. Initialize
// every distinct texture once, in small chunks, before first interactive frame.
export async function warmTextures(renderer,scene,onProgress=()=>{}){
 const textures=new Set();
 scene.traverseVisible(o=>{
  for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(!material)continue;
   for(const value of Object.values(material)){
    if(value?.isTexture&&!value.isRenderTargetTexture&&!value.isVideoTexture&&value.image)textures.add(value);
   }
  }
 });
 let i=0;
 for(const tex of textures){
  try{renderer.initTexture(tex);}catch(error){console.warn('Texture warm-up skipped:',error);}
  i++;
  if(i%4===0){onProgress(i,textures.size);await yieldFrame();}
 }
 return textures.size;
}

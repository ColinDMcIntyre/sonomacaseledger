import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE} from './layout.js';
import {ribStations,columnX} from './vault-profile.js';

/**
 * Static lighting: soft contact occlusion is a single batched mesh (one draw
 * call), and stained-glass light patches and shafts use shared small textures.
 * These are artistic approximations, not physically ray-traced lightmaps.
 */
const rooms=[...ROOM_DEFS,VESTIBULE];
function texture(n,draw){
 const c=document.createElement('canvas');c.width=c.height=n;
 draw(c.getContext('2d'),n);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 t.minFilter=THREE.LinearMipmapLinearFilter;
 return t;
}
function contactMap(){
 return texture(128,(c,n)=>{
  const g=c.createRadialGradient(64,64,3,64,64,64);
  g.addColorStop(0,'rgba(18,15,13,.58)');
  g.addColorStop(.35,'rgba(24,21,18,.36)');
  g.addColorStop(.7,'rgba(24,21,18,.11)');
  g.addColorStop(1,'rgba(24,21,18,0)');
  c.fillStyle=g;c.fillRect(0,0,n,n);
 });
}
function batchContactShadows(world){
 const positions=[],uv=[],indices=[];
 function add(x,z,w,d,y){
  const n=positions.length/3;
  positions.push(x-w/2,y,z-d/2,x+w/2,y,z-d/2,
   x+w/2,y,z+d/2,x-w/2,y,z+d/2);
  uv.push(0,0,1,0,1,1,0,1);indices.push(n,n+2,n+1,n,n+3,n+2);
 }
 for(const room of rooms)for(const z of ribStations(room))
  for(const side of [-1,1])add(columnX(room,side),z,1.75,1.75,.036);
 for(const slot of world.assetSlots||[]){
  const x=slot.group.position.x,z=slot.group.position.z;
  if(['case','archive'].includes(slot.kind))add(x,z,2.8,2.5,.053);
  else if(['timeline','directory'].includes(slot.kind))add(x,z,2.1,1.8,.053);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(indices);g.computeBoundingSphere();return g;
}
function windowPoolMap(){
 return texture(256,(c,n)=>{
  const g=c.createRadialGradient(128,128,3,128,128,125);
  g.addColorStop(0,'rgba(250,219,168,.50)');
  g.addColorStop(.42,'rgba(246,194,123,.36)');
  g.addColorStop(.78,'rgba(206,178,144,.08)');
  g.addColorStop(1,'rgba(206,178,144,0)');
  c.fillStyle=g;c.fillRect(0,0,n,n);
  c.save();c.globalCompositeOperation='source-atop';
  const colors=['#e4bc89','#a9bac3','#e9c4a1','#aeb7ac','#cbad98'];
  for(let i=0;i<5;i++){
   c.globalAlpha=.32;c.fillStyle=colors[i];
   c.fillRect(i*50+3,25,45,206);
  }
  c.restore();
 });
}
function shaftMap(){
 return texture(128,(c,n)=>{
  const g=c.createLinearGradient(0,0,n,0);
  for(const [x,a] of [[0,0],[.23,.10],[.5,.33],[.77,.10],[1,0]])
   g.addColorStop(x,'rgba(255,237,202,'+a+')');
  c.fillStyle=g;c.fillRect(0,0,n,n);
  const fade=c.createLinearGradient(0,0,0,n);
  for(const [y,a] of [[0,0],[.15,.45],[.5,1],[.87,.65],[1,0]])
   fade.addColorStop(y,'rgba(255,255,255,'+a+')');
  c.globalCompositeOperation='destination-in';c.fillStyle=fade;
  c.fillRect(0,0,n,n);
 });
}
function quad(from,to,atSource,atFloor,axis){
 const points=[],uv=[0,1,1,1,0,0,1,0];
 for(const [at,w] of [[from,atSource],[to,atFloor]]){
  points.push(...at.clone().addScaledVector(axis,-w/2).toArray());
  points.push(...at.clone().addScaledVector(axis,w/2).toArray());
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();return g;
}
function landing(w,info){
 // Low southwest sun enters west walls and the southern records-library wall.
 if(info.side!=='w'&&!(info.roomId==='archive'&&info.side==='s'))return null;
 const room=rooms.find(r=>r.id===info.roomId);
 if(!room)return null;
 const tip=info.side==='w'
  ?new THREE.Vector3(w.position.x+7.2,.07,w.position.z-2.25)
  :new THREE.Vector3(w.position.x+1.9,.07,w.position.z-6.5);
 tip.x=THREE.MathUtils.clamp(tip.x,room.x-room.w/2+.9,room.x+room.w/2-.9);
 tip.z=THREE.MathUtils.clamp(tip.z,room.z-room.d/2+.9,room.z+room.d/2-.9);
 return tip;
}
export function installBakedDaylight(world,scene,{beams=true}={}){
 const group=new THREE.Group();group.name='static-daylight';scene.add(group);
 const contact=new THREE.Mesh(batchContactShadows(world),new THREE.MeshBasicMaterial({
  map:contactMap(),transparent:true,depthWrite:false,opacity:.69,
  polygonOffset:true,polygonOffsetFactor:-1
 }));
 contact.name='single-draw-contact-occlusion';contact.renderOrder=1;
 contact.frustumCulled=false;group.add(contact);
 const poolMat=new THREE.MeshBasicMaterial({
  map:windowPoolMap(),transparent:true,depthWrite:false,opacity:.33,
  blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false
 });
 const beamMat=beams?new THREE.MeshBasicMaterial({
  map:shaftMap(),transparent:true,depthWrite:false,opacity:.16,
  blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false
 }):null;
 const poolGeo=new THREE.PlaneGeometry(2.8,4.5);
 let pools=0,shafts=0;
 for(const w of world.windows||[]){
  const info=w.userData.museumDaylight;
  if(!info)continue;
  const tip=landing(w,info);
  if(!tip)continue;
  const patch=new THREE.Mesh(poolGeo,poolMat);
  patch.position.copy(tip);patch.position.y=.069;
  patch.rotation.set(-Math.PI/2,0,info.side==='w'?-.22:.15);
  patch.renderOrder=3;group.add(patch);pools++;
  if(!beams)continue;
  const source=new THREE.Vector3(w.position.x,
   info.bottom+(info.shoulder-info.bottom)*.61,w.position.z);
  const along=info.axis==='x'?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);
  const cross=info.axis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);
  for(const [axis,f] of [[along,1],[cross,.4]]){
   const mesh=new THREE.Mesh(quad(source,tip,info.width*.25*f,info.width*.85*f,axis),beamMat);
   mesh.renderOrder=2;group.add(mesh);shafts++;
  }
 }
 group.userData.bakedLight={contactMeshCount:1,pools,shafts};
 return {group,pools,shafts};
}

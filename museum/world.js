import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE,HALLWAYS,ENTRY_POINT,zoneAt} from './layout.js';
import {buildArchitecture,buildArchitectureAsync} from './architecture.js?v=clean-walls-20261119-performance1';
import {M,scaleBoxUV} from './materials.js?v=unified-vault-bays-20261119';
import {createNavigation} from './navigation.js';
import {ribStations,columnX} from './vault-profile.js';
export {ROOM_DEFS,HALLWAYS};

const cube=new THREE.BoxGeometry(1,1,1);
function mesh(parent,geo,material,x=0,y=0,z=0){
 const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);
 m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;
}
function box(g,m,x,y,z,w,h,d){
 // Physical UV density and seeded grain on built-in wooden furnishings.
 // Original GLTF asset UV maps remain untouched by this fallback geometry.
 const kind=m.userData?.kind;
 const surface=kind==='wood'||kind==='stone'||kind==='vault';
 let geo=cube;
 if(surface){
  g.updateWorldMatrix(true,false);
  const at=new THREE.Vector3(x,y,z).applyMatrix4(g.matrixWorld);
  const hash=n=>{const q=Math.sin(n)*43758.5453;return q-Math.floor(q);};
  const seed=at.x*19.2+at.y*58.3+at.z*133.9;
  geo=scaleBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,
   kind==='wood'?1.65:2.4,[hash(seed)*.87,hash(seed+77.7)*.89]);
 }
 const o=mesh(g,geo,m,x,y,z);
 if(!surface)o.scale.set(w,h,d);
 return o;
}
function label(str,w=1.65,h=.35){
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=168;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#2a3432';ctx.fillRect(0,0,900,168);
 ctx.strokeStyle='#bca577';ctx.lineWidth=6;ctx.strokeRect(10,10,880,148);
 ctx.fillStyle='#f6ecd9';ctx.font='36px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const words=String(str).split(/\s+/),lines=[''];
 for(const word of words){
  const i=lines.length-1,combined=(lines[i]+' '+word).trim();
  if(ctx.measureText(combined).width>830&&lines[i]&&lines.length<2)lines.push(word);else lines[i]=combined;
 }
 ctx.font=(lines.length>1?29:36)+'px Georgia,serif';
 lines.forEach((line,i)=>ctx.fillText(line,450,84+(i-(lines.length-1)/2)*41,850));
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
}
function archiveCase(g){
 box(g,M.plinth,0,.28,0,1.63,.56,1.24);
 box(g,M.wood,0,.69,0,1.51,.30,1.14);
 box(g,M.velvet,0,.89,0,1.43,.042,1.06);
 // Keep the archival panel against the back glass so 3D objects can occupy
 // the central display volume without intersecting an opaque backboard.
 box(g,M.wood,0,1.64,-.49,1.08,1.32,.065);
 box(g,M.page,0,1.65,-.448,.87,1.11,.029);
 for(let i=0;i<5;i++)box(g,M.ink,0,1.9-i*.147,-.422,i===0?.42:.65,.018,.009);
 for(const x of [-.77,.77]){
  box(g,M.glass,x,1.62,0,.018,1.4,1.13);
  for(const z of [-.58,.58])box(g,M.blackMetal,x,1.62,z,.027,1.43,.027);
 }
 for(const z of [-.58,.58])box(g,M.glass,0,1.62,z,1.56,1.4,.017);
 box(g,M.wood,0,2.35,0,1.66,.085,1.27);
}
export async function makeMuseumAsync(scene,yieldFrame){
 return makeMuseum(scene,await buildArchitectureAsync(scene,yieldFrame));
}
export function makeMuseum(scene,prebuilt=null){
 const architecture=prebuilt||buildArchitecture(scene);
 const group=architecture.group,rooms={},interactives=[],obstacles=[],assetSlots=[],effects=[];
 const {floors,floorRects,cameraBlockers}=architecture;
 for(const r of ROOM_DEFS)rooms[r.id]=r;
 function register(g,record,rad=1){
  const hit=mesh(g,new THREE.CylinderGeometry(rad,rad,2.85,12),
   new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),0,1.42,0);
  hit.userData.action=record;hit.castShadow=false;interactives.push(hit);
  obstacles.push({x:g.position.x,z:g.position.z,r:rad*.84});
 }
 function addExhibit(roomId,lx,lz,record,type='case',yaw=0){
  const r=rooms[roomId];if(!r)throw Error('Unknown gallery '+roomId);
  const g=new THREE.Group();g.position.set(r.x+lx,0,r.z+lz);
  g.rotation.y=THREE.MathUtils.degToRad(yaw);group.add(g);
  const fallback=new THREE.Group();g.add(fallback);
  const display=type==='case'||type==='archive';
  if(display)archiveCase(fallback);
  else if(type==='directory'){
   box(fallback,M.wood,0,.71,0,1.72,1.42,1.14);
   box(fallback,M.brass,0,1.45,0,1.69,.08,1.17);
   box(fallback,M.page,0,1.53,.06,1.33,.032,.83).rotation.x=-.14;
  }else if(type==='timeline'){
   box(fallback,M.plinth,0,.68,0,1.48,1.36,1.14);
   const disc=mesh(fallback,new THREE.CylinderGeometry(.46,.46,.08,24),M.brass,0,1.52,.4);
   disc.rotation.x=Math.PI/2;
   const pointer=box(fallback,M.ink,0,1.56,.49,.048,.43,.025);
   effects.push({object:pointer,type:'timeline'});
  }else{
   box(fallback,M.plinth,0,.64,0,1.58,1.28,1.16);
   box(fallback,M.wood,0,1.38,0,1.45,.11,1.08).rotation.x=-.19;
   box(fallback,M.page,0,1.45,.1,1.21,.024,.75).rotation.x=-.19;
  }
  const mount=new THREE.Group();g.add(mount);
  const plaque=label(record.name||record.title||'Explore',1.48,.32);
  plaque.position.set(0,display?.56:1.02,.67);g.add(plaque);
  register(g,{...record,roomId,type},type==='directory'?1.2:1);
  assetSlots.push({kind:type,group:g,mount,fallback,record});
  return g;
 }
 // Entry plaque faces the visitor without blocking the central nave.
 const sign=new THREE.Group();sign.position.set(-4.4,0,35);group.add(sign);
 box(sign,M.wood,0,.76,0,.98,1.52,.23);
 const entryLabel=label('SONOMA CASE LEDGER',3.2,.56);
 entryLabel.position.set(0,1.75,-.16);sign.add(entryLabel);
 const sculpture=new THREE.Group();sculpture.position.set(0,0,-14);group.add(sculpture);
 obstacles.push({x:0,z:-14,r:1.44});
 const base=mesh(sculpture,new THREE.CylinderGeometry(1.22,1.22,.46,30),M.plinth,0,.24,0);
 const center=mesh(sculpture,new THREE.SphereGeometry(.72,22,16),M.darkStone,0,1.75,0);
 const ring=mesh(sculpture,new THREE.TorusGeometry(.89,.055,8,38),M.brass,0,1.75,0);
 ring.rotation.y=.46;effects.push({object:ring,type:'sculpture'});
 // Side-wall benches preserve the 7m unobstructed main circulation spine.
 for(const z of [-23,-3,15])for(const side of [-1,1]){
  const g=new THREE.Group();g.position.set(side*7.55,0,z);group.add(g);
  box(g,M.wood,0,.47,0,1.66,.16,.68);
  box(g,M.wood,0,.95,.27,1.7,.76,.12);
  for(const x of [-.62,.62])box(g,M.wood,x,.22,0,.11,.46,.55);
  obstacles.push({x:g.position.x,z:g.position.z,r:.72});
 }
 // Gameplay collision follows the actual structural pilasters, not obsolete
 // prototype coordinates. Both the visible columns and their footprints use
 // the same shared vault-profile.js construction stations.
 for(const room of [...ROOM_DEFS,VESTIBULE])
  for(const z of ribStations(room))
   for(const side of [-1,1])
    obstacles.push({x:columnX(room,side),z,r:.33});
 const navigation=createNavigation(floorRects,obstacles);
 const {walkable,canMove,nearestWalkable}=navigation;

 function roomAt(x,z){return zoneAt(x,z)||rooms.rotunda;}
 function update(t,dt,animated=true){
  if(!animated)return;
  for(const e of effects){
   if(e.type==='sculpture')e.object.rotation.y+=dt*.12;
   if(e.type==='timeline')e.object.rotation.z+=dt*.15;
  }
 }
 return {group,rooms,floors,floorRects,interactives,obstacles,cameraBlockers,
  assetSlots,windows:architecture.windows,walkable,canMove,nearestWalkable,roomAt,addExhibit,update,
  entry:ENTRY_POINT};
}

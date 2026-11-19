import * as THREE from 'three';
import {M,mat} from './materials.js';

/*
 * Sonoma Case Ledger — third-person museum scene v3.
 * All seven rooms are made from one architectural kit. The camera stays below
 * a genuinely vaulted ceiling; it never needs a roof cutaway or orbital walls.
 * Existing case exhibit placements, collision map, and search remain compatible.
 */
export const ROOM_DEFS=[
 {id:'rotunda',name:'The Grand Rotunda',short:'Rotunda',icon:'⌂',x:0,z:0,w:18,d:18,doors:['n','s','e','w'],color:0x6c8277,role:'hub'},
 {id:'investment',name:'Investment & Banking Gallery',short:'Investment',icon:'◇',x:-29,z:0,w:18,d:16,doors:['e','n'],color:0x698a75,role:'cases'},
 {id:'business',name:'Business & Property Gallery',short:'Business',icon:'▤',x:29,z:0,w:18,d:16,doors:['w','n'],color:0x907a5f,role:'cases'},
 {id:'insurance',name:'Insurance & Financial Services',short:'Insurance',icon:'◈',x:-29,z:-27,w:18,d:16,doors:['s'],color:0x668b98,role:'cases'},
 {id:'trust',name:'Public Trust Gallery',short:'Public Trust',icon:'✧',x:29,z:-27,w:18,d:16,doors:['s'],color:0x83778e,role:'cases'},
 {id:'federal',name:'Federal Cases Wing',short:'Federal',icon:'⚖',x:0,z:-29,w:18,d:16,doors:['s'],color:0x6b829b,role:'cases'},
 {id:'archive',name:'The Records Library',short:'Records Library',icon:'▥',x:0,z:29,w:18,d:16,doors:['n'],color:0x9a7a58,role:'library'}
];
export const HALLWAYS=[
 {x:-16,z:0,w:16,d:6},{x:16,z:0,w:16,d:6},
 {x:0,z:-16,w:7,d:16},{x:0,z:16,w:7,d:16},
 {x:-29,z:-13.5,w:6,d:12},{x:29,z:-13.5,w:6,d:12}
];
const cube=new THREE.BoxGeometry(1,1,1);
const wood=M.wood,stone=M.stone,brass=M.brass;
function mesh(parent,geometry,material,x=0,y=0,z=0,shadows=false){
 const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);
 o.castShadow=shadows;o.receiveShadow=true;parent.add(o);return o;
}
function box(parent,material,x,y,z,w,h,d,shadow=false){
 const o=mesh(parent,cube,material,x,y,z,shadow);o.scale.set(w,h,d);return o;
}
function cylinder(parent,material,x,y,z,r,h,n=20){
 return mesh(parent,new THREE.CylinderGeometry(r,r,h,n),material,x,y,z,true);
}
function tube(parent,points,r,material,segments=32){
 return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,r,8,false),material);
}
function metalBetween(parent,a,b,r=.055,material=M.brass){
 const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),diff=vb.clone().sub(va);
 const m=mesh(parent,new THREE.CylinderGeometry(r,r,diff.length(),8),material);
 m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return m;
}
function plaque(title,w=2.1,h=.37){
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=180;
 const c=canvas.getContext('2d');c.fillStyle='#272d29';c.fillRect(0,0,900,180);
 c.fillStyle='#b9a178';c.fillRect(13,13,874,3);c.fillRect(13,164,874,3);
 c.fillStyle='#f3ebd9';c.textBaseline='middle';c.textAlign='center';
 const words=String(title).split(/\s+/),lines=[''];
 for(const word of words){
  const i=lines.length-1,next=(lines[i]+' '+word).trim();
  c.font='bold 38px Georgia,serif';
  if(c.measureText(next).width>830&&lines[i]&&lines.length<2)lines.push(word);else lines[i]=next;
 }
 c.font=(lines.length===1?38:31)+'px Georgia,serif';
 lines.forEach((line,i)=>c.fillText(line,450,90+(i-(lines.length-1)/2)*46,840));
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
}
function getMat(texture,repeatX,repeatY){
 const material=texture.clone();material.map=texture.map.clone();
 material.map.wrapS=material.map.wrapT=THREE.RepeatWrapping;
 material.map.repeat.set(repeatX,repeatY);material.map.needsUpdate=true;
 if(texture.bumpMap){material.bumpMap=material.map;material.bumpScale=texture.bumpScale;}
 return material;
}
function floorTile(parent,x,z,w,d,walking){
 const floor=mesh(parent,new THREE.PlaneGeometry(w,d),getMat(walking?M.floor:M.corridor,w/5,d/5),x,0,z);
 floor.rotation.x=-Math.PI/2;
 floor.userData.walkable=true;return floor;
}
export function makeMuseum(scene){
 const root=new THREE.Group();scene.add(root);
 const rooms={},floors=[],floorRects=[],interactives=[],obstacles=[],effects=[],cameraBlockers=[];
 const lighting=[];
 const assetSlots=[];
 // Ground beyond the building prevents a distracting empty black void at entrances.
 const under=mesh(root,new THREE.PlaneGeometry(165,165),mat(0x33383a,.03,.9),0,-.34,0);
 under.rotation.x=-Math.PI/2;
 function addFloor(x,z,w,d,room=false){
  const tile=floorTile(root,x,z,w,d,room);
  floors.push(tile);floorRects.push({x,z,w,d});
  if(room){
   for(const sign of [-1,1]){
    box(root,brass,x,.018,z+sign*d/2,w,.035,.085);
    box(root,brass,x+sign*w/2,.018,z,.085,.035,d);
   }
  }
 }
 for(const hall of HALLWAYS)addFloor(hall.x,hall.z,hall.w,hall.d,false);
 const wallHeight=8.6,doorWidth=5.6;
 function wallPart(group,room,dir,offset,len){
  if(len<=0)return;
  const isZ=dir==='n'||dir==='s',sign=dir==='n'||dir==='w'?-1:1;
  const x=room.x+(isZ?offset:sign*room.w/2);
  const z=room.z+(isZ?sign*room.d/2:offset);
  const face=dir==='n'?1:dir==='s'?-1:dir==='w'?1:-1;
  const solid=box(group,stone,x,wallHeight/2,z,isZ?len:.32,wallHeight,isZ?.32:len,true);
  cameraBlockers.push(solid);
  const panelCount=Math.max(1,Math.floor(len/2.7));
  for(let i=0;i<panelCount;i++){
   const side=(i+.5-panelCount/2)*len/panelCount,span=len/panelCount-.38;
   const inset=.197*face;
   const tx=x+(isZ?side:inset),tz=z+(isZ?inset:side);
   box(group,M.woodHighlight,tx,1.55,tz,isZ?span:.065,2.8,isZ?.065:span);
   box(group,brass,tx,3.02,tz,isZ?span+.11:.076,.045,isZ?.076:span+.11);
   box(group,M.wood,tx,3.1,tz,isZ?span*.74:.11,.05,isZ?.11:span*.74);
   // Upper architectural recesses, with restrained plaster surrounds.
   const ux=x+(isZ?side:inset),uz=z+(isZ?inset:side);
   box(group,M.darkStone,ux,5.9,uz,isZ?span*.67:.11,2.32,isZ?.11:span*.67);
   box(group,M.edge,ux,7.1,uz,isZ?span*.76:.14,.1,isZ?.14:span*.76);
  }
  box(group,M.edge,x,wallHeight-.17,z,isZ?len:.48,.21,isZ?.48:len);
 }
 function arc(parent,centre,radius,axis,material=M.edge,height=5.95){
  const points=[];
  for(let i=0;i<=24;i++){
   const t=i*Math.PI/24;
   const dx=Math.cos(t)*radius,dy=Math.sin(t)*radius*.7;
   const p=axis==='x'
    ?new THREE.Vector3(centre[0]+dx,height+dy,centre[2])
    :new THREE.Vector3(centre[0],height+dy,centre[2]+dx);
   points.push(p);
  }
  tube(parent,points,.12,material,30);
 }
 function door(room,dir){
  const isZ=dir==='n'||dir==='s',sign=dir==='n'||dir==='w'?-1:1;
  const x=room.x+(isZ?0:sign*room.w/2),z=room.z+(isZ?sign*room.d/2:0);
  for(const s of [-1,1]){
   const px=x+(isZ?s*doorWidth/2:0),pz=z+(isZ?0:s*doorWidth/2);
   cylinder(root,stone,px,3.3,pz,.26,6.6,18);
   cylinder(root,M.edge,px,6.59,pz,.36,.16,18);
   cylinder(root,M.beam,px,.16,pz,.37,.25,18);
  }
  arc(root,[x,0,z],doorWidth/2,isZ?'x':'z');
  // Lintel is ABOVE the walking clearance and never fills the opening.
  const upper=box(root,stone,x,7.65,z,isZ?doorWidth:.35,1.9,isZ?.35:doorWidth,true);
  cameraBlockers.push(upper);
 }
 function wall(room,dir){
  const len=dir==='n'||dir==='s'?room.w:room.d;
  if(room.doors.includes(dir)){
   const side=(len-doorWidth)/2;
   for(const s of [-1,1])wallPart(root,room,dir,s*(doorWidth/2+side/2),side);
   door(room,dir);
  }else wallPart(root,room,dir,0,len);
 }
 function roof(room){
  const w=room.w-1.0,depth=room.d-.48,segments=36,rows=14;
  const verts=[],uv=[],indices=[];
  // Continuous barrel vault is high above the follow camera.
  // It is intentionally a real inner ceiling, not a roof visible from above.
  for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
   const t=-1+2*i/segments;
   const x=room.x+t*w/2;
   const y=wallHeight-.08+3.4*Math.sqrt(Math.max(0,1-t*t));
   const z=room.z-depth/2+depth*j/rows;
   verts.push(x,y,z);uv.push(i/segments,j/rows);
   if(i<segments&&j<rows){
    const q=j*(segments+1)+i;
    indices.push(q,q+1,q+segments+1,q+1,q+segments+2,q+segments+1);
   }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const plaster=mesh(root,geo,M.vault);plaster.castShadow=false;plaster.receiveShadow=false;
  for(let z=-depth/2+.5;z<=depth/2-.2;z+=Math.max(3.1,depth/3.6)){
   const points=[];
   for(let i=0;i<=30;i++){
    const t=-1+2*i/30;
    points.push(new THREE.Vector3(room.x+t*w/2,wallHeight+.0+3.45*Math.sqrt(Math.max(0,1-t*t)),room.z+z));
   }
   tube(root,points,.085,M.beam,42);
  }
  // The keystone strip runs along the length of the vault.
  box(root,M.edge,room.x,wallHeight+3.43,room.z,.16,.09,depth);
 }
 function pilaster(x,z){
  cylinder(root,stone,x,wallHeight/2,z,.24,wallHeight,18);
  cylinder(root,M.edge,x,.18,z,.37,.28,18);
  cylinder(root,M.edge,x,wallHeight-.2,z,.38,.22,18);
 }
 function lamp(room){
  // Simple architectural pendant and actual warm fill light, not neon hoops.
  const x=room.x,z=room.z,top=10.3;
  metalBetween(root,[x,top,z],[x,7.3,z],.046,M.blackMetal);
  cylinder(root,M.blackMetal,x,7.25,z,.62,.19,24);
  cylinder(root,M.light,x,7.06,z,.45,.16,24);
  const point=new THREE.PointLight(0xffe1ad,2.1,19,1.8);point.position.set(x,7,z);
  root.add(point);lighting.push(point);
 }
 function wallArt(room){
  // Never cover the open north doorway with a gallery plaque.
  const hasNorthDoor=room.doors.includes('n');
  const atX=room.x+(hasNorthDoor?(room.w/2-3.7):0);
  const titleWidth=hasNorthDoor?3.6:5.8;
  const caption=plaque(room.name,Math.min(titleWidth,room.w-2),.6);
  caption.position.set(atX,5.45,room.z-room.d/2+.25);
  root.add(caption);
  // Museum artwork and recessed frames on an actual solid wall bay.
  box(root,M.wood,atX,3.75,room.z-room.d/2+.22,3.6,2.3,.13);
  box(root,M.edge,atX,3.75,room.z-room.d/2+.32,3.46,2.14,.045);
  box(root,M.velvet,atX,3.75,room.z-room.d/2+.36,3.3,1.93,.04);
  const title=plaque('HISTORY · CONTEXT · RECORD',2.9,.38);
  title.position.set(atX,3.8,room.z-room.d/2+.415);
  root.add(title);
 }
 for(const room of ROOM_DEFS){
  rooms[room.id]=room;
  addFloor(room.x,room.z,room.w,room.d,true);
  for(const dir of ['n','s','e','w'])wall(room,dir);
  roof(room);
  for(const dx of [-1,1])for(const dz of [-1,1])
   pilaster(room.x+dx*(room.w/2-.5),room.z+dz*(room.d/2-.5));
  wallArt(room);lamp(room);
 }
 function collision(mesh,record,rad=1.0){
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,2.8,14),
   new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  hit.position.y=1.4;hit.userData.action=record;mesh.add(hit);
  hit.castShadow=false;interactives.push(hit);
  obstacles.push({x:mesh.position.x,z:mesh.position.z,r:rad*.84});
 }
 const documentPaper=new THREE.PlaneGeometry(.88,1.13);
 function displayedDocument(parent,x=0,y=1.64,z=0,angle=-.11){
  const backing=box(parent,wood,x,y,z,1.11,1.42,.075);
  backing.rotation.y=angle;
  const page=mesh(parent,documentPaper,M.page,x,y,z+.058);
  page.rotation.y=angle;
  for(let k=0;k<6;k++){
   const line=box(parent,M.ink,x,y+.36-k*.134,z+.075,k===0?.46:.64,.014,.009);
   line.rotation.y=angle;
  }
 }
 function addExhibit(roomId,lx,lz,record,type='case'){
  const room=rooms[roomId];if(!room)throw new Error('Unknown room '+roomId);
  const group=new THREE.Group();group.position.set(room.x+lx,0,room.z+lz);root.add(group);
  const isCase=type==='case'||type==='archive';
  if(isCase){
   // Museum-grade archival cabinet, nearly human height.
   box(group,M.plinth,0,.28,0,1.65,.56,1.25,true);
   box(group,M.wood,0,.69,0,1.56,.34,1.18,true);
   box(group,M.velvet,0,.9,0,1.45,.05,1.06);
   displayedDocument(group,0,1.68,0);
   // Clear glass, slender black-bronze joints, gentle internal illumination.
   for(const x of [-.765,.765])box(group,M.glass,x,1.65,0,.018,1.38,1.12);
   for(const z of [-.56,.56])box(group,M.glass,0,1.65,z,1.56,1.38,.018);
   for(const x of [-.78,.78])for(const z of [-.57,.57])
    box(group,M.blackMetal,x,1.66,z,.032,1.46,.032);
   box(group,M.wood,0,2.39,0,1.66,.12,1.27);
   box(group,brass,0,.86,.64,1.47,.035,.055);
   box(group,M.light,0,2.29,.45,.48,.035,.08);
  }else if(type==='directory'){
   box(group,wood,0,.76,0,1.7,1.52,1.2,true);
   box(group,brass,0,1.51,0,1.72,.04,1.22);
   box(group,M.page,0,1.59,.08,1.25,.08,.85).rotation.x=-.19;
  }else if(type==='portal'){
   box(group,M.plinth,0,.22,0,1.7,.44,1.35);
   box(group,M.wood,0,.5,0,1.64,.16,1.3);
   const sign=box(group,M.page,0,1.48,0,1.12,1.43,.12);
   box(group,brass,0,1.48,.08,1.25,.045,.045);
   effects.push({object:sign,type:'portal'});
  }else if(type==='timeline'){
   box(group,wood,0,.78,0,1.45,1.56,1.12);
   cylinder(group,M.brass,0,1.52,.37,.43,.09,28).rotation.x=Math.PI/2;
   const hand=box(group,M.blackMetal,0,1.58,.47,.05,.45,.03);
   effects.push({object:hand,type:'timeline'});
  }else{
   box(group,M.plinth,0,.6,0,1.6,1.2,1.15);
   box(group,wood,0,1.36,0,1.46,.1,1.08).rotation.x=-.18;
   box(group,M.page,0,1.44,.1,1.2,.018,.73).rotation.x=-.18;
  }
  // Keep the collision and nameplate when an imported GLB replaces the exhibit.
  const fallback=new THREE.Group();
  for(const child of [...group.children])fallback.add(child);
  group.add(fallback);
  const mount=new THREE.Group();group.add(mount);
  const p=plaque(record.name||record.title||'Explore',isCase?1.46:1.5,.31);
  p.position.set(0,isCase?.57:1.08,isCase?.66:.64);
  group.add(p);
  collision(group,{...record,roomId,type},type==='directory'?1.2:1.0);
  assetSlots.push({kind:type,record,group,mount,fallback});
  return group;
 }
 function carpet(roomId){
  const room=rooms[roomId];
  box(root,M.rug,room.x,.015,room.z,3.8,.03,7.5);
  for(const k of [-1,1])box(root,brass,room.x,.035,room.z+k*3.65,3.6,.018,.045);
 }
 carpet('rotunda');carpet('archive');
 const atrium=new THREE.Group();atrium.position.set(0,0,-2.8);root.add(atrium);
 obstacles.push({x:0,z:-2.8,r:1.6});
 cylinder(atrium,M.plinth,0,.32,0,1.12,.64,32);
 cylinder(atrium,M.wood,0,.77,0,.86,.22,32);
 const globe=mesh(atrium,new THREE.SphereGeometry(.65,28,20),M.darkStone,0,1.85,0);
 const axis=metalBetween(atrium,[0,1.1,0],[0,2.6,0],.07);
 const annulus=mesh(atrium,new THREE.TorusGeometry(.85,.04,8,48),brass,0,1.85,0);
 annulus.rotation.y=.5;effects.push({object:globe,type:'sculpture'});
 function walkable(x,z){
  return floorRects.some(r=>Math.abs(x-r.x)<=r.w/2-.27&&Math.abs(z-r.z)<=r.d/2-.27)
   &&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.52);
 }
 function nearestWalkable(x,z){
  if(walkable(x,z))return new THREE.Vector3(x,0,z);
  for(let radius=.4;radius<=6.4;radius+=.36)
   for(let k=0;k<36;k++){
    const a=k*Math.PI/18,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
    if(walkable(px,pz))return new THREE.Vector3(px,0,pz);
   }
  return null;
 }
 function roomAt(x,z){
  return ROOM_DEFS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)||rooms.rotunda;
 }
 function update(time,dt,animated=true){
  if(!animated)return;
  for(const e of effects){
   if(e.type==='sculpture')e.object.rotation.y+=dt*.1;
   else if(e.type==='timeline')e.object.rotation.z+=dt*.13;
  }
 }
 return {group:root,rooms,floors,interactives,obstacles,cameraBlockers,assetSlots,walkable,nearestWalkable,roomAt,addExhibit,update};
}

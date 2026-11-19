import * as THREE from 'three';
import {M,mat} from './materials.js';

/**
 * Modular vaulted museum kit: every wing uses the same walls, ribs, exhibits
 * and doorway geometry. Camera-facing upper walls and eaves are cut away,
 * keeping the historical architecture visible without blocking gameplay.
 */
export const ROOM_DEFS=[
 {id:'rotunda',name:'The Grand Rotunda',short:'Rotunda',icon:'⌂',x:0,z:0,w:18,d:18,doors:['n','s','e','w'],color:0x4c7469,role:'hub'},
 {id:'investment',name:'Investment & Banking Gallery',short:'Investment',icon:'◇',x:-29,z:0,w:18,d:16,doors:['e','n'],color:0x547762,role:'cases'},
 {id:'business',name:'Business & Property Gallery',short:'Business',icon:'▤',x:29,z:0,w:18,d:16,doors:['w','n'],color:0x776c58,role:'cases'},
 {id:'insurance',name:'Insurance & Financial Services',short:'Insurance',icon:'◈',x:-29,z:-27,w:18,d:16,doors:['s'],color:0x3e6877,role:'cases'},
 {id:'trust',name:'Public Trust Gallery',short:'Public Trust',icon:'✧',x:29,z:-27,w:18,d:16,doors:['s'],color:0x655c7b,role:'cases'},
 {id:'federal',name:'Federal Cases Wing',short:'Federal',icon:'⚖',x:0,z:-29,w:18,d:16,doors:['s'],color:0x51698b,role:'cases'},
 {id:'archive',name:'The Records Library',short:'Records Library',icon:'▥',x:0,z:29,w:18,d:16,doors:['n'],color:0x80654d,role:'library'}
];
export const HALLWAYS=[
 {x:-16,z:0,w:16,d:6},{x:16,z:0,w:16,d:6},
 {x:0,z:-16,w:7,d:16},{x:0,z:16,w:7,d:16},
 {x:-29,z:-13.5,w:6,d:12},{x:29,z:-13.5,w:6,d:12}
];
const boxGeo=new THREE.BoxGeometry(1,1,1);
function mesh(geometry,material,parent,x=0,y=0,z=0,shadow=false){
 const o=new THREE.Mesh(geometry,material);
 o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;
}
function block(parent,material,x,y,z,w,h,d,shadow=false){
 const o=mesh(boxGeo,material,parent,x,y,z,shadow);o.scale.set(w,h,d);return o;
}
function cylinder(parent,material,x,y,z,r,h,seg=20){
 return mesh(new THREE.CylinderGeometry(r,r,h,seg),material,parent,x,y,z,true);
}
function label(str,w=2.8,h=.43){
 const c=document.createElement('canvas');c.width=768;c.height=144;
 const ctx=c.getContext('2d');ctx.fillStyle='#2b3436';ctx.fillRect(0,0,768,144);
 ctx.strokeStyle='#c6a978';ctx.lineWidth=7;ctx.strokeRect(8,8,752,128);
 ctx.fillStyle='#e9dec7';ctx.font='36px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const words=String(str).split(/\s+/);const rows=[''];
 for(const word of words){
  const i=rows.length-1,merged=(rows[i]+' '+word).trim();
  if(ctx.measureText(merged).width>682 && rows[i] && rows.length<3)rows.push(word);
  else rows[i]=merged;
 }
 const size=rows.length===1?37:rows.length===2?31:26;
 ctx.font=size+'px Georgia,serif';
 rows.forEach((line,i)=>ctx.fillText(line,384,72+(i-(rows.length-1)/2)*38,685));
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
}
function archCurve(radius,spring,rise,z,originX,originZ){
 const pts=[];
 for(let i=0;i<=34;i++){
  const t=-1+2*i/34;
  pts.push(new THREE.Vector3(originX+t*radius,spring+rise*Math.sqrt(Math.max(0,1-t*t)),originZ+z));
 }
 return new THREE.CatmullRomCurve3(pts);
}
export function makeMuseum(scene){
 const root=new THREE.Group();scene.add(root);
 const rooms={},floors=[],floorRects=[],obstacles=[],interactives=[],effects=[];
 const cutaways=[];const overhead=[];
 const totalHeight=7.7, vaultSpring=8.4,vaultRise=3.35;
 function floor(x,z,w,d,isRoom=false){
  const plate=block(root,isRoom?M.floor:M.corridor,x,-.24,z,w,.42,d);
  plate.userData.walkable=true;plate.receiveShadow=true;
  floors.push(plate);floorRects.push({x,z,w,d});
  if(isRoom){
   for(const edge of [-1,1]){
    block(root,M.edge,x,0,z+edge*d/2,w,.045,.055);
    block(root,M.edge,x+edge*w/2,0,z,.055,.045,d);
   }
  }
 }
 function column(parent,x,z,short=false){
  const height=short?1.15:totalHeight;
  cylinder(parent,M.stone,x,height/2,z,short?.19:.27,height,24);
  cylinder(parent,M.beam,x,.18,z,short?.29:.39,.18,24);
  cylinder(parent,M.brass,x,height-.13,z,short?.29:.38,.17,24);
  if(!short)block(parent,M.beam,x,totalHeight,z,.8,.17,.8);
 }
 function wallSegment(room,dir,offset,len,upper){
  const g=upper?upper.group:root;
  const level=upper?1.15:0;
  const height=upper?totalHeight-1.15:1.15;
  const isX=dir==='n'||dir==='s',sign=(dir==='n'||dir==='w')?-1:1;
  const x=room.x+(isX?offset:sign*room.w/2),z=room.z+(isX?sign*room.d/2:offset);
  const w=isX?len:.28,d=isX?.28:len;
  block(g,upper?M.stone:M.wood,x,level+height/2,z,w,height,d,true);
  if(!upper){
   block(g,M.brass,x,1.13,z,isX?len:.3,.055,isX?.3:len);
   return;
  }
  // Historic walnut paneling and thin, non-emissive brass picture rails.
  const divisions=Math.max(1,Math.floor(len/2.65));
  for(let i=0;i<divisions;i++){
   const off=(i+.5-divisions/2)*len/divisions;
   const px=x+(isX?off:0),pz=z+(isX?0:off),span=len/divisions-.27;
   const inside=sign<0?.18:-.18;
   block(g,M.woodHighlight,px+(isX?0:inside),3.1,pz+(isX?inside:0),
    isX?span:.075,2.4,isX?.075:span);
   block(g,M.brass,px+(isX?0:inside*1.2),4.35,pz+(isX?inside*1.2:0),
    isX?span+.07:.085,.06,isX?.085:span+.07);
  }
  block(g,M.beam,x,totalHeight-.12,z,isX?len:.4,.24,isX?.4:len);
 }
 function wall(room,dir){
  const upper={group:new THREE.Group(),roomId:room.id,dir};
  root.add(upper.group);cutaways.push(upper);
  const len=dir==='n'||dir==='s'?room.w:room.d;
  const hasDoor=room.doors.includes(dir);
  const parts=hasDoor?[[-(len+5.6)/4,(len-5.6)/2],[(len+5.6)/4,(len-5.6)/2]]:[[0,len]];
  for(const [offset,width] of parts){
   wallSegment(room,dir,offset,width,null);
   wallSegment(room,dir,offset,width,upper);
  }
  if(hasDoor){
   const alongX=dir==='n'||dir==='s';
   const sign=dir==='n'||dir==='w'?-1:1;
   const x=room.x+(alongX?0:sign*room.w/2),z=room.z+(alongX?sign*room.d/2:0);
   for(const side of [-1,1])
    column(upper.group,x+(alongX?side*2.8:0),z+(alongX?0:side*2.8));
   // Stone arch above doorway, open below. It is part of the camera cutaway.
   const points=[];
   for(let i=0;i<=20;i++){
    const a=Math.PI-i*Math.PI/20,dist=Math.cos(a)*2.8,y=6+2*Math.sin(a);
    points.push(new THREE.Vector3(x+(alongX?dist:0),y,z+(alongX?0:dist)));
   }
   mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),35,.14,7),M.beam,upper.group);
  }
 }
 function makeVault(room){
  const half=room.w/2-.9;
  // Visible vault ribs, not a solid roof slab. The central well stays open
  // so the camera never has an opaque ceiling in front of the visitor.
  for(const z of [-room.d/2+1.1,-room.d/2+4.2,room.d/2-4.2,room.d/2-1.1]){
   const curve=archCurve(half,vaultSpring,vaultRise,z,room.x,room.z);
   mesh(new THREE.TubeGeometry(curve,36,.105,7,false),M.beam,root);
  }
  // Only narrow perimeter eaves are filled. They demonstrate the curved
  // plaster vault, while the middle remains cut away for the player camera.
  for(const dir of ['n','s']){
   const g=new THREE.Group();root.add(g);overhead.push({group:g,roomId:room.id,dir});
   const zEdge=room.z+(dir==='n'?-room.d/2:room.d/2);
   const zBack=room.z+(dir==='n'?-room.d/2+1.65:room.d/2-1.65);
   const vertices=[],uv=[],indices=[];
   for(let i=0;i<=28;i++){
    const t=-1+2*i/28;
    const x=room.x+t*half,y=vaultSpring+vaultRise*Math.sqrt(Math.max(0,1-t*t));
    vertices.push(x,y,zEdge,x,y,zBack);uv.push(i/28,0,i/28,1);
    if(i<28){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
   geo.setIndex(indices);geo.computeVertexNormals();
   mesh(geo,M.vault,g);
   // A narrow painted central ridge and brass edging define the roof line.
   block(g,M.brass,room.x,vaultSpring+vaultRise+.018,(zEdge+zBack)/2,.05,.045,1.66);
  }
 }
 function wallSign(room){
  const sign=label(room.name,Math.min(7.2,room.w-2),.82);
  sign.position.set(room.x,5.9,room.z-room.d/2+.45);
  root.add(sign);
  // It belongs to the north upper wall and will hide when near that wall.
  const group=cutaways.find(c=>c.roomId===room.id&&c.dir==='n');
  if(group){root.remove(sign);group.group.add(sign);}
 }
 for(const corridor of HALLWAYS)floor(corridor.x,corridor.z,corridor.w,corridor.d,false);
 for(const room of ROOM_DEFS){
  rooms[room.id]=room;floor(room.x,room.z,room.w,room.d,true);
  for(const dir of ['n','s','e','w'])wall(room,dir);
  makeVault(room);wallSign(room);
  for(const xx of [-1,1])for(const zz of [-1,1]){
   const x=room.x+xx*(room.w/2-.65),z=room.z+zz*(room.d/2-.65);
   // Tall columns only when they're along far walls; camera-facing ones cut away.
   const g=cutaways.find(a=>a.roomId===room.id&&a.dir===(zz<0?'n':'s'));
   column(g?.group||root,x,z);
  }
  if(room.role==='cases'){
   for(const side of [-1,1]){
    const x=room.x+side*(room.w/2-2),z=room.z+room.d/2-1.3;
    cylinder(root,M.wood,x,1.2,z,.22,2.4,12);
    mesh(new THREE.SphereGeometry(.23,12,10),M.light,root,x,2.47,z);
    const lamp=new THREE.PointLight(0xffd8a5,.52,7,2);lamp.position.set(x,2.54,z);root.add(lamp);
   }
  }
 }
 function register(exhibit,record,rad=1){
  const hit=mesh(new THREE.CylinderGeometry(rad,rad,2.8,12),
   new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}),exhibit,0,1.5,0);
  // Invisible raycastable area is retained, as with the original exhibit kit.
  hit.material.visible=true;hit.material.transparent=true;hit.material.opacity=0;
  hit.material.depthWrite=false;hit.userData.action=record;interactives.push(hit);
  obstacles.push({x:exhibit.position.x,z:exhibit.position.z,r:rad*.83});
 }
 function framedDocument(g){
  const frame=block(g,M.wood,0,1.72,0,1.06,1.18,.085);
  frame.rotation.y=.10;
  const sheet=block(g,M.page,0,1.72,.062,.89,.98,.025);
  sheet.rotation.y=.10;
  for(let i=0;i<5;i++){
   const line=block(g,M.ink,0,1.94-i*.145,.087,i===0?.5:.65,.015,.01);
   line.rotation.y=.10;
  }
  return frame;
 }
 function addExhibit(roomId,localX,localZ,record,type='case'){
  const room=rooms[roomId];if(!room)throw new Error('Unknown room '+roomId);
  const g=new THREE.Group();g.position.set(room.x+localX,0,room.z+localZ);root.add(g);
  const display=type==='case'||type==='archive';
  let moving=null;
  if(display){
   // A rectangular museum vitrine, not a floating round podium.
   block(g,M.plinth,0,.28,0,1.55,.56,1.15,true);
   block(g,M.brass,0,.57,0,1.6,.045,1.2);
   block(g,M.wood,0,.76,0,1.48,.3,1.08,true);
   block(g,M.velvet,0,.93,0,1.39,.045,.98);
   framedDocument(g);
   // Thin glass panes: no opaque box in front of the archival document.
   for(const x of [-.73,.73])block(g,M.glass,x,1.59,0,.025,1.35,1.1);
   for(const z of [-.53,.53])block(g,M.glass,0,1.59,z,1.5,1.35,.025);
   for(const x of [-.74,.74])for(const z of [-.55,.55])
    block(g,M.brass,x,1.57,z,.022,1.39,.022);
   block(g,M.brass,0,2.27,0,1.55,.04,1.17);
   block(g,M.wood,0,2.3,0,1.58,.08,1.2);
  }else if(type==='directory'){
   // Standing walnut information cabinet, with an angled ledger.
   block(g,M.wood,0,.73,0,1.7,1.46,1.15,true);
   block(g,M.brass,0,1.46,0,1.76,.045,1.2);
   const book=block(g,M.page,0,1.55,.03,1.35,.11,.95);
   book.rotation.x=-.19;block(g,M.brass,0,1.59,.12,.045,.07,1);
  }else if(type==='portal'){
   block(g,M.plinth,0,.3,0,1.72,.6,1.25);
   block(g,M.wood,0,.7,0,1.58,.2,1.1);
   const opening=mesh(new THREE.TorusGeometry(.69,.095,10,38),M.beam,g,0,1.86,0);
   moving=opening; // Gentle museum-themed motion, no neon effect.
   cylinder(g,M.brass,0,1.12,0,.12,.6);
  }else if(type==='timeline'){
   block(g,M.wood,0,.72,0,1.68,1.44,1.12);
   const clockface=mesh(new THREE.CylinderGeometry(.57,.57,.07,40),M.brass,g,0,1.65,.23);
   clockface.rotation.x=Math.PI/2;
   const hand=block(g,M.ink,0,1.68,.29,.055,.53,.035);
   moving=hand;
  }else{
   block(g,M.plinth,0,.54,0,1.6,1.08,1.1);
   const lectern=block(g,M.wood,0,1.35,0,1.48,.12,1.12);
   lectern.rotation.x=-.23;
   block(g,M.page,0,1.44,.08,1.25,.028,.82).rotation.x=-.23;
  }
  const plaque=label(record.name||record.title||'Explore',1.56,.34);
  plaque.position.set(0,display?.57:1.01,.6);g.add(plaque);
  // A very subtle brass lamp to ground each display.
  if(display){
   block(g,M.light,0,2.26,.48,.68,.02,.018);
  }
  if(moving)effects.push({object:moving,type});
  register(g,{...record,roomId,type},type==='directory'?1.22:.97);
  return g;
 }
 function addCarpet(roomId){
  const r=rooms[roomId];
  block(root,M.rug,r.x,-.008,r.z,4.8,.024,8.25);
  for(const sign of [-1,1])
   block(root,M.edge,r.x,.008,r.z+sign*4.1,4.6,.017,.05);
 }
 addCarpet('rotunda');addCarpet('archive');
 const centerpiece=new THREE.Group();centerpiece.position.set(0,0,-2.8);root.add(centerpiece);
 obstacles.push({x:0,z:-2.8,r:1.6});
 cylinder(centerpiece,M.plinth,0,.22,0,1.34,.44,32);
 cylinder(centerpiece,M.wood,0,.65,0,.99,.43,32);
 const astrolabe=mesh(new THREE.TorusGeometry(.97,.065,9,48),M.beam,centerpiece,0,2.05,0);
 astrolabe.rotation.y=.28;
 mesh(new THREE.TorusGeometry(.75,.028,8,46),M.brass,centerpiece,0,2.05,0).rotation.x=.65;
 effects.push({object:astrolabe,type:'sculpture'});
 function walkable(x,z){
  const inside=floorRects.some(r=>Math.abs(x-r.x)<=r.w/2-.27&&Math.abs(z-r.z)<=r.d/2-.27);
  return inside&&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.56);
 }
 function nearestWalkable(x,z){
  if(walkable(x,z))return new THREE.Vector3(x,0,z);
  for(let radius=.65;radius<6.2;radius+=.5)for(let i=0;i<28;i++){
   const a=i*Math.PI/14,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
   if(walkable(px,pz))return new THREE.Vector3(px,0,pz);
  }
  return null;
 }
 function roomAt(x,z){return ROOM_DEFS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)||rooms.rotunda;}
 // Cutaway state tracks the camera orientation. Even after rotating the view,
 // any intervening high walls and near roof eaves disappear automatically.
 function setCutaway(camera){
  if(!camera)return;
  for(const a of [...cutaways,...overhead]){
   const r=rooms[a.roomId],dx=camera.position.x-r.x,dz=camera.position.z-r.z;
   const near=(a.dir==='e'&&dx>2)||(a.dir==='w'&&dx<-2)||
    (a.dir==='s'&&dz>2)||(a.dir==='n'&&dz<-2);
   a.group.visible=!near;
  }
 }
 function update(t,dt,animated=true,camera=null){
  setCutaway(camera);
  if(!animated)return;
  for(const e of effects){
   if(e.type==='sculpture')e.object.rotation.y+=dt*.05;
   if(e.type==='portal')e.object.rotation.y+=dt*.09;
   if(e.type==='timeline')e.object.rotation.z+=dt*.15;
  }
 }
 return {group:root,rooms,floors,interactives,obstacles,walkable,nearestWalkable,roomAt,addExhibit,update};
}

import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE,HALLWAYS,PORTALS} from './layout.js';
import {M,createTiledMaterial,createSurfaceMaterial,scaleBoxUV} from './materials.js';
import {createStainedWindow} from './stained-glass.js';

/**
 * Interior-scale basilica architecture. Real holes in thick masonry permit
 * natural sightlines, raycasting, daylight glass and third-person navigation.
 * No roofs or walls are hidden as a camera trick.
 */
const rooms=[...ROOM_DEFS,VESTIBULE];
const slab=new THREE.BoxGeometry(1,1,1);
const trim=M.edge;
function object(parent,geo,material,x=0,y=0,z=0,cast=false){
 const obj=new THREE.Mesh(geo,material);obj.position.set(x,y,z);
 obj.castShadow=cast;obj.receiveShadow=true;parent.add(obj);return obj;
}
function box(parent,mat,x,y,z,w,h,d,cast=false){
 // Wood panels and doors use physical-world UVs instead of stretched cube UVs.
 const textured=mat.userData?.kind==='wood';
 const geometry=textured
  ?scaleBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,1.65):slab;
 const o=object(parent,geometry,mat,x,y,z,cast);
 if(!textured)o.scale.set(w,h,d);
 return o;
}
function masonry(parent,material,x,y,z,w,h,d,blockers){
 // Explicit world dimensions keep shader displacement in metres.
 // Only front/back faces use relief. The caps remain flush at seams.
 const sx=Math.min(28,Math.max(2,Math.ceil(w/.56)));
 const sy=Math.min(26,Math.max(2,Math.ceil(h/.56)));
 const geo=scaleBoxUV(new THREE.BoxGeometry(w,h,d,sx,sy,1),w,h,d,2.35);
 const relief=createSurfaceMaterial(M.stone,{relief:true});
 const mats=[M.stone,M.stone,M.stone,M.stone,relief,relief];
 const solid=object(parent,geo,mats,x,y,z,false);
 blockers.push(solid);
 return solid;
}
function tube(parent,points,material=M.edge,radius=.09){
 return object(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,7),material);
}
function cylinder(parent,mat,x,y,z,r,h,seg=16){
 const geo=new THREE.CylinderGeometry(r,r,h,seg);
 if(mat.userData?.kind==='stone'){
  const uv=geo.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*Math.max(1,h/2.35));
  uv.needsUpdate=true;
 }
 return object(parent,geo,mat,x,y,z,true);
}
function museumSign(title){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#263632';ctx.fillRect(0,0,1024,256);
 ctx.strokeStyle='#b89f71';ctx.lineWidth=9;ctx.strokeRect(11,11,1002,234);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f0e4cd';
 const words=String(title).split(/\s+/),lines=[''];ctx.font='43px Georgia,serif';
 for(const word of words){
  const i=lines.length-1,v=(lines[i]+' '+word).trim();
  if(ctx.measureText(v).width>900&&lines[i]&&lines.length<2)lines.push(word);else lines[i]=v;
 }
 ctx.font=(lines.length>1?37:45)+'px Georgia,serif';
 lines.forEach((line,i)=>ctx.fillText(line,512,128+(i-(lines.length-1)/2)*66,923));
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(3.9,.78),
  new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
}

function archPath(path,c,r,bottom,shoulder,rise){
 path.moveTo(c-r,bottom);path.lineTo(c+r,bottom);path.lineTo(c+r,shoulder);
 for(let i=0;i<=24;i++){
  const a=i*Math.PI/24;path.lineTo(c+r*Math.cos(a),shoulder+rise*Math.sin(a));
 }
 path.lineTo(c-r,shoulder);path.lineTo(c-r,bottom);
}
function openings(room,dir){
 const vertical=dir==='e'||dir==='w',axis=vertical?'x':'z';
 const boundary=vertical?room.x+(dir==='e'?room.w/2:-room.w/2):
  room.z+(dir==='s'?room.d/2:-room.d/2);
 const length=vertical?room.d:room.w;
 const active=PORTALS.filter(p=>
  (p.a===room.id||p.b===room.id)&&p.axis===axis
  &&Math.abs(p.value-boundary)<.07&&Math.abs(p.at-(vertical?room.z:room.x))<length/2
 ).map(p=>({
  type:'door',at:p.at-(vertical?room.z:room.x),width:p.width,
  bottom:.018,shoulder:room.height>10?5.6:4.75,rise:room.height>10?1.65:1.45
 }));
 const windows=[];
 const add=(offset,params={})=>{
  windows.push({type:'window',at:offset,width:params.width||2.2,
   bottom:params.bottom??3.6,shoulder:params.shoulder??6.25,
   rise:params.rise??1.14});
 };
 if(room.id==='rotunda'&&vertical){
  for(const z of [-23,-7,7,23])add(z,{width:2.4,bottom:8.35,shoulder:9.45,rise:.9});
 }
 if(['investment','insurance'].includes(room.id)&&dir==='w'){
  for(const at of [-4.7,4.7])add(at,{width:2.5,bottom:3.25,shoulder:6.15,rise:1.1});
 }
 if(['business','trust'].includes(room.id)&&dir==='e'){
  for(const at of [-4.7,4.7])add(at,{width:2.5,bottom:3.25,shoulder:6.15,rise:1.1});
 }
 if(room.id==='federal'){
  if(dir==='n')add(0,{width:5.15,bottom:3.3,shoulder:7.15,rise:1.9});
  if(vertical)for(const at of [-5,5])add(at,{width:2.35,bottom:4.0,shoulder:7.15,rise:1.18});
 }
 if(room.id==='archive'&&(dir==='n'||dir==='s'))
  for(const at of [-4.8,4.8])add(at,{width:2.1,bottom:3.4,shoulder:5.8,rise:1.1});
 if(room.id==='vestibule'&&dir==='s'){
  // Opening to exterior arrival court.
  active.push({type:'door',at:0,width:6.2,bottom:.018,shoulder:4.85,rise:1.45});
 }
 const combined=[...active,...windows];
 for(let i=0;i<combined.length;i++)for(let j=i+1;j<combined.length;j++)
  if(Math.abs(combined[i].at-combined[j].at)<(combined[i].width+combined[j].width)/2+.22)
   throw new Error('Overlapping openings: '+room.id+' '+dir);
 return combined;
}
/*
 * A solid wall is built ONLY from disjoint masonry pieces.
 *
 * The previous THREE.Shape hole was filled by triangulation, leaving false
 * doors that pathfinding believed were open. This kit has no full-height mesh
 * spanning a doorway, even if the arch material or shading is broken.
 */
const THICKNESS=.48;
function doorwayArch(parent,opening,top){
 const r=opening.width/2;
 const outline=new THREE.Shape();
 // The spandrel is solid stone ABOVE the arch and open below it.
 outline.moveTo(-r,opening.shoulder);
 outline.lineTo(-r,top);
 outline.lineTo(r,top);
 outline.lineTo(r,opening.shoulder);
 for(let i=0;i<=32;i++){
  const a=i*Math.PI/32;
  outline.lineTo(r*Math.cos(a),opening.shoulder+opening.rise*Math.sin(a));
 }
 outline.closePath();
 const geo=new THREE.ExtrudeGeometry(outline,{
  depth:THICKNESS,steps:1,bevelEnabled:false,curveSegments:14
 });
 // Geometry is in local wall space and spans the same thickness as the
 // neighboring stone blocks. No coplanar duplicate full wall behind it.
 const stone=new THREE.Mesh(geo,M.stone);
 stone.position.set(opening.at,0,-THICKNESS/2);
 stone.castShadow=false;stone.receiveShadow=true;
 parent.add(stone);
 return stone;
}
function wall(room,dir,parent,blockers,windows){
 const vertical=dir==='e'||dir==='w';
 const width=vertical?room.d:room.w;
 const height=room.height;
 const x=vertical?room.x+(dir==='e'?room.w/2:-room.w/2):room.x;
 const z=vertical?room.z:room.z+(dir==='s'?room.d/2:-room.d/2);
 // Interior portal walls are shared. Build the nave wall ONCE, rather than
 // two exactly overlapping stone walls that flicker and reseal openings.
 if(room.id!=='rotunda'&&PORTALS.some(p=>
  p.a==='rotunda'&&p.b===room.id&&
  p.axis===(vertical?'x':'z')&&
  Math.abs(p.value-(vertical?x:z))<.06
 ))return;
 const holes=openings(room,dir).sort((a,b)=>a.at-b.at);
 const wallGroup=new THREE.Group();
 wallGroup.position.set(x,0,z);
 if(vertical)wallGroup.rotation.y=-Math.PI/2;
 parent.add(wallGroup);
 const body=(u,fromY,w,h)=>{
  if(w<=.025||h<=.025)return null;
  return masonry(wallGroup,M.stone,u,fromY+h/2,0,w,h,THICKNESS,blockers);
 };
 let cursor=-width/2;
 for(const h of holes){
  const left=h.at-h.width/2,right=h.at+h.width/2;
  if(left<cursor-.02||right>width/2+.02)
   throw Error('Invalid opening bounds in '+room.id+' '+dir);
  // No mesh at any height crosses an open portal span below the arch.
  body((cursor+left)/2,0,left-cursor,height);
  const top=h.shoulder+h.rise+.18;
  if(h.type==='window'){
   // Windows keep a real opening above the solid stone sill.
   body(h.at,0,h.width,h.bottom);
  }
  body(h.at,top,h.width,height-top);
  const spandrel=doorwayArch(wallGroup,h,top);
  blockers.push(spandrel);
  cursor=right;
 }
 body((cursor+width/2)/2,0,width/2-cursor,height);
 // Ornament hangs on the wall, never across a door below its lintel.
 const count=Math.max(2,Math.round(width/3.2));
 for(let i=0;i<count;i++){
  const u=-width/2+(i+.5)*width/count;
  const span=width/count-.35;
  if(holes.some(h=>Math.abs(u-h.at)<h.width/2+span/2+.17))continue;
  box(wallGroup,M.wood,u,1.50,THICKNESS/2+.06,span,2.65,.13);
  box(wallGroup,M.edge,u,2.91,THICKNESS/2+.12,span+.06,.07,.16);
  box(wallGroup,M.woodHighlight,u,.26,THICKNESS/2+.08,span,.2,.14);
 }
 // Pier rhythm, recessed paneling and stone arch jambs are non-colliding.
 for(const h of holes){
  const r=h.width/2,pts=[];
  for(let i=0;i<=30;i++){
   const a=i*Math.PI/30;
   pts.push(new THREE.Vector3(h.at+r*Math.cos(a),h.shoulder+h.rise*Math.sin(a),THICKNESS/2+.04));
  }
  tube(wallGroup,pts,trim,.10);
  for(const sign of [-1,1]){
   const u=h.at+sign*(r+.14);
   if(Math.abs(u)>=width/2-.1)continue;
   box(wallGroup,M.beam,u,h.shoulder*.49,THICKNESS/2+.09,.21,h.shoulder-.08,.22);
   box(wallGroup,trim,u,h.shoulder+.1,THICKNESS/2+.1,.35,.16,.35);
  }
  if(h.type==='door'){
   const portal=PORTALS.find(p=>
    (p.a===room.id||p.b===room.id)
    &&p.axis===(vertical?'x':'z')
    &&Math.abs(p.value-(vertical?x:z))<.06
    &&Math.abs(p.at-((vertical?room.z:room.x)+h.at))<.06);
   const destination=portal&&(portal.a===room.id?portal.b:portal.a);
   const destinationRoom=rooms.find(r=>r.id===destination);
   if(destinationRoom&&destinationRoom.id!=='rotunda'){
    const sign=museumSign(destinationRoom.name);
    const archTop=h.shoulder+h.rise+.18;
    sign.position.set(h.at,Math.min(height-.44,archTop+.42),THICKNESS/2+.13);
    wallGroup.add(sign);
   }
  }
  if(h.type==='window'){
   const seed=110+Math.round((room.x+room.z+h.at)*7);
   const glass=createStainedWindow(parent,{
    x:vertical?x:room.x+h.at,
    z:vertical?room.z+h.at:z,
    axis:vertical?'x':'z',width:h.width,bottom:h.bottom,
    shoulder:h.shoulder,rise:h.rise,seed:Math.abs(seed),
    lightPool:h.bottom<5,inside:(dir==='n'||dir==='w')?1:-1
   });
   windows.push(glass);
  }
 }
 // Cornice is deliberately located above every door, not through it.
 box(wallGroup,M.beam,0,height-.12,THICKNESS/2,width,.18,.4);
}
function vault(room,parent){
 const span=room.w-.8,depth=room.d-.6;
 const high=room.id==='rotunda'?3.3:room.id==='federal'?2.6:1.75;
 const strips=32,rows=Math.max(8,Math.ceil(depth/2)),positions=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=strips;i++){
  const t=-1+2*i/strips;
  const px=room.x+span*t/2;
  const py=room.height-.17+high*Math.sqrt(Math.max(0,1-t*t));
  const pz=room.z-depth/2+depth*j/rows;
  positions.push(px,py,pz);
  // Physically consistent plaster texel density, independent of room size.
  uv.push((i/strips)*span/2.75,(j/rows)*depth/2.75);
  if(j<rows&&i<strips){
   const n=j*(strips+1)+i;
   indices.push(n,n+1,n+strips+1,n+1,n+strips+2,n+strips+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 // Shared material receives the imported PBR maps asynchronously.
 object(parent,geometry,M.vault);
 const spacing=room.id==='rotunda'?7.5:room.id==='federal'?6:5.2;
 for(let z=-depth/2+1.4;z<depth/2-.5;z+=spacing){
  const pts=[];
  for(let i=0;i<=30;i++){
   const t=-1+2*i/30;
   pts.push(new THREE.Vector3(room.x+t*span/2,
    room.height-.1+high*Math.sqrt(Math.max(0,1-t*t)),room.z+z));
  }
  tube(parent,pts,M.beam,.095);
 }
 box(parent,trim,room.x,room.height+high-.08,room.z,.10,.075,depth);
}
function column(parent,x,z,height){
 cylinder(parent,M.plinth,x,.24,z,.53,.48,20);
 cylinder(parent,M.stone,x,height/2,z,.29,height,18);
 cylinder(parent,trim,x,height-.32,z,.5,.18,18);
 cylinder(parent,M.beam,x,height-.08,z,.59,.20,18);
}
function floorMesh(parent,x,z,w,d,material){
 const plane=object(parent,new THREE.PlaneGeometry(w,d),createTiledMaterial(material,w/5,d/5),x,0,z);
 plane.rotation.x=-Math.PI/2;
 plane.userData.walkable=true;
 return plane;
}
export function buildArchitecture(scene){
 const group=new THREE.Group();scene.add(group);
 const floors=[],floorRects=[],cameraBlockers=[],windows=[];
 const ground=object(group,new THREE.PlaneGeometry(145,156),
  new THREE.MeshStandardMaterial({color:0x30363a,roughness:1}),0,-.48,0);
 ground.rotation.x=-Math.PI/2;
 const addFloor=(x,z,w,d,material)=>{
  const f=floorMesh(group,x,z,w,d,material);
  floors.push(f);floorRects.push({x,z,w,d});
 };
 for(const r of HALLWAYS)addFloor(r.x,r.z,r.w,r.d,M.corridor);
 for(const room of rooms){
  const tile=room.id==='archive'?M.corridor:M.floor;
  addFloor(room.x,room.z,room.w,room.d,tile);
  for(const dir of ['n','s','e','w'])wall(room,dir,group,cameraBlockers,windows);
  vault(room,group);
  if(room.id==='rotunda'){
   // Vertical masonry supports distinguish the basilica nave.
   for(const z of [-24,-6,6,24])
    for(const x of [-8.5,8.5])column(group,x,z,room.height-.5);
  }else{
   for(const sx of [-1,1])for(const sz of [-1,1]){
    // Keep corners clear of actual doorway apertures.
    const x=room.x+sx*(room.w/2-.7),z=room.z+sz*(room.d/2-.7);
    column(group,x,z,room.height-.55);
   }
  }
 }
 // A real wide aisle connects the southern entry to the federal apse.
 box(group,M.rug,0,.018,0,4.6,.035,54);
 for(const x of [-2.22,2.22])box(group,trim,x,.041,0,.05,.012,53.6);
 return {group,floors,floorRects,cameraBlockers,windows};
}

import * as THREE from 'three';
import {ROOM_DEFS,VESTIBULE,HALLWAYS,PORTALS} from './layout.js';
import {M,createTiledMaterial} from './materials.js';
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
 const o=object(parent,slab,mat,x,y,z,cast);o.scale.set(w,h,d);return o;
}
function tube(parent,points,material=M.edge,radius=.09){
 return object(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,7),material);
}
function cylinder(parent,mat,x,y,z,r,h,seg=16){
 return object(parent,new THREE.CylinderGeometry(r,r,h,seg),mat,x,y,z,true);
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
  bottom:-.12,shoulder:room.height>10?5.6:4.75,rise:room.height>10?1.65:1.45
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
  active.push({type:'door',at:0,width:6.2,bottom:-.1,shoulder:4.85,rise:1.45});
 }
 const combined=[...active,...windows];
 for(let i=0;i<combined.length;i++)for(let j=i+1;j<combined.length;j++)
  if(Math.abs(combined[i].at-combined[j].at)<(combined[i].width+combined[j].width)/2+.22)
   throw new Error('Overlapping openings: '+room.id+' '+dir);
 return combined;
}
function wall(room,dir,parent,blockers,windows){
 const vertical=dir==='e'||dir==='w';
 const width=vertical?room.d:room.w,height=room.height,depth=.50;
 const x=vertical?room.x+(dir==='e'?room.w/2:-room.w/2):room.x;
 const z=vertical?room.z:room.z+(dir==='s'?room.d/2:-room.d/2);
 const holes=openings(room,dir),shape=new THREE.Shape();
 shape.moveTo(-width/2,0);shape.lineTo(width/2,0);
 shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();
 for(const h of holes){
  const hole=new THREE.Path();
  archPath(hole,h.at,h.width/2,h.bottom,h.shoulder,h.rise);
  shape.holes.push(hole);
 }
 const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:12});
 const masonry=object(parent,geo,createTiledMaterial(M.stone,width/3.7,height/3.7),x,0,z,true);
 if(vertical)masonry.rotation.y=-Math.PI/2;
 masonry.position.add(new THREE.Vector3(vertical?-.25:0,0,vertical?0:-.25));
 blockers.push(masonry);
 const outer=new THREE.Group();outer.position.set(x,0,z);
 if(vertical)outer.rotation.y=-Math.PI/2;
 parent.add(outer);
 // Base course, chair rail, stone cornice and restrained walnut panel rhythm.
 const panels=holes.filter(h=>h.type==='door');
 const panelCount=Math.max(2,Math.floor(width/3.35));
 for(let i=0;i<panelCount;i++){
  const u=(-.5+(i+.5)/panelCount)*width;
  if(panels.some(h=>Math.abs(u-h.at)<h.width/2+.22))continue;
  const span=width/panelCount-.25;
  box(outer,M.wood, u,1.49,.32,span,2.7,.13);
  box(outer,trim,u,2.95,.4,span+.07,.062,.14);
  box(outer,M.woodHighlight,u,.17,.34,span,.2,.15);
 }
 // Horizontal cornice at wall crown.
 box(outer,M.beam,0,height-.11,.25,width,.19,.58);
 // Rounded/pointed arch reveals. Their backs are offset from the wall.
 for(const h of holes){
  const r=h.width/2;const pts=[];
  for(let i=0;i<=30;i++){
   const a=i*Math.PI/30;
   pts.push(new THREE.Vector3(h.at+r*Math.cos(a),h.shoulder+h.rise*Math.sin(a),.36));
  }
  tube(outer,pts,trim,.13);
  for(const side of [-1,1]){
   box(outer,M.beam,h.at+side*r,h.bottom+Math.max(0,h.shoulder-h.bottom)/2,.34,.16,h.shoulder-h.bottom,.2);
  }
  if(h.type==='window'){
   const seed=110+Math.round((room.x+room.z+h.at)*7);
   const glass=createStainedWindow(parent,{
    x:vertical?x:room.x+h.at,z:vertical?room.z+h.at:z,
    axis:vertical?'x':'z',width:h.width,bottom:h.bottom,
    shoulder:h.shoulder,rise:h.rise,seed:Math.abs(seed),
    lightPool:h.bottom<5,inside:(dir==='n'||dir==='w')?1:-1
   });
   windows.push(glass);
  }
 }
 // Pier capitals, bases, and regular stone pilasters between arches.
 const features=4;
 for(let i=0;i<=features;i++){
  const u=-width/2+i*width/features;
  if(holes.some(h=>Math.abs(u-h.at)<h.width/2+.14))continue;
  box(outer,M.stone,u,height*.48,.38,.4,height*.95,.44);
  box(outer,trim,u,height-.57,.41,.68,.18,.62);
  box(outer,M.beam,u,.24,.46,.7,.25,.62);
 }
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
  positions.push(px,py,pz);uv.push(i/strips,j/rows);
  if(j<rows&&i<strips){
   const n=j*(strips+1)+i;
   indices.push(n,n+1,n+strips+1,n+1,n+strips+2,n+strips+1);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const ceilingMat=M.vault.clone();ceilingMat.side=THREE.DoubleSide;
 object(parent,geometry,ceilingMat);
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

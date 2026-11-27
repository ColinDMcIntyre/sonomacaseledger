import * as THREE from 'three';
import {wornBox,surfacePolishEnabled} from './surface-geometry.js?v=20261127';
import {ROOM_DEFS,VESTIBULE,HALLWAYS,PORTALS} from './layout.js';
import {M,createTiledMaterial,createSurfaceMaterial,scaleBoxUV} from './materials.js?v=unified-vault-bays-20261119';
import {createStainedWindow} from './stained-glass.js';
import {visibleCorridorSections} from './floor-geometry.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {WALL_THICKNESS,VAULT_SEGMENTS,vaultProfile,vaultSample,vaultY,ribStations,columnX} from './vault-profile.js';

/**
 * Interior-scale basilica architecture. Real holes in thick masonry permit
 * natural sightlines, raycasting, daylight glass and third-person navigation.
 * No roofs or walls are hidden as a camera trick.
 */
const rooms=[...ROOM_DEFS,VESTIBULE];
const slab=new THREE.BoxGeometry(1,1,1);
const trim=M.quoinStone;
function object(parent,geo,material,x=0,y=0,z=0,cast=false){
 const obj=new THREE.Mesh(geo,material);obj.position.set(x,y,z);
 obj.castShadow=cast;obj.receiveShadow=true;parent.add(obj);return obj;
}
function box(parent,mat,x,y,z,w,h,d,cast=false){
 // Give each separately made wooden piece a unique grain phase while sharing
 // the SAME PBR image files across all pieces. Never offset authored GLTF UVs.
 const textured=mat.userData?.kind==='wood';
 const bevelStone=surfacePolishEnabled()&&mat.userData?.kind==='vault'&&Math.min(w,h,d)>=.055;
 let geometry=slab;
 if(textured){
  parent.updateWorldMatrix(true,false);
  const at=new THREE.Vector3(x,y,z).applyMatrix4(parent.matrixWorld);
  const hash=n=>{const value=Math.sin(n)*43758.5453;return value-Math.floor(value);};
  const seed=at.x*127.1+at.y*74.7+at.z*311.7;
  const phase=[hash(seed)*.92,hash(seed+98.21)*.91];
  geometry=scaleBoxUV(wornBox(w,h,d,'wood',seed),w,h,d,1.65,phase);
 }else if(bevelStone){
  geometry=scaleBoxUV(wornBox(w,h,d,'vault',x*17+y*31+z*11),w,h,d,2.35);
 }
 const o=object(parent,geometry,mat,x,y,z,cast);
 if(!textured&&!bevelStone)o.scale.set(w,h,d);
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
 if(['stone','vault'].includes(mat.userData?.kind)){
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
const THICKNESS=WALL_THICKNESS;
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
function sharedNaveWall(room,dir){
 const vertical=dir==='e'||dir==='w';
 const boundary=vertical?room.x+(dir==='e'?room.w/2:-room.w/2):
  room.z+(dir==='s'?room.d/2:-room.d/2);
 return room.id!=='rotunda'&&PORTALS.some(p=>
  p.a==='rotunda'&&p.b===room.id&&
  p.axis===(vertical?'x':'z')&&Math.abs(p.value-boundary)<.06);
}
function wall(room,dir,parent,blockers,windows){
 const vertical=dir==='e'||dir==='w';
 const width=vertical?room.d:room.w;
 const height=room.height;
 const x=vertical?room.x+(dir==='e'?room.w/2:-room.w/2):room.x;
 const z=vertical?room.z:room.z+(dir==='s'?room.d/2:-room.d/2);
 // Interior portal walls are shared. Build the nave wall ONCE, rather than
 // two exactly overlapping stone walls that flicker and reseal openings.
 if(sharedNaveWall(room,dir))return;
 const holes=openings(room,dir).sort((a,b)=>a.at-b.at);
 const wallGroup=new THREE.Group();
 wallGroup.position.set(x,0,z);
 if(vertical)wallGroup.rotation.y=-Math.PI/2;
 parent.add(wallGroup);
 const body=(u,fromY,w,h)=>{
  if(w<=.025||h<=.025)return null;
  const solid=masonry(wallGroup,M.stone,u,fromY+h/2,0,w,h,THICKNESS,blockers);
  // Real stone skirting hides the wall/floor junction. Never cross portals.
  if(fromY<.022 && w>.16){
   for(const face of [-1,1]){
    box(wallGroup,M.edge,u,.175,face*(THICKNESS/2+.105),w-.022,.35,.16);
    box(wallGroup,M.beam,u,.363,face*(THICKNESS/2+.075),w-.025,.035,.19);
   }
  }
  return solid;
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
 // Leave the dressed sandstone visible. The continuous low skirting and
 // stone cornice already finish each solid wall segment without box panels.
 // Pier rhythm, recessed paneling and stone arch jambs are non-colliding.
 for(const h of holes){
  const r=h.width/2;
  for(const face of [-1,1]){
   const pts=[];
   for(let i=0;i<=30;i++){
    const a=i*Math.PI/30;
    pts.push(new THREE.Vector3(h.at+r*Math.cos(a),
     h.shoulder+h.rise*Math.sin(a),face*(THICKNESS/2+.04)));
   }
   tube(wallGroup,pts,trim,.10);
   for(const side of [-1,1]){
    const u=h.at+side*(r+.14);
    if(Math.abs(u)>=width/2-.1)continue;
    box(wallGroup,M.quoinStone,u,h.shoulder*.49,
     face*(THICKNESS/2+.09),.21,h.shoulder-.08,.22);
    box(wallGroup,trim,u,h.shoulder+.1,
     face*(THICKNESS/2+.1),.35,.16,.35);
   }
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
    lightPool:false,inside:dir==='n'?1:dir==='s'?-1:dir==='w'?-1:1
   });
   // Baked pools follow the existing stained-glass apertures, never guessed positions.
   glass.userData.museumDaylight={
    roomId:room.id,side:dir,axis:vertical?'x':'z',
    width:h.width,bottom:h.bottom,shoulder:h.shoulder
   };
   windows.push(glass);
  }
 }
 // Cornice is deliberately located above every door, not through it.
 // Both public sides of every shared wall receive identical stone cornices.
 for(const face of [-1,1])
  box(wallGroup,M.quoinStone,0,height-.12,face*(THICKNESS/2+.04),
   width,.18,.19);
}
/**
 * Fill the entire gable above each north/south end wall, rather than leaving
 * triangular holes above a flat wall. Shares identical arch samples with
 * the plaster vault, including its spring-line and apex vertices.
 */
function endGable(room,dir,parent,blockers){
 if(sharedNaveWall(room,dir))return;
 const profile=vaultProfile(room),shape=new THREE.Shape();
 const points=Array.from({length:VAULT_SEGMENTS+1},(_,i)=>
  vaultSample(profile,i,VAULT_SEGMENTS));
 shape.moveTo(-profile.halfSpan,profile.spring-.025);
 shape.lineTo(profile.halfSpan,profile.spring-.025);
 for(let i=VAULT_SEGMENTS;i>=0;i--)
  shape.lineTo(points[i].x-room.x,points[i].y);
 shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:THICKNESS,bevelEnabled:false,steps:1,curveSegments:2
 });
 const uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)/2.35,uv.getY(i)/2.35);
 uv.needsUpdate=true;
 const z=room.z+(dir==='n'?-room.d/2:room.d/2);
 const gable=object(parent,geometry,M.stone,room.x,0,z-THICKNESS/2);
 gable.name=room.id+'-'+dir+'-vault-end';
 gable.userData.gable=true;
 blockers.push(gable);
 // End rib connects the gable to the vault with the same sampled profile.
 const insideZ=z+(dir==='n'?THICKNESS/2:-THICKNESS/2);
 const ribPoints=points.map(p=>new THREE.Vector3(p.x,p.y-.04,insideZ));
 tube(parent,ribPoints,M.quoinStone,.115);
}
/**
 * Single, continuous half-elliptical plaster ceiling, resting directly on the
 * inner faces of the side masonry. All visible ribs use EXACTLY this profile.
 */
function vault(room,parent,blockers){
 const profile=vaultProfile(room),span=profile.halfSpan*2,
  depth=profile.halfDepth*2;
 const strips=VAULT_SEGMENTS,rows=Math.max(12,Math.ceil(depth/1.6));
 const positions=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++){
  const z=room.z-profile.halfDepth+depth*j/rows;
  for(let i=0;i<=strips;i++){
   const point=vaultSample(profile,i,strips);
   positions.push(point.x,point.y,z);
   uv.push((i/strips)*span/2.75,(j/rows)*depth/2.75);
   if(j<rows&&i<strips){
    const n=j*(strips+1)+i;
    indices.push(n,n+1,n+strips+1,n+1,n+strips+2,n+strips+1);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const roof=object(parent,geometry,M.vault);
 roof.name=room.id+'-continuous-vault';
 roof.userData.vaultProfile=profile.roomId;
 blockers.push(roof);
 for(const z of ribStations(room)){
  const points=[];
  for(let i=0;i<=VAULT_SEGMENTS;i++){
   const p=vaultSample(profile,i);
   points.push(new THREE.Vector3(p.x,p.y-.04,z));
  }
  tube(parent,points,M.quoinStone,.145);
 }
 // A thin, continuous stone apex stringer visually ties the repeated ribs.
 const ridge=[];
 for(let j=0;j<=rows;j++)
  ridge.push(new THREE.Vector3(room.x,profile.apex-.045,
   room.z-profile.halfDepth+depth*j/rows));
 tube(parent,ridge,M.quoinStone,.06);
}
/**
 * Consistent stone shaft and capital, fully joined to the vaulted rib at the
 * spring line. The column center is inset so its capital intersects the wall.
 */
function column(parent,room,side,z,blockers){
 const profile=vaultProfile(room),x=columnX(room,side),spring=profile.spring;
 const base=cylinder(parent,M.plinth,x,.29,z,.54,.58,20);
 const shaftHeight=spring-.89;
 const shaft=cylinder(parent,M.columnStone,x,.57+shaftHeight/2,z,.33,
  shaftHeight,20);
 const neck=cylinder(parent,M.quoinStone,x,spring-.22,z,.45,.24,20);
 const capital=cylinder(parent,M.quoinStone,x,spring-.055,z,.6,.24,20);
 // The rib starts exactly at y=spring on the wall face. This capital extends
 // across that point, so the column never ends in open air.
 capital.userData.supportsVault=room.id;
 // Camera, unlike walkable pathfinding, needs a real geometric pillar blocker.
 blockers.push(shaft);
 return {x,z,top:spring+.065};
}
/**
 * Connect the only exposed inter-room corridor (vestibule to records library).
 * No freestanding floor has an open sky above it. Walls sit outside the
 * passage's collision footprint to avoid reintroducing invisible obstructions.
 */
function corridorShell(parent,sections,blockers){
 for(const rect of sections){
  if(rect.w<1.5||rect.d<1.5)continue;
  const alongX=rect.w<rect.d;
  const wallTop=6.45,thickness=.42,margin=.7;
  if(alongX){
   for(const side of [-1,1]){
    const wallZ=rect.z+side*(rect.d/2+margin);
    masonry(parent,M.stone,rect.x,wallTop/2,wallZ,
     rect.w+.24,wallTop,thickness,blockers);
    box(parent,M.quoinStone,rect.x,wallTop-.13,wallZ,
     rect.w+.32,.23,.62);
   }
  }else{
   for(const side of [-1,1]){
    const wallX=rect.x+side*(rect.w/2+margin);
    masonry(parent,M.stone,wallX,wallTop/2,rect.z,
     thickness,wallTop,rect.d+.24,blockers);
   }
  }
  const roofWidth=rect.w+1.0,roofDepth=rect.d+1.0;
  const roofGeo=scaleBoxUV(new THREE.BoxGeometry(roofWidth,.24,roofDepth),
   roofWidth,.24,roofDepth,2.75);
  const roof=object(parent,roofGeo,M.vault,rect.x,wallTop+.12,rect.z);
  blockers.push(roof);
 }
}
function floorMesh(parent,x,z,w,d,material){
 // Per-section tile offsets break cross-room repetition without changing the
 // existing floor's PBR maps, finish, or physical scale.
 const key=Math.abs(Math.sin(x*12.9898+z*78.233)*43758.5453)%1;
 const plane=object(parent,new THREE.PlaneGeometry(w,d),
  createTiledMaterial(material,w/5,d/5,key),x,0,z);
 plane.rotation.x=-Math.PI/2;
 plane.userData.walkable=true;
 return plane;
}
function cornerMasonry(parent){
 // Beveled, interlocking corner quoins with visible mortar gaps. Only visual
 // architecture: physics remains the stable, undisplaced wall outline.
 const corners=new Map();
 for(const room of rooms){
  for(const dx of [-1,1])for(const dz of [-1,1]){
   const x=room.x+dx*room.w/2,z=room.z+dz*room.d/2;
   const key=x.toFixed(3)+','+z.toFixed(3);
   corners.set(key,{x,z,height:Math.max(corners.get(key)?.height||0,room.height)});
  }
 }
 const blocks=[];
 for(const corner of corners.values()){
  for(let y=.52;y<corner.height-.42;y+=.94)
   blocks.push({x:corner.x,z:corner.z,y});
 }
 const geometry=new RoundedBoxGeometry(.75,.82,.75,3,.045);
 const mesh=new THREE.InstancedMesh(geometry,M.quoinStone,blocks.length);
 const transform=new THREE.Object3D();
 for(let i=0;i<blocks.length;i++){
  const block=blocks[i];transform.position.set(block.x,block.y,block.z);
  const variant=Math.sin(block.x*7.3+block.z*2.1+i*17.17);
  const polish=surfacePolishEnabled();
  const secondary=Math.sin(block.x*11.2-block.z*3.8+i*23.7);
  transform.scale.set(1+(variant>0?.1:0),polish?1+secondary*.018:1,1+(variant<0?.1:0));
  transform.rotation.set(polish?secondary*.012:0,polish?variant*.028:0,polish?variant*.009:0);
  transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  // Quoins use subtle individual limestone tones; no two blocks are exact
  // copies even though their geometry and texture remain shared.
  const tone=.90+.17*(.5+.5*Math.sin(block.x*1.3+block.z*2.7+i*8.23));
  const color=new THREE.Color(0xffffff).multiplyScalar(tone);
  if(polish){color.r*=1+.025*secondary;color.b*=1-.04*secondary;}
  mesh.setColorAt(i,color);
 }
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 mesh.receiveShadow=true;mesh.castShadow=false;
 parent.add(mesh);
 return {uniqueCorners:corners.size,quoinBlocks:blocks.length};
}
export function buildArchitecture(scene){
 const group=new THREE.Group();scene.add(group);
 // Corridor floor meshes are clipped to avoid z-fighting, but their ORIGINAL
 // footprints must remain in navigation. Otherwise the walkability margin on
 // each room floor creates an invisible barrier through every archway.
 const floors=[],floorRects=[...HALLWAYS],cameraBlockers=[],windows=[];
 const ground=object(group,new THREE.PlaneGeometry(145,156),
  new THREE.MeshStandardMaterial({color:0x30363a,roughness:1}),0,-.48,0);
 ground.rotation.x=-Math.PI/2;
 const addFloor=(x,z,w,d,material)=>{
  const f=floorMesh(group,x,z,w,d,material);
  floors.push(f);floorRects.push({x,z,w,d});
 };
 // Subtract room footprints and previously placed corridor pieces from each
 // hallway. This removes coplanar planes (z-fighting), not merely hiding it
 // with arbitrary Y offsets. Navigation still uses the same building footprint.
 const corridorSections=visibleCorridorSections(rooms,HALLWAYS);
 for(const r of corridorSections)addFloor(r.x,r.z,r.w,r.d,M.corridor);
 for(const room of rooms){
  const tile=room.id==='archive'?M.corridor:M.floor;
  addFloor(room.x,room.z,room.w,room.d,tile);
  for(const dir of ['n','s','e','w'])wall(room,dir,group,cameraBlockers,windows);
  // The lower wall, gable stone and ceiling now meet at the same spring line.
  for(const dir of ['n','s'])endGable(room,dir,group,cameraBlockers);
  vault(room,group,cameraBlockers);
  for(const z of ribStations(room))
   for(const side of [-1,1])column(group,room,side,z,cameraBlockers);
 }
 corridorShell(group,corridorSections,cameraBlockers);
 // Interlocking stone quoins soften square architectural intersections while
 // keeping the original door aperture meshes and collision system untouched.
 cornerMasonry(group);
 // A real wide aisle connects the southern entry to the federal apse.
 box(group,M.rug,0,.018,0,4.6,.035,54);
 for(const x of [-2.22,2.22])box(group,trim,x,.041,0,.05,.012,53.6);
 return {group,floors,floorRects,cameraBlockers,windows};
}

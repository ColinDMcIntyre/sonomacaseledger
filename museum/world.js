import * as THREE from 'three';

/*
 * Reusable architectural + exhibit factory.
 * Every wing uses the same dimensions, materials, decor and interactive components.
 * A gallery can be added by appending one ROOM_DEFS entry and assigning exhibits to it.
 */
export const ROOM_DEFS = [
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
 {x:0,z:-16.5,w:7,d:15},{x:0,z:16.5,w:7,d:15},
 {x:-29,z:-13.5,w:6,d:12},{x:29,z:-13.5,w:6,d:12}
];
const M={};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function material(color,metalness=0,roughness=.78,more={}){return new THREE.MeshStandardMaterial({color,metalness,roughness,...more});}
M.stone=material(0xc0b29c);M.darkStone=material(0x87796b);M.edge=material(0xc4a779,.6,.3);
M.floor=material(0x555b58,.15,.71);M.corridor=material(0x626660,.12,.7);M.wood=material(0x48362d,.06,.73);
M.woodHighlight=material(0x74503b,.1,.56);M.brass=material(0xc2a168,.78,.25);M.glass=material(0x7ec5bb,.55,.15,{transparent:true,opacity:.72});
M.aqua=material(0x70ecd0,.2,.4,{emissive:0x20635b,emissiveIntensity:.55});
M.light=new THREE.MeshBasicMaterial({color:0xd8bd87});M.page=material(0xe6dac5,.03,.9);M.ink=material(0x20343c,.02,.6);

function mesh(geo,mat,x,y,z,parent,shadow=true){
 const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=shadow;parent.add(o);return o;
}
function block(parent,mat,x,y,z,w,h,d,shadow=true){
 const o=mesh(boxGeo,mat,x,y,z,parent,shadow);o.scale.set(w,h,d);return o;
}
function round(parent,mat,x,y,z,rad,height,segments=12){
 return mesh(new THREE.CylinderGeometry(rad,rad,height,segments),mat,x,y,z,parent);
}
function makeText(str,w=3.8,h=.65,fg='#eddec1',bg='#253f42'){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=144;
 const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,144);
 ctx.fillStyle=fg;ctx.font='bold 43px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
 let words=String(str).split(' '),lines=[''];
 for(const word of words){const n=(lines[lines.length-1]+' '+word).trim();if(ctx.measureText(n).width>690&&lines[lines.length-1])lines.push(word);else lines[lines.length-1]=n;}
 ctx.font='bold '+(lines.length>2?28:lines.length===2?37:43)+'px Georgia, serif';
 const gap=lines.length===1?0:42;const start=72-(lines.length-1)*gap/2;
 lines.slice(0,3).forEach((line,i)=>ctx.fillText(line,384,start+i*gap,704));
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.MeshBasicMaterial({map:tex,transparent:false,side:THREE.DoubleSide});
 return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);
}

export function makeMuseum(scene){
 const group=new THREE.Group();scene.add(group);
 const rooms={};const floors=[];const floorRects=[];const obstacles=[];const interactives=[];const effects=[];
 const roomMats=new Map();
 const floorTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#5b625e';x.fillRect(0,0,256,256);x.strokeStyle='#a3a18c';x.lineWidth=2;for(let k=0;k<=4;k++){let p=k*64;x.beginPath();x.moveTo(p,0);x.lineTo(p,256);x.moveTo(0,p);x.lineTo(256,p);x.stroke()}for(let i=0;i<220;i++){x.fillStyle='rgba(245,239,212,'+(Math.random()*.14)+')';x.fillRect(Math.random()*256,Math.random()*256,Math.random()*3+1,Math.random()*3+1)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;})();
 function floor(x,z,w,d,wing=false){
  let mat=wing?M.floor:M.corridor;
  if(wing){mat=M.floor.clone();mat.map=floorTexture.clone();mat.map.needsUpdate=true;mat.map.repeat.set(w/6,d/6);mat.color.set(0xe5e1d9);}
  const o=block(group,mat,x,-.24,z,w,.42,d,false);o.receiveShadow=true;o.userData.walkable=true;floors.push(o);floorRects.push({x,z,w,d});
  block(group,M.edge,x,-.04,z-d/2,w,.07,.13,false);
  block(group,M.edge,x,-.04,z+d/2,w,.07,.13,false);
  block(group,M.edge,x-w/2,-.04,z,.13,.07,d,false);
  block(group,M.edge,x+w/2,-.04,z,.13,.07,d,false);
 }
 function wallSegment(room,dir,offset,length,height){
  const {x,z,w,d}=room;
  if(dir==='n'||dir==='s'){
   const zz=z+(dir==='n'?-d/2:d/2),xx=x+offset;
   block(group,dir==='s'?M.darkStone:M.stone,xx,height/2,zz,length,height,.4);
   block(group,M.brass,xx,height+.05,zz,length+.04,.1,.54);
   if(dir==='n')block(group,M.wood,xx,.56,zz+.23,length,1.1,.13);
  }else{
   const xx=x+(dir==='w'?-w/2:w/2),zz=z+offset;
   block(group,dir==='e'?M.darkStone:M.stone,xx,height/2,zz,.4,height,length);
   block(group,M.brass,xx,height+.05,zz,.54,.1,length+.04);
   if(dir==='w')block(group,M.wood,xx+.23,.56,zz,.13,1.1,length);
  }
 }
 function doorway(room,dir){
  const {x,z,w,d}=room;
  const px=x+(dir==='w'?-w/2:dir==='e'?w/2:0);
  const pz=z+(dir==='n'?-d/2:dir==='s'?d/2:0);
  const alongX=(dir==='n'||dir==='s');
  for(const k of [-1,1]){
   const a=alongX?px+k*3:pz+k*3;
   const pole=alongX?{x:a,z:pz}:{x:px,z:a};
   round(group,M.stone,pole.x,1.6,pole.z,.25,3.2,9);
   round(group,M.brass,pole.x,3.22,pole.z,.33,.18,9);
  }
  if(alongX)block(group,M.stone,px,3.35,pz,6.4,.43,.64);
  else block(group,M.stone,px,3.35,pz,.64,.43,6.4);
 }
 function buildWall(room,dir){
  const len=(dir==='n'||dir==='s')?room.w:room.d;
  const height=(dir==='s'||dir==='e')?1.08:3.7;
  if(room.doors.includes(dir)){
   const side=(len-6)/2;
   wallSegment(room,dir,-(6+side)/2,side,height);
   wallSegment(room,dir,(6+side)/2,side,height);
   doorway(room,dir);
  }else wallSegment(room,dir,0,len,height);
 }
 function column(x,z){
  round(group,M.stone,x,1.8,z,.4,3.6,12);
  round(group,M.brass,x,.2,z,.53,.21,12);
  round(group,M.brass,x,3.5,z,.53,.23,12);
  block(group,M.darkStone,x,3.75,z,1.05,.22,1.05);
 }
 for(const h of HALLWAYS)floor(h.x,h.z,h.w,h.d,false);
 for(const room of ROOM_DEFS){
  rooms[room.id]=room;
  floor(room.x,room.z,room.w,room.d,true);
  for(const dir of ['n','s','e','w'])buildWall(room,dir);
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const cx=room.x+sx*(room.w/2-1),cz=room.z+sz*(room.d/2-1);
   if(Math.abs(cx)>10||Math.abs(cz)>10)column(cx,cz);
  }
  let sign=makeText(room.name,Math.min(room.w-2,8),.95);
  sign.position.set(room.x,3.95,room.z-room.d/2+1.2);sign.rotation.x=-Math.PI/3.7;group.add(sign);
  if(room.role==='cases'){for(let k of [-1,1]){
   const lx=room.x+k*(room.w/2-2),lz=room.z+room.d/2-1.2;
   round(group,M.wood,lx,1.6,lz,.37,3.2,7);
   round(group,M.light,lx,3.2,lz,.28,.35,10);
   const light=new THREE.PointLight(0xffdfad,.7,6,2);light.position.set(lx,3.05,lz);group.add(light);
  }}
 }
 function register(object,record,rad=.98){
  const hit=mesh(new THREE.CylinderGeometry(rad,rad,2.1,12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}),0,1.12,0,object,false);
  hit.userData.action=record;interactives.push(hit);hit.castShadow=false;hit.receiveShadow=false;
  obstacles.push({x:object.position.x,z:object.position.z,r:rad*.88});
 }
 function addExhibit(roomId,localX,localZ,record,type='case'){
  const room=rooms[roomId];if(!room)throw new Error('Unknown room '+roomId);
  const g=new THREE.Group();g.position.set(room.x+localX,0,room.z+localZ);group.add(g);
  const accent=material(room.color,.28,.37);
  const lower=type==='portal'?1.05:type==='directory'?1.2:.92;
  const base=round(g,M.wood,0,.2,0,lower,.4,8);
  round(g,M.brass,0,.44,0,lower+.035,.12,8);
  round(g,accent,0,.78,0,lower*.88,.55,8);
  round(g,M.brass,0,1.08,0,lower*.9,.1,8);
  let symbol;
  if(type==='directory'){
   symbol=mesh(new THREE.IcosahedronGeometry(.66,1),M.glass,0,2.06,0,g,false);
   round(g,M.brass,0,1.25,0,.65,.12,12);
  }else if(type==='portal'){
   symbol=mesh(new THREE.TorusGeometry(.72,.09,9,28),M.brass,0,2.12,0,g,false);symbol.rotation.x=.25;
   round(g,M.aqua,0,2.08,0,.22,.5,10);
  }else if(type==='archive'){
   symbol=block(g,M.woodHighlight,0,1.57,0,1.4,.87,1.04);
   block(g,M.brass,0,1.6,.54,1.2,.12,.03);
   block(g,M.page,0,1.91,.55,.8,.37,.04,false);
  }else if(type==='timeline'){
   symbol=mesh(new THREE.TorusGeometry(.67,.05,6,30),M.aqua,0,2.05,0,g,false);
   const shaft=block(g,M.brass,0,2.04,0,.13,1.18,.13);
  }else if(type==='plaque'){
   symbol=block(g,M.woodHighlight,0,1.62,0,1.45,.95,.4);
   block(g,M.page,0,1.65,.24,1.23,.65,.06);
  }else{
   symbol=block(g,M.page,0,1.81,0,.92,1.15,.08,false);
   symbol.rotation.y=.15;
   const strip=block(g,M.brass,0,1.49,.07,.6,.06,.1,false);
   for(let n=0;n<4;n++)block(g,M.ink,0,1.72+n*.16,.077,.65,.032,.012,false);
  }
  const ring=mesh(new THREE.TorusGeometry(1,.026,6,35),M.aqua,0,.48,0,g,false);ring.rotation.x=Math.PI/2;
  effects.push({g,ring,symbol,type,seed:effects.length*1.38});
  const label=makeText(record.name||record.title||'Explore',2.75,.52,'#f5e7c8','#26373c');
  label.position.set(0,1.21,1.01);label.rotation.x=-Math.PI/4.6;g.add(label);
  register(g,{...record,roomId,type},type==='directory'?1.25:1);
  return g;
 }
 function addCarpet(roomId){
  const room=rooms[roomId],rug=block(group,material(0x713f3b,0,.9),room.x,-.008,room.z,4.4,.026,8.2,false);
  block(group,M.brass,room.x,.013,room.z-3.88,4.1,.018,.07,false);
  block(group,M.brass,room.x,.013,room.z+3.88,4.1,.018,.07,false);
 }
 addCarpet('rotunda');addCarpet('archive');
 // A sculptural clock in the rotunda, deliberately not a person or case-specific imagery.
 const center=new THREE.Group();center.position.set(0,0,-2.8);group.add(center);
 obstacles.push({x:0,z:-2.8,r:1.6});
 round(center,M.wood,0,.13,0,1.5,.26,16);round(center,M.brass,0,.37,0,1.2,.27,16);
 const orb=mesh(new THREE.IcosahedronGeometry(.87,2),M.glass,0,2.05,0,center,false);
 const outer=mesh(new THREE.TorusGeometry(1.38,.065,9,56),M.brass,0,2.05,0,center,false);outer.rotation.y=.35;
 const inner=mesh(new THREE.TorusGeometry(1.12,.038,7,54),M.aqua,0,2.05,0,center,false);inner.rotation.x=.7;
 effects.push({g:center,ring:outer,symbol:orb,type:'sculpture',seed:1.4,extra:inner});
 const emblem=makeText('THE RECORD CONTINUES',6,.8);emblem.position.set(0,4.55,-6);emblem.rotation.x=-.08;group.add(emblem);
 function isFloor(x,z){return floorRects.some(r=>Math.abs(x-r.x)<=r.w/2-.27&&Math.abs(z-r.z)<=r.d/2-.27);}
 function walkable(x,z){
  if(!isFloor(x,z))return false;
  return !obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.53);
 }
 function nearestWalkable(x,z){
  if(walkable(x,z))return new THREE.Vector3(x,0,z);
  for(let radius=.65;radius<=6;radius+=.55)for(let t=0;t<24;t++){
   const a=t*Math.PI/12,xx=x+Math.cos(a)*radius,zz=z+Math.sin(a)*radius;
   if(walkable(xx,zz))return new THREE.Vector3(xx,0,zz);
  }
  return null;
 }
 function roomAt(x,z){
  const active=ROOM_DEFS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2);
  return active||rooms.rotunda;
 }
 function update(t,dt,animated=true){
  if(!animated)return;
  for(const e of effects){
   if(e.symbol){
    if(e.type==='directory'||e.type==='sculpture')e.symbol.rotation.y+=dt*.28;
    if(e.type==='timeline'||e.type==='portal')e.symbol.rotation.z+=dt*.28;
    if(e.type==='case')e.symbol.position.y=1.81+Math.sin(t*1.4+e.seed)*.035;
   }
   if(e.ring)e.ring.rotation.z+=(e.type==='sculpture'?.07:.2)*dt;
   if(e.extra)e.extra.rotation.y+=dt*.18;
  }
 }
 return {group,rooms,floors,interactives,obstacles,walkable,nearestWalkable,roomAt,addExhibit,update};
}

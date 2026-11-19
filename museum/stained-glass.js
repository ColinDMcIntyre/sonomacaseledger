import * as THREE from 'three';

/*
 * Bespoke secular stained glass. Canvas-based colored glazing and actual arched
 * silhouette; never a painted rectangle on a solid wall.
 */
const metal=new THREE.MeshStandardMaterial({color:0x343a38,metalness:.68,roughness:.44});
const trim=new THREE.MeshStandardMaterial({color:0xb7a28a,metalness:.08,roughness:.79});
const palette=['#658d9b','#9bbaaf','#b89d68','#b97b63','#6f8b83','#b2a888','#6c7596','#bda477'];
const seeded=(n)=>{let v=n>>>0;return()=>((v=(v*1664525+1013904223)>>>0)/4294967296);};
function design(seed){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=896;
 const c=canvas.getContext('2d'),r=seeded(seed);
 const gradient=c.createLinearGradient(0,0,512,896);
 gradient.addColorStop(0,'#c6b389');gradient.addColorStop(.45,'#67899b');gradient.addColorStop(1,'#be9a78');
 c.fillStyle=gradient;c.fillRect(0,0,512,896);
 // Repeated tracery with translucent individual panels and lead cames.
 for(let row=0;row<11;row++)for(let col=0;col<5;col++){
  const x=col*102+(row%2)*21-18,y=row*88-5,w=112,h=107;
  c.globalAlpha=.78+r()*.13;c.fillStyle=palette[Math.floor(r()*palette.length)];
  c.beginPath();c.moveTo(x+9,y+8);c.lineTo(x+w-10,y+5);
  c.lineTo(x+w-8,y+h-10);c.lineTo(x+12,y+h-9);c.closePath();c.fill();
  c.globalAlpha=1;c.strokeStyle='#323937';c.lineWidth=8;c.stroke();
  c.strokeStyle='rgba(255,247,219,.29)';c.lineWidth=2;
  c.beginPath();c.moveTo(x+16,y+18);c.lineTo(x+17,y+h-19);c.stroke();
 }
 // A rose motif at the head of each window.
 const cx=256,cy=183;
 c.beginPath();c.arc(cx,cy,124,0,Math.PI*2);c.fillStyle='#333d3d';c.fill();
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5;
  c.beginPath();c.ellipse(cx+62*Math.cos(a),cy+62*Math.sin(a),28,54,a,0,Math.PI*2);
  c.fillStyle=palette[(i+seed)%palette.length];c.fill();
  c.strokeStyle='#292f2e';c.lineWidth=8;c.stroke();
 }
 c.beginPath();c.arc(cx,cy,36,0,Math.PI*2);c.fillStyle='#c8af7d';c.fill();
 c.strokeStyle='#2b302f';c.lineWidth=9;c.stroke();
 // Faint faceted highlights as opposed to glowing neon.
 for(let i=0;i<75;i++){
  c.fillStyle='rgba(255,255,235,.10)';
  c.beginPath();const x=r()*512,y=r()*896;c.moveTo(x,y);c.lineTo(x+7+r()*18,y-10);c.lineTo(x+12,y+9);c.fill();
 }
 const t=new THREE.CanvasTexture(canvas);
 t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
 return t;
}
const designs=new Map();
function materialFor(seed){
 const id=seed%7;
 if(!designs.has(id)){
  const t=design(id+42);
  designs.set(id,new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.94,side:THREE.DoubleSide,depthWrite:false,toneMapped:true}));
 }
 return designs.get(id);
}
function archShape(width,bottom,shoulder,arcRise){
 const shape=new THREE.Shape();const r=width/2;
 shape.moveTo(-r,bottom);shape.lineTo(r,bottom);shape.lineTo(r,shoulder);
 for(let i=0;i<=22;i++){
  const a=i*Math.PI/22;
  shape.lineTo(r*Math.cos(a),shoulder+arcRise*Math.sin(a));
 }
 shape.lineTo(-r,shoulder);shape.lineTo(-r,bottom);
 return shape;
}
function archPoints(width,bottom,shoulder,arcRise){
 const r=width/2,pts=[
  new THREE.Vector3(-r,bottom,0),new THREE.Vector3(r,bottom,0),
  new THREE.Vector3(r,shoulder,0)
 ];
 for(let i=0;i<=22;i++){
  const a=i*Math.PI/22;
  pts.push(new THREE.Vector3(r*Math.cos(a),shoulder+arcRise*Math.sin(a),0));
 }
 pts.push(new THREE.Vector3(-r,bottom,0));
 return pts;
}
function line(parent,a,b,radius=.035,mat=metal){
 const delta=b.clone().sub(a);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),mat);
 m.position.copy(a).add(b).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 parent.add(m);
}
const glowMaterials=['#d7b777','#93c0c0','#b7a6d0'].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide}));
export function createStainedWindow(parent,{x,z,axis='z',width=2.1,bottom=4.1,shoulder=7.0,rise=1.05,seed=1,lightPool=true,inside=1}){
 const g=new THREE.Group();g.position.set(x,0,z);
 if(axis==='x')g.rotation.y=-Math.PI/2;
 parent.add(g);
 const outline=archShape(width,bottom,shoulder,rise);
 const geometry=new THREE.ShapeGeometry(outline,20);
 // ShapeGeometry generates global UVs; normalize to entire window texture.
 const uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,(uv.getX(i)+width/2)/width,(uv.getY(i)-bottom)/(shoulder+rise-bottom));
 uv.needsUpdate=true;
 const glass=new THREE.Mesh(geometry,materialFor(seed));
 glass.position.z=.048;glass.renderOrder=1;g.add(glass);
 const border=new THREE.Line(new THREE.BufferGeometry().setFromPoints(archPoints(width,bottom,shoulder,rise)),
  new THREE.LineBasicMaterial({color:0x4a4740}));
 border.position.z=.077;g.add(border);
 const pts=archPoints(width,bottom,shoulder,rise);
 for(let i=0;i<pts.length-1;i++)line(g,pts[i],pts[i+1],.063,metal);
 const mid=shoulder;
 line(g,new THREE.Vector3(0,bottom,0),new THREE.Vector3(0,shoulder+rise*.75,0),.049);
 for(let y=bottom+.65;y<shoulder;y+=.68)
  line(g,new THREE.Vector3(-width/2,y,0),new THREE.Vector3(width/2,y,0),.022);
 // Soft, semitransparent colored daylight reflection near the window.
 // It is an intentionally approximate floor pattern, not physically traced rays.
 if(lightPool){
  const count=3,span=.7;
  for(let i=0;i<count;i++){
   const patch=new THREE.Mesh(new THREE.PlaneGeometry(.62,2.8),glowMaterials[(seed+i)%3]);
   patch.rotation.x=-Math.PI/2;
   patch.position.set((i-1)*span,.025,inside*2.3);
   g.add(patch);
  }
 }
 return g;
}

import * as THREE from 'three';

/*
 * Restrained, physically-based cathedral materials.
 * Poly Haven 1K base-color, OpenGL normal, and roughness maps are imported
 * by the build workflow or loaded from the official static CDN.
 * Procedural neutral materials render immediately if a map is unavailable.
 */
const rand=s=>{let v=s>>>0;return()=>((v=(v*1664525+1013904223)>>>0)/4294967296)};
function sample(draw,seed){
 const c=document.createElement('canvas');c.width=c.height=512;
 draw(c.getContext('2d'),512,rand(seed));
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
function plaster(c,n,r){
 c.fillStyle='#e8dfd2';c.fillRect(0,0,n,n);
 for(let i=0;i<800;i++){
  const color=r()>.6?'rgba(123,107,87,.035)':'rgba(255,255,255,.06)';
  c.fillStyle=color;c.fillRect(r()*n,r()*n,1+r()*5,1+r()*5);
 }
}
function floor(c,n,r){
 c.fillStyle='#ece7db';c.fillRect(0,0,n,n);
 c.strokeStyle='rgba(132,120,106,.16)';c.lineWidth=2;
 for(const p of [0,256,511]){
  c.beginPath();c.moveTo(p,0);c.lineTo(p,n);c.moveTo(0,p);c.lineTo(n,p);c.stroke();
 }
 for(let i=0;i<16;i++){
  c.strokeStyle='rgba(148,144,131,.065)';c.lineWidth=.65;
  c.beginPath();const x=r()*n,y=r()*n;
  c.moveTo(x,y);c.bezierCurveTo(x+90,y-18,x+160,y+45,x+230,y+12);c.stroke();
 }
}
function grain(c,n,r){
 c.fillStyle='#6f4933';c.fillRect(0,0,n,n);
 for(let k=0;k<9;k++){
  const x=k*n/9;
  c.fillStyle=k%2?'#71503b':'#75523b';c.fillRect(x+1,0,n/9-2,n);
  for(let j=0;j<65;j++){
   const px=x+5+r()*(n/9-10),y=r()*n;
   c.strokeStyle=r()>.5?'rgba(33,18,9,.15)':'rgba(236,180,118,.12)';
   c.lineWidth=.6;c.beginPath();c.moveTo(px,y);
   c.bezierCurveTo(px+2,y+12,px-3,y+32,px+1,y+50);c.stroke();
  }
 }
}
function weave(c,n){
 c.fillStyle='#573e3c';c.fillRect(0,0,n,n);
 c.strokeStyle='rgba(206,169,120,.25)';c.lineWidth=8;c.strokeRect(19,19,n-38,n-38);
 c.strokeStyle='rgba(215,176,135,.14)';c.lineWidth=3;c.strokeRect(39,39,n-78,n-78);
}
const plasterMap=sample(plaster,130),floorMap=sample(floor,240),woodMap=sample(grain,40),rugMap=sample(weave,8);
export function mat(color,metalness=0,roughness=.7,extra={}){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:.7,...extra});
}
function base(kind,material){material.userData.kind=kind;return material;}
export const M={
 stone:base('stone',mat(0xffffff,0,.83,{map:plasterMap})),
 darkStone:base('stone',mat(0xd9cbb8,0,.85,{map:plasterMap})),
 edge:mat(0xbfa98b,.16,.63),
 floor:base('floor',mat(0xffffff,0,.42,{map:floorMap,clearcoat:.13,clearcoatRoughness:.48})),
 corridor:base('floor',mat(0xe9e3d6,0,.62,{map:floorMap})),
 wood:base('wood',mat(0xffffff,0,.54,{map:woodMap})),
 woodHighlight:base('wood',mat(0xd9b698,0,.47,{map:woodMap})),
 brass:mat(0xbf9e62,.75,.29),
 glass:mat(0xcadfda,.08,.17,{transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}),
 aqua:mat(0x9ab9b1,.13,.37),
 light:new THREE.MeshStandardMaterial({color:0xffecbd,emissive:0xffcd8d,emissiveIntensity:1.2}),
 page:mat(0xf9f0e0,0,.86),
 ink:mat(0x354246,0,.92),
 rug:mat(0xffffff,0,.95,{map:rugMap}),
 vault:base('vault',mat(0xffffff,0,.89,{map:plasterMap,side:THREE.DoubleSide})),
 beam:mat(0xb4a089,.21,.61),
 blackMetal:mat(0x3b4140,.62,.43),
 plinth:base('stone',mat(0xf7f0e4,0,.55,{map:plasterMap})),
 velvet:mat(0x37524d,0,.94)
};
const allMaterials=Object.values(M).filter(m=>m?.isMaterial);
const instances=[];
function repeatTexture(t,x,y){
 const c=t.clone();c.wrapS=c.wrapT=THREE.RepeatWrapping;
 c.repeat.set(Math.max(.1,x),Math.max(.1,y));c.anisotropy=4;c.needsUpdate=true;return c;
}
export function createTiledMaterial(material,x=1,y=1){
 const out=material.clone();out.userData.kind=material.userData.kind;
 out.userData.repeat=[x,y];
 for(const prop of ['map','normalMap','roughnessMap','aoMap'])
  if(material[prop])out[prop]=repeatTexture(material[prop],x,y);
 instances.push(out);
 return out;
}
function assign(material,name,texture){
 const reps=material.userData.repeat||[1,1];
 if(name==='map')texture.colorSpace=THREE.SRGBColorSpace;
 material[name]=repeatTexture(texture,reps[0],reps[1]);
 material.needsUpdate=true;
}
async function readManifest(){
 try{
  const r=await fetch('./assets/cathedral/materials.json',{cache:'no-store'});
  return r.ok?await r.json():{};
 }catch{return{};}
}
const textureSets={
 stone:'beige_wall_001',
 floor:'tiled_floor_001',
 wood:'walnut_veneer',
 vault:'white_plaster_02'
};
export async function loadCathedralMaterials(onStatus=()=>{}){
 const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
 const manifest=await readManifest(),result={materials:0,maps:0};
 const types=[['map','diff'],['normalMap','nor_gl'],['roughnessMap','rough']];
 const targets=[...allMaterials,...instances];
 await Promise.all(Object.entries(textureSets).map(async ([role,id])=>{
  let success=0;
  for(const [key,suffix] of types){
   const local=manifest[role]?.[key];
   const cdn='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'
    +id+'/'+id+'_'+suffix+'_1k.jpg';
   let texture=null;
   for(const url of [local,cdn].filter(Boolean)){
    try{texture=await loader.loadAsync(url);break;}catch{}
   }
   if(!texture)continue;
   for(const material of targets.filter(m=>m.userData.kind===role))assign(material,key,texture);
   success++;result.maps++;
  }
  if(success)result.materials++;
 }));
 onStatus('Architectural PBR: '+result.materials+'/4 surfaces ('+result.maps+' maps)');
 return result;
}

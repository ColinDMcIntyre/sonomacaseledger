import * as THREE from 'three';

/*
 * Museum's reusable physically based material library.
 * Procedural textures render immediately; optional CC0 Poly Haven material
 * images replace two stone surfaces asynchronously when available.
 * Source: polyhaven.com/a/marble_01 and polyhaven.com/a/marble_tiles.
 */
const BASE='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/';
function rng(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function canvasTexture(draw,seed=1){
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d');draw(ctx,c.width,rng(seed));
 const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=8;return tex;
}
function woodGrain(ctx,n,rand){
 ctx.fillStyle='#765239';ctx.fillRect(0,0,n,n);
 // Individual walnut planks separated by narrow natural join lines.
 for(let i=0;i<8;i++){
  const x=i*n/8;ctx.fillStyle=i%3===0?'#66442e':i%2?'#7c563c':'#725038';
  ctx.fillRect(x+1,0,n/8-2,n);
  ctx.strokeStyle='rgba(27,16,10,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,n);ctx.stroke();
  for(let y=0;y<n;y+=2){
   const offset=Math.sin(y*.012+i*2)*3+Math.sin(y*.043+i)*1.6;
   ctx.strokeStyle=rand()>.43?'rgba(38,21,12,.17)':'rgba(219,168,112,.13)';
   ctx.lineWidth=rand()*1.15+.3;ctx.beginPath();
   ctx.moveTo(x+6+rand()*(n/8-12)+offset,y);
   ctx.bezierCurveTo(x+5+rand()*(n/8-10)+offset,y+4,x+5+rand()*(n/8-10)+offset,y+7,x+6+rand()*(n/8-10)+offset,y+13);
   ctx.stroke();
  }
 }
 for(let j=0;j<9;j++){
  let x=20+rand()*(n-40),y=rand()*n;const rr=3+rand()*8;
  ctx.strokeStyle='rgba(39,20,8,.19)';
  for(let q=0;q<3;q++){ctx.beginPath();ctx.ellipse(x,y,rr+q*3,rr/2+q*5,rand()*.22,0,Math.PI*2);ctx.stroke();}
 }
}
function stoneGrain(ctx,n,rand){
 ctx.fillStyle='#c1b3a0';ctx.fillRect(0,0,n,n);
 for(let i=0;i<1200;i++){
  const v=rand()>.58?'rgba(91,77,65,.07)':'rgba(242,227,202,.11)';
  ctx.fillStyle=v;const r=rand()*4+.3;ctx.fillRect(rand()*n,rand()*n,r,r);
 }
 for(let k=0;k<23;k++){
  ctx.beginPath();ctx.lineWidth=rand()*1.4+.25;
  ctx.strokeStyle=rand()>.5?'rgba(82,74,65,.16)':'rgba(241,229,208,.24)';
  const x=rand()*n,y=rand()*n;ctx.moveTo(x,y);
  ctx.bezierCurveTo(x+rand()*90-30,y+rand()*80-40,x+rand()*160-50,y+rand()*160-50,x+rand()*230-50,y+rand()*200-60);
  ctx.stroke();
 }
}
function checkeredStone(ctx,n,rand){
 stoneGrain(ctx,n,rand);
 ctx.strokeStyle='rgba(55,46,40,.29)';ctx.lineWidth=4;
 for(let i=0;i<4;i++){
  const p=i*n/4;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,n);ctx.moveTo(0,p);ctx.lineTo(n,p);ctx.stroke();
 }
 for(let i=0;i<180;i++){ctx.fillStyle=rand()>.5?'rgba(55,44,29,.05)':'rgba(255,255,255,.07)';ctx.fillRect(rand()*n,rand()*n,rand()*6+1,rand()*6+1);}
}
function rugPattern(ctx,n,rand){
 ctx.fillStyle='#522d2a';ctx.fillRect(0,0,n,n);
 for(let i=0;i<n;i+=9){ctx.strokeStyle='rgba(191,149,102,.14)';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,n);ctx.stroke();}
 ctx.strokeStyle='#ab8a59';ctx.lineWidth=10;ctx.strokeRect(21,21,n-42,n-42);
 ctx.strokeStyle='#886640';ctx.lineWidth=3;ctx.strokeRect(40,40,n-80,n-80);
 for(let k=0;k<170;k++){ctx.fillStyle=rand()>.5?'rgba(239,211,162,.07)':'rgba(0,0,0,.09)';ctx.fillRect(rand()*n,rand()*n,1+rand()*4,1+rand()*4);}
}
function mat(color,metalness=0,roughness=.65,extra={}){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:.85,...extra});
}
const wood=canvasTexture(woodGrain,7024);
const stone=canvasTexture(stoneGrain,8309);
const tiles=canvasTexture(checkeredStone,1948);
const carpet=canvasTexture(rugPattern,9073);
const M={
 stone:mat(0xf2e6d3,0,.55,{map:stone,bumpMap:stone,bumpScale:.025,clearcoat:.09}),
 darkStone:mat(0xbdb29e,0,.67,{map:stone,bumpMap:stone,bumpScale:.03}),
 edge:mat(0xd6b985,.68,.27,{clearcoat:.18,clearcoatRoughness:.19}),
 floor:mat(0xf8efe4,0,.39,{map:tiles,bumpMap:tiles,bumpScale:.012,clearcoat:.22,clearcoatRoughness:.36}),
 corridor:mat(0xc4b8a8,0,.58,{map:stone,bumpMap:stone,bumpScale:.022}),
 wood:mat(0xc7a17c,0,.46,{map:wood,bumpMap:wood,bumpScale:.035,clearcoat:.25,clearcoatRoughness:.3}),
 woodHighlight:mat(0xe1b98d,0,.36,{map:wood,bumpMap:wood,bumpScale:.028,clearcoat:.36,clearcoatRoughness:.2}),
 brass:mat(0xd8b978,.77,.22,{clearcoat:.2,clearcoatRoughness:.12}),
 glass:mat(0xa9ddd4,0,.11,{transparent:true,opacity:.23,transmission:.21,thickness:.18,ior:1.48,depthWrite:false,side:THREE.DoubleSide}),
 aqua:mat(0x8de6d6,.27,.2,{emissive:0x245b53,emissiveIntensity:.42,clearcoat:.55}),
 light:new THREE.MeshStandardMaterial({color:0xffeed0,emissive:0xffbb72,emissiveIntensity:2.5}),
 page:mat(0xfff2dc,0,.75,{clearcoat:.02}),
 ink:mat(0x243542,0,.7),
 rug:mat(0xf0d2bd,0,.93,{map:carpet})
};
function swapRemote(url,material){
 const loader=new THREE.TextureLoader();
 loader.setCrossOrigin('anonymous');
 loader.load(url,tex=>{
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=8;
  material.map=tex;material.needsUpdate=true;
 },undefined,()=>{/* Keep procedural material if remote source is blocked. */});
}
// Only two verified free CC0 image resources; all other materials are fully local.
swapRemote(BASE+'marble_01/marble_01_diff_1k.jpg',M.stone);
swapRemote(BASE+'marble_tiles/marble_tiles_diff_1k.jpg',M.floor);
export {M,mat};

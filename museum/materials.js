import * as THREE from 'three';

/**
 * Original self-contained PBR art kit. Texture repeat and contrast are deliberately
 * restrained: the previous downloaded tile image produced severe dark speckling.
 * No external texture URL is required for the museum to look correct.
 */
function rand(seed){let v=seed>>>0;return()=>((v=(1664525*v+1013904223)>>>0)/4294967296);}
function texture(draw,seed){
 const c=document.createElement('canvas');c.width=c.height=512;
 draw(c.getContext('2d'),512,rand(seed));
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
 return t;
}
function marble(ctx,n,r){
 ctx.fillStyle='#e9e5dc';ctx.fillRect(0,0,n,n);
 // Soft, elongated veins. No random black patches or high-frequency noise.
 for(let i=0;i<13;i++){
  const x=-40+r()*(n+70),y=r()*n;
  ctx.strokeStyle=i%3===0?'rgba(129,125,113,.13)':'rgba(154,154,147,.065)';
  ctx.lineWidth=.4+r()*1.1;ctx.beginPath();ctx.moveTo(x,y);
  ctx.bezierCurveTo(x+120,y-30+r()*60,x+210,y-58+r()*105,x+310,y-20+r()*55);ctx.stroke();
 }
 for(let i=0;i<500;i++){
  const v=r()>.5?255:135;
  ctx.fillStyle='rgba('+v+','+v+','+v+','+(r()*.022)+')';
  ctx.fillRect(r()*n,r()*n,r()*2+.5,r()*2+.5);
 }
}
function tile(ctx,n,r){
 marble(ctx,n,r);
 ctx.lineWidth=1.1;ctx.strokeStyle='rgba(127,120,111,.16)';
 // 2 x 2 large tiles per texture, subtle joints.
 [0,256,511].forEach(p=>{ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,n);ctx.moveTo(0,p);ctx.lineTo(n,p);ctx.stroke();});
}
function timber(ctx,n,r){
 ctx.fillStyle='#71503a';ctx.fillRect(0,0,n,n);
 for(let k=0;k<6;k++){
  const x=k*n/6;ctx.fillStyle=k%2?'#6d4b35':'#75523c';ctx.fillRect(x+1,0,n/6-2,n);
  ctx.strokeStyle='rgba(36,18,8,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,n);ctx.stroke();
  for(let j=0;j<44;j++){
   ctx.strokeStyle=r()>.6?'rgba(24,13,10,.14)':'rgba(224,173,113,.10)';
   ctx.lineWidth=.4+r()*.7;
   const px=x+5+r()*(n/6-10),y=r()*n;
   ctx.beginPath();ctx.moveTo(px,y);ctx.bezierCurveTo(px+2,y+18,px-3,y+40,px+1,y+67);ctx.stroke();
  }
 }
}
function woven(ctx,n,r){
 ctx.fillStyle='#693d37';ctx.fillRect(0,0,n,n);
 for(let y=0;y<n;y+=6){ctx.strokeStyle='rgba(211,170,114,.07)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(n,y);ctx.stroke();}
 ctx.strokeStyle='#bc985f';ctx.lineWidth=10;ctx.strokeRect(24,24,n-48,n-48);
 ctx.strokeStyle='rgba(218,186,133,.5)';ctx.lineWidth=2;ctx.strokeRect(45,45,n-90,n-90);
}
function roughStone(ctx,n,r){
 ctx.fillStyle='#c8bead';ctx.fillRect(0,0,n,n);
 for(let i=0;i<780;i++){ctx.fillStyle=r()>.5?'rgba(80,64,48,.025)':'rgba(255,255,255,.05)';ctx.fillRect(r()*n,r()*n,r()*3+1,r()*3+1);}
}
const marbleTexture=texture(marble,128),tileTexture=texture(tile,912),woodTexture=texture(timber,13),rugTexture=texture(woven,707),stoneTexture=texture(roughStone,40);
export function mat(color,metalness=0,roughness=.7,opts={}){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:.55,...opts});
}
export const M={
 stone:mat(0xf2ece0,0,.72,{map:stoneTexture,bumpMap:stoneTexture,bumpScale:.007}),
 darkStone:mat(0xafa594,0,.82,{map:stoneTexture}),
 edge:mat(0xd4b785,.6,.31),
 floor:mat(0xffffff,0,.32,{map:tileTexture,roughness:.38,clearcoat:.18,clearcoatRoughness:.4}),
 corridor:mat(0xe5ded2,0,.52,{map:marbleTexture}),
 wood:mat(0xc6a18a,0,.55,{map:woodTexture,bumpMap:woodTexture,bumpScale:.016}),
 woodHighlight:mat(0xe0b594,0,.42,{map:woodTexture,clearcoat:.2}),
 brass:mat(0xd5b574,.72,.3),
 glass:mat(0xc0e0dc,.07,.14,{transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),
 aqua:mat(0x87bfb5,.17,.33,{emissive:0x193e3b,emissiveIntensity:.18}),
 light:new THREE.MeshStandardMaterial({color:0xfff2d9,emissive:0xffcc8a,emissiveIntensity:1.65}),
 page:mat(0xf5efdf,0,.87),
 ink:mat(0x30434a,0,.85),
 rug:mat(0xf6e4db,0,.9,{map:rugTexture}),
 vault:mat(0xe6dccc,0,.79,{side:THREE.DoubleSide}),
 beam:mat(0xb18f67,.36,.43),
 blackMetal:mat(0x384148,.55,.39),
 plinth:mat(0xfff8ed,0,.42,{map:marbleTexture,clearcoat:.13}),
 velvet:mat(0x375452,0,.96)
};

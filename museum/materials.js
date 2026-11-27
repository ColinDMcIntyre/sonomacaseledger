import * as THREE from 'three';

/**
 * Cathedral PBR surfaces. Local Poly Haven assets take precedence.
 * All meter-scaled architecture uses shared maps plus scaled geometry UVs:
 * no duplicate 1K texture uploads per wall block.
 * Floor/corridor settings are intentionally retained from the approved build.
 */
const rand=s=>{let v=s>>>0;return()=>((v=(v*1664525+1013904223)>>>0)/4294967296)};
function sample(draw,seed,size=512,color=true){
 const c=document.createElement('canvas');c.width=c.height=size;
 draw(c.getContext('2d'),size,rand(seed));
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
 return t;
}
function plaster(c,n,r){
 c.fillStyle='#e8dfd2';c.fillRect(0,0,n,n);
 for(let i=0;i<800;i++){
  c.fillStyle=r()>.6?'rgba(123,107,87,.035)':'rgba(255,255,255,.06)';
  c.fillRect(r()*n,r()*n,1+r()*5,1+r()*5);
 }
}
function sandstone(c,n,r){
 // Visible coursed limestone blocks even when an image download fails.
 // Each repeat spans about 2.35 m in world space.
 c.fillStyle='#8f8472';c.fillRect(0,0,n,n);
 const course=n/5;
 for(let row=0;row<5;row++){
  const offset=(row%2)*n/4;
  for(let k=-1;k<4;k++){
   const x=k*n/2-offset,y=row*course;
   const warm=Math.floor(r()*20);
   c.fillStyle='rgb('+(194+warm)+','+(183+warm)+','+(163+warm)+')';
   c.fillRect(x+3,y+3,n/2-6,course-6);
   c.fillStyle='rgba(255,247,230,.22)';
   c.fillRect(x+4,y+4,n/2-8,3);
   c.fillStyle='rgba(47,39,28,.14)';
   c.fillRect(x+4,y+course-8,n/2-8,3);
   for(let i=0;i<160;i++){
    const xx=x+5+r()*(n/2-10),yy=y+5+r()*(course-10);
    c.fillStyle=r()>.47?'rgba(70,62,49,.055)':'rgba(248,235,213,.08)';
    c.fillRect(xx,yy,1+r()*3,1+r()*2);
   }
  }
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
function agedPaper(c,n,r){
 c.fillStyle='#f1ead8';c.fillRect(0,0,n,n);
 for(let i=0;i<700;i++){
  const x=r()*n,y=r()*n,v=r()>.48?'rgba(122,104,76,.065)':'rgba(255,255,255,.12)';
  c.strokeStyle=v;c.lineWidth=.3+r()*.55;c.beginPath();
  c.moveTo(x,y);c.lineTo(x+2+r()*15,y+r()*2-1);c.stroke();
 }
}
function stoneHeight(c,n,r){
 const img=c.createImageData(n,n),grid=[];
 for(let j=0;j<9;j++)grid.push(Array.from({length:9},()=>r()));
 const smooth=t=>t*t*(3-2*t);
 const noise=(x,y)=>{
  const xx=x*8,yy=y*8,i=Math.floor(xx)%8,j=Math.floor(yy)%8;
  const u=smooth(xx-i),v=smooth(yy-j);
  return (grid[j][i]*(1-u)+grid[j][i+1]*u)*(1-v)+
         (grid[j+1][i]*(1-u)+grid[j+1][i+1]*u)*v;
 };
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const a=noise(x/n,y/n);
  const bands=Math.sin((x/n)*15+(y/n)*9)*.05;
  const shade=Math.round(113+85*a+23*bands);
  const k=(y*n+x)*4;
  img.data[k]=img.data[k+1]=img.data[k+2]=shade;
  img.data[k+3]=255;
 }
 c.putImageData(img,0,0);
}
function brushed(c,n,r){
 const image=c.createImageData(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const band=Math.sin(y*.68)*5+Math.sin(y*.19)*4;
  const v=Math.round(Math.max(172,Math.min(237,205+band+(r()-.5)*14)));
  const i=(y*n+x)*4;
  image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;
 }
 c.putImageData(image,0,0);
}
const plasterMap=sample(plaster,130),floorMap=sample(floor,240);
const sandstoneMap=sample(sandstone,711);
const woodMap=sample(grain,40),rugMap=sample(weave,8),paperMap=sample(agedPaper,936,256);
const heightFallback=sample(stoneHeight,391,256,false);
const metalRoughness=sample(brushed,744,128,false);

export function mat(color,metalness=0,roughness=.7,extra={}){
 return new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:.8,...extra});
}
function base(kind,material,normalXY,settings={}){
 material.userData={...material.userData,kind,...settings};
 if(normalXY)material.normalScale.set(normalXY[0],normalXY[1]);
 return material;
}
export const M={
 stone:base('stone',mat(0xf9f4eb,0,.86,{map:sandstoneMap}),[.86,.86]),
 darkStone:mat(0xd9cbb8,0,.87,{map:plasterMap}),
 // Structural columns remain limestone, while the previously flat tan trim is
 // real walnut with its own color, normal, roughness, AO and height maps.
 columnStone:base('vault',mat(0xe9dfcf,0,.79,{map:plasterMap,bumpMap:heightFallback,bumpScale:.0028}),[.35,.35]),
 quoinStone:base('vault',mat(0xf1e6d5,0,.82,{map:plasterMap,bumpMap:heightFallback,bumpScale:.002}),[.3,.3]),
 edge:base('wood',mat(0xd6b18a,0,.55,{map:woodMap}),[.35,.35],{bumpDepth:.0045}),
 // Keep the approved stone floor and corridor appearance unchanged.
 floor:base('floor',mat(0xffffff,0,.42,{map:floorMap,clearcoat:.13,clearcoatRoughness:.48,envMapIntensity:.7}),[1,1]),
 corridor:base('floor',mat(0xe9e3d6,0,.62,{map:floorMap,envMapIntensity:.7}),[1,1]),
 wood:base('wood',mat(0xffffff,0,.58,{map:woodMap}),[.43,.43],{bumpDepth:.007}),
 woodHighlight:base('wood',mat(0xd9b698,0,.49,{map:woodMap,clearcoat:.12,clearcoatRoughness:.55}),[.32,.32],{bumpDepth:.005}),
 brass:mat(0xc5a879,.83,.49,{roughnessMap:metalRoughness,clearcoat:.07,clearcoatRoughness:.72}),
 glass:mat(0xe0f0e8,0,.19,{transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false,clearcoat:.35,clearcoatRoughness:.12,ior:1.48}),
 aqua:mat(0x91bab2,.12,.46),
 light:new THREE.MeshStandardMaterial({color:0xffeac7,emissive:0xffcf98,emissiveIntensity:1.17}),
 page:mat(0xffffff,0,.88,{map:paperMap}),
 ink:mat(0x344348,0,.91),
 rug:mat(0xffffff,0,.95,{map:rugMap}),
 vault:base('vault',mat(0xffffff,0,.94,{map:plasterMap,side:THREE.DoubleSide}),[.18,.18]),
 beam:base('wood',mat(0xc9a17d,0,.62,{map:woodMap}),[.42,.42],{bumpDepth:.006}),
 blackMetal:mat(0x343d3b,.77,.57,{roughnessMap:metalRoughness}),
 plinth:base('vault',mat(0xf7f0e4,0,.66,{map:plasterMap,bumpMap:heightFallback,bumpScale:.002}),[.27,.27]),
 velvet:mat(0x36524c,0,.97)
};
/*
 * World-space, low-frequency patina. Breaks up the computer-perfect repetition
 * without altering the approved floor albedo, polish or tile dimensions.
 * Uses physical world coordinates so variations are continuous at room joins.
 */
function worldVariation(material,kind){
 const isFloor=kind==='floor';
 const legacy=new URLSearchParams(globalThis.location?.search||'').get('realism')==='0';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
   '#include <common>\nvarying vec3 vCathedralWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   `#include <begin_vertex>
#ifdef USE_INSTANCING
 vCathedralWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;
#else
 vCathedralWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
#endif`);
  const glsl=String.raw`
varying vec3 vCathedralWorld;
float museumHash21(vec2 p){
 return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
}
float museumValueNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);
 f=f*f*(3.0-2.0*f);
 float a=museumHash21(i),b=museumHash21(i+vec2(1.0,0.0));
 float c=museumHash21(i+vec2(0.0,1.0)),d=museumHash21(i+vec2(1.0,1.0));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
`;
  // Offset-only stochastic sampling for nonstructural limestone/plaster.
  // Keep masonry mortar and directional wood grain on their authored UVs.
  const stochastic=!legacy&&kind==='plaster'&&new URLSearchParams(globalThis.location?.search||'').get('surface')!=='0'&&new URLSearchParams(globalThis.location?.search||'').get('quality')!=='low';
  const tileGLSL=stochastic?String.raw`
vec4 museumTile(sampler2D tex,vec2 uv){
 vec2 p=uv*.8,cell=floor(p),f=fract(p);
 vec2 w=smoothstep(vec2(.15),vec2(.85),f);
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec2 a=vec2(museumHash21(cell),museumHash21(cell+19.7));
 vec2 b=vec2(museumHash21(cell+vec2(1,0)),museumHash21(cell+vec2(1,0)+19.7));
 vec2 c=vec2(museumHash21(cell+vec2(0,1)),museumHash21(cell+vec2(0,1)+19.7));
 vec2 d=vec2(museumHash21(cell+vec2(1,1)),museumHash21(cell+vec2(1,1)+19.7));
 return mix(mix(textureGrad(tex,uv+a,dx,dy),textureGrad(tex,uv+b,dx,dy),w.x),
 mix(textureGrad(tex,uv+c,dx,dy),textureGrad(tex,uv+d,dx,dy),w.x),w.y);
}
`:'';
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
   '#include <common>\n'+glsl+tileGLSL);

  const sample=isFloor
   ?String.raw`
vec2 mc=vCathedralWorld.xz;
float large=museumValueNoise(mc*.077);
float detail=museumValueNoise(mc*.37);
diffuseColor.rgb*=.954+.095*large+.018*(detail-.5);
`
   :kind==='wood'
   ?String.raw`
// Subtle world-space walnut color shifts on different panels and objects,
// while normal and roughness stay aligned with their original UV maps.
vec2 mc=vec2(vCathedralWorld.x+vCathedralWorld.z*.5,
 vCathedralWorld.y+vCathedralWorld.z*.25);
float longGrain=museumValueNoise(mc*.14);
float fineVariation=museumValueNoise(mc*1.4);
diffuseColor.rgb*=.91+.17*longGrain+.026*(fineVariation-.5);
`
   :kind==='plaster'
   ?String.raw`
vec2 mc=vCathedralWorld.xz*.24+vCathedralWorld.y*.15;
float subtle=museumValueNoise(mc);
diffuseColor.rgb*=.963+.074*subtle;
`
   :String.raw`
vec2 mc=vec2(vCathedralWorld.x+vCathedralWorld.z*.63,
 vCathedralWorld.y+vCathedralWorld.z*.27);
float large=museumValueNoise(mc*.16);
float grain=museumValueNoise(mc*.79);
float lower=1.0-smoothstep(0.2,2.35,vCathedralWorld.y);
diffuseColor.rgb*=.934+.11*large+.014*(grain-.5)-.025*lower*(1.0-grain);
`;
  // Physical pattern and mortar stay aligned. Independent world-space detail
  // varies appearance and gloss without duplicating any image or changing UVs.
  const detail=legacy?'':String.raw`
vec2 museumDetailUV=vCathedralWorld.xz+vCathedralWorld.y*vec2(.47,.83);
float museumMacro=museumValueNoise(museumDetailUV*.23+vec2(17.1,3.4));
float museumMeso=museumValueNoise(museumDetailUV*2.4+vec2(6.2,31.8));
float museumFine=mix(.5,museumValueNoise(museumDetailUV*21.0),
 1.0-smoothstep(.015,.055,max(length(dFdx(museumDetailUV)),length(dFdy(museumDetailUV)))));
float museumWear=1.0-smoothstep(.2,1.8,vCathedralWorld.y);
`+(isFloor?String.raw`
diffuseColor.rgb*=.94+.12*museumMacro+.035*(museumMeso-.5)+.024*(museumFine-.5);
`:kind==='wood'?String.raw`
diffuseColor.rgb*=.94+.12*museumMacro+.07*(museumMeso-.5)+.035*(museumFine-.5);
`:String.raw`
diffuseColor.rgb*=.89+.20*museumMacro+.08*(museumMeso-.5)+.05*(museumFine-.5)-.035*museumWear*(1.0-museumMeso);
`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
   '#include <map_fragment>\n'+sample+detail);
  if(!legacy){
   const strength=isFloor?.18:kind==='wood'?.16:.11;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
    '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+('+strength.toFixed(2)+')*(museumMacro-.5)+.06*(museumMeso-.5),.06,1.0);');
  }
  if(stochastic){
   for(const chunk of ['map_fragment','roughnessmap_fragment','normal_fragment_maps','aomap_fragment']){
    const source=THREE.ShaderChunk[chunk];
    if(source)shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',source.replace(/texture2D\(\s*(map|roughnessMap|normalMap|aoMap)\s*,\s*(v\w+Uv)\s*\)/g,'museumTile($1,$2)'));
   }
  }
 };
 material.customProgramCacheKey=()=> 'sonoma-patina-'+kind+'-v4-'+(legacy?'legacy':'detail');
 return material;
}
worldVariation(M.stone,'stone');
for(const m of [M.wood,M.woodHighlight,M.edge,M.beam])
 worldVariation(m,'wood');
for(const m of [M.columnStone,M.quoinStone,M.plinth])
 worldVariation(m,'plaster');
const materials=[...Object.values(M).filter(x=>x?.isMaterial)];
const tiledInstances=[],sharedInstances=[];
function tiledTexture(texture,x,y,phase=[0,0]){
 const out=texture.clone();out.wrapS=out.wrapT=THREE.RepeatWrapping;
 out.repeat.set(Math.max(.1,x),Math.max(.1,y));
 out.offset.set(phase[0],phase[1]);
 out.anisotropy=4;out.needsUpdate=true;return out;
}
export function createTiledMaterial(material,x=1,y=1,seed=0){
 // Preserve the approved floor finish, break up its repetitive PBR imagery
 // with a deterministic per-room phase, and apply continuous macro patina.
 const out=material.clone();
 const phase=material.userData.kind==='floor'
   ?[(Math.floor(seed*17)%5)*.143,(Math.floor(seed*23)%5)*.121]
   :[0,0];
 out.userData={...material.userData,repeat:[x,y],tiled:true,phase};
 for(const key of ['map','normalMap','roughnessMap','aoMap']){
  if(material[key])out[key]=tiledTexture(material[key],x,y,phase);
 }
 if(material.userData.kind==='floor')worldVariation(out,'floor');
 tiledInstances.push(out);
 return out;
}
/** Shared 1K maps; geometry UVs, not copied textures, control tiling. */
export function createSurfaceMaterial(material,{relief=false}={}){
 const out=material.clone();out.userData={...material.userData,sharedUV:true,relief};
 if(material.userData.kind==='stone')worldVariation(out,'stone');
 if(relief){
  out.displacementMap=heightFallback;
  out.displacementScale=.012;
  out.displacementBias=-.006;
 }
 sharedInstances.push(out);
 return out;
}
/** Convert each BoxGeometry face from 0..1 UVs to real-world metre density. */
export function scaleBoxUV(geometry,w,h,d,metersPerTile=2.35,phase=[0,0]){
 const uv=geometry.getAttribute('uv'),index=geometry.getIndex();
 const sizes=[
  [d,h],[d,h],
  [w,d],[w,d],
  [w,h],[w,h]
 ];
 for(let face=0;face<Math.min(geometry.groups.length,6);face++){
  const group=geometry.groups[face],[u,v]=sizes[face];
  const visited=new Set();
  for(let k=group.start;k<group.start+group.count;k++){
   const i=index?index.getX(k):k;
   if(visited.has(i))continue;visited.add(i);
   uv.setXY(i,uv.getX(i)*Math.max(.1,u/metersPerTile)+phase[0],
     uv.getY(i)*Math.max(.1,v/metersPerTile)+phase[1]);
  }
 }
 uv.needsUpdate=true;
 return geometry;
}
function setMap(target,key,texture){
 // Maps are reused as one GPU texture for all sharedUV surfaces.
 if(key==='map')texture.colorSpace=THREE.SRGBColorSpace;
 else texture.colorSpace=THREE.NoColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;texture.needsUpdate=true;
 if(target.userData.tiled){
  const [x,y]=target.userData.repeat;
  target[key]=tiledTexture(texture,x,y,target.userData.phase||[0,0]);
 }else target[key]=texture;
 target.needsUpdate=true;
}
async function manifestForMaterials(){
 try{
  const r=await fetch('./assets/cathedral/materials.json',{cache:'no-store'});
  return r.ok?await r.json():{};
 }catch{return{};}
}
const sources={stone:'sandstone_blocks_04',floor:'tiled_floor_001',wood:'walnut_veneer',vault:'white_plaster_02'};
const keys=['map','normalMap','roughnessMap','aoMap','heightMap'];
export async function loadCathedralMaterials(onStatus=()=>{}){
 const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
 const manifest=await manifestForMaterials();
 const targets=[...materials,...tiledInstances,...sharedInstances];
 let maps=0,surfaces=0;
 const results=await Promise.all(Object.entries(sources).map(async ([role,id])=>{
  let complete=0;
  // The old beige-wall photographs are visibly flat. Do not let their cached
  // URLs overwrite the new coursed-sandstone fallback while the workflow runs.
  if(role==='stone' && !String(manifest.stone?.map||'').includes('sandstone_blocks_04')){
   console.info('Cathedral: waiting for sandstone-block PBR import; using masonry fallback');
   return {role,maps:0};
  }
  for(const key of keys){
   // The existing floor PBR remains byte-for-byte unchanged.
   if(role==='floor'&&(key==='aoMap'||key==='heightMap'))continue;
   const url=manifest[role]?.[key];
   // Do not guess Poly Haven filename variants for maps absent in the manifest.
   if(!url)continue;
   try{
    const tex=await loader.loadAsync(url);
    const relevant=targets.filter(m=>m.userData?.kind===role);
    for(const m of relevant){
     if(key==='heightMap'){
      if(m.userData.relief){
       m.displacementMap=tex;m.displacementScale=.012;
       m.displacementBias=-.006;m.needsUpdate=true;
      }else if(m.userData.bumpDepth){
       setMap(m,'bumpMap',tex);m.bumpScale=m.userData.bumpDepth;
      }
     }else if(key==='aoMap'){
      // Poly Haven ambient occlusion uses the SAME main UVs as other maps.
      // In current Three.js, channel zero is the first uv attribute.
      tex.channel=0;setMap(m,'aoMap',tex);m.aoMapIntensity=.65;
     }else setMap(m,key,tex);
    }
    complete++;maps++;
   }catch(error){console.warn('Cathedral PBR missing:',role,key,error);}
  }
  if(complete)surfaces++;
  return {role,maps:complete};
 }));
 onStatus('Architectural PBR: '+surfaces+'/4 materials, '+maps+' maps');
 return {surfaces,maps,results};
}

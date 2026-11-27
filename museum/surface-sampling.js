import * as THREE from 'three';

/**
 * Offset-only triangular-lattice stochastic sampling. Inspired by the
 * by-example tiling research of Heitz/Neyret and Mikkelsen (JCGT 2022).
 * No copied shader, rotation or histogram preprocessing. Translation keeps
 * tangent-space normals aligned and preserves the direction of wood grain.
 * Use only on near-stochastic materials, never mortar or ceramic grout.
 */
export const stochasticGLSL=String.raw`
vec2 museumTileOffset(vec2 cell){
 vec2 h=vec2(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3)));
 return fract(sin(h)*43758.5453);
}
vec4 museumStochastic(sampler2D tex,vec2 uv){
 // Three adjacent lattice vertices, continuous barycentric weights.
 vec2 p=uv*MUSEUM_TILE_DENSITY;
 vec2 q=vec2(p.x-p.y*.57735027,p.y*1.15470054);
 vec2 i=floor(q),f=fract(q);
 vec2 a,b,c;vec3 w;
 if(f.x+f.y<=1.0){
  a=i;b=i+vec2(1.,0.);c=i+vec2(0.,1.);
  w=vec3(1.-f.x-f.y,f.x,f.y);
 }else{
  a=i+vec2(1.,1.);b=i+vec2(0.,1.);c=i+vec2(1.,0.);
  w=vec3(f.x+f.y-1.,1.-f.x,1.-f.y);
 }
 // Sharpen weights modestly instead of washing out the source contrast.
 w=w*w;w/=max(dot(w,vec3(1.)),.00001);
 // Offset discontinuities must not enter the mip derivatives.
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec4 s0=textureGrad(tex,uv+museumTileOffset(a),dx,dy);
 vec4 s1=textureGrad(tex,uv+museumTileOffset(b),dx,dy);
 vec4 s2=textureGrad(tex,uv+museumTileOffset(c),dx,dy);
 return s0*w.x+s1*w.y+s2*w.z;
}
`;

// Use the exact installed Three.js chunks instead of duplicating its PBR
// normal/roughness/AO and video color-conversion implementations.
export function applyStochasticSampling(shader,kind){
 const density=kind==='wood'?'vec2(1.35,.72)':'vec2(1.8,1.8)';
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
  '#include <common>\n#define MUSEUM_TILE_DENSITY '+density+'\n'+stochasticGLSL);
 const replacements={
  map_fragment:['map'],
  normal_fragment_maps:['normalMap'],
  roughnessmap_fragment:['roughnessMap'],
  aomap_fragment:['aoMap']
 };
 for(const [name,samplers] of Object.entries(replacements)){
  const chunk=THREE.ShaderChunk[name];
  if(typeof chunk!=='string')continue;
  let patched=chunk;
  for(const sampler of samplers){
   const re=new RegExp('\\btexture2D\\s*\\(\\s*'+sampler+'\\s*,\\s*(v\\w+Uv)\\s*\\)','g');
   patched=patched.replace(re,(_,uv)=>'museumStochastic('+sampler+','+uv+')');
  }
  if(patched!==chunk)shader.fragmentShader=shader.fragmentShader.replace('#include <'+name+'>',patched);
 }
}

// Procedural microdetail preserves structural mortar and floor joints.
export const wearGLSL=String.raw`
float museumScratch(vec2 uv){
 vec2 cell=floor(uv),p=fract(uv)-.5;
 float angle=museumHash21(cell+vec2(8.1,23.4))*6.2831853;
 vec2 axis=vec2(cos(angle),sin(angle));
 float along=dot(p,axis),across=dot(p,vec2(-axis.y,axis.x));
 float limit=.10+.20*museumHash21(cell+vec2(2.3,4.6));
 float width=.012+min(.04,fwidth(across));
 float scratch=(1.-smoothstep(.006,width+.006,abs(across)))*
  (1.-smoothstep(limit*.6,limit,abs(along)));
 float mask=step(.69,museumHash21(cell+vec2(53.2,16.2)));
 return scratch*mask*(1.-smoothstep(.06,.22,max(length(dFdx(uv)),length(dFdy(uv)))));
}
`;
export function applyWear(shader,kind){
 const floor=kind==='floor',wood=kind==='wood';
 const coordinates=floor?'vCathedralWorld.xz':wood?'vec2(vCathedralWorld.x+vCathedralWorld.z*.57,vCathedralWorld.y+vCathedralWorld.z*.31)':'museumDetailUV';
 const strength=floor?.0007:wood?.0012:.0022;
 const shaderCode=String.raw`
vec2 wearUV=WEAR_COORD;
float wearFootprint=max(length(dFdx(wearUV)),length(dFdy(wearUV)));
float wearFade=1.-smoothstep(.009,.065,wearFootprint);
float wearGrain=museumValueNoise(wearUV*36.0+vec2(16.1,7.8));
float wearPore=smoothstep(.61,.86,wearGrain)*wearFade;
float wearMark=museumScratch(wearUV*WEAR_SCALE);
float wearDirt=museumValueNoise(wearUV*1.7+vec2(5.2,37.5));
float wearHeight=WEAR_STRENGTH*((wearGrain-.5)*wearFade-.45*wearMark-.32*wearPore);
`.replace('WEAR_COORD',coordinates).replace('WEAR_SCALE',wood?'4.5':'3.0').replace('WEAR_STRENGTH',strength.toFixed(4))+
 (floor?'diffuseColor.rgb*=1.-.034*wearMark-.018*wearPore;\n':
 wood?'diffuseColor.rgb*=1.+.042*wearMark-.036*wearPore-.035*wearDirt*museumWear;\n':
 'diffuseColor.rgb*=1.-.043*wearPore-.032*wearMark-.055*wearDirt*museumWear;\n');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+wearGLSL);
 shader.fragmentShader=shader.fragmentShader.replace('/* MUSEUM_WEAR */',shaderCode);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',String.raw`
#include <normal_fragment_maps>
// Surface-gradient detail on top of the original PBR normal.
vec3 wearDx=dFdx(-vViewPosition),wearDy=dFdy(-vViewPosition);
vec3 wearR1=cross(wearDy,normal),wearR2=cross(normal,wearDx);
float wearDet=dot(wearDx,wearR1);
float wearHx=dFdx(wearHeight),wearHy=dFdy(wearHeight);
if(abs(wearDet)>1e-10){
 vec3 wearGrad=sign(wearDet)*(wearHx*wearR1+wearHy*wearR2);
 normal=normalize(abs(wearDet)*normal-wearGrad);
}
`);
 shader.fragmentShader=shader.fragmentShader.replace('/* MUSEUM_WEAR_ROUGHNESS */',
  'roughnessFactor=clamp(roughnessFactor+'+(floor?'.055':'.085')+'*wearMark+.035*wearPore,.06,1.0);');
}

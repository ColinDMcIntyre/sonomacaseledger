import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../museum/'+name,import.meta.url),'utf8');
const strip=s=>s.replace(/^import .*?;\s*$/gm,'').replace(/^export\s+(?=(?:async\s+)?function|const|let|class)/gm,'').replace(/^export\s*\{[^}]*\};\s*$/gm,'');
const sampling=read('surface-sampling.js'),wear=read('surface-wear.js'),geometry=read('surface-geometry.js'),materials=read('materials.js');
test('surface modules and integrated geometry parse',()=>{
 for(const source of [sampling,wear,geometry,materials,read('world.js'),read('architecture.js')]){
  assert.doesNotThrow(()=>new Function(strip(source)));
 }
});
test('stochastic sampler replaces aligned PBR channels without modifying unrelated shader code',()=>{
 const THREE={ShaderChunk:{map_fragment:'vec4 sampledDiffuseColor = texture2D( map, vMapUv );',
 normal_fragment_maps:'vec3 mapN=texture2D( normalMap, vNormalMapUv ).xyz;',
 roughnessmap_fragment:'float r=texture2D(roughnessMap,vRoughnessMapUv).g;',
 aomap_fragment:'float a=texture2D( aoMap, vAoMapUv ).r;'}};
 const apply=new Function('THREE',strip(sampling)+'\nreturn applyStochasticSampling;')(THREE);
 const shader={fragmentShader:'#include <common>\n#include <map_fragment>\n#include <normal_fragment_maps>\n#include <roughnessmap_fragment>\n#include <aomap_fragment>\n#include <displacementmap_vertex>'};
 apply(shader,'wood');
 for(const [map,uv] of [['map','vMapUv'],['normalMap','vNormalMapUv'],['roughnessMap','vRoughnessMapUv'],['aoMap','vAoMapUv']]){
  assert.ok(shader.fragmentShader.includes('museumStochastic('+map+','+uv+')'));
 }
 assert.match(shader.fragmentShader,/textureGrad\(tex,uv\+museumTileOffset/);
 assert.match(shader.fragmentShader,/#include <displacementmap_vertex>/);
 assert.match(materials,/kind==='wood'\|\|kind==='plaster'/);
});
test('wear patches contain filtered detail normals and leave no unresolved markers',()=>{
 const apply=new Function(strip(wear)+'\nreturn applyWear;')();
 for(const kind of ['wood','stone','floor','plaster']){
  const shader={fragmentShader:'#include <common>\n/* MUSEUM_WEAR */\n/* MUSEUM_WEAR_ROUGHNESS */\n#include <normal_fragment_maps>'};
  apply(shader,kind);
  assert.match(shader.fragmentShader,/dFdx\(wearHeight\)/);
  assert.match(shader.fragmentShader,/roughnessFactor=clamp/);
  assert.doesNotMatch(shader.fragmentShader,/WEAR_COORD|WEAR_SCALE|WEAR_STRENGTH|\/\* MUSEUM_WEAR/);
 }
});
test('bevel sizing is deterministic and bounded by the shortest dimension',()=>{
 const radius=new Function(strip(geometry)+'\nreturn wornRadius;')();
 for(const kind of ['wood','vault'])for(let i=0;i<100;i++){
  const r=radius(2,.08,1,kind,i);
  assert.ok(r>0&&r<=.08*.15);
  assert.equal(r,radius(2,.08,1,kind,i));
 }
 assert.equal(radius(1,.02,1,'wood',4),0);
 assert.match(read('architecture.js'),/new THREE\.BoxGeometry\(w,h,d,sx,sy,1\)/);
});

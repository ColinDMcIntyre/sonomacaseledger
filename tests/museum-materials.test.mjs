import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');

test('stone walls use real UVs, PBR and shallow shader displacement',()=>{
 const materials=read('museum/materials.js'),architecture=read('museum/architecture.js');
 assert.match(materials,/export function scaleBoxUV/);
 assert.match(materials,/export function createSurfaceMaterial/);
 assert.match(materials,/out\.displacementScale=\.012/);
 assert.match(materials,/out\.displacementBias=-\.006/);
 assert.match(architecture,/new THREE\.BoxGeometry\(w,h,d,sx,sy,1\)/);
 assert.match(architecture,/scaleBoxUV\(new THREE\.BoxGeometry\(w,h,d,sx,sy,1\)/);
 assert.match(architecture,/createSurfaceMaterial\(M\.stone,\{relief:true\}\)/);
 assert.match(architecture,/const mats=\[M\.stone,M\.stone,M\.stone,M\.stone,relief,relief\]/);
 assert.doesNotMatch(architecture,/shape\.holes\.push/);
});

test('approved stone floor style and its geometry remain unchanged',()=>{
 const materials=read('museum/materials.js'),architecture=read('museum/architecture.js');
 assert.match(materials,/floor:base\('floor',mat\(0xffffff,0,\.42,\{map:floorMap,clearcoat:\.13,clearcoatRoughness:\.48,envMapIntensity:\.7\}\),\[1,1\]\)/);
 assert.match(materials,/corridor:base\('floor',mat\(0xe9e3d6,0,\.62,\{map:floorMap,envMapIntensity:\.7\}\),\[1,1\]\)/);
 assert.match(architecture,/const tile=room\.id==='archive'\?M\.corridor:M\.floor/);
 assert.match(architecture,/const corridorSections=visibleCorridorSections\(rooms,HALLWAYS\)/);
 assert.match(architecture,/for\(const r of corridorSections\)addFloor\(r\.x,r\.z,r\.w,r\.d,M\.corridor\)/);
 assert.match(materials,/!\(role==='floor'&&\(key==='aoMap'\|\|key==='heightMap'\)\)/);
});

test('metal, glass, paper, walnut and plaster have distinct finishes',()=>{
 const materials=read('museum/materials.js'),glass=read('museum/stained-glass.js');
 assert.match(materials,/wood:base\('wood'/);
 assert.match(materials,/vault:base\('vault'/);
 assert.match(materials,/blackMetal:mat/);
 assert.match(materials,/glass:mat/);
 assert.match(materials,/page:mat\(0xffffff,0,\.88,\{map:paperMap\}\)/);
 assert.match(materials,/metalRoughness/);
 assert.match(glass,/new THREE\.MeshPhysicalMaterial/);
 assert.match(glass,/clearcoat:\.48/);
});

test('AO and height imports extend PBR maps while preserving floor files',()=>{
 const materials=read('museum/materials.js'),script=read('scripts/import_cathedral_assets.py');
 assert.match(materials,/const keys=\['map','normalMap','roughnessMap','aoMap','heightMap'\]/);
 assert.match(script,/"aoMap":\("ambientocclusion","ambient_occlusion","ao"\)/);
 assert.match(script,/"heightMap":\("displacement","disp","height"\)/);
 assert.match(script,/if role=="floor" and result\.get\("floor",\{\}\)\.get\("map"\):/);
 assert.match(materials,/tex\.channel=0/);
});

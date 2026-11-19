import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const moduleURL=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const layoutSrc=read('museum/layout.js');
const layoutURL=moduleURL(layoutSrc);
const layout=await import(layoutURL);
const nav=await import(moduleURL(read('museum/navigation.js').replace(
 "from './layout.js'","from '"+layoutURL+"'"
)));
const floor=await import(moduleURL(read('museum/floor-geometry.js')));
const rooms=[...layout.ROOM_DEFS,layout.VESTIBULE];
const renderCorridors=floor.visibleCorridorSections(rooms,layout.HALLWAYS);

test('every doorway has uninterrupted player-radius movement, independent of visual floor cuts',()=>{
 const architecture=read('museum/architecture.js');
 assert.match(architecture,/const floors=\[\],floorRects=\[\.\.\.HALLWAYS\]/);
 const before=nav.createNavigation([...rooms,...renderCorridors],[]);
 const after=nav.createNavigation([...rooms,...layout.HALLWAYS,...renderCorridors],[]);
 let oldFailures=0;
 for(const portal of layout.PORTALS){
  const origin=portal.axis==='x'
   ?[portal.value-1.25,portal.at]:[portal.at,portal.value-1.25];
  const destination=portal.axis==='x'
   ?[portal.value+1.25,portal.at]:[portal.at,portal.value+1.25];
  if(!before.canMove(...origin,...destination))oldFailures++;
  assert.ok(after.canMove(...origin,...destination),
   'Collision must allow traversing '+portal.a+' -> '+portal.b);
 }
 assert.equal(oldFailures,layout.PORTALS.length,
  'The test must reproduce the previous hidden-collision regression');
});

test('corridor surfaces never overlap other floor planes',()=>{
 for(const bridge of renderCorridors)
  for(const room of rooms)
   assert.ok(floor.rectOverlapArea(bridge,room)<1e-8);
 for(let i=0;i<renderCorridors.length;i++)
  for(let j=i+1;j<renderCorridors.length;j++)
   assert.ok(floor.rectOverlapArea(renderCorridors[i],renderCorridors[j])<1e-8);
});

test('real walnut PBR is applied to timber trim and all pillars have textured stone',()=>{
 const m=read('museum/materials.js'),a=read('museum/architecture.js');
 assert.match(m,/edge:base\('wood'.*map:woodMap/);
 assert.match(m,/beam:base\('wood'.*map:woodMap/);
 assert.match(m,/columnStone:base\('vault'.*map:plasterMap/);
 assert.match(m,/quoinStone:base\('vault'.*map:plasterMap/);
 assert.match(a,/const trim=M\.quoinStone/);
 assert.match(a,/new THREE\.InstancedMesh\(geometry,M\.quoinStone,blocks\.length\)/);
});

test('repeated timber and stone items have authored UV-safe deterministic variety',()=>{
 const m=read('museum/materials.js');
 const a=read('museum/architecture.js');
 const world=read('museum/world.js');
 const library=read('museum/asset-library.js');
 assert.match(m,/kind==='wood'/);
 assert.match(m,/vCathedralWorld/);
 assert.match(m,/metersPerTile=2\.35,phase=\[0,0\]/);
 assert.match(a,/hash\(seed\)\*\.92/);
 assert.match(a,/mesh\.setColorAt\(i,/);
 assert.match(world,/scaleBoxUV\(new THREE\.BoxGeometry\(w,h,d\)/);
 assert.match(library,/variationMaterial\(/);
 assert.match(library,/const clone=material\.clone\(\)/);
 assert.doesNotMatch(library,/texture\.clone\(\)/);
});

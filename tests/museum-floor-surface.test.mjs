import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const url=src=>'data:text/javascript;base64,'+Buffer.from(src).toString('base64');
const layout=await import(url(read('museum/layout.js')));
const floor=await import(url(read('museum/floor-geometry.js')));

test('floor never overlays the same space twice',()=>{
 const rooms=[...layout.ROOM_DEFS,layout.VESTIBULE];
 const oldOverlap=layout.HALLWAYS.reduce((area,h)=>
  area+rooms.reduce((n,r)=>n+floor.rectOverlapArea(r,h),0),0);
 assert.ok(oldOverlap>100,'There should be real previous z-fighting to fix');
 const pieces=floor.visibleCorridorSections(rooms,layout.HALLWAYS);
 assert.ok(pieces.length>0,'Necessary room-to-room corridor remains');
 for(const corridor of pieces){
  for(const room of rooms)
   assert.ok(floor.rectOverlapArea(corridor,room)<1e-8,
    'Room and corridor flooring must never overlap');
 }
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++)
  assert.ok(floor.rectOverlapArea(pieces[i],pieces[j])<1e-8,
   'Two corridor floor pieces must never overlap');
});
test('the library doorway retains an actual ground surface',()=>{
 const pieces=floor.visibleCorridorSections(
  [...layout.ROOM_DEFS,layout.VESTIBULE],layout.HALLWAYS);
 assert.ok(pieces.some(p=>Math.abs(p.x-9)<.1&&Math.abs(p.z-38)<.1&&p.w>3.5),
  'Entrance to records library still has a visible walkway');
});
test('wall boundaries remain real portals and bevels do not change collision',()=>{
 const arch=read('museum/architecture.js');
 assert.match(arch,/visibleCorridorSections\(rooms,HALLWAYS\)/);
 assert.match(arch,/new RoundedBoxGeometry/);
 assert.match(arch,/cornerMasonry\(group\)/);
 assert.match(arch,/fromY<\.022 && w>\.16/);
 assert.match(arch,/if\(room\.id!=='rotunda'&&PORTALS/);
 assert.doesNotMatch(arch,/shape\.holes\.push/);
});
test('floor uses continuous world-space variation and phase-aligned maps',()=>{
 const mat=read('museum/materials.js');
 assert.match(mat,/function worldVariation\(material,kind\)/);
 assert.match(mat,/vCathedralWorld/);
 assert.match(mat,/material\.customProgramCacheKey/);
 assert.match(mat,/if\(material\.userData\.kind==='floor'\)worldVariation\(out,'floor'\)/);
 assert.match(mat,/out\.offset\.set\(phase\[0\],phase\[1\]\)/);
 assert.match(mat,/target\.userData\.phase\|\|\[0,0\]/);
 assert.match(mat,/floor:base\('floor',mat\(0xffffff,0,\.42/);
});

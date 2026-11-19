import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('architectural ambient occlusion is batched and navigation-independent',()=>{
 const s=read('museum/daylight.js');
 assert.match(s,/batchContactShadows\(world\)/);
 assert.match(s,/g\.setIndex\(indices\)/);
 assert.match(s,/single-draw-contact-occlusion/);
 assert.doesNotMatch(s,/obstacles\.push\(/);
 assert.doesNotMatch(s,/interactives\.push\(/);
});
test('sunlight enters only appropriate existing window apertures',()=>{
 const s=read('museum/daylight.js'),a=read('museum/architecture.js');
 assert.match(a,/glass\.userData\.museumDaylight/);
 assert.match(s,/info\.side!=='w'/);
 assert.match(s,/info\.roomId==='archive'/);
 assert.match(s,/w\.userData\.museumDaylight/);
 assert.match(s,/blending:THREE\.AdditiveBlending/);
});
test('sun shadow atlas is frozen while museum is explored',()=>{
 const m=read('museum/museum.js'),l=read('museum/lighting.js');
 assert.match(m,/shadowMap\.autoUpdate=false/);
 assert.match(m,/shadowMap\.needsUpdate=true/);
 assert.match(m,/installBakedDaylight\(world,scene/);
 assert.match(l,/sun\.shadow\.mapSize\.set\(1536,1536\)/);
});

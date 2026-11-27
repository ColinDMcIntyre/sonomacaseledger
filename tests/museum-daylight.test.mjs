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


test('pillar shadows are disabled without removing pillar collision',()=>{
 const a=read('museum/architecture.js'),d=read('museum/daylight.js');
 assert.match(a,/for\(const part of \[base,shaft,neck,capital\]\)part\.castShadow=false/);
 assert.match(a,/blockers\.push\(shaft\)/);
 assert.doesNotMatch(d,/columnX|ribStations/);
});
test('furniture contact shadows cover visible opaque geometry and imported furnishings',()=>{
 const w=read('museum/world.js'),d=read('museum/daylight.js'),a=read('museum/asset-library.js'),m=read('museum/museum.js');
 assert.match(w,/furnitureShadowRoots\.push\(g\)/);
 assert.match(w,/furnitureShadowRoots\.push\(sign\)/);
 assert.match(w,/furnitureShadowRoots\.push\(sculpture\)/);
 assert.match(a,/furnitureShadowRoots\?\.push\(anchor\)/);
 assert.match(w,/m\.castShadow=!material\.transparent/);
 assert.match(a,/object\.castShadow=mats\.length>0&&mats\.every/);
 assert.match(d,/root\.traverseVisible/);
 assert.match(d,/part\.min\.y<=\.4/);
 assert.match(m,/daylight\.refreshFurnitureShadows\?\.\(\)/);
 assert.match(d,/previous\.dispose\(\)/);
});
test('ceiling pendants are stronger without extra dynamic shadow maps',()=>{
 const l=read('museum/lighting.js');
 assert.match(l,/glass\.emissiveIntensity=3\.1/);
 assert.match(l,/ceiling>13\?7\.2:6\.0/);
 assert.match(l,/ceiling>13\?230:160/);
 assert.match(l,/light\.castShadow=false/);
 assert.equal((l.match(/new THREE\.PointLight\(/g)||[]).length,1);
});

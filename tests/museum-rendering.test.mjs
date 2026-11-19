import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');

test('WebGL canvas is visually constrained to viewport on high-DPI displays',()=>{
 const css=read('museum/museum.css'),js=read('museum/museum.js');
 assert.match(css,/#viewport canvas\{display:block;width:100%;height:100%/);
 assert.match(js,/renderer\.setSize\(window\.innerWidth,window\.innerHeight,true\)/);
 assert.match(js,/renderer\.setSize\(w,h,true\)/);
 assert.match(js,/UI\.viewport\.clientWidth\|\|window\.innerWidth/);
 assert.doesNotMatch(js,/renderer\.setSize\([^)]+,false\)/);
});

test('camera follows live character and avatar keeps its measured model offset',()=>{
 const camera=read('museum/museum.js');
 const character=read('museum/character.js');
 assert.match(camera,/viewTarget\.copy\(player\)/);
 assert.match(camera,/camera\.lookAt\(player\.x,1\.83,player\.z\)/);
 assert.match(character,/modelRestPosition\.copy\(obj\.position\)/);
 assert.match(character,/model\.position\.x=modelRestPosition\.x/);
 assert.match(character,/model\.position\.z=modelRestPosition\.z/);
 assert.doesNotMatch(character,/model\.position\.x=0;model\.position\.z=0;/);
});

test('masonry uses a visible CC0 sandstone texture and never stale beige-wall images',()=>{
 const script=read('scripts/import_cathedral_assets.py');
 const mats=read('museum/materials.js');
 assert.match(script,/"stone":"sandstone_blocks_04"/);
 assert.match(script,/role=="stone"/);
 assert.match(script,/f"\{role\}_\{asset_id\}_\{name\}\.\{suffix\}"/);
 assert.match(mats,/sandstoneMap=sample\(sandstone,711\)/);
 assert.match(mats,/stone:base\('stone',mat\(0xf9f4eb,0,\.86,\{map:sandstoneMap\}/);
 assert.match(mats,/includes\('sandstone_blocks_04'\)/);
});

test('approved floor and structural doorways remain intact',()=>{
 const a=read('museum/architecture.js');
 const m=read('museum/materials.js');
 assert.match(a,/const tile=room\.id==='archive'\?M\.corridor:M\.floor/);
 assert.match(a,/function sharedNaveWall\(room,dir\)/);
 assert.doesNotMatch(a,/shape\.holes\.push/);
 assert.match(m,/floor:base\('floor',mat\(0xffffff,0,\.42/);
 assert.match(m,/corridor:base\('floor',mat\(0xe9e3d6,0,\.62/);
});

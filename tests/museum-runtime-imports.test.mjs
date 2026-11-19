import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
test('world imports vestibule from the layout module before building column collisions',()=>{
 const world=read('museum/world.js');
 const layout=read('museum/layout.js');
 assert.match(layout,/export const VESTIBULE=/);
 assert.match(world,/import\s*\{[^}]*\bVESTIBULE\b[^}]*\}\s*from\s*['"]\.\/layout\.js['"]/);
 assert.match(world,/\[\.\.\.ROOM_DEFS,VESTIBULE\]/);
});
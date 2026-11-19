import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const layoutURL=data(read('museum/layout.js'));
const layout=await import(layoutURL);
const profile=await import(data(read('museum/vault-profile.js')));
const nav=await import(data(read('museum/navigation.js').replace(
 "from './layout.js'","from '"+layoutURL+"'"
)));
const rooms=[...layout.ROOM_DEFS,layout.VESTIBULE];

test('stone end gables and roof edges share exactly the same arch curve',()=>{
 for(const room of rooms){
  const p=profile.vaultProfile(room);
  const samples=profile.gableSamples(room);
  assert.equal(samples.length,profile.VAULT_SEGMENTS+1);
  assert.equal(p.spring,room.height);
  assert.ok(Math.abs(p.halfSpan-(room.w/2-profile.WALL_THICKNESS/2))<1e-8);
  assert.ok(Math.abs(p.halfDepth-(room.d/2-profile.WALL_THICKNESS/2))<1e-8);
  assert.ok(Math.abs(samples[0].y-p.spring)<1e-7,room.id+' left wall join');
  assert.ok(Math.abs(samples.at(-1).y-p.spring)<1e-7,room.id+' right wall join');
  assert.ok(Math.abs(samples[profile.VAULT_SEGMENTS/2].y-p.apex)<1e-7);
  for(const sample of samples)
   assert.ok(Math.abs(sample.y-profile.vaultY(p,sample.x))<1e-7);
 }
});

test('pillars connect to their spring lines and ribs at every station',()=>{
 for(const room of rooms){
  const p=profile.vaultProfile(room),stations=profile.ribStations(room);
  assert.ok(stations.length>=2,room.id+' column rhythm');
  assert.ok(stations.every(z=>Math.abs(z-room.z)<p.halfDepth));
  for(const side of [-1,1]){
   const shaftX=profile.columnX(room,side);
   const springX=p.centerX+side*p.halfSpan;
   assert.ok(Math.abs(shaftX-springX)<.60,room.id+' capital reaches rib');
   assert.ok(Math.abs(profile.vaultY(p,springX)-room.height)<1e-7);
  }
 }
 assert.equal(profile.ribStations(layout.ROOM_DEFS[0]).length,8);
});

test('new true column positions leave the original doorways passable',()=>{
 const obstacles=[];
 for(const room of rooms)for(const z of profile.ribStations(room))
  for(const side of [-1,1])obstacles.push({
   x:profile.columnX(room,side),z,r:.33
  });
 const movement=nav.createNavigation([...rooms,...layout.HALLWAYS],obstacles);
 for(const p of layout.PORTALS){
  const a=p.axis==='x'?[p.value-1.25,p.at]:[p.at,p.value-1.25];
  const b=p.axis==='x'?[p.value+1.25,p.at]:[p.at,p.value+1.25];
  assert.ok(movement.canMove(...a,...b),p.a+' → '+p.b);
 }
});

test('end-wall infill, roof, ribs, piers and corridor have actual solid geometry',()=>{
 const src=read('museum/architecture.js'),world=read('museum/world.js');
 assert.match(src,/function endGable\(room,dir,parent,blockers\)/);
 assert.match(src,/for\(const dir of \['n','s'\]\)endGable\(room,dir,group,cameraBlockers\)/);
 assert.match(src,/vaultSample\(profile,i,VAULT_SEGMENTS\)/);
 assert.match(src,/function vault\(room,parent,blockers\)/);
 assert.match(src,/blockers\.push\(roof\)/);
 assert.match(src,/function corridorShell\(parent,sections,blockers\)/);
 assert.match(src,/corridorShell\(group,corridorSections,cameraBlockers\)/);
 assert.match(src,/for\(const z of ribStations\(room\)\)/);
 assert.match(src,/column\(group,room,side,z,cameraBlockers\)/);
 assert.match(world,/for\(const z of ribStations\(room\)\)/);
 assert.doesNotMatch(src,/shape\.holes\.push/);
});

test('walls have the same stone cornices and walnut treatment on both sides',()=>{
 const src=read('museum/architecture.js');
 assert.match(src,/for\(const face of \[-1,1\]\)/);
 assert.match(src,/box\(wallGroup,M\.wood/);
 assert.match(src,/box\(wallGroup,M\.quoinStone/);
 assert.match(src,/const floors=\[\],floorRects=\[\.\.\.HALLWAYS\]/);
 assert.match(src,/visibleCorridorSections\(rooms,HALLWAYS\)/);
 assert.match(src,/const tile=room\.id==='archive'\?M\.corridor:M\.floor/);
});

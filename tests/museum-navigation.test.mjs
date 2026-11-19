import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=name=>readFileSync(resolve(root,name),'utf8');
const asModule=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');

// Data URLs let these unchanged GitHub Pages .js modules load as ESM in
// Node without requiring a package.json change to the larger repository.
const layoutURL=asModule(read('museum/layout.js'));
const navigationURL=asModule(read('museum/navigation.js').replace(
 "from './layout.js'", "from '"+layoutURL+"'"
));
const layout=await import(layoutURL);
const nav=await import(navigationURL);
const vault=await import(asModule(read('museum/vault-profile.js')));
const rooms=[...layout.ROOM_DEFS,layout.VESTIBULE];
const floors=[...rooms,...layout.HALLWAYS];

test('each architectural doorway crosses unobstructed at player height',()=>{
 const movement=nav.createNavigation(floors,[]);
 for(const p of layout.PORTALS){
  const a=p.axis==='x'?{x:p.value-1.25,z:p.at}:{x:p.at,z:p.value-1.25};
  const b=p.axis==='x'?{x:p.value+1.25,z:p.at}:{x:p.at,z:p.value+1.25};
  assert.ok(movement.walkable(a.x,a.z),p.a+' door entrance');
  assert.ok(movement.walkable(b.x,b.z),p.b+' door exit');
  assert.ok(movement.canMove(a.x,a.z,b.x,b.z),p.a+' to '+p.b);
  const offset=p.width/2+1.12;
  const at=p.at+offset;
  const wallPoint=p.axis==='x'?[p.value,at]:[at,p.value];
  assert.equal(nav.wallClear(...wallPoint),false,
   'Solid stone beside '+p.a+' → '+p.b+' must block movement');
 }
});

test('cathedral maintains distinct opaque wall pieces, not triangulated fake door holes',()=>{
 const source=read('museum/architecture.js');
 assert.match(source,/function doorwayArch/);
 assert.match(source,/stone\.position\.set\(opening\.at/);
 assert.match(source,/function sharedNaveWall\(room,dir\)/);
 assert.doesNotMatch(source,/shape\.holes\.push/);
});

test('all seven galleries and 37 cases remain reachable from the vestibule',()=>{
 const cases=JSON.parse(read('research/case-data.json'));
 const list=[...cases.county.map(x=>({...x,group:'county'})),
  ...cases.federal.map(x=>({...x,group:'federal'})),
  {name:'Constantine William Petros',group:'county',
   subject:'Insurance-related proceeding and post-conviction dismissal'}];
 assert.equal(list.length,37);
 const groupFor=r=>{
  const s=(r.subject||'').toLowerCase();
  return r.group==='federal'?'federal':
   s.includes('insurance')?'insurance':
   /invest|ponzi|pyramid|bank|loan/.test(s)?'investment':
   /nonprofit|association|trust|school|senior|community/.test(s)?'trust':'business';
 };
 const groups={investment:[],business:[],insurance:[],trust:[],federal:[]};
 for(const r of list)groups[groupFor(r)].push(r);
 for(const id of ['investment','business','insurance','trust'])
  while(groups[id].length>11){
   const record=groups[id].pop();
   const target=['investment','business','insurance','trust']
    .filter(x=>x!==id&&groups[x].length<11)
    .sort((a,b)=>groups[a].length-groups[b].length)[0];
   assert.ok(target,'Available gallery for overflow case');
   groups[target].push(record);
  }
 const obstacles=[{x:0,z:-14,r:1.44}];
 for(const z of [-23,-3,15])for(const x of [-7.55,7.55])
  obstacles.push({x,z,r:.72});
 for(const room of rooms)for(const z of vault.ribStations(room))
  for(const side of [-1,1])
   obstacles.push({x:vault.columnX(room,side),z,r:.33});
 const exhibits=[];
 for(const [id,records] of Object.entries(groups)){
  const room=layout.ROOM_DEFS.find(x=>x.id===id);
  const slots=layout.exhibitSockets(id);
  assert.ok(slots.length>=records.length,'Exhibit sockets available in '+id);
  records.forEach((record,i)=>{
   const p={x:room.x+slots[i].x,z:room.z+slots[i].z,
    r:.84,name:record.name};
   exhibits.push(p);obstacles.push(p);
  });
 }
 for(const [id,x,z] of [['rotunda',-5,-4.3],['rotunda',5,-4.3],
   ['rotunda',0,5],['archive',-5,-4],['archive',5,-4],
   ['archive',-5,4],['archive',5,4],['rotunda',6,5.1],['rotunda',-6,5.1]]){
  const r=layout.ROOM_DEFS.find(x=>x.id===id);
  obstacles.push({x:r.x+x,z:r.z+z,r:1});
 }
 const movement=nav.createNavigation(floors,obstacles);
 const origin=-62,step=.85,N=148;
 const coord=i=>origin+i*step;
 const grid=x=>Math.max(0,Math.min(N-1,Math.round((x-origin)/step)));
 const start=[grid(layout.ENTRY_POINT.x),grid(layout.ENTRY_POINT.z)];
 assert.ok(movement.walkable(layout.ENTRY_POINT.x,layout.ENTRY_POINT.z));
 const seen=new Set([start.join(',')]),queue=[start];
 const moves=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 for(let k=0;k<queue.length;k++){
  const [i,j]=queue[k];
  for(const [di,dj] of moves){
   const x=i+di,z=j+dj;
   if(x<0||z<0||x>=N||z>=N||!movement.walkable(coord(x),coord(z)))continue;
   if(di&&dj&&(!movement.walkable(coord(i+di),coord(j))||
     !movement.walkable(coord(i),coord(j+dj))))continue;
   const id=x+','+z;
   if(!seen.has(id)){seen.add(id);queue.push([x,z]);}
  }
 }
 assert.ok(seen.size>2000,'Continuous navigable play space');
 for(const room of rooms)
  assert.ok(seen.has(grid(room.x)+','+grid(room.z)),'Connected room '+room.id);
 for(const exhibit of exhibits){
  let close=false;
  for(let radius=1.5;radius<3.3&&!close;radius+=.25)
   for(let k=0;k<32;k++){
    const a=k*Math.PI/16,px=exhibit.x+Math.cos(a)*radius,
     pz=exhibit.z+Math.sin(a)*radius;
    if(movement.walkable(px,pz)&&seen.has(grid(px)+','+grid(pz))){
     close=true;break;
    }
   }
  assert.ok(close,'Exhibit must be reachable: '+exhibit.name);
 }
});

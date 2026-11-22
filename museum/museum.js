import * as THREE from 'three';
import {makeMuseum,ROOM_DEFS} from './world.js?v=unified-vault-bays-20261119';
import {inspectDoorways} from './scene-diagnostics.js';
import {exhibitSockets,ENTRY_POINT} from './layout.js';
import {loadCathedralMaterials} from './materials.js?v=unified-vault-bays-20261119';
import {installCathedralLighting} from './lighting.js?v=unified-vault-bays-20261119';
import {installBakedDaylight} from './daylight.js';
import {createVisitor} from './character.js';
import {installMuseumAssets} from './asset-library.js?v=case-dioramas-20261119';
import {caseIllustrationFor} from './case-dioramas.js?v=case-dioramas-20261119';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/**
 * Sonoma Case Ledger / interactive museum.
 * Data comes from the existing research/case-data.json file.
 * Room geometry, exhibit types, movement and record panels are reusable systems.
 * Full case articles remain ordinary HTML, outside the WebGL experience.
 */
const $=id=>document.getElementById(id);
const UI={
  viewport:$('viewport'),loading:$('loading'),progress:$('loading-progress'),
  gallery:$('gallery-links'),map:$('map-panel'),mapGrid:$('map-grid'),
  mapButton:$('map-button'),search:$('museum-search'),results:$('search-results'),
  count:$('case-count'),asset:$('asset-status'),location:$('location-name'),
  hint:$('location-hint'),notice:$('notice'),dialog:$('exhibit-modal'),
  title:$('exhibit-title'),kicker:$('exhibit-kicker'),body:$('exhibit-content'),
  caseLink:$('case-link'),help:$('help-modal')
};
const MQ=window.matchMedia('(min-width:781px)');
const state={
  cases:[],exhibits:[],gallery:'rotunda',fx:!window.matchMedia('(prefers-reduced-motion:reduce)').matches,
  yaw:0,pitch:.19,zoom:1,cameraMode:'close',waypoints:[],onArrival:null,moving:false,openPanel:false
};
let scene,camera,renderer,world,visitor,clock,noticeTimer,rafId;
let viewTarget=new THREE.Vector3(ENTRY_POINT.x,0,ENTRY_POINT.z);
const cameraCollisionRay=new THREE.Raycaster();
const cameraAnchor=new THREE.Vector3();
const cameraDirection=new THREE.Vector3();
const desiredCamera=new THREE.Vector3();
let cameraEye=new THREE.Vector3();
const heldKeys=new Set();
const interactionPosition=new THREE.Vector3();
let closestExhibit=null;
const cameraDistance=()=>((state.cameraMode==='close')?7.3:12.4)/state.zoom;
const COLOR={gold:0xd1b37b,aqua:0x86d8c9};
const clamp=THREE.MathUtils.clamp;
function element(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=String(text);
  if(cls)e.className=cls;
  return e;
}
function report(message){
  UI.notice.textContent=message;UI.notice.classList.add('show');
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>UI.notice.classList.remove('show'),2900);
}
function loadingProgress(p){UI.progress.style.width=clamp(p,4,100)+'%';}
function linked(url){
  try{const u=new URL(url,window.location.href);return ['https:','http:'].includes(u.protocol)?u.href:null;}
  catch{return null;}
}
function source(title,url){
 const safe=linked(url);
 if(!safe)return null;
 const a=element('a',title);a.href=safe;a.rel='noopener noreferrer';a.target='_blank';return a;
}
function addParagraph(target,value){
 const p=element('p',value);target.append(p);return p;
}
function petros(){
  return {slug:'constantine-petros',name:'Constantine William Petros',era:'2016–2020',
    subject:'Insurance-related proceeding and post-conviction dismissal',
    outcome:'Four counts were dismissed in 2017. The remaining count resulted in a conviction after a no-contest plea, was reduced to a misdemeanor, and was dismissed under Penal Code § 1203.4 on September 17, 2020.',
    details:'The 2020 dismissal was post-conviction relief; it was not an acquittal or a judicial finding of factual innocence. The available docket does not establish time actually served in custody.',
    amount:'No independently established victim-loss amount displayed',
    amountType:'The case page does not equate an alleged insurance claim value with established financial loss.',
    verification:'Public docket reviewed',caseNo:'SCR-715528-1',
    sources:[{label:'Sonoma County Superior Court public case portal',url:'https://sonoma.courts.ca.gov/online-services/case-portal'}],group:'county'};
}
async function getCases(){
  const response=await fetch('../research/case-data.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Research data unavailable (HTTP '+response.status+')');
  const data=await response.json();
  if(!Array.isArray(data.county)||!Array.isArray(data.federal))throw new Error('Invalid research data');
  return [
    ...data.county.map(r=>({...r,group:'county'})),
    ...data.federal.map(r=>({...r,group:'federal'})),
    petros()
  ];
}
function galleryFor(r){
  if(r.group==='federal')return 'federal';
  const s=(r.subject||'').toLowerCase();
  if(s.includes('insurance'))return 'insurance';
  if(/invest|ponzi|pyramid|bank|loan/.test(s))return 'investment';
  if(/nonprofit|association|trust|school|senior|community/.test(s))return 'trust';
  return 'business';
}
function positionsForExhibits(roomId){return exhibitSockets(roomId);}

function populateMuseum(){
  const clusters={investment:[],business:[],insurance:[],trust:[],federal:[]};
  for(const r of state.cases){r.roomId=galleryFor(r);clusters[r.roomId].push(r);}
  // A wing provides 16 reusable display sockets. If one fills, overflow
  // moves to the least-occupied county wing; cases are never dropped.
  for(const category of ['investment','business','insurance','trust']){
    while(clusters[category].length>11){
      const next=clusters[category].pop();
      const free=['investment','business','insurance','trust']
        .filter(id=>id!==category&&clusters[id].length<11)
        .sort((a,b)=>clusters[a].length-clusters[b].length)[0];
      if(!free){clusters[category].push(next);break;}
      clusters[free].push(next);next.roomId=free;
    }
  }
  for(const [roomId,records] of Object.entries(clusters)){
    const socket=positionsForExhibits(roomId);
    records.forEach((r,i)=>{
      const p=socket[i];
      if(!p){console.warn('No available exhibit socket for '+r.name);return;}
      const obj={id:'case:'+r.slug,type:'case',name:r.name,record:r,roomId};
      r.exhibit=obj;
      r.x=world.rooms[roomId].x+p.x;r.z=world.rooms[roomId].z+p.z;
      world.addExhibit(roomId,p.x,p.z,obj,'case',p.yaw||0);
      state.exhibits.push(obj);
    });
  }
  const interactives=[
    ['rotunda',-5,-4.3,'directory','Museum Directory','Browse every gallery and search all case records.','map'],
    ['rotunda',5,-4.3,'timeline','Reading the Record','Follow case events from initial charges through subsequent legal outcomes.','reading'],
    ['rotunda',0,5,'plaque','Welcome to the Ledger','What this archive is for, and how its sources are selected.','about'],
    ['archive',-5,-4,'archive','Research Standards','How court records, government releases and news sources are evaluated.','research'],
    ['archive',5,-4,'timeline','Court Outcomes','Understand pleas, conviction, dismissal and post-conviction relief.','legal'],
    ['archive',-5,4,'directory','Case Directory','Find a name and jump directly to an exhibit.','search'],
    ['archive',5,4,'plaque','Corrections & Updates','How to check current records and flag possible errors.','corrections']
  ];
  for(const [roomId,x,z,type,title,description,action] of interactives){
    world.addExhibit(roomId,x,z,{id:'info:'+action,name:title,title,description,action,roomId,type},type);
  }
  // Arrival portals are a reusable exhibit type, with one in each relevant room.
  world.addExhibit('rotunda',6,5.1,{id:'portal:federal',name:'Federal Gallery Portal',action:'portal',destination:'federal',roomId:'rotunda'},'portal');
  world.addExhibit('rotunda',-6,5.1,{id:'portal:archive',name:'Records Library Portal',action:'portal',destination:'archive',roomId:'rotunda'},'portal');
}
function setupThree(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x252d33);
  scene.fog=new THREE.FogExp2(0x252d33,.0019);
  camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,.1,260);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  // setSize(..., true) writes CSS dimensions in logical pixels; the backing
  // buffer still uses devicePixelRatio. Otherwise the canvas becomes wider
  // than the viewport on high-DPI displays and visually shifts the avatar.
  renderer.setSize(window.innerWidth,window.innerHeight,true);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=MQ.matches;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Architecture is static. Compute the costly directional shadow map once,
  // then reuse it across camera movement and visitor animation.
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=MQ.matches;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=new RoomEnvironment();
  scene.environment=pmrem.fromScene(environment,0.04).texture;
  environment.dispose();pmrem.dispose();
  UI.viewport.append(renderer.domElement);
  installCathedralLighting(scene,renderer,status=>console.info(status));
  world=makeMuseum(scene);
  inspectDoorways(world);
  visitor=createVisitor(scene,status=>UI.asset.textContent=status);
  // The visitor has its own contact shadow; do not bake its silhouette at entry.
  visitor.root.traverse(node=>{if(node.isMesh)node.castShadow=false;});
  visitor.root.position.set(ENTRY_POINT.x,0,ENTRY_POINT.z);
  visitor.root.rotation.y=Math.PI;
  camera.position.set(ENTRY_POINT.x,4.1,ENTRY_POINT.z+6.2);
  camera.lookAt(ENTRY_POINT.x,1.83,ENTRY_POINT.z);
  viewTarget.copy(visitor.root.position);
  clock=new THREE.Clock();
  resize();
  window.addEventListener('resize',resize);
}
function resize(){
 if(!camera||!renderer)return;
 const w=UI.viewport.clientWidth||window.innerWidth;
 const h=UI.viewport.clientHeight||window.innerHeight;
 camera.aspect=w/h;
 camera.fov=w<650?67:60;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h,true);
}
function updateCamera(dt){
 const player=visitor.root.position;
 // Frame the actual visitor immediately. Following a damped tracking point
 // let the character slide toward the side of the screen while moving.
 viewTarget.copy(player);
 cameraAnchor.set(player.x,1.62,player.z);
 const distance=cameraDistance(),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
 desiredCamera.set(
  cameraAnchor.x+Math.sin(state.yaw)*distance*cp,
  cameraAnchor.y+distance*sp,
  cameraAnchor.z+Math.cos(state.yaw)*distance*cp
 );
 cameraDirection.copy(desiredCamera).sub(cameraAnchor);
 const reach=cameraDirection.length();
 cameraDirection.normalize();
 let occluded=false;
 if(world.cameraBlockers?.length){
  cameraCollisionRay.set(cameraAnchor,cameraDirection);
  cameraCollisionRay.near=.13;cameraCollisionRay.far=reach;
  const hits=cameraCollisionRay.intersectObjects(world.cameraBlockers,false);
  if(hits.length&&hits[0].distance<reach){
   // Never enforce a minimum follow distance *through* a wall.
   const safe=Math.max(.20,hits[0].distance-.4);
   desiredCamera.copy(cameraAnchor).addScaledVector(cameraDirection,safe);
   occluded=true;
  }
 }
 // Immediately retract the camera on collision. Smoothing is applied only
 // in free space, preventing wall-crossing and sudden through-stone shots.
 if(occluded)camera.position.copy(desiredCamera);
 else camera.position.lerp(desiredCamera,1-Math.exp(-dt*9));
 // Keep the avatar at horizontal screen centre in every camera mode.
 camera.lookAt(player.x,1.83,player.z);
}

const gridStep=.85;
const gridOrigin=-62;
const gridSize=148;
function gridCoord(x){return clamp(Math.round((x-gridOrigin)/gridStep),0,gridSize-1);}
function worldCoord(i){return gridOrigin+i*gridStep;}
function gridIndex(x,z){return z*gridSize+x;}
const navCache=new Map();
function gridValid(ix,iz){
  if(ix<0||iz<0||ix>=gridSize||iz>=gridSize)return false;
  const key=gridIndex(ix,iz);
  if(!navCache.has(key))navCache.set(key,world.walkable(worldCoord(ix),worldCoord(iz)));
  return navCache.get(key);
}
function nearestCell(x,z){
  const cx=gridCoord(x),cz=gridCoord(z);
  if(gridValid(cx,cz))return [cx,cz];
  for(let rad=1;rad<=9;rad++){
    let best=null,bestDist=Infinity;
    for(let dz=-rad;dz<=rad;dz++)for(let dx=-rad;dx<=rad;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==rad)continue;
      const ix=cx+dx,iz=cz+dz;
      if(gridValid(ix,iz)&&dx*dx+dz*dz<bestDist){best=[ix,iz];bestDist=dx*dx+dz*dz;}
    }
    if(best)return best;
  }
  return null;
}
class Heap{
  constructor(){this.data=[];}
  get length(){return this.data.length;}
  add(item){
    const a=this.data;let i=a.length;a.push(item);
    while(i>0){const p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p;}
    a[i]=item;
  }
  pop(){
    const a=this.data,head=a[0],tail=a.pop();
    if(a.length&&tail){let i=0;while(true){
      let c=i*2+1;if(c>=a.length)break;
      if(c+1<a.length&&a[c+1].f<a[c].f)c++;
      if(tail.f<=a[c].f)break;
      a[i]=a[c];i=c;
    }a[i]=tail;}
    return head;
  }
}
const neighbors=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[-1,-1,1.414],[1,-1,1.414],[-1,1,1.414]];
function findPath(start,goal){
  const a=nearestCell(start.x,start.z),b=nearestCell(goal.x,goal.z);
  if(!a||!b)return null;
  const source=gridIndex(a[0],a[1]),target=gridIndex(b[0],b[1]);
  const heap=new Heap();
  const previous=new Int32Array(gridSize*gridSize).fill(-1);
  const distance=new Float32Array(gridSize*gridSize).fill(Infinity);
  const done=new Uint8Array(gridSize*gridSize);
  const heuristic=(x,z)=>Math.hypot(x-b[0],z-b[1]);
  distance[source]=0;heap.add({index:source,f:heuristic(...a),g:0});
  let found=false;
  while(heap.length){
    const now=heap.pop(),id=now.index;
    if(done[id]||now.g>distance[id]+.0001)continue;
    done[id]=1;if(id===target){found=true;break;}
    const x=id%gridSize,z=(id-x)/gridSize;
    for(const [dx,dz,cost] of neighbors){
      const nx=x+dx,nz=z+dz;
      if(!gridValid(nx,nz))continue;
      if(dx&&dz&&(!gridValid(x+dx,z)||!gridValid(x,z+dz)))continue;
      const next=gridIndex(nx,nz);if(done[next])continue;
      const ng=distance[id]+cost;
      if(ng<distance[next]){
        distance[next]=ng;previous[next]=id;
        heap.add({index:next,g:ng,f:ng+heuristic(nx,nz)});
      }
    }
  }
  if(!found)return null;
  const reversed=[];let at=target,guard=0;
  while(at!==source&&at!==-1&&guard++<12000){
    reversed.push({x:worldCoord(at%gridSize),z:worldCoord(Math.floor(at/gridSize))});
    at=previous[at];
  }
  reversed.reverse();
  // Remove redundant grid nodes when a straight line remains walkable.
  const compact=[],points=[{x:start.x,z:start.z},...reversed];
  function lineClear(p,q){
    const n=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/.32);
    for(let i=1;i<=n;i++){
      const t=i/n;if(!world.walkable(p.x+(q.x-p.x)*t,p.z+(q.z-p.z)*t))return false;
    }
    return true;
  }
  for(let i=1;i<points.length;){
    let end=i;
    for(let j=Math.min(points.length-1,i+9);j>i;j--)if(lineClear(points[i-1],points[j])){end=j;break;}
    compact.push(points[end]);i=end+1;
  }
  const last=compact.at(-1);
  if(last&&lineClear(last,goal))compact.push({x:goal.x,z:goal.z});
  return compact;
}
function stopMovement(){
 state.waypoints=[];state.onArrival=null;state.moving=false;visitor.setWalking(false);
}
function moveTo(point,onArrival){
 const safe=world.nearestWalkable(point.x,point.z);
 if(!safe){report('That area is not accessible.');return false;}
 const path=findPath(visitor.root.position,safe);
 if(!path){report('No clear route found. Choose another location.');return false;}
 state.waypoints=path;state.onArrival=onArrival||null;
 state.moving=path.length>0;visitor.setWalking(state.moving);
 if(!state.moving&&state.onArrival){const fn=state.onArrival;state.onArrival=null;fn();}
 return true;
}
function manualAxes(){
 if(state.openPanel||!UI.map.hidden)return null;
 const active=document.activeElement;
 if(active&&active.matches('input,textarea,select,[contenteditable="true"]'))return null;
 const x=Number(heldKeys.has('KeyD')||heldKeys.has('ArrowRight'))
   -Number(heldKeys.has('KeyA')||heldKeys.has('ArrowLeft'));
 const forward=Number(heldKeys.has('KeyW')||heldKeys.has('ArrowUp'))
   -Number(heldKeys.has('KeyS')||heldKeys.has('ArrowDown'));
 if(!x&&!forward)return null;
 const length=Math.hypot(x,forward);
 return {x:x/length,forward:forward/length};
}
function tickManualMovement(dt,axes){
 // Screen-relative WASD: W travels away from the current camera, D to screen right.
 // Manual movement overrides any click-to-walk route immediately.
 if(state.waypoints.length||state.onArrival){
  state.waypoints=[];state.onArrival=null;state.moving=false;
 }
 const s=Math.sin(state.yaw),c=Math.cos(state.yaw);
 const dx=(axes.x*c-axes.forward*s),dz=(-axes.x*s-axes.forward*c);
 const distance=Math.min(.05,dt)*6.6;
 const steps=Math.max(1,Math.ceil(distance/.085));
 let moved=false;
 for(let i=0;i<steps;i++){
  const sx=dx*distance/steps,sz=dz*distance/steps;
  const x=visitor.root.position.x,z=visitor.root.position.z;
  if(world.canMove(x,z,x+sx,z+sz)){visitor.root.position.x+=sx;visitor.root.position.z+=sz;moved=true;}
  else if(world.canMove(x,z,x+sx,z)){visitor.root.position.x+=sx;moved=true;}
  else if(world.canMove(x,z,x,z+sz)){visitor.root.position.z+=sz;moved=true;}
 }
 if(moved){
  const wanted=Math.atan2(dx,dz);
  visitor.root.rotation.y+=Math.atan2(Math.sin(wanted-visitor.root.rotation.y),Math.cos(wanted-visitor.root.rotation.y))*Math.min(1,dt*13);
 }
 visitor.setWalking(moved);
}
function closestInteraction(){
 const here=visitor.root.position;
 let found=null,best=2.9;
 for(const mesh of world.interactives){
  mesh.getWorldPosition(interactionPosition);
  const dist=Math.hypot(interactionPosition.x-here.x,interactionPosition.z-here.z);
  if(dist<best){best=dist;found=mesh.userData.action;}
 }
 return found;
}
function refreshInteraction(){
 if(state.openPanel){$('interact-hint').hidden=true;return;}
 closestExhibit=closestInteraction();
 const prompt=$('interact-hint');
 prompt.hidden=!closestExhibit;
 if(closestExhibit)$('interact-label').textContent=closestExhibit.name;
}
function interactNearby(){
 if(state.openPanel||!UI.map.hidden)return;
 const target=closestInteraction();
 if(target)openExhibit(target);
 else report('Walk closer to an exhibit to interact.');
}
function tickControls(dt){
 const axes=manualAxes();
 if(axes){tickManualMovement(dt,axes);}
 else{
  tickMovement(dt);
  if(!state.waypoints.length)visitor.setWalking(false);
 }
}

function tickMovement(dt){
 if(!state.waypoints.length){if(state.moving){state.moving=false;visitor.setWalking(false);}return;}
 let remaining=Math.min(.06,dt)*7.2;
 while(remaining>0&&state.waypoints.length){
  const target=state.waypoints[0];
  const dx=target.x-visitor.root.position.x,dz=target.z-visitor.root.position.z;
  const distance=Math.hypot(dx,dz);
  if(distance<.045){state.waypoints.shift();continue;}
  const step=Math.min(remaining,distance);
  const nx=visitor.root.position.x+dx/distance*step;
  const nz=visitor.root.position.z+dz/distance*step;
  if(!world.canMove(visitor.root.position.x,visitor.root.position.z,nx,nz)){
   stopMovement();
   report('Path interrupted by a wall. Choose another route.');
   return;
  }
  visitor.root.position.x=nx;
  visitor.root.position.z=nz;
  const wanted=Math.atan2(dx,dz);
  visitor.root.rotation.y+=Math.atan2(Math.sin(wanted-visitor.root.rotation.y),Math.cos(wanted-visitor.root.rotation.y))*Math.min(1,dt*12);
  remaining-=step;
  if(step>=distance-.01)state.waypoints.shift();
 }
 if(!state.waypoints.length){state.moving=false;visitor.setWalking(false);const fn=state.onArrival;state.onArrival=null;if(fn)fn();}
}
function nearestApproach(x,z){
 const me=visitor.root.position;
 const candidates=[];
 for(let radius=1.6;radius<=2.75;radius+=.45)for(let t=0;t<12;t++){
  const angle=t/12*Math.PI*2;const px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
  if(world.walkable(px,pz))candidates.push({x:px,z:pz,dist:Math.hypot(px-me.x,pz-me.z)});
 }
 candidates.sort((a,b)=>a.dist-b.dist);
 return candidates[0]||world.nearestWalkable(x+1.7,z);
}
function approach(action){
 const target=world.interactives.find(x=>x.userData.action.id===action.id);
 if(!target){report('Exhibit is not ready.');return;}
 const pos=new THREE.Vector3();target.getWorldPosition(pos);
 const destination=nearestApproach(pos.x,pos.z);
 if(!destination)return report('The exhibit is inaccessible.');
 if(moveTo(destination,()=>openExhibit(action)))report('Walking to '+action.name+'…');
}
function roomTarget(id){
 const r=world.rooms[id];if(!r)return null;
 const candidates=[
  {x:r.x,z:r.z},{x:r.x,z:r.z+3.4},{x:r.x+3.4,z:r.z},
  {x:r.x,z:r.z-3.4},{x:r.x-3.4,z:r.z}
 ];
 return candidates.find(p=>world.walkable(p.x,p.z))||world.nearestWalkable(r.x,r.z);
}
function setActiveRoom(roomId){
 if(roomId===state.gallery)return;
 state.gallery=roomId;
 const r=world.rooms[roomId];
 UI.location.textContent=r?.name||'The Ledger Museum';
 for(const b of UI.gallery.querySelectorAll('button'))b.classList.toggle('active',b.dataset.room===roomId);
 for(const b of UI.mapGrid.querySelectorAll('button'))b.classList.toggle('active',b.dataset.room===roomId);
}
function visitRoom(id){
 const r=world.rooms[id],goal=roomTarget(id);
 if(!r||!goal)return;
 closeModal();
 UI.map.hidden=true;UI.mapButton.setAttribute('aria-expanded','false');
 if(moveTo(goal,()=>setActiveRoom(id)))report('Traveling to '+r.name+'…');
}
function caseHref(r){return r.group==='federal'?'../federal/'+encodeURIComponent(r.slug)+'/':'../cases/'+encodeURIComponent(r.slug)+'/';}
function infoRow(container,label,value){
 const div=element('div',undefined,'factline');
 div.append(element('small',label),element('span',value));
 container.append(div);
}
function openCase(r){
 const root=UI.body;root.replaceChildren();
 UI.kicker.textContent=r.group==='federal'?'FEDERAL CASE RECORD':'SONOMA COUNTY CASE FILE';
 UI.title.textContent=r.name;
 infoRow(root,'Reported period',r.era||'Not specified');
 infoRow(root,'Source grade',r.verification||'Status not supplied');
 if(r.group==='county')infoRow(root,'Sonoma court number',r.caseNo||'Not yet independently confirmed');
 else infoRow(root,'Jurisdiction','Federal court (no Sonoma court number)');
 addParagraph(root,'Source grades classify sources, not exhaustive docket reviews. Last documented source review: '+(r.courtRecordReviewedOn?'November 19, 2026':'November 18, 2026')+'.');
 addParagraph(root,r.courtRecordStatus||(r.slug==='constantine-petros'
  ? 'A Sonoma case-detail docket export was reviewed, but it is not hosted here. Check the court for later orders.'
  : 'The full trial-court docket has not been independently reviewed. Refer to the case page for docket-number status.'));
 root.append(element('h3','Documented outcome'));
 addParagraph(root,r.outcome||'Read the full source-backed case page.');
 root.append(element('h3','Context and limitations'));
 addParagraph(root,r.details||'Consult the source documents for context.');
 const illustration=caseIllustrationFor(r.slug);
 if(illustration){
  root.append(element('h3','Illustrative 3D exhibit'));
  addParagraph(root,illustration.description+'. This is an artistic reconstruction, not an object or document from the legal case.');
 }
 if(r.amount&&r.amount!=='Not quantified here'){
  root.append(element('h3','Financial figure'));
  addParagraph(root,r.amount+' — '+(r.amountType||'See cited records')+'. Different case amounts may represent different measures.');
 }
 if(Array.isArray(r.sources)&&r.sources.length){
  root.append(element('h3','Supporting sources'));
  const list=element('ul');
  for(const s of r.sources){
   const anchor=source(s.label||'Source document',s.url);
   if(anchor){const li=element('li');li.append(anchor);list.append(li);}
  }
  root.append(list);
 }
 const disclaimer=element('p','This summary is based on the cited sources. A sentence is not proof of actual time served, and subsequent court decisions may not be reflected.');
 disclaimer.style.color='#b7c8c4';root.append(disclaimer);
 UI.caseLink.href=caseHref(r);UI.caseLink.textContent='Read complete case page ↗';UI.caseLink.hidden=false;
 showDialog(UI.dialog);
}
function openInfo(a){
 const root=UI.body;root.replaceChildren();
 UI.title.textContent=a.title||a.name;UI.kicker.textContent='MUSEUM INFORMATION';
 const para=t=>addParagraph(root,t);
 if(a.action==='reading'){
  para('A criminal case is a sequence of legal events. Initial allegations may change through pleas, verdicts, dismissals, later orders and appeal.');
  root.append(element('h3','What to look for'));
  const ul=element('ul');
  ['Original filing and alleged charges','Plea or verdict and conviction history','Sentences, where ordered','Appeals, reductions, dismissals or post-conviction relief'].forEach(s=>ul.append(element('li',s)));
  root.append(ul);
  para('Every exhibit links to its case page and the best available sources. A dismissal under California Penal Code § 1203.4 does not by itself establish acquittal.');
  UI.caseLink.href='../#method';UI.caseLink.textContent='Read research standards ↗';
 }else if(a.action==='research'){
  para('Cases were selected for documentary value and Sonoma County relevance, not ranked by amount or severity. The county catalog is not an exhaustive list of all prosecutions.');
  para('Evidence A primarily uses government or court materials; A/B combines official documents and reporting; B relies on published reporting where complete trial-court dockets were not independently checked.');
  para('Financial values may describe restitution, alleged scheme value, regulator-reported loss or an attempted loan. They are not directly comparable.');
  UI.caseLink.href='https://github.com/ColinDMcIntyre/sonomacaseledger/blob/main/research/README.md';UI.caseLink.textContent='Open research notes ↗';
 }else if(a.action==='legal'){
  para('Guilty pleas, no-contest pleas, convictions, acquittals, dismissal before conviction, and post-conviction dismissal have different legal meanings.');
  para('A post-conviction dismissal under California Penal Code § 1203.4 is not an acquittal, a declaration of innocence or erasure of the historical plea and conviction.');
  para('Reported sentences should not be confused with the time an individual actually served. Consult the applicable court for current certified records.');
  UI.caseLink.href='../cases/constantine-petros/';UI.caseLink.textContent='See a documented example ↗';
 }else if(a.action==='corrections'){
  para('A public case record can change. If a linked source is missing, an article misstates a plea or conviction, or a later court order changes a disposition, the relevant page should be corrected with a dated source.');
  para('The repository provides a public issue tracker for documented corrections. Do not post private identifiers or confidential court records.');
  UI.caseLink.href='../corrections/';UI.caseLink.textContent='Corrections and source submissions ↗';
 }else if(a.action==='about'){
  para('Sonoma Case Ledger exists to make the full histories of selected Sonoma County criminal cases easier to understand, particularly how outcomes can differ from initial reports.');
  para('The collection is privately developed, not operated by any court or government agency. Its developer has also worked on Constantine Petros’s personal website.');
  para('This museum is an interactive way to explore case summaries; the ordinary HTML pages remain the authoritative reading experience for this publication.');
  UI.caseLink.href='../#about';UI.caseLink.textContent='About the publication ↗';
 }else {
  para(a.description||'Use the directory to explore the archives.');
  UI.caseLink.href='../cases/';UI.caseLink.textContent='Open text archive ↗';
 }
 UI.caseLink.hidden=false;showDialog(UI.dialog);
}
function openExhibit(a){
 if(a.type==='case'&&a.record)return openCase(a.record);
 switch(a.action){
  case 'portal':visitRoom(a.destination);break;
  case 'map':UI.map.hidden=false;UI.mapButton.setAttribute('aria-expanded','true');break;
  case 'search':UI.search.focus();report('Search the collection by name or subject.');break;
  default:openInfo(a);break;
 }
}
function showDialog(modal){
 state.openPanel=true;stopMovement();
 modal.hidden=false;
 modal.querySelector('[aria-label^="Close"]')?.focus();
}
function closeModal(){
 UI.dialog.hidden=true;UI.help.hidden=true;state.openPanel=false;
}
function setupDirectory(){
 for(const r of ROOM_DEFS){
  const b=element('button');b.type='button';b.className='gallery-link';b.dataset.room=r.id;
  b.append(element('span',r.icon,'icon'),element('span',r.short,'gallery-text'));
  b.append(element('small',r.role==='cases'?String(state.cases.filter(c=>c.roomId===r.id).length)+' cases':r.role==='hub'?'Welcome':'Guides'));
  b.addEventListener('click',()=>visitRoom(r.id));UI.gallery.append(b);
  const m=element('button',r.short);m.type='button';m.dataset.room=r.id;
  m.addEventListener('click',()=>visitRoom(r.id));UI.mapGrid.append(m);
 }
 state.gallery='none';setActiveRoom('rotunda');
 UI.count.textContent=state.cases.length+' case files • '+ROOM_DEFS.length+' rooms';
}
function searchCases(){
 const q=UI.search.value.trim().toLowerCase();
 UI.results.replaceChildren();
 if(!q){UI.results.append(element('div','Search the 37 case exhibits by name or topic.','search-empty'));return;}
 const results=state.cases
  .filter(c=>(c.name+' '+c.subject+' '+c.era+' '+c.outcome).toLowerCase().includes(q))
  .slice(0,14);
 if(!results.length){UI.results.append(element('div','No matching case found. Try another term.','search-empty'));return;}
 for(const r of results){
  const b=element('button',undefined,'search-result');b.type='button';
  b.append(element('span',r.name),element('small',world.rooms[r.roomId].short+' · '+r.era));
  b.addEventListener('click',()=>{UI.search.blur();approach(r.exhibit);});
  UI.results.append(b);
 }
}
function setupUI(){
 setupDirectory();
 const directory=$('directory-panel'),toggle=$('directory-toggle');
 function setDirectory(open){
  directory.classList.toggle('is-collapsed',!open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Hide directory':'Cases & search';
 }
 setDirectory(false);
 toggle.addEventListener('click',()=>setDirectory(directory.classList.contains('is-collapsed')));
 UI.search.addEventListener('input',searchCases);searchCases();
 UI.mapButton.addEventListener('click',()=>{
  UI.map.hidden=!UI.map.hidden;UI.mapButton.setAttribute('aria-expanded',String(!UI.map.hidden));
 });
 $('map-close').addEventListener('click',()=>{UI.map.hidden=true;UI.mapButton.setAttribute('aria-expanded','false');});
 $('help-button').addEventListener('click',()=>showDialog(UI.help));
 $('help-close').addEventListener('click',closeModal);
 $('help-backdrop').addEventListener('click',closeModal);
 $('exhibit-close').addEventListener('click',closeModal);
 $('exhibit-back').addEventListener('click',closeModal);
 $('modal-backdrop').addEventListener('click',closeModal);
 $('zoom-in').addEventListener('click',()=>{state.zoom=clamp(state.zoom*1.22,.65,2);resize();});
 $('zoom-out').addEventListener('click',()=>{state.zoom=clamp(state.zoom/1.22,.65,2);resize();});
 $('reset-camera').addEventListener('click',()=>{
  state.yaw=0;state.pitch=.19;state.zoom=1;state.cameraMode='close';
  $('view-button').textContent='Follow';resize();report('Third-person camera reset.');
 });
 $('view-button').addEventListener('click',()=>{
  state.cameraMode=state.cameraMode==='close'?'overview':'close';
  $('view-button').textContent=state.cameraMode==='close'?'Follow':'Wide';
  resize();report(state.cameraMode==='close'?'Third-person follow camera':'Wider third-person view');
 });
 $('interact-button').addEventListener('click',interactNearby);
 $('graphics-button').addEventListener('click',()=>{
  state.fx=!state.fx;$('graphics-button').classList.toggle('selected',state.fx);
  report(state.fx?'Ambient exhibit animations enabled.':'Ambient exhibit animations paused.');
 });
 $('graphics-button').classList.toggle('selected',state.fx);
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
   closeModal();UI.map.hidden=true;UI.mapButton.setAttribute('aria-expanded','false');
   setDirectory(false);heldKeys.clear();return;
  }
  const active=document.activeElement;
  if(active&&active.matches('input,textarea,select,[contenteditable="true"]'))return;
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  if(movementKeys.includes(e.code)){
   e.preventDefault();heldKeys.add(e.code);return;
  }
  if(e.code==='KeyE'&&!e.repeat&&!state.openPanel){e.preventDefault();interactNearby();}
  if(e.code==='KeyF'&&!e.repeat&&!state.openPanel){
   e.preventDefault();setDirectory(true);UI.search.focus();
  }
 });
 window.addEventListener('keyup',e=>heldKeys.delete(e.code));
 window.addEventListener('blur',()=>{heldKeys.clear();visitor.setWalking(false);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)heldKeys.clear();});
 window.addEventListener('hashchange',routeHash);
}
function routeHash(){
 const hash=new URLSearchParams(location.hash.slice(1));
 if(hash.has('case')){
  const r=state.cases.find(c=>c.slug===hash.get('case'));
  if(r)approach(r.exhibit);
 }else if(hash.has('room')&&world.rooms[hash.get('room')])visitRoom(hash.get('room'));
}
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
function pickAt(clientX,clientY){
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set(((clientX-rect.left)/rect.width)*2-1,
  -((clientY-rect.top)/rect.height)*2+1);
 raycaster.setFromCamera(pointer,camera);
 const selected=raycaster.intersectObjects(world.interactives,false)[0];
 const ground=raycaster.intersectObjects(world.floors,false)[0];
 const wall=raycaster.intersectObjects(world.cameraBlockers||[],false)[0];
 // Basic game rule: no clicking/interacting through opaque architecture.
 if(selected&&(!wall||wall.distance>selected.distance+.04)
  &&(!ground||selected.distance<ground.distance+.14))
  return {type:'exhibit',record:selected.object.userData.action};
 if(ground&&(!wall||wall.distance>ground.distance+.04))
  return {type:'floor',point:ground.point};
 return null;
}

function setupPointer(){
 const canvas=renderer.domElement;
 let active=null,moved=false,startDistance=null;
 const fingers=new Map();
 canvas.addEventListener('pointerdown',e=>{
  if(state.openPanel)return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  canvas.setPointerCapture?.(e.pointerId);
  if(fingers.size===1){active={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch,time:performance.now()};moved=false;}
  else {const v=[...fingers.values()];startDistance=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);moved=true;}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!fingers.has(e.pointerId)||state.openPanel)return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(fingers.size===2){
   const v=[...fingers.values()];
   const d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
   if(startDistance&&d>10){state.zoom=clamp(state.zoom*d/startDistance,.65,2.1);resize();}
   startDistance=d;return;
  }
  if(!active)return;
  const delta=e.clientX-active.x,dy=e.clientY-active.y;
  if(Math.hypot(delta,dy)>7)moved=true;
  if(moved){state.yaw=active.yaw-delta*.006;state.pitch=clamp(active.pitch+dy*.0028,.08,.57);}
 });
 function end(e){
  const had=fingers.has(e.pointerId);fingers.delete(e.pointerId);
  if(!had)return;
  if(fingers.size===0){
   if(active&&!moved&&!state.openPanel){
    const picked=pickAt(e.clientX,e.clientY);
    if(picked?.type==='exhibit')approach(picked.record);
    else if(picked?.type==='floor')moveTo(picked.point);
   }
   active=null;startDistance=null;moved=false;
  }else moved=true;
 }
 canvas.addEventListener('pointerup',end);
 canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();state.zoom=clamp(state.zoom*(e.deltaY>0?.91:1.1),.65,2.1);resize();
 },{passive:false});
}
function animate(){
 rafId=requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.065);
 if(!state.openPanel){
  tickControls(dt);
  const active=world.roomAt(visitor.root.position.x,visitor.root.position.z);
  if(active.id!==state.gallery)setActiveRoom(active.id);
 }
 visitor.tick(dt,clock.elapsedTime);
 refreshInteraction();
 updateCamera(dt);
 world.update(clock.elapsedTime,dt,state.fx,camera);
 renderer.render(scene,camera);
}
async function main(){
 try{
  loadingProgress(16);
  setupThree();
  loadingProgress(38);
  state.cases=await getCases();
  populateMuseum();
   const daylight=installBakedDaylight(world,scene,{beams:MQ.matches});
   console.info('Static museum light:',daylight.pools+' stained-glass pools, '+daylight.shafts+' sun-shaft planes');
  loadingProgress(77);
  setupUI();setupPointer();
  // Opt-in local rig preview: the proprietary FBX and textures stay on the
  // visitor's own device and never become public GitHub Pages assets.
  // Normally omitted completely; no FBXLoader network cost for visitors.
  if(new URLSearchParams(window.location.search).has('private-character')){
   import('./private-renderpeople-preview.js')
    .then(({enablePrivateCharacterPreview})=>enablePrivateCharacterPreview({
      getVisitor:()=>visitor,controls:document.querySelector('.hud-top-actions'),report
    }))
    .catch(error=>console.warn('Private model preview unavailable:',error));
  }
  loadCathedralMaterials(status=>console.info(status))
    .catch(error=>console.warn('PBR loading:',error));
  // Install free third-party furniture only when the locally hosted model
  // files are present. Case content and collision remain usable otherwise.
  installMuseumAssets(world, status=>{UI.asset.textContent=status;})
    .then(()=>{
      // Imported chairs/cabinets can change obstacles; recompute any cached
      // navigation cells after optional furniture finishes loading.
      navCache.clear();
       // Include newly loaded static furnishings in the frozen atlas.
       if(renderer.shadowMap.enabled)renderer.shadowMap.needsUpdate=true;
    })
    .catch(error=>console.warn('Optional museum assets:',error));
  clock.start();animate();
  // Enhance the avatar only after rendering the playable museum. The import
  // process makes the CC0 model available in the local manifest when approved.
  // Conserve data and GPU memory on phones, tablets and slower connections.
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const roomyDisplay=window.matchMedia('(min-width: 1000px) and (pointer: fine)').matches;
  const limitedNetwork=connection?.saveData||/^(slow-2g|2g|3g)$/.test(connection?.effectiveType||'');
  if(roomyDisplay&&!limitedNetwork){
   window.setTimeout(()=>visitor.upgradeToHighDetail().catch(
    error=>console.warn('High-detail avatar fallback:',error)
   ),1400);
  }
  loadingProgress(100);
  setTimeout(()=>{UI.loading.classList.add('done');setTimeout(()=>UI.loading.remove(),800);},450);
  routeHash();
 }catch(error){
  console.error('Museum loading error:',error);
  const info=UI.loading.querySelector('p');
  if(info)info.textContent='The 3D museum could not start: '+error.message;
  const fallback=UI.loading.querySelector('a');
  if(fallback)fallback.textContent='Open the case archive instead ↗';
 }
}
main();

import {ROOM_DEFS,VESTIBULE,PORTALS} from './layout.js';

/**
 * Explicit horizontal collision independent of visual GLB geometry.
 * Rendering and game rules use the same portal positions. Decorative meshes
 * can't silently turn doors into invisible walls or vice versa.
 */
const ROOMS=[...ROOM_DEFS,VESTIBULE];
export const PLAYER_RADIUS=.43;
export function isPortalAt(axis,value,at,clearance=PLAYER_RADIUS){
 return PORTALS.some(p=>
  p.axis===axis&&Math.abs(p.value-value)<.06
  &&Math.abs(at-p.at)<p.width/2-clearance
 );
}
export function wallClear(x,z,clearance=PLAYER_RADIUS){
 for(const room of ROOMS){
  if(Math.abs(z-room.z)<room.d/2+.03){
   for(const sign of [-1,1]){
    const boundary=room.x+sign*room.w/2;
    if(Math.abs(x-boundary)<clearance
      &&!isPortalAt('x',boundary,z,clearance))return false;
   }
  }
  if(Math.abs(x-room.x)<room.w/2+.03){
   for(const sign of [-1,1]){
    const boundary=room.z+sign*room.d/2;
    if(Math.abs(z-boundary)<clearance
      &&!isPortalAt('z',boundary,x,clearance))return false;
   }
  }
 }
 return true;
}
export function createNavigation(floorRects,obstacles){
 function walkable(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const onFloor=floorRects.some(r=>
   Math.abs(x-r.x)<=r.w/2-.065&&Math.abs(z-r.z)<=r.d/2-.065);
  return onFloor&&wallClear(x,z)
   &&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+PLAYER_RADIUS);
 }
 function canMove(x,z,x2,z2){
  const distance=Math.hypot(x2-x,z2-z);
  if(!Number.isFinite(distance))return false;
  const steps=Math.max(1,Math.ceil(distance/.16));
  for(let i=1;i<=steps;i++){
   const t=i/steps;
   if(!walkable(x+(x2-x)*t,z+(z2-z)*t))return false;
  }
  return true;
 }
 function nearestWalkable(x,z){
  if(walkable(x,z))return {x,y:0,z};
  for(let radius=.3;radius<=9.2;radius+=.4)
   for(let i=0;i<48;i++){
    const a=i*Math.PI/24,xx=x+Math.cos(a)*radius,zz=z+Math.sin(a)*radius;
    if(walkable(xx,zz))return {x:xx,y:0,z:zz};
   }
  return null;
 }
 return {walkable,canMove,nearestWalkable};
}

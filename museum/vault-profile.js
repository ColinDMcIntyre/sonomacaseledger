/**
 * Shared cathedral construction dimensions. Stone gables, plaster vaults,
 * ribs and pilasters all derive from one profile. No Three.js dependency.
 */
export const WALL_THICKNESS=.48;
export const VAULT_SEGMENTS=64;
export function vaultProfile(room){
 const rise=room.id==='rotunda'?3.3:room.id==='federal'?2.6:
  room.id==='vestibule'?1.55:room.id==='archive'?1.85:2.15;
 return {
  roomId:room.id,centerX:room.x,centerZ:room.z,
  spring:room.height,rise,
  halfSpan:room.w/2-WALL_THICKNESS/2,
  halfDepth:room.d/2-WALL_THICKNESS/2,
  apex:room.height+rise
 };
}
export function vaultY(profile,x){
 const t=Math.max(-1,Math.min(1,(x-profile.centerX)/profile.halfSpan));
 return profile.spring+profile.rise*Math.sqrt(Math.max(0,1-t*t));
}
export function vaultSample(profile,index,segments=VAULT_SEGMENTS){
 const i=Math.max(0,Math.min(segments,index));
 const x=profile.centerX+profile.halfSpan*(-1+2*i/segments);
 return {x,y:vaultY(profile,x)};
}
export function ribStations(room){
 if(room.id==='rotunda')return Array.from({length:8},(_,i)=>
  room.z-room.d/2+(i+.5)*room.d/8);
 if(['investment','business','insurance','trust','archive'].includes(room.id)){
  const usable=room.d/2-.65;
  return [-.77,-.35,.35,.77].map(t=>room.z+t*usable);
 }
 const count=room.id==='vestibule'?2:4;
 return Array.from({length:count},(_,i)=>
  room.z-room.d/2+(i+.5)*room.d/count);
}
export function columnX(room,side){
 const profile=vaultProfile(room);
 return profile.centerX+side*(profile.halfSpan-.26);
}
export function gableSamples(room){
 const profile=vaultProfile(room);
 return Array.from({length:VAULT_SEGMENTS+1},(_,i)=>vaultSample(profile,i));
}

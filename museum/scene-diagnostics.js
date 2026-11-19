import * as THREE from 'three';
import {PORTALS} from './layout.js';

/**
 * Runtime level validation. These raycasts test the rendered stone solids,
 * not just the navigation map, at visitor height through every arched door.
 * This catches sealed apertures and overlapping decorative meshes when the
 * game is opened on a real device.
 */
export function inspectDoorways(world){
 const errors=[];
 world.group.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 for(const p of PORTALS){
  const start=p.axis==='x'
   ?new THREE.Vector3(p.value-1.25,1.68,p.at)
   :new THREE.Vector3(p.at,1.68,p.value-1.25);
  const end=p.axis==='x'
   ?new THREE.Vector3(p.value+1.25,1.68,p.at)
   :new THREE.Vector3(p.at,1.68,p.value+1.25);
  const distance=start.distanceTo(end);
  const direction=end.clone().sub(start).normalize();
  ray.set(start,direction);
  ray.near=.02;ray.far=distance;
  const hits=ray.intersectObjects(world.cameraBlockers,false);
  const valid=world.canMove(start.x,start.z,end.x,end.z);
  if(hits.length||!valid)errors.push({
   doorway:p.a+' → '+p.b,
   blockedGeometry:hits.length>0,
   blockedNavigation:!valid,
   stoneDistance:hits.length?Number(hits[0].distance.toFixed(2)):null
  });
 }
 if(errors.length)console.error('[Museum level validation] Door failure:',errors);
 else console.info('[Museum level validation] All '+PORTALS.length+' doorway crossings open at visitor height');
 return errors;
}

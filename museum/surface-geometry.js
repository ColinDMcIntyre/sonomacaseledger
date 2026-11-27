import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const surfacePolishEnabled=()=>{
 const options=new URLSearchParams(globalThis.location?.search||'');
 return options.get('realism')!=='0'&&options.get('surface')!=='0'&&options.get('quality')!=='low';
};
export function wornRadius(w,h,d,kind,seed=0){
 const shortest=Math.min(w,h,d);
 if(!Number.isFinite(shortest)||shortest<.055)return 0;
 const n=Math.sin(seed*12.9898+78.233)*43758.5453;
 const variant=n-Math.floor(n);
 const nominal=kind==='wood'?.012:.027;
 return Math.min(shortest*.15,nominal*(.8+.4*variant));
}
// Selective one-segment bevel, kept inside the original bounding box. This
// catches physical highlights at manufactured edges without displacing walls.
export function wornBox(w,h,d,kind,seed=0){
 const radius=surfacePolishEnabled()?wornRadius(w,h,d,kind,seed):0;
 return radius>0?new RoundedBoxGeometry(w,h,d,1,radius):new THREE.BoxGeometry(w,h,d);
}

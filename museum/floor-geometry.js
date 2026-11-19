/**
 * Non-overlapping rectangular corridor surfaces, for a single floor layer.
 * Collision uses the same room/corridor footprint in navigation.js.
 * Coordinates are X/Z centers with positive width/depth.
 */
const EPS=1e-5;
const extent=r=>({
 left:r.x-r.w/2,right:r.x+r.w/2,
 near:r.z-r.d/2,far:r.z+r.d/2
});
const fromBounds=(left,right,near,far)=>{
 if(right-left<EPS||far-near<EPS)return null;
 return {x:(left+right)/2,z:(near+far)/2,w:right-left,d:far-near};
};
export function rectOverlapArea(a,b){
 const A=extent(a),B=extent(b);
 return Math.max(0,Math.min(A.right,B.right)-Math.max(A.left,B.left))
  *Math.max(0,Math.min(A.far,B.far)-Math.max(A.near,B.near));
}
export function subtractRectangle(a,b){
 const A=extent(a),B=extent(b),
  x0=Math.max(A.left,B.left),x1=Math.min(A.right,B.right),
  z0=Math.max(A.near,B.near),z1=Math.min(A.far,B.far);
 if(x1-x0<=EPS||z1-z0<=EPS)return [a];
 const out=[
  fromBounds(A.left,x0,A.near,A.far),
  fromBounds(x1,A.right,A.near,A.far),
  fromBounds(x0,x1,A.near,z0),
  fromBounds(x0,x1,z1,A.far)
 ];
 return out.filter(Boolean);
}
export function visibleCorridorSections(rooms,hallways){
 const occupied=[...rooms],visible=[];
 for(const hall of hallways){
  let remaining=[hall];
  for(const footprint of [...occupied,...visible]){
   remaining=remaining.flatMap(piece=>subtractRectangle(piece,footprint));
   if(!remaining.length)break;
  }
  for(const piece of remaining){
   visible.push(piece);
  }
 }
 return visible;
}

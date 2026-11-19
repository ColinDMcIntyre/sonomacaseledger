/**
 * Cathedral Museum: single connected basilica plan.
 * Y up, north = negative Z. Public case categories stay in their old IDs.
 * No mesh geometry or rendering dependencies here.
 */
export const ROOM_DEFS=[
 {id:'rotunda',name:'The Grand Nave',short:'Grand Nave',icon:'⌂',x:0,z:0,w:20,d:60,doors:['n','s','e','w'],color:0x738677,role:'hub',height:11.2},
 {id:'investment',name:'Investment & Banking Chapel',short:'Investment',icon:'◇',x:-21,z:-15,w:22,d:22,doors:['e'],color:0x658374,role:'cases',height:8.6},
 {id:'business',name:'Business & Property Chapel',short:'Business',icon:'▤',x:21,z:-15,w:22,d:22,doors:['w'],color:0x947c61,role:'cases',height:8.6},
 {id:'insurance',name:'Insurance & Finance Chapel',short:'Insurance',icon:'◈',x:-21,z:15,w:22,d:22,doors:['e'],color:0x6f8792,role:'cases',height:8.6},
 {id:'trust',name:'Public Trust Chapel',short:'Public Trust',icon:'✧',x:21,z:15,w:22,d:22,doors:['w'],color:0x82758b,role:'cases',height:8.6},
 {id:'federal',name:'Federal Cases Apse',short:'Federal Apse',icon:'⚖',x:0,z:-42,w:20,d:24,doors:['s'],color:0x698397,role:'cases',height:10.1},
 {id:'archive',name:'The Records Library',short:'Records Library',icon:'▥',x:22,z:38,w:22,d:18,doors:['w'],color:0x987953,role:'library',height:7.7}
];
// The vestibule is a circulation zone, not an eighth case wing.
export const VESTIBULE={id:'vestibule',name:'Entrance Vestibule',x:0,z:37,w:14,d:14,doors:['n','e','s'],height:7.7};
export const HALLWAYS=[
 {x:-10,z:-15,w:3.1,d:5.9},
 {x:10,z:-15,w:3.1,d:5.9},
 {x:-10,z:15,w:3.1,d:5.9},
 {x:10,z:15,w:3.1,d:5.9},
 {x:0,z:-30,w:6.2,d:3.1},
 {x:0,z:30,w:6.2,d:3.1},
 {x:9,z:38,w:6,d:5.8}
];
export const ENTRY_POINT={x:0,z:38.5};
// The world uses only these actual apertures, not the door flags alone.
export const PORTALS=[
 {a:'rotunda',b:'investment',axis:'x',value:-10,at:-15,width:5.9},
 {a:'rotunda',b:'business',axis:'x',value:10,at:-15,width:5.9},
 {a:'rotunda',b:'insurance',axis:'x',value:-10,at:15,width:5.9},
 {a:'rotunda',b:'trust',axis:'x',value:10,at:15,width:5.9},
 {a:'rotunda',b:'federal',axis:'z',value:-30,at:0,width:6.2},
 {a:'rotunda',b:'vestibule',axis:'z',value:30,at:0,width:6.2},
 {a:'vestibule',b:'archive',axis:'x',value:7,at:38,width:5.8},
 {a:'archive',b:'vestibule',axis:'x',value:11,at:38,width:5.8}
];
export function portalAt(room,dir){
 const side=dir==='w'?'x-':dir==='e'?'x+':dir==='n'?'z-':'z+';
 const coord=side==='x-'?room.x-room.w/2:side==='x+'?room.x+room.w/2:side==='z-'?room.z-room.d/2:room.z+room.d/2;
 const axis=side[0],other=(dir==='w'||dir==='e')?room.z:room.x;
 return PORTALS.find(p=>
  (p.a===room.id||p.b===room.id)&&p.axis===axis&&Math.abs(p.value-coord)<.06
  &&Math.abs(p.at-other)<=Math.max(room.w,room.d)/2
 )||null;
}
export function exhibitSockets(roomId){
 if(roomId==='federal'){
  return [-7.4,0,7.4].flatMap(z=>[-6.9,6.9].map(x=>({x,z,yaw:x>0?-90:90})));
 }
 const room=ROOM_DEFS.find(r=>r.id===roomId);
 if(!room)return[];
 const outside=room.x<0?-1:1;
 const farX=outside*7.55;
 const outer=[-7.3,0,7.3,-3.65,3.65].map(z=>({x:farX,z,yaw:outside<0?90:-90}));
 const side=[];
 for(const z of [-7.55,7.55])for(const x of [-4.9,0,4.9])
  side.push({x,z,yaw:z<0?0:180});
 return [...outer,...side];
}
export function zoneAt(x,z){
 return ROOM_DEFS.find(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)||null;
}

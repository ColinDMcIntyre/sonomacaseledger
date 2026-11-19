import * as THREE from 'three';

/**
 * Museum illustrations are contextual reconstructions, NEVER objects of
 * evidence. Keep the legal record in research/case-data.json; the catalog
 * below selects visual motifs only.
 *
 * The associated locally hosted, CC0 photogrammetry models are optional.
 * Every case has a self-contained procedural Three.js fallback.
 */
const R={
 'aldo-joseph-baccala':['ponzi','binder','Investor-account records and an abstract circular-flow diagram'],
 'michael-rosen':['pyramid','notepads','Blank account cards arranged as a pyramid metaphor'],
 'leona-schutte-robert-williams':['investor','binder','Two generic investor-file folders, not actual investment records'],
 'ryan-merman':['ledger','officeDesk','A generic employer bookkeeping workstation'],
 'elana-cohen-roth':['trust','binder','A generic trust-record binder and document chest'],
 'timothy-charles-webb-jr':['property',null,'An empty storage cabinet; no stolen property is represented'],
 'john-c-sheehan':['tax','officeDesk','Separate business and tax record folders'],
 'suede-lee-barganski':['car','coveredCar','A covered restoration vehicle, not any customer vehicle'],
 'frances-farias':['community','notepads','Community-center table and generic accounting records'],
 'christopher-ramos':['insurance','notepads','Generic insurance-agent policy and claim records'],
 'tina-cabudoy':['ledger','stationery','Generic business manager bookkeeping materials'],
 'lisa-fatu':['donation','notepads','A symbolic nonprofit donation box and administrative ledger'],
 'daniel-broin':['community','binder','Association meeting table and generic membership file'],
 'mary-katherine-david':['school','schoolDesk','A school-program desk with a generic treasurer ledger'],
 'mohannad-halaweh':['investor','binder','Unlabeled financial records; no particular loss amount implied'],
 'michael-alan-voorhees':['justice','binder','Trust records and abstract scales of justice'],
 'jeffrey-holzworth':['parking','cashRegister','A generic campus parking payment kiosk'],
 'karen-holzworth':['property',null,'A sealed property carton; separate from Jeffrey Holzworth’s case'],
 'eileen-madayag':['solar','notepads','A miniature solar panel illustrating the employer industry only'],
 'christopher-miranda-pamela-malfa':['car','coveredCar','A classic-car restoration display; not an actual customer car'],
 'kim-louise-lemoine':['check','notepads','Fictional specimen checks with no genuine government or banking details'],
 'ana-carrillo':['insurance','notepads','Unbranded insurance-enforcement paperwork; mechanism not verified'],
 'mark-garcia-sleep-number':['insurance','binder','Unbranded insurance-enforcement files, not a retail or bedroom scene'],
 'casey-harding':['insurance','notepads','Generic insurance-enforcement paperwork, not a reconstructed loss'],
 'justin-mchale':['insurance','notepads','Generic claim-file representation, not actual case evidence'],
 'gabriel-desantos':['insurance','binder','Abstract insurance file; no financial-loss inference'],
 'rogelio-robleto':['insurance','notepads','Unbranded insurance records, not actual evidence'],
 'miguel-martinez-herrera':['insurance','notepads','Generic file cards; restitution and fine remain distinct in the text'],
 'amanda-rodgers-graton-casino':['insurance','binder','Generic insurance file; no casino wrongdoing is implied'],
 'isidro-vencez':['insurance','notepads','Generic file; complete court docket not independently verified'],
 'sonoma-valley-bank':['bank','binder','An unbranded bank vault and fictional loan-file folders'],
 'brandon-frere':['network','binder','An abstract network of financial account records'],
 'robert-stephens':['network','binder','A conceptual wire-transfer diagram without real transactions'],
 'douglas-hollingsworth':['ponzi','notepads','An illustrative circular financial-flow diagram'],
 'stephanie-simontacchi':['tax','officeDesk','Three generic folders: bank, credit union and tax'],
 'generose-casiano-yambao':['loan','notepads','A fictional loan application; not the actual filed document'],
 'constantine-petros':['timeline','binder','A legal-outcome timeline: 2017 count dispositions and 2020 post-conviction relief']
};
export const CASE_DIORAMAS=Object.freeze(Object.fromEntries(
 Object.entries(R).map(([slug,[kind,prop,description]])=>[slug,Object.freeze({kind,prop,description})])
));
export function caseIllustrationFor(slug){return CASE_DIORAMAS[slug]||null;}

const palette={
 brass:0xc8ac72,ink:0x283b46,paper:0xf2e9d5,wood:0x795d47,
 blue:0x527687,red:0x98565c,green:0x708c7d,steel:0x868d91,
 dark:0x34424b,cream:0xd7cbb3
};
const mats=Object.fromEntries(Object.entries(palette).map(([key,color])=>[
 key,new THREE.MeshStandardMaterial({color,roughness:key==='brass'?.38:.76,metalness:key==='brass'?.65:.05})
]));
const glass=new THREE.MeshPhysicalMaterial({
 color:0xb9e8df,metalness:0,roughness:.13,transparent:true,opacity:.34,
 depthWrite:false,side:THREE.DoubleSide
});
const cube=new THREE.BoxGeometry(1,1,1);
function block(g,x,y,z,w,h,d,material='wood'){
 const obj=new THREE.Mesh(cube,material==='glass'?glass:mats[material]);
 obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.castShadow=true;
 obj.receiveShadow=true;g.add(obj);return obj;
}
function cylinder(g,x,y,z,r,h,material='brass',segments=18){
 const obj=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mats[material]);
 obj.position.set(x,y,z);obj.castShadow=true;g.add(obj);return obj;
}
function ring(g,x,y,z,r,t=.014,material='brass'){
 const obj=new THREE.Mesh(new THREE.TorusGeometry(r,t,7,32),mats[material]);
 obj.position.set(x,y,z);g.add(obj);return obj;
}
function line(g,start,end,material='brass',radius=.012){
 const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);
 const obj=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,a.distanceTo(b),8),mats[material]);
 obj.position.copy(a).add(b).multiplyScalar(.5);
 obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
 g.add(obj);return obj;
}
function readableCard(g,text,x,y,z,w=.41,h=.17){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#eee4cf';ctx.fillRect(0,0,512,192);
 ctx.strokeStyle='#9a8051';ctx.lineWidth=12;ctx.strokeRect(8,8,496,176);
 ctx.fillStyle='#24363b';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 34px Georgia,serif';ctx.fillText(text,256,96,485);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
 face.position.set(x,y,z);g.add(face);return face;
}
function folder(g,x=0,z=0,accent='blue'){
 block(g,x,.175,z,.48,.038,.32,accent);
 block(g,x-.09,.201,z-.13,.18,.018,.06,accent);
 block(g,x,.212,z+.015,.43,.012,.24,'paper');
 for(let i=0;i<3;i++)block(g,x-.07,.222,z-.045+i*.055,.22,.004,.008,'ink');
}
function page(g,x=0,z=0,title='FILE'){
 block(g,x,.165,z,.43,.02,.32,'paper');
 for(let i=0;i<4;i++)block(g,x-.06,.179,z-.078+i*.044,.23,.003,.007,'steel');
 readableCard(g,title,x,.195,z+.14,.27,.09).rotation.x=-Math.PI/2;
}
function vault(g){
 block(g,0,.36,-.06,.65,.62,.14,'steel');
 const door=cylinder(g,0,.36,.033,.28,.05,'dark',32);door.rotation.x=Math.PI/2;
 ring(g,0,.36,.071,.19,.014);for(let i=0;i<6;i++){
  let a=i*Math.PI/3;
  line(g,[0,.36,.075],[Math.cos(a)*.15,.36+Math.sin(a)*.15,.075],'brass',.009);
 }
}
function car(g){
 const body=block(g,0,.32,0,.95,.18,.43,'blue');
 block(g,0,.45,-.025,.48,.20,.39,'steel');
 for(const x of [-.30,.30])for(const z of [-.235,.235]){
  const wheel=cylinder(g,x,.22,z,.115,.06,'dark',16);wheel.rotation.x=Math.PI/2;
  cylinder(g,x,.22,z+(z>0?.042:-.042),.041,.007,'brass',16).rotation.x=Math.PI/2;
 }
 block(g,0,.33,.231,.34,.06,.03,'cream');
 body.rotation.y=.045;
}
function school(g){
 block(g,0,.37,0,.83,.063,.44,'wood');
 for(const x of [-.34,.34])for(const z of [-.17,.17])block(g,x,.19,z,.032,.34,.032,'steel');
 folder(g,0,0,'red');readableCard(g,'SCHOOL PROGRAM',0,.65,.17,.66,.15);
}
function parking(g){
 block(g,0,.39,0,.34,.62,.30,'dark');
 block(g,0,.52,.163,.24,.16,.01,'blue');
 block(g,0,.34,.165,.20,.05,.02,'brass');
 block(g,0,.21,.164,.21,.035,.014,'paper');
 readableCard(g,'PARKING',0,.69,.15,.28,.10);
}
function solar(g){
 block(g,0,.16,0,.92,.025,.55,'steel');
 const panel=block(g,0,.36,0,.77,.025,.45,'dark');panel.rotation.x=-.31;
 for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++){
  let p=block(g,i*.125,.383-j*.035,j*.115,.111,.009,.105,'blue');p.rotation.x=-.31;
 }
 for(const x of [-.3,.3])line(g,[x,.15,-.14],[x,.31,.10],'steel',.02);
}
function justice(g){
 cylinder(g,0,.20,0,.19,.07,'wood');
 cylinder(g,0,.43,0,.021,.40,'brass');
 line(g,[-.36,.63,0],[.36,.63,0],'brass',.025);
 for(const x of [-.28,.28]){
  for(const d of [-.08,.08])line(g,[x,.63,0],[x+d*.4,.35,d],'steel',.008);
  cylinder(g,x,.33,0,.155,.025,'brass');
 }
}
function property(g){
 block(g,0,.28,0,.62,.30,.46,'wood');
 block(g,0,.44,0,.64,.026,.48,'cream');
 block(g,0,.455,0,.08,.013,.46,'brass');
 readableCard(g,'SEALED / SYMBOLIC',0,.50,.252,.50,.10);
}
function donation(g){
 block(g,0,.32,0,.58,.38,.40,'glass');
 block(g,0,.52,0,.61,.04,.43,'brass');
 block(g,0,.545,0,.23,.006,.016,'dark');
 readableCard(g,'NONPROFIT',0,.27,.214,.43,.13);
}
function community(g){
 block(g,0,.30,0,.69,.05,.42,'wood');
 for(const x of [-.28,.28])for(const z of [-.15,.15])block(g,x,.17,z,.024,.24,.02,'steel');
 for(const x of [-.43,.43])block(g,x,.28,0,.18,.035,.29,'wood');
}
function abstractFlow(g,kind){
 if(kind==='pyramid'){
  for(let row=0;row<3;row++)for(let i=0;i<3-row;i++){
   block(g,(i-(2-row)/2)*.23,.20+row*.17,0,.19,.11,.13,row===2?'brass':'blue');
  }
  return;
 }
 if(kind==='network'){
  const coords=[[-.36,.22,0],[0,.48,-.08],[.35,.23,0],[-.2,.31,.24],[.19,.35,.23]];
  for(const [i,j] of [[0,1],[1,2],[0,3],[3,4],[4,2],[1,4]])line(g,coords[i],coords[j],'brass',.012);
  for(const a of coords)cylinder(g,a[0],a[1],a[2],.065,.06,'blue');
  return;
 }
 const r=.28;for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
  line(g,[Math.cos(a)*r,.37,Math.sin(a)*r],[Math.cos(b)*r,.37,Math.sin(b)*r],'brass',.017);
 }
 for(let i=0;i<3;i++)folder(g,(i-1)*.21,.13,'blue');
}
function tax(g){
 for(let i=0;i<3;i++)folder(g,(i-1)*.27,0,['red','blue','green'][i]);
 readableCard(g,'BUSINESS',-.29,.59,.17,.27,.13);
 readableCard(g,'TAX',.29,.59,.17,.27,.13);
}
function timeline(g){
 folder(g,-.27,-.04,'blue');folder(g,.27,-.04,'green');
 readableCard(g,'2017',-.28,.60,.13,.29,.15);
 readableCard(g,'2020',.28,.60,.13,.29,.15);
 line(g,[-.28,.45,.12],[.28,.45,.12],'brass',.02);
}
function illustrate(g,kind){
 switch(kind){
  case 'car':return car(g);
  case 'school':return school(g);
  case 'parking':return parking(g);
  case 'solar':return solar(g);
  case 'justice':return justice(g);
  case 'property':return property(g);
  case 'donation':return donation(g);
  case 'community':return community(g);
  case 'check':
   for(let i=0;i<2;i++)folder(g,(i-.5)*.39,.04,'red');
   return readableCard(g,'SPECIMEN / FICTIONAL',0,.53,.15,.69,.13);
  case 'bank':return vault(g);
  case 'network':case 'ponzi':case 'pyramid':return abstractFlow(g,kind);
  case 'tax':return tax(g);
  case 'timeline':return timeline(g);
  case 'loan':page(g,0,0,'LOAN');return readableCard(g,'SAMPLE ONLY',0,.53,.13,.56,.13);
  case 'trust':folder(g,-.22,0,'green');folder(g,.22,0,'blue');return readableCard(g,'TRUST RECORDS',0,.55,.13,.58,.13);
  case 'insurance':folder(g,-.18,0,'blue');page(g,.19,0,'CLAIM');return readableCard(g,'GENERIC FILE',0,.56,.13,.56,.13);
  case 'investor':folder(g,-.19,0,'blue');folder(g,.19,0,'green');return readableCard(g,'INVESTOR FILES',0,.57,.13,.56,.13);
  case 'ledger':folder(g,0,0,'green');return readableCard(g,'ACCOUNTING',0,.57,.13,.54,.13);
  default:folder(g);return readableCard(g,'FILE',0,.55,.13,.42,.13);
 }
}
/**
 * Models are normalized in asset-library.js and physically confined to the
 * 1.6m-wide display vitrine. External models replace their low-poly fallback,
 * while contextual text remains independently available in the HTML modal.
 */
export function installCaseDioramas(world,loaded,caseProps,normalize){
 let installed=0;
 for(const slot of world.assetSlots||[]){
  const record=slot.record?.record||slot.record;
  if(slot.kind!=='case'||!record?.slug)continue;
  const recipe=caseIllustrationFor(record.slug);
  if(!recipe)continue;
  const stage=new THREE.Group();
  stage.position.set(0,.985,.07);
  block(stage,0,.025,0,1.18,.05,.81,'wood');
  block(stage,0,.056,0,1.15,.013,.78,'brass');
  const representation=new THREE.Group();stage.add(representation);
  const conf=caseProps?.[recipe.prop],source=loaded?.[recipe.prop];
  if(conf&&source){
   try{
    const model=normalize(source,{...conf,targetSize:[1.04,.62,.60]},record.slug);
    model.position.y=.08;model.position.z=-.07;
    representation.add(model);
   }catch(error){
    console.warn('Illustration fallback:',record.slug,error);
    illustrate(representation,recipe.kind);
   }
  }else illustrate(representation,recipe.kind);
  readableCard(stage,'ILLUSTRATIVE · NOT EVIDENCE',0,.075,.407,.92,.11);
  slot.mount.add(stage);
  installed++;
 }
 return installed;
}

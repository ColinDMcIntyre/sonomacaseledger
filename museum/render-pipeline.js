import * as THREE from 'three';

// Optional GTAO, at bounded resolution. A direct-render path remains available
// even when an addon fails to load or a GPU cannot render the effect.
export function createRenderPipeline(renderer,scene,camera,{enabled=true,onStatus=()=>{}}={}){
 let composer=null,passes=[],loading=null,failed=false,width=1,height=1;
 const size=new THREE.Vector2();
 renderer.getSize(size);width=size.x;height=size.y;
 function resize(w,h){
  width=w;height=h;
  if(composer){
   composer.setPixelRatio(Math.min(renderer.getPixelRatio(),1.15,1600/Math.max(w,h)));
   composer.setSize(w,h);
  }
 }
 function dispose(){
  for(const p of passes)p.dispose?.();
  composer?.dispose();composer=null;passes=[];
 }
 async function prepare(){
  if(!enabled||failed||composer)return;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const [{EffectComposer},{RenderPass},{GTAOPass},{OutputPass}]=await Promise.all([
     import('three/addons/postprocessing/EffectComposer.js'),
     import('three/addons/postprocessing/RenderPass.js'),
     import('three/addons/postprocessing/GTAOPass.js'),
     import('three/addons/postprocessing/OutputPass.js')
    ]);
    composer=new EffectComposer(renderer);
    const beauty=new RenderPass(scene,camera);
    const ao=new GTAOPass(scene,camera,width,height);
    ao.output=GTAOPass.OUTPUT.Default;
    ao.blendIntensity=.55;
    ao.updateGtaoMaterial({radius:.75,samples:8,distanceFallOff:1});
    ao.updatePdMaterial({samples:8,radius:4});
    // Beauty is already rendered; transparent glass, decals, invisible
    // interaction cylinders and sunlight planes must not write fake AO depth.
    const renderAO=ao.render.bind(ao);
    ao.render=(...args)=>{
     const hidden=[];
     scene.traverse(o=>{
      if(!o.visible||!o.isMesh)return;
      const materials=Array.isArray(o.material)?o.material:[o.material];
      if(materials.length&&materials.every(m=>m&&(m.transparent||m.depthWrite===false||m.opacity===0))){
       hidden.push(o);o.visible=false;
      }
     });
     const override=scene.overrideMaterial;
     try{return renderAO(...args);}
     finally{scene.overrideMaterial=override;for(const o of hidden)o.visible=true;}
    };
    const output=new OutputPass();
    passes=[beauty,ao,output];
    for(const pass of passes)composer.addPass(pass);
    resize(width,height);onStatus('GTAO enabled');
   }catch(error){failed=true;dispose();onStatus('GTAO unavailable; direct rendering');console.warn('GTAO setup:',error);}
  })();
  return loading;
 }
 function render(dt){
  if(composer){
   try{composer.render(dt);return;}
   catch(error){
    failed=true;dispose();renderer.setRenderTarget(null);
    scene.overrideMaterial=null;renderer.autoClear=true;
    onStatus('GTAO disabled after rendering error');console.warn('GTAO render:',error);
   }
  }
  renderer.render(scene,camera);
 }
 return {prepare,resize,render,dispose,get mode(){return composer?'GTAO':'direct';}};
}

/**
 * Private local FBX preview for the owner's licensed Renderpeople files.
 * Source bytes remain in the browser; used only with ?private-character=1.
 * Select one extracted rigged FBX together with its texture JPGs.
 */
import * as THREE from 'three';

function basename(url){
 try{return decodeURIComponent(String(url).split(/[\\/]/).pop().split('?')[0]).toLowerCase();}
 catch{return String(url).split(/[\\/]/).pop().toLowerCase();}
}
export function enablePrivateCharacterPreview({getVisitor,controls,report}){
 if(!new URLSearchParams(location.search).has('private-character'))return;
 const button=document.createElement('button');
 button.type='button';button.className='hud-button';
 button.textContent='Preview private visitor';
 button.title='Choose your own Renderpeople FBX and companion JPGs; files stay in this browser';
 const picker=document.createElement('input');
 picker.type='file';picker.accept='.fbx,.jpg,.jpeg,.png';picker.multiple=true;picker.hidden=true;
 controls.append(button,picker);
 const urls=[];
 window.addEventListener('pagehide',()=>urls.forEach(URL.revokeObjectURL),{once:true});
 button.addEventListener('click',()=>picker.click());
 picker.addEventListener('change',async()=>{
  const visitor=getVisitor(),files=Array.from(picker.files||[]);
  const fbx=files.find(f=>/\.fbx$/i.test(f.name));
  if(!fbx){report('Select a Renderpeople .fbx file and its texture JPG files together.');return;}
  if(!visitor?.installPrivateModel){report('The 3D visitor is not ready.');return;}
  const imageFiles=files.filter(f=>/\.(?:jpg|jpeg|png)$/i.test(f.name));
  if(!imageFiles.length){report('Include diffuse and normal JPG textures along with the FBX.');return;}
  button.disabled=true;button.textContent='Loading private character…';
  const textureUrls=new Map();
  for(const file of imageFiles){
   const url=URL.createObjectURL(file);textureUrls.set(file.name.toLowerCase(),url);urls.push(url);
  }
  try{
   const {FBXLoader}=await import('three/addons/loaders/FBXLoader.js');
   const manager=new THREE.LoadingManager();
   // Never allow an FBX-embedded remote or filesystem texture reference to
   // generate an outside network request. Only owner-selected blob URLs load.
   manager.setURLModifier(url=>{
    if(String(url).startsWith('blob:'))return url;
    return textureUrls.get(basename(url))||'data:,';
   });
   const loader=new FBXLoader(manager);
   const obj=loader.parse(await fbx.arrayBuffer(),'');
   // Artist FBXs can refer to machine-specific absolute texture paths.
   // Explicitly bind the supplied local diffuse atlas if the importer lost it.
   const diffuse=[...textureUrls].find(([name])=>/_dif\.(?:jpg|jpeg|png)$/i.test(name));
   const normal=[...textureUrls].find(([name])=>/_norm\.(?:jpg|jpeg|png)$/i.test(name));
   const tLoader=new THREE.TextureLoader(manager);
   const diffuseMap=diffuse?tLoader.load(diffuse[1]):null;
   const normalMap=normal?tLoader.load(normal[1]):null;
   if(diffuseMap){diffuseMap.colorSpace=THREE.SRGBColorSpace;diffuseMap.flipY=false;}
   if(normalMap)normalMap.flipY=false;
   obj.traverse(child=>{
    if(!child.isMesh)return;
    child.castShadow=false;child.receiveShadow=true;
    const materials=Array.isArray(child.material)?child.material:[child.material];
    for(const m of materials){
     if(!m)continue;
     if(diffuseMap&&!m.map){m.map=diffuseMap;m.color.set(0xffffff);}
     if(normalMap&&!m.normalMap)m.normalMap=normalMap;
     m.needsUpdate=true;
    }
   });
   visitor.installPrivateModel(obj);
   const boneCount=[];obj.traverse(part=>{if(part.isBone)boneCount.push(part.name);});
   report('Local Renderpeople preview active ('+boneCount.length+' rig bones). No asset was uploaded.');
  }catch(error){
   console.error('Private visitor failed:',error);
   report('Could not open the local FBX: '+String(error.message||error).slice(0,95));
  }finally{
   button.disabled=false;button.textContent='Preview private visitor';picker.value='';
  }
 });
}

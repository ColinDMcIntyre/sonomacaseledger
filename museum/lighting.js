import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {ROOM_DEFS,VESTIBULE} from './layout.js';
import {M} from './materials.js';

/**
 * Cathedral lighting: real HDR image-based lighting, restrained sunlight,
 * warm pendants and sconces. Ambient fallback stays if HDR unavailable.
 */
export function installCathedralLighting(scene,renderer,onStatus=()=>{}){
 const hemisphere=new THREE.HemisphereLight(0xeef4ff,0x7c654f,1.08);
 scene.add(hemisphere);
 const sun=new THREE.DirectionalLight(0xffe9c4,2.05);
 sun.position.set(-28,37,22);sun.target.position.set(0,0,-10);
 scene.add(sun,sun.target);
 sun.castShadow=window.innerWidth>780;
 sun.shadow.mapSize.set(2048,2048);
 sun.shadow.camera.left=-61;sun.shadow.camera.right=61;
 sun.shadow.camera.top=74;sun.shadow.camera.bottom=-74;
 sun.shadow.camera.near=.3;sun.shadow.camera.far=155;
 sun.shadow.bias=-.0005;sun.shadow.normalBias=.048;
 const fill=new THREE.DirectionalLight(0xa7c4d4,.63);
 fill.position.set(25,21,-32);scene.add(fill);
 const fixtureMesh=new THREE.CylinderGeometry(.34,.54,.32,12);
 const rim=new THREE.TorusGeometry(.48,.045,7,18);
 const metal=M.blackMetal,glass=M.light;
 function fixture(x,z,ceiling){
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  const length=Math.min(3.3,Math.max(.95,ceiling-6.6));
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,length,9),metal);
  stem.position.y=ceiling-length/2-.14;group.add(stem);
  const shade=new THREE.Mesh(fixtureMesh,metal);
  shade.position.y=ceiling-length-.13;group.add(shade);
  const bottom=new THREE.Mesh(new THREE.SphereGeometry(.25,10,8),glass);
  bottom.position.y=ceiling-length-.33;group.add(bottom);
  const ring=new THREE.Mesh(rim,M.edge);
  ring.position.y=ceiling-length-.25;ring.rotation.x=Math.PI/2;group.add(ring);
  const light=new THREE.PointLight(0xffd7a1,1.65,12,2);
  light.position.set(x,ceiling-length-.62,z);scene.add(light);
 }
 for(const z of [-23,-9,5,19])fixture(0,z,12.8);
 for(const room of ROOM_DEFS.filter(r=>r.id!=='rotunda'))fixture(room.x,room.z,room.height+1.5);
 fixture(0,VESTIBULE.z,VESTIBULE.height+1.1);
 // Keep actual HDR local if imported; remote CC0 fallback is the publisher's
 // static CDN URL, never live API calls from visitors.
 async function loadHDR(){
  const hdrSources=[
   './assets/cathedral/church_meeting_room_1k.hdr',
   'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/church_meeting_room_1k.hdr'
  ];
  for(const url of hdrSources){
   try{
    const hdr=await new RGBELoader().loadAsync(url);
    hdr.mapping=THREE.EquirectangularReflectionMapping;
    const pmrem=new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env=pmrem.fromEquirectangular(hdr).texture;
    scene.environment=env;scene.environmentIntensity=.79;
    // Keep a natural architectural background, not the original photographed
    // church interior from the reflection map.
    hdr.dispose();pmrem.dispose();
    onStatus('HDR lighting: Poly Haven Church Meeting Room (CC0)');
    return true;
   }catch(error){/* continue to the next asset source */}
  }
  onStatus('HDR lighting unavailable; warm studio environment active');
  return false;
 }
 loadHDR().catch(()=>onStatus('HDR lighting unavailable; studio fallback'));
 return {hemisphere,sun,fill};
}

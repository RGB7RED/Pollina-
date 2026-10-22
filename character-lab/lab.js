import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

// An isolated asset-acceptance lab. It never touches game.js or the old city.
// A real, skinned GLB is loaded from our repository, not generated from spheres.
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb2bec0);
scene.fog=new THREE.Fog(0xb2bec0,16,34);
const camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.1,80);
camera.position.set(2.65,1.76,4.2);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("viewport").appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,.91,0);
controls.enableDamping=true;
controls.dampingFactor=.065;
controls.enablePan=false;
controls.minDistance=1.2;
controls.maxDistance=8;
controls.minPolarAngle=.12;
controls.maxPolarAngle=Math.PI/2-.015;
controls.update();
const light=new THREE.HemisphereLight(0xe1e8e7,0x65706b,2.25);scene.add(light);
const sun=new THREE.DirectionalLight(0xffe3c8,3.0);
sun.position.set(3.5,7,5);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-4;sun.shadow.camera.right=4;
sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;
sun.shadow.normalBias=.025;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xb7d3e0,1.6);
fill.position.set(-3,4,-4);scene.add(fill);
const stageMat=new THREE.MeshStandardMaterial({color:0x75888c,roughness:.98,metalness:0});
const stage=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.75,.18,72),stageMat);
stage.position.y=-.14;stage.receiveShadow=true;scene.add(stage);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xa5b2b0,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.23;ground.receiveShadow=true;scene.add(ground);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.54,.008,6,96),new THREE.MeshBasicMaterial({color:0xdfd1bd}));
ring.rotation.x=-Math.PI/2;ring.position.y=-.043;scene.add(ring);

const root=new THREE.Group();scene.add(root);
let model=null,bones=[],skeletonHelper=null,mixer=null;
let mode="neutral",isLoaded=false,elapsed=0;
const original=new Map();
function fitCharacter(object){
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object);
  const size=bounds.getSize(new THREE.Vector3());
  if(!(size.y>0))throw new Error("У модели неверные размеры.");
  const targetHeight=1.83;
  object.scale.multiplyScalar(targetHeight/size.y);
  object.updateMatrixWorld(true);
  const actual=new THREE.Box3().setFromObject(object);
  // Normalize position on the plinth, independently of the file's initial root.
  object.position.x-=(actual.min.x+actual.max.x)/2;
  object.position.z-=(actual.min.z+actual.max.z)/2;
  object.position.y-=actual.min.y;
  object.updateMatrixWorld(true);
}
function clearPose(){
  for(const bone of bones){
    const q=original.get(bone.uuid);
    if(q)bone.quaternion.copy(q);
  }
}
function poseBone(name,angle,axis="x"){
  const b=bones.find(n=>n.name.toLowerCase()===name.toLowerCase());
  if(!b)return;
  const base=original.get(b.uuid);
  if(!base)return;
  const direction=axis==="x"?new THREE.Vector3(1,0,0):axis==="z"?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
  b.quaternion.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(direction,angle));
}
function poseTest(t){
  clearPose();
  if(mode!=="rig")return;
  // This is ONLY a skinning test, not a shipped walk animation.
  const swing=Math.sin(t*3.1);
  const sway=Math.sin(t*1.6);
  poseBone("upperarm_l",.19*swing);
  poseBone("upperarm_r",-.19*swing);
  poseBone("thigh_l",-.28*swing);
  poseBone("thigh_r",.28*swing);
  poseBone("calf_l",-.18*Math.max(0,-swing));
  poseBone("calf_r",-.18*Math.max(0,swing));
  poseBone("spine_02",.014*sway,"y");
}
function showStatus(message,failed=false){
  $("status").hidden=false;
  $("status").textContent=message;
  $("status").style.borderColor=failed?"#e19a8b":"#c6d0c96d";
  $("state").textContent=failed?"Ошибка ассета":"Загрузка модели";
}
const loader=new GLTFLoader();
const sources={
  casual:{
    // An EXTERNAL preview candidate only, not a bundled production dependency.
    // Quaternius's 2022 Casual Character is CC0 on Poly Pizza, but this mirror
    // has NOT been independently byte-audited against that official asset.
    url:"https://raw.githubusercontent.com/QennNg/ar-model-viewer-test/e984c1906f41f35723f2b48f482ade37c3b71d57/CasualCharacter.glb",
    name:"Городской персонаж · внешний кандидат"
  },
  base:{
    url:"./assets/hero-reference.glb",
    name:"Локальная анатомическая база · CC0"
  }
};
let requestId=0,clips=[],idleAction=null,walkAction=null;
function switchClip(){
  if(!mixer)return;
  mixer.stopAllAction();
  if(mode==="rig"&&walkAction)walkAction.reset().fadeIn(.17).play();
  else if(idleAction)idleAction.reset().fadeIn(.17).play();
}
function loadSource(source,canFallback=true){
  const sample=sources[source];
  if(!sample)return;
  const ticket=++requestId;
  isLoaded=false;showStatus("Загрузка: "+sample.name);
  loader.load(sample.url,gltf=>{
    if(ticket!==requestId)return;
    try{
      // Dispose the previous preview, never mutate the open-world game.
      if(skeletonHelper){root.remove(skeletonHelper);skeletonHelper=null;}
      if(model)root.remove(model);
      model=gltf.scene;
      fitCharacter(model);
      root.add(model);
      bones=[];original.clear();
      let triangleCount=0,skinCount=0;
      model.traverse(o=>{
        if(o.isMesh||o.isSkinnedMesh){
          o.castShadow=true;o.receiveShadow=true;
          if(o.isSkinnedMesh)skinCount++;
          if(o.geometry){
            const idx=o.geometry.index;
            triangleCount+=Math.round((idx?idx.count:o.geometry.attributes.position?.count||0)/3);
          }
        }
        if(o.isBone){bones.push(o);original.set(o.uuid,o.quaternion.clone());}
      });
      if(!bones.length||!skinCount)throw new Error("Нет настоящего skinned humanoid rig.");
      skeletonHelper=new THREE.SkeletonHelper(model);
      skeletonHelper.visible=false;root.add(skeletonHelper);
      clips=gltf.animations||[];
      mixer=clips.length?new THREE.AnimationMixer(model):null;
      idleAction=null;walkAction=null;
      if(mixer){
        const idle=clips.find(c=>/idle|stand|breath/i.test(c.name))||clips[0];
        const walk=clips.find(c=>/walk|run|jog/i.test(c.name));
        if(idle)idleAction=mixer.clipAction(idle);
        if(walk)walkAction=mixer.clipAction(walk);
      }
      switchClip();
      $("state").textContent=sample.name;
      $("rig").textContent="Скелет: "+bones.length+" костей · "+skinCount+" skinned meshes";
      $("geometry").textContent="Модель: ~"+triangleCount.toLocaleString("ru")+" треугольников";
      $("clip").textContent="Встроенные клипы: "+clips.length+(walkAction?" · ходьба доступна":"");
      $("status").hidden=true;isLoaded=true;
    }catch(error){
      console.error("Character validation failed",error);
      showStatus("Ошибка разбора модели: "+error.message,true);
      if(source==="casual"&&canFallback){$("model-source").value="base";loadSource("base",false);}
    }
  },event=>{
    if(ticket!==requestId)return;
    if(event.total>0)$("status").textContent="Загрузка: "+Math.round(event.loaded/event.total*100)+"%";
  },error=>{
    if(ticket!==requestId)return;
    console.error("Failed to fetch character candidate",error);
    if(source==="casual"&&canFallback){
      $("model-source").value="base";
      loadSource("base",false);
    }else{
      showStatus("Не удалось загрузить GLB. Проверь интернет и перезагрузи страницу.",true);
    }
  });
}
$("model-source").addEventListener("change",e=>loadSource(e.target.value));
loadSource("casual");
document.querySelectorAll("[data-mode]").forEach(button=>button.addEventListener("click",()=>{
  mode=button.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b===button));
  if(model&&mode==="neutral")clearPose();
  switchClip();
}));
$("skeleton").addEventListener("click",()=>{
  if(!skeletonHelper)return;
  skeletonHelper.visible=!skeletonHelper.visible;
  $("skeleton").classList.toggle("active",skeletonHelper.visible);
});
$("reset").addEventListener("click",()=>{
  camera.position.set(2.65,1.76,4.2);
  controls.target.set(0,.91,0);controls.update();
});
window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
});
let frames=0,frameStart=performance.now();
const clock=new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,clock.getDelta());
  elapsed+=dt;
  if(isLoaded&&!mixer)poseTest(elapsed);
  // The character model is inspected while the studio scene stays isolated.
  if(mixer)mixer.update(dt);
  controls.update();
  renderer.render(scene,camera);
  frames++;
  const now=performance.now();
  if(now-frameStart>1400){
    $("frame").textContent="FPS: "+Math.round(frames*1000/(now-frameStart));
    frameStart=now;frames=0;
  }
}
tick();
window.characterLabReady=true;

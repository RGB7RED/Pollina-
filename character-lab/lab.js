import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {MotionController} from "./motion.mjs";

// Stage 2 is an isolated animation acceptance test, not an alteration to
// MINI CITY's public game.js. The model's own authored glTF animation clips
// drive the skeleton. A temporary in-browser joint wiggle is NOT substituted.
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb0bec0);
scene.fog=new THREE.Fog(0xb0bec0,19,45);
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.1,85);
camera.position.set(2.9,2.0,5.7);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("viewport").appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1.03,0);
controls.enableDamping=true;controls.enablePan=false;
controls.minDistance=1.4;controls.maxDistance=11;
controls.minPolarAngle=.13;controls.maxPolarAngle=Math.PI/2-.018;
controls.update();
scene.add(new THREE.HemisphereLight(0xdfe8e8,0x63716b,2.35));
const sun=new THREE.DirectionalLight(0xf8ddc2,2.8);
sun.position.set(4,8,5);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-11;sun.shadow.camera.right=11;
sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;
sun.shadow.normalBias=.027;
scene.add(sun);
const bounce=new THREE.DirectionalLight(0xbad0df,1.35);
bounce.position.set(-4,4,-5);scene.add(bounce);

// A simple 12x12-metre studio runway: character motion is visible in space,
// and distance is bounded to prevent walking into an empty horizon.
const pavement=new THREE.Mesh(
  new THREE.PlaneGeometry(14,14),
  new THREE.MeshStandardMaterial({color:0x86999a,roughness:.99})
);
pavement.rotation.x=-Math.PI/2;pavement.position.y=-.02;
pavement.receiveShadow=true;scene.add(pavement);
const markings=new THREE.Group();scene.add(markings);
const paint=new THREE.MeshBasicMaterial({color:0xdad9c8,transparent:true,opacity:.64,depthWrite:false});
for(let j=-4;j<=4;j++){
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(.13,.4),paint);
  mark.rotation.x=-Math.PI/2;mark.position.set(0,.007,j*1.3);
  markings.add(mark);
}
const borderMat=new THREE.MeshStandardMaterial({color:0x5c6f74,roughness:.95});
for(const direction of [-1,1]){
  const curb=new THREE.Mesh(new THREE.BoxGeometry(.2,.14,14),borderMat);
  curb.position.set(direction*6.9,.07,0);
  curb.receiveShadow=true;scene.add(curb);
}
const root=new THREE.Group();scene.add(root);
let model=null,bones=[],skeletonHelper=null,motion=null;
let lastRoot=new THREE.Vector3(),requestId=0;
let isLoaded=false,elapsed=0,activeSource="casual";
const loader=new GLTFLoader();
const sources={
  casual:{
    url:"https://raw.githubusercontent.com/QennNg/ar-model-viewer-test/e984c1906f41f35723f2b48f482ade37c3b71d57/CasualCharacter.glb",
    name:"Городской кандидат · внешний файл"
  },
  base:{
    url:"./assets/hero-reference.glb",
    name:"Анатомическая база CC0 · без анимаций"
  }
};
function report(message,error=false){
  $("status").hidden=false;
  $("status").style.borderColor=error?"#e99b85":"#b2c9c0";
  $("status").textContent=message;
}
function resetCamera(){
  const x=root.position.x,z=root.position.z;
  camera.position.set(x+2.9,2.0,z+5.7);
  controls.target.set(x,1.03,z);
  lastRoot.copy(root.position);
  controls.update();
}
function fitCharacter(object){
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object);
  const height=bounds.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(height)||height<.2)throw Error("У модели неверная высота");
  object.scale.multiplyScalar(1.82/height);
  object.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(object);
  object.position.x-=(scaled.min.x+scaled.max.x)/2;
  object.position.z-=(scaled.min.z+scaled.max.z)/2;
  object.position.y-=scaled.min.y;
  object.updateMatrixWorld(true);
}
function refreshClipMenu(clips){
  const select=$("clip-select");
  select.replaceChildren(new Option("Управление персонажем",""));
  clips.forEach(c=>select.add(new Option(c.name,c.name)));
}
function setMode(mode){
  if(!motion)return;
  const result=motion.transitionTo(mode);
  $("clip-select").value="";
  document.querySelectorAll("[data-motion]").forEach(
    b=>b.classList.toggle("active",b.dataset.motion===mode)
  );
  $("motion-status").textContent=result.status||
    ("Режим: "+({idle:"Ожидание",walk:"Ходьба",run:"Бег"}[mode]));
}
function installActor(gltf,source){
  if(motion){motion.dispose();motion=null;}
  if(skeletonHelper){root.remove(skeletonHelper);skeletonHelper=null;}
  if(model){root.remove(model);model=null;}
  root.position.set(0,0,0);
  root.rotation.y=0;
  model=gltf.scene;
  fitCharacter(model);
  root.add(model);
  bones=[];
  let skinned=0,triangles=0;
  model.traverse(o=>{
    if(o.isBone)bones.push(o);
    if(o.isMesh||o.isSkinnedMesh){
      o.castShadow=true;o.receiveShadow=true;
      if(o.isSkinnedMesh)skinned++;
      const geo=o.geometry;
      if(geo)triangles+=Math.floor((geo.index?.count||geo.attributes.position?.count||0)/3);
    }
  });
  if(!bones.length||!skinned)throw Error("Модель без настоящего скелета");
  skeletonHelper=new THREE.SkeletonHelper(model);
  skeletonHelper.visible=false;
  root.add(skeletonHelper);
  $("skeleton").classList.remove("active");
  const clips=gltf.animations||[];
  const mixer=clips.length?new THREE.AnimationMixer(model):null;
  motion=new MotionController({
    mixer,clips,root,
    onChange:({clip})=>{$("motion-status").textContent="Клип: "+clip;}
  });
  const c=motion.getCapabilities();
  $("state").textContent=sources[source].name;
  $("rig").textContent="Скелет: "+bones.length+" костей · "+skinned+" skinned meshes";
  $("geometry").textContent="Геометрия: ~"+triangles.toLocaleString("ru")+" трис";
  $("clip").textContent="Клипы: "+clips.length+" · Ходьба "+(c.walk?"✓":"—")+" / Бег "+(c.run?"✓":"—");
  refreshClipMenu(clips);
  $("status").hidden=true;
  isLoaded=true;
  setMode("idle");
  resetCamera();
}
function loadSource(source,allowFallback=true){
  const candidate=sources[source];
  if(!candidate)return;
  activeSource=source;
  const id=++requestId;
  isLoaded=false;
  report("Загрузка персонажа и анимаций…");
  loader.load(candidate.url,
    gltf=>{
      if(id!==requestId)return;
      try{installActor(gltf,source);}
      catch(error){
        console.error("Animation asset error",error);
        if(source==="casual"&&allowFallback){
          $("model-source").value="base";loadSource("base",false);
        } else report("Ошибка модели: "+error.message,true);
      }
    },
    ev=>{if(id===requestId&&ev.total)$("status").textContent=
      "Загрузка модели: "+Math.round(ev.loaded/ev.total*100)+"%";},
    err=>{
      if(id!==requestId)return;
      console.error("Cannot load asset",err);
      if(source==="casual"&&allowFallback){
        $("model-source").value="base";loadSource("base",false);
      } else report("Не удалось загрузить GLB (проверь соединение)",true);
    }
  );
}
$("model-source").addEventListener("change",e=>loadSource(e.target.value,false));
$("clip-select").addEventListener("change",e=>{
  if(!motion)return;
  if(!e.target.value)setMode("idle");
  else if(motion.playNamedClip(e.target.value)){
    document.querySelectorAll("[data-motion]").forEach(b=>b.classList.remove("active"));
    $("motion-status").textContent="Отдельный клип: "+e.target.value;
  }
});
document.querySelectorAll("[data-motion]").forEach(b=>b.addEventListener(
  "click",()=>setMode(b.dataset.motion)
));
for(const [id,direction] of [["turn-left",-1],["turn-right",1]]){
  const button=$(id);
  const begin=e=>{
    e.preventDefault();
    button.setPointerCapture?.(e.pointerId);
    motion?.setTurning(direction);
    button.classList.add("active");
  };
  const end=e=>{
    motion?.setTurning(0);
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown",begin);
  for(const type of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(type,end);
}
$("skeleton").addEventListener("click",()=>{
  if(!skeletonHelper)return;
  skeletonHelper.visible=!skeletonHelper.visible;
  $("skeleton").classList.toggle("active",skeletonHelper.visible);
});
$("reset").addEventListener("click",()=>{
  motion?.resetLocation();
  resetCamera();
  setMode("idle");
});
const keys=new Set();
window.addEventListener("keydown",e=>{
  if(["KeyW","KeyA","KeyD","ShiftLeft","ShiftRight","ArrowLeft","ArrowRight"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if(e.code==="KeyW"||e.code==="ShiftLeft"||e.code==="ShiftRight")
    setMode(keys.has("KeyW")?(keys.has("ShiftLeft")||keys.has("ShiftRight")?"run":"walk"):"idle");
  if(e.code==="KeyA"||e.code==="ArrowLeft")motion?.setTurning(-1);
  if(e.code==="KeyD"||e.code==="ArrowRight")motion?.setTurning(1);
});
window.addEventListener("keyup",e=>{
  keys.delete(e.code);
  if(e.code==="KeyW"||e.code==="ShiftLeft"||e.code==="ShiftRight")
    setMode(keys.has("KeyW")?(keys.has("ShiftLeft")||keys.has("ShiftRight")?"run":"walk"):"idle");
  if(["KeyA","KeyD","ArrowLeft","ArrowRight"].includes(e.code)){
    motion?.setTurning(keys.has("KeyA")||keys.has("ArrowLeft")?-1:
      keys.has("KeyD")||keys.has("ArrowRight")?1:0);
  }
});
window.addEventListener("blur",()=>{keys.clear();motion?.setTurning(0);setMode("idle");});
window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
});
const clock=new THREE.Clock();
let frames=0,frameAt=performance.now();
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,clock.getDelta());
  elapsed+=dt;
  if(isLoaded&&motion){
    const info=motion.update(dt);
    const delta=root.position.clone().sub(lastRoot);
    controls.target.add(delta);
    camera.position.add(delta);
    lastRoot.copy(root.position);
    $("speed").textContent="Скорость: "+info.speed.toFixed(2)+" м/с · "+info.phase;
    if(info.status)$("motion-status").textContent=info.status;
  }
  controls.update();
  renderer.render(scene,camera);
  const now=performance.now();
  frames++;
  if(now-frameAt>1200){
    $("frame").textContent="FPS: "+Math.round(frames*1000/(now-frameAt));
    frameAt=now;frames=0;
  }
}
loadSource("casual");
tick();
window.characterLabStage2Ready=true;

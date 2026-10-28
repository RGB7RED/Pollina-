import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {buildApartmentHouse} from "../building-lab/building.js?v=478-radiator24-upper";
import {planFirstApartment,buildFirstApartment} from "./apartment.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js?v=flat1-hall-bath-20261028";
import {buildFurnishedFirstFloor} from "./furniture.js?v=flat1-hall-bath-20261028";
import {applyFacadeFinishes} from "../building-lab/materials.js";
import {ActorAnimator} from "./animation.js";
import {planStreet,buildStreet} from "./street.js";
import {planPlayableEntrance} from "./entrance.js?v=478-radiator24-upper";
import {DeveloperStudio} from "./studio.js?v=477";
import {FreeSceneCamera} from "./free-camera.js";
import {PlayerController,joystickValue,PLAYER_HEIGHT} from "./controller.js";

// Separate playable prototype. It neither changes MINI CITY's main game
// nor silently ships the externally mirrored animated GLB as a bundled asset.
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x879baa);
scene.fog=new THREE.Fog(0x879baa,105,240);
const camera=new THREE.PerspectiveCamera(65,Math.max(.4,innerWidth/innerHeight),.08,275);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.28;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("stage").appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xc0d2dc,0x677265,2.05);
scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd2a9,2.25);
sun.position.set(-25,34,24);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-65;sun.shadow.camera.right=65;
sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;
sun.shadow.camera.near=1;sun.shadow.camera.far=115;sun.shadow.normalBias=.035;
scene.add(sun);
const {root:house,config,doorPivot}=buildApartmentHouse(THREE);
if(!doorPivot)throw Error("Real first entrance door required");
applyFacadeFinishes(THREE,house);
scene.add(house);
// Stage 4.2.1: the approved building is NOT duplicated. Replace temporary
// blank road/ground with one deterministic street plan and batched furnishing.
const pads=house.userData.geometryAudit.entryPads;
const entry=planPlayableEntrance(config,pads);
const firstFloor=planFirstFloor(config,entry);
entry.installFirstFloor(firstFloor);
const {root:firstFloorRoot,doorPivots:firstFloorDoorPivots}=
  buildFirstFloor(THREE,firstFloor);
scene.add(firstFloorRoot);
const furnished=buildFurnishedFirstFloor(THREE,firstFloor);
scene.add(furnished.root);
firstFloorRoot.userData.firstFloorAudit.emptyRooms=false;
firstFloorRoot.userData.firstFloorAudit.furnishings=furnished.layout.placements.length;
// Real obstacles are scoped to this floor; fifth-floor traversal unaffected.
entry.buildingObstacles.push(...furnished.layout.solidBounds);
const apartment=planFirstApartment(config,entry);
entry.installApartment(apartment);
const {root:flat,doorPivot:apartmentDoorPivot}=buildFirstApartment(THREE,apartment);
scene.add(flat);
const foyerLight=new THREE.PointLight(0xffeac5,1.45,6.2,2);
foyerLight.position.set(entry.x,3.08,5.14);foyerLight.castShadow=false;
scene.add(foyerLight);
const streetPlan=planStreet(config,pads);
const street=buildStreet(THREE,streetPlan);
scene.add(street);
const actorPivot=new THREE.Group();scene.add(actorPivot);
const controller=new PlayerController({
  building:config,pads,extras:streetPlan.obstacles,entry
});
// Same renderer, map, actor, controls and GLB in both modes. Only the
// developer presentation layer is toggled; no second Three.js scene.
const studio=new DeveloperStudio({
  THREE,scene,renderer,controller,house,street,streetPlan
});
const freeCamera=new FreeSceneCamera();
let modeBefore=studio.mode,actorLoadStarted=false;
actorPivot.visible=studio.mode==="game";
actorPivot.position.set(controller.position.x,0,controller.position.z);
let actor=null,animator=null,ready=false,activeRequest=0;
const loader=new GLTFLoader();
const sources=[
 {url:"https://raw.githubusercontent.com/QennNg/ar-model-viewer-test/e984c1906f41f35723f2b48f482ade37c3b71d57/CasualCharacter.glb",
  name:"Городской анимированный кандидат (внешний GLB)",animated:true},
 {url:"../character-lab/assets/hero-reference.glb",
  name:"Локальная анатомическая модель без анимаций",animated:false}
];
function showStatus(message,allowRetry=false){
 $("status").hidden=false;
 $("status").firstChild.textContent=message;
 $("retry").hidden=!allowRetry;
}
function hideStatus(){$("status").hidden=true;}
function fitCharacter(object){
 object.updateMatrixWorld(true);
 const initial=new THREE.Box3().setFromObject(object);
 const height=initial.getSize(new THREE.Vector3()).y;
 if(!Number.isFinite(height)||height<.3)throw Error("Некорректный рост GLB");
 object.scale.multiplyScalar(PLAYER_HEIGHT/height);
 object.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(object);
 object.position.x-=(box.min.x+box.max.x)/2;
 object.position.z-=(box.min.z+box.max.z)/2;
 object.position.y-=box.min.y;
 object.updateMatrixWorld(true);
}
function installActor(gltf,sourceIndex){
 if(animator){animator.dispose();animator=null;}
 if(actor){actorPivot.remove(actor);actor=null;}
 actor=gltf.scene;
 fitCharacter(actor);
 let rigged=false;
 actor.traverse(o=>{
  if(o.isSkinnedMesh)rigged=true;
  if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;}
 });
 actorPivot.add(actor);
 animator=new ActorAnimator(THREE,gltf);
 ready=animator.canWalk&&rigged;
 actor.visible=controller.view==="third"&&studio.mode==="game";
 $("actor-status").textContent=ready?
   sources[sourceIndex].name+" · ходьба и бег":
   "Анимации ходьбы отсутствуют — только осмотр";
 if(!ready){
   controller.setStick(0,0);
   showStatus("Анимированный персонаж недоступен. Показана модель без ходьбы; попробуй повторить загрузку.",true);
 }else hideStatus();
}
function loadActor(index=0){
 const request=++activeRequest;
 ready=false;
 showStatus(index===0?"Загружаем 3D-персонажа с анимациями…":
   "Пробуем локальную резервную 3D-модель…");
 loader.load(sources[index].url,gltf=>{
  if(request!==activeRequest)return;
  try{installActor(gltf,index);}
  catch(err){
   console.error("Character rig validation failed",err);
   if(index===0)loadActor(1);
   else showStatus("Ошибка модели персонажа. Повтори загрузку.",true);
  }
 },ev=>{
  if(request===activeRequest&&ev.total&&ev.loaded<ev.total)
   showStatus("Персонаж: "+Math.floor(ev.loaded/ev.total*100)+"%");
 },err=>{
  if(request!==activeRequest)return;
  console.warn("Character GLB load failed",err);
  if(index===0)loadActor(1);
  else showStatus("Не получилось загрузить персонажа. Проверь соединение и повтори.",true);
 });
}
$("retry").addEventListener("click",()=>loadActor(0));
function updateViewControls(){
 const first=controller.view==="first";
 document.body.classList.toggle("first-person",first);
 $("camera-mode").textContent=first?"👁 От первого лица":"🎥 От третьего лица";
 $("camera-mode").setAttribute("aria-pressed",String(first));
 $("switch-view").textContent=first?"🎥 Вид от 3-го лица":"👁 Вид от 1-го лица";
 $("camera-hint").textContent=first?
   "Глаза персонажа. Свайп — смотреть по сторонам.":
   "Камера следует сзади. Свайп — осмотреться.";
 if(actor)actor.visible=!first&&studio.mode==="game";
}
function toggleView(){controller.toggleView();updateViewControls();}
$("camera-mode").addEventListener("click",toggleView);
$("switch-view").addEventListener("click",toggleView);
const heldKeys=new Set();
let joystick={x:0,z:0},pointerStick=null,pointerLook=null,lastLookX=0,lastLookY=0;
function clearStick(){
 pointerStick=null;joystick={x:0,z:0};
 $("stick-knob").style.left="50%";$("stick-knob").style.top="50%";
}
function releaseControls(){
 heldKeys.clear();clearStick();pointerLook=null;
 controller.setStick(0,0);controller.setRun(false);
 $("run").classList.remove("active");
 $("run").setAttribute("aria-pressed","false");
 $("run").textContent="⚡ Бег: ВЫКЛ";
}
const stick=$("stick");
function updateStick(e){
 if(e.pointerId!==pointerStick)return;
 const bounds=stick.getBoundingClientRect();
 joystick=joystickValue(e.clientX,e.clientY,bounds);
 const radius=Math.min(bounds.width,bounds.height)*.37;
 $("stick-knob").style.left=bounds.width/2+joystick.x*radius+"px";
 $("stick-knob").style.top=bounds.height/2-joystick.z*radius+"px";
}
stick.addEventListener("pointerdown",e=>{
 if(pointerStick!==null)return;
 e.preventDefault();pointerStick=e.pointerId;
 try{stick.setPointerCapture(e.pointerId);}catch(_){}
 updateStick(e);
});
stick.addEventListener("pointermove",updateStick);
for(const event of ["pointerup","pointercancel","lostpointercapture"])
 stick.addEventListener(event,e=>{if(e.pointerId===pointerStick)clearStick();});
const stage=renderer.domElement;
stage.addEventListener("pointerdown",e=>{
 if(pointerLook!==null)return;
 e.preventDefault();pointerLook=e.pointerId;
 lastLookX=e.clientX;lastLookY=e.clientY;
 try{stage.setPointerCapture(e.pointerId);}catch(_){}
});
stage.addEventListener("pointermove",e=>{
 if(e.pointerId!==pointerLook)return;
 e.preventDefault();
 (studio.mode==="lab"?freeCamera:controller).look(
   e.clientX-lastLookX,e.clientY-lastLookY);
 lastLookX=e.clientX;lastLookY=e.clientY;
});
for(const event of ["pointerup","pointercancel","lostpointercapture"])
 stage.addEventListener(event,e=>{if(e.pointerId===pointerLook)pointerLook=null;});
const entryAction=$("entry-action");
function updateEntryAction(){
 if(studio.mode==="lab"){entryAction.hidden=true;return;}
 const near=controller.nearestDoor();
 entryAction.hidden=!near;
 if(!near)return;
 entryAction.textContent="🚪 "+(near.open?"Закрыть ":"Открыть ")+
    (near.id==="outer"?"входную":"квартиру №"+(near.number||17));
 entryAction.setAttribute("aria-pressed",String(near.open));
 entryAction.title=near.label+" · E";
}
function toggleEntryDoor(){
 if(studio.mode==="lab")return;
 const near=controller.nearestDoor();
 if(!near)return;
 const ok=controller.toggleNearestDoor();
 if(ok){updateEntryAction();studio.refreshCollisions();}
 else $("actor-status").textContent="Отойди от дверного проёма, чтобы закрыть дверь";
}
entryAction.addEventListener("click",toggleEntryDoor);
updateEntryAction();
$("run").addEventListener("click",()=>{
 const on=!controller.run;
 controller.setRun(on);
 $("run").classList.toggle("active",on);
 $("run").setAttribute("aria-pressed",String(on));
 $("run").textContent=on?"⚡ Бег: ВКЛ":"⚡ Бег: ВЫКЛ";
});
function resetActor(){
 controller.reset();
 doorPivot.rotation.y=0;
 apartmentDoorPivot.rotation.y=0;
 for(const pivot of firstFloorDoorPivots.values())pivot.rotation.y=0;
 updateEntryAction();
 studio.refreshCollisions();
 releaseControls();
 actorPivot.position.set(controller.position.x,0,controller.position.z);
 if(animator)animator.play("idle");
 updateViewControls();
}
$("reset").addEventListener("click",resetActor);
const moveKeys=new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown",
 "ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","KeyF","KeyR","KeyE","Space","KeyQ"]);
window.addEventListener("keydown",e=>{
 if(!moveKeys.has(e.code))return;
 e.preventDefault();
 if(studio.mode==="lab"){
  if(!e.repeat&&e.code==="KeyR")freeCamera.reset();
 }else{
  if(!e.repeat&&e.code==="KeyF")toggleView();
  if(!e.repeat&&e.code==="KeyR")resetActor();
  if(!e.repeat&&e.code==="KeyE")toggleEntryDoor();
 }
 heldKeys.add(e.code);
});
window.addEventListener("keyup",e=>heldKeys.delete(e.code));
window.addEventListener("blur",releaseControls);
document.addEventListener("visibilitychange",()=>{if(document.hidden)releaseControls();});
window.addEventListener("orientationchange",releaseControls);
function resize(){
 camera.aspect=Math.max(.4,innerWidth/innerHeight);
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.15));
}
window.addEventListener("resize",resize);
resize();updateViewControls();
if(studio.mode==="game"){actorLoadStarted=true;loadActor();}
const holdElevation={up:false,down:false};
for(const [id,direction] of [["free-up","up"],["free-down","down"]]){
 const button=$(id);
 button.addEventListener("pointerdown",e=>{
  e.preventDefault();holdElevation[direction]=true;
  try{button.setPointerCapture(e.pointerId);}catch(_){}
 });
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])
  button.addEventListener(ev,()=>holdElevation[direction]=false);
}
$("free-reset").addEventListener("click",()=>freeCamera.reset());
$("free-first-floor").addEventListener("click",()=>{
 freeCamera.position={x:entry.x-4.60,y:firstFloor.y+1.60,z:2.45};
 freeCamera.yaw=0;freeCamera.pitch=-.18;
});
$("free-landing").addEventListener("click",()=>{
  // Fifth-floor landing: inspect first real apartment 17.
  freeCamera.position={x:entry.x,y:entry.floorHeight(4)+1.55,z:-2.42};
  freeCamera.yaw=0;freeCamera.pitch=-.16;
});
const lookTarget=new THREE.Vector3(),eyeTarget=new THREE.Vector3();
const clock=new THREE.Clock();
let frames=0,lastReport=performance.now(),lastState="idle";
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,clock.getDelta());
 const lab=studio.mode==="lab";
 if(lab!==(modeBefore==="lab")){
  releaseControls();
  actorPivot.visible=!lab;
  if(!lab&&!actorLoadStarted){actorLoadStarted=true;loadActor();}
  modeBefore=studio.mode;updateViewControls();updateEntryAction();
 }
 let state;
 if(lab){
  const axisX=joystick.x+Number(heldKeys.has("KeyD")||heldKeys.has("ArrowRight"))-
    Number(heldKeys.has("KeyA")||heldKeys.has("ArrowLeft"));
  const axisZ=joystick.z+Number(heldKeys.has("KeyW")||heldKeys.has("ArrowUp"))-
    Number(heldKeys.has("KeyS")||heldKeys.has("ArrowDown"));
  const rise=Number(heldKeys.has("Space")||holdElevation.up)-
    Number(heldKeys.has("KeyQ")||holdElevation.down);
  const p=freeCamera.update(dt,axisX,axisZ,rise,
    heldKeys.has("ShiftLeft")||heldKeys.has("ShiftRight"));
  const pose=freeCamera.getCameraPose();
  camera.position.set(pose.eye.x,pose.eye.y,pose.eye.z);
  lookTarget.set(pose.aim.x,pose.aim.y,pose.aim.z);camera.lookAt(lookTarget);
  state={...p,state:"inspect",collided:false,view:"free",speed:0};
 }else{
 if(ready){
  const axisX=joystick.x+Number(heldKeys.has("KeyD")||heldKeys.has("ArrowRight"))-
    Number(heldKeys.has("KeyA")||heldKeys.has("ArrowLeft"));
  const axisZ=joystick.z+Number(heldKeys.has("KeyW")||heldKeys.has("ArrowUp"))-
    Number(heldKeys.has("KeyS")||heldKeys.has("ArrowDown"));
  controller.setStick(axisX,axisZ);
  const mobileRun=$("run").getAttribute("aria-pressed")==="true";
  controller.setRun(mobileRun||heldKeys.has("ShiftLeft")||heldKeys.has("ShiftRight"));
 }else controller.setStick(0,0);
 state=controller.update(dt);
 // Same scene, same player. Elevation follows exterior ramp, threshold
 // and first-floor vestibule smoothly; no teleport or world replacement.
 const openAngle=controller.entryDoorOpen?Math.PI*.47:0;
 doorPivot.rotation.y+=(openAngle-doorPivot.rotation.y)*(1-Math.exp(-12*dt));
  const aptAngle=controller.apartmentDoorOpen?-Math.PI*.48:0;
  apartmentDoorPivot.rotation.y+=(aptAngle-apartmentDoorPivot.rotation.y)*
    (1-Math.exp(-12*dt));
  for(const [number,pivot] of firstFloorDoorPivots){
    const door=firstFloor.doors.find(d=>d.number===number);
    // Left and right apartment leaves swing into their OWN rooms,
    // never across the narrow communal landing.
    const angle=controller.firstFloorDoorOpen.has(number)?
      door.side*Math.PI*.48:0;
    pivot.rotation.y+=(angle-pivot.rotation.y)*(1-Math.exp(-12*dt));
  }
 actorPivot.position.set(state.x,state.y,state.z);
 updateEntryAction();
 actorPivot.rotation.y=state.heading;
 if(animator){
  animator.play(state.state);
  animator.update(dt);
 }
 const pose=controller.getCameraPose();
 eyeTarget.set(pose.eye.x,pose.eye.y,pose.eye.z);
 lookTarget.set(pose.aim.x,pose.aim.y,pose.aim.z);
 // Interpolation is frame-rate independent; reset teleports without animation.
 const amount=1-Math.exp(-15*dt);
 camera.position.lerp(eyeTarget,amount);
 camera.lookAt(lookTarget);
 }
 renderer.render(scene,camera);
 frames++;
 const now=performance.now();
 if(now-lastReport>1050){
  const measuredFps=frames*1000/(now-lastReport);
  $("fps").textContent="FPS: "+Math.round(measuredFps)+
   (lab?" · СВОБОДНАЯ КАМЕРА":
    " · "+(controller.view==="first"?"1-е лицо":"3-е лицо"));
  studio.update({fps:measuredFps,state});
  if(ready&&!lab){
   $("actor-status").textContent=state.inside?
      "Подъезд №1 · "+state.entranceZone+" · отметка "+state.y.toFixed(2)+" м":
      state.collided?"Стена: проход закрыт":
     animator.warning||"Скорость: "+state.speed.toFixed(1)+" м/с";
  }
  frames=0;lastReport=now;
 }
 lastState=state.state;
}
animate();
window.miniCityStage41Ready=true;

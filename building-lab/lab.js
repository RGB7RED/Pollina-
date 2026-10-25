import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {BUILDING,buildApartmentHouse} from "./building.js?v=478";
import {encodeHouseGLB,downloadGLB} from "./export-glb.js";
import {applyFacadeFinishes} from "./materials.js";
import {FreeCamera,normalizedStick,CAMERA_SPEEDS,LOOK_SENSITIVITIES} from "./free-camera.js";
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x6c8294);
scene.fog=new THREE.Fog(0x6c8294,185,395);
const camera=new THREE.PerspectiveCamera(43,Math.max(.2,innerWidth/innerHeight),.15,650);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.17;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("stage").appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=true;
controls.minDistance=7;controls.maxDistance=285;controls.maxPolarAngle=Math.PI/2-.025;
controls.target.set(0,8,0);controls.update();
const ambient=new THREE.HemisphereLight(0xb6cbdd,0x56615b,1.48);
scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffb993,1.95);
sun.position.set(-28,17,21);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-72;sun.shadow.camera.right=72;
sun.shadow.camera.top=46;sun.shadow.camera.bottom=-46;
sun.shadow.camera.near=1;sun.shadow.camera.far=95;
sun.shadow.normalBias=.055;sun.target.position.set(0,6,0);
scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xc5d6dd,.68);
fill.position.set(35,17,-20);scene.add(fill);
const {root,stats,config,roofTop}=buildApartmentHouse(THREE);
const finishes=applyFacadeFinishes(THREE,root);
scene.add(root);
// Two subtle, non-shadow-casting porch lights. Four real-time point lights
// on mobile would cost substantially more per pixel for little visual gain.
const entryXs=root.userData.geometryAudit.doorPositions;
const porchLights=[entryXs[1],entryXs[2]].map(x=>{
  const light=new THREE.PointLight(0xffb56e,3.7,6.5,2);
  light.position.set(x,2.9,config.width/2+1.1);
  light.castShadow=false;
  scene.add(light);
  return light;
});
function plane(w,h,color,x,y,z){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshStandardMaterial({color,roughness:.99}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;
}
// Standalone HOUSE inspection: a plain neutral presentation floor only.
// The entire road, sidewalks, grass and street furniture belong to
// street-lab / play-lab, never to the building's own asset viewer.
plane(146,84,0x939d9a,0,-.08,0);
let timeIndex=0,qualityIndex=1,viewName="threequarter";
const modes=[
 {label:"Низкое",pixelRatio:.85,shadows:false,map:512},
 {label:"Среднее",pixelRatio:1.2,shadows:true,map:1024},
 {label:"Высокое",pixelRatio:1.65,shadows:true,map:1536}
];
const lighting=[
 {label:"🌆 Вечер",background:0x6c8294,ambient:1.48,sun:1.95,fill:.68,lamps:true,exposure:1.20},
 {label:"☁️ Дневной осмотр",background:0xb3c0c6,ambient:2.20,sun:2.35,fill:1.0,lamps:false,exposure:1.15}
];
function applyTime(){
 const l=lighting[timeIndex];scene.background.setHex(l.background);scene.fog.color.setHex(l.background);
 ambient.intensity=l.ambient;sun.intensity=l.sun;fill.intensity=l.fill;
 for(const lamp of porchLights)lamp.visible=l.lamps;
 renderer.toneMappingExposure=l.exposure;
 $("time").textContent=l.label;
}
function applyQuality(){
 const q=modes[qualityIndex];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));
 renderer.shadowMap.enabled=q.shadows;sun.castShadow=q.shadows;
 sun.shadow.mapSize.set(q.map,q.map);
 if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
 $("quality").textContent="⚙ "+q.label;
 $("quality-info").textContent="Качество: "+q.label.toLowerCase();
}
function baseFit(){
 const radius=config.length/2+4;
 const vfov=THREE.MathUtils.degToRad(camera.fov);
 const hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
 const d=radius/Math.sin(hfov/2);
 return THREE.MathUtils.clamp(Math.max(d*1.15,roofTop/Math.sin(vfov/2)*.78),54,245);
}
function setView(name){
 const views={front:[0,.2,1],threequarter:[.95,.34,1],end:[1,.21,0],top:[.15,1,.12]};
 const u=views[name]||views.threequarter;
 viewName=name;
 const d=baseFit()*(name==="end"?.79:name==="top"?.72:1);
 const offset=new THREE.Vector3(u[0],u[1],u[2]).normalize().multiplyScalar(d);
 camera.position.copy(controls.target).add(offset);
 controls.update();
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 $("view-label").textContent="Ракурс: "+({front:"фасад",threequarter:"¾",end:"торец",top:"сверху"}[name]);
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("time").addEventListener("click",()=>{timeIndex=(timeIndex+1)%lighting.length;applyTime();});
$("quality").addEventListener("click",()=>{qualityIndex=(qualityIndex+1)%modes.length;applyQuality();});
$("reset").addEventListener("click",()=>{if(activeFly())return;controls.target.set(0,8,0);setView("threequarter");});
$("building-info").textContent=config.floors+" этажей · "+stats.entrances+" подъезда · "+stats.balconies+" балконов · "+finishes.textures+" текстуры";
let exporting=false;
$("export-glb").addEventListener("click",async()=>{
  if(exporting)return;
  exporting=true;
  $("export-glb").disabled=true;
  $("export-glb").textContent="Экспорт…";
  $("export-message").textContent="Подготовка GLB на устройстве…";
  try{
    const {buffer,stats:portable}=await encodeHouseGLB(THREE,root);
    downloadGLB(buffer);
    const size=(buffer.byteLength/1048576).toFixed(1);
    $("export-message").textContent=
      "Готово: apartment_house.glb ("+size+" МБ), "+portable.totalNodes+" групп.";
  }catch(error){
    console.error("Building GLB export failed",error);
    $("export-message").textContent="Не удалось экспортировать GLB. Открой консоль для подробностей.";
  }finally{
    exporting=false;
    $("export-glb").disabled=false;
    $("export-glb").textContent="↓ Скачать GLB";
  }
});

/* 3.1.1: ORBIT is retained, FREE is a separate explicit XYZ inspection mode.
   No change to the building geometry, materials or baseline render budget. */
const free=new FreeCamera(camera);
let freeWasEntered=false;
let lookPointer=null,stickPointer=null;
let lookX=0,lookY=0;
const stick=$("stick-zone"),knob=$("stick-knob");
const verticalPressed=new Set();
const activeFly=()=>free.active;
function centerStick(){
  stickPointer=null;
  free.setStick(0,0);
  knob.style.left="50%";knob.style.top="50%";
}
function releaseInputs(){
  lookPointer=null;
  verticalPressed.clear();
  free.setVertical(0);
  free.clearInputs();
  centerStick();
  for(const id of ["fly-up","fly-down"])$(id).classList.remove("held");

}
function toggleFreeCamera(enabled=!activeFly()){
  if(enabled===activeFly())return;
  // Undo any pointer captures and pressed state before changing modes.
  releaseInputs();
  if(enabled){
    // Enter near the facade when the orbit camera starts hundreds of metres
    // away in portrait mode. Switching back never teleports unexpectedly.
    const p=camera.position;
    if(!freeWasEntered&&Math.hypot(p.x,p.z)>57){
      p.set(3.5,9.2,27);
      free.start({x:3.5,y:8.9,z:6.5});
    }else free.start(controls.target);
    freeWasEntered=true;
    controls.enabled=false;
    document.body.classList.add("fly-mode");
    $("freecam-toggle").classList.add("active");
    $("freecam-toggle").setAttribute("aria-pressed","true");
    $("freecam-toggle").textContent="◉ Свободная: ВКЛ";
    $("view-label").textContent="Ракурс: свободный";
    $("telemetry").classList.add("collapsed");
    $("hide-hud").textContent="▸ Показать";
  }else{
    const t=free.targetAt(14);
    free.stop();controls.enabled=true;
    controls.target.set(t.x,t.y,t.z);
    controls.update();
    document.body.classList.remove("fly-mode");
    $("freecam-toggle").classList.remove("active");
    $("freecam-toggle").setAttribute("aria-pressed","false");
    $("freecam-toggle").textContent="✥ Свободная камера";
    $("view-label").textContent="Ракурс: осмотр";
  }
}
$("freecam-toggle").addEventListener("click",()=>toggleFreeCamera());
$("hide-hud").addEventListener("click",()=>{
  const collapsed=$("telemetry").classList.toggle("collapsed");
  $("hide-hud").textContent=collapsed?"▸ Показать":"▾ Свернуть";
});
$("stick-zone").addEventListener("pointerdown",e=>{
  if(!activeFly()||stickPointer!==null)return;
  e.preventDefault();stickPointer=e.pointerId;
  try{stick.setPointerCapture?.(e.pointerId);}catch(_){/* Safari */}
  moveStick(e);
});
function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  const rect=stick.getBoundingClientRect();
  const p=normalizedStick(e.clientX,e.clientY,rect);
  free.setStick(p.x,p.z);
  const r=Math.min(rect.width,rect.height)*.39;
  knob.style.left=(rect.width/2+p.x*r)+"px";
  knob.style.top=(rect.height/2-p.z*r)+"px";
}
$("stick-zone").addEventListener("pointermove",moveStick);
for(const event of ["pointerup","pointercancel","lostpointercapture"]){
  stick.addEventListener(event,e=>{
    if(e.pointerId===stickPointer)centerStick();
  });
}
// Hold-to-elevate works simultaneously with horizontal joystick and look swipe.
function refreshVertical(){
  free.setVertical((verticalPressed.has(1)?1:0)-(verticalPressed.has(-1)?1:0));
}
for(const [id,dir] of [["fly-up",1],["fly-down",-1]]){
  const el=$(id);
  el.addEventListener("pointerdown",e=>{
    if(!activeFly())return;
    e.preventDefault();el.setPointerCapture?.(e.pointerId);
    verticalPressed.add(dir);
    refreshVertical();
    el.classList.add("held");
  });
  for(const event of ["pointerup","pointercancel","lostpointercapture"]){
    el.addEventListener(event,()=>{
      verticalPressed.delete(dir);
      refreshVertical();
      el.classList.remove("held");
    });
  }
}
// Flight settings: three genuinely different speeds and look sensitivities.
function updateFlightLabels(){
  $("flight-speed").textContent="⚡ "+CAMERA_SPEEDS[free.speedMode].label;
  $("flight-look").textContent="🎯 Обзор: "+LOOK_SENSITIVITIES[free.lookMode].label.toLowerCase();
}
$("flight-speed").addEventListener("click",()=>{
  free.setSpeedMode(free.speedMode+1);
  updateFlightLabels();
});
$("flight-look").addEventListener("click",()=>{
  free.setLookMode(free.lookMode+1);
  updateFlightLabels();
});
function focusFacade(){
  if(!activeFly())return;
  releaseInputs();
  camera.position.set(3.5,9.2,27);
  free.start({x:3.5,y:8.9,z:6.5});
  $("view-label").textContent="Ракурс: около фасада";
}
$("fly-focus").addEventListener("click",focusFacade);
updateFlightLabels();
const stageCanvas=renderer.domElement;
stageCanvas.addEventListener("pointerdown",e=>{
  if(!activeFly()||lookPointer!==null)return;
  e.preventDefault();lookPointer=e.pointerId;
  lookX=e.clientX;lookY=e.clientY;
  try{stageCanvas.setPointerCapture?.(lookPointer);}catch(_){/* Safari */}
});
stageCanvas.addEventListener("pointermove",e=>{
  if(!activeFly()||e.pointerId!==lookPointer)return;
  e.preventDefault();
  const dx=e.clientX-lookX,dy=e.clientY-lookY;
  free.look(dx,dy);
  lookX=e.clientX;lookY=e.clientY;
});
for(const name of ["pointerup","pointercancel","lostpointercapture"]){
  stageCanvas.addEventListener(name,e=>{
    if(e.pointerId===lookPointer)lookPointer=null;
  });
}
const movementKeys=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE",
  "Space","ArrowUp","ArrowLeft","ArrowDown","ArrowRight","ControlLeft",
  "ShiftLeft","ShiftRight"]);
window.addEventListener("keydown",e=>{
  if(!activeFly()||!movementKeys.has(e.code))return;
  e.preventDefault();free.keys.add(e.code);
});
window.addEventListener("keyup",e=>free.keys.delete(e.code));
window.addEventListener("blur",releaseInputs);
document.addEventListener("visibilitychange",()=>{
  if(document.hidden)releaseInputs();
});
// Reset is intentionally different by mode: free mode resets to a safe pose
// and stays free; orbit mode returns to ¾.
$("reset").addEventListener("click",()=>{
  if(!activeFly())return;
  focusFacade();
});

const status=$("status");
if(stats.entrances!==4||stats.balconies<10||stats.windows<200){
 status.hidden=false;status.textContent="Ошибка геометрического контракта";
}
function resize(){
  // Do NOT call setView: Safari can fire resize during URL-bar movement or
  // device rotation. Reframing here caused spontaneous camera teleports.
  camera.aspect=Math.max(.2,innerWidth/innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  applyQuality();
}
window.addEventListener("resize",resize);
window.addEventListener("orientationchange",()=>{
  releaseInputs();
  setTimeout(resize,200);
});
applyTime();
resize();
setView("threequarter");
let frameAt=performance.now(),frames=0,lastTick=performance.now();
function animate(){
 requestAnimationFrame(animate);
 const current=performance.now();
 const dt=Math.min(.05,Math.max(0,(current-lastTick)/1000));
 lastTick=current;
 if(activeFly()){
   free.update(dt);
   $("free-position").textContent="XYZ: "+
     camera.position.x.toFixed(1)+" / "+camera.position.y.toFixed(1)+" / "+camera.position.z.toFixed(1);
 }else{
   controls.update();
   $("free-position").textContent="";
 }
 renderer.render(scene,camera);frames++;
 const now=performance.now();
 if(now-frameAt>1100){
  $("fps").textContent="FPS: "+Math.round(frames*1000/(now-frameAt));
  $("render").textContent="Рис.: "+renderer.info.render.calls+" · Трис.: "+Math.round(renderer.info.render.triangles/1000)+"k";
  frames=0;frameAt=now;
 }
}
animate();window.buildingLabReady=true;

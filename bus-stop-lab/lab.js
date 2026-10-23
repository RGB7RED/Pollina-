import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {createBusStop,auditBusStop} from "./bus-stop.js";

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9aafb8);
const camera=new THREE.PerspectiveCamera(46,Math.max(.25,innerWidth/innerHeight),.08,85);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.24;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
$("stage").append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.09;
controls.enablePan=true;
controls.screenSpacePanning=true;
controls.minDistance=1.3;
controls.maxDistance=22;
controls.minPolarAngle=.035;
controls.maxPolarAngle=Math.PI-.12;
controls.target.set(.14,1.55,0);
controls.update();

const hemisphere=new THREE.HemisphereLight(0xffffff,0x6c7678,2.05);
scene.add(hemisphere);
const sunlight=new THREE.DirectionalLight(0xffe2ad,2.2);
sunlight.position.set(-4,9,6);scene.add(sunlight);
const rim=new THREE.DirectionalLight(0xc1d9ef,.65);
rim.position.set(5,5,-6);scene.add(rim);

const sidewalk=new THREE.Mesh(new THREE.PlaneGeometry(18,6),
 new THREE.MeshStandardMaterial({color:0x929994,roughness:1}));
sidewalk.rotation.x=-Math.PI/2;sidewalk.position.set(0,-.04,0);
scene.add(sidewalk);
const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(18,6),
 new THREE.MeshStandardMaterial({color:0x515b60,roughness:1}));
asphalt.rotation.x=-Math.PI/2;asphalt.position.set(0,-.047,5.9);
scene.add(asphalt);
const kerb=new THREE.Mesh(new THREE.BoxGeometry(18,.12,.18),
 new THREE.MeshStandardMaterial({color:0xc3c1b6,roughness:1}));
kerb.position.set(0,.005,2.95);scene.add(kerb);

const {root}=createBusStop(THREE);
scene.add(root);
const audit=auditBusStop(THREE,root);
$("triangles").textContent="Треугольники модели: "+audit.triangles.toLocaleString("ru-RU");
$("material-count").textContent="Материалы: "+audit.materials;
$("dimensions").textContent="Габариты (вкл. знак): "+audit.size.x.toFixed(2)+" × "+
  audit.size.y.toFixed(2)+" × "+audit.size.z.toFixed(2)+" м";
if(audit.triangles>10000||audit.meshDraws>40){
  $("development").textContent="Превышен мобильный бюджет · нужна оптимизация";
}
let currentView="threequarter";
function setView(name){
  const position={
    threequarter:[7.1,4.3,7.8],
    front:[0,3.05,9.8],
    side:[9.8,3.05,0],
    top:[.16,11.3,1.2]
  }[name];
  if(!position)return;
  currentView=name;
  controls.target.set(.14,1.55,0);
  camera.position.set(...position);
  controls.update();
  document.querySelectorAll("[data-view]").forEach(b=>
    b.classList.toggle("active",b.dataset.view===name));
}
document.querySelectorAll("[data-view]").forEach(button=>
 button.addEventListener("click",()=>setView(button.dataset.view)));
$("reset").addEventListener("click",()=>setView("threequarter"));
$("collapse").addEventListener("click",()=>{
  const collapsed=$("telemetry").classList.toggle("collapsed");
  $("collapse").setAttribute("aria-expanded",String(!collapsed));
});
let night=false;
$("lighting").addEventListener("click",()=>{
  night=!night;
  sunlight.intensity=night?.65:2.2;
  hemisphere.intensity=night?1.05:2.05;
  scene.background.setHex(night?0x2c4656:0x9aafb8);
  $("lighting").textContent=night?"🌙 Вечер":"☀️ День";
});
setView("threequarter");
function resize(){
  camera.aspect=Math.max(.25,innerWidth/innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);
  // Do not reframe on Safari URL-bar changes: preserve manual camera position.
}
window.addEventListener("resize",resize);
resize();

let frames=0,lastFpsTime=performance.now(),fps=0;
function draw(now){
  controls.update();
  renderer.render(scene,camera);
  frames++;
  if(now-lastFpsTime>=1000){
    fps=Math.round(frames*1000/(now-lastFpsTime));
    frames=0;lastFpsTime=now;
    $("fps").textContent="FPS: "+fps;
    $("drawcalls").textContent="Вызовы отрисовки (вся сцена): "+
      renderer.info.render.calls+" · трис. сцены: "+renderer.info.render.triangles;
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
window.addEventListener("pagehide",()=>{
  renderer.setAnimationLoop(null);
});

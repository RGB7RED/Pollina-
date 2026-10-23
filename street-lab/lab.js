import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {BUILDING} from "../building-lab/building.js";
import {planStreet,buildStreet} from "../play-lab/street.js";
import {mountInspectionFlight} from "../object-viewer/free-flight.js";

const $=id=>document.getElementById(id);
// The street is an independent model. House dimensions inform the STREET
// PLAN but house meshes (and house facade materials) are never constructed.
const plan=planStreet(BUILDING,[],{buildingPresent:false,furniture:false});
const street=buildStreet(THREE,plan);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9eafbc);
scene.add(street);
scene.add(new THREE.HemisphereLight(0xd0e4ed,0x627667,2.0));
const sun=new THREE.DirectionalLight(0xffdfb4,2.05);
sun.position.set(-28,28,19);scene.add(sun);
const camera=new THREE.PerspectiveCamera(49,Math.max(.25,innerWidth/innerHeight),.12,850);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.2));
$("stage").append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enablePan=true;orbit.screenSpacePanning=true;
orbit.enableDamping=true;orbit.dampingFactor=.08;
orbit.minDistance=2;orbit.maxDistance=620;
orbit.maxPolarAngle=Math.PI-.05;
let view="overview";
function setView(name){
  const hfov=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect);
  const overviewDistance=Math.max(112,67/Math.max(.12,Math.sin(hfov/2)));
  const presets={
    overview:{target:[0,0,8],pos:[.9,.47,1.0],dist:overviewDistance},
    road:{target:[0,1,20],pos:[.65,.40,1],dist:29},
    grass:{target:[17,0,-19],pos:[.70,.40,1],dist:14},
    top:{target:[0,0,8],pos:[.08,1,.08],dist:overviewDistance*.83}
  };
  const p=presets[name];if(!p)return;
  view=name;
  orbit.target.set(...p.target);
  const delta=new THREE.Vector3(...p.pos).normalize().multiplyScalar(p.dist);
  camera.position.copy(orbit.target).add(delta);orbit.update();
  document.querySelectorAll("[data-view]").forEach(b=>
    b.classList.toggle("active",b.dataset.view===name));
}
document.querySelectorAll("[data-view]").forEach(b=>
  b.addEventListener("click",()=>setView(b.dataset.view)));
$("reset").addEventListener("click",()=>setView("overview"));
$("collapse").addEventListener("click",()=>{
  const folded=$("telemetry").classList.toggle("collapsed");
  $("collapse").setAttribute("aria-expanded",String(!folded));
});
setView("overview");
const flight=mountInspectionFlight({
 camera,orbit,canvas:renderer.domElement,
 speed:9,limits:{x:450,z:450,yMin:.2,yMax:200},
 resetPose:()=>setView("road")
});
let modelTris=0;
street.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry,triangleCount=Math.floor((g.index?.count||g.attributes.position?.count||0)/3);
  modelTris+=triangleCount*(o.isInstancedMesh?o.count:1);
});
$("triangles").textContent="Треугольники улицы: "+modelTris.toLocaleString("ru-RU");
$("lawn").textContent="Кустики травы: "+plan.grassTufts.length.toLocaleString("ru-RU");
$("objects").textContent="На этой модели: 0 домов · 0 деревьев · "+
 "0 фонарей · 0 скамеек";
function resize(){
 camera.aspect=Math.max(.25,innerWidth/innerHeight);
 camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
 // Never reset camera on Safari toolbar resize or device rotation.
}
window.addEventListener("resize",resize);resize();
let tickAt=performance.now(),fpsAt=tickAt,frames=0;
function tick(now){
 requestAnimationFrame(tick);
 const dt=Math.min(.05,Math.max(0,(now-tickAt)/1000));tickAt=now;
 if(flight.active)flight.update(dt);else orbit.update();
 renderer.render(scene,camera);
 frames++;
 if(now-fpsAt>=1000){
  $("fps").textContent="FPS: "+Math.round(frames*1000/(now-fpsAt));
  $("calls").textContent="Вызовы сцены: "+renderer.info.render.calls;
  fpsAt=now;frames=0;
 }
}
requestAnimationFrame(tick);

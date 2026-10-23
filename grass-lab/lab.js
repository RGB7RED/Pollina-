import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {sampleGrassTufts,buildStreet} from "../play-lab/street.js";
import {BLADES_PER_TUFT,TRIANGLES_PER_TUFT} from "../play-lab/grass.js";
import {mountInspectionFlight} from "../object-viewer/free-flight.js";

const $=id=>document.getElementById(id);
const plot={kind:"grass",x:0,z:0,width:18,depth:18,y:-.10};
const grassTufts=sampleGrassTufts([plot],{length:0,width:0},[],
  {buildingPresent:false});
// The model comes from the same street builder, but with an isolated
// grass-only plan. No separate visual approximation or duplicated source.
const plan={
 surfaces:[plot],markings:[],curbs:[],
 trees:[],lamps:[],benches:[],obstacles:[],grassTufts,
 info:{grassTufts:grassTufts.length,trees:0,lamps:0,benches:0,
  roadLength:0,roadWidth:0}
};
const root=buildStreet(THREE,plan);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa6c3cb);
scene.add(root);
scene.add(new THREE.HemisphereLight(0xe0f1ee,0x56725b,2.2));
const sun=new THREE.DirectionalLight(0xf7e8b7,2);
sun.position.set(-5,9,6);scene.add(sun);
const camera=new THREE.PerspectiveCamera(49,Math.max(.25,innerWidth/innerHeight),.04,130);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));
$("stage").append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.enablePan=true;orbit.screenSpacePanning=true;
orbit.minDistance=.25;orbit.maxDistance=38;orbit.maxPolarAngle=Math.PI-.02;
function setView(name){
 const presets={
  threequarter:{target:[0,.05,0],offset:[9,6.2,10]},
  detail:{target:[1,.19,1],offset:[.7,.28,.8]},
  top:{target:[0,0,0],offset:[.06,15,.2]}
 };
 const pose=presets[name];if(!pose)return;
 orbit.target.set(...pose.target);
 camera.position.copy(orbit.target).add(new THREE.Vector3(...pose.offset));
 orbit.update();
 document.querySelectorAll("[data-view]").forEach(b=>
   b.classList.toggle("active",b.dataset.view===name));
}
document.querySelectorAll("[data-view]").forEach(b=>
 b.addEventListener("click",()=>setView(b.dataset.view)));
$("reset").addEventListener("click",()=>setView("threequarter"));
$("collapse").addEventListener("click",()=>{
 const folded=$("telemetry").classList.toggle("collapsed");
 $("collapse").setAttribute("aria-expanded",String(!folded));
});
setView("threequarter");
const flight=mountInspectionFlight({
 camera,orbit,canvas:renderer.domElement,
 speed:1.6,limits:{x:35,z:35,yMin:.13,yMax:25},
 resetPose:()=>setView("detail")
});
$("tufts").textContent="Пучки на образце: "+grassTufts.length;
$("blades").textContent="Листья на образце: "+(grassTufts.length*BLADES_PER_TUFT);
$("triangles").textContent="Треугольники травы: "+(grassTufts.length*TRIANGLES_PER_TUFT).toLocaleString("ru-RU");
function resize(){
 camera.aspect=Math.max(.25,innerWidth/innerHeight);
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight,false);
}
window.addEventListener("resize",resize);resize();
let prev=performance.now(),fpsAt=prev,frames=0;
function tick(now){
 requestAnimationFrame(tick);
 const dt=Math.min(.05,Math.max(0,(now-prev)/1000));prev=now;
 if(flight.active)flight.update(dt);else orbit.update();
 renderer.render(scene,camera);frames++;
 if(now-fpsAt>=1000){
  $("fps").textContent="FPS: "+Math.round(frames*1000/(now-fpsAt));
  $("calls").textContent="Вызовы отрисовки сцены: "+renderer.info.render.calls;
  frames=0;fpsAt=now;
 }
}
requestAnimationFrame(tick);

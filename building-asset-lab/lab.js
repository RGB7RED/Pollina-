import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {buildBuildingPart,PARTS} from "./asset.js";
const $=id=>document.getElementById(id);
const id=new URL(location.href).searchParams.get("model");
if(!Object.hasOwn(PARTS,id)){
 $("fail").hidden=false;$("fail").textContent="Неизвестная модель. Выберите объект в каталоге.";
 throw Error("Unknown building part "+String(id));
}
const {root,spec,stats}=buildBuildingPart(THREE,id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x829a9d);
scene.add(new THREE.HemisphereLight(0xdaf2f3,0x576d65,2.2));
const sun=new THREE.DirectionalLight(0xffefce,2.0);
sun.position.set(-3,8,5);scene.add(sun);scene.add(root);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
renderer.outputColorSpace=THREE.SRGBColorSpace;
$("stage").append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(47,1,.05,140);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.dampingFactor=.1;orbit.enablePan=true;
orbit.maxDistance=45;orbit.minDistance=.24;
const h=spec.height,focus=new THREE.Vector3(0,id==="ceiling_lamp"?-.05:h/2,0);
const distance=Math.max(2.8,h*1.8);
function view(dir){
 const positions={front:[0,.32,1],side:[1,.32,0],top:[.05,1,.05],three:[1,.52,1]};
 const v=new THREE.Vector3(...positions[dir]).normalize().multiplyScalar(distance);
 orbit.target.copy(focus);camera.position.copy(focus).add(v);orbit.update();
}
for(const b of document.querySelectorAll("[data-view]"))
 b.addEventListener("click",()=>view(b.dataset.view));
view("three");
$("title").textContent=id.replaceAll("_"," ")+" · отдельная модель";
$("info").textContent="Тип: "+spec.family+" · Размер: "+spec.width+" × "+spec.height+
 " м · Элементов: "+stats.elements+" · "+(spec.instances??"вариант")+" экземпляров";
$("back").href="../studio/catalog.html?category="+
 ({door:"door",window:"window",heating:"heating",lighting:"lighting",utility:"utility"}[spec.family]);
const resize=()=>{
 camera.aspect=innerWidth/Math.max(1,innerHeight);
 camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
};
addEventListener("resize",resize);resize();
let f=0,last=performance.now(),start=last;
function animate(t){
 requestAnimationFrame(animate);const dt=Math.min(.05,(t-last)/1000);last=t;
 orbit.update();renderer.render(scene,camera);f++;
 if(t-start>1200){$("metrics").textContent="FPS: "+Math.round(f*1000/(t-start))+
 " · Вызовы: "+renderer.info.render.calls;f=0;start=t;}
}
requestAnimationFrame(animate);
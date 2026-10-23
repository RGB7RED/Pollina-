import assert from "node:assert/strict";
import {BUILDING} from "../building-lab/building.js";
import {planStreet} from "./street.js";
import {PlayerController} from "./controller.js";
import {DeveloperStudio,MODES,parseStudioMode,renderDebugInfo,
  buildColliderGizmos} from "./studio.js";

assert.equal(parseStudioMode(""),MODES.LAB,"old playable links default to lab");
assert.equal(parseStudioMode("?mode=lab"),MODES.LAB);
assert.equal(parseStudioMode("?mode=game"),MODES.GAME);
assert.equal(parseStudioMode("?x=abc&mode=game"),MODES.GAME);
assert.equal(parseStudioMode("?mode=wrong"),MODES.LAB);
const formatted=renderDebugInfo({
  fps:29.6,drawCalls:41,triangles:67687,
  geometries:31,textures:8,
  position:{x:1.274,z:-3.128},view:"first",collided:true
});
assert.match(formatted.performance,/FPS: 30/);
assert.match(formatted.performance,/Вызовы: 41/);
assert.match(formatted.actor,/X: 1\.27 м · Z: -3\.13 м · 1-е лицо/);
assert.match(formatted.collision,/ДА/);

const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
  x,width:5.50,depth:3.15,centreZ:7.875
}));
const streetPlan=planStreet(BUILDING,pads);
const controller=new PlayerController({
  building:BUILDING,pads,extras:streetPlan.obstacles
});
class Vec{set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
  constructor(){this.position=new Vec();this.scale=new Vec();
    this.matrix={clone:()=>({position:{...this.position},scale:{...this.scale}})};}
  updateMatrix(){}
}
class Batch{
  constructor(g,m,n){this.geometry=g;this.material=m;this.count=n;
    this.matrices=[];this.instanceMatrix={needsUpdate:false};}
  setMatrixAt(i,m){this.matrices[i]=m.clone();}
  computeBoundingSphere(){this.boundsComputed=true;}
}
const THREE={BoxGeometry:class{},MeshBasicMaterial:class{constructor(o){Object.assign(this,o)}},
 InstancedMesh:Batch,Object3D:Obj};
const lines=buildColliderGizmos(THREE,controller.obstacles);
assert.equal(lines.count,37);
assert.equal(lines.matrices.length,37);
assert.equal(lines.visible,false);
assert.equal(lines.boundsComputed,true);
assert.equal(lines.material.depthTest,false);
const houseBox=lines.matrices[0];
assert.equal(houseBox.scale.x,BUILDING.length);
assert.equal(houseBox.scale.z,BUILDING.width);
assert.equal(lines.matrices[1].scale.x,5.5);
assert.ok(Math.abs(lines.matrices[1].scale.z-3.15)<1e-8);
for(let i=0;i<lines.count;i++){
  assert.ok(lines.matrices[i].scale.x>0&&lines.matrices[i].scale.z>0);
}
class FakeClassList{
 constructor(){this.set=new Set();}
 toggle(cls,val){
  if(val===undefined){if(this.set.has(cls)){this.set.delete(cls);return false;}
    this.set.add(cls);return true;}
  if(val)this.set.add(cls);else this.set.delete(cls);
  return val;
 }
 contains(cls){return this.set.has(cls);}
}
class Node{
 constructor(id){this.id=id;this.textContent="";this.hidden=false;
  this.attributes={};this.events={};this.classList=new FakeClassList();}
 addEventListener(event,fn){this.events[event]=fn;}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k];}
 fire(event){if(!this.events[event])throw Error("unbound "+event+" on "+this.id);
  this.events[event]();}
}
const ids=["mode-toggle","devtools","devtools-toggle","devtools-body",
 "dev-collisions","dev-perf","dev-resources","dev-player","dev-hit",
 "dev-objects","dev-route"];
const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));
const prevWindow=globalThis.window,prevDocument=globalThis.document;
const popstateHandlers={};
const href="https://rawcdn.githack.com/RGB7RED/Pollina-/SHA/play-lab/index.html?mode=lab";
const fakeWindow={
 location:{search:"?mode=lab",href},
 history:{pushState(state,title,url){
   const u=new URL(url);fakeWindow.location.search=u.search;
   fakeWindow.location.href=u.toString();
 }},
 addEventListener(type,handler){popstateHandlers[type]=handler;}
};
globalThis.window=fakeWindow;
globalThis.document={
  body:{classList:new FakeClassList()},
  title:"",
  getElementById:id=>nodes[id]||null
};
const scene={children:[],add(obj){this.children.push(obj)}};
const renderer={info:{render:{calls:29,triangles:62000},
 memory:{geometries:31,textures:8}}};
const house={children:Array(26)},street={children:Array(18)};
try{
 const studio=new DeveloperStudio({
   THREE,scene,renderer,controller,house,street,streetPlan
 });
 assert.equal(studio.mode,"lab");
 assert.equal(nodes.devtools.hidden,false);
 assert.ok(globalThis.document.body.classList.contains("lab-mode"));
 assert.match(nodes["dev-objects"].textContent,/22 деревьев/);
 assert.match(nodes["dev-route"].textContent,/37/);
 assert.equal(scene.children.length,0,"debug meshes lazily created");
 const initialPosition={...controller.position};
 studio.update({fps:30.1,state:{...controller.position,collided:false}});
 assert.match(nodes["dev-perf"].textContent,/FPS: 30/);
 assert.match(nodes["dev-resources"].textContent,/Геометрии: 31/);
 nodes["dev-collisions"].fire("click");
 assert.equal(scene.children.length,1);
 assert.equal(studio.collisionsShown,true);
 assert.equal(scene.children[0].visible,true);
 assert.equal(nodes["dev-collisions"].getAttribute("aria-pressed"),"true");
 nodes["mode-toggle"].fire("click");
 assert.equal(studio.mode,"game");
 assert.equal(nodes.devtools.hidden,true);
 assert.equal(studio.collisionsShown,false);
 assert.equal(scene.children[0].visible,false);
 assert.match(fakeWindow.location.search,/mode=game/);
 assert.ok(globalThis.document.body.classList.contains("game-mode"));
 assert.deepEqual(controller.position,initialPosition,
   "switching view mode may not reset character");
 const before=nodes["dev-perf"].textContent;
 studio.update({fps:10,state:{x:0,z:0,collided:true}});
 assert.equal(nodes["dev-perf"].textContent,before,
   "gameplay must not update developer UI");
 nodes["mode-toggle"].fire("click");
 assert.equal(studio.mode,"lab");
 assert.equal(scene.children.length,1,"re-use debug batch");
 nodes["devtools-toggle"].fire("click");
 assert.equal(nodes["devtools-body"].hidden,true);
 assert.equal(nodes["devtools-toggle"].getAttribute("aria-expanded"),"false");
 nodes["devtools-toggle"].fire("click");
 assert.equal(nodes["devtools-body"].hidden,false);
 // Browser back changes UI, not scene or renderer.
 fakeWindow.location.search="?mode=game";
 popstateHandlers.popstate();
 assert.equal(studio.mode,"game");
 assert.equal(scene.children.length,1);
 assert.deepEqual(controller.position,initialPosition);
}finally{
 if(prevWindow===undefined)delete globalThis.window;
 else globalThis.window=prevWindow;
 if(prevDocument===undefined)delete globalThis.document;
 else globalThis.document=prevDocument;
}
console.log("MINI CITY 4.2.2 Developer Studio PASS: game/lab shared scene, on-demand collider overlay, live metrics, no reset, mobile UI contract");

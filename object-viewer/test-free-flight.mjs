import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FreeCamera,normalizedStick,CAMERA_SPEEDS,LOOK_SENSITIVITIES}
 from "../building-lab/free-camera.js";
const source=readFileSync(new URL("./free-flight.js",import.meta.url),"utf8");
assert.match(source,/\.\.\/building-lab\/free-camera\.js/);
assert.match(source,/setPointerCapture/);
assert.match(source,/window\.addEventListener\("keydown"/);
assert.match(source,/stopImmediatePropagation/);
assert.match(source,/visibilitychange/);
class Node{
 constructor(){this.children=[];this.handlers={};this.attrs={};
  this.hidden=false;this.style={};this.textContent="";this.set=new Set();
  this.classList={add:k=>this.set.add(k),remove:k=>this.set.delete(k),
   toggle:(k,on)=>{if(on===undefined)on=!this.set.has(k);
    if(on)this.set.add(k);else this.set.delete(k);return on;}};
 }
 append(...children){this.children.push(...children);}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 dispatch(k,props={}){this.handlers[k]?.({pointerId:0,clientX:0,clientY:0,
   preventDefault(){},stopImmediatePropagation(){},...props});}
 getBoundingClientRect(){return {left:0,top:0,width:120,height:120};}
 setPointerCapture(){}
}
class Vec{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
const camera={position:new Vec(3,2,5),rotation:{order:"YXZ",set(x,y,z){this.x=x;this.y=y;this.z=z;}}};
const orbit={enabled:true,target:new Vec(0,1,0),update(){this.updated=(this.updated||0)+1;}};
const document={body:new Node(),createElement:()=>new Node(),handlers:{},
 addEventListener(k,fn){this.handlers[k]=fn;}};
const window={handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}};
const js=source.replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,"");
const mount=new Function("document","window","FreeCamera","normalizedStick",
 "CAMERA_SPEEDS","LOOK_SENSITIVITIES",js+"\nreturn mountInspectionFlight;")(
 document,window,FreeCamera,normalizedStick,CAMERA_SPEEDS,LOOK_SENSITIVITIES);
let focusCount=0;
const flight=mount({camera,orbit,canvas:new Node(),
 resetPose(){focusCount++;camera.position.set(3,2,5);orbit.target.set(0,1,0);}});
assert.equal(document.body.children.length,2);
const bar=document.body.children[0],toggle=bar.children[0];
assert.equal(flight.active,false);
toggle.dispatch("click");
assert.equal(flight.active,true);
assert.equal(orbit.enabled,false);
assert.equal(document.body.children[1].hidden,false);
window.handlers.keydown({code:"KeyW",preventDefault(){},stopImmediatePropagation(){}});
assert.equal(flight.controller.keys.has("KeyW"),true);
const before={...camera.position};
for(let i=0;i<30;i++)flight.update(.033);
assert.ok(Math.hypot(camera.position.x-before.x,camera.position.z-before.z)>.05,
 "flight moves camera position independently of orbit target");
window.handlers.keyup({code:"KeyW",preventDefault(){},stopImmediatePropagation(){}});
assert.equal(flight.controller.keys.has("KeyW"),false);
bar.children[3].dispatch("click");
assert.equal(focusCount,1);
assert.equal(flight.active,true);
toggle.dispatch("click");
assert.equal(flight.active,false);
assert.equal(orbit.enabled,true);
assert.equal(document.body.children[1].hidden,true);
assert.equal(toggle.attrs["aria-pressed"],"false");
console.log("MINI CITY free-flight PASS: start, WASD, XYZ, focus, orbit restore, mobile controls");

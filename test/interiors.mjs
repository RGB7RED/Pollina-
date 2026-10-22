import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const src=readFileSync(new URL("../interiors.js",import.meta.url),"utf8");
new Script(src.replace(/^export /gm,""),{filename:"interiors.js"});
const {ENTRANCES,indoorBlocked,nearIndoorObject,buildInteriors}=
  new Function(src.replace(/^export /gm,"")+
    "\nreturn {ENTRANCES,indoorBlocked,nearIndoorObject,buildInteriors};")();

assert.equal(ENTRANCES.length,3);
assert.equal(new Set(ENTRANCES.map(e=>e.id)).size,3);
assert.ok(ENTRANCES.every(e=>Math.abs(e.x)<155&&Math.abs(e.z)<155));
assert.ok(!indoorBlocked(0,4.25),"indoor start must be accessible");
assert.ok(!indoorBlocked(4,-1.0),"mailboxes route must be accessible");
assert.ok(indoorBlocked(6.1,0),"room boundary must be solid");
assert.ok(indoorBlocked(-3.0,-3.2),"non-playable steps must be solid");
assert.equal(nearIndoorObject(0,4.25)?.type,"lobby-exit");
assert.equal(nearIndoorObject(4.4,-1.35)?.type,"mailboxes");
assert.equal(nearIndoorObject(0,0),null);

class Group {
  constructor(){
    this.children=[];this.visible=true;
    this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
    this.rotation={};
  }
  add(child){this.children.push(child);return this}
}
class Mesh {
  constructor(geo,mat){
    this.position={set(){}};
    this.rotation={};
    this.material=mat;
  }
}
const scene=new Group(),world=new Group();
let boxes=0,labels=0;
const build={
  THREE:{Group,Mesh,TorusGeometry:class{}},
  scene,world,
  mat:(color,opts={})=>({color,opts}),
  box:(w,h,d,material,x,y,z,parent)=>{
    assert.ok(parent?.add,"box needs its parent");
    boxes++;const m=new Mesh({},material);parent.add(m);return m;
  },
  orb:(r,material,x,y,z,parent)=>{
    assert.ok(parent?.add,"orb needs its parent");
    const m=new Mesh({},material);parent.add(m);return m;
  },
  label:()=>{labels++;return new Group();}
};
const rooms=buildInteriors(build);
assert.equal(rooms.length,3);
assert.equal(scene.children.length,3);
assert.ok(rooms.every(r=>r.root.visible===false));
assert.ok(rooms.every(r=>r.centerX>400));
assert.ok(world.children.length>=12,"street doors and markers must be discoverable");
assert.ok(boxes>100 && labels>=12);
console.log("Stairwell integration tests: OK — 3 rooms, doors, collision and actions");

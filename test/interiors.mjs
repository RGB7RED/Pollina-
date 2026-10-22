import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const src=readFileSync(new URL("../interiors.js",import.meta.url),"utf8");
new Script(src.replace(/^export /gm,""),{filename:"interiors.js"});
const {ENTRANCES,FLOOR_HEIGHT,indoorBlocked,indoorFloorHeight,nearIndoorObject,buildInteriors}=
 new Function(src.replace(/^export /gm,"")+
 "\nreturn {ENTRANCES,FLOOR_HEIGHT,indoorBlocked,indoorFloorHeight,nearIndoorObject,buildInteriors};")();

assert.equal(ENTRANCES.length,3);
assert.deepEqual(ENTRANCES.map(e=>e.floors),[5,5,3]);
assert.equal(new Set(ENTRANCES.map(e=>e.id)).size,3);
assert.ok(ENTRANCES.every(e=>Math.abs(e.x)<155&&Math.abs(e.z)<155));
assert.ok(!indoorBlocked(0,4.25),"lobby start must be accessible");
assert.ok(!indoorBlocked(4,-1.0),"mailboxes reachable");
assert.ok(!indoorBlocked(-3,-3),"stairs must be walkable now");
assert.ok(indoorBlocked(6.1,0)&&indoorBlocked(0,-7),"outer walls collision");
assert.equal(nearIndoorObject(0,5.35,0,5)?.type,"lobby-exit");
assert.equal(nearIndoorObject(4.4,-1.35,0,5)?.type,"mailboxes");
assert.equal(nearIndoorObject(2.8,-5.2,FLOOR_HEIGHT,5)?.type,"apartment");
assert.equal(nearIndoorObject(0,5.35,FLOOR_HEIGHT,5),null,"upstairs exit is not ground exit");

// Walk through the switchback stair path without teleportation.
// Each next point is a short walking step; floor height must rise smoothly.
function walkStairs(floors){
 let y=0;
 const heights=[y];
 const move=(x,z)=>{
   const next=indoorFloorHeight(x,z,y,floors);
   assert.ok(Math.abs(next-y)<.4,"stair height discontinuity at "+x+","+z+" ("+y+"→"+next+")");
   y=next;heights.push(y);
 };
 for(let floor=0;floor<floors-1;floor++){
   for(let i=0;i<=90;i++)move(-3.85,3.2-(3.2+4.15)*i/90);
   for(let i=0;i<=25;i++)move(-3.85+2.80*i/25,-4.15);
   for(let i=0;i<=90;i++)move(-1.05,-4.15+(3.2+4.15)*i/90);
   if(floor<floors-2)for(let i=0;i<=25;i++)move(-1.05-2.8*i/25,3.2);
 }
 assert.ok(Math.abs(y-(floors-1)*FLOOR_HEIGHT)<.12,"must reach highest storey "+floors);
 return heights.length;
}
assert.ok(walkStairs(5)>800);
assert.ok(walkStairs(3)>400);

class Group {
 constructor(){this.children=[];this.visible=true;this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={};}
 add(child){this.children.push(child);return this;}
}
class Object3D{
 constructor(){this.position={set(){}};this.rotation={set(){}};this.scale={set(){}};this.matrix={clone:()=>({})};}
 updateMatrix(){}
}
class Mesh {
 constructor(geometry,material){this.position={set(){}};this.rotation={};this.geometry=geometry;this.material=material;}
}
class InstancedMesh extends Mesh {
 constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={};}
 setMatrixAt(){} computeBoundingSphere(){this.boundsComputed=true;}
}
const scene=new Group(),world=new Group();
let labels=0,externalBoxes=0;
const build={
 THREE:{Group,Object3D,Mesh,InstancedMesh,BoxGeometry:class{},TorusGeometry:class{}},
 scene,world,
 mat:(color,options)=>({color,options}),
 box:(w,h,d,m,x,y,z,parent)=>{
  assert.ok(parent?.add);
  externalBoxes++;const mesh=new Mesh(null,m);parent.add(mesh);return mesh;
 },
 label:()=>{labels++;return new Group();}
};
const rooms=buildInteriors(build);
assert.equal(rooms.length,3);
assert.equal(scene.children.length,3);
assert.ok(rooms.every(r=>!r.root.visible && r.centerX>400));
assert.ok(rooms.every(r=>r.root.children.some(obj=>obj instanceof InstancedMesh)));
assert.ok(world.children.length>=12,"each entrance gets door and marker");
assert.ok(labels>=9);
assert.ok(rooms[0].root.children.filter(obj=>obj instanceof InstancedMesh)
 .reduce((sum,obj)=>sum+obj.count,0)>180,"5 storeys have full instanced stair geometry");
console.log("MINI CITY 0.3.1 stairwells PASS: 3/5 floors, walkable ramps, bounded portals, instanced geometry");

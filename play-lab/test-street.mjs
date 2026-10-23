import assert from "node:assert/strict";
import {BUILDING} from "../building-lab/building.js";
import {PlayerController,collidesAt,resolveStep,PLAYER_RADIUS} from "./controller.js";
import {STREET_LAYOUT,planStreet,buildStreet} from "./street.js";

// Deterministic placement matches the production house's four entrance pads.
const pads=[-26.35,-8.78,8.78,26.35].map(x=>
 ({x,width:5.5,depth:3.15,centreZ:7.875}));
const plan=planStreet(BUILDING,pads);
const twin=planStreet(BUILDING,pads);
assert.deepEqual(plan,twin,"same city block every refresh");
const standalone=planStreet(BUILDING,[],{buildingPresent:false});
assert.ok(plan.info.grassTufts>1500 && plan.info.grassTufts<3500,
 "grass density stays bounded for iPhone");
assert.equal(plan.info.grassTufts,plan.grassTufts.length);
assert.ok(standalone.grassTufts.length>plan.grassTufts.length,
 "standalone street has grass on the empty space where the house would be");
for(const tuft of plan.grassTufts){
 assert.ok(Number.isFinite(tuft.x)&&Number.isFinite(tuft.z));
 assert.ok(tuft.height>.10&&tuft.height<=.321);
 assert.ok(tuft.width>.20&&tuft.width<=.401);
 assert.ok(Math.abs(tuft.x)>=BUILDING.length/2+1.2||
   Math.abs(tuft.z)>=BUILDING.width/2+1.2,
   "grass may not grow through the residential building");
 for(const surface of plan.surfaces.filter(p=>p.kind!=="grass")){
   assert.ok(!(Math.abs(tuft.x-surface.x)<surface.width/2+.45&&
      Math.abs(tuft.z-surface.z)<surface.depth/2+.45),
      "grass may not grow on paving, paths or roads: "+surface.kind);
 }
}
assert.equal(plan.info.roadLength,108);
assert.equal(Math.round(plan.info.roadWidth*10),91);
assert.equal(plan.info.trees,22);
assert.equal(plan.info.lamps,6);
assert.equal(plan.info.benches,4);
assert.equal(plan.obstacles.length,32);
assert.equal(plan.surfaces.length,7);
assert.equal(plan.markings.filter(m=>m.kind==="zebra").length,7);
assert.equal(plan.curbs.length,2);
assert.ok(plan.surfaces.some(m=>m.kind==="rear-service-path"));
assert.ok(plan.surfaces.some(m=>m.kind==="side-path-left"));
assert.ok(plan.surfaces.some(m=>m.kind==="side-path-right"));
assert.ok(!collidesAt(0,13.2,plan.obstacles),
 "initial spawn must remain free of street furniture");
for(const ob of plan.obstacles){
 assert.ok(!collidesAt((ob.minX+ob.maxX)/2,(ob.minZ+ob.maxZ)/2,
   [{minX:-37,maxX:37,minZ:-6.4,maxZ:6.4}],0),
   "scenery must not overlap the house");
 assert.ok(ob.minX>=-56&&ob.maxX<=56);
 assert.ok(ob.minZ>=-32&&ob.maxZ<=32);
}
const player=new PlayerController({building:BUILDING,pads,extras:plan.obstacles});
assert.equal(player.obstacles.length,37);
assert.equal(player.view,"third");
player.setStick(0,-1); // back toward road, crossing +Z
for(let i=0;i<200;i++)player.update(.05);
assert.ok(player.position.z>25.15,
 "pedestrian can cross road to the opposite sidewalk through the zebra");
assert.ok(player.position.z<32);
player.toggleView();assert.equal(player.view,"first");
const tree=plan.trees.find(t=>t.row==="front");
const start={x:tree.x,z:tree.z-1.2};
const treeWalk=resolveStep(start,0,3,player.obstacles);
assert.ok(treeWalk.z<tree.z-.35-PLAYER_RADIUS+.001,
 "tree trunk collision stops the player");
const sidewalk=plan.trees.find(t=>t.row==="opposite");
assert.ok(collidesAt(sidewalk.x,sidewalk.z,player.obstacles),
 "other-side tree must also block walking through trunk");
const bench=plan.benches[0],benchStep=resolveStep(
 {x:bench.x,z:bench.z-1.7},0,3.4,player.obstacles);
assert.ok(benchStep.z<bench.z-.60-PLAYER_RADIUS+.001,
 "bench must have real collision");
const padBlock=resolveStep({x:pads[1].x,z:10.9},0,-4,player.obstacles);
assert.ok(padBlock.z>9.0,"building entry slabs remain blocking");

// Three-like stub: assert no per-tree mesh allocation and fixed draw budget.
class Vec{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Object3D{
 constructor(){this.position=new Vec();this.rotation=new Vec();
  this.scale=new Vec();this.children=[];
  this.matrix={clone:()=>({
    position:{...this.position},rotation:{...this.rotation},
    scale:{...this.scale}
  })};this.userData={};}
 add(o){this.children.push(o);}
 updateMatrix(){}
}
class Mesh extends Object3D{
 constructor(g,m){super();this.geometry=g;this.material=m;}
}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];
  this.instanceMatrix={needsUpdate:false};}
 setMatrixAt(i,m){this.matrices[i]=m;}
 computeBoundingSphere(){}
}
class MeshStandardMaterial{constructor(o){Object.assign(this,o);}}
class MeshBasicMaterial{constructor(o){Object.assign(this,o);}}
class Geometry{
 constructor(...args){this.args=args;this.transforms=[];}
 translate(...xyz){this.transforms.push(["translate",...xyz]);return this;}
 rotateX(v){this.transforms.push(["rotateX",v]);return this;}
 rotateY(v){this.transforms.push(["rotateY",v]);return this;}
 rotateZ(v){this.transforms.push(["rotateZ",v]);return this;}
}
class Shape{
 constructor(){this.commands=[];}
 moveTo(...xy){this.commands.push(["moveTo",...xy]);}
 lineTo(...xy){this.commands.push(["lineTo",...xy]);}
 closePath(){this.commands.push(["closePath"]);}
}
class CatmullRomCurve3{constructor(points){this.points=points;}}
const THREE={Group:Object3D,Object3D,Mesh,InstancedMesh,Vector3:Vec,
 Shape,CatmullRomCurve3,
 PlaneGeometry:class extends Geometry{},BoxGeometry:class extends Geometry{},
 CylinderGeometry:class extends Geometry{},ConeGeometry:class extends Geometry{},
 SphereGeometry:class extends Geometry{},ExtrudeGeometry:class extends Geometry{},
 TubeGeometry:class extends Geometry{},DodecahedronGeometry:class extends Geometry{},
 MeshStandardMaterial,MeshBasicMaterial,DoubleSide:2};
const rendered=buildStreet(THREE,plan);
assert.equal(rendered.userData.streetStats.trees,22);
assert.equal(rendered.userData.streetStats.drawGroups,38,
 "7 planes, 2 grass batches, 2 road batches, 3 trees, 19 lantern and 5 bench batches");
const instanced=rendered.children.filter(o=>o instanceof InstancedMesh);
assert.equal(instanced.length,31);
assert.ok(instanced.every(m=>m.instanceMatrix.needsUpdate));
assert.ok(instanced.every(m=>m.matrices.length===m.count));
assert.equal(instanced.find(m=>m.name==="grass-blades-a").count,plan.info.grassTufts);
assert.equal(instanced.find(m=>m.name==="grass-blades-b").count,plan.info.grassTufts);
assert.equal(instanced.find(m=>m.name==="trees-trunks").count,22);
assert.equal(instanced.find(m=>m.name==="trees-canopy-low").count,22);
assert.equal(instanced.find(m=>m.name==="trees-canopy-high").count,22);
assert.equal(instanced.find(m=>m.name==="street-lamp-poles").count,6);
assert.equal(instanced.find(m=>m.name==="street-lamp-heads").count,6);
assert.equal(instanced.find(m=>m.name==="street-lamp-lantern-ribs").count,36);
assert.equal(instanced.find(m=>m.name==="street-lamp-arch").count,6);
assert.equal(instanced.find(m=>m.name==="benches-seats").count,24);
assert.equal(instanced.find(m=>m.name==="benches-backs").count,24);
assert.equal(instanced.find(m=>m.name==="benches-back-rails").count,8);
assert.equal(instanced.find(m=>m.name==="benches-concrete-supports").count,8);
assert.equal(instanced.find(m=>m.name==="benches-fasteners").count,48);
const arched=instanced.find(m=>m.name==="street-lamp-arch").geometry.args[0].points;
assert.ok(arched.length>=6&&Math.max(...arched.map(p=>p.y))>4.5,
 "fixture must hang from a realistically curved arch above the post");
assert.ok(arched.some(p=>p.x>1.0),"lamp needs a long curved offset arm");
for(const name of ["street-lamp-scroll-large","street-lamp-scroll-small"]){
 const curve=instanced.find(m=>m.name===name).geometry.args[0].points;
 assert.ok(curve.length>=25,"each forged volute is a real curve: "+name);
}
const concrete=instanced.find(m=>m.name==="benches-concrete-supports");
assert.ok(concrete.geometry.args[0].commands.length>=9,
 "concrete side supports must be contoured geometry, not two cubes");
assert.equal(concrete.material.color,0xd7d6cf);
assert.equal(instanced.find(m=>m.name==="benches-seats").material.color,0x80563c);
assert.equal(instanced.find(m=>m.name==="street-lamp-poles").material.color,0x171b1e);
assert.ok(Math.abs(plan.obstacles.find(x=>x.name==="bench-0").maxZ-
  plan.obstacles.find(x=>x.name==="bench-0").minZ-1.2)<1e-6);
assert.ok(Math.abs(plan.obstacles.find(x=>x.name==="lamp-0").maxX-
  plan.obstacles.find(x=>x.name==="lamp-0").minX-.5)<1e-6);
assert.ok(rendered.children.length<=40,
 "street furniture mobile draw call overhead is bounded");
console.log("MINI CITY 4.2.1 street PASS: 108m road, safe zebra, 22 trees, 6 detailed park lamps, 4 concrete benches, collisions, 38 groups");

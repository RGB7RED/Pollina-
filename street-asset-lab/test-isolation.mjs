import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING} from "../building-lab/building.js";
import {planStreet,buildStreet} from "../play-lab/street.js";
import {ISOLATED_ASSETS,buildIsolatedStreetAsset} from "./asset.js";

// Test the actual builder with a lightweight Three-style instancing API.
class Vec{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
class Object3D{
 constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);
  this.matrix=null;this.children=[];this.userData={};}
 updateMatrix(){this.matrix={position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}};}
 add(o){this.children.push(o);}
}
class Geometry{
 constructor(...args){this.args=args;this.transforms=[];}
 translate(...a){this.transforms.push(["translate",...a]);return this;}
 rotateX(a){this.transforms.push(["rotateX",a]);return this;}
 rotateY(a){this.transforms.push(["rotateY",a]);return this;}
 rotateZ(a){this.transforms.push(["rotateZ",a]);return this;}
}
class Shape{
 constructor(){this.commands=[];}
 moveTo(...p){this.commands.push(["moveTo",...p]);}
 lineTo(...p){this.commands.push(["lineTo",...p]);}
 closePath(){this.commands.push(["closePath"]);}
}
class CatmullRomCurve3{constructor(points){this.points=points;}}
class Mesh extends Object3D{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];
  this.instanceMatrix={needsUpdate:false};}
 setMatrixAt(i,m){this.matrices[i]=structuredClone(m);}
 computeBoundingSphere(){}
}
class Material{constructor(o){Object.assign(this,o);}}
const THREE={Group:Object3D,Object3D,Mesh,InstancedMesh,Vector3:Vec,
 Shape,CatmullRomCurve3,
 PlaneGeometry:class extends Geometry{},BoxGeometry:class extends Geometry{},
 CylinderGeometry:class extends Geometry{},DodecahedronGeometry:class extends Geometry{},
 ConeGeometry:class extends Geometry{},SphereGeometry:class extends Geometry{},
 TubeGeometry:class extends Geometry{},ExtrudeGeometry:class extends Geometry{},
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,DoubleSide:2};
const pads=[-26.35,-8.78,8.78,26.35].map(x=>({x,width:5.5,depth:3.15,centreZ:7.875}));
const worldPlan=planStreet(BUILDING,pads);
const world=buildStreet(THREE,worldPlan);
const catalogs=JSON.parse(readFileSync(new URL("../models/catalog.json",import.meta.url),"utf8"));
for(const id of ["street_tree","street_lamp","street_bench"]){
 const spec=ISOLATED_ASSETS[id];
 const {root, spec:actual}=buildIsolatedStreetAsset(THREE,id);
 assert.equal(actual,spec);
 assert.equal(root.userData.isolatedModelId,id);
 assert.equal(root.userData.worldQuantity,spec.quantity);
 assert.equal(root.children.length,spec.parts.length,"all parts of ONE selected object only");
 assert.deepEqual(root.children.map(c=>c.name),spec.parts);
 assert.ok(root.children.every(mesh=>mesh instanceof InstancedMesh));
 const counts={"benches-seats":6,"benches-backs":6,
 "benches-back-rails":2,"benches-concrete-supports":2,"benches-fasteners":12,
 "street-lamp-lantern-ribs":6};
 assert.ok(root.children.every(mesh=>mesh.count===(counts[mesh.name]||1)),
  "each batch must contain only the selected object's real parts");
 const instances=id==="street_tree"?worldPlan.trees:id==="street_lamp"?worldPlan.lamps:worldPlan.benches;
 const worldOrigin=instances[0];
 for(const isolated of root.children){
   const city=world.children.find(c=>c.name===isolated.name);
   assert.ok(city,"must re-use the actual world mesh batch "+isolated.name);
   assert.deepEqual(isolated.geometry.args,city.geometry.args);
   assert.deepEqual(isolated.geometry.transforms,city.geometry.transforms);
   assert.deepEqual(isolated.material,city.material);
   const local=isolated.matrices[0],placed=city.matrices[0];
   assert.deepEqual(local.scale,placed.scale);
   assert.equal(local.position.y,placed.position.y);
   assert.ok(Math.abs(local.position.x-(placed.position.x-worldOrigin.x))<.000001);
   assert.ok(Math.abs(local.position.z-(placed.position.z-worldOrigin.z))<.000001);
 }
 const entry=catalogs.entries.find(e=>e.id===id);
 assert.equal(entry.viewer,"street-asset-lab/index.html?model="+id);
 assert.equal(entry.inPlayLab,true);
 assert.equal(entry.quantity,spec.quantity);
 assert.ok(entry.scene.startsWith("play-lab/index.html"));
}
assert.throws(()=>buildIsolatedStreetAsset(THREE,"unknown"),/Unknown isolated asset/);
// Existing city is exactly the old layout (22 trees, 6 lamps, 4 benches).
assert.equal(world.children.length,38);
assert.equal(world.children.find(m=>m.name==="benches-seats").count,4*6);
assert.equal(world.children.find(m=>m.name==="benches-concrete-supports").count,4*2);
assert.equal(world.children.find(m=>m.name==="street-lamp-lantern-ribs").count,6*6);
assert.equal(world.children.find(m=>m.name==="street-lamp-arch").count,6);
assert.equal(worldPlan.info.trees,22);
assert.equal(worldPlan.info.lamps,6);
assert.equal(worldPlan.info.benches,4);
console.log("MINI CITY isolated asset PASS: real city source reused, 1 detailed tree/lamp/bench each, source geometry shared; placement unchanged");

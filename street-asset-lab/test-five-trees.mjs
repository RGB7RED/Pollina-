import assert from "node:assert/strict";
import {TREE_MODELS,TREE_BRANCH_SEGMENTS,buildTreeMeshes} from "../play-lab/tree-models.js";
import {buildIsolatedStreetAsset} from "./asset.js";
import {BUILDING} from "../building-lab/building.js";
import {planStreet,buildStreet} from "../play-lab/street.js";
import {readFileSync} from "node:fs";

const treeIds=["street_tree","street_tree_poplar","street_tree_oak",
 "street_tree_ornamental","street_tree_birch"];
const catalog=JSON.parse(readFileSync(new URL("../models/catalog.json",import.meta.url)));
assert.equal(treeIds.length,5);
assert.deepEqual(treeIds.map(id=>TREE_MODELS[id].number),[1,3,4,5,6]);
assert.equal(new Set(treeIds.map(id=>TREE_MODELS[id].name)).size,5);
assert.equal(new Set(treeIds.flatMap(id=>TREE_MODELS[id].parts)).size,
 treeIds.reduce((n,id)=>n+TREE_MODELS[id].parts.length,0),
 "no two types may share an instance batch name");
class Vec{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
class Group{
 constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();
  this.scale=new Vec(1,1,1);this.userData={};}
 add(c){this.children.push(c);}
}
class Object3D extends Group{
 updateMatrix(){this.matrix={position:{...this.position},rotation:{...this.rotation},
   scale:{...this.scale}};}
}
class Geometry{constructor(...args){this.args=args;}
 translate(){return this;}rotateY(){return this;}rotateZ(){return this;}}
class BufferGeometry{
 constructor(){this.attributes={};}
 setAttribute(k,v){this.attributes[k]=v;}
 setIndex(v){this.index={count:v.length};}
 computeVertexNormals(){}
}
class Float32BufferAttribute{constructor(values,n){this.array=values;this.count=values.length/n;}}
class Mesh extends Group{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];
  this.instanceMatrix={needsUpdate:false};}
 setMatrixAt(i,m){this.matrices[i]=structuredClone(m);}
 computeBoundingSphere(){}
}
class Material{constructor(o){Object.assign(this,o);}}
const THREE={
 Group,Object3D,Mesh,InstancedMesh,Vector3:Vec,
 CylinderGeometry:Geometry,DodecahedronGeometry:Geometry,
 PlaneGeometry:Geometry,BoxGeometry:Geometry,ConeGeometry:Geometry,
 SphereGeometry:Geometry,TubeGeometry:Geometry,ExtrudeGeometry:Geometry,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 BufferGeometry,Float32BufferAttribute,DoubleSide:2,
 Shape:class{moveTo(){}lineTo(){}closePath(){}},
 CatmullRomCurve3:class{constructor(points){this.points=points;}}
};
const uniqueSilhouettes=new Set();
for(const id of treeIds){
 const {root,spec}=buildIsolatedStreetAsset(THREE,id);
 assert.equal(spec,TREE_MODELS[id]);
 assert.equal(root.userData.isolatedModelId,id);
 assert.equal(root.children.length,spec.parts.length);
 assert.deepEqual(root.children.map(mesh=>mesh.name),spec.parts);
 assert.ok(root.children.every(mesh=>mesh.count===1&&mesh instanceof InstancedMesh));
 assert.ok(root.children.every(mesh=>mesh.instanceMatrix.needsUpdate));
 // Regression for the reported "sticks" visibly poking BELOW the crown.
 // Each tapered fork must originate ON the main stem and terminate WITHIN
 // a leaf lobe, not be centred off to one side with a dangling lower end.
 const trunk=root.children.find(mesh=>mesh.name.endsWith("-trunk")||
   mesh.name==="trees-trunks");
 assert.ok(trunk,"every tree must have a rooted trunk");
 const trunkPose=trunk.matrices[0],trunkTop=
   trunkPose.position.y+trunk.geometry.args[2]*trunkPose.scale.y/2;
 const forks=TREE_BRANCH_SEGMENTS[id];
 assert.equal(forks.length,root.children.filter(x=>x.name.includes("branch")).length);
 const foliage=root.children.filter(x=>/canopy|foliage/.test(x.name)&&
   !x.name.includes("flowers"));
 for(const fork of forks){
   const mesh=root.children.find(x=>x.name===fork.name);
   const pose=mesh.matrices[0];
   const [fx,fy,fz]=fork.from,[tx,ty,tz]=fork.to;
   assert.ok(Math.abs(fx)<.3&&Math.abs(fz)<.3,
     "branch MUST join the central stem: "+fork.name);
   assert.ok(fy>=trunkTop-.40&&fy<=trunkTop+.07,
     "branch should grow near the top of the stem, not dangle beneath leaves: "+fork.name);
   assert.ok(ty>fy,"all branches grow UPWARDS into leaves");
   assert.ok(fork.length<=1.9,"reject long straight sticks: "+fork.name);
   assert.ok(foliage.some(leaf=>{
     const p=leaf.matrices[0].position,scale=leaf.matrices[0].scale;
     return Math.hypot((tx-p.x)/scale.x,(ty-p.y)/scale.y,
       (tz-p.z)/scale.z)<.93;
   }),"fork tip must be covered by a foliage lobe: "+fork.name);
   assert.ok(Math.abs(pose.position.x-(fx+tx)/2)<1e-6);
   assert.ok(Math.abs(pose.position.y-(fy+ty)/2)<1e-6);
   assert.ok(Math.abs(pose.position.z-(fz+tz)/2)<1e-6);
   const {x:rx,y:ry,z:rz}=pose.rotation;
   assert.equal(ry,0);
   const length=Math.hypot(tx-fx,ty-fy,tz-fz);
   assert.ok(Math.abs(pose.scale.y-length)<1e-6);
   assert.ok(Math.abs(-Math.sin(rz)*length-(tx-fx))<1e-6);
   assert.ok(Math.abs(Math.cos(rx)*Math.cos(rz)*length-(ty-fy))<1e-6);
   assert.ok(Math.abs(Math.sin(rx)*Math.cos(rz)*length-(tz-fz))<1e-6);
   assert.equal(mesh.geometry.args[2],1,
     "branch is a unit tapered cylinder scaled to the true endpoints");
 }
 const entry=catalog.entries.find(e=>e.id===id);
 assert.ok(entry,"tree has an actual catalog record "+id);
 assert.equal(entry.viewer,"street-asset-lab/index.html?model="+id);
 assert.equal(entry.modelNumber,spec.number);
 assert.equal(entry.category,"nature");
 assert.equal(entry.quantity,id==="street_tree"?22:1);
 assert.equal(entry.inPlayLab,id==="street_tree");
 const top=Math.max(...root.children.map(mesh=>{
  const p=mesh.matrices[0].position,scale=mesh.matrices[0].scale;
  return p.y+scale.y;
 }));
 const spread=Math.max(...root.children.map(mesh=>
  Math.abs(mesh.matrices[0].position.x)+mesh.matrices[0].scale.x));
 uniqueSilhouettes.add(Math.round(top*10)+"/"+Math.round(spread*10));
 assert.ok(top>=3&&top<=10,"trees fit their authored scale");
 if(id==="street_tree"){
  assert.ok(root.children.length>=9,"bushy replacement has additional crown lobes");
  assert.ok(spread>2.5,"crown wider than old simple shape");
 }
 if(id==="street_tree_poplar")assert.ok(top>7,"poplar is the tall vertical type");
 if(id==="street_tree_oak")assert.ok(spread>3.8,"oak is visibly broad");
 if(id==="street_tree_ornamental")assert.ok(
  root.children.some(x=>x.name.includes("flowers")),"ornamental tree blossoms");
 if(id==="street_tree_birch"){
  assert.ok(root.children.filter(x=>x.name.includes("bark-mark")).length>=3);
  const bark=root.children.find(x=>x.name==="birch-trunk");
  assert.equal(bark.material.color,0xd9dad1,"birch trunk must be white");
 }
}
assert.equal(uniqueSilhouettes.size,5,
 "all five types must have distinct height/width outlines");
const plan=planStreet(BUILDING);
assert.equal(plan.info.trees,22);
const world=buildStreet(THREE,plan);
const batches=world.children.filter(x=>x.name?.startsWith("trees-"));
assert.equal(batches.length,TREE_MODELS.street_tree.parts.length);
assert.ok(batches.every(m=>m.count===22));
assert.equal(world.children.length,47);
assert.equal(plan.info.lamps,6);
assert.equal(plan.info.benches,4);
const previewGroup=new Group();
const variants=buildTreeMeshes(THREE,previewGroup,[
 {type:"street_tree_oak",x:-10,z:0},{type:"street_tree_birch",x:12,z:0}
]);
assert.equal(variants.length,TREE_MODELS.street_tree_oak.parts.length+
 TREE_MODELS.street_tree_birch.parts.length);
assert.ok(variants.every(mesh=>mesh.count===1));
assert.equal(buildTreeMeshes(THREE,new Group(),[]).length,0);
assert.throws(()=>buildTreeMeshes(THREE,new Group(),[{type:"unknown",x:0,z:0}]),
 /Unknown tree model/);
console.log("MINI CITY 4.4 PASS: five unique tree model geometries, five separate catalogue viewers, updated live canopy, and 22 city trees unchanged");

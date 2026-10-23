import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import {BUILDING} from "../building-lab/building.js";
import {planStreet} from "../play-lab/street.js";
import {createGrassTuftGeometry,addGrassToGroup,GRASS_PALETTE,BLADES_PER_TUFT,TRIANGLES_PER_TUFT} from "../play-lab/grass.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("./index.html"),lab=read("./lab.js");
const catalog=JSON.parse(read("../models/catalog.json"));
new Script(lab.replace(/^import[^\n]*\n/gm,""));
for(const id of ["stage","tufts","blades","triangles","fps","calls"])
 assert.match(html,new RegExp('id="'+id+'"'));
assert.match(html,/category=nature/);
assert.match(html,/data-view="detail"/);
assert.match(lab,/sampleGrassTufts\(/);
assert.match(lab,/buildStreet\(THREE,plan\)/);
assert.match(lab,/mountInspectionFlight/);
assert.doesNotMatch(lab,/buildApartmentHouse/);
const grass=catalog.entries.find(e=>e.id==="street_grass_001");
assert.ok(grass);
assert.equal(grass.modelNumber,2);
assert.equal(grass.quantity,1);
assert.equal(grass.viewer,"grass-lab/index.html");
assert.equal(grass.category,"nature");
assert.equal(grass.inPlayLab,true);
assert.equal(grass.assetFile,null);
assert.deepEqual(catalog.entries.filter(e=>e.category==="nature").map(e=>e.modelNumber),[1,2]);
assert.equal(BLADES_PER_TUFT,7);
assert.equal(TRIANGLES_PER_TUFT,28);
class BufferGeometry{
 constructor(){this.attributes={};}
 setAttribute(k,v){this.attributes[k]=v;}
 setIndex(a){this.index={count:a.length};}
 computeVertexNormals(){this.normals=true;}
}
class Float32BufferAttribute{
 constructor(a,n){this.array=a;this.count=a.length/n;}
}
class Object3D{
 constructor(){
  this.position={set(x,y,z){Object.assign(this,{x,y,z});}};
  this.rotation={set(x,y,z){Object.assign(this,{x,y,z});}};
  this.scale={set(x,y,z){Object.assign(this,{x,y,z});}};
 }
 updateMatrix(){this.matrix={position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}};}
}
class Material{constructor(o){Object.assign(this,o);}}
class InstancedMesh{
 constructor(g,m,n){this.geometry=g;this.material=m;this.count=n;this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=structuredClone(m);}
 computeBoundingSphere(){}
}
const THREE={BufferGeometry,Float32BufferAttribute,Object3D,InstancedMesh,MeshStandardMaterial:Material,DoubleSide:2};
const geo=createGrassTuftGeometry(THREE);
assert.equal(geo.attributes.position.count,42);
assert.equal(geo.index.count,84);
assert.equal(geo.normals,true);
const positions=geo.attributes.position.array;
for(let i=0;i<7;i++){
 const k=i*18;
 const ox=(positions[k]+positions[k+3])/2,oz=(positions[k+2]+positions[k+5])/2;
 const tx=(positions[k+12]+positions[k+15])/2,tz=(positions[k+14]+positions[k+17])/2;
 assert.ok(Math.hypot(tx-ox,tz-oz)>.12);
 assert.ok(positions[k+13]>.7&&positions[k+13]<=1.01);
}
const plan=planStreet(BUILDING);
assert.ok(plan.grassTufts.length>5000&&plan.grassTufts.length<10000);
assert.deepEqual(plan.grassTufts,planStreet(BUILDING).grassTufts);
const group={children:[],add(m){this.children.push(m);}};
const meshes=addGrassToGroup(THREE,group,plan.grassTufts);
assert.equal(meshes.length,3);
assert.deepEqual(meshes.map(m=>m.name),["grass-patch-deep","grass-patch-fresh","grass-patch-sun"]);
assert.deepEqual(meshes.map(m=>m.material.color),GRASS_PALETTE.map(p=>p.color));
assert.equal(meshes.reduce((n,m)=>n+m.count,0),plan.grassTufts.length);
assert.ok(meshes.every(m=>m.geometry.index.count===84));
assert.ok(meshes.every(m=>m.matrices.length===m.count));
assert.equal(addGrassToGroup(THREE,group,[]).length,0);
console.log("MINI CITY 4.3.5 GRASS PASS: actual bent blades, 3 colors, 3 draw batches, density, Nature #002");

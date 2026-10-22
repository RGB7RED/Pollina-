import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const src=readFileSync(new URL("./building.js",import.meta.url),"utf8");
new Script(src.replace(/^export /gm,""),{filename:"building.js"});
const {BUILDING,STAGES,planFacade,buildApartmentHouse}=
 new Function(src.replace(/^export /gm,"")+"\nreturn {BUILDING,STAGES,planFacade,buildApartmentHouse};")();
assert.equal(BUILDING.floors,5);
assert.equal(BUILDING.entrances,4);
assert.equal(BUILDING.windowBays,27);
assert.equal(STAGES[0],"3.1 Форма");
const plan=planFacade();
assert.equal(plan.length,2*5*27,"both facades have five full storeys");
assert.equal(plan.filter(w=>w.entrance).length,4);
assert.ok(plan.filter(w=>w.balcony).length>25);
assert.ok(new Set(plan.filter(w=>w.balcony).map(w=>w.bay)).size>=6);

class Vector{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;}
}
class Obj{
 constructor(){this.children=[];this.position=new Vector();this.rotation=new Vector();this.scale=new Vector();this.matrix={clone(){return {}}}}
 add(item){this.children.push(item);}
 updateMatrix(){}
}
class Mesh extends Obj{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;}
}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={};}
 setMatrixAt(){}
 computeBoundingSphere(){this.sphereDone=true;}
}
class BufferGeometry{
 setAttribute(key,value){this[key]=value;}
 computeVertexNormals(){this.normals=true;}
}
class Float32BufferAttribute{
 constructor(array,size){this.array=array;this.itemSize=size;}
}
class Material{constructor(o){Object.assign(this,o)}}
const THREE={
 Group:Obj,Object3D:Obj,Mesh,InstancedMesh,BufferGeometry,Float32BufferAttribute,
 MeshStandardMaterial:Material,BoxGeometry:class{},DoubleSide:2
};
const result=buildApartmentHouse(THREE),root=result.root;
const meshes=root.children.filter(o=>o instanceof Mesh);
const batches=meshes.filter(o=>o instanceof InstancedMesh);
assert.equal(root.name,"3.1 | first apartment house | blockout");
assert.ok(batches.length>=8&&batches.length<25,"batched by material not object");
assert.ok(batches.every(b=>b.sphereDone&&b.count>0));
assert.equal(result.stats.entrances,4);
assert.ok(result.stats.windows>=270);
assert.ok(result.stats.balconies>=28);
assert.equal(result.stats.chimneys,7);
assert.ok(result.stats.instancedElements>1000);
assert.ok(result.roofTop>17&&result.roofTop<20);
const roof=meshes.find(m=>m.name?.includes("hipped pitched roof"));
assert.ok(roof,"roof is real geometry");
assert.equal(roof.geometry.position.array.length,54,"4 roof faces = 6+6+3+3 vertices");
assert.ok(roof.geometry.normals,"roof triangle normals are computed");
const points=roof.geometry.position.array;
const ys=points.filter((_,i)=>i%3===1);
assert.ok(ys.some(y=>y===result.roofTop),"actual ridge reaches top height");
assert.ok(ys.some(y=>y===BUILDING.plinth+BUILDING.floors*BUILDING.floorHeight),"roof has eave height");
assert.ok(root.userData.provisionalMaterials);
assert.equal(root.userData.facadeTextureReady,false,"do not misrepresent as 3.3 textured");
console.log("Building 3.1 geometry PASS:",JSON.stringify({
  floors:BUILDING.floors,windows:result.stats.windows,
  balconies:result.stats.balconies,entrances:result.stats.entrances,
  instancedGroups:batches.length,instancedParts:result.stats.instancedElements,
  ridgeHeight:result.roofTop
}));

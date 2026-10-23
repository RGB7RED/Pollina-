import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const src=readFileSync(new URL("./building.js",import.meta.url),"utf8");
new Script(src.replace(/^export /gm,""),{filename:"building.js"});
const {BUILDING,STAGES,planFacade,buildApartmentHouse}=
  new Function(src.replace(/^export /gm,"")+
  "\nreturn {BUILDING,STAGES,planFacade,buildApartmentHouse};")();
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
  constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.matrix={clone:()=>({position:{...this.position},scale:{...this.scale},rotation:{...this.rotation}})};}
  add(m){this.children.push(m);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}
  computeBoundingSphere(){this.sphereDone=true;}
}
class BufferGeometry{setAttribute(k,v){this[k]=v;}computeVertexNormals(){this.normals=true;}}
class Float32BufferAttribute{constructor(a,n){this.array=a;this.itemSize=n;}}
class Material{constructor(o){Object.assign(this,o);}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,BufferGeometry,
  Float32BufferAttribute,MeshStandardMaterial:Material,BoxGeometry:class{},DoubleSide:2};
const result=buildApartmentHouse(THREE);
const root=result.root,a=root.userData.geometryAudit,stats=result.stats;
assert.equal(BUILDING.floors,5);assert.equal(BUILDING.entrances,4);
assert.equal(BUILDING.length,74);assert.equal(BUILDING.width,12.8);
assert.equal(BUILDING.windowBays,28);assert.equal(STAGES[1],"3.2 Фасад");
assert.equal(root.userData.stage,"3.2");
assert.equal(a.originalFootprint.length,74);assert.equal(a.originalFootprint.width,12.8);
assert.equal(planFacade().filter(w=>w.entrance).length,4);
// Regression for user's visual review: six *real window bays* (not door
// decorations or painted panes) between each adjacent pair of entrances.
const street=planFacade().filter(w=>w.side===1);
const ground=street.filter(w=>w.floor===0);
const entranceBays=ground.filter(w=>w.entrance).map(w=>w.bay);
assert.deepEqual(entranceBays,[3,10,17,24],"four evenly spaced entrance bays");
for(let i=0;i<entranceBays.length-1;i++){
  for(let floor=0;floor<BUILDING.floors;floor++){
    const windowsBetween=street.filter(w=>w.floor===floor&&
      w.bay>entranceBays[i]&&w.bay<entranceBays[i+1]&&!w.entrance);
    assert.equal(windowsBetween.length,6,
      "six windows between entrances "+(i+1)+" and "+(i+2)+" on floor "+(floor+1));
  }
}
assert.equal(stats.entrances,4);assert.equal(stats.doorHoles,4);
assert.equal(stats.windows,296);assert.equal(stats.windowHoles,296);
assert.equal(a.holes.length,300);
assert.equal(a.holes.filter(h=>h.axis==="end").length,20);
assert.equal(a.holes.filter(h=>h.axis==="long").length,280);
assert.equal(stats.balconies,planFacade().filter(p=>p.balcony).length);
for(const kind of ["A","B","C","D"])assert.ok(stats.balconyKinds[kind]>=4,"missing balcony "+kind);
assert.equal(a.balconyPositions.length,stats.balconies);
assert.deepEqual(a.windowTypes,[0,1,2,3]);
assert.equal(a.windowGlazing.length,stats.windows);
assert.equal(stats.downpipes,10);assert.equal(stats.airConditioners,10);
assert.equal(stats.chimneys,7);
assert.equal(a.doorPositions.length,4);
assert.ok(stats.instancedElements>1600);
assert.equal(result.roofTop,BUILDING.plinth+5*BUILDING.floorHeight+BUILDING.roofRise);
assert.ok(root.userData.provisionalMaterials);
assert.equal(root.userData.facadeTextureReady,false);
const meshes=root.children.filter(c=>c instanceof Mesh);
const instances=meshes.filter(c=>c instanceof InstancedMesh);
assert.ok(instances.length>=17 && instances.length<=32,"mobile batch budget");
assert.ok(instances.every(m=>m.sphereDone&&m.count===m.matrices.length));
const roof=meshes.find(c=>c.name?.includes("hipped pitched roof"));
assert.ok(roof&&roof.geometry.normals);
assert.equal(roof.geometry.position.array.length,54);
// For each declared opening, independently inspect the actual masonry boxes.
// A continuous painted wall will fail this test because it crosses the void.
const eps=1e-5;
const overlaps=(l1,h1,l2,h2)=>Math.min(h1,h2)-Math.max(l1,l2)>eps;
for(const hole of a.holes){
  const left=hole.centre-hole.width/2,right=hole.centre+hole.width/2;
  const pieces=a.wallPieces.filter(p=>p.axis===hole.axis&&p.side===hole.side);
  assert.ok(pieces.length>0);
  for(const p of pieces){
    assert.ok(!(overlaps(left,right,p.u0,p.u1)&&
      overlaps(hole.bottom,hole.top,p.y0,p.y1)),
      "solid wall intersects "+hole.kind+" void");
  }
}
for(const g of a.windowGlazing){
  assert.ok(g.frontDepth>g.glassDepth,"glass must be inset behind outer wall");
  assert.equal(g.opening.kind,"window");
}
const masonry=instances.filter(m=>m.material.color===0x977f78||m.material.color===0x92766e);
assert.equal(masonry.reduce((n,m)=>n+m.count,0),a.wallPieces.length,
  "each audited masonry piece must be an actual instance");
assert.ok(!meshes.some(m=>m.name==="main brick shell"),"no full wall behind openings");
console.log("Building 3.2 geometry PASS:",JSON.stringify({
  floors:BUILDING.floors,windows:stats.windows,realWindowVoids:stats.windowHoles,
  doorVoids:stats.doorHoles,balconyVariants:stats.balconyKinds,
  entrances:stats.entrances,downpipes:stats.downpipes,airConditioners:stats.airConditioners,
  instanceGroups:instances.length,parts:stats.instancedElements,
  roofTop:result.roofTop
}));

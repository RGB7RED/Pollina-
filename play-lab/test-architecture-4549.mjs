// MINI CITY 4.5.4.9 — ceiling-mounted luminaire regression.
// Two previous boxes were accidentally at Y=3.325/3.290 (on the
// half-landing deck); five apartment fixtures were at floor+2.47,
// above the walking surface of the next storey instead of BELOW it.
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
class Vec{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;}
}
class Obj{
  constructor(){
    this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.children=[];this.matrix={clone:()=>({
      position:{...this.position},rotation:{...this.rotation},
      scale:{...this.scale}
    })};
  }
  add(o){this.children.push(o);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Attr{constructor(a,s){this.array=a;this.itemSize=s;}}
class Mat{constructor(o){Object.assign(this,o);}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
  MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
  Float32BufferAttribute:Attr,DoubleSide:2};
const house=buildApartmentHouse(THREE);
const audit=house.root.userData.geometryAudit;
const lights=audit.ceilingFixtures;
const stair=audit.completeStaircase;
const E=.00001;
assert.equal(lights.length,6,"five apartment landings and one vestibule");
assert.equal(lights.filter(l=>l.kind==="apartment-landing").length,5);
assert.equal(lights.filter(l=>l.kind==="entrance-vestibule").length,1);
const instances=house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(m=>m.matrices.map(t=>({...t,color:m.material.color})));
for(let floor=1;floor<=5;floor++){
  const level=stair.firstFloor+(floor-1)*stair.storeyRise;
  const light=lights.find(l=>l.kind==="apartment-landing"&&l.floor===floor);
  assert.ok(light,"fixture on every apartment floor");
  const ceiling=floor<5?level+stair.storeyRise-.16:
    BUILDING.firstFloor+BUILDING.floors*BUILDING.floorHeight-.16;
  assert.ok(Math.abs(light.ceilingY-ceiling)<E,"fixture aligned with slab underside or roof");
  assert.ok(light.housingY+light.housingH/2<ceiling,"housing wholly below ceiling");
  assert.ok(light.glassY+light.glassH/2<light.housingY,
    "light-emitting face below the metal housing");
  assert.ok(light.bottomY>level+2.0,
    "fixture is overhead and does not obstruct a standing person");
  assert.ok(Math.abs(light.z-(stair.landing.minZ+.70))<E);
}
const foyer=lights.find(l=>l.kind==="entrance-vestibule");
assert.ok(Math.abs(foyer.ceilingY-(stair.firstFloor+
  stair.storeyRise/2-.16))<E);
assert.ok(foyer.bottomY>2.9,"vestibule lamp is over the doorway");
assert.ok(foyer.housingY+foyer.housingH/2<foyer.ceilingY,
  "vestibule lamp fastened to underside of the real intermediate floor");
assert.ok(foyer.glassY<foyer.housingY);
assert.ok(foyer.housingY<3.14,"no lamp left on top of Y=3.30 landing");
for(const light of lights){
  const housing=instances.filter(t=>
    Math.abs(t.position.x-light.x)<E&&
    Math.abs(t.position.y-light.housingY)<E&&
    Math.abs(t.position.z-light.z)<E&&
    Math.abs(t.scale.y-light.housingH)<E&&
    Math.abs(t.scale.x-light.width)<E&&
    Math.abs(t.scale.z-light.depth)<E);
  assert.equal(housing.length,1,"exactly one real metal light housing at calculated position");
  const face=instances.filter(t=>
    Math.abs(t.position.x-light.x)<E&&
    Math.abs(t.position.y-light.glassY)<E&&
    Math.abs(t.position.z-light.z)<E&&
    Math.abs(t.scale.y-light.glassH)<E&&
    Math.abs(t.scale.x-(light.width-.09))<E&&
    Math.abs(t.scale.z-(light.depth-.11))<E);
  assert.equal(face.length,1,"one downward-facing glowing panel under each housing");
}
assert.equal(stair.apartmentDoors.length,20);
assert.equal(stair.floors,5);
assert.equal(audit.heating.radiators.length,4);
assert.equal(audit.stairwellWindows.length,4);
assert.equal(audit.foyer.doorCount,1);
assert.ok(house.root.children.filter(m=>m instanceof InstancedMesh).length<=33,
  "no new draw-call batches");
console.log("MINI CITY 4.5.4.9 PASS: six actual luminaires under slabs/roof, zero floor-mounted fixtures");

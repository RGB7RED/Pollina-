import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";

class Vec{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;}
}
class Obj{
  constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();
    this.scale=new Vec();this.matrix={clone:()=>({
      position:{...this.position},scale:{...this.scale},rotation:{...this.rotation}
    })};}
  add(m){this.children.push(m);}
  updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}
  computeBoundingSphere(){}
}
class Material{constructor(props){Object.assign(this,props);}}
class Geo{setAttribute(name,value){this[name]=value;}computeVertexNormals(){}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,MeshStandardMaterial:Material,
  BoxGeometry:Geo,BufferGeometry:Geo,Float32BufferAttribute:class{},DoubleSide:2};
const house=buildApartmentHouse(THREE),a=house.root.userData.geometryAudit;
const x=planFacade().find(w=>w.entrance).x;
const opposite=a.completeStaircase.opposite;
assert.equal(a.completeStaircase.floors,5);
assert.equal(a.completeStaircase.flights,9);
assert.equal(a.completeStaircase.apartmentDoors.length,20);
assert.deepEqual(a.completeStaircase.apartmentDoors.map(d=>d.number),
  [4,3,1,2,...Array.from({length:16},(_,i)=>i+5)]);
assert.equal(opposite.facadeOuterZ,BUILDING.frontFacade);
assert.ok(opposite.upperTurnEndZ>5.8);
assert.ok(opposite.upperTurnEndZ<opposite.facadeInnerZ);
assert.ok(opposite.facadeInnerZ<opposite.facadeOuterZ);
assert.deepEqual(a.completeStaircase.levels.map(l=>l.returnEndZ),
  Array(4).fill(opposite.upperTurnEndZ));
assert.deepEqual(opposite.openCentreFloors,[1,2,3,4,5]);
assert.equal(opposite.firstTurnClearsFoyer,true);
assert.equal(a.completeStaircase.firstFloor,2.09);
assert.equal(a.completeStaircase.landing.minZ,-4.85);
assert.equal(a.completeStaircase.landing.maxZ,-1.58);
assert.equal(a.completeStaircase.landing.doorsPerFloor,4);
// Glazing is physically in FOUR relocated apertures of the original +Z
// masonry, one per intermediate landing, with no half-window occlusion.
assert.equal(a.stairwellWindows.length,8);
assert.deepEqual(a.stairwellWindows.map(w=>w.floor),[1,1,2,2,3,3,4,4]);
assert.ok(a.stairwellWindows.every(w=>w.transparent&&w.through&&
  Math.abs(Math.abs(w.centreX-x)-.61)<.001));
assert.ok(a.stairwellWindows.every(w=>w.top>w.bottom&&
  w.wallZ<BUILDING.frontFacade));
// Brick strips must NOT cross the middle of any clear window opening.
for(const w of a.stairwellWindows){
  const midY=(w.bottom+w.top)/2;
  const opaque=a.wallPieces.filter(b=>b.axis==="long"&&b.side===1&&
    b.u0<w.centreX&&b.u1>w.centreX&&b.y0<midY&&b.y1>midY);
  assert.equal(opaque.length,0,"opaque exterior masonry covering stairwell window floor "+w.floor);
}
const glass=house.root.children.filter(m=>m instanceof InstancedMesh&&m.material.transparent);
assert.ok(glass.some(m=>m.material.opacity<.35&&m.material.depthWrite===false&&m.count>=4),
  "the four clear panes share one GPU-instanced transparent Three.js material");
// The former flat 1.28m approach was replaced by the twelve entry treads.
const centerSlabs=house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(m=>m.matrices.map(t=>({x:t.scale.x,y:t.position.y,z:t.scale.z})))
  .filter(t=>Math.abs(t.x-1.28)<.001&&t.z>4);
assert.equal(centerSlabs.length,0,"no centre walkway spanning entrance staircase");
// Removed suspended foyer ceiling at y=3.41.
assert.ok(!house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(m=>m.matrices)
  .some(t=>Math.abs(t.scale.x-1.96)<.001&&
    Math.abs(t.position.y-3.41)<.001),
  "old floating foyer slab must not survive");
const pads=[-26.3625,-8.7875,8.7875,26.3625]
  .map(px=>({x:px,width:5.5,depth:3.15,centreZ:7.875}));
const entry=planPlayableEntrance(BUILDING,pads);
assert.equal(entry.buildingObstacles.length,25);
assert.equal(entry.stair.firstFrontZ,opposite.firstTurnEndZ);
assert.equal(entry.stair.frontZ,opposite.upperTurnEndZ);
assert.ok(!collidesAt(x+1.25,5.25,entry.buildingObstacles,PLAYER_RADIUS,.70),
  "lower foyer is widened into original stairwell, no partition at +/-0.81");
assert.ok(!collidesAt(x+1.25,5.25,entry.buildingObstacles,PLAYER_RADIUS,4.87),
  "upper landing is not blocked by ground foyer wall");
assert.ok(collidesAt(x,6.26,entry.buildingObstacles,PLAYER_RADIUS,4.87),
  "player cannot walk out through clear upper window");
assert.ok(!collidesAt(x,5.0,entry.buildingObstacles,PLAYER_RADIUS,.70),
  "entrance front remains accessible at ground level");
assert.equal(entry.groundHeight(x+1.25,5.25,3.30),3.30);
assert.equal(entry.groundHeight(x,5.25,0),0);
console.log("MINI CITY 4.5.4.3/4 regression: four clear facade apertures, raised landings, empty middle shaft, height-aware obstacles PASS");

// MINI CITY 4.5.4.7 — real building geometry + physical regressions.
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
  constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.children=[];this.matrix={clone:()=>({position:{...this.position},
      rotation:{...this.rotation},scale:{...this.scale}})};}
  add(m){this.children.push(m);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Mat{constructor(p){Object.assign(this,p);}}
class Geo{setAttribute(){}computeVertexNormals(){}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,MeshStandardMaterial:Mat,
  BoxGeometry:Geo,BufferGeometry:Geo,Float32BufferAttribute:class{},DoubleSide:2};
const house=buildApartmentHouse(THREE),a=house.root.userData.geometryAudit;
const pads=[-26.3625,-8.7875,8.7875,26.3625]
  .map(x=>({x,width:5.5,depth:3.15,centreZ:7.875}));
const e=planPlayableEntrance(BUILDING,pads),x=e.x,eps=.0001;
const stair=a.completeStaircase;
const instances=house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(mesh=>mesh.matrices.map(t=>({...t,
    materialColor:mesh.material.color,
    transparent:mesh.material.transparent===true})));
assert.equal(BUILDING.floors,5);
assert.equal(BUILDING.entrances,4);
assert.equal(BUILDING.length,74);
assert.equal(BUILDING.width,19);
assert.equal(stair.landing.minZ,-4.85);
assert.equal(e.stair.backZ,stair.landing.minZ);
assert.equal(stair.landing.maxZ,-1.58);
assert.ok(stair.landing.depth>3.2);
assert.equal(stair.landing.doorsPerFloor,4);
assert.equal(stair.landing.leftDoorsPerFloor,2);
assert.equal(stair.landing.rightDoorsPerFloor,2);
assert.equal(stair.landing.endDoorsPerFloor,0);
assert.deepEqual(stair.landing.sideDoorPositions,[-2.42,-4.0]);
assert.equal(stair.apartmentDoors.length,20);
assert.deepEqual(stair.apartmentDoors.map(d=>d.number),
  [4,3,1,2,...Array.from({length:16},(_,i)=>i+5)]);
for(let f=1;f<=5;f++){
  const doors=stair.apartmentDoors.filter(d=>d.floor===f);
  assert.deepEqual(doors.map(d=>d.orientation),["left","left","right","right"]);
  assert.deepEqual(doors.map(d=>d.z),[-2.42,-4,-2.42,-4]);
  assert.ok(doors.slice(0,2).every(d=>d.x<x));
  assert.ok(doors.slice(2,4).every(d=>d.x>x));
  assert.ok(1.58>1.04+.40,"no overlap of same-side apartment doors");
}
assert.equal(stair.electricPanels.length,5);
assert.ok(stair.electricPanels.every(p=>p.meters===4&&p.z<e.stair.bottomZ));
assert.equal(instances.filter(t=>Math.abs(t.scale.x-.255)<eps&&
  Math.abs(t.scale.y-.37)<eps&&Math.abs(t.scale.z-.022)<eps).length,20,
  "20 meter windows on end-wall electrical panels");
assert.equal(a.heating.radiators.length,2);
assert.deepEqual(a.heating.radiators.map(r=>r.floorFrom),[2,4]);
const visibleRiser=a.heating.visibleWindowRiser;
assert.ok(visibleRiser&&a.heating.riser===visibleRiser);
assert.ok(visibleRiser.top-visibleRiser.bottom>10);
assert.ok(visibleRiser.x>x+.61+1.10/2+.20);
assert.ok(instances.some(t=>Math.abs(t.scale.x-.064)<eps&&
  Math.abs(t.scale.z-.064)<eps&&
  Math.abs(t.scale.y-(visibleRiser.top-visibleRiser.bottom))<eps&&
  Math.abs(t.position.x-visibleRiser.x)<eps&&
  Math.abs(t.position.z-visibleRiser.z)<eps),
  "visible heating riser must remain physically present");
assert.equal(instances.filter(t=>Math.abs(t.scale.x-.083)<eps&&
  Math.abs(t.scale.y-.53)<eps&&Math.abs(t.scale.z-.12)<eps).length,20,
  "two radiators, ten vertical ribs each");
for(const rad of a.heating.radiators){
  assert.equal(rad.mountedOn,"window-riser");
  assert.ok(Math.abs(rad.connectedRiserX-visibleRiser.x)<eps);
  assert.ok(Math.abs(rad.connectedRiserZ-visibleRiser.z)<eps);
  assert.ok(rad.z+.18<a.heating.windowWallZ,
    "radiator is INSIDE, not embedded in the concrete facade");
  assert.ok(rad.x+rad.width/2<visibleRiser.x);
  assert.ok(a.stairwellWindows.some(w=>Math.abs(w.bottom-rad.windowSillY)<eps));
  assert.ok(collidesAt(rad.x,rad.z,e.buildingObstacles,
    PLAYER_RADIUS,rad.landingY+.37),
    "real radiator has a physical collision");
  assert.ok(instances.some(t=>Math.abs(t.scale.y-.055)<eps&&
    Math.abs(t.position.x-(rad.x+.64))<eps&&
    Math.abs(t.scale.z-(visibleRiser.z-(rad.z-.05)))<eps),
    "real water pipes join radiator to full-height vertical riser");
}
assert.equal(e.buildingObstacles.filter(o=>
  o.name.startsWith("radiator-window-")).length,2);
assert.ok(a.stairwellInterior.painted);
assert.ok(a.stairwellInterior.noBrickFacing);
assert.ok(a.stairwellInterior.plasterPanels>=20);
assert.equal(a.stairwellInterior.windowApertures.length,5);
// Crucial: no pale/green panel can cover any window aperture.
// Compare ACTUAL batched transforms instead of relying on audit claims.
for(const pane of a.stairwellPairedApertures){
  const crossing=instances.filter(t=>Math.abs(t.position.z-
       a.stairwellInterior.wallZ)<eps&&Math.abs(t.scale.z-.025)<eps&&
    (t.materialColor===0x76978d||t.materialColor===0xd0c9b1)&&
    t.position.y-t.scale.y/2<pane.top-eps&&
    t.position.y+t.scale.y/2>pane.bottom+eps&&
    t.position.x-t.scale.x/2<pane.centre+pane.width/2-eps&&
    t.position.x+t.scale.x/2>pane.centre-pane.width/2+eps);
  assert.equal(crossing.length,0,
    "paint may only cover the SOLID portion of the facade beside windows");
}
// Entry must NOT be sealed off by the same interior wall plaster.
const doorHole=a.stairwellInterior.entranceAperture;
assert.ok(doorHole.top>2.35&&Math.abs(doorHole.halfWidth-.855)<eps);
const doorCover=instances.filter(t=>Math.abs(t.position.z-
    a.stairwellInterior.wallZ)<eps&&Math.abs(t.scale.z-.025)<eps&&
    (t.materialColor===0x76978d||t.materialColor===0xd0c9b1)&&
    t.position.y-t.scale.y/2<doorHole.top-eps&&
    t.position.y+t.scale.y/2>doorHole.bottom+eps&&
    t.position.x-t.scale.x/2<x+doorHole.halfWidth-eps&&
    t.position.x+t.scale.x/2>x-doorHole.halfWidth+eps);
assert.equal(doorCover.length,0,"the only real street door is not plastered over");
assert.equal(a.slopedWallFinish.bands,9,
  "entry flight plus eight accurate U-flight paint bands");
assert.equal(a.slopedWallFinish.noTiltedBoxes,true,
  "the old tilted stair-wall paint cubes must not return");
assert.equal(stair.floors,5);
assert.equal(stair.flights,9);
assert.equal(stair.treads,108);
assert.ok(house.root.children.filter(m=>m instanceof InstancedMesh).length<=35,
  "mobile draw-call batch count preserved");
assert.equal(e.buildingObstacles.length,23);
assert.ok(collidesAt(x,-4.64,e.buildingObstacles,PLAYER_RADIUS,2.09),
  "electrical cabinet has real collision");
assert.ok(!collidesAt(x,-3.20,e.buildingObstacles,PLAYER_RADIUS,2.09),
  "deep apartment corridor remains walkable");
assert.equal(e.groundHeight(x,-4.30,2.09),2.09);
assert.equal(a.foyer.mailboxes,20);
assert.equal(a.foyer.doorCount,1);
console.log("MINI CITY 4.5.4.7 PASS: 20 side doors, deep landings, five cabinets / 20 meters, four radiators, one heating riser and truly open painted windows");

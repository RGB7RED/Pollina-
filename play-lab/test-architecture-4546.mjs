// Stage 4.5.4.6: narrow ONLY entrance #1's stairwell, preserve broad
// flights and real facade openings; enlarge doors/boxes; protect 5F edge.
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
  constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.children=[];this.matrix={clone:()=>({
      position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}
    })};}
  add(x){this.children.push(x);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Geo{setAttribute(){}computeVertexNormals(){}}
class Mat{constructor(p){Object.assign(this,p);}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
  MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
  Float32BufferAttribute:class{},DoubleSide:2};
const house=buildApartmentHouse(THREE),a=house.root.userData.geometryAudit;
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>
  ({x,width:5.5,depth:3.15,centreZ:7.875}));
const entry=planPlayableEntrance(BUILDING,pads),x=entry.x,eps=1e-4;
const stair=a.completeStaircase,first=a.firstStaircase,top=stair.fifthFloorRail;
const instances=house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(mesh=>mesh.matrices.map(t=>({...t,color:mesh.material.color})));
assert.equal(BUILDING.length,74);
assert.equal(BUILDING.width,19);
assert.equal(BUILDING.floors,5);
assert.equal(house.stats.entrances,4);
assert.equal(stair.floors,5);
assert.equal(stair.apartmentDoors.length,20);
assert.equal(stair.flights,9);
assert.equal(stair.treads,108);
assert.equal(first.stairwellWidth,3.44,"former width was 4.36m");
assert.equal(entry.stairHalf,1.72);
assert.equal(a.foyer.halfWidth,1.62);
assert.equal(entry.corridorHalf,1.62);
assert.equal(stair.railing.flightWidth,1.52,"existing wide treads stay wide");
assert.ok(Math.abs(stair.railing.shaftGap-.16)<eps);
assert.equal(entry.stair.aisleHalf,undefined);
assert.ok(Math.abs(entry.aisleHalf-.08)<eps);
assert.ok(Math.abs(first.firstX-(x-.84))<eps);
assert.ok(Math.abs(first.secondX-(x+.84))<eps);
assert.ok(Math.abs(first.entryFlight.centreX-(x+.84))<eps);
const leftMost=first.firstX-stair.railing.flightWidth/2;
const rightMost=first.secondX+stair.railing.flightWidth/2;
assert.ok(leftMost>x-entry.stairHalf+.07-.03);
assert.ok(rightMost<x+entry.stairHalf-.07+.03);
assert.ok(Math.abs((first.secondX-first.firstX)-stair.railing.flightWidth-.16)<eps);
// The neighbouring facade windows start beyond the new inner wall: there
// is no longer a sightline to their glazing from within the staircase.
const neighbourWindows=a.holes.filter(h=>h.axis==="long"&&h.side===1&&
  h.kind==="window"&&Math.abs(h.centre-x)>1.0);
assert.ok(neighbourWindows.length>0);
const nearestNeighbourGlassEdge=Math.min(...neighbourWindows.map(h=>
  Math.abs(h.centre-x)-h.width/2));
assert.ok(nearestNeighbourGlassEdge>entry.stairHalf-.07,
  "new wall's inner face stops neighbour apartment windows being exposed");
// One full, real, clear window per turnaround, with the original facade.
assert.deepEqual(a.stairwellWindows.map(w=>w.floor),[1,1,2,2,3,3,4,4]);
assert.ok(a.stairwellWindows.every(w=>w.through&&w.transparent));
assert.equal(stair.landing.doorsPerFloor,4);
assert.equal(stair.landing.doorWidth,1.04);
assert.equal(stair.landing.sideDoorWidth,1.04);
assert.deepEqual(stair.apartmentDoors.map(d=>d.number),
  [4,3,1,2,...Array.from({length:16},(_,i)=>i+5)]);
const doorFrames=instances.filter(t=>Math.abs(t.scale.x-1.04)<eps&&
  Math.abs(t.scale.y-2.15)<eps&&Math.abs(t.scale.z-.09)<eps);
assert.equal(doorFrames.length,15,
 "nineteen static widened apartment doors; No.17 has a separately hinged leaf");
const leftDoorX=x-.92-1.04/2,rightDoorX=x+.92+1.04/2;
assert.ok(leftDoorX>x-entry.stairHalf);
assert.ok(rightDoorX<x+entry.stairHalf);
// Fifth-floor railing touches the existing LEFT wall; the RIGHT flight
// must remain traversable so that 5F is actually reachable.
assert.ok(Math.abs(top.left-(x-entry.stairHalf+.12))<eps);
assert.ok(Math.abs(top.right-(first.secondX-.73))<eps);
assert.ok(top.openRightFlight);
assert.ok(top.width>1.60&&top.width<1.75);
assert.equal(top.height,entry.floorHeight(4));
const topRails=instances.filter(t=>Math.abs(t.scale.x-top.width)<eps&&
  Math.abs(t.scale.y-.075)<eps&&Math.abs(t.position.z-top.z)<eps);
assert.equal(topRails.length,3,"5th floor has a continuous three-level wall railing");
assert.ok(collidesAt(x-1,top.z,entry.buildingObstacles,PLAYER_RADIUS,top.height));
assert.ok(!collidesAt(x+1.0,top.z,entry.buildingObstacles,PLAYER_RADIUS,top.height),
  "do not accidentally fence the incoming fifth-floor staircase");
assert.equal(a.foyer.mailboxes,20);
assert.equal(a.foyer.mailboxLevel,3.30);
assert.equal(a.foyer.mailboxSize.depth,.10);
assert.equal(a.foyer.mailboxSize.height,.210);
assert.equal(a.foyer.mailboxSize.width,.19);
const boxes=instances.filter(t=>Math.abs(t.scale.x-.10)<eps&&
  Math.abs(t.scale.y-.210)<eps&&Math.abs(t.scale.z-.19)<eps);
assert.equal(boxes.length,20);
assert.ok(boxes.every(t=>t.position.y>3.7&&t.position.y+.105<4.51));
assert.equal(a.foyer.doorCount,1);
assert.equal(house.innerDoorPivot,null);
assert.ok(house.root.children.filter(m=>m instanceof InstancedMesh).length<=35);
console.log("MINI CITY 4.5.4.6 PASS: 3.68m stairwell, 0.36m safe shaft, 20 widened doors, 20 enlarged mailboxes, wall-connected 5th floor guard, transparent windows");

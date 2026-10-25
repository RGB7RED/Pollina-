// Regression: raised residential floors and nine physically walkable flights.
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";

class Vec {constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj {
  constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.children=[];this.matrix={clone:()=>({
      position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}
    })};}
  add(o){this.children.push(o);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh {
  constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Mat{constructor(o){Object.assign(this,o);}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
  MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
  Float32BufferAttribute:class{},DoubleSide:2};
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
const stair=audit.completeStaircase,first=audit.firstStaircase;
const entryPads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>
  ({x,width:5.5,depth:3.15,centreZ:7.875}));
const entry=planPlayableEntrance(BUILDING,entryPads),x=entry.x,eps=1e-5;
assert.equal(stair.floors,5);
assert.equal(stair.firstFloor,2.09,"apartments one flight above vestibule");
assert.equal(stair.foyerFloor,.70);
assert.equal(stair.storeyRise,2.42);
assert.equal(stair.flights,9,"1 entrance + 8 between five storeys");
assert.equal(stair.treads,108);
assert.equal(first.entryFlight.steps,12);
assert.equal(first.entryFlight.bottom,.70);
assert.equal(first.entryFlight.top,2.09);
assert.ok(Math.abs(first.entryFlight.centreX-(entry.x+.97))<1e-8);
assert.ok(first.entryFlight.centreX>x);
assert.ok(first.entryFlight.centreX+first.entryFlight.width/2<=x+1.84);
assert.equal(audit.foyer.doorCount,1);
assert.equal(audit.foyer.mailboxLevel,3.30);
assert.equal(first.entryFlight.minZ,entry.stair.bottomZ);
assert.equal(first.entryFlight.maxZ,entry.stair.entryStartZ);
assert.equal(first.stairwellWidth,3.68);
assert.equal(stair.railing.flightWidth,1.58);
assert.equal(stair.railing.frontGuardLinks,4);
assert.equal(stair.railing.wallSideRails,0);
assert.equal(stair.railing.innerGuardLinks,4);
assert.equal(stair.apartmentDoors.length,20);
assert.deepEqual(stair.apartmentDoors.map(d=>d.number),
  Array.from({length:20},(_,i)=>i+1));
assert.ok(stair.apartmentDoors.every(d=>d.zone==="rear-stair-landing"));
assert.equal(stair.landing.minZ,-4.85);
assert.equal(stair.landing.maxZ,-1.58);
assert.ok(stair.landing.depth>1.75);
assert.equal(BUILDING.floors,5);
assert.equal(BUILDING.entrances,4);
assert.equal(house.stats.doorHoles,4);
assert.equal(house.stats.windows,296);
assert.equal(house.stats.windowHoles,296);
const shellTop=BUILDING.plinth+BUILDING.floorHeight*BUILDING.floors;
assert.ok(stair.firstFloor+4*stair.storeyRise+2.19<shellTop,
  "fifth floor + full apartment door must stay inside the ORIGINAL house");
for(let i=0;i<5;i++){
  const y=stair.firstFloor+i*stair.storeyRise;
  assert.equal(entry.floorHeight(i),y);
  assert.equal(entry.groundHeight(x,-2.4,y),y);
}
const meshes=house.root.children.filter(m=>m instanceof InstancedMesh);
const instances=meshes.flatMap(m=>m.matrices.map(t=>({
  ...t,color:m.material.color,
  transparent:m.material.transparent===true
})));
const entranceTreadLength=(entry.stair.entryStartZ-entry.stair.bottomZ)/12-.014;
const treads=instances.filter(t=>Math.abs(t.scale.x-1.58)<eps&&
  Math.abs(t.scale.z-entranceTreadLength)<eps);
assert.equal(treads.length,24,"12 genuine two-layer entrance steps");
assert.equal(new Set(treads.map(t=>t.position.y.toFixed(4))).size,24);
const transverse=instances.filter(t=>Math.abs(t.scale.x-.36)<eps&&
  Math.abs(t.scale.y-.08)<eps&&Math.abs(t.scale.z-.075)<eps&&
  Math.abs(t.position.x-x)<eps);
assert.equal(transverse.length,3,"three full-floor inner shaft connectors; fifth has longer wall rail");
assert.equal(instances.filter(t=>Math.abs(t.scale.x-1.28)<eps&&t.scale.z>4).length,0,
  "no phantom central elevated slab");
const railPieces=instances.filter(t=>t.color===0x646f72&&
  Math.abs(t.scale.x-.075)<eps&&Math.abs(t.scale.y-.075)<eps&&
  t.scale.z>3&&Math.abs(t.rotation.x)>.08&&Math.abs(t.position.x-x)<3);
assert.equal(railPieces.length,27,"24 inner U-flight rails + three entry inner rails");
assert.ok(railPieces.every(t=>Math.abs(t.position.x-x)<1.0),
  "no exposed handrail mounted against the two outer walls");
assert.equal(audit.stairwellWindows.length,4);
assert.deepEqual(audit.stairwellWindows.map(w=>w.floor),[1,2,3,4]);
for(let i=0;i<4;i++){
  const w=audit.stairwellWindows[i];
  const turn=stair.firstFloor+(i+.5)*stair.storeyRise;
  assert.ok(Math.abs(w.bottom-turn-.80)<eps,"window sill just above its landing");
  assert.ok(Math.abs(w.top-w.bottom-1.42)<eps,"full-size window");
  assert.ok(w.transparent&&w.through,"real transparent pane");
  const mid=(w.top+w.bottom)/2;
  assert.ok(!audit.wallPieces.some(p=>p.axis==="long"&&p.side===1&&
    p.u0<w.centreX&&p.u1>w.centreX&&p.y0<mid&&p.y1>mid),
    "no opaque brick behind the transparent glazing");
}
assert.equal(entry.buildingObstacles.length,30);
assert.equal(entry.groundHeight(x,5.25,.70),.70,"foyer remains at grade");
assert.equal(entry.groundHeight(x,0,stair.firstFloor+stair.storeyRise),null,
  "upper central shaft cannot be walked on as an invisible floor");
assert.ok(collidesAt(x,6.26,entry.buildingObstacles,PLAYER_RADIUS,3.30),
  "transparent window remains a physical EXTERIOR wall");
assert.ok(!collidesAt(x+1.4,5.25,entry.buildingObstacles,PLAYER_RADIUS,3.30),
  "first-floor intermediate turnaround above foyer is fully open");
assert.equal(house.root.children.filter(x=>x instanceof InstancedMesh).length<=33,true,
  "four new clear windows share a single GPU batch");
console.log("MINI CITY 4.5.4.4 PASS: raised first floor, 108 real treads, four aligned windows, central guard rails, no wall-side rails, physical open shaft");

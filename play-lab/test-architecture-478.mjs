// Stage 4.7.6 — paired real stair glazing; facade seams; solid apartment/stair and annex joints.
import assert from "node:assert/strict";
import {BUILDING,ENTRANCE_BAYS,ENTRY_GLAZING,STAIR_PROFILE,FOYER_GROUND,planFacade,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";

class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){
  Object.assign(this,{x,y,z});}}
class Obj{constructor(){
  this.children=[];this.position=new Vec();this.rotation=new Vec();
  this.scale=new Vec();this.userData={};
  this.matrix={clone:()=>({position:{...this.position},
    rotation:{...this.rotation},scale:{...this.scale}})};}
  add(x){this.children.push(x);}updateMatrix(){}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.count=n;
  this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Mat{constructor(o){Object.assign(this,o);}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
  BoxGeometry:Geo,BufferGeometry:Geo,Float32BufferAttribute:Attr,
  MeshStandardMaterial:Mat,DoubleSide:2};
const house=buildApartmentHouse(THREE);
const audit=house.root.userData.geometryAudit;
const entry=planPlayableEntrance(BUILDING,audit.entryPads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
const right=plan.wings.find(w=>w.side===1);
const left=plan.wings.find(w=>w.side===-1);
const centre=bay=>-BUILDING.length/2+1.85+
  (bay+.5)*(BUILDING.length-3.7)/BUILDING.windowBays;
const edge=(centre(6)+centre(7))/2;
assert.ok(Math.abs(right.maxX-edge)<1e-8,"right outer wall is on bay 6/7 boundary");
assert.ok(right.minX<centre(4)-.64);
assert.ok(right.maxX>centre(6)+.70);
assert.ok(right.maxX<centre(7)-.70,"no piece of fourth bay's glass belongs to this flat");
assert.ok(left.minX<centre(0)-.70);
assert.ok(left.maxX>centre(2)+.64);
// The existing stairwell masonry overlaps the bay-4 reveal by ~3cm.
// Allow up to 6cm at this INTERNAL boundary; the next bay must stay fully clear.
const windowWidth=1.40;
for(const side of [-1,1]){
  const own=planFacade().filter(w=>w.side===side&&w.floor===0&&
    w.bay>=4&&w.bay<=6&&!w.blindBay&&!w.entrance);
  assert.deepEqual(own.map(w=>w.bay),[4,5,6]);
  for(const w of own){
    assert.ok(right.minX<w.x-windowWidth/2+.06);
    assert.ok(right.maxX>w.x+windowWidth/2);
  }
  const next=planFacade().filter(w=>w.side===side&&w.floor===0&&w.bay===7);
  assert.equal(next.length,1);
  assert.ok(right.maxX<next[0].x-windowWidth/2,
    "next stairwell's first bay is physically outside the first floor");
}
assert.ok(plan.segments.every(w=>w.maxX<=right.maxX+plan.wall/2+.001),
  "no first-floor walls project into the next staircase sector");
assert.equal(plan.contains(centre(7),0,plan.y),false,
  "next apartment area must not be claimed by the first entrance");
assert.deepEqual(plan.doors.map(d=>({number:d.number,side:d.side,z:d.z})),[
  {number:4,side:-1,z:-2.42},{number:3,side:-1,z:-4},
  {number:1,side:1,z:-2.42},{number:2,side:1,z:-4}
]);
assert.deepEqual(audit.completeStaircase.apartmentDoors.slice(0,4)
  .map(d=>d.number),[4,3,1,2],
  "real stairwell registry and rendered doors use the same numbers");
assert.deepEqual([1,2,3,4].map(n=>plan.roomCount(n)),[3,2,2,1]);
assert.deepEqual(plan.doors.map(d=>d.variant),["grey","brown","blue","dark"],
  "all original door materials remain at their previous physical locations");
assert.deepEqual(plan.windowConflicts,[]);
const built=buildFirstFloor(THREE,plan);
assert.deepEqual([...built.doorPivots.keys()],[4,3,1,2]);
assert.deepEqual(plan.doorBlockers.map(d=>d.name),[
  "flat-4-closed","flat-3-closed","flat-1-closed","flat-2-closed"]);

assert.equal(entry.stairHalf,1.72);
assert.equal(entry.corridorHalf,1.62);
assert.equal(entry.stair.flightWidth,STAIR_PROFILE.flightWidth);
assert.equal(audit.firstStaircase.stairwellWidth,3.44);
// Not just window CENTRES: the complete first adjoining sashes must be
// outside the actual staircase side masonry, including its wall thickness.
const stairOuter=entry.stairHalf+.07;
for(const bay of [2,4])
  assert.ok(Math.abs(centre(bay)-entry.x)-.70>stairOuter+.01,
    "full neighbouring window sash clears narrowed stairwell");
const annex=plan.annex;
assert.equal(annex.number,2);
assert.ok(annex.maxX-annex.minX>3.1);
assert.ok(annex.maxZ-annex.minZ>7.0);
assert.ok(plan.rooms.some(r=>r.flat===2&&r.name==="Жилая комната 2"&&
  r.minX===annex.minX&&r.maxX===annex.maxX));
assert.ok(entry.isInside(entry.x,-8,plan.y));
assert.equal(entry.groundHeight(entry.x,-8,plan.y),plan.y);
assert.ok(plan.segments.some(s=>s.name.startsWith("annex-access-2")));
assert.ok(plan.segments.some(s=>s.name.startsWith("annex-rear-sill")));
assert.ok(plan.segments.some(s=>s.name.startsWith("annex-rear-lintel")));
// Numerical PLAYER_RADIUS flood-fill from the real hinged flat-2 entrance
// into the annex. No passage through solid masonry or another flat's door.
const door2=plan.doors.find(d=>d.number===2);
const walls=[...entry.buildingObstacles,...plan.doorBlockers.filter(b=>
  b.name!=="flat-2-closed")];
const minX=entry.x-3.7,maxX=right.maxX-.2,minZ=plan.back+.18,maxZ=-3.3;
const step=.14,nx=Math.floor((maxX-minX)/step)+1,
  nz=Math.floor((maxZ-minZ)/step)+1;
const atX=i=>minX+i*step,atZ=j=>minZ+j*step;
const valid=(i,j)=>i>=0&&i<nx&&j>=0&&j<nz&&
  !collidesAt(atX(i),atZ(j),walls,PLAYER_RADIUS,plan.y);
const si=Math.round((door2.x+door2.side*.73-minX)/step),
  sj=Math.round((door2.z-minZ)/step);
assert.ok(valid(si,sj),"flat 2 door starts in walkable corridor");
const queue=[[si,sj]],seen=new Set([si*nz+sj]);
for(let n=0;n<queue.length;n++){
  const [i,j]=queue[n];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const ii=i+dx,jj=j+dz,k=ii*nz+jj;
    if(seen.has(k)||!valid(ii,jj))continue;
    seen.add(k);queue.push([ii,jj]);
  }
}
assert.ok(queue.length>700,"flat 2 remains physically navigable");
assert.ok(queue.some(([i,j])=>atX(i)>annex.minX+.5&&
  atX(i)<annex.maxX-.5&&atZ(j)>annex.minZ+.8&&
  atZ(j)<annex.maxZ-.8),"second room is reachable from flat 2 entrance");
const leftWing=plan.wings.find(w=>w.side===-1);
assert.ok(!queue.some(([i,j])=>atX(i)<leftWing.maxX-.5),
  "flat 2 never leaks into neighbouring apartment 3");
console.log("MINI CITY 4.7.5 PASS: rear second room reachable, neighbour flat sealed, stair windows fully clear, numbers 4-3-1-2");


// Alignment regression: first entrance matches second entrance on every residential row.
assert.equal(house.stats.windows,312);
assert.equal(house.stats.windowHoles,312);
assert.equal(audit.stairwellWindows.length,8);
assert.equal(audit.stairwellPairedApertures.length,8);
assert.equal(audit.stairwellInterior.finishedWindowReveals,8);
assert.equal(audit.stairwellInterior.innerHalfWidth,1.635);
assert.ok(audit.stairwellInterior.innerHalfWidth<entry.stairHalf);
for(let floor=0;floor<4;floor++){
  const pair=audit.stairwellPairedApertures.slice(floor*2,floor*2+2);
  const midY=BUILDING.firstFloor+(floor+1)*BUILDING.floorHeight;
  assert.deepEqual(pair.map(h=>Number((h.centre-entry.x).toFixed(2))),[-ENTRY_GLAZING.offset,ENTRY_GLAZING.offset]);
  const secondX=centre(ENTRANCE_BAYS[1]);
  const reference=audit.holes.filter(h=>h.axis==="long"&&h.side===1&&
    Math.abs(h.bottom-(midY+ENTRY_GLAZING.sillOffset))<1e-6&&
    Math.abs(h.centre-secondX)<1.25);
  assert.equal(reference.length,2,"second entrance is height reference");
  assert.deepEqual(pair.map(h=>h.bottom),reference.map(h=>h.bottom));
  assert.deepEqual(pair.map(h=>h.top),reference.map(h=>h.top));
  for(const hole of pair){
    assert.equal(hole.width,ENTRY_GLAZING.width);
    assert.ok(Math.abs(hole.bottom-(midY+ENTRY_GLAZING.sillOffset))<1e-6);
    assert.ok(Math.abs(hole.height-ENTRY_GLAZING.height)<1e-6);
    assert.ok(audit.windowGlazing.some(g=>g.opening===hole&&g.transparent));
    assert.ok(!audit.wallPieces.some(w=>w.axis==="long"&&w.side===1&&
      w.u0<hole.centre&&w.u1>hole.centre&&w.y0<(hole.bottom+hole.top)/2&&
      w.y1>(hole.bottom+hole.top)/2));
  }
}
// The other three entrance bays use exactly two actual holes per
// residential storey as well, NOT two decorative glass meshes.
for(const bay of ENTRANCE_BAYS.slice(1)){
  const cx=centre(bay);
  for(let f=1;f<BUILDING.floors;f++){
    const bottom=BUILDING.firstFloor+f*BUILDING.floorHeight+ENTRY_GLAZING.sillOffset;
    const pair=audit.holes.filter(h=>h.axis==="long"&&h.side===1&&
      Math.abs(h.bottom-bottom)<1e-6&&h.width===ENTRY_GLAZING.width&&
      Math.abs(h.centre-cx)<1.25);
    assert.equal(pair.length,2,"two cut-out windows, not decorative panes");
    assert.deepEqual(pair.map(h=>Number((h.centre-cx).toFixed(2))).sort((a,b)=>a-b),[-ENTRY_GLAZING.offset,ENTRY_GLAZING.offset]);
  }
}
const pairPaint=house.root.children.filter(o=>o instanceof InstancedMesh&&
  [0x76978d,0xd0c9b1].includes(o.material.color))
  .flatMap(m=>m.matrices.filter(t=>
    Math.abs(t.position.z-audit.stairwellInterior.wallZ)<1e-6&&
    Math.abs(t.scale.z-.025)<1e-6));
for(const hole of audit.stairwellPairedApertures)
  assert.ok(!pairPaint.some(p=>
    p.position.y-p.scale.y/2<hole.top-.08&&
    p.position.y+p.scale.y/2>hole.bottom+.08&&
    p.position.x-p.scale.x/2<hole.centre+hole.width/2-.06&&
    p.position.x+p.scale.x/2>hole.centre-hole.width/2+.06),
    "interior paint cannot block either glass aperture");
assert.equal(audit.slopedWallFinish.bands,9);
assert.equal(audit.slopedWallFinish.entryFlightPainted,true);
// The finished flat walls must be outside BOTH faces of the real stair shell.
assert.ok(right.minX>=entry.x+entry.stairHalf+.075);
assert.ok(left.maxX<=entry.x-entry.stairHalf-.075);
// Physical slabs overlap the old -4.85m stair-back wall. A gap here was
// visible as a black line at the bottom of the new second room.
const roomSlabs=built.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(m=>m.matrices).filter(t=>Math.abs(t.scale.y-.14)<1e-6&&
    Math.abs(t.position.x-entry.x)<.001&&t.scale.z>7&&t.scale.z<8);
assert.equal(roomSlabs.length,1);
const rearFloor=roomSlabs[0];
assert.ok(rearFloor.scale.x>annex.maxX-annex.minX+.35);
assert.ok(rearFloor.position.z+rearFloor.scale.z/2>entry.stair.backZ+.07);
assert.ok(rearFloor.position.z-rearFloor.scale.z/2<=annex.minZ+.001);
console.log("MINI CITY 4.7.6 PASS: real double short windows, facade panel seam, painted entrance flight, closed annex join, staircase outside flats");

// Stage 4.7.8 acceptance checks, including real rendered instances.
assert.ok(STAIR_PROFILE.flightWidth>1.46,"flights are physically wider than 4.7.7");
assert.ok(STAIR_PROFILE.centreOffset+STAIR_PROFILE.flightWidth/2 <
  STAIR_PROFILE.halfWidth-.07,"both flights clear masonry");
const gap=2*STAIR_PROFILE.centreOffset-STAIR_PROFILE.flightWidth;
assert.ok(gap>=.14&&gap<=.20,"a narrow but valid central rail gap");
assert.equal(audit.firstStaircase.firstX,entry.stair.firstX);
assert.equal(audit.firstStaircase.secondX,entry.stair.secondX);
assert.equal(audit.firstStaircase.entryFlight.width,entry.stair.entryWidth);
assert.equal(audit.completeStaircase.railing.flightWidth,STAIR_PROFILE.flightWidth);
const allRender=house.root.children.filter(m=>m instanceof InstancedMesh)
  .flatMap(m=>m.matrices.map(t=>({...t,color:m.material.color})));
const treadWidth=STAIR_PROFILE.flightWidth;
const run=(entry.stair.turnZ-entry.stair.bottomZ)/12;
const mainTreads=allRender.filter(t=>
  Math.abs(t.scale.x-treadWidth)<1e-5&&Math.abs(t.scale.z-(run-.012))<1e-5);
assert.equal(mainTreads.length,192,"8 U-flights, 12 steps, two physical layers");
assert.ok(mainTreads.every(t=>
  t.position.x-t.scale.x/2>entry.x-entry.stairHalf+.07&&
  t.position.x+t.scale.x/2<entry.x+entry.stairHalf-.07),
  "every tread inside the original shaft; no overlap with flats");
const entryRun=(entry.stair.entryStartZ-entry.stair.bottomZ)/12;
assert.equal(allRender.filter(t=>Math.abs(t.scale.x-treadWidth)<1e-5&&
  Math.abs(t.scale.z-(entryRun-.014))<1e-5).length,24);
assert.ok(plan.wings.every(w=>w.side<0?
  w.maxX<entry.x-entry.stairHalf:w.minX>entry.x+entry.stairHalf),
  "residential wings stop beyond the shaft's outer face");
assert.ok(audit.completeStaircase.apartmentDoors.some(d=>d.number===17));
assert.ok(ENTRY_GLAZING.width>.84);
assert.ok(ENTRY_GLAZING.width>ENTRY_GLAZING.height);
assert.ok(ENTRY_GLAZING.width*ENTRY_GLAZING.height>.84*1.12);
for(const hole of audit.stairwellPairedApertures){
  assert.equal(hole.width,ENTRY_GLAZING.width);
  assert.equal(hole.height,ENTRY_GLAZING.height);
  assert.ok(audit.windowGlazing.some(g=>g.opening===hole&&g.transparent));
}
assert.equal(audit.stairwellInterior.finishedWindowReveals,8);
assert.ok(audit.stairwellInterior.transparentWindowsUnobstructed);
assert.equal(audit.entryPads.length,4);
assert.ok(audit.entryPads.every(p=>p.top===FOYER_GROUND&&
  p.doorBottom===FOYER_GROUND&&p.raised===false));
assert.equal(audit.plinth.height,BUILDING.plinth);
assert.equal(audit.plinth.color,0x5a5e5e);
assert.equal(audit.plinth.frontSegments.length,5);
assert.equal(audit.plinth.entryGaps.length,4);
const covered=audit.plinth.frontSegments.reduce((n,[a,b])=>n+b-a,0)+
  audit.plinth.entryGaps.reduce((n,[a,b])=>n+b-a,0);
assert.ok(Math.abs(covered-BUILDING.length)<1e-6);
for(const h of audit.holes.filter(h=>h.kind==="door")){
  assert.equal(h.bottom,FOYER_GROUND);
  assert.ok(audit.plinth.frontSegments.every(([a,b])=>
    b<=h.centre-h.width/2+1e-5||a>=h.centre+h.width/2-1e-5));
}
assert.ok(allRender.some(t=>t.color===0x5a5e5e&&
  Math.abs(t.scale.y-BUILDING.plinth)<1e-5));
assert.ok(!allRender.some(t=>t.color===0x898780),
  "former entrance-podium meshes are absent");
assert.ok(entry.buildingObstacles.length>=26,
  "installed first-floor apartment walls extend the base collision model");
assert.ok(!entry.buildingObstacles.some(o=>o.name.includes("pad")));
for(const z of [11,10,9,8,7,6.4,5.5,3.5])
  assert.equal(entry.groundHeight(entry.x,z,0),FOYER_GROUND,
    "continuous street-to-foyer height without any hidden ramp");
assert.equal(entry.stair.foyerFloor,0);
assert.equal(audit.foyer.floorLevel,0);
assert.ok(entry.stair.entryRise/12<.19,"first-floor stairs are still climbable");
assert.equal(BUILDING.floors,5);
assert.deepEqual(plan.doors.map(d=>d.number),[4,3,1,2]);
console.log("MINI CITY 4.7.8 PASS: widened flights, two large horizontal real windows, carved dark plinth, flat entrance, 1–5F contract");

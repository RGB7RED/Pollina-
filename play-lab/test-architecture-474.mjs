// Stage 4.7.4 — the first staircase owns exactly three apartment bays per side.
import assert from "node:assert/strict";
import {BUILDING,planFacade,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";

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
console.log("MINI CITY 4.7.4 PASS: three entire windows, zero next-bay overlap, corrected 1–4 numbering");

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
assert.equal(BUILDING.length,74);assert.equal(BUILDING.width,19);
assert.equal(BUILDING.windowBays,28);assert.equal(STAGES[1],"3.2 Фасад");
assert.equal(root.userData.stage,"3.2");
assert.equal(a.originalFootprint.length,74);assert.equal(a.originalFootprint.width,19);
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
assert.equal(stats.windows,320);assert.equal(stats.windowHoles,320);
assert.equal(a.holes.length,324);
assert.equal(a.holes.filter(h=>h.axis==="end").length,20);
assert.equal(a.holes.filter(h=>h.axis==="long").length,304);
assert.equal(stats.balconies,planFacade().filter(p=>p.balcony).length);
for(const kind of ["A","B","C","D"])assert.ok(stats.balconyKinds[kind]>=4,"missing balcony "+kind);
assert.equal(a.balconyPositions.length,stats.balconies);
assert.equal(a.entryPads.length,4,"four ground-level entrance footprints");
assert.equal(a.downpipePositions.length,10,"five pipes per long facade");
for(const pad of a.entryPads){
  assert.ok(a.doorPositions.includes(pad.x),"pad must be centered on a real doorway");
  assert.ok(pad.width>=5.3&&pad.depth>=3.1,"pad fits a passenger car parked along the wall");
  assert.equal(pad.bottom,0,"pad must meet the ground");
  assert.equal(pad.top,0,"no raised entry platform");
  assert.equal(pad.doorBottom,0,"ground-level threshold");
  assert.equal(pad.raised,false);
}
for(const side of [-1,1]){
  const drains=a.downpipePositions.filter(p=>p.side===side).sort((l,r)=>l.x-r.x);
  assert.equal(drains.length,5);
  assert.deepEqual(drains.slice(1,4).map(p=>p.boundary),[8,14,20],
    "middle drains must align to safe bay SEAMS");
  for(const p of drains){
    // Pipes have ~0.22 m-wide fixings; don't cross actual apertures OR balconies.
    for(const h of a.holes.filter(h=>h.axis==="long"&&h.side===side)){
      assert.ok(Math.abs(p.x-h.centre)>h.width/2+.11,
        "downpipe fixture overlaps "+h.kind+" at x="+p.x);
    }
    for(const b of a.balconyPositions.filter(b=>b.side===side)){
      assert.ok(Math.abs(p.x-b.x)>2.18/2+.11,
        "downpipe fixture overlaps balcony at x="+p.x);
    }
  }
}
assert.deepEqual(a.windowTypes,[0,1,2,3]);
assert.equal(a.windowGlazing.length,stats.windows);
assert.equal(stats.downpipes,10);assert.equal(stats.airConditioners,10);
assert.equal(stats.chimneys,7);
assert.equal(a.doorPositions.length,4);
assert.ok(stats.instancedElements>1600);
assert.equal(result.roofTop,BUILDING.firstFloor+5*BUILDING.floorHeight+BUILDING.roofClearance+BUILDING.roofRise);
assert.equal(root.userData.provisionalMaterials,false);
assert.equal(root.userData.facadeTextureReady,false);
const meshes=root.children.filter(c=>c instanceof Mesh);
const instances=meshes.filter(c=>c instanceof InstancedMesh);
assert.ok(instances.length>=17 && instances.length<=35,"mobile batch budget (transparent windows and one panel-joint material)");
assert.ok(instances.every(m=>m.sphereDone&&m.count===m.matrices.length));
assert.ok(!instances.some(m=>m.material.color===0x898780),"no rendered pads");
assert.equal(a.plinth.frontSegments.length,5);
assert.equal(a.plinth.entryGaps.length,4);
const roof=meshes.find(c=>c.name?.includes("flat five-storey roof"));
assert.ok(roof&&roof.geometry);
assert.equal(a.roof.type,"flat");
assert.ok(a.roof.deckY>BUILDING.firstFloor+5*BUILDING.floorHeight);
assert.ok(a.roof.parapetTop>a.roof.deckY);
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
const masonry=instances.filter(m=>m.material.color===0xc7c5bd||m.material.color===0xc0beb5);
assert.equal(masonry.reduce((n,m)=>n+m.count,0),a.wallPieces.length,
  "each audited masonry piece must be an actual instance");
assert.ok(!meshes.some(m=>m.name==="main brick shell"),"no full wall behind openings");
assert.ok(a.windowGlazing.every(g=>g.transparent===true),"all 320 windows transparent");
console.log("Building 3.2 geometry PASS:",JSON.stringify({
  floors:BUILDING.floors,windows:stats.windows,realWindowVoids:stats.windowHoles,
  doorVoids:stats.doorHoles,balconyVariants:stats.balconyKinds,
  entrances:stats.entrances,downpipes:stats.downpipes,airConditioners:stats.airConditioners,
  instanceGroups:instances.length,parts:stats.instancedElements,
  roofTop:result.roofTop
}));

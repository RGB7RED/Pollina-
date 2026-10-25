// MINI CITY 4.5.4.8 — regressions for the three photographed finish defects:
// triangular stair-wall gaps, inverted window dado, exposed brick jambs.
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Node{
  constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
    this.children=[];this.matrix={clone:()=>({position:{...this.position},
      rotation:{...this.rotation},scale:{...this.scale}})};}
  add(o){this.children.push(o);}updateMatrix(){}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){this.normals=true;}}
class Attribute{constructor(array,size){this.array=array;this.itemSize=size;}}
class Mat{constructor(opts){Object.assign(this,opts);}}
const THREE={Group:Node,Object3D:Node,Mesh,InstancedMesh,BoxGeometry:Geo,
  BufferGeometry:Geo,Float32BufferAttribute:Attribute,MeshStandardMaterial:Mat,
  DoubleSide:2};
const house=buildApartmentHouse(THREE),a=house.root.userData.geometryAudit;
const pads=[-26.3625,-8.7875,8.7875,26.3625]
  .map(x=>({x,width:5.5,depth:3.15,centreZ:7.875}));
const entry=planPlayableEntrance(BUILDING,pads),x=entry.x,eps=.00001;
const cubes=house.root.children.filter(n=>n instanceof InstancedMesh)
  .flatMap(mesh=>mesh.matrices.map(m=>({...m,color:mesh.material.color})));
const planes=house.root.children.filter(n=>n instanceof Mesh&&
  !(n instanceof InstancedMesh)&&n.geometry?.position?.array);
const green=0x76978d,cream=0xd0c9b1,white=0xd7d4c9;
assert.equal(a.slopedWallFinish.bands,8);
assert.equal(a.slopedWallFinish.triangles,16);
assert.equal(a.slopedWallFinish.trimTriangles,16);
assert.equal(a.slopedWallFinish.noTiltedBoxes,true);
assert.equal(a.slopedWallFinish.joinedToFlatLandings,true);
const slopeMesh=planes.find(n=>n.material.color===green&&
  n.geometry.position.array.length===8*18);
const trimMesh=planes.find(n=>n.material.color===white&&
  n.geometry.position.array.length===8*18);
assert.ok(slopeMesh,"one merged eight-flight green wall mesh");
assert.ok(trimMesh,"one merged matching handrail-height trim mesh");
assert.equal(slopeMesh.material.side,THREE.DoubleSide);
assert.equal(slopeMesh.geometry.position.itemSize,3);
const positions=slopeMesh.geometry.position.array;
// Test BOTH ends of each sloped band, not only the midpoint: the old
// tilted BoxGeometry was short at its ends, leaving unpainted triangles.
for(let i=0;i<8;i++){
  const v=positions.slice(i*18,(i+1)*18);
  const z0=v[2],z1=v[8],foot0=v[1],foot1=v[7]-1.33;
  assert.ok(Math.abs(z0-(-1.58))<eps);
  assert.ok(Math.abs(z1-2.05)<eps);
  assert.ok(Math.abs(foot0-(i%2===0?
    2.09+Math.floor(i/2)*2.42-.15:
    2.09+(Math.floor(i/2)+1)*2.42-.15))<eps);
  assert.ok(Math.abs(foot1-(i%2===0?
    2.09+Math.floor(i/2)*2.42+1.21-.15:
    2.09+Math.floor(i/2)*2.42+1.21-.15))<eps);
}
assert.equal(a.stairwellInterior.finishedWindowReveals,4);
assert.equal(a.stairwellInterior.windowApertures.length,4);
assert.equal(a.stairwellWindows.length,4);
const plasterZ=a.stairwellInterior.wallZ;
for(let i=0;i<4;i++){
  const opening=a.stairwellInterior.windowApertures[i];
  const landing=3.30+i*2.42;
  const band=a.stairwellInterior.greenBands[i];
  assert.ok(Math.abs(band.top-(landing+1.18))<eps);
  assert.ok(band.bottom<opening.bottom);
  assert.ok(band.top>opening.bottom&&band.top<opening.top-.7,
    "green only surrounds LOWER side of the window");
  assert.ok(i===3||a.stairwellInterior.greenBands[i+1].bottom>
    opening.top,"the next green band cannot cross the top sash");
  const faceAt=(shade,y)=>cubes.filter(t=>t.color===shade&&
    Math.abs(t.position.z-plasterZ)<eps&&
    Math.abs(t.scale.z-.025)<eps&&
    Math.abs(t.position.x-(x+.95))<1&&
    t.position.x-t.scale.x/2<x+.94&&
    t.position.x+t.scale.x/2>x+.94&&
    t.position.y-t.scale.y/2<y-eps&&
    t.position.y+t.scale.y/2>y+eps);
  assert.ok(faceAt(green,opening.bottom+.12).length>0,
    "green remains at the bottom side of the window");
  assert.equal(faceAt(green,opening.top-.12).length,0,
    "no inverted green block above the window");
  assert.ok(faceAt(cream,opening.top-.12).length>0,
    "upper window wall must be cream");
  const jamb=6.062+.165/2;
  for(const dx of [-.675,.675]){
    const sides=cubes.filter(t=>t.color===cream&&
      Math.abs(t.position.x-(x+dx))<eps&&
      Math.abs(t.position.z-jamb)<eps&&
      Math.abs(t.scale.x-.052)<eps&&
      Math.abs(t.scale.z-.165)<eps&&
      Math.abs(t.position.y-(opening.bottom+opening.top)/2)<eps);
    assert.equal(sides.length,1,"jambs painted, not showing brick inside");
  }
  assert.ok(a.stairwellWindows[i].transparent&&a.stairwellWindows[i].through);
}
assert.equal(a.completeStaircase.landing.depth,3.2699999999999996);
assert.equal(a.completeStaircase.apartmentDoors.length,20);
assert.equal(a.completeStaircase.electricPanels.length,5);
assert.equal(a.heating.radiators.length,4);
assert.equal(entry.stair.backZ,-4.85);
assert.equal(house.stats.entrances,4);
assert.equal(BUILDING.floors,5);
assert.ok(house.root.children.filter(n=>n instanceof InstancedMesh).length<=35,
  "the existing mobile batch limit is preserved");
console.log("MINI CITY 4.5.4.8 PASS: joined stair-wall polygons, no inverted window green, four plastered jambs and clear glazing");

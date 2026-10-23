import assert from "node:assert/strict";
import {createBusStop,auditBusStop,BUS_STOP_SIZE} from "./bus-stop.js";

// Functional geometry smoke test with a small fake Three API (not WebGL).
class V {
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
class Node {
 constructor(){this.children=[];this.name="";this.position=new V();
  this.rotation=new V();this.scale=new V(1,1,1);this.isMesh=false;this.isGroup=false;}
 add(...c){this.children.push(...c);}
 traverse(f){f(this);this.children.forEach(o=>o.traverse(f));}
 updateMatrix(){this.matrix={position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}};}
}
class Group extends Node{constructor(){super();this.isGroup=true;}}
class Geo {
 constructor(tris=12,bounds=[1,1,1]){this.bounds=bounds;this.attributes={position:{count:24}};
  this.index={count:tris*3};}
}
class BoxGeometry extends Geo{constructor(w,h,d){super(12,[w,h,d]);}}
class PlaneGeometry extends Geo{constructor(w,h){super(2,[w,h,0]);}}
class BufferGeometry extends Geo{
 constructor(){super();this.attributes={};this.index=null;this.bounds=null;}
 setAttribute(key,v){this.attributes[key]=v;}
 setIndex(v){this.index={count:v.length};}
}
class Float32BufferAttribute {
 constructor(array,size){this.array=array;this.count=array.length/size;}
}
class Mesh extends Node {
 constructor(geometry,material){super();this.isMesh=true;this.geometry=geometry;this.material=material;}
}
class InstancedMesh extends Mesh {
 constructor(geo,mat,count){super(geo,mat);this.count=count;this.isInstancedMesh=true;
  this.matrices=[];this.instanceMatrix={needsUpdate:false};}
 setMatrixAt(i,m){this.matrices[i]=structuredClone(m);}
}
class Material{constructor(args){Object.assign(this,args);}}
class CanvasTexture{constructor(c){this.canvas=c;}}
class Box3{
 setFromObject(root){
  const min=new V(Infinity,Infinity,Infinity),max=new V(-Infinity,-Infinity,-Infinity);
  function add(x,y,z,w,h,d){
   for(const [axis,p,s] of [["x",x,w],["y",y,h],["z",z,d]]){
    min[axis]=Math.min(min[axis],p-s/2);
    max[axis]=Math.max(max[axis],p+s/2);
   }
  }
  root.traverse(o=>{
   if(!o.isMesh)return;
   if(o.isInstancedMesh){
    const [w,h,d]=o.geometry.bounds;
    o.matrices.forEach(m=>add(m.position.x,m.position.y,m.position.z,
      Math.abs(w*m.scale.x),Math.abs(h*m.scale.y),Math.abs(d*m.scale.z)));
   }else if(o.geometry.bounds){
    const [w,h,d]=o.geometry.bounds;
    add(o.position.x,o.position.y,o.position.z,w,h,d);
   }else{
    const a=o.geometry.attributes.position.array;
    for(let i=0;i<a.length;i+=3)add(a[i],a[i+1],a[i+2],0,0,0);
   }
  });
  this.min=min;this.max=max;return this;
 }
 getSize(out){return out.set(this.max.x-this.min.x,this.max.y-this.min.y,
  this.max.z-this.min.z);}
}
const THREE={
 Group,Object3D:Node,BoxGeometry,PlaneGeometry,BufferGeometry,Float32BufferAttribute,
 Mesh,InstancedMesh,Vector3:V,Box3,CanvasTexture,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,DoubleSide:2,SRGBColorSpace:"srgb"
};
const ctx={fillRect(){},fillText(){}};
const {root,groups,materials}=createBusStop(THREE,{
 canvasFactory:()=>({getContext:()=>ctx})
});
assert.equal(root.name,"BusStop");
assert.deepEqual(root.children.map(c=>c.name),[
 "Structure","Roof","GlassPanels","Bench","BusSign","InformationBoard"
]);
assert.equal(root.userData.inPlayLab,false);
assert.equal(root.userData.frontAxis,"+Z");
assert.equal(BUS_STOP_SIZE.width,4.2);
assert.equal(BUS_STOP_SIZE.seatHeight,.45);
assert.equal(BUS_STOP_SIZE.signTop,3.5);
assert.equal(groups.GlassPanels.children[0].count,5);
assert.equal(materials.glass.transparent,true);
assert.ok(materials.glass.opacity<1&&materials.glass.opacity>0);
assert.equal(materials.glass.depthWrite,false);
assert.equal(materials.roof.transparent,true);
assert.ok(groups.Bench.children.length>=2);
assert.ok(groups.BusSign.children.length>=3);
assert.ok(groups.InformationBoard.children.length>=3);
const curved=groups.Roof.children.filter(c=>c.geometry?.attributes.position.array);
assert.equal(curved.length,4);
const y=curved.flatMap(m=>m.geometry.attributes.position.array.filter((_,i)=>i%3===1));
assert.ok(Math.max(...y)-Math.min(...y)>.12);
const audit=auditBusStop(THREE,root);
assert.ok(audit.triangles>100&&audit.triangles<10000);
assert.ok(audit.meshDraws<=40);
assert.ok(audit.materials>=6&&audit.materials<=12);
assert.equal(audit.groups.length,6);
assert.ok(audit.size.x>5&&audit.size.x<6);
assert.ok(audit.size.y>=3.48&&audit.size.y<=3.55);
assert.ok(audit.size.z>1.8&&audit.size.z<2.5);
root.traverse(o=>{
 if(!o.isMesh)return;
 assert.ok(o.geometry.attributes.position.count>0);
 const matrices=o.isInstancedMesh?o.matrices:[{
  position:o.position,rotation:o.rotation,scale:o.scale
 }];
 matrices.forEach(m=>{
  for(const v of [m.position,m.rotation,m.scale])
   for(const n of [v.x,v.y,v.z])assert.ok(Number.isFinite(n));
 });
});
console.log("MINI CITY bus stop model PASS: "+audit.triangles+" tris, "+
 audit.meshDraws+" mesh draws, "+audit.materials+" materials; no city integration");

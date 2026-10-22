import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Binary-asset contract test (no WebGL and no external dependencies).
const raw=readFileSync(new URL("./assets/hero-reference.glb",import.meta.url));
assert.equal(raw.toString("ascii",0,4),"glTF","GLB magic");
assert.equal(raw.readUInt32LE(4),2,"glTF 2.0");
assert.equal(raw.readUInt32LE(8),raw.byteLength,"GLB declared length");
assert.ok(raw.byteLength<2*1024*1024,"model under 2 MiB");
const jsonLength=raw.readUInt32LE(12);
assert.equal(raw.toString("ascii",16,20),"JSON");
const gltf=JSON.parse(raw.toString("utf8",20,20+jsonLength));
assert.equal(gltf.asset.version,"2.0");
assert.ok(gltf.skins?.length>0,"must have actual skinning");
const joints=gltf.skins.reduce((n,s)=>n+s.joints.length,0);
assert.ok(joints>=40,"expected full humanoid skeleton");
assert.ok(gltf.meshes?.length>=1,"real authored geometry");
const vertices=gltf.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(gltf.accessors[p.attributes.POSITION]?.count||0),0);
assert.ok(vertices>6000,"sufficiently detailed for a proper skinning test");
for(const name of ["pelvis","spine_02","Head","upperarm_l","upperarm_r","thigh_l","thigh_r","calf_l","calf_r"]){
  assert.ok(gltf.nodes.some(node=>node.name===name),"missing humanoid joint "+name);
}
assert.equal(gltf.animations?.length||0,0,"candidate has no authored animations; animation stage is separate");
console.log(JSON.stringify({kb:+(raw.byteLength/1024).toFixed(1),vertices,joints,meshes:gltf.meshes.length,clips:gltf.animations?.length||0,status:"CHARACTER_ASSET_VALID"}));

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const chars=readFileSync(new URL("../characters.js",import.meta.url),"utf8");
const visuals=readFileSync(new URL("../visuals.js",import.meta.url),"utf8");
new Script(chars.replace(/^export /gm,""));
new Script(visuals.replace(/^export /gm,""));

class Mesh {
 constructor(geometry,material){
   this.geometry=geometry;this.material=material;this.children=[];
   this.scale={set(x,y,z){this.x=x;this.y=y;this.z=z}};
   this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
   this.rotation={x:0,y:0,z:0};
 }
 add(node){this.children.push(node)}
}
class Group extends Mesh {}
class Mat {constructor(config){Object.assign(this,config)}}
const THREE={
 Group,Mesh,BoxGeometry:class{},SphereGeometry:class{},CylinderGeometry:class{},
 MeshStandardMaterial:Mat, CanvasTexture:class{constructor(canvas){this.canvas=canvas;this.repeat={set(){}}}},
 RepeatWrapping:1000,SRGBColorSpace:1
};
const make=new Function(chars.replace(/^export /gm,"")+"\nreturn createCharacterFactory;")(THREE);
const create=make(THREE);
const hero=create(0),npc=create(1);
assert.ok(hero.head&&hero.torso&&hero.leftLeg&&hero.rightLeg);
assert.equal(hero.legs.length,2);
assert.equal(hero.arms.length,2);
assert.ok(hero.g.children.length>=7);
hero.setPose(4.2,1.2,false,.5);
assert.ok(hero.legs[0].thigh.rotation.x!==hero.legs[1].thigh.rotation.x,"walking legs alternate");
hero.setPose(0,2,true,1);
assert.ok(hero.sitBlend>.9,"sitting blend reaches sitting");
assert.ok(hero.legs[0].thigh.rotation.x>1.2,"thighs extend forward when seated");
assert.ok(hero.legs[0].shin.rotation.x< -1.0,"knees bend when seated");
hero.setPose(0,3,false,1);
assert.ok(hero.sitBlend<.05,"character can stand up");
assert.notEqual(hero.g.scale.x,npc.g.scale.x,"pedestrians use height variants");

// Canvas drawing stub: the textures are generated entirely offline at startup.
const context={
 fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
 createLinearGradient(){return {addColorStop(){}}}
};
const document={createElement(name){assert.equal(name,"canvas");return {width:0,height:0,getContext(){return context}}}};
const visualFactory=new Function("document",visuals.replace(/^export /gm,"")+"\nreturn createDistrictMaterials;")(document);
const materials=visualFactory(THREE);
assert.equal(materials.facades.length,6);
assert.ok(materials.asphalt.map?.canvas);
assert.ok(materials.pavement.map?.canvas);
assert.ok(materials.grass.map?.canvas);
assert.ok(materials.facades.every(m=>m.map));
console.log("Character and material remaster: OK — articulated seated pose and 9 procedural textures");

import assert from "node:assert/strict";
import {selectLocomotionClips,MotionController,MOVE_SPEEDS} from "./motion.mjs";

const clips=[
 {name:"Armature|Standing_Idle",duration:2},
 {name:"Walk_Backwards",duration:1},
 {name:"Walk",duration:.83},
 {name:"Running",duration:.64},
 {name:"Turn_Left",duration:.5}
];
const choice=selectLocomotionClips(clips);
assert.equal(choice.idle.name,"Armature|Standing_Idle");
assert.equal(choice.walk.name,"Walk");
assert.equal(choice.run.name,"Running");

class Action {
 constructor(name){this.name=name;this.plays=0;this.fade=null;this.rate=1;}
 reset(){return this}
 play(){this.plays++;return this}
 setEffectiveWeight(){return this}
 setEffectiveTimeScale(value){this.rate=value;return this}
 crossFadeTo(target,duration){this.fade={to:target.name,duration};return this}
 fadeOut(){return this}
 stop(){return this}
}
class Mixer {
 constructor(){this.actions=new Map();this.updates=0;}
 clipAction(c){if(!this.actions.has(c))this.actions.set(c,new Action(c.name));return this.actions.get(c)}
 update(dt){this.updates+=dt}
 stopAllAction(){}
}
const root={position:{x:0,z:0},rotation:{y:0}};
const mixer=new Mixer();
const controller=new MotionController({mixer,root,clips});
assert.equal(controller.getCapabilities().run,true);
assert.equal(controller.activeClip.name,"Armature|Standing_Idle");
controller.transitionTo("walk");
assert.equal(controller.activeClip.name,"Walk");
assert.ok(mixer.actions.get(clips[0]).fade.to==="Walk","idle to walk is crossfaded");
for(let i=0;i<40;i++)controller.update(.016);
assert.ok(controller.speed>.9);
assert.ok(root.position.z<-.5,"walk causes real model movement");
controller.setTurning(1);
for(let i=0;i<30;i++)controller.update(.016);
assert.ok(root.rotation.y>0.5,"character rotates continuously while moving");
assert.ok(root.position.x<-.02,"turning changes walking direction");
controller.transitionTo("run");
assert.equal(controller.activeClip.name,"Running");
for(let i=0;i<30;i++)controller.update(.016);
assert.ok(controller.speed>1.5,"running accelerates");
controller.transitionTo("idle");
for(let i=0;i<65;i++)controller.update(.016);
assert.ok(controller.speed<.1,"idle slows and stops rather than snapping");
assert.equal(controller.activeClip.name,"Armature|Standing_Idle");
assert.ok(mixer.updates>1,"mixer receives real delta time");
controller.playNamedClip("Turn_Left");
assert.equal(controller.activeClip.name,"Turn_Left");
assert.equal(controller.mode,"idle");
controller.resetLocation();
assert.equal(root.position.x,0);
assert.equal(root.position.z,0);
assert.equal(root.rotation.y,0);
assert.equal(controller.mode,"idle");
controller.dispose();

const fallback=new MotionController({
 mixer:new Mixer(),root:{position:{x:0,z:0},rotation:{y:0}},
 clips:[{name:"Idle"},{name:"Walk_Forward"}]
});
const r=fallback.transitionTo("run");
assert.equal(r.played,"walk");
assert.match(r.status,/нет бега/);
assert.equal(r.clip,"Walk_Forward");
fallback.update(.016);
assert.equal(fallback.active.rate,1.55);
const empty=new MotionController({mixer:null,root:{position:{x:0,z:0},rotation:{y:0}},clips:[]});
assert.equal(empty.transitionTo("run").clip,null);
assert.equal(empty.getCapabilities().walk,false);
assert.ok(MOVE_SPEEDS.run>MOVE_SPEEDS.walk);
console.log("Motion stage 2: animation selection, crossfade, ramp, turning, braking, missing-clip fallback PASS");

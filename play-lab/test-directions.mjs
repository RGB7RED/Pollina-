import assert from "node:assert/strict";
import {BUILDING} from "../building-lab/building.js";
import {PlayerController,modelYawForTravel,modelYawForCamera} from "./controller.js";

const pad=x=>({x,width:5.5,depth:3.15,centreZ:7.875});
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(pad);
const epsilon=1e-6,near=(a,b)=>Math.abs(a-b)<epsilon;
// Contract: GLB authoring basis faces +Z; world forward of a THREE.Group
// rotated about Y by yaw is {x:sin(yaw),z:cos(yaw)}.
for(const [dx,dz] of [
  [0,-1],[0,1],[1,0],[-1,0],
  [1,-1],[-1,-1],[1,1],[-1,1]
]){
  const yaw=modelYawForTravel(dx,dz),l=Math.hypot(dx,dz);
  assert.ok(near(Math.sin(yaw),dx/l)&&near(Math.cos(yaw),dz/l),
    "GLB faces actual "+dx+","+dz+" direction");
  const player=new PlayerController({building:BUILDING,pads});
  const before={...player.position};
  player.setStick(dx,dz);
  const output=player.update(.05);
  const moved={x:output.x-before.x,z:output.z-before.z};
  const m=Math.hypot(moved.x,moved.z);
  assert.ok(m>0);
  assert.equal(output.state,"walk");
  assert.ok(near(Math.sin(output.heading),moved.x/m)&&
    near(Math.cos(output.heading),moved.z/m),
    "rendered model must face real displacement "+dx+","+dz);
}
assert.ok(near(modelYawForCamera(0),Math.PI),
  "camera zero yaw looks -Z while model must rotate +Z basis toward -Z");
for(const yaw of [0,.65,-.85,Math.PI*.72]){
  const h=modelYawForCamera(yaw);
  assert.ok(near(Math.sin(h),Math.sin(yaw)) &&
    near(Math.cos(h),-Math.cos(yaw)),
    "GLB first-person forward must match camera optical forward");
}
for(const view of ["third","first"]){
  const player=new PlayerController({building:BUILDING,pads});
  player.setView(view);
  const oldYaw=player.lookYaw;
  player.look(80,0);
  assert.ok(player.lookYaw>oldYaw,"finger swipe right must turn view right");
  if(view==="first"){
    assert.ok(player.getCameraPose().aim.x>player.position.x);
  }else{
    assert.ok(player.getCameraPose().eye.x<player.position.x);
  }
  player.look(-80,0);
  assert.ok(near(player.lookYaw,oldYaw),"reverse horizontal swipe restores view");
  const pitch=player.lookPitch;
  player.look(0,-70);
  assert.ok(player.lookPitch>pitch,"swipe up raises line of sight");
  player.look(0,70);
  assert.ok(near(player.lookPitch,pitch),"vertical reversal restores view");
}
const toggle=new PlayerController({building:BUILDING,pads});
toggle.look(80,0);
const beforeLook=toggle.lookYaw;
toggle.setView("first");
assert.ok(near(toggle.lookYaw,beforeLook),"first-person toggle preserves gaze");
assert.ok(near(toggle.heading,modelYawForCamera(beforeLook)),
  "body direction at transition must follow gaze");
toggle.setStick(0,1);
toggle.update(.05);
assert.ok(near(toggle.heading,modelYawForCamera(toggle.lookYaw)));
// A move diagonally into the wall slides sideways; face the *actual*
// X displacement, not an impossible vector that points through the wall.
const wall=new PlayerController({building:BUILDING,pads,
 spawn:{x:0,z:BUILDING.width/2+.36001}});
wall.setStick(1,1);
wall.update(.05);
assert.ok(wall.position.x>0);
assert.ok(wall.position.z>=BUILDING.width/2+.36001-epsilon);
assert.ok(near(Math.sin(wall.heading),1)&&near(Math.cos(wall.heading),0),
  "sliding actor stays tangent to the facade");
console.log("MINI CITY 4.1.1 directions PASS: 8 directions, 2 cameras, swipe axes, mode switch, sliding");

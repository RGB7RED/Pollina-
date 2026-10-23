import assert from "node:assert/strict";
import {FreeCamera,normalizedStick,CAMERA_SPEEDS,LOOK_SENSITIVITIES} from "./free-camera.js";
const approx=(actual,expected,eps=.02)=>assert.ok(Math.abs(actual-expected)<=eps,
  "expected "+actual+" approximately "+expected);
const makeCamera=()=>({
 position:{x:0,y:8,z:30,set(x,y,z){Object.assign(this,{x,y,z})}},
 rotation:{order:"XYZ",set(x,y,z,order){Object.assign(this,{x,y,z,order})}}
});
const cam=makeCamera();
const free=new FreeCamera(cam);
assert.deepEqual(CAMERA_SPEEDS.map(x=>x.id),["precision","normal","travel"]);
assert.ok(CAMERA_SPEEDS[2].metresPerSecond>CAMERA_SPEEDS[1].metresPerSecond*3);
assert.equal(LOOK_SENSITIVITIES.length,3);
free.start({x:0,y:8,z:0});
assert.equal(cam.rotation.order,"YXZ");
approx(free.yaw,0,1e-10);
approx(free.pitch,0,1e-10);
free.setSpeedMode(0);
assert.equal(free.speed,1);
free.setStick(0,1);
for(let i=0;i<20;i++)free.update(.05);
assert.ok(cam.position.z<29.3,"pressing forward must move along -Z");
assert.ok(cam.position.y===8,"level camera must not climb");
free.setStick(1,0);
const before=cam.position.x;
for(let i=0;i<15;i++)free.update(.05);
assert.ok(cam.position.x>before+.5,"strafe moves to the right");

// Smooth acceleration/braking: no instantaneous teleport or snapping.
free.setStick(0,0);
const xDuringStrafe=cam.position.x;
free.update(.016);
assert.ok(cam.position.x>xDuringStrafe,"inertia after release");
for(let i=0;i<90;i++)free.update(.016);
assert.ok(Math.hypot(...Object.values(free.velocity))<.005,"velocity must decay to zero");
const settled={...cam.position};
free.update(.016);
assert.ok(Math.hypot(cam.position.x-settled.x,cam.position.y-settled.y,cam.position.z-settled.z)<.001);

// Drag sensitivity is configurable; Safari event spikes are clamped to 110 px.
free.setLookMode(0);
const yawBefore=free.targetYaw;
free.look(1000,0);
approx(free.targetYaw-yawBefore,-110*LOOK_SENSITIVITIES[0].radiansPerPixel,1e-8);
const currentYaw=free.yaw;
free.update(.016);
assert.ok(free.yaw<currentYaw&&free.yaw>free.targetYaw,"look smoothing works");
free.setLookMode(2);
assert.ok(free.sensitivity>.004);
free.look(0,-999);
for(let i=0;i<80;i++)free.update(.05);
assert.ok(free.pitch<=1.45&&free.targetPitch<=1.45,"pitch is clamped");
// Reset forward view, then look 45 degrees up.
cam.position.set(0,8,30);
free.start({x:0,y:8,z:0});
free.setLookMode(1);
for(let i=0;i<4;i++)free.look(0,-65);
for(let i=0;i<30;i++)free.update(.05);
assert.ok(free.pitch>.6,"can look up");
free.setSpeedMode(1);
free.setStick(0,1);
const yBefore=cam.position.y;
for(let i=0;i<25;i++)free.update(.05);
assert.ok(cam.position.y>yBefore+2,"forward flight follows gaze vertically");
assert.ok(cam.position.z<30-2,"still advances into scene");
free.setStick(0,0);
free.setVertical(-1);
for(let i=0;i<25;i++)free.update(.05);
assert.ok(cam.position.y<120,"altitude remains constrained");
free.setVertical(0);

// Turn right using look, then local-forward moves diagonally relative to yaw.
free.start({x:0,y:cam.position.y,z:0});
const initialYaw=free.yaw;
for(let i=0;i<6;i++)free.look(-85,0);
for(let i=0;i<40;i++)free.update(.05);
assert.ok(free.yaw>initialYaw+.8,"yaw tracks finger");
const xBefore=cam.position.x;
free.setStick(0,1);
for(let i=0;i<20;i++)free.update(.05);
assert.ok(cam.position.x<xBefore-.9,"looking left changes forward flight toward -X");

// Speed modes and keyboard vertical control.
free.setStick(0,0);free.setSpeedMode(2);
assert.equal(free.speed,23);
free.keys.add("KeyE");
const upBefore=cam.position.y;
for(let i=0;i<10;i++)free.update(.05);
assert.ok(cam.position.y>upBefore,"keyboard E ascends");
free.keys.clear();
free.setVertical(-1);
for(let i=0;i<10;i++)free.update(.05);
assert.ok(cam.position.y<120,"down action safe");

// View bounds, blur cleanup, and toggling.
cam.position.set(250,119.9,250);
free.setStick(1,1);
free.setVertical(1);
free.update(10);
assert.ok(Math.abs(cam.position.x)<=250&&Math.abs(cam.position.z)<=250&&cam.position.y<=120);
free.stop();
assert.ok(!free.active&&free.keys.size===0);
assert.equal(free.axisZ,0);
assert.deepEqual(free.velocity,{x:0,y:0,z:0});
const frozen={...cam.position};
free.update(.05);
assert.deepEqual({...cam.position},frozen);
free.start({x:0,y:10,z:0});
assert.equal(free.targetYaw,free.yaw);

const rect={left:0,top:0,width:140,height:140};
assert.deepEqual(normalizedStick(70,70,rect),{x:0,z:0});
assert.deepEqual(normalizedStick(73,68,rect),{x:0,z:0},"joystick dead zone");
assert.ok(normalizedStick(70,-300,rect).z>.99);
assert.ok(normalizedStick(350,70,rect).x>.99);
const soft=normalizedStick(70,55,rect);
assert.ok(soft.z>0&&soft.z<.15,"fine precision close to center");
const diag=normalizedStick(450,-200,rect);
assert.ok(Math.hypot(diag.x,diag.z)<1.00001);
console.log("Camera 3.1.2 PASS: full 3D flight, precision/travel speeds, damping, look smoothing, deadzone, limits, pointer spikes");

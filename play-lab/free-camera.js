// MINI CITY 4.5.4.1 — independent, collision-free 6DoF inspection camera.
// Lab opens with no player. It operates on THE SAME Three.js scene as Game.
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const FREE_CAMERA_START=Object.freeze({x:0,y:22,z:43,yaw:0,pitch:-.39});
export class FreeSceneCamera{
 constructor(start=FREE_CAMERA_START){
  this.origin={...start};this.reset();
 }
 reset(){
  this.position={x:this.origin.x,y:this.origin.y,z:this.origin.z};
  this.yaw=this.origin.yaw;this.pitch=this.origin.pitch;
 }
 look(dx,dy){
  this.yaw+=clamp(dx,-110,110)*.0032;
  this.pitch=clamp(this.pitch-dy*.0032,-1.50,1.50);
 }
 update(dt,side=0,forward=0,vertical=0,fast=false){
  dt=clamp(dt,0,.05);
  const norm=Math.max(1,Math.hypot(side,forward,vertical));
  const move=(fast?16:6.5)*dt/norm;
  this.position.x+=(side*Math.cos(this.yaw)+forward*Math.sin(this.yaw))*move;
  this.position.z+=(side*Math.sin(this.yaw)-forward*Math.cos(this.yaw))*move;
  this.position.y=clamp(this.position.y+vertical*move,.45,55);
  this.position.x=clamp(this.position.x,-70,70);
  this.position.z=clamp(this.position.z,-60,70);
  return this.position;
 }
 getCameraPose(){
  const c=Math.cos(this.pitch),{x,y,z}=this.position;
  return {eye:{x,y,z},aim:{x:x+Math.sin(this.yaw)*c,
    y:y+Math.sin(this.pitch),z:z-Math.cos(this.yaw)*c},
    mode:"free"};
 }
}

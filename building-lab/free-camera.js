// Building Lab 3.1.1 — 6-degree-of-freedom inspection camera.
// No OrbitControls dependency; this controller only manages free-fly mode.
// Motion: local right/forward in XZ, global up/down along Y; camera can pass
// through the model to inspect individual architectural elements.
export class FreeCamera {
  constructor(camera,{speed=9,sprint=2.4,sensitivity=.0032}={}){
    this.camera=camera;
    this.speed=speed;this.sprint=sprint;this.sensitivity=sensitivity;
    this.yaw=0;this.pitch=0;this.active=false;
    this.axisX=0;this.axisZ=0;this.axisY=0;
    this.keys=new Set();this.boost=false;
    this.limits={x:260,z:260,yMin:.32,yMax:115};
  }
  start(target){
    const dx=target.x-this.camera.position.x;
    const dy=target.y-this.camera.position.y;
    const dz=target.z-this.camera.position.z;
    const horizontal=Math.hypot(dx,dz)||.000001;
    this.yaw=Math.atan2(-dx,-dz);
    this.pitch=Math.atan2(dy,horizontal);
    this.active=true;
    this.clearInputs();
    this.orient();
  }
  orient(){
    // THREE cameras face -Z; use YXZ so the horizon stays level.
    this.camera.rotation.order="YXZ";
    this.camera.rotation.set(this.pitch,this.yaw,0,"YXZ");
  }
  forward(){
    const c=Math.cos(this.pitch);
    return {x:-Math.sin(this.yaw)*c,y:Math.sin(this.pitch),z:-Math.cos(this.yaw)*c};
  }
  look(dx,dy){
    if(!this.active)return;
    this.yaw-=dx*this.sensitivity;
    this.pitch=Math.max(-1.49,Math.min(1.49,this.pitch-dy*this.sensitivity));
    this.orient();
  }
  setStick(x,z){
    this.axisX=Math.max(-1,Math.min(1,x));
    this.axisZ=Math.max(-1,Math.min(1,z));
  }
  setVertical(dir){this.axisY=Math.max(-1,Math.min(1,dir));}
  clearInputs(){
    this.axisX=0;this.axisZ=0;this.axisY=0;
    this.boost=false;this.keys.clear();
  }
  stop(){this.active=false;this.clearInputs();}
  update(delta){
    if(!this.active)return;
    const dt=Math.max(0,Math.min(delta,.05));
    const has=(...codes)=>codes.some(k=>this.keys.has(k));
    const x=this.axisX+(has("KeyD","ArrowRight")?1:0)-(has("KeyA","ArrowLeft")?1:0);
    const z=this.axisZ+(has("KeyW","ArrowUp")?1:0)-(has("KeyS","ArrowDown")?1:0);
    const y=this.axisY+(has("KeyE","Space")?1:0)-(has("KeyQ","ControlLeft")?1:0);
    const horizontal=Math.max(1,Math.hypot(x,z));
    const speed=this.speed*(this.boost||has("ShiftLeft","ShiftRight")?this.sprint:1)*dt;
    const sx=x/horizontal,sz=z/horizontal;
    const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw);
    // Right=(cos(yaw),0,-sin(yaw)) and forward=(-sin(yaw),0,-cos(yaw)).
    const nx=this.camera.position.x+(sx*cy-sz*sy)*speed;
    const nz=this.camera.position.z+(-sx*sy-sz*cy)*speed;
    const ny=this.camera.position.y+Math.max(-1,Math.min(1,y))*speed;
    this.camera.position.set(
      Math.max(-this.limits.x,Math.min(this.limits.x,nx)),
      Math.max(this.limits.yMin,Math.min(this.limits.yMax,ny)),
      Math.max(-this.limits.z,Math.min(this.limits.z,nz))
    );
  }
  targetAt(distance=12){
    const d=this.forward();
    return {
      x:this.camera.position.x+d.x*distance,
      y:this.camera.position.y+d.y*distance,
      z:this.camera.position.z+d.z*distance
    };
  }
}
// Testable touch vector conversion, shared by the joystick and its tests.
export function normalizedStick(clientX,clientY,rect){
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const r=Math.max(1,Math.min(rect.width,rect.height)*.39);
  const dx=(clientX-cx)/r,dy=(clientY-cy)/r;
  const magnitude=Math.max(1,Math.hypot(dx,dy));
  return {x:dx/magnitude,z:-dy/magnitude};
}

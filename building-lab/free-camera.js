// Building Lab 3.1.2 — precise six-axis camera for Safari touch + desktop.
// Camera orientation and movement are decoupled. The same dt-based controller
// is used by keyboard and mobile so devices with different FPS behave alike.
export const CAMERA_SPEEDS=Object.freeze([
  {id:"precision",label:"Точная",metresPerSecond:1.0},
  {id:"normal",label:"Обычная",metresPerSecond:6.5},
  {id:"travel",label:"Быстрая",metresPerSecond:23}
]);
export const LOOK_SENSITIVITIES=Object.freeze([
  {id:"low",label:"Медленно",radiansPerPixel:.0017},
  {id:"medium",label:"Нормально",radiansPerPixel:.0030},
  {id:"high",label:"Быстро",radiansPerPixel:.0045}
]);
const clamp=(x,low,high)=>Math.max(low,Math.min(high,x));
export function normalizedStick(clientX,clientY,rect,{deadzone=.13}={}){
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const radius=Math.max(1,Math.min(rect.width,rect.height)*.39);
  const dx=(clientX-cx)/radius, dz=(cy-clientY)/radius;
  const magnitude=Math.hypot(dx,dz);
  if(magnitude<=deadzone)return {x:0,z:0};
  const directionX=dx/magnitude,directionZ=dz/magnitude;
  const v=clamp((Math.min(magnitude,1)-deadzone)/(1-deadzone),0,1);
  // Non-linear response for centimetre-accurate inspection at low stick travel.
  const gain=v*v*(3-2*v);
  return {x:directionX*gain,z:directionZ*gain};
}
export class FreeCamera {
  constructor(camera,{speed,lookSensitivity=.003,acceleration=9,braking=15}={}){
    this.camera=camera;
    this.speedMode=1;
    this.lookMode=1;
    this.customSpeed=Number.isFinite(speed)&&speed>0?speed:null;
    this.customSensitivity=lookSensitivity;
    this.acceleration=acceleration;
    this.braking=braking;
    this.active=false;
    this.yaw=0;this.pitch=0;
    this.targetYaw=0;this.targetPitch=0;
    this.axisX=0;this.axisY=0;this.axisZ=0;
    this.velocity={x:0,y:0,z:0};
    this.keys=new Set();
    this.boost=false;
    this.limits={x:250,z:250,yMin:.25,yMax:120};
  }
  get speed(){return this.customSpeed??CAMERA_SPEEDS[this.speedMode].metresPerSecond;}
  get sensitivity(){return this.customSensitivity??LOOK_SENSITIVITIES[this.lookMode].radiansPerPixel;}
  setSpeedMode(index){
    this.speedMode=(index+CAMERA_SPEEDS.length)%CAMERA_SPEEDS.length;
    this.customSpeed=null;
    return CAMERA_SPEEDS[this.speedMode];
  }
  setLookMode(index){
    this.lookMode=(index+LOOK_SENSITIVITIES.length)%LOOK_SENSITIVITIES.length;
    this.customSensitivity=null;
    return LOOK_SENSITIVITIES[this.lookMode];
  }
  start(target){
    const dx=target.x-this.camera.position.x;
    const dy=target.y-this.camera.position.y;
    const dz=target.z-this.camera.position.z;
    const h=Math.hypot(dx,dz)||.000001;
    this.yaw=Math.atan2(-dx,-dz);
    this.pitch=Math.atan2(dy,h);
    this.targetYaw=this.yaw;
    this.targetPitch=this.pitch;
    this.active=true;
    this.clearInputs();
    this.orient();
  }
  orient(){
    this.camera.rotation.order="YXZ";
    this.camera.rotation.set(this.pitch,this.yaw,0,"YXZ");
  }
  forward(){
    const cp=Math.cos(this.pitch);
    return {x:-Math.sin(this.yaw)*cp,
      y:Math.sin(this.pitch),z:-Math.cos(this.yaw)*cp};
  }
  look(dx,dy){
    if(!this.active)return;
    // Ignore exceptionally large pointer deltas (e.g. Safari toolbar reflow).
    this.targetYaw-=clamp(dx,-110,110)*this.sensitivity;
    this.targetPitch=clamp(this.targetPitch-clamp(dy,-110,110)*this.sensitivity,-1.45,1.45);
  }
  setStick(x,z){
    this.axisX=clamp(x,-1,1);
    this.axisZ=clamp(z,-1,1);
  }
  setVertical(y){this.axisY=clamp(y,-1,1);}
  clearInputs(){
    this.axisX=this.axisY=this.axisZ=0;
    this.velocity.x=this.velocity.y=this.velocity.z=0;
    this.boost=false;this.keys.clear();
  }
  stop(){this.active=false;this.clearInputs();}
  update(delta){
    if(!this.active)return;
    const dt=clamp(delta,0,.05);
    // Temporal filtering avoids jagged Safari pointer events at varying FPS.
    const lookBlend=1-Math.exp(-19*dt);
    this.yaw+=(this.targetYaw-this.yaw)*lookBlend;
    this.pitch+=(this.targetPitch-this.pitch)*lookBlend;
    this.orient();
    const has=(...names)=>names.some(n=>this.keys.has(n));
    let side=this.axisX+Number(has("KeyD","ArrowRight"))-Number(has("KeyA","ArrowLeft"));
    let ahead=this.axisZ+Number(has("KeyW","ArrowUp"))-Number(has("KeyS","ArrowDown"));
    let rise=this.axisY+Number(has("KeyE","Space"))-Number(has("KeyQ","ControlLeft"));
    // Full 3D forward motion: looking up and pressing forward makes us ascend.
    // Up/down buttons remain world vertical for precision.
    const horizontalLength=Math.max(1,Math.hypot(side,ahead,rise));
    side/=horizontalLength;ahead/=horizontalLength;rise/=horizontalLength;
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
    const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
    const boost=this.boost||has("ShiftLeft","ShiftRight")?1.7:1;
    const targetSpeed=this.speed*boost;
    const desired={
      x:(side*cy-ahead*sy*cp)*targetSpeed,
      y:(ahead*sp+rise)*targetSpeed,
      z:(-side*sy-ahead*cy*cp)*targetSpeed
    };
    const noInput=Math.abs(side)+Math.abs(ahead)+Math.abs(rise)<.0001;
    const factor=1-Math.exp(-(noInput?this.braking:this.acceleration)*dt);
    for(const axis of ["x","y","z"]){
      this.velocity[axis]+=(desired[axis]-this.velocity[axis])*factor;
      if(noInput&&Math.abs(this.velocity[axis])<.001)this.velocity[axis]=0;
    }
    const p=this.camera.position,l=this.limits;
    const nx=clamp(p.x+this.velocity.x*dt,-l.x,l.x);
    const ny=clamp(p.y+this.velocity.y*dt,l.yMin,l.yMax);
    const nz=clamp(p.z+this.velocity.z*dt,-l.z,l.z);
    if(nx!==p.x+this.velocity.x*dt)this.velocity.x=0;
    if(ny!==p.y+this.velocity.y*dt)this.velocity.y=0;
    if(nz!==p.z+this.velocity.z*dt)this.velocity.z=0;
    p.set(nx,ny,nz);
  }
  targetAt(distance=12){
    const dir=this.forward(),p=this.camera.position;
    return {x:p.x+dir.x*distance,y:p.y+dir.y*distance,z:p.z+dir.z*distance};
  }
}

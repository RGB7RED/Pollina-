// MINI CITY 4.1 — shared movement/collision/view logic for iPhone + desktop.
// Coordinates in metres; building origin is (0,0,0), its front facade is +Z.
// Runs without THREE so its numerical contracts can be tested independently.
export const PLAYER_HEIGHT=1.82;
export const PLAYER_RADIUS=.36;
export const WALK_SPEED=1.45;
export const RUN_SPEED=3.35;
export const WORLD_LIMITS=Object.freeze({x:56,z:32});
export const DEFAULT_SPAWN=Object.freeze({x:0,z:13.2});
export const VIEW_MODES=Object.freeze(["third","first"]);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const smooth=(current,target,response,dt)=>current+(target-current)*(1-Math.exp(-response*dt));
// Urban GLB faces local +Z; camera zero yaw points toward world -Z.
// Three.js local +Z transformed by heading points to (sin,cos) in XZ.
export function modelYawForTravel(dx,dz){return Math.atan2(dx,dz);}
export function modelYawForCamera(lookYaw){
  return modelYawForTravel(Math.sin(lookYaw),-Math.cos(lookYaw));
}

export function facadeObstacles(building,pads=[]){
  const halfX=building.length/2,halfZ=building.width/2;
  const obstacles=[{name:"building",minX:-halfX,maxX:halfX,minZ:-halfZ,maxZ:halfZ}];
  for(const [i,p] of pads.entries()){
    obstacles.push({name:"entry-"+(i+1),
      minX:p.x-p.width/2,maxX:p.x+p.width/2,
      minZ:p.centreZ-p.depth/2,maxZ:p.centreZ+p.depth/2});
  }
  return obstacles;
}
export function collidesAt(x,z,obstacles,radius=PLAYER_RADIUS){
  return obstacles.some(b=>
    x>b.minX-radius&&x<b.maxX+radius&&
    z>b.minZ-radius&&z<b.maxZ+radius);
}
export function resolveStep(position,dx,dz,obstacles,{radius=PLAYER_RADIUS,bounds=WORLD_LIMITS}={}){
  // Sub-step to keep high-speed and low-FPS motion from tunneling through walls.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  let x=position.x,z=position.z,hit=false;
  for(let i=0;i<count;i++){
    const toX=clamp(x+dx/count,-bounds.x+radius,bounds.x-radius);
    if(!collidesAt(toX,z,obstacles,radius))x=toX;
    else hit=true;
    const toZ=clamp(z+dz/count,-bounds.z+radius,bounds.z-radius);
    if(!collidesAt(x,toZ,obstacles,radius))z=toZ;
    else hit=true;
  }
  return {x,z,hit,distance:Math.hypot(x-position.x,z-position.z)};
}
// Avoid a camera floating inside a wall when the actor walks near the facade.
// Conservative 2D line/rectangle test; ignores windows and camera vertical
// clearance, which is intentional for the first joint-scene prototype.
export function cameraObstacleDistance(start,end,obstacles,safety=.25){
  const dx=end.x-start.x,dz=end.z-start.z;
  const max=Math.hypot(dx,dz);
  if(max<1e-6)return max;
  let fraction=1;
  for(const b of obstacles){
    let near=0,far=1,valid=true;
    for(const [origin,d,min,maxv] of [
      [start.x,dx,b.minX-safety,b.maxX+safety],
      [start.z,dz,b.minZ-safety,b.maxZ+safety]
    ]){
      if(Math.abs(d)<1e-9){
        if(origin<=min||origin>=maxv){valid=false;break;}
      }else{
        let a=(min-origin)/d,c=(maxv-origin)/d;
        if(a>c)[a,c]=[c,a];
        near=Math.max(near,a);far=Math.min(far,c);
        if(near>far){valid=false;break;}
      }
    }
    if(valid)fraction=Math.min(fraction,near);
  }
  return clamp(max*fraction-.12,.28,max);
}
export function joystickValue(clientX,clientY,rect,deadzone=.13){
  const radius=Math.max(1,Math.min(rect.width,rect.height)*.43);
  const x=(clientX-rect.left-rect.width/2)/radius;
  const z=(rect.top+rect.height/2-clientY)/radius;
  const len=Math.hypot(x,z);
  if(len<deadzone)return {x:0,z:0};
  const magnitude=clamp((Math.min(1,len)-deadzone)/(1-deadzone),0,1);
  return {x:x/len*magnitude,z:z/len*magnitude};
}
export class PlayerController{
  constructor({building,pads=[],spawn=DEFAULT_SPAWN}){
    this.position={x:spawn.x,z:spawn.z};
    this.spawn={...this.position};
    this.obstacles=facadeObstacles(building,pads);
    if(collidesAt(spawn.x,spawn.z,this.obstacles))
      throw Error("Spawn must not intersect house or entrance slabs");
    this.lookYaw=0;this.lookPitch=.18;this.heading=modelYawForCamera(0);
    this.view="third";this.axis={x:0,z:0};this.run=false;
    this.speed=0;this.state="idle";this.collided=false;
  }
  setStick(x,z){this.axis.x=clamp(x,-1,1);this.axis.z=clamp(z,-1,1);}
  look(dx,dy,sensitivity=.0032){
    this.lookYaw+=clamp(dx,-90,90)*sensitivity;
    this.lookPitch=clamp(this.lookPitch-dy*sensitivity,-.78,.95);
  }
  setRun(v){this.run=Boolean(v);}
  setView(view){
    if(!VIEW_MODES.includes(view))throw Error("Unknown camera mode "+view);
    if(view===this.view)return;
    this.view=view;
    if(view==="first"){
      // Preserve current view direction when switching; body heading and
      // camera yaw belong to opposite local-forward conventions.
      this.heading=modelYawForCamera(this.lookYaw);
      this.lookPitch=0;
    }
  }
  toggleView(){this.setView(this.view==="third"?"first":"third");return this.view;}
  reset(){
    this.position={...this.spawn};this.axis={x:0,z:0};
    this.lookYaw=0;this.lookPitch=.18;this.heading=modelYawForCamera(0);
    this.run=false;this.speed=0;this.collided=false;this.state="idle";
  }
  update(dt){
    dt=clamp(dt,0,.05);
    const magnitude=Math.min(1,Math.hypot(this.axis.x,this.axis.z));
    const requestedSpeed=magnitude*(this.run?RUN_SPEED:WALK_SPEED);
    this.speed=smooth(this.speed,requestedSpeed,requestedSpeed>this.speed?12:16,dt);
    if(this.speed<.018)this.speed=0;
    const ax=this.axis.x,az=this.axis.z;
    const len=Math.hypot(ax,az);
    let distance=0;
    this.collided=false;
    if(len>.001&&this.speed>0){
      const side=ax/Math.max(1,len),ahead=az/Math.max(1,len);
      // Camera forward is (sin(yaw), -cos(yaw)); right is (cos,sin).
      const dx=(side*Math.cos(this.lookYaw)+ahead*Math.sin(this.lookYaw))*this.speed*dt;
      const dz=(side*Math.sin(this.lookYaw)-ahead*Math.cos(this.lookYaw))*this.speed*dt;
      const step=resolveStep(this.position,dx,dz,this.obstacles);
      const movedX=step.x-this.position.x,movedZ=step.z-this.position.z;
      distance=step.distance;this.collided=step.hit;
      this.position.x=step.x;this.position.z=step.z;
      if(distance>1e-5&&this.view==="third"){
        // Wall collisions may remove one component: face the actual travel.
        this.heading=modelYawForTravel(movedX,movedZ);
      }
    }
    if(this.view==="first")this.heading=modelYawForCamera(this.lookYaw);
    // If walking into the wall, don't play a full-speed running animation.
    this.state=distance<.00002?"idle":this.run?"run":"walk";
    return {state:this.state,view:this.view,collided:this.collided,
      x:this.position.x,z:this.position.z,speed:dt>0?distance/dt:0,
      heading:this.heading};
  }
  getCameraPose(){
    const {x,z}=this.position;
    if(this.view==="first"){
      const eye={x,y:1.65,z};
      const c=Math.cos(this.lookPitch);
      return {eye,aim:{
        x:x+Math.sin(this.lookYaw)*c,
        y:eye.y+Math.sin(this.lookPitch),
        z:z-Math.cos(this.lookYaw)*c},mode:"first"};
    }
    const target={x,y:1.30,z};
    const dist=5.9,cos=Math.cos(this.lookPitch);
    const requested={x:x-Math.sin(this.lookYaw)*dist*cos,
      y:target.y+Math.sin(this.lookPitch)*dist+1.05,
      z:z+Math.cos(this.lookYaw)*dist*cos};
    const limit=cameraObstacleDistance(target,requested,this.obstacles);
    const scale=limit/Math.hypot(requested.x-x,requested.z-z);
    const horizontal=Math.min(1,scale);
    return {eye:{x:x+(requested.x-x)*horizontal,
      y:target.y+(requested.y-target.y)*horizontal,
      z:z+(requested.z-z)*horizontal},
      aim:target,mode:"third"};
  }
}

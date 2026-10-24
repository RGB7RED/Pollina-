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
export function collidesAt(x,z,obstacles,radius=PLAYER_RADIUS,y=0){
  return obstacles.some(b=>
    y>=(b.minY??-Infinity)&&y<(b.maxY??Infinity)&&
    x>b.minX-radius&&x<b.maxX+radius&&
    z>b.minZ-radius&&z<b.maxZ+radius);
}
export function resolveStep(position,dx,dz,obstacles,{radius=PLAYER_RADIUS,bounds=WORLD_LIMITS}={}){
  // Sub-step to keep high-speed and low-FPS motion from tunneling through walls.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  let x=position.x,z=position.z,hit=false;
  for(let i=0;i<count;i++){
    const toX=clamp(x+dx/count,-bounds.x+radius,bounds.x-radius);
    if(!collidesAt(toX,z,obstacles,radius,position.y??0))x=toX;
    else hit=true;
    const toZ=clamp(z+dz/count,-bounds.z+radius,bounds.z-radius);
    if(!collidesAt(x,toZ,obstacles,radius,position.y??0))z=toZ;
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
    // The ground-floor vestibule walls are not on upper storeys.
    if((start.y??0)<(b.minY??-Infinity)||(start.y??0)>=(b.maxY??Infinity))
      continue;
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
  constructor({building,pads=[],spawn=DEFAULT_SPAWN,extras=[],entry=null}){
    this.entry=entry;
    this.position={x:spawn.x,z:spawn.z,y:entry?.groundHeight(spawn.x,spawn.z)||0};
    this.spawn={...this.position};
    this.entryDoorOpen=false;
    this.innerDoorOpen=false;
    this.doorBlocker=entry?.door||null;
    this.innerDoorBlocker=entry?.innerDoor||null;
    // Older controllers keep the original whole-house collider. The game
    // opts into the exact first-entry corridor without changing other doors.
    this.obstacles=[...(entry?entry.buildingObstacles:facadeObstacles(building,pads)),
      ...(entry?[entry.door,...(entry.innerDoor?[entry.innerDoor]:[])]:[]),
      ...extras.map(o=>({...o}))];
    if(collidesAt(spawn.x,spawn.z,this.obstacles))
      throw Error("Spawn must not intersect house or entrance slabs");
    this.lookYaw=0;this.lookPitch=.18;this.heading=modelYawForCamera(0);
    this.view="third";this.axis={x:0,z:0};this.run=false;
    this.speed=0;this.state="idle";this.collided=false;
  }
  setEntryDoorOpen(open){
    if(!this.entry)return false;
    open=Boolean(open);
    if(open===this.entryDoorOpen)return true;
    if(!open&&Math.abs(this.position.x-this.entry.x)<1.05&&
      Math.abs(this.position.z-this.entry.door.minZ)<.65)
      return false; // no door closing THROUGH the player
    this.entryDoorOpen=open;
    const index=this.obstacles.indexOf(this.doorBlocker);
    if(open&&index>=0)this.obstacles.splice(index,1);
    if(!open&&index<0)this.obstacles.push(this.doorBlocker);
    return true;
  }
  setInnerDoorOpen(open){
    if(!this.innerDoorBlocker||!this.entry)return false;
    open=Boolean(open);
    if(open===this.innerDoorOpen)return true;
    if(!open&&Math.abs(this.position.x-this.entry.x)<1.05&&
      Math.abs(this.position.z-this.entry.innerDoorZ)<.68)
      return false; // do not shut an indoor door through the player
    this.innerDoorOpen=open;
    const index=this.obstacles.indexOf(this.innerDoorBlocker);
    if(open&&index>=0)this.obstacles.splice(index,1);
    if(!open&&index<0)this.obstacles.push(this.innerDoorBlocker);
    return true;
  }
  canUseEntryDoor(){
    return !!this.entry&&this.position.y<1.35&&
      this.entry.canInteract(this.position.x,this.position.z);
  }
  canUseInnerDoor(){
    return !!this.entry&&!!this.innerDoorBlocker&&this.position.y<1.35&&
      this.entry.canInteractInner(this.position.x,this.position.z);
  }
  nearestDoor(){
    const {x,z}=this.position;
    const outer=this.canUseEntryDoor()?
      {id:"outer",label:"Входная дверь",open:this.entryDoorOpen,
        distance:Math.hypot(x-this.entry.x,z-(this.entry.facade-.12))}:null;
    const inner=this.canUseInnerDoor()?
      {id:"inner",label:"Внутренняя дверь",open:this.innerDoorOpen,
        distance:Math.hypot(x-this.entry.x,z-this.entry.innerDoorZ)}:null;
    if(outer&&inner)return inner.distance<outer.distance?inner:outer;
    return inner||outer;
  }
  toggleNearestDoor(){
    const which=this.nearestDoor();
    if(!which)return false;
    return which.id==="outer"?
      this.setEntryDoorOpen(!this.entryDoorOpen):
      this.setInnerDoorOpen(!this.innerDoorOpen);
  }
  isInsideEntrance(){
    return !!this.entry&&this.entry.isInside(this.position.x,this.position.z,this.position.y);
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
    if(this.entryDoorOpen){
      this.entryDoorOpen=false;
      if(!this.obstacles.includes(this.doorBlocker))this.obstacles.push(this.doorBlocker);
    }
    if(this.innerDoorOpen){
      this.innerDoorOpen=false;
      if(!this.obstacles.includes(this.innerDoorBlocker))
        this.obstacles.push(this.innerDoorBlocker);
    }
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
      const ground=this.entry?.groundHeight(step.x,step.z,this.position.y)||0;
      // One genuine stair riser is ~11.6 cm. Reject abrupt height changes:
      // prevents walking sideways from floor 1 directly onto flight 2
      // and keeps the actor attached to the physical stair surfaces.
      const forbiddenLift=this.entry&&Math.abs(ground-this.position.y)>.19;
      if(forbiddenLift){
        step.x=this.position.x;step.z=this.position.z;
        step.distance=0;step.hit=true;
      }
      const movedX=step.x-this.position.x,movedZ=step.z-this.position.z;
      distance=step.distance;this.collided=step.hit;
      this.position.x=step.x;this.position.z=step.z;
      this.position.y=forbiddenLift?this.position.y:ground;
      if(distance>1e-5&&this.view==="third"){
        // Wall collisions may remove one component: face the actual travel.
        this.heading=modelYawForTravel(movedX,movedZ);
      }
    }
    if(this.view==="first")this.heading=modelYawForCamera(this.lookYaw);
    // If walking into the wall, don't play a full-speed running animation.
    this.state=distance<.00002?"idle":this.run?"run":"walk";
    return {state:this.state,view:this.view,collided:this.collided,
      x:this.position.x,z:this.position.z,y:this.position.y,
      inside:this.isInsideEntrance(),
      entranceZone:this.entry?.zone(this.position.x,this.position.z,this.position.y)||"street",
      speed:dt>0?distance/dt:0,
      heading:this.heading};
  }
  getCameraPose(){
    const {x,z,y=0}=this.position;
    if(this.view==="first"){
      const eye={x,y:1.65+y,z};
      const c=Math.cos(this.lookPitch);
      return {eye,aim:{
        x:x+Math.sin(this.lookYaw)*c,
        y:eye.y+Math.sin(this.lookPitch),
        z:z-Math.cos(this.lookYaw)*c},mode:"first"};
    }
    const inside=this.isInsideEntrance();
    const target={x,y:1.30+y,z};
    const dist=inside?1.90:5.9,cos=Math.cos(this.lookPitch);
    const requested={x:x-Math.sin(this.lookYaw)*dist*cos,
      y:target.y+Math.sin(this.lookPitch)*dist+(inside?.12:1.05),
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

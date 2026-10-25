// MINI CITY 4.7.8 — level entrance + stair render/collision parity.
import {STAIR_PROFILE,FOYER_GROUND} from "../building-lab/building.js";
// Collision geometry matches the first REAL facade opening and existing porch.
export function planPlayableEntrance(building,pads){
  if(!building||!pads?.length)throw Error("Entrance requires real building and porch");
  const p=pads[0],x=p.x,facade=building.frontFacade??building.width/2;
  const halfX=building.length/2,rearFacade=building.backFacade??-building.width/2;
  const halfZ=-rearFacade;
  const doorHalf=.81,insideEnd=3.35,foyerHalf=1.62;
  // U-stair follows the true stair mesh in building-lab/building.js.
  // The first floor and every complete-floor landing are at the BACK,
  // opposite the former door wall. Ascend forward on LEFT, then return
  // toward the BACK along RIGHT to the following complete-floor landing.
  const foyerFloor=FOYER_GROUND,firstFloor=building.firstFloor??2.09,
    storeyHeight=building.floorHeight??2.42;
  const stair={bottomZ:-1.58,turnZ:2.05,backZ:-4.85,
    frontZ:facade-.44,firstFrontZ:facade-.44,
    entryStartZ:3.35,entryRise:firstFloor-foyerFloor,halfRise:storeyHeight/2,
    steps:12,entrySteps:12,firstFloor,foyerFloor,storeyHeight,
    firstX:x-STAIR_PROFILE.centreOffset,
    secondX:x+STAIR_PROFILE.centreOffset,entryX:x+STAIR_PROFILE.centreOffset,
    entryWidth:STAIR_PROFILE.flightWidth,flightWidth:STAIR_PROFILE.flightWidth};
  const stairHalf=STAIR_PROFILE.halfWidth,
    aisleHalf=STAIR_PROFILE.centreOffset-STAIR_PROFILE.flightWidth/2,upperTurnY=firstFloor+stair.halfRise;
  if(p.width<2||insideEnd>=facade||foyerHalf>=p.width/2)
    throw Error("Entrance dimensions invalid");
  const rect=(name,minX,maxX,minZ,maxZ,minY=-Infinity,maxY=Infinity)=>
    ({name,minX,maxX,minZ,maxZ,minY,maxY});
  const totalFloors=building.floors,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const nearestFloor=currentY=>clamp(
    Math.round((currentY-firstFloor)/storeyHeight),0,totalFloors-1);
  const floorHeight=i=>firstFloor+i*storeyHeight;
  // The lower room is 3.48m wide inside the same unmodified facade.
  // Side walls now hide the neighbouring apartment-bay windows. Exterior facade
  // remains perforated by only the EXISTING original 1.71m doorway.
  // Never leave a walk-through hole in the neighbouring facade brick.
  const house=[
    rect("stair-left",-halfX,x-stairHalf,-halfZ,facade),
    rect("stair-right",x+stairHalf,halfX,-halfZ,facade),
    rect("stairwell-back",x-stairHalf,x+stairHalf,-halfZ,stair.backZ),
    rect("facade-left-jamb",x-stairHalf,x-doorHalf,facade-.30,facade+.02,
      -Infinity,upperTurnY-.10),
    rect("facade-right-jamb",x+doorHalf,x+stairHalf,facade-.30,facade+.02,
      -Infinity,upperTurnY-.10),
    // Flight guards are on the open INNER sides only, never on walls.
    rect("left-inner-flight-guard",x-aisleHalf-.05,x-aisleHalf+.03,
      stair.bottomZ+.10,stair.turnZ-.10,firstFloor),
    rect("right-inner-flight-guard",x+aisleHalf-.03,x+aisleHalf+.05,
      stair.bottomZ+.10,stair.turnZ-.10,firstFloor),
    rect("entry-flight-inner-guard",x+aisleHalf-.03,x+aisleHalf+.05,
      stair.bottomZ+.10,stair.entryStartZ-.10,
      foyerFloor,firstFloor+.15),
    rect("exterior-window-wall",x-stairHalf,x+stairHalf,
      facade-.32,facade,upperTurnY-.10),
    rect("upper-shaft-rear-guard",x-.22,x+.22,
      stair.bottomZ-.035,stair.bottomZ+.035,
      firstFloor+storeyHeight-.12),
    // Each front turnaround has a connected cross-rail above the void.
    ...Array.from({length:totalFloors-1},(_,floor)=>{
      const landingY=firstFloor+floor*storeyHeight+stair.halfRise;
      return rect("window-side-guard-"+(floor+1),
        x-.22,x+.22,stair.turnZ-.09,stair.turnZ+.03,
        landingY-.10,landingY+1.02);
    }),
    // Last apartment landing: railing extends from the LEFT wall to
    // the right-hand inner rail, but keeps the arrival on RIGHT open.
    rect("fifth-floor-wall-connected-rail",
      x-stairHalf+.12,x+.18,
      stair.bottomZ-.035,stair.bottomZ+.055,
      firstFloor+4*storeyHeight-.10,firstFloor+4*storeyHeight+1.02),
    // All four radiators are on the real window-facing masonry. Their
    // collision only occupies the corresponding HALF-landing height.
    ...Array.from({length:totalFloors-1},(_,i)=>{
      const halfY=firstFloor+i*storeyHeight+stair.halfRise;
      return rect("radiator-window-"+(i+1),x-.69,x+.69,
        facade-.68,facade-.31,halfY-.06,halfY+.79);
    }),
    rect("heating-riser",x+1.38,x+1.53,
      facade-.70,facade-.33,foyerFloor,firstFloor+
        totalFloors*storeyHeight),
    ...Array.from({length:totalFloors},(_,i)=>{
      const level=firstFloor+i*storeyHeight;
      return rect("electric-meter-cabinet-"+(i+1),
        x-.77,x+.77,stair.backZ+.045,stair.backZ+.30,
        level-.07,level+2.13);
    })
  ];
  // Stage 4.7.8: no exterior pad colliders, including at entrances 2–4.
  // The three inactive entry leaves are still visually closed in the model.
  const door=rect("entrance-1-closed-door",x-.72,x+.72,facade-.28,facade+.14);
  const inside={minX:x-foyerHalf,maxX:x+foyerHalf,
    minZ:insideEnd,maxZ:facade};
  const entry={
    index:0,x,facade,insideEnd,corridorHalf:foyerHalf,
    door,inside,stair,stairHalf,aisleHalf,totalFloors,
    floorHeight,
    buildingObstacles:house,
    apartment:null,firstFloorPlan:null,
    installFirstFloor(plan){
      if(this.firstFloorPlan)throw Error("First floor already installed");
      if(!plan||plan.floor!==1||Math.abs(plan.y-firstFloor)>.0001)
        throw Error("Invalid first-floor plan");
      // Physically replace only ground-residential-height slices of
      // formerly solid wing colliders; all other elevations remain sealed.
      for(const side of [-1,1]){
        const name=side===-1?"stair-left":"stair-right";
        const i=this.buildingObstacles.findIndex(o=>o.name===name);
        if(i<0)throw Error("Missing whole-wing collider "+name);
        const old=this.buildingObstacles.splice(i,1)[0];
        const wing=plan.wings.find(w=>w.side===side);
        if(!wing)throw Error("Missing floor-plan wing");
        this.buildingObstacles.push(
          {...old,name:name+"-below",maxY:plan.y-.10},
          {...old,name:name+"-above",minY:plan.ceilingY+.01}
        );
        const low=side<0?old.minX:wing.maxX,
          high=side<0?wing.minX:old.maxX;
        if(high>low)
          this.buildingObstacles.push(rect(name+"-unbuilt-neighbour",
            low,high,-halfZ,facade,plan.y-.10,plan.ceilingY+.01));
        // End walls stay part of original house; openings only for
        // existing window geometry, NOT at random wall segments.
        for(const z of [rearFacade,facade])
          this.buildingObstacles.push(rect(name+"-facade-edge",
            wing.minX,wing.maxX,z-.12,z+.12,plan.y-.10,plan.ceilingY+.01));
        this.buildingObstacles.push(rect(name+"-outer-edge",
          side<0?wing.minX-.12:wing.maxX-.02,
          side<0?wing.minX+.02:wing.maxX+.12,
          -halfZ,facade,plan.y-.10,plan.ceilingY+.01));
      }
      // Open only the first residential floor of the formerly blocked
      // rear shaft; keep all other floors and the stair-back wall solid.
      const rearIndex=this.buildingObstacles.findIndex(o=>o.name==="stairwell-back");
      if(rearIndex<0)throw Error("Missing shaft-rear collision volume");
      const rear=this.buildingObstacles.splice(rearIndex,1)[0];
      this.buildingObstacles.push(
        {...rear,name:"stairwell-back-below",maxY:plan.y-.10},
        {...rear,name:"stairwell-back-above",minY:plan.ceilingY+.01},
        rect("stairwell-back-ground-divider",x-stairHalf,x+stairHalf,
          stair.backZ-.075,stair.backZ+.075,plan.y-.10,plan.ceilingY+.01)
      );
      this.buildingObstacles.push(...plan.obstacles);
      this.firstFloorPlan=plan;
    },
    installApartment(apartment){
      if(this.apartment)throw Error("Apartment already installed");
      if(!apartment||apartment.number!==17||Math.abs(apartment.floorY-floorHeight(4))>.0001)
        throw Error("Only original fifth-floor flat 17 may be activated");
      // The earlier collision plan treated ALL apartment space as solid
      // at ALL elevations. Split the LEFT slab vertically, allowing only
      // this fifth-floor flat. Exterior, other flats and 1–4F stay solid.
      // The 1F layout may have split the former whole-wing blocker
      // already. Preserve its lower y-bound when opening 5F; otherwise
      // the old lower-floor solid masonry would reappear over the new 1F.
      const targetName=this.firstFloorPlan?"stair-left-above":"stair-left";
      const old=this.buildingObstacles.findIndex(b=>b.name===targetName);
      if(old<0)throw Error("Cannot find left wing upper blocker");
      const blocker=this.buildingObstacles.splice(old,1)[0];
      this.buildingObstacles.push(
        rect("stair-left-below-apartment",-halfX,x-stairHalf,
          -halfZ,facade,blocker.minY??-Infinity,apartment.floorY-.10),
        rect("stair-left-above-apartment",-halfX,x-stairHalf,
          -halfZ,facade,apartment.ceilingY+.01,Infinity)
      );
      this.buildingObstacles.push(...apartment.obstacles);
      this.apartment=apartment;
    },
    // Same continuous world coordinate from sidewalk through the first
    // porch and threshold into the indoor vestibule; no teleport/scene swap.
    // Return the walkable surface CLOSEST to the player's current
    // world-space Y. The same X/Z staircase repeats at four distinct
    // storeys: a naive 2D height map would wrongly teleport to floor 1.
    groundHeight(px,z,currentY=0){
      if(this.firstFloorPlan?.contains(px,z,currentY))
        return this.firstFloorPlan.y;
      // Apartment 17 uses exactly the fifth-floor landing elevation.
      // The height solver must check its space BEFORE rejecting X outside
      // the stairwell; otherwise the player falls through the room floor.
      if(this.apartment?.contains(px,z,currentY))
        return this.apartment.floorY;
      const upper=currentY>=upperTurnY-.13;
      const width=z<insideEnd||upper?stairHalf:foyerHalf;
      if(Math.abs(px-x)>width-.03)return 0;
      if(z>=10.65)return 0;
      // Street, threshold and foyer share Y=0; no hidden height ramp.
      if(z>=facade)return FOYER_GROUND;
      if(z>=insideEnd&&!upper)return foyerFloor;
      const candidates=[];
      // This is a genuinely walkable 12-step centre staircase, NOT a
      // level slab extending into the apartment landing.
      if(Math.abs(px-stair.entryX)<stair.entryWidth/2-.04&&
         z>=stair.bottomZ&&z<=stair.entryStartZ&&
         currentY<firstFloor+.15){
        const progress=clamp((stair.entryStartZ-z)/
          (stair.entryStartZ-stair.bottomZ),0,1);
        const n=Math.min(stair.entrySteps,
          Math.floor(progress*stair.entrySteps)+1);
        candidates.push(foyerFloor+n/stair.entrySteps*stair.entryRise);
      }
      for(let floor=0;floor<totalFloors;floor++){
        const base=floorHeight(floor);
        if(z<=stair.bottomZ)candidates.push(base);
        if(floor===totalFloors-1)continue;
        if(z>=stair.turnZ&&z<=stair.frontZ){
          candidates.push(base+stair.halfRise);
        }else if(z>stair.bottomZ&&z<stair.turnZ){
          const progress=clamp((z-stair.bottomZ)/
            (stair.turnZ-stair.bottomZ),0,1);
          const up=Math.min(stair.steps,Math.floor(progress*stair.steps)+1);
          const down=Math.min(stair.steps,Math.floor((1-progress)*stair.steps)+1);
          if(px<x-aisleHalf)candidates.push(
            base+up/stair.steps*stair.halfRise);
          if(px>x+aisleHalf)candidates.push(
            base+stair.halfRise+down/stair.steps*stair.halfRise);
        }
      }
      if(!candidates.length)return null; // open shaft has no physical floor
      return candidates.reduce((best,y)=>
        Math.abs(y-currentY)<Math.abs(best-currentY)?y:best);
    },
    isInside(px,z,y=0){
      if(this.firstFloorPlan?.contains(px,z,y))return true;
      if(this.apartment?.contains(px,z,y))return true;
      const width=z<insideEnd||y>=upperTurnY-.13?stairHalf:foyerHalf;
      return Math.abs(px-x)<width&&z>=stair.backZ&&z<facade-.07;
    },
    canInteract(px,z){
      return Math.hypot(px-x,z-(facade-.12))<2.35;
    },
    zone(px,z,y=0){
      if(this.firstFloorPlan?.contains(px,z,y))
        return "Квартиры первого этажа · план 1–4";
      if(this.apartment?.contains(px,z,y))
        return "Квартира №17 · "+this.apartment.zone(px,z);
      if(!this.isInside(px,z,y))return "street";
      if(z>=insideEnd)return y>=upperTurnY-.13?
        "межэтажный разворот":"просторный тамбур";
      if(Math.abs(px-stair.entryX)<stair.entryWidth/2-.04&&
        z>stair.bottomZ&&y<=firstFloor+.15)return "входная лестница";
      const f=nearestFloor(y)+1;
      if(z<=stair.bottomZ)
        return "площадка "+f+"-го этажа · квартиры "+
          ((f-1)*4+1)+"–"+(f*4);
      if(z>=stair.turnZ)return "межэтажный разворот";
      if(Math.abs(px-x)<aisleHalf)return "лестничный проём";
      return px<x?"первый лестничный марш":"второй лестничный марш";

    }
  };
  return entry;
}

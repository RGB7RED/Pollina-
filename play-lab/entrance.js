// MINI CITY 4.5.1 — same-world playable entrance 1, no scene transition.
// Collision geometry matches the first REAL facade opening and existing porch.
export function planPlayableEntrance(building,pads){
  if(!building||!pads?.length)throw Error("Entrance requires real building and porch");
  const p=pads[0],x=p.x,facade=building.width/2;
  const halfX=building.length/2,halfZ=facade;
  const doorHalf=.81,insideEnd=3.35,foyerHalf=1.74;
  // U-stair follows the true stair mesh in building-lab/building.js.
  // The first floor and every complete-floor landing are at the BACK,
  // opposite the former door wall. Ascend forward on LEFT, then return
  // toward the BACK along RIGHT to the following complete-floor landing.
  const foyerFloor=.70,firstFloor=2.09,storeyHeight=2.42;
  const stair={bottomZ:-1.58,turnZ:2.05,backZ:-3.38,
    frontZ:facade-.44,firstFrontZ:facade-.44,
    entryStartZ:3.35,entryRise:1.39,halfRise:storeyHeight/2,
    steps:12,entrySteps:12,firstFloor,foyerFloor,storeyHeight,
    firstX:x-.97,secondX:x+.97,entryX:x+.97,
    entryWidth:1.58,flightWidth:1.58};
  const stairHalf=1.84,aisleHalf=.16,upperTurnY=firstFloor+stair.halfRise;
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
    rect("left-inner-flight-guard",x-.22,x-.14,
      stair.bottomZ+.10,stair.turnZ-.10,firstFloor),
    rect("right-inner-flight-guard",x+.14,x+.22,
      stair.bottomZ+.10,stair.turnZ-.10,firstFloor),
    rect("entry-flight-inner-guard",x+.14,x+.22,
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
      firstFloor+4*storeyHeight-.10,firstFloor+4*storeyHeight+1.02)
  ];
  // Preserve blocking porch geometry for entrances 2–4. The first porch
  // is walkable only through the central doorway approach.
  const porch=[];
  pads.forEach((pad,i)=>{
    const l=pad.x-pad.width/2,r=pad.x+pad.width/2;
    const front=pad.centreZ-pad.depth/2,back=pad.centreZ+pad.depth/2;
    if(i===0){
      porch.push(rect("entry-1-left-pad",l,x-doorHalf,front,back));
      porch.push(rect("entry-1-right-pad",x+doorHalf,r,front,back));
    }else porch.push(rect("entry-"+(i+1),l,r,front,back));
  });
  const door=rect("entrance-1-closed-door",x-.72,x+.72,facade-.28,facade+.14);
  const inside={minX:x-foyerHalf,maxX:x+foyerHalf,
    minZ:insideEnd,maxZ:facade};
  const entry={
    index:0,x,facade,insideEnd,corridorHalf:foyerHalf,
    door,inside,stair,stairHalf,aisleHalf,totalFloors,
    floorHeight,
    buildingObstacles:[...house,...porch],
    // Same continuous world coordinate from sidewalk through the first
    // porch and threshold into the indoor vestibule; no teleport/scene swap.
    // Return the walkable surface CLOSEST to the player's current
    // world-space Y. The same X/Z staircase repeats at four distinct
    // storeys: a naive 2D height map would wrongly teleport to floor 1.
    groundHeight(px,z,currentY=0){
      const upper=currentY>=upperTurnY-.13;
      const width=z<insideEnd||upper?stairHalf:foyerHalf;
      if(Math.abs(px-x)>width-.03)return 0;
      if(z>=10.65)return 0;
      if(z>=9.42)return (10.65-z)/(10.65-9.42)*.50;
      if(z>=7.10)return .50;
      if(z>=6.23)return .50+(7.10-z)/(7.10-6.23)*.20;
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
      const width=z<insideEnd||y>=upperTurnY-.13?stairHalf:foyerHalf;
      return Math.abs(px-x)<width&&z>=stair.backZ&&z<facade-.07;
    },
    canInteract(px,z){
      return Math.hypot(px-x,z-(facade-.12))<2.35;
    },
    zone(px,z,y=0){
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

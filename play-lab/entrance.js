// MINI CITY 4.5.1 — same-world playable entrance 1, no scene transition.
// Collision geometry matches the first REAL facade opening and existing porch.
export function planPlayableEntrance(building,pads){
  if(!building||!pads?.length)throw Error("Entrance requires real building and porch");
  const p=pads[0],x=p.x,facade=building.width/2;
  const halfX=building.length/2,halfZ=facade;
  const corridorHalf=.81,insideEnd=3.35;
  // U-stair follows the true stair mesh in building-lab/building.js.
  // The first floor and every complete-floor landing are at the BACK,
  // opposite the former door wall. Ascend forward on LEFT, then return
  // toward the BACK along RIGHT to the following complete-floor landing.
  const stair={bottomZ:-1.58,turnZ:2.05,backZ:-3.38,
    firstFrontZ:3.28,frontZ:facade-.44,
    halfRise:building.floorHeight/2,steps:12};
  const stairHalf=2.08,aisleHalf=.64;
  if(p.width<2||insideEnd>=facade||corridorHalf>=p.width/2)
    throw Error("Entrance dimensions invalid");
  const rect=(name,minX,maxX,minZ,maxZ,minY=-Infinity,maxY=Infinity)=>
    ({name,minX,maxX,minZ,maxZ,minY,maxY});
  const totalFloors=building.floors,storeyHeight=building.floorHeight;
  const firstFloor=.70,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const nearestFloor=currentY=>clamp(
    Math.round((currentY-firstFloor)/storeyHeight),0,totalFloors-1);
  const floorHeight=i=>firstFloor+i*storeyHeight;
  // Full-width staircase with a real centre aisle (floor landing ->
  // front half-landing) and side flights. No phantom rooms through walls.
  const house=[
    rect("entry-front-left",-halfX,x-corridorHalf,insideEnd,halfZ,
      -Infinity,firstFloor+storeyHeight),
    rect("entry-front-right",x+corridorHalf,halfX,insideEnd,halfZ,
      -Infinity,firstFloor+storeyHeight),
    rect("stair-left",-halfX,x-stairHalf,-halfZ,insideEnd),
    rect("stair-right",x+stairHalf,halfX,-halfZ,insideEnd),
    rect("stairwell-back",x-stairHalf,x+stairHalf,-halfZ,stair.backZ),
    // Low/wall dividers along INNER rails: cross from aisle to flights
    // at landing ends, not through elevated risers in the middle.
    rect("first-flight-rail-base",x-aisleHalf-.10,x-aisleHalf-.065,
      stair.bottomZ+.44,stair.turnZ-.38),
    rect("second-flight-rail-base",x+aisleHalf+.065,x+aisleHalf+.10,
      stair.bottomZ+.44,stair.turnZ-.38),
    // A ground-floor foyer and the wider U-stair occupy DIFFERENT
    // height bands: never block upper landings with 2D vestibule walls.
    rect("upper-front-left",-halfX,x-stairHalf,insideEnd,halfZ,
      firstFloor+storeyHeight),
    rect("upper-front-right",x+stairHalf,halfX,insideEnd,halfZ,
      firstFloor+storeyHeight),
    rect("existing-exterior-window-wall",x-stairHalf,x+stairHalf,
      facade-.32,facade,firstFloor+storeyHeight),
    // First half turn stops behind the foyer to preserve real headroom.
    rect("first-turn-guard",x-stairHalf,x+stairHalf,
      stair.firstFrontZ-.035,stair.firstFrontZ+.035,
      firstFloor+stair.halfRise-.10,firstFloor+storeyHeight)
  ];
  // Preserve blocking porch geometry for entrances 2–4. The first porch
  // is walkable only through the central doorway approach.
  const porch=[];
  pads.forEach((pad,i)=>{
    const l=pad.x-pad.width/2,r=pad.x+pad.width/2;
    const front=pad.centreZ-pad.depth/2,back=pad.centreZ+pad.depth/2;
    if(i===0){
      porch.push(rect("entry-1-left-pad",l,x-corridorHalf,front,back));
      porch.push(rect("entry-1-right-pad",x+corridorHalf,r,front,back));
    }else porch.push(rect("entry-"+(i+1),l,r,front,back));
  });
  const door=rect("entrance-1-closed-door",x-.72,x+.72,facade-.28,facade+.14);
  // Second door separates the cold street-side vestibule from the warm
  // first-floor landing. Its geometry and Z coordinate are IDENTICAL to
  // the actual pivot created in building-lab/building.js.
  const innerDoorZ=4.82;
  const innerDoor=rect("entrance-1-inner-closed-door",x-.695,x+.695,
    innerDoorZ-.13,innerDoorZ+.13);
  const inside={minX:x-corridorHalf,maxX:x+corridorHalf,
    minZ:insideEnd,maxZ:facade};
  const entry={
    index:0,x,facade,insideEnd,corridorHalf,door,innerDoor,
    innerDoorZ,inside,stair,stairHalf,aisleHalf,totalFloors,
    floorHeight,
    buildingObstacles:[...house,...porch],
    // Same continuous world coordinate from sidewalk through the first
    // porch and threshold into the indoor vestibule; no teleport/scene swap.
    // Return the walkable surface CLOSEST to the player's current
    // world-space Y. The same X/Z staircase repeats at four distinct
    // storeys: a naive 2D height map would wrongly teleport to floor 1.
    groundHeight(px,z,currentY=0){
      const upper=currentY>=firstFloor+storeyHeight-.01;
      const width=z<insideEnd||upper?stairHalf:corridorHalf;
      if(Math.abs(px-x)>width-.03)return 0;
      if(z>=10.65)return 0;
      if(z>=9.42)return (10.65-z)/(10.65-9.42)*.50;
      if(z>=7.10)return .50;
      if(z>=6.23)return .50+(7.10-z)/(7.10-6.23)*.20;
      if(z>=insideEnd){
        if(!upper)return firstFloor;
        // Higher return slabs are at half-storey levels, not at
        // apartment-floor height or at the ground-floor foyer height.
        const heights=[];
        if(z<=stair.frontZ)for(let floor=1;floor<totalFloors-1;floor++)
          heights.push(floorHeight(floor)+stair.halfRise);
        if(!heights.length)return firstFloor;
        return heights.reduce((best,y)=>
          Math.abs(y-currentY)<Math.abs(best-currentY)?y:best);
      }
      const candidates=[];
      for(let floor=0;floor<totalFloors;floor++){
        const base=floorHeight(floor);
        // The centre walk from entrance to the rear floor-level
        // apartment landing remains flat at each floor's OWN Y.
        if(Math.abs(px-x)<aisleHalf+.12)
          candidates.push(base);
        if(z<=stair.bottomZ)candidates.push(base);
        if(floor>=totalFloors-1)continue;
        if(z>=stair.turnZ&&z<=(floor===0?stair.firstFrontZ:stair.frontZ)){
          // Genuine 180-degree turnaround at half the storey height.
          candidates.push(base+stair.halfRise);
        }else if(z>stair.bottomZ&&z<stair.turnZ){
          const ratio=clamp((z-stair.bottomZ)/
            (stair.turnZ-stair.bottomZ),0,1);
          const up=Math.min(stair.steps,
            Math.floor(ratio*stair.steps)+1);
          const down=Math.min(stair.steps,
            Math.floor((1-ratio)*stair.steps)+1);
          // LEFT: rises towards the facade; RIGHT: rises away from it.
          if(px<x-aisleHalf)candidates.push(
            base+up/stair.steps*stair.halfRise);
          if(px>x+aisleHalf)candidates.push(
            base+stair.halfRise+down/stair.steps*stair.halfRise);
        }
      }
      if(!candidates.length)return firstFloor;
      return candidates.reduce((best,y)=>
        Math.abs(y-currentY)<Math.abs(best-currentY)?y:best);
    },
    isInside(px,z,y=0){
      const width=z<insideEnd||y>=firstFloor+storeyHeight?stairHalf:corridorHalf;
      return Math.abs(px-x)<width&&z>=stair.backZ&&z<facade-.07;
    },
    canInteract(px,z){
      return Math.hypot(px-x,z-(facade-.12))<2.35;
    },
    canInteractInner(px,z){
      return Math.abs(px-x)<.95&&Math.abs(z-innerDoorZ)<1.15;
    },
    zone(px,z,y=0){
      if(!this.isInside(px,z,y))return "street";
      if(z>innerDoorZ)return y>=firstFloor+storeyHeight?
        "межэтажный разворот":"тамбур";
      if(z>=insideEnd)return y>=firstFloor+storeyHeight?
        "межэтажный разворот":"площадка 1-го этажа";
      const f=nearestFloor(y)+1;
      if(z<=stair.bottomZ)
        return "площадка "+f+"-го этажа · квартиры "+
          ((f-1)*4+1)+"–"+(f*4);
      if(z>=stair.turnZ)return "межэтажный разворот";
      if(Math.abs(px-x)<aisleHalf)return "проход к лестнице";
      return px<x?"первый лестничный марш":"второй лестничный марш";

    }
  };
  return entry;
}

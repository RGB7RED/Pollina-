// MINI CITY 4.5.1 — same-world playable entrance 1, no scene transition.
// Collision geometry matches the first REAL facade opening and existing porch.
export function planPlayableEntrance(building,pads){
  if(!building||!pads?.length)throw Error("Entrance requires real building and porch");
  const p=pads[0],x=p.x,facade=building.width/2;
  const halfX=building.length/2,halfZ=facade;
  const corridorHalf=.81,insideEnd=3.35;
  // U-stair follows the true stair mesh in building-lab/building.js.
  const stair={bottomZ:3.00,turnZ:-.74,backZ:-1.63,
    halfRise:building.floorHeight/2,steps:12};
  if(p.width<2||insideEnd>=facade||corridorHalf>=p.width/2)
    throw Error("Entrance dimensions invalid");
  const rect=(name,minX,maxX,minZ,maxZ)=>({name,minX,maxX,minZ,maxZ});
  const stairHalf=1.44;
  const corridor={minZ:2.02,maxZ:3.35,startX:x+1.39,endX:x+6.40};
  const totalFloors=building.floors,storeyHeight=building.floorHeight;
  const firstFloor=.70,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const nearestFloor=currentY=>clamp(
    Math.round((currentY-firstFloor)/storeyHeight),0,totalFloors-1);
  const floorHeight=i=>firstFloor+i*storeyHeight;
  // The little street vestibule is 1.62m wide; the stairwell widens to
  // 2.88m to permit TWO fully walkable flights and an actual 180° turn.
  const house=[
    rect("entry-front-left",-halfX,x-corridorHalf,insideEnd,halfZ),
    rect("entry-front-right",x+corridorHalf,halfX,insideEnd,halfZ),
    rect("stair-left",-halfX,x-stairHalf,-halfZ,insideEnd),
    rect("stair-right-rear",x+stairHalf,halfX,-halfZ,corridor.minZ),
    rect("apartment-corridor-end",corridor.endX,halfX,corridor.minZ,insideEnd),
    rect("stairwell-back",x-stairHalf,x+stairHalf,-halfZ,stair.backZ),
    rect("stair-center-divider",x-.02,x+.02,stair.turnZ+.12,
      stair.bottomZ-.65)
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
    innerDoorZ,inside,stair,stairHalf,corridor,totalFloors,
    floorHeight,
    buildingObstacles:[...house,...porch],
    // Same continuous world coordinate from sidewalk through the first
    // porch and threshold into the indoor vestibule; no teleport/scene swap.
    // Return the walkable surface CLOSEST to the player's current
    // world-space Y. The same X/Z staircase repeats at four distinct
    // storeys: a naive 2D height map would wrongly teleport to floor 1.
    groundHeight(px,z,currentY=0){
      const inHall=px>=corridor.startX-.10&&
        px<=corridor.endX+.06&&
        z>=corridor.minZ&&z<=corridor.maxZ;
      if(inHall)return floorHeight(nearestFloor(currentY));
      const stairWidth=z<insideEnd?stairHalf:corridorHalf;
      if(Math.abs(px-x)>stairWidth-.03)return 0;
      if(z>=10.65)return 0;
      if(z>=9.42)return (10.65-z)/(10.65-9.42)*.50;
      if(z>=7.10)return .50;
      if(z>=6.23)return .50+(7.10-z)/(7.10-6.23)*.20;
      // In the entrance vestibule levels above 1 do not exist;
      // at the head of the stairs, however, each actual floor has
      // a landing from which the next staircase can be approached.
      if(z>=insideEnd)return firstFloor;
      if(z>=stair.bottomZ)return floorHeight(nearestFloor(currentY));
      if(z>=stair.backZ){
        const ratio=clamp((stair.bottomZ-z)/(stair.bottomZ-stair.turnZ),0,1);
        const index=Math.min(stair.steps,Math.floor(ratio*stair.steps)+1);
        const downSteps=Math.min(stair.steps,Math.floor(ratio*stair.steps));
        const candidate=[];
        for(let floor=0;floor<totalFloors-1;floor++){
          const base=floorHeight(floor);
          candidate.push(base+ (z<=stair.turnZ ? stair.halfRise :
            px<x ? index/stair.steps*stair.halfRise :
              2*stair.halfRise-downSteps/stair.steps*stair.halfRise));
        }
        // A small front landing directly connects each floor to its
        // apartment corridor. At floor 1 this also makes the four flats
        // reachable without forcing the player up to floor 2 first.
        if(px>=x-.10&&z>=stair.bottomZ-.40)
          for(let floor=0;floor<totalFloors;floor++)
            candidate.push(floorHeight(floor));
        // The nearest reachable elevation is selected instead of
        // assuming a floor from X/Z or silently snapping downward.
        return candidate.reduce((best,y)=>
          Math.abs(y-currentY)<Math.abs(best-currentY)?y:best);
      }
      return 0;
    },
    isInside(px,z){
      if(px>=corridor.startX-.10&&px<corridor.endX&&
         z>=corridor.minZ&&z<=corridor.maxZ)return true;
      const width=z<insideEnd?stairHalf:corridorHalf;
      return Math.abs(px-x)<width&&z>=stair.backZ&&z<facade-.07;
    },
    canInteract(px,z){
      return Math.hypot(px-x,z-(facade-.12))<2.35;
    },
    canInteractInner(px,z){
      return Math.abs(px-x)<.95&&Math.abs(z-innerDoorZ)<1.15;
    },
    zone(px,z,y=0){
      if(!this.isInside(px,z))return "street";
      if(z>innerDoorZ)return "тамбур";
      if(z>=insideEnd)return "площадка 1-го этажа";
      const floor=nearestFloor(y)+1;
      if(px>=corridor.startX-.10)
        return "коридор "+floor+"-го этажа · квартиры "+
          ((floor-1)*4+1)+"–"+(floor*4);
      if(z>=stair.bottomZ)return "площадка "+floor+"-го этажа";
      if(z<=stair.turnZ)return "межэтажная площадка";
      return px<x?"марш вверх":"марш вниз";
    }
  };
  return entry;
}

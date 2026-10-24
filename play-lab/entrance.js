// MINI CITY 4.5.1 — same-world playable entrance 1, no scene transition.
// Collision geometry matches the first REAL facade opening and existing porch.
export function planPlayableEntrance(building,pads){
  if(!building||!pads?.length)throw Error("Entrance requires real building and porch");
  const p=pads[0],x=p.x,facade=building.width/2;
  const halfX=building.length/2,halfZ=facade;
  const corridorHalf=.81,insideEnd=3.35;
  if(p.width<2||insideEnd>=facade||corridorHalf>=p.width/2)
    throw Error("Entrance dimensions invalid");
  const rect=(name,minX,maxX,minZ,maxZ)=>({name,minX,maxX,minZ,maxZ});
  const house=[
    rect("house-left",-halfX,x-corridorHalf,-halfZ,halfZ),
    rect("house-right",x+corridorHalf,halfX,-halfZ,halfZ),
    rect("vestibule-rear",x-corridorHalf,x+corridorHalf,-halfZ,insideEnd)
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
    innerDoorZ,inside,
    buildingObstacles:[...house,...porch],
    // Same continuous world coordinate from sidewalk through the first
    // porch and threshold into the indoor vestibule; no teleport/scene swap.
    groundHeight(px,z){
      if(Math.abs(px-x)>corridorHalf-.03)return 0;
      if(z>=10.65)return 0;
      if(z>=9.42)return (10.65-z)/(10.65-9.42)*.50;
      if(z>=7.10)return .50;
      if(z>=6.23)return .50+(7.10-z)/(7.10-6.23)*.20;
      if(z>=insideEnd)return .70;
      return 0;
    },
    isInside(px,z){
      return Math.abs(px-x)<corridorHalf&&z>=insideEnd&&z<facade-.07;
    },
    canInteract(px,z){
      return Math.hypot(px-x,z-(facade-.12))<2.35;
    },
    canInteractInner(px,z){
      return Math.abs(px-x)<.95&&Math.abs(z-innerDoorZ)<1.15;
    },
    zone(px,z){
      if(!this.isInside(px,z))return "street";
      return z>innerDoorZ?"тамбур":"площадка 1-го этажа";
    }
  };
  return entry;
}

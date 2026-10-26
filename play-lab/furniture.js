// MINI CITY 5.0 — deterministic interior layout anchored to the ACTUAL 4.7.8 rooms.
import {INTERIOR_ASSETS,INTERIOR_ASSET_BY_ID,
  buildInteriorInstances} from "../models/interior-assets.js";
const SOLIDS=new Set([
  "sofa","armchair","single_bed","double_bed","wardrobe","dresser",
  "bedside_table","coffee_table","writing_desk","chair","tv_stand",
  "bookcase","sofa_bed","kitchen_base","countertop","kitchen_sink",
  "stove","fridge","dining_table","kitchen_chair","toilet","bathtub",
  "washbasin","washing_machine","bathroom_cabinet","shoe_rack",
  "slim_cabinet","ottoman"
]);
function assignedUse(flat,name){
  if(!name.startsWith("Жилая"))return name;
  if(flat===1)return {"Жилая комната 1":"Детская","Жилая комната 2":"Спальня",
    "Жилая комната 3":"Гостиная"}[name];
  if(flat===2)return name.endsWith("2")?"Спальня":"Гостиная";
  if(flat===3)return name.endsWith("1")?"Спальня":"Гостиная";
  return "Гостиная-спальня";
}
const ROLES=Object.freeze({
  "Детская":[
    ["single_bed",.25,.31],["writing_desk",.73,.75],["chair",.72,.52],
    ["wardrobe",.17,.86,Math.PI/2],["wall_shelf",.73,.20],["books",.72,.18]],
  "Спальня":[
    ["double_bed",.49,.37],["bedside_table",.18,.80],
    ["wardrobe",.82,.84],["dresser",.13,.87,Math.PI/2],["table_lamp",.18,.81],
    ["painting",.55,.84],["rug",.54,.61]],
  "Гостиная":[
    ["sofa",.25,.25],["armchair",.77,.23],["coffee_table",.48,.53],
    ["tv_stand",.69,.81],["television",.69,.81],
    ["bookcase",.13,.83],["potted_plant",.87,.83],
    ["rug",.48,.53],["clock",.45,.92],["painting",.84,.82]],
  "Гостиная-спальня":[
    ["sofa_bed",.22,.25],["coffee_table",.42,.52],
    ["tv_stand",.28,.82],["television",.28,.82],
    ["writing_desk",.77,.25],["chair",.77,.51],
    ["wardrobe",.91,.80],["potted_plant",.08,.78],["rug",.48,.50]],
  "Кухня":[
    ["kitchen_base",.09,.25],["kitchen_sink",.23,.25],
    ["countertop",.38,.25],["stove",.52,.25],
    ["fridge",.68,.25],["dining_table",.86,.71],
    ["kitchen_chair",.86,.39],["kitchen_wall",.28,.23],
    ["kettle",.40,.25],["trash_bin",.64,.74],["dishes",.35,.25]],
  "Санузел":[
    ["bathtub",.17,.25],["toilet",.43,.25],
    ["washbasin",.66,.25],["washing_machine",.87,.24],
    ["mixer_tap",.67,.24],["bathroom_mirror",.66,.19],
    ["bathroom_cabinet",.80,.78],["towel_rail",.13,.81],
    ["towel_holder",.55,.81]],
  "Прихожая":[
    ["shoe_rack",.15,.48,Math.PI/2],
    ["coat_hanger",.89,.25,Math.PI/2],
    ["slim_cabinet",.85,.78,Math.PI/2],
    ["ottoman",.16,.78,Math.PI/2],
    ["light_switch",.93,.55,Math.PI/2]],
  "Коридор":[
    ["bookcase",.11,.70],["potted_plant",.88,.71],
    ["rug",.52,.50],["wall_sconce",.46,.12],
    ["floor_sign",.86,.12]]
});
// Additional types are intentionally wall/ceiling mounted and have no
// player-obstacle footprint; their rendering is still the shared real model.
const MOUNTED=new Set(["television","wall_shelf","kitchen_wall","kettle",
  "mixer_tap","bathroom_mirror","towel_rail","towel_holder",
  "coat_hanger","light_switch","curtains","ceiling_chandelier",
  "table_lamp","wall_sconce","painting","clock","books","dishes",
  "floor_sign","doorbell","interior_door"]);
const RUGS=new Set(["rug"]);
const foot=(s,yaw)=>Math.abs(Math.sin(yaw))>.7?[s.d,s.w]:[s.w,s.d];
// Furniture stays in one room, not through apartment partitions.
// Every placement is deterministic to support per-apartment seed variation later.
export function planFirstFloorFurniture(plan){
  if(!plan||plan.floor!==1||plan.doors?.length!==4)
    throw Error("Stage 5.0 expects the real first-floor prototype");
  const placements=[],bounds=[],countByFlat={1:0,2:0,3:0,4:0};
  function put(room,id,u,v,yaw=0,{mounted=false,ignoreWindow=false}={}){
    const spec=INTERIOR_ASSET_BY_ID[id];
    if(!spec)throw Error("Unregistered furnishing "+id);
    const sizeX=room.maxX-room.minX,sizeZ=room.maxZ-room.minZ;
    const [fw,fd]=foot(spec,yaw);
    // Door/window margins: actual object bounds always fit inside the room.
    const edge=.075;
    const safeX=Math.max(fw/2+edge,Math.min(sizeX-fw/2-edge,sizeX*u));
    const safeZ=Math.max(fd/2+edge,Math.min(sizeZ-fd/2-edge,sizeZ*v));
    if(sizeX<fw+2*edge||sizeZ<fd+2*edge)
      throw Error("Furnishing wider than "+room.flat+" "+room.name+" "+id);
    let x=room.minX+safeX,z=room.minZ+safeZ;
    // Search nearby shelf/wall locations to keep actual passages clear.
    // Never silently resize rooms, move doors or push furniture into glass.
    if(SOLIDS.has(id)&&!mounted&&!MOUNTED.has(id)){
      const openings=plan.openings.filter(o=>
        o.x>=room.minX-.10&&o.x<=room.maxX+.10&&
        o.z>=room.minZ-.10&&o.z<=room.maxZ+.10);
      const preferred={x,z};
      const valid=(px,pz)=>{
        const a={minX:px-fw/2,maxX:px+fw/2,minZ:pz-fd/2,maxZ:pz+fd/2};
        if(a.minX<room.minX+.06||a.maxX>room.maxX-.06||
          a.minZ<room.minZ+.06||a.maxZ>room.maxZ-.06)return false;
        if(bounds.some(b=>b.flat===room.flat&&b.room===room.name&&
          a.minX<b.maxX+.08&&a.maxX>b.minX-.08&&
          a.minZ<b.maxZ+.08&&a.maxZ>b.minZ-.08))return false;
        return !openings.some(d=>{
          const dx=Math.max(a.minX-d.x,d.x-a.maxX,0);
          const dz=Math.max(a.minZ-d.z,d.z-a.maxZ,0);
          return Math.hypot(dx,dz)<.32;
        });
      };
      if(!valid(x,z)){
        let found=null,score=Infinity;
        for(let ix=-18;ix<=18;ix++)for(let iz=-18;iz<=18;iz++){
          const xx=x+ix*.13,zz=z+iz*.13;
          if(!valid(xx,zz))continue;
          const dist=(xx-preferred.x)**2+(zz-preferred.z)**2;
          if(dist<score){found={x:xx,z:zz};score=dist;}
        }
        if(found){x=found.x;z=found.z;}
        else throw Error("Cannot fit "+id+" safely in flat "+
          room.flat+", room "+room.name);
      }
    }
    const record={id,x,z,y:plan.y,yaw,flat:room.flat,room:room.name,
      role:assignedUse(room.flat,room.name),modelNumber:spec.ordinal,
      mounted:mounted||MOUNTED.has(id)||RUGS.has(id),w:fw,d:fd};
    placements.push(record);countByFlat[room.flat]++;
    if(SOLIDS.has(id)&&!record.mounted)bounds.push({...record,
      name:"furniture-"+room.flat+"-"+id,
      minX:x-fw/2,maxX:x+fw/2,minZ:z-fd/2,maxZ:z+fd/2,
      minY:plan.y,maxY:plan.y+Math.max(.25,spec.h)});
    return record;
  }
  for(const room of plan.rooms){
    const role=assignedUse(room.flat,room.name);
    const recipe=ROLES[role];
    if(!recipe)throw Error("No furnishing recipe for "+role);
    for(const [id,u,v,angle=0] of recipe)put(room,id,u,v,angle);
    // Wall-mounted decorations must not block actual facade windows.
    if(role.startsWith("Гостиная")||role==="Спальня"||role==="Детская"){
      put(room,"curtains",.55,.91);
      put(room,"ceiling_chandelier",.50,.49);
    }else if(role==="Кухня"||role==="Санузел"){
      put(room,"ceiling_chandelier",.50,.50);
    }else if(role==="Прихожая"){
      put(room,"wall_sconce",.70,.80);
    }else if(role==="Коридор"){
      put(room,"painting",.65,.83);
    }
  }
  // Open leaves use their own geometry, but don't replace real passable holes
  // or create new physical doors. All 20 inner existing openings preserved.
  const locateRoom=(x,z)=>plan.rooms.find(r=>
    x>=r.minX-.12&&x<=r.maxX+.12&&z>=r.minZ-.12&&z<=r.maxZ+.12);
  for(const opening of plan.openings){
    const near=locateRoom(opening.x,opening.z);
    if(!near)continue;
    const axisZ=opening.axis==="z";
    // Door leaf is visual only, propped along the adjacent wall.
    const room={flat:near.flat,name:near.name,
      minX:opening.x-.48,maxX:opening.x+.48,
      minZ:opening.z-.50,maxZ:opening.z+.50};
    const placed={id:"interior_door",flat:near.flat,room:near.name,
      role:"Проход",x:opening.x+(axisZ?.45:.04),
      z:opening.z+(axisZ?.035:.42),y:plan.y,
      yaw:axisZ?Math.PI/2:0,mounted:true,opening:opening.name,
      w:.83,d:.07};
    placements.push(placed);countByFlat[near.flat]++;
  }
  // The actual four apartment entry doors keep their originals. The compact
  // bells sit nearby as *independent* interior models without collisions.
  for(const door of plan.doors){
    placements.push({id:"doorbell",flat:door.number,room:"Подъезд",
      role:"Звонок",x:door.x+door.side*.20,y:plan.y,z:door.z+.76,
      yaw:Math.PI/2,mounted:true});
    countByFlat[door.number]++;
  }
  // Floor sign belongs to the existing stairwell, not in any apartment.
  placements.push({id:"floor_sign",flat:0,room:"Лестница",
    role:"Первый этаж",x:plan.x,y:plan.y,z:-3.05,yaw:0,mounted:true});
  const countById=Object.fromEntries(INTERIOR_ASSETS.map(a=>[a.id,0]));
  for(const p of placements)countById[p.id]++;
  return {placements,solidBounds:bounds,countById,countByFlat,
    bedrooms:[1,2,3,4].map(n=>plan.roomCount(n)),
    flatCount:4,roomCount:plan.rooms.length,
    source:"real-first-floor-4.7.8"};
}
export function buildFurnishedFirstFloor(THREE,plan){
  const layout=planFirstFloorFurniture(plan);
  const rendered=buildInteriorInstances(THREE,layout.placements,{
    name:"MINI CITY — occupied first-floor apartments 1–4"});
  rendered.root.userData.layout=layout;
  return {...rendered,layout};
}

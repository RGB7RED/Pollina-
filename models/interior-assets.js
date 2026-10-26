// MINI CITY 5.0 — lightweight, original procedural household assets.
// One SOURCE OF TRUTH for both furnished apartments and the isolated catalog.
// Coordinates: +Y up, local origin on the floor, local X/Z are footprint axes.
export const INTERIOR_ASSETS=Object.freeze([
  ["sofa","Диван","interior_furniture",1.80,.78,.90],
  ["armchair","Кресло","interior_furniture",.78,.75,.85],
  ["single_bed","Односпальная кровать","interior_furniture",.92,1.90,.74],
  ["double_bed","Двуспальная кровать","interior_furniture",1.60,2.00,.78],
  ["wardrobe","Шкаф для одежды","interior_furniture",1.15,.55,1.98],
  ["dresser","Комод","interior_furniture",.95,.48,.90],
  ["bedside_table","Прикроватная тумба","interior_furniture",.42,.38,.48],
  ["coffee_table","Журнальный столик","interior_furniture",.82,.46,.42],
  ["writing_desk","Письменный стол","interior_furniture",1.10,.55,.74],
  ["chair","Стул","interior_furniture",.46,.47,.85],
  ["television","Телевизор","interior_furniture",.78,.17,.60],
  ["tv_stand","Тумба под телевизор","interior_furniture",1.03,.40,.54],
  ["bookcase","Книжный шкаф","interior_furniture",.78,.32,1.86],
  ["wall_shelf","Настенная полка","interior_furniture",.76,.22,1.57],
  ["sofa_bed","Диван-кровать","interior_furniture",1.68,.76,.88],
  ["kitchen_base","Кухонный нижний шкаф","kitchen",.75,.52,.84],
  ["kitchen_wall","Кухонный навесной шкаф","kitchen",.72,.31,1.85],
  ["countertop","Кухонная столешница","kitchen",.88,.56,.88],
  ["kitchen_sink","Кухонная мойка","kitchen",.69,.53,.92],
  ["stove","Плита","kitchen",.59,.54,.90],
  ["fridge","Холодильник","kitchen",.60,.59,1.80],
  ["kettle","Чайник","kitchen",.25,.22,.27],
  ["dining_table","Обеденный стол","kitchen",.92,.68,.76],
  ["kitchen_chair","Кухонный стул","kitchen",.42,.43,.82],
  ["trash_bin","Мусорное ведро","kitchen",.26,.27,.44],
  ["toilet","Унитаз","bathroom",.43,.62,.78],
  ["bathtub","Ванна","bathroom",1.53,.72,.67],
  ["washbasin","Умывальник","bathroom",.57,.43,.84],
  ["mixer_tap","Смеситель","bathroom",.22,.16,.96],
  ["washing_machine","Стиральная машина","bathroom",.58,.56,.85],
  ["bathroom_mirror","Зеркало в санузле","bathroom",.55,.075,1.76],
  ["bathroom_cabinet","Шкафчик для ванной","bathroom",.46,.25,1.65],
  ["towel_rail","Полотенцесушитель","bathroom",.46,.16,1.50],
  ["towel_holder","Держатель полотенец","bathroom",.36,.12,1.42],
  ["shoe_rack","Обувница","hallway",.72,.25,.46],
  ["coat_hanger","Настенная вешалка","hallway",.68,.14,1.65],
  ["slim_cabinet","Узкий шкаф","hallway",.56,.28,1.75],
  ["ottoman","Пуфик","hallway",.46,.39,.42],
  ["rug","Ковёр","decor",1.45,1.04,.025],
  ["curtains","Занавески","decor",1.32,.10,2.04],
  ["ceiling_chandelier","Люстра","decor",.64,.62,2.12],
  ["table_lamp","Настольная лампа","decor",.22,.20,.43],
  ["wall_sconce","Настенное бра","decor",.19,.17,1.82],
  ["painting","Картина","decor",.52,.07,1.65],
  ["potted_plant","Комнатное растение","decor",.35,.35,.86],
  ["clock","Настенные часы","decor",.29,.09,1.82],
  ["books","Книги","decor",.36,.22,.27],
  ["dishes","Посуда","decor",.39,.24,.20],
  ["interior_door","Межкомнатная дверь","interior_fixture",.83,.07,2.06],
  ["light_switch","Выключатель","interior_fixture",.09,.035,1.31],
  ["doorbell","Квартирный звонок","interior_fixture",.14,.06,1.66],
  ["floor_sign","Табличка этажа","interior_fixture",.25,.035,1.76]
].map(([id,name,category,w,d,h],i)=>Object.freeze({id,name,category,w,d,h,ordinal:i+1})));
export const INTERIOR_ASSET_BY_ID=Object.freeze(Object.fromEntries(
  INTERIOR_ASSETS.map(a=>[a.id,a])));
export const INTERIOR_PALETTE=Object.freeze({
  wood:0x977553,lightWood:0xc2a782,darkWood:0x554334,
  textile:0x577d78,cushion:0xa8b5a2,fabric:0x8e7780,
  white:0xe0dbcf,cream:0xc6c1ad,metal:0x707b7d,
  dark:0x303b40,glass:0x8aaeb1,accent:0xb18d5b,
  blue:0x6e8b9c,green:0x66896a,red:0xa66859,ceramic:0xf3ece0
});
const fail=id=>{throw Error("Unknown interior asset: "+id);};
export function interiorPieces(id){
  const spec=INTERIOR_ASSET_BY_ID[id]||fail(id);
  const {w,d,h}=spec,parts=[];
  const box=(color,x,y,z,width,height,depth)=>{
    if(!INTERIOR_PALETTE[color]||[width,height,depth].some(v=>!Number.isFinite(v)||v<=0))
      throw Error("Bad interior part "+id+" / "+color);
    parts.push({color,x,y,z,w:width,h:height,d:depth});
  };
  const layer=(c,width,depth,height,y,z=0,x=0)=>
    box(c,x,y+height/2,z,width,height,depth);
  const posts=(top,wide,deep,c="wood",thick=.07)=>{
    for(const x of [-wide/2+thick/2,wide/2-thick/2])
      for(const z of [-deep/2+thick/2,deep/2-thick/2])
        layer(c,thick,thick,top,0,z,x);
  };
  const cabinet=(c="lightWood",yy=h,wd=w,dd=d)=>{
    layer(c,wd,dd,yy,0);
    box("dark",0,yy*.54,dd/2+.008,wd*.014,yy*.74,.015);
    for(const sign of [-1,1])box("metal",sign*wd*.25,yy*.52,dd/2+.02,.03,.14,.025);
  };
  const seat=(c="textile")=>{
    layer("wood",w*.95,d*.91,.13,.32);
    layer(c,w*.91,d*.86,.19,.43);
    box(c,0,.68,d/2-.09,w*.94,.37,.16);
    posts(.37,w*.90,d*.82);
  };
  switch(id){
    case "sofa":case "sofa_bed":
      seat(id==="sofa"?"textile":"fabric");
      for(const x of [-w*.43,w*.43])box("darkWood",x,.61,0,.14,.34,d*.88);
      for(const x of [-w*.22,w*.22])box("cushion",x,.61,-d*.12,w*.38,.12,d*.36);
      if(id==="sofa_bed")box("lightWood",0,.31,d*.39,w*.87,.07,.06);
      break;
    case "armchair":seat("fabric");box("cushion",0,.63,-.16,.45,.07,.28);break;
    case "single_bed":case "double_bed":
      layer("wood",w,d,.18,.24);
      layer("textile",w*.94,d*.87,.22,.34);
      box("lightWood",0,.58,-d/2+.045,w,.55,.09);
      box("cushion",0,.51,-d*.30,w*.47,.15,.32);
      box("fabric",0,.48,d*.13,w*.89,.06,d*.45);
      posts(.24,w,d,"darkWood");break;
    case "wardrobe":cabinet("lightWood");box("glass",-w*.22,1.25,d/2+.015,w*.22,.65,.015);break;
    case "dresser":cabinet("wood");for(let j=0;j<3;j++)box("darkWood",0,.19+j*.24,d/2+.015,w*.86,.015,.012);break;
    case "bedside_table":cabinet("wood");break;
    case "coffee_table":case "writing_desk":case "dining_table":
      layer("lightWood",w,d,.075,h-.075);
      posts(h-.12,w*.87,d*.8);
      if(id==="writing_desk")box("darkWood",w*.24,h*.6,d*.30,w*.38,h*.18,.09);
      break;
    case "chair":case "kitchen_chair":
      layer("wood",w*.92,d*.84,.09,.40);
      box("lightWood",0,.68,d/2-.06,w*.9,.36,.10);
      posts(.40,w*.82,d*.79);break;
    case "television":
      box("dark",0,.38,0,w,.47,.075);
      box("glass",0,.38,d/2-.047,w*.91,.39,.014);
      layer("metal",w*.24,d*.7,.042,.07);box("metal",0,.16,0,.035,.15,.045);break;
    case "tv_stand":cabinet("darkWood");break;
    case "bookcase":
      cabinet("wood");for(let j=0;j<4;j++){
        layer("lightWood",w*.92,d*.93,.055,.31+j*.34);
        for(let i=0;i<5;i++)box(["accent","blue","red","cream"][i%4],-w*.35+i*.16,.44+j*.34,0,.09,.18,.18);
      }break;
    case "wall_shelf":case "wall_sconce":
      for(let i=0;i<(id==="wall_shelf"?2:1);i++)
        layer("wood",w,d,.06,1.14+i*.30);
      box("metal",0,1.31,0,.08,.26,.09);
      if(id==="wall_sconce")box("cream",0,1.60,-.035,.17,.19,.15);
      break;
    case "kitchen_base":case "kitchen_wall":
      if(id==="kitchen_wall"){
        box("lightWood",0,1.52,0,w,.58,d);
        box("metal",0,1.52,d/2+.016,w*.64,.018,.025);
      }else{cabinet("lightWood");box("cream",0,h-.025,0,w,0.05,d);}
      break;
    case "countertop":cabinet("lightWood");box("cream",0,h-.025,0,w,.055,d);break;
    case "kitchen_sink":
      cabinet("lightWood");layer("metal",w*.88,d*.84,.045,h-.06);
      box("dark",0,h-.037,0,w*.58,.018,d*.55);
      box("metal",0,h+.045,-d*.29,.025,.15,.025);break;
    case "stove":
      cabinet("white");
      box("dark",0,h-.022,0,w*.92,.03,d*.88);
      for(const x of [-.15,.15])for(const z of [-.12,.12])
        layer("metal",.13,.13,.018,h-.003,z,x);
      box("metal",0,h*.48,d/2+.015,w*.65,.05,.015);break;
    case "fridge":
      cabinet("white");box("metal",w*.28,h*.69,d/2+.02,.025,.27,.03);
      box("metal",0,h*.42,d/2+.016,w*.9,.018,.018);break;
    case "kettle":
      layer("metal",w*.7,d*.7,.16,0);
      box("dark",0,.18,0,w*.40,.07,d*.43);
      box("metal",w*.35,.13,0,.065,.13,.07);break;
    case "kitchen_chair":break;
    case "trash_bin":
      layer("metal",w,d,h*.90,0);layer("dark",w*1.04,d*1.04,.045,h*.90);break;
    case "toilet":
      box("ceramic",0,.22,.08,w*.92,.30,d*.88);
      box("ceramic",0,.58,-d*.32,w*.9,.36,d*.28);
      layer("white",w*.88,d*.75,.045,.35);break;
    case "bathtub":
      layer("ceramic",w,d,h,0);
      box("white",0,h+.009,0,w*.88,.028,d*.84);
      box("glass",0,h+.027,0,w*.70,.012,d*.65);break;
    case "washbasin":
      box("ceramic",0,.73,0,w,.13,d);
      box("white",0,.43,-d*.2,w*.57,.64,d*.32);
      box("metal",0,.84,-d*.28,.03,.17,.03);break;
    case "mixer_tap":
      box("metal",0,.84,0,.045,.17,.05);
      box("metal",.06,.91,0,.16,.035,.035);break;
    case "washing_machine":
      cabinet("white");box("dark",0,.44,d/2+.01,.37,.37,.02);
      box("glass",0,.44,d/2+.023,.28,.28,.012);
      for(let i=0;i<3;i++)box("metal",-w*.26+i*.10,h-.11,d/2+.025,.055,.032,.014);
      break;
    case "bathroom_mirror":
      box("white",0,1.35,0,w,.70,d);box("glass",0,1.35,d/2+.014,w*.89,.60,.012);break;
    case "bathroom_cabinet":cabinet("white",.46,w,d);
      box("glass",0,1.37,-.04,w*.82,.38,.025);break;
    case "towel_rail":
      for(const sign of [-1,1])box("metal",sign*w*.41,1.10,0,.032,.76,.035);
      for(let i=0;i<5;i++)box("metal",0,.79+i*.15,0,w*.82,.035,.04);break;
    case "towel_holder":
      box("metal",0,1.23,0,w*.86,.028,.025);
      box("fabric",0,1.04,.015,w*.60,.39,.025);break;
    case "shoe_rack":
      for(let i=0;i<3;i++)layer("darkWood",w,d,.045,.10+i*.14);
      for(const sign of [-1,1])box("metal",sign*w*.44,h/2,0,.025,h,.028);break;
    case "coat_hanger":
      box("wood",0,1.50,0,w,.08,d);
      for(let i=-2;i<=2;i++)box("metal",i*w*.17,1.41,-.04,.024,.15,.035);break;
    case "slim_cabinet":cabinet("lightWood");break;
    case "ottoman":layer("darkWood",w,d,.25,0);layer("fabric",w*.95,d*.95,.17,.25);break;
    case "rug":layer("fabric",w,d,.023,0);box("accent",0,.027,0,w*.70,.006,d*.66);break;
    case "curtains":
      for(const sign of [-1,1])box("fabric",sign*w*.30,1.12,0,w*.32,1.80,.055);
      box("metal",0,2.05,0,w,.032,.05);break;
    case "ceiling_chandelier":
      box("metal",0,1.89,0,.045,.34,.045);
      for(const sign of [-1,1]){box("metal",sign*.17,1.76,0,.33,.035,.04);
        box("cream",sign*.30,1.67,0,.20,.16,.20);}break;
    case "table_lamp":
      box("metal",0,.10,0,.15,.04,.15);
      box("metal",0,.23,0,.027,.23,.027);
      box("cream",0,.37,0,.20,.13,.19);break;
    case "painting":
      box("darkWood",0,1.44,0,w,.42,d);
      box("blue",0,1.44,d/2+.007,w*.82,.31,.014);break;
    case "potted_plant":
      layer("wood",w*.72,d*.72,.30,0);
      box("green",0,.55,0,w*.65,.36,d*.68);
      for(const s of [-1,1])box("green",s*.10,.62,0,.15,.23,.25);break;
    case "clock":
      box("white",0,1.64,0,w,.29,d);
      box("dark",0,1.68,d/2+.015,.018,.11,.012);
      box("dark",-.032,1.62,d/2+.015,.09,.015,.012);break;
    case "books":
      for(let i=0;i<5;i++)box(["red","green","blue","cream","wood"][i],
        -.14+i*.069,.13,0,.056,.22,.19);break;
    case "dishes":
      for(let i=-1;i<=1;i++)layer("ceramic",.12,.12,.035,.03,0,i*.12);
      box("metal",.15,.12,0,.045,.20,.045);break;
    case "interior_door":
      box("wood",0,h/2,0,w,h,.065);
      box("lightWood",0,h*.58,d/2+.014,w*.75,h*.63,.016);
      box("metal",w*.33,.94,d/2+.019,.11,.025,.04);break;
    case "light_switch":
      box("white",0,1.23,0,w,.13,.03);
      box("metal",0,1.23,d/2+.003,.035,.045,.015);break;
    case "doorbell":
      box("cream",0,1.57,0,w,.14,.055);
      box("metal",0,1.57,d/2+.016,.045,.045,.016);break;
    case "floor_sign":
      box("metal",0,1.65,0,w,.21,.025);
      box("cream",0,1.65,d/2+.014,w*.7,.12,.014);break;
    default:fail(id);
  }
  if(parts.length===0)throw Error("Empty interior asset: "+id);
  return parts;
}
// Every model uses exactly the same pieces in the real game and its viewer.
export function buildInteriorInstances(THREE,placements,{name="interior-objects"}={}){
  const root=new THREE.Group();root.name=name;
  const cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const batches=new Map(),counts={};
  for(const item of placements){
    const spec=INTERIOR_ASSET_BY_ID[item.id]||fail(item.id);
    counts[item.id]=(counts[item.id]||0)+1;
    const angle=item.yaw||0,ca=Math.cos(angle),sa=Math.sin(angle);
    for(const p of interiorPieces(item.id)){
      const bucket=batches.get(p.color)||[];
      const x=p.x*ca+p.z*sa,z=-p.x*sa+p.z*ca;
      dummy.position.set(item.x+x,(item.y||0)+p.y,item.z+z);
      dummy.rotation.set(0,angle,0);dummy.scale.set(p.w,p.h,p.d);
      dummy.updateMatrix();bucket.push(dummy.matrix.clone());
      batches.set(p.color,bucket);
    }
  }
  for(const [color,matrices] of batches){
    const mat=new THREE.MeshStandardMaterial({
      color:INTERIOR_PALETTE[color],roughness:color==="glass"?.30:.82,
      metalness:color==="metal"?.52:0
    });
    const mesh=new THREE.InstancedMesh(cube,mat,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=true;
    root.add(mesh);
  }
  root.userData.interiorAudit={objects:placements.length,types:Object.keys(counts).length,
    counts,drawCalls:root.children.length,rooms:[...new Set(placements.map(x=>x.room))]};
  return {root,stats:root.userData.interiorAudit};
}
export function buildIsolatedInteriorModel(THREE,id){
  const spec=INTERIOR_ASSET_BY_ID[id]||fail(id);
  return buildInteriorInstances(THREE,[{id,x:0,y:0,z:0,yaw:0,
    room:"isolated-"+id}],{name:"asset-"+spec.id});
}

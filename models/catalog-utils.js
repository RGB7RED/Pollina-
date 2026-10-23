// MINI CITY asset registry contract, independent from browser and Three.js.
// One source of truth: models/catalog.json. A reference is not a production
// asset and an entry never implies binary export or licensing clearance.
export const CATEGORIES=Object.freeze({
  building:"Здания",character:"Персонажи",environment:"Улицы и окружение",
  nature:"Растительность",street_furniture:"Городские предметы"
});
export const STATUS=Object.freeze({
  development:"В разработке",testing:"На испытаниях",approved:"Принят для лаборатории"
});
export const KIND=Object.freeze({
  procedural:"Генерируется кодом",scene_component:"Часть сцены",
  glb:"Файл GLB",external:"Внешний GLB"
});
export const CATEGORY_ICON=Object.freeze({
  building:"🏠",character:"🚶",environment:"🛣️",
  nature:"🌳",street_furniture:"🪑"
});
function safePath(path,allowQuery=false){
  if(typeof path!=="string"||!path||path.startsWith("/")||path.includes("\\")||
      path.includes("#")||path.startsWith(".")||/[\u0000-\u001f]/.test(path))return false;
  const parts=path.split(allowQuery?"?":/\?/);
  const segments=parts[0].split("/");
  return segments.every(segment=>segment!==".."&&segment!=="."&&segment!=="")&&
    !/^[a-z][a-z0-9+.-]*:/i.test(path)&&
    (!allowQuery||parts.length<=2);
}
export function validateCatalog(catalog){
  if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.entries))
    throw Error("Unsupported catalog schema");
  const seen=new Set();
  for(const item of catalog.entries){
    const label=item?.id||"(unknown)";
    if(!/^[a-z][a-z0-9_]*$/.test(label)||seen.has(label))
      throw Error("Invalid or duplicated asset id: "+label);
    seen.add(label);
    if(typeof item.name!=="string"||!item.name.trim()||
      typeof item.scopeNote!=="string"||!item.scopeNote.trim())
      throw Error("Missing asset name or disclaimer: "+label);
    if(!(item.category in CATEGORIES)||!(item.status in STATUS)||
      !(item.kind in KIND))throw Error("Unknown asset classification: "+label);
    if(!Number.isInteger(item.quantity)||item.quantity<1)
      throw Error("Invalid scene quantity: "+label);
    if(![true,false,"fallback"].includes(item.inPlayLab))
      throw Error("Unknown presence in game laboratory: "+label);
    if(typeof item.releaseReady!=="boolean")
      throw Error("Missing release gate: "+label);
    if(!Array.isArray(item.sourcePaths)||item.sourcePaths.length===0||
       !item.sourcePaths.every(p=>safePath(p,false)))
      throw Error("Invalid repository source path: "+label);
    if(!safePath(item.viewer,true)||typeof item.viewerLabel!=="string")
      throw Error("Invalid viewer path: "+label);
    if(item.scene!==null&&!safePath(item.scene,true))
      throw Error("Invalid game lab scene path: "+label);
    if(item.assetFile!==null&&!safePath(item.assetFile,false))
      throw Error("Invalid binary path: "+label);
    if(!["project","external"].includes(item.origin))
      throw Error("Unknown provenance: "+label);
    if(![true,false,null].includes(item.rightsChecked))
      throw Error("Invalid licensing state: "+label);
    if(item.origin==="external"&&(item.rightsChecked!==false||
      item.releaseReady===true||item.assetFile!==null))
      throw Error("External asset has not passed release checks: "+label);
    if(item.kind==="glb"&&item.assetFile===null)
      throw Error("Local GLB is missing an actual file: "+label);
    if(item.kind!=="glb"&&item.assetFile!==null)
      throw Error("Procedural or external asset cannot claim local GLB: "+label);
    if(item.status==="development"&&item.releaseReady)
      throw Error("In-development asset cannot be release-ready: "+label);
  }
  return catalog;
}
export function filterCatalog(catalog,{search="",category="all",status="all"}={}){
  const query=String(search).normalize("NFKC").trim().toLocaleLowerCase("ru");
  const matching=catalog.entries.filter(item=>{
    if(category!=="all"&&item.category!==category)return false;
    if(status!=="all"&&item.status!==status)return false;
    if(!query)return true;
    const searchable=[item.id,item.name,item.scopeNote,item.category,
      ...item.sourcePaths].join(" ").normalize("NFKC").toLocaleLowerCase("ru");
    return searchable.includes(query);
  });
  return matching;
}
export function catalogCounts(catalog){
  const statuses={development:0,testing:0,approved:0};
  const categories={};
  for(const item of catalog.entries){
    statuses[item.status]++;
    categories[item.category]=(categories[item.category]||0)+1;
  }
  return {total:catalog.entries.length,statuses,categories,
    inGame:catalog.entries.filter(item=>item.inPlayLab===true).length,
    readyForRelease:catalog.entries.filter(item=>item.releaseReady).length};
}

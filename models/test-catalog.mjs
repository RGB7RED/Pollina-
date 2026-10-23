import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {validateCatalog,filterCatalog,catalogCounts,CATEGORIES,STATUS,
 catalogFolders,folderObjects,modelLabel} from "./catalog-utils.js";
const catalog=JSON.parse(readFileSync(new URL("./catalog.json",import.meta.url),"utf8"));
assert.equal(validateCatalog(catalog),catalog);
assert.equal(catalog.schemaVersion,2);
assert.deepEqual(catalogFolders(catalog).map(f=>[f.id,f.count]),[
 ["building",1],["character",2],["environment",1],
 ["nature",2],["street_furniture",3]
]);
assert.deepEqual(folderObjects(catalog,"character").map(e=>e.modelNumber),[1,2]);
assert.deepEqual(folderObjects(catalog,"street_furniture").map(e=>e.modelNumber),[1,2,3]);
assert.deepEqual(folderObjects(catalog,"building").map(e=>e.id),["apartment_house"]);
const street=catalog.entries.find(e=>e.id==="residential_street");
const house=catalog.entries.find(e=>e.id==="apartment_house");
assert.equal(street.viewer,"street-lab/index.html");
assert.equal(street.scene,"play-lab/index.html?mode=lab");
assert.equal(house.viewer,"building-lab/index.html");
assert.equal(house.scene,"play-lab/index.html?mode=lab");
assert.notEqual(street.viewer,house.viewer,
 "house and street are different assets with independent viewers");
assert.deepEqual(folderObjects(catalog,"imaginary"),[]);
assert.equal(modelLabel(1),"№ 001");
assert.equal(modelLabel(12),"№ 012");
// Numbering represents unique designs, NOT copies placed in the street.
assert.equal(folderObjects(catalog,"nature").length,2);
assert.equal(folderObjects(catalog,"nature")[0].quantity,22);
assert.equal(folderObjects(catalog,"nature")[0].modelNumber,1);
assert.deepEqual(folderObjects(catalog,"nature").map(e=>e.modelNumber),[1,2]);
const grass=catalog.entries.find(e=>e.id==="street_grass_001");
assert.ok(grass);
assert.equal(grass.modelNumber,2);
assert.equal(grass.quantity,1,"one reusable grass layer, not thousands of catalog cards");
assert.equal(grass.inPlayLab,true);
assert.equal(grass.viewer,"grass-lab/index.html");
assert.ok(grass.sourcePaths.includes("play-lab/grass.js"));
assert.equal(grass.assetFile,null);
assert.equal(grass.releaseReady,false);
const counts=catalogCounts(catalog);
assert.deepEqual(counts,{
  total:9,
  statuses:{development:2,testing:6,approved:1},
  categories:{building:1,character:2,environment:1,nature:2,street_furniture:3},
  inGame:7,readyForRelease:0
});
assert.equal(filterCatalog(catalog,{search:"дерево"}).length,1);
assert.equal(filterCatalog(catalog,{search:"ПЯТИЭТАЖКА"}).length,1);
assert.equal(filterCatalog(catalog,{search:"street.js"}).length,5);
assert.equal(filterCatalog(catalog,{category:"character"}).length,2);
assert.equal(filterCatalog(catalog,{status:"approved"}).length,1);
assert.equal(filterCatalog(catalog,{category:"street_furniture",status:"testing"}).length,2);
assert.equal(filterCatalog(catalog,{search:"не существует"}).length,0);
for(const id of ["street_tree","street_lamp","street_bench"]){
 const entry=catalog.entries.find(e=>e.id===id);
 assert.equal(entry.viewer,"street-asset-lab/index.html?model="+id,
  "each existing asset must open its OWN isolated viewer");
 assert.ok(entry.scene?.includes("play-lab"),"world preview remains optional");
 assert.equal(entry.inPlayLab,true,"existing game objects remain installed");
}
assert.equal(catalog.entries.find(e=>e.id==="hero_reference").viewer,
 "character-lab/index.html?model=hero_reference");
assert.equal(catalog.entries.find(e=>e.id==="hero_city_candidate").viewer,
 "character-lab/index.html?model=hero_city_candidate");
assert.equal(folderObjects(catalog,"street_furniture")[2].id,"bus_stop_city_001");
assert.equal(folderObjects(catalog,"street_furniture")[2].modelNumber,3);
assert.equal(folderObjects(catalog,"street_furniture")[2].quantity,1);
assert.equal(folderObjects(catalog,"street_furniture")[2].inPlayLab,false);
assert.equal(folderObjects(catalog,"street_furniture")[2].assetFile,null);
assert.equal(filterCatalog(catalog,{category:"street_furniture",status:"development"}).length,1);
assert.equal(folderObjects(catalog,"character",{search:"№ 002"}).length,1);
assert.equal(folderObjects(catalog,"character",{status:"testing"}).length,1);
assert.equal(Object.keys(CATEGORIES).length,5);
assert.equal(Object.keys(STATUS).length,3);
assert.ok(catalog.entries.every(e=>!e.releaseReady),
  "No assets have been cleared for production release");
for(const item of catalog.entries){
  assert.ok(existsSync(new URL("../"+item.viewer.split("?")[0],import.meta.url)),
    "missing real viewer page for "+item.id);
  if(item.scene)assert.ok(existsSync(new URL("../"+item.scene.split("?")[0],import.meta.url)),
    "missing game lab for "+item.id);
  for(const path of item.sourcePaths){
    assert.ok(existsSync(new URL("../"+path,import.meta.url)),
      "missing actual source "+path+" for "+item.id);
  }
  if(item.assetFile){
    assert.ok(existsSync(new URL("../"+item.assetFile,import.meta.url)),
      "Catalog claims GLB file missing from repo: "+item.assetFile);
  }
}
function changed(id,patch){
  const copy=structuredClone(catalog);
  const record=copy.entries.find(item=>item.id===id);
  Object.assign(record,patch);
  return copy;
}
assert.throws(()=>validateCatalog(changed("apartment_house",{assetFile:"models/missing.glb"})),
 /cannot claim local GLB/);
assert.throws(()=>validateCatalog(changed("hero_city_candidate",{releaseReady:true})),
 /External asset has not passed release checks/);
assert.throws(()=>validateCatalog(changed("hero_city_candidate",{origin:"project",
 kind:"glb",assetFile:null})),/Local GLB is missing/);
assert.throws(()=>validateCatalog(changed("street_tree",{
 sourcePaths:["../private-secret.txt"]})),/Invalid repository source path/);
const duplicate=structuredClone(catalog);
duplicate.entries.push({...duplicate.entries[0]});
assert.throws(()=>validateCatalog(duplicate),/duplicated asset id/);
assert.throws(()=>validateCatalog(changed("hero_reference",{modelNumber:1})),
  /Duplicated model number within folder/);
assert.throws(()=>validateCatalog(changed("hero_reference",{modelNumber:0})),
  /Invalid model number/);
assert.throws(()=>validateCatalog(changed("hero_reference",{modelNumber:"002"})),
  /Invalid model number/);
const crossFolderSameNumber=structuredClone(catalog);
assert.equal(crossFolderSameNumber.entries[0].modelNumber,
  crossFolderSameNumber.entries[1].modelNumber,
  "same number is allowed across distinct folders");
assert.equal(validateCatalog(crossFolderSameNumber),crossFolderSameNumber);
console.log("MINI CITY 4.2.3 registry PASS: 9 real numbered entries, 5 folders, sources exist, no fake binaries or release approvals, filters validated");

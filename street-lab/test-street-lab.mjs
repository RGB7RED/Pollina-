import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import {BUILDING} from "../building-lab/building.js";
import {planStreet} from "../play-lab/street.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("./index.html"),streetLab=read("./lab.js");
const houseHtml=read("../building-lab/index.html"),
 houseLab=read("../building-lab/lab.js");
const grassSource=read("../play-lab/street.js");
const catalog=JSON.parse(read("../models/catalog.json"));
const source=streetLab.replace(/^import[^\n]*\n/gm,"");
new Script(source,{filename:"street-lab/lab.js"});
assert.match(html,/three@0\.170\.0/);
assert.match(html,/touch-action:none/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/id="stage"/);
assert.match(html,/id="lawn"/);
assert.match(html,/id="fps"/);
assert.match(html,/data-view="grass"/);
assert.match(html,/data-view="overview"/);
assert.match(html,/href="\.\.\/studio\/catalog\.html\?category=environment"/);
assert.match(html,/href="\.\.\/building-lab\/index\.html"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(html,/href="\.\.\/object-viewer\/free-flight\.css"/);
assert.match(streetLab,/planStreet\(BUILDING,\[\],\{buildingPresent:false,furniture:false\}\)/);
assert.match(streetLab,/buildStreet\(THREE,plan\)/);
assert.doesNotMatch(streetLab,/buildApartmentHouse\(|applyFacadeFinishes\(/,
 "street must NEVER instantiate house geometry/materials");
assert.match(streetLab,/mountInspectionFlight\(/);
assert.match(streetLab,/if\(flight\.active\)flight\.update\(dt\);else orbit\.update\(\)/);
assert.match(streetLab,/renderer\.info\.render\.calls/);
assert.match(streetLab,/plan\.grassTufts\.length/);
const house=catalog.entries.find(x=>x.id==="apartment_house");
const street=catalog.entries.find(x=>x.id==="residential_street");
assert.equal(house.viewer,"building-lab/index.html");
assert.equal(street.viewer,"street-lab/index.html");
assert.equal(house.scene,"play-lab/index.html?mode=lab");
assert.equal(street.scene,"play-lab/index.html?mode=lab");
assert.notEqual(house.viewer,street.viewer);
assert.match(houseHtml,/ДОМ ОТДЕЛЬНО · БЕЗ УЛИЦЫ/);
assert.match(houseHtml,/href="\.\.\/street-lab\/index\.html"/);
assert.doesNotMatch(houseLab,/street\.js|buildStreet\(THREE/,
 "house must not import/construct playable street");
assert.match(houseLab,/plane\(146,84,0x939d9a,0,-\.08,0\)/);
assert.doesNotMatch(houseLab,/const markings=new THREE\.Group|plane\(98,8\.5|plane\(92,5\.7/,
 "standalone building viewer must have no road/lane markings or sidewalk");
const city=planStreet(BUILDING);
const separate=planStreet(BUILDING,[],{buildingPresent:false,furniture:false});
assert.equal(separate.trees.length,0);
assert.equal(separate.lamps.length,0);
assert.equal(separate.benches.length,0);
assert.equal(separate.obstacles.length,0);
assert.deepEqual([separate.info.trees,separate.info.lamps,separate.info.benches],[0,0,0]);
assert.match(html,/0 домов и городских предметов|без домов и городских предметов/);
assert.ok(separate.grassTufts.length>city.grassTufts.length);
assert.ok(separate.grassTufts.length>6000 && separate.grassTufts.length<11000);
assert.ok(separate.grassTufts.some(p=>Math.abs(p.x)<10&&Math.abs(p.z)<5),
 "standalone street grows grass where the absent house would be");
for(const tuft of separate.grassTufts){
 assert.ok(tuft.height>=.19&&tuft.height<=.46);
 for(const r of separate.surfaces.filter(s=>s.kind!=="grass"))
  assert.ok(Math.abs(tuft.x-r.x)>=r.width/2+.45||
    Math.abs(tuft.z-r.z)>=r.depth/2+.45,"grass on asphalt or sidewalk");
}
assert.match(grassSource,/addGrassToGroup\(THREE,root,plan\.grassTufts/);
const detailedGrass=read("../play-lab/grass.js");
assert.match(detailedGrass,/BLADES_PER_TUFT=7/);
assert.match(detailedGrass,/THREE\.DoubleSide/);
assert.match(detailedGrass,/grass-patch-/);
console.log("MINI CITY street/house isolation PASS: independent viewers, street grass, paving exclusion, mobile camera and shared city");

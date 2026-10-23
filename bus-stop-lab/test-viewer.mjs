import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("./index.html"),js=read("./lab.js");
const catalog=JSON.parse(read("../models/catalog.json"));
for(const p of ["./lab.js","./bus-stop.js","./materials.js"]){
 const src=read(p).replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,"");
 new Script(src,{filename:p});
}
for(const id of ["stage","telemetry","fps","drawcalls","triangles",
 "material-count","dimensions","development","collapse","lighting","reset","error"])
 assert.ok(html.includes('id="'+id+'"'),"missing viewer element "+id);
assert.match(html,/three@0\.170\.0/);
assert.match(html,/touch-action:none/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/href="\.\.\/studio\/catalog\.html\?category=street_furniture"/);
assert.match(js,/enablePan=true/);
assert.match(js,/OrbitControls/);
assert.match(js,/auditBusStop\(THREE,root\)/);
assert.match(js,/renderer\.info\.render\.calls/);
assert.match(js,/requestAnimationFrame\(draw\)/);
assert.doesNotMatch(js,/import.*play-lab|import.*building-lab/);
for(const view of ["front","side","top","threequarter"])
 assert.ok(html.includes('data-view="'+view+'"'));
const entries=catalog.entries.filter(e=>e.category==="street_furniture");
assert.deepEqual(entries.map(e=>e.modelNumber),[1,2,3]);
const stop=entries[2];
assert.equal(stop.id,"bus_stop_city_001");
assert.equal(stop.status,"development");
assert.equal(stop.viewer,"bus-stop-lab/index.html");
assert.equal(stop.inPlayLab,false);
assert.equal(stop.quantity,1);
assert.equal(stop.scene,null);
assert.equal(stop.assetFile,null);
assert.equal(stop.releaseReady,false);
for(const path of [stop.viewer,...stop.sourcePaths])
 assert.ok(existsSync(new URL("../"+path,import.meta.url)),"missing "+path);
console.log("MINI CITY stop viewer static PASS: catalog №003, real links, UI and mobile controls");

import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("./index.html"),js=read("./lab.js"),
  flight=read("../object-viewer/free-flight.js"),
  bus=read("../bus-stop-lab/lab.js"),
  character=read("../character-lab/lab.js"),
  characterHtml=read("../character-lab/index.html"),
  busHtml=read("../bus-stop-lab/index.html"),
  house=read("../building-lab/lab.js");
for(const [name,source] of [["street viewer",js],["flight",flight],["bus",bus],["character",character]]){
  new Script(source.replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,""),{filename:name});
}
assert.match(html,/three@0\.170\.0/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/touch-action:none/);
assert.match(html,/\.\.\/object-viewer\/free-flight\.css/);
assert.match(js,/Object\.hasOwn\(ISOLATED_ASSETS,id\)/);
assert.match(js,/buildIsolatedStreetAsset\(THREE,id\)/);
assert.match(js,/renderer\.info\.render\.calls/);
assert.match(js,/flight\.active\)flight\.update\(dt\);else orbit\.update\(\)/);
assert.match(js,/\.\.\/studio\/catalog\.html\?category=/);
assert.match(js,/new URL\(window\.location\.href\)\.searchParams\.get\("model"\)/);
assert.match(js,/Math\.min\(devicePixelRatio\|\|1,1\.3\)/);
for(const id of ["stage","title","back","fail","fps","calls","tris","materials",
 "size","scene-status","reset"]){
  assert.ok(html.includes('id="'+id+'"'),"missing viewer element "+id);
}
for(const v of ["front","side","top","threequarter"]){
  assert.ok(html.includes('data-view="'+v+'"'),"missing camera view "+v);
}
assert.match(busHtml,/\.\.\/object-viewer\/free-flight\.css/);
assert.match(bus,/mountInspectionFlight/);
assert.match(bus,/if\(flight\.active\)flight\.update\(dt\);else controls\.update\(\)/);
assert.match(characterHtml,/\.\.\/object-viewer\/free-flight\.css/);
assert.match(character,/initialModel==="hero_reference"\?"base":"casual"/);
assert.match(character,/if\(!flight\.active\)\{controls\.target\.add\(delta\);camera\.position\.add\(delta\);\}/);
assert.match(character,/if\(flight\.active\)flight\.update\(dt\);else controls\.update\(\)/);
assert.match(house,/const free=new FreeCamera\(camera\)/,
 "pre-existing house XYZ flight must still work");
for(const target of ["../play-lab/street.js","../object-viewer/free-flight.js",
 "../building-lab/free-camera.js"]){
 assert.ok(existsSync(new URL(target,import.meta.url)),"shared module missing "+target);
}
console.log("MINI CITY isolated viewer contract PASS: exact models, iPhone controls, independent flight for bus and character, house preserved");

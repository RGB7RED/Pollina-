import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("./lab.js",import.meta.url),"utf8");
new Script(js.replace(/^import[^\n]*\n/gm,""),{filename:"building-lab/lab.js"});
for(const id of ["stage","fps","render","building-info","quality-info","view-label",
  "status","time","quality","reset"]){
 assert.match(html,new RegExp('id="'+id+'"'),"missing binding "+id);
 assert.ok(js.includes('$("'+id+'")'),"missing JS binding "+id);
}
for(const mode of ["front","threequarter","end","top"]){
 assert.match(html,new RegExp('data-view="'+mode+'"'));
 assert.ok(js.includes(mode),"mode "+mode+" missing from camera");
}
assert.match(html,/three@0\.170\.0/);
assert.match(html,/type="module" src="\.\/lab\.js"/);
assert.match(js,/import \{OrbitControls\}/);
assert.match(js,/import \{BUILDING,buildApartmentHouse\} from "\.\/building\.js"/);
assert.match(js,/sun\.shadow\.mapSize\.set/);
assert.match(js,/renderer\.info\.render\.calls/);
assert.match(js,/renderer\.info\.render\.triangles/);
assert.match(js,/window\.buildingLabReady=true/);
assert.doesNotMatch(js,/\.\/game\.js|\.\/district\.js/,"lab must not depend on existing city");
const free=readFileSync(new URL("./free-camera.js",import.meta.url),"utf8");
new Script(free.replace(/^export /gm,""),{filename:"building-lab/free-camera.js"});
for(const id of ["freecam-toggle","freecam-panel","stick-zone","stick-knob","fly-up",
  "fly-down","fly-boost","free-reticle","free-hint","hide-hud","telemetry","free-position"]){
  assert.match(html,new RegExp('id="'+id+'"'),"missing freecam UI "+id);
  if(!["freecam-panel","free-reticle","free-hint","fly-up","fly-down"].includes(id))
    assert.ok(js.includes('$("'+id+'")'),"no JS freecam binding for "+id);
}
assert.match(js,/import \{FreeCamera,normalizedStick\} from "\.\/free-camera\.js"/);
assert.match(js,/function toggleFreeCamera/);
assert.match(js,/stageCanvas\.addEventListener\("pointermove"/);
assert.match(js,/\["fly-up",1\],\["fly-down",-1\]/);
assert.match(js,/window\.addEventListener\("blur",releaseInputs\)/);
assert.match(js,/free\.update\(dt\)/);
assert.match(js,/if\(activeFly\(\)\)\{/);
assert.match(free,/export class FreeCamera/);
assert.match(free,/targetAt/);
console.log("Building lab 3.1.1 contracts PASS: ORBIT and XYZ FREE camera, joystick, touch swipe, FPS");


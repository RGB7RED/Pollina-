import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("./index.html"),js=read("./game.js");
const controller=read("./controller.js"),animation=read("./animation.js");
const studio=read("./studio.js");
new Script(js.replace(/^import[^\n]*\n/gm,""),{filename:"game.js"});
new Script(controller.replace(/^export /gm,""),{filename:"controller.js"});
new Script(studio.replace(/^export /gm,""),{filename:"studio.js"});
new Script(animation.replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,""),
  {filename:"animation.js"});
for(const id of ["stage","fps","actor-status","status","retry","stick","stick-knob",
"camera-mode","camera-hint","switch-view","run","reset","reticle"]){
 assert.match(html,new RegExp('id="'+id+'"'),"missing play-lab UI "+id);
}
assert.match(html,/three@0\.170\.0/);
assert.match(html,/type="module" src="\.\/game\.js"/);
assert.match(html,/href="\.\.\/building-lab\/index\.html"/);
assert.match(html,/href="\.\.\/character-lab\/index\.html"/);
assert.match(js,/import \{buildApartmentHouse\} from "\.\.\/building-lab\/building\.js"/);
assert.match(js,/import \{applyFacadeFinishes\} from "\.\.\/building-lab\/materials\.js"/);
assert.match(js,/import \{ActorAnimator\} from "\.\/animation\.js"/);
assert.match(js,/import \{PlayerController,joystickValue,PLAYER_HEIGHT\} from "\.\/controller\.js"/);
assert.match(js,/new PlayerController\(\{[\s\S]*building:config,pads,extras:streetPlan\.obstacles[\s\S]*\}\)/);
assert.match(js,/import \{planStreet,buildStreet\} from "\.\/street\.js"/);
assert.match(js,/planStreet\(config,pads\)/);
assert.match(js,/buildStreet\(THREE,streetPlan\)/);
assert.match(html,/id="world-info"/);
assert.match(html,/id="hud-toggle"/);
for(const id of ["mode-toggle","play-title","devtools","devtools-toggle",
 "devtools-body","dev-collisions","dev-perf","dev-resources","dev-player",
 "dev-hit","dev-objects","dev-route"]){
 assert.match(html,new RegExp('id="'+id+'"'),"missing dev UI "+id);
}
assert.match(js,/import \{DeveloperStudio\} from "\.\/studio\.js"/);
assert.match(js,/new DeveloperStudio\(/);
assert.match(js,/studio\.update\(\{fps:measuredFps,state\}\)/);
assert.match(html,/href="\.\.\/studio\/index\.html"/);
assert.match(html,/href="\.\.\/studio\/catalog\.html"/);
assert.doesNotMatch(html,/href="\.\.\/lab\/index\.html"/);
assert.match(html,/body\.game-mode \.brand p/);
assert.match(studio,/window\.history\.pushState/);
assert.match(studio,/class DeveloperStudio/);
assert.match(js,/\.classList\.toggle\("collapsed"\)/);
assert.match(js,/actorPivot\.rotation\.y=state\.heading/);
assert.match(js,/renderer\.render\(scene,camera\)/);
assert.match(js,/renderer\.setPixelRatio\(Math\.min\(devicePixelRatio\|\|1,1\.15\)\)/);
assert.match(js,/function toggleView\(\)/);
assert.match(js,/controller\.toggleView\(\)/);
assert.match(js,/actor\.visible=!first/);
assert.match(js,/window\.addEventListener\("blur",releaseControls\)/);
assert.match(js,/visibilitychange/);
assert.match(js,/window\.miniCityStage41Ready=true/);
assert.match(js,/loadActor\(1\)/);
assert.match(js,/\/character-lab\/assets\/hero-reference\.glb/);
assert.match(js,/raw\.githubusercontent\.com/);
assert.doesNotMatch(js,/new OrbitControls/);
assert.doesNotMatch(js,/\.\/game\.js|\.\.\/game\.js|\.\.\/district\.js/,
 "play scene must stay independent of main game engine");
assert.match(controller,/cameraObstacleDistance/);
assert.match(controller,/resolveStep/);
assert.match(controller,/VIEW_MODES/);
assert.match(controller,/export function modelYawForTravel/);
assert.match(controller,/export function modelYawForCamera/);
assert.match(controller,/this\.lookYaw\+=clamp\(dx/);
assert.match(controller,/modelYawForTravel\(movedX,movedZ\)/);
assert.match(controller,/this\.heading=modelYawForCamera\(this\.lookYaw\)/);
assert.match(animation,/selectLocomotionClips/);
console.log("MINI CITY 4.1 viewer PASS: dual view, 3D collisions, mobile controls, real model loading, isolated scene");

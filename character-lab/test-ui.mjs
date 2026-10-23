import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const html=read("index.html"),js=read("lab.js"),motion=read("motion.mjs");
new Script(js.replace(/^import[^\n]*\n/gm,""),{filename:"lab.js"});
new Script(motion.replace(/^export /gm,""),{filename:"motion.mjs"});
assert.match(html,/type="importmap"/);
assert.match(html,/three@0\.170\.0/);
assert.match(html,/src="\.\/lab\.js"/);
assert.match(html,/href="\.\.\/building-lab\/index\.html"/);
assert.match(html,/href="\.\.\/studio\/index\.html"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(html,/href="\.\/index\.html" aria-current="page"/);
for(const id of ["viewport","state","rig","geometry","frame","clip","motion-status","speed","clip-select","status","model-source","skeleton","reset","turn-left","turn-right","btn-idle","btn-walk","btn-run"]){
  assert.ok(html.includes('id="'+id+'"'),"missing interface element "+id);
}
assert.match(js,/import \{MotionController\} from "\.\/motion\.mjs"/);
assert.match(js,/new GLTFLoader\(\)/);
assert.match(js,/\.\/assets\/hero-reference\.glb/);
assert.match(js,/raw\.githubusercontent\.com/);
assert.match(js,/function loadSource\(source,allowFallback=true\)/);
assert.match(js,/new THREE\.SkeletonHelper/);
assert.match(js,/new THREE\.AnimationMixer/);
assert.match(js,/new MotionController/);
assert.match(js,/motion\.update\(dt\)/);
assert.match(js,/setPointerCapture/);
assert.match(js,/root\.position\.clone\(\)\.sub\(lastRoot\)/);
assert.match(js,/window\.characterLabStage2Ready=true/);
assert.match(js,/requestAnimationFrame\(tick\)/);
assert.doesNotMatch(js,/function poseTest\(/); // Procedural joint wiggle removed.
console.log("Stage 2 viewer contracts OK: animation mixer, mobile movement controls, clip picker and camera follow");

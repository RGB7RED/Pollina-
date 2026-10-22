import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const html=read("index.html"),js=read("lab.js");
new Script(js.replace(/^import[^\n]*\n/gm,""),{filename:"lab.js"});
assert.match(html,/type="importmap"/);
assert.match(html,/three@0\.170\.0/);
assert.match(html,/src="\.\/lab\.js"/);
for(const id of ["viewport","state","rig","geometry","frame","clip","status","model-source","skeleton","reset"]){
  assert.ok(html.includes('id="'+id+'"'),"missing DOM control "+id);
}
assert.match(js,/new GLTFLoader\(\)/);
assert.match(js,/\.\/assets\/hero-reference\.glb/);
assert.match(js,/raw\.githubusercontent\.com/);
assert.match(js,/function loadSource\(source,canFallback=true\)/);
assert.match(js,/new THREE\.SkeletonHelper/);
assert.match(js,/new THREE\.AnimationMixer/);
assert.match(js,/window\.characterLabReady=true/);
assert.match(js,/requestAnimationFrame\(tick\)/);
console.log("Character lab static DOM/import/model-fallback contract OK");

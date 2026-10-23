import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=rel=>readFileSync(new URL(rel,import.meta.url),"utf8");
const home=read("./index.html");
const objectLab=read("../lab/index.html");
const play=read("../play-lab/index.html");
const game=read("../play-lab/game.js");
const studio=read("../play-lab/studio.js");
new Script(game.replace(/^import[^\n]*\n/gm,""),{filename:"game.js"});
new Script(studio.replace(/^export /gm,""),{filename:"studio.js"});
const links=[...home.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
for(const target of [
 "../lab/index.html",
 "../play-lab/index.html?mode=lab",
 "../play-lab/index.html?mode=game"
])assert.ok(links.includes(target),"developer studio route "+target+" missing");
assert.match(home,/Лаборатория объектов/);
assert.match(home,/Лаборатория игры/);
assert.match(home,/Играть/);
assert.match(home,/href="\.\/catalog\.html"/);
assert.match(objectLab,/href="\.\.\/studio\/catalog\.html"/);
assert.match(play,/href="\.\.\/studio\/catalog\.html"/);
assert.match(home,/<meta name="viewport"/);
assert.match(home,/env\(safe-area-inset-bottom\)/);
assert.ok(!links.some(x=>x.startsWith("http")),
 "relative links must stay within pinned commit on rawcdn.githack");
assert.match(objectLab,/href="\.\.\/studio\/index\.html"/);
assert.match(objectLab,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(objectLab,/href="\.\.\/play-lab\/index\.html\?mode=game"/);
assert.match(play,/id="devtools"/);
assert.match(play,/id="mode-toggle"/);
assert.match(play,/href="\.\.\/studio\/index\.html"/);
assert.match(studio,/window\.history\.pushState/);
assert.match(studio,/window\.addEventListener\("popstate"/);
assert.match(studio,/n\.panel\.hidden=!lab/);
assert.match(studio,/if\(!lab\)this\.setCollisions\(false\)/);
assert.match(studio,/if\(this\.mode!==MODES\.LAB\)return/);
assert.match(game,/const studio=new DeveloperStudio\(/);
assert.match(game,/studio\.update\(\{fps:measuredFps,state\}\)/);
assert.doesNotMatch(game,/new DeveloperStudio[\s\S]*new THREE\.Scene\(/,
 "mode controller cannot initialize its own second scene");
console.log("MINI CITY 4.2.2 navigation PASS: 3 studio routes, shared game scene, safe relative URLs and mode controls");

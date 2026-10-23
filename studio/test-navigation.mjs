import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=rel=>readFileSync(new URL(rel,import.meta.url),"utf8");
const home=read("./index.html");
const oldObjectLab=read("../lab/index.html");
const catalog=read("./catalog.html");
const play=read("../play-lab/index.html");
const game=read("../play-lab/game.js");
const studio=read("../play-lab/studio.js");
new Script(game.replace(/^import[^\n]*\n/gm,""),{filename:"game.js"});
new Script(studio.replace(/^export /gm,""),{filename:"studio.js"});
const links=[...home.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
for(const target of [
 "./catalog.html",
 "../play-lab/index.html?mode=lab",
 "../play-lab/index.html?mode=game"
])assert.ok(links.includes(target),"developer studio route "+target+" missing");
assert.match(home,/<h2>Каталог объектов<\/h2>/);
assert.doesNotMatch(home,/<h2>Лаборатория объектов<\/h2>/,
 "retired object hub must not appear as a primary Studio tile");
assert.equal([...home.matchAll(/class="card" href=/g)].length,3,
 "studio must have exactly three primary entries");
assert.equal([...home.matchAll(/href="\.\/catalog\.html"/g)].length,1,
 "catalog must appear once, not as a duplicate banner");
assert.match(oldObjectLab,/window\.location\.replace\(catalogUrl\.href\)/);
assert.match(oldObjectLab,/href="\.\.\/studio\/catalog\.html"/);
assert.match(catalog,/href="\.\/catalog\.html"/);
assert.doesNotMatch(catalog,/href="\.\.\/lab\/index\.html"/);

assert.match(home,/Лаборатория игры/);
assert.match(home,/Играть/);
assert.match(home,/href="\.\/catalog\.html"/);
assert.match(play,/href="\.\.\/studio\/catalog\.html"/);
assert.match(play,/href="\.\.\/studio\/catalog\.html"/);
assert.match(home,/<meta name="viewport"/);
assert.match(home,/env\(safe-area-inset-bottom\)/);
assert.ok(!links.some(x=>x.startsWith("http")),
 "relative links must stay within pinned commit on rawcdn.githack");
assert.match(catalog,/href="\.\/index\.html"/);
assert.match(catalog,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(catalog,/href="\.\.\/play-lab\/index\.html\?mode=game"/);
assert.match(play,/id="devtools"/);
assert.match(play,/id="mode-toggle"/);
assert.match(play,/href="\.\.\/studio\/index\.html"/);
assert.doesNotMatch(play,/href="\.\.\/lab\/index\.html"/);
assert.match(studio,/window\.history\.pushState/);
assert.match(studio,/window\.addEventListener\("popstate"/);
assert.match(studio,/n\.panel\.hidden=!lab/);
assert.match(studio,/if\(!lab\)this\.setCollisions\(false\)/);
assert.match(studio,/if\(this\.mode!==MODES\.LAB\)return/);
assert.match(game,/const studio=new DeveloperStudio\(/);
assert.match(game,/studio\.update\(\{fps:measuredFps,state\}\)/);
assert.doesNotMatch(game,/new DeveloperStudio[\s\S]*new THREE\.Scene\(/,
 "mode controller cannot initialize its own second scene");
console.log("MINI CITY 4.2.5 navigation PASS: catalog replaces old lab, legacy redirect, 3 studio routes, shared game scene, safe relative URLs and mode controls");

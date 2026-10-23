import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const legacy=read("./index.html"),house=read("../building-lab/index.html");
const actor=read("../character-lab/index.html"),catalog=read("../studio/catalog.html");
const normalizedLink=(source,target)=>new URL(target,source).pathname;
const checkViewerLinks=(html,current,other,folder)=>{
 assert.match(html,/<nav class="object-switch" aria-label="Выбор объекта лаборатории">/);
 assert.ok(html.includes('href="'+current+'" aria-current="page"'));
 assert.ok(html.includes('href="'+other+'"'));
 assert.ok(html.includes('href="'+folder+'"'));
 assert.ok(html.includes('href="../studio/index.html"'));
 assert.ok(html.includes('href="../play-lab/index.html?mode=lab"'));
};
checkViewerLinks(house,"./index.html","../character-lab/index.html",
 "../studio/catalog.html?category=building");
checkViewerLinks(actor,"./index.html","../building-lab/index.html",
 "../studio/catalog.html?category=character");
assert.match(legacy,/window\.location\.replace\(catalogUrl\.href\)/);
assert.match(legacy,/new URL\("\.\.\/studio\/catalog\.html",window\.location\.href\)/);
assert.match(legacy,/http-equiv="refresh"/);
assert.match(legacy,/href="\.\.\/studio\/catalog\.html"/);
assert.match(catalog,/id="folder-section"/);
assert.match(catalog,/id="object-section"/);
assert.equal(normalizedLink("https://example.test/SHA/lab/index.html",
 "../studio/catalog.html"),"/SHA/studio/catalog.html");
assert.equal(normalizedLink("https://example.test/SHA/building-lab/index.html",
 "../studio/catalog.html?category=building"),"/SHA/studio/catalog.html");
assert.equal(normalizedLink("https://example.test/SHA/character-lab/index.html",
 "../studio/catalog.html?category=character"),"/SHA/studio/catalog.html");
assert.ok(!house.includes('target="_blank"')&&!actor.includes('target="_blank"'));
assert.match(house,/id="export-glb"/);
console.log("Legacy object lab route and direct model viewers PASS: redirect, catalog folders, 3D viewers and export intact");

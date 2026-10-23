import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const hub=read("./index.html"),house=read("../building-lab/index.html");
const actor=read("../character-lab/index.html");
const normalizedLink=(source,target)=>{
  const [,folder,file]="lab/index.html".split("/");
  const path=new URL(target,new URL(source,"https://mini.city/"));
  return path.pathname;
};
const checkLinks=(html,home,current,other)=>{
  assert.match(html,/<nav class="object-switch" aria-label="Выбор объекта лаборатории">/);
  const anchors=[...html.matchAll(/<a href="([^"]+)"(?: aria-current="page")?>/g)]
    .map(m=>({href:m[1],self:m[0].includes('aria-current="page"')}));
  assert.ok(anchors.some(a=>a.href===current&&a.self),
    "current object must be explicitly marked for screen readers");
  assert.ok(anchors.some(a=>a.href===other&&!a.self),
    "navigation to the other scene must be available");
  assert.ok(html.includes("pointer-events:auto"),"navigation must accept taps");
  assert.ok(html.includes('aria-label="Выбор объекта лаборатории"'));
};
checkLinks(house,"../lab/index.html","./index.html","../character-lab/index.html");
checkLinks(actor,"../lab/index.html","./index.html","../building-lab/index.html");
for(const target of ["../building-lab/index.html","../character-lab/index.html",
 "../play-lab/index.html?mode=lab","../play-lab/index.html?mode=game","../studio/index.html"])
  assert.ok(hub.includes('href="'+target+'"'),"lab hub missing link: "+target);
assert.equal(normalizedLink("https://x.test/commit/building-lab/index.html",
  "../character-lab/index.html"),"/commit/character-lab/index.html");
assert.equal(normalizedLink("https://x.test/commit/character-lab/index.html",
  "../building-lab/index.html"),"/commit/building-lab/index.html");
assert.equal(normalizedLink("https://x.test/commit/lab/index.html",
  "../building-lab/index.html"),"/commit/building-lab/index.html");
assert.ok(!hub.includes('target="_blank"'),"switch without opening new Safari tab");
assert.ok(!house.includes('target="_blank"')&&!actor.includes('target="_blank"'));
assert.match(house,/id="export-glb"/);
assert.ok(house.includes('href="../play-lab/index.html?mode=lab"'));
assert.ok(actor.includes('href="../play-lab/index.html?mode=lab"'));
assert.ok(house.includes('href="../studio/index.html"'));
assert.ok(actor.includes('href="../studio/index.html"'));
console.log("Cross-lab object selector PASS: hub, house -> character, character -> house, pinned commit-safe relative URLs");

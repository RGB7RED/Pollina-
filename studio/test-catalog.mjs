import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const html=read("./catalog.html"),js=read("./catalog.js");
const registry=read("../models/catalog-utils.js");
const source=JSON.parse(read("../models/catalog.json"));
new Script(js.replace(/import[\s\S]*?from "[^"]+";\n/,"")
  .replace(/^export /gm,""),{filename:"catalog.js"});
new Script(registry.replace(/^export /gm,""),{filename:"catalog-utils.js"});
for(const id of ["catalog-search","catalog-category","catalog-status","catalog-list",
  "results-count","catalog-empty","catalog-error","catalog-error-text",
  "catalog-retry","metric-total","metric-approved","metric-testing","metric-development"]){
  assert.match(html,new RegExp('id="'+id+'"'),"catalog UI missing "+id);
}
assert.match(html,/name="viewport"/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/href="\.\/index\.html"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=game"/);
assert.match(html,/type="module" src="\.\/catalog\.js"/);
assert.match(js,/from "\.\.\/models\/catalog-utils\.js"/);
assert.match(js,/fetch\("\.\.\/models\/catalog\.json"/);
assert.match(js,/validateCatalog\(await response\.json\(\)\)/);
assert.match(js,/filterCatalog\(catalog/);
assert.match(js,/renderCatalog/);
assert.match(js,/replaceChildren\(fragment\)/);
assert.match(js,/addEventListener\("input",renderCatalog\)/);
assert.match(js,/addEventListener\("change",renderCatalog\)/);
assert.match(js,/addEventListener\("click",loadCatalog\)/);
assert.match(js,/\.textContent=/);
assert.doesNotMatch(js,/\.innerHTML\s*=/,
  "user-facing content must use textContent, not HTML injection");
assert.ok(source.entries.every(e=>typeof e.viewerLabel==="string"&&e.viewerLabel.length>0));
assert.match(html,/Принято ≠ готово к релизу/);
console.log("MINI CITY 4.2.3 catalog UI PASS: mobile filters, verified import, safe text rendering, retry and real navigation");

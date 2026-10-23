import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const html=read("./catalog.html"),js=read("./catalog.js");
const registry=read("../models/catalog-utils.js");
const data=JSON.parse(read("../models/catalog.json"));
new Script(js.replace(/import[\s\S]*?from "[^"]+";\n/,"")
  .replace(/^export /gm,""),{filename:"catalog.js"});
new Script(registry.replace(/^export /gm,""),{filename:"catalog-utils.js"});
assert.equal(data.schemaVersion,2);
for(const id of ["folder-section","folder-list","folder-count","object-section",
 "folder-title","folder-summary","folder-back","folder-path",
 "catalog-search","catalog-status","catalog-list","results-count",
 "catalog-empty","catalog-error","catalog-error-text","catalog-retry",
 "metric-total","metric-approved","metric-testing","metric-development"]){
 assert.match(html,new RegExp('id="'+id+'"'),"folder/object interface missing "+id);
}
assert.doesNotMatch(html,/id="catalog-category"/,"categories are navigable folders, not a flat select");
assert.match(html,/id="object-section"[^>]*hidden/);
assert.match(html,/name="viewport"/);
assert.match(html,/safe-area-inset-bottom/);
assert.match(html,/href="\.\/index\.html"/);
assert.match(html,/href="\.\/catalog\.html"/);
assert.doesNotMatch(html,/href="\.\.\/lab\/index\.html"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=lab"/);
assert.match(html,/href="\.\.\/play-lab\/index\.html\?mode=game"/);
assert.match(html,/type="module" src="\.\/catalog\.js"/);
assert.match(js,/from "\.\.\/models\/catalog-utils\.js"/);
assert.match(js,/fetch\("\.\.\/models\/catalog\.json"/);
assert.match(js,/validateCatalog\(data\)/);
assert.match(js,/catalogFolders\(catalog\)/);
assert.match(js,/folderObjects\(catalog/);
assert.match(js,/modelLabel\(item\.modelNumber\)/);
assert.match(js,/updateUrl\(category\)/);
assert.match(js,/window\.history\.pushState\(/);
assert.match(js,/window\.addEventListener\("popstate"/);
assert.match(js,/\$\("folder-back"\)\.addEventListener\("click"/);
assert.match(js,/addEventListener\("input",renderCatalog\)/);
assert.match(js,/addEventListener\("change",renderCatalog\)/);
assert.match(js,/addEventListener\("click",loadCatalog\)/);
assert.match(js,/replaceChildren\(fragment\)/);
assert.doesNotMatch(js,/\.innerHTML\s*=/,
 "catalog must not render unsanitized HTML from JSON fields");
assert.ok(data.entries.every(e=>Number.isInteger(e.modelNumber)));
assert.match(html,/пронумерованные модели/i);
console.log("MINI CITY 4.2.4 catalog structure PASS: folders, numbered models, browser history and safe rendering");

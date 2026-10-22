import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../game.js", import.meta.url), "utf8");

assert.match(html, /<script\s+type="module"\s+src="\.\/game\.js"><\/script>/);
assert.match(html, /"three":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/build\/three\.module\.js"/);
assert.match(html, /<meta name="viewport"/);
assert.match(html, /id="joystick"/);
assert.match(html, /id="minimap"/);
assert.match(html, /id="start"/);
const ids = ["screen","ui","quest-line","quest-fill","toast","joystick","stick","btn-action","btn-jump","btn-run","btn-time","btn-sound","interact-hint","minimap","start","welcome"];
for (const id of ids) {
  assert.ok(html.includes('id="' + id + '"'), "missing DOM element: " + id);
  assert.ok(js.includes('$("' + id + '")'), "JS missing element reference: " + id);
}
const withoutImport = js.replace(/^import \* as THREE from "three";\s*/, "");
new Script(withoutImport, { filename: "game.js" });
assert.match(js, /function blocked\(x,z\)/);
assert.match(js, /function followCamera\(dt\)/);
assert.match(js, /function setTime\(index\)/);
assert.match(js, /function jump\(\)/);
assert.match(js, /function lookForPlaces\(\)/);
assert.match(js, /function startAudio\(\)/);
assert.match(js, /window\.cityReady=true/);
console.log("Mini City static smoke checks: OK");

import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const district = readFileSync(new URL("../district.js", import.meta.url), "utf8");

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
const withoutImport = js.replace(/^import[^\n]*\n/gm, "");
new Script(withoutImport, { filename: "game.js" });
new Script(district.replace(/^export /gm, ""), { filename: "district.js" });
assert.match(js, /function blocked\(x,z\)/);
assert.match(js, /function followCamera\(dt\)/);
assert.match(js, /function setTime\(index\)/);
assert.match(js, /function jump\(\)/);
assert.match(js, /function lookForPlaces\(\)/);
assert.match(js, /function startAudio\(\)/);
assert.match(js, /window\.cityReady=true/);
assert.match(js, /import \{ buildDistrictBuildings, buildDistrictProps, decorateCentralBlocks \} from "\.\/district\.js"/);
assert.match(js, /buildDistrictBuildings\(\{/);
assert.match(js, /flushDecorationBoxes\(\)/);
assert.match(js, /function minimap\(\)/);
assert.match(js, /renderScale/);
assert.match(js, /pinch\.zoom/);
assert.match(js, /smoothVelocity/);
assert.match(html, /id="fps-counter"/);
assert.match(district, /export function buildDistrictBuildings/);
assert.match(district, /export function decorateCentralBlocks/);
assert.match(district, /export function buildDistrictProps/);
console.log("Mini City static smoke checks: OK");

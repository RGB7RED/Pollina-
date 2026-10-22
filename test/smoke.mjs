import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const district = readFileSync(new URL("../district.js", import.meta.url), "utf8");
const interiors = readFileSync(new URL("../interiors.js", import.meta.url), "utf8");

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
new Script(interiors.replace(/^export /gm, ""), { filename: "interiors.js" });
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
assert.match(html, /MINI CITY · 0\.3/);
assert.match(html, /id="zone-name"/);
assert.match(html, /id="entrance-progress"/);
assert.match(js, /from "\.\/interiors\.js"/);
assert.match(js, /buildInteriors\(\{/);
assert.match(js, /function enterLobby\(room\)/);
assert.match(js, /function exitLobby\(\)/);
assert.match(js, /case "mailboxes"/);
assert.match(js, /case "sit"/);
assert.match(js, /case "stand"/);
assert.match(js, /avatar\.inLobby/);
assert.match(js, /n\.role==="rest"/);
assert.match(interiors, /export const ENTRANCES/);
assert.match(interiors, /export function nearIndoorObject/);
assert.match(interiors, /export function indoorBlocked/);
assert.match(interiors, /export function buildInteriors/);
assert.match(html,/MINI CITY · 0\.2\.1/);
assert.match(html,/id="perf-info"/);
assert.doesNotMatch(html,/<div id="rotate">/);
assert.match(js,/const flatBatches=new Map\(\)/);
assert.match(js,/function flushFlats\(\)/);
assert.match(js,/flushFlats\(\)/);
assert.match(js,/mesh\.computeBoundingSphere\(\)/);
assert.match(js,/function refreshStreetLights\(\)/);
assert.match(js,/closest\.slice\(0,4\)/);
assert.match(js,/treeGroups/);
assert.match(js,/streetProps/);
assert.match(js,/renderer\.info\.render\.calls/);
assert.match(js,/sun\.target\.position\.set\(avatar\.x,0,avatar\.z\)/);
// Regression guard: the road stripes/sidewalks should not fall back to
// individual Mesh allocations as the map grows.
assert.doesNotMatch(js,/function flat\([^)]*\)\s*\{\s*return box\(/);

assert.match(html, /id="fps-counter"/);
assert.match(district, /export function buildDistrictBuildings/);
assert.match(district, /export function decorateCentralBlocks/);
assert.match(district, /export function buildDistrictProps/);
console.log("Mini City static smoke checks: OK");

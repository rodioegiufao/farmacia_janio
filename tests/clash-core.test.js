import assert from "node:assert/strict";
import { adjacentClashIndex, filterClashResults, normalizeIfcClashResults, resolveIfcGuidToSceneObjectId, serializeClashViewpoint, transformClashPointToViewerCoordinates } from "../3D/viewer/features/clash/clash-core.js";

const [clash] = normalizeIfcClashResults({ clashes: [{ id: "c1", a: { model_id: "EST", GlobalId: "3ABC", ifc_class: "IfcBeam", Name: "Viga V35" }, b: { modelId: "HID", guid: "2XYZ", type: "IfcPipeSegment", name: "PVC 75" }, point: [1, 2, 3], penetration: 0.032 }] }, { setA: "Estrutura", setB: "Hidráulica" });
assert.equal(clash.source, "ifcclash");
assert.equal(clash.objectA.guid, "3ABC");
assert.equal(clash.distance, 0.032);
assert.equal(clash.status, "new");

assert.equal(resolveIfcGuidToSceneObjectId("3ABC", "EST", { objects: { "EST#3ABC": {} } }), "EST#3ABC");
assert.equal(resolveIfcGuidToSceneObjectId("3ABC", "EST", { objects: { "other.3abc": {} } }), "other.3abc");
assert.deepEqual(transformClashPointToViewerCoordinates([1, 0, 0], { rotation: [0, 90, 0], position: [10, 2, 3] }).map((n) => Math.round(n)), [10, 2, 2]);
assert.equal(adjacentClashIndex(0, 3, -1), 2);
assert.equal(adjacentClashIndex(2, 3, 1), 0);
assert.equal(filterClashResults([clash], { query: "viga", statuses: ["new"] }).length, 1);
clash.status = "resolved";
assert.equal(filterClashResults([clash], { statuses: ["new"] }).length, 0);
assert.deepEqual(serializeClashViewpoint(clash, { perspective_camera: {} }).guids, ["3ABC", "2XYZ"]);
console.log("Clash core: 10 assertions passed");
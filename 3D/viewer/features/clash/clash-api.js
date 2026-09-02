import { normalizeIfcClashResults } from "./clash-core.js";

export async function runIfcClashAnalysis({ setA, setB, tolerance = 0.01, mode = "intersection", signal }) {
    const response = await fetch("/api/clash", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setA, setB, tolerance, mode }),
        signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `IfcClash respondeu HTTP ${response.status}.`);
    return normalizeIfcClashResults(payload.results ?? payload, {
        setA: setA.label, setB: setB.label, modelA: setA.modelId, modelB: setB.modelId
    });
}
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const bootstrap = read("3D/app.js");
const publicViewer = read("3D/viewer/viewer-public.js");
const core = read("3D/viewer/viewer-core.js");
const authenticated = read("3D/viewer/viewer-authenticated.js");

assert.match(bootstrap, /fetch\("\/api\/auth"/);
assert.ok(bootstrap.indexOf("/api/auth") < bootstrap.indexOf("viewer-authenticated.js"));
assert.match(publicViewer, /class="public-viewer-login"/);
assert.match(publicViewer, /class="public-login-modal"/);
assert.match(publicViewer, /method: "POST"/);
assert.match(publicViewer, /window\.location\.reload\(\)/);
assert.doesNotMatch(publicViewer + core, /xlsx|base_de_dados|excel-export|materials|collision|budget/i);
assert.doesNotMatch(authenticated, /^loadExplicitLinearMaterialsFromExcel\(\);/m);
assert.strictEqual((core.match(/xeokit-sdk@2\.6\.107/g) || []).length, 1);
assert.match(core, /getProjectConfig\(projectKey, "public"\)/);
assert.match(authenticated, /getProjectConfig\(projectFromDataset, "authenticated"\)/);
assert.doesNotMatch(authenticated, /const (?:IPER|FARMACIA|POLICLINICA|CANAA)_MODELS/);
assert.doesNotMatch(authenticated, /const PROJECT_CONFIGS/);

for (const html of fs.readdirSync(path.join(root, "3D")).filter((name) => name.endsWith(".html"))) {
    const contents = read(`3D/${html}`);
    assert.doesNotMatch(contents, /<script[^>]+xeokit-sdk/i, `${html} imports xeokit redundantly`);
    if (contents.includes('/3D/app.js')) {
        assert.doesNotMatch(contents, /xlsx\.full|min\.js.*jspdf|user-badge\.js|pyodide\.js|ifc_upload\.js/i,
            `${html} eagerly loads an authenticated dependency`);
    }
}
console.log("viewer loading architecture: ok");
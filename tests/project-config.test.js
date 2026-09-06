const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function loadProjectConfig() {
    const source = fs.readFileSync(path.join(__dirname, "../3D/viewer/project-config.js"), "utf8");
    return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

(async () => {
    const { PROJECT_CONFIGS, getProjectConfig, hasProjectConfig } = await loadProjectConfig();

    for (const projectKey of ["iper", "lacen", "farmacia", "policlinica", "esc_canaa"]) {
        assert.ok(hasProjectConfig(projectKey), `${projectKey} deve existir`);
        for (const mode of ["public", "authenticated"]) {
            const config = getProjectConfig(projectKey, mode);
            assert.ok(config.models.length > 0, `${projectKey}/${mode} deve possuir modelos`);
            assert.deepStrictEqual(Object.keys(config.transforms), config.models.map(({ id }) => id));
        }
    }
    const psbConfig = getProjectConfig("psb", "public");
    assert.strictEqual(psbConfig.name, "Posto São Bento");
    assert.strictEqual(psbConfig.models.length, 11);
    assert.ok(psbConfig.models.every(({ src }) => src.startsWith("/3D/psb/") && src.endsWith(".xkt")));
    const definition = PROJECT_CONFIGS.iper.models.IFC_ARQ;
    const snapshot = structuredClone(definition);
    try {
        definition.src = "/common.xkt";
        definition.transform = { position: [1, 2, 3], rotation: [4, 5, 6] };
        definition.public = {
            enabled: false,
            src: "/public.xkt",
            transform: { position: [0, 0, 0] }
        };
        definition.authenticated = {
            enabled: true,
            src: "/authenticated.xkt",
            transform: { rotation: [0, 90, 0] }
        };

        const publicConfig = getProjectConfig("iper", "public");
        assert.ok(!publicConfig.models.some(({ id }) => id === "IFC_ARQ"), "desabilitado não entra na fila pública");

        const authenticatedConfig = getProjectConfig("iper", "authenticated");
        const authenticatedModel = authenticatedConfig.models.find(({ id }) => id === "IFC_ARQ");
        assert.strictEqual(authenticatedModel.src, "/authenticated.xkt");
        assert.deepStrictEqual(authenticatedConfig.transforms.IFC_ARQ, {
            position: [1, 2, 3],
            rotation: [0, 90, 0]
        });

        definition.public.enabled = true;
        definition.authenticated.enabled = false;
        assert.strictEqual(getProjectConfig("iper", "public").models.find(({ id }) => id === "IFC_ARQ").src, "/public.xkt");
        assert.ok(!getProjectConfig("iper", "authenticated").models.some(({ id }) => id === "IFC_ARQ"));
    } finally {
        PROJECT_CONFIGS.iper.models.IFC_ARQ = snapshot;
    }

    const fallback = getProjectConfig("projeto-inexistente", "public");
    assert.strictEqual(fallback.name, "LACEN");
    console.log("project config contexts: ok");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
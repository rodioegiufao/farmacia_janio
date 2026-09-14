"use strict";

const assert = require("node:assert/strict");
const { supabaseRequest } = require("../api/_auth");

process.env.SUPABASE_URL = "  https://example.supabase.co/rest/v1/  ";
process.env.SUPABASE_SERVICE_ROLE_KEY = "  service-role-key  ";

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof payload === "string" ? payload : JSON.stringify(payload)
  };
}

async function main() {
  const originalFetch = global.fetch;
  try {
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return calls.length < 3 ? response(502, "Bad Gateway") : response(200, [{ id: 1 }]);
    };

    assert.deepEqual(await supabaseRequest("atividades", "?select=id"), [{ id: 1 }]);
    assert.equal(calls.length, 3, "GET deve repetir falhas temporárias do gateway");
    assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/atividades?select=id");
    assert.equal(calls[0].options.headers.apikey, "service-role-key", "a chave deve ser enviada sem espaços acidentais");

    let postCalls = 0;
    global.fetch = async () => { postCalls += 1; return response(502, "Bad Gateway"); };
    await assert.rejects(
      supabaseRequest("atividades", "", { method: "POST", body: "{}" }),
      (error) => error.statusCode === 503 && error.upstreamStatus === 502
    );
    assert.equal(postCalls, 1, "escritas não devem ser repetidas para evitar duplicidade");

    global.fetch = async () => response(502, "Failed to get API key info");
    await assert.rejects(
      supabaseRequest("atividades", "", { method: "POST", body: "{}" }),
      (error) => error.statusCode === 503 && /SUPABASE_SERVICE_ROLE_KEY/.test(error.message)
    );
  } finally {
    global.fetch = originalFetch;
  }

  console.log("supabase resilience: ok");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
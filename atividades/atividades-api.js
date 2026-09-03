(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATIVIDADES_API = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().then((text) => text ? { mensagem: text } : null);
    if (!response.ok) {
      throw new Error(data?.mensagem || data?.message || data?.erro || data?.error || `Erro HTTP ${response.status}`);
    }
    return data;
  }

  function request(url, { method = "GET", body, headers = {} } = {}) {
    return fetch(url, {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    }).then(parseResponse);
  }

  return {
    parseResponse,
    get: (url) => request(url),
    post: (url, body) => request(url, { method: "POST", body }),
    put: (url, body) => request(url, { method: "PUT", body }),
    patch: (url, body) => request(url, { method: "PATCH", body }),
    delete: (url) => request(url, { method: "DELETE" }),
    request
  };
});
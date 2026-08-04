(function inicializarLogoReferenceStore() {
    const DB_NAME = 'carimbo_logos_referencia_db';
    const STORE = 'logos';
    const VERSION = 1;

    function abrirBancoLogos() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function transacao(mode, fn) {
        const db = await abrirBancoLogos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const store = tx.objectStore(STORE);
            const result = fn(store);
            tx.oncomplete = () => { db.close(); resolve(result?.result ?? result); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    function salvarLogoReferencia(logo) {
        return transacao('readwrite', store => store.put({ ...logo, origem: logo.origem || 'indexeddb', atualizado_em: new Date().toISOString() }));
    }

    function listarLogosReferencia() {
        return transacao('readonly', store => store.getAll()).then(items => Array.isArray(items) ? items : []);
    }

    function removerLogoReferencia(id) {
        return transacao('readwrite', store => store.delete(id));
    }

    function removerTodasLogosReferencia() {
        return transacao('readwrite', store => store.clear());
    }

    window.LogoReferenceStore = { abrirBancoLogos, salvarLogoReferencia, listarLogosReferencia, removerLogoReferencia, removerTodasLogosReferencia };
    window.abrirBancoLogos = abrirBancoLogos;
    window.salvarLogoReferencia = salvarLogoReferencia;
    window.listarLogosReferencia = listarLogosReferencia;
    window.removerLogoReferencia = removerLogoReferencia;
    window.removerTodasLogosReferencia = removerTodasLogosReferencia;
})();
// Configurações fixas do sistema - Baseado no código Python
window.ENGENHEIROS_CREAS_FIXOS = {
    "RODRIGO DAMASCENO NASCIMENTO": ["0920192912", "092019291-2"],
    "JÂNIO RIBEIRO LOPES": ["0912111810", "091211181-0"],
    "FLAVIO SORDI": ["2201136580"],
    "RITHELLY LOBATO": ["A278773-3", "A2787733"],
    "SALOMÃO": ["0401863549", "040186354-9"]
};

window.MAPEAMENTO_PROJETOS = {
    "ARQ": "ARQUITETÔNICO",
    "ELE": "PROJETO ELÉTRICO DE BAIXA TENSÃO",
    "ECX": "PROJETO ELÉTRICO DE EXAUSTÃO E CLIMATIZAÇÃO",
    "ECLI": "PROJETO ELÉTRICO DE CLIMATIZAÇÃO",
    "ILUX": "PROJETO DE ILUMINAÇÃO EXTERNA",
    "CFTV": "PROJETO DE CFTV",
    "CAB": "PROJETO DE CABEAMENTO",
    "SOM": "PROJETO DE SONORIZAÇÃO",
    "SUB": "PROJETO DE SUBESTAÇÃO",
    "SPDA": "PROJETO DE SPDA",
    "TEF": "PROJETO DE TELEFONIA",
    "ALI": "PROJETO DE ALIMENTADORES",
    "TUG": "PROJETO ELÉTRICO DE TOMADAS",
    "ILU": "PROJETO ELÉTRICO DE ILUMINAÇÃO",
    "EME": "PROJETO ELÉTRICO DE EMERGÊNCIA",
    "FOT": "PROJETO ELÉTRICO FOTOVOLTAICO",
    "LEV": "LEVANTAMENTO TOPOGRÁFICO",
    "EST": "ESTRUTURA DE CONCRETO ARMADO",
    "FUN": "ESTRUTURA DE CONCRETO ARMADO", 
    "EMT": "ESTRUTURA METÁLICA",
    "DRE": "PROJETO DE DRENAGEM",
    "PAV": "PROJETO DE PAVIMENTAÇÃO",
    "REG": "PROJETO DE REDE DE ESGOTO",
    "TER": "PROJETO DE TERRAPLENAGEM",
    "CANT": "PROJETO DE CANTEIRO DE OBRAS",
    "HID": "PROJETO DE INSTALAÇÕES HIDRÁULICAS",
    "IRRI": "PROJETO DE IRRIGAÇÃO",
    "SAN": "PROJETO DE INSTALAÇÕES SANITÁRIAS",
    "PLU": "PROJETO DE INSTALAÇÕES DE ÁGUAS PLUVIAIS",
    "INC": "PROJETO DE PREVENÇÃO E COMBATE A INCÊNDIO",
    "GLP": "PROJETO DE INSTALAÇÕES DE GASES GLP",
    "CLI": "PROJETO DE CLIMATIZAÇÃO",
    "EXA": "PROJETO DE EXAUSTÃO",
    "EEXA": "PROJETO ELÉTRICO DE EXAUSTÃO",
    "SDAI": "PROJETO DE SISTEMA DE DETECÇÃO",
};

// Termos de busca no PDF (permite exibição diferente sem afetar validação)
window.MAPEAMENTO_BUSCA_PROJETOS = {
    "ARQ": "ARQUITETÔNICO",
    "ELE": "PROJETO ELÉTRICO DE BAIXA TENSÃO",
    "ECX": "PROJETO ELÉTRICO DE EXAUSTÃO E",
    "GLP": "GASES GLP",
    "PLU": "ÁGUAS PLUVIAIS",
    "INC": "COMBATE A INCÊNDIO",
    "HID": "HIDRÁULICAS",
};

window.REGRAS_COMPATIBILIDADE_DISCIPLINA = {
    ILU: {
        obrigatorios: ["ILUMINACAO", "LUMINARIA", "INTERRUPTOR", "PONTO DE LUZ"],
        suspeitos: ["TOMADA", "TUG", "TUE", "2P+T", "TOMADA BAIXA", "TOMADA MEDIA"]
    },
    TUG: {
        obrigatorios: ["TOMADA", "TUG", "TUE", "2P+T"],
        suspeitos: ["LUMINARIA", "ILUMINACAO", "INTERRUPTOR", "PONTO DE LUZ"]
    },
    CFTV: {
        obrigatorios: ["CFTV", "CAMERA", "NVR", "DVR"],
        suspeitos: ["TOMADA", "LUMINARIA", "INTERRUPTOR", "TELEFONIA"]
    },
    CAB: {
        obrigatorios: ["CABEAMENTO", "DADOS", "RACK", "PATCH PANEL"],
        suspeitos: ["LUMINARIA", "TUG", "CAMERA", "TELEFONIA"]
    },
    TEF: {
        obrigatorios: ["TELEFONIA", "VOZ", "TELEFONE", "PABX"],
        suspeitos: ["LUMINARIA", "TUG", "CAMERA", "CFTV"]
    }
};

window.PALAVRAS_CHAVE_PADRAO = [
    "CONSTRUÇÃO DE UMA CRECHE E PRÉ-ESCOLAR PADRÃO FNDE TIPO 1 - PROINFÂNCIA NO BAIRRO NOVA CANAÃ, ",
    "NO MUNICÍPIO DE BOA VISTA/RR",
    "RUA CALEBE (ENTRE RUA HEBRON E RUA QUEILA), S/Nº, BAIRRO NOVA CANAÃ, BOA VISTA, RORAIMA, CEP",
    "69.314-402",
    "Rua: Gavião, n° 289, Jóquei Clube",
    "CEP: 69.313-028 - Boa Vista/RR",
    "PREFEITURA MUNICIPAL DE BOA VISTA", 
    "SECRETARIA MUNICIPAL DE EDUCAÇÃO E CULTURA (SMEC)",
    "Rua: General Penha Brasil,",
    "nº 705, São Francisco. ",
    "CEP: 69305-130 - Boa Vista/RR",
    "FEVEREIRO / 2026",
    "4.520,24",
    "1.527,88",
    "2.434,62",
    "1.182,87"
];

// Criar lista FIXA de palavras-chave dos engenheiros (sempre serão pesquisadas)
window.PALAVRAS_CHAVE_ENGENHEIROS = (() => {
    const palavras = [];
    for (const [engenheiro, creas] of Object.entries(window.ENGENHEIROS_CREAS_FIXOS)) {
        palavras.push(engenheiro);
        palavras.push(...creas);
    }
    return palavras;
})();

console.log('✅ Configurações carregadas:', {
    engenheiros: Object.keys(window.ENGENHEIROS_CREAS_FIXOS).length,
    projetos: Object.keys(window.MAPEAMENTO_PROJETOS).length,
    palavrasChave: window.PALAVRAS_CHAVE_ENGENHEIROS.length,
    regrasCompatibilidade: Object.keys(window.REGRAS_COMPATIBILIDADE_DISCIPLINA || {}).length
});


window.ROBOFLOW_PLANTAS_CONFIG = {
    enabled: true,
    useBackend: true,
    backendEndpoint: '/api/detect-plantas',
    publishableKey: 'rf_x8t9CtJKNVZN7hgVjTQemZ8NmHF3',
    apiKey: null,
    model: 'plantas-4eu8q',
    version: 2,
    confidenceMin: 0.55,
    analyzeAllPages: true,
    imageScale: 1.5,
    inferenceWidth: 1280,
    inferenceHeight: 1280,
    inferenceTimeoutMs: 30000,
    margemRecortePx: 20,
    minAreaDeteccao: 20000
};

window.ROBOFLOW_CONFIG = {
    enabled: true,
    // Em produção, manter true para não expor a chave privada no navegador.
    useBackend: true,
    // Endpoint do backend/proxy (Vercel Function).
    backendEndpoint: '/api/detect-comodos',
    publishableKey: 'rf_x8t9CtJKNVZN7hgVjTQemZ8NmHF3',
    // Mantida nula por segurança quando useBackend=true.
    apiKey: null,
    model: 'comodos',
    version: 9,
    confidenceMin: 0.45,
    analyzeAllPages: true,
    imageScale: 1,
    inferenceWidth: 640,
    inferenceHeight: 640,
    modelLoadTimeoutMs: 45000,
    inferenceTimeoutMs: 30000
};

window.ROBOFLOW_LUMINARIAS_CONFIG = {
    enabled: true,
    useBackend: true,
    backendEndpoint: '/api/detect-luminarias',
    publishableKey: 'rf_x8t9CtJKNVZN7hgVjTQemZ8NmHF3',
    apiKey: null,
    model: 'luminarias-n8sqb',
    version: 1,
    confidenceMin: 0.45,
    analyzeAllPages: true,
    inferenceWidth: 1280,
    inferenceHeight: 1280,
    inferenceTimeoutMs: 30000
};
window.LOGOS_REFERENCIA_CONFIG = {
    enabled: true,
    debug: true,
    maxLogosPorPdf: 10,
    maxReferenciasCadastradas: 20,
    maxReferenceFileSizeMB: 5,
    minReferenceWidth: 32,
    minReferenceHeight: 32,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    directMatchThreshold: 0.82,
    templateThreshold: 0.86,
    secondBestMargin: 0.04,
    normalizedSize: 128,
    rotations: [0, 90, 180, 270],
    renderScale: 2.5,
    maxRenderDimension: 5000,
    maxRenderPixels: 16000000,
    templateScaleMin: 0.20,
    templateScaleMax: 1.20,
    templateScaleStep: 0.025,
    stampRegion: { xMin: 0.65, yMin: 0.55, xMax: 1.00, yMax: 1.00 },
    fullPageFallback: true,
    foregroundWhiteThreshold: 245,
    minForegroundRatio: 0.01,
    maxForegroundRatio: 0.70,
    minAspectSimilarity: 0.80,
    minCandidateForegroundRatio: 0.01,
    maxCandidateForegroundRatio: 0.80,
    maxDirectRelativeArea: 0.08,
    filtros: { minWidth: 32, minHeight: 32, minArea: 1500, maxRelativeArea: 0.08, maxAspectRatio: 8, maxTransparentRatio: 0.98, maxWhiteRatio: 0.99, maxBlackRatio: 0.985, minColorBuckets: 3 },
    pesos: { hash: 0.35, edge: 0.25, color: 0.25, aspect: 0.15 },
    fallback: { enabled: true },
    referencias: [
        { id: 'logo-referencia-1', src: 'carimbo/assets/logos/logo-referencia-1.png' },
        { id: 'logo-referencia-2', src: 'carimbo/assets/logos/logo-referencia-2.png' }
    ]
};
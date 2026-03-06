// Configurações fixas do sistema - Baseado no código Python
window.ENGENHEIROS_CREAS_FIXOS = {
    "RODRIGO DAMASCENO NASCIMENTO": ["0920192912", "092019291-2"],
    "JÂNIO RIBEIRO LOPES": ["0912111810", "091211181-0"],
    "FLAVIO SORDI": ["2201136580"],
    "RITHELLY LOBATO": ["A278773-3", "A2787733"],
    "SALOMÃO": ["0401863549", "040186354-9"]
};

window.MAPEAMENTO_PROJETOS = {
    "ECX": "PROJETO ELÉTRICO DE EXAUSTÃO E",
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
    "PLU": "PROJETO DE SISTEMA DE REDES DE ÁGUAS",
    "INC": "PROJETO DE PREVENÇÃO E COMBATE A INCÊNDIO",
    "GLP": "PROJETO DE INSTALAÇÕES DE GASES GLP",
    "CLI": "PROJETO DE CLIMATIZAÇÃO",
    "EXA": "PROJETO DE EXAUSTÃO",
    "EEXA": "PROJETO ELÉTRICO DE EXAUSTÃO",
    "SDAI": "PROJETO DE SISTEMA DE DETECÇÃO",
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
    palavrasChave: window.PALAVRAS_CHAVE_ENGENHEIROS.length
});






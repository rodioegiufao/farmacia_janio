const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./pdf-processor.js'), 'utf8');
const context = {
    window: {},
    console,
    setTimeout,
    clearTimeout
};
vm.runInNewContext(`${source}\nglobalThis.PDFProcessor = PDFProcessor;`, context);

const processor = new context.PDFProcessor();
const casos = new Map([
    ['PRJ-ILUX-PAVILHÃO-47-01-02.pdf', '01/02'],
    ['PRJ-ILUX-PAVILHÃO-47-02-02.pdf', '02/02'],
    ['PRJ-FOT-IPER-04-05_assinado.pdf', '04/05'],
    ['PRJ-ECX-IPER-02-07.pdf', '02/07'],
    ['PRJ-ARQ-BLOCO-03-12-120.pdf', '12/120'],
    ['PRJ-ARQ-PRÉDIO-12-003-015.pdf', '003/015'],
    ['PRJ-ARQ-SETOR-2026-01-02.pdf', '01/02'],
    ['PRJ-ARQ-PAVILHÃO-47.pdf', null],
    ['PRJ-ARQ-PAVILHÃO.pdf', null]
]);

for (const [nome, esperado] of casos) {
    assert.equal(processor.extrairNumeroPrancha(nome), esperado, nome);
}

// As comparações continuam numéricas, enquanto o valor apresentado preserva zeros.
assert.equal(processor.normalizarNumeroFolha('003/015'), '3/15');
assert.match('FOLHA 01/02', processor.criarRegexNumeroFolhaExato('01/02'));
assert.equal(processor.corrigirFolhaParcial('01/0', '01/02'), '1/2');
assert.equal(processor.validarFolhaContraEsperada('02/02', '02/02'), '2/2');

async function testarIntegracaoProcessamento() {
    context.window.MAPEAMENTO_PROJETOS = {};
    context.window.MAPEAMENTO_BUSCA_PROJETOS = {};
    context.window.PALAVRAS_CHAVE_ENGENHEIROS = [];

    const resultados = {};
    for (const folha of ['01', '02']) {
        const name = `PRJ-ILUX-PAVILHÃO-47-${folha}-02.pdf`;
        const texto = `PRJ-ILUX-PAVILHÃO-47-${folha}-02 FOLHA ${folha}/02`;
        processor.pdfjsLib = {
            getDocument: () => ({
                promise: Promise.resolve({
                    numPages: 1,
                    getPage: async () => ({
                        getTextContent: async () => ({
                            items: [{ str: texto }]
                        }),
                        getViewport: () => ({ width: 1189, height: 594 })
                    })
                })
            })
        };

        resultados[name] = await processor.processarPDF(
            { name, arrayBuffer: async () => new ArrayBuffer(0) },
            [],
            {
                checkFilename: true,
                checkSheetNumber: true,
                checkProjeto: false,
                checkComodos: false,
                checkLogos: false
            }
        );
        assert.equal(resultados[name].numero_prancha, `${folha}/02`);
        assert.equal(resultados[name].prancha_encontrada, true);
    }

    return resultados;
}

async function testarIntegracaoExcel(resultados) {
    const excelSource = fs.readFileSync(require.resolve('./excel-generator.js'), 'utf8');
    vm.runInNewContext(`${excelSource}\nglobalThis.ExcelGenerator = ExcelGenerator;`, context);
    const linhas = [];
    const ws = {
        addRow(values) {
            const cells = values.map(value => ({ value }));
            const row = {
                values,
                getCell: index => cells[index - 1],
                eachCell: callback => cells.forEach(callback)
            };
            linhas.push(row);
            return row;
        },
        getRow: index => linhas[index - 1],
        getColumn: () => ({}),
        eachRow: callback => linhas.forEach(callback)
    };
    const generator = new context.ExcelGenerator();
    generator.montarResultadosPDF({}, ws, resultados, 1);

    const headers = linhas[0].values;
    const indiceNumero = headers.indexOf('Número da Prancha');
    const indiceEncontrada = headers.indexOf('Prancha encontrada');
    assert.deepEqual(
        linhas.slice(1).map(row => row.values[indiceNumero]),
        ['01/02', '02/02']
    );
    assert.deepEqual(
        linhas.slice(1).map(row => row.values[indiceEncontrada]),
        ['Sim', 'Sim']
    );
}

(async () => {
    const resultados = await testarIntegracaoProcessamento();
    await testarIntegracaoExcel(resultados);
    console.log('Testes de numeração de prancha concluídos com sucesso.');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
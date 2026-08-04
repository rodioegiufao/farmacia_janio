// js/app.js - Aplicação Principal (CORRIGIDO)
class PDFAnalyzerApp {
    constructor() {
        console.log('📄 Criando PDFAnalyzerApp...');
        this.pdfProcessor = new PDFProcessor();
        this.excelGenerator = new ExcelGenerator();
        this.logoDetector = window.LogoDetector ? new LogoDetector() : null;
        this.uploadedFiles = [];
        this.resultados = {};
        this.init();
    }

    init() {
        console.log('🔧 Inicializando aplicação...');
        this.setupEventListeners();
        this.loadDefaultKeywords();
        this.populateStaticData();
        this.setupLogoReferences();
        // REMOVER: this.setupFileUpload() - não existe mais
        
        // Garantir que a aba correta esteja visível
        this.showTab('analisador');
        console.log('✅ Aplicação inicializada com sucesso');
    }

    setupEventListeners() {
        console.log('🔗 Configurando event listeners...');
        
        // Configurar abas
        this.setupTabs();
        
        // Configurar upload de arquivos
        this.setupFileUploadHandlers();
        
        // Configurar botão de análise
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.addEventListener('click', () => this.iniciarAnalise());
            console.log('✅ Botão de análise configurado');
        } else {
            console.error('❌ Botão de análise não encontrado!');
        }

        // Configurar botão de download
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => this.baixarExcel());
            console.log('✅ Botão de download configurado');
        }
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log(`📑 Encontradas ${tabButtons.length} abas`);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = button.getAttribute('data-tab');
                console.log(`🔄 Mudando para aba: ${targetTab}`);
                this.showTab(targetTab);
            });
        });
    }

    showTab(tabName) {
        console.log(`🎯 Mostrando aba: ${tabName}`);
        
        // Esconder todas as abas
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
            pane.style.display = 'none';
            pane.style.opacity = '0';
        });

        // Remover active de todos os botões
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar aba selecionada
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
            targetPane.style.display = 'block';
            
            setTimeout(() => {
                targetPane.style.opacity = '1';
            }, 10);
            
            console.log(`✅ Aba ${tabName} ativada`);
        } else {
            console.error(`❌ Aba ${tabName} não encontrada`);
        }

        // Ativar botão selecionado
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    setupFileUploadHandlers() {
        const fileInput = document.getElementById('pdfUpload');
        const uploadArea = document.getElementById('fileUploadArea');
        
        if (!fileInput || !uploadArea) {
            console.error('❌ Elementos de upload não encontrados');
            return;
        }
        
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileDrop(e);
        });
        
        console.log('✅ Upload de arquivos configurado');
    }

    handleFileSelect(event) {
        console.log('📁 Arquivos selecionados:', event.target.files);
        this.handleFiles(event.target.files);
    }

    handleFileDrop(event) {
        const files = event.dataTransfer.files;
        console.log('📁 Arquivos arrastados:', files);
        this.handleFiles(files);
    }

    handleFiles(files) {
        const fileList = document.getElementById('fileList');
        if (!fileList) {
            console.error('❌ fileList não encontrado');
            return;
        }
        
        const novosArquivos = Array.from(files).filter(file => {
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPDF) {
                console.warn(`⚠️ Arquivo ignorado (não é PDF): ${file.name}`);
            }
            return isPDF;
        });

        // Mantém os arquivos já adicionados e evita duplicatas
        const arquivosExistentes = new Set(
            this.uploadedFiles.map(file => `${file.name}-${file.size}-${file.lastModified}`)
        );

        novosArquivos.forEach(file => {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
            if (!arquivosExistentes.has(fileId)) {
                this.uploadedFiles.push(file);
                arquivosExistentes.add(fileId);
            }
        });
        
        console.log(`✅ ${this.uploadedFiles.length} arquivos PDF carregados`);

        if (novosArquivos.length === 0 && files.length > 0) {
            this.showError('Por favor, selecione arquivos PDF válidos.');
            return;
        }

        this.renderFileList();
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) {
            return;
        }

        fileList.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
                <button type="button" class="delete-file-button" data-file-index="${index}" title="Excluir PDF" aria-label="Excluir PDF ${file.name}">
                    🗑️
                </button>
            `;

            const deleteButton = fileItem.querySelector('.delete-file-button');
            deleteButton.addEventListener('click', () => this.removeFile(index));

            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        if (index < 0 || index >= this.uploadedFiles.length) {
            return;
        }

        const [removedFile] = this.uploadedFiles.splice(index, 1);
        console.log(`🗑️ Arquivo removido: ${removedFile.name}`);
        this.renderFileList();
    }

    loadDefaultKeywords() {
        const keywordsInput = document.getElementById('keywordsInput');
        if (keywordsInput && window.PALAVRAS_CHAVE_PADRAO) {
            keywordsInput.value = window.PALAVRAS_CHAVE_PADRAO.join('\n');
            console.log('✅ Palavras-chave padrão carregadas');
        }
    }

    populateStaticData() {
        this.populateEngineersData();
        this.populateProjectsData();
    }

    populateEngineersData() {
        const engineersDiv = document.getElementById('engenheiros');
        const engineersTable = document.getElementById('engineersTable');
        
        if (!window.ENGENHEIROS_CREAS_FIXOS) {
            console.error('❌ ENGENHEIROS_CREAS_FIXOS não definido');
            return;
        }
        
        let engineersHTML = '';
        let tableHTML = '';
        
        for (const [engenheiro, creas] of Object.entries(window.ENGENHEIROS_CREAS_FIXOS)) {
            engineersHTML += `<div class="engineer-item"><strong>${engenheiro}</strong>: ${creas.join(', ')}</div>`;
            tableHTML += `
                <tr>
                    <td>${engenheiro}</td>
                    <td>${creas.join(', ')}</td>
                </tr>
            `;
        }
        
        if (engineersDiv) engineersDiv.innerHTML = engineersHTML;
        if (engineersTable) engineersTable.innerHTML = tableHTML;
        
        console.log('✅ Dados dos engenheiros carregados');
    }

    populateProjectsData() {
        const projectsDiv = document.getElementById('projetos');
        const projectsTable = document.getElementById('projectsTable');
        
        if (!window.MAPEAMENTO_PROJETOS) {
            console.error('❌ MAPEAMENTO_PROJETOS não definido');
            return;
        }
        
        let projectsHTML = '';
        let tableHTML = '';
        
        for (const [codigo, descricao] of Object.entries(window.MAPEAMENTO_PROJETOS)) {
            projectsHTML += `<div class="project-item"><strong>${codigo}</strong>: ${descricao}</div>`;
            tableHTML += `
                <tr>
                    <td>${codigo}</td>
                    <td>${descricao}</td>
                </tr>
            `;
        }
        
        if (projectsDiv) projectsDiv.innerHTML = projectsHTML;
        if (projectsTable) projectsTable.innerHTML = tableHTML;
        
        console.log('✅ Dados dos projetos carregados');
    }

    async iniciarAnalise() {
        console.log('🔄 Iniciando análise...');
        console.log('Arquivos carregados:', this.uploadedFiles);
        
        if (this.uploadedFiles.length === 0) {
            console.error('❌ Nenhum arquivo selecionado');
            this.showError('Por favor, selecione pelo menos um arquivo PDF.');
            return;
        }

        this.showProgressArea();
        
        const keywordsInput = document.getElementById('keywordsInput');
        const palavrasChaveAdicionais = keywordsInput.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        const projectAreaInput = document.getElementById('projectAreaInput');
        const areaProjeto = projectAreaInput ? projectAreaInput.value.trim() : '';
        
        console.log('Palavras-chave adicionais:', palavrasChaveAdicionais);
        console.log('Área do projeto:', areaProjeto);
        
        const opcoes = {
            checkFilename: document.getElementById('checkFilename').checked,
            checkSheetNumber: document.getElementById('checkSheetNumber').checked,
            checkProjeto: document.getElementById('checkProjeto').checked,
            checkComodos: document.getElementById('checkComodos').checked,
            checkLogos: document.getElementById('checkLogos')?.checked ?? true
        };
        
        console.log('Opções:', opcoes);
        
        try {
            console.log('📊 Processando PDFs...');
            this.resultados = await this.pdfProcessor.processarMultiplosPDFs(
                this.uploadedFiles,
                palavrasChaveAdicionais,
                opcoes,
                (current, total, fileName) => this.updateProgress(current, total, fileName),
                areaProjeto
            );
            
            console.log('✅ Análise concluída. Resultados:', this.resultados);
            this.hideProgressArea();
            this.mostrarResultados();
            this.showSuccess('Análise concluída com sucesso! ✅');
            
        } catch (error) {
            console.error('❌ Erro durante a análise:', error);
            this.hideProgressArea();
            this.showError('Erro durante a análise: ' + error.message);
        }
    }

    mostrarResultados() {
        const resultsArea = document.getElementById('resultsArea');
        if (resultsArea) {
            resultsArea.classList.remove('hidden');
            
            // Mover o botão de download para o topo
            this.moverBotaoDownloadParaTopo();
            
            this.preencherTabelaResultados();
            this.atualizarEstatisticas();
            this.mostrarEngenheirosEncontrados();
            this.mostrarDetalhamentoProjetos();
            
            // Scroll para os resultados
            resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Novo método para mover o botão de download para o topo
    moverBotaoDownloadParaTopo() {
        const downloadSection = document.querySelector('.download-section');
        const resultsCard = document.querySelector('.results-card');
        
        if (downloadSection && resultsCard) {
            // Mover a seção de download para antes da primeira results-card
            resultsCard.parentNode.insertBefore(downloadSection, resultsCard);
        }
    }

    preencherTabelaResultados() {
        const tbody = document.getElementById('resultsBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        for (const [fileName, dados] of Object.entries(this.resultados)) {
            const row = document.createElement('tr');
            const analise = dados.analise_consistencia;
            const severidade = analise?.severidade || 'n/a';
            const classeConsistencia = severidade === 'ok'
                ? 'success'
                : (severidade === 'n/a' ? '' : 'error');
            const scoreConsistencia = analise ? `${analise.score}/100` : 'N/A';
            const alertasConsistencia = analise?.alertas?.length
                ? analise.alertas.join(' ')
                : 'Sem alertas';
            
            row.innerHTML = `
                <td>${dados.numero_prancha || 'Não identificado'}</td>
                <td>${dados.codigo_projeto || 'Não identificado'}</td>
                <td>${dados.descricao_projeto}</td>
                <td>${this.escapeHTML(dados.dados_carimbo.length > 0 ? dados.dados_carimbo.join(', ') : 'Nenhuma')}</td>
                <td>${this.renderLogosCell(dados.logos_detectadas)}</td>
                <td class="${dados.nome_arquivo_encontrado ? 'success' : 'error'}">
                    ${dados.nome_arquivo_encontrado ? 'Sim' : 'Não'}
                </td>
                <td class="${dados.prancha_encontrada ? 'success' : 'error'}">
                    ${dados.prancha_encontrada ? 'Sim' : 'Não'}
                </td>
                <td class="${dados.assinado_pelo_nome ? 'success' : 'error'}">
                    ${dados.assinado_pelo_nome ? 'Sim' : 'Não'}
                </td>
                <td class="${dados.projeto_encontrado ? 'success' : 'error'}">
                    ${dados.projeto_encontrado ? 'Sim' : 'Não'}
                </td>
                <td class="${classeConsistencia}">${severidade.toUpperCase()} (${scoreConsistencia})</td>
                <td title="${alertasConsistencia}">${alertasConsistencia}</td>
            `;
            
            tbody.appendChild(row);
        }
        this.setupLogoModalDelegation();
    }

    atualizarEstatisticas() {
        const results = Object.values(this.resultados);
        
        const elements = {
            totalFiles: document.getElementById('totalFiles'),
            filesWithName: document.getElementById('filesWithName'),
            filesWithSheet: document.getElementById('filesWithSheet'),
            filesSigned: document.getElementById('filesSigned'),
            projectsFound: document.getElementById('projectsFound')
        };
        
        if (elements.totalFiles) elements.totalFiles.textContent = results.length;
        if (elements.filesWithName) elements.filesWithName.textContent = results.filter(d => d.nome_arquivo_encontrado).length;
        if (elements.filesWithSheet) elements.filesWithSheet.textContent = results.filter(d => d.prancha_encontrada).length;
        if (elements.filesSigned) elements.filesSigned.textContent = results.filter(d => d.assinado_pelo_nome).length;
        if (elements.projectsFound) elements.projectsFound.textContent = results.filter(d => d.projeto_encontrado).length;
    }

    mostrarEngenheirosEncontrados() {
        const container = document.getElementById('engineersFound');
        if (!container) return;
        
        const engenheirosEncontrados = {};
        
        for (const dados of Object.values(this.resultados)) {
            for (const palavra of dados.dados_carimbo) {
                for (const [engenheiro, creas] of Object.entries(window.ENGENHEIROS_CREAS_FIXOS)) {
                    if (palavra === engenheiro || creas.includes(palavra)) {
                        engenheirosEncontrados[engenheiro] = (engenheirosEncontrados[engenheiro] || 0) + 1;
                    }
                }
            }
        }
        
        if (Object.keys(engenheirosEncontrados).length === 0) {
            container.innerHTML = '<div class="found-item">Nenhum engenheiro encontrado nos arquivos analisados</div>';
            return;
        }
        
        let html = '';
        for (const [engenheiro, count] of Object.entries(engenheirosEncontrados)) {
            html += `
                <div class="found-item">
                    <strong>${engenheiro}</strong>: encontrado ${count} veze(s)
                </div>
            `;
        }
        container.innerHTML = html;
    }

    mostrarDetalhamentoProjetos() {
        const container = document.getElementById('projectsDetails');
        if (!container) return;
        
        const projetosEncontrados = {};
        
        for (const dados of Object.values(this.resultados)) {
            const codigo = dados.codigo_projeto;
            const descricao = dados.descricao_projeto;
            if (codigo && descricao !== 'Desconhecido') {
                const chave = `${codigo} - ${descricao}`;
                projetosEncontrados[chave] = (projetosEncontrados[chave] || 0) + 1;
            }
        }
        
        if (Object.keys(projetosEncontrados).length === 0) {
            container.innerHTML = '<div class="found-item">Nenhum projeto identificado nos arquivos analisados</div>';
            return;
        }
        
        let html = '';
        for (const [projeto, count] of Object.entries(projetosEncontrados)) {
            html += `
                <div class="found-item">
                    <strong>${projeto}</strong>: ${count} arquivo(s)
                </div>
            `;
        }
        container.innerHTML = html;
    }

    async baixarExcel() {
        if (Object.keys(this.resultados).length === 0) {
            this.showError('Nenhum resultado disponível para download.');
            return;
        }

        const button = document.getElementById('downloadButton');
        const originalText = button ? button.textContent : '';
        try {
            if (button) {
                button.disabled = true;
                button.textContent = 'Gerando Excel...';
            }
            this.updateProgress(0, 1, 'Preparando imagens para o Excel');
            const success = await this.excelGenerator.baixarExcel(this.resultados, "resultados_analise.xlsx");
            if (success) {
                console.log('✅ Excel baixado com sucesso');
            } else {
                this.showError('Erro ao gerar arquivo Excel.');
            }
        } catch (error) {
            console.error('❌ Erro ao gerar Excel:', error);
            this.showError('Erro ao gerar arquivo Excel: ' + error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText || '📥 Baixar Resultados em Excel';
            }
        }
    }

    async setupLogoReferences() {
        const addButton = document.getElementById('addLogoReferenceButton');
        const input = document.getElementById('logoReferenceInput');
        const removeAllButton = document.getElementById('removeAllLogoReferencesButton');
        if (!addButton || !input || !window.LogoDetector) return;
        addButton.addEventListener('click', () => input.click());
        input.addEventListener('change', async (event) => {
            try {
                const detector = this.logoDetector || new LogoDetector();
                await detector.salvarArquivosReferencia(event.target.files);
                input.value = '';
                await this.renderLogoReferences();
                this.showSuccess('Logos de referência cadastradas com sucesso.');
            } catch (error) {
                this.showError(error.message);
            }
        });
        removeAllButton?.addEventListener('click', async () => {
            await window.LogoReferenceStore?.removerTodasLogosReferencia?.();
            await this.renderLogoReferences();
        });
        await this.renderLogoReferences();
    }

    async renderLogoReferences() {
        const preview = document.getElementById('logoReferencePreview');
        const status = document.getElementById('logoReferenceStatus');
        if (!preview || !status || !window.LogoReferenceStore) return;
        const items = await window.LogoReferenceStore.listarLogosReferencia();
        status.textContent = `${items.length} referência(s) cadastrada(s) neste navegador.`;
        preview.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'logo-reference-card';
            const img = document.createElement('img');
            img.src = item.imagem_base64;
            img.alt = 'Logo de referência';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Excluir';
            btn.addEventListener('click', async () => {
                await window.LogoReferenceStore.removerLogoReferencia(item.id);
                await this.renderLogoReferences();
            });
            card.append(img, btn);
            preview.appendChild(card);
        });
    }

    renderLogosCell(logos) {
        if (!logos) return 'Nenhuma';
        if (logos.status === 'desabilitado') return 'Desativado';
        if (logos.status === 'sem_referencias') return 'Cadastre as referências';
        if (!logos.itens?.length) return 'Nenhuma';
        return `<div class="logos-thumbs">${logos.itens.map((logo, index) => {
            const title = `Página ${logo.pagina_pdf || '-'} • ${Math.round((logo.confianca || 0) * 100)}%`;
            return `<button type="button" class="logo-thumb-button" title="${this.escapeHTML(title)}" data-logo-index="${index}"><img src="${logo.imagem_base64}" alt="Logo detectada ${index + 1}"></button>`;
        }).join('')}</div>`;
    }

    setupLogoModalDelegation() {
        const tbody = document.getElementById('resultsBody');
        if (!tbody || tbody.dataset.logoModalReady) return;
        tbody.dataset.logoModalReady = '1';
        tbody.addEventListener('click', (event) => {
            const button = event.target.closest('.logo-thumb-button');
            if (!button) return;
            const rowIndex = Array.from(tbody.children).indexOf(button.closest('tr'));
            const dados = Object.values(this.resultados)[rowIndex];
            const logo = dados?.logos_detectadas?.itens?.[Number(button.dataset.logoIndex)];
            if (logo?.imagem_base64) this.abrirLogoModal(logo);
        });
    }

    abrirLogoModal(logo) {
        const overlay = document.createElement('div');
        overlay.className = 'logo-modal-overlay';
        overlay.innerHTML = `<div class="logo-modal"><button type="button" class="logo-modal-close">×</button><img src="${logo.imagem_base64}" alt="Logo detectada ampliada"><p>Página ${logo.pagina_pdf || '-'} • Confiança ${Math.round((logo.confianca || 0) * 100)}%</p></div>`;
        overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.classList.contains('logo-modal-close')) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
    }

    // Utilitários de interface
    showProgressArea() {
        this.hideElement('resultsArea');
        this.showElement('progressArea');
    }

    hideProgressArea() {
        this.hideElement('progressArea');
    }

    updateProgress(current, total, fileName) {
        const progress = ((current + 1) / total) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const fileProgress = document.getElementById('fileProgress');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
        if (fileProgress) fileProgress.textContent = `Processando: ${fileName}`;
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.remove('hidden');
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    }

    showError(message) {
        alert('Erro: ' + message);
    }

    showSuccess(message) {
        alert(message);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// REMOVER funções globais antigas - agora usamos métodos da classe
// Deixar apenas toggleExpand que é usado no HTML
function toggleExpand(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('show');
    }
}



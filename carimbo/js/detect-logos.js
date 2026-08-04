(function inicializarLogoDetector() {
    class LogoDetector {
        constructor(config = window.LOGOS_REFERENCIA_CONFIG || {}) {
            this.config = config;
            this.referencias = [];
            this.debug = !!config.debug;
            this.objectTimeoutMs = 2500;
        }

        criarResultadoVazio(status, mensagem, extras = {}) {
            return { status, mensagem, total_referencias: this.referencias.length, total_candidatos: 0, total_detectadas: 0, itens: [], ...extras };
        }

        async carregarReferencias() {
            const todas = [...await this.carregarReferenciasFixas(), ...await (window.LogoReferenceStore?.listarLogosReferencia?.() || Promise.resolve([]))];
            const vistos = new Set();
            this.referencias = [];
            for (const ref of todas) {
                if (!ref?.imagem_base64) continue;
                const hashBytes = await this.sha256DataURL(ref.imagem_base64);
                if (vistos.has(hashBytes)) continue;
                vistos.add(hashBytes);
                try {
                    const canvas = await this.base64ParaCanvas(ref.imagem_base64);
                    if (canvas.width < this.config.minReferenceWidth || canvas.height < this.config.minReferenceHeight) continue;
                    const trimmed = this.recortarConteudo(canvas);
                    const normalizada = this.normalizarCanvas(trimmed.canvas);
                    this.referencias.push({ ...ref, hash: hashBytes, largura: canvas.width, altura: canvas.height, canvasOriginal: canvas, assinatura: this.criarAssinatura(normalizada.canvas, trimmed.canvas.width / trimmed.canvas.height) });
                    if (trimmed.canvas !== canvas) trimmed.canvas.width = trimmed.canvas.height = 0;
                    normalizada.canvas.width = normalizada.canvas.height = 0;
                } catch (e) { console.warn('⚠️ Referência de logo ignorada:', ref.id, e.message); }
            }
            return this.referencias;
        }

        async carregarReferenciasFixas() {
            const carregadas = [];
            for (const ref of this.config.referencias || []) {
                try {
                    const blob = await fetch(ref.src, { cache: 'no-store' }).then(r => r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`)));
                    carregadas.push({ id: ref.id, origem: 'repositorio', imagem_base64: await this.blobParaDataURL(blob), mime_type: blob.type || 'image/png' });
                } catch (e) { console.info('ℹ️ Logo fixa não carregada:', ref.src, e.message); }
            }
            return carregadas;
        }

        async salvarArquivosReferencia(files) {
            const cfg = this.config;
            const existentes = await window.LogoReferenceStore.listarLogosReferencia();
            if (existentes.length + files.length > cfg.maxReferenciasCadastradas) throw new Error(`Limite de ${cfg.maxReferenciasCadastradas} referências excedido.`);
            const salvas = [];
            for (const file of Array.from(files)) {
                if (!/\.(png|jpe?g|webp)$/i.test(file.name) || !(cfg.allowedMimeTypes || []).includes(file.type)) throw new Error(`Formato não permitido: ${file.name}`);
                if (file.size > cfg.maxReferenceFileSizeMB * 1024 * 1024) throw new Error(`Arquivo muito grande: ${file.name}`);
                const imagem_base64 = await this.blobParaDataURL(file);
                const canvas = await this.base64ParaCanvas(imagem_base64);
                if (canvas.width < cfg.minReferenceWidth || canvas.height < cfg.minReferenceHeight) throw new Error(`Imagem muito pequena: ${file.name}`);
                const id = `referencia-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                const item = { id, nome_original: file.name, mime_type: file.type, imagem_base64, hash: await this.sha256DataURL(imagem_base64), largura: canvas.width, altura: canvas.height, criado_em: new Date().toISOString() };
                await window.LogoReferenceStore.salvarLogoReferencia(item);
                salvas.push(item); canvas.width = canvas.height = 0;
            }
            await this.carregarReferencias();
            return salvas;
        }

        async detectarNoPDF(pdf, onProgress) {
            if (!this.config.enabled) return this.criarResultadoVazio('desabilitado', 'Análise de logos desativada.');
            await this.carregarReferencias();
            if (!this.referencias.length) return this.criarResultadoVazio('sem_referencias', 'Cadastre as referências de logos para executar a análise.');
            const achadas = []; let totalCandidatos = 0; let erro = null;
            for (let p = 1; p <= pdf.numPages; p++) {
                try {
                    const page = await pdf.getPage(p);
                    onProgress?.(`Extraindo imagens da página ${p}`);
                    const candidatos = await this.extrairCandidatosPagina(page, p);
                    totalCandidatos += candidatos.length;
                    const diretas = [];
                    for (const cand of candidatos) diretas.push(...await this.compararCandidato(cand));
                    achadas.push(...diretas);
                    if (!diretas.length && this.config.fallback?.enabled !== false) {
                        this.logPagina(p, 'fallback executado: nenhuma correspondência direta válida', { candidatos: candidatos.length });
                        achadas.push(...await this.detectarPorTemplateMatching(page, p));
                    }
                } catch (e) { erro = e; console.warn('⚠️ Erro parcial na detecção de logos:', e); }
                await new Promise(r => setTimeout(r, 10));
            }
            const itens = this.deduplicar(achadas).slice(0, this.config.maxLogosPorPdf || 10);
            return { status: itens.length ? (erro ? 'erro_parcial' : 'sucesso') : (erro ? 'erro_parcial' : 'nenhuma_detectada'), mensagem: itens.length ? `${itens.length} logos identificadas.` : 'Nenhuma imagem identificada', total_referencias: this.referencias.length, total_candidatos: totalCandidatos, total_detectadas: itens.length, itens };
        }

        obterNomeOperador(fn) {
            const ops = window.pdfjsLib?.OPS || {};
            return Object.keys(ops).find(k => ops[k] === fn) || `OPS_${fn}`;
        }

        async resolverObjetoPDF(page, objectId) {
            if (!objectId) return null;
            const tentar = (store, origem) => new Promise(resolve => {
                let done = false;
                const finish = v => { if (!done) { done = true; resolve({ objeto: v || null, origem }); } };
                try { store?.get(objectId, finish); } catch (_) { finish(null); }
                setTimeout(() => finish(null), this.objectTimeoutMs);
            });
            let res = await tentar(page.objs, 'page.objs');
            if (res.objeto) return res;
            res = await tentar(page.commonObjs, 'page.commonObjs');
            return res.objeto ? res : null;
        }

        async extrairCandidatosPagina(page, pageNum) {
            const ops = await page.getOperatorList();
            const operadoresImagem = new Set([pdfjsLib.OPS.paintJpegXObject, pdfjsLib.OPS.paintImageXObject, pdfjsLib.OPS.paintInlineImageXObject].filter(Number.isInteger));
            const ignorados = new Set([pdfjsLib.OPS.paintImageMaskXObject].filter(Number.isInteger));
            const vistos = new Set();
            const out = [];
            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i], args = ops.argsArray[i] || [], nome = this.obterNomeOperador(fn);
                if (!operadoresImagem.has(fn) && !ignorados.has(fn)) continue;
                const diag = { indice: i, operador: nome, valor: fn, argumentos: this.resumirArgs(args), objectId: args[0] || null };
                if (ignorados.has(fn)) { this.logOperador(pageNum, { ...diag, aceito: false, motivo: 'máscara/alpha ignorada' }); continue; }
                let img = null, origem = 'inline';
                if (fn === pdfjsLib.OPS.paintInlineImageXObject) img = args[0];
                else {
                    const objectId = args[0];
                    if (vistos.has(objectId)) { this.logOperador(pageNum, { ...diag, aceito: false, motivo: 'object ID duplicado' }); continue; }
                    vistos.add(objectId);
                    const resolvido = await this.resolverObjetoPDF(page, objectId);
                    img = resolvido?.objeto; origem = resolvido?.origem || 'não resolvido';
                }
                const info = this.infoObjeto(img);
                if (!img) { this.logOperador(pageNum, { ...diag, origem, ...info, aceito: false, motivo: 'objeto não resolvido' }); continue; }
                const canvas = await this.objetoImagemParaCanvas(img);
                const metricas = canvas ? this.validarCanvasConvertido(canvas) : null;
                const motivo = canvas ? this.motivoDescarteCandidato(canvas, page, metricas) : 'conversão para canvas falhou';
                this.logOperador(pageNum, { ...diag, origem, ...info, ...(metricas || {}), aceito: !motivo, motivo: motivo || 'candidato aceito' });
                if (motivo) { if (canvas) canvas.width = canvas.height = 0; continue; }
                out.push({ canvas, pagina_pdf: pageNum, metodo: fn === pdfjsLib.OPS.paintJpegXObject ? 'paintJpegXObject_direto' : (fn === pdfjsLib.OPS.paintImageXObject ? 'paintImageXObject_direto' : 'paintInlineImageXObject_direto'), bbox: { x: null, y: null, width: null, height: null }, hash: await this.sha256DataURL(canvas.toDataURL('image/png')) });
            }
            this.logPagina(pageNum, 'resumo extração', { candidatosConvertidos: out.length });
            return out;
        }

        motivoDescarteCandidato(canvas, page, m) {
            const f = this.config.filtros || {}, area = canvas.width * canvas.height;
            if (canvas.width < f.minWidth || canvas.height < f.minHeight || area < f.minArea) return 'dimensões/área abaixo do mínimo';
            if (Math.max(canvas.width / canvas.height, canvas.height / canvas.width) > f.maxAspectRatio) return 'proporção extrema';
            const vp = page.getViewport({ scale: 1 }); if (area > vp.width * vp.height * (f.maxRelativeArea || this.config.maxDirectRelativeArea || .08)) return 'área relativa grande demais';
            if (m.transparentRatio > f.maxTransparentRatio) return 'transparência excessiva';
            if (m.whiteRatio > f.maxWhiteRatio) return 'branco excessivo';
            if (m.blackRatio > f.maxBlackRatio) return 'preto excessivo';
            if (m.colorBuckets < (f.minColorBuckets || 3)) return 'poucas cores';
            if (m.foregroundRatio < (this.config.minCandidateForegroundRatio ?? .01) || m.foregroundRatio > (this.config.maxCandidateForegroundRatio ?? .8)) return 'densidade de primeiro plano inválida';
            return '';
        }

        async compararCandidato(cand) {
            const matches = [], dataUrl = cand.canvas.toDataURL('image/png');
            for (const graus of this.config.rotations || [0,90,180,270]) {
                const c = graus ? this.rotacionarCanvas(cand.canvas, graus) : cand.canvas;
                const trimmed = this.recortarConteudo(c);
                const norm = this.normalizarCanvas(trimmed.canvas);
                const sig = this.criarAssinatura(norm.canvas, trimmed.canvas.width / trimmed.canvas.height);
                for (const ref of this.referencias) {
                    const score = this.compararAssinaturas(sig, ref.assinatura);
                    const aceito = score.final >= (this.config.directMatchThreshold ?? .82) && score.aspect >= (this.config.minAspectSimilarity ?? .8) && score.foreground >= .70;
                    this.logDebug({ referencia: ref.id, pagina: cand.pagina_pdf, tamanho: `${cand.canvas.width}x${cand.canvas.height}`, ...score, final: score.final, aceito });
                    if (aceito) matches.push({ referencia_id: ref.id, pagina_pdf: cand.pagina_pdf, confianca: Math.min(1, score.final), metodo: cand.metodo, mime_type: 'image/png', imagem_base64: dataUrl, largura_original: cand.canvas.width, altura_original: cand.canvas.height, hash: cand.hash || sig.hash, bbox: cand.bbox, diagnostico: { rotacao: graus, direct_score: score.final } });
                }
                if (graus) c.width = c.height = 0; if (trimmed.canvas !== c) trimmed.canvas.width = trimmed.canvas.height = 0; norm.canvas.width = norm.canvas.height = 0;
            }
            cand.canvas.width = cand.canvas.height = 0;
            return matches;
        }

        async detectarPorTemplateMatching(page, pageNum) {
            let cv;
            try { cv = await window.OpenCVLoader?.carregarOpenCV?.(); } catch (e) { console.warn('⚠️ OpenCV.js indisponível:', e.message); return []; }
            if (!cv) return [];
            const canvas = await this.renderizarPaginaCompleta(page, pageNum);
            const regioes = this.criarRegioesBusca(canvas);
            let melhor = null;
            for (const regiao of regioes) {
                melhor = this.melhorTemplateNaRegiao(cv, canvas, regiao, melhor);
                this.logPagina(pageNum, 'região pesquisada', { nome: regiao.nome, melhorScore: melhor?.score, segundoMelhorScore: melhor?.segundoScore });
                if (melhor && this.validarMatch(melhor)) break;
            }
            if (!melhor || !this.validarMatch(melhor)) { canvas.width = canvas.height = 0; return []; }
            const recorte = this.recortarComMargem(canvas, melhor.bbox, 0.03);
            const hash = await this.sha256DataURL(recorte.toDataURL('image/png'));
            const item = { referencia_id: melhor.referencia.id, pagina_pdf: pageNum, confianca: Math.min(1, melhor.score), metodo: 'opencv_template_matching', mime_type: 'image/png', imagem_base64: recorte.toDataURL('image/png'), largura_original: recorte.width, altura_original: recorte.height, hash, bbox: this.normalizarBBox(melhor.bbox, canvas), diagnostico: { escala: melhor.escala, rotacao: melhor.rotacao, template_score: melhor.score, segundo_melhor_score: melhor.segundoScore } };
            this.logPagina(pageNum, 'resultado aceito', { bbox: item.bbox, diagnostico: item.diagnostico });
            recorte.width = recorte.height = canvas.width = canvas.height = 0;
            return [item];
        }

        async renderizarPaginaCompleta(page, pageNum) {
            const baseViewport = page.getViewport({ scale: 1 });
            const escalaFinal = Math.min(this.config.renderScale ?? 2.5, (this.config.maxRenderDimension ?? 5000) / baseViewport.width, (this.config.maxRenderDimension ?? 5000) / baseViewport.height, Math.sqrt((this.config.maxRenderPixels ?? 16000000) / (baseViewport.width * baseViewport.height)));
            const viewport = page.getViewport({ scale: escalaFinal });
            const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            this.logPagina(pageNum, 'renderização fallback', { original: `${baseViewport.width}x${baseViewport.height}`, rotacao: page.rotate, escalaFinal, final: `${canvas.width}x${canvas.height}`, compativel: Math.ceil(viewport.width) === canvas.width && Math.ceil(viewport.height) === canvas.height });
            return canvas;
        }

        criarRegioesBusca(canvas) {
            const s = this.config.stampRegion || { xMin: .65, yMin: .55, xMax: 1, yMax: 1 };
            return [
                { nome: 'carimbo', x: Math.floor(canvas.width*s.xMin), y: Math.floor(canvas.height*s.yMin), width: Math.ceil(canvas.width*(s.xMax-s.xMin)), height: Math.ceil(canvas.height*(s.yMax-s.yMin)) },
                { nome: 'faixa_inferior', x: 0, y: Math.floor(canvas.height*.50), width: canvas.width, height: Math.ceil(canvas.height*.50) },
                ...(this.config.fullPageFallback ? [{ nome: 'pagina_inteira', x: 0, y: 0, width: canvas.width, height: canvas.height }] : [])
            ].map(r => ({ ...r, width: Math.min(r.width, canvas.width-r.x), height: Math.min(r.height, canvas.height-r.y) }));
        }

        melhorTemplateNaRegiao(cv, canvas, regiao, atual) {
            let search = null, searchGray = null, templ = null, templGray = null, resized = null, result = null;
            try {
                search = cv.imread(this.recortarCanvas(canvas, regiao)); searchGray = new cv.Mat(); cv.cvtColor(search, searchGray, cv.COLOR_RGBA2GRAY);
                for (const ref of this.referencias) for (const rot of this.config.rotations || [0,90,180,270]) {
                    const refCanvas = rot ? this.rotacionarCanvas(ref.canvasOriginal, rot) : ref.canvasOriginal;
                    templ = cv.imread(refCanvas); templGray = new cv.Mat(); cv.cvtColor(templ, templGray, cv.COLOR_RGBA2GRAY);
                    for (let escala = this.config.templateScaleMin ?? .2; escala <= (this.config.templateScaleMax ?? 1.2) + 1e-9; escala += this.config.templateScaleStep ?? .025) {
                        const w = Math.round(templGray.cols * escala), h = Math.round(templGray.rows * escala);
                        if (w < 8 || h < 8 || w > searchGray.cols || h > searchGray.rows) continue;
                        resized = new cv.Mat(); cv.resize(templGray, resized, new cv.Size(w, h), 0, 0, cv.INTER_AREA);
                        result = new cv.Mat(); cv.matchTemplate(searchGray, resized, result, cv.TM_CCOEFF_NORMED);
                        const mm = cv.minMaxLoc(result), score = mm.maxVal;
                        if (!atual || score > atual.score) atual = { score, segundoScore: atual?.score || 0, escala, rotacao: rot, referencia: ref, regiao: regiao.nome, bbox: { x: regiao.x + mm.maxLoc.x, y: regiao.y + mm.maxLoc.y, width: w, height: h } };
                        else if (score > (atual.segundoScore || 0)) atual.segundoScore = score;
                        resized.delete(); result.delete(); resized = result = null;
                    }
                    templ.delete(); templGray.delete(); templ = templGray = null; if (rot) refCanvas.width = refCanvas.height = 0;
                }
            } finally { [search, searchGray, templ, templGray, resized, result].forEach(m => { try { m?.delete?.(); } catch (_) {} }); }
            return atual;
        }

        validarMatch(m) {
            if (!m || m.score < (this.config.templateThreshold ?? .86)) return false;
            if ((m.score - (m.segundoScore || 0)) < (this.config.secondBestMargin ?? .04)) return false;
            const aspect = Math.min(m.bbox.width / m.bbox.height, m.referencia.largura / m.referencia.altura) / Math.max(m.bbox.width / m.bbox.height, m.referencia.largura / m.referencia.altura);
            return aspect >= (this.config.minAspectSimilarity ?? .8);
        }

        objetoImagemParaCanvas(img) {
            if (img instanceof HTMLCanvasElement) return img;
            if (img instanceof HTMLImageElement) return this.imagemParaCanvas(img);
            if (window.ImageBitmap && img instanceof ImageBitmap) return this.bitmapParaCanvas(img);
            if (img instanceof ImageData) return this.imageDataParaCanvas(img);
            if (img?.bitmap) return this.bitmapParaCanvas(img.bitmap);
            if (img?.width && img?.height && img?.data) return this.imageDataObjetoParaCanvas(img);
            return null;
        }
        bitmapParaCanvas(b){ const c=document.createElement('canvas'); c.width=b.width; c.height=b.height; c.getContext('2d').drawImage(b,0,0); return c; }
        imageDataParaCanvas(id){ const c=document.createElement('canvas'); c.width=id.width; c.height=id.height; c.getContext('2d').putImageData(id,0,0); return c; }
        imageDataObjetoParaCanvas(o){ const c=document.createElement('canvas'); c.width=o.width; c.height=o.height; const ctx=c.getContext('2d',{willReadFrequently:true}), id=ctx.createImageData(o.width,o.height), src=o.data, pixels=o.width*o.height, bpp=src.length/pixels; if(bpp>=4) for(let i=0,j=0;i<id.data.length;i+=4,j+=4){id.data[i]=src[j];id.data[i+1]=src[j+1];id.data[i+2]=src[j+2];id.data[i+3]=src[j+3];} else if(bpp>=3) for(let i=0,j=0;i<id.data.length;i+=4,j+=3){id.data[i]=src[j];id.data[i+1]=src[j+1];id.data[i+2]=src[j+2];id.data[i+3]=255;} else if(bpp>=1) for(let i=0,j=0;i<id.data.length;i+=4,j++){const v=src[j];id.data[i]=v;id.data[i+1]=v;id.data[i+2]=v;id.data[i+3]=255;} else for(let i=0;i<pixels;i++){const byte=src[i>>3]||0, v=(byte&(128>>(i&7)))?0:255, k=i*4; id.data[k]=id.data[k+1]=id.data[k+2]=v; id.data[k+3]=255;} ctx.putImageData(id,0,0); return c; }

        validarCanvasConvertido(canvas){ const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data; let transparent=0,white=0,black=0,fg=0; const colors=new Set(); for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3]; if(a<10) transparent++; if(r>245&&g>245&&b>245) white++; else fg++; if(r<10&&g<10&&b<10) black++; colors.add(`${r>>4},${g>>4},${b>>4}`);} const n=d.length/16; return { largura:canvas.width, altura:canvas.height, transparentRatio:transparent/n, whiteRatio:white/n, foregroundRatio:fg/n, blackRatio:black/n, colorBuckets:colors.size }; }
        infoObjeto(o){ return { tipoObjeto: o ? Object.prototype.toString.call(o) : null, objectKeys: o ? Object.keys(o).slice(0,25) : [], largura: o?.width || o?.bitmap?.width || null, altura: o?.height || o?.bitmap?.height || null, possuiBitmap: !!o?.bitmap, possuiData: !!o?.data, dataLength: o?.data?.length || null, kind: o?.kind }; }
        resumirArgs(args){ return args.map(a => (a?.data ? { width:a.width, height:a.height, dataLength:a.data.length, kind:a.kind } : a)); }
        recortarCanvas(src,b){ const c=document.createElement('canvas'); c.width=Math.max(1,b.width); c.height=Math.max(1,b.height); c.getContext('2d',{willReadFrequently:true}).drawImage(src,b.x,b.y,b.width,b.height,0,0,c.width,c.height); return c; }
        recortarComMargem(src,b,ratio){ const m=Math.round(Math.min(b.width,b.height)*ratio), x=Math.max(0,b.x-m), y=Math.max(0,b.y-m), x2=Math.min(src.width,b.x+b.width+m), y2=Math.min(src.height,b.y+b.height+m); return this.recortarCanvas(src,{x,y,width:x2-x,height:y2-y}); }
        normalizarBBox(b,canvas){ return { ...b, x_normalizado:b.x/canvas.width, y_normalizado:b.y/canvas.height, width_normalizado:b.width/canvas.width, height_normalizado:b.height/canvas.height }; }
        recortarConteudo(canvas){ const box=this.encontrarConteudo(canvas); return { canvas:this.recortarCanvas(canvas, box), box }; }
        normalizarCanvas(src){ const size=this.config.normalizedSize||128,c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true}); c.width=c.height=size; ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size); const scale=Math.min(size/src.width,size/src.height)*.92,w=src.width*scale,h=src.height*scale; ctx.drawImage(src,(size-w)/2,(size-h)/2,w,h); return {canvas:c}; }
        encontrarConteudo(canvas){ const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,t=this.config.foregroundWhiteThreshold??245; let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1; for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3]; if(a>20 && !(r>t&&g>t&&b>t)){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}} return maxX>=0?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:{x:0,y:0,width:canvas.width,height:canvas.height}; }
        criarAssinatura(canvas, aspect){ const gray=this.gray(canvas), fg=this.foregroundRatio(canvas); return { hash:this.dHash(gray), hist:this.histForeground(canvas), edge:this.edge(gray), aspect, foreground:fg }; }
        gray(canvas){ const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,out=[]; for(let i=0;i<d.length;i+=4) out.push(.299*d[i]+.587*d[i+1]+.114*d[i+2]); return {data:out,w:canvas.width,h:canvas.height}; }
        dHash(g){let bits=''; for(let y=0;y<8;y++)for(let x=0;x<8;x++){const px=Math.floor(x*g.w/9),py=Math.floor(y*g.h/8),step=Math.max(1,Math.floor(g.w/9)); bits+=g.data[py*g.w+px]>g.data[py*g.w+Math.min(g.w-1,px+step)]?'1':'0';} return bits;}
        histForeground(canvas){const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,h=new Array(64).fill(0),t=this.config.foregroundWhiteThreshold??245; for(let i=0;i<d.length;i+=4){if(d[i]>t&&d[i+1]>t&&d[i+2]>t) continue; h[(d[i]>>6)*16+(d[i+1]>>6)*4+(d[i+2]>>6)]++;} return h;}
        foregroundRatio(canvas){const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,t=this.config.foregroundWhiteThreshold??245; let fg=0; for(let i=0;i<d.length;i+=4) if(d[i+3]>20 && !(d[i]>t&&d[i+1]>t&&d[i+2]>t)) fg++; return fg/(d.length/4||1);}
        edge(g){const out=[]; for(let y=1;y<g.h-1;y+=4)for(let x=1;x<g.w-1;x+=4){const v=Math.abs(g.data[y*g.w+x]-g.data[y*g.w+x+1])+Math.abs(g.data[y*g.w+x]-g.data[(y+1)*g.w+x]); out.push(v>28?1:0);} return out;}
        compararAssinaturas(a,b){const hash=this.hashSim(a.hash,b.hash), color=this.cos(a.hist,b.hist), edge=this.binSim(a.edge,b.edge), aspect=1-Math.min(1,Math.abs(Math.log((a.aspect||1)/(b.aspect||1)))), foreground=1-Math.min(1,Math.abs((a.foreground||0)-(b.foreground||0))/Math.max(a.foreground||.01,b.foreground||.01)); const w=this.config.pesos||{}; return {hash,color,edge,aspect,foreground,final:hash*(w.hash||.35)+edge*(w.edge||.25)+color*(w.color||.25)+aspect*(w.aspect||.15)};}
        hashSim(a,b){let diff=0; for(let i=0;i<Math.min(a.length,b.length);i++) if(a[i]!==b[i]) diff++; return 1-diff/Math.max(a.length,b.length,1);}
        cos(a,b){let dot=0,na=0,nb=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];} return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);}
        binSim(a,b){let same=0,n=Math.min(a.length,b.length); for(let i=0;i<n;i++) if(a[i]===b[i]) same++; return same/(n||1);}
        imagemParaCanvas(img){const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);return c;}
        base64ParaCanvas(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(this.imagemParaCanvas(img));img.onerror=()=>rej(new Error('Imagem inválida'));img.src=src;});}
        blobParaDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
        rotacionarCanvas(src, graus){const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true}),swap=graus%180!==0; c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;ctx.translate(c.width/2,c.height/2);ctx.rotate(graus*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return c;}
        async sha256DataURL(dataUrl){ const bytes=this.dataURLParaUint8(dataUrl); const digest=await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength)); return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
        dataURLParaUint8(dataUrl){ const b64=String(dataUrl).split(',')[1]||''; const bin=atob(b64); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
        deduplicar(items){ const rank={opencv_template_matching:2,paintJpegXObject_direto:3,paintImageXObject_direto:3,paintInlineImageXObject_direto:3}; const map=new Map(); for(const item of items){const key=item.referencia_id, old=map.get(key); const better=!old||item.confianca>old.confianca||(item.confianca===old.confianca&&(item.largura_original*item.altura_original)>(old.largura_original*old.altura_original))||(item.confianca===old.confianca&&(rank[item.metodo]||0)>(rank[old.metodo]||0))||(item.confianca===old.confianca&&item.pagina_pdf<old.pagina_pdf); if(better) map.set(key,item);} return [...map.values()].sort((a,b)=>b.confianca-a.confianca); }
        logOperador(p,d){ if(this.debug) console.debug(`[LogoDetector][Página ${p}] operador visual`, d); }
        logPagina(p,msg,d){ if(this.debug) console.debug(`[LogoDetector][Página ${p}] ${msg}`, d||''); }
        logDebug(d){ if(this.debug) console.log(`[LogoDetector][Página ${d.pagina}] ref=${d.referencia} tamanho=${d.tamanho} hash=${d.hash.toFixed(3)} color=${d.color.toFixed(3)} edge=${d.edge.toFixed(3)} aspect=${d.aspect.toFixed(3)} foreground=${d.foreground.toFixed(3)} final=${d.final.toFixed(3)} ${d.aceito?'ACEITO':'rejeitado'}`); }
    }
    window.LogoDetector = LogoDetector;
})();
(function inicializarLogoDetector() {
    class LogoDetector {
        constructor(config = window.LOGOS_REFERENCIA_CONFIG || {}) {
            this.config = config;
            this.referencias = [];
            this.debug = !!config.debug;
        }

        criarResultadoVazio(status, mensagem, extras = {}) {
            return { status, mensagem, total_referencias: this.referencias.length, total_candidatos: 0, total_detectadas: 0, itens: [], ...extras };
        }

        async carregarReferencias() {
            const fixas = await this.carregarReferenciasFixas();
            const salvas = await (window.LogoReferenceStore?.listarLogosReferencia?.() || Promise.resolve([]));
            const todas = [...fixas, ...salvas];
            const vistos = new Set();
            this.referencias = [];
            for (const ref of todas) {
                if (!ref?.imagem_base64 || vistos.has(ref.imagem_base64.slice(0, 200))) continue;
                vistos.add(ref.imagem_base64.slice(0, 200));
                try {
                    const canvas = await this.base64ParaCanvas(ref.imagem_base64);
                    if (canvas.width < this.config.minReferenceWidth || canvas.height < this.config.minReferenceHeight) continue;
                    const normalizada = this.normalizarCanvas(canvas);
                    this.referencias.push({ ...ref, largura: canvas.width, altura: canvas.height, assinatura: this.criarAssinatura(normalizada.canvas, canvas.width / canvas.height) });
                    canvas.width = canvas.height = normalizada.canvas.width = normalizada.canvas.height = 0;
                } catch (e) { console.warn('⚠️ Referência de logo ignorada:', ref.id, e.message); }
            }
            return this.referencias;
        }

        async carregarReferenciasFixas() {
            const refs = this.config.referencias || [];
            const carregadas = [];
            for (const ref of refs) {
                try {
                    const blob = await fetch(ref.src, { cache: 'no-store' }).then(r => r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`)));
                    const imagem_base64 = await this.blobParaDataURL(blob);
                    carregadas.push({ id: ref.id, origem: 'repositorio', imagem_base64, mime_type: blob.type || 'image/png' });
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
                const extOk = /\.(png|jpe?g|webp)$/i.test(file.name);
                const mimeOk = (cfg.allowedMimeTypes || []).includes(file.type);
                if (!extOk || !mimeOk) throw new Error(`Formato não permitido: ${file.name}`);
                if (file.size > cfg.maxReferenceFileSizeMB * 1024 * 1024) throw new Error(`Arquivo muito grande: ${file.name}`);
                const imagem_base64 = await this.blobParaDataURL(file);
                const canvas = await this.base64ParaCanvas(imagem_base64);
                if (canvas.width < cfg.minReferenceWidth || canvas.height < cfg.minReferenceHeight) throw new Error(`Imagem muito pequena: ${file.name}`);
                const id = `referencia-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                const item = { id, nome_original: file.name, mime_type: file.type, imagem_base64, largura: canvas.width, altura: canvas.height, criado_em: new Date().toISOString() };
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
                    onProgress?.(`Extraindo imagens da página ${p}`);
                    const page = await pdf.getPage(p);
                    const candidatos = await this.extrairCandidatosPagina(page, p);
                    totalCandidatos += candidatos.length;
                    onProgress?.(`Comparando logos da página ${p}`);
                    for (const cand of candidatos) achadas.push(...await this.compararCandidato(cand));
                    if (!candidatos.length && this.config.fallback?.enabled) achadas.push(...await this.detectarPorFallback(page, p));
                } catch (e) { erro = e; console.warn('⚠️ Erro parcial na detecção de logos:', e); }
                await new Promise(r => setTimeout(r, 10));
            }
            const itens = this.deduplicar(achadas).slice(0, this.config.maxLogosPorPdf || 10);
            const status = itens.length ? (erro ? 'erro_parcial' : 'sucesso') : (erro ? 'erro_parcial' : 'nenhuma_detectada');
            return { status, mensagem: itens.length ? `${itens.length} logos identificadas.` : 'Nenhuma logo identificada.', total_referencias: this.referencias.length, total_candidatos: totalCandidatos, total_detectadas: itens.length, itens };
        }

        async extrairCandidatosPagina(page, pageNum) {
            const ops = await page.getOperatorList();
            const out = [];
            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i]; const args = ops.argsArray[i] || [];
                const isX = fn === pdfjsLib.OPS.paintImageXObject;
                const isInline = fn === pdfjsLib.OPS.paintInlineImageXObject;
                const isMask = fn === pdfjsLib.OPS.paintImageMaskXObject;
                if (isMask) continue;
                let img = null;
                if (isX && args[0]) img = await new Promise(resolve => page.objs.get(args[0], resolve));
                if (isInline) img = args[0];
                if (!img) continue;
                const canvas = await this.objetoImagemParaCanvas(img);
                if (!canvas || !this.candidatoValido(canvas, page)) { if (canvas) canvas.width = canvas.height = 0; continue; }
                out.push({ canvas, pagina_pdf: pageNum, metodo: isX ? 'imagem_xobject' : 'imagem_inline', bbox: { x: null, y: null, width: null, height: null } });
            }
            return out;
        }

        candidatoValido(canvas, page) {
            const f = this.config.filtros || {}; const area = canvas.width * canvas.height;
            if (canvas.width < f.minWidth || canvas.height < f.minHeight || area < f.minArea) return false;
            if (Math.max(canvas.width / canvas.height, canvas.height / canvas.width) > f.maxAspectRatio) return false;
            const vp = page.getViewport({ scale: 1 }); if (area > (vp.width * vp.height * (f.maxRelativeArea || .35))) return false;
            const ctx = canvas.getContext('2d', { willReadFrequently: true }); const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let transparent = 0, white = 0, black = 0; const colors = new Set();
            for (let i = 0; i < data.length; i += 16) { const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3]; if (a < 10) transparent++; if (r>245&&g>245&&b>245) white++; if (r<10&&g<10&&b<10) black++; colors.add(`${r>>4},${g>>4},${b>>4}`); }
            const samples = data.length / 16;
            return transparent / samples < f.maxTransparentRatio && white / samples < f.maxWhiteRatio && black / samples < f.maxBlackRatio && colors.size >= (f.minColorBuckets || 6);
        }

        async compararCandidato(cand) {
            const matches = []; const rotations = this.config.rotations || [0,90,180,270];
            const dataUrl = cand.canvas.toDataURL('image/png');
            for (const graus of rotations) {
                const c = graus ? this.rotacionarCanvas(cand.canvas, graus) : cand.canvas;
                const norm = this.normalizarCanvas(c); const sig = this.criarAssinatura(norm.canvas, c.width / c.height);
                for (const ref of this.referencias) {
                    const score = this.compararAssinaturas(sig, ref.assinatura); const final = score.final;
                    const aceito = final >= this.config.similarityThreshold && score.hash >= this.config.hashThreshold;
                    this.logDebug({ referencia: ref.id, pagina: cand.pagina_pdf, tamanho: `${cand.canvas.width}x${cand.canvas.height}`, ...score, final, aceito });
                    if (aceito) matches.push({ referencia_id: ref.id, pagina_pdf: cand.pagina_pdf, confianca: Math.min(1, final), metodo: cand.metodo, mime_type: 'image/png', imagem_base64: dataUrl, largura_original: cand.canvas.width, altura_original: cand.canvas.height, hash: sig.hash, bbox: cand.bbox });
                }
                if (graus) c.width = c.height = 0; norm.canvas.width = norm.canvas.height = 0;
            }
            cand.canvas.width = cand.canvas.height = 0;
            return matches;
        }

        async detectarPorFallback(page, pageNum) {
            const scale = this.config.fallback?.renderScale || 2;
            const viewport = page.getViewport({ scale }); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = Math.min(3000, Math.floor(viewport.width)); canvas.height = Math.min(3000, Math.floor(viewport.height));
            await page.render({ canvasContext: ctx, viewport }).promise;
            const regioes = [{ x: Math.floor(canvas.width*.45), y: Math.floor(canvas.height*.55), width: Math.floor(canvas.width*.55), height: Math.floor(canvas.height*.45) }];
            const achadas = [];
            for (const r of regioes) {
                const rec = document.createElement('canvas'); rec.width=r.width; rec.height=r.height; rec.getContext('2d').drawImage(canvas,r.x,r.y,r.width,r.height,0,0,r.width,r.height);
                if (this.candidatoValido(rec, { getViewport: () => ({ width: canvas.width, height: canvas.height }) })) {
                    const fake = { canvas: rec, pagina_pdf: pageNum, metodo: 'fallback_template_canvas', bbox: r };
                    achadas.push(...await this.compararCandidato(fake));
                } else rec.width=rec.height=0;
            }
            canvas.width = canvas.height = 0;
            return achadas;
        }

        deduplicar(items) {
            const map = new Map();
            for (const item of items.sort((a,b) => b.confianca - a.confianca || (b.largura_original*b.altura_original)-(a.largura_original*a.altura_original))) {
                const key = item.referencia_id;
                if (!map.has(key)) map.set(key, item);
            }
            return [...map.values()];
        }

        normalizarCanvas(src) {
            const box = this.encontrarConteudo(src); const size = this.config.normalizedSize || 128;
            const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size);
            const scale = Math.min(size / box.width, size / box.height) * .92; const w = box.width * scale; const h = box.height * scale;
            ctx.drawImage(src, box.x, box.y, box.width, box.height, (size-w)/2, (size-h)/2, w, h);
            return { canvas };
        }
        encontrarConteudo(canvas) { const ctx=canvas.getContext('2d',{willReadFrequently:true}); const d=ctx.getImageData(0,0,canvas.width,canvas.height).data; let minX=canvas.width,minY=canvas.height,maxX=0,maxY=0; for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2){const i=(y*canvas.width+x)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3]; if(a>20 && !(r>245&&g>245&&b>245)){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}} return maxX ? {x:minX,y:minY,width:Math.max(1,maxX-minX+1),height:Math.max(1,maxY-minY+1)} : {x:0,y:0,width:canvas.width,height:canvas.height}; }
        criarAssinatura(canvas, aspect) { const gray=this.gray(canvas); return { hash:this.dHash(gray), hist:this.hist(canvas), edge:this.edge(gray), aspect }; }
        gray(canvas){const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data, out=[]; for(let i=0;i<d.length;i+=4) out.push(.299*d[i]+.587*d[i+1]+.114*d[i+2]); return {data:out,w:canvas.width,h:canvas.height};}
        dHash(g){let bits=''; for(let y=0;y<8;y++)for(let x=0;x<8;x++){const px=Math.floor(x*g.w/9), py=Math.floor(y*g.h/8); bits += g.data[py*g.w+px] > g.data[py*g.w+Math.min(g.w-1,px+Math.floor(g.w/9))] ? '1':'0';} return bits;}
        hist(canvas){const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,h=new Array(64).fill(0); for(let i=0;i<d.length;i+=16){h[(d[i]>>6)*16+(d[i+1]>>6)*4+(d[i+2]>>6)]++;} return h;}
        edge(g){const out=[]; for(let y=1;y<g.h-1;y+=4)for(let x=1;x<g.w-1;x+=4){const v=Math.abs(g.data[y*g.w+x]-g.data[y*g.w+x+1])+Math.abs(g.data[y*g.w+x]-g.data[(y+1)*g.w+x]); out.push(v>28?1:0);} return out;}
        compararAssinaturas(a,b){const hash=this.hashSim(a.hash,b.hash), color=this.cos(a.hist,b.hist), edge=this.binSim(a.edge,b.edge), aspect=1-Math.min(1,Math.abs(Math.log((a.aspect||1)/(b.aspect||1)))); const w=this.config.pesos||{}; return {hash, color, edge, aspect, final:hash*(w.hash||.5)+edge*(w.edge||.2)+color*(w.color||.2)+aspect*(w.aspect||.1)};}
        hashSim(a,b){let diff=0; for(let i=0;i<Math.min(a.length,b.length);i++) if(a[i]!==b[i]) diff++; return 1-diff/Math.max(a.length,b.length,1);}
        cos(a,b){let dot=0,na=0,nb=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];} return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);}
        binSim(a,b){let same=0,n=Math.min(a.length,b.length); for(let i=0;i<n;i++) if(a[i]===b[i]) same++; return same/(n||1);}
        async objetoImagemParaCanvas(img){ if(img instanceof HTMLCanvasElement) return img; if(window.ImageBitmap&&img instanceof ImageBitmap){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);return c;} if(img instanceof HTMLImageElement) return this.imagemParaCanvas(img); if(img instanceof ImageData) return this.imageDataParaCanvas(img); if(img?.width&&img?.height&&img?.data) return this.imageDataObjetoParaCanvas(img); return null; }
        imageDataParaCanvas(id){const c=document.createElement('canvas');c.width=id.width;c.height=id.height;c.getContext('2d').putImageData(id,0,0);return c;}
        imageDataObjetoParaCanvas(o){const c=document.createElement('canvas');c.width=o.width;c.height=o.height;const ctx=c.getContext('2d'), id=ctx.createImageData(o.width,o.height), src=o.data; for(let i=0,j=0;i<id.data.length;i+=4){id.data[i]=src[j++]||0;id.data[i+1]=src[j++]??id.data[i];id.data[i+2]=src[j++]??id.data[i];id.data[i+3]=src.length===o.width*o.height*4?(src[j++]||255):255;} ctx.putImageData(id,0,0); return c;}
        imagemParaCanvas(img){const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d').drawImage(img,0,0);return c;}
        base64ParaCanvas(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(this.imagemParaCanvas(img));img.onerror=()=>rej(new Error('Imagem inválida'));img.src=src;});}
        blobParaDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
        rotacionarCanvas(src, graus){const c=document.createElement('canvas'),ctx=c.getContext('2d'); const swap=graus%180!==0;c.width=swap?src.height:src.width;c.height=swap?src.width:src.height;ctx.translate(c.width/2,c.height/2);ctx.rotate(graus*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return c;}
        logDebug(d){ if(this.debug) console.log(`[LogoDetector] ref=${d.referencia} pagina=${d.pagina} tamanho=${d.tamanho} hash=${d.hash.toFixed(3)} color=${d.color.toFixed(3)} edge=${d.edge.toFixed(3)} aspect=${d.aspect.toFixed(3)} final=${d.final.toFixed(3)} ${d.aceito?'ACEITO':'rejeitado'}`); }
    }
    window.LogoDetector = LogoDetector;
})();
(function () {
  'use strict';

  // Conversão IFC → XKT feita no próprio navegador (Web Worker).
  // Nada é enviado ao servidor: sem Supabase, sem limite de upload da Vercel e sem tempo máximo de função.

  const WORKER_URL = '/ifc-tools/ifc-to-xkt-worker.js';

  const ifcFileInput = document.getElementById('ifcFileInput');
  const dropzone = document.getElementById('xktDropzone');
  const selectedFileName = document.getElementById('selectedFileName');
  const convertButton = document.getElementById('convertButton');
  const statusElement = document.getElementById('status');
  const progressFill = document.getElementById('progressFill');

  let selectedFile = null;
  let lastDownloadUrl = null;

  function setStatus(message, type = '') {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
  }

  function formatFileSize(bytes) {
    const mb = Number(bytes || 0) / (1024 * 1024);
    return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  }

  function setProgress(value) {
    const safe = Math.max(0, Math.min(100, value));
    progressFill.style.width = `${safe}%`;
  }

  function baseNameWithoutExtension(fileName = '') {
    return fileName.replace(/\.[^/.]+$/, '');
  }

  function updateSelectedFile(file) {
    selectedFile = file;
    if (!file) {
      selectedFileName.textContent = 'Nenhum arquivo selecionado.';
      convertButton.disabled = true;
      return;
    }

    selectedFileName.textContent = `Arquivo: ${file.name} (${formatFileSize(file.size)})`;
    convertButton.disabled = false;
  }

  function downloadArrayBuffer(arrayBuffer, fileName) {
    if (lastDownloadUrl) URL.revokeObjectURL(lastDownloadUrl);
    lastDownloadUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = lastDownloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function convertInWorker(arrayBuffer) {
    return new Promise((resolve, reject) => {
      let worker;
      try {
        worker = new Worker(WORKER_URL, { type: 'module' });
      } catch (error) {
        reject(new Error('Este navegador não suporta a conversão local. Use uma versão atual do Chrome, Edge ou Firefox.'));
        return;
      }

      worker.onmessage = ({ data }) => {
        if (data?.type === 'progress') {
          setProgress(data.percent);
          setStatus(data.message);
        } else if (data?.type === 'done') {
          worker.terminate();
          resolve(data);
        } else if (data?.type === 'error') {
          worker.terminate();
          reject(new Error(data.message));
        }
      };
      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event?.message || 'Falha ao iniciar o conversor.'));
      };

      worker.postMessage({ type: 'convert', buffer: arrayBuffer }, [arrayBuffer]);
    });
  }

  async function convertIfcToXkt() {
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.ifc')) {
      setStatus('Selecione apenas arquivos com extensão .ifc.', 'error');
      return;
    }

    convertButton.disabled = true;
    setProgress(5);
    setStatus('Lendo o arquivo...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await convertInWorker(arrayBuffer);
      const fileName = `${baseNameWithoutExtension(selectedFile.name) || 'modelo'}.xkt`;

      setProgress(100);
      downloadArrayBuffer(result.xkt, fileName);

      const seconds = result.stats.seconds.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      setStatus(
        `Conversão concluída em ${seconds} s! ${fileName} (${formatFileSize(result.xkt.byteLength)}) • ` +
        `${result.stats.objects} objetos. O download começou automaticamente.`,
        'ok'
      );
    } catch (error) {
      console.error('Falha na conversão IFC → XKT', error);
      setProgress(0);
      const message = String(error?.message || error || 'Erro desconhecido.');
      const friendly = /memory|Out of bounds|allocation/i.test(message)
        ? 'O navegador ficou sem memória para este IFC. Feche outras abas e tente novamente, ou divida o modelo por disciplina/pavimento.'
        : message;
      setStatus(`Erro ao converter: ${friendly}`, 'error');
    } finally {
      convertButton.disabled = !selectedFile;
    }
  }

  ifcFileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0] || null;
    updateSelectedFile(file);
    setProgress(0);
    setStatus('');
  });

  convertButton.addEventListener('click', convertIfcToXkt);

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setStatus('Selecione apenas arquivos com extensão .ifc.', 'error');
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    ifcFileInput.files = dataTransfer.files;
    updateSelectedFile(file);
    setProgress(0);
    setStatus('');
  });
}());

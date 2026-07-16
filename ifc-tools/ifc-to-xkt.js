(function () {
  'use strict';

  const SUPABASE_BUCKET = 'ifc-conversions';

  let supabaseClient = null;
  let supabaseBucket = SUPABASE_BUCKET;
  let supabaseConfigPromise = null;

  function isValidHttpUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  async function readErrorMessage(response) {
    try {
      const payload = await response.json();
      return payload?.error || payload?.message || response.statusText;
    } catch (error) {
      return response.statusText || 'Erro desconhecido.';
    }
  }

  async function carregarSupabaseConfig() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!supabaseConfigPromise) {
      supabaseConfigPromise = fetch('/api/supabase-public-config')
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await readErrorMessage(response));
          }

          const config = await response.json();
          const supabaseUrl = String(config?.supabaseUrl || '').trim();
          const supabaseAnonKey = String(config?.supabaseAnonKey || '').trim();
          const bucket = String(config?.bucket || SUPABASE_BUCKET).trim();

          if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey || !bucket) {
            throw new Error(
              'Supabase Storage não configurado. Arquivos grandes não podem ser enviados diretamente para a Vercel. Configure SUPABASE_URL, SUPABASE_ANON_KEY e o bucket ifc-conversions.'
            );
          }

          supabaseBucket = bucket;
          supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
          return supabaseClient;
        })
        .catch((error) => {
          supabaseConfigPromise = null;
          throw error;
        });
    }

    return supabaseConfigPromise;
  }

  const ifcFileInput = document.getElementById('ifcFileInput');
  const dropzone = document.getElementById('xktDropzone');
  const selectedFileName = document.getElementById('selectedFileName');
  const convertButton = document.getElementById('convertButton');
  const statusElement = document.getElementById('status');
  const progressFill = document.getElementById('progressFill');

  let selectedFile = null;

  function setStatus(message, type = '') {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
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

    selectedFileName.textContent = `Arquivo: ${file.name}`;
    convertButton.disabled = false;
  }

  function sanitizeStorageFileName(fileName) {
    const base = String(fileName || 'modelo.ifc').split(/[\\/]/).pop();
    return base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async function prepararUrlAssinadaUpload(fileName) {
    const response = await fetch('/api/ifc-storage-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const uploadConfig = await response.json();

    if (!uploadConfig?.ok || !uploadConfig.path || !uploadConfig.token) {
      throw new Error(uploadConfig?.error || 'A API não retornou uma URL assinada de upload válida.');
    }

    supabaseBucket = uploadConfig.bucket || supabaseBucket;
    return uploadConfig;
  }

  async function uploadIfcToSupabaseStorage(file) {
    const client = await carregarSupabaseConfig();

    setProgress(15);
    setStatus('Preparando URL assinada e enviando IFC para o Supabase Storage...', '');

    const uploadConfig = await prepararUrlAssinadaUpload(sanitizeStorageFileName(file.name));

    const { data, error } = await client.storage
      .from(supabaseBucket)
      .uploadToSignedUrl(uploadConfig.path, uploadConfig.token, file, {
        contentType: file.type || 'application/octet-stream'
      });

    if (error) {
      throw new Error(
        `Falha no upload para o Supabase Storage via URL assinada. Detalhes: ${error.message}`
      );
    }

    return data.path || uploadConfig.path;
  }

  async function convertUploadedIfc(storagePath, originalName) {
    setProgress(60);
    setStatus('Convertendo IFC no servidor com convert2xkt...', '');

    const response = await fetch('/api/ifc-to-xkt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath, originalName })
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('O arquivo é grande demais para envio direto à Vercel. Use o fluxo de upload direto para o armazenamento.');
      }
      throw new Error(await readErrorMessage(response));
    }

    return response.json();
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
    setStatus('Iniciando fluxo de upload direto para evitar limite 413 da Vercel...', '');

    try {
      const storagePath = await uploadIfcToSupabaseStorage(selectedFile);
      const result = await convertUploadedIfc(storagePath, selectedFile.name);

      if (!result?.ok || !result.downloadUrl) {
        throw new Error(result?.error || 'A conversão não retornou uma URL de download.');
      }

      setProgress(90);
      setStatus('XKT gerado. Abrindo URL assinada de download...', '');
      window.location.href = result.downloadUrl;
      if (result.shouldRevokeUrl) {
        setTimeout(() => URL.revokeObjectURL(result.downloadUrl), 60 * 1000);
      }

      setProgress(100);
      setStatus(`Conversão concluída! Arquivo disponível: ${result.fileName || `${baseNameWithoutExtension(selectedFile.name) || 'modelo'}.xkt`}`, 'ok');
    } catch (error) {
      console.error('Falha na conversão IFC → XKT', error);
      setProgress(0);
      const message = String(error?.message || error || 'Erro desconhecido.');
      const friendlyMessage = message.includes('413')
        ? 'O arquivo é grande demais para envio direto à Vercel. Use o fluxo de upload direto para o armazenamento.'
        : message;
      setStatus(`Erro ao converter: ${friendlyMessage}`, 'error');
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
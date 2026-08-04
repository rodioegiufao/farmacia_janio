(function inicializarOpenCVLoader() {
    let carregamentoPromise = null;

    function aguardarRuntime(cv, timeoutMs = 45000) {
        return new Promise((resolve, reject) => {
            const inicio = Date.now();
            const concluir = () => resolve(cv);
            if (cv?.Mat && cv?.matchTemplate && cv?.TM_CCOEFF_NORMED !== undefined) return concluir();
            const anterior = cv.onRuntimeInitialized;
            cv.onRuntimeInitialized = () => {
                if (typeof anterior === 'function') anterior();
                concluir();
            };
            const timer = setInterval(() => {
                if (cv?.Mat && cv?.matchTemplate && cv?.TM_CCOEFF_NORMED !== undefined) {
                    clearInterval(timer); concluir();
                } else if (Date.now() - inicio > timeoutMs) {
                    clearInterval(timer); reject(new Error('Timeout ao inicializar OpenCV.js'));
                }
            }, 100);
        });
    }

    function carregarOpenCV() {
        if (window.cv?.Mat && window.cv?.matchTemplate) return Promise.resolve(window.cv);
        if (carregamentoPromise) return carregamentoPromise;
        carregamentoPromise = new Promise((resolve, reject) => {
            const existente = document.querySelector('script[data-opencv-loader="true"]');
            const script = existente || document.createElement('script');
            script.dataset.opencvLoader = 'true';
            script.async = true;
            script.src = script.src || 'https://docs.opencv.org/4.9.0/opencv.js';
            script.onload = () => aguardarRuntime(window.cv).then(resolve, reject);
            script.onerror = () => reject(new Error('Falha ao carregar OpenCV.js'));
            if (!existente) document.head.appendChild(script);
        }).catch(error => {
            carregamentoPromise = null;
            throw error;
        });
        return carregamentoPromise;
    }

    window.OpenCVLoader = { carregarOpenCV };
})();
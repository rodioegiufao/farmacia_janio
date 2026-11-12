// js/main.js
document.addEventListener('DOMContentLoaded', function () {

    // ========== MENU DROPDOWN COM CLIQUE ==========
    const menuItems = document.querySelectorAll('.menu-item-has-children');
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#ferramentas') e.preventDefault();
            menuItems.forEach(otherItem => { if (otherItem !== item) otherItem.classList.remove('active'); });
            const aberto = item.classList.toggle('active');
            link.setAttribute('aria-expanded', String(aberto));
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.main-navigation')) menuItems.forEach(item => item.classList.remove('active'));
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') menuItems.forEach(item => item.classList.remove('active'));
    });

    // ========== MENU MOBILE ==========
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');

    function setNavOpen(open) {
        if (!navToggle || !mainNav) return;
        mainNav.classList.toggle('open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    navToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        setNavOpen(!mainNav.classList.contains('open'));
    });
    document.addEventListener('click', (e) => {
        if (mainNav?.classList.contains('open') && !e.target.closest('#mainNav') && !e.target.closest('#navToggle')) setNavOpen(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNavOpen(false); });

    // ========== LOGIN NA TELA PRINCIPAL ==========
    (function initHomeLogin() {
        const loginForm = document.getElementById('homeLoginForm');
        const loginTrigger = document.getElementById('homeLoginTrigger');
        const loginMensagem = document.getElementById('homeLoginMensagem');
        const loginUsuario = document.getElementById('homeLoginUsuario');
        const loginSenha = document.getElementById('homeLoginSenha');
        const passwordToggle = document.getElementById('homePasswordToggle');
        const protectedLinks = document.querySelectorAll('[data-auth-required="true"]');
        const ferramentasMenu = document.getElementById('ferramentasMenu');
        let currentUser = null;

        if (!loginForm || !window.SiteAuth) return;

        function showMessage(texto) {
            if (!loginMensagem) return alert(texto);
            loginMensagem.textContent = texto;
            loginMensagem.hidden = !texto;
        }

        function openLoginPanel(mensagem) {
            if (currentUser) return;
            if (!loginTrigger) {
                loginForm.hidden = false;
            } else {
                loginForm.hidden = false;
                loginTrigger.setAttribute('aria-expanded', 'true');
            }
            showMessage(mensagem || '');
            loginUsuario.focus();
        }

        function closeLoginPanel() {
            if (!loginTrigger) return; // sem gatilho, o formulário fica sempre visível
            loginForm.hidden = true;
            loginTrigger.setAttribute('aria-expanded', 'false');
            showMessage('');
        }

        loginTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (loginForm.hidden) openLoginPanel();
            else closeLoginPanel();
        });

        document.addEventListener('click', (e) => {
            if (!loginForm.hidden && loginTrigger && !e.target.closest('#homeAuth')) closeLoginPanel();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !loginForm.hidden && loginTrigger) {
                closeLoginPanel();
                loginTrigger.focus();
            }
        });

        passwordToggle?.addEventListener('click', () => {
            const mostrarSenha = loginSenha.type === 'password';
            loginSenha.type = mostrarSenha ? 'text' : 'password';
            passwordToggle.setAttribute('aria-label', mostrarSenha ? 'Ocultar senha' : 'Mostrar senha');
            passwordToggle.setAttribute('aria-pressed', String(mostrarSenha));
            passwordToggle.querySelector('use')?.setAttribute('href', mostrarSenha ? '#i-eye-off' : '#i-eye');
        });

        function redirectAfterLogin() {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            if (redirect) {
                window.location.href = currentUser?.perfil === 'cliente' && !redirect.startsWith('/3D') ? '/3D/' : redirect;
            }
        }

        function updateAuthUi(user) {
            currentUser = user;
            if (loginTrigger) {
                loginTrigger.hidden = Boolean(user);
                if (user) closeLoginPanel();
            } else {
                loginForm.hidden = Boolean(user);
            }
            const isInternalUser = user?.perfil === 'admin' || user?.perfil === 'colaborador';
            if (ferramentasMenu) ferramentasMenu.hidden = !isInternalUser;
            window.SiteAuth.aplicarUsuarioNoMenu?.(user);
        }

        async function refreshSession() {
            const user = await window.SiteAuth.getCurrentUser();
            updateAuthUi(user);
            if (!user && new URLSearchParams(window.location.search).get('login') === 'necessario') {
                openLoginPanel('Entre com seu usuário para acessar a página solicitada.');
            }
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                const data = await window.SiteAuth.requestJson('/api/auth', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario: loginUsuario.value,
                        senha: loginSenha.value
                    })
                });
                loginSenha.value = '';
                updateAuthUi(data.user);
                redirectAfterLogin();
            } catch (error) {
                showMessage(error.message || 'Usuário ou senha inválidos.');
                loginSenha.focus();
            }
        });

        protectedLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                if (currentUser) return;
                event.preventDefault();
                event.stopPropagation();
                openLoginPanel('Entre com seu usuário para acessar esta ferramenta.');
            });
        });

        refreshSession();
    })();

    // ========== FORMULÁRIO DE CONTATO ==========
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(contactForm));
            if (!data.nome || !data.email || !data.mensagem) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
            contactForm.reset();
        });
    }

    // ========== SCROLL SUAVE ==========
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#ferramentas') return;
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;
            e.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', targetId);
            menuItems.forEach(item => item.classList.remove('active'));
            setNavOpen(false);
        });
    });

    // ========== GALERIA - LIGHTBOX (outras páginas) ==========
    document.querySelectorAll('.gallery-image').forEach(img => {
        img.addEventListener('click', function () {
            const lightbox = document.createElement('div');
            lightbox.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:10000;cursor:pointer;';
            const enlargedImg = document.createElement('img');
            enlargedImg.src = this.src;
            enlargedImg.alt = this.alt;
            enlargedImg.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;';
            lightbox.appendChild(enlargedImg);
            document.body.appendChild(lightbox);
            const fechar = () => { lightbox.remove(); document.removeEventListener('keydown', closeOnEsc); };
            function closeOnEsc(e) { if (e.key === 'Escape') fechar(); }
            lightbox.addEventListener('click', fechar);
            document.addEventListener('keydown', closeOnEsc);
        });
    });

    window.addEventListener('load', function () { document.body.classList.add('loaded'); });

    // ========== CARROSSEL (mantido para compatibilidade) ==========
    const track = document.querySelector('.carousel-track');
    if (track) {
        const slides = document.querySelectorAll('.carousel-item');
        const dots = document.querySelectorAll('.dot');
        let currentIndex = 0;
        let slideInterval;
        const updateCarousel = (index) => {
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
            currentIndex = index;
        };
        const startInterval = () => {
            clearInterval(slideInterval);
            slideInterval = setInterval(() => updateCarousel((currentIndex + 1) % slides.length), 4000);
        };
        document.querySelector('.carousel-btn.next')?.addEventListener('click', () => { updateCarousel((currentIndex + 1) % slides.length); startInterval(); });
        document.querySelector('.carousel-btn.prev')?.addEventListener('click', () => { updateCarousel((currentIndex - 1 + slides.length) % slides.length); startInterval(); });
        dots.forEach((dot, i) => dot.addEventListener('click', () => { updateCarousel(i); startInterval(); }));
        updateCarousel(0);
        startInterval();
    }

    // ========== MODAL DOS PROJETOS ==========
    (function initProjectModal() {
        const modal = document.querySelector('.carousel-modal');
        if (!modal) return;

        const modalImage = modal.querySelector('.modal-image');
        const modalTitle = modal.querySelector('.modal-title');
        const modalDescription = modal.querySelector('.modal-description');
        const modalClose = modal.querySelector('.modal-close');
        const triggers = document.querySelectorAll('[data-project]');
        let lastTrigger = null;

        const projectDescriptions = {
            1: {
                title: "Instalações industriais",
                description: "Projetos completos de instalações elétricas industriais, incluindo dimensionamento de equipamentos, distribuição de energia, sistemas de proteção e comando, atendendo às normas técnicas e especificações do cliente. Desenvolvimento de diagramas unifilares, especificação de componentes e elaboração de memorial descritivo.",
                image: "./images/imagem1.jpg"
            },
            2: {
                title: "Sistemas fotovoltaicos",
                description: "Projetos de energia solar fotovoltaica para residências, comércios e indústrias. Desenvolvimento desde o estudo de viabilidade, dimensionamento dos componentes (módulos, inversores, estruturas), até o projeto executivo para aprovação na concessionária. Cálculo de irradiação solar, estimativa de produção de energia e análise de retorno do investimento.",
                image: "./images/imagem2.jpg"
            },
            3: {
                title: "SPDA e aterramento",
                description: "Sistemas de Proteção contra Descargas Atmosféricas (SPDA) e aterramento elétrico para diversos tipos de edificações. Projetos que garantem a segurança das pessoas e equipamentos, em conformidade com a NBR 5419. Dimensionamento de captores, condutores de descida, malha de aterramento e equipotencialização.",
                image: "./images/imagem3.jpg"
            }
        };

        triggers.forEach(trigger => {
            trigger.addEventListener('click', function () {
                const project = projectDescriptions[this.getAttribute('data-project')];
                if (!project) return;
                lastTrigger = this;
                modalImage.src = project.image;
                modalImage.alt = project.title;
                modalTitle.textContent = project.title;
                modalDescription.textContent = project.description;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                modalClose?.focus();
            });
        });

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            lastTrigger?.focus();
        }

        modalClose?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });
    })();

    // ========== REVEAL (outras páginas) ==========
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        reveals.forEach(el => observer.observe(el));
    }

    // ========== ANO NO RODAPÉ ==========
    const anoAtual = document.getElementById('anoAtual');
    if (anoAtual) anoAtual.textContent = String(new Date().getFullYear());

    // ========== SELETOR DE TEMA ==========
    (function initThemeSelector() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        let savedTheme = null;
        try { savedTheme = localStorage.getItem('theme'); } catch (_e) { /* storage indisponível */ }
        const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
        const theme = savedTheme || html.getAttribute('data-theme') || (prefersLight ? 'light' : 'dark');
        html.setAttribute('data-theme', theme);
        if (!themeToggle) return;

        themeToggle.checked = theme === 'light';
        themeToggle.addEventListener('change', function () {
            const novoTema = this.checked ? 'light' : 'dark';
            html.setAttribute('data-theme', novoTema);
            try { localStorage.setItem('theme', novoTema); } catch (_e) { /* storage indisponível */ }
        });
    })();
});

/* ==========================================================================
   Juan Vanegas — Portafolio
   Idioma · menú · scroll · animaciones · visor de imágenes · filtros · formulario
   ========================================================================== */
(function () {
    'use strict';

    const root = document.documentElement;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* modo privado */ } }
    };

    // Ruta del sprite de íconos, tomada de un <use> que ya esté en la página.
    const spriteUse = $('use[href*="icons.svg"]');
    const SPRITE = (spriteUse ? spriteUse.getAttribute('href') : 'static/img/icons.svg').split('#')[0];

    function icon(name) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', 'icon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(ns, 'use');
        use.setAttribute('href', SPRITE + '#' + name);
        svg.appendChild(use);
        return svg;
    }

    const UI = {
        es: {
            toggle: 'EN',
            toggleLabel: 'Ver el sitio en inglés',
            menuOpen: 'Abrir menú',
            menuClose: 'Cerrar menú',
            copied: 'Correo copiado',
            copyFail: 'No se pudo copiar el correo',
            sending: 'Enviando…',
            sent: '¡Mensaje enviado! Te respondo pronto.',
            formError: 'No se pudo enviar. Escríbeme directo a vanegasarrietajuandiego@gmail.com'
        },
        en: {
            toggle: 'ES',
            toggleLabel: 'Ver el sitio en español',
            menuOpen: 'Open menu',
            menuClose: 'Close menu',
            copied: 'Email copied',
            copyFail: "Couldn't copy the email",
            sending: 'Sending…',
            sent: "Message sent! I'll get back to you soon.",
            formError: "Couldn't send it. Email me directly at vanegasarrietajuandiego@gmail.com"
        }
    };

    /* ======================================================================
       IDIOMA
       El HTML está escrito en español. Cada texto traducible lleva su versión
       en inglés en data-en (o data-en-html / data-en-<atributo>).
       ====================================================================== */
    const I18N_ATTRS = ['aria-label', 'placeholder', 'alt', 'title', 'content'];
    const I18N_SELECTOR = ['[data-en]', '[data-en-html]']
        .concat(I18N_ATTRS.map(attr => '[data-en-' + attr + ']'))
        .join(',');
    let lang = 'es';

    function rememberSpanish(el) {
        if (el.hasAttribute('data-i18n')) return;
        if (el.hasAttribute('data-en')) el.setAttribute('data-es', el.textContent);
        if (el.hasAttribute('data-en-html')) el.setAttribute('data-es-html', el.innerHTML);
        I18N_ATTRS.forEach(attr => {
            if (el.hasAttribute('data-en-' + attr)) el.setAttribute('data-es-' + attr, el.getAttribute(attr) || '');
        });
        el.setAttribute('data-i18n', '');
    }

    function applyLang(next, save) {
        lang = next === 'en' ? 'en' : 'es';
        root.lang = lang;
        root.setAttribute('data-lang', lang);

        $$(I18N_SELECTOR).forEach(el => {
            rememberSpanish(el);
            if (el.hasAttribute('data-en')) el.textContent = el.getAttribute('data-' + lang);
            if (el.hasAttribute('data-en-html')) el.innerHTML = el.getAttribute('data-' + lang + '-html');
            I18N_ATTRS.forEach(attr => {
                if (el.hasAttribute('data-en-' + attr)) el.setAttribute(attr, el.getAttribute('data-' + lang + '-' + attr));
            });
        });

        $$('.lang-toggle').forEach(btn => {
            const label = $('.lang-toggle-label', btn);
            if (label) label.textContent = UI[lang].toggle;
            btn.setAttribute('aria-label', UI[lang].toggleLabel);
        });

        if (save) store.set('lang', lang);
        if (window.CarnavalGame) window.CarnavalGame.setLang(lang);
        document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    }

    // ?lang=en sirve para compartir el enlace directo en inglés.
    const langParam = new URLSearchParams(location.search).get('lang');
    const savedLang = store.get('lang');
    const isLang = value => value === 'es' || value === 'en';
    applyLang(isLang(langParam) ? langParam : (isLang(savedLang) ? savedLang : 'es'), isLang(langParam));

    $$('.lang-toggle').forEach(btn => {
        btn.addEventListener('click', () => applyLang(lang === 'es' ? 'en' : 'es', true));
    });

    /* ---------- Avisos flotantes ---------- */
    const toast = $('#toast');
    let toastTimer = 0;

    function showToast(nodes, timeout) {
        if (!toast) return;
        toast.replaceChildren(...[].concat(nodes));
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        if (timeout !== 0) toastTimer = setTimeout(hideToast, timeout || 2600);
    }
    function hideToast() {
        if (toast) toast.classList.remove('is-visible');
    }

    // A quien tenga el navegador en otro idioma se le sugiere (una vez) la versión en inglés.
    (function suggestEnglish() {
        if (lang !== 'es' || isLang(langParam) || isLang(savedLang) || store.get('langHint')) return;
        const browser = (navigator.languages && navigator.languages[0]) || navigator.language || '';
        if (!browser || /^es\b/i.test(browser)) return;
        store.set('langHint', '1');

        const text = document.createElement('span');
        text.textContent = 'This site is in Spanish.';
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'toast-action';
        go.textContent = 'View in English';
        go.addEventListener('click', () => { applyLang('en', true); hideToast(); });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'toast-close';
        close.setAttribute('aria-label', 'Dismiss');
        close.appendChild(icon('x'));
        close.addEventListener('click', hideToast);

        setTimeout(() => showToast([icon('languages'), text, go, close], 12000), 1500);
    })();

    /* ======================================================================
       MENÚ
       ====================================================================== */
    const header = $('.site-header');
    const navToggle = $('.nav-toggle');
    const navLinks = $('#navLinks');

    function setMenu(open) {
        header.classList.toggle('is-open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', UI[lang][open ? 'menuClose' : 'menuOpen']);
    }

    if (header && navToggle && navLinks) {
        setMenu(false);
        navToggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
        navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('click', e => {
            if (header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && header.classList.contains('is-open')) {
                setMenu(false);
                navToggle.focus();
            }
        });
        document.addEventListener('langchange', () => setMenu(header.classList.contains('is-open')));
        window.matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
    }

    /* ======================================================================
       SCROLL: barra de progreso, cabecera y botón para subir
       ====================================================================== */
    const progress = $('.scroll-progress');
    const toTop = $('.to-top');
    let ticking = false;

    function onScroll() {
        const y = window.scrollY;
        const max = root.scrollHeight - window.innerHeight;
        if (header) header.classList.toggle('is-scrolled', y > 12);
        if (toTop) toTop.classList.toggle('is-visible', y > window.innerHeight * 1.2);
        if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });
    }

    /* ---------- Enlace activo del menú ---------- */
    const navAnchors = $$('.nav-links a[href^="#"]');
    const spyTargets = $$('main section[id]');
    if ('IntersectionObserver' in window && navAnchors.length) {
        const spy = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = '#' + entry.target.id;
                navAnchors.forEach(a => {
                    const active = a.getAttribute('href') === id;
                    a.classList.toggle('is-active', active);
                    if (active) a.setAttribute('aria-current', 'true');
                    else a.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        spyTargets.forEach(section => spy.observe(section));
    }

    /* ---------- Aparición al hacer scroll ----------
       Solo se ocultan los bloques que aún están fuera de pantalla: si el JS
       falla o tarda, nada queda invisible. */
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const revealer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

        $$('.reveal').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
            el.classList.add('reveal-pending');
            revealer.observe(el);
        });
    }

    /* ======================================================================
       VISOR DE IMÁGENES (galerías con data-gallery)
       ====================================================================== */
    const lightbox = $('#lightbox');

    if (lightbox) {
        const lbImg = $('.lb-img', lightbox);
        const lbText = $('.lb-text', lightbox);
        const lbCount = $('.lb-count', lightbox);
        const lbClose = $('.lb-close', lightbox);
        let items = [];
        let index = 0;
        let returnFocus = null;
        let closeTimer = 0;

        const captionOf = item => (lang === 'en' && item.getAttribute('data-en-caption')) ||
            item.getAttribute('data-caption') || ($('img', item) ? $('img', item).alt : '');

        // Las fotos de tarjetas ocultas por un filtro no entran en la galería.
        const galleryItems = name => $$('[data-gallery="' + name + '"]')
            .filter(el => !el.parentElement.closest('[hidden]'));

        function render() {
            const item = items[index];
            if (!item) return;
            lbImg.classList.add('is-loading');
            lbImg.onload = () => lbImg.classList.remove('is-loading');
            lbImg.src = item.getAttribute('href');
            lbImg.alt = ($('img', item) && $('img', item).alt) || captionOf(item);
            lbText.textContent = captionOf(item);
            lbCount.textContent = items.length > 1 ? (index + 1) + ' / ' + items.length : '';
            if (items.length > 1) new Image().src = items[(index + 1) % items.length].getAttribute('href');
        }

        function open(trigger) {
            items = galleryItems(trigger.getAttribute('data-gallery'));
            index = Math.max(0, items.indexOf(trigger));
            returnFocus = document.activeElement;
            clearTimeout(closeTimer);
            lightbox.hidden = false;
            lightbox.classList.toggle('is-single', items.length < 2);
            document.body.classList.add('is-locked');
            render();
            requestAnimationFrame(() => lightbox.classList.add('is-open'));
            lbClose.focus({ preventScroll: true });
        }

        function close() {
            lightbox.classList.remove('is-open');
            document.body.classList.remove('is-locked');
            closeTimer = setTimeout(() => {
                lightbox.hidden = true;
                lbImg.removeAttribute('src');
            }, reducedMotion.matches ? 0 : 250);
            if (returnFocus) returnFocus.focus({ preventScroll: true });
        }

        function step(delta) {
            if (items.length < 2) return;
            index = (index + delta + items.length) % items.length;
            render();
        }

        document.addEventListener('click', e => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const opener = e.target.closest('[data-gallery-open]');
            const trigger = opener ? galleryItems(opener.getAttribute('data-gallery-open'))[0] : e.target.closest('[data-gallery]');
            if (!trigger) return;
            e.preventDefault();
            open(trigger);
        });

        lightbox.addEventListener('click', e => {
            if (e.target.closest('.lb-prev')) step(-1);
            else if (e.target.closest('.lb-next')) step(1);
            else if (e.target.closest('.lb-close') || e.target === lightbox || e.target.classList.contains('lb-figure')) close();
        });

        document.addEventListener('keydown', e => {
            if (lightbox.hidden) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowRight') step(1);
            else if (e.key === 'ArrowLeft') step(-1);
            else if (e.key === 'Tab') {
                const focusables = $$('button', lightbox).filter(b => getComputedStyle(b).visibility !== 'hidden');
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        // Deslizar con el dedo para cambiar de foto.
        let touchX = null;
        lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
        lightbox.addEventListener('touchend', e => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX = null;
        });

        document.addEventListener('langchange', () => { if (!lightbox.hidden) render(); });
    }

    /* ======================================================================
       FILTROS DE CERTIFICADOS
       ====================================================================== */
    const filterButtons = $$('.filter');
    const certCards = $$('.cert');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            filterButtons.forEach(b => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            certCards.forEach(card => {
                const show = filter === 'all' || card.getAttribute('data-cat') === filter;
                card.hidden = !show;
                if (show) card.classList.add('is-visible');
            });
        });
    });

    /* ======================================================================
       COPIAR CORREO
       ====================================================================== */
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-copy]');
        if (!btn) return;
        const done = ok => showToast(ok ? [icon('check'), document.createTextNode(UI[lang].copied)]
                                        : document.createTextNode(UI[lang].copyFail));
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(() => done(true), () => done(false));
        } else {
            done(false);
        }
    });

    /* ======================================================================
       FORMULARIO DE CONTACTO (Netlify Forms)
       ====================================================================== */
    const form = $('#contactForm');

    if (form) {
        const status = $('.form-status', form);
        const submit = $('button[type="submit"]', form);

        form.addEventListener('submit', e => {
            e.preventDefault();
            if (!form.reportValidity()) return;

            status.className = 'form-status';
            status.textContent = UI[lang].sending;
            submit.disabled = true;

            fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(form)).toString()
            })
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    form.reset();
                    status.classList.add('is-ok');
                    status.textContent = UI[lang].sent;
                })
                .catch(() => {
                    status.classList.add('is-error');
                    status.textContent = UI[lang].formError;
                })
                .finally(() => { submit.disabled = false; });
        });
    }

    /* ---------- Año del pie de página ---------- */
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
})();

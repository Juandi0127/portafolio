/* ==========================================================================
   Juan Vanegas — Portafolio · Movimiento
   - Fundido lento de las fotos del inicio (el gesto principal)
   - Títulos que suben palabra por palabra desde su máscara
   - Entradas escalonadas por sección (texto, fotos que se abren, filas)
   - Escenario fijo de proyectos: la lista pasa y la captura cambia
   - Vista previa de certificados al pasar el puntero
   - Cifras que cuentan una vez · paralaje leve · pie que se descubre
   Todo queda visible sin JS y con movimiento reducido.
   ========================================================================== */
(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = reduceQuery.matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const lang = () => (window.SiteLang ? window.SiteLang.get() : document.documentElement.lang || 'es');
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const vh = () => window.innerHeight;
    const belowFold = el => el.getBoundingClientRect().top > vh() * 0.9;

    /* ======================================================================
       1. TÍTULOS PARTIDOS EN PALABRAS
       ====================================================================== */
    function split(el) {
        const words = el.textContent.trim().replace(/\s+/g, ' ').split(' ');
        el.textContent = '';
        words.forEach((word, i) => {
            const mask = document.createElement('span');
            mask.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = word;
            inner.style.setProperty('--wi', i);
            mask.appendChild(inner);
            el.appendChild(mask);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    }

    const splitHeads = $$('[data-split]');
    splitHeads.forEach(el => {
        split(el);
        if (!reduce && belowFold(el)) el.classList.add('split-pending');
    });

    // Al cambiar de idioma el texto se reemplaza: se vuelve a partir, ya visible.
    document.addEventListener('langchange', () => {
        splitHeads.forEach(el => {
            if (el.querySelector('.w')) return;
            split(el);
            if (el.classList.contains('split-pending')) el.classList.add('is-in');
        });
        updateCaption(true);
        renderFrameCaption(true);
    });

    /* ======================================================================
       2. ENTRADAS AL HACER SCROLL
       Cada bloque se oculta solo si todavía está fuera de pantalla; los que
       entran juntos en el mismo instante se escalonan 70 ms.
       ====================================================================== */
    const TYPES = { '': 'rv', pic: 'rv-pic', row: 'rv-row', rise: 'rv-rise', open: 'rv-open' };
    const DURATION = { rv: 1000, 'rv-pic': 1300, 'rv-row': 800, 'rv-rise': 1200, 'rv-open': 1200 };

    function settle(el, cls, delay) {
        // Al terminar se quitan las clases: así vuelven los efectos al pasar el puntero.
        setTimeout(() => {
            el.classList.remove(cls, 'is-in');
            el.style.removeProperty('--d');
        }, DURATION[cls] + delay + 80);
    }

    const pending = new Set();
    let revealNow = () => {};

    if ('IntersectionObserver' in window && !reduce) {
        const io = new IntersectionObserver(entries => {
            revealNow(entries.filter(e => e.isIntersecting).map(e => e.target));
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

        revealNow = list => {
            const entering = list.filter(el => pending.has(el));
            entering.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return (ra.top - rb.top) || (ra.left - rb.left);
            });
            entering.forEach((el, i) => {
                io.unobserve(el);
                pending.delete(el);
                if (el.hasAttribute('data-split')) {
                    el.classList.add('is-in');
                    return;
                }
                const cls = el.dataset.rvClass;
                const delay = Math.min(i, 6) * 70;
                el.style.setProperty('--d', delay + 'ms');
                const go = () => {
                    el.classList.add('is-in');
                    settle(el, cls, delay);
                };
                // Una foto se abre cuando ya cargó (o tras 900 ms, lo que pase primero).
                const img = cls === 'rv-pic' ? el.querySelector('img') : null;
                if (img && !img.complete) {
                    let fired = false;
                    const fire = () => { if (!fired) { fired = true; go(); } };
                    img.loading = 'eager';
                    img.addEventListener('load', fire, { once: true });
                    img.addEventListener('error', fire, { once: true });
                    setTimeout(fire, 900);
                } else {
                    go();
                }
            });
        };

        // Las fotos recortadas no cuentan como visibles para la carga diferida:
        // se piden a pantalla y media de distancia para que estén listas al llegar.
        const warm = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                warm.unobserve(entry.target);
                $$('img[loading="lazy"]', entry.target).forEach(img => { img.loading = 'eager'; });
            });
        }, { rootMargin: '0px 0px 150% 0px' });

        $$('[data-reveal]').forEach(el => {
            if (!belowFold(el)) return;
            const cls = TYPES[el.getAttribute('data-reveal')] || 'rv';
            if (cls === 'rv-pic' || cls === 'rv-open') warm.observe(el);
            el.dataset.rvClass = cls;
            el.classList.add(cls);
            pending.add(el);
            io.observe(el);
        });
        splitHeads.forEach(el => {
            if (!el.classList.contains('split-pending')) return;
            pending.add(el);
            io.observe(el);
        });
    }

    // Red de seguridad: un scroll muy rápido (o un salto con un enlace) puede
    // pasar por encima de un bloque sin que el observador lo vea entrar. Al
    // detenerse el scroll se revela todo lo que ya quedó por encima del borde.
    let sweepTimer = 0;
    function sweep() {
        if (!pending.size) return;
        const limit = vh() * 0.92;
        revealNow(Array.from(pending).filter(el => el.getBoundingClientRect().top < limit));
    }
    window.addEventListener('scroll', () => { clearTimeout(sweepTimer); sweepTimer = setTimeout(sweep, 140); }, { passive: true });

    /* ======================================================================
       3. CIFRAS QUE CUENTAN UNA VEZ
       ====================================================================== */
    const counters = $$('[data-count]');
    if (!reduce && 'IntersectionObserver' in window) {
        const easeOut = t => 1 - Math.pow(2, -10 * t);
        const countIO = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                countIO.unobserve(entry.target);
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'), 10) || 0;
                const start = performance.now();
                const dur = 1400;
                const tick = now => {
                    const t = clamp((now - start) / dur, 0, 1);
                    el.textContent = String(Math.round(target * easeOut(t)));
                    if (t < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        }, { threshold: 0.6 });
        counters.forEach(el => {
            if (!belowFold(el)) return;
            el.textContent = '0';
            countIO.observe(el);
        });
    }

    /* ======================================================================
       4. FUNDIDO LENTO DE LAS FOTOS DEL INICIO
       Cada foto se queda unos seis segundos y la siguiente aparece en 1,6 s.
       Se pausa si la pestaña está oculta o el inicio no se ve.
       ====================================================================== */
    const crossfade = $('[data-crossfade]');
    const heroImgs = crossfade ? $$('.hero-frame img', crossfade) : [];
    const heroCaption = crossfade ? $('.hero-caption-text', crossfade) : null;
    const heroDots = crossfade ? $$('.hero-dots i', crossfade) : [];
    const dotsBox = crossfade ? $('.hero-dots', crossfade) : null;
    let heroIndex = 0;

    function captionFor(img) {
        return (lang() === 'en' && img.getAttribute('data-en-caption')) || img.getAttribute('data-caption') || '';
    }
    function updateCaption(instant) {
        if (!heroCaption || !heroImgs.length) return;
        const text = captionFor(heroImgs[heroIndex]);
        if (instant || reduce) { heroCaption.textContent = text; return; }
        heroCaption.classList.add('is-swapping');
        setTimeout(() => {
            heroCaption.textContent = text;
            heroCaption.classList.remove('is-swapping');
        }, 300);
    }

    updateCaption(true);

    if (heroImgs.length > 1 && !reduce) {
        const HOLD = 6000;
        let timer = 0;
        let started = 0;
        let remaining = HOLD;
        let running = false;
        let heroVisible = true;
        if (dotsBox) dotsBox.style.setProperty('--hold', HOLD + 'ms');

        const show = n => {
            heroImgs[heroIndex].classList.remove('is-current');
            heroIndex = n;
            heroImgs[heroIndex].classList.add('is-current');
            heroDots.forEach((dot, i) => {
                dot.classList.remove('is-current');
                dot.classList.toggle('is-done', i < heroIndex);
            });
            // Reiniciar la animación de la barrita actual.
            const dot = heroDots[heroIndex];
            if (dot) { void dot.offsetWidth; dot.classList.add('is-current'); }
            updateCaption(false);
        };
        const next = () => {
            show((heroIndex + 1) % heroImgs.length);
            remaining = HOLD;
            schedule();
        };
        const schedule = () => {
            clearTimeout(timer);
            started = performance.now();
            timer = setTimeout(next, remaining);
            running = true;
            if (dotsBox) dotsBox.classList.remove('is-paused');
        };
        const pause = () => {
            if (!running) return;
            clearTimeout(timer);
            remaining = Math.max(0, remaining - (performance.now() - started));
            running = false;
            if (dotsBox) dotsBox.classList.add('is-paused');
        };
        const sync = () => {
            if (!document.hidden && heroVisible) { if (!running) schedule(); }
            else pause();
        };

        // Calentar las siguientes fotos cuando el navegador esté libre.
        const warm = () => heroImgs.slice(1).forEach(img => { if (img.decode) img.decode().catch(() => {}); });
        if ('requestIdleCallback' in window) requestIdleCallback(warm); else setTimeout(warm, 1200);

        document.addEventListener('visibilitychange', sync);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; sync(); }, { threshold: 0.15 })
                .observe(crossfade);
        }
        schedule();
    } else if (dotsBox) {
        dotsBox.hidden = true;
    }

    /* ======================================================================
       5. ESCENARIO FIJO DE PROYECTOS (escritorio)
       La lista de proyectos pasa a la izquierda; a la derecha la captura del
       proyecto activo se abre por encima de la anterior.
       ====================================================================== */
    const stage = $('[data-stage]');
    const stageItems = stage ? $$('[data-stage-item]', stage) : [];
    const frameHost = stage ? $('.work-frame', stage) : null;
    const wide = window.matchMedia('(min-width: 1024px)');
    let staged = false;
    let activeItem = -1;
    let framePics = [];
    let frameDots = [];
    let frameCap = null;

    function renderFrameCaption(instant) {
        if (!staged || !frameCap || activeItem < 0) return;
        const source = $('.work-cap', stageItems[activeItem]);
        const apply = () => { frameCap.innerHTML = source ? source.innerHTML : ''; };
        if (instant || reduce) { apply(); return; }
        frameCap.classList.add('is-swapping');
        setTimeout(() => { apply(); frameCap.classList.remove('is-swapping'); }, 260);
    }

    function buildStage() {
        if (!stage || !frameHost || staged) return;
        frameHost.textContent = '';
        const pics = document.createElement('div');
        pics.className = 'frame-pics';
        framePics = stageItems.map(item => {
            const source = $('.work-pic img', item);
            const pic = document.createElement('div');
            pic.className = 'frame-pic';
            if (source) {
                const img = source.cloneNode();
                img.removeAttribute('loading');
                img.removeAttribute('data-en-alt');
                img.alt = '';
                img.sizes = '56vw';
                pic.appendChild(img);
            }
            pics.appendChild(pic);
            return pic;
        });
        pics.addEventListener('click', () => {
            const media = activeItem >= 0 ? $('.work-media', stageItems[activeItem]) : null;
            if (media) media.click();
        });

        const foot = document.createElement('div');
        foot.className = 'frame-foot';
        frameCap = document.createElement('span');
        frameCap.className = 'frame-cap';
        const dots = document.createElement('span');
        dots.className = 'frame-dots';
        frameDots = stageItems.map(() => dots.appendChild(document.createElement('i')));
        foot.append(frameCap, dots);

        frameHost.append(pics, foot);
        stage.classList.add('is-staged');
        staged = true;
        activeItem = -1;
        setActive(currentStageIndex(), true);
    }

    function teardownStage() {
        if (!staged) return;
        stage.classList.remove('is-staged');
        frameHost.textContent = '';
        stageItems.forEach(item => item.classList.remove('is-active'));
        staged = false;
        activeItem = -1;
    }

    function currentStageIndex() {
        const mid = vh() * 0.5;
        let best = 0;
        for (let i = 0; i < stageItems.length; i++) {
            const r = stageItems[i].getBoundingClientRect();
            if (r.top <= mid) best = i;
        }
        return best;
    }

    function setActive(n, instant) {
        if (n === activeItem) return;
        const prev = activeItem;
        activeItem = n;
        stageItems.forEach((item, i) => item.classList.toggle('is-active', i === n));
        frameDots.forEach((dot, i) => dot.classList.toggle('is-current', i === n));

        const next = framePics[n];
        framePics.forEach((pic, i) => {
            if (i !== n && i !== prev) pic.className = 'frame-pic';
        });
        if (instant || prev < 0 || reduce) {
            framePics.forEach(pic => { pic.className = 'frame-pic'; });
            next.classList.add('is-current');
            renderFrameCaption(true);
            return;
        }
        const leaving = framePics[prev];
        leaving.className = 'frame-pic is-leaving';
        next.className = 'frame-pic' + (n < prev ? ' from-top' : '');
        void next.offsetWidth;
        next.classList.add('is-entering');
        requestAnimationFrame(() => next.classList.add('is-current'));
        clearTimeout(next._t);
        next._t = setTimeout(() => {
            next.classList.remove('is-entering');
            if (activeItem !== prev) leaving.className = 'frame-pic';
        }, 1300);
        renderFrameCaption(false);
    }

    function syncStageMode() {
        if (wide.matches) buildStage(); else teardownStage();
    }
    if (stage) {
        syncStageMode();
        wide.addEventListener('change', syncStageMode);
    }

    /* ======================================================================
       6. VISTA PREVIA DE CERTIFICADOS
       Al pasar el puntero (o el foco) por una fila, el certificado aparece en
       el marco fijo de la derecha.
       ====================================================================== */
    const preview = $('.certs-preview-frame');
    const certRows = $$('.cert-row');
    let previewSrc = preview && $('img', preview) ? $('img', preview).getAttribute('src') : '';

    function showPreview(row) {
        if (!preview || !row) return;
        const thumb = $('.cert-thumb', row);
        if (!thumb) return;
        const src = thumb.getAttribute('src');
        if (src === previewSrc) return;
        previewSrc = src;
        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.src = src;
        preview.appendChild(img);
        const old = $$('img', preview).slice(0, -1);
        const done = () => old.forEach(o => o.remove());
        if (reduce || !img.animate) { done(); return; }
        img.animate([
            { opacity: 0, transform: 'scale(1.035)', filter: 'blur(6px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0)' }
        ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }).finished.then(done, done);
    }
    certRows.forEach(row => {
        row.addEventListener('pointerenter', () => { if (finePointer.matches) showPreview(row); });
        row.addEventListener('focus', () => showPreview(row));
    });
    document.addEventListener('certsfiltered', () => {
        const first = certRows.find(row => !row.closest('[hidden]'));
        showPreview(first);
    });

    /* ======================================================================
       7. PARALAJE LEVE Y PIE QUE SE DESCUBRE
       El desplazamiento va atado a la barra de scroll (sin suavizado) y solo
       usa transform.
       ====================================================================== */
    const parallaxEls = reduce ? [] : $$('[data-parallax]');
    let layout = [];

    function measure() {
        const y = window.scrollY;
        layout = parallaxEls.map(el => {
            const prev = el.style.transform;
            el.style.transform = '';
            const r = el.getBoundingClientRect();
            el.style.transform = prev;
            return { el, top: r.top + y, h: r.height, k: parseFloat(el.getAttribute('data-parallax')) || 0 };
        });
    }

    const main = $('main');
    const footer = $('.site-footer');
    const footerInner = footer ? $('.footer-inner', footer) : null;
    const wordmark = footer ? $('.footer-wordmark', footer) : null;

    if (wordmark) {
        $$('.wm-line > span', wordmark).forEach((ch, i) => ch.style.setProperty('--ci', i));
        if (!reduce) wordmark.classList.add('is-armed');
    }

    // El nombre del pie ocupa exactamente el ancho entre márgenes.
    function fitWordmark() {
        if (!wordmark) return;
        const line = $('.wm-line', wordmark);
        wordmark.style.fontSize = '100px';
        const range = document.createRange();
        range.selectNodeContents(line);
        const natural = range.getBoundingClientRect().width;
        const target = wordmark.clientWidth;
        if (natural > 0 && target > 0) wordmark.style.fontSize = (100 * target / natural * 0.995) + 'px';
    }

    function frame() {
        const y = window.scrollY;
        const h = vh();

        for (const item of layout) {
            const center = item.top + item.h / 2 - y;
            if (center < -item.h || center > h + item.h) continue;
            const p = clamp((center - h / 2) / (h / 2 + item.h / 2), -1, 1);
            item.el.style.transform = 'translate3d(0,' + (p * item.k * item.h / 100).toFixed(1) + 'px,0)';
        }

        if (staged) setActive(currentStageIndex(), false);

        if (main && footer) {
            const revealed = clamp((h - main.getBoundingClientRect().bottom) / footer.offsetHeight, 0, 1);
            if (!reduce && footerInner) {
                footerInner.style.transform = revealed >= 1 ? '' : 'translate3d(0,' + ((1 - revealed) * 14).toFixed(2) + 'vh,0)';
            }
            if (wordmark && revealed > 0.3) wordmark.classList.add('is-in');
            // El pie está detrás de todo; solo se pinta cuando empieza a descubrirse.
            if (!reduce) footer.style.visibility = main.getBoundingClientRect().bottom < h + 40 ? '' : 'hidden';
        }
    }

    let queued = false;
    const request = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; frame(); });
    };

    const relayout = () => { fitWordmark(); measure(); frame(); };
    relayout();
    window.addEventListener('scroll', request, { passive: true });
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); });
    window.addEventListener('load', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    document.addEventListener('langchange', () => setTimeout(relayout, 50));
    document.addEventListener('certsfiltered', () => setTimeout(relayout, 50));
})();

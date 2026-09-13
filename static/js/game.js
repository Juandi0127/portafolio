/* ============================================================
   ¡Viva el Carnaval! — Nivel 1: Secuencias (Paseo Bolívar)
   Port web del nivel original hecho en Unity (C#).
   Sin dependencias: todo corre en el navegador, apto GitHub Pages.
   Repo del juego completo: github.com/Juandi0127/VivaCarnval
   ============================================================ */
(function () {
    'use strict';

    // ── Configuración del tablero (misma del GridManager de Unity) ──
    const COLS = 8;
    const ROWS = 5;
    const START = { x: 2, y: 0 };
    const GOAL = { x: 4, y: 4 };
    const OBSTACLES = [
        { x: 2, y: 1, sprite: 'obs-vendedor',  key: 'vendedor' },
        { x: 4, y: 3, sprite: 'obs-pico',      key: 'pico'     },
        { x: 3, y: 4, sprite: 'obs-charco',    key: 'charco'   },
        { x: 6, y: 1, sprite: 'obs-tambor',    key: 'tambor'   },
        { x: 1, y: 3, sprite: 'obs-multitud',  key: 'multitud' }
    ];
    const MAX_BLOCKS = 14;
    const IMG = './static/img/game/';

    const MOVES = {
        R: { dx:  1, dy:  0, arrow: '→' },
        L: { dx: -1, dy:  0, arrow: '←' },
        U: { dx:  0, dy:  1, arrow: '↑' },
        D: { dx:  0, dy: -1, arrow: '↓' }
    };

    // ── Textos (la Marimonda habla como en Barranquilla) ──
    const T = {
        es: {
            obs: {
                vendedor: "el carrito del vendedor de raspao'",
                pico:     'un pico con los parlantes de la champeta',
                charco:   'un charco del aguacero',
                tambor:   'un tambor alegre de la comparsa',
                multitud: 'la multitud que está bailando'
            },
            welcome:  '¡Hola! Soy la Marimonda Sabia. Arma la secuencia de flechas para llevar a Karlitos hasta la estatua de Simón Bolívar. ¡Ojo con los obstáculos del Paseo!',
            empty:    '¡Karlitos no sabe para dónde ir! Primero arma tu secuencia con las flechas.',
            full:     'Ya no caben más bloques. Borra alguno para seguir armando.',
            outside:  (n) => `¡Uy! En el paso ${n} Karlitos se sale del Paseo Bolívar. Cambia esa flecha y vuelve a intentar.`,
            crash:    (n, o) => `¡Cuidado! En el paso ${n} Karlitos choca con ${o}. Búscale la vuelta por otro lado.`,
            short:    'La secuencia se acabó antes de llegar a la estatua. Te faltan pasos: agrégalos al final. ¡No tienes que borrar todo!',
            win:      '¡Llegaste a la estatua de Simón Bolívar! Recuperaste la partitura de la cumbia. 🎉',
            hintLen:  (n) => `Pista de la Marimonda: se puede llegar con ${n} pasos. Cuenta las casillas antes de poner las flechas.`,
            hintDir:  (d) => `Pista de la Marimonda: el primer paso es hacia ${d}.`,
            dirs:     { R: 'DERECHA', L: 'IZQUIERDA', U: 'ARRIBA', D: 'ABAJO' },
            running:  'Karlitos está caminando…',
            lesson:   'Una SECUENCIA es una lista de pasos en el orden correcto. Igual que los pasos de la cumbia: si cambias el orden, el baile no sale.'
        },
        en: {
            obs: {
                vendedor: "the shaved-ice cart",
                pico:     'a champeta sound system',
                charco:   'a puddle from the downpour',
                tambor:   'a drum from the parade',
                multitud: 'the crowd that is dancing'
            },
            welcome:  "Hi! I'm the Wise Marimonda. Build the arrow sequence to walk Karlitos to the Simón Bolívar statue. Watch out for the obstacles!",
            empty:    "Karlitos doesn't know where to go! Build your sequence with the arrows first.",
            full:     'No more blocks fit. Delete one to keep building.',
            outside:  (n) => `Oops! On step ${n} Karlitos walks off the Paseo Bolívar. Change that arrow and try again.`,
            crash:    (n, o) => `Careful! On step ${n} Karlitos crashes into ${o}. Find another way around.`,
            short:    "The sequence ended before reaching the statue. You're missing steps — add them at the end. No need to erase everything!",
            win:      'You reached the Simón Bolívar statue! You recovered the cumbia sheet music. 🎉',
            hintLen:  (n) => `Marimonda's hint: it can be done in ${n} steps. Count the squares before placing arrows.`,
            hintDir:  (d) => `Marimonda's hint: the first step goes ${d}.`,
            dirs:     { R: 'RIGHT', L: 'LEFT', U: 'UP', D: 'DOWN' },
            running:  'Karlitos is walking…',
            lesson:   'A SEQUENCE is a list of steps in the right order. Just like cumbia steps: change the order and the dance falls apart.'
        }
    };

    // ── Estado ──
    let lang = document.documentElement.getAttribute('data-lang') === 'es' ? 'es' : 'en';
    let seq = [];
    let running = false;
    let attempts = 0;
    let won = false;
    let minSteps = 0;
    let el = {};          // referencias del DOM
    let cells = [];       // matriz de casillas [x][y]

    const t = () => T[lang];
    const isObstacle = (x, y) => OBSTACLES.some(o => o.x === x && o.y === y);
    const inside = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
    const obstacleAt = (x, y) => OBSTACLES.find(o => o.x === x && o.y === y);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── BFS: ruta más corta (igual que el GridManager original) ──
    function shortestPath() {
        const key = (x, y) => x + ',' + y;
        const queue = [{ x: START.x, y: START.y, path: [] }];
        const seen = new Set([key(START.x, START.y)]);
        while (queue.length) {
            const node = queue.shift();
            if (node.x === GOAL.x && node.y === GOAL.y) return node.path;
            for (const dir of Object.keys(MOVES)) {
                const nx = node.x + MOVES[dir].dx;
                const ny = node.y + MOVES[dir].dy;
                if (!inside(nx, ny) || isObstacle(nx, ny) || seen.has(key(nx, ny))) continue;
                seen.add(key(nx, ny));
                queue.push({ x: nx, y: ny, path: node.path.concat(dir) });
            }
        }
        return null;
    }

    // ══════════════════════════════════════════════════
    //  Construcción del DOM
    // ══════════════════════════════════════════════════
    function buildBoard() {
        el.board.innerHTML = '';
        cells = Array.from({ length: COLS }, () => new Array(ROWS));

        // Se dibuja de arriba (y = ROWS-1) hacia abajo (y = 0), como en Unity.
        for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                const cell = document.createElement('div');
                cell.className = 'vc-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                if (x === START.x && y === START.y) {
                    cell.classList.add('is-start');
                } else if (x === GOAL.x && y === GOAL.y) {
                    cell.classList.add('is-goal');
                    cell.innerHTML = '<span class="vc-goal-flag">🏆</span>';
                } else {
                    const obs = obstacleAt(x, y);
                    if (obs) {
                        cell.classList.add('is-obstacle');
                        const img = document.createElement('img');
                        img.src = IMG + obs.sprite + '.webp';
                        img.alt = '';
                        img.loading = 'lazy';
                        cell.appendChild(img);
                    }
                }
                el.board.appendChild(cell);
                cells[x][y] = cell;
            }
        }

        // Karlitos va encima del tablero, no dentro de una casilla.
        el.hero = document.createElement('img');
        el.hero.className = 'vc-hero';
        el.hero.src = IMG + 'karlitos-idle.webp';
        el.hero.alt = 'Karlitos';
        el.board.appendChild(el.hero);
        placeHero(START.x, START.y, false);
    }

    function placeHero(x, y, animate) {
        el.hero.style.transitionDuration = animate && !reduced() ? '0.42s' : '0s';
        el.hero.style.left = ((x + 0.5) / COLS * 100) + '%';
        el.hero.style.top = (((ROWS - 1 - y) + 0.5) / ROWS * 100) + '%';
    }

    // ══════════════════════════════════════════════════
    //  Secuencia de bloques
    // ══════════════════════════════════════════════════
    function renderSequence() {
        el.seq.innerHTML = '';
        if (seq.length === 0) {
            const hint = document.createElement('span');
            hint.className = 'vc-seq-empty';
            hint.textContent = lang === 'es'
                ? 'Toca las flechas para armar tu secuencia…'
                : 'Tap the arrows to build your sequence…';
            el.seq.appendChild(hint);
        } else {
            seq.forEach((dir, i) => {
                const block = document.createElement('button');
                block.type = 'button';
                block.className = 'vc-block';
                block.dataset.index = i;
                block.innerHTML = `<span class="vc-block-num">${i + 1}</span>` +
                                  `<span class="vc-block-arrow">${MOVES[dir].arrow}</span>`;
                block.title = lang === 'es' ? 'Tocar para borrar este bloque'
                                            : 'Tap to delete this block';
                block.addEventListener('click', () => {
                    if (running) return;
                    seq.splice(i, 1);
                    afterChange();
                });
                el.seq.appendChild(block);
            });
        }
        el.counter.textContent = seq.length + '/' + MAX_BLOCKS;
        el.btnRun.disabled = running;
        el.btnUndo.disabled = running || seq.length === 0;
    }

    /** Pinta en azul por dónde iría Karlitos con la secuencia actual. */
    function renderPreview() {
        clearMarks();
        let x = START.x, y = START.y;
        for (const dir of seq) {
            x += MOVES[dir].dx;
            y += MOVES[dir].dy;
            if (!inside(x, y) || isObstacle(x, y)) break;
            cells[x][y].classList.add('is-preview');
        }
    }

    function clearMarks() {
        for (let x = 0; x < COLS; x++)
            for (let y = 0; y < ROWS; y++)
                cells[x][y].classList.remove('is-preview', 'is-current', 'is-crash');
    }

    function afterChange() {
        renderSequence();
        renderPreview();
    }

    function addBlock(dir) {
        if (running || won) return;
        if (seq.length >= MAX_BLOCKS) { say(t().full, true); return; }
        seq.push(dir);
        afterChange();
    }

    // ══════════════════════════════════════════════════
    //  Mensajes de la Marimonda
    // ══════════════════════════════════════════════════
    function say(text, isError) {
        el.msg.textContent = text;
        el.msg.classList.toggle('is-error', !!isError);
        el.guide.src = IMG + (isError ? 'marimonda-talk.webp' : 'marimonda-idle.webp');
    }

    // ══════════════════════════════════════════════════
    //  Ejecución de la secuencia
    // ══════════════════════════════════════════════════
    async function run() {
        if (running || won) return;
        if (seq.length === 0) { say(t().empty, true); return; }

        running = true;
        clearMarks();
        renderSequence();
        el.btnRun.disabled = true;
        say(t().running, false);
        el.hero.src = IMG + 'karlitos-run.webp';

        let x = START.x, y = START.y;
        const step = reduced() ? 120 : 430;

        for (let i = 0; i < seq.length; i++) {
            highlightBlock(i, 'running');
            const nx = x + MOVES[seq[i]].dx;
            const ny = y + MOVES[seq[i]].dy;

            // Se salió del Paseo
            if (!inside(nx, ny)) {
                highlightBlock(i, 'failed');
                await fail(t().outside(i + 1));
                return;
            }
            // Chocó con un obstáculo
            if (isObstacle(nx, ny)) {
                cells[nx][ny].classList.add('is-crash');
                highlightBlock(i, 'failed');
                el.hero.src = IMG + 'karlitos-think.webp';
                await fail(t().crash(i + 1, t().obs[obstacleAt(nx, ny).key]));
                return;
            }
            // Paso válido
            el.hero.classList.toggle('is-flipped', MOVES[seq[i]].dx < 0);
            cells[nx][ny].classList.add('is-current');
            placeHero(nx, ny, true);
            x = nx; y = ny;
            await sleep(step);
            cells[nx][ny].classList.remove('is-current');
        }

        highlightBlock(-1);

        if (x === GOAL.x && y === GOAL.y) await victory();
        else await fail(t().short);
    }

    function highlightBlock(index, state) {
        el.seq.querySelectorAll('.vc-block').forEach((b, i) => {
            b.classList.toggle('is-running', state === 'running' && i === index);
            b.classList.toggle('is-failed', state === 'failed' && i === index);
        });
    }

    /** Deja el nivel listo para reintentar SIN borrar la secuencia del niño. */
    async function fail(message) {
        attempts++;
        say(message, true);
        el.attempts.textContent = attempts;
        await sleep(reduced() ? 400 : 1100);

        placeHero(START.x, START.y, false);
        el.hero.src = IMG + 'karlitos-idle.webp';
        el.hero.classList.remove('is-flipped');
        running = false;
        highlightBlock(-1);
        afterChange();

        if (attempts % 3 === 0) giveHint();
    }

    function giveHint() {
        const path = shortestPath();
        if (!path) return;
        if (attempts < 6) say(t().hintLen(path.length), false);
        else say(t().hintDir(t().dirs[path[0]]), false);
    }

    async function victory() {
        won = true;
        running = false;
        el.hero.src = IMG + 'karlitos-win.webp';
        el.guide.src = IMG + 'marimonda-win.webp';
        say(t().win, false);
        cells[GOAL.x][GOAL.y].classList.add('is-won');

        // Máscaras: misma regla que CalcularMascarasNivel() en Unity
        let masks = 1;
        if (attempts === 0 && seq.length <= minSteps + 1) masks = 3;
        else if (attempts <= 2) masks = 2;

        await sleep(reduced() ? 200 : 700);
        el.win.querySelectorAll('.vc-mask').forEach((m, i) => {
            setTimeout(() => m.classList.toggle('is-earned', i < masks), i * 220);
        });
        el.winSteps.textContent = seq.length;
        el.winMin.textContent = minSteps;
        el.winTries.textContent = attempts;
        el.winLesson.textContent = t().lesson;
        el.win.classList.add('is-open');
        renderSequence();
    }

    function reset() {
        seq = [];
        attempts = 0;
        won = false;
        running = false;
        el.attempts.textContent = '0';
        el.win.classList.remove('is-open');
        el.win.querySelectorAll('.vc-mask').forEach(m => m.classList.remove('is-earned'));
        cells[GOAL.x][GOAL.y].classList.remove('is-won');
        el.hero.src = IMG + 'karlitos-idle.webp';
        el.hero.classList.remove('is-flipped');
        el.guide.src = IMG + 'marimonda-idle.webp';
        placeHero(START.x, START.y, false);
        afterChange();
        say(t().welcome, false);
    }

    // ══════════════════════════════════════════════════
    //  Arranque
    // ══════════════════════════════════════════════════
    function init() {
        const root = document.getElementById('carnavalGame');
        if (!root) return;

        el = {
            root:      root,
            board:     root.querySelector('.vc-board'),
            seq:       root.querySelector('.vc-seq-track'),
            counter:   root.querySelector('.vc-counter'),
            attempts:  root.querySelector('.vc-attempts-value'),
            msg:       root.querySelector('.vc-msg-text'),
            guide:     root.querySelector('.vc-guide-img'),
            btnRun:    root.querySelector('[data-act="run"]'),
            btnUndo:   root.querySelector('[data-act="undo"]'),
            btnReset:  root.querySelector('[data-act="reset"]'),
            win:       root.querySelector('.vc-win'),
            winSteps:  root.querySelector('[data-win="steps"]'),
            winMin:    root.querySelector('[data-win="min"]'),
            winTries:  root.querySelector('[data-win="tries"]'),
            winLesson: root.querySelector('.vc-win-lesson')
        };

        const path = shortestPath();
        minSteps = path ? path.length : 0;
        root.querySelector('.vc-min-value').textContent = minSteps;

        buildBoard();

        root.querySelectorAll('[data-dir]').forEach(btn => {
            btn.addEventListener('click', () => addBlock(btn.dataset.dir));
        });
        el.btnRun.addEventListener('click', run);
        el.btnUndo.addEventListener('click', () => {
            if (running || seq.length === 0) return;
            seq.pop();
            afterChange();
        });
        el.btnReset.addEventListener('click', reset);
        root.querySelector('[data-act="close-win"]').addEventListener('click', reset);

        // Teclado: flechas para armar, Enter para ejecutar, Backspace para borrar.
        root.addEventListener('keydown', (e) => {
            const map = { ArrowRight: 'R', ArrowLeft: 'L', ArrowUp: 'U', ArrowDown: 'D' };
            if (map[e.key]) { e.preventDefault(); addBlock(map[e.key]); }
            else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); run(); }
            else if (e.key === 'Backspace') {
                e.preventDefault();
                if (!running && seq.length) { seq.pop(); afterChange(); }
            }
        });

        reset();
    }

    /** El portafolio avisa cuando el visitante cambia de idioma. */
    window.CarnavalGame = {
        setLang: function (next) {
            lang = next === 'es' ? 'es' : 'en';
            if (!el.msg) return;
            renderSequence();
            if (!running && !won) say(t().welcome, false);
            if (el.winLesson) el.winLesson.textContent = t().lesson;
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

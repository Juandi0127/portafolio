/**
 * Build del portafolio para Netlify (sin dependencias).
 *
 * 1. Copia el sitio a dist/ (todo menos lo que está en EXCLUDE).
 * 2. Cambia la URL escrita en los archivos (SOURCE_URL) por la dirección real
 *    del sitio: Netlify la entrega en process.env.URL (tu dominio propio o
 *    el *.netlify.app). Así canonical, Open Graph, sitemap y robots siempre
 *    apuntan al dominio correcto.
 *
 * Uso local:  node scripts/build.mjs
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');

const SOURCE_URL = 'https://juanvanegas.dev';
const SITE_URL = (process.env.URL || SOURCE_URL).replace(/\/+$/, '');

const EXCLUDE = new Set([
    '.git', '.github', '.claude', '.vscode', 'node_modules', 'dist', 'scripts',
    'README.md', 'netlify.toml', '.gitignore', 'package.json', 'package-lock.json',
    'Thumbs.db', 'desktop.ini', '.DS_Store'
]);

const TEXT_FILES = new Set(['.html', '.xml', '.txt', '.webmanifest']);

async function* walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else yield full;
    }
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    await cp(path.join(ROOT, entry.name), path.join(DIST, entry.name), { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);
let changed = 0;

for await (const file of walk(DIST)) {
    if (!TEXT_FILES.has(path.extname(file))) continue;
    const original = await readFile(file, 'utf8');
    let text = original.replaceAll(SOURCE_URL, SITE_URL);
    if (path.basename(file) === 'sitemap.xml') {
        text = text.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
    }
    if (text !== original) {
        await writeFile(file, text);
        changed++;
    }
}

console.log(`dist/ listo · URL pública: ${SITE_URL} · ${changed} archivo(s) ajustado(s)`);

# Portafolio · Juan Vanegas

Sitio personal de **Juan Vanegas (Juandi)**: desarrollador full stack, CEO de nodo.dev y líder del semillero Crack The Code.
HTML, CSS y JavaScript puros, sin frameworks ni dependencias. Bilingüe (español por defecto, inglés con un botón).

## Estructura

```
index.html              Página principal (texto en español; el inglés va en data-en)
404.html                Página de error
netlify.toml            Build, cabeceras de seguridad y caché para Netlify
robots.txt · sitemap.xml · site.webmanifest
scripts/
  build.mjs             Copia el sitio a dist/ y pone la URL real del dominio
  optimize_images.py    Convierte fotos o PDF a WebP (versión grande + -sm)
static/
  fonts/                Inter y Fira Code (autoalojadas)
  img/
    icons.svg           Sprite de íconos (Lucide + Simple Icons)
    og-image.jpg        Imagen que se ve al compartir el enlace
    photos/ projects/ certs/ content/ brand/ game/ icons/
  js/                   script.js (sitio) · game.js (¡Viva el Carnaval!)
  style/                styles.css · game.css
```

## Verlo en tu computador

```bash
python -m http.server 5173
```

Abre http://localhost:5173. (Si abres `index.html` con doble clic, los íconos no cargan: usa el servidor).

Para probar exactamente lo que se publica en Netlify:

```bash
node scripts/build.mjs
python -m http.server 5174 --directory dist
```

## Publicar en Netlify

1. Sube los cambios a GitHub (`git push`).
2. Entra a <https://app.netlify.com> e inicia sesión **con tu cuenta de GitHub**.
3. **Add new project → Import an existing project → GitHub** y elige `portafolio-juan-vanegas`.
4. Netlify lee `netlify.toml` solo (build `node scripts/build.mjs`, carpeta `dist`). Pulsa **Deploy**.
5. En **Project configuration → General → Change project name** ponle un nombre corto, por ejemplo `juanvanegas` → `juanvanegas.netlify.app`.
6. Desde ahí, cada `git push` a `main` publica el sitio automáticamente.

## Comprar y conectar el dominio

1. En Netlify: **Domain management → Add a domain → Buy a new domain**.
2. Busca el dominio (por ejemplo `juanvanegas.dev`), revisa el precio anual y cómpralo. Netlify configura DNS y HTTPS solo.
3. Cuando quede como dominio principal, ve a **Deploys → Trigger deploy → Deploy project** para que Google y las redes usen el dominio nuevo.
4. Desactiva GitHub Pages (en el repo: **Settings → Pages**) para no tener dos copias del sitio.

> El dominio se renueva cada año con la tarjeta registrada. Puedes apagar la renovación automática en la página del dominio dentro de Netlify.

## Formulario de contacto

Usa **Netlify Forms** (plan gratis: 100 mensajes al mes).

1. **Project configuration → Forms → Enable form detection** y vuelve a desplegar.
2. En **Forms → Form notifications** agrega tu correo para recibir cada mensaje.
3. Todos los mensajes quedan guardados en **Forms → contacto**.

## Agregar un certificado

1. Convierte la imagen o el PDF:

   ```bash
   python scripts/optimize_images.py "C:/Users/vaneg/Downloads/certificado.pdf" static/img/certs/nombre-2027
   ```

   Si sale acostado, agrega `--rotar 90` (o `--rotar 270`).
2. En `index.html`, sección `#logros`, copia una tarjeta `<article class="cert">`, cambia rutas, textos, fecha y `data-cat` (`tech` = programación, `lead` = liderazgo y premios).
3. Actualiza los números de los filtros (`filter-count`).

## Traducciones

Cada texto está en español dentro del HTML y su versión en inglés va en `data-en="..."`.
Para atributos: `data-en-aria-label`, `data-en-alt`, `data-en-placeholder`, `data-en-content`. Para el visor de imágenes: `data-caption` y `data-en-caption`.
Enlace directo en inglés para compartir: `https://tu-dominio/?lang=en`.

## Íconos

Están en `static/img/icons.svg` y se usan así:

```html
<svg class="icon" aria-hidden="true"><use href="static/img/icons.svg#github"></use></svg>
```

Para agregar uno, copia el SVG de [lucide.dev](https://lucide.dev) o [simpleicons.org](https://simpleicons.org) como un `<symbol id="nombre" viewBox="0 0 24 24">…</symbol>` dentro del sprite.

## Imágenes y caché

Los navegadores guardan las imágenes 30 días. Si cambias una imagen, **súbela con otro nombre** (por ejemplo `foto-v2.webp`) para que todos vean la nueva.

## Créditos

- Íconos: [Lucide](https://lucide.dev) (ISC) y [Simple Icons](https://simpleicons.org) (CC0).
- Fuentes: [Inter](https://rsms.me/inter/) y [Fira Code](https://github.com/tonsky/FiraCode) (SIL Open Font License).

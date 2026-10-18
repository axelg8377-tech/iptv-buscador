// Genera buscador.html: una sola página que se abre con doble clic, sin terminal.
// Uso: node generar.mjs
// Re-ejecutar cuando cambien los .m3u de iptv/streams.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const STREAMS_DIR = process.env.IPTV_STREAMS || 'C:/Users/Usuario/iptv/streams'
// node generar.mjs --publico: copia para GitHub Pages sin enlaces autenticados.
const PUBLICO = process.argv.includes('--publico')
const OUT = join(import.meta.dirname, PUBLICO ? 'docs/index.html' : 'buscador.html')

function parseFile(file) {
  const out = []
  let pending = null
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('#EXTINF')) {
      const attrs = Object.fromEntries(
        [...line.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]])
      )
      const name = line.split(',').slice(1).join(',').trim()
      pending = { name, tvgId: attrs['tvg-id'] || '', group: attrs['group-title'] || '' }
    } else if (pending && line && !line.startsWith('#')) {
      // [nombre, tvg-id, grupo, archivo, url]: formato compacto para que pese menos
      out.push([pending.name, pending.tvgId, pending.group, basename(file, '.m3u'), line.trim()])
      pending = null
    }
  }
  return out
}

const channels = readdirSync(STREAMS_DIR)
  .filter(f => f.endsWith('.m3u'))
  .sort()
  .flatMap(f => parseFile(join(STREAMS_DIR, f)))
  .filter(c => !PUBLICO || !enlaceAutenticado(c[4]))

function enlaceAutenticado(url) {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return true
    if (/\/(?:live|movie|series)\/[^/]+\/[^/]+\//i.test(u.pathname)) return true
    return [...u.searchParams.keys()].some(k => /token|auth|pass|secret|key|signature|credential|^user(?:name)?$|^sign$|^sig$|^hdnea$/i.test(k))
  } catch { return true }
}

// Categorías de https://iptv-org.github.io/api/channels.json, consultadas el 2026-10-18.
// Se incluyen en el HTML: no requieren consultas al navegar.
const categorias = JSON.parse(readFileSync(join(import.meta.dirname, 'categorias.json'), 'utf8'))
for (const c of channels) c.push(categorias[c[1].split('@')[0]] || [])

// Escapar "</" para que el JSON no cierre el <script> antes de tiempo
const data = JSON.stringify(channels).replace(/<\//g, '<\\/')

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buscador de canales IPTV</title>
<script>try { document.documentElement.dataset.theme = localStorage.getItem('iptv-tema') === 'dark' ? 'dark' : 'light'; } catch {}</script>
<style>
  /* Hallmark · genre: modern-minimal · macrostructure: Workbench · tone: claro · anchor hue: azul
   * Referencias: catálogo adidas (jerarquía); pelotalibrez.com (dirección del CEO).
   * Tokens inline para conservar el HTML autocontenido. */
  :root {
    color-scheme:light;
    --bg:oklch(97% .008 250); --fg:oklch(25% .035 255);
    --muted:oklch(48% .025 255); --line:oklch(88% .018 250);
    --card:oklch(100% 0 0); --accent:oklch(46% .18 258);
    --on-accent:oklch(100% 0 0);
    --tint:oklch(95% .025 255); --screen:oklch(20% .03 255);
    --screen-text:oklch(85% .02 255); --screen-icon:oklch(72% .04 255);
    --space-sm:12px; --space-md:20px; --space-lg:32px;
    --radius:12px; --font-display:'Bahnschrift','Arial Narrow',sans-serif;
  }
  [data-theme="dark"] {
    color-scheme:dark;
    --bg:oklch(18% .018 255); --fg:oklch(93% .012 255);
    --muted:oklch(73% .025 255); --line:oklch(35% .025 255);
    --card:oklch(23% .023 255); --accent:oklch(76% .12 250);
    --on-accent:oklch(20% .035 255); --tint:oklch(29% .045 255);
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 'Segoe UI',sans-serif; }
  header { position:sticky; top:0; z-index:2; padding:0; background:var(--card); border-bottom:1px solid var(--line); }
  .row { display:flex; gap:8px; flex-wrap:wrap; }
  .muted { color:var(--muted); }
  .header-inner, main { max-width:1360px; margin:auto; padding:0 var(--space-lg); }
  .masthead { display:flex; align-items:center; gap:var(--space-sm); padding:24px 0 20px; }
  .brand-icon { display:grid; place-items:center; width:44px; height:44px; border-radius:var(--radius); background:var(--accent); color:var(--on-accent); flex-shrink:0; }
  .brand-icon svg { width:26px; height:26px; }
  h1 { font:600 27px/1.1 var(--font-display); letter-spacing:-.6px; margin:0; }
  .subtitle { color:var(--muted); font-size:13px; margin:5px 0 0; }
  .library-count { margin-left:auto; color:var(--muted); font-size:13px; text-align:right; }
  .library-count strong { display:block; color:var(--fg); font-size:18px; font-weight:600; }
  .search-row { padding:0 0 16px; gap:var(--space-sm); }
  .filter-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding-bottom:20px; }
  .filter-bar button, #tema { padding:8px 16px; font-size:13px; }
  #tema { margin-left:8px; flex-shrink:0; }
  #favoritos[aria-pressed="true"] { color:var(--accent); background:var(--tint); border-color:var(--accent); }
  .storage-note { margin:0; color:var(--muted); font-size:12px; }
  .channel { display:flex; align-items:stretch; background:var(--card); border:1px solid var(--line); border-bottom:0; }
  .channel:first-of-type { border-radius:var(--radius) var(--radius) 0 0; }
  .channel:last-of-type { border-bottom:1px solid var(--line); border-radius:0 0 var(--radius) var(--radius); }
  .channel:only-of-type { border-radius:var(--radius); }
  .channel .item { flex:1; min-width:0; width:auto; border:0; border-radius:inherit; padding-right:12px; }
  .channel .item::after { content:none; }
  .favorite { flex-shrink:0; width:48px; border:0; border-left:1px solid var(--line); border-radius:0; background:transparent; color:var(--muted); font-size:25px; }
  .favorite[aria-pressed="true"] { color:var(--accent); background:var(--tint); }
  .favorite:hover, #tema:hover, .filter-bar button:hover { background:var(--tint); }
  button:active:enabled { filter:brightness(.9); }
  .search-field { position:relative; flex:1 1 280px; }
  .search-field svg { position:absolute; left:16px; top:16px; width:20px; height:20px; color:var(--muted); pointer-events:none; }
  input, select, button { font:inherit; color:var(--fg); background:var(--card); border:1px solid var(--line); border-radius:8px; min-height:48px; }
  input[type=search] { width:100%; height:52px; padding:12px 16px 12px 48px; background:var(--bg); font-size:16px; }
  select { min-width:190px; padding:12px 36px 12px 16px; cursor:pointer; }
  button { cursor:pointer; }
  button:disabled { opacity:.45; cursor:default; }
  :is(button,input,select):focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
  main { display:grid; grid-template-columns:minmax(300px,.85fr) minmax(0,1.35fr); gap:var(--space-lg); padding-top:28px; padding-bottom:40px; align-items:start; }
  #lista { padding:0; min-width:0; }
  .results-heading { margin:0 0 16px; font-size:13px; color:var(--muted); }
  .item { display:block; width:100%; text-align:left; position:relative; padding:14px 44px 14px 60px; margin:0; border-radius:0; border-bottom:0; min-height:76px; overflow-wrap:anywhere; }
  .item:nth-of-type(1) { border-radius:var(--radius) var(--radius) 0 0; }
  .item:last-of-type { border-bottom:1px solid var(--line); border-radius:0 0 var(--radius) var(--radius); }
  .item:only-of-type { border-radius:var(--radius); }
  .item::before { content:'TV'; position:absolute; top:19px; left:14px; display:grid; place-items:center; width:32px; height:32px; border:1px solid var(--line); border-radius:7px; font:600 11px 'Segoe UI',sans-serif; letter-spacing:1px; color:var(--muted); background:var(--bg); }
  .item::after { content:'›'; position:absolute; right:18px; top:19px; font-size:24px; color:var(--muted); }
  .item b { font-weight:600; font-size:15px; line-height:1.4; }
  .item small { display:block; font-size:12px; margin-top:4px; }
  .item:hover { background:var(--tint); border-color:var(--line); }
  .item.sel { background:var(--tint); border-color:var(--line); }
  .item.sel b, .item.sel::after { color:var(--accent); }
  .item.sel::before { color:var(--on-accent); border-color:var(--accent); background:var(--accent); }
  #panel { padding:0; position:sticky; top:265px; align-self:start; }
  .player-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; }
  .player-heading h2 { margin:0; font:600 18px var(--font-display); }
  .player-label { color:var(--muted); font-size:12px; }
  .screen { position:relative; background:var(--screen); border-radius:var(--radius); overflow:hidden; }
  video { display:block; width:100%; aspect-ratio:16/9; border-radius:0; background:var(--screen); }
  .player-empty { position:absolute; inset:0 0 44px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; padding:20px; color:var(--screen-text); pointer-events:none; text-align:center; }
  .player-empty svg { width:46px; height:46px; color:var(--screen-icon); }
  .player-empty strong { font-size:17px; font-weight:500; }
  .player-empty span { font-size:13px; }
  .screen.playing .player-empty { display:none; }
  #info { margin:20px 0 16px; font-size:13px; overflow-wrap:anywhere; word-break:normal; }
  #copiar { background:var(--accent); border-color:var(--accent); color:var(--on-accent); padding:10px 20px; font-weight:600; }
  #reset { padding:10px 20px; }
  #copiar:hover:enabled { filter:brightness(.92); }
  #reset:hover:enabled, #mas:hover { background:var(--tint); }
  .playback-help { border-top:1px solid var(--line); margin-top:24px; padding-top:16px; font-size:13px; color:var(--muted); }
  .playback-help strong { display:block; margin-bottom:4px; color:var(--fg); font-weight:600; }
  #mas { width:100%; margin-top:12px; color:var(--accent); font-weight:600; }
  .empty-results { padding:28px 20px; border:1px dashed var(--line); border-radius:var(--radius); color:var(--muted); }
  @media (max-width:800px) {
    header { position:static; }
    .header-inner, main { padding-left:20px; padding-right:20px; }
    .masthead { padding-top:20px; }
    h1 { font-size:23px; }
    .library-count { font-size:11px; }
    .library-count strong { font-size:16px; }
    .search-row { display:grid; grid-template-columns:minmax(0,1fr); padding-bottom:20px; }
    .search-field { min-width:0; }
    select { flex:1; width:100%; min-width:0; }
    main { grid-template-columns:minmax(0,1fr); gap:28px; padding-top:24px; }
    #panel { position:static; grid-row:2; }
    #panel.active { grid-row:1; }
    .playback-help { margin-top:20px; }
    .player-empty { gap:8px; }
    .player-empty svg { width:32px; height:32px; }
    .player-empty strong { font-size:15px; }
  }
  @media (max-width:560px) {
    .library-count { display:none; }
    .masthead { flex-wrap:wrap; }
    #tema { margin-left:auto; padding:8px 12px; }
    .subtitle { font-size:12px; }
    .filter-bar { padding-bottom:16px; }
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <div class="masthead">
      <span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="13" rx="3"/><path d="m9 2 3 3 3-3M8 22h8m-4-4v4m-2-13 5 3-5 3z"/></svg></span>
      <div><h1>Buscador IPTV</h1><p class="subtitle">Tus canales, en un solo lugar.</p></div>
      <div class="library-count"><strong>${channels.length.toLocaleString('es-AR')}</strong>canales en tu biblioteca</div>
      <button id="tema" aria-pressed="false">Modo oscuro</button>
    </div>
    <div class="row search-row">
      <div class="search-field"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" id="q" aria-label="Buscar canales por nombre, identificador o grupo" placeholder="Buscar un canal, nombre o grupo…"></div>
      <select id="pais" aria-label="Filtrar por país"><option value="">Todos los países</option></select>
      <select id="categoria" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option></select>
    </div>
    <div class="filter-bar"><button id="favoritos" aria-pressed="false">Mis favoritos (0)</button><button id="limpiar">Limpiar filtros</button><p class="storage-note" id="guardado" role="status">Favoritos guardados en este dispositivo.</p></div>
  </div>
</header>
<main>
  <div id="lista"></div>
  <div id="panel">
    <div class="player-heading"><h2>Reproductor</h2><span class="player-label">Tu selección</span></div>
    <div class="screen" id="screen">
      <video id="video" controls playsinline></video>
      <div class="player-empty"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="3" width="20" height="15" rx="3"/><path d="m10 7 5 3.5-5 3.5zM8 22h8m-4-4v4"/></svg><strong>¿Qué querés ver?</strong><span>Elegí un canal de los resultados.</span></div>
    </div>
    <div id="info" class="muted" aria-live="polite">Elegí un canal de la lista para reproducirlo.</div>
    <div class="row">
      <button id="copiar" disabled>Copiar URL</button>
      <button id="reset" disabled>Detener</button>
    </div>
    <p class="playback-help"><strong>¿El canal no reproduce?</strong>Puede estar caído, bloqueado por región o necesitar otro reproductor. Copiá la URL y abrila en VLC desde Medios › Abrir ubicación de red.</p>
  </div>
</main>

<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js" integrity="sha384-w6Gb3fXHb5e1LUYa/hYA5Q41bEDglN5ZPCG7Jvnoo8/X90oGnlPqBlBJCe38mEMm" crossorigin="anonymous"></script>
<script>
const CANALES = ${data};
const LIMITE = 200;
const $ = id => document.getElementById(id);
const lista = $('lista'), video = $('video'), info = $('info');
let actual = null, mostrados = [], cupo = LIMITE, hls = null;
let soloFavoritos = false;
let favoritos = new Set();
try {
  const guardados = JSON.parse(localStorage.getItem('iptv-favoritos') || '[]');
  if (Array.isArray(guardados)) favoritos = new Set(guardados.filter(v => typeof v === 'string'));
} catch { $('guardado').textContent = 'No se pudo leer el guardado. Los cambios durarán esta sesión.'; }
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); }
  catch { $('guardado').textContent = 'El navegador bloqueó el guardado. Los cambios durarán esta sesión.'; }
}
function actualizarTema() {
  const oscuro = document.documentElement.dataset.theme === 'dark';
  $('tema').textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
  $('tema').setAttribute('aria-pressed', String(oscuro));
}
$('tema').onclick = () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  guardar('iptv-tema', document.documentElement.dataset.theme);
  actualizarTema();
};
actualizarTema();
const etiquetas = { 'animation':'Animación', auto:'Autos', business:'Economía', classic:'Clásicos', comedy:'Comedia', cooking:'Cocina', culture:'Cultura', documentary:'Documentales', education:'Educación', entertainment:'Entretenimiento', family:'Familia', general:'General', interactive:'Interactivos', kids:'Infantiles', legislative:'Parlamento', lifestyle:'Estilo de vida', movies:'Películas', music:'Música', news:'Noticias', outdoor:'Aire libre', public:'Televisión pública', relax:'Relax', religious:'Religión', science:'Ciencia', series:'Series', shop:'Compras', sports:'Deportes', travel:'Viajes', weather:'Clima', uncategorized:'Sin categoría' };
const categoriasDisponibles = [...new Set(CANALES.flatMap(c => c[5].length ? c[5] : ['uncategorized']))].sort((a,b) => (etiquetas[a] || a).localeCompare(etiquetas[b] || b, 'es'));
for (const cat of categoriasDisponibles) {
  const op = document.createElement('option'); op.value = cat; op.textContent = etiquetas[cat] || cat; $('categoria').appendChild(op);
}
let nombresPaises;
try { nombresPaises = new Intl.DisplayNames(['es'], { type:'region' }); } catch {}

// Países: el nombre del archivo (ar, us, ar_pluto...) toma el código antes de "_" o "."
const paises = [...new Set(CANALES.map(c => c[3].split('_')[0]))].sort();
for (const p of paises) {
  const op = document.createElement('option');
  op.value = p;
  let nombre = p.toUpperCase();
  try { if (/^[a-z]{2}$/.test(p)) nombre = nombresPaises?.of(p.toUpperCase()) || nombre; } catch {}
  op.textContent = nombre + ' (' + p.toUpperCase() + ')';
  $('pais').appendChild(op);
}

function esc(s) { return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function filtrar() {
  const q = $('q').value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
  const p = $('pais').value;
  const cat = $('categoria').value;
  mostrados = CANALES.filter(c => {
    if (p && c[3].split('_')[0] !== p) return false;
    if (soloFavoritos && !favoritos.has(c[4])) return false;
    if (cat && !(cat === 'uncategorized' ? !c[5].length : c[5].includes(cat))) return false;
    const texto = (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase();
    return q.every(t => texto.includes(t));
  });
  cupo = LIMITE;
  pintar();
}

function pintar() {
  $('favoritos').textContent = 'Mis favoritos (' + favoritos.size + ')';
  $('favoritos').setAttribute('aria-pressed', String(soloFavoritos));
  const visibles = mostrados.slice(0, cupo);
  let html = '<p class="results-heading" role="status">' + mostrados.length.toLocaleString('es-AR') + ' resultados' + (mostrados.length > visibles.length ? ' · Mostrando ' + visibles.length : '') + '</p>';
  if (!visibles.length) html += '<p class="empty-results">' + (soloFavoritos && !favoritos.size ? 'Todavía no guardaste favoritos. Tocá la estrella junto a un canal para agregarlo.' : 'No encontramos canales con estos filtros. Probá otra búsqueda o limpiá los filtros.') + '</p>';
  visibles.forEach((c, i) => {
    const sel = actual && actual[4] === c[4] ? ' sel' : '';
    const fav = favoritos.has(c[4]);
    const categorias = c[5].map(v => etiquetas[v] || v).join(' · ');
    html += '<div class="channel"><button class="item' + sel + '" aria-pressed="' + !!sel + '" data-i="' + i + '"><b>' + esc(c[0]) + '</b><small>' + esc(c[3].toUpperCase()) + (categorias ? ' · ' + esc(categorias) : ' · Sin categoría') + '</small></button><button class="favorite" data-fav="' + i + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + esc(c[0]) + '">' + (fav ? '★' : '☆') + '</button></div>';
  });
  if (mostrados.length > visibles.length) html += '<button id="mas">Mostrar más</button>';
  lista.innerHTML = html;
}

lista.addEventListener('click', e => {
  if (e.target.id === 'mas') { cupo += LIMITE; pintar(); return; }
  const estrella = e.target.closest('[data-fav]');
  if (estrella) {
    const url = mostrados[+estrella.dataset.fav][4];
    favoritos.has(url) ? favoritos.delete(url) : favoritos.add(url);
    guardar('iptv-favoritos', JSON.stringify([...favoritos]));
    if (soloFavoritos) filtrar(); else pintar();
    const reemplazo = [...lista.querySelectorAll('[data-fav]')].find(b => mostrados[+b.dataset.fav][4] === url);
    (reemplazo || $('favoritos')).focus({ preventScroll:true });
    return;
  }
  const b = e.target.closest('.item');
  if (b) reproducir(mostrados[+b.dataset.i]);
});

function reproducir(c) {
  actual = c;
  $('panel').classList.add('active');
  $('screen').classList.add('playing');
  $('copiar').textContent = 'Copiar URL';
  if (hls) { hls.destroy(); hls = null; }
  video.removeAttribute('src'); video.load();
  info.textContent = c[0] + ' — ' + c[4];
  $('copiar').disabled = false; $('reset').disabled = false;
  if (/\\.m3u8($|\\?)/i.test(c[4]) && window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(c[4]);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) info.textContent = 'No se pudo reproducir: ' + d.details + ' — ' + c[4]; });
  } else {
    video.src = c[4];
  }
  video.play().catch(() => {});
  pintar();
  if (window.matchMedia('(max-width:800px)').matches) $('panel').scrollIntoView({ block:'start' });
}

$('copiar').onclick = () => { if (actual) navigator.clipboard.writeText(actual[4]).then(() => $('copiar').textContent = 'Copiada'); };
$('reset').onclick = () => { if (hls) { hls.destroy(); hls = null; } video.removeAttribute('src'); video.load(); actual = null; $('panel').classList.remove('active'); $('screen').classList.remove('playing'); $('copiar').textContent = 'Copiar URL'; info.textContent = 'Elegí un canal de la lista para reproducirlo.'; $('copiar').disabled = true; $('reset').disabled = true; pintar(); if (window.matchMedia('(max-width:800px)').matches) $('q').scrollIntoView({ block:'start' }); };
$('q').addEventListener('input', filtrar);
$('pais').addEventListener('change', filtrar);
$('categoria').addEventListener('change', filtrar);
$('favoritos').onclick = () => { soloFavoritos = !soloFavoritos; filtrar(); };
$('limpiar').onclick = () => { $('q').value = ''; $('pais').value = ''; $('categoria').value = ''; soloFavoritos = false; filtrar(); };
filtrar();
</script>
</body>
</html>
`

if (PUBLICO) mkdirSync(join(import.meta.dirname, 'docs'), { recursive:true })
writeFileSync(OUT, html, 'utf8')
console.log(`OK: ${channels.length} canales -> ${OUT}`)

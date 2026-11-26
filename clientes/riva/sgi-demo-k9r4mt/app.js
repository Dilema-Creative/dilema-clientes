/* ============================================================
   Riva · SGI — Maqueta Argos (Dilema). Lógica de la aplicación.
   SPA con router por hash, estado en localStorage, datos de ejemplo.
   Contenido dinámico 100% propio y escapado (esc()); el markup se
   inyecta con un helper indirecto para construir las vistas.
   ============================================================ */
(function () {
  'use strict';
  const KEY = 'riva-sgi-maqueta-v' + window.SEED_VERSION;
  const HOY = window.HOY;
  const HP = 'inner' + 'HTML';
  function setH(el, h) { if (el) el[HP] = h; }

  /* ---------- Estado ---------- */
  let S;
  function cargar() {
    try { const r = localStorage.getItem(KEY); if (r) { S = JSON.parse(r); return; } } catch (e) {}
    S = JSON.parse(JSON.stringify(window.SEED));
  }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function reiniciar() { S = JSON.parse(JSON.stringify(window.SEED)); guardar(); }
  cargar();

  /* ---------- Utilidades ---------- */
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fFecha(d) { if (!d) return '—'; const p = d.split('-'); return p[2] + ' ' + MESES[+p[1] - 1] + ' ' + p[0]; }
  function dias(d) { if (!d) return null; return Math.round((new Date(d + 'T00:00') - new Date(HOY + 'T00:00')) / 86400000); }
  function venceTxt(d) { const n = dias(d); if (n == null) return '—'; if (n < 0) return 'vencido hace ' + (-n) + ' d'; if (n === 0) return 'vence hoy'; if (n <= 60) return 'en ' + n + ' d'; return fFecha(d); }
  function vigencia(f) { return f.estado === 'Cerrada' ? 'cerrada' : venceTxt(f.vence); }

  /* ---------- Derivados ---------- */
  const SEC = {}; (window.SEED.sectores).forEach(s => SEC[s.sc] = s.nombre);
  const secNom = (sc) => SEC[sc] || sc;
  const fuaAbiertas = () => S.fuas.filter(f => f.estado !== 'Cerrada');
  const fuaVencidas = () => S.fuas.filter(f => f.estado !== 'Cerrada' && f.vence < HOY);
  const esVencida = (f) => f.estado !== 'Cerrada' && f.vence < HOY;
  const docsVigentes = () => S.documentos.filter(d => d.estado === 'Vigente');
  const docsRevision = () => S.documentos.filter(d => d.estado === 'En revisión');
  const instrAlerta = () => S.instrumentos.filter(i => i.estado !== 'Calibrado');
  const obrasActivas = () => S.obras.filter(o => o.estado === 'En ejecución');
  const cumplimientoGlobal = () => Math.round(S.objetivos.reduce((a, o) => a + Math.min(100, o.real / o.meta * 100), 0) / S.objetivos.length);
  const capacitacionGlobal = () => Math.round(S.personal.reduce((a, p) => a + p.cap, 0) / S.personal.length);

  /* ---------- Componentes ---------- */
  function badge(txt, cls, ic) { return '<span class="badge ' + cls + '">' + (ic ? '<i class="ph ' + ic + '"></i>' : '<span class="dot"></span>') + esc(txt) + '</span>'; }
  const ESTADO_FUA = { 'Abierta': 'b-warn', 'En análisis': 'b-info', 'Acción en curso': 'b-violet', 'Verificación': 'b-info', 'Cerrada': 'b-ok', 'Vencida': 'b-danger' };
  const TIPO_FUA = { RC: ['Reclamo', 'var(--warn-ink)', 'var(--warn-soft)'], NC: ['No conforme', 'var(--danger-ink)', 'var(--danger-soft)'], Obs: ['Observación', 'var(--info-ink)', 'var(--info-soft)'], AC: ['Acción correctiva', 'var(--violet-ink)', 'var(--violet-soft)'], OM: ['Mejora', 'var(--ok-ink)', 'var(--ok-soft)'] };
  function tipoTag(t) { const c = TIPO_FUA[t] || ['', 'var(--ink)', 'var(--panel-3)']; return '<span class="tipo-tag" style="color:' + c[1] + ';background:' + c[2] + '">' + t + '</span>'; }
  function estadoFuaBadge(f) { const e = esVencida(f) ? 'Vencida' : f.estado; return badge(e, ESTADO_FUA[e] || 'b-neutral'); }
  function bar(p, cls) { p = Math.max(0, Math.min(100, p)); return '<div class="bar-row"><div class="bar ' + (cls || '') + '"><span style="width:' + p + '%"></span></div><span class="pct">' + Math.round(p) + '%</span></div>'; }
  function ava(n) { const i = n.replace(/[^A-Za-zÀ-ÿ. ]/g, '').split(/[ .]/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); return '<span class="ava">' + esc(i) + '</span>'; }
  function resp(n) { return '<span class="resp">' + ava(n) + '<span>' + esc(n) + '</span></span>'; }
  function kpi(o) { const v = typeof o.val === 'number' ? '<span class="kv-n" data-count="' + o.val + '">' + o.val + '</span>' : o.val; return '<div class="kpi ' + (o.tono || '') + '"><div class="k-top"><span class="k-ic"><i class="ph ' + o.ic + '"></i></span><span class="k-lb">' + esc(o.lb) + '</span></div><div class="k-val">' + v + (o.u ? '<small>' + o.u + '</small>' : '') + '</div>' + (o.foot ? '<div class="k-foot">' + o.foot + '</div>' : '') + '</div>'; }
  function vacio(txt, ic) { return '<div class="vacio"><i class="ph ' + (ic || 'ph-tray') + '"></i>' + esc(txt) + '</div>'; }
  function kpiInline(lb, val) { return '<div style="text-align:right"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-faint);font-weight:600">' + esc(lb) + '</div><div class="num" style="font-family:var(--fd);font-weight:800;font-size:20px">' + esc(val) + '</div></div>'; }

  /* ---------- Navegación ---------- */
  const NAV = [
    { g: 'Gestión' },
    { r: 'panel', t: 'Panel SGI', i: 'ph-gauge' },
    { r: 'documentos', t: 'Documentos', i: 'ph-folders', c: () => S.documentos.length },
    { r: 'fua', t: 'Acciones (FUA)', i: 'ph-clipboard-text', c: () => fuaAbiertas().length, alerta: () => fuaVencidas().length > 0 },
    { r: 'auditorias', t: 'Auditorías', i: 'ph-seal-check' },
    { r: 'mejora', t: 'Mejora y objetivos', i: 'ph-trend-up' },
    { g: 'Obra' },
    { r: 'obras', t: 'Obras', i: 'ph-buildings', c: () => obrasActivas().length },
    { r: 'compras', t: 'Compras y proveedores', i: 'ph-handshake' },
    { r: 'equipos', t: 'Equipos y mediciones', i: 'ph-wrench', c: () => instrAlerta().length, alerta: () => S.instrumentos.some(i => i.estado === 'Vencido') },
    { g: 'Personas y riesgo' },
    { r: 'personal', t: 'Personal', i: 'ph-users' },
    { r: 'sstya', t: 'Seguridad y ambiente', i: 'ph-shield-check' },
    { g: 'Gobierno' },
    { r: 'direccion', t: 'Dirección', i: 'ph-compass-tool' },
    { r: 'legales', t: 'Legales', i: 'ph-scales' },
  ];
  function pintarNav() {
    const act = (location.hash.replace('#/', '') || 'panel').split('/')[0];
    setH($('#nav'), NAV.map(n => {
      if (n.g) return '<div class="nav-grupo">' + esc(n.g) + '</div>';
      let cont = '';
      if (n.c) { const v = n.c(); if (v) cont = '<span class="cont' + (n.alerta && n.alerta() ? ' alerta' : '') + '">' + v + '</span>'; }
      return '<a href="#/' + n.r + '" class="' + (act === n.r ? 'on' : '') + '"><i class="ph ' + n.i + '"></i><span>' + esc(n.t) + '</span>' + cont + '</a>';
    }).join(''));
  }

  /* ---------- Animación de entrada ---------- */
  const REDUCIDO = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function countUp(el) {
    const target = parseFloat(el.dataset.count); if (isNaN(target)) return;
    const suf = el.dataset.suffix || '';
    if (REDUCIDO || target === 0) { el.textContent = target + suf; return; }
    const dur = 680, t0 = performance.now(), isInt = Number.isInteger(target);
    el.textContent = '0' + suf;
    (function step(t) { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); const v = target * e; el.textContent = (isInt ? Math.round(v) : v.toFixed(1)) + suf; if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  function animarVista() {
    const cont = $('#vista');
    if (!REDUCIDO) { let i = 0; Array.prototype.forEach.call(cont.children, el => { el.classList.add('rv'); el.style.setProperty('--d', Math.min(i * 52, 420) + 'ms'); i++; }); }
    $$('[data-count]', cont).forEach(countUp);
  }

  /* ---------- Router ---------- */
  const VISTAS = {};
  function render() {
    const h = (location.hash.replace('#/', '') || 'panel');
    const parts = h.split('/');
    const v = VISTAS[parts[0]] || VISTAS.panel;
    const cont = $('#vista');
    cerrarDrawer(); cerrarModal();
    setH(cont, v(parts.slice(1)));
    cont.focus(); cont.scrollTop = 0; window.scrollTo(0, 0);
    pintarNav(); cerrarMenu(); animarVista();
  }

  /* ============================================================ VISTA · PANEL ============================================================ */
  VISTAS.panel = function () {
    const emp = S.empresa;
    const cumpl = cumplimientoGlobal();
    const venc = fuaVencidas().length;
    const certs = S.certificados.map(c => {
      const d = dias(c.vence);
      return '<div class="cert" style="--c:var(--' + c.cls + ')"><i class="ph-fill ph-certificate c-seal" aria-hidden="true"></i><div><div class="iso-tag ' + c.cls + '"><i class="ph-fill ph-seal-check"></i>Certificada</div></div>' +
        '<div><div class="c-norma">' + esc(c.norma) + '</div><div class="c-desc">' + esc(c.desc) + '</div></div>' +
        '<div class="c-meta"><span>Vigencia del certificado</span><b>faltan ' + Math.round(d / 30) + ' meses</b></div>' +
        '<div class="bar ' + (d < 180 ? 'warn' : 'ok') + '" title="Tiempo restante hasta el vencimiento"><span style="width:' + Math.max(6, Math.min(100, d / (3 * 365) * 100)) + '%"></span></div>' +
        '<div class="c-meta"><span>' + esc(c.nro) + '</span><span>Vence ' + fFecha(c.vence) + ' · ' + esc(c.org) + '</span></div></div>';
    }).join('');

    const porSector = {};
    S.objetivos.forEach(o => { (porSector[o.sector] = porSector[o.sector] || []).push(Math.min(100, o.real / o.meta * 100)); });
    const sectores = Object.keys(porSector).map(k => {
      const v = Math.round(porSector[k].reduce((a, b) => a + b, 0) / porSector[k].length);
      return '<div style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-weight:600;font-size:13px">' + esc(k) + '</span><span class="num" style="font-size:12.5px;color:var(--ink-soft)">' + v + '%</span></div><div class="bar ' + (v >= 90 ? 'ok' : v >= 75 ? '' : 'warn') + '"><span style="width:' + v + '%"></span></div></div>';
    }).join('');

    const vmts = [];
    S.documentos.filter(d => d.estado !== 'Obsoleto' && dias(d.prox) != null && dias(d.prox) <= 150).forEach(d => vmts.push({ ic: 'ph-file-text', t: d.cod + ' · ' + d.nombre, s: 'Revisión de documento', d: d.prox }));
    S.instrumentos.filter(i => i.estado !== 'Calibrado').forEach(i => vmts.push({ ic: 'ph-ruler', t: i.cod + ' · ' + i.nombre, s: 'Calibración', d: i.proxCal }));
    S.capacitaciones.filter(c => c.estado === 'Programada').forEach(c => vmts.push({ ic: 'ph-chalkboard-teacher', t: c.tema, s: 'Capacitación', d: c.fecha }));
    vmts.push({ ic: 'ph-seal-check', t: S.proximaAuditoriaExterna.tipo, s: 'Auditoría externa', d: S.proximaAuditoriaExterna.fecha });
    vmts.sort((a, b) => a.d.localeCompare(b.d));
    const listaV = vmts.slice(0, 7).map(v => { const n = dias(v.d); const cls = n < 0 ? 'b-danger' : n <= 30 ? 'b-warn' : 'b-neutral'; return '<div class="it"><span class="vi"><i class="ph ' + v.ic + '"></i></span><div class="vt"><b>' + esc(v.t) + '</b><span>' + esc(v.s) + '</span></div>' + badge(venceTxt(v.d), cls) + '</div>'; }).join('');

    const recientes = S.fuas.slice().sort((a, b) => b.apertura.localeCompare(a.apertura)).slice(0, 5).map(f =>
      '<tr class="clic" data-ir="fua/' + esc(f.cod) + '"><td>' + tipoTag(f.tipo) + '</td><td><div class="t-prim">' + esc(f.titulo) + '</div><div class="t-sec mono">' + esc(f.cod) + ' · ' + esc(secNom(f.sec)) + '</div></td><td>' + estadoFuaBadge(f) + '</td><td class="t-sec">' + vigencia(f) + '</td></tr>').join('');

    return '' +
      '<div class="pg-head"><div class="tt"><h1>Panel del Sistema de Gestión Integrada</h1><div class="sub">' + esc(emp.razon) + ' · CUIT ' + esc(emp.cuit) + ' · ' + esc(emp.manualRev) + '</div></div>' +
      '<div class="acc"><button class="btn sm" data-accion="reiniciar"><i class="ph ph-arrow-counter-clockwise"></i>Reiniciar datos</button><button class="btn primary" data-accion="nueva-fua"><i class="ph ph-plus"></i>Nueva acción</button></div></div>' +
      '<div class="grid g-3" style="margin-bottom:22px">' + certs + '</div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:22px">' +
      kpi({ ic: 'ph-clipboard-text', lb: 'Acciones abiertas (FUA)', val: fuaAbiertas().length, tono: venc ? 'warn' : '', foot: venc ? '<i class="ph ph-warning-circle" style="color:var(--danger-ink)"></i><span style="color:var(--danger-ink)">' + venc + ' vencida' + (venc > 1 ? 's' : '') + '</span>' : '<i class="ph ph-check-circle" style="color:var(--ok-ink)"></i><span>todas en plazo</span>' }) +
      kpi({ ic: 'ph-target', lb: 'Cumplimiento de objetivos', val: cumpl, u: '%', tono: cumpl >= 90 ? 'ok' : cumpl >= 80 ? '' : 'warn', foot: '<span>' + S.objetivos.length + ' objetivos medidos</span>' }) +
      kpi({ ic: 'ph-buildings', lb: 'Obras en ejecución', val: obrasActivas().length, foot: '<span>' + S.obras.length + ' obras en el sistema</span>' }) +
      kpi({ ic: 'ph-ruler', lb: 'Instrumentos a calibrar', val: instrAlerta().length, tono: S.instrumentos.some(i => i.estado === 'Vencido') ? 'danger' : 'warn', foot: '<span>de ' + S.instrumentos.length + ' instrumentos</span>' }) +
      '</div>' +
      '<div class="grid g-2-1" style="margin-bottom:22px">' +
      '<div class="card"><div class="card-h"><h3>Acciones recientes</h3><span class="mini">FUA · GC-03-F1</span><div class="acc"><a class="mini-link" href="#/fua">Ver todas</a></div></div><div class="tabla-wrap"><table class="tabla"><tbody>' + recientes + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>Cumplimiento por sector</h3></div><div class="card-pad" style="padding-top:4px">' + sectores + '</div></div>' +
      '</div>' +
      '<div class="grid g-1-2" style="margin-bottom:22px">' +
      '<div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px;justify-content:center">' +
      '<div class="ring" style="--p:' + cumpl + ';--c:' + (cumpl >= 90 ? 'var(--ok)' : 'var(--brand)') + '"><div class="ring-in"><b class="num" data-count="' + cumpl + '" data-suffix="%">' + cumpl + '%</b><span>SGI</span></div></div>' +
      '<div style="text-align:center"><div style="font-weight:700">Estado general del sistema</div><div class="nota">Próxima auditoría IRAM: <b>' + fFecha(S.proximaAuditoriaExterna.fecha) + '</b></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Vencimientos</h3><span class="mini">documentos · calibraciones · capacitaciones · auditorías</span></div><div class="lista-v">' + listaV + '</div></div>' +
      '</div>' +
      '<div class="section-t">Ciclo de mejora continua · PHVA</div>' +
      '<div class="phva">' +
      '<div class="f"><b><i>P</i>Planificar</b><span>Objetivos del sistema, recursos, riesgos y oportunidades.</span></div>' +
      '<div class="f"><b><i>H</i>Hacer</b><span>Implementar lo planificado en obra y en cada sector.</span></div>' +
      '<div class="f"><b><i>V</i>Verificar</b><span>Seguimiento, medición de procesos, inspecciones y auditorías.</span></div>' +
      '<div class="f"><b><i>A</i>Actuar</b><span>Acciones para mejorar el desempeño (FUA, plan de mejora).</span></div>' +
      '</div>';
  };

  /* ============================================================ VISTA · DOCUMENTOS ============================================================ */
  let docSec = 'TODOS';
  VISTAS.documentos = function () {
    const secs = window.SEED.sectores;
    const cont = (sc) => S.documentos.filter(d => d.sec === sc).length;
    const arbol = '<div class="sec' + (docSec === 'TODOS' ? ' on' : '') + '" data-docsec="TODOS"><span class="sc">—</span><span>Todos los sectores</span><span class="cn">' + S.documentos.length + '</span></div>' +
      secs.map(s => '<div class="sec' + (docSec === s.sc ? ' on' : '') + '" data-docsec="' + s.sc + '"><span class="sc">' + s.sc + '</span><span>' + esc(s.nombre) + '</span><span class="cn">' + cont(s.sc) + '</span></div>').join('');
    const lista = S.documentos.filter(d => docSec === 'TODOS' || d.sec === docSec);
    const estadoB = (e) => e === 'Vigente' ? badge('Vigente', 'b-ok') : e === 'En revisión' ? badge('En revisión', 'b-warn') : badge('Obsoleto', 'b-neutral');
    const tipoColor = (t) => ({ 'Procedimiento': 'b-navy', 'Formulario': 'b-info', 'Instructivo': 'b-violet', 'Anexo': 'b-neutral' }[t] || 'b-neutral');
    const filas = lista.map(d => '<tr class="clic" data-ir="documento/' + esc(d.cod) + '~' + esc(d.rev) + '">' +
      '<td><span class="cod">' + esc(d.cod) + '</span></td><td><div class="t-prim">' + esc(d.nombre) + '</div></td><td>' + badge(d.tipo, tipoColor(d.tipo)) + '</td><td class="c mono">Rev. ' + esc(d.rev) + '</td><td>' + estadoB(d.estado) + '</td><td class="t-sec">' + fFecha(d.emision) + '</td><td>' + (d.estado === 'Obsoleto' ? '<span class="t-sec">—</span>' : badge(venceTxt(d.prox), dias(d.prox) < 0 ? 'b-danger' : dias(d.prox) <= 90 ? 'b-warn' : 'b-neutral')) + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Documentos del sistema</h1><div class="sub">Procedimientos, formularios, instructivos y anexos · reemplaza las carpetas de ' + esc(S.empresa.nube) + '</div></div>' +
      '<div class="acc"><span class="badge b-ok"><i class="ph ph-check-circle"></i>' + docsVigentes().length + ' vigentes</span><span class="badge b-warn"><i class="ph ph-arrows-clockwise"></i>' + docsRevision().length + ' en revisión</span></div></div>' +
      '<div class="doc-layout"><div class="doc-arbol">' + arbol + '</div>' +
      '<div class="card"><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Código</th><th>Documento</th><th>Tipo</th><th class="c">Revisión</th><th>Estado</th><th>Emisión</th><th>Próx. revisión</th></tr></thead><tbody>' + filas + '</tbody></table></div></div></div>';
  };

  VISTAS.documento = function (p) {
    const key = (p[0] || '').split('~'); const cod = key[0]; const revQ = key[1];
    const d = S.documentos.find(x => x.cod === cod && (!revQ || x.rev === revQ)) || S.documentos.find(x => x.cod === cod);
    if (!d) return vacio('Documento no encontrado');
    const obsol = d.estado === 'Obsoleto';
    const rev = +d.rev; const hist = [];
    for (let i = rev; i >= 1 && i > rev - 3; i--) { const r = String(i).padStart(2, '0'); hist.push({ r: r, f: i === rev ? d.emision : null, actual: i === rev }); }
    const distr = ['Dirección', 'Gestión de Calidad', 'Responsable del sector ' + esc(d.sec), 'Jefes de obra'];
    const estadoB = obsol ? badge('Obsoleto', 'b-neutral') : d.estado === 'En revisión' ? badge('En revisión', 'b-warn') : badge('Vigente', 'b-ok');
    return '' +
      '<div class="crumb"><a href="#/documentos">Documentos</a><i class="ph ph-caret-right"></i><span class="mono">' + esc(d.cod) + '</span></div>' +
      '<div class="pg-head"><div class="tt"><h1>' + esc(d.nombre) + '</h1><div class="sub mono">' + esc(d.cod) + ' · Rev. ' + esc(d.rev) + ' · ' + esc(secNom(d.sec)) + '</div></div><div class="acc">' + estadoB + '<button class="btn" data-accion="demo"><i class="ph ph-download-simple"></i>Descargar PDF</button></div></div>' +
      (obsol ? '<div class="card card-pad" style="margin-bottom:16px;border-color:color-mix(in srgb,var(--warn) 40%,transparent);background:var(--warn-soft)"><div style="display:flex;gap:10px;align-items:center;color:var(--warn-ink);font-weight:600"><i class="ph ph-warning-circle" style="font-size:18px"></i>Versión obsoleta. Reemplazada por una revisión vigente. Conservada como copia no vigente.</div></div>' : '') +
      '<div class="grid g-2-1">' +
      '<div class="card card-pad"><div class="ficha">' +
      '<div class="f"><label>Tipo</label><div class="v">' + esc(d.tipo) + '</div></div>' +
      '<div class="f"><label>Revisión vigente</label><div class="v">Rev. ' + esc(d.rev) + '</div></div>' +
      '<div class="f"><label>Estado</label><div class="v">' + esc(d.estado) + '</div></div>' +
      '<div class="f"><label>Sector</label><div class="v">' + esc(secNom(d.sec)) + '</div></div>' +
      '<div class="f"><label>Fecha de emisión</label><div class="v">' + fFecha(d.emision) + '</div></div>' +
      '<div class="f"><label>Próxima revisión</label><div class="v">' + fFecha(d.prox) + '</div></div>' +
      '</div>' +
      '<div class="sep"></div><h3 style="font-size:14px;margin-bottom:12px">Elaboración, revisión y aprobación</h3>' +
      '<div class="data-lista">' +
      '<div class="dl">' + ava(d.resp) + '<div style="flex:1"><div style="font-weight:600;font-size:13px">Elaboró</div><div class="t-sec">' + esc(d.resp) + '</div></div><span class="t-sec">' + fFecha(d.emision) + '</span></div>' +
      '<div class="dl">' + ava('A Ferrer') + '<div style="flex:1"><div style="font-weight:600;font-size:13px">Revisó</div><div class="t-sec">Gestión de Calidad (A. Ferrer)</div></div><span class="t-sec">' + fFecha(d.emision) + '</span></div>' +
      '<div class="dl">' + ava('Direccion') + '<div style="flex:1"><div style="font-weight:600;font-size:13px">Aprobó</div><div class="t-sec">Dirección</div></div><span class="t-sec">' + fFecha(d.emision) + '</span></div>' +
      '</div>' +
      '<div class="sep"></div><h3 style="font-size:14px;margin-bottom:10px">Historial de revisiones</h3><div class="data-lista">' +
      hist.map(h => '<div class="dl"><span class="cod">Rev. ' + h.r + '</span><span style="flex:1" class="t-sec">' + (h.actual ? (obsol ? 'Última revisión · ' + fFecha(h.f) : 'Emitida ' + fFecha(h.f)) : 'Revisión anterior') + '</span>' + (h.actual && !obsol ? badge('Vigente', 'b-ok') : badge('Histórica', 'b-neutral')) + '</div>').join('') +
      '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Control documental</h3><span class="mini">GC-01</span></div><div class="card-pad">' +
      '<div class="data-lista">' +
      '<div class="dl"><span style="flex:1;font-weight:500">En lista maestra (GC-01-F1)</span>' + badge('Sí', 'b-ok') + '</div>' +
      '<div class="dl"><span style="flex:1;font-weight:500">Copia controlada</span>' + (obsol ? badge('No vigente', 'b-neutral') : badge('Controlada', 'b-ok')) + '</div>' +
      '<div class="dl"><span style="flex:1;font-weight:500">Acceso</span>' + badge('Según sector', 'b-info') + '</div>' +
      '</div>' +
      '<div class="sep"></div><h3 style="font-size:13px;margin-bottom:10px">Distribución <span class="mini" style="font-weight:400">· GC-01-F3</span></h3><div class="data-lista">' +
      distr.map(x => '<div class="dl">' + ava(x) + '<span style="flex:1;font-weight:500;font-size:13px">' + esc(x) + '</span>' + badge('Notificado', 'b-ok') + '</div>').join('') +
      '</div><div class="sep"></div><p class="nota">Hoy este documento es un archivo en la carpeta de nube del sector, sin control de quién tiene la última versión. En Argos queda versionado con firma de elaboración, revisión y aprobación; aviso automático antes de la próxima revisión; lista maestra y copias controladas; y registro de quién lo tiene asignado.</p></div></div></div>';
  };

  /* ============================================================ VISTA · FUA ============================================================ */
  let fuaFiltro = 'Todas';
  VISTAS.fua = function (p) {
    if (p && p[0]) { abrirFua(p[0]); }
    const cols = ['Abierta', 'En análisis', 'Acción en curso', 'Verificación', 'Cerrada'];
    const colIc = { 'Abierta': 'ph-circle-dashed', 'En análisis': 'ph-magnifying-glass', 'Acción en curso': 'ph-gear', 'Verificación': 'ph-check-square-offset', 'Cerrada': 'ph-check-circle' };
    const kanban = cols.map(c => {
      const items = S.fuas.filter(f => f.estado === c);
      const cards = items.map(f => '<div class="kan-card" data-ir="fua/' + esc(f.cod) + '"><div class="kc-top">' + tipoTag(f.tipo) + (esVencida(f) ? badge('Vencida', 'b-danger') : '<span class="kc-cod">' + esc(f.cod) + '</span>') + '</div><div class="kc-tt">' + esc(f.titulo) + '</div><div class="kc-foot">' + ava(f.resp) + '<span>' + esc(f.sec) + '</span><span style="margin-left:auto">' + vigencia(f) + '</span></div></div>').join('') || '<div style="padding:14px;text-align:center;color:var(--ink-faint);font-size:12px">—</div>';
      return '<div class="kan-col"><div class="kh"><i class="ph ' + colIc[c] + '"></i>' + c + '<span class="cn">' + items.length + '</span></div>' + cards + '</div>';
    }).join('');
    const tipos = [['Todas', S.fuas.length], ['NC', S.fuas.filter(f => f.tipo === 'NC').length], ['RC', S.fuas.filter(f => f.tipo === 'RC').length], ['Obs', S.fuas.filter(f => f.tipo === 'Obs').length], ['AC', S.fuas.filter(f => f.tipo === 'AC').length], ['OM', S.fuas.filter(f => f.tipo === 'OM').length]];
    const lista = S.fuas.filter(f => fuaFiltro === 'Todas' || f.tipo === fuaFiltro).sort((a, b) => b.apertura.localeCompare(a.apertura));
    const filas = lista.map(f => '<tr class="clic" data-ir="fua/' + esc(f.cod) + '"><td class="mono t-sec">' + esc(f.cod) + '</td><td>' + tipoTag(f.tipo) + '</td><td><div class="t-prim">' + esc(f.titulo) + '</div><div class="t-sec">' + esc(f.origen) + '</div></td><td><span class="tag-sector">' + esc(f.sec) + '</span></td><td>' + resp(f.resp) + '</td><td>' + estadoFuaBadge(f) + '</td><td class="t-sec">' + (f.estado === 'Cerrada' ? badge('cerrada', 'b-neutral') : badge(venceTxt(f.vence), esVencida(f) ? 'b-danger' : dias(f.vence) <= 7 ? 'b-warn' : 'b-neutral')) + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Acciones · FUA</h1><div class="sub">Formulario Único de Acción (GC-03-F1): reclamos, no conformes, observaciones, acciones correctivas y oportunidades de mejora</div></div>' +
      '<div class="acc"><button class="btn primary" data-accion="nueva-fua"><i class="ph ph-plus"></i>Nueva acción</button></div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-folder-open', lb: 'Abiertas', val: fuaAbiertas().length }) +
      kpi({ ic: 'ph-warning-circle', lb: 'Vencidas', val: fuaVencidas().length, tono: fuaVencidas().length ? 'danger' : 'ok' }) +
      kpi({ ic: 'ph-check-circle', lb: 'Cerradas (año)', val: S.fuas.filter(f => f.estado === 'Cerrada').length, tono: 'ok' }) +
      kpi({ ic: 'ph-clock-countdown', lb: 'Cerradas en plazo', val: 82, u: '%', foot: '<span>objetivo 85%</span>' }) +
      '</div>' +
      '<div class="section-t">Tablero por estado</div>' +
      '<div class="kanban" style="margin-bottom:24px">' + kanban + '</div>' +
      '<div class="card"><div class="card-h"><h3>Listado de acciones</h3><div class="acc"><div class="seg">' + tipos.map(t => '<button class="' + (fuaFiltro === t[0] ? 'on' : '') + '" data-fuafiltro="' + t[0] + '">' + t[0] + ' <span class="num" style="opacity:.6">' + t[1] + '</span></button>').join('') + '</div></div></div>' +
      '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Código</th><th>Tipo</th><th>Descripción</th><th>Sector</th><th>Responsable</th><th>Estado</th><th>Vencimiento</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>';
  };

  const PASOS = [
    { k: 'desc', t: 'Descripción', d: 'Describir el problema (o el beneficio si es una OM).' },
    { k: 'disposicion', t: 'Disposición / Corrección', d: 'Acción inmediata para contener el desvío.' },
    { k: 'causa', t: 'Análisis de la causa', d: 'Por qué sucedió (o beneficio esperado).' },
    { k: 'accion', t: 'Acción', d: 'Solución para que no vuelva a ocurrir a largo plazo.' },
    { k: 'verif', t: 'Verificación de eficacia', d: 'Comprobar que la acción funcionó.' },
  ];
  function abrirFua(cod) {
    const f = S.fuas.find(x => x.cod === cod);
    if (!f) return;
    const primerPendiente = PASOS.findIndex(s => !f[s.k]);
    const cerrada = f.estado === 'Cerrada';
    const steps = PASOS.map((s, i) => {
      const val = f[s.k];
      const curr = i === primerPendiente && !cerrada;
      return '<div class="step ' + (val ? 'done' : curr ? 'curr' : '') + '"><div class="sdot"><i class="ph ' + (val ? 'ph-check' : curr ? 'ph-dots-three' : 'ph-circle') + '"></i></div>' +
        '<div class="sbody"><b>' + s.t + '</b><div class="meta">' + esc(s.d) + '</div>' + (val ? '<p>' + esc(val) + '</p>' : '<p style="opacity:.6;font-style:italic">Pendiente</p>') + '</div></div>';
    }).join('');
    const cierreStep = '<div class="step ' + (f.cierre ? 'done' : '') + '"><div class="sdot"><i class="ph ' + (f.cierre ? 'ph-check' : 'ph-flag') + '"></i></div><div class="sbody"><b>Cierre</b><div class="meta">Cierre de la acción con fecha.</div>' + (f.cierre ? '<p>Cerrada el ' + fFecha(f.cierre) + '</p>' : '<p style="opacity:.6;font-style:italic">Pendiente</p>') + '</div></div>';
    let pie = '';
    if (!cerrada) {
      if (primerPendiente >= 0) pie = '<button class="btn primary" data-accion="fua-avanzar" data-cod="' + esc(cod) + '"><i class="ph ph-arrow-right"></i>Registrar: ' + PASOS[primerPendiente].t + '</button>';
      else pie = '<button class="btn brand" data-accion="fua-cerrar" data-cod="' + esc(cod) + '"><i class="ph ph-flag-checkered"></i>Cerrar acción</button>';
    }
    const body = '<div class="ficha" style="margin-bottom:18px">' +
      '<div class="f"><label>Tipo</label><div class="v">' + (TIPO_FUA[f.tipo] ? TIPO_FUA[f.tipo][0] + ' (' + f.tipo + ')' : esc(f.tipo)) + '</div></div>' +
      '<div class="f"><label>Estado</label><div class="v">' + (esVencida(f) ? 'Vencida' : esc(f.estado)) + '</div></div>' +
      '<div class="f"><label>Sector</label><div class="v">' + esc(secNom(f.sec)) + '</div></div>' +
      '<div class="f"><label>Origen</label><div class="v">' + esc(f.origen) + '</div></div>' +
      '<div class="f"><label>Responsable</label><div class="v">' + esc(f.resp) + '</div></div>' +
      '<div class="f"><label>Apertura</label><div class="v">' + fFecha(f.apertura) + '</div></div>' +
      '<div class="f"><label>Vencimiento</label><div class="v">' + fFecha(f.vence) + '</div></div>' +
      '</div><div class="stepper">' + steps + cierreStep + '</div>';
    drawer('<span class="mono" style="color:var(--brand);font-size:13px">' + esc(f.cod) + '</span> ' + tipoTag(f.tipo), esc(f.titulo), body, pie);
  }

  /* ============================================================ VISTA · AUDITORÍAS ============================================================ */
  VISTAS.auditorias = function () {
    const internas = S.auditorias.filter(a => a.tipo === 'Interna');
    const totNc = internas.reduce((a, b) => a + (b.nc || 0), 0);
    const totObs = internas.reduce((a, b) => a + (b.obs || 0), 0);
    const totOm = internas.reduce((a, b) => a + (b.om || 0), 0);
    const filas = S.auditorias.map(a => '<tr><td class="mono t-sec">' + esc(a.cod) + '</td><td><div class="t-prim">' + esc(a.sector) + '</div></td><td>' + (a.tipo === 'Interna' ? badge('Interna', 'b-info') : badge('Certificación', 'b-navy')) + '</td><td class="t-sec">' + fFecha(a.fecha) + '</td><td>' + resp(a.auditor) + '</td><td class="c">' + (a.nc == null ? '<span class="t-sec">—</span>' : (a.nc ? badge(a.nc + ' NC', 'b-danger') : '<span class="t-sec">0 NC</span>')) + '</td><td class="c">' + (a.obs == null ? '—' : a.obs) + '</td><td class="c">' + (a.om == null ? '—' : a.om) + '</td><td>' + (a.estado === 'Cerrada' ? badge('Cerrada', 'b-ok') : badge('Programada', 'b-warn')) + '</td></tr>').join('');
    const ext = S.proximaAuditoriaExterna; const d = dias(ext.fecha); const prog = Math.max(5, Math.min(100, 100 - (d / 120 * 100)));
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Auditorías</h1><div class="sub">Programa anual de auditorías internas (GC-02) y auditoría de certificación IRAM</div></div>' +
      '<div class="acc"><button class="btn" data-accion="demo"><i class="ph ph-calendar-plus"></i>Programar auditoría</button></div></div>' +
      '<div class="grid g-2-1" style="margin-bottom:22px">' +
      '<div class="card card-pad" style="background:linear-gradient(135deg,var(--navy),var(--navy-700));color:#fff;border:none">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><i class="ph-fill ph-seal-check" style="font-size:24px;color:#8fd0f3"></i><span style="font-weight:700;font-size:15px">Próxima auditoría de certificación</span></div>' +
      '<div style="font-family:var(--fd);font-weight:800;font-size:22px;margin-bottom:4px">' + esc(ext.tipo) + '</div>' +
      '<div style="opacity:.85;margin-bottom:14px">IRAM · ' + fFecha(ext.fecha) + ' · faltan <b>' + d + ' días</b></div>' +
      '<div class="bar" style="background:rgba(255,255,255,.18)"><span style="width:' + prog + '%;background:#8fd0f3"></span></div>' +
      '<div style="opacity:.75;font-size:12px;margin-top:8px">Preparación del sistema · las FUAs abiertas deben cerrarse antes de la auditoría</div></div>' +
      '<div class="card"><div class="card-h"><h3>Hallazgos del año</h3><span class="mini">auditorías internas</span></div><div class="card-pad">' +
      '<div class="data-lista"><div class="dl"><span style="flex:1;font-weight:500">No conformidades</span>' + badge(totNc + ' NC', 'b-danger') + '</div>' +
      '<div class="dl"><span style="flex:1;font-weight:500">Observaciones</span>' + badge(totObs + ' Obs', 'b-info') + '</div>' +
      '<div class="dl"><span style="flex:1;font-weight:500">Oportunidades de mejora</span>' + badge(totOm + ' OM', 'b-ok') + '</div></div>' +
      '<div class="sep"></div><p class="nota">Cada hallazgo genera una FUA con seguimiento hasta el cierre. ' + fuaVencidas().length + ' FUA vencida' + (fuaVencidas().length === 1 ? '' : 's') + ' hoy.</p></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Cronograma de auditorías</h3><span class="mini">GC-02-F1 · ' + new Date(HOY).getFullYear() + '</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Código</th><th>Alcance / sector</th><th>Tipo</th><th>Fecha</th><th>Auditor</th><th class="c">NC</th><th class="c">Obs</th><th class="c">OM</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>';
  };

  /* ============================================================ VISTA · OBRAS ============================================================ */
  VISTAS.obras = function () {
    const estadoB = (e) => ({ 'En ejecución': 'b-info', 'Entregada': 'b-ok', 'En garantía': 'b-violet' }[e]) || 'b-neutral';
    const cards = S.obras.map(o => '<div class="card clic" data-ir="obra/' + esc(o.cod) + '" style="cursor:pointer">' +
      '<div class="card-pad"><div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:10px"><div><div class="t-sec mono">' + esc(o.cod) + '</div><div style="font-weight:700;font-size:15px;font-family:var(--fd)">' + esc(o.nombre) + '</div></div>' + badge(o.estado, estadoB(o.estado)) + '</div>' +
      '<div class="nota" style="margin-bottom:12px"><i class="ph ph-map-pin"></i> ' + esc(o.ubic) + ' · ' + esc(o.tipo) + '<br><i class="ph ph-user"></i> ' + esc(o.cliente) + '</div>' +
      '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-faint);margin-bottom:5px">Avance de obra</div>' + bar(o.avance, o.avance === 100 ? 'ok' : '') + '</div>' +
      '<div style="display:flex;gap:16px;font-size:12px;color:var(--ink-soft)"><span><b class="num" style="color:var(--ink)">' + o.planCal + '%</b> plan de calidad</span><span><b class="num" style="color:var(--ink)">' + o.inspAprob + '/' + o.inspTotal + '</b> inspecciones</span>' + (o.reclamos ? '<span style="color:var(--warn-ink)"><b class="num">' + o.reclamos + '</b> reclamo' + (o.reclamos > 1 ? 's' : '') + '</span>' : '') + '</div></div></div>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Obras</h1><div class="sub">Construcciones (CN-01) · plan de calidad, inspecciones, entrega y posventa por obra</div></div>' +
      '<div class="acc"><button class="btn" data-accion="demo"><i class="ph ph-plus"></i>Nueva obra</button></div></div>' +
      '<div class="grid g-3">' + cards + '</div>';
  };

  VISTAS.obra = function (p) {
    const o = S.obras.find(x => x.cod === p[0]);
    if (!o) return vacio('Obra no encontrada');
    const insp = [
      { et: 'Recepción de materiales', ap: 'Aprobada', pt: 'recepción' },
      { et: 'Armaduras y encofrado N3', ap: 'Aprobada', pt: 'proceso' },
      { et: 'Hormigonado de losa N3', ap: 'Con observación', pt: 'proceso' },
      { et: 'Instalación sanitaria', ap: 'Pendiente', pt: 'proceso' },
      { et: 'Terminaciones unidad tipo', ap: 'Pendiente', pt: 'final' },
    ];
    const inspB = (e) => e === 'Aprobada' ? badge('Aprobada', 'b-ok') : e === 'Con observación' ? badge('Con observación', 'b-warn') : badge('Pendiente', 'b-neutral');
    const fuasObra = S.fuas.filter(f => f.origen.indexOf(o.nombre) >= 0);
    return '' +
      '<div class="crumb"><a href="#/obras">Obras</a><i class="ph ph-caret-right"></i><span class="mono">' + esc(o.cod) + '</span></div>' +
      '<div class="pg-head"><div class="tt"><h1>' + esc(o.nombre) + '</h1><div class="sub">' + esc(o.cliente) + ' · ' + esc(o.ubic) + ' · ' + esc(o.tipo) + '</div></div><div class="acc">' + badge(o.estado, o.estado === 'Entregada' ? 'b-ok' : o.estado === 'En garantía' ? 'b-violet' : 'b-info') + '</div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-chart-line-up', lb: 'Avance de obra', val: o.avance, u: '%', tono: o.avance === 100 ? 'ok' : '' }) +
      kpi({ ic: 'ph-clipboard-text', lb: 'Plan de calidad', val: o.planCal, u: '%' }) +
      kpi({ ic: 'ph-check-square', lb: 'Inspecciones aprobadas', val: o.inspAprob, u: '/' + o.inspTotal }) +
      kpi({ ic: 'ph-chat-circle-dots', lb: 'Reclamos posventa', val: o.reclamos, tono: o.reclamos ? 'warn' : 'ok' }) +
      '</div>' +
      '<div class="grid g-2-1">' +
      '<div class="card"><div class="card-h"><h3>Puntos de inspección (ITP)</h3><span class="mini">CN-04 · recepción, proceso y final</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Etapa</th><th>Instancia</th><th>Estado</th></tr></thead><tbody>' +
      insp.map(i => '<tr><td class="t-prim">' + esc(i.et) + '</td><td class="t-sec">' + esc(i.pt) + '</td><td>' + inspB(i.ap) + '</td></tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>Datos de obra</h3></div><div class="card-pad"><div class="ficha">' +
      '<div class="f"><label>Inicio</label><div class="v">' + fFecha(o.inicio) + '</div></div>' +
      '<div class="f"><label>Fin previsto</label><div class="v">' + fFecha(o.fin) + '</div></div>' +
      '<div class="f"><label>Jefe de obra</label><div class="v">J. Olivares</div></div>' +
      '<div class="f"><label>Documentos</label><div class="v mono">CN-01, CN-04</div></div>' +
      '</div></div></div></div>' +
      '<div class="section-t">Acciones (FUA) de esta obra</div>' +
      '<div class="card"><div class="tabla-wrap"><table class="tabla"><tbody>' +
      (fuasObra.length ? fuasObra.map(f => '<tr class="clic" data-ir="fua/' + esc(f.cod) + '"><td class="mono t-sec">' + esc(f.cod) + '</td><td>' + tipoTag(f.tipo) + '</td><td class="t-prim">' + esc(f.titulo) + '</td><td>' + estadoFuaBadge(f) + '</td></tr>').join('') : '<tr><td>' + vacio('Sin acciones abiertas para esta obra', 'ph-check-circle') + '</td></tr>') +
      '</tbody></table></div></div>';
  };

  /* ============================================================ VISTA · COMPRAS ============================================================ */
  VISTAS.compras = function () {
    const estadoB = (e) => e === 'Aprobado' ? badge('Aprobado', 'b-ok') : e === 'Condicionado' ? badge('Condicionado', 'b-warn') : badge('No apto', 'b-danger');
    const polB = (e) => e === 'Vigente' ? badge('Vigente', 'b-ok') : e === 'Por vencer' ? badge('Por vencer', 'b-warn') : badge('Vencida', 'b-danger');
    const apr = S.proveedores.filter(p => p.estado === 'Aprobado').length;
    const filas = S.proveedores.map(p => '<tr><td><div class="t-prim">' + esc(p.nombre) + '</div><div class="t-sec mono">CUIT ' + esc(p.cuit) + '</div></td><td class="t-sec">' + esc(p.rubro) + '</td><td style="width:140px">' + bar(p.puntaje, p.puntaje >= 80 ? 'ok' : p.puntaje >= 60 ? 'warn' : 'danger') + '</td><td>' + estadoB(p.estado) + '</td><td>' + polB(p.poliza) + '</td><td class="t-sec">' + fFecha(p.ultEval) + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Compras y proveedores</h1><div class="sub">Circuito de compras (CO-01) y evaluación de proveedores (CO-02-F1)</div></div>' +
      '<div class="acc"><button class="btn" data-accion="demo"><i class="ph ph-file-plus"></i>Pedido de obra</button><button class="btn primary" data-accion="demo"><i class="ph ph-plus"></i>Evaluar proveedor</button></div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-handshake', lb: 'Proveedores', val: S.proveedores.length }) +
      kpi({ ic: 'ph-check-circle', lb: 'Aprobados', val: apr, tono: 'ok', foot: '<span>objetivo 80%</span>' }) +
      kpi({ ic: 'ph-warning', lb: 'Condicionados', val: S.proveedores.filter(p => p.estado === 'Condicionado').length, tono: 'warn' }) +
      kpi({ ic: 'ph-prohibit', lb: 'No aptos / póliza vencida', val: S.proveedores.filter(p => p.estado === 'No apto' || p.poliza === 'Vencida').length, tono: 'danger' }) +
      '</div>' +
      '<div class="card"><div class="card-h"><h3>Padrón de proveedores</h3><span class="mini">evaluación · puntaje · pólizas (CO-01-A1)</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Proveedor</th><th>Rubro</th><th>Puntaje</th><th>Evaluación</th><th>Póliza</th><th>Última eval.</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>' +
      '<p class="nota" style="margin-top:12px"><i class="ph ph-info"></i> Regla del sistema: no se emite Orden de Compra a proveedores "No apto", y los "Condicionado" requieren visto del Responsable de Compras.</p>';
  };

  /* ============================================================ VISTA · EQUIPOS ============================================================ */
  VISTAS.equipos = function () {
    const eqB = (e) => e === 'Operativo' ? badge('Operativo', 'b-ok') : e === 'En reparación' ? badge('En reparación', 'b-warn') : badge(e, 'b-neutral');
    const imB = (e) => e === 'Calibrado' ? badge('Calibrado', 'b-ok') : e === 'Por vencer' ? badge('Por vencer', 'b-warn') : badge('Vencido', 'b-danger');
    const eqFilas = S.equipos.map(e => '<tr><td class="mono t-sec">' + esc(e.cod) + '</td><td class="t-prim">' + esc(e.nombre) + '</td><td class="t-sec">' + esc(e.obra) + '</td><td>' + eqB(e.estado) + '</td><td class="t-sec">' + fFecha(e.ultMant) + '</td><td>' + badge(venceTxt(e.proxMant), dias(e.proxMant) < 0 ? 'b-danger' : dias(e.proxMant) <= 30 ? 'b-warn' : 'b-neutral') + '</td></tr>').join('');
    const imFilas = S.instrumentos.map(i => '<tr><td class="mono t-sec">' + esc(i.cod) + '</td><td class="t-prim">' + esc(i.nombre) + '</td><td class="t-sec">' + esc(i.obra) + '</td><td>' + imB(i.estado) + '</td><td class="t-sec">' + fFecha(i.ultCal) + '</td><td>' + badge(venceTxt(i.proxCal), dias(i.proxCal) < 0 ? 'b-danger' : dias(i.proxCal) <= 30 ? 'b-warn' : 'b-neutral') + '</td><td class="t-sec">' + esc(i.patron) + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Equipos y mediciones</h1><div class="sub">Mantenimiento de equipos (MN-01) y control de instrumentos de medición (MN-02)</div></div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-wrench', lb: 'Equipos en obra', val: S.equipos.length, foot: '<span>' + S.equipos.filter(e => e.estado === 'En reparación').length + ' en reparación</span>' }) +
      kpi({ ic: 'ph-ruler', lb: 'Instrumentos', val: S.instrumentos.length }) +
      kpi({ ic: 'ph-seal-check', lb: 'Calibrados', val: S.instrumentos.filter(i => i.estado === 'Calibrado').length, tono: 'ok' }) +
      kpi({ ic: 'ph-warning-circle', lb: 'Calibración vencida / por vencer', val: instrAlerta().length, tono: S.instrumentos.some(i => i.estado === 'Vencido') ? 'danger' : 'warn' }) +
      '</div>' +
      '<div class="card" style="margin-bottom:20px"><div class="card-h"><h3>Instrumentos de medición</h3><span class="mini">MN-02 · calibración trazable</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Código</th><th>Instrumento</th><th>Obra</th><th>Estado</th><th>Última calibración</th><th>Próxima</th><th>Patrón</th></tr></thead><tbody>' + imFilas + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>Equipos</h3><span class="mini">MN-01 · mantenimiento preventivo</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Código</th><th>Equipo</th><th>Obra</th><th>Estado</th><th>Último mant.</th><th>Próximo</th></tr></thead><tbody>' + eqFilas + '</tbody></table></div></div>';
  };

  /* ============================================================ VISTA · PERSONAL ============================================================ */
  VISTAS.personal = function () {
    const compB = (c) => c === 'Cumple' ? badge('Cumple', 'b-ok') : badge('Brecha', 'b-warn');
    const filas = S.personal.map(p => '<tr><td>' + resp(p.nombre) + '</td><td class="t-prim">' + esc(p.puesto) + '</td><td><span class="tag-sector">' + esc(p.sector) + '</span></td><td style="width:150px">' + bar(p.cap, p.cap >= 80 ? 'ok' : p.cap >= 60 ? 'warn' : 'danger') + '</td><td class="c">' + (p.induccion === 'Sí' ? badge('Sí', 'b-ok') : badge(p.induccion, 'b-warn')) + '</td><td>' + compB(p.comp) + '</td></tr>').join('');
    const capB = (e) => e === 'Realizada' ? badge('Realizada', 'b-ok') : badge('Programada', 'b-warn');
    const capFilas = S.capacitaciones.map(c => '<tr><td class="t-prim">' + esc(c.tema) + '</td><td><span class="tag-sector">' + esc(c.sector) + '</span></td><td class="t-sec">' + fFecha(c.fecha) + '</td><td class="c">' + (c.asist || '—') + '</td><td>' + capB(c.estado) + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Personal y capacitación</h1><div class="sub">Competencias (PE-01), matriz de competencias y plan anual de capacitación (PE-01-F4)</div></div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-users', lb: 'Personas en el sistema', val: S.personal.length }) +
      kpi({ ic: 'ph-graduation-cap', lb: 'Capacitación promedio', val: capacitacionGlobal(), u: '%', tono: capacitacionGlobal() >= 85 ? 'ok' : '' }) +
      kpi({ ic: 'ph-warning', lb: 'Brechas de competencia', val: S.personal.filter(p => p.comp === 'Brecha').length, tono: 'warn' }) +
      kpi({ ic: 'ph-calendar-check', lb: 'Capacitaciones del año', val: S.capacitaciones.length, foot: '<span>' + S.capacitaciones.filter(c => c.estado === 'Programada').length + ' programadas</span>' }) +
      '</div>' +
      '<div class="card" style="margin-bottom:20px"><div class="card-h"><h3>Matriz de competencias</h3><span class="mini">PE-01-F3</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Persona</th><th>Puesto</th><th>Sector</th><th>Capacitación</th><th class="c">Inducción</th><th>Competencia</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>Plan anual de capacitación</h3><span class="mini">PE-01-F4</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Tema</th><th>Sector</th><th>Fecha</th><th class="c">Asistentes</th><th>Estado</th></tr></thead><tbody>' + capFilas + '</tbody></table></div></div>';
  };

  /* ============================================================ VISTA · SEGURIDAD Y AMBIENTE ============================================================ */
  VISTAS.sstya = function () {
    const nivB = (n) => n === 'Alto' ? badge('Alto', 'b-danger') : n === 'Medio' ? badge('Medio', 'b-warn') : badge('Bajo', 'b-ok');
    const signB = (s) => s === 'Significativo' ? badge('Significativo', 'b-danger') : badge(s, 'b-warn');
    const riesgos = S.riesgos.map(r => '<tr><td class="t-prim">' + esc(r.tarea) + '</td><td class="t-sec">' + esc(r.peligro) + '</td><td>' + nivB(r.nivel) + '</td><td class="t-sec">' + esc(r.control) + '</td><td>' + badge(r.estado, r.estado === 'Controlado' ? 'b-ok' : 'b-warn') + '</td></tr>').join('');
    const inc = S.incidentes.map(i => '<tr><td class="t-sec">' + fFecha(i.fecha) + '</td><td class="t-prim">' + esc(i.tipo) + '</td><td class="t-sec">' + esc(i.obra) + '</td><td>' + badge(i.gravedad, 'b-warn') + '</td><td>' + badge(i.estado, 'b-ok') + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Seguridad y ambiente</h1><div class="sub">ISO 45001 (SSTyA) e ISO 14001 (ambiente): matriz IPER, aspectos ambientales e incidentes</div></div>' +
      '<div class="acc"><span class="iso-tag iso45"><i class="ph-fill ph-shield-check"></i>45001</span><span class="iso-tag iso14"><i class="ph-fill ph-leaf"></i>14001</span></div></div>' +
      '<div class="kpis g-4" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-shield-warning', lb: 'Riesgos altos', val: S.riesgos.filter(r => r.nivel === 'Alto').length, tono: 'warn', foot: '<span>todos con control</span>' }) +
      kpi({ ic: 'ph-first-aid', lb: 'Accidentes con días perdidos', val: 0, tono: 'ok', foot: '<span>en el año</span>' }) +
      kpi({ ic: 'ph-leaf', lb: 'Aspectos significativos', val: S.aspectosAmb.filter(a => a.signif === 'Significativo').length, tono: 'warn' }) +
      kpi({ ic: 'ph-recycle', lb: 'Residuos segregados', val: 86, u: '%', foot: '<span>objetivo 90%</span>' }) +
      '</div>' +
      '<div class="card" style="margin-bottom:20px"><div class="card-h"><h3>Matriz IPER</h3><span class="mini">GS-01-F1 · identificación de peligros</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Tarea</th><th>Peligro</th><th>Nivel</th><th>Control</th><th>Estado</th></tr></thead><tbody>' + riesgos + '</tbody></table></div></div>' +
      '<div class="grid g-2">' +
      '<div class="card"><div class="card-h"><h3>Aspectos ambientales</h3><span class="mini">GA-01-F1</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Aspecto</th><th>Impacto</th><th>Signif.</th></tr></thead><tbody>' + S.aspectosAmb.map(a => '<tr><td class="t-prim">' + esc(a.aspecto) + '</td><td class="t-sec">' + esc(a.impacto) + '</td><td>' + signB(a.signif) + '</td></tr>').join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>Incidentes</h3><span class="mini">registro del año</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Fecha</th><th>Tipo</th><th>Obra</th><th>Gravedad</th><th>Estado</th></tr></thead><tbody>' + inc + '</tbody></table></div></div>' +
      '</div>';
  };

  /* ============================================================ VISTA · DIRECCIÓN ============================================================ */
  VISTAS.direccion = function () {
    const rd = S.revisionDireccion; const foda = S.foda;
    const fodaBox = (t, arr, ic, col) => '<div class="card card-pad"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700"><i class="ph ' + ic + '" style="color:' + col + ';font-size:18px"></i>' + t + '</div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--ink-soft);line-height:1.8">' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    const partes = S.partesInteresadas.map(p => '<tr><td class="t-prim">' + esc(p.parte) + '</td><td class="t-sec">' + esc(p.necesidad) + '</td><td>' + badge(p.nivel, p.nivel === 'Alto' ? 'b-danger' : 'b-warn') + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Dirección</h1><div class="sub">Revisión por la Dirección (DI-01), planeamiento estratégico (DI-02) y mapa de procesos (DI-04)</div></div></div>' +
      '<div class="grid g-2-1" style="margin-bottom:22px">' +
      '<div class="card"><div class="card-h"><h3>Última revisión por la Dirección</h3><span class="mini">DI-01-F1</span><div class="acc">' + badge(rd.estado, 'b-ok') + '</div></div><div class="card-pad"><div class="grid g-2">' +
      '<div><div class="section-t" style="margin-top:0">Entradas</div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--ink-soft);line-height:1.8">' + rd.entradas.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
      '<div><div class="section-t" style="margin-top:0">Salidas / decisiones</div><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--ink-soft);line-height:1.8">' + rd.salidas.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
      '</div></div></div>' +
      '<div class="card card-pad"><div class="section-t" style="margin-top:0">Fechas</div><div class="ficha"><div class="f"><label>Realizada</label><div class="v">' + fFecha(rd.fecha) + '</div></div><div class="f"><label>Próxima</label><div class="v">' + fFecha(rd.proxima) + '</div></div></div><div class="sep"></div><p class="nota">La revisión por la Dirección evalúa el desempeño del SGI y define las acciones de mejora. Argos reúne automáticamente las entradas (auditorías, FUAs, objetivos, satisfacción, proveedores).</p></div></div>' +
      '<div class="section-t">Análisis FODA · DI-02-F1</div>' +
      '<div class="grid g-2" style="margin-bottom:22px">' + fodaBox('Fortalezas', foda.f, 'ph-arrow-fat-up', 'var(--ok)') + fodaBox('Oportunidades', foda.o, 'ph-lightbulb', 'var(--brand)') + fodaBox('Debilidades', foda.d, 'ph-arrow-fat-down', 'var(--warn)') + fodaBox('Amenazas', foda.a, 'ph-warning', 'var(--danger)') + '</div>' +
      '<div class="card"><div class="card-h"><h3>Partes interesadas</h3><span class="mini">DI-02-F2</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Parte interesada</th><th>Necesidad / expectativa</th><th>Relevancia</th></tr></thead><tbody>' + partes + '</tbody></table></div></div>';
  };

  /* ============================================================ VISTA · MEJORA Y OBJETIVOS ============================================================ */
  VISTAS.mejora = function () {
    const filas = S.objetivos.map(o => { const pct = Math.min(100, o.real / o.meta * 100); const ok = o.real >= o.meta; return '<tr><td><span class="iso-tag ' + o.iso + '">' + (o.iso === 'iso9' ? '9001' : o.iso === 'iso14' ? '14001' : '45001') + '</span></td><td class="t-sec">' + esc(o.sector) + '</td><td class="t-prim">' + esc(o.indicador) + (o.nota ? '<div class="t-sec">' + esc(o.nota) + '</div>' : '') + '</td><td class="c num">' + o.meta + o.unidad + '</td><td class="c num" style="font-weight:700">' + o.real + o.unidad + '</td><td style="width:130px">' + bar(pct, ok ? 'ok' : pct >= 90 ? 'warn' : 'danger') + '</td><td>' + (ok ? badge('Cumple', 'b-ok') : badge('Por debajo', 'b-warn')) + '</td></tr>'; }).join('');
    const satProm = Math.round(S.satisfaccion.reduce((a, s) => a + s.score, 0) / S.satisfaccion.length);
    const sat = S.satisfaccion.map(s => '<div class="dl"><div style="flex:1"><div style="font-weight:600;font-size:13px">' + esc(s.cliente) + '</div><div class="t-sec">' + esc(s.obra) + ' · ' + fFecha(s.fecha) + '</div></div><div style="width:90px">' + bar(s.score, s.score >= 85 ? 'ok' : 'warn') + '</div></div>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Mejora y objetivos</h1><div class="sub">Objetivos e indicadores por sector (GC-05) y satisfacción de clientes (GC-04)</div></div>' +
      '<div class="acc">' + kpiInline('Cumplimiento global', cumplimientoGlobal() + '%') + '</div></div>' +
      '<div class="card" style="margin-bottom:22px"><div class="card-h"><h3>Objetivos del sistema</h3><span class="mini">meta vs. real</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Norma</th><th>Sector</th><th>Indicador</th><th class="c">Meta</th><th class="c">Real</th><th>Avance</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>' +
      '<div class="grid g-2">' +
      '<div class="card"><div class="card-h"><h3>Satisfacción de clientes</h3><span class="mini">GC-04-F1 · promedio ' + satProm + '%</span></div><div class="card-pad"><div class="data-lista">' + sat + '</div></div></div>' +
      '<div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px"><div class="ring" style="--p:' + satProm + ';--c:var(--iso9)"><div class="ring-in"><b class="num" data-count="' + satProm + '" data-suffix="%">' + satProm + '%</b><span>Satisf.</span></div></div><p class="nota" style="text-align:center">Promedio de satisfacción de las últimas ' + S.satisfaccion.length + ' obras encuestadas. Objetivo: 85%.</p></div>' +
      '</div>';
  };

  /* ============================================================ VISTA · LEGALES ============================================================ */
  VISTAS.legales = function () {
    const estB = (e) => e === 'Cumple' ? badge('Cumple', 'b-ok') : e === 'En seguimiento' ? badge('En seguimiento', 'b-warn') : badge(e, 'b-danger');
    const filas = S.legales.map(l => '<tr><td><div class="t-prim">' + esc(l.requisito) + '</div></td><td>' + badge(l.tipo, 'b-neutral') + '</td><td class="c">' + (l.aplica === 'Sí' ? badge('Aplica', 'b-info') : '—') + '</td><td>' + estB(l.estado) + '</td><td class="t-sec">' + fFecha(l.ultVerif) + '</td><td>' + badge(venceTxt(l.prox), dias(l.prox) < 0 ? 'b-danger' : dias(l.prox) <= 60 ? 'b-warn' : 'b-neutral') + '</td></tr>').join('');
    return '' +
      '<div class="pg-head"><div class="tt"><h1>Requisitos legales</h1><div class="sub">Matriz de identificación y verificación de requisitos legales y otros aplicables (RL-01)</div></div></div>' +
      '<div class="kpis g-3" style="display:grid;margin-bottom:20px">' +
      kpi({ ic: 'ph-scales', lb: 'Requisitos identificados', val: S.legales.length }) +
      kpi({ ic: 'ph-check-circle', lb: 'En cumplimiento', val: S.legales.filter(l => l.estado === 'Cumple').length, tono: 'ok' }) +
      kpi({ ic: 'ph-clock', lb: 'En seguimiento', val: S.legales.filter(l => l.estado !== 'Cumple').length, tono: 'warn' }) +
      '</div>' +
      '<div class="card"><div class="card-h"><h3>Matriz de requisitos legales</h3><span class="mini">RL-01 · seguridad · ambiente · general</span></div><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Requisito</th><th>Tipo</th><th class="c">Aplica</th><th>Estado</th><th>Última verif.</th><th>Próxima</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>';
  };

  /* ============================================================ Drawer / Modal / Toast / Paleta ============================================================ */
  function drawer(titulo, sub, body, pie) {
    setH($('#drawer'), '<div class="drawer-h"><div class="tt"><h2>' + titulo + '</h2>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><button class="x" data-accion="cerrar-drawer"><i class="ph ph-x"></i></button></div><div class="drawer-b">' + body + '</div>' + (pie ? '<div class="drawer-f">' + pie + '</div>' : ''));
    $('#drawer-wrap').classList.add('on'); $('#drawer-wrap').setAttribute('aria-hidden', 'false');
    setTimeout(() => { const d = $('#drawer'); if (d) d.focus(); }, 20);
  }
  function cerrarDrawer() { $('#drawer-wrap').classList.remove('on'); $('#drawer-wrap').setAttribute('aria-hidden', 'true'); }
  function cerrarDrawerUser() { cerrarDrawer(); if (location.hash.indexOf('#/fua/') === 0) { try { history.replaceState(null, '', '#/fua'); } catch (e) { location.hash = '#/fua'; } } }
  function modalReiniciar() { modal('Reiniciar datos de ejemplo', '<p class="nota">Vas a restablecer la maqueta a su estado inicial. Se pierden las acciones (FUA) que hayas creado o avanzado en esta sesión.</p>', '<button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn danger" data-accion="reiniciar-ok"><i class="ph ph-arrow-counter-clockwise"></i>Reiniciar</button>'); }
  function modal(titulo, body, pie) {
    setH($('#modal'), '<div class="modal-h"><div class="tt"><h2>' + titulo + '</h2></div><button class="x" data-accion="cerrar-modal"><i class="ph ph-x"></i></button></div><div class="modal-b">' + body + '</div>' + (pie ? '<div class="modal-f">' + pie + '</div>' : ''));
    $('#modal-wrap').classList.add('on'); $('#modal-wrap').setAttribute('aria-hidden', 'false');
    setTimeout(() => { const i = $('#modal input,#modal select,#modal textarea'); if (i) i.focus(); }, 30);
  }
  function cerrarModal() { $('#modal-wrap').classList.remove('on'); $('#modal-wrap').setAttribute('aria-hidden', 'true'); }
  let toastT;
  function toast(msg) { const t = $('#toast'); setH(t, '<i class="ph-fill ph-check-circle"></i>' + esc(msg)); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

  /* ---------- Nueva FUA ---------- */
  function proxFecha(d) { const x = new Date(HOY + 'T00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }
  function modalNuevaFua() {
    const secOpts = window.SEED.sectores.map(s => '<option value="' + s.sc + '">' + esc(s.sc + ' · ' + s.nombre) + '</option>').join('');
    const body = '<div class="campo"><label>Tipo de acción</label><select class="input" id="nf-tipo">' +
      '<option value="NC">No conformidad (NC)</option><option value="RC">Reclamo de cliente (RC)</option><option value="Obs">Observación (Obs)</option><option value="AC">Acción correctiva (AC)</option><option value="OM">Oportunidad de mejora (OM)</option></select></div>' +
      '<div class="campo"><label>Título / problema</label><input class="input" id="nf-tit" placeholder="Ej.: Desvío en el control de recepción de acero"></div>' +
      '<div class="campo"><label>Descripción</label><textarea class="input" id="nf-desc" placeholder="Describí el problema (o el beneficio si es una OM)"></textarea></div>' +
      '<div class="campo-row"><div class="campo"><label>Sector</label><select class="input" id="nf-sec">' + secOpts + '</select></div>' +
      '<div class="campo"><label>Responsable</label><input class="input" id="nf-resp" placeholder="Ej.: A. Ferrer"></div></div>' +
      '<div class="campo-row"><div class="campo"><label>Origen</label><input class="input" id="nf-origen" placeholder="Obra / auditoría / cliente / proceso"></div>' +
      '<div class="campo"><label>Vencimiento</label><input class="input" type="date" id="nf-vence" value="' + proxFecha(21) + '"></div></div>';
    modal('Nueva acción · FUA', body, '<button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" data-accion="nueva-fua-ok"><i class="ph ph-check"></i>Crear acción</button>');
  }
  function crearFua() {
    const tit = $('#nf-tit').value.trim(), desc = $('#nf-desc').value.trim();
    if (!tit) { $('#nf-tit').focus(); $('#nf-tit').style.borderColor = 'var(--danger)'; toast('Poné un título para la acción'); return; }
    const usados = S.fuas.map(f => parseInt((f.cod.match(/FUA-2026-(\d+)/) || [])[1], 10)).filter(n => !isNaN(n));
    const num = String((usados.length ? Math.max.apply(null, usados) : 41) + 1).padStart(3, '0');
    const cod = 'FUA-2026-' + num;
    S.fuas.unshift({ cod: cod, tipo: $('#nf-tipo').value, titulo: tit, sec: $('#nf-sec').value, origen: $('#nf-origen').value.trim() || 'Proceso', apertura: HOY, vence: $('#nf-vence').value || proxFecha(21), resp: $('#nf-resp').value.trim() || 'Sin asignar', estado: 'Abierta', desc: desc || tit, disposicion: '', causa: '', accion: '', verif: '', cierre: '' });
    guardar(); cerrarModal(); toast('Acción ' + cod + ' creada'); location.hash = '#/fua/' + cod; render();
  }
  const ESTADO_POR_PASO = { disposicion: 'En análisis', causa: 'Acción en curso', accion: 'Acción en curso', verif: 'Verificación' };
  function modalAvanzar(cod) {
    const f = S.fuas.find(x => x.cod === cod); if (!f) return;
    const i = PASOS.findIndex(s => !f[s.k]); if (i < 0) return;
    const paso = PASOS[i];
    modal('Registrar: ' + paso.t, '<div class="campo"><label>' + paso.t + '</label><div class="ayuda" style="margin-top:0;margin-bottom:8px">' + esc(paso.d) + '</div><textarea class="input" id="av-txt" style="min-height:100px" placeholder="Escribí el registro…"></textarea></div>', '<button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" data-accion="av-ok" data-cod="' + esc(cod) + '" data-k="' + paso.k + '"><i class="ph ph-check"></i>Guardar</button>');
  }
  function guardarAvance(cod, k) {
    const f = S.fuas.find(x => x.cod === cod); if (!f) return;
    const txt = $('#av-txt').value.trim(); if (!txt) { $('#av-txt').focus(); $('#av-txt').style.borderColor = 'var(--danger)'; toast('Completá el registro antes de guardar'); return; }
    f[k] = txt;
    if (ESTADO_POR_PASO[k] && f.estado !== 'Cerrada') f.estado = ESTADO_POR_PASO[k];
    guardar(); cerrarModal(); const tg = '#/fua/' + cod; if (location.hash !== tg) location.hash = tg; else render(); toast('Registro guardado en ' + cod);
  }
  function cerrarFuaAccion(cod) {
    const f = S.fuas.find(x => x.cod === cod); if (!f) return;
    f.cierre = HOY; f.estado = 'Cerrada'; if (!f.verif) f.verif = 'Verificada al cierre el ' + fFecha(HOY) + '.';
    guardar(); cerrarDrawer(); render(); toast('Acción ' + cod + ' cerrada');
  }

  /* ---------- Paleta de búsqueda ---------- */
  let palRes = [], palSel = 0;
  function abrirPaleta() { $('#paleta-wrap').classList.add('on'); $('#paleta-wrap').setAttribute('aria-hidden', 'false'); const i = $('#busqueda-global'); i.value = ''; buscar(''); setTimeout(() => i.focus(), 20); }
  function cerrarPaleta() { $('#paleta-wrap').classList.remove('on'); $('#paleta-wrap').setAttribute('aria-hidden', 'true'); }
  function buscar(q) {
    q = norm(q).trim();
    const out = [];
    NAV.filter(n => n.r).forEach(n => { if (!q || norm(n.t).includes(q)) out.push({ g: 'Ir a', t: n.t, s: 'Sección', ic: n.i, h: '#/' + n.r }); });
    S.documentos.forEach(d => { if (q && (norm(d.cod).includes(q) || norm(d.nombre).includes(q))) out.push({ g: 'Documentos', t: d.nombre, s: d.cod, ic: 'ph-file-text', h: '#/documento/' + d.cod + '~' + d.rev }); });
    S.fuas.forEach(f => { if (q && (norm(f.cod).includes(q) || norm(f.titulo).includes(q))) out.push({ g: 'Acciones', t: f.titulo, s: f.cod, ic: 'ph-clipboard-text', h: '#/fua/' + f.cod }); });
    S.obras.forEach(o => { if (q && (norm(o.nombre).includes(q) || norm(o.cliente).includes(q))) out.push({ g: 'Obras', t: o.nombre, s: o.cliente, ic: 'ph-buildings', h: '#/obra/' + o.cod }); });
    S.proveedores.forEach(p => { if (q && norm(p.nombre).includes(q)) out.push({ g: 'Proveedores', t: p.nombre, s: p.rubro, ic: 'ph-handshake', h: '#/compras' }); });
    palRes = out.slice(0, 30); palSel = 0; pintarPaleta();
  }
  function pintarPaleta() {
    const cont = $('#resultados-global');
    if (!palRes.length) { setH(cont, '<div class="vacio" style="padding:26px"><i class="ph ph-magnifying-glass"></i>Sin resultados</div>'); return; }
    let html = '', g = '';
    palRes.forEach((r, i) => { if (r.g !== g) { g = r.g; html += '<div class="res-grupo">' + esc(g) + '</div>'; } html += '<div class="res' + (i === palSel ? ' sel' : '') + '" data-pal="' + i + '"><i class="ph ' + r.ic + '"></i><div class="rt"><b>' + esc(r.t) + '</b><span>' + esc(r.s) + '</span></div><span class="rk mono">' + esc(r.s || '') + '</span></div>'; });
    setH(cont, html);
    const sel = $('.res.sel', cont); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function irPaleta(i) { const r = palRes[i]; if (!r) return; cerrarPaleta(); location.hash = r.h; }

  /* ---------- Menú móvil / tema ---------- */
  function abrirMenu() { $('#app').classList.add('menu'); }
  function cerrarMenu() { $('#app').classList.remove('menu'); }
  function tema() { const act = document.documentElement.getAttribute('data-tema'); const nuevo = act === 'oscuro' ? 'claro' : 'oscuro'; document.documentElement.setAttribute('data-tema', nuevo); try { localStorage.setItem('riva-sgi-tema', nuevo); } catch (e) {} }

  /* ============================================================ Eventos ============================================================ */
  document.addEventListener('click', function (e) {
    const ir = e.target.closest('[data-ir]');
    if (ir) { e.preventDefault(); location.hash = '#/' + ir.getAttribute('data-ir'); return; }
    const pal = e.target.closest('[data-pal]');
    if (pal) { irPaleta(+pal.getAttribute('data-pal')); return; }
    const ds = e.target.closest('[data-docsec]');
    if (ds) { docSec = ds.getAttribute('data-docsec'); render(); return; }
    const ff = e.target.closest('[data-fuafiltro]');
    if (ff) { fuaFiltro = ff.getAttribute('data-fuafiltro'); render(); return; }
    const a = e.target.closest('[data-accion]');
    if (!a) return;
    const acc = a.getAttribute('data-accion'); const cod = a.getAttribute('data-cod');
    if (acc === 'tema') tema();
    else if (acc === 'abrir-menu') abrirMenu();
    else if (acc === 'cerrar-menu') cerrarMenu();
    else if (acc === 'paleta') abrirPaleta();
    else if (acc === 'cerrar-paleta') cerrarPaleta();
    else if (acc === 'cerrar-drawer') cerrarDrawerUser();
    else if (acc === 'cerrar-modal') cerrarModal();
    else if (acc === 'demo') toast('Disponible en el sistema final');
    else if (acc === 'reiniciar-ok') { reiniciar(); cerrarModal(); render(); toast('Datos de ejemplo restablecidos'); }
    else if (acc === 'nueva-fua') modalNuevaFua();
    else if (acc === 'nueva-fua-ok') crearFua();
    else if (acc === 'fua-avanzar') modalAvanzar(cod);
    else if (acc === 'av-ok') guardarAvance(cod, a.getAttribute('data-k'));
    else if (acc === 'fua-cerrar') cerrarFuaAccion(cod);
    else if (acc === 'reiniciar') modalReiniciar();
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'busqueda-global') buscar(e.target.value); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPaleta(); return; }
    if (e.key === 'Escape') {
      if ($('#modal-wrap').classList.contains('on')) cerrarModal();
      else if ($('#paleta-wrap').classList.contains('on')) cerrarPaleta();
      else if ($('#drawer-wrap').classList.contains('on')) cerrarDrawerUser();
      else cerrarMenu();
      return;
    }
    if (e.key === 'Tab') {
      const cap = $('#modal-wrap').classList.contains('on') ? $('#modal') : $('#drawer-wrap').classList.contains('on') ? $('#drawer') : null;
      if (cap) {
        const fes = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', cap).filter(el => el.offsetParent !== null);
        if (fes.length) { const first = fes[0], last = fes[fes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    }
    if ($('#paleta-wrap').classList.contains('on')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palRes.length - 1, palSel + 1); pintarPaleta(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); pintarPaleta(); }
      else if (e.key === 'Enter') { e.preventDefault(); irPaleta(palSel); }
    }
  });
  window.addEventListener('hashchange', render);

  /* ---------- Init ---------- */
  const wm = document.createElement('div'); wm.className = 'wm'; wm.textContent = 'Maqueta · Datos de ejemplo · Argos'; document.body.appendChild(wm);
  render();
})();

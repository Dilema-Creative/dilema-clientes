/* Maqueta Argos para Momo Arquitectura.
   Navegable, con base propia en el navegador (localStorage, se conserva al recargar).
   Todos los cálculos salen de motor.js. Eventos por delegación (data-accion), sin handlers inline, todo texto escapado. */
(function () {
  'use strict';
  const M = window.Motor;

  /* ================= utilidades ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const setHTML = (el, html) => el.replaceChildren(document.createRange().createContextualFragment(html));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = M.r2;
  const fmt = (n, mon) => { const v = Number(n || 0); const s = Math.abs(Math.round(v)).toLocaleString('es-AR'); return (v < -0.5 ? '-' : '') + (mon === 'USD' ? 'USD ' : '$ ') + s; };
  const fmtM = (n, mon) => { const v = Number(n || 0); const p = mon === 'USD' ? 'USD ' : '$ '; if (Math.abs(v) >= 1e6) return (v < 0 ? '-' : '') + p + (Math.abs(v) / 1e6).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'; return fmt(v, mon); };
  const pct = (n) => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + '%';
  const fFecha = (iso) => { if (!iso) return ''; const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
  const fLarga = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const fRel = (ts) => { const d = Math.round((Date.now() - new Date(ts)) / 864e5); if (d <= 0) return 'hoy'; if (d === 1) return 'ayer'; if (d < 30) return 'hace ' + d + ' días'; return fFecha(ts.slice(0, 10)); };
  const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const coincide = (txt, q) => { if (!q) return true; const t = sinAcentos(txt); return sinAcentos(q).split(/\s+/).filter(Boolean).every((w) => t.includes(w)); };
  const NUM_RE = /^-?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;
  const parseNum = (s) => { if (typeof s === 'number') return s; const t = String(s || '').replace(/\$|\s|USD/g, ''); if (!t || !NUM_RE.test(t)) return NaN; return Number(t.replace(/\./g, '').replace(',', '.')); };
  const fmtInput = (n) => (n === '' || n == null || !Number.isFinite(Number(n))) ? '' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const cuitFmt = (c) => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10) : d; };
  const iniciales = (u) => u ? u.nombre.slice(0, 2).toUpperCase() : '?';
  const hoy = M.hoyISO;
  const esMovil = () => window.matchMedia('(max-width: 640px)').matches;

  /* ================= base ================= */
  const KEY = 'momo-argos-maqueta-v3';
  let DB;
  function normalizar(db) {
    db.config.baseCAC = db.config.baseCAC || '2026-03';
    db.certificados.forEach((c) => { if (!c.estado) c.estado = 'emitido'; c.ed = (c.ed || []).map((e) => Object.assign({ mo: 0, mat: e.precio || 0 }, e)); });
    db.presupuestos.forEach((p) => p.items.forEach((i) => { if (i.iibb == null) i.iibb = 0; if (i.interno == null) i.interno = i.costo ? r2((i.venta / i.costo - 1) * 100) : 0; }));
    ['clientes', 'proveedores'].forEach((k) => db[k].forEach((x) => { if (x.archivado == null) x.archivado = false; }));
    db.facturasCompra = db.facturasCompra || []; db.notasCredito = db.notasCredito || []; db.arcaRecibidos = db.arcaRecibidos || []; db.padron = db.padron || {}; db.cuentas = db.cuentas || [];
    const fe = [];
    db.obras.forEach((o) => { if (o.anticipo && o.anticipo.fecha && o.anticipo.comp && o.anticipo.comp !== 'sin' && !o.anticipo.fe) fe.push({ f: o.anticipo.fecha, l: o.anticipo.comp, set: (x) => { o.anticipo.fe = x; } }); });
    db.certificados.forEach((c) => { if (c.estado === 'emitido' && c.comp && c.comp !== 'sin' && !c.fe) fe.push({ f: c.fecha, l: c.comp, set: (x) => { c.fe = x; } }); });
    fe.sort((a, b) => a.f.localeCompare(b.f)).forEach((x) => x.set(nuevoFE(db, x.l, x.f)));
    return db;
  }
  function cargar() {
    try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.version === 1) { DB = d; M.usar(DB); return; } } } catch (e) { /* base nueva */ }
    DB = normalizar(window.MOMO_SEED()); M.usar(DB); M.resolverAutos(); guardar();
  }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('No se pudo guardar en este navegador.', 'warning'); } }
  const nid = (p) => p + (++DB.contadores.id);
  const creado = () => ({ por: UI.usuario, ts: new Date().toISOString() });
  function log(txt, obra) { DB.auditoria.unshift({ ts: new Date().toISOString(), por: UI.usuario, txt, obra: obra || '' }); DB.auditoria = DB.auditoria.slice(0, 200); }

  /* ================= perfiles ================= */
  const PERM = {
    socio: { costos: 1, margen: 1, sin: 1, plata: 1, teso: 1, config: 1, aprobar: 1, editarPres: 1, emitir: 1, archivar: 1 },
    adm: { costos: 1, margen: 0, sin: 0, plata: 1, teso: 1, config: 1, aprobar: 0, editarPres: 1, emitir: 1, archivar: 1 },
    arq: { costos: 0, margen: 0, sin: 0, plata: 0, teso: 0, config: 0, aprobar: 0, editarPres: 0, emitir: 0, archivar: 0 }
  };
  const PERFIL_TXT = { socio: 'Socio', adm: 'Administración', arq: 'Arquitecto' };
  const UI = { usuario: 'u1', obras: { estado: 'curso', q: '' }, clientes: { tab: 'activos', q: '' }, proveedores: { tab: 'activos', q: '', rubro: '' }, tareas: { vista: 'todas', obra: '' }, teso: { cheques: 'cartera', anulados: false }, certDraft: null };
  try { const u = localStorage.getItem('momo-usuario'); if (u) UI.usuario = u; } catch (e) { /* nada */ }
  const yo = () => M.usuario(UI.usuario) || DB.equipo[0];
  const perfil = () => yo().perfil;
  const puede = (k) => !!PERM[perfil()][k];

  /* quien no ve plata tampoco la lee en el historial */
  const actividadVisible = (l) => puede('plata') ? l : l.filter((x) => !/cobro|pago|cheque|\$|USD|gasto|caja|certificado N° \d+ \(/i.test(x.txt));

  /* totales en pesos y en dólares: lado a lado si hay dos, uno solo alineado a la derecha si hay uno */
  const bloquesTotales = (bloques, enCard) => { const b = bloques.filter(Boolean).map((x) => enCard ? '<div class="card"><div class="card-b">' + x + '</div></div>' : '<div>' + x + '</div>'); return '<div class="totales' + (b.length === 1 ? ' uno' : '') + '">' + b.join('') + '</div>'; };

  /* ================= piezas visuales ================= */
  const ic = (n, cls) => '<i class="ph ph-' + n + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>';
  const badge = (txt, cls, icono) => '<span class="badge ' + (cls || '') + '">' + (icono ? ic(icono) : '') + esc(txt) + '</span>';
  const monTag = (mon) => mon === 'USD' ? '<span class="mon">USD</span>' : '';
  const barra = (p) => '<div class="avance"><div class="barra" data-w="' + Math.min(100, Math.max(0, p)) + '"></div><span class="p">' + Math.round(p) + '%</span></div>';
  const persona = (uid) => { const u = M.usuario(uid); return u ? '<span class="persona"><span class="av">' + esc(iniciales(u)) + '</span>' + esc(u.nombre) + '</span>' : '<span class="tenue">Sin asignar</span>'; };
  const doble = (o, fn) => { const f = fn || fmt; const a = []; if (o.ARS || !o.USD) a.push(f(o.ARS, 'ARS')); if (o.USD) a.push(f(o.USD, 'USD')); return a.join(' · '); };
  const ESTADO_OBRA = { presupuesto: ['Presupuestando', ''], curso: ['En curso', 'b-info'], terminada: ['Terminada', 'b-ok'], archivada: ['Archivada', ''] };
  const estadoObra = (o) => badge(ESTADO_OBRA[o.estado][0], ESTADO_OBRA[o.estado][1]);
  const ESTADO_CARGO = { Cobrado: 'b-ok', Parcial: 'b-warn', Pendiente: 'b-bad' };
  const compTxt = (c) => c === 'sin' ? 'Sin factura' : c ? 'Factura ' + c : '';
  const vacio = (icono, txt, extra) => '<div class="vacio-estado">' + ic(icono) + '<div>' + esc(txt) + '</div>' + (extra || '') + '</div>';
  const certNombre = (c) => 'Certificado N° ' + c.num;

  /* ================= navegación ================= */
  function ruta() { const h = (location.hash || '#/inicio').replace(/^#\/?/, ''); const partes = h.split('/').filter(Boolean); return partes.length ? partes : ['inicio']; }
  function pintarNav() {
    const r = ruta()[0];
    const vencidas = DB.tareas.filter((t) => t.resp === UI.usuario && t.col !== 'hecha' && t.vence && M.dias(t.vence) < 0).length;
    const chq = DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'cartera' && M.dias(c.pago) <= 7).length;
    const item = (href, icono, txt, activo, cuenta) => '<a href="#/' + href + '"' + (activo ? ' aria-current="page"' : '') + '>' + ic(icono) + '<span>' + txt + '</span>' + (cuenta ? '<span class="cuenta">' + cuenta + '</span>' : '') + '</a>';
    let h = '<div class="nav-grupo">' + item('inicio', 'house', 'Inicio', r === 'inicio') + item('obras', 'buildings', 'Obras', r === 'obras' || r === 'obra') + item('tareas', 'kanban', 'Tareas', r === 'tareas', vencidas) + '</div>';
    h += '<div class="nav-grupo"><h3>Contactos</h3>' + item('clientes', 'users-three', 'Clientes', r === 'clientes') + item('proveedores', 'toolbox', 'Proveedores', r === 'proveedores') + '</div>';
    if (puede('teso') || puede('config')) {
      h += '<div class="nav-grupo"><h3>Administración</h3>';
      if (puede('teso')) h += item('tesoreria', 'bank', 'Tesorería', r === 'tesoreria', chq);
      if (puede('teso')) h += item('facturacion', 'receipt', 'Facturación', r === 'facturacion', DB.arcaRecibidos.filter((x) => !M.facturaDuplicada(x.prov, x.tipo, x.numero)).length);
      if (puede('config')) h += item('config', 'gear-six', 'Configuración', r === 'config');
      h += '</div>';
    }
    setHTML($('#nav'), h);
    const tb = (href, icono, txt, activo, cuenta) => '<a href="#/' + href + '"' + (activo ? ' aria-current="page"' : '') + '>' + ic(icono) + '<span>' + txt + '</span>' + (cuenta ? '<b>' + cuenta + '</b>' : '') + '</a>';
    setHTML($('#tabbar'), tb('inicio', 'house', 'Inicio', r === 'inicio') + tb('obras', 'buildings', 'Obras', r === 'obras' || r === 'obra') + '<span class="tb-hueco" aria-hidden="true"></span>' + tb('tareas', 'kanban', 'Tareas', r === 'tareas', vencidas) + (puede('teso') ? tb('tesoreria', 'bank', 'Tesorería', r === 'tesoreria', chq) : tb('clientes', 'users-three', 'Contactos', r === 'clientes' || r === 'proveedores')));
    const u = yo();
    setHTML($('#yo'), '<span class="av grande">' + esc(iniciales(u)) + '</span><span class="yo-txt"><b>' + esc(u.nombre) + '</b><span>' + esc(PERFIL_TXT[u.perfil]) + '</span></span><label class="yo-sel"><span class="sr-only">Ver como</span><select class="input" id="ver-como-2">' + DB.equipo.map((x) => '<option value="' + x.id + '"' + (x.id === UI.usuario ? ' selected' : '') + '>' + esc(x.nombre + ' · ' + PERFIL_TXT[x.perfil]) + '</option>').join('') + '</select></label>');
  }
  function migas(arr) {
    const tm = $('#titulo-movil'); if (tm) tm.textContent = arr[arr.length - 1][0];
    setHTML($('#migas'), arr.map((m, i) => i === arr.length - 1 ? '<b>' + esc(m[0]) + '</b>' : '<a href="' + m[1] + '">' + esc(m[0]) + '</a>' + ic('caret-right')).join(''));
  }
  function pintarVerComo() {
    setHTML($('#ver-como'), DB.equipo.map((u) => '<option value="' + u.id + '"' + (u.id === UI.usuario ? ' selected' : '') + '>' + esc(u.nombre + ' · ' + PERFIL_TXT[u.perfil]) + '</option>').join(''));
  }

  function render(animar) {
    const p = ruta();
    const vistas = { inicio: vInicio, obras: vObras, obra: vObra, tareas: vTareas, clientes: vClientes, proveedores: vProveedores, tesoreria: vTesoreria, facturacion: vFacturacion, config: vConfig };
    let V = vistas[p[0]] || vInicio;
    if (((p[0] === 'tesoreria' || p[0] === 'facturacion') && !puede('teso')) || (p[0] === 'config' && !puede('config'))) V = vInicio;
    if (p[0] === 'obra' && !M.obra(p[1])) V = vObras;
    const html = V(p);
    setHTML($('#vista'), '<div class="' + (animar ? 'entra' : '') + '">' + html + '</div>');
    pintarNav();
    despuesDePintar();
    if (animar) window.scrollTo(0, 0);
  }
  function despuesDePintar() {
    const frac = (v) => Math.min(100, Math.max(0, Number(v) || 0)) / 100;
    $$('[data-w]').forEach((e) => e.style.setProperty('--w', frac(e.dataset.w)));
    $$('[data-w2]').forEach((e) => e.style.setProperty('--w2', frac(e.dataset.w2)));
    $$('[data-stagger]').forEach((c) => Array.from(c.children).forEach((ch, i) => ch.style.setProperty('--i', Math.min(i, 10))));
    $$('img[data-foto]').forEach((im) => {
      if (im.complete && im.naturalWidth) { im.classList.add('lista'); return; }
      im.addEventListener('load', () => im.classList.add('lista'), { once: true });
      im.addEventListener('error', () => im.closest('.oc-foto, .obra-hero') && im.closest('.oc-foto, .obra-hero').classList.add('sin-foto'), { once: true });
    });
    etiquetarTablas(document);
    if ($('.kanban')) montarKanban();
    if ($('#grafico-flujo')) montarGrafico();
  }
  /* En celular cada fila de tabla se ve como una ficha: cada celda lleva el nombre de su columna */
  function etiquetarTablas(raiz) {
    $$('.tabla-wrap table', raiz).forEach((t) => {
      if (t.closest('.doc')) return;
      const cab = $$('thead th', t).map((th) => th.textContent.trim());
      $$('tbody tr, tfoot tr', t).forEach((tr) => { let col = 0; Array.from(tr.children).forEach((td) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', td.colSpan > 1 ? '' : (cab[col] || '')); col += td.colSpan || 1; }); });
    });
  }
  /* ================= toast, modal, drawer ================= */
  let tToast;
  function toast(msg, icono) { const t = $('#toast'); setHTML(t, ic(icono || 'check-circle') + '<span>' + esc(msg) + '</span>'); t.classList.add('visible'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('visible'), 3200); }
  let ultimoFoco = null;
  function abrirDrawer(html) {
    const w = $('#drawer-wrap'); if (!w.classList.contains('abierto')) ultimoFoco = document.activeElement;
    setHTML($('#drawer'), html); w.classList.add('abierto'); w.setAttribute('aria-hidden', 'false');
    $('#drawer').scrollTop = 0; $('#drawer').focus({ preventScroll: true }); despuesDePintar(); etiquetarTablas($('#drawer'));
  }
  function cerrarDrawer() { const w = $('#drawer-wrap'); w.classList.remove('abierto'); w.setAttribute('aria-hidden', 'true'); if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true }); }
  function abrirModal(html, alMontar, ancho) {
    const m = $('#modal'); m.classList.toggle('ancho', !!ancho); setHTML(m, html);
    const w = $('#modal-wrap'); w.classList.add('abierto'); w.setAttribute('aria-hidden', 'false');
    $$('input.monto', m).forEach(campoMonto);
    if (alMontar) alMontar(m);
    if (!esMovil()) { const f = $('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea', m); if (f) f.focus(); }
  }
  function cerrarModal() { const w = $('#modal-wrap'); w.classList.remove('abierto'); w.setAttribute('aria-hidden', 'true'); }
  const cabModal = (t) => '<div class="m-h"><h2>' + esc(t) + '</h2><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-modal" aria-label="Cerrar">' + ic('x') + '</button></div>';
  function mostrarErrores(m, errores) {
    const box = $('.aviso-errores', m);
    if (!errores.length) { if (box) box.remove(); return true; }
    const html = '<div class="aviso-errores" role="alert">Falta cargar o corregir: ' + errores.map(esc).join(', ') + '.</div>';
    if (box) box.replaceWith(document.createRange().createContextualFragment(html)); else $('.m-b', m).prepend(document.createRange().createContextualFragment(html));
    return false;
  }
  function confirmar(titulo, texto, botonTxt, alOk, peligro) {
    abrirModal(cabModal(titulo) + '<div class="m-b"><p>' + esc(texto) + '</p></div><div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn ' + (peligro ? 'peligro' : 'primary') + '" id="m-ok">' + esc(botonTxt) + '</button></div>', (m) => {
      $('#m-ok', m).addEventListener('click', () => { cerrarModal(); alOk(); });
    });
  }
  function campoMonto(input) {
    input.addEventListener('focusout', () => {
      if (input.value.trim() === '') { input.classList.remove('invalido'); return; }
      const v = parseNum(input.value);
      if (Number.isFinite(v)) { input.value = fmtInput(v); input.classList.remove('invalido'); } else input.classList.add('invalido');
    });
  }
  const val = (m, sel) => { const e = $(sel, m); return e ? e.value.trim() : ''; };
  const num = (m, sel) => parseNum(val(m, sel));
  const opciones = (lista, sel, vacioTxt) => (vacioTxt != null ? '<option value="">' + esc(vacioTxt) + '</option>' : '') + lista.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(sel) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');

  /* ================= alertas (inicio) ================= */
  function alertas() {
    const a = []; const verSin = puede('sin'); const mesActual = hoy().slice(0, 7);
    if (puede('plata')) {
      DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'cartera').forEach((c) => {
        const d = M.dias(c.pago); if (d > 7) return;
        a.push({ n: d < 0 ? 'bad' : 'warn', i: 'money', t: (d < 0 ? 'Cheque vencido sin depositar' : 'Depositar cheque ' + c.banco + ' N° ' + c.numero), s: fmt(c.importe) + ' de ' + c.librador + (d < 0 ? ' · venció hace ' + (-d) + ' días' : d === 0 ? ' · vence hoy' : ' · se puede depositar en ' + d + ' días'), href: '#/tesoreria/cheques', b: 'Ver cheques' });
      });
      DB.cheques.filter((c) => c.tipo === 'propio' && M.estadoCheque(c) === 'emitido' && M.dias(c.pago) <= 7).forEach((c) => {
        a.push({ n: 'warn', i: 'bank', t: 'Cheque propio N° ' + c.numero + ' debita en ' + M.dias(c.pago) + ' días', s: fmt(c.importe) + ' en ' + c.banco + '. Que haya fondos ese día.', href: '#/tesoreria/cheques', b: 'Ver' });
      });
    }
    DB.obras.filter((o) => o.estado === 'curso').forEach((o) => {
      const b = M.borradorDe(o.id);
      if (b && puede('emitir')) a.push({ n: 'warn', i: 'file-text', t: o.nombre + ': certificado N° ' + b.num + ' para revisar', s: 'Lo cargó ' + (M.usuario(b.creado.por) || {}).nombre + '. Revisá el avance y emitilo.', href: '#/obra/' + o.id + '/certificado/' + b.id, b: 'Revisar' });
      const delMes = M.certsDe(o.id).some((c) => c.fecha.slice(0, 7) === mesActual);
      if (!b && !delMes && M.presAprobado(o.id)) a.push({ n: '', i: 'calendar-blank', t: o.nombre + ': falta el certificado de ' + M.mesTxt(mesActual).split(' ')[0], s: 'Último: ' + (M.certsDe(o.id).slice(-1)[0] ? 'N° ' + M.certsDe(o.id).slice(-1)[0].num + ' del ' + fFecha(M.certsDe(o.id).slice(-1)[0].fecha) : 'ninguno todavía'), href: '#/obra/' + o.id + '/certificado/nuevo', b: 'Cargar avance' });
    });
    if (puede('plata')) {
      DB.obras.forEach((o) => M.cargos(o.id).filter((c) => verSin || c.comp !== 'sin').forEach((c) => {
        const e = M.estadoCargo(c); const d = -M.dias(c.fecha);
        if (e.estado !== 'Cobrado' && d > 10) a.push({ n: d > 30 ? 'bad' : 'warn', i: 'hand-coins', t: (M.cliente(o.cliente) || {}).razon + ' debe ' + doble(e.saldo), s: c.nombre + ' de ' + o.nombre + ' · emitido hace ' + d + ' días', href: '#/obra/' + o.id + '/cuenta', b: 'Ver cuenta' });
      }));
      let aPagar = 0, nObras = 0; DB.obras.filter((o) => o.estado === 'curso').forEach((o) => { const r = M.resumen(o.id, verSin); if (r.aPagar.ARS > 0) { aPagar += r.aPagar.ARS; nObras++; } });
      if (aPagar > 0) a.push({ n: '', i: 'toolbox', t: 'Proveedores con avance certificado sin pagar: ' + fmt(aPagar), s: 'En ' + nObras + (nObras === 1 ? ' obra' : ' obras') + '. Sale del avance de cada certificado contra lo pagado.', href: '#/obras', b: 'Ver obras' });
    }
    if (puede('config')) {
      const mesAnt = M.mesAnterior(hoy());
      if (!M.indice(mesAnt)) a.push({ n: 'bad', i: 'chart-line-up', t: 'Falta el índice CAC de ' + M.mesTxt(mesAnt), s: 'Sin el índice no se pueden emitir certificados con ajuste.', href: '#/config/cac', b: 'Cargar' });
      else if (!M.indice(hoy().slice(0, 7))) a.push({ n: '', i: 'chart-line-up', t: 'Índice CAC de ' + M.mesTxt(hoy().slice(0, 7)) + ' todavía sin cargar', s: 'Se usa para los certificados del mes que viene. Cargalo cuando se publique.', href: '#/config/cac', b: 'Cargar' });
    }
    DB.presupuestos.filter((p) => p.estado === 'borrador').forEach((p) => { const o = M.obra(p.obra); a.push({ n: '', i: 'list-checks', t: 'Presupuesto de ' + o.nombre + ' en borrador', s: 'Versión ' + p.version + ' · ' + p.items.length + ' ítems' + (puede('aprobar') ? '. Revisalo y aprobalo para arrancar la obra.' : '. Lo aprueba un socio.'), href: '#/obra/' + o.id + '/presupuesto', b: 'Abrir' }); });
    DB.tareas.filter((t) => t.resp === UI.usuario && t.col !== 'hecha' && t.vence && M.dias(t.vence) < 0).forEach((t) => a.push({ n: 'bad', i: 'clock', t: 'Tarea vencida: ' + t.titulo, s: (t.obra ? M.obra(t.obra).nombre + ' · ' : '') + 'venció el ' + fFecha(t.vence), href: '#/tareas', b: 'Ver' }));
    if (puede('plata')) {
      const cuit = DB.clientes.filter((c) => !c.archivado && !c.cf && !M.cuitValido(c.cuit)).length + DB.proveedores.filter((p) => !p.archivado && !p.interno && !M.cuitValido(p.cuit)).length;
      if (cuit) a.push({ n: '', i: 'identification-card', t: cuit + ' contactos con CUIT a completar', s: 'No se pueden facturar ni pagar con retenciones hasta completarlo.', href: '#/proveedores', b: 'Completar' });
    }
    const orden = { bad: 0, warn: 1, '': 2 };
    return a.sort((x, y) => orden[x.n] - orden[y.n]);
  }

  /* ================= INICIO ================= */
  function vInicio() {
    migas([['Inicio', '#/inicio']]);
    const u = yo(); const h = new Date().getHours(); const saludo = h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const verSin = puede('sin');
    const curso = DB.obras.filter((o) => o.estado === 'curso');
    let kpis = '';
    if (puede('plata')) {
      const porCobrar = M.cero(), aPagar = M.cero(); DB.obras.forEach((o) => { const r = M.resumen(o.id, verSin); porCobrar.ARS += r.porCobrar.ARS; porCobrar.USD += r.porCobrar.USD; aPagar.ARS += r.aPagar.ARS; aPagar.USD += r.aPagar.USD; });
      const cartera = DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'cartera').sort((a, b) => a.pago.localeCompare(b.pago));
      const prox = cartera[0];
      kpis = '<div class="kpis" data-stagger>' +
        kpi('buildings', 'Obras en curso', String(curso.length), DB.obras.filter((o) => o.estado === 'presupuesto').length + ' presupuestando') +
        kpi('hand-coins', 'Por cobrar', fmtM(porCobrar.ARS), porCobrar.USD ? 'y ' + fmt(porCobrar.USD, 'USD') : 'de certificados y anticipos', false, true) +
        kpi('toolbox', 'A pagar', fmtM(aPagar.ARS), aPagar.USD ? 'a proveedores, y ' + fmt(aPagar.USD, 'USD') : 'a proveedores, por avance') +
        kpi('money', 'Cheques', fmtM(cartera.reduce((s, c) => s + c.importe, 0)), prox ? cartera.length + ' cheques · el próximo en ' + M.dias(prox.pago) + ' días' : 'sin cheques') + '</div>';
    } else {
      const mias = DB.tareas.filter((t) => t.resp === UI.usuario && t.col !== 'hecha');
      kpis = '<div class="kpis" data-stagger>' + kpi('buildings', 'Obras en curso', String(curso.length), 'a cargo del estudio') + kpi('list-checks', 'Mis tareas abiertas', String(mias.length), 'en todas las obras') + kpi('clock', 'Vencidas', String(mias.filter((t) => t.vence && M.dias(t.vence) < 0).length), 'para ponerse al día', mias.some((t) => t.vence && M.dias(t.vence) < 0)) + kpi('file-text', 'Certificados para revisar', String(DB.certificados.filter((c) => c.estado === 'borrador').length), 'cargados y sin emitir') + '</div>';
    }
    const al = alertas();
    const alHtml = al.length ? '<ul class="alertas">' + al.slice(0, 8).map((x) => '<li><span class="ic ' + x.n + '">' + ic(x.i) + '</span><div><div class="t">' + esc(x.t) + '</div><div class="s">' + esc(x.s) + '</div></div><a class="btn sm" href="' + x.href + '">' + esc(x.b) + '</a></li>').join('') + '</ul>' : vacio('check-circle', 'Nada pendiente para hoy.');
    const mias = DB.tareas.filter((t) => t.resp === UI.usuario && t.col !== 'hecha').sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9')).slice(0, 5);
    const tareasHtml = mias.length ? '<ul class="alertas">' + mias.map((t) => { const d = t.vence ? M.dias(t.vence) : null; return '<li><span class="ic ' + (d != null && d < 0 ? 'bad' : '') + '">' + ic('check-square') + '</span><div><div class="t">' + esc(t.titulo) + '</div><div class="s">' + esc(t.obra ? M.obra(t.obra).nombre : 'General') + (t.vence ? ' · ' + (d < 0 ? 'venció hace ' + (-d) + ' días' : d === 0 ? 'vence hoy' : 'vence en ' + d + ' días') : '') + '</div></div></li>'; }).join('') + '</ul>' : vacio('check-circle', 'No tenés tareas abiertas.');
    const act = actividadVisible(DB.auditoria).slice(0, 4).map((x) => '<li><span class="av">' + esc(iniciales(M.usuario(x.por))) + '</span><div>' + esc(x.txt) + (x.obra && M.obra(x.obra) ? '<div class="tenue">' + esc(M.obra(x.obra).nombre) + '</div>' : '') + '</div><span class="cuando">' + fRel(x.ts) + '</span></li>').join('');
    const hoyTxt = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return '<div class="encabezado"><div><h1>' + saludo + ', ' + esc(u.nombre) + '</h1><p>' + esc(hoyTxt.charAt(0).toUpperCase() + hoyTxt.slice(1)) + ' · ' + al.length + ' avisos para hoy</p></div><div class="acciones"><a class="btn" href="#/tareas">' + ic('kanban') + 'Tareas</a>' + (puede('editarPres') ? '<button class="btn primary" data-accion="nueva-obra">' + ic('plus') + 'Nueva obra</button>' : '') + '</div></div>' + kpis +
      '<div class="grilla-2 parejo"><div class="card"><div class="card-h"><h2>Para hoy</h2><span class="sub">' + al.length + ' avisos</span></div><div class="card-b">' + alHtml + '</div></div><div class="pila">' + (puede('plata') ? cardFlujo() : '') + '<div class="card"><div class="card-h"><h2>Mis tareas</h2><div class="der"><a class="btn sm ghost" href="#/tareas">Ver todas</a></div></div><div class="card-b">' + tareasHtml + '</div></div></div></div>' +
      '<div class="grilla-2 parejo"><div class="card"><div class="card-h"><h2>Obras en curso</h2><span class="sub">' + curso.length + ' obras</span><div class="der"><a class="btn sm ghost" href="#/obras">Ver todas' + ic('arrow-right') + '</a></div></div><div class="obras-lista" data-stagger>' + (curso.length ? curso.map(obraFila).join('') : vacio('buildings', 'No hay obras en curso.')) + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Actividad reciente</h2><span class="sub">Cada carga queda firmada</span></div><div class="card-b"><ul class="actividad">' + act + '</ul></div></div></div>';
  }
  function cardFlujo() {
    const meses = M.flujoMensual(6, puede('sin'));
    const tc = meses.reduce((s, m) => s + m.cobros, 0), te = meses.reduce((s, m) => s + m.egresos, 0);
    const cuerpo = UI.grafTabla
      ? '<div class="tabla-wrap"><table><thead><tr><th>Mes</th><th class="num">Cobrado</th><th class="num">Egresos</th></tr></thead><tbody>' + meses.map((m) => '<tr><td>' + esc(M.mesTxt(m.mes)) + '</td><td class="num">' + fmt(m.cobros) + '</td><td class="num">' + fmt(m.egresos) + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="grafico" id="grafico-flujo">' + graficoFlujo(meses) + '<div class="graf-tip" hidden></div></div>';
    return '<div class="card"><div class="card-h"><h2>Cobros y egresos</h2><span class="sub">Últimos 6 meses, en pesos</span><div class="der"><button class="btn sm ghost" data-accion="graf-tabla">' + (UI.grafTabla ? 'Ver gráfico' : 'Ver tabla') + '</button></div></div><div class="card-b"><div class="leyenda"><span><i class="sw sw-cob"></i>Cobrado <b>' + esc(fmtM(tc)) + '</b></span><span><i class="sw sw-egr"></i>Egresos <b>' + esc(fmtM(te)) + '</b></span></div>' + cuerpo + '</div></div>';
  }
  function graficoFlujo(meses) {
    const W = 520, H = 190, pl = 48, pr = 6, pt = 10, pb = 26; const ih = H - pt - pb, iw = W - pl - pr;
    const max = Math.max(1, ...meses.map((m) => Math.max(m.cobros, m.egresos)));
    const paso = Math.pow(10, Math.floor(Math.log10(max))); const tope = Math.ceil(max / paso) * paso;
    const y = (v) => pt + ih - (v / tope) * ih; const base = pt + ih;
    const gw = iw / meses.length; const bw = Math.min(16, gw / 3.2);
    const barra = (x, v, cls) => { if (v <= 0) return ''; const yy = y(v); const r = Math.min(4, base - yy); return '<path class="' + cls + '" d="M' + x.toFixed(1) + ' ' + base + 'V' + (yy + r).toFixed(1) + 'Q' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ' + (x + r).toFixed(1) + ' ' + yy.toFixed(1) + 'H' + (x + bw - r).toFixed(1) + 'Q' + (x + bw).toFixed(1) + ' ' + yy.toFixed(1) + ' ' + (x + bw).toFixed(1) + ' ' + (yy + r).toFixed(1) + 'V' + base + 'Z"/>'; };
    const grid = [0, 0.5, 1].map((k) => { const v = tope * k, yy = y(v); return '<line class="g-linea" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '"/><text class="g-eje" x="' + (pl - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + esc(fmtM(v)) + '</text>'; }).join('');
    const cols = meses.map((m, i) => {
      const cx = pl + gw * i + gw / 2; const x1 = cx - bw - 1, x2 = cx + 1;
      const tip = '<b>' + esc(M.mesTxt(m.mes)) + '</b><span><i class="sw sw-cob"></i>Cobrado ' + esc(fmt(m.cobros)) + '</span><span><i class="sw sw-egr"></i>Egresos ' + esc(fmt(m.egresos)) + '</span>';
      return '<g class="col-mes" data-tip="' + esc(tip) + '"><rect class="g-hit" x="' + (pl + gw * i) + '" y="' + pt + '" width="' + gw + '" height="' + ih + '"/>' + barra(x1, m.cobros, 'g-cob') + barra(x2, m.egresos, 'g-egr') + '<text class="g-eje" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(M.mesTxt(m.mes).slice(0, 3)) + '</text></g>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Cobros y egresos por mes">' + grid + '<g data-stagger>' + cols + '</g></svg>';
  }
  function montarGrafico() {
    const cont = $('#grafico-flujo'); const tip = $('.graf-tip', cont);
    cont.addEventListener('pointermove', (e) => {
      const z = e.target.closest('[data-tip]');
      $$('.col-mes', cont).forEach((c) => c.classList.toggle('activa', c === z));
      if (!z) { tip.hidden = true; return; }
      setHTML(tip, z.dataset.tip); tip.hidden = false;
      const r = cont.getBoundingClientRect(); tip.style.setProperty('--x', (e.clientX - r.left) + 'px'); tip.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
    cont.addEventListener('pointerleave', () => { tip.hidden = true; $$('.col-mes', cont).forEach((c) => c.classList.remove('activa')); });
  }
  const kpi = (icono, l, v, s, alerta, destacado) => '<div class="kpi' + (alerta ? ' alerta' : '') + (destacado ? ' destacado' : '') + '"><div class="k-l">' + ic(icono) + esc(l) + '</div><div class="k-v">' + esc(v) + '</div><div class="k-s">' + esc(s) + '</div></div>';

  /* ================= OBRAS ================= */
  function obraCard(o) {
    const r = M.resumen(o.id, puede('sin')); const cli = M.cliente(o.cliente) || {};
    const pie = puede('plata') && (r.porCobrar.ARS > 0.5 || r.porCobrar.USD > 0.5) ? '<span class="oc-dato">Por cobrar <b>' + esc(doble(r.porCobrar, fmtM)) + '</b></span>' : '<span class="oc-dato">' + ic('hard-hat') + esc((M.usuario(o.resp) || {}).nombre || '') + '</span>';
    return '<a class="obra-card" href="#/obra/' + o.id + '"><div class="oc-foto' + (o.foto ? '' : ' sin-foto') + '">' + (o.foto ? '<img data-foto src="' + esc(o.foto) + '" alt="" loading="lazy">' : '') + ic('buildings', 'oc-ph') + '</div><div class="oc-b"><div class="oc-t"><b>' + esc(o.nombre) + '</b><span class="nro">' + o.num + '</span></div><div class="oc-c">' + esc(cli.razon) + '</div>' +
      (r.aprobado ? barra(r.avance) : '<div class="oc-sin">' + esc(o.estado === 'archivada' ? (o.motivo || 'Archivada') : 'Presupuesto en preparación') + '</div>') +
      '<div class="oc-pie">' + estadoObra(o) + pie + '</div></div></a>';
  }
  /* obra como renglón (Inicio): foto chica, nombre, avance y lo que falta cobrar */
  function obraFila(o) {
    const r = M.resumen(o.id, puede('sin')); const cli = M.cliente(o.cliente) || {};
    return '<a class="obra-fila" href="#/obra/' + o.id + '"><span class="of-foto' + (o.foto ? '' : ' sin-foto') + '">' + (o.foto ? '<img data-foto src="' + esc(o.foto) + '" alt="">' : '') + ic('buildings', 'oc-ph') + '</span><span class="of-t"><b>' + esc(o.nombre) + '</b><span>' + esc(cli.razon) + '</span></span><span class="of-av">' + barra(r.avance) + '</span>' + (puede('plata') ? '<span class="of-m"><span>Por cobrar</span><b>' + esc(doble(r.porCobrar, fmtM)) + '</b></span>' : '') + ic('caret-right', 'of-flecha') + '</a>';
  }
  function vObras() {
    migas([['Obras', '#/obras']]);
    const f = UI.obras; const verSin = puede('sin'); const vista = f.vista || 'tarjetas';
    const cuenta = (e) => DB.obras.filter((o) => e === 'todas' ? o.estado !== 'archivada' : o.estado === e).length;
    const lista = DB.obras.filter((o) => (f.estado === 'todas' ? o.estado !== 'archivada' : o.estado === f.estado) && coincide(o.nombre + ' ' + o.num + ' ' + (M.cliente(o.cliente) || {}).razon + ' ' + o.dir, f.q)).sort((a, b) => b.num - a.num);
    const seg = [['curso', 'En curso'], ['presupuesto', 'Presupuestando'], ['terminada', 'Terminadas'], ['todas', 'Todas'], ['archivada', 'Archivadas']].map(([k, t]) => '<button type="button" data-accion="f-obras" data-v="' + k + '" aria-pressed="' + (f.estado === k) + '">' + t + '<span class="cuenta">' + cuenta(k) + '</span></button>').join('');
    const verBtn = '<div class="segmentado"><button type="button" data-accion="vista-obras" data-v="tarjetas" aria-pressed="' + (vista === 'tarjetas') + '" aria-label="Ver en tarjetas">' + ic('squares-four') + '</button><button type="button" data-accion="vista-obras" data-v="lista" aria-pressed="' + (vista === 'lista') + '" aria-label="Ver en lista">' + ic('list') + '</button></div>';
    let cuerpo;
    if (!lista.length) cuerpo = '<div class="card">' + vacio('buildings', 'No hay obras con ese filtro.') + '</div>';
    else if (vista === 'tarjetas') cuerpo = '<div class="obras-grid" data-stagger>' + lista.map(obraCard).join('') + '</div>';
    else cuerpo = '<div class="tabla-wrap"><table><thead><tr><th>Obra</th><th>Estado</th><th>Avance</th><th class="num">Contrato</th>' + (puede('plata') ? '<th class="num">Por cobrar</th>' : '') + '<th>Responsable</th><th>Plazo</th></tr></thead><tbody>' + lista.map((o) => {
      const r = M.resumen(o.id, verSin);
      return '<tr class="clic" data-ir="#/obra/' + o.id + '"><td><span class="nro">' + o.num + '</span><b>' + esc(o.nombre) + '</b><span class="sec">' + esc((M.cliente(o.cliente) || {}).razon) + ' · ' + esc(o.dir) + '</span></td><td>' + estadoObra(o) + '</td><td>' + (r.aprobado ? barra(r.avance) : '<span class="tenue">Sin contrato</span>') + '</td><td class="num">' + doble({ ARS: r.pres.ARS.total, USD: r.pres.USD.total }, fmtM) + '</td>' + (puede('plata') ? '<td class="num">' + doble(r.porCobrar, fmtM) + '</td>' : '') + '<td>' + persona(o.resp) + '</td><td class="tenue">' + (o.inicio ? fFecha(o.inicio) : '') + (o.fin ? ' al ' + fFecha(o.fin) : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return '<div class="encabezado"><div><h1>Obras</h1><p>Cada obra junta su presupuesto, certificados, proveedores, cuenta del cliente, caja chica y tareas.</p></div><div class="acciones">' + (puede('editarPres') ? '<button class="btn primary" data-accion="nueva-obra">' + ic('plus') + 'Nueva obra</button>' : '') + '</div></div>' +
      '<div class="toolbar"><div class="filtros"><div class="segmentado">' + seg + '</div>' + verBtn + '</div><div class="acciones"><label class="buscar">' + ic('magnifying-glass') + '<input class="input" id="f-obras-q" placeholder="Buscar obra, cliente o dirección" value="' + esc(f.q) + '" aria-label="Buscar obras"></label></div></div>' + cuerpo;
  }
  /* ================= OBRA (ficha con pestañas) ================= */
  function vObra(p) {
    const o = M.obra(p[1]); const tab = p[2] || 'resumen';
    if (tab === 'certificado') return vCertEditor(o, p[3]);
    UI.certDraft = null;
    migas([['Obras', '#/obras'], [o.nombre, '#/obra/' + o.id]]);
    const cli = M.cliente(o.cliente); const r = M.resumen(o.id, puede('sin'));
    const tabs = [['resumen', 'Resumen', 'squares-four'], ['presupuesto', 'Presupuesto', 'list-checks'], ['certificados', 'Certificados', 'file-text', M.certsDe(o.id, true).filter((c) => puede('sin') || c.comp !== 'sin').length], ['proveedores', 'Proveedores', 'toolbox', 0, 'plata'], ['cuenta', 'Cuenta del cliente', 'hand-coins', 0, 'plata'], ['caja', 'Caja chica', 'wallet'], ['tareas', 'Tareas', 'kanban', DB.tareas.filter((t) => t.obra === o.id && t.col !== 'hecha').length], ['documentos', 'Documentos', 'files', DB.documentos.filter((d) => d.obra === o.id).length]]
      .filter((t) => !t[4] || puede(t[4]));
    const tabsHtml = '<nav class="tabs" aria-label="Secciones de la obra">' + tabs.map((t) => '<a href="#/obra/' + o.id + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + (t[3] ? '<span class="cuenta">' + t[3] + '</span>' : '') + '</a>').join('') + '</nav>';
    const anillo = r.aprobado ? '<div class="anillo"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="an-fondo" cx="32" cy="32" r="27" pathLength="100"/><circle class="an-valor" cx="32" cy="32" r="27" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 - Math.min(100, r.avance)).toFixed(1) + '"/></svg><span class="an-txt"><b>' + Math.round(r.avance) + '%</b>avance</span></div>' : '';
    const meta = '<a href="#/clientes" data-accion="ver-cliente" data-id="' + cli.id + '">' + ic('user') + esc(cli.razon) + '</a><span>' + ic('map-pin') + esc(o.dir) + '</span>' + (o.inicio ? '<span>' + ic('calendar-blank') + fFecha(o.inicio) + (o.fin ? ' al ' + fFecha(o.fin) : '') + '</span>' : '') + '<span>' + ic('hard-hat') + esc((M.usuario(o.resp) || {}).nombre || 'Sin responsable') + '</span>';
    const cab = '<header class="obra-hero' + (o.foto ? '' : ' sin-foto') + '">' + (o.foto ? '<img class="oh-img" data-foto src="' + esc(o.foto) + '" alt="">' : '') + '<div class="oh-scrim"></div>' +
      '<div class="oh-c"><div class="oh-txt"><div class="oh-top">' + esc(ESTADO_OBRA[o.estado][0]) + ' · Obra ' + o.num + (o.motivo && o.estado === 'archivada' ? ' · ' + esc(o.motivo) : '') + '</div><h1>' + esc(o.nombre) + '</h1><div class="oh-meta">' + meta + '</div></div>' + anillo + '</div>' +
      (puede('editarPres') ? '<button class="btn oh-editar" data-accion="editar-obra" data-id="' + o.id + '" aria-label="Editar obra">' + ic('pencil-simple') + '<span>Editar</span></button>' : '') + '</header>';
    const T = { resumen: tResumen, presupuesto: tPresupuesto, certificados: tCertificados, proveedores: tProveedores, cuenta: tCuenta, caja: tCaja, tareas: tTareasObra, documentos: tDocs }[tab] || tResumen;
    return cab + tabsHtml + T(o);
  }
  function tResumen(o) {
    const verSin = puede('sin'); const r = M.resumen(o.id, verSin); const tot = { ARS: r.pres.ARS.total, USD: r.pres.USD.total };
    const cifra = (l, v, s) => '<div class="cifra"><div class="l">' + esc(l) + '</div><div class="v">' + v + '</div><div class="s">' + esc(s) + '</div></div>';
    let cifras = cifra('Contrato con honorarios', esc(doble(tot)), r.aprobado ? 'Presupuesto aprobado, honorarios ' + o.honorarios + '%' : 'Presupuesto en borrador') +
      cifra('Avance de obra', Math.round(r.avance) + '%', M.certsDe(o.id).length + ' certificados emitidos');
    if (puede('plata')) {
      cifras += cifra('Cobrado (con IVA)', esc(doble(r.cobrado)), 'Por cobrar: ' + doble(r.porCobrar)) +
        cifra('Costo pactado con proveedores', esc(doble(r.pactado)), 'Pagado: ' + doble(r.pagado)) +
        cifra('A pagar por avance', esc(doble(r.aPagar)), 'Lo certificado a cada proveedor menos lo pagado');
      cifras += puede('margen') ? cifra('Margen previsto', pct(r.margen.ARS), 'Sobre el contrato en pesos' + (r.pres.USD.total ? ' · USD ' + pct(r.margen.USD) : '')) : cifra('Caja chica', esc(fmt(r.cajaSaldo)), 'Gastado en obra: ' + fmt(r.caja));
    } else {
      cifras += cifra('Caja chica', esc(fmt(r.cajaSaldo)), 'Gastado en obra: ' + fmt(r.caja));
    }
    const rubros = M.avanceRubros(o.id);
    const rubHtml = rubros.length ? '<div class="tabla-wrap"><table><tbody>' + rubros.map((x) => '<tr><td><span class="nro">' + esc(M.rubro(x.rubro).num) + '</span>' + esc(M.rubro(x.rubro).nombre) + '</td><td class="num">' + barra(x.pct) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="card-b">' + vacio('list-checks', 'El avance aparece cuando el presupuesto está aprobado.') + '</div>';
    const act = actividadVisible(DB.auditoria.filter((x) => x.obra === o.id)).slice(0, 6).map((x) => '<li><span class="av">' + esc(iniciales(M.usuario(x.por))) + '</span><div>' + esc(x.txt) + '</div><span class="cuando">' + fRel(x.ts) + '</span></li>').join('');
    const pasos = [];
    const b = M.borradorDe(o.id);
    if (!M.presAprobado(o.id)) pasos.push(['list-checks', 'Terminar y aprobar el presupuesto', '#/obra/' + o.id + '/presupuesto']);
    else if (b) pasos.push(['file-text', 'Certificado N° ' + b.num + ' para revisar y emitir', '#/obra/' + o.id + '/certificado/' + b.id]);
    else if (o.estado === 'curso') pasos.push(['file-text', 'Cargar el avance del próximo certificado', '#/obra/' + o.id + '/certificado/nuevo']);
    if (puede('plata') && (r.porCobrar.ARS > 0 || r.porCobrar.USD > 0)) pasos.push(['hand-coins', 'Cobrar ' + doble(r.porCobrar), '#/obra/' + o.id + '/cuenta']);
    if (puede('plata') && (r.aPagar.ARS > 0 || r.aPagar.USD > 0)) pasos.push(['toolbox', 'Pagar a proveedores ' + doble(r.aPagar), '#/obra/' + o.id + '/proveedores']);
    const pasosHtml = pasos.length ? '<ul class="alertas">' + pasos.map((x) => '<li><span class="ic">' + ic(x[0]) + '</span><div class="t">' + esc(x[1]) + '</div><a class="btn sm" href="' + x[2] + '">Ir</a></li>').join('') + '</ul>' : vacio('check-circle', 'Obra al día.');
    return '<div class="resumen-grid">' + cifras + '</div><div class="grilla-2"><div class="card"><div class="card-h"><h2>Avance por rubro</h2><span class="sub">Ponderado por el precio de cada ítem</span></div><div class="sp"></div>' + rubHtml + '</div><div class="pila"><div class="card"><div class="card-h"><h2>Próximos pasos</h2></div><div class="card-b">' + pasosHtml + '</div></div><div class="card"><div class="card-h"><h2>Actividad de la obra</h2></div><div class="card-b">' + (act ? '<ul class="actividad">' + act + '</ul>' : vacio('clock', 'Sin actividad todavía.')) + '</div></div></div></div>';
  }

  /* ---------- presupuesto ---------- */
  function tablaPresupuesto(p, editable, conCostos) {
    const o = M.obra(p.obra); const t = M.totPres(p); const verMargen = puede('margen');
    const porRubro = DB.rubros.map((r) => ({ r, items: p.items.filter((i) => i.rubro === r.id) })).filter((x) => x.items.length);
    const cols = 7 + (conCostos ? 2 : 0) + (verMargen ? 1 : 0) + (editable ? 1 : 0);
    let filas = '';
    porRubro.forEach((x) => {
      const sub = x.items.reduce((s, i) => { s[i.mon] = (s[i.mon] || 0) + i.cant * i.venta; return s; }, {});
      filas += '<tr class="rubro"><td colspan="' + (cols - (editable ? 2 : 1)) + '"><span class="nro">' + esc(x.r.num) + '</span>' + esc(x.r.nombre) + '</td><td class="num">' + doble({ ARS: sub.ARS || 0, USD: sub.USD || 0 }) + '</td>' + (editable ? '<td></td>' : '') + '</tr>';
      x.items.forEach((i, k) => {
        const pv = M.prov(i.prov);
        const extra = (i.soloCosto ? ' ' + badge('Solo costo') : '') + (conCostos && i.cotizaciones && i.cotizaciones.length ? ' <button type="button" class="chip-mini" data-accion="ver-cotiz" data-id="' + i.id + '">' + ic('scales') + i.cotizaciones.length + ' cotizaciones</button>' : '') + (i.nota ? '<span class="sec" title="' + esc(i.nota) + '">' + esc(i.nota) + '</span>' : '');
        filas += '<tr><td class="wrap"><span class="nro">' + esc(x.r.num + '.' + (k + 1)) + '</span>' + esc(i.desc) + monTag(i.mon) + extra + '</td><td>' + esc(i.unidad) + '</td><td class="num">' + fmtInput(i.cant) + '</td>' +
          (conCostos ? '<td class="num">' + fmt(i.costo, i.mon) + '</td><td class="num">' + fmt(i.cant * i.costo, i.mon) + '</td>' : '') +
          '<td class="num">' + fmt(i.venta, i.mon) + '</td>' + (verMargen ? '<td class="num">' + pct(M.margenItem(i)) + '</td>' : '') +
          '<td>' + (conCostos ? (pv ? esc(pv.razon) : '<span class="badge b-warn">Sin proveedor</span>') : '') + '</td><td class="num">' + (p.estado === 'aprobado' ? barra(M.acumTotal(p.obra, i.id)) : '') + '</td><td class="num"><b>' + fmt(i.cant * i.venta, i.mon) + '</b></td>' +
          (editable ? '<td><div class="acc-fila"><button class="btn sm icon ghost" data-accion="editar-item" data-id="' + i.id + '" aria-label="Editar ítem">' + ic('pencil-simple') + '</button><button class="btn sm icon ghost" data-accion="quitar-item" data-id="' + i.id + '" aria-label="Quitar ítem">' + ic('trash') + '</button></div></td>' : '') + '</tr>';
      });
    });
    const tot = (k) => {
      if (!t[k].venta) return '';
      return '<div class="desglose">' + (conCostos ? '<span>Costo total</span><span class="r">' + fmt(t[k].costo, k) + '</span>' : '') + '<span>Subtotal de obra</span><span class="r">' + fmt(t[k].venta, k) + '</span><span>Honorarios ' + o.honorarios + '%</span><span class="r">' + fmt(t[k].hon, k) + '</span><span class="sep"></span><span class="total">Total ' + (k === 'USD' ? 'en dólares' : 'en pesos') + '</span><span class="r total">' + fmt(t[k].total, k) + '</span>' + (verMargen ? '<span class="nota">Margen previsto ' + pct(t[k].total ? (t[k].total - t[k].costo) / t[k].total * 100 : 0) + ' (venta + honorarios contra costo)</span>' : '') + '</div>';
    };
    const head = '<tr><th>Ítem</th><th>Unidad</th><th class="num">Cant.</th>' + (conCostos ? '<th class="num">Costo unit.</th><th class="num">Costo total</th>' : '') + '<th class="num">Precio unit.</th>' + (verMargen ? '<th class="num">Margen</th>' : '') + '<th>' + (conCostos ? 'Proveedor' : '') + '</th><th class="num">' + (p.estado === 'aprobado' ? 'Avance' : '') + '</th><th class="num">Total</th>' + (editable ? '<th></th>' : '') + '</tr>';
    return { tabla: p.items.length ? '<div class="tabla-wrap"><table><thead>' + head + '</thead><tbody>' + filas + '</tbody></table></div>' : '<div class="card">' + vacio('list-checks', 'Todavía no hay ítems. Sumalos rubro por rubro.') + '</div>', totales: bloquesTotales([tot('ARS'), tot('USD')], true) };
  }
  function tPresupuesto(o) {
    const versiones = M.presDe(o.id);
    if (!versiones.length) return '<div class="card">' + vacio('list-checks', 'Esta obra todavía no tiene presupuesto.', puede('editarPres') ? '<p><button class="btn primary" data-accion="armar-presupuesto" data-id="' + o.id + '">' + ic('plus') + 'Armar presupuesto</button></p>' : '') + '</div>';
    const sel = UI.presVer && versiones.find((v) => v.id === UI.presVer && v.obra === o.id) ? versiones.find((v) => v.id === UI.presVer) : (M.presBorrador(o.id) || M.presAprobado(o.id) || versiones[versiones.length - 1]);
    const editable = sel.estado === 'borrador' && puede('editarPres');
    const chips = versiones.length > 1 ? '<div class="chips">' + versiones.map((v) => '<button type="button" class="chip" data-accion="ver-version" data-id="' + v.id + '" aria-pressed="' + (v.id === sel.id) + '">Versión ' + v.version + ' · ' + ({ aprobado: 'aprobada', borrador: 'borrador', reemplazado: 'reemplazada', rechazado: 'no aceptada' })[v.estado] + '</button>').join('') + '</div>' : '';
    const t = tablaPresupuesto(sel, editable, puede('costos'));
    let aviso = '';
    if (sel.estado === 'aprobado') aviso = '<div class="bloqueado">' + ic('lock-simple') + '<div><b>Contrato original, versión ' + sel.version + '.</b> Aprobado el ' + fFecha(sel.aprobado.ts.slice(0, 10)) + ' por ' + esc((M.usuario(sel.aprobado.por) || {}).nombre) + '. No se edita: los cambios entran como demasías y economías en cada certificado, o como una versión nueva.</div></div>';
    else if (sel.estado === 'rechazado') aviso = '<div class="bloqueado">' + ic('x-circle') + '<div><b>No aceptado por el cliente.</b> ' + esc(sel.rechazado.motivo || '') + ' · ' + fFecha(sel.rechazado.ts.slice(0, 10)) + '. Queda guardado: si vuelve, se arma una versión nueva desde acá.</div></div>';
    else if (sel.estado === 'reemplazado') aviso = '<div class="bloqueado">' + ic('clock-counter-clockwise') + '<div>Versión reemplazada. Queda guardada como historia.</div></div>';
    else {
      const sinProv = sel.items.filter((i) => !i.prov).length;
      aviso = '<div class="aviso info">' + ic('pencil-simple') + '<div><b>Borrador.</b> Se puede editar hasta que un socio lo apruebe. ' + (sinProv && puede('costos') ? sinProv + ' ítems sin proveedor asignado.' : '') + '</div></div>';
    }
    const acciones = '<div class="toolbar"><div class="filtros">' + chips + '</div><div class="acciones">' +
      '<button class="btn" data-accion="imprimir-pres" data-id="' + sel.id + '" data-importes="0">' + ic('printer') + 'Sin importes</button><button class="btn" data-accion="imprimir-pres" data-id="' + sel.id + '" data-importes="1">' + ic('printer') + 'Para el cliente</button>' + (puede('costos') ? '<button class="btn" data-accion="imprimir-pres" data-id="' + sel.id + '" data-importes="costos">' + ic('printer') + 'Planilla de costos</button>' : '') +
      (editable ? '<button class="btn" data-accion="nuevo-item" data-id="' + sel.id + '">' + ic('plus') + 'Agregar ítem</button>' : '') +
      (sel.estado === 'borrador' && puede('aprobar') && !M.presAprobado(o.id) ? '<button class="btn peligro" data-accion="rechazar-pres" data-id="' + sel.id + '">' + ic('x-circle') + 'No aceptado</button>' : '') +
      (sel.estado === 'rechazado' && puede('aprobar') ? '<button class="btn" data-accion="nueva-version" data-id="' + sel.id + '">' + ic('arrow-counter-clockwise') + 'Retomar con versión nueva</button>' : '') +
      (sel.estado === 'borrador' && puede('aprobar') ? '<button class="btn primary" data-accion="aprobar-pres" data-id="' + sel.id + '">' + ic('seal-check') + 'Aprobar presupuesto</button>' : '') +
      (sel.estado === 'aprobado' && puede('aprobar') && !M.presBorrador(o.id) ? '<button class="btn" data-accion="nueva-version" data-id="' + sel.id + '">' + ic('copy') + 'Nueva versión</button>' : '') +
      '</div></div>';
    return aviso + acciones + t.tabla + '<div class="sp"></div>' + t.totales;
  }

  /* ---------- certificados ---------- */
  function tCertificados(o) {
    const certs = M.certsDe(o.id, true).slice().reverse();
    const b = M.borradorDe(o.id); const ap = M.presAprobado(o.id);
    const nuevo = ap && !b && o.estado !== 'terminada' ? '<a class="btn primary" href="#/obra/' + o.id + '/certificado/nuevo">' + ic('plus') + 'Nuevo certificado</a>' : '';
    const verSin = puede('sin');
    if (!ap) return '<div class="card">' + vacio('file-text', 'Para certificar hace falta el presupuesto aprobado.', '<p><a class="btn" href="#/obra/' + o.id + '/presupuesto">Ir al presupuesto</a></p>') + '</div>';
    const filas = certs.filter((c) => verSin || c.comp !== 'sin').map((c) => {
      if (c.estado === 'borrador') return '<tr class="clic" data-ir="#/obra/' + o.id + '/certificado/' + c.id + '"><td><b>' + certNombre(c) + '</b></td><td>' + fFecha(c.fecha) + '</td><td colspan="' + (puede('plata') ? 5 : 2) + '"><span class="badge b-warn">' + ic('pencil-simple') + 'Borrador cargado por ' + esc((M.usuario(c.creado.por) || {}).nombre) + '</span></td><td><span class="btn sm">' + (puede('emitir') ? 'Revisar y emitir' : 'Seguir cargando') + '</span></td></tr>';
      const k = M.calcCert(c); const cargo = M.cargo(c.id); const e = M.estadoCargo(cargo);
      return '<tr class="clic" data-accion="ver-cert" data-id="' + c.id + '"><td><b>' + certNombre(c) + '</b></td><td>' + fFecha(c.fecha) + '</td><td>' + esc(M.mesTxt(c.mesCAC)) + '</td><td class="num">' + doble({ ARS: k.mon.ARS.basico, USD: k.mon.USD.basico }) + '</td>' +
        (puede('plata') ? '<td class="num">' + fmt(k.mon.ARS.cac) + '</td><td class="num"><b>' + doble({ ARS: k.mon.ARS.total, USD: k.mon.USD.total }) + '</b></td><td>' + esc(compTxt(c.comp)) + '</td>' : '') + '<td>' + (puede('plata') ? badge(e.estado, ESTADO_CARGO[e.estado]) : badge('Emitido', 'b-ok')) + '</td></tr>';
    }).join('');
    return '<div class="toolbar"><div class="filtros"><span class="suave">Cada certificado trae el avance acumulado y arma la liquidación al cliente sola: avance + honorarios + demasías y economías + ajuste CAC, menos anticipo.</span></div><div class="acciones">' + nuevo + '</div></div>' +
      (filas ? '<div class="tabla-wrap"><table><thead><tr><th>Certificado</th><th>Fecha</th><th>Índice CAC</th><th class="num">Avance del mes</th>' + (puede('plata') ? '<th class="num">Ajuste CAC</th><th class="num">A cobrar</th><th>Comprobante</th>' : '') + '<th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<div class="card">' + vacio('file-text', 'Todavía no hay certificados.') + '</div>');
  }

  function docCert(c, conPlata) {
    const o = M.obra(c.obra); const cli = M.cliente(o.cliente); const k = M.calcCert(c);
    const filas = k.lineas.map((l) => '<tr><td>' + esc(M.rubro(l.item.rubro).num) + '. ' + esc(l.item.desc) + monTag(l.item.mon) + '</td><td class="num">' + pct(M.acumAnterior(c.obra, l.item.id, c.num)) + '</td><td class="num">' + pct(l.pct) + '</td><td class="num">' + pct(M.acumAnterior(c.obra, l.item.id, c.num) + l.pct) + '</td>' + (conPlata ? '<td class="num">' + fmt(l.imp, l.item.mon) + '</td>' : '') + '</tr>').join('');
    const ed = (c.ed || []).map((e) => '<tr><td>' + (e.tipo === 'demasia' ? 'Demasía: ' : 'Economía: ') + esc(e.desc) + '</td><td class="num" colspan="3">' + fmtInput(e.cant) + ' × ' + fmt(e.precio, e.mon) + '</td>' + (conPlata ? '<td class="num">' + (e.tipo === 'demasia' ? '' : '-') + fmt(e.cant * e.precio, e.mon) + '</td>' : '') + '</tr>').join('');
    const des = (m) => {
      const x = k.mon[m]; if (!x.basico && !x.dem && !x.eco) return '';
      return '<div class="desglose"><span>Avance del mes</span><span class="r">' + fmt(x.basico, m) + '</span><span>Honorarios ' + k.hon + '%</span><span class="r">' + fmt(x.hon, m) + '</span>' +
        (x.dem ? '<span>Demasías</span><span class="r">' + fmt(x.dem, m) + '</span><span>Honorarios sobre demasías</span><span class="r">' + fmt(x.honED, m) + '</span>' : '') +
        (x.eco ? '<span class="menos">Economías</span><span class="r menos">-' + fmt(x.eco, m) + '</span>' : '') +
        (m === 'ARS' ? '<span>Ajuste CAC ' + esc(M.mesTxt(c.mesCAC)) + '</span><span class="r">' + fmt(x.cac) + '</span><span class="nota">Mano de obra ' + k.split + '% × ' + pct(k.cac.pctMO) + ' + materiales ' + (100 - k.split) + '% × ' + pct(k.cac.pctMat) + ', contra base ' + esc(M.mesTxt(DB.config.baseCAC)) + '</span>' : '<span class="nota">Los ítems en dólares no llevan ajuste CAC.</span>') +
        (x.anticipo ? '<span class="menos">Descuento anticipo ' + pct(k.anticipoPct) + '</span><span class="r menos">-' + fmt(x.anticipo, m) + '</span>' : '') +
        '<span class="sep"></span><span>Subtotal</span><span class="r">' + fmt(x.subtotal, m) + '</span>' + (x.iva ? '<span>IVA ' + DB.config.iva + '%</span><span class="r">' + fmt(x.iva, m) + '</span>' : '') +
        '<span class="total">Total a cobrar' + (m === 'USD' ? ' en dólares' : '') + '</span><span class="r total">' + fmt(x.total, m) + '</span></div>';
    };
    return '<div class="doc imprimible"><div class="doc-cab"><img class="logo" src="' + esc($('.brand .logo').getAttribute('src')) + '" alt="MOMO"><div><h3>' + certNombre(c) + ' · ' + esc(o.nombre) + '</h3><div class="s">' + esc(cli.razon) + (cli.cuit ? ' · CUIT ' + cuitFmt(cli.cuit) : '') + '</div><div class="s">' + esc(o.dir) + '</div></div><div class="der">' + fLarga(c.fecha) + '<br>Obra ' + o.num + (c.estado === 'emitido' ? '<br>' + esc(compTxt(c.comp)) + (c.fe ? ' N° ' + esc(c.fe.pv + '-' + c.fe.nro) + '<br><span class="mono">CAE ' + esc(c.fe.cae) + '</span>' : '') : '') + '</div></div>' +
      '<table><thead><tr><th>Ítem</th><th class="num">Anterior</th><th class="num">Este mes</th><th class="num">Acumulado</th>' + (conPlata ? '<th class="num">Importe</th>' : '') + '</tr></thead><tbody>' + filas + ed + '</tbody></table>' +
      (conPlata ? '<div class="sp"></div>' + bloquesTotales([des('ARS'), des('USD')]) : '') + '</div>';
  }
  function verCert(id) {
    const c = M.cert(id); const o = M.obra(c.obra); const conPlata = puede('plata');
    const cargo = M.cargo(c.id); const e = M.estadoCargo(cargo);
    const cobros = M.cobrosDe(c.id).map((cb) => '<tr class="' + (M.cobroVale(cb) || cb.anulado ? (cb.anulado ? 'anulado' : '') : 'anulado') + '"><td>' + fFecha(cb.fecha) + '</td><td>' + esc(medioTxt(cb)) + '</td><td class="num">' + fmt(cb.importe, cb.mon) + '</td></tr>').join('');
    abrirDrawer('<div class="d-h"><div><h2>' + certNombre(c) + '</h2><div class="sub">' + esc(o.nombre) + ' · ' + (conPlata ? e.estado : 'Emitido') + '</div></div><div class="der no-print"><button class="btn sm" data-accion="imprimir">' + ic('printer') + 'Imprimir</button><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b">' +
      docCert(c, conPlata) +
      (conPlata ? '<div class="d-sec no-print"><h3>Cobros de este certificado</h3>' + (cobros ? '<div class="tabla-wrap"><table><tbody>' + cobros + '</tbody></table></div>' : '<p class="suave m0">Todavía sin cobros.</p>') + '<p class="suave">Saldo: <b>' + doble(e.saldo) + '</b></p>' +
        '<div class="toolbar"><div class="acciones">' + (e.estado !== 'Cobrado' ? '<button class="btn primary" data-accion="nuevo-cobro" data-obra="' + o.id + '" data-cargo="' + c.id + '">' + ic('hand-coins') + 'Registrar cobro</button>' : '') + (puede('aprobar') ? '<button class="btn peligro" data-accion="anular-cert" data-id="' + c.id + '">' + ic('prohibit') + 'Anular certificado</button>' : '') + '</div></div></div>' : '') +
      '<p class="tenue no-print">Emitido el ' + fFecha(c.creado.ts.slice(0, 10)) + ' por ' + esc((M.usuario((c.emitido || c.creado).por) || {}).nombre) + '.</p></div>');
  }

  /* ---------- editor de certificado ---------- */
  function vCertEditor(o, cid) {
    const ap = M.presAprobado(o.id);
    if (!ap) { location.hash = '#/obra/' + o.id + '/certificados'; return ''; }
    if (!UI.certDraft || UI.certDraft.obra !== o.id || (UI.certDraft.id || 'nuevo') !== cid) {
      const existente = cid !== 'nuevo' ? M.cert(cid) : M.borradorDe(o.id);
      if (existente && existente.estado === 'borrador') UI.certDraft = JSON.parse(JSON.stringify(existente));
      else if (existente && existente.estado === 'emitido') { location.hash = '#/obra/' + o.id + '/certificados'; return ''; }
      else { const n = M.certsDe(o.id).reduce((m, c) => Math.max(m, c.num), 0) + 1; UI.certDraft = { id: null, obra: o.id, num: n, fecha: hoy(), mesCAC: M.mesAnterior(hoy()), avances: {}, ed: [], estado: 'borrador' }; }
    }
    const d = UI.certDraft;
    migas([['Obras', '#/obras'], [o.nombre, '#/obra/' + o.id], ['Certificado N° ' + d.num, '']]);
    const verPlata = puede('plata');
    const porRubro = DB.rubros.map((r) => ({ r, items: ap.items.filter((i) => i.rubro === r.id) })).filter((x) => x.items.length && (UI.verCompletos || x.items.some((i) => M.acumAnterior(o.id, i.id, d.num) < 100)));
    let filas = ''; const completos = ap.items.filter((i) => M.acumAnterior(o.id, i.id, d.num) >= 100).length;
    porRubro.forEach((x) => {
      filas += '<tr class="rubro"><td colspan="' + (verPlata ? 6 : 4) + '"><span class="nro">' + esc(x.r.num) + '</span>' + esc(x.r.nombre) + '</td></tr>';
      x.items.forEach((i) => {
        const ant = M.acumAnterior(o.id, i.id, d.num); const v = Number(d.avances[i.id]) || 0; const lleno = ant >= 100;
        if (lleno && !UI.verCompletos) return;
        filas += '<tr data-fila="' + i.id + '"><td class="wrap">' + esc(i.desc) + monTag(i.mon) + '<span class="sec">' + fmtInput(i.cant) + ' ' + esc(i.unidad) + '</span></td>' + (verPlata ? '<td class="num">' + fmt(i.cant * i.venta, i.mon) + '</td>' : '') +
          '<td class="num">' + pct(ant) + '</td><td class="num celda-in"><input class="input pct-in" data-pct="' + i.id + '" inputmode="decimal" value="' + (v ? fmtInput(v) : '') + '" placeholder="' + (lleno ? 'Completo' : '0') + '"' + (lleno ? ' disabled' : '') + ' aria-label="Avance de este mes, ' + esc(i.desc) + '"></td>' +
          '<td class="num" data-acum="' + i.id + '">' + barraAcum(ant, v) + '</td>' + (verPlata ? '<td class="num" data-imp="' + i.id + '">' + (v ? fmt(i.cant * i.venta * v / 100, i.mon) : '<span class="tenue">-</span>') + '</td>' : '') + '</tr>';
      });
    });
    const meses = Array.from(new Set(DB.indicesCAC.map((x) => x.mes).concat([M.mesAnterior(hoy()), hoy().slice(0, 7)]))).sort().reverse();
    const mesesOpt = meses.map((m) => [m, M.mesTxt(m) + (M.indice(m) ? '' : ' (sin índice cargado)')]);
    return '<div class="encabezado"><div><h1>Certificado N° ' + d.num + '</h1><p>' + esc(o.nombre) + ' · cargá el avance de este mes por ítem. El acumulado y la liquidación se calculan solos.</p></div><div class="acciones"><a class="btn" href="#/obra/' + o.id + '/certificados">Volver</a></div></div>' +
      '<div class="cert-layout"><div class="pila">' +
      '<div class="card"><div class="card-h"><h2>Datos</h2></div><div class="card-b"><div class="fila-3"><div class="campo"><label for="ce-fecha">Fecha del certificado</label><input class="input" type="date" id="ce-fecha" value="' + esc(d.fecha) + '"></div><div class="campo"><label for="ce-mes">Índice CAC a aplicar</label><select class="input" id="ce-mes">' + opciones(mesesOpt, d.mesCAC) + '</select><span class="ayuda">Por defecto, el del mes anterior.</span></div><div class="campo"><span class="lbl">Condiciones de la obra</span><span class="suave">Honorarios ' + o.honorarios + '% · CAC ' + o.splitMO + '/' + (100 - o.splitMO) + ' · anticipo ' + (o.anticipo.fecha ? o.anticipo.pct + '%' : 'no') + '</span></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>Avance del mes</h2><span class="sub">No deja pasar del 100% acumulado</span>' + (completos ? '<div class="der"><button class="btn sm ghost" data-accion="ver-completos">' + (UI.verCompletos ? 'Ocultar' : 'Mostrar') + ' ' + completos + ' ítems ya completos</button></div>' : '') + '</div><div class="sp"></div><div class="tabla-wrap"><table><thead><tr><th>Ítem</th>' + (verPlata ? '<th class="num">Total ítem</th>' : '') + '<th class="num">Anterior</th><th class="num">Este mes %</th><th class="num">Acumulado</th>' + (verPlata ? '<th class="num">Importe</th>' : '') + '</tr></thead><tbody>' + filas + '</tbody></table></div></div>' +
      '<div class="card" id="ce-ed">' + edHtml(d) + '</div>' +
      '</div><aside class="cert-panel" id="ce-panel">' + panelCert(d) + '</aside></div><div class="ce-barra" id="ce-barra">' + barraCert(d) + '</div>';
  }
  function barraAcum(ant, v) { const t = ant + v; return '<div class="avance"><div class="barra doble" data-w="' + Math.min(100, t) + '" data-w2="' + Math.min(100, ant) + '"></div><span class="p">' + (t > 100.0001 ? '<b class="tenue">' + Math.round(t) + '%</b>' : Math.round(t) + '%') + '</span></div>'; }
  function edHtml(d) {
    const provs = DB.proveedores.filter((p) => !p.archivado).map((p) => [p.id, p.razon]);
    const filas = d.ed.map((e, k) => '<div class="ed-fila" data-ed="' + k + '"><div class="campo"><label>Tipo</label><select class="input" data-edc="tipo">' + opciones([['demasia', 'Demasía'], ['economia', 'Economía']], e.tipo) + '</select></div><div class="campo ed-desc"><label>Descripción</label><input class="input" data-edc="desc" value="' + esc(e.desc) + '" placeholder="Qué se agregó o qué no se hizo"></div><div class="campo"><label>Cant.</label><input class="input der" data-edc="cant" inputmode="decimal" value="' + fmtInput(e.cant) + '"></div><div class="campo"><label>Mano de obra</label><input class="input der" data-edc="mo" inputmode="decimal" value="' + fmtInput(e.mo) + '"></div><div class="campo"><label>Materiales</label><input class="input der" data-edc="mat" inputmode="decimal" value="' + fmtInput(e.mat) + '"></div>' +
      (puede('costos') ? '<div class="campo"><label>Costo Momo</label><input class="input der" data-edc="costo" inputmode="decimal" value="' + fmtInput(e.costo) + '"></div><div class="campo"><label>Proveedor</label><select class="input" data-edc="prov">' + opciones(provs, e.prov, 'Sin proveedor') + '</select></div>' : '<div></div><div></div>') +
      '<button class="btn icon ghost" data-accion="quitar-ed" data-i="' + k + '" aria-label="Quitar renglón">' + ic('x') + '</button><div class="ed-total" data-edtot="' + k + '">Precio unitario al cliente: <b>' + esc(fmt(e.precio, e.mon)) + '</b> · total ' + esc(fmt(e.precio * e.cant, e.mon)) + '</div></div>').join('');
    return '<div class="card-h"><h2>Demasías y economías del mes</h2><span class="sub">Mano de obra y materiales por separado, como en la planilla. Se cobran completas en este certificado.</span><div class="der"><button class="btn sm" data-accion="agregar-ed">' + ic('plus') + 'Agregar</button></div></div><div class="card-b">' + (filas || '<p class="suave m0">Sin demasías ni economías este mes.</p>') + '</div>';
  }
  function panelCert(d) {
    const o = M.obra(d.obra); const k = M.calcCert(d); const err = M.erroresCert(d);
    let h = '<div class="card"><div class="card-h"><h2>Liquidación al cliente</h2></div><div class="card-b">';
    if (k.cac.falta) h += '<div class="aviso bad">' + ic('warning') + '<div>No hay índice CAC cargado para ' + esc(M.mesTxt(d.mesCAC)) + '. Elegí otro mes o cargalo en Configuración. Sin índice no se emite (la planilla daba -100%).</div></div>';
    if (puede('plata')) {
      ['ARS', 'USD'].forEach((m) => {
        const x = k.mon[m]; if (!x.basico && !x.dem && !x.eco && m === 'USD') return;
        h += '<div class="desglose"><span>Avance del mes</span><span class="r">' + fmt(x.basico, m) + '</span><span>Honorarios ' + k.hon + '%</span><span class="r">' + fmt(x.hon, m) + '</span>' + (x.dem || x.eco ? '<span>Demasías − economías</span><span class="r">' + fmt(x.dem - x.eco, m) + '</span><span>Honorarios s/ demasías</span><span class="r">' + fmt(x.honED, m) + '</span>' : '') + (m === 'ARS' ? '<span>Ajuste CAC</span><span class="r">' + (k.cac.falta ? '<span class="tenue">falta índice</span>' : fmt(x.cac)) + '</span>' : '') + (x.anticipo ? '<span class="menos">Anticipo ' + pct(k.anticipoPct) + '</span><span class="r menos">-' + fmt(x.anticipo, m) + '</span>' : '') + '<span class="sep"></span><span class="total">Neto ' + (m === 'USD' ? 'USD' : 'pesos') + '</span><span class="r total">' + fmt(x.subtotal, m) + '</span><span class="nota">Más IVA si se factura.</span></div>' + (m === 'ARS' && (k.mon.USD.basico || k.mon.USD.dem) ? '<div class="sp"></div>' : '');
      });
    } else h += '<p class="suave m0">Cargás el avance y lo emite Administración o un socio. Los importes no se muestran en tu perfil.</p>';
    h += '</div>';
    if (err.length) h += '<div class="card-b"><div class="aviso warn">' + ic('info') + '<div>Para emitir falta: ' + err.map(esc).join('; ') + '.</div></div></div>';
    h += '<div class="m-f"><button class="btn" data-accion="guardar-cert">' + ic('floppy-disk') + 'Guardar borrador</button>' + (puede('emitir') ? '<button class="btn primary" data-accion="emitir-cert"' + (err.length ? ' disabled' : '') + '>' + ic('seal-check') + 'Emitir</button>' : '') + '</div></div>';
    return h;
  }
  function barraCert(d) {
    const k = M.calcCert(d); const err = M.erroresCert(d);
    return '<div class="cb-txt"><span>' + (puede('plata') ? 'Neto del certificado' : 'Certificado N° ' + d.num) + '</span><b>' + (puede('plata') ? esc(doble({ ARS: k.mon.ARS.subtotal, USD: k.mon.USD.subtotal })) : (err.length ? 'Falta completar' : 'Listo para revisar')) + '</b></div><button class="btn icon" data-accion="guardar-cert" aria-label="Guardar borrador">' + ic('floppy-disk') + '</button>' + (puede('emitir') ? '<button class="btn primary" data-accion="emitir-cert"' + (err.length ? ' disabled' : '') + '>' + ic('seal-check') + 'Emitir</button>' : '');
  }
  function refrescarCert() {
    const d = UI.certDraft; if (!d) return;
    setHTML($('#ce-panel'), panelCert(d));
    const cb = $('#ce-barra'); if (cb) setHTML(cb, barraCert(d));
    const ap = M.presAprobado(d.obra);
    ap.items.forEach((i) => {
      const v = Number(d.avances[i.id]) || 0; const ant = M.acumAnterior(d.obra, i.id, d.num);
      const a = $('[data-acum="' + i.id + '"]'); if (a) setHTML(a, barraAcum(ant, v));
      const im = $('[data-imp="' + i.id + '"]'); if (im) setHTML(im, v ? esc(fmt(i.cant * i.venta * v / 100, i.mon)) : '<span class="tenue">-</span>');
      const inp = $('[data-pct="' + i.id + '"]'); if (inp) inp.classList.toggle('invalido', ant + v > 100.0001 || v < 0);
    });
    despuesDePintar();
  }
  function persistirCert(estado, comp) {
    const d = UI.certDraft; const o = M.obra(d.obra);
    const datos = { obra: d.obra, num: d.num, fecha: d.fecha, mesCAC: d.mesCAC, avances: Object.fromEntries(Object.entries(d.avances).filter(([, v]) => Number(v) > 0)), ed: d.ed.map((e) => Object.assign({}, e)), estado };
    let c = d.id ? M.cert(d.id) : null;
    if (c) Object.assign(c, datos); else { c = Object.assign({ id: nid('ce'), creado: creado() }, datos); DB.certificados.push(c); }
    if (estado === 'emitido') { c.comp = comp; c.emitido = creado(); if (comp !== 'sin') c.fe = nuevoFE(DB, comp, c.fecha); log('Emitió el certificado N° ' + c.num + ' (' + compTxt(comp) + ')', o.id); }
    else log('Guardó el certificado N° ' + c.num + ' en borrador', o.id);
    guardar(); UI.certDraft = null; return c;
  }

  /* ---------- proveedores de la obra ---------- */
  function tProveedores(o) {
    const lista = M.provDeObra(o.id);
    const filas = lista.map((f) => { const p = M.prov(f.prov); return '<tr><td><b>' + esc(p.razon) + '</b>' + (p.interno ? ' <span class="badge">Propio</span>' : '') + '<span class="sec">' + esc(p.rubros.map((r) => M.rubro(r).nombre).join(', ')) + '</span></td><td class="num">' + doble(f.pactado) + '</td><td class="num">' + doble(f.devengado) + '</td><td class="num">' + (p.interno ? '<span class="tenue">Propio</span>' : (() => { const fa = M.facturadoProv(o.id, f.prov); return fa > f.devengado.ARS + 0.5 && fa > 0 ? '<span class="badge b-warn" title="Facturó más de lo certificado">' + fmt(fa) + '</span>' : fa ? fmt(fa) : '<span class="tenue">Sin facturas</span>'; })()) + '</td><td class="num">' + doble(f.pagado) + '</td><td class="num"><b>' + (f.aPagar.ARS > 0.5 || f.aPagar.USD > 0.5 ? doble({ ARS: Math.max(0, f.aPagar.ARS), USD: Math.max(0, f.aPagar.USD) }) : (f.aPagar.ARS < -0.5 || f.aPagar.USD < -0.5 ? '<span class="badge b-info">Adelantado ' + doble({ ARS: -Math.min(0, f.aPagar.ARS), USD: -Math.min(0, f.aPagar.USD) }) + '</span>' : '<span class="tenue">Al día</span>')) + '</b></td><td class="num">' + doble(f.resta) + '</td><td><button class="btn sm" data-accion="nuevo-pago" data-obra="' + o.id + '" data-prov="' + f.prov + '">' + ic('money') + 'Pagar</button></td></tr>'; }).join('');
    const pagos = M.pagosDe(o.id).filter((p) => UI.teso.anulados || !p.anulado).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => filaPago(p, false)).join('');
    return '<div class="aviso info">' + ic('info') + '<div><b>Cómo se lee:</b> lo pactado sale del presupuesto aprobado (costo de cada ítem asignado). Lo certificado es ese costo por el avance acumulado. A pagar = certificado − pagado. Nada se tipea dos veces.</div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Proveedor</th><th class="num">Pactado</th><th class="num">Certificado</th><th class="num">Facturado</th><th class="num">Pagado</th><th class="num">A pagar hoy</th><th class="num">Resta del contrato</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="8">' + vacio('toolbox', 'Asigná proveedores a los ítems del presupuesto.') + '</td></tr>') + '</tbody></table></div>' +
      '<div class="sp"></div><div class="toolbar"><div class="filtros"><b>Pagos de la obra</b></div><div class="acciones"><label class="check"><input type="checkbox" id="f-anulados"' + (UI.teso.anulados ? ' checked' : '') + '>Ver anulados</label><button class="btn primary" data-accion="nuevo-pago" data-obra="' + o.id + '">' + ic('plus') + 'Registrar pago</button></div></div>' +
      (pagos ? '<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Detalle</th><th>Medio</th><th class="num">Importe</th><th>Cargado por</th><th></th></tr></thead><tbody>' + pagos + '</tbody></table></div>' : '<div class="card">' + vacio('money', 'Sin pagos todavía.') + '</div>');
  }
  const medioTxt = (x) => { const ch = x.cheque ? M.cheque(x.cheque) : null; const b = { transferencia: 'Transferencia', efectivo: 'Efectivo', cheque: 'Cheque', echeq: 'E-cheq', 'cheque-propio': 'Cheque propio', 'cheque-tercero': 'Endoso de cheque' }[x.medio] || x.medio; return b + (ch ? ' ' + ch.banco + ' N° ' + ch.numero + (ch.estado === 'rechazado' ? ' (rechazado)' : '') : x.banco ? ' ' + x.banco : ''); };
  function filaPago(p, conObra) {
    return '<tr class="' + (p.anulado ? 'anulado' : '') + '"><td>' + fFecha(p.fecha) + '</td>' + (conObra ? '<td>' + esc(M.obra(p.obra).nombre) + '</td>' : '') + '<td>' + esc(M.prov(p.prov).razon) + '</td><td class="trunc">' + esc(p.detalle || '') + '</td><td>' + esc(medioTxt(p)) + '</td><td class="num"><b>' + fmt(p.importe, p.mon) + '</b></td><td>' + persona(p.creado.por) + '<span class="sec">' + fFecha(p.creado.ts.slice(0, 10)) + '</span></td><td><div class="acc-fila">' + (p.anulado ? '<span class="badge">Anulado</span>' : '<button class="btn sm ghost" data-accion="ver-recibo" data-id="' + p.id + '">' + ic('receipt') + 'Recibo</button><button class="btn sm ghost" data-accion="anular-pago" data-id="' + p.id + '">Anular</button>') + '</div></td></tr>';
  }
  function verRecibo(id) {
    const p = DB.pagos.find((x) => x.id === id); const o = M.obra(p.obra); const pv = M.prov(p.prov);
    const f = M.provDeObra(o.id).find((x) => x.prov === p.prov);
    abrirDrawer('<div class="d-h"><div><h2>Orden de pago</h2><div class="sub">' + esc(pv.razon) + ' · ' + esc(o.nombre) + '</div></div><div class="der no-print"><button class="btn sm" data-accion="imprimir">' + ic('printer') + 'Imprimir</button><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b"><div class="doc imprimible"><div class="doc-cab"><img class="logo" src="' + esc($('.brand .logo').getAttribute('src')) + '" alt="MOMO"><div><h3>Orden de pago N° ' + esc(p.id.replace(/\D/g, '').padStart(5, '0')) + '</h3><div class="s">' + esc(pv.razon) + (pv.cuit ? ' · CUIT ' + cuitFmt(pv.cuit) : '') + '</div><div class="s">' + esc(o.nombre) + ' · ' + esc(o.dir) + '</div></div><div class="der">' + fLarga(p.fecha) + '<br>Obra ' + o.num + '</div></div>' +
      '<dl class="kv"><dt>Concepto</dt><dd>' + esc(p.detalle || 'Pago a cuenta') + '</dd><dt>Medio</dt><dd>' + esc(medioTxt(p)) + '</dd>' + (pv.cbu ? '<dt>CBU</dt><dd class="mono">' + esc(pv.cbu) + '</dd>' : '') + '<dt>Importe</dt><dd><b>' + fmt(p.importe, p.mon) + '</b></dd></dl>' +
      (f ? '<div class="sp"></div><div class="desglose"><span>Pactado en la obra</span><span class="r">' + fmt(f.pactado[p.mon], p.mon) + '</span><span>Certificado a la fecha</span><span class="r">' + fmt(f.devengado[p.mon], p.mon) + '</span><span>Pagado (incluye este pago)</span><span class="r">' + fmt(f.pagado[p.mon], p.mon) + '</span><span class="sep"></span><span class="total">Resta del contrato</span><span class="r total">' + fmt(f.resta[p.mon], p.mon) + '</span></div>' : '') +
      '<div class="firmas"><span>Autorizó</span><span>Recibí conforme</span></div></div>' + (p.anulado ? '<div class="aviso bad">' + ic('prohibit') + '<div>Pago anulado.</div></div>' : '') + '</div>');
  }
  function tCuenta(o) {
    const verSin = puede('sin'); const cc = M.ctaCte(o.id, verSin); const cli = M.cliente(o.cliente);
    const cargos = M.cargos(o.id).filter((c) => verSin || c.comp !== 'sin');
    const resumen = cargos.map((c) => { const e = M.estadoCargo(c); return '<tr class="clic" ' + (c.tipo === 'certificado' ? 'data-accion="ver-cert" data-id="' + c.id + '"' : '') + '><td><b>' + esc(c.nombre) + '</b><span class="sec">' + fFecha(c.fecha) + '</span></td><td>' + (c.comp === 'sin' ? badge('Sin factura', 'b-ink') : esc(compTxt(c.comp))) + '</td><td class="num">' + doble(c.importes) + '</td><td class="num">' + doble(e.cobrado) + '</td><td class="num"><b>' + (e.estado === 'Cobrado' ? '-' : doble({ ARS: Math.max(0, e.saldo.ARS), USD: Math.max(0, e.saldo.USD) })) + '</b></td><td>' + badge(e.estado, ESTADO_CARGO[e.estado]) + '</td></tr>'; }).join('');
    const movs = (mon) => {
      const f = cc.filas.filter((x) => x.mon === mon); if (!f.length) return '';
      return '<div class="sp"></div><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo ' + (mon === 'USD' ? 'USD' : '$') + '</th></tr></thead><tbody>' + f.map((x) => '<tr class="' + (x.cobro && !M.cobroVale(x.cobro) ? 'anulado' : '') + '"><td>' + fFecha(x.fecha) + '</td><td>' + (x.tipo === 'cargo' ? esc(x.cargo.nombre) + ' · ' + esc(compTxt(x.cargo.comp)) : 'Cobro ' + esc(medioTxt(x.cobro)) + ' <span class="tenue">· ' + esc(x.cargo.nombre) + '</span>' + (x.cobro.anulado ? ' ' + badge('Anulado') : '')) + '</td><td class="num">' + (x.debe ? fmt(x.debe, mon) : '') + '</td><td class="num">' + (x.haber || (x.cobro && x.cobro.importe) ? fmt(x.cobro ? x.cobro.importe : x.haber, mon) : '') + '</td><td class="num"><b>' + fmt(x.saldo, mon) + '</b></td></tr>').join('') + '</tbody></table></div>';
    };
    return '<div class="toolbar"><div class="filtros"><span class="suave">' + esc(cli.razon) + ' · saldo de esta obra: <b>' + doble(cc.saldo) + '</b>' + (!verSin ? ' · comprobantes con factura' : '') + '</span></div><div class="acciones"><button class="btn primary" data-accion="nuevo-cobro" data-obra="' + o.id + '">' + ic('hand-coins') + 'Registrar cobro</button></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Comprobante</th><th>Tipo</th><th class="num">Total</th><th class="num">Cobrado</th><th class="num">Saldo</th><th>Estado</th></tr></thead><tbody>' + (resumen || '<tr><td colspan="6">' + vacio('receipt', 'Sin comprobantes todavía.') + '</td></tr>') + '</tbody></table></div>' +
      movs('ARS') + movs('USD');
  }

  /* ---------- caja chica ---------- */
  function tCaja(o) {
    const movs = M.cajaDe(o.id); const saldo = M.cajaSaldo(o.id);
    const filas = movs.map((c) => '<tr class="' + (c.anulado ? 'anulado' : '') + '"><td>' + fFecha(c.fecha) + '</td><td>' + esc(c.desc) + '</td><td>' + (c.tipo === 'gasto' ? 'Gasto' : 'Reposición') + '</td><td>' + persona(c.resp) + '</td><td class="num">' + (c.tipo === 'gasto' ? '-' : '') + fmt(c.importe) + '</td><td>' + (c.anulado ? badge('Anulado') : '<button class="btn sm ghost" data-accion="anular-caja" data-id="' + c.id + '">Anular</button>') + '</td></tr>').join('');
    return '<div class="resumen-grid"><div class="cifra"><div class="l">Saldo de la caja</div><div class="v' + (saldo < 0 ? ' tenue' : '') + '">' + fmt(saldo) + '</div><div class="s">Reposiciones menos gastos</div></div><div class="cifra"><div class="l">Gastado en esta obra</div><div class="v">' + fmt(M.cajaGastado(o.id)) + '</div><div class="s">Suma al costo real de la obra</div></div><div class="cifra"><div class="l">Responsable</div><div class="v">' + esc((M.usuario(o.resp) || {}).nombre || '-') + '</div><div class="s">Quien rinde la caja</div></div></div>' +
      '<div class="toolbar"><div class="filtros"><span class="suave">Gastos chicos de obra: fletes, ferretería, volquetes. Los gastos del estudio van en Tesorería.</span></div><div class="acciones">' + (puede('plata') ? '<button class="btn" data-accion="nueva-caja" data-obra="' + o.id + '" data-tipo="reposicion">' + ic('arrow-circle-up') + 'Reponer</button>' : '') + '<button class="btn primary" data-accion="nueva-caja" data-obra="' + o.id + '" data-tipo="gasto">' + ic('plus') + 'Cargar gasto</button></div></div>' +
      (filas ? '<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Responsable</th><th class="num">Importe</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<div class="card">' + vacio('wallet', 'Sin movimientos de caja chica.') + '</div>');
  }

  /* ---------- tareas y documentos de la obra ---------- */
  function tTareasObra(o) { return '<div class="toolbar"><div class="filtros"><span class="suave">Las mismas tareas aparecen en el tablero general.</span></div><div class="acciones"><button class="btn primary" data-accion="nueva-tarea" data-obra="' + o.id + '">' + ic('plus') + 'Nueva tarea</button></div></div>' + kanban(DB.tareas.filter((t) => t.obra === o.id), false); }
  function tDocs(o) {
    const docs = DB.documentos.filter((d) => d.obra === o.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const icono = { Plano: 'blueprint', Imagen: 'image', Trámite: 'stamp', 'Fotos de obra': 'images', Documento: 'file-text' };
    return '<div class="toolbar"><div class="filtros"><span class="suave">Planos, fotos de avance, trámites y documentación interna de la obra, en un solo lugar.</span></div><div class="acciones"><button class="btn primary" data-accion="subir-doc" data-obra="' + o.id + '">' + ic('upload-simple') + 'Subir archivo</button></div></div>' +
      (docs.length ? '<div class="tabla-wrap"><table><thead><tr><th>Archivo</th><th>Tipo</th><th>Subido por</th><th>Fecha</th></tr></thead><tbody>' + docs.map((d) => '<tr><td>' + ic(icono[d.tipo] || 'file') + ' ' + esc(d.nombre) + '</td><td>' + esc(d.tipo) + '</td><td>' + persona(d.por) + '</td><td>' + fFecha(d.fecha) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="card">' + vacio('files', 'Sin documentos todavía.') + '</div>');
  }

  /* ================= TAREAS ================= */
  const COLS = [['pendiente', 'Pendiente'], ['curso', 'En curso'], ['revision', 'En revisión'], ['hecha', 'Hecha']];
  function kanban(lista) {
    return '<div class="kanban">' + COLS.map(([k, t], ci) => {
      const items = lista.filter((x) => x.col === k).sort((a, b) => (a.vence || '9').localeCompare(b.vence || '9'));
      return '<section class="k-col" data-col="' + k + '"><h3>' + t + '<span class="n">' + items.length + '</span></h3>' + items.map((x) => {
        const d = x.vence ? M.dias(x.vence) : null; const mal = d != null && d < 0 && k !== 'hecha';
        return '<article class="k-card" draggable="true" data-tarea="' + x.id + '"><div class="t">' + esc(x.titulo) + '</div><div class="o">' + esc(x.obra && M.obra(x.obra) ? M.obra(x.obra).nombre : 'General') + '</div><div class="pie"><span class="av" title="' + esc((M.usuario(x.resp) || {}).nombre || '') + '">' + esc(iniciales(M.usuario(x.resp))) + '</span>' + (x.vence ? '<span class="vence' + (mal ? ' mal' : '') + '">' + ic('calendar-blank') + fFecha(x.vence) + '</span>' : '') + '<span class="mover">' + (ci > 0 ? '<button class="btn sm icon ghost" data-accion="mover-tarea" data-id="' + x.id + '" data-dir="-1" aria-label="Mover a la izquierda">' + ic('caret-left') + '</button>' : '') + (ci < 3 ? '<button class="btn sm icon ghost" data-accion="mover-tarea" data-id="' + x.id + '" data-dir="1" aria-label="Mover a la derecha">' + ic('caret-right') + '</button>' : '') + '<button class="btn sm icon ghost" data-accion="editar-tarea" data-id="' + x.id + '" aria-label="Editar tarea">' + ic('pencil-simple') + '</button></span></div></article>';
      }).join('') + '</section>';
    }).join('') + '</div>';
  }
  function vTareas() {
    migas([['Tareas', '#/tareas']]);
    const f = UI.tareas;
    const lista = DB.tareas.filter((t) => (f.vista === 'todas' || t.resp === UI.usuario) && (!f.obra || t.obra === f.obra || (f.obra === 'general' && !t.obra)));
    const obrasOpt = [['', 'Todas las obras'], ['general', 'General (sin obra)']].concat(DB.obras.filter((o) => o.estado !== 'archivada').map((o) => [o.id, o.nombre]));
    return '<div class="encabezado"><div><h1>Tareas</h1><p>Como el Trello, pero cada tarjeta es de una obra y de una persona. Arrastrá para cambiar de columna.</p></div><div class="acciones"><button class="btn primary" data-accion="nueva-tarea">' + ic('plus') + 'Nueva tarea</button></div></div>' +
      '<div class="toolbar"><div class="filtros"><div class="segmentado"><button type="button" data-accion="f-tareas" data-v="todas" aria-pressed="' + (f.vista === 'todas') + '">Todas</button><button type="button" data-accion="f-tareas" data-v="mias" aria-pressed="' + (f.vista === 'mias') + '">Mis tareas</button></div><select class="input" id="f-tareas-obra" aria-label="Filtrar por obra">' + opciones(obrasOpt, f.obra) + '</select></div></div>' + kanban(lista);
  }
  function montarKanban() {
    $$('.k-card').forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.tarea); c.classList.add('arrastrando'); });
      c.addEventListener('dragend', () => c.classList.remove('arrastrando'));
    });
    $$('.k-col').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('sobre'); });
      col.addEventListener('dragleave', () => col.classList.remove('sobre'));
      col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('sobre'); moverTarea(e.dataTransfer.getData('text/plain'), col.dataset.col); });
    });
  }
  function moverTarea(id, col) {
    const t = DB.tareas.find((x) => x.id === id); if (!t || t.col === col) return;
    t.col = col; log('Movió "' + t.titulo + '" a ' + COLS.find((c) => c[0] === col)[1], t.obra); guardar(); render();
  }

  /* ================= CLIENTES ================= */
  function vClientes() {
    migas([['Clientes', '#/clientes']]);
    const f = UI.clientes; const verSin = puede('sin');
    const lista = DB.clientes.filter((c) => (f.tab === 'archivados') === !!c.archivado && coincide(c.razon + ' ' + c.cuit + ' ' + c.contacto, f.q)).sort((a, b) => a.razon.localeCompare(b.razon));
    const filas = lista.map((c) => {
      const obras = DB.obras.filter((o) => o.cliente === c.id); const deuda = M.cero(); obras.forEach((o) => { const s = M.porCobrar(o.id, verSin); deuda.ARS += s.ARS; deuda.USD += s.USD; });
      const cuitOk = c.cf || M.cuitValido(c.cuit);
      return '<tr class="clic" data-accion="ver-cliente" data-id="' + c.id + '"><td><b>' + esc(c.razon) + '</b><span class="sec">' + (c.cuit ? 'CUIT ' + cuitFmt(c.cuit) : 'Sin CUIT') + '</span></td><td>' + esc(c.iva) + '</td><td>' + esc(c.contacto) + '<span class="sec">' + esc(c.tel) + '</span></td><td class="num">' + obras.length + '</td>' + (puede('plata') ? '<td class="num">' + doble(deuda, fmtM) + '</td>' : '') + '<td>' + (cuitOk ? '' : badge('CUIT a completar', 'b-warn', 'warning')) + '</td></tr>';
    }).join('');
    return '<div class="encabezado"><div><h1>Clientes</h1><p>CUIT validado al cargar. Los clientes viejos se archivan: dejan de aparecer pero conservan toda su historia.</p></div><div class="acciones"><button class="btn primary" data-accion="nuevo-cliente">' + ic('plus') + 'Nuevo cliente</button></div></div>' +
      '<div class="toolbar"><div class="filtros"><div class="segmentado"><button type="button" data-accion="f-clientes" data-v="activos" aria-pressed="' + (f.tab === 'activos') + '">Activos</button><button type="button" data-accion="f-clientes" data-v="archivados" aria-pressed="' + (f.tab === 'archivados') + '">Archivados<span class="cuenta">' + DB.clientes.filter((c) => c.archivado).length + '</span></button></div></div><div class="acciones"><label class="buscar">' + ic('magnifying-glass') + '<input class="input" id="f-clientes-q" placeholder="Buscar nombre, CUIT o contacto" value="' + esc(f.q) + '" aria-label="Buscar clientes"></label></div></div>' +
      (lista.length ? '<div class="tabla-wrap"><table><thead><tr><th>Cliente</th><th>Condición</th><th>Contacto</th><th class="num">Obras</th>' + (puede('plata') ? '<th class="num">Saldo</th>' : '') + '<th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<div class="card">' + vacio('users-three', f.tab === 'archivados' ? 'No hay clientes archivados.' : 'Sin resultados.') + '</div>');
  }
  function verCliente(id) {
    const c = M.cliente(id); const usos = M.usosCliente(id); const verSin = puede('sin');
    const cta = M.ctaCliente(id, verSin); const tot = { fac: M.cero(), cob: M.cero(), sal: M.cero() };
    cta.forEach((x) => M.MON.forEach((k) => { tot.fac[k] += x.facturado[k]; tot.cob[k] += x.cobrado[k]; tot.sal[k] += x.saldo[k]; }));
    const tabla = cta.length ? '<div class="tabla-wrap"><table><thead><tr><th>Obra</th>' + (puede('plata') ? '<th class="num">Facturado</th><th class="num">Cobrado</th><th class="num">Saldo</th>' : '<th>Estado</th>') + '</tr></thead><tbody>' + cta.map((x) => '<tr class="clic" data-ir="#/obra/' + x.obra.id + (puede('plata') ? '/cuenta' : '') + '"><td><span class="nro">' + x.obra.num + '</span>' + esc(x.obra.nombre) + '</td>' + (puede('plata') ? '<td class="num">' + doble(x.facturado) + '</td><td class="num">' + doble(x.cobrado) + '</td><td class="num"><b>' + doble(x.saldo) + '</b></td>' : '<td>' + estadoObra(x.obra) + '</td>') + '</tr>').join('') + '</tbody>' + (puede('plata') && cta.length > 1 ? '<tfoot><tr><td>Total del cliente</td><td class="num">' + doble(tot.fac) + '</td><td class="num">' + doble(tot.cob) + '</td><td class="num">' + doble(tot.sal) + '</td></tr></tfoot>' : '') + '</table></div>' : '<p class="suave m0">Sin obras.</p>';
    abrirDrawer('<div class="d-h"><div><h2>' + esc(c.razon) + '</h2><div class="sub">' + esc(c.iva) + (c.archivado ? ' · Archivado' : '') + '</div></div><div class="der"><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b">' +
      '<dl class="kv"><dt>CUIT</dt><dd>' + (c.cuit ? cuitFmt(c.cuit) + (M.cuitValido(c.cuit) ? '' : ' ' + badge('No válido', 'b-bad')) : (c.cf ? 'Consumidor final' : badge('A completar', 'b-warn'))) + '</dd><dt>Contacto</dt><dd>' + esc(c.contacto) + '</dd><dt>Teléfono</dt><dd>' + esc(c.tel || '-') + '</dd><dt>Mail</dt><dd>' + esc(c.mail || '-') + '</dd><dt>Dirección</dt><dd>' + esc(c.dir || '-') + '</dd></dl>' +
      '<div class="d-sec"><h3>' + (puede('plata') ? 'Cuenta corriente por obra' : 'Obras') + '</h3>' + tabla + '</div>' +
      '<div class="toolbar"><div class="acciones"><button class="btn" data-accion="editar-cliente" data-id="' + c.id + '">' + ic('pencil-simple') + 'Editar</button>' + (puede('archivar') ? '<button class="btn" data-accion="archivar-cliente" data-id="' + c.id + '">' + ic('archive') + (c.archivado ? 'Desarchivar' : 'Archivar') + '</button><button class="btn peligro" data-accion="borrar-cliente" data-id="' + c.id + '"' + (usos ? ' disabled title="Tiene obras: se archiva, no se borra"' : '') + '>' + ic('trash') + 'Eliminar</button>' : '') + '</div></div>' +
      (usos ? '<p class="tenue m0">Tiene ' + usos + (usos === 1 ? ' obra' : ' obras') + ': no se puede eliminar, solo archivar. Así nunca se pierde su historia.</p>' : '') + '</div>');
  }
  /* ================= PROVEEDORES ================= */
  function vProveedores() {
    migas([['Proveedores', '#/proveedores']]);
    const f = UI.proveedores;
    const lista = DB.proveedores.filter((p) => (f.tab === 'archivados') === !!p.archivado && (!f.rubro || p.rubros.includes(f.rubro)) && coincide(p.razon + ' ' + p.cuit + ' ' + p.contacto + ' ' + p.rubros.map((r) => M.rubro(r).nombre).join(' '), f.q)).sort((a, b) => a.razon.localeCompare(b.razon));
    const aPagar = (id) => { const s = M.cero(); DB.obras.forEach((o) => { const f2 = M.provDeObra(o.id).find((x) => x.prov === id); if (f2) { s.ARS += Math.max(0, f2.aPagar.ARS); s.USD += Math.max(0, f2.aPagar.USD); } }); return s; };
    const filas = lista.map((p) => {
      const cuitOk = p.interno || M.cuitValido(p.cuit);
      return '<tr class="clic" data-accion="ver-proveedor" data-id="' + p.id + '"><td><b>' + esc(p.razon) + '</b>' + (p.interno ? ' ' + badge('Propio') : '') + '<span class="sec">' + (p.cuit ? 'CUIT ' + cuitFmt(p.cuit) : p.interno ? 'Cuadrilla propia' : 'Sin CUIT') + '</span></td><td class="wrap">' + p.rubros.map((r) => badge(M.rubro(r).nombre)).join(' ') + '</td><td>' + esc(p.contacto) + '<span class="sec">' + esc(p.tel) + '</span></td>' + (puede('plata') ? '<td class="num">' + doble(aPagar(p.id), fmtM) + '</td>' : '') + '<td>' + (cuitOk ? '' : badge('CUIT a completar', 'b-warn', 'warning')) + '</td></tr>';
    }).join('');
    return '<div class="encabezado"><div><h1>Proveedores</h1><p>Cada proveedor con su rubro (no más "Ángel albañil" en el nombre) y CUIT validado.</p></div><div class="acciones"><button class="btn primary" data-accion="nuevo-proveedor">' + ic('plus') + 'Nuevo proveedor</button></div></div>' +
      '<div class="toolbar"><div class="filtros"><div class="segmentado"><button type="button" data-accion="f-prov" data-v="activos" aria-pressed="' + (f.tab === 'activos') + '">Activos</button><button type="button" data-accion="f-prov" data-v="archivados" aria-pressed="' + (f.tab === 'archivados') + '">Archivados<span class="cuenta">' + DB.proveedores.filter((c) => c.archivado).length + '</span></button></div><select class="input" id="f-prov-rubro" aria-label="Filtrar por rubro">' + opciones([['', 'Todos los rubros']].concat(DB.rubros.map((r) => [r.id, r.nombre])), f.rubro) + '</select></div><div class="acciones"><label class="buscar">' + ic('magnifying-glass') + '<input class="input" id="f-prov-q" placeholder="Buscar nombre, CUIT o rubro" value="' + esc(f.q) + '" aria-label="Buscar proveedores"></label></div></div>' +
      (lista.length ? '<div class="tabla-wrap"><table><thead><tr><th>Proveedor</th><th>Rubros</th><th>Contacto</th>' + (puede('plata') ? '<th class="num">A pagar</th>' : '') + '<th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<div class="card">' + vacio('toolbox', 'Sin resultados.') + '</div>');
  }
  function verProveedor(id) {
    const p = M.prov(id); const usos = M.usosProveedor(id);
    const obras = DB.obras.map((o) => ({ o, f: M.provDeObra(o.id).find((x) => x.prov === id) })).filter((x) => x.f);
    abrirDrawer('<div class="d-h"><div><h2>' + esc(p.razon) + '</h2><div class="sub">' + esc(p.rubros.map((r) => M.rubro(r).nombre).join(', ')) + (p.archivado ? ' · Archivado' : '') + '</div></div><div class="der"><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b">' +
      '<dl class="kv"><dt>CUIT</dt><dd>' + (p.interno ? 'Cuadrilla propia' : p.cuit ? cuitFmt(p.cuit) : badge('A completar', 'b-warn')) + '</dd><dt>Contacto</dt><dd>' + esc(p.contacto || '-') + '</dd><dt>Teléfono</dt><dd>' + esc(p.tel || '-') + '</dd><dt>CBU</dt><dd class="mono">' + esc(p.cbu || '-') + '</dd></dl>' +
      (puede('plata') ? '<div class="d-sec"><h3>Por obra</h3>' + (obras.length ? '<div class="tabla-wrap"><table><thead><tr><th>Obra</th><th class="num">Pactado</th><th class="num">Pagado</th><th class="num">A pagar</th></tr></thead><tbody>' + obras.map((x) => '<tr class="clic" data-ir="#/obra/' + x.o.id + '/proveedores"><td>' + esc(x.o.nombre) + '</td><td class="num">' + doble(x.f.pactado) + '</td><td class="num">' + doble(x.f.pagado) + '</td><td class="num">' + doble({ ARS: Math.max(0, x.f.aPagar.ARS), USD: Math.max(0, x.f.aPagar.USD) }) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="suave m0">Sin obras asignadas.</p>') + '</div>' : '') +
      '<div class="toolbar"><div class="acciones"><button class="btn" data-accion="editar-proveedor" data-id="' + p.id + '">' + ic('pencil-simple') + 'Editar</button>' + (puede('archivar') ? '<button class="btn" data-accion="archivar-proveedor" data-id="' + p.id + '">' + ic('archive') + (p.archivado ? 'Desarchivar' : 'Archivar') + '</button><button class="btn peligro" data-accion="borrar-proveedor" data-id="' + p.id + '"' + (usos ? ' disabled' : '') + '>' + ic('trash') + 'Eliminar</button>' : '') + '</div></div>' +
      (usos ? '<p class="tenue m0">Aparece en ' + usos + ' ítems o pagos: se archiva, no se borra.</p>' : '') + '</div>');
  }

  /* ================= TESORERÍA ================= */
  function vTesoreria(p) {
    const tab = p[1] || 'bancos'; migas([['Tesorería', '#/tesoreria'], [{ bancos: 'Bancos y efectivo', cobros: 'Cobros', pagos: 'Pagos', cheques: 'Cheques', gastos: 'Gastos del estudio' }[tab] || 'Bancos y efectivo', '']]);
    const verSin = puede('sin');
    const tabs = '<nav class="tabs">' + [['bancos', 'Bancos y efectivo', 'bank'], ['cobros', 'Cobros', 'hand-coins'], ['pagos', 'Pagos', 'money'], ['cheques', 'Cheques', 'money-wavy'], ['gastos', 'Gastos del estudio', 'storefront']].map((t) => '<a href="#/tesoreria/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + '</a>').join('') + '</nav>';
    let cuerpo = '';
    if (tab === 'bancos') {
      const ctas = M.bancos(); const total = ctas.reduce((s2, c) => s2 + c.saldo, 0);
      const cartera = DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'cartera').reduce((s2, c) => s2 + c.importe, 0);
      cuerpo = '<div class="cuentas-grid" data-stagger>' + ctas.map((c) => '<button type="button" class="cuenta-card" data-accion="ver-cuenta" data-id="' + c.id + '"><span class="cc-t">' + ic(c.tipo === 'caja' ? 'wallet' : 'bank') + esc(c.nombre) + '</span><span class="cc-n">' + esc(c.numero) + '</span><b class="cc-s">' + fmt(c.saldo) + '</b><span class="cc-m">' + (c.aDebitar ? 'Cheques propios por debitar: ' + fmt(c.aDebitar) : c.movs.length + ' movimientos') + '</span></button>').join('') + '<div class="cuenta-card total"><span class="cc-t">' + ic('coins') + 'Disponible total</span><span class="cc-n">Bancos más efectivo</span><b class="cc-s">' + fmt(total) + '</b><span class="cc-m">Más ' + fmt(cartera) + ' en cheques en cartera</span></div></div>' +
        '<p class="tenue">Cada saldo sale de los mismos cobros, pagos, cheques y gastos que se cargan en el resto del sistema. Tocá una cuenta para ver sus movimientos.</p>' +
        (() => { const mv = []; ctas.forEach((c) => c.movs.forEach((x) => mv.push(Object.assign({ cta: c.nombre }, x)))); mv.sort((a, b) => b.fecha.localeCompare(a.fecha)); return '<div class="seccion-h"><h2>Últimos movimientos</h2></div><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Cuenta</th><th class="num">Entra</th><th class="num">Sale</th></tr></thead><tbody>' + mv.slice(0, 12).map((x) => '<tr><td>' + fFecha(x.fecha) + '</td><td>' + esc(x.txt) + '</td><td>' + esc(x.cta) + '</td><td class="num">' + (x.imp > 0 ? '<b>' + fmt(x.imp) + '</b>' : '') + '</td><td class="num">' + (x.imp < 0 ? fmt(-x.imp) : '') + '</td></tr>').join('') + '</tbody></table></div>'; })();
    } else if (tab === 'cobros') {
      const lista = DB.cobros.filter((c) => (UI.teso.anulados || !c.anulado) && (verSin || (M.cargo(c.cargo) || {}).comp !== 'sin')).sort((a, b) => b.fecha.localeCompare(a.fecha));
      cuerpo = '<div class="toolbar"><div class="filtros"><label class="check"><input type="checkbox" id="f-anulados"' + (UI.teso.anulados ? ' checked' : '') + '>Ver anulados</label></div></div><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Obra</th><th>Comprobante</th><th>Medio</th><th class="num">Importe</th><th>Cargado por</th><th></th></tr></thead><tbody>' + lista.map((c) => { const cg = M.cargo(c.cargo); return '<tr class="' + (!M.cobroVale(c) ? 'anulado' : '') + '"><td>' + fFecha(c.fecha) + '</td><td>' + esc(M.obra(c.obra).nombre) + '</td><td>' + esc(cg ? cg.nombre : '') + '</td><td>' + esc(medioTxt(c)) + '</td><td class="num"><b>' + fmt(c.importe, c.mon) + '</b></td><td>' + persona(c.creado.por) + '</td><td>' + (c.anulado ? badge('Anulado') : '<button class="btn sm ghost" data-accion="anular-cobro" data-id="' + c.id + '">Anular</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else if (tab === 'pagos') {
      const lista = DB.pagos.filter((x) => UI.teso.anulados || !x.anulado).sort((a, b) => b.fecha.localeCompare(a.fecha));
      cuerpo = '<div class="toolbar"><div class="filtros"><label class="check"><input type="checkbox" id="f-anulados"' + (UI.teso.anulados ? ' checked' : '') + '>Ver anulados</label></div><div class="acciones"><button class="btn primary" data-accion="nuevo-pago">' + ic('plus') + 'Registrar pago</button></div></div><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Obra</th><th>Proveedor</th><th>Detalle</th><th>Medio</th><th class="num">Importe</th><th>Cargado por</th><th></th></tr></thead><tbody>' + lista.map((x) => filaPago(x, true)).join('') + '</tbody></table></div>';
    } else if (tab === 'cheques') {
      const sec = UI.teso.cheques;
      const grupos = { cartera: (c) => c.tipo === 'tercero' && c.estado === 'cartera', depositados: (c) => c.tipo === 'tercero' && c.estado === 'depositado', endosados: (c) => c.tipo === 'tercero' && c.estado === 'endosado', propios: (c) => c.tipo === 'propio' && c.estado !== 'anulado', rechazados: (c) => c.estado === 'rechazado' };
      const nombres = { cartera: 'En cartera', depositados: 'Depositados', endosados: 'Endosados', propios: 'Propios emitidos', rechazados: 'Rechazados' };
      const seg = Object.keys(grupos).map((k) => { const l = DB.cheques.filter(grupos[k]); return '<button type="button" data-accion="f-cheques" data-v="' + k + '" aria-pressed="' + (sec === k) + '">' + nombres[k] + '<span class="cuenta">' + l.length + '</span></button>'; }).join('');
      const lista = DB.cheques.filter(grupos[sec]).sort((a, b) => a.pago.localeCompare(b.pago));
      const total = lista.reduce((s, c) => s + c.importe, 0);
      cuerpo = '<div class="toolbar"><div class="filtros"><div class="segmentado">' + seg + '</div></div><div class="acciones"><span class="suave">' + lista.length + ' cheques · <b>' + fmt(total) + '</b></span></div></div>' +
        (lista.length ? '<div class="tabla-wrap"><table><thead><tr><th>Cheque</th><th>' + (sec === 'propios' ? 'A la orden de' : 'Librador') + '</th><th>Emitido</th><th>Fecha de pago</th><th class="num">Importe</th><th>Estado</th><th></th></tr></thead><tbody>' + lista.map((c) => {
          const d = M.dias(c.pago); const est = M.estadoCheque(c);
          const venc = (est === 'cartera' || est === 'emitido') ? (d < 0 ? badge('Vencido hace ' + (-d) + ' d', 'b-bad') : d <= 7 ? badge('En ' + d + ' días', 'b-warn') : badge('En ' + d + ' días')) : badge({ depositado: 'Depositado', endosado: 'Endosado', rechazado: 'Rechazado', debitado: 'Debitado' }[est] || est, est === 'rechazado' ? 'b-bad' : 'b-ok');
          const pago = c.tipo === 'propio' ? DB.pagos.find((p) => p.cheque === c.id) : DB.pagos.find((p) => p.cheque === c.id);
          return '<tr><td><b>' + esc(c.banco) + '</b><span class="sec">N° ' + esc(c.numero) + '</span></td><td>' + esc(c.tipo === 'propio' && pago ? M.prov(pago.prov).razon : c.librador) + '</td><td>' + fFecha(c.emision) + '</td><td>' + fFecha(c.pago) + '</td><td class="num"><b>' + fmt(c.importe) + '</b></td><td>' + venc + '</td><td><div class="acc-fila">' + (est === 'cartera' ? '<button class="btn sm" data-accion="depositar-cheque" data-id="' + c.id + '">Depositar</button>' : '') + ((est === 'cartera' || est === 'depositado') ? '<button class="btn sm peligro" data-accion="rechazar-cheque" data-id="' + c.id + '">Rebotó</button>' : '') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card">' + vacio('money-wavy', 'No hay cheques en esta sección.') + '</div>');
    } else {
      const lista = DB.gastos.filter((g) => UI.teso.anulados || !g.anulado).sort((a, b) => b.fecha.localeCompare(a.fecha));
      cuerpo = '<div class="toolbar"><div class="filtros"><span class="suave">Gastos a cargo de Momo, que no son de ninguna obra (alquiler, servicios, movilidad).</span></div><div class="acciones"><button class="btn primary" data-accion="nuevo-gasto">' + ic('plus') + 'Nuevo gasto</button></div></div><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Rubro</th><th>Concepto</th><th>Medio</th><th class="num">Importe</th><th>Cargado por</th></tr></thead><tbody>' + lista.map((g) => '<tr><td>' + fFecha(g.fecha) + '</td><td>' + badge(g.rubro) + '</td><td>' + esc(g.desc) + '</td><td>' + esc({ transferencia: 'Transferencia', efectivo: 'Efectivo', tarjeta: 'Tarjeta' }[g.medio] || g.medio) + '</td><td class="num"><b>' + fmt(g.importe) + '</b></td><td>' + persona(g.creado.por) + '</td></tr>').join('') + '</tbody></table></div>';
    }
    return '<div class="encabezado"><div><h1>Tesorería</h1><p>Todos los cobros y pagos de todas las obras, los cheques y los gastos del estudio.</p></div></div>' + tabs + cuerpo;
  }

  /* ================= FACTURACIÓN (ARCA simulado en la maqueta) ================= */
  function descargarCSV(nombre, cols, filas) {
    const linea = (arr) => arr.map((x) => { const s = typeof x === 'number' ? String(x).replace('.', ',') : String(x == null ? '' : x); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    const csv = '﻿' + [linea(cols)].concat(filas.map(linea)).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nombre + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const ESTADO_COMPRA = { Pagada: 'b-ok', Parcial: 'b-warn', Pendiente: 'b-bad', Anulada: '' };
  function vFacturacion(p) {
    const tab = p[1] || 'ventas';
    const nombres = { ventas: 'Facturas emitidas', compras: 'Facturas de proveedores', iva: 'IVA del mes' };
    migas([['Facturación', '#/facturacion'], [nombres[tab] || nombres.ventas, '']]);
    const pendArca = DB.arcaRecibidos.filter((r) => !M.facturaDuplicada(r.prov, r.tipo, r.numero)).length;
    const tabs = '<nav class="tabs">' + [['ventas', 'Facturas emitidas', 'receipt'], ['compras', 'Facturas de proveedores', 'file-arrow-down', pendArca], ['iva', 'IVA del mes', 'percent']].map((t) => '<a href="#/facturacion/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + (t[3] ? '<span class="cuenta">' + t[3] + '</span>' : '') + '</a>').join('') + '</nav>';
    let cuerpo = '';
    if (tab === 'ventas') {
      const v = M.ventas();
      const tot = v.filter((x) => x.mon === 'ARS').reduce((s, x) => s + x.total, 0);
      cuerpo = '<div class="aviso info">' + ic('seal-check') + '<div><b>Salen solas de los certificados y anticipos.</b> Al emitir un certificado con factura, el sistema pide el CAE a ARCA y numera el comprobante. Si se anula, emite la nota de crédito. En la maqueta, ARCA está simulado.</div></div>' +
        '<div class="toolbar"><div class="filtros"><span class="suave">' + v.length + ' comprobantes · <b>' + fmt(tot) + '</b> en pesos</span></div><div class="acciones"><button class="btn" data-accion="exportar-ventas">' + ic('microsoft-excel-logo') + 'Excel</button></div></div>' +
        (v.length ? '<div class="tabla-wrap"><table><thead><tr><th>Comprobante</th><th>Fecha</th><th>Cliente</th><th>Concepto</th><th class="num">Neto</th><th class="num">IVA</th><th class="num">Total</th><th>CAE</th><th>Cobro</th></tr></thead><tbody>' + v.map((x) => '<tr class="clic"' + (x.cargo && x.cargo.tipo === 'certificado' ? ' data-accion="ver-cert" data-id="' + x.cargo.id + '"' : ' data-ir="#/obra/' + x.obra.id + '/cuenta"') + '><td><b>' + esc(x.tipo) + '</b><span class="sec">' + esc(x.numero || 'sin numerar') + '</span></td><td>' + fFecha(x.fecha) + '</td><td>' + esc(x.cliente.razon) + '<span class="sec">' + (x.cliente.cuit ? 'CUIT ' + cuitFmt(x.cliente.cuit) : esc(x.cliente.iva)) + '</span></td><td>' + esc(x.cargo ? x.cargo.nombre : x.concepto || '') + '<span class="sec">' + esc(x.obra.nombre) + '</span></td><td class="num">' + fmt(x.neto, x.mon) + '</td><td class="num">' + fmt(x.iva, x.mon) + '</td><td class="num"><b>' + fmt(x.total, x.mon) + '</b></td><td><span class="mono">' + esc(x.cae) + '</span><span class="sec">Vence ' + (x.vto ? fFecha(x.vto) : '-') + '</span></td><td>' + badge(x.estado, ESTADO_CARGO[x.estado] || 'b-info') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="card">' + vacio('receipt', 'Todavía no hay facturas emitidas.') + '</div>');
    } else if (tab === 'compras') {
      const l = M.compras().filter((f) => UI.teso.anulados || f.estado !== 'Anulada');
      const pend = l.filter((f) => f.estado !== 'Anulada').reduce((s, f) => s + f.saldo, 0);
      cuerpo = (pendArca ? '<div class="aviso warn">' + ic('cloud-arrow-down') + '<div><b>Hay ' + pendArca + ' facturas de proveedores en ARCA que todavía no están cargadas.</b> El sistema las trae de "Mis Comprobantes" y solo falta decir a qué obra van.</div><button class="btn sm" data-accion="traer-arca">Traer de ARCA</button></div>' : '') +
        '<div class="toolbar"><div class="filtros"><span class="suave">' + l.length + ' facturas · a pagar <b>' + fmt(pend) + '</b></span><label class="check"><input type="checkbox" id="f-anulados"' + (UI.teso.anulados ? ' checked' : '') + '>Ver anuladas</label></div><div class="acciones"><button class="btn" data-accion="exportar-compras">' + ic('microsoft-excel-logo') + 'Excel</button><button class="btn" data-accion="traer-arca">' + ic('cloud-arrow-down') + 'Traer de ARCA</button><button class="btn primary" data-accion="nueva-compra">' + ic('plus') + 'Cargar factura</button></div></div>' +
        (l.length ? '<div class="tabla-wrap"><table><thead><tr><th>Proveedor</th><th>Comprobante</th><th>Fecha</th><th>Imputada a</th><th class="num">Neto</th><th class="num">IVA</th><th class="num">Total</th><th class="num">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>' + l.map((f) => { const pv = M.prov(f.prov) || {}; return '<tr class="' + (f.anulada ? 'anulado' : '') + '"><td><b>' + esc(pv.razon) + '</b><span class="sec">' + (pv.cuit ? 'CUIT ' + cuitFmt(pv.cuit) : 'Sin CUIT') + '</span></td><td>Factura ' + esc(f.tipo) + '<span class="sec">' + esc(f.numero) + (f.origen === 'arca' ? ' · desde ARCA' : '') + '</span></td><td>' + fFecha(f.fecha) + '</td><td>' + (f.obra ? esc(M.obra(f.obra).nombre) : '<span class="tenue">Gasto del estudio</span>') + '<span class="sec">' + esc(f.desc || '') + '</span></td><td class="num">' + fmt(f.neto) + '</td><td class="num">' + fmt(f.iva + (f.perc || 0)) + '</td><td class="num"><b>' + fmt(f.total) + '</b></td><td class="num">' + (f.estado === 'Anulada' ? '-' : fmt(f.saldo)) + '</td><td>' + badge(f.estado, ESTADO_COMPRA[f.estado]) + '</td><td><div class="acc-fila">' + (f.anulada ? '' : (f.saldo > 0.5 && f.obra ? '<button class="btn sm" data-accion="nuevo-pago" data-obra="' + f.obra + '" data-prov="' + f.prov + '">Pagar</button>' : '') + '<button class="btn sm ghost" data-accion="anular-compra" data-id="' + f.id + '">Anular</button>') + '</div></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card">' + vacio('file-arrow-down', 'Sin facturas de proveedores.') + '</div>');
    } else {
      const meses = M.ivaMensual();
      cuerpo = '<div class="aviso info">' + ic('percent') + '<div><b>Débito, crédito y saldo de cada mes, sin armar planillas.</b> Sale de las facturas emitidas y de las de proveedores cargadas. En el sistema real se exporta el Libro de IVA Digital para el estudio contable.</div></div>' +
        '<div class="toolbar"><div class="filtros"></div><div class="acciones"><button class="btn" data-accion="exportar-iva">' + ic('microsoft-excel-logo') + 'Excel</button><button class="btn" data-accion="libro-iva">' + ic('file-text') + 'Libro de IVA Digital</button></div></div>' +
        '<div class="tabla-wrap"><table><thead><tr><th>Mes</th><th class="num">Ventas netas</th><th class="num">IVA débito</th><th class="num">Compras netas</th><th class="num">IVA crédito</th><th class="num">Percepciones</th><th class="num">Saldo</th></tr></thead><tbody>' + meses.map((x) => '<tr><td><b>' + esc(M.mesTxt(x.mes)) + '</b></td><td class="num">' + fmt(x.ventasNeto) + '</td><td class="num">' + fmt(x.debito) + '</td><td class="num">' + fmt(x.comprasNeto) + '</td><td class="num">' + fmt(x.credito) + '</td><td class="num">' + fmt(x.perc) + '</td><td class="num"><b>' + fmt(Math.abs(x.saldo)) + '</b> ' + (x.saldo > 0.5 ? badge('A pagar', 'b-warn') : badge('A favor', 'b-ok')) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="tenue">Solo comprobantes con factura y en pesos. Lo facturado en dólares se convierte al tipo de cambio del día del comprobante en el sistema real.</p>';
    }
    return '<div class="encabezado"><div><h1>Facturación</h1><p>Lo que se le factura a los clientes, lo que facturan los proveedores y el IVA de cada mes, conectado con ARCA.</p></div></div>' + tabs + cuerpo;
  }
  function modalCompra() {
    const provs = DB.proveedores.filter((p) => !p.archivado && !p.interno).map((p) => [p.id, p.razon]);
    const obras = [['', 'Gasto del estudio (no es de una obra)']].concat(DB.obras.filter((o) => o.estado === 'curso' || o.estado === 'presupuesto').map((o) => [o.id, o.nombre]));
    abrirModal(cabModal('Cargar factura de proveedor') + '<div class="m-b">' +
      '<div class="fila-2"><div class="campo"><label for="fc-prov">Proveedor</label><select class="input" id="fc-prov">' + opciones(provs, '', 'Elegí') + '</select><span class="ayuda" id="fc-prov-msg"></span></div><div class="campo"><label for="fc-obra">Imputar a</label><select class="input" id="fc-obra">' + opciones(obras, 'o1') + '</select></div></div>' +
      '<div class="fila-3"><div class="campo"><label for="fc-tipo">Tipo</label><select class="input" id="fc-tipo">' + opciones([['A', 'Factura A'], ['B', 'Factura B'], ['C', 'Factura C']], 'A') + '</select></div><div class="campo"><label for="fc-num">Número</label><input class="input" id="fc-num" placeholder="0001-00001234" inputmode="numeric"></div><div class="campo"><label for="fc-fecha">Fecha</label><input class="input" type="date" id="fc-fecha" value="' + hoy() + '"></div></div>' +
      '<div class="campo"><label for="fc-desc">Detalle</label><input class="input" id="fc-desc" placeholder="Qué se compró o qué trabajo factura"></div>' +
      '<div class="fila-4"><div class="campo"><label for="fc-neto">Neto</label><input class="input der monto" id="fc-neto" inputmode="decimal"></div><div class="campo"><label for="fc-alic">IVA</label><select class="input" id="fc-alic">' + opciones([['21', '21%'], ['10.5', '10,5%'], ['27', '27%'], ['0', 'Exento']], '21') + '</select></div><div class="campo"><label for="fc-perc">Percepciones</label><input class="input der monto" id="fc-perc" inputmode="decimal" value="0"></div><div class="campo"><span class="lbl">Total</span><div class="total-modal"><b id="fc-total">-</b></div></div></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="fc-ok">Guardar factura</button></div>', (m) => {
      const calc = () => { const c = val(m, '#fc-tipo') === 'C'; $('#fc-alic', m).disabled = c; if (c) $('#fc-alic', m).value = '0'; const n = num(m, '#fc-neto') || 0, al = Number(val(m, '#fc-alic')), pe = num(m, '#fc-perc') || 0; $('#fc-total', m).textContent = fmt(r2(n + n * al / 100 + pe)); };
      ['#fc-neto', '#fc-perc'].forEach((s) => $(s, m).addEventListener('input', calc)); ['#fc-tipo', '#fc-alic'].forEach((s) => $(s, m).addEventListener('change', calc)); calc();
      $('#fc-prov', m).addEventListener('change', () => { const p = M.prov(val(m, '#fc-prov')); $('#fc-prov-msg', m).className = p && M.cuitValido(p.cuit) ? 'ayuda' : 'error'; $('#fc-prov-msg', m).textContent = !p ? '' : M.cuitValido(p.cuit) ? 'CUIT ' + cuitFmt(p.cuit) : 'Sin CUIT válido: completalo para tomar el crédito de IVA.'; });
      $('#fc-num', m).addEventListener('focusout', () => { const d = val(m, '#fc-num').replace(/\D/g, ''); if (d.length >= 9 && d.length <= 13) $('#fc-num', m).value = d.slice(0, d.length - 8).padStart(4, '0').slice(-5) + '-' + d.slice(-8); });
      $('#fc-ok', m).addEventListener('click', () => {
        const err = []; const prov = val(m, '#fc-prov'), tipo = val(m, '#fc-tipo'), numero = val(m, '#fc-num'), neto = num(m, '#fc-neto'), perc = num(m, '#fc-perc') || 0;
        if (!prov) err.push('proveedor'); if (!/^\d{4,5}-\d{8}$/.test(numero)) err.push('número con el formato 0001-00001234'); if (!(neto > 0)) err.push('neto');
        if (prov && M.facturaDuplicada(prov, tipo, numero)) err.push('esa factura ya está cargada');
        if (!mostrarErrores(m, err)) return;
        const alic = tipo === 'C' ? 0 : Number(val(m, '#fc-alic')); const iva = r2(neto * alic / 100);
        DB.facturasCompra.push({ id: nid('fc'), prov, obra: val(m, '#fc-obra'), tipo, numero, fecha: val(m, '#fc-fecha'), neto, alic, iva, perc, total: r2(neto + iva + perc), desc: val(m, '#fc-desc'), origen: 'manual', creado: creado() });
        log('Cargó la factura ' + tipo + ' ' + numero + ' de ' + M.prov(prov).razon, val(m, '#fc-obra')); guardar(); cerrarModal(); render(); toast('Factura cargada. Ya suma al crédito de IVA del mes.');
      });
    }, true);
  }
  function modalArca() {
    const obras = [['', 'Gasto del estudio']].concat(DB.obras.filter((o) => o.estado === 'curso' || o.estado === 'presupuesto').map((o) => [o.id, o.nombre]));
    const filas = DB.arcaRecibidos.map((r) => { const dup = M.facturaDuplicada(r.prov, r.tipo, r.numero); const pv = M.prov(r.prov) || {}; return '<div class="arca-fila' + (dup ? ' ya' : '') + '"><label class="check"><input type="checkbox" data-arca="' + r.id + '"' + (dup ? ' disabled' : ' checked') + '><span><b>' + esc(pv.razon) + '</b><span class="sec">Factura ' + esc(r.tipo) + ' ' + esc(r.numero) + ' · ' + fFecha(r.fecha) + ' · ' + esc(r.desc) + '</span></span></label><b class="num">' + fmt(r.total) + '</b>' + (dup ? '<span class="badge">Ya cargada</span>' : '<select class="input" data-arca-obra="' + r.id + '">' + opciones(obras, r.sugerida) + '</select>') + '</div>'; }).join('');
    abrirModal(cabModal('Facturas recibidas en ARCA') + '<div class="m-b"><p class="suave">Estas facturas figuran en "Mis Comprobantes" a nombre de Momo. Elegí a qué obra va cada una y se cargan con todos sus datos, sin tipear. Las que ya están cargadas no se repiten.</p><div class="arca-lista">' + filas + '</div><p class="tenue">En la maqueta la lista es de ejemplo. En el sistema real se consulta a ARCA todos los días.</p></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ar-ok">' + ic('cloud-arrow-down') + 'Cargar seleccionadas</button></div>', (m) => {
      $('#ar-ok', m).addEventListener('click', () => {
        let n = 0;
        $$('[data-arca]', m).forEach((ch) => {
          if (!ch.checked || ch.disabled) return; const r = DB.arcaRecibidos.find((x) => x.id === ch.dataset.arca); if (M.facturaDuplicada(r.prov, r.tipo, r.numero)) return;
          const sel = $('[data-arca-obra="' + r.id + '"]', m);
          DB.facturasCompra.push({ id: nid('fc'), prov: r.prov, obra: sel ? sel.value : '', tipo: r.tipo, numero: r.numero, fecha: r.fecha, neto: r.neto, alic: r.alic, iva: r.iva, perc: r.perc, total: r.total, desc: r.desc, origen: 'arca', creado: creado() }); n++;
        });
        if (!n) { toast('No elegiste ninguna factura nueva.', 'info'); return; }
        log('Trajo ' + n + ' facturas de proveedores desde ARCA'); guardar(); cerrarModal(); render(); toast(n + (n === 1 ? ' factura cargada' : ' facturas cargadas') + ' desde ARCA.', 'cloud-arrow-down');
      });
    }, true);
  }
  /* número y CAE de un comprobante electrónico (simulado en la maqueta) */
  function nuevoFE(db, letra, fecha) {
    db.contadores.fe = db.contadores.fe || { A: 120, B: 40 };
    const n = ++db.contadores.fe[letra];
    const d = new Date((fecha || hoy()) + 'T12:00:00'); d.setDate(d.getDate() + 10);
    return { pv: '0003', nro: String(n).padStart(8, '0'), cae: '7' + String(4412093 + n * 7919).padStart(13, '0').slice(-13), vto: d.toISOString().slice(0, 10) };
  }
  function padron(cuit) {
    const d = String(cuit || '').replace(/\D/g, ''); if (!M.cuitValido(d)) return null;
    if (DB.padron[d]) return DB.padron[d];
    const c = DB.clientes.find((x) => x.cuit === d) || DB.proveedores.find((x) => x.cuit === d);
    return c ? { razon: c.razon, iva: c.iva || 'Responsable inscripto', dir: c.dir || '' } : null;
  }
  function consultarArca(m, pref) {
    const inp = $('#' + pref + '-cuit', m); const msg = $('#' + pref + '-cuit-msg', m); const b = $('#' + pref + '-arca', m);
    if (!M.cuitValido(inp.value)) { msg.className = 'error'; msg.textContent = 'Primero un CUIT válido.'; return; }
    b.disabled = true; setHTML(b, ic('circle-notch', 'gira') + 'Consultando');
    setTimeout(() => {
      b.disabled = false; setHTML(b, ic('magnifying-glass') + 'ARCA');
      const r = padron(inp.value);
      if (!r) { const ej = Object.keys(DB.padron)[0]; msg.className = 'ayuda'; msg.textContent = 'En la maqueta el padrón tiene pocos CUIT de ejemplo. Probá con ' + cuitFmt(ej) + '.'; return; }
      const razon = $('#' + pref + '-razon', m); if (razon) razon.value = r.razon;
      const iva = $('#' + pref + '-iva', m); if (iva) iva.value = r.iva;
      const dir = $('#' + pref + '-dir', m); if (dir && !dir.value) dir.value = r.dir;
      msg.className = 'ok-txt'; msg.textContent = 'Datos traídos del padrón de ARCA: ' + r.razon + ' · ' + r.iva + '.';
    }, 650);
  }
  function verCuenta(id) {
    const c = M.bancos().find((x) => x.id === id);
    abrirDrawer('<div class="d-h"><div><h2>' + esc(c.nombre) + '</h2><div class="sub">' + esc(c.numero) + '</div></div><div class="der"><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b"><div class="desglose"><span>Saldo inicial</span><span class="r">' + fmt(c.inicial) + '</span><span>Movimientos</span><span class="r">' + c.movs.length + '</span><span class="sep"></span><span class="total">Saldo hoy</span><span class="r total">' + fmt(c.saldo) + '</span>' + (c.aDebitar ? '<span class="nota">Hay ' + fmt(c.aDebitar) + ' en cheques propios por debitar.</span>' : '') + '</div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th class="num">Importe</th><th class="num">Saldo</th></tr></thead><tbody>' + c.movs.slice().reverse().map((x) => '<tr><td>' + fFecha(x.fecha) + '</td><td>' + esc(x.txt) + '</td><td class="num">' + (x.imp > 0 ? '' : '') + fmt(x.imp) + '</td><td class="num"><b>' + fmt(x.saldo) + '</b></td></tr>').join('') + '</tbody></table></div><p class="tenue">En el sistema real se importa el extracto del banco y el sistema marca lo que no coincide.</p></div>');
  }

  /* ================= CONFIGURACIÓN ================= */
  function vConfig(p) {
    const tab = p[1] || 'cac'; migas([['Configuración', '#/config']]);
    const tabs = '<nav class="tabs">' + [['cac', 'Índices CAC', 'chart-line-up'], ['rubros', 'Rubros', 'list-numbers'], ['equipo', 'Equipo y perfiles', 'users'], ['general', 'Valores por defecto', 'sliders-horizontal']].map((t) => '<a href="#/config/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + '</a>').join('') + '</nav>';
    let c = '';
    if (tab === 'cac') {
      const base = M.indiceBase(); const lista = DB.indicesCAC.slice().sort((a, b) => b.mes.localeCompare(a.mes));
      const falta = !M.indice(M.mesAnterior(hoy()));
      c = (falta ? '<div class="aviso bad">' + ic('warning') + '<div>Falta el índice de ' + esc(M.mesTxt(M.mesAnterior(hoy()))) + '.</div></div>' : '') +
        '<div class="toolbar"><div class="filtros"><span class="suave">Se cargan una vez por mes y valen para todas las obras. Base de ajuste: ' + esc(M.mesTxt(base.mes)) + '.</span></div><div class="acciones"><button class="btn primary" data-accion="nuevo-indice">' + ic('plus') + 'Cargar índice del mes</button></div></div>' +
        '<div class="tabla-wrap"><table><thead><tr><th>Mes</th><th class="num">Mano de obra</th><th class="num">Variación MO</th><th class="num">Materiales</th><th class="num">Variación materiales</th></tr></thead><tbody>' + lista.map((x) => '<tr><td><b>' + esc(M.mesTxt(x.mes)) + '</b>' + (x.mes === base.mes ? ' ' + badge('Base') : '') + '</td><td class="num">' + fmtInput(x.mo) + '</td><td class="num">' + pct((x.mo / base.mo - 1) * 100) + '</td><td class="num">' + fmtInput(x.mat) + '</td><td class="num">' + pct((x.mat / base.mat - 1) * 100) + '</td></tr>').join('') + '</tbody></table></div>';
    } else if (tab === 'rubros') {
      c = '<div class="toolbar"><div class="filtros"><span class="suave">La plantilla de rubros de la planilla de obra. Cada presupuesto nuevo arranca con esta lista.</span></div><div class="acciones"><button class="btn primary" data-accion="nuevo-rubro">' + ic('plus') + 'Agregar rubro</button></div></div><div class="tabla-wrap"><table><thead><tr><th>N°</th><th>Rubro</th><th class="num">Ítems en presupuestos</th><th class="num">Proveedores</th></tr></thead><tbody>' + DB.rubros.map((r) => '<tr><td>' + esc(r.num) + '</td><td>' + esc(r.nombre) + '</td><td class="num">' + DB.presupuestos.reduce((s, p) => s + p.items.filter((i) => i.rubro === r.id).length, 0) + '</td><td class="num">' + DB.proveedores.filter((p) => p.rubros.includes(r.id)).length + '</td></tr>').join('') + '</tbody></table></div>';
    } else if (tab === 'equipo') {
      const filas = [['Presupuestos: ver precios', 1, 1, 1], ['Presupuestos: ver costos y proveedores', 1, 1, 0], ['Presupuestos: editar borradores', 1, 1, 0], ['Presupuestos: aprobar (congela el contrato)', 1, 0, 0], ['Certificados: cargar avance', 1, 1, 1], ['Certificados: emitir', 1, 1, 0], ['Márgenes y ganancia', 1, 0, 0], ['Comprobantes sin factura', 1, 0, 0], ['Cobros, pagos y cheques', 1, 1, 0], ['Caja chica de obra', 1, 1, 1], ['Tareas', 1, 1, 1], ['Configuración', 1, 1, 0]];
      const ok = (v) => v ? '<span class="badge b-ok">' + ic('check') + 'Sí</span>' : '<span class="badge">No</span>';
      c = '<div class="grilla-2b"><div class="tabla-wrap"><table><thead><tr><th>Persona</th><th>Perfil</th><th>Mail</th></tr></thead><tbody>' + DB.equipo.map((u) => '<tr><td>' + persona(u.id) + '</td><td>' + badge(PERFIL_TXT[u.perfil]) + '</td><td>' + esc(u.mail) + '</td></tr>').join('') + '</tbody></table></div><div class="aviso info">' + ic('shield-check') + '<div>Un usuario por persona: así cada carga queda firmada y las alertas le llegan a quien corresponde. En el sistema final los permisos se controlan en el servidor, no solo en la pantalla.</div></div></div>' +
        '<div class="tabla-wrap"><table><thead><tr><th>Puede</th><th>Socios</th><th>Administración</th><th>Arquitectos</th></tr></thead><tbody>' + filas.map((f) => '<tr><td>' + esc(f[0]) + '</td><td>' + ok(f[1]) + '</td><td>' + ok(f[2]) + '</td><td>' + ok(f[3]) + '</td></tr>').join('') + '</tbody></table></div>';
    } else {
      const g = DB.config;
      c = '<div class="card"><div class="card-b"><div class="fila-2"><div class="campo"><label for="cf-hon">Honorarios por defecto (%)</label><input class="input" id="cf-hon" value="' + fmtInput(g.honorarios) + '" inputmode="decimal"><span class="ayuda">Cada obra puede tener el suyo.</span></div><div class="campo"><label for="cf-split">Ajuste CAC: parte mano de obra (%)</label><input class="input" id="cf-split" value="' + fmtInput(g.splitMO) + '" inputmode="decimal"><span class="ayuda">El resto se ajusta por materiales.</span></div><div class="campo"><label for="cf-iva">IVA (%)</label><input class="input" id="cf-iva" value="' + fmtInput(g.iva) + '" inputmode="decimal"></div><div class="campo"><label for="cf-tc">Dólar de referencia para los totales</label><input class="input monto" id="cf-tc" value="' + fmtInput(g.tcRef) + '" inputmode="decimal"><span class="ayuda">Solo para ponderar el avance. Los importes en dólares nunca se suman a pesos.</span></div></div></div><div class="m-f"><button class="btn primary" data-accion="guardar-config">Guardar</button></div></div>' +
        '<div class="sp"></div><div class="card"><div class="card-h"><h2>Datos de esta maqueta</h2></div><div class="card-b"><p class="suave m0">Todo lo que cargues queda guardado en este navegador. Para volver a los datos de ejemplo:</p></div><div class="m-f"><button class="btn peligro" data-accion="restablecer">' + ic('arrow-counter-clockwise') + 'Restablecer datos de ejemplo</button></div></div>';
    }
    return '<div class="encabezado"><div><h1>Configuración</h1><p>Listas y valores que usa todo el sistema. Se editan acá, sin tocar código.</p></div></div>' + tabs + c;
  }

  /* ================= FORMULARIOS ================= */
  function modalObra(id) {
    const o = id ? M.obra(id) : null; const g = DB.config;
    const clientes = DB.clientes.filter((c) => !c.archivado || (o && o.cliente === c.id)).map((c) => [c.id, c.razon]);
    abrirModal(cabModal(o ? 'Editar obra' : 'Nueva obra') + '<div class="m-b">' +
      '<div class="campo"><label for="ob-nombre">Nombre de la obra</label><input class="input" id="ob-nombre" value="' + esc(o ? o.nombre : '') + '" placeholder="Ej.: Marca · Local Recoleta"></div>' +
      '<div class="fila-2"><div class="campo"><label for="ob-cli">Cliente</label><select class="input" id="ob-cli">' + opciones(clientes, o ? o.cliente : '', 'Elegí un cliente') + '</select><span class="ayuda"><a href="#" data-accion="nuevo-cliente" data-volver="obra">Cargar cliente nuevo</a></span></div><div class="campo"><label for="ob-dir">Dirección</label><input class="input" id="ob-dir" value="' + esc(o ? o.dir : '') + '"></div></div>' +
      '<div class="fila-3"><div class="campo"><label for="ob-est">Estado</label><select class="input" id="ob-est">' + opciones(Object.entries(ESTADO_OBRA).map(([k, v]) => [k, v[0]]), o ? o.estado : 'presupuesto') + '</select></div><div class="campo"><label for="ob-ini">Inicio</label><input class="input" type="date" id="ob-ini" value="' + esc(o ? o.inicio : '') + '"></div><div class="campo"><label for="ob-fin">Fin estimado</label><input class="input" type="date" id="ob-fin" value="' + esc(o ? o.fin : '') + '"><span class="ayuda">Opcional.</span></div></div>' +
      '<div class="fila-3"><div class="campo"><label for="ob-hon">Honorarios %</label><input class="input" id="ob-hon" inputmode="decimal" value="' + fmtInput(o ? o.honorarios : g.honorarios) + '"></div><div class="campo"><label for="ob-split">CAC: % mano de obra</label><input class="input" id="ob-split" inputmode="decimal" value="' + fmtInput(o ? o.splitMO : g.splitMO) + '"></div><div class="campo"><label for="ob-ant">Anticipo %</label><input class="input" id="ob-ant" inputmode="decimal" value="' + fmtInput(o ? o.anticipo.pct : 30) + '"><span class="ayuda">Se descuenta en cada certificado.</span></div></div>' +
      '<div class="campo"><label for="ob-resp">Responsable</label><select class="input" id="ob-resp">' + opciones(DB.equipo.map((u) => [u.id, u.nombre + ' · ' + PERFIL_TXT[u.perfil]]), o ? o.resp : 'u3') + '</select></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ob-ok">' + (o ? 'Guardar' : 'Crear obra') + '</button></div>', (m) => {
      $('#ob-ok', m).addEventListener('click', () => {
        const err = []; const nombre = val(m, '#ob-nombre'); const hon = parseNum(val(m, '#ob-hon')), split = parseNum(val(m, '#ob-split')), ant = parseNum(val(m, '#ob-ant'));
        if (!nombre) err.push('nombre'); if (!val(m, '#ob-cli')) err.push('cliente'); if (!val(m, '#ob-dir')) err.push('dirección');
        if (DB.obras.some((x) => x.id !== id && sinAcentos(x.nombre) === sinAcentos(nombre))) err.push('ya existe una obra con ese nombre');
        if (!(hon >= 0 && hon <= 100)) err.push('honorarios'); if (!(split >= 0 && split <= 100)) err.push('% mano de obra'); if (!(ant >= 0 && ant <= 100)) err.push('anticipo');
        if (val(m, '#ob-est') === 'curso' && !val(m, '#ob-ini')) err.push('fecha de inicio');
        if (val(m, '#ob-fin') && val(m, '#ob-ini') && val(m, '#ob-fin') < val(m, '#ob-ini')) err.push('el fin es anterior al inicio');
        if (!mostrarErrores(m, err)) return;
        const datos = { nombre, cliente: val(m, '#ob-cli'), dir: val(m, '#ob-dir'), estado: val(m, '#ob-est'), inicio: val(m, '#ob-ini'), fin: val(m, '#ob-fin'), honorarios: hon, splitMO: split, resp: val(m, '#ob-resp') };
        if (o) { Object.assign(o, datos); o.anticipo.pct = ant; log('Editó los datos de la obra', o.id); guardar(); cerrarModal(); render(); toast('Obra guardada.'); return; }
        const nueva = Object.assign({ id: nid('o'), num: ++DB.contadores.obra, anticipo: { pct: ant, fecha: '', comp: '' } }, datos);
        DB.obras.push(nueva); log('Creó la obra ' + nombre, nueva.id); guardar(); cerrarModal(); location.hash = '#/obra/' + nueva.id + '/presupuesto'; toast('Obra creada. Ahora armá el presupuesto.');
      });
    });
  }
  function modalCliente(id, volver) {
    const c = id ? M.cliente(id) : null;
    abrirModal(cabModal(c ? 'Editar cliente' : 'Nuevo cliente') + '<div class="m-b">' +
      '<div class="campo"><label for="cl-razon">Razón social o nombre</label><input class="input" id="cl-razon" value="' + esc(c ? c.razon : '') + '"></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-iva">Condición frente al IVA</label><select class="input" id="cl-iva">' + opciones(['Responsable inscripto', 'Monotributista', 'Exento', 'Consumidor final'].map((x) => [x, x]), c ? c.iva : 'Responsable inscripto') + '</select></div><div class="campo"><label for="cl-cuit">CUIT</label><div class="cuit-fila"><input class="input" id="cl-cuit" inputmode="numeric" value="' + esc(c ? cuitFmt(c.cuit) : '') + '" placeholder="30-12345678-9"><button type="button" class="btn" id="cl-arca">' + ic('magnifying-glass') + 'ARCA</button></div><span class="ayuda" id="cl-cuit-msg">Se valida el dígito verificador.</span></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-contacto">Contacto</label><input class="input" id="cl-contacto" value="' + esc(c ? c.contacto : '') + '"></div><div class="campo"><label for="cl-tel">Teléfono</label><input class="input" id="cl-tel" value="' + esc(c ? c.tel : '') + '"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-mail">Mail</label><input class="input" id="cl-mail" type="email" value="' + esc(c ? c.mail : '') + '"></div><div class="campo"><label for="cl-dir">Dirección</label><input class="input" id="cl-dir" value="' + esc(c ? c.dir : '') + '"></div></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="cl-ok">Guardar</button></div>', (m) => {
      const msg = () => { const v = val(m, '#cl-cuit'); const e = $('#cl-cuit-msg', m); const inp = $('#cl-cuit', m); if (!v) { e.className = 'ayuda'; e.textContent = val(m, '#cl-iva') === 'Consumidor final' ? 'Opcional para consumidor final.' : 'Obligatorio.'; inp.classList.remove('invalido'); return; } const okk = M.cuitValido(v); e.className = okk ? 'ok-txt' : 'error'; e.textContent = okk ? 'CUIT válido.' : 'CUIT inválido: revisá los números (11 dígitos con el verificador).'; inp.classList.toggle('invalido', !okk); };
      $('#cl-cuit', m).addEventListener('input', msg); $('#cl-iva', m).addEventListener('change', msg); msg();
      $('#cl-arca', m).addEventListener('click', () => consultarArca(m, 'cl'));
      $('#cl-ok', m).addEventListener('click', () => {
        const err = []; const cuit = val(m, '#cl-cuit').replace(/\D/g, ''); const cf = val(m, '#cl-iva') === 'Consumidor final';
        if (!val(m, '#cl-razon')) err.push('razón social');
        if (cuit && !M.cuitValido(cuit)) err.push('CUIT válido'); if (!cuit && !cf) err.push('CUIT');
        if (cuit && DB.clientes.some((x) => x.id !== id && x.cuit === cuit)) err.push('ese CUIT ya está cargado en otro cliente');
        if (val(m, '#cl-mail') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val(m, '#cl-mail'))) err.push('mail válido');
        if (!mostrarErrores(m, err)) return;
        const datos = { razon: val(m, '#cl-razon'), cuit, cf, iva: val(m, '#cl-iva'), contacto: val(m, '#cl-contacto'), tel: val(m, '#cl-tel'), mail: val(m, '#cl-mail'), dir: val(m, '#cl-dir') };
        if (c) { Object.assign(c, datos); delete c.aCompletar; log('Editó el cliente ' + c.razon); } else { DB.clientes.push(Object.assign({ id: nid('c'), archivado: false }, datos)); log('Cargó el cliente ' + datos.razon); }
        guardar(); cerrarModal(); toast('Cliente guardado.');
        if (volver === 'obra') modalObra(null); else render();
      });
    });
  }
  function modalProveedor(id) {
    const p = id ? M.prov(id) : null; const sel = new Set(p ? p.rubros : []);
    abrirModal(cabModal(p ? 'Editar proveedor' : 'Nuevo proveedor') + '<div class="m-b">' +
      '<div class="fila-2"><div class="campo"><label for="pv-razon">Razón social o nombre</label><input class="input" id="pv-razon" value="' + esc(p ? p.razon : '') + '"></div><div class="campo"><label for="pv-cuit">CUIT</label><div class="cuit-fila"><input class="input" id="pv-cuit" inputmode="numeric" value="' + esc(p ? cuitFmt(p.cuit) : '') + '"' + (p && p.interno ? ' disabled' : '') + '><button type="button" class="btn" id="pv-arca"' + (p && p.interno ? ' disabled' : '') + '>' + ic('magnifying-glass') + 'ARCA</button></div><span class="ayuda" id="pv-cuit-msg">Obligatorio y validado.</span></div></div>' +
      '<div class="campo"><span class="lbl">Rubros</span><div class="chips" id="pv-rubros">' + DB.rubros.map((r) => '<button type="button" class="chip" data-rubro="' + r.id + '" aria-pressed="' + sel.has(r.id) + '">' + esc(r.nombre) + '</button>').join('') + '</div></div>' +
      '<div class="fila-3"><div class="campo"><label for="pv-contacto">Contacto</label><input class="input" id="pv-contacto" value="' + esc(p ? p.contacto : '') + '"></div><div class="campo"><label for="pv-tel">Teléfono</label><input class="input" id="pv-tel" value="' + esc(p ? p.tel : '') + '"></div><div class="campo"><label for="pv-cbu">CBU</label><input class="input" id="pv-cbu" inputmode="numeric" value="' + esc(p ? p.cbu : '') + '"><span class="ayuda">22 dígitos.</span></div></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="pv-ok">Guardar</button></div>', (m) => {
      $('#pv-rubros', m).addEventListener('click', (e) => { const b = e.target.closest('[data-rubro]'); if (!b) return; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); if (on) sel.add(b.dataset.rubro); else sel.delete(b.dataset.rubro); });
      const msg = () => { const v = val(m, '#pv-cuit'); const e = $('#pv-cuit-msg', m); if (!v) { e.className = 'ayuda'; e.textContent = 'Obligatorio y validado.'; return; } const okk = M.cuitValido(v); e.className = okk ? 'ok-txt' : 'error'; e.textContent = okk ? 'CUIT válido.' : 'CUIT inválido.'; $('#pv-cuit', m).classList.toggle('invalido', !okk); };
      $('#pv-cuit', m).addEventListener('input', msg); msg();
      $('#pv-arca', m).addEventListener('click', () => consultarArca(m, 'pv'));
      $('#pv-ok', m).addEventListener('click', () => {
        const err = []; const cuit = val(m, '#pv-cuit').replace(/\D/g, ''); const interno = p && p.interno; const cbu = val(m, '#pv-cbu').replace(/\D/g, '');
        if (!val(m, '#pv-razon')) err.push('razón social');
        if (!interno && !M.cuitValido(cuit)) err.push('CUIT válido');
        if (cuit && DB.proveedores.some((x) => x.id !== id && x.cuit === cuit)) err.push('ese CUIT ya está cargado');
        if (!sel.size) err.push('al menos un rubro');
        if (cbu && cbu.length !== 22) err.push('CBU de 22 dígitos');
        if (!mostrarErrores(m, err)) return;
        const datos = { razon: val(m, '#pv-razon'), cuit: interno ? '' : cuit, rubros: Array.from(sel), contacto: val(m, '#pv-contacto'), tel: val(m, '#pv-tel'), cbu };
        if (p) { Object.assign(p, datos); delete p.aCompletar; log('Editó el proveedor ' + p.razon); } else { DB.proveedores.push(Object.assign({ id: nid('p'), archivado: false }, datos)); log('Cargó el proveedor ' + datos.razon); }
        guardar(); cerrarModal(); render(); toast('Proveedor guardado.');
      });
    });
  }
  function modalItem(presId, itemId) {
    const p = DB.presupuestos.find((x) => x.id === presId); const i = itemId ? p.items.find((x) => x.id === itemId) : null;
    const provOpts = (rubro) => { const l = DB.proveedores.filter((x) => !x.archivado); const del = l.filter((x) => x.rubros.includes(rubro)); const otros = l.filter((x) => !x.rubros.includes(rubro)); return '<option value="">Sin asignar</option>' + (del.length ? '<optgroup label="Del rubro">' + del.map((x) => '<option value="' + x.id + '">' + esc(x.razon) + '</option>').join('') + '</optgroup>' : '') + '<optgroup label="Otros">' + otros.map((x) => '<option value="' + x.id + '">' + esc(x.razon) + '</option>').join('') + '</optgroup>'; };
    const r0 = i ? i.rubro : (UI.ultimoRubro || 'r01');
    let cot = i && i.cotizaciones ? i.cotizaciones.map((c) => Object.assign({}, c)) : [];
    abrirModal(cabModal(i ? 'Editar ítem' : 'Agregar ítem') + '<div class="m-b">' +
      '<div class="fila-2"><div class="campo"><label for="it-rubro">Rubro</label><select class="input" id="it-rubro">' + opciones(DB.rubros.map((r) => [r.id, r.num + '. ' + r.nombre]), r0) + '</select></div><div class="campo"><label for="it-prov">Proveedor</label><select class="input" id="it-prov">' + provOpts(r0) + '</select></div></div>' +
      '<div class="campo"><label for="it-desc">Descripción</label><input class="input" id="it-desc" value="' + esc(i ? i.desc : '') + '"></div>' +
      '<div class="fila-3"><div class="campo"><label for="it-unidad">Unidad</label><select class="input" id="it-unidad">' + opciones(DB.unidades.map((u) => [u, u]), i ? i.unidad : 'gl') + '</select></div><div class="campo"><label for="it-cant">Cantidad</label><input class="input der" id="it-cant" inputmode="decimal" value="' + (i ? fmtInput(i.cant) : '') + '"></div><div class="campo"><label for="it-mon">Moneda</label><select class="input" id="it-mon">' + opciones([['ARS', 'Pesos'], ['USD', 'Dólares']], i ? i.mon : 'ARS') + '</select></div></div>' +
      '<div class="campo"><span class="lbl">Cotizaciones de proveedores</span><div id="it-cot"></div><span class="ayuda">Cargá las que pediste y elegí una: completa proveedor y costo. Quedan guardadas para comparar.</span></div>' +
      '<div class="fila-4"><div class="campo"><label for="it-costo">Costo unitario</label><input class="input der monto" id="it-costo" inputmode="decimal" value="' + (i ? fmtInput(i.costo) : '') + '"></div><div class="campo"><label for="it-iibb">% IIBB</label><input class="input der" id="it-iibb" inputmode="decimal" value="' + (i ? fmtInput(i.iibb || 0) : '0') + '"></div><div class="campo"><label for="it-interno">% interno</label><input class="input der" id="it-interno" inputmode="decimal" value="' + (i ? fmtInput(i.interno) : '') + '"></div><div class="campo"><label for="it-venta">Precio unitario</label><input class="input der monto" id="it-venta" inputmode="decimal" value="' + (i ? fmtInput(i.venta) : '') + '"></div></div>' +
      '<span class="ayuda">Como en el sistema actual: precio = costo × (1 + % IIBB + % interno). También podés escribir el precio y se recalcula el % interno.</span>' +
      '<label class="check"><input type="checkbox" id="it-solo"' + (i && i.soloCosto ? ' checked' : '') + '>Solo costo: suma al costo de la obra pero no se le cobra al cliente</label>' +
      '<div class="campo"><label for="it-nota">Detalle (lo que antes iba en el comentario de la celda)</label><textarea class="input" id="it-nota" rows="2" placeholder="Ej.: incluye carpeta, demolición de escalera, alquiler de puntales">' + esc(i ? i.nota || '' : '') + '</textarea></div>' +
      '<div class="total-modal"><span>Total del ítem</span><b id="it-total">-</b></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="it-ok">Guardar ítem</button></div>', (m) => {
      if (i) $('#it-prov', m).value = i.prov;
      const provs = DB.proveedores.filter((x) => !x.archivado).map((x) => [x.id, x.razon]);
      const pintarCot = () => {
        setHTML($('#it-cot', m), (cot.length ? '<div class="cot-lista">' + cot.map((c, k) => '<div class="cot-fila' + (c.prov === $('#it-prov', m).value && Math.abs(c.monto - (num(m, '#it-costo') || 0)) < 1 ? ' elegida' : '') + '" data-k="' + k + '"><select class="input" data-cot="prov">' + opciones(provs, c.prov, 'Proveedor') + '</select><input class="input der" data-cot="monto" inputmode="decimal" value="' + fmtInput(c.monto) + '" placeholder="Costo unit."><input class="input" data-cot="nota" value="' + esc(c.nota || '') + '" placeholder="Condiciones, plazo"><button type="button" class="btn sm" data-cotelegir="' + k + '">Elegir</button><button type="button" class="btn sm icon ghost" data-cotquitar="' + k + '" aria-label="Quitar cotización">' + ic('x') + '</button></div>').join('') + '</div>' : '') + '<button type="button" class="btn sm" id="it-cot-add">' + ic('plus') + 'Agregar cotización</button>');
        const min = cot.filter((c) => c.monto > 0).reduce((a, c) => (!a || c.monto < a.monto ? c : a), null);
        if (min && cot.length > 1) { const f = $('[data-k="' + cot.indexOf(min) + '"]', m); if (f) f.classList.add('menor'); }
      };
      pintarCot();
      $('#it-cot', m).addEventListener('input', (e) => { const f = e.target.closest('[data-k]'); if (!f) return; const c = cot[Number(f.dataset.k)]; const k = e.target.dataset.cot; c[k] = k === 'monto' ? (parseNum(e.target.value) || 0) : e.target.value; });
      $('#it-cot', m).addEventListener('change', (e) => { const f = e.target.closest('[data-k]'); if (f && e.target.dataset.cot === 'prov') cot[Number(f.dataset.k)].prov = e.target.value; });
      $('#it-cot', m).addEventListener('click', (e) => {
        if (e.target.closest('#it-cot-add')) { cot.push({ prov: '', monto: 0, nota: '' }); pintarCot(); return; }
        const q = e.target.closest('[data-cotquitar]'); if (q) { cot.splice(Number(q.dataset.cotquitar), 1); pintarCot(); return; }
        const el = e.target.closest('[data-cotelegir]'); if (el) { const c = cot[Number(el.dataset.cotelegir)]; if (!c.prov || !(c.monto > 0)) { toast('Completá proveedor y costo de esa cotización.', 'warning'); return; } $('#it-prov', m).value = c.prov; $('#it-costo', m).value = fmtInput(c.monto); desdeCosto(); pintarCot(); }
      });
      $('#it-rubro', m).addEventListener('change', () => { const v = $('#it-prov', m).value; setHTML($('#it-prov', m), provOpts(val(m, '#it-rubro'))); $('#it-prov', m).value = v; });
      const total = () => { const solo = $('#it-solo', m).checked; const t = num(m, '#it-cant') * (solo ? num(m, '#it-costo') : num(m, '#it-venta')); $('#it-total', m).textContent = Number.isFinite(t) ? fmt(t, val(m, '#it-mon')) + (solo ? ' de costo' : '') : '-'; };
      const desdeCosto = () => { const c = num(m, '#it-costo'), ib = parseNum(val(m, '#it-iibb')) || 0, g = parseNum(val(m, '#it-interno')); if (Number.isFinite(c) && Number.isFinite(g)) $('#it-venta', m).value = fmtInput(r2(c * (1 + ib / 100 + g / 100))); total(); };
      ['#it-costo', '#it-iibb', '#it-interno'].forEach((s) => $(s, m).addEventListener('input', desdeCosto));
      $('#it-venta', m).addEventListener('input', () => { const c = num(m, '#it-costo'), v = num(m, '#it-venta'), ib = parseNum(val(m, '#it-iibb')) || 0; if (c > 0 && Number.isFinite(v)) $('#it-interno', m).value = fmtInput(r2((v / c - 1) * 100 - ib)); total(); });
      const solo = () => { const on = $('#it-solo', m).checked; ['#it-iibb', '#it-interno', '#it-venta'].forEach((s) => { $(s, m).disabled = on; }); total(); };
      $('#it-solo', m).addEventListener('change', solo); ['#it-cant', '#it-mon'].forEach((s) => $(s, m).addEventListener('input', total)); solo();
      $('#it-ok', m).addEventListener('click', () => {
        const err = []; const sc = $('#it-solo', m).checked; const cant = num(m, '#it-cant'), costo = num(m, '#it-costo'), venta = sc ? 0 : num(m, '#it-venta');
        if (!val(m, '#it-desc')) err.push('descripción'); if (!(cant > 0)) err.push('cantidad'); if (!(costo >= 0)) err.push('costo');
        if (!sc && !(venta > 0)) err.push('precio al cliente'); if (!sc && costo > 0 && venta < costo) err.push('el precio está por debajo del costo');
        if (cot.some((c) => !c.prov || !(c.monto > 0))) err.push('cotizaciones completas (o quitá las vacías)');
        if (!mostrarErrores(m, err)) return;
        const datos = { rubro: val(m, '#it-rubro'), desc: val(m, '#it-desc'), unidad: val(m, '#it-unidad'), cant, costo, venta, iibb: sc ? 0 : (parseNum(val(m, '#it-iibb')) || 0), interno: sc ? 0 : (parseNum(val(m, '#it-interno')) || 0), soloCosto: sc, prov: val(m, '#it-prov'), mon: val(m, '#it-mon'), nota: val(m, '#it-nota'), cotizaciones: cot };
        UI.ultimoRubro = datos.rubro;
        if (i) Object.assign(i, datos); else p.items.push(Object.assign({ id: nid('i') }, datos));
        guardar(); cerrarModal(); render(); toast('Ítem guardado.');
      });
    }, true);
  }
  function verCotizaciones(itemId) {
    const p = DB.presupuestos.find((x) => x.items.some((i) => i.id === itemId)); const i = p.items.find((x) => x.id === itemId);
    const min = Math.min(...i.cotizaciones.map((c) => c.monto));
    abrirModal(cabModal('Cotizaciones · ' + i.desc) + '<div class="m-b"><div class="tabla-wrap"><table><thead><tr><th>Proveedor</th><th>Condiciones</th><th class="num">Costo unit.</th><th class="num">Diferencia</th><th></th></tr></thead><tbody>' + i.cotizaciones.slice().sort((a, b) => a.monto - b.monto).map((c) => '<tr><td><b>' + esc((M.prov(c.prov) || {}).razon) + '</b></td><td class="wrap">' + esc(c.nota || '') + '</td><td class="num">' + fmt(c.monto, i.mon) + '</td><td class="num">' + (c.monto === min ? badge('Más barata', 'b-ok') : '+' + pct((c.monto / min - 1) * 100)) + '</td><td>' + (c.prov === i.prov ? badge('Elegida', 'b-ink', 'check') : '') + '</td></tr>').join('') + '</tbody></table></div>' +
      (p.estado === 'borrador' && puede('editarPres') ? '<p class="suave">Para cambiar la elegida, editá el ítem.</p>' : '<p class="suave">El presupuesto está aprobado: la elección quedó fija en el contrato.</p>') + '</div><div class="m-f">' + (p.estado === 'borrador' && puede('editarPres') ? '<button class="btn" data-accion="editar-item" data-id="' + i.id + '">' + ic('pencil-simple') + 'Editar ítem</button>' : '') + '<button class="btn primary" data-accion="cerrar-modal">Listo</button></div>', null, true);
  }
  function modalCobro(obraId, cargoId) {
    const verSin = puede('sin');
    const obras = obraId ? [M.obra(obraId)] : DB.obras;
    const cargos = []; obras.forEach((o) => M.cargos(o.id).filter((c) => verSin || c.comp !== 'sin').forEach((c) => { const e = M.estadoCargo(c); M.MON.forEach((k) => { if (e.saldo[k] > 0.5) cargos.push({ key: c.id + '|' + k, c, mon: k, saldo: e.saldo[k], obra: o }); }); }));
    if (!cargos.length) { toast('No hay comprobantes con saldo para cobrar.', 'info'); return; }
    const sel0 = cargos.find((x) => x.c.id === cargoId) || cargos[0];
    abrirModal(cabModal('Registrar cobro') + '<div class="m-b">' +
      '<div class="campo"><label for="cb-cargo">Qué se cobra</label><select class="input" id="cb-cargo">' + opciones(cargos.map((x) => [x.key, (obraId ? '' : x.obra.nombre + ' · ') + x.c.nombre + ' · saldo ' + fmt(x.saldo, x.mon)]), sel0.key) + '</select></div>' +
      '<div class="fila-2"><div class="campo"><label for="cb-imp">Importe</label><input class="input der monto" id="cb-imp" inputmode="decimal"><span class="ayuda" id="cb-saldo"></span></div><div class="campo"><label for="cb-fecha">Fecha</label><input class="input" type="date" id="cb-fecha" value="' + hoy() + '"></div></div>' +
      '<div class="campo"><span class="lbl">Medio</span><div class="chips" id="cb-medio">' + [['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['cheque', 'Cheque'], ['echeq', 'E-cheq']].map((x, k) => '<button type="button" class="chip" data-medio="' + x[0] + '" aria-pressed="' + (k === 0) + '">' + x[1] + '</button>').join('') + '</div></div>' +
      '<div id="cb-banco-w" class="campo"><label for="cb-banco">Banco donde entra</label><select class="input" id="cb-banco">' + opciones(DB.bancos.map((b) => [b, b]), 'Banco Galicia') + '</select></div>' +
      '<div id="cb-cheque-w" hidden><div class="fila-3"><div class="campo"><label for="cb-chb">Banco del cheque</label><select class="input" id="cb-chb">' + opciones(DB.bancos.map((b) => [b, b]), '', 'Elegí') + '</select></div><div class="campo"><label for="cb-chn">Número</label><input class="input" id="cb-chn" inputmode="numeric"></div><div class="campo"><label for="cb-chf">Fecha de pago</label><input class="input" type="date" id="cb-chf"></div></div></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="cb-ok">Registrar cobro</button></div>', (m) => {
      let medio = 'transferencia';
      const actual = () => cargos.find((x) => x.key === val(m, '#cb-cargo'));
      const pintarSaldo = () => { const x = actual(); $('#cb-imp', m).value = fmtInput(x.saldo); $('#cb-saldo', m).textContent = 'Saldo de este comprobante: ' + fmt(x.saldo, x.mon); };
      $('#cb-cargo', m).addEventListener('change', pintarSaldo); pintarSaldo();
      $('#cb-medio', m).addEventListener('click', (e) => { const b = e.target.closest('[data-medio]'); if (!b) return; medio = b.dataset.medio; $$('[data-medio]', m).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('#cb-cheque-w', m).hidden = !(medio === 'cheque' || medio === 'echeq'); $('#cb-banco-w', m).hidden = medio !== 'transferencia'; });
      $('#cb-ok', m).addEventListener('click', () => {
        const x = actual(); const imp = num(m, '#cb-imp'); const err = [];
        if (!(imp > 0)) err.push('importe'); else if (imp > x.saldo + 0.5) err.push('el importe supera el saldo del comprobante (' + fmt(x.saldo, x.mon) + ')');
        if (!val(m, '#cb-fecha')) err.push('fecha');
        const esCh = medio === 'cheque' || medio === 'echeq';
        if (esCh) { if (!val(m, '#cb-chb')) err.push('banco del cheque'); if (!val(m, '#cb-chn')) err.push('número de cheque'); if (!val(m, '#cb-chf')) err.push('fecha de pago del cheque'); if (DB.cheques.some((c) => c.numero === val(m, '#cb-chn') && c.banco === val(m, '#cb-chb'))) err.push('ese cheque ya está cargado'); }
        if (!mostrarErrores(m, err)) return;
        const cb = { id: nid('cb'), obra: x.obra.id, cargo: x.c.id, fecha: val(m, '#cb-fecha'), importe: imp, mon: x.mon, medio, creado: creado() };
        if (medio === 'transferencia') cb.banco = val(m, '#cb-banco');
        if (esCh) { const ch = { id: nid('ch'), tipo: 'tercero', numero: val(m, '#cb-chn'), banco: val(m, '#cb-chb'), librador: M.cliente(x.obra.cliente).razon, importe: imp, emision: val(m, '#cb-fecha'), pago: val(m, '#cb-chf'), estado: 'cartera' }; DB.cheques.push(ch); cb.cheque = ch.id; }
        DB.cobros.push(cb); log('Registró un cobro de ' + fmt(imp, x.mon) + ' por ' + x.c.nombre, x.obra.id); guardar(); cerrarModal(); cerrarDrawer(); render(); toast('Cobro registrado. El estado del comprobante se actualizó solo.');
      });
    });
  }
  function modalPago(obraId, provId) {
    const obras = obraId ? [M.obra(obraId)] : DB.obras.filter((o) => o.estado !== 'archivada');
    const cartera = DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'cartera');
    abrirModal(cabModal('Registrar pago a proveedor') + '<div class="m-b">' +
      '<div class="fila-2"><div class="campo"><label for="pg-obra">Obra</label><select class="input" id="pg-obra"' + (obraId ? ' disabled' : '') + '>' + opciones(obras.map((o) => [o.id, o.nombre]), obraId || obras[0].id) + '</select></div><div class="campo"><label for="pg-prov">Proveedor</label><select class="input" id="pg-prov"></select></div></div>' +
      '<div class="desglose" id="pg-estado"></div>' +
      '<div class="fila-3"><div class="campo"><label for="pg-mon">Moneda</label><select class="input" id="pg-mon">' + opciones([['ARS', 'Pesos'], ['USD', 'Dólares']], 'ARS') + '</select></div><div class="campo"><label for="pg-imp">Importe</label><input class="input der monto" id="pg-imp" inputmode="decimal"></div><div class="campo"><label for="pg-fecha">Fecha</label><input class="input" type="date" id="pg-fecha" value="' + hoy() + '"></div></div>' +
      '<div class="campo"><span class="lbl">Medio</span><div class="chips" id="pg-medio">' + [['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['cheque-propio', 'Cheque propio'], ['cheque-tercero', 'Endosar cheque de cartera']].map((x, k) => '<button type="button" class="chip" data-medio="' + x[0] + '" aria-pressed="' + (k === 0) + '"' + (x[0] === 'cheque-tercero' && !cartera.length ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div></div>' +
      '<div id="pg-propio" hidden><div class="fila-3"><div class="campo"><label for="pg-chb">Banco</label><select class="input" id="pg-chb">' + opciones(DB.bancos.map((b) => [b, b]), 'Banco Galicia') + '</select></div><div class="campo"><label for="pg-chn">Número</label><input class="input" id="pg-chn" inputmode="numeric"></div><div class="campo"><label for="pg-chf">Fecha de débito</label><input class="input" type="date" id="pg-chf"></div></div></div>' +
      '<div id="pg-endoso" class="campo" hidden><label for="pg-che">Cheque a endosar</label><select class="input" id="pg-che">' + opciones(cartera.map((c) => [c.id, c.banco + ' N° ' + c.numero + ' · ' + fmt(c.importe) + ' · vence ' + fFecha(c.pago)]), '', 'Elegí un cheque') + '</select></div>' +
      '<div class="campo"><label for="pg-det">Detalle</label><input class="input" id="pg-det" placeholder="Ej.: avance tabiques, saldo carpintería"></div>' +
      '<div id="pg-avisos"></div>' +
      '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="pg-ok">Registrar pago</button></div>', (m) => {
      let medio = 'transferencia';
      const fila = () => M.provDeObra(val(m, '#pg-obra')).find((f) => f.prov === val(m, '#pg-prov'));
      const pintarProvs = () => { const l = M.provDeObra(val(m, '#pg-obra')); const otros = DB.proveedores.filter((p) => !p.archivado && !l.some((f) => f.prov === p.id)); setHTML($('#pg-prov', m), '<optgroup label="De esta obra">' + l.map((f) => '<option value="' + f.prov + '">' + esc(M.prov(f.prov).razon) + '</option>').join('') + '</optgroup><optgroup label="Otros">' + otros.map((p) => '<option value="' + p.id + '">' + esc(p.razon) + '</option>').join('') + '</optgroup>'); if (provId) $('#pg-prov', m).value = provId; pintarEstado(); };
      const pintarEstado = () => { const f = fila(); const k = val(m, '#pg-mon'); if (!f) { setHTML($('#pg-estado', m), '<span class="nota">Proveedor sin ítems en esta obra: el pago queda como gasto suelto de la obra.</span>'); return; } setHTML($('#pg-estado', m), '<span>Pactado</span><span class="r">' + fmt(f.pactado[k], k) + '</span><span>Certificado a la fecha</span><span class="r">' + fmt(f.devengado[k], k) + '</span><span>Pagado</span><span class="r">' + fmt(f.pagado[k], k) + '</span><span class="sep"></span><span class="total">A pagar por avance</span><span class="r total">' + fmt(Math.max(0, f.aPagar[k]), k) + '</span>'); if (!$('#pg-imp', m).value && f.aPagar[k] > 0) $('#pg-imp', m).value = fmtInput(f.aPagar[k]); avisos(); };
      const avisos = () => {
        const f = fila(); const k = val(m, '#pg-mon'); const imp = num(m, '#pg-imp'); const a = [];
        if (f && imp > Math.max(0, f.aPagar[k]) + 0.5) a.push('<div class="aviso warn">' + ic('warning') + '<div>Estás pagando más de lo certificado a este proveedor (adelanto de ' + fmt(imp - Math.max(0, f.aPagar[k]), k) + '). Se puede, pero queda marcado.</div></div>');
        const dup = DB.pagos.find((p) => !p.anulado && p.prov === val(m, '#pg-prov') && Math.abs(p.importe - imp) < 1 && Math.abs(M.dias(p.fecha)) <= 7);
        if (dup) a.push('<div class="aviso bad">' + ic('copy') + '<div>Ya hay un pago igual a este proveedor el ' + fFecha(dup.fecha) + ' (' + fmt(dup.importe, dup.mon) + '). ¿No está repetido?</div></div>');
        setHTML($('#pg-avisos', m), a.join(''));
      };
      pintarProvs();
      $('#pg-obra', m).addEventListener('change', pintarProvs); $('#pg-prov', m).addEventListener('change', () => { $('#pg-imp', m).value = ''; pintarEstado(); }); $('#pg-mon', m).addEventListener('change', () => { $('#pg-imp', m).value = ''; pintarEstado(); }); $('#pg-imp', m).addEventListener('input', avisos);
      $('#pg-che', m).addEventListener('change', () => { const c = M.cheque(val(m, '#pg-che')); if (c) { $('#pg-imp', m).value = fmtInput(c.importe); avisos(); } });
      $('#pg-medio', m).addEventListener('click', (e) => { const b = e.target.closest('[data-medio]'); if (!b || b.disabled) return; medio = b.dataset.medio; $$('[data-medio]', m).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('#pg-propio', m).hidden = medio !== 'cheque-propio'; $('#pg-endoso', m).hidden = medio !== 'cheque-tercero'; if (medio.startsWith('cheque')) $('#pg-mon', m).value = 'ARS'; });
      $('#pg-ok', m).addEventListener('click', () => {
        const imp = num(m, '#pg-imp'); const err = [];
        if (!val(m, '#pg-prov')) err.push('proveedor'); if (!(imp > 0)) err.push('importe'); if (!val(m, '#pg-fecha')) err.push('fecha');
        if (medio === 'cheque-propio') { if (!val(m, '#pg-chn')) err.push('número de cheque'); if (!val(m, '#pg-chf')) err.push('fecha de débito'); if (DB.cheques.some((c) => c.tipo === 'propio' && c.numero === val(m, '#pg-chn') && c.banco === val(m, '#pg-chb'))) err.push('ese número de cheque ya se usó'); }
        if (medio === 'cheque-tercero') { const c = M.cheque(val(m, '#pg-che')); if (!c) err.push('cheque a endosar'); else if (Math.abs(c.importe - imp) > 0.5) err.push('el importe tiene que ser el del cheque'); }
        if (!mostrarErrores(m, err)) return;
        const pg = { id: nid('pg'), obra: val(m, '#pg-obra'), prov: val(m, '#pg-prov'), fecha: val(m, '#pg-fecha'), importe: imp, mon: val(m, '#pg-mon'), medio, detalle: val(m, '#pg-det'), creado: creado() };
        if (medio === 'transferencia') pg.banco = 'Banco Galicia';
        if (medio === 'cheque-propio') { const ch = { id: nid('ch'), tipo: 'propio', numero: val(m, '#pg-chn'), banco: val(m, '#pg-chb'), librador: 'Momo Arquitectura', importe: imp, emision: pg.fecha, pago: val(m, '#pg-chf'), estado: 'emitido' }; DB.cheques.push(ch); pg.cheque = ch.id; }
        if (medio === 'cheque-tercero') { const ch = M.cheque(val(m, '#pg-che')); ch.estado = 'endosado'; pg.cheque = ch.id; }
        DB.pagos.push(pg); log('Registró un pago a ' + M.prov(pg.prov).razon + ' por ' + fmt(imp, pg.mon) + ' (' + medioTxt(pg) + ')', pg.obra); guardar(); cerrarModal(); render(); toast('Pago registrado.');
      });
    });
  }
  function modalCaja(obraId, tipo) {
    abrirModal(cabModal(tipo === 'gasto' ? 'Gasto de caja chica' : 'Reponer caja chica') + '<div class="m-b"><div class="campo"><label for="cj-desc">Concepto</label><input class="input" id="cj-desc" placeholder="' + (tipo === 'gasto' ? 'Ej.: flete, ferretería, volquete' : 'Reposición') + '"></div><div class="fila-2"><div class="campo"><label for="cj-imp">Importe</label><input class="input der monto" id="cj-imp" inputmode="decimal"></div><div class="campo"><label for="cj-fecha">Fecha</label><input class="input" type="date" id="cj-fecha" value="' + hoy() + '"></div></div><div class="campo"><label for="cj-resp">Responsable</label><select class="input" id="cj-resp">' + opciones(DB.equipo.map((u) => [u.id, u.nombre]), M.obra(obraId).resp) + '</select></div>' + (tipo === 'gasto' ? '<p class="tenue">Saldo actual: ' + fmt(M.cajaSaldo(obraId)) + '. Suma al costo real de la obra.</p>' : '') + '</div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="cj-ok">Guardar</button></div>', (m) => {
      $('#cj-ok', m).addEventListener('click', () => {
        const imp = num(m, '#cj-imp'); const err = []; if (!val(m, '#cj-desc') && tipo === 'gasto') err.push('concepto'); if (!(imp > 0)) err.push('importe');
        if (!mostrarErrores(m, err)) return;
        DB.caja.push({ id: nid('cc'), obra: obraId, fecha: val(m, '#cj-fecha'), tipo, desc: val(m, '#cj-desc') || 'Reposición', importe: imp, resp: val(m, '#cj-resp'), creado: creado() });
        log((tipo === 'gasto' ? 'Cargó un gasto de caja chica: ' : 'Repuso la caja chica: ') + (val(m, '#cj-desc') || fmt(imp)), obraId); guardar(); cerrarModal(); render(); toast('Caja chica actualizada.');
      });
    });
  }
  function modalTarea(id, obraId) {
    const t = id ? DB.tareas.find((x) => x.id === id) : null;
    abrirModal(cabModal(t ? 'Editar tarea' : 'Nueva tarea') + '<div class="m-b"><div class="campo"><label for="ta-tit">Tarea</label><input class="input" id="ta-tit" value="' + esc(t ? t.titulo : '') + '" placeholder="Qué hay que hacer"></div><div class="fila-2"><div class="campo"><label for="ta-obra">Obra</label><select class="input" id="ta-obra">' + opciones([['', 'General (sin obra)']].concat(DB.obras.filter((o) => o.estado !== 'archivada').map((o) => [o.id, o.nombre])), t ? t.obra : (obraId || '')) + '</select></div><div class="campo"><label for="ta-resp">Responsable</label><select class="input" id="ta-resp">' + opciones(DB.equipo.map((u) => [u.id, u.nombre + ' · ' + PERFIL_TXT[u.perfil]]), t ? t.resp : UI.usuario) + '</select></div></div><div class="fila-2"><div class="campo"><label for="ta-vence">Vence</label><input class="input" type="date" id="ta-vence" value="' + esc(t ? t.vence : '') + '"></div><div class="campo"><label for="ta-col">Columna</label><select class="input" id="ta-col">' + opciones(COLS, t ? t.col : 'pendiente') + '</select></div></div><div id="ta-dup"></div></div><div class="m-f">' + (t ? '<button class="btn peligro izq" id="ta-del">' + ic('trash') + 'Eliminar</button>' : '') + '<button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ta-ok">Guardar</button></div>', (m) => {
      const dup = () => { const tit = sinAcentos(val(m, '#ta-tit')); const d = tit && DB.tareas.find((x) => x.id !== id && x.col !== 'hecha' && x.obra === val(m, '#ta-obra') && sinAcentos(x.titulo) === tit); setHTML($('#ta-dup', m), d ? '<div class="aviso warn">' + ic('copy') + '<div>Ya hay una tarea abierta igual en esta obra (a cargo de ' + esc((M.usuario(d.resp) || {}).nombre) + '). Evitá duplicarla.</div></div>' : ''); return d; };
      $('#ta-tit', m).addEventListener('input', dup); $('#ta-obra', m).addEventListener('change', dup);
      if (t) $('#ta-del', m).addEventListener('click', () => { DB.tareas = DB.tareas.filter((x) => x.id !== id); log('Eliminó la tarea "' + t.titulo + '"', t.obra); guardar(); cerrarModal(); render(); toast('Tarea eliminada.'); });
      $('#ta-ok', m).addEventListener('click', () => {
        const err = []; if (!val(m, '#ta-tit')) err.push('tarea'); if (dup()) err.push('ya existe una tarea igual abierta');
        if (!mostrarErrores(m, err)) return;
        const datos = { titulo: val(m, '#ta-tit'), obra: val(m, '#ta-obra'), resp: val(m, '#ta-resp'), vence: val(m, '#ta-vence'), col: val(m, '#ta-col') };
        if (t) { Object.assign(t, datos); log('Editó la tarea "' + datos.titulo + '"', datos.obra); } else { DB.tareas.push(Object.assign({ id: nid('t'), creado: creado() }, datos)); log('Creó la tarea "' + datos.titulo + '" para ' + (M.usuario(datos.resp) || {}).nombre, datos.obra); }
        guardar(); cerrarModal(); render(); toast('Tarea guardada.');
      });
    });
  }
  function modalIndice() {
    const sugerido = (() => { let m = M.mesAnterior(hoy()); if (M.indice(m)) m = hoy().slice(0, 7); return m; })();
    abrirModal(cabModal('Cargar índice CAC') + '<div class="m-b"><div class="campo"><label for="ix-mes">Mes</label><input class="input" type="month" id="ix-mes" value="' + sugerido + '"></div><div class="fila-2"><div class="campo"><label for="ix-mo">Índice mano de obra</label><input class="input der" id="ix-mo" inputmode="decimal" placeholder="19.120,4"></div><div class="campo"><label for="ix-mat">Índice materiales</label><input class="input der" id="ix-mat" inputmode="decimal" placeholder="25.801,2"></div></div><p class="tenue">Publicado por la Cámara Argentina de la Construcción. Se carga una vez y vale para todas las obras.</p></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ix-ok">Guardar</button></div>', (m) => {
      $('#ix-ok', m).addEventListener('click', () => {
        const mo = num(m, '#ix-mo'), mat = num(m, '#ix-mat'), mes = val(m, '#ix-mes'); const err = [];
        if (!mes) err.push('mes'); if (M.indice(mes)) err.push('ese mes ya está cargado'); if (!(mo > 0)) err.push('índice de mano de obra'); if (!(mat > 0)) err.push('índice de materiales');
        const ult = DB.indicesCAC.slice().sort((a, b) => b.mes.localeCompare(a.mes))[0];
        if (mo > 0 && ult && Math.abs(mo / ult.mo - 1) > 0.25) err.push('mano de obra varía más de 25% contra ' + M.mesTxt(ult.mes) + ' (¿está bien tipeado?)');
        if (!mostrarErrores(m, err)) return;
        DB.indicesCAC.push({ mes, mo, mat }); log('Cargó el índice CAC de ' + M.mesTxt(mes)); guardar(); cerrarModal(); render(); toast('Índice cargado.');
      });
    });
  }
  function modalGasto() {
    abrirModal(cabModal('Gasto del estudio') + '<div class="m-b"><div class="fila-2"><div class="campo"><label for="ga-rubro">Rubro</label><select class="input" id="ga-rubro">' + opciones(['Alquiler', 'Servicios', 'Software', 'Movilidad', 'Impuestos', 'Honorarios profesionales', 'Otros'].map((x) => [x, x]), 'Servicios') + '</select></div><div class="campo"><label for="ga-medio">Medio</label><select class="input" id="ga-medio">' + opciones([['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']], 'transferencia') + '</select></div></div><div class="campo"><label for="ga-desc">Concepto</label><input class="input" id="ga-desc"></div><div class="fila-2"><div class="campo"><label for="ga-imp">Importe</label><input class="input der monto" id="ga-imp" inputmode="decimal"></div><div class="campo"><label for="ga-fecha">Fecha</label><input class="input" type="date" id="ga-fecha" value="' + hoy() + '"></div></div></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ga-ok">Guardar</button></div>', (m) => {
      $('#ga-ok', m).addEventListener('click', () => {
        const imp = num(m, '#ga-imp'); const err = []; if (!val(m, '#ga-desc')) err.push('concepto'); if (!(imp > 0)) err.push('importe');
        if (!mostrarErrores(m, err)) return;
        DB.gastos.push({ id: nid('g'), fecha: val(m, '#ga-fecha'), rubro: val(m, '#ga-rubro'), desc: val(m, '#ga-desc'), importe: imp, medio: val(m, '#ga-medio'), creado: creado() });
        log('Cargó un gasto del estudio: ' + val(m, '#ga-desc')); guardar(); cerrarModal(); render(); toast('Gasto guardado.');
      });
    });
  }
  function imprimirPresupuesto(presId, modo) {
    const p = DB.presupuestos.find((x) => x.id === presId); const o = M.obra(p.obra); const cli = M.cliente(o.cliente); const t = M.totPres(p);
    const conImportes = modo === '1', costos = modo === 'costos';
    const ncols = costos ? 7 : conImportes ? 5 : 3;
    const filas = DB.rubros.map((r) => ({ r, items: p.items.filter((i) => i.rubro === r.id) })).filter((x) => x.items.length).map((x) => '<tr class="rubro"><td colspan="' + ncols + '">' + esc(x.r.num + '. ' + x.r.nombre) + '</td></tr>' + x.items.map((i, k) => '<tr><td>' + esc(x.r.num + '.' + (k + 1) + ' ' + i.desc) + (costos && i.nota ? '<span class="sec">' + esc(i.nota) + '</span>' : '') + '</td><td>' + esc(i.unidad) + '</td><td class="num">' + fmtInput(i.cant) + '</td>' +
      (costos ? '<td>' + esc((M.prov(i.prov) || {}).razon || 'Sin asignar') + '</td><td class="num">' + fmt(i.costo, i.mon) + '</td><td class="num">' + fmt(i.cant * i.costo, i.mon) + '</td><td class="num">' + fmt(i.cant * i.venta, i.mon) + '</td>' : conImportes ? '<td class="num">' + fmt(i.venta, i.mon) + '</td><td class="num">' + fmt(i.cant * i.venta, i.mon) + '</td>' : '') + '</tr>').join('')).join('');
    const tot = (k) => !t[k].venta && !t[k].costo ? '' : '<div class="desglose">' + (costos ? '<span>Costo total</span><span class="r">' + fmt(t[k].costo, k) + '</span>' : '') + '<span>Subtotal</span><span class="r">' + fmt(t[k].venta, k) + '</span><span>Honorarios ' + o.honorarios + '%</span><span class="r">' + fmt(t[k].hon, k) + '</span><span class="sep"></span><span class="total">Total</span><span class="r total">' + fmt(t[k].total, k) + '</span>' + (costos ? '<span class="nota">Ganancia prevista ' + fmt(t[k].total - t[k].costo, k) + '</span>' : '') + '</div>';
    const titulo = costos ? 'Planilla de costos' : conImportes ? 'Presupuesto para el cliente' : 'Presupuesto sin importes';
    abrirDrawer('<div class="d-h"><div><h2>' + titulo + '</h2><div class="sub">' + esc(o.nombre) + ' · versión ' + p.version + (costos ? ' · uso interno' : '') + '</div></div><div class="der no-print"><button class="btn sm" data-accion="imprimir">' + ic('printer') + 'Imprimir</button><button class="btn sm icon ghost" data-accion="cerrar-drawer" aria-label="Cerrar">' + ic('x') + '</button></div></div><div class="d-b"><div class="doc imprimible"><div class="doc-cab"><img class="logo" src="' + esc($('.brand .logo').getAttribute('src')) + '" alt="MOMO"><div><h3>' + esc(o.nombre) + '</h3><div class="s">' + esc(cli.razon) + ' · ' + esc(o.dir) + '</div></div><div class="der">' + fLarga(p.fecha) + '<br>Obra ' + o.num + ' · v' + p.version + '</div></div><table><thead><tr><th>Ítem</th><th>Unidad</th><th class="num">Cant.</th>' + (costos ? '<th>Proveedor</th><th class="num">Costo unit.</th><th class="num">Costo total</th><th class="num">Precio total</th>' : conImportes ? '<th class="num">Precio unit.</th><th class="num">Total</th>' : '') + '</tr></thead><tbody>' + filas + '</tbody></table>' + (conImportes || costos ? '<div class="sp"></div>' + bloquesTotales([tot('ARS'), tot('USD')]) : '') + '</div></div>');
  }
  /* ================= buscador rápido (Ctrl+K): abre al instante, se usa con teclado ================= */
  let palItems = [], palActivo = 0;
  function itemsPaleta(q) {
    const it = [];
    DB.obras.forEach((o) => it.push({ g: 'Obras', i: 'buildings', t: o.nombre, s: 'Obra ' + o.num + ' · ' + ESTADO_OBRA[o.estado][0], ir: '#/obra/' + o.id }));
    DB.clientes.filter((c) => !c.archivado).forEach((c) => it.push({ g: 'Clientes', i: 'user', t: c.razon, s: c.cuit ? 'CUIT ' + cuitFmt(c.cuit) : c.iva, fn: () => { location.hash = '#/clientes'; setTimeout(() => verCliente(c.id), 80); } }));
    DB.proveedores.filter((p) => !p.archivado).forEach((p) => it.push({ g: 'Proveedores', i: 'toolbox', t: p.razon, s: p.rubros.map((r) => M.rubro(r).nombre).join(', '), fn: () => { location.hash = '#/proveedores'; setTimeout(() => verProveedor(p.id), 80); } }));
    DB.obras.filter((o) => o.estado === 'curso' && M.presAprobado(o.id)).forEach((o) => it.push({ g: 'Acciones', i: 'file-plus', t: 'Cargar avance: ' + o.nombre, s: 'Nuevo certificado', ir: '#/obra/' + o.id + '/certificado/nuevo' }));
    if (puede('editarPres')) it.push({ g: 'Acciones', i: 'plus', t: 'Nueva obra', s: '', fn: () => modalObra(null) });
    it.push({ g: 'Acciones', i: 'check-square', t: 'Nueva tarea', s: '', fn: () => modalTarea(null) });
    if (puede('teso')) it.push({ g: 'Acciones', i: 'file-arrow-down', t: 'Cargar factura de proveedor', s: 'Facturación', fn: () => modalCompra() }, { g: 'Acciones', i: 'cloud-arrow-down', t: 'Traer facturas de ARCA', s: 'Mis Comprobantes', fn: () => modalArca() });
    if (puede('plata')) it.push({ g: 'Acciones', i: 'hand-coins', t: 'Registrar cobro', s: '', fn: () => modalCobro(null) }, { g: 'Acciones', i: 'money', t: 'Registrar pago', s: '', fn: () => modalPago(null) });
    return it.filter((x) => coincide(x.t + ' ' + x.s, q)).slice(0, 12);
  }
  function pintarPaleta() {
    const q = $('#paleta-in').value.trim(); palItems = itemsPaleta(q); palActivo = Math.min(palActivo, Math.max(0, palItems.length - 1));
    let g = '';
    setHTML($('#paleta-res'), palItems.length ? palItems.map((x, k) => (x.g !== g ? '<h4>' + esc((g = x.g)) + '</h4>' : '') + '<button type="button" data-p="' + k + '" class="' + (k === palActivo ? 'activo' : '') + '">' + ic(x.i) + '<span>' + esc(x.t) + '</span><span class="r-sub">' + esc(x.s) + '</span></button>').join('') : '<div class="vacio">Sin resultados para "' + esc(q) + '"</div>');
  }
  function abrirPaleta() { $('#paleta-wrap').classList.add('abierto'); $('#paleta-in').value = ''; palActivo = 0; pintarPaleta(); $('#paleta-in').focus(); }
  function cerrarPaleta() { $('#paleta-wrap').classList.remove('abierto'); }
  function ejecutarPaleta(x) { if (!x) return; cerrarPaleta(); if (x.ir) location.hash = x.ir; else x.fn(); }
  $('#paleta-in').addEventListener('input', () => { palActivo = 0; pintarPaleta(); });
  $('#paleta-in').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palActivo = Math.min(palItems.length - 1, palActivo + 1); pintarPaleta(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palActivo = Math.max(0, palActivo - 1); pintarPaleta(); }
    else if (e.key === 'Enter') { e.preventDefault(); ejecutarPaleta(palItems[palActivo]); }
  });
  $('#paleta-res').addEventListener('mousedown', (e) => { const b = e.target.closest('[data-p]'); if (b) { e.preventDefault(); ejecutarPaleta(palItems[Number(b.dataset.p)]); } });
  $('#paleta-wrap').addEventListener('mousedown', (e) => { if (e.target.id === 'paleta-wrap') cerrarPaleta(); });

  /* ================= carga rápida (botón +) ================= */
  function accionesRapidas() {
    const p = ruta(); const o = p[0] === 'obra' ? M.obra(p[1]) : null; const lista = [];
    if (o) {
      if (o.estado === 'curso' && M.presAprobado(o.id)) lista.push(['file-plus', 'Cargar avance del mes', 'Nuevo certificado de ' + o.nombre, () => { location.hash = '#/obra/' + o.id + '/certificado/nuevo'; }]);
      if (puede('plata')) lista.push(['hand-coins', 'Registrar cobro', 'Del cliente de esta obra', () => modalCobro(o.id)], ['money', 'Pagar a un proveedor', 'Con el saldo por avance a la vista', () => modalPago(o.id)]);
      lista.push(['receipt', 'Gasto de caja chica', 'Flete, ferretería, volquete', () => modalCaja(o.id, 'gasto')], ['check-square', 'Nueva tarea', 'Para esta obra', () => modalTarea(null, o.id)]);
    } else {
      DB.obras.filter((x) => x.estado === 'curso' && M.presAprobado(x.id)).forEach((x) => lista.push(['file-plus', 'Cargar avance', x.nombre, () => { location.hash = '#/obra/' + x.id + '/certificado/nuevo'; }]));
      if (puede('plata')) lista.push(['hand-coins', 'Registrar cobro', 'Elegís obra y comprobante', () => modalCobro(null)], ['money', 'Registrar pago', 'A un proveedor de cualquier obra', () => modalPago(null)]);
      lista.push(['check-square', 'Nueva tarea', 'Con responsable y vencimiento', () => modalTarea(null)]);
      if (puede('editarPres')) lista.push(['buildings', 'Nueva obra', 'Arranca con la plantilla de 17 rubros', () => modalObra(null)]);
    }
    abrirModal(cabModal(o ? 'Cargar en ' + o.nombre : 'Cargar') + '<div class="m-b"><div class="acciones-lista">' + lista.map((x, k) => '<button type="button" class="accion-item" data-k="' + k + '"><span class="ai-ic">' + ic(x[0]) + '</span><span class="ai-t"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></span>' + ic('caret-right', 'ai-flecha') + '</button>').join('') + '</div></div>', (m) => {
      $('.acciones-lista', m).addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; cerrarModal(); setTimeout(lista[Number(b.dataset.k)][3], 120); });
    });
  }

  /* ================= acciones ================= */
  document.addEventListener('click', (e) => {
    const ac = e.target.closest('[data-accion]');
    const ir = e.target.closest('[data-ir]');
    if (ac && !ac.disabled) {
      const a = ac.dataset.accion, id = ac.dataset.id;
      switch (a) {
        case 'abrir-menu': $('#app').classList.add('menu-abierto'); return;
        case 'cerrar-menu': $('#app').classList.remove('menu-abierto'); return;
        case 'tema': { const r = document.documentElement; const osc = r.dataset.theme ? r.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = osc ? 'light' : 'dark'; try { localStorage.setItem('momo-tema', osc ? 'claro' : 'oscuro'); } catch (er) { /* nada */ } return; }
        case 'cerrar-modal': cerrarModal(); return;
        case 'cerrar-drawer': cerrarDrawer(); return;
        case 'imprimir': window.print(); return;
        case 'f-obras': UI.obras.estado = ac.dataset.v; render(); return;
        case 'f-clientes': UI.clientes.tab = ac.dataset.v; render(); return;
        case 'f-prov': UI.proveedores.tab = ac.dataset.v; render(); return;
        case 'f-tareas': UI.tareas.vista = ac.dataset.v; render(); return;
        case 'f-cheques': UI.teso.cheques = ac.dataset.v; render(); return;
        case 'vista-obras': UI.obras.vista = ac.dataset.v; render(); return;
        case 'graf-tabla': UI.grafTabla = !UI.grafTabla; render(); return;
        case 'ver-cotiz': verCotizaciones(id); return;
        case 'ver-recibo': verRecibo(id); return;
        case 'paleta': abrirPaleta(); return;
        case 'nueva-compra': modalCompra(); return;
        case 'traer-arca': modalArca(); return;
        case 'ver-cuenta': verCuenta(id); return;
        case 'anular-compra': { const f = DB.facturasCompra.find((x) => x.id === id); confirmar('Anular factura ' + f.numero, 'Deja de sumar al crédito de IVA y a lo facturado por el proveedor. Queda visible como anulada.', 'Anular factura', () => { f.anulada = creado(); log('Anuló la factura ' + f.tipo + ' ' + f.numero + ' de ' + M.prov(f.prov).razon, f.obra); guardar(); render(); toast('Factura anulada.'); }, true); return; }
        case 'libro-iva': toast('En el sistema real se descarga el Libro de IVA Digital listo para el estudio contable.', 'file-text'); return;
        case 'exportar-ventas': descargarCSV('momo-facturas-emitidas', ['Fecha', 'Comprobante', 'Número', 'Cliente', 'CUIT', 'Obra', 'Moneda', 'Neto', 'IVA', 'Total', 'CAE', 'Cobro'], M.ventas().map((x) => [x.fecha, x.tipo, x.numero, x.cliente.razon, x.cliente.cuit, x.obra.nombre, x.mon, x.neto, x.iva, x.total, x.cae, x.estado])); toast('Excel descargado.'); return;
        case 'exportar-compras': descargarCSV('momo-facturas-proveedores', ['Fecha', 'Proveedor', 'CUIT', 'Tipo', 'Número', 'Imputada a', 'Neto', 'IVA', 'Percepciones', 'Total', 'Saldo', 'Estado'], M.compras().map((f) => [f.fecha, (M.prov(f.prov) || {}).razon, (M.prov(f.prov) || {}).cuit, f.tipo, f.numero, f.obra ? M.obra(f.obra).nombre : 'Gasto del estudio', f.neto, f.iva, f.perc, f.total, f.saldo, f.estado])); toast('Excel descargado.'); return;
        case 'exportar-iva': descargarCSV('momo-iva-mensual', ['Mes', 'Ventas netas', 'IVA débito', 'Compras netas', 'IVA crédito', 'Percepciones', 'Saldo'], M.ivaMensual().map((x) => [x.mes, x.ventasNeto, x.debito, x.comprasNeto, x.credito, x.perc, x.saldo])); toast('Excel descargado.'); return;
        case 'acciones-rapidas': accionesRapidas(); return;
        case 'menu-mas': $('#app').classList.add('menu-abierto'); return;
        case 'rechazar-pres': {
          const pr = DB.presupuestos.find((x) => x.id === id); const o = M.obra(pr.obra);
          abrirModal(cabModal('Presupuesto no aceptado') + '<div class="m-b"><p>La obra pasa a Archivadas y el presupuesto queda guardado como historia (en el sistema actual eran los "Rechazados"). Si el cliente vuelve, se retoma con una versión nueva.</p><div class="campo"><label for="rp-mot">Motivo</label><input class="input" id="rp-mot" placeholder="Ej.: eligió otra propuesta, se posterga, precio"></div></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn peligro" id="rp-ok">Marcar no aceptado</button></div>', (m) => {
            $('#rp-ok', m).addEventListener('click', () => { if (!mostrarErrores(m, val(m, '#rp-mot') ? [] : ['motivo'])) return; pr.estado = 'rechazado'; pr.rechazado = Object.assign(creado(), { motivo: val(m, '#rp-mot') }); o.estado = 'archivada'; o.motivo = val(m, '#rp-mot'); log('Marcó el presupuesto como no aceptado: ' + val(m, '#rp-mot'), o.id); guardar(); cerrarModal(); render(); toast('Presupuesto no aceptado. La obra pasó a Archivadas.', 'archive'); });
          }); return;
        }
        case 'nueva-obra': modalObra(null); return;
        case 'editar-obra': modalObra(id); return;
        case 'nuevo-cliente': e.preventDefault(); modalCliente(null, ac.dataset.volver); return;
        case 'editar-cliente': cerrarDrawer(); modalCliente(id); return;
        case 'ver-cliente': e.preventDefault(); verCliente(id); return;
        case 'nuevo-proveedor': modalProveedor(null); return;
        case 'editar-proveedor': cerrarDrawer(); modalProveedor(id); return;
        case 'ver-proveedor': verProveedor(id); return;
        case 'archivar-cliente': case 'archivar-proveedor': {
          const x = a === 'archivar-cliente' ? M.cliente(id) : M.prov(id); x.archivado = !x.archivado; log((x.archivado ? 'Archivó a ' : 'Desarchivó a ') + x.razon); guardar(); cerrarDrawer(); render();
          toast(x.archivado ? 'Archivado. Ya no aparece en listas ni selectores, pero su historia queda intacta.' : 'Vuelve a estar activo.', 'archive'); return;
        }
        case 'borrar-cliente': case 'borrar-proveedor': {
          const esC = a === 'borrar-cliente'; const x = esC ? M.cliente(id) : M.prov(id);
          confirmar('Eliminar ' + x.razon, 'No tiene nada asociado, así que se puede eliminar del todo.', 'Eliminar', () => { if (esC) DB.clientes = DB.clientes.filter((c) => c.id !== id); else DB.proveedores = DB.proveedores.filter((c) => c.id !== id); log('Eliminó a ' + x.razon); guardar(); cerrarDrawer(); render(); toast('Eliminado.'); }, true); return;
        }
        case 'armar-presupuesto': { const p = { id: nid('pr'), obra: id, version: 1, estado: 'borrador', fecha: hoy(), items: [] }; DB.presupuestos.push(p); log('Arrancó el presupuesto', id); guardar(); render(); modalItem(p.id, null); return; }
        case 'ver-version': UI.presVer = id; render(); return;
        case 'nuevo-item': modalItem(id, null); return;
        case 'editar-item': { const p = DB.presupuestos.find((x) => x.items.some((i) => i.id === id)); modalItem(p.id, id); return; }
        case 'quitar-item': { const p = DB.presupuestos.find((x) => x.items.some((i) => i.id === id)); const it = p.items.find((i) => i.id === id); confirmar('Quitar ítem', 'Se quita "' + it.desc + '" del borrador.', 'Quitar', () => { p.items = p.items.filter((i) => i.id !== id); guardar(); render(); }, true); return; }
        case 'aprobar-pres': {
          const p = DB.presupuestos.find((x) => x.id === id); const o = M.obra(p.obra);
          if (!p.items.length) { toast('El presupuesto no tiene ítems.', 'warning'); return; }
          confirmar('Aprobar presupuesto', 'Queda congelado como contrato original de ' + o.nombre + ': ya no se edita. Los cambios entran como demasías y economías en los certificados. ' + (M.presAprobado(o.id) ? 'La versión aprobada anterior pasa a reemplazada.' : 'La obra pasa a En curso.'), 'Aprobar', () => {
            const ant = M.presAprobado(o.id); if (ant) ant.estado = 'reemplazado';
            p.estado = 'aprobado'; p.aprobado = creado(); if (o.estado === 'presupuesto') { o.estado = 'curso'; o.inicio = o.inicio || hoy(); }
            if (o.anticipo.pct > 0 && !o.anticipo.fecha) { const cli = M.cliente(o.cliente); o.anticipo.fecha = hoy(); o.anticipo.comp = cli.iva === 'Responsable inscripto' ? 'A' : 'B'; o.anticipo.fe = nuevoFE(DB, o.anticipo.comp, o.anticipo.fecha); }
            UI.presVer = null; log('Aprobó el presupuesto versión ' + p.version, o.id); guardar(); render(); toast('Presupuesto aprobado. ' + (o.anticipo.pct ? 'Se generó el anticipo del ' + o.anticipo.pct + '% en la cuenta del cliente.' : ''), 'seal-check');
          }); return;
        }
        case 'nueva-version': { const p = DB.presupuestos.find((x) => x.id === id); const n = { id: nid('pr'), obra: p.obra, version: M.presDe(p.obra).length + 1, estado: 'borrador', fecha: hoy(), items: p.items.map((i) => Object.assign({}, i)) }; DB.presupuestos.push(n); UI.presVer = n.id; log('Abrió la versión ' + n.version + ' del presupuesto', p.obra); guardar(); render(); toast('Versión ' + n.version + ' en borrador, copiada de la aprobada.'); return; }
        case 'imprimir-pres': imprimirPresupuesto(id, ac.dataset.importes); return;
        case 'ver-cert': verCert(id); return;
        case 'anular-cert': {
          const c = M.cert(id); if (M.cobrosDe(c.id).some((x) => !x.anulado)) { toast('Tiene cobros: primero hay que anularlos.', 'warning'); return; }
          confirmar('Anular ' + certNombre(c), 'Se anula y el avance que tenía vuelve a quedar pendiente. Queda en la historia como anulado.', 'Anular certificado', () => { if (c.fe) { const cg = M.cargo(c.id); const nc = nuevoFE(DB, c.comp, hoy()); M.MON.forEach((k) => { if (!cg.importes[k]) return; DB.notasCredito.push({ fecha: c.fecha, obra: c.obra, tipo: 'Factura ' + c.comp, numero: c.fe.pv + '-' + c.fe.nro, cae: c.fe.cae, vto: c.fe.vto, mon: k, neto: r2(cg.importes[k] - cg.iva[k]), iva: cg.iva[k], total: cg.importes[k], concepto: certNombre(c), estado: 'Anulada' }); DB.notasCredito.push({ fecha: hoy(), obra: c.obra, tipo: 'Nota de crédito ' + c.comp, numero: nc.pv + '-' + nc.nro, cae: nc.cae, vto: nc.vto, mon: k, neto: -r2(cg.importes[k] - cg.iva[k]), iva: -cg.iva[k], total: -cg.importes[k], concepto: 'Anula ' + certNombre(c) }); }); } c.estado = 'anulado'; c.anulado = creado(); log('Anuló el certificado N° ' + c.num, c.obra); guardar(); cerrarDrawer(); render(); toast('Certificado anulado.'); }, true); return;
        }
        case 'ver-completos': UI.verCompletos = !UI.verCompletos; render(); return;
        case 'agregar-ed': UI.certDraft.ed.push({ id: nid('ed'), tipo: 'demasia', desc: '', cant: 1, mo: 0, mat: 0, precio: 0, costo: 0, prov: '', mon: 'ARS' }); setHTML($('#ce-ed'), edHtml(UI.certDraft)); refrescarCert(); return;
        case 'quitar-ed': UI.certDraft.ed.splice(Number(ac.dataset.i), 1); setHTML($('#ce-ed'), edHtml(UI.certDraft)); refrescarCert(); return;
        case 'guardar-cert': { const c = persistirCert('borrador'); location.hash = '#/obra/' + c.obra + '/certificados'; toast('Borrador guardado. ' + (puede('emitir') ? 'Emitilo cuando esté revisado.' : 'Lo revisa y emite Administración.')); return; }
        case 'emitir-cert': {
          const d = UI.certDraft; const o = M.obra(d.obra); const cli = M.cliente(o.cliente); const letra = cli.iva === 'Responsable inscripto' ? 'A' : 'B';
          if (M.erroresCert(d).length) return;
          abrirModal(cabModal('Emitir certificado N° ' + d.num) + '<div class="m-b"><p>Queda con fecha fija y entra a la cuenta de ' + esc(cli.razon) + '. ¿Con qué comprobante?</p><div class="chips" id="em-comp"><button type="button" class="chip" data-comp="' + letra + '" aria-pressed="true">Factura ' + letra + '</button>' + (puede('sin') ? '<button type="button" class="chip" data-comp="sin" aria-pressed="false">Sin factura</button>' : '') + '</div><p class="tenue">La factura electrónica sale de ARCA en la etapa de integración. En esta maqueta se registra el comprobante.</p></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="em-ok">' + ic('seal-check') + 'Emitir</button></div>', (m) => {
            let comp = letra; $('#em-comp', m).addEventListener('click', (ev) => { const b = ev.target.closest('[data-comp]'); if (!b) return; comp = b.dataset.comp; $$('[data-comp]', m).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
            $('#em-ok', m).addEventListener('click', () => { const c = persistirCert('emitido', comp); cerrarModal(); location.hash = '#/obra/' + c.obra + '/certificados'; setTimeout(() => verCert(c.id), 60); toast(c.fe ? 'Factura ' + c.comp + ' ' + c.fe.pv + '-' + c.fe.nro + ' autorizada por ARCA (simulado). CAE ' + c.fe.cae + '.' : 'Certificado emitido y cargado en la cuenta del cliente.', 'seal-check'); });
          }); return;
        }
        case 'nuevo-cobro': modalCobro(ac.dataset.obra, ac.dataset.cargo); return;
        case 'nuevo-pago': modalPago(ac.dataset.obra, ac.dataset.prov); return;
        case 'anular-pago': {
          const p = DB.pagos.find((x) => x.id === id);
          confirmar('Anular pago', 'El pago de ' + fmt(p.importe, p.mon) + ' a ' + M.prov(p.prov).razon + ' deja de contar en todos lados (saldo del proveedor, costo de la obra). Queda visible como anulado.' + (p.medio === 'cheque-tercero' ? ' El cheque endosado vuelve a cartera.' : p.medio === 'cheque-propio' ? ' El cheque propio queda anulado.' : ''), 'Anular pago', () => {
            p.anulado = creado(); const ch = p.cheque ? M.cheque(p.cheque) : null; if (ch) ch.estado = p.medio === 'cheque-tercero' ? 'cartera' : 'anulado';
            log('Anuló un pago a ' + M.prov(p.prov).razon + ' por ' + fmt(p.importe, p.mon), p.obra); guardar(); render(); toast('Pago anulado.');
          }, true); return;
        }
        case 'anular-cobro': {
          const c = DB.cobros.find((x) => x.id === id); const ch = c.cheque ? M.cheque(c.cheque) : null;
          if (ch && ch.estado === 'endosado') { toast('Su cheque ya se endosó a un proveedor: primero anulá ese pago.', 'warning'); return; }
          confirmar('Anular cobro', 'El comprobante vuelve a quedar con saldo. Queda visible como anulado.', 'Anular cobro', () => { c.anulado = creado(); if (ch) ch.estado = 'anulado'; log('Anuló un cobro de ' + fmt(c.importe, c.mon), c.obra); guardar(); render(); toast('Cobro anulado.'); }, true); return;
        }
        case 'depositar-cheque': { const c = M.cheque(id); if (M.dias(c.pago) > 0) { toast('Todavía no se puede depositar: es de pago ' + fFecha(c.pago) + '.', 'warning'); return; } c.estado = 'depositado'; c.deposito = hoy(); log('Depositó el cheque ' + c.banco + ' N° ' + c.numero); guardar(); render(); toast('Cheque depositado.'); return; }
        case 'rechazar-cheque': {
          const c = M.cheque(id); const cb = DB.cobros.find((x) => x.cheque === id);
          confirmar('Cheque rechazado', 'El cheque ' + c.banco + ' N° ' + c.numero + ' por ' + fmt(c.importe) + ' pasa a rechazado. ' + (cb ? 'El comprobante que pagaba (' + (M.cargo(cb.cargo) || {}).nombre + ') vuelve a quedar con saldo en la cuenta del cliente, automáticamente.' : ''), 'Marcar rechazado', () => { c.estado = 'rechazado'; c.rechazo = hoy(); log('Marcó rechazado el cheque ' + c.banco + ' N° ' + c.numero, cb ? cb.obra : ''); guardar(); render(); toast('Cheque rechazado. La deuda del cliente se reabrió.', 'warning'); }, true); return;
        }
        case 'nueva-caja': modalCaja(ac.dataset.obra, ac.dataset.tipo); return;
        case 'anular-caja': { const c = DB.caja.find((x) => x.id === id); confirmar('Anular movimiento', 'Deja de contar en el saldo y en el costo de la obra.', 'Anular', () => { c.anulado = creado(); log('Anuló un movimiento de caja chica: ' + c.desc, c.obra); guardar(); render(); }, true); return; }
        case 'nueva-tarea': modalTarea(null, ac.dataset.obra); return;
        case 'editar-tarea': modalTarea(id); return;
        case 'mover-tarea': { const t = DB.tareas.find((x) => x.id === id); const i = COLS.findIndex((c) => c[0] === t.col) + Number(ac.dataset.dir); if (COLS[i]) moverTarea(id, COLS[i][0]); return; }
        case 'subir-doc': toast('En el sistema final se suben planos, fotos y PDF acá (quedan guardados en la obra).', 'upload-simple'); return;
        case 'nuevo-indice': modalIndice(); return;
        case 'nuevo-gasto': modalGasto(); return;
        case 'nuevo-rubro': {
          abrirModal(cabModal('Agregar rubro') + '<div class="m-b"><div class="campo"><label for="ru-n">Nombre</label><input class="input" id="ru-n"></div></div><div class="m-f"><button class="btn" data-accion="cerrar-modal">Cancelar</button><button class="btn primary" id="ru-ok">Guardar</button></div>', (m) => {
            $('#ru-ok', m).addEventListener('click', () => { const n = val(m, '#ru-n'); if (!mostrarErrores(m, n ? (DB.rubros.some((r) => sinAcentos(r.nombre) === sinAcentos(n)) ? ['ese rubro ya existe'] : []) : ['nombre'])) return; DB.rubros.push({ id: nid('r'), num: String(DB.rubros.length + 1), nombre: n }); guardar(); cerrarModal(); render(); toast('Rubro agregado.'); });
          }); return;
        }
        case 'guardar-config': {
          const h = parseNum($('#cf-hon').value), s = parseNum($('#cf-split').value), iva = parseNum($('#cf-iva').value), tc = parseNum($('#cf-tc').value);
          if (![h, s, iva, tc].every((x) => Number.isFinite(x) && x >= 0) || h > 100 || s > 100) { toast('Revisá los valores: números entre 0 y 100.', 'warning'); return; }
          Object.assign(DB.config, { honorarios: h, splitMO: s, iva, tcRef: tc }); log('Cambió los valores por defecto'); guardar(); render(); toast('Guardado. Aplica a obras nuevas.'); return;
        }
        case 'restablecer': confirmar('Restablecer datos de ejemplo', 'Se borra todo lo cargado en esta maqueta y vuelve la base de ejemplo.', 'Restablecer', () => { DB = normalizar(window.MOMO_SEED()); M.usar(DB); M.resolverAutos(); guardar(); location.hash = '#/inicio'; render(true); toast('Base de ejemplo restablecida.'); }, true); return;
      }
    }
    if (ir && !e.target.closest('a[href], button')) { location.hash = ir.dataset.ir; }
  });

  /* inputs del editor de certificado y filtros */
  let tBusq;
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.pct && UI.certDraft) { const v = t.value.trim() === '' ? 0 : parseNum(t.value); UI.certDraft.avances[t.dataset.pct] = Number.isFinite(v) ? v : 0; t.classList.toggle('invalido', !Number.isFinite(v)); refrescarCert(); return; }
    if (t.dataset.edc && UI.certDraft) { const k = Number(t.closest('[data-ed]').dataset.ed); const campo = t.dataset.edc; const e2 = UI.certDraft.ed[k]; e2[campo] = ['cant', 'precio', 'costo', 'mo', 'mat'].includes(campo) ? (parseNum(t.value) || 0) : t.value; if (campo === 'mo' || campo === 'mat') e2.precio = r2((e2.mo || 0) + (e2.mat || 0)); const tt = $('[data-edtot="' + k + '"]'); if (tt) setHTML(tt, 'Precio unitario al cliente: <b>' + esc(fmt(e2.precio, e2.mon)) + '</b> · total ' + esc(fmt(e2.precio * e2.cant, e2.mon))); refrescarCert(); return; }
    const deb = (fn) => { clearTimeout(tBusq); tBusq = setTimeout(() => { const id = t.id; const pos = t.selectionStart; fn(); const el = document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) { /* nada */ } } }, 160); };
    if (t.id === 'f-obras-q') deb(() => { UI.obras.q = t.value; render(); });
    if (t.id === 'f-clientes-q') deb(() => { UI.clientes.q = t.value; render(); });
    if (t.id === 'f-prov-q') deb(() => { UI.proveedores.q = t.value; render(); });
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'ver-como' || t.id === 'ver-como-2') { UI.usuario = t.value; $('#app').classList.remove('menu-abierto'); pintarVerComo(); try { localStorage.setItem('momo-usuario', t.value); } catch (er) { /* nada */ } cerrarDrawer(); render(true); toast('Viendo el sistema como ' + yo().nombre + ' (' + PERFIL_TXT[perfil()] + ').', 'user'); return; }
    if (t.id === 'ce-fecha' && UI.certDraft) { UI.certDraft.fecha = t.value; refrescarCert(); return; }
    if (t.id === 'ce-mes' && UI.certDraft) { UI.certDraft.mesCAC = t.value; refrescarCert(); return; }
    if (t.dataset.edc && t.tagName === 'SELECT' && UI.certDraft) { const k = Number(t.closest('[data-ed]').dataset.ed); UI.certDraft.ed[k][t.dataset.edc] = t.value; refrescarCert(); return; }
    if (t.id === 'f-tareas-obra') { UI.tareas.obra = t.value; render(); return; }
    if (t.id === 'f-prov-rubro') { UI.proveedores.rubro = t.value; render(); return; }
    if (t.id === 'f-anulados') { UI.teso.anulados = t.checked; render(); return; }
  });
  document.addEventListener('focusout', (e) => { const t = e.target; if ((t.dataset.pct || ['cant', 'precio', 'costo', 'mo', 'mat'].includes(t.dataset.edc)) && t.value.trim() !== '') { const v = parseNum(t.value); if (Number.isFinite(v)) t.value = fmtInput(v); } });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#paleta-wrap').classList.contains('abierto')) cerrarPaleta(); else abrirPaleta(); return; }
    if (e.key === 'Escape' && $('#paleta-wrap').classList.contains('abierto')) { cerrarPaleta(); return; }
    if (e.key === 'Escape') { if ($('#modal-wrap').classList.contains('abierto')) cerrarModal(); else if ($('#drawer-wrap').classList.contains('abierto')) cerrarDrawer(); else $('#app').classList.remove('menu-abierto'); }
    if (e.key === 'Tab' && $('#modal-wrap').classList.contains('abierto')) {
      const f = $$('#modal button, #modal input, #modal select, #modal a[href]').filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('#modal-wrap').addEventListener('mousedown', (e) => { if (e.target.id === 'modal-wrap') cerrarModal(); });
  window.addEventListener('hashchange', () => { cerrarDrawer(); cerrarModal(); cerrarPaleta(); $('#app').classList.remove('menu-abierto'); render(true); });

  cargar();
  if (!M.usuario(UI.usuario)) UI.usuario = 'u1';
  pintarVerComo();
  render(true);
})();

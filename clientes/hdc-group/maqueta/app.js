/* Maqueta Argos para HDC Group.
   Sistema navegable con base propia en el navegador (localStorage). Sin integraciones reales:
   lo que en el sistema final entra por Mercado Libre, Mercado Pago, Tiendanube, ARCA o los bancos
   acá viene en la base de ejemplo o se simula al guardar. */
(function () {
  'use strict';

  /* ================= utilidades ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const setHTML = (el, html) => el.replaceChildren(document.createRange().createContextualFragment(html));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const fmt = (n, dec) => { const d = dec == null ? 2 : dec; const v = Number(n || 0); return (v < 0 ? '-$ ' : '$ ') + Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const fmt0 = (n) => fmt(n, 0);
  const fmtM = (n) => { const v = Number(n || 0); if (Math.abs(v) < 1e6) return Math.abs(v) < 1000 ? fmt0(v) : (v < 0 ? '-$ ' : '$ ') + Math.round(Math.abs(v) / 1000).toLocaleString('es-AR') + ' mil'; return (v < 0 ? '-$ ' : '$ ') + (Math.abs(v) / 1e6).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'; };
  const D = (x) => new Date(x);
  const fFecha = (x) => x ? D(x).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
  const fFechaHora = (x) => x ? fFecha(x) + ' ' + D(x).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const fDiaLargo = (x) => D(x).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const coincide = (txt, q) => { if (!q) return true; const t = sinAcentos(txt); return q.split(/\s+/).filter(Boolean).every((w) => t.includes(w)); };
  const NUM_RE = /^-?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;
  const parseNum = (s) => {
    if (typeof s === 'number') return s;
    const t = String(s || '').replace(/\$|\s/g, '');
    if (!t || !NUM_RE.test(t)) return NaN;
    return Number(t.replace(/\./g, '').replace(',', '.'));
  };
  const fmtInput = (n) => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esMovil = () => window.matchMedia('(max-width: 640px)').matches;
  const cuitValido = (c) => {
    const d = String(c).replace(/\D/g, '');
    if (d.length !== 11) return false;
    const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * m[i];
    let v = 11 - (s % 11); if (v === 11) v = 0; if (v === 10) v = 9;
    return v === Number(d[10]);
  };

  /* ================= base de datos ================= */
  const KEY = 'hdc-argos-maqueta-v5';
  const HOY = window.HDC_HOY;
  let DB;
  function cargar() {
    try { const s = localStorage.getItem(KEY); if (s) { DB = JSON.parse(s); if (DB && DB.version === 5) return; } } catch (e) { /* base nueva */ }
    DB = window.HDC_SEED(); guardar();
  }
  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('No se pudo guardar en este navegador. Los cambios se pierden al cerrar.'); }
  }
  function ahora() {
    DB.contadores.reloj = (DB.contadores.reloj || HOY.getTime()) + 60000;
    return new Date(DB.contadores.reloj).toISOString();
  }
  const canal = (id) => DB.canales.find((c) => c.id === id);
  const caja = (id) => DB.cajas.find((c) => c.id === id);
  const cliente = (id) => DB.clientes.find((c) => c.id === id);
  const proveedor = (id) => DB.proveedores.find((p) => p.id === id);
  const producto = (id) => DB.productos.find((p) => p.id === id);
  const venta = (id) => DB.ventas.find((v) => v.id === Number(id));

  /* ================= cálculos de venta ================= */
  const esVenta = (v) => v.version !== 'Cotización';
  const anulada = (v) => v.estado === 'Anulada';
  const cobrado = (v) => anulada(v) ? 0 : r2(v.cobros.reduce((s, c) => s + c.monto, 0));
  const saldoVenta = (v) => anulada(v) || !esVenta(v) ? 0 : r2(Math.max(0, v.total - cobrado(v)));
  const deducciones = (v) => { if (anulada(v)) return 0; const a = v.acred || {}; return r2((a.comision || 0) + (a.envio || 0) + (a.retencion || 0) + (a.cuotas || 0)); };
  const netoVenta = (v) => anulada(v) ? 0 : r2(cobrado(v) - deducciones(v));
  const pendienteCanal = (v) => v.acred && (v.acred.estado === 'A liberar' || v.acred.estado === 'A liquidar');
  function acreditadoVenta(v) {
    if (anulada(v) || pendienteCanal(v)) return 0;
    const acc = v.cobros.reduce((s, c) => s + (c.caja === 'cheques' && !c.depositado ? 0 : c.monto), 0);
    return r2(Math.max(0, acc - deducciones(v)));
  }
  function estadoCobro(v) {
    if (anulada(v)) return 'Devuelta';
    if (!esVenta(v)) return 'Cotización';
    const s = saldoVenta(v);
    if (s <= 0.009) return 'Cobrada';
    return cobrado(v) > 0 ? 'Parcial' : 'A cobrar';
  }
  function estadoAcred(v) {
    if (anulada(v)) return 'Devuelta';
    if (!esVenta(v)) return '';
    if (pendienteCanal(v)) return v.acred.estado;
    if (v.cobros.some((c) => c.caja === 'cheques' && !c.depositado)) return 'Cheque en cartera';
    if (saldoVenta(v) > 0.009) return 'Cuenta corriente';
    return 'Acreditada';
  }
  const badgeCobro = (e) => ({ Cobrada: 'b-ok', Parcial: 'b-warn', 'A cobrar': 'b-warn', Devuelta: 'b-bad', 'Cotización': 'b-neutro' }[e] || 'b-neutro');
  const badgeAcred = (e) => ({ Acreditada: 'b-ok', 'A liberar': 'b-info', 'A liquidar': 'b-info', 'Cheque en cartera': 'b-info', 'Cuenta corriente': 'b-warn', Devuelta: 'b-bad' }[e] || 'b-neutro');
  const iconoAcred = (e) => ({ Acreditada: 'ph-check-circle', 'A liberar': 'ph-hourglass-medium', 'A liquidar': 'ph-hourglass-medium', 'Cheque en cartera': 'ph-money', 'Cuenta corriente': 'ph-clock', Devuelta: 'ph-arrow-u-up-left' }[e] || 'ph-dot');
  const L = 'assets/logos/';
  const MARCAS = {
    ml: { img: L + 'mercadolibre.svg', alt: 'Mercado Libre', clase: 'm-ml' },
    tn: { img: L + 'tiendanube.png', alt: 'Tiendanube' },
    fravega: { img: L + 'fravega.png', alt: 'Frávega' },
    mp: { img: L + 'mercadopago.svg', alt: 'Mercado Pago' },
    pagonube: { img: L + 'tiendanube.png', alt: 'Pago Nube' },
    marketplaces: { img: L + 'fravega.png', alt: 'Frávega' },
    credicoop: { img: L + 'credicoop.svg', alt: 'Banco Credicoop', lleno: true },
    santander: { img: L + 'santander.png', alt: 'Banco Santander' },
    macro: { img: L + 'macro.png', alt: 'Banco Macro' },
    bancos: { ic: 'ph-bank', tono: 't-azul' },
    tiendasbancos: { ic: 'ph-bank', tono: 't-azul' },
    mayorista: { ic: 'ph-buildings', tono: 't-pizarra' },
    mostrador: { ic: 'ph-storefront', tono: 't-verde' },
    cheques: { ic: 'ph-money-wavy', tono: 't-ambar' },
    efectivo: { ic: 'ph-coins', tono: 't-verde' }
  };
  const marca = (key, tam) => {
    const m = MARCAS[key];
    if (!m) return '<span class="marca ico ' + (tam || '') + '"><i class="ph ph-circle"></i></span>';
    if (m.img) return '<span class="marca ' + (m.clase ? m.clase + ' ' : '') + (m.lleno ? 'lleno ' : '') + (tam || '') + '"><img src="' + m.img + '" alt="" loading="lazy" decoding="async"></span>';
    return '<span class="marca ico ' + m.tono + ' ' + (tam || '') + '"><i class="ph-duotone ' + m.ic + '"></i></span>';
  };
  const chipCanal = (id) => { const c = canal(id); return c ? '<span class="canal">' + marca(c.id) + esc(c.nombre) + '</span>' : ''; };
  const compTxt = (v) => v.comp.pv ? v.comp.tipo + ' ' + v.comp.pv + '-' + v.comp.nro : v.comp.tipo + ' ' + v.comp.nro;

  function enPeriodo(x, p) {
    const d = D(x);
    return d >= p.desde && d <= p.hasta;
  }
  const PERIODOS = {
    hoy: { nombre: 'Hoy', desde: new Date(2026, 9, 9), hasta: new Date(2026, 9, 9, 23, 59, 59), texto: 'Viernes 9 de octubre' },
    semana: { nombre: 'Esta semana', desde: new Date(2026, 9, 5), hasta: new Date(2026, 9, 9, 23, 59, 59), texto: 'Del lunes 5 al viernes 9 de octubre' },
    mes: { nombre: 'Octubre', desde: new Date(2026, 9, 1), hasta: new Date(2026, 9, 31, 23, 59, 59), texto: 'Octubre, del 1 al 9' }
  };

  function resumen(ventas) {
    const r = { n: 0, bruto: 0, anuladas: 0, ctacte: 0, cobrado: 0, comision: 0, envio: 0, retencion: 0, cuotas: 0, transito: 0, acreditado: 0 };
    for (const v of ventas) {
      if (!esVenta(v)) continue;
      r.bruto += v.total;
      if (anulada(v)) { r.anuladas += v.total; continue; }
      r.n++;
      const a = v.acred || {};
      r.ctacte += saldoVenta(v); r.cobrado += cobrado(v);
      r.comision += a.comision || 0; r.envio += a.envio || 0; r.retencion += a.retencion || 0; r.cuotas += a.cuotas || 0;
      const ac = acreditadoVenta(v); r.acreditado += ac; r.transito += netoVenta(v) - ac;
    }
    Object.keys(r).forEach((k) => { r[k] = r2(r[k]); });
    r.vendido = r2(r.bruto - r.anuladas);
    r.descuentos = r2(r.comision + r.envio + r.retencion + r.cuotas);
    r.sinExplicar = r2(r.bruto - r.anuladas - r.ctacte - r.descuentos - r.transito - r.acreditado);
    return r;
  }

  /* ================= cajas ================= */
  function movimientosCaja(id) {
    const out = [];
    for (const v of DB.ventas) {
      if (anulada(v)) continue;
      const ded = deducciones(v);
      v.cobros.forEach((c, i) => {
        if (c.caja !== id) return;
        const neto = r2(c.monto - (i === 0 ? ded : 0));
        const pend = pendienteCanal(v);
        out.push({ fecha: pend ? c.fecha : (v.acred && v.acred.estado === 'Acreditada' && c.automatico ? v.acred.fecha : c.fecha), concepto: (c.automatico ? 'Liquidación venta ' : 'Cobro venta ') + v.id, detalle: cliente(v.clienteId).nombre, monto: neto, pendiente: pend, ventaId: v.id, cheque: c.cheque && !c.depositado ? c.cheque : null });
      });
    }
    for (const p of DB.proveedores) for (const m of p.movs) if (m.tipo === 'pago' && m.caja === id) out.push({ fecha: m.fecha, concepto: m.comp, detalle: p.nombre, monto: -r2(m.monto - (m.retenciones || 0)), proveedorId: p.id });
    for (const m of DB.movsCaja) {
      if (m.desde === id) out.push({ fecha: m.fecha, concepto: m.tipo === 'transferencia' ? 'Transferencia a ' + caja(m.hacia).nombre : m.concepto, detalle: m.detalle || '', monto: -m.monto });
      if (m.hacia === id) out.push({ fecha: m.fecha, concepto: m.tipo === 'transferencia' ? 'Transferencia desde ' + caja(m.desde).nombre : m.concepto, detalle: m.detalle || '', monto: m.monto });
    }
    return out.sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  }
  function saldoCaja(id) {
    const c = caja(id);
    const movs = movimientosCaja(id);
    const saldo = r2(c.inicial + movs.filter((m) => !m.pendiente).reduce((s, m) => s + m.monto, 0));
    const pendiente = r2(movs.filter((m) => m.pendiente).reduce((s, m) => s + m.monto, 0));
    const fuente = r2(saldo + (c.difExtracto || 0));
    return { saldo, pendiente, fuente, conciliado: Math.abs(fuente - saldo) < 0.01, movs };
  }

  /* ================= proveedores ================= */
  function ctaProveedor(p) {
    const facs = p.movs.filter((m) => m.tipo === 'factura');
    const pagado = (f) => r2(p.movs.filter((m) => m.tipo === 'pago' && m.aplicaA === f.id).reduce((s, m) => s + m.monto, 0));
    const pend = facs.map((f) => ({ ...f, saldo: r2(f.monto - pagado(f)) })).filter((f) => f.saldo > 0.009);
    const saldo = r2(pend.reduce((s, f) => s + f.saldo, 0));
    const prox = pend.slice().sort((a, b) => a.vence < b.vence ? -1 : 1)[0];
    return { pend, saldo, prox };
  }
  const diasA = (x) => Math.floor((D(x) - new Date(2026, 9, 9)) / 864e5);
  function badgeVence(x) {
    if (!x) return '<span class="badge b-neutro">Sin deuda</span>';
    const d = diasA(x);
    if (d < 0) return '<span class="badge b-bad"><i class="ph ph-warning"></i>Vencida ' + fFecha(x) + '</span>';
    if (d <= 7) return '<span class="badge b-warn">Vence ' + fFecha(x) + '</span>';
    return '<span class="badge b-neutro">Vence ' + fFecha(x) + '</span>';
  }

  /* ================= clientes ================= */
  function ctaCliente(c) {
    const vs = DB.ventas.filter((v) => v.clienteId === c.id && esVenta(v));
    const movs = [];
    vs.forEach((v) => {
      movs.push({ fecha: v.fecha, comp: compTxt(v), debe: v.total, haber: 0, ventaId: v.id });
      if (anulada(v) && v.nc) movs.push({ fecha: v.nc.fecha, comp: v.nc.tipo + ' ' + v.nc.pv + '-' + v.nc.nro, debe: 0, haber: v.total, ventaId: v.id });
      else v.cobros.forEach((cb) => movs.push({ fecha: cb.fecha, comp: 'Recibo ' + String(cb.nro).padStart(8, '0') + ' · ' + cb.medio, debe: 0, haber: cb.monto, ventaId: v.id }));
    });
    movs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    let s = 0; movs.forEach((m) => { s = r2(s + m.debe - m.haber); m.saldo = s; });
    const total = r2(vs.filter((v) => !anulada(v)).reduce((a, v) => a + v.total, 0));
    const ultima = vs.length ? vs.reduce((a, v) => v.fecha > a ? v.fecha : a, '') : null;
    return { movs, saldo: r2(vs.reduce((a, v) => a + saldoVenta(v), 0)), total, compras: vs.filter((v) => !anulada(v)).length, ultima };
  }

  /* ================= UI general ================= */
  const UI = { periodo: 'mes', ventas: { tab: 'todas', canal: '', q: '', desde: '', hasta: '', limite: 60 }, clientes: { tab: 'todos', q: '', conSaldo: false, limite: 60 }, proveedores: { tab: 'Proveedor', q: '' }, productos: { q: '', rubro: '' } };
  let toastT;
  function toast(msg, ic) {
    const t = $('#toast'); setHTML(t, '<i class="ph-fill ' + (ic || 'ph-check-circle') + '"></i><span>' + esc(msg) + '</span>'); t.classList.add('visible');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('visible'), 3600);
  }

  const NAV = [
    { grupo: null, items: [['inicio', 'Panel general', 'ph-squares-four']] },
    { grupo: 'Canales', items: [['ventas?canal=ml', 'Mercado Libre', 'ph-storefront', 'ml'], ['ventas?canal=tn', 'Tiendanube', 'ph-shopping-bag', 'tn'], ['ventas?canal=fravega,bancos', 'Frávega y bancos', 'ph-buildings', 'fravega'], ['cajas?caja=mp', 'Mercado Pago', 'ph-wallet', 'mp']] },
    { grupo: 'Ventas', items: [['ventas', 'Centro de ventas', 'ph-receipt'], ['clientes', 'Clientes', 'ph-users']] },
    { grupo: 'Compras', items: [['proveedores', 'Proveedores y gastos', 'ph-truck']] },
    { grupo: 'Productos', items: [['productos', 'Productos y stock', 'ph-package']] },
    { grupo: 'Tesorería', items: [['cajas', 'Cajas y bancos', 'ph-bank']] },
    { grupo: 'Informes', items: [['informes', 'Informes', 'ph-chart-bar']] }
  ];
  function pintarNav() {
    const actual = location.hash.replace(/^#\//, '') || 'inicio';
    const aRemitir = DB.ventas.filter((v) => esVenta(v) && !anulada(v) && !v.remitida).length;
    let html = '';
    NAV.forEach((g) => {
      html += '<div class="nav-grupo">' + (g.grupo ? '<h3>' + esc(g.grupo) + '</h3>' : '');
      g.items.forEach(([ruta, nombre, ic, mk]) => {
        const activo = actual === ruta || (ruta === 'ventas' && actual.startsWith('ventas') && !actual.includes('canal=')) || (ruta === 'informes' && actual.startsWith('informe'));
        const badge = ruta === 'ventas' && aRemitir ? '<span class="badge b-warn">' + aRemitir + '</span>' : '';
        html += '<a href="#/' + ruta + '"' + (activo ? ' aria-current="page"' : '') + '>' + (mk ? marca(mk, 'sm') : '<i class="ph ' + ic + '"></i>') + '<span>' + esc(nombre) + '</span>' + badge + '</a>';
      });
      html += '</div>';
    });
    html += '<div class="nav-grupo"><a href="#/inicio" data-accion="restablecer"><i class="ph ph-arrow-counter-clockwise"></i><span>Restablecer ejemplo</span></a></div>';
    setHTML($('#nav'), html);
  }

  /* ================= router ================= */
  function ruta() {
    const h = location.hash.replace(/^#\//, '') || 'inicio';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    return { partes: path.split('/'), params };
  }
  function render(navegando) {
    const { partes, params } = ruta();
    const vista = $('#vista');
    cerrarMenu();
    const V = { inicio: vInicio, ventas: vVentas, clientes: vClientes, proveedores: vProveedores, cajas: vCajas, productos: vProductos, informes: vInformes, informe: vInforme }[partes[0]] || vInicio;
    if (navegando && partes[0] === 'ventas') {
      UI.ventas.canal = params.get('canal') || '';
      UI.ventas.tab = params.get('tab') || 'todas';
      UI.ventas.q = '';
      const p = PERIODOS[params.get('periodo')];
      UI.ventas.desde = p ? toISODate(p.desde) : '';
      UI.ventas.hasta = p ? toISODate(p.hasta > HOY ? HOY : p.hasta) : '';
      UI.ventas.limite = 60;
    }
    setHTML(vista, '<div' + (navegando ? ' class="entra"' : '') + '>' + V(partes, params) + '</div>');
    pintarNav();
    indicadores();
    if (partes[0] === 'inicio' || !partes[0]) { montarPuente(); if (UI.animar) contar(); }
    UI.animar = false;
    if (navegando && partes[0] === 'cajas' && params.get('caja')) { abrirCaja(params.get('caja')); history.replaceState(null, '', '#/cajas'); }
    if (navegando) { vista.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  const toISODate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  /* ================= INICIO: panel general ================= */
  function vInicio() {
    const p = PERIODOS[UI.periodo];
    const vs = DB.ventas.filter((v) => enPeriodo(v.fecha, p));
    const R = resumen(vs);
    const DIAS = Array.from({ length: 9 }, (_, i) => resumen(DB.ventas.filter((v) => { const d = D(v.fecha); return d.getMonth() === 9 && d.getDate() === i + 1; })));
    const pct = R.vendido ? Math.round(R.cobrado / R.vendido * 1000) / 10 : 0;
    const seg = Object.entries(PERIODOS).map(([k, v]) => '<button type="button" data-accion="periodo" data-periodo="' + k + '" aria-pressed="' + (UI.periodo === k) + '">' + v.nombre + '</button>').join('');

    const porCanal = DB.canales.map((c) => ({ c, r: resumen(vs.filter((v) => v.canal === c.id)) })).filter((x) => x.r.bruto > 0);
    const filasCanal = porCanal.map(({ c, r }) => '<tr class="clic" data-ir="ventas?canal=' + c.id + '&periodo=' + UI.periodo + '"><td>' + chipCanal(c.id) + '</td><td class="num">' + r.n + '</td><td class="num">' + fmtM(r.vendido) + '</td><td class="num">' + fmtM(r.cobrado) + '</td><td class="num">' + fmtM(r.descuentos) + '</td><td class="num">' + fmtM(r.transito) + '</td><td class="num"><b>' + fmtM(r.acreditado) + '</b></td></tr>').join('');

    /* para revisar */
    const aRemitir = DB.ventas.filter((v) => esVenta(v) && !anulada(v) && !v.remitida);
    const ctacte = DB.ventas.filter((v) => saldoVenta(v) > 0.009);
    const aLiquidar = DB.ventas.filter((v) => !anulada(v) && v.acred && v.acred.estado === 'A liquidar');
    const cheques = DB.ventas.flatMap((v) => anulada(v) ? [] : v.cobros.filter((c) => c.cheque && !c.depositado).map((c) => ({ v, c })));
    const chq7 = cheques.filter(({ c }) => diasA(c.cheque.vence) <= 30);
    const provVence = DB.proveedores.map((x) => ({ x, cta: ctaProveedor(x) })).filter(({ cta }) => cta.prox && diasA(cta.prox.vence) <= 7);
    const sinConciliar = DB.cajas.filter((c) => (c.difExtracto || 0) !== 0);
    const alertas = [
      aRemitir.length && ['ph-package', 'b-warn', aRemitir.length + ' ventas para remitir', 'Pagadas y sin remito todavía', 'ventas?tab=remitir'],
      ctacte.length && ['ph-clock', 'b-warn', fmt0(ctacte.reduce((s, v) => s + saldoVenta(v), 0)) + ' a cobrar a mayoristas', ctacte.length + ' ventas en cuenta corriente', 'ventas?tab=nocobradas'],
      aLiquidar.length && ['ph-hourglass-medium', 'b-info', fmt0(aLiquidar.reduce((s, v) => s + netoVenta(v), 0)) + ' a liquidar por Frávega y bancos', aLiquidar.length + ' ventas cobradas por ellos, todavía sin depositar', 'ventas?tab=transito&canal=fravega,bancos'],
      chq7.length && ['ph-money', 'b-info', chq7.length + ' cheques para depositar este mes', fmt0(chq7.reduce((s, x) => s + x.c.monto, 0)) + ' en cartera', 'cajas?caja=cheques'],
      provVence.length && ['ph-truck', 'b-warn', provVence.length + ' pagos a proveedores vencen esta semana', fmt0(provVence.reduce((s, x) => s + x.cta.saldo, 0)) + ' en total', 'proveedores'],
      sinConciliar.length && ['ph-bank', 'b-bad', sinConciliar[0].nombre + ': 1 movimiento del extracto sin cargar', 'El saldo del sistema no coincide con el banco', 'cajas?caja=' + sinConciliar[0].id]
    ].filter(Boolean);
    const listaAlertas = alertas.map(([ic, b, t, s, ir]) => '<li><span class="badge ' + b + '" style="width:30px;justify-content:center;padding:0"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div><button type="button" class="btn sm" data-ir="' + ir + '">Ver</button></li>').join('');

    const tesoro = DB.cajas.filter((c) => c.tipo !== 'a-liquidar').map((c) => { const s = saldoCaja(c.id); return '<div class="n">' + marca(c.id, 'sm') + '<span>' + esc(c.nombre) + '</span>' + (s.conciliado ? '' : ' <span class="badge b-bad">Revisar</span>') + '</div><div class="num">' + fmt0(s.saldo) + '</div>'; }).join('');

    return '' +
      '<div class="encabezado"><div><h1>Panel general</h1><p>' + esc(p.texto) + '</p></div><div class="acciones"><div class="segmentado" role="group" aria-label="Período">' + seg + '</div></div></div>' +
      '<div class="kpis">' +
        kpi('ph-receipt', 'Vendido', fmtM(R.vendido), R.n + ' ventas', false, DIAS.map((d) => d.vendido), R.vendido) +
        kpi('ph-hand-coins', 'Cobrado', fmtM(R.cobrado), pct.toLocaleString('es-AR') + '% de lo vendido', false, DIAS.map((d) => d.cobrado), R.cobrado) +
        kpi('ph-bank', 'Acreditado en cuentas', fmtM(R.acreditado), 'Neto de comisiones y retenciones', true, DIAS.map((d) => d.acreditado), R.acreditado) +
        kpi('ph-hourglass-medium', 'Por entrar', fmtM(R.ctacte + R.transito), 'Cuenta corriente y en tránsito', false, DIAS.map((d) => d.ctacte + d.transito), r2(R.ctacte + R.transito)) +
      '</div>' +
      '<div class="grilla-2">' +
        '<div class="pila">' +
          '<section class="card"><div class="card-h"><h2>De lo vendido a lo acreditado</h2><span class="sub">Cada peso, con su motivo</span></div><div class="card-b">' +
          '<div class="puente" id="puente"></div>' +
          '<div class="leyenda"><span><i class="sw" style="background:var(--accent)"></i>Totales</span><span><i class="sw" style="background:var(--minus)"></i>Lo que se descuenta</span><span><i class="sw" style="background:var(--minus);opacity:.45"></i>Todavía no entró</span></div>' +
          '<div class="cierre"><i class="ph-fill ph-check-circle"></i><span>Diferencia sin explicar entre vendido y acreditado</span><span class="num">' + fmt(R.sinExplicar) + '</span></div>' +
        '</div></section>' +
          '<section class="card"><div class="card-h"><h2>Por canal</h2><span class="sub">Tocá un canal para ver sus ventas</span></div><div class="card-b" style="padding:12px 0 0"><div class="tabla-wrap"><table class="compacta"><thead><tr><th>Canal</th><th class="num">Ventas</th><th class="num">Vendido</th><th class="num">Cobrado</th><th class="num" title="Comisiones, envíos, retenciones y costo de cuotas">Descuentos</th><th class="num">En tránsito</th><th class="num">Acreditado</th></tr></thead><tbody>' + filasCanal + '</tbody><tfoot><tr><td>Total</td><td class="num">' + R.n + '</td><td class="num">' + fmtM(R.vendido) + '</td><td class="num">' + fmtM(R.cobrado) + '</td><td class="num">' + fmtM(R.descuentos) + '</td><td class="num">' + fmtM(R.transito) + '</td><td class="num">' + fmtM(R.acreditado) + '</td></tr></tfoot></table></div></div></section>' +
        '</div>' +
        '<div class="pila">' +
          '<section class="card"><div class="card-h"><h2>Para revisar</h2></div><div class="card-b">' + (listaAlertas ? '<ul class="alertas">' + listaAlertas + '</ul>' : '<div class="vacio-estado"><i class="ph ph-check-circle"></i><p>Nada pendiente.</p></div>') + '</div></section>' +
          '<section class="card"><div class="card-h"><h2>Tesorería</h2><a class="der btn sm" href="#/cajas">Ver cajas</a></div><div class="card-b"><div class="mini-cajas">' + tesoro + '</div></div></section>' +
        '</div>' +
      '</div>';
  }
  const kpi = (ic, l, v, s, dest, serie, valor) => '<div class="kpi' + (dest ? ' destacado' : '') + '"><div class="k-l"><span class="k-ic"><i class="ph ' + ic + '"></i></span>' + esc(l) + '</div><div class="k-v"' + (valor != null ? ' data-valor="' + valor + '"' : '') + '>' + esc(v) + '</div><div class="k-s">' + esc(s) + '</div>' + (serie ? sparkline(serie) : '') + '</div>';
  function sparkline(serie) {
    const max = Math.max.apply(null, serie) || 1, n = serie.length;
    const pts = serie.map((v, i) => [(i / (n - 1)) * 100, 26 - (v / max) * 22]);
    const linea = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="' + linea + ' L100 28 L0 28 Z"/><path class="linea" d="' + linea + '"/></svg>';
  }
  const iniciales = (n) => String(n).replace(/\b(SRL|SA|SAS)\b/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  const iconoCaja = (t) => ({ billetera: 'ph-wallet', 'a-liquidar': 'ph-hourglass-medium', banco: 'ph-bank', cheques: 'ph-money', efectivo: 'ph-coins' }[t] || 'ph-bank');

  function montarPuente() {
    const cont = $('#puente'); if (!cont) return;
    const p = PERIODOS[UI.periodo];
    const R = resumen(DB.ventas.filter((v) => enPeriodo(v.fecha, p)));
    const pasos = [
      ['Vendido', R.bruto, 'total', 'ventas?periodo=' + UI.periodo],
      ['Anuladas', -R.anuladas, 'resta', 'ventas?tab=anuladas&periodo=' + UI.periodo],
      ['Cta. cte.', -R.ctacte, 'pend', 'ventas?tab=nocobradas&periodo=' + UI.periodo],
      ['Cobrado', R.cobrado, 'total', 'ventas?periodo=' + UI.periodo],
      ['Comisiones', -R.comision, 'resta', 'ventas?periodo=' + UI.periodo],
      ['Envíos', -R.envio, 'resta', 'ventas?periodo=' + UI.periodo],
      ['Retenciones', -R.retencion, 'resta', 'ventas?periodo=' + UI.periodo],
      ['Cuotas', -R.cuotas, 'resta', 'ventas?periodo=' + UI.periodo],
      ['En tránsito', -R.transito, 'pend', 'ventas?tab=transito&periodo=' + UI.periodo],
      ['Acreditado', R.acreditado, 'total', 'ventas?periodo=' + UI.periodo]
    ];
    const W = 760, Hh = 280, top = 28, base = 236, n = pasos.length, gap = 14;
    const bw = (W - gap * (n - 1)) / n;
    const max = R.bruto || 1;
    const y = (v) => base - (v / max) * (base - top);
    let nivel = 0, svg = '';
    svg += '<line class="eje" x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>';
    pasos.forEach(([lab, val, tipo, ir], i) => {
      const x = i * (bw + gap);
      let y1, y2;
      if (tipo === 'total') { y1 = y(val); y2 = base; nivel = val; }
      else { y1 = y(nivel); y2 = y(nivel + val); nivel = nivel + val; }
      const yt = Math.min(y1, y2), h = Math.max(2, Math.abs(y2 - y1));
      if (i > 0) svg += '<line class="conector" x1="' + (x - gap) + '" x2="' + x + '" y1="' + y(tipo === 'total' ? val : nivel - val) + '" y2="' + y(tipo === 'total' ? val : nivel - val) + '"/>';
      svg += '<rect class="barra ' + tipo + '" x="' + x.toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" style="--i:' + i + '" data-ir="' + ir + '" data-tip="' + esc(lab) + '|' + esc(fmt0(val)) + '"/>';
      svg += '<text class="val" style="--i:' + i + '" x="' + (x + bw / 2).toFixed(1) + '" y="' + (yt - 7).toFixed(1) + '" text-anchor="middle">' + esc(fmtM(Math.abs(val))) + '</text>';
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (base + 18) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });
    setHTML(cont, '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Puente de vendido a acreditado">' + svg + '</svg><div class="puente-tip" id="puente-tip"></div>');
    const tip = $('#puente-tip');
    cont.addEventListener('pointermove', (e) => {
      const t = e.target.closest('[data-tip]');
      if (!t) { tip.style.opacity = 0; return; }
      const [l, v] = t.getAttribute('data-tip').split('|');
      setHTML(tip, esc(l) + ': <b>' + esc(v) + '</b>');
      const r = cont.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.style.opacity = 1;
    });
    cont.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
  }

  /* ================= VENTAS: centro de ventas ================= */
  const TABS_VENTAS = [
    ['todas', 'Todas', () => true],
    ['remitir', 'A remitir', (v) => !anulada(v) && !v.remitida],
    ['nocobradas', 'No cobradas', (v) => saldoVenta(v) > 0.009],
    ['transito', 'En tránsito', (v) => !anulada(v) && ['A liberar', 'A liquidar', 'Cheque en cartera'].includes(estadoAcred(v))],
    ['anuladas', 'Anuladas', (v) => anulada(v)],
    ['cotizaciones', 'Cotizaciones', (v) => !esVenta(v)]
  ];
  function filtrarVentas(sinTab) {
    const f = UI.ventas;
    const canales = f.canal ? f.canal.split(',') : null;
    const q = sinAcentos(f.q.trim());
    const qNum = parseNum(f.q.trim());
    const desde = f.desde ? new Date(f.desde + 'T00:00:00') : null;
    const hasta = f.hasta ? new Date(f.hasta + 'T23:59:59') : null;
    const tab = TABS_VENTAS.find((t) => t[0] === f.tab) || TABS_VENTAS[0];
    return DB.ventas.filter((v) => {
      if (!sinTab && !tab[2](v)) return false;
      if (sinTab && !esVenta(v)) return false;
      if (f.tab !== 'cotizaciones' && !sinTab && !esVenta(v)) return false;
      if (canales && !canales.includes(v.canal)) return false;
      if (desde && D(v.fecha) < desde) return false;
      if (hasta && D(v.fecha) > hasta) return false;
      if (q) {
        const cli = cliente(v.clienteId);
        const txt = sinAcentos(v.id + ' ' + compTxt(v) + ' ' + cli.nombre + ' ' + cli.doc + ' ' + v.items.map((l) => l.nombre).join(' '));
        if (!coincide(txt, q) && !(Number.isFinite(qNum) && Math.abs(v.total - qNum) < 1)) return false;
      }
      return true;
    }).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  }
  function vVentas() {
    const f = UI.ventas;
    const lista = filtrarVentas();
    const base = filtrarVentas(true);
    const tabs = TABS_VENTAS.map(([id, nom, fn]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-ventas" data-tab="' + id + '">' + nom + ' <span class="cuenta">' + (id === 'cotizaciones' ? DB.ventas.filter((v) => !esVenta(v)).length : base.filter(fn).length) + '</span></button>').join('');
    const opCanal = '<option value="">Todos los canales</option>' + DB.canales.map((c) => '<option value="' + c.id + '"' + (f.canal === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('') + (f.canal && !canal(f.canal) ? '<option value="' + esc(f.canal) + '" selected>Frávega y bancos</option>' : '');
    const R = resumen(lista);
    const filas = lista.slice(0, f.limite).map(filaVenta).join('');
    const titulo = f.canal ? (f.canal.includes(',') ? 'Frávega y tiendas de bancos' : canal(f.canal).nombre) : 'Centro de ventas';
    return '' +
      '<div class="encabezado"><div><h1>' + esc(titulo) + '</h1><p>' + (f.canal ? 'Ventas de este canal, con su cobro y su acreditación' : 'Todas las ventas de todos los canales en un solo lugar') + '</p></div><div class="acciones"><button type="button" class="btn primary" data-accion="nueva-venta" data-version="Oficial"><i class="ph ph-plus"></i>Nueva venta</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="ventas">' + tabs + '</div>' +
      '<div class="toolbar"><div class="filtros">' +
        '<label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-ventas-q" placeholder="Cliente, comprobante, producto o monto" value="' + esc(f.q) + '" aria-label="Buscar ventas"></label>' +
        '<select class="input" id="f-ventas-canal" aria-label="Canal">' + opCanal + '</select>' +
        '<input class="input" type="date" id="f-ventas-desde" value="' + esc(f.desde) + '" aria-label="Desde">' +
        '<input class="input" type="date" id="f-ventas-hasta" value="' + esc(f.hasta) + '" aria-label="Hasta">' +
        (f.q || f.canal || f.desde || f.hasta ? '<button type="button" class="btn ghost" data-accion="limpiar-ventas"><i class="ph ph-x"></i>Limpiar</button>' : '') +
      '</div><div class="acciones"><button type="button" class="btn" data-accion="exportar-ventas"><i class="ph ph-file-xls"></i>Exportar</button></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Comprobante</th><th class="num">Total</th><th>Cobro</th><th>Acreditación</th></tr></thead><tbody>' +
        (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-magnifying-glass"></i><p>No hay ventas con estos filtros.</p></div></td></tr>') +
      '</tbody>' + (lista.length ? '<tfoot><tr><td colspan="5">' + lista.length + ' ventas · cobrado ' + fmt0(R.cobrado) + ' · acreditado ' + fmt0(R.acreditado) + '</td><td class="num">' + fmt0(R.vendido + (f.tab === 'anuladas' ? R.anuladas : 0)) + '</td><td colspan="2"></td></tr></tfoot>' : '') + '</table>' +
      (lista.length > f.limite ? '<div class="mas"><button type="button" class="btn" data-accion="mas-ventas">Mostrar 60 más (quedan ' + (lista.length - f.limite) + ')</button></div>' : '') + '</div>';
  }
  function filaVenta(v) {
    const cli = cliente(v.clienteId);
    const ec = estadoCobro(v), ea = estadoAcred(v);
    return '<tr class="clic" data-venta="' + v.id + '"><td class="num">' + v.id + (v.remitida || anulada(v) || !esVenta(v) ? '' : ' <span class="badge b-warn" title="A remitir"><i class="ph ph-truck"></i></span>') + '</td><td>' + fFechaHora(v.fecha) + '</td><td><div class="persona"><span class="av">' + esc(iniciales(cli.nombre)) + '</span><span class="trunc">' + esc(cli.nombre) + '</span></div></td><td>' + chipCanal(v.canal) + '</td><td class="mono">' + esc(compTxt(v).replace(/^Factura /, '').replace(/^Recibo de seña/, 'Seña')) + '</td><td class="num">' + fmt(v.total) + '</td><td><span class="badge ' + badgeCobro(ec) + '">' + esc(ec) + '</span></td><td>' + (ea ? '<span class="badge ' + badgeAcred(ea) + '"><i class="ph ' + iconoAcred(ea) + '"></i>' + esc(ea) + '</span>' : '') + '</td></tr>';
  }

  function abrirVenta(id) {
    const v = venta(id); if (!v) return;
    const cli = cliente(v.clienteId), c = canal(v.canal);
    const a = v.acred || {};
    const ec = estadoCobro(v), ea = estadoAcred(v);
    const items = v.items.map((l) => '<tr><td>' + esc(l.nombre) + '</td><td class="num">' + l.cant + '</td><td class="num">' + fmt(l.precio) + '</td><td class="num">' + fmt(l.cant * l.precio) + '</td></tr>').join('');
    const cobros = v.cobros.map((cb) => '<tr><td>' + fFecha(cb.fecha) + '</td><td>' + esc(cb.medio) + (cb.cuotas > 1 ? ' en ' + cb.cuotas + ' cuotas' : '') + (cb.cheque ? '<span class="sec">Cheque ' + esc(cb.cheque.banco) + ' N° ' + esc(cb.cheque.nro) + ', vence ' + fFecha(cb.cheque.vence) + '</span>' : '') + '</td><td>' + esc(caja(cb.caja) ? caja(cb.caja).nombre : '') + '</td><td class="num">' + fmt(cb.monto) + '</td></tr>').join('');
    const pasos = [];
    pasos.push(['ph-receipt', 'Venta registrada', fFechaHora(v.fecha) + (c.id === 'mayorista' || c.id === 'mostrador' ? ' · ' + v.operador : ' · entró sola desde ' + c.nombre), true]);
    if (v.version === 'Oficial') pasos.push(['ph-file-text', compTxt(v) + ' emitida', 'CAE ' + v.comp.cae, true]);
    if (v.cobros.length) pasos.push(['ph-hand-coins', ec === 'Parcial' ? 'Cobro parcial' : 'Cobrada', fFechaHora(v.cobros[0].fecha) + ' · ' + v.cobros[0].medio, true]);
    else if (esVenta(v) && !anulada(v)) pasos.push(['ph-clock', 'A cobrar', 'Vence ' + fFecha(a.vence || a.fecha), false]);
    if (v.remitida) pasos.push(['ph-truck', 'Remitida', v.envio, true]);
    else if (!anulada(v) && esVenta(v)) pasos.push(['ph-truck', 'Pendiente de remitir', v.envio, false]);
    if (anulada(v)) pasos.push(['ph-arrow-u-up-left', 'Anulada con ' + v.nc.tipo + ' ' + v.nc.pv + '-' + v.nc.nro, fFecha(v.nc.fecha) + ' · se devolvió el cobro', true]);
    else if (ea === 'Acreditada') pasos.push(['ph-bank', 'Acreditada en ' + (caja(v.cobros[0] && v.cobros[0].caja) || {}).nombre, fFecha(a.fecha) + ' · ' + fmt(acreditadoVenta(v)), true]);
    else if (ea === 'A liberar' || ea === 'A liquidar') pasos.push(['ph-hourglass-medium', (ea === 'A liberar' ? 'Se libera el ' : 'Se liquida el ') + fFecha(a.fecha), 'Entran ' + fmt(netoVenta(v)) + ' a ' + caja(v.cobros[0].caja).nombre, false]);
    else if (ea === 'Cheque en cartera') pasos.push(['ph-money', 'Cheque para depositar', 'Vence ' + fFecha(a.fecha), false]);
    const tl = pasos.map(([ic, t, s, ok]) => '<li><span class="p' + (ok ? '' : ' pend') + '"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></li>').join('');
    const desg = esVenta(v) && !anulada(v) ? '<div class="desglose">' +
      '<span>Total de la venta</span><span class="num">' + fmt(v.total) + '</span>' +
      (saldoVenta(v) > 0 ? '<span class="resta">Falta cobrar</span><span class="num resta">-' + fmt(saldoVenta(v)).replace('$ ', '$ ') + '</span>' : '') +
      (a.comision ? '<span class="resta">Comisión de ' + esc(c.nombre) + '</span><span class="num resta">-' + fmt(a.comision) + '</span>' : '') +
      (a.envio ? '<span class="resta">Envío a cargo de HDC</span><span class="num resta">-' + fmt(a.envio) + '</span>' : '') +
      (a.cuotas ? '<span class="resta">Costo de cuotas sin interés</span><span class="num resta">-' + fmt(a.cuotas) + '</span>' : '') +
      (a.retencion ? '<span class="resta">Retención de Ingresos Brutos</span><span class="num resta">-' + fmt(a.retencion) + '</span>' : '') +
      '<span class="final">' + (ea === 'Acreditada' ? 'Acreditado' : 'Neto a acreditar') + '</span><span class="final num">' + fmt(saldoVenta(v) > 0 ? netoVenta(v) : netoVenta(v)) + '</span></div>' : '';
    const acciones = [];
    if (saldoVenta(v) > 0.009) acciones.push('<button type="button" class="btn primary" data-accion="cobrar-venta" data-id="' + v.id + '"><i class="ph ph-hand-coins"></i>Registrar cobro</button>');
    if (!v.remitida && !anulada(v) && esVenta(v)) acciones.push('<button type="button" class="btn" data-accion="remitir" data-id="' + v.id + '"><i class="ph ph-truck"></i>Remitir</button>');
    if (!esVenta(v)) acciones.push('<button type="button" class="btn primary" data-accion="convertir-cotizacion" data-id="' + v.id + '"><i class="ph ph-arrow-right"></i>Pasar a venta</button>');
    acciones.push('<button type="button" class="btn" data-accion="imprimir"><i class="ph ph-printer"></i>Imprimir</button>');
    if (!anulada(v) && esVenta(v)) acciones.push('<button type="button" class="btn ghost" data-accion="anular" data-id="' + v.id + '"><i class="ph ph-x-circle"></i>Anular</button>');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>Venta ' + v.id + '</h2><div class="sub">' + chipCanal(v.canal) + ' · ' + fFechaHora(v.fecha) + '</div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' + (anulada(v) ? '<span class="badge b-bad">Anulada</span>' : '<span class="badge ' + badgeCobro(ec) + '">' + esc(ec) + '</span>') + (ea && !anulada(v) ? '<span class="badge ' + badgeAcred(ea) + '"><i class="ph ' + iconoAcred(ea) + '"></i>' + esc(ea) + '</span>' : '') + (v.version !== 'Oficial' ? '<span class="badge b-neutro">' + esc(v.version) + '</span>' : '') + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' +
        '<div class="d-sec"><h3>Cliente y comprobante</h3><dl class="kv"><dt>Cliente</dt><dd><a href="#" data-cliente="' + cli.id + '">' + esc(cli.nombre) + '</a></dd><dt>' + (cli.doc.includes('-') ? 'CUIT' : 'DNI') + '</dt><dd class="mono">' + esc(cli.doc) + '</dd><dt>Condición IVA</dt><dd>' + esc(cli.iva) + '</dd><dt>Comprobante</dt><dd class="mono">' + esc(compTxt(v)) + '</dd><dt>Envío</dt><dd>' + esc(v.envio) + '</dd></dl></div>' +
        '<div class="d-sec"><h3>Productos</h3><div class="tabla-wrap"><table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead><tbody>' + items + '</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">' + fmt(v.total) + '</td></tr></tfoot></table></div></div>' +
        (desg ? '<div class="d-sec"><h3>De lo vendido a lo acreditado</h3>' + desg + '</div>' : '') +
        (cobros ? '<div class="d-sec"><h3>Cobros</h3><div class="tabla-wrap"><table class="compacta"><thead><tr><th>Fecha</th><th>Medio</th><th>Caja</th><th class="num">Monto</th></tr></thead><tbody>' + cobros + '</tbody></table></div></div>' : '') +
        '<div class="d-sec"><h3>Recorrido</h3><ul class="linea-tiempo">' + tl + '</ul></div>' +
      '</div>');
  }

  /* ================= CLIENTES ================= */
  function vClientes() {
    const f = UI.clientes;
    const q = sinAcentos(f.q.trim());
    const todos = DB.clientes.map((c) => ({ c, k: ctaCliente(c) }));
    const tabs = [['todos', 'Todos', () => true], ['cf', 'Consumidores finales', (x) => x.c.tipo === 'Consumidor final'], ['may', 'Mayoristas', (x) => x.c.tipo !== 'Consumidor final']];
    const tab = tabs.find((t) => t[0] === f.tab);
    let lista = todos.filter(tab[2]).filter((x) => !f.conSaldo || x.k.saldo > 0.009).filter((x) => !q || coincide(x.c.nombre + ' ' + x.c.doc + ' ' + x.c.localidad, q));
    lista.sort((a, b) => (b.k.saldo - a.k.saldo) || ((b.k.ultima || '') > (a.k.ultima || '') ? 1 : -1));
    const deuda = todos.reduce((s, x) => s + x.k.saldo, 0);
    const filas = lista.slice(0, f.limite).map(({ c, k }) => '<tr class="clic" data-cliente="' + c.id + '"><td><div class="persona"><span class="av">' + esc(iniciales(c.nombre)) + '</span><div>' + esc(c.nombre) + '<span class="sec">' + esc(c.localidad) + '</span></div></div></td><td class="mono">' + esc(c.doc) + '</td><td>' + esc(c.tipo) + '</td><td class="num">' + k.compras + '</td><td class="num">' + fmt0(k.total) + '</td><td>' + (k.ultima ? fFecha(k.ultima) : '') + '</td><td class="num">' + (k.saldo > 0.009 ? '<b>' + fmt(k.saldo) + '</b>' : fmt(0)) + '</td></tr>').join('');
    return '' +
      '<div class="encabezado"><div><h1>Clientes</h1><p>' + DB.clientes.length + ' clientes · ' + fmt0(deuda) + ' a cobrar en cuenta corriente</p></div><div class="acciones"><button type="button" class="btn primary" data-accion="nuevo-cliente"><i class="ph ph-plus"></i>Nuevo cliente</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="clientes">' + tabs.map(([id, n, fn]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-clientes" data-tab="' + id + '">' + n + ' <span class="cuenta">' + todos.filter(fn).length + '</span></button>').join('') + '</div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-clientes-q" placeholder="Nombre, CUIT, DNI o localidad" value="' + esc(f.q) + '" aria-label="Buscar clientes"></label><label class="btn"><input type="checkbox" id="f-clientes-saldo"' + (f.conSaldo ? ' checked' : '') + '> Solo con saldo</label></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Cliente</th><th>CUIT / DNI</th><th>Tipo</th><th class="num">Compras</th><th class="num">Total comprado</th><th>Última compra</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="7"><div class="vacio-estado"><i class="ph ph-users"></i><p>No hay clientes con estos filtros.</p></div></td></tr>') + '</tbody></table>' +
      (lista.length > f.limite ? '<div class="mas"><button type="button" class="btn" data-accion="mas-clientes">Mostrar 60 más (quedan ' + (lista.length - f.limite) + ')</button></div>' : '') + '</div>';
  }
  function abrirCliente(id) {
    const c = cliente(id); if (!c) return;
    const k = ctaCliente(c);
    const filas = k.movs.slice().reverse().map((m) => '<tr class="clic" data-venta="' + m.ventaId + '"><td>' + fFecha(m.fecha) + '</td><td class="mono">' + esc(m.comp) + '</td><td class="num">' + (m.debe ? fmt(m.debe) : '') + '</td><td class="num">' + (m.haber ? fmt(m.haber) : '') + '</td><td class="num">' + fmt(m.saldo) + '</td></tr>').join('');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(c.nombre) + '</h2><div class="sub">' + esc(c.tipo) + ' · ' + esc(c.localidad) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-accion="nueva-venta" data-version="Oficial" data-cliente-id="' + c.id + '"><i class="ph ph-plus"></i>Nueva venta</button>' + (k.saldo > 0.009 ? '<button type="button" class="btn" data-accion="cobrar-cliente" data-id="' + c.id + '"><i class="ph ph-hand-coins"></i>Registrar cobro</button>' : '') + '<button type="button" class="btn" data-accion="editar-cliente" data-id="' + c.id + '"><i class="ph ph-pencil-simple"></i>Editar</button></div>' +
        '<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0">' + kpi('ph-receipt', 'Compras', String(k.compras), k.ultima ? 'Última ' + fFecha(k.ultima) : 'Sin compras') + kpi('ph-currency-circle-dollar', 'Total comprado', fmtM(k.total), 'Histórico') + kpi('ph-clock', 'Saldo', fmtM(k.saldo), k.saldo > 0 ? 'A cobrar' : 'Al día', k.saldo <= 0) + '</div>' +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>' + (c.doc.includes('-') ? 'CUIT' : 'DNI') + '</dt><dd class="mono">' + esc(c.doc) + '</dd><dt>Condición IVA</dt><dd>' + esc(c.iva) + '</dd><dt>Condición de pago</dt><dd>' + esc(c.condicion) + '</dd><dt>Percepciones</dt><dd>' + (c.percepciones.length ? esc(c.percepciones.join(', ')) : 'No aplica') + '</dd><dt>Email</dt><dd>' + esc(c.email || 'Sin cargar') + '</dd></dl></div>' +
        '<div class="d-sec"><h3>Cuenta corriente</h3><p style="margin:0 0 8px;color:var(--ink-soft);font-size:13px">Facturas, cobros y notas de crédito en una sola lista, con el saldo al día.</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Sin movimientos</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= PROVEEDORES ================= */
  function vProveedores() {
    const f = UI.proveedores;
    const q = sinAcentos(f.q.trim());
    const todos = DB.proveedores.map((p) => ({ p, k: ctaProveedor(p) }));
    const tipos = [['Proveedor', 'Proveedores'], ['Servicio', 'Servicios'], ['Impuesto', 'Impuestos'], ['Sueldo', 'Sueldos'], ['todos', 'Todos']];
    const lista = todos.filter((x) => f.tab === 'todos' || x.p.tipo === f.tab).filter((x) => !q || coincide(x.p.nombre + ' ' + x.p.cuit + ' ' + x.p.rubro, q)).sort((a, b) => b.k.saldo - a.k.saldo);
    const deuda = todos.reduce((s, x) => s + x.k.saldo, 0);
    const semana = todos.reduce((s, x) => s + x.k.pend.filter((fc) => diasA(fc.vence) >= 0 && diasA(fc.vence) <= 7).reduce((a, fc) => a + fc.saldo, 0), 0);
    const vencido = todos.reduce((s, x) => s + x.k.pend.filter((fc) => diasA(fc.vence) < 0).reduce((a, fc) => a + fc.saldo, 0), 0);
    const pagadoOct = DB.proveedores.reduce((s, p) => s + p.movs.filter((m) => m.tipo === 'pago' && D(m.fecha) >= new Date(2026, 9, 1)).reduce((a, m) => a + m.monto, 0), 0);
    const filas = lista.map(({ p, k }) => '<tr class="clic" data-proveedor="' + p.id + '"><td>' + esc(p.nombre) + '<span class="sec">' + esc(p.rubro) + '</span></td><td class="mono">' + esc(p.cuit || '') + '</td><td>' + esc(p.tipo) + '</td><td class="num">' + k.pend.length + '</td><td>' + badgeVence(k.prox && k.prox.vence) + '</td><td class="num">' + (k.saldo > 0 ? '<b>' + fmt(k.saldo) + '</b>' : fmt(0)) + '</td></tr>').join('');
    return '' +
      '<div class="encabezado"><div><h1>Proveedores y gastos</h1><p>Proveedores, servicios, impuestos y sueldos separados, cada uno con su cuenta corriente</p></div><div class="acciones"><button type="button" class="btn" data-accion="nueva-factura-prov"><i class="ph ph-file-plus"></i>Cargar factura</button><button type="button" class="btn primary" data-accion="nuevo-proveedor"><i class="ph ph-plus"></i>Nuevo</button></div></div>' +
      '<div class="kpis">' + kpi('ph-scales', 'Deuda total', fmtM(deuda), 'Facturas pendientes de pago') + kpi('ph-calendar-check', 'Vence en 7 días', fmtM(semana), 'Hasta el 16/10') + kpi('ph-warning', 'Vencido', fmtM(vencido), vencido > 0 ? 'Revisar' : 'Nada vencido', vencido <= 0) + kpi('ph-arrow-up-right', 'Pagado en octubre', fmtM(pagadoOct), 'Órdenes de pago') + '</div>' +
      '<div class="tabs" role="tablist" data-key="proveedores">' + tipos.map(([id, n]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-proveedores" data-tab="' + id + '">' + n + ' <span class="cuenta">' + todos.filter((x) => id === 'todos' || x.p.tipo === id).length + '</span></button>').join('') + '</div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-prov-q" placeholder="Nombre, CUIT o rubro" value="' + esc(f.q) + '" aria-label="Buscar proveedores"></label></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Nombre</th><th>CUIT</th><th>Tipo</th><th class="num">Pendientes</th><th>Próximo vencimiento</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="6"><div class="vacio-estado"><i class="ph ph-truck"></i><p>No hay resultados.</p></div></td></tr>') + '</tbody></table></div>';
  }
  function abrirProveedor(id) {
    const p = proveedor(id); if (!p) return;
    const k = ctaProveedor(p);
    let s = 0;
    const movs = p.movs.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((m) => { s = r2(s + (m.tipo === 'factura' ? m.monto : -m.monto)); return { ...m, saldo: s }; }).reverse();
    const filas = movs.map((m) => '<tr><td>' + fFecha(m.fecha) + '</td><td class="mono">' + esc(m.comp) + (m.tipo === 'pago' && m.retenciones ? '<span class="sec">Retenciones ' + fmt(m.retenciones) + '</span>' : '') + (m.tipo === 'factura' ? '<span class="sec">Vence ' + fFecha(m.vence) + '</span>' : '') + '</td><td class="num">' + (m.tipo === 'factura' ? fmt(m.monto) : '') + '</td><td class="num">' + (m.tipo === 'pago' ? fmt(m.monto) : '') + '</td><td class="num">' + fmt(m.saldo) + '</td></tr>').join('');
    const pend = k.pend.map((fc) => '<tr><td class="mono">' + esc(fc.comp) + '</td><td>' + badgeVence(fc.vence) + '</td><td class="num">' + fmt(fc.saldo) + '</td></tr>').join('');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(p.nombre) + '</h2><div class="sub">' + esc(p.tipo) + ' · ' + esc(p.rubro) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (k.saldo > 0 ? '<button type="button" class="btn primary" data-accion="pagar-proveedor" data-id="' + p.id + '"><i class="ph ph-arrow-up-right"></i>Pagar</button>' : '') + '<button type="button" class="btn" data-accion="nueva-factura-prov" data-id="' + p.id + '"><i class="ph ph-file-plus"></i>Cargar factura</button><button type="button" class="btn" data-accion="editar-proveedor" data-id="' + p.id + '"><i class="ph ph-pencil-simple"></i>Editar</button></div>' +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>CUIT</dt><dd class="mono">' + esc(p.cuit || 'No aplica') + '</dd><dt>Condición de pago</dt><dd>' + esc(p.condicion) + '</dd><dt>Saldo</dt><dd class="num"><b>' + fmt(k.saldo) + '</b></dd></dl></div>' +
        (pend ? '<div class="d-sec"><h3>Pendiente de pago</h3><div class="tabla-wrap"><table><thead><tr><th>Comprobante</th><th>Vencimiento</th><th class="num">Saldo</th></tr></thead><tbody>' + pend + '</tbody></table></div></div>' : '') +
        '<div class="d-sec"><h3>Cuenta corriente</h3><p style="margin:0 0 8px;color:var(--ink-soft);font-size:13px">Facturas y pagos juntos: cada pago queda aplicado a su factura.</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="num">Factura</th><th class="num">Pago</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Sin movimientos</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= CAJAS ================= */
  function vCajas() {
    const tot = { disp: 0, pend: 0, chq: 0, ef: 0 };
    const cards = DB.cajas.map((c) => {
      const s = saldoCaja(c.id);
      if (c.tipo === 'banco' || c.tipo === 'billetera') tot.disp += s.saldo;
      tot.pend += s.pendiente;
      if (c.tipo === 'cheques') tot.chq += s.saldo;
      if (c.tipo === 'efectivo') tot.ef += s.saldo;
      const conFuente = c.tipo === 'banco' || c.tipo === 'billetera';
      return '<button type="button" class="caja-card" data-caja="' + c.id + '"><div class="t">' + marca(c.id, 'md') + esc(c.nombre) + '</div>' +
        '<div class="saldo">' + fmt0(c.tipo === 'a-liquidar' ? s.pendiente : s.saldo) + '</div><div class="fuente">' + (c.tipo === 'a-liquidar' ? 'A liquidar' : 'Saldo en el sistema') + '</div>' +
        (conFuente ? '<div class="comparar"><span>Según ' + esc(c.fuente) + '</span><span class="num">' + fmt0(s.fuente) + '</span>' + (s.pendiente ? '<span>A liberar</span><span class="num">' + fmt0(s.pendiente) + '</span>' : '') + '</div>' : '') +
        '<div class="estado">' + (conFuente ? (s.conciliado ? '<span class="badge b-ok"><i class="ph ph-check-circle"></i>Conciliado</span>' : '<span class="badge b-bad"><i class="ph ph-warning"></i>Diferencia ' + fmt(s.fuente - s.saldo) + '</span>') : c.tipo === 'a-liquidar' ? '<span class="badge b-info"><i class="ph ph-hourglass-medium"></i>Esperando liquidación</span>' : c.tipo === 'cheques' ? '<span class="badge b-neutro">' + s.movs.filter((m) => m.cheque).length + ' cheques</span>' : '<span class="badge b-neutro">' + esc(c.fuente) + '</span>') + '</div></button>';
    }).join('');
    return '' +
      '<div class="encabezado"><div><h1>Cajas y bancos</h1><p>Cada caja comparada con su fuente: el banco, Mercado Pago o la liquidación del canal</p></div><div class="acciones"><button type="button" class="btn" data-accion="mov-caja" data-tipo="retiro"><i class="ph ph-minus"></i>Retiro</button><button type="button" class="btn" data-accion="mov-caja" data-tipo="ingreso"><i class="ph ph-plus"></i>Ingreso</button><button type="button" class="btn primary" data-accion="mov-caja" data-tipo="transferencia"><i class="ph ph-arrows-left-right"></i>Transferir</button></div></div>' +
      '<div class="kpis">' + kpi('ph-bank', 'En bancos y billeteras', fmtM(tot.disp), 'Disponible hoy', true) + kpi('ph-hourglass-medium', 'A liberar y liquidar', fmtM(tot.pend), 'Mercado Pago, Pago Nube, Frávega, bancos') + kpi('ph-money', 'Cheques en cartera', fmtM(tot.chq), 'Para depositar') + kpi('ph-coins', 'Efectivo', fmtM(tot.ef), 'Según último arqueo') + '</div>' +
      '<div class="cajas-grid">' + cards + '</div>';
  }
  function abrirCaja(id) {
    const c = caja(id); if (!c) return;
    const s = saldoCaja(id);
    const conFuente = c.tipo === 'banco' || c.tipo === 'billetera';
    const filas = s.movs.slice(0, 80).map((m) => '<tr' + (m.ventaId ? ' class="clic" data-venta="' + m.ventaId + '"' : m.proveedorId ? ' class="clic" data-proveedor="' + m.proveedorId + '"' : '') + '><td>' + fFecha(m.fecha) + '</td><td>' + esc(m.concepto) + '<span class="sec">' + esc(m.detalle) + (m.cheque ? ' · ' + esc(m.cheque.banco) + ' N° ' + esc(m.cheque.nro) + ', vence ' + fFecha(m.cheque.vence) : '') + '</span></td><td>' + (m.pendiente ? '<span class="badge b-info">A liberar</span>' : '') + '</td><td class="num">' + fmt(m.monto) + '</td></tr>').join('');
    const dif = !s.conciliado ? '<div class="d-sec"><h3>Sin conciliar</h3><div class="desglose"><span>Débito del extracto del 08/10<br><span style="color:var(--ink-soft);font-size:12.5px">Comisión por mantenimiento de cuenta</span></span><span class="num resta">' + fmt(c.difExtracto) + '</span></div><div style="margin-top:10px"><button type="button" class="btn primary" data-accion="conciliar" data-id="' + c.id + '"><i class="ph ph-check"></i>Cargar como gasto bancario</button></div></div>' : '';
    abrirDrawer('' +
      '<div class="d-h">' + marca(c.id, 'lg') + '<div><h2>' + esc(c.nombre) + '</h2><div class="sub">' + esc(c.fuente) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div class="kpis" style="grid-template-columns:repeat(' + (conFuente ? 3 : 2) + ',minmax(0,1fr));margin:0">' + kpi('ph-database', 'En el sistema', fmt0(s.saldo), 'Saldo calculado') + (conFuente ? kpi('ph-bank', 'Según ' + c.fuente, fmt0(s.fuente), s.conciliado ? 'Coincide' : 'No coincide', s.conciliado) : '') + kpi('ph-hourglass-medium', c.tipo === 'a-liquidar' ? 'A liquidar' : 'A liberar', fmt0(s.pendiente), 'Todavía no disponible') + '</div>' +
        dif +
        '<div class="d-sec"><h3>Movimientos</h3><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th></th><th class="num">Monto</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Sin movimientos</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= PRODUCTOS ================= */
  function vendidasProducto(id) {
    return DB.ventas.filter((v) => esVenta(v) && !anulada(v)).reduce((s, v) => s + v.items.filter((l) => l.productoId === id).reduce((a, l) => a + l.cant, 0), 0);
  }
  function vProductos() {
    const f = UI.productos;
    const q = sinAcentos(f.q.trim());
    const rubros = Array.from(new Set(DB.productos.map((p) => p.rubro)));
    const lista = DB.productos.filter((p) => (!f.rubro || p.rubro === f.rubro) && (!q || coincide(p.nombre + ' ' + p.sku, q)));
    const filas = lista.map((p) => { const st = p.stock.fabrica + p.stock.full; const mg = Math.round((p.precio - p.costo) / p.precio * 100); return '<tr class="clic" data-producto="' + p.id + '"><td>' + esc(p.nombre) + '<span class="sec mono">' + esc(p.sku) + '</span></td><td>' + esc(p.rubro) + '</td><td class="num">' + fmt0(p.precio) + '</td><td class="num">' + fmt0(p.precioMayorista) + '</td><td class="num">' + fmt0(p.costo) + '</td><td class="num">' + mg + '%</td><td class="num">' + p.stock.fabrica + '</td><td class="num">' + p.stock.full + '</td><td class="num">' + vendidasProducto(p.id) + '</td><td>' + (st < p.minimo ? '<span class="badge b-bad">Bajo mínimo</span>' : '<span class="badge b-ok">OK</span>') + '</td></tr>'; }).join('');
    const valorizado = DB.productos.reduce((s, p) => s + (p.stock.fabrica + p.stock.full) * p.costo, 0);
    return '' +
      '<div class="encabezado"><div><h1>Productos y stock</h1><p>' + DB.productos.length + ' productos · stock valorizado al costo ' + fmt0(valorizado) + '</p></div><div class="acciones"><button type="button" class="btn primary" data-accion="nuevo-producto"><i class="ph ph-plus"></i>Nuevo producto</button></div></div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-prod-q" placeholder="Nombre o código" value="' + esc(f.q) + '" aria-label="Buscar productos"></label><select class="input" id="f-prod-rubro" aria-label="Rubro"><option value="">Todos los rubros</option>' + rubros.map((r) => '<option' + (f.rubro === r ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Producto</th><th>Rubro</th><th class="num">Precio</th><th class="num">Mayorista</th><th class="num">Costo</th><th class="num">Margen</th><th class="num">Fábrica</th><th class="num">Full ML</th><th class="num">Vendidas</th><th>Stock</th></tr></thead><tbody>' + (filas || '<tr><td colspan="10"><div class="vacio-estado"><i class="ph ph-package"></i><p>No hay productos con estos filtros.</p></div></td></tr>') + '</tbody></table></div>';
  }
  function abrirProducto(id) {
    const p = producto(id); if (!p) return;
    const ult = DB.ventas.filter((v) => v.items.some((l) => l.productoId === id)).sort((a, b) => a.fecha < b.fecha ? 1 : -1).slice(0, 12);
    const filas = ult.map((v) => '<tr class="clic" data-venta="' + v.id + '"><td>' + fFecha(v.fecha) + '</td><td>' + chipCanal(v.canal) + '</td><td class="trunc">' + esc(cliente(v.clienteId).nombre) + '</td><td class="num">' + v.items.find((l) => l.productoId === id).cant + '</td></tr>').join('');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(p.nombre) + '</h2><div class="sub mono">' + esc(p.sku) + ' · ' + esc(p.rubro) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-accion="ajustar-stock" data-id="' + p.id + '"><i class="ph ph-arrows-down-up"></i>Ajustar stock</button><button type="button" class="btn" data-accion="editar-producto" data-id="' + p.id + '"><i class="ph ph-pencil-simple"></i>Editar precios</button></div>' +
        '<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0">' + kpi('ph-warehouse', 'Fábrica', String(p.stock.fabrica), 'Unidades') + kpi('ph-storefront', 'Full Mercado Libre', String(p.stock.full), 'Unidades') + kpi('ph-chart-line-up', 'Vendidas en octubre', String(vendidasProducto(p.id)), 'Todos los canales') + '</div>' +
        '<div class="d-sec"><h3>Precios</h3><dl class="kv"><dt>Precio de lista</dt><dd class="num">' + fmt(p.precio) + '</dd><dt>Precio mayorista</dt><dd class="num">' + fmt(p.precioMayorista) + '</dd><dt>Costo</dt><dd class="num">' + fmt(p.costo) + '</dd><dt>Margen</dt><dd>' + Math.round((p.precio - p.costo) / p.precio * 100) + '% sobre lista</dd><dt>Stock mínimo</dt><dd>' + p.minimo + ' unidades</dd></dl></div>' +
        '<div class="d-sec"><h3>Últimas ventas</h3><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Canal</th><th>Cliente</th><th class="num">Cant.</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Sin ventas</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= INFORMES ================= */
  const INFORMES = [
    ['Operaciones', [['panel', 'Panel general'], ['ventas-canal', 'Ventas por canal'], ['ventas-producto', 'Ventas por producto'], ['iva-ventas', 'Libro de IVA ventas']]],
    ['Clientes', [['saldos-clientes', 'Saldos de clientes'], ['cobros-medio', 'Cobros por medio de pago']]],
    ['Proveedores', [['saldos-proveedores', 'Saldos de proveedores'], ['vencimientos', 'Vencimientos a pagar'], ['retenciones', 'Retenciones practicadas']]],
    ['Productos', [['stock-valorizado', 'Stock valorizado'], ['utilidad-producto', 'Utilidad por producto']]],
    ['Caja y cobranzas', [['cajas', 'Saldos de cajas y bancos'], ['transito', 'Plata en tránsito']]],
    ['Contables', [['x-iva-compras', 'Libro de IVA compras'], ['x-percepciones', 'Percepciones de Ingresos Brutos'], ['x-sicore', 'Retenciones para SICORE y SIRE'], ['x-libro-digital', 'Libro de IVA Digital']]]
  ];
  function vInformes() {
    return '<div class="encabezado"><div><h1>Informes</h1><p>Todos salen de la misma base: si dos informes miran lo mismo, dan el mismo número</p></div></div>' +
      '<div class="informes-grid">' + INFORMES.map(([g, items]) => '<section class="card"><div class="card-h"><h2>' + esc(g) + '</h2></div><div class="card-b"><ul class="inf-lista">' + items.map(([id, n]) => '<li>' + (id.startsWith('x-') ? '<button type="button" data-accion="informe-final" data-nombre="' + esc(n) + '"><i class="ph ph-file-text"></i>' + esc(n) + '</button>' : '<a href="#/' + (id === 'panel' ? 'inicio' : id === 'cajas' ? 'cajas' : 'informe/' + id) + '"><i class="ph ph-chart-bar"></i>' + esc(n) + '</a>') + '</li>').join('') + '</ul></div></section>').join('') + '</div>';
  }
  function datosInforme(id) {
    const vs = DB.ventas.filter((v) => esVenta(v) && !anulada(v));
    if (id === 'ventas-canal') {
      const filas = DB.canales.map((c) => { const r = resumen(DB.ventas.filter((v) => v.canal === c.id)); return [c.nombre, r.n, r.vendido, r.cobrado, r.descuentos, r.acreditado]; });
      return { titulo: 'Ventas por canal', cols: ['Canal', 'Ventas', 'Vendido', 'Cobrado', 'Descuentos', 'Acreditado'], num: [1, 2, 3, 4, 5], filas };
    }
    if (id === 'ventas-producto' || id === 'utilidad-producto') {
      const m = {};
      vs.forEach((v) => v.items.forEach((l) => { const x = m[l.productoId] || (m[l.productoId] = [l.nombre, 0, 0, 0]); x[1] += l.cant; x[2] += l.cant * l.precio; x[3] += l.cant * (l.precio - producto(l.productoId).costo); }));
      const filas = Object.values(m).sort((a, b) => b[2] - a[2]);
      if (id === 'utilidad-producto') return { titulo: 'Utilidad por producto', cols: ['Producto', 'Unidades', 'Facturado', 'Utilidad bruta', 'Margen'], num: [1, 2, 3, 4], filas: filas.map((x) => [x[0], x[1], x[2], x[3], Math.round(x[3] / x[2] * 100) + '%']) };
      return { titulo: 'Ventas por producto', cols: ['Producto', 'Unidades', 'Facturado'], num: [1, 2], filas: filas.map((x) => x.slice(0, 3)) };
    }
    if (id === 'iva-ventas') {
      const filas = DB.ventas.filter((v) => esVenta(v) && v.version === 'Oficial').sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((v) => { const neto = r2(v.total / 1.21); return [fFecha(v.fecha), compTxt(v), cliente(v.clienteId).nombre, cliente(v.clienteId).doc, anulada(v) ? 0 : neto, anulada(v) ? 0 : r2(v.total - neto), anulada(v) ? 0 : v.total]; });
      return { titulo: 'Libro de IVA ventas', cols: ['Fecha', 'Comprobante', 'Cliente', 'CUIT / DNI', 'Neto gravado', 'IVA 21%', 'Total'], num: [4, 5, 6], filas };
    }
    if (id === 'saldos-clientes') {
      const filas = DB.clientes.map((c) => [c, ctaCliente(c)]).filter(([, k]) => k.saldo > 0.009).sort((a, b) => b[1].saldo - a[1].saldo).map(([c, k]) => [c.nombre, c.doc, c.condicion, k.saldo]);
      return { titulo: 'Saldos de clientes', cols: ['Cliente', 'CUIT', 'Condición', 'Saldo'], num: [3], filas };
    }
    if (id === 'cobros-medio') {
      const m = {};
      vs.forEach((v) => v.cobros.forEach((c) => { const k = c.medio + '|' + (caja(c.caja) || {}).nombre; const x = m[k] || (m[k] = [c.medio, (caja(c.caja) || {}).nombre, 0, 0]); x[2]++; x[3] += c.monto; }));
      return { titulo: 'Cobros por medio de pago', cols: ['Medio', 'Caja', 'Cobros', 'Monto'], num: [2, 3], filas: Object.values(m).sort((a, b) => b[3] - a[3]) };
    }
    if (id === 'saldos-proveedores') {
      const filas = DB.proveedores.map((p) => [p, ctaProveedor(p)]).filter(([, k]) => k.saldo > 0).sort((a, b) => b[1].saldo - a[1].saldo).map(([p, k]) => [p.nombre, p.tipo, k.pend.length, k.saldo]);
      return { titulo: 'Saldos de proveedores', cols: ['Nombre', 'Tipo', 'Pendientes', 'Saldo'], num: [2, 3], filas };
    }
    if (id === 'vencimientos') {
      const filas = DB.proveedores.flatMap((p) => ctaProveedor(p).pend.map((f) => [fFecha(f.vence), p.nombre, f.comp, f.saldo, f.vence])).sort((a, b) => a[4] < b[4] ? -1 : 1).map((x) => x.slice(0, 4));
      return { titulo: 'Vencimientos a pagar', cols: ['Vence', 'Proveedor', 'Comprobante', 'Saldo'], num: [3], filas };
    }
    if (id === 'retenciones') {
      const filas = DB.proveedores.flatMap((p) => p.movs.filter((m) => m.tipo === 'pago' && m.retenciones).map((m) => [fFecha(m.fecha), p.nombre, p.cuit, m.comp, m.monto, m.retenciones]));
      return { titulo: 'Retenciones practicadas', cols: ['Fecha', 'Proveedor', 'CUIT', 'Orden de pago', 'Pagado', 'Retenido'], num: [4, 5], filas };
    }
    if (id === 'stock-valorizado') {
      const filas = DB.productos.map((p) => [p.nombre, p.stock.fabrica + p.stock.full, p.costo, (p.stock.fabrica + p.stock.full) * p.costo]).sort((a, b) => b[3] - a[3]);
      return { titulo: 'Stock valorizado al costo', cols: ['Producto', 'Unidades', 'Costo', 'Valorizado'], num: [1, 2, 3], filas };
    }
    if (id === 'transito') {
      const filas = DB.ventas.filter((v) => !anulada(v) && ['A liberar', 'A liquidar', 'Cheque en cartera'].includes(estadoAcred(v))).sort((a, b) => a.acred.fecha < b.acred.fecha ? -1 : 1).map((v) => [fFecha(v.acred.fecha), v.id, canal(v.canal).nombre, estadoAcred(v), netoVenta(v)]);
      return { titulo: 'Plata en tránsito', cols: ['Entra el', 'Venta', 'Canal', 'Estado', 'Neto'], num: [1, 4], filas };
    }
    return null;
  }
  function vInforme(partes) {
    const inf = datosInforme(partes[1]);
    if (!inf) return '<div class="vacio-estado"><i class="ph ph-file-x"></i><p>Informe no encontrado.</p><a class="btn" href="#/informes">Volver a informes</a></div>';
    const tot = inf.cols.map((_, i) => inf.num.includes(i) && i > 0 && typeof inf.filas[0]?.[i] === 'number' && !/Ventas|Unidades|Cobros|Pendientes|Venta|Costo/.test(inf.cols[i]) ? inf.filas.reduce((s, f) => s + (Number(f[i]) || 0), 0) : null);
    const celda = (x, i) => inf.num.includes(i) ? '<td class="num">' + (typeof x === 'number' && !/Ventas|Unidades|Cobros|Pendientes|Venta/.test(inf.cols[i]) ? fmt(x) : esc(x)) + '</td>' : '<td>' + esc(x) + '</td>';
    return '<div class="encabezado"><div><a href="#/informes" class="btn ghost sm" style="margin-left:-10px"><i class="ph ph-arrow-left"></i>Informes</a><h1>' + esc(inf.titulo) + '</h1><p>Octubre 2026, al ' + fFecha(HOY) + '</p></div><div class="acciones"><button type="button" class="btn" data-accion="exportar-informe" data-id="' + partes[1] + '"><i class="ph ph-file-xls"></i>Exportar a Excel</button></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr>' + inf.cols.map((c, i) => '<th' + (inf.num.includes(i) ? ' class="num"' : '') + '>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + (inf.filas.map((f) => '<tr>' + f.map(celda).join('') + '</tr>').join('') || '<tr><td colspan="' + inf.cols.length + '">Sin datos</td></tr>') + '</tbody>' +
      (tot.some((x) => x != null) ? '<tfoot><tr>' + tot.map((x, i) => i === 0 ? '<td>Total</td>' : x != null ? '<td class="num">' + fmt(x) + '</td>' : '<td></td>').join('') + '</tr></tfoot>' : '') + '</table></div>';
  }
  function descargarCSV(nombre, cols, filas) {
    const linea = (arr) => arr.map((x) => { const s = typeof x === 'number' ? String(x).replace('.', ',') : String(x == null ? '' : x); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    const csv = '﻿' + [linea(cols)].concat(filas.map(linea)).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ================= drawer y modal ================= */
  let ultimoFoco = null;
  function abrirDrawer(html) {
    const w = $('#drawer-wrap');
    if (!w.classList.contains('abierto')) ultimoFoco = document.activeElement;
    setHTML($('#drawer'), html);
    w.classList.add('abierto'); w.setAttribute('aria-hidden', 'false');
    $('#drawer').scrollTop = 0;
    $('#drawer').focus({ preventScroll: true });
  }
  function cerrarDrawer() {
    const w = $('#drawer-wrap'); w.classList.remove('abierto'); w.setAttribute('aria-hidden', 'true');
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true });
  }
  function abrirModal(html, alMontar) {
    setHTML($('#modal'), html);
    const w = $('#modal-wrap'); w.classList.add('abierto'); w.setAttribute('aria-hidden', 'false');
    if (alMontar) alMontar($('#modal'));
    if (!esMovil()) { const f = $('#modal input:not([type=hidden]):not([type=checkbox]), #modal select'); if (f) f.focus(); }
  }
  function cerrarModal() { const w = $('#modal-wrap'); w.classList.remove('abierto'); w.setAttribute('aria-hidden', 'true'); }
  const cabModal = (t) => '<div class="m-h"><h2>' + esc(t) + '</h2><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-modal" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>';
  function mostrarErrores(m, errores) {
    const box = $('.aviso-errores', m);
    if (!errores.length) { if (box) box.remove(); return true; }
    const html = '<div class="aviso-errores" role="alert">Falta cargar o corregir: ' + errores.map(esc).join(', ') + '.</div>';
    if (box) box.replaceWith(document.createRange().createContextualFragment(html)); else $('.m-b', m).prepend(document.createRange().createContextualFragment(html));
    return false;
  }
  function confirmar(titulo, texto, botonTxt, alOk) {
    abrirModal(cabModal(titulo) + '<div class="m-b"><p style="margin:0">' + esc(texto) + '</p></div><div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="m-ok">' + esc(botonTxt) + '</button></div>', (m) => {
      $('#m-ok', m).addEventListener('click', () => { cerrarModal(); alOk(); });
    });
  }

  /* buscador propio (sin datalist): sin acentos, por cualquier parte, flechas, Enter, Tab y Escape */
  function sugeridor(input, fuente, alElegir) {
    const lista = input.parentElement.querySelector('.lista');
    let items = [], activo = -1;
    const pintar = () => {
      setHTML(lista, items.map((it, i) => '<button type="button" data-i="' + i + '" class="' + (i === activo ? 'activo' : '') + '"><span>' + esc(it.label) + '</span><span class="r-sub">' + esc(it.sub || '') + '</span></button>').join('') || '<div class="vacio" style="padding:8px;color:var(--ink-soft)">Sin resultados</div>');
      lista.classList.add('abierta');
    };
    const elegir = (i) => { const it = items[i]; if (!it) return; input.value = it.label; input.dataset.id = it.id; lista.classList.remove('abierta'); alElegir(it); };
    input.addEventListener('input', () => { input.dataset.id = ''; items = fuente(sinAcentos(input.value.trim())).slice(0, 8); activo = items.length ? 0 : -1; pintar(); });
    input.addEventListener('focus', () => { items = fuente(sinAcentos(input.value.trim())).slice(0, 8); activo = -1; pintar(); });
    input.addEventListener('keydown', (e) => {
      if (!lista.classList.contains('abierta')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(items.length - 1, activo + 1); pintar(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(0, activo - 1); pintar(); }
      else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(activo); }
      else if (e.key === 'Tab' && activo >= 0) { elegir(activo); }
      else if (e.key === 'Escape') { e.stopPropagation(); lista.classList.remove('abierta'); }
    });
    lista.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); elegir(Number(b.dataset.i)); } });
    input.addEventListener('blur', () => setTimeout(() => lista.classList.remove('abierta'), 120));
  }
  function campoMonto(input) {
    input.addEventListener('focusout', () => {
      const v = parseNum(input.value);
      if (input.value.trim() === '') { input.classList.remove('invalido'); return; }
      if (Number.isFinite(v)) { input.value = fmtInput(v); input.classList.remove('invalido'); } else input.classList.add('invalido');
    });
  }

  /* ---------- nueva venta ---------- */
  function modalNuevaVenta(version, clienteId) {
    const tipos = ['Oficial', 'Neutral', 'Seña', 'Cotización'];
    const nombres = { Oficial: 'Venta oficial', Neutral: 'Neutral', Seña: 'Seña', Cotización: 'Cotización' };
    const cli0 = clienteId ? cliente(clienteId) : null;
    abrirModal(cabModal('Nueva operación') +
      '<div class="m-b">' +
        '<div class="segmentado" role="group" aria-label="Tipo">' + tipos.map((t) => '<button type="button" data-tipo="' + t + '" aria-pressed="' + (t === version) + '">' + nombres[t] + '</button>').join('') + '</div>' +
        '<div class="fila-2"><div class="campo"><label for="nv-canal">Canal</label><select class="input" id="nv-canal"><option value="mostrador">Mostrador</option><option value="mayorista"' + (cli0 && cli0.tipo !== 'Consumidor final' ? ' selected' : '') + '>Mayorista</option></select></div>' +
        '<div class="campo sugerencias"><label for="nv-cliente">Cliente</label><input class="input" id="nv-cliente" autocomplete="off" placeholder="Nombre, CUIT o DNI" value="' + esc(cli0 ? cli0.nombre : '') + '" data-id="' + esc(cli0 ? cli0.id : '') + '"><div class="lista"></div><span class="ayuda" id="nv-cli-info">' + (cli0 ? esc(cli0.iva) : 'Si no está, se carga desde Clientes') + '</span></div></div>' +
        '<div class="campo"><label>Productos</label><div id="nv-renglones" style="display:grid;gap:8px"></div><button type="button" class="btn sm" id="nv-agregar" style="align-self:flex-start"><i class="ph ph-plus"></i>Agregar producto</button></div>' +
        '<div class="fila-2" id="nv-cobro-fila"><div class="campo"><label for="nv-cobro">Cobro</label><select class="input" id="nv-cobro"><option value="efectivo|Efectivo">Efectivo</option><option value="credicoop|Tarjeta de débito">Tarjeta de débito</option><option value="credicoop|Transferencia">Transferencia a Credicoop</option><option value="cheques|Cheque de terceros">Cheque</option><option value="|Cuenta corriente">Cuenta corriente</option></select></div>' +
        '<div class="campo" id="nv-sena-campo" hidden><label for="nv-sena">Monto de la seña</label><input class="input num" id="nv-sena" inputmode="decimal" placeholder="0,00"></div></div>' +
        '<div class="total-modal"><span id="nv-comp">Factura B</span><b id="nv-total">$ 0,00</b></div>' +
      '</div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="nv-guardar">Guardar</button></div>', (m) => {
      let tipo = version;
      const cliIn = $('#nv-cliente', m);
      sugeridor(cliIn, (q) => DB.clientes.filter((c) => !q || coincide(c.nombre + ' ' + c.doc, q)).slice(0, 8).map((c) => ({ id: c.id, label: c.nombre, sub: c.doc })), (it) => {
        const c = cliente(it.id); $('#nv-cli-info', m).textContent = c.iva + ' · ' + c.condicion;
        $('#nv-canal', m).value = c.tipo === 'Consumidor final' ? 'mostrador' : 'mayorista';
        if (c.condicion.startsWith('Cuenta')) $('#nv-cobro', m).value = '|Cuenta corriente';
        recalcular();
      });
      const cont = $('#nv-renglones', m);
      const agregar = () => {
        const div = document.createElement('div'); div.className = 'renglon';
        setHTML(div, '<div class="sugerencias"><input class="input r-prod" autocomplete="off" placeholder="Buscar producto" aria-label="Producto"><div class="lista"></div></div><input class="input num r-cant" inputmode="numeric" value="1" aria-label="Cantidad"><button type="button" class="btn icon ghost r-quitar" aria-label="Quitar"><i class="ph ph-x"></i></button>');
        cont.appendChild(div);
        sugeridor($('.r-prod', div), (q) => DB.productos.filter((p) => !q || coincide(p.nombre + ' ' + p.sku, q)).map((p) => ({ id: p.id, label: p.nombre, sub: fmt0($('#nv-canal', m).value === 'mayorista' ? p.precioMayorista : p.precio) })), recalcular);
        $('.r-cant', div).addEventListener('input', recalcular);
        $('.r-quitar', div).addEventListener('click', () => { div.remove(); recalcular(); });
        if (!esMovil()) $('.r-prod', div).focus();
      };
      function recalcular() {
        const may = $('#nv-canal', m).value === 'mayorista';
        let t = 0;
        $$('.renglon', cont).forEach((r) => { const p = producto($('.r-prod', r).dataset.id); const c = parseInt($('.r-cant', r).value, 10); if (p && c > 0) t += c * (may ? p.precioMayorista : p.precio); });
        const c = cliente(cliIn.dataset.id);
        $('#nv-total', m).textContent = fmt(t);
        $('#nv-comp', m).textContent = tipo === 'Oficial' ? 'Factura ' + (c && c.iva === 'Responsable inscripto' ? 'A' : 'B') : tipo === 'Neutral' ? 'Comprobante interno' : tipo === 'Seña' ? 'Recibo de seña' : 'Cotización (no mueve stock ni caja)';
        $('#nv-cobro-fila', m).hidden = tipo === 'Cotización';
        $('#nv-sena-campo', m).hidden = tipo !== 'Seña';
        return t;
      }
      $('#nv-agregar', m).addEventListener('click', agregar);
      $('#nv-canal', m).addEventListener('change', recalcular);
      campoMonto($('#nv-sena', m));
      $$('.segmentado button', m).forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; $$('.segmentado button', m).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); recalcular(); }));
      agregar(); recalcular();
      if (!esMovil()) cliIn.focus();
      $('#nv-guardar', m).addEventListener('click', () => {
        const errores = [];
        const c = cliente(cliIn.dataset.id);
        if (!c) errores.push('cliente (elegilo de la lista)');
        const renglones = $$('.renglon', cont).map((r) => ({ p: producto($('.r-prod', r).dataset.id), cant: parseInt($('.r-cant', r).value, 10), toc: $('.r-prod', r).value.trim() !== '' }));
        if (renglones.some((r) => r.toc && !r.p)) errores.push('producto (elegilo de la lista o quitá el renglón con la x)');
        if (renglones.some((r) => r.p && !(r.cant > 0))) errores.push('cantidad mayor a cero');
        const validos = renglones.filter((r) => r.p && r.cant > 0);
        if (!validos.length) errores.push('al menos un producto');
        const [cajaId, medio] = $('#nv-cobro', m).value.split('|');
        if (medio === 'Cuenta corriente' && c && c.tipo === 'Consumidor final' && tipo !== 'Cotización') errores.push('forma de cobro (cuenta corriente es solo para mayoristas)');
        const sena = parseNum($('#nv-sena', m).value);
        const total = recalcular();
        if (tipo === 'Seña' && !(sena > 0 && sena <= total)) errores.push('monto de la seña (entre $ 1 y el total)');
        if (!mostrarErrores(m, errores)) return;
        const may = $('#nv-canal', m).value === 'mayorista';
        const pv = may ? '0007' : '0001';
        const fecha = ahora();
        const v = { id: ++DB.contadores.venta, fecha, canal: may ? 'mayorista' : 'mostrador', clienteId: c.id, version: tipo, comp: null, items: validos.map((r) => ({ productoId: r.p.id, nombre: r.p.nombre, cant: r.cant, precio: may ? r.p.precioMayorista : r.p.precio })), total, envio: may ? 'Transporte propio' : 'Retira en fábrica', estado: 'Pendiente de remitir', remitida: false, cobros: [], acred: { estado: '', fecha, comision: 0, envio: 0, retencion: 0, cuotas: 0 }, nc: null, operador: 'Administración' };
        if (tipo === 'Oficial') { DB.contadores.comp[pv] += 1; v.comp = { tipo: 'Factura ' + (c.iva === 'Responsable inscripto' ? 'A' : 'B'), pv, nro: String(DB.contadores.comp[pv]).padStart(8, '0'), cae: String(Math.floor(7.1e13 + Math.random() * 8e12)) }; }
        else if (tipo === 'Neutral') v.comp = { tipo: 'Interno', pv: '', nro: 'I-' + v.id, cae: '' };
        else if (tipo === 'Seña') v.comp = { tipo: 'Recibo de seña', pv: '', nro: 'S-' + v.id, cae: '' };
        else { v.comp = { tipo: 'Cotización', pv: '', nro: 'C-' + v.id, cae: '' }; v.estado = 'Cotización'; }
        if (tipo !== 'Cotización') {
          const monto = tipo === 'Seña' ? sena : (medio === 'Cuenta corriente' ? 0 : total);
          if (monto > 0) {
            const cb = { nro: ++DB.contadores.recibo, fecha, monto: r2(monto), caja: cajaId, medio };
            if (cajaId === 'cheques') cb.cheque = { nro: String(Math.floor(1e7 + Math.random() * 9e7)), banco: 'A confirmar', vence: new Date(HOY.getTime() + 30 * 864e5).toISOString() };
            v.cobros.push(cb);
          }
          if (medio === 'Cuenta corriente') v.acred.vence = new Date(HOY.getTime() + 30 * 864e5).toISOString();
          validos.forEach((r) => { r.p.stock.fabrica = Math.max(0, r.p.stock.fabrica - r.cant); });
        }
        DB.ventas.push(v); guardar(); cerrarModal();
        toast(tipo === 'Oficial' ? 'Venta ' + v.id + ' guardada. ' + v.comp.tipo + ' ' + pv + '-' + v.comp.nro + ' emitida (en la maqueta no se envía a ARCA).' : tipo + ' ' + v.id + ' guardada.');
        render(); abrirVenta(v.id);
      });
    });
  }

  /* ---------- cobrar ---------- */
  function modalCobro(ventas, titulo) {
    const saldo = r2(ventas.reduce((s, v) => s + saldoVenta(v), 0));
    abrirModal(cabModal(titulo) +
      '<div class="m-b"><div class="total-modal"><span>Saldo a cobrar</span><b>' + fmt(saldo) + '</b></div>' +
      '<div class="fila-2"><div class="campo"><label for="cb-monto">Monto</label><input class="input num" id="cb-monto" inputmode="decimal" value="' + fmtInput(saldo) + '"><span class="ayuda">Punto para miles, coma para centavos</span></div>' +
      '<div class="campo"><label for="cb-medio">Medio y caja</label><select class="input" id="cb-medio"><option value="credicoop|Transferencia">Transferencia a Credicoop</option><option value="santander|Transferencia">Transferencia a Santander</option><option value="macro|Transferencia">Transferencia a Macro</option><option value="cheques|Cheque de terceros">Cheque</option><option value="efectivo|Efectivo">Efectivo</option></select></div></div>' +
      '<div class="fila-2" id="cb-cheque" hidden><div class="campo"><label for="cb-chq-nro">Número de cheque</label><input class="input mono" id="cb-chq-nro" inputmode="numeric"></div><div class="campo"><label for="cb-chq-vto">Vencimiento</label><input class="input" type="date" id="cb-chq-vto" value="2026-11-09"></div></div>' +
      (ventas.length > 1 ? '<p style="margin:0;color:var(--ink-soft);font-size:13px">Se aplica a las facturas más viejas primero.</p>' : '') + '</div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="cb-ok">Registrar cobro</button></div>', (m) => {
      campoMonto($('#cb-monto', m));
      $('#cb-medio', m).addEventListener('change', () => { $('#cb-cheque', m).hidden = !$('#cb-medio', m).value.startsWith('cheques'); });
      $('#cb-ok', m).addEventListener('click', () => {
        const monto = parseNum($('#cb-monto', m).value);
        const [cajaId, medio] = $('#cb-medio', m).value.split('|');
        const errores = [];
        if (!(monto > 0)) errores.push('monto');
        else if (monto > saldo + 0.009) errores.push('monto (es mayor que el saldo)');
        if (cajaId === 'cheques' && !/^\d{6,10}$/.test($('#cb-chq-nro', m).value.trim())) errores.push('número de cheque');
        if (!mostrarErrores(m, errores)) return;
        let resto = monto; const fecha = ahora();
        ventas.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).forEach((v) => {
          if (resto <= 0) return;
          const aplica = r2(Math.min(resto, saldoVenta(v))); if (aplica <= 0) return;
          const cb = { nro: ++DB.contadores.recibo, fecha, monto: aplica, caja: cajaId, medio };
          if (cajaId === 'cheques') cb.cheque = { nro: $('#cb-chq-nro', m).value.trim(), banco: 'A confirmar', vence: new Date($('#cb-chq-vto', m).value + 'T12:00:00').toISOString() };
          v.cobros.push(cb); resto = r2(resto - aplica);
        });
        guardar(); cerrarModal(); toast('Cobro de ' + fmt(monto) + ' registrado. Recibo ' + String(DB.contadores.recibo).padStart(8, '0') + '.');
        const abierto = ventas.length === 1 ? ventas[0].id : null;
        render(); if (abierto) abrirVenta(abierto); else abrirCliente(ventas[0].clienteId);
      });
    });
  }

  /* ---------- clientes: alta y edición ---------- */
  function modalCliente(id) {
    const c = id ? cliente(id) : { nombre: '', doc: '', tipo: 'Mayorista', iva: 'Responsable inscripto', localidad: '', condicion: 'Cuenta corriente 30 días', percepciones: [], email: '', telefono: '' };
    const op = (arr, v) => arr.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
    const perc = ['IIBB Buenos Aires', 'IIBB CABA', 'IVA'];
    abrirModal(cabModal(id ? 'Editar cliente' : 'Nuevo cliente') +
      '<div class="m-b"><div class="campo"><label for="cl-nombre">Razón social o nombre</label><input class="input" id="cl-nombre" value="' + esc(c.nombre) + '"></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-tipo">Tipo</label><select class="input" id="cl-tipo">' + op(['Mayorista', 'Consumidor final'], c.tipo) + '</select></div><div class="campo"><label for="cl-doc">CUIT o DNI</label><input class="input mono" id="cl-doc" value="' + esc(c.doc) + '" placeholder="30-12345678-9"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-iva">Condición IVA</label><select class="input" id="cl-iva">' + op(['Responsable inscripto', 'Monotributo', 'Exento', 'Consumidor final'], c.iva) + '</select></div><div class="campo"><label for="cl-cond">Condición de pago</label><select class="input" id="cl-cond">' + op(['Contado', 'Transferencia contado', 'Cheque a 30 días', 'Cuenta corriente 30 días'], c.condicion) + '</select></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-loc">Localidad</label><input class="input" id="cl-loc" value="' + esc(c.localidad) + '"></div><div class="campo"><label for="cl-email">Email</label><input class="input" id="cl-email" type="email" value="' + esc(c.email) + '"></div></div>' +
      '<div class="campo"><label>Percepciones que se le aplican</label><div style="display:flex;gap:14px;flex-wrap:wrap">' + perc.map((p) => '<label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" value="' + esc(p) + '"' + (c.percepciones.includes(p) ? ' checked' : '') + '>' + esc(p) + '</label>').join('') + '</div><span class="ayuda">En el sistema final sale del padrón de cada provincia por CUIT</span></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="cl-ok">Guardar</button></div>', (m) => {
      $('#cl-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#cl-nombre', m).value.trim(), tipo: $('#cl-tipo', m).value, doc: $('#cl-doc', m).value.trim(), iva: $('#cl-iva', m).value, condicion: $('#cl-cond', m).value, localidad: $('#cl-loc', m).value.trim(), email: $('#cl-email', m).value.trim(), percepciones: $$('input[type=checkbox]:checked', m).map((x) => x.value) };
        const errores = [];
        if (d.nombre.length < 3) errores.push('razón social');
        const dig = d.doc.replace(/\D/g, '');
        if (d.tipo === 'Mayorista' && !cuitValido(dig)) errores.push('CUIT válido (11 números)');
        if (d.tipo === 'Consumidor final' && !(dig.length === 11 ? cuitValido(dig) : /^\d{7,8}$/.test(dig))) errores.push('DNI o CUIT válido');
        if (!d.localidad) errores.push('localidad');
        if (d.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) errores.push('email válido');
        if (DB.clientes.some((x) => x.id !== id && x.doc.replace(/\D/g, '') === dig)) errores.push('CUIT o DNI (ya existe otro cliente con ese número)');
        if (!mostrarErrores(m, errores)) return;
        if (dig.length === 11) d.doc = dig.slice(0, 2) + '-' + dig.slice(2, 10) + '-' + dig.slice(10); else d.doc = dig;
        let cl;
        if (id) { cl = cliente(id); Object.assign(cl, d); } else { cl = { id: 'c' + Date.now(), telefono: '', ...d }; DB.clientes.push(cl); }
        guardar(); cerrarModal(); toast(id ? 'Cliente actualizado.' : 'Cliente ' + cl.nombre + ' creado.');
        if (location.hash !== '#/clientes') location.hash = '#/clientes'; else render();
        setTimeout(() => abrirCliente(cl.id), 30);
      });
    });
  }

  /* ---------- proveedores: alta, factura y pago ---------- */
  function modalProveedor(id) {
    const p = id ? proveedor(id) : { nombre: '', cuit: '', tipo: 'Proveedor', rubro: '', condicion: '30 días' };
    const op = (arr, v) => arr.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
    abrirModal(cabModal(id ? 'Editar' : 'Nuevo proveedor, servicio o gasto') +
      '<div class="m-b"><div class="campo"><label for="pv-nombre">Nombre</label><input class="input" id="pv-nombre" value="' + esc(p.nombre) + '"></div>' +
      '<div class="fila-2"><div class="campo"><label for="pv-tipo">Tipo</label><select class="input" id="pv-tipo">' + op(['Proveedor', 'Servicio', 'Impuesto', 'Sueldo'], p.tipo) + '</select><span class="ayuda">Los sueldos y servicios no se mezclan con los proveedores</span></div><div class="campo"><label for="pv-cuit">CUIT</label><input class="input mono" id="pv-cuit" value="' + esc(p.cuit) + '"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="pv-rubro">Rubro</label><input class="input" id="pv-rubro" value="' + esc(p.rubro) + '" placeholder="Ej: madera, pintura, embalaje"></div><div class="campo"><label for="pv-cond">Condición de pago</label><select class="input" id="pv-cond">' + op(['Contado', '15 días', '30 días', '60 días'], p.condicion) + '</select></div></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="pv-ok">Guardar</button></div>', (m) => {
      $('#pv-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#pv-nombre', m).value.trim(), tipo: $('#pv-tipo', m).value, cuit: $('#pv-cuit', m).value.trim(), rubro: $('#pv-rubro', m).value.trim(), condicion: $('#pv-cond', m).value };
        const errores = [];
        if (d.nombre.length < 3) errores.push('nombre');
        const dig = d.cuit.replace(/\D/g, '');
        if (d.tipo !== 'Sueldo' && !cuitValido(dig)) errores.push('CUIT válido');
        if (!d.rubro) errores.push('rubro');
        if (!mostrarErrores(m, errores)) return;
        if (dig.length === 11) d.cuit = dig.slice(0, 2) + '-' + dig.slice(2, 10) + '-' + dig.slice(10);
        let pr;
        if (id) { pr = proveedor(id); Object.assign(pr, d); } else { pr = { id: 'p' + Date.now(), movs: [], ...d }; DB.proveedores.push(pr); }
        UI.proveedores.tab = pr.tipo;
        guardar(); cerrarModal(); toast(id ? 'Datos actualizados.' : pr.nombre + ' creado.');
        if (location.hash !== '#/proveedores') location.hash = '#/proveedores'; else render();
        setTimeout(() => abrirProveedor(pr.id), 30);
      });
    });
  }
  function modalFacturaProveedor(id) {
    const p0 = id ? proveedor(id) : null;
    abrirModal(cabModal('Cargar factura o gasto') +
      '<div class="m-b"><div class="campo sugerencias"><label for="fp-prov">Proveedor, servicio, impuesto o sueldo</label><input class="input" id="fp-prov" autocomplete="off" value="' + esc(p0 ? p0.nombre : '') + '" data-id="' + esc(p0 ? p0.id : '') + '" placeholder="Buscar por nombre o CUIT"><div class="lista"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="fp-comp">Comprobante</label><input class="input mono" id="fp-comp" placeholder="0003-00012345"><span class="ayuda">En el sistema final se valida contra ARCA</span></div><div class="campo"><label for="fp-monto">Total</label><input class="input num" id="fp-monto" inputmode="decimal" placeholder="0,00"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="fp-fecha">Fecha</label><input class="input" type="date" id="fp-fecha" value="2026-10-09"></div><div class="campo"><label for="fp-vence">Vence</label><input class="input" type="date" id="fp-vence" value="2026-11-08"></div></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="fp-ok">Guardar</button></div>', (m) => {
      sugeridor($('#fp-prov', m), (q) => DB.proveedores.filter((p) => !q || coincide(p.nombre + ' ' + p.cuit, q)).map((p) => ({ id: p.id, label: p.nombre, sub: p.tipo })), () => {});
      campoMonto($('#fp-monto', m));
      $('#fp-ok', m).addEventListener('click', () => {
        const p = proveedor($('#fp-prov', m).dataset.id);
        const comp = $('#fp-comp', m).value.trim(), monto = parseNum($('#fp-monto', m).value);
        const fe = $('#fp-fecha', m).value, ve = $('#fp-vence', m).value;
        const errores = [];
        if (!p) errores.push('proveedor (elegilo de la lista)');
        if (!/^\d{4}-\d{8}$/.test(comp)) errores.push('comprobante con formato 0003-00012345');
        if (!(monto > 0)) errores.push('total');
        if (!fe) errores.push('fecha');
        if (!ve || ve < fe) errores.push('vencimiento (igual o posterior a la fecha)');
        if (p && p.movs.some((x) => x.comp.endsWith(comp))) errores.push('comprobante (ya está cargado para este proveedor)');
        if (!mostrarErrores(m, errores)) return;
        const pre = p.tipo === 'Sueldo' ? 'Liquidación' : p.tipo === 'Impuesto' ? 'Obligación' : 'Factura A';
        p.movs.push({ id: 'f' + Date.now(), tipo: 'factura', fecha: new Date(fe + 'T12:00:00').toISOString(), comp: pre + ' ' + comp, monto: r2(monto), vence: new Date(ve + 'T12:00:00').toISOString(), detalle: p.rubro });
        UI.proveedores.tab = p.tipo;
        guardar(); cerrarModal(); toast('Comprobante cargado en la cuenta de ' + p.nombre + '.');
        if (location.hash !== '#/proveedores') location.hash = '#/proveedores'; else render();
        setTimeout(() => abrirProveedor(p.id), 30);
      });
    });
  }
  function modalPago(id) {
    const p = proveedor(id); const k = ctaProveedor(p);
    const filas = k.pend.map((f) => '<label style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:8px"><input type="checkbox" value="' + f.id + '" data-saldo="' + f.saldo + '" checked><span class="mono">' + esc(f.comp) + '<span class="sec" style="display:block;font-family:var(--sans);color:var(--ink-faint);font-size:12px">Vence ' + fFecha(f.vence) + '</span></span><span class="num">' + fmt(f.saldo) + '</span></label>').join('');
    abrirModal(cabModal('Orden de pago · ' + p.nombre) +
      '<div class="m-b"><div class="campo"><label>Facturas a pagar</label><div style="display:grid;gap:6px">' + filas + '</div></div>' +
      '<div class="campo"><label for="op-caja">Se paga desde</label><select class="input" id="op-caja"><option value="credicoop">Banco Credicoop</option><option value="santander">Banco Santander</option><option value="macro">Banco Macro</option><option value="efectivo">Efectivo</option></select></div>' +
      '<div class="desglose" id="op-desglose"></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="op-ok">Generar orden de pago</button></div>', (m) => {
      const calc = () => {
        const tot = $$('input[type=checkbox]:checked', m).reduce((s, x) => s + Number(x.dataset.saldo), 0);
        const ret = p.tipo === 'Proveedor' ? r2(tot * 0.03) : 0;
        const caja0 = $('#op-caja', m).value; const disp = saldoCaja(caja0).saldo;
        setHTML($('#op-desglose', m), '<span>Total de facturas</span><span class="num">' + fmt(tot) + '</span>' + (ret ? '<span class="resta">Retenciones (IIBB y Ganancias, ejemplo)</span><span class="num resta">-' + fmt(ret) + '</span>' : '') + '<span class="final">A transferir</span><span class="final num">' + fmt(tot - ret) + '</span><span style="color:var(--ink-soft);font-size:12.5px">Disponible en la caja</span><span class="num" style="color:var(--ink-soft);font-size:12.5px">' + fmt(disp) + '</span>');
        return { tot: r2(tot), ret, disp };
      };
      $$('input[type=checkbox]', m).forEach((x) => x.addEventListener('change', calc));
      $('#op-caja', m).addEventListener('change', calc);
      calc();
      $('#op-ok', m).addEventListener('click', () => {
        const { tot, ret, disp } = calc();
        const errores = [];
        if (!(tot > 0)) errores.push('al menos una factura');
        if (tot - ret > disp + 0.009) errores.push('caja con saldo suficiente');
        if (!mostrarErrores(m, errores)) return;
        const cajaId = $('#op-caja', m).value; const fecha = ahora();
        $$('input[type=checkbox]:checked', m).forEach((x) => {
          const s = Number(x.dataset.saldo);
          p.movs.push({ id: 'op' + (++DB.contadores.op), tipo: 'pago', fecha, comp: 'Orden de pago ' + DB.contadores.op, monto: s, caja: cajaId, retenciones: p.tipo === 'Proveedor' ? r2(s * 0.03) : 0, aplicaA: x.value });
        });
        guardar(); cerrarModal(); toast('Orden de pago generada por ' + fmt(tot - ret) + '. Certificados de retención listos (simulado).');
        render(); abrirProveedor(p.id);
      });
    });
  }

  /* ---------- cajas: movimientos manuales ---------- */
  function modalMovCaja(tipo) {
    const ops = DB.cajas.filter((c) => c.tipo === 'banco' || c.tipo === 'billetera' || c.tipo === 'efectivo').map((c) => '<option value="' + c.id + '">' + esc(c.nombre) + '</option>').join('');
    const t = { transferencia: 'Transferir entre cajas', ingreso: 'Ingreso a caja', retiro: 'Retiro de caja' }[tipo];
    abrirModal(cabModal(t) +
      '<div class="m-b"><div class="fila-2">' +
        (tipo !== 'ingreso' ? '<div class="campo"><label for="mc-desde">Desde</label><select class="input" id="mc-desde">' + ops + '</select></div>' : '') +
        (tipo !== 'retiro' ? '<div class="campo"><label for="mc-hacia">' + (tipo === 'ingreso' ? 'Caja' : 'Hacia') + '</label><select class="input" id="mc-hacia">' + ops + '</select></div>' : '') +
      '</div><div class="fila-2"><div class="campo"><label for="mc-monto">Monto</label><input class="input num" id="mc-monto" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="mc-detalle">Detalle</label><input class="input" id="mc-detalle" placeholder="' + (tipo === 'transferencia' ? 'Ej: retiro de Mercado Pago' : 'Motivo') + '"></div></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="mc-ok">Guardar</button></div>', (m) => {
      if (tipo === 'transferencia') $('#mc-hacia', m).value = 'credicoop';
      campoMonto($('#mc-monto', m));
      $('#mc-ok', m).addEventListener('click', () => {
        const monto = parseNum($('#mc-monto', m).value);
        const desde = $('#mc-desde', m) ? $('#mc-desde', m).value : null;
        const hacia = $('#mc-hacia', m) ? $('#mc-hacia', m).value : null;
        const det = $('#mc-detalle', m).value.trim();
        const errores = [];
        if (!(monto > 0)) errores.push('monto');
        if (tipo === 'transferencia' && desde === hacia) errores.push('cajas distintas');
        if (desde && monto > saldoCaja(desde).saldo + 0.009) errores.push('monto (supera el saldo de la caja)');
        if (tipo !== 'transferencia' && !det) errores.push('detalle');
        if (!mostrarErrores(m, errores)) return;
        DB.movsCaja.push({ id: 'mc' + (++DB.contadores.mov), tipo, fecha: ahora(), desde, hacia, monto: r2(monto), concepto: tipo === 'ingreso' ? 'Ingreso manual' : tipo === 'retiro' ? 'Retiro manual' : 'Transferencia', detalle: det });
        guardar(); cerrarModal(); toast('Movimiento guardado.'); render();
      });
    });
  }

  /* ---------- productos ---------- */
  function modalStock(id) {
    const p = producto(id);
    abrirModal(cabModal('Ajustar stock · ' + p.nombre) +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="st-dep">Depósito</label><select class="input" id="st-dep"><option value="fabrica">Fábrica (' + p.stock.fabrica + ')</option><option value="full">Full Mercado Libre (' + p.stock.full + ')</option></select></div><div class="campo"><label for="st-cant">Cantidad</label><input class="input num" id="st-cant" inputmode="numeric" placeholder="Ej: 20 o -3"><span class="ayuda">Positivo suma, negativo resta</span></div></div>' +
      '<div class="campo"><label for="st-motivo">Motivo</label><select class="input" id="st-motivo"><option>Ingreso de producción</option><option>Envío a Full</option><option>Rotura</option><option>Recuento</option></select></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="st-ok">Guardar</button></div>', (m) => {
      $('#st-ok', m).addEventListener('click', () => {
        const dep = $('#st-dep', m).value; const c = parseInt($('#st-cant', m).value, 10);
        const errores = [];
        if (!Number.isInteger(c) || c === 0) errores.push('cantidad distinta de cero');
        else if (p.stock[dep] + c < 0) errores.push('cantidad (dejaría el stock en negativo)');
        if (!mostrarErrores(m, errores)) return;
        p.stock[dep] += c;
        if ($('#st-motivo', m).value === 'Envío a Full' && dep === 'full' && c > 0) p.stock.fabrica = Math.max(0, p.stock.fabrica - c);
        guardar(); cerrarModal(); toast('Stock actualizado.'); render(); abrirProducto(p.id);
      });
    });
  }
  function modalProducto(id) {
    const p = id ? producto(id) : { nombre: '', sku: '', rubro: 'Sillas', precio: '', precioMayorista: '', costo: '', minimo: 30 };
    abrirModal(cabModal(id ? 'Editar precios' : 'Nuevo producto') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="pr-nombre">Nombre</label><input class="input" id="pr-nombre" value="' + esc(p.nombre) + '"' + (id ? ' readonly' : '') + '></div><div class="campo"><label for="pr-sku">Código</label><input class="input mono" id="pr-sku" value="' + esc(p.sku) + '"' + (id ? ' readonly' : '') + '></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="pr-precio">Precio de lista</label><input class="input num" id="pr-precio" inputmode="decimal" value="' + (p.precio ? fmtInput(p.precio) : '') + '"></div><div class="campo"><label for="pr-may">Precio mayorista</label><input class="input num" id="pr-may" inputmode="decimal" value="' + (p.precioMayorista ? fmtInput(p.precioMayorista) : '') + '"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="pr-costo">Costo</label><input class="input num" id="pr-costo" inputmode="decimal" value="' + (p.costo ? fmtInput(p.costo) : '') + '"></div><div class="campo"><label for="pr-rubro">Rubro</label><select class="input" id="pr-rubro">' + ['Sillas', 'Mesas', 'Combos', 'Oficina', 'Gamer', 'Banquetas', 'Deco'].map((r) => '<option' + (r === p.rubro ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></div></div>' +
      (id ? '<p style="margin:0;color:var(--ink-soft);font-size:13px">En el sistema final el precio nuevo se publica solo en Mercado Libre y Tiendanube.</p>' : '') + '</div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="pr-ok">Guardar</button></div>', (m) => {
      ['#pr-precio', '#pr-may', '#pr-costo'].forEach((s) => campoMonto($(s, m)));
      $('#pr-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#pr-nombre', m).value.trim(), sku: $('#pr-sku', m).value.trim().toUpperCase(), precio: parseNum($('#pr-precio', m).value), precioMayorista: parseNum($('#pr-may', m).value), costo: parseNum($('#pr-costo', m).value), rubro: $('#pr-rubro', m).value };
        const errores = [];
        if (d.nombre.length < 3) errores.push('nombre');
        if (!/^[A-Z0-9-]{3,}$/.test(d.sku)) errores.push('código');
        if (!id && DB.productos.some((x) => x.sku === d.sku)) errores.push('código (ya existe)');
        if (!(d.precio > 0)) errores.push('precio de lista');
        if (!(d.precioMayorista > 0)) errores.push('precio mayorista');
        if (!(d.costo > 0)) errores.push('costo');
        if (!mostrarErrores(m, errores)) return;
        let pr;
        if (id) { pr = producto(id); Object.assign(pr, { precio: d.precio, precioMayorista: d.precioMayorista, costo: d.costo, rubro: d.rubro }); }
        else { pr = { id: 'pr' + Date.now(), ...d, stock: { fabrica: 0, full: 0 }, minimo: 30 }; DB.productos.push(pr); }
        guardar(); cerrarModal(); toast(id ? 'Precios actualizados.' : 'Producto creado.');
        if (location.hash !== '#/productos') location.hash = '#/productos'; else render();
        setTimeout(() => abrirProducto(pr.id), 30);
      });
    });
  }

  /* ================= búsqueda global ================= */
  function buscarGlobal(q) {
    const s = sinAcentos(q.trim()); if (s.length < 2) return [];
    const out = [];
    const vs = DB.ventas.filter((v) => coincide(v.id + ' ' + compTxt(v) + ' ' + cliente(v.clienteId).nombre, s)).slice(-5).reverse();
    if (vs.length) out.push(['Ventas', vs.map((v) => ({ tipo: 'venta', id: v.id, label: 'Venta ' + v.id + ' · ' + cliente(v.clienteId).nombre, sub: fmt0(v.total) }))]);
    const cs = DB.clientes.filter((c) => coincide(c.nombre + ' ' + c.doc, s)).slice(0, 5);
    if (cs.length) out.push(['Clientes', cs.map((c) => ({ tipo: 'cliente', id: c.id, label: c.nombre, sub: c.doc }))]);
    const ps = DB.proveedores.filter((p) => coincide(p.nombre + ' ' + p.cuit + ' ' + p.rubro, s)).slice(0, 5);
    if (ps.length) out.push(['Proveedores y gastos', ps.map((p) => ({ tipo: 'proveedor', id: p.id, label: p.nombre, sub: p.tipo }))]);
    const pr = DB.productos.filter((p) => coincide(p.nombre + ' ' + p.sku, s)).slice(0, 5);
    if (pr.length) out.push(['Productos', pr.map((p) => ({ tipo: 'producto', id: p.id, label: p.nombre, sub: p.sku }))]);
    return out;
  }
  const ACCIONES = [
    { label: 'Nueva venta oficial', ic: 'ph-plus-circle', run: () => modalNuevaVenta('Oficial') },
    { label: 'Nueva cotización', ic: 'ph-file-dashed', run: () => modalNuevaVenta('Cotización') },
    { label: 'Cargar factura de proveedor', ic: 'ph-file-plus', run: () => modalFacturaProveedor(null) },
    { label: 'Transferir entre cajas', ic: 'ph-arrows-left-right', run: () => modalMovCaja('transferencia') },
    { label: 'Ir a Panel general', ic: 'ph-squares-four', run: () => { location.hash = '#/inicio'; } },
    { label: 'Ir a Centro de ventas', ic: 'ph-receipt', run: () => { location.hash = '#/ventas'; } },
    { label: 'Ir a Clientes', ic: 'ph-users', run: () => { location.hash = '#/clientes'; } },
    { label: 'Ir a Proveedores y gastos', ic: 'ph-truck', run: () => { location.hash = '#/proveedores'; } },
    { label: 'Ir a Cajas y bancos', ic: 'ph-bank', run: () => { location.hash = '#/cajas'; } },
    { label: 'Ir a Productos y stock', ic: 'ph-package', run: () => { location.hash = '#/productos'; } },
    { label: 'Ir a Informes', ic: 'ph-chart-bar', run: () => { location.hash = '#/informes'; } },
    { label: 'Cambiar tema claro u oscuro', ic: 'ph-moon', run: () => { const b = document.querySelector('[data-accion="tema"]'); if (b) b.click(); } }
  ];
  const ICONO_TIPO = { venta: 'ph-receipt', cliente: 'ph-user', proveedor: 'ph-truck', producto: 'ph-package' };
  let paletaItems = [], paletaActivo = 0;
  function abrirPaleta() {
    const w = $('#paleta-wrap'); w.classList.add('abierto'); w.setAttribute('aria-hidden', 'false');
    const inp = $('#busqueda-global'); inp.value = ''; paletaActivo = 0; pintarPaleta(); inp.focus();
  }
  function cerrarPaleta() { const w = $('#paleta-wrap'); w.classList.remove('abierto'); w.setAttribute('aria-hidden', 'true'); }
  function pintarPaleta() {
    const q = $('#busqueda-global').value;
    const grupos = [];
    const acc = ACCIONES.filter((a) => coincide(a.label, sinAcentos(q.trim())));
    const res = buscarGlobal(q).map(([t, items]) => [t, items.map((it) => ({ ...it, ic: ICONO_TIPO[it.tipo] }))]);
    if (q.trim()) { grupos.push(...res); if (acc.length) grupos.push(['Acciones', acc.slice(0, 5)]); }
    else grupos.push(['Acciones rápidas', acc.slice(0, 4)], ['Ir a', acc.slice(4)]);
    paletaItems = grupos.flatMap((g) => g[1]);
    if (paletaActivo >= paletaItems.length) paletaActivo = 0;
    let i = 0;
    setHTML($('#resultados-global'), paletaItems.length ? grupos.map(([t, items]) => '<h4>' + esc(t) + '</h4>' + items.map((it) => { const k = i++; return '<button type="button" role="option" data-i="' + k + '" aria-selected="' + (k === paletaActivo) + '" class="' + (k === paletaActivo ? 'activo' : '') + '"><i class="ph ' + esc(it.ic || 'ph-arrow-right') + '"></i><span>' + esc(it.label) + '</span><span class="r-sub">' + esc(it.sub || '') + '</span></button>'; }).join('')).join('') : '<div class="vacio">Sin resultados para "' + esc(q) + '"</div>');
    const act = $('#resultados-global .activo'); if (act) act.scrollIntoView({ block: 'nearest' });
  }
  function ejecutarItem(it) {
    cerrarPaleta();
    if (it.run) { it.run(); return; }
    const destino = { venta: 'ventas', cliente: 'clientes', proveedor: 'proveedores', producto: 'productos' }[it.tipo];
    const abrir = { venta: abrirVenta, cliente: abrirCliente, proveedor: abrirProveedor, producto: abrirProducto }[it.tipo];
    if (it.tipo === 'proveedor') UI.proveedores.tab = proveedor(it.id).tipo;
    if (location.hash !== '#/' + destino) location.hash = '#/' + destino;
    setTimeout(() => abrir(it.id), 30);
  }
  function montarBusqueda() {
    const inp = $('#busqueda-global'), res = $('#resultados-global');
    inp.addEventListener('input', () => { paletaActivo = 0; pintarPaleta(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletaActivo = Math.min(paletaItems.length - 1, paletaActivo + 1); pintarPaleta(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletaActivo = Math.max(0, paletaActivo - 1); pintarPaleta(); }
      else if (e.key === 'Enter' && paletaItems[paletaActivo]) { e.preventDefault(); ejecutarItem(paletaItems[paletaActivo]); }
      else if (e.key === 'Escape') { e.stopPropagation(); cerrarPaleta(); }
    });
    res.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); ejecutarItem(paletaItems[Number(b.dataset.i)]); } });
    $('#paleta-wrap').addEventListener('mousedown', (e) => { if (e.target.id === 'paleta-wrap') cerrarPaleta(); });
  }

  /* ================= movimiento ================= */
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  UI.animar = true; UI.ind = {};
  function contar() {
    if (reduce()) return;
    $$('.k-v[data-valor]').forEach((el) => {
      const fin = Number(el.dataset.valor); const t0 = performance.now(); const dur = 450;
      const paso = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmtM(fin * e); if (k < 1) requestAnimationFrame(paso); else el.textContent = fmtM(fin); };
      requestAnimationFrame(paso);
    });
  }
  function indicadores() {
    $$('.tabs[data-key]').forEach((t) => {
      let ind = $('.ind', t); if (!ind) { ind = document.createElement('span'); ind.className = 'ind'; t.appendChild(ind); }
      const sel = $('[aria-selected="true"]', t); if (!sel) return;
      const destino = [sel.offsetLeft, sel.offsetWidth];
      const poner = (q) => { ind.style.transform = 'translateX(' + q[0] + 'px) scaleX(' + (q[1] / 100) + ')'; };
      const prev = UI.ind[t.dataset.key];
      if (prev && !reduce() && (prev[0] !== destino[0] || prev[1] !== destino[1])) { ind.style.transition = 'none'; poner(prev); void ind.offsetWidth; ind.style.transition = ''; }
      poner(destino); UI.ind[t.dataset.key] = destino;
    });
  }

  /* ================= eventos ================= */
  function cerrarMenu() { $('#app').classList.remove('menu-abierto'); }
  document.addEventListener('click', (e) => {
    const ac = e.target.closest('[data-accion]');
    const irA = e.target.closest('[data-ir]');
    const fila = e.target.closest('[data-venta],[data-cliente],[data-proveedor],[data-producto],[data-caja]');
    if (ac) {
      const a = ac.dataset.accion, id = ac.dataset.id;
      switch (a) {
        case 'abrir-menu': $('#app').classList.add('menu-abierto'); return;
        case 'cerrar-menu': cerrarMenu(); return;
        case 'tema': {
          const r = document.documentElement;
          const oscuroAhora = r.dataset.theme ? r.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
          r.dataset.theme = oscuroAhora ? 'light' : 'dark';
          try { localStorage.setItem('hdc-tema', oscuroAhora ? 'claro' : 'oscuro'); } catch (er) { /* sin almacenamiento */ }
          return;
        }
        case 'periodo': UI.periodo = ac.dataset.periodo; UI.animar = true; render(); return;
        case 'paleta': abrirPaleta(); return;
        case 'nueva-venta': modalNuevaVenta(ac.dataset.version || 'Oficial', ac.dataset.clienteId); return;
        case 'cerrar-drawer': cerrarDrawer(); return;
        case 'cerrar-modal': cerrarModal(); return;
        case 'tab-ventas': UI.ventas.tab = ac.dataset.tab; UI.ventas.limite = 60; refrescar(); return;
        case 'tab-clientes': UI.clientes.tab = ac.dataset.tab; UI.clientes.limite = 60; refrescar(); return;
        case 'tab-proveedores': UI.proveedores.tab = ac.dataset.tab; refrescar(); return;
        case 'mas-ventas': UI.ventas.limite += 60; refrescar(); return;
        case 'mas-clientes': UI.clientes.limite += 60; refrescar(); return;
        case 'limpiar-ventas': Object.assign(UI.ventas, { q: '', canal: '', desde: '', hasta: '' }); location.hash = '#/ventas'; refrescar(); return;
        case 'exportar-ventas': descargarCSV('ventas-hdc', ['Venta', 'Fecha', 'Cliente', 'Canal', 'Comprobante', 'Total', 'Cobrado', 'Estado de cobro', 'Acreditación', 'Neto'], filtrarVentas().map((v) => [v.id, fFechaHora(v.fecha), cliente(v.clienteId).nombre, canal(v.canal).nombre, compTxt(v), v.total, cobrado(v), estadoCobro(v), estadoAcred(v), netoVenta(v)])); toast('Excel descargado.'); return;
        case 'exportar-informe': { const inf = datosInforme(id); descargarCSV(id, inf.cols, inf.filas); toast('Excel descargado.'); return; }
        case 'informe-final': abrirModal(cabModal(ac.dataset.nombre) + '<div class="m-b"><p style="margin:0">Este informe sale en el sistema final, con el formato que pide cada organismo, listo para presentar o pasarle al estudio contable. Usa la misma base que el resto de los informes.</p></div><div class="m-f"><button type="button" class="btn primary" data-accion="cerrar-modal">Entendido</button></div>'); return;
        case 'cobrar-venta': modalCobro([venta(id)], 'Registrar cobro · Venta ' + id); return;
        case 'cobrar-cliente': modalCobro(DB.ventas.filter((v) => v.clienteId === id && saldoVenta(v) > 0.009), 'Registrar cobro · ' + cliente(id).nombre); return;
        case 'remitir': { const v = venta(id); v.remitida = true; v.estado = 'Finalizada'; guardar(); toast('Remito R 0001-' + String(3300 + v.id % 1000).padStart(8, '0') + ' generado.'); render(); abrirVenta(id); return; }
        case 'convertir-cotizacion': { const v = venta(id); v.version = 'Oficial'; v.estado = 'Pendiente de remitir'; const c = cliente(v.clienteId); const pv = v.canal === 'mayorista' ? '0007' : '0001'; DB.contadores.comp[pv] += 1; v.comp = { tipo: 'Factura ' + (c.iva === 'Responsable inscripto' ? 'A' : 'B'), pv, nro: String(DB.contadores.comp[pv]).padStart(8, '0'), cae: String(Math.floor(7.1e13 + Math.random() * 8e12)) }; v.acred.vence = new Date(HOY.getTime() + 30 * 864e5).toISOString(); v.items.forEach((l) => { const p = producto(l.productoId); p.stock.fabrica = Math.max(0, p.stock.fabrica - l.cant); }); guardar(); toast('Cotización pasada a venta. ' + v.comp.tipo + ' emitida (simulada).'); render(); abrirVenta(id); return; }
        case 'anular': confirmar('Anular venta ' + id, 'Se emite una nota de crédito por el total, se devuelve el cobro y el stock vuelve a fábrica. No se puede deshacer.', 'Anular con nota de crédito', () => {
          const v = venta(id); v.estado = 'Anulada'; v.remitida = false;
          const pv = v.comp.pv || '0001'; DB.contadores.nc[pv] = (DB.contadores.nc[pv] || 0) + 1;
          v.nc = { tipo: 'Nota de crédito ' + (v.comp.tipo.endsWith('A') ? 'A' : 'B'), pv, nro: String(DB.contadores.nc[pv]).padStart(8, '0'), fecha: ahora() };
          v.acred = { estado: 'Devuelta', fecha: v.nc.fecha, comision: 0, envio: 0, retencion: 0, cuotas: 0 };
          v.items.forEach((l) => { const p = producto(l.productoId); if (p) p.stock.fabrica += l.cant; });
          guardar(); toast('Venta anulada. ' + v.nc.tipo + ' ' + pv + '-' + v.nc.nro + ' emitida (simulada).'); render(); abrirVenta(id);
        }); return;
        case 'imprimir': toast('En el sistema final se descarga el PDF del comprobante con su QR de ARCA.'); return;
        case 'nuevo-cliente': modalCliente(null); return;
        case 'editar-cliente': modalCliente(id); return;
        case 'nuevo-proveedor': modalProveedor(null); return;
        case 'editar-proveedor': modalProveedor(id); return;
        case 'nueva-factura-prov': modalFacturaProveedor(id); return;
        case 'pagar-proveedor': modalPago(id); return;
        case 'mov-caja': modalMovCaja(ac.dataset.tipo); return;
        case 'conciliar': { const c = caja(id); DB.movsCaja.push({ id: 'mc' + (++DB.contadores.mov), tipo: 'retiro', fecha: new Date(2026, 9, 8, 12).toISOString(), desde: id, hacia: null, monto: Math.abs(c.difExtracto), concepto: 'Gasto bancario', detalle: 'Comisión por mantenimiento de cuenta' }); c.difExtracto = 0; guardar(); toast(c.nombre + ' conciliado con el extracto.'); render(); abrirCaja(id); return; }
        case 'ajustar-stock': modalStock(id); return;
        case 'editar-producto': modalProducto(id); return;
        case 'nuevo-producto': modalProducto(null); return;
        case 'restablecer': e.preventDefault(); confirmar('Restablecer datos de ejemplo', 'Se borra todo lo que cargaste en esta maqueta y vuelve la base de ejemplo original.', 'Restablecer', () => { DB = window.HDC_SEED(); guardar(); UI.periodo = 'mes'; location.hash = '#/inicio'; render(); toast('Base de ejemplo restablecida.'); }); return;
      }
    }
    if (irA && !e.target.closest('a[href]')) { location.hash = '#/' + irA.dataset.ir; return; }
    if (fila) {
      if (e.target.closest('a[data-cliente]')) e.preventDefault();
      if (fila.dataset.venta) abrirVenta(fila.dataset.venta);
      else if (fila.dataset.cliente) abrirCliente(fila.dataset.cliente);
      else if (fila.dataset.proveedor) abrirProveedor(fila.dataset.proveedor);
      else if (fila.dataset.producto) abrirProducto(fila.dataset.producto);
      else if (fila.dataset.caja) abrirCaja(fila.dataset.caja);
    }
  });
  function refrescar() {
    const activo = document.activeElement && document.activeElement.id;
    const pos = activo && document.activeElement.selectionStart;
    const { partes, params } = ruta();
    const V = { ventas: vVentas, clientes: vClientes, proveedores: vProveedores, productos: vProductos }[partes[0]];
    if (!V) { render(); return; }
    setHTML($('#vista'), '<div>' + V(partes, params) + '</div>');
    pintarNav();
    indicadores();
    if (activo) { const el = document.getElementById(activo); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) { /* no aplica */ } } }
  }
  let tBusq;
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    const debounce = (fn) => { clearTimeout(tBusq); tBusq = setTimeout(fn, 160); };
    if (id === 'f-ventas-q') debounce(() => { UI.ventas.q = e.target.value; UI.ventas.limite = 60; refrescar(); });
    if (id === 'f-clientes-q') debounce(() => { UI.clientes.q = e.target.value; UI.clientes.limite = 60; refrescar(); });
    if (id === 'f-prov-q') debounce(() => { UI.proveedores.q = e.target.value; refrescar(); });
    if (id === 'f-prod-q') debounce(() => { UI.productos.q = e.target.value; refrescar(); });
  });
  document.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'f-ventas-canal') { UI.ventas.canal = e.target.value; UI.ventas.limite = 60; refrescar(); }
    if (id === 'f-ventas-desde') { UI.ventas.desde = e.target.value; refrescar(); }
    if (id === 'f-ventas-hasta') { UI.ventas.hasta = e.target.value; refrescar(); }
    if (id === 'f-clientes-saldo') { UI.clientes.conSaldo = e.target.checked; refrescar(); }
    if (id === 'f-prod-rubro') { UI.productos.rubro = e.target.value; refrescar(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#paleta-wrap').classList.contains('abierto')) cerrarPaleta(); else abrirPaleta(); return; }
    if (e.key === 'Escape') {
      if ($('#paleta-wrap').classList.contains('abierto')) { cerrarPaleta(); return; }
      if ($('#modal-wrap').classList.contains('abierto')) cerrarModal();
      else if ($('#drawer-wrap').classList.contains('abierto')) cerrarDrawer();
      else cerrarMenu();
    }
    if (e.key === 'Tab' && $('#modal-wrap').classList.contains('abierto')) {
      const f = $$('#modal button, #modal input, #modal select').filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('#modal-wrap').addEventListener('mousedown', (e) => { if (e.target.id === 'modal-wrap') cerrarModal(); });
  window.addEventListener('hashchange', () => { cerrarDrawer(); render(true); });

  cargar();
  montarBusqueda();
  render(true);
})();

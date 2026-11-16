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
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  const cuitValido = (c) => {
    const d = String(c).replace(/\D/g, '');
    if (d.length !== 11) return false;
    const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * m[i];
    let v = 11 - (s % 11); if (v === 11) v = 0; if (v === 10) v = 9;
    return v === Number(d[10]);
  };

  /* ================= base de datos ================= */
  const VERSION = 9;
  const KEY = 'hdc-argos-maqueta-v9';
  const HOY = window.HDC_HOY;
  const INI_HOY = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  const FIN_HOY = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), 23, 59, 59, 999);
  const REGLAS = window.HDC_REGLAS;
  const USUARIO = 'u1';
  let DB;
  let cache = {};
  function cargar() {
    try { const s = localStorage.getItem(KEY); if (s) { DB = JSON.parse(s); if (DB && DB.version === VERSION) return; } } catch (e) { /* base nueva */ }
    DB = window.HDC_SEED(); guardar();
  }
  /* Todo lo calculado (stock por depósito) se vuelve a calcular después de cada guardado. */
  function guardar() {
    cache = {};
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('No se pudo guardar en este navegador. Los cambios se pierden al cerrar.'); }
  }
  function ahora() {
    DB.contadores.reloj = (DB.contadores.reloj || HOY.getTime()) + 60000;
    return new Date(DB.contadores.reloj).toISOString();
  }
  const nuevoId = (pre) => pre + (++DB.contadores.id);
  const porId = (col) => (id) => DB[col].find((x) => x.id === id);
  const canal = (id) => DB.canales.find((c) => c.id === id);
  const caja = (id) => DB.cajas.find((c) => c.id === id);
  const cliente = (id) => DB.clientes.find((c) => c.id === id);
  const proveedor = (id) => DB.proveedores.find((p) => p.id === id);
  const producto = (id) => DB.productos.find((p) => p.id === id);
  const venta = (id) => { if (!cache.ventas) { cache.ventas = {}; DB.ventas.forEach((v) => { cache.ventas[v.id] = v; }); } return cache.ventas[Number(id)]; };
  const deposito = porId('depositos');
  const vendedor = porId('vendedores');
  const operador = porId('operadores');
  const listaPrecios = porId('listas');
  const cheque = porId('cheques');
  const chequera = porId('chequeras');
  const remito = porId('remitos');
  const orden = porId('ordenes');
  const nombreDe = (x, sino) => x ? x.nombre : (sino || '');
  const mismoNombre = (a, b) => sinAcentos(a).trim() === sinAcentos(b).trim();
  const masDias = (f, n) => { const x = new Date(f); x.setDate(x.getDate() + n); return x; };
  const toISODate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const deISODate = (s) => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const finDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  /* ================= cálculos de venta ================= */
  const esVenta = (v) => v.version !== 'Cotización';
  const anulada = (v) => v.estado === 'Anulada';
  const importeLinea = REGLAS.importeLinea;
  const cobrado = (v) => anulada(v) ? 0 : r2(v.cobros.reduce((s, c) => s + c.monto, 0));
  const saldoVenta = (v) => anulada(v) || !esVenta(v) ? 0 : r2(Math.max(0, v.total - cobrado(v)));
  /* Lo que se descuenta entre lo cobrado y lo que entra: lo que informa el canal más lo que se retuvo en cada cobro. */
  function descuentos(v) {
    const a = v.acred || {};
    const d = { comision: a.comision || 0, envio: a.envio || 0, retencion: a.retencion || 0, cuotas: a.cuotas || 0 };
    v.cobros.forEach((c) => { d.comision += c.comision || 0; d.retencion += c.retencion || 0; });
    return d;
  }
  const deducciones = (v) => { if (anulada(v)) return 0; const d = descuentos(v); return r2(d.comision + d.envio + d.retencion + d.cuotas); };
  const netoVenta = (v) => anulada(v) ? 0 : r2(cobrado(v) - deducciones(v));
  /* En tránsito: lo cobrado que todavía no entró a una cuenta (tiendas, tarjetas y cheques en cartera). */
  const transitoVenta = (v) => anulada(v) ? 0 : r2(netoVenta(v) - acreditadoVenta(v));
  /* Un cheque de tercero está en cartera hasta que se deposita. */
  const enCartera = (c) => !!c.cheque && !c.depositado;
  const pendienteCanal = (v) => v.acred && (v.acred.estado === 'A liberar' || v.acred.estado === 'A liquidar');
  function acreditadoVenta(v) {
    if (anulada(v) || pendienteCanal(v)) return 0;
    const acc = v.cobros.reduce((s, c) => s + (enCartera(c) ? 0 : c.monto), 0);
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
    if (v.cobros.some(enCartera)) return 'Cheque en cartera';
    if (saldoVenta(v) > 0.009) return 'Cuenta corriente';
    return 'Acreditada';
  }
  /* Costo y utilidad de una venta: el costo queda guardado en cada renglón al vender. */
  function utilidadVenta(v) {
    const costo = r2(v.items.reduce((s, l) => s + (l.costo || 0) * l.cant, 0));
    const base = v.imp ? r2(v.imp.neto + (v.imp.exento || 0)) : r2(v.total);
    const utilidad = r2(base - costo);
    return { neto: base, costo, utilidad, pct: base ? Math.round(utilidad / base * 1000) / 10 : 0 };
  }
  const tieneMercaderia = (v) => v.items.some((l) => l.productoId);
  /* El remito vigente de una venta (ni anulado ni devuelto). Una venta no puede tener dos. */
  function remitoDe(v) {
    if (!cache.remitos) { cache.remitos = {}; DB.remitos.forEach((r) => { if (r.tipo === 'venta' && r.estado !== 'Anulado' && r.estado !== 'Devuelto') cache.remitos[r.ventaId] = r; }); }
    return cache.remitos[v.id] || null;
  }
  /* A remitir: la única cuenta. La usan el menú, el Panel, el Centro de ventas y Depósito. Una seña no se remite hasta estar cobrada entera. */
  const aRemitir = (v) => esVenta(v) && !anulada(v) && tieneMercaderia(v) && !remitoDe(v) && !(v.version === 'Seña' && saldoVenta(v) > 0.009);
  const ventasARemitir = () => DB.ventas.filter(aRemitir);
  const aEnviar = (v) => { const r = esVenta(v) && !anulada(v) ? remitoDe(v) : null; return !!r && (r.estado === 'Pendiente' || r.estado === 'Preparado'); };
  const badgeCobro = (e) => ({ Cobrada: 'b-ok', Parcial: 'b-warn', 'A cobrar': 'b-warn', Devuelta: 'b-bad', 'Cotización': 'b-neutro' }[e] || 'b-neutro');
  const badgeAcred = (e) => ({ Acreditada: 'b-ok', 'A liberar': 'b-info', 'A liquidar': 'b-info', 'Cheque en cartera': 'b-info', 'Cuenta corriente': 'b-warn', Devuelta: 'b-bad' }[e] || 'b-neutro');
  const iconoAcred = (e) => ({ Acreditada: 'ph-check-circle', 'A liberar': 'ph-hourglass-medium', 'A liquidar': 'ph-hourglass-medium', 'Cheque en cartera': 'ph-money', 'Cuenta corriente': 'ph-clock', Devuelta: 'ph-arrow-u-up-left' }[e] || 'ph-dot');

  /* Marcas: logo real cuando hay, y si no un ícono en chip según el tipo. Lo que agrega el usuario cae siempre en el ícono. */
  const L = 'assets/logos/';
  const MARCAS = {
    ml: { img: L + 'mercadolibre.svg', clase: 'm-ml' },
    tn: { img: L + 'tiendanube.png' },
    fravega: { img: L + 'fravega.png' },
    mp: { img: L + 'mercadopago.svg' },
    pagonube: { img: L + 'tiendanube.png' },
    marketplaces: { img: L + 'fravega.png' },
    credicoop: { img: L + 'credicoop.svg', lleno: true },
    santander: { img: L + 'santander.png' },
    macro: { img: L + 'macro.png' },
    'pr-macro': { img: L + 'macro.png' },
    provincia: { img: L + 'provincia.svg' },
    bna: { img: L + 'nacion.png', lleno: true }
  };
  const ICONO_CAJA = { billetera: 'ph-wallet', 'a-liquidar': 'ph-hourglass-medium', banco: 'ph-bank', cheques: 'ph-money-wavy', efectivo: 'ph-coins', prestamo: 'ph-handshake', interna: 'ph-vault', valores: 'ph-calendar-check', retenciones: 'ph-receipt-x' };
  const TONO_CAJA = { billetera: 't-azul', 'a-liquidar': 't-azul', banco: 't-azul', cheques: 't-ambar', efectivo: 't-verde', prestamo: 't-pizarra', interna: 't-pizarra', valores: 't-ambar', retenciones: 't-pizarra' };
  const TIPOS_CAJA = [['banco', 'Banco'], ['billetera', 'Billetera'], ['efectivo', 'Efectivo'], ['cheques', 'Cheques'], ['a-liquidar', 'A liquidar'], ['prestamo', 'Préstamo'], ['interna', 'Interna']];
  function marcaDe(key) {
    if (MARCAS[key]) return MARCAS[key];
    const c = canal(key);
    if (c) return { ic: c.ic || (c.id === 'mayorista' ? 'ph-buildings' : 'ph-storefront'), tono: c.tono || (c.id === 'mayorista' ? 't-pizarra' : 't-verde') };
    const k = caja(key);
    if (k) return { ic: k.ic || ICONO_CAJA[k.tipo] || 'ph-bank', tono: k.tono || TONO_CAJA[k.tipo] || 't-pizarra' };
    return null;
  }
  const marca = (key, tam) => {
    const m = marcaDe(key);
    if (!m) return '<span class="marca ico ' + (tam || '') + '"><i class="ph ph-circle"></i></span>';
    if (m.img) return '<span class="marca ' + (m.clase ? m.clase + ' ' : '') + (m.lleno ? 'lleno ' : '') + (tam || '') + '"><img src="' + m.img + '" alt="" loading="lazy" decoding="async"></span>';
    return '<span class="marca ico ' + esc(m.tono) + ' ' + (tam || '') + '"><i class="ph-duotone ' + esc(m.ic) + '"></i></span>';
  };
  const chipCanal = (id) => { const c = canal(id); return c ? '<span class="canal">' + marca(c.id) + esc(c.nombre) + '</span>' : ''; };
  const compTxt = (v) => v.comp.pv ? v.comp.tipo + ' ' + v.comp.pv + '-' + v.comp.nro : v.comp.tipo + ' ' + v.comp.nro;
  const ncTxt = (v) => v.nc.pv ? v.nc.tipo + ' ' + v.nc.pv + '-' + v.nc.nro : v.nc.tipo + ' ' + v.nc.nro;
  const CONEXION = { vivo: 'En vivo', asistida: 'Conexión asistida', manual: 'Se carga en el sistema' };

  /* ================= período: un solo rango de fechas para todo el sistema ================= */
  const ATAJOS = [
    ['hoy', 'Hoy', () => [INI_HOY, INI_HOY]],
    ['ayer', 'Ayer', () => [masDias(INI_HOY, -1), masDias(INI_HOY, -1)]],
    ['semana', 'Esta semana', () => [masDias(INI_HOY, -((INI_HOY.getDay() + 6) % 7)), INI_HOY]],
    ['mes', 'Este mes', () => [new Date(INI_HOY.getFullYear(), INI_HOY.getMonth(), 1), INI_HOY]],
    ['mes-pasado', 'Mes pasado', () => [new Date(INI_HOY.getFullYear(), INI_HOY.getMonth() - 1, 1), new Date(INI_HOY.getFullYear(), INI_HOY.getMonth(), 0)]]
  ];
  const RANGO = { desde: '', hasta: '', atajo: '' };
  function fijarRango(desde, hasta, atajo) {
    const a = desde <= hasta ? desde : hasta, b = desde <= hasta ? hasta : desde;
    RANGO.desde = toISODate(a); RANGO.hasta = toISODate(b); RANGO.atajo = atajo || '';
  }
  function fijarAtajo(id) { const a = ATAJOS.find((x) => x[0] === id) || ATAJOS[3]; const r = a[2](); fijarRango(r[0], r[1], a[0]); }
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const nombreMes = (d) => d.toLocaleDateString('es-AR', { month: 'long' });
  function periodo() {
    const desde = deISODate(RANGO.desde), fin = deISODate(RANGO.hasta), hasta = finDia(fin);
    const at = ATAJOS.find((x) => x[0] === RANGO.atajo);
    const unDia = RANGO.desde === RANGO.hasta, mismoMes = desde.getMonth() === fin.getMonth() && desde.getFullYear() === fin.getFullYear();
    let texto;
    if (unDia) texto = mayus(fDiaLargo(desde));
    else if (RANGO.atajo === 'mes') texto = mayus(nombreMes(desde)) + ', del ' + desde.getDate() + ' al ' + fin.getDate();
    else if (RANGO.atajo === 'mes-pasado') texto = mayus(nombreMes(desde)) + ' de ' + desde.getFullYear();
    else if (mismoMes) texto = 'Del ' + desde.getDate() + ' al ' + fin.getDate() + ' de ' + nombreMes(fin);
    else texto = 'Del ' + desde.getDate() + ' de ' + nombreMes(desde) + ' al ' + fin.getDate() + ' de ' + nombreMes(fin);
    const fechas = unDia ? fFecha(desde) : fFecha(desde) + ' al ' + fFecha(fin);
    return { desde, hasta, atajo: RANGO.atajo, texto, corto: at ? at[1] : fechas, fechas, incluyeHoy: hasta >= INI_HOY };
  }
  const enPeriodo = (x, p) => { const d = D(x); return d >= p.desde && d <= p.hasta; };
  const ventasDelPeriodo = () => { const p = periodo(); return DB.ventas.filter((v) => enPeriodo(v.fecha, p)); };

  /* Vendido, cobrado y acreditado: la única cuenta. La usan el Panel, el Centro de ventas y los informes. */
  function resumen(ventas) {
    const r = { n: 0, bruto: 0, anuladas: 0, ctacte: 0, cobrado: 0, comision: 0, envio: 0, retencion: 0, cuotas: 0, transito: 0, acreditado: 0 };
    for (const v of ventas) {
      if (!esVenta(v)) continue;
      r.bruto += v.total;
      if (anulada(v)) { r.anuladas += v.total; continue; }
      r.n++;
      const d = descuentos(v);
      r.ctacte += saldoVenta(v); r.cobrado += cobrado(v);
      r.comision += d.comision; r.envio += d.envio; r.retencion += d.retencion; r.cuotas += d.cuotas;
      r.acreditado += acreditadoVenta(v); r.transito += transitoVenta(v);
    }
    Object.keys(r).forEach((k) => { r[k] = r2(r[k]); });
    r.vendido = r2(r.bruto - r.anuladas);
    r.descuentos = r2(r.comision + r.envio + r.retencion + r.cuotas);
    r.sinExplicar = r2(r.bruto - r.anuladas - r.ctacte - r.descuentos - r.transito - r.acreditado);
    return r;
  }
  /* Un resumen por día del período (para las curvas de las tarjetas). Con un solo día, muestra la semana que termina ahí. */
  function serieDias(p) {
    const fin = new Date(p.hasta.getFullYear(), p.hasta.getMonth(), p.hasta.getDate());
    let ini = new Date(p.desde.getFullYear(), p.desde.getMonth(), p.desde.getDate());
    if (fin > INI_HOY && ini <= INI_HOY) fin.setTime(INI_HOY.getTime());
    if ((fin - ini) / 864e5 < 2) ini = masDias(fin, -6);
    if ((fin - ini) / 864e5 > 61) ini = masDias(fin, -61);
    const porDia = {};
    DB.ventas.forEach((v) => { const k = toISODate(D(v.fecha)); (porDia[k] || (porDia[k] = [])).push(v); });
    const out = [];
    for (let d = new Date(ini); d <= fin; d = masDias(d, 1)) out.push(resumen(porDia[toISODate(d)] || []));
    return out;
  }

  /* ================= cajas ================= */
  /* El saldo de una caja nunca se guarda: es su saldo inicial más sus movimientos hasta la fecha pedida. */
  const admiteNegativo = (c) => c.tipo === 'prestamo' || c.tipo === 'valores';
  const pagoVigente = (m) => m.tipo === 'pago' && !m.anulado;
  const cajaDeCobro = (v, c) => c.acreditaEn && !pendienteCanal(v) ? c.acreditaEn : c.caja;
  const retieneCaja = (cj, monto) => cj && cj.recargo ? r2(monto * cj.recargo / (100 + cj.recargo)) : 0;
  const dedCanal = (v) => { const a = v.acred || {}; return r2((a.comision || 0) + (a.envio || 0) + (a.retencion || 0) + (a.cuotas || 0)); };
  /* Lo que entra a la caja por un cobro: el monto, menos lo que descuenta el canal (va en el primer cobro) y lo que se retuvo en ese cobro. */
  const netoCobro = (v, c) => r2(c.monto - (v.cobros[0] === c ? dedCanal(v) : 0) - (c.comision || 0) - (c.retencion || 0));
  function movimientosCaja(id) {
    const out = [];
    const cj = caja(id);
    const esRet = cj && cj.tipo === 'retenciones';
    for (const v of DB.ventas) {
      if (anulada(v)) continue;
      const pend = pendienteCanal(v);
      const a = v.acred || {};
      v.cobros.forEach((c, i) => {
        const fecha = pend ? c.fecha : (a.estado === 'Acreditada' && c.automatico ? a.fecha : c.fecha);
        const nombre = nombreDe(cliente(v.clienteId));
        if (esRet) {
          const ret = r2((i === 0 && !pend ? a.retencion || 0 : 0) + (c.retencion || 0));
          if (ret > 0) out.push({ fecha, concepto: 'Retención de la venta ' + v.id, detalle: nombre, monto: ret, ventaId: v.id });
          return;
        }
        if (cajaDeCobro(v, c) !== id) return;
        out.push({ fecha, concepto: (c.automatico ? 'Liquidación venta ' : 'Cobro venta ') + v.id, detalle: nombre, monto: netoCobro(v, c), pendiente: pend, ventaId: v.id, cheque: enCartera(c) ? c.cheque : null, recibo: c.nro });
      });
    }
    for (const p of DB.proveedores) for (const m of p.movs) if (pagoVigente(m) && m.caja === id) out.push({ fecha: m.fecha, concepto: m.comp, detalle: p.nombre + (m.chequeId ? ' · cheque ' + nombreCheque(m.chequeId) : ''), monto: -r2(m.monto - (m.retenciones || 0)), proveedorId: p.id });
    for (const m of DB.movsCaja) {
      if (m.anulado) continue;
      const interno = m.tipo === 'transferencia';
      const base = { fecha: m.fecha, detalle: m.detalle || '', movId: m.id, interno, chequeId: m.chequeId || null };
      if (m.desde === id) out.push({ ...base, concepto: interno ? (m.chequeId ? 'Débito de cheque propio' : 'Transferencia a ' + nombreDe(caja(m.hacia))) : m.concepto, monto: -m.monto });
      if (m.hacia === id) out.push({ ...base, concepto: interno ? (m.chequeId ? 'Débito de cheque propio' : 'Transferencia desde ' + nombreDe(caja(m.desde))) : m.concepto, monto: m.monto });
    }
    return out.sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  }
  function saldoCaja(id, hastaFecha) {
    const c = caja(id);
    const hasta = hastaFecha || FIN_HOY;
    const movs = movimientosCaja(id).filter((m) => D(m.fecha) <= hasta);
    const saldo = r2(c.inicial + movs.filter((m) => !m.pendiente).reduce((s, m) => s + m.monto, 0));
    const pendiente = r2(movs.filter((m) => m.pendiente).reduce((s, m) => s + m.monto, 0));
    const aDebitar = c.tipo === 'banco' ? r2(DB.cheques.filter((ch) => ch.banco === id && estadoCheque(ch) === 'A debitar').reduce((s, ch) => s + ch.monto, 0)) : 0;
    const fuente = r2(saldo + (c.difExtracto || 0));
    return { saldo, pendiente, aDebitar, fuente, conciliado: Math.abs(fuente - saldo) < 0.01, movs };
  }
  /* Un préstamo es una caja: su saldo es lo que falta devolver. */
  function prestamoInfo(c) {
    const s = saldoCaja(c.id);
    const recibido = c.prestamo.sentido === 'recibido';
    const falta = r2(Math.max(0, recibido ? -s.saldo : s.saldo));
    const capital = c.prestamo.capital || 0;
    return { recibido, falta, devuelto: r2(Math.max(0, capital - falta)), capital, movs: s.movs };
  }

  /* Lo que falta devolver de los préstamos recibidos (o que nos devuelvan, de los otorgados). Lo usan el Panel y el informe. */
  const prestamosPor = (sentido) => r2(DB.cajas.filter((c) => c.tipo === 'prestamo' && c.prestamo.sentido === sentido).reduce((s, c) => s + prestamoInfo(c).falta, 0));

  /* Transferir entre cajas: la única función. Un solo registro con sus dos puntas, así no se puede anular una sin la otra. */
  function transferir(d) {
    const a = caja(d.desde), b = caja(d.hacia);
    const errores = [];
    if (!a || !b) errores.push('caja de origen y de destino');
    else if (a.id === b.id) errores.push('cajas distintas');
    if (!(d.monto > 0)) errores.push('monto');
    else if (a && !admiteNegativo(a) && d.monto > saldoCaja(a.id).saldo + 0.009) errores.push('monto (supera el saldo de ' + a.nombre + ')');
    if (errores.length) return { errores };
    const m = { id: 'mc' + (++DB.contadores.mov), tipo: 'transferencia', fecha: d.fecha || ahora(), desde: a.id, hacia: b.id, monto: r2(d.monto), concepto: 'Transferencia', detalle: String(d.detalle || '').trim(), operadorId: USUARIO };
    if (d.chequeId) m.chequeId = d.chequeId;
    if (d.cobro) m.cobro = d.cobro;
    DB.movsCaja.push(m); guardar();
    return { mov: m };
  }
  /* Ingreso o retiro manual de una caja (no es una transferencia: entra o sale plata del sistema). */
  function movimientoCaja(d) {
    const c = caja(d.cajaId);
    const errores = [];
    if (!c) errores.push('caja');
    if (!(d.monto > 0)) errores.push('monto');
    else if (c && d.tipo === 'retiro' && !admiteNegativo(c) && d.monto > saldoCaja(c.id).saldo + 0.009) errores.push('monto (supera el saldo de la caja)');
    if (!String(d.detalle || '').trim()) errores.push('detalle');
    if (errores.length) return { errores };
    const m = { id: 'mc' + (++DB.contadores.mov), tipo: d.tipo, fecha: d.fecha || ahora(), desde: d.tipo === 'retiro' ? c.id : null, hacia: d.tipo === 'ingreso' ? c.id : null, monto: r2(d.monto), concepto: d.concepto || (d.tipo === 'ingreso' ? 'Ingreso manual' : 'Retiro manual'), detalle: String(d.detalle).trim(), operadorId: USUARIO };
    if (d.arqueoId) m.arqueoId = d.arqueoId;
    DB.movsCaja.push(m); guardar();
    return { mov: m };
  }
  function anularMovCaja(id) {
    const m = DB.movsCaja.find((x) => x.id === id);
    if (!m || m.anulado) return { errores: ['movimiento vigente'] };
    const b = m.hacia ? caja(m.hacia) : null;
    if (b && !admiteNegativo(b) && saldoCaja(b.id).saldo < m.monto - 0.009) return { errores: ['saldo en ' + b.nombre + ' para devolver la plata'] };
    /* si era el depósito de un cheque de tercero, el cheque vuelve a la cartera */
    if (m.cobro) { const v = venta(m.cobro.ventaId), c = v && v.cobros.find((x) => x.nro === m.cobro.nro); if (c) delete c.depositado; }
    m.anulado = { fecha: ahora(), operadorId: USUARIO };
    guardar();
    return { mov: m };
  }
  /* Arqueo: se cuenta la caja y se compara contra el sistema. La diferencia se puede dejar cargada como ajuste. */
  function registrarArqueo(d) {
    const c = caja(d.cajaId);
    const errores = [];
    if (!c) errores.push('caja');
    if (!(d.contado >= 0)) errores.push('monto contado');
    if (errores.length) return { errores };
    const sistema = saldoCaja(c.id).saldo;
    const a = { id: 'ar' + (++DB.contadores.arqueo), cajaId: c.id, fecha: ahora(), sistema, contado: r2(d.contado), diferencia: r2(d.contado - sistema), operadorId: USUARIO, movId: null };
    DB.arqueos.push(a);
    if (a.diferencia && d.ajustar) {
      const r = movimientoCaja({ tipo: a.diferencia < 0 ? 'retiro' : 'ingreso', cajaId: c.id, monto: Math.abs(a.diferencia), concepto: 'Ajuste por arqueo', detalle: 'Diferencia del arqueo del ' + fFecha(a.fecha), arqueoId: a.id });
      if (r.mov) a.movId = r.mov.id;
    }
    guardar();
    return { arqueo: a };
  }
  function guardarCaja(d, id) {
    const nombre = String(d.nombre || '').trim();
    const errores = [];
    if (nombre.length < 3) errores.push('nombre');
    else if (DB.cajas.some((c) => c.id !== id && mismoNombre(c.nombre, nombre))) errores.push('nombre (ya hay una caja con ese nombre)');
    if (d.recargo != null && !(d.recargo >= 0 && d.recargo <= 100)) errores.push('recargo entre 0 y 100');
    if (id) {
      if (errores.length) return { errores };
      const c = caja(id); c.nombre = nombre;
      if (c.tipo === 'interna' || c.tipo === 'efectivo') { c.neutral = !!d.neutral; c.recargo = d.recargo || 0; }
      guardar(); return { caja: c };
    }
    if (!TIPOS_CAJA.some((t) => t[0] === d.tipo)) errores.push('tipo');
    if (d.inicial != null && !(d.inicial >= 0)) errores.push('saldo inicial');
    const esPrestamo = d.tipo === 'prestamo', pr = d.prestamo || {};
    if (esPrestamo) {
      if (!['recibido', 'otorgado'].includes(pr.sentido)) errores.push('si el préstamo es recibido u otorgado');
      if (String(pr.contraparte || '').trim().length < 3) errores.push('con quién es el préstamo');
      if (!(pr.capital > 0)) errores.push('monto del préstamo');
      if (!caja(pr.cajaId)) errores.push('caja por donde se mueve la plata');
      else if (pr.sentido === 'otorgado' && pr.capital > saldoCaja(pr.cajaId).saldo + 0.009) errores.push('monto (supera el saldo de ' + caja(pr.cajaId).nombre + ')');
      if (pr.cuotas != null && !(pr.cuotas >= 1)) errores.push('cantidad de cuotas');
    }
    if (errores.length) return { errores };
    const FUENTE = { banco: 'Extracto del banco', billetera: 'Resumen de la billetera', efectivo: 'Arqueo de caja', cheques: 'Cartera de cheques', 'a-liquidar': 'Liquidación', prestamo: 'Préstamo', interna: 'Caja interna' };
    const c = { id: nuevoId('cj'), nombre, tipo: d.tipo, fuente: FUENTE[d.tipo], inicial: esPrestamo ? 0 : r2(d.inicial || 0) };
    if (d.tipo === 'interna' || d.tipo === 'efectivo') { c.neutral = !!d.neutral; c.recargo = d.recargo || 0; }
    if (esPrestamo) c.prestamo = { sentido: pr.sentido, contraparte: String(pr.contraparte).trim(), capital: r2(pr.capital), cuotas: pr.cuotas || 1 };
    DB.cajas.push(c);
    /* prestar o recibir es una transferencia entre cajas: misma función */
    if (esPrestamo) transferir(pr.sentido === 'recibido' ? { desde: c.id, hacia: pr.cajaId, monto: pr.capital, detalle: 'Préstamo recibido' } : { desde: pr.cajaId, hacia: c.id, monto: pr.capital, detalle: 'Préstamo otorgado' });
    guardar();
    return { caja: c };
  }

  /* ================= cheques propios (valores diferidos) ================= */
  /* El estado del cheque no se guarda: sale de si tiene baja o de si existe su débito en el banco. */
  const debitoDe = (ch) => DB.movsCaja.find((m) => m.chequeId === ch.id && !m.anulado);
  const estadoCheque = (ch) => ch.baja ? ch.baja.tipo : debitoDe(ch) ? 'Debitado' : 'A debitar';
  const badgeCheque = (e) => ({ 'A debitar': 'b-info', Debitado: 'b-ok', Anulado: 'b-neutro', Rechazado: 'b-bad' }[e] || 'b-neutro');
  const nombreCheque = (id) => { const ch = cheque(id); return ch ? ch.nro : ''; };
  const chequesADebitar = () => DB.cheques.filter((ch) => estadoCheque(ch) === 'A debitar');
  const totalADebitar = () => r2(chequesADebitar().reduce((s, ch) => s + ch.monto, 0));
  function debitarCheque(id) {
    const ch = cheque(id);
    if (!ch || estadoCheque(ch) !== 'A debitar') return { errores: ['cheque a debitar'] };
    if (D(ch.debito) > FIN_HOY) return { errores: ['fecha de débito (es el ' + fFecha(ch.debito) + ')'] };
    return transferir({ desde: ch.banco, hacia: 'valores', monto: ch.monto, detalle: 'Débito del cheque ' + ch.nro, chequeId: ch.id, fecha: ch.debito });
  }
  function guardarChequera(d) {
    const errores = [];
    const b = caja(d.banco);
    if (!b || b.tipo !== 'banco') errores.push('banco');
    if (!(Number.isInteger(d.desde) && d.desde > 0)) errores.push('primer número');
    if (!(Number.isInteger(d.hasta) && d.hasta >= d.desde)) errores.push('último número (igual o mayor al primero)');
    if (!errores.length && DB.chequeras.some((q) => q.banco === d.banco && d.desde <= q.hasta && d.hasta >= q.desde)) errores.push('numeración (se pisa con otra chequera de ese banco)');
    if (errores.length) return { errores };
    const q = { id: nuevoId('cq'), banco: b.id, desde: d.desde, hasta: d.hasta, proximo: d.desde };
    DB.chequeras.push(q); guardar();
    return { chequera: q };
  }

  /* ================= proveedores ================= */
  function ctaProveedor(p) {
    const facs = p.movs.filter((m) => m.tipo === 'factura');
    const pagado = (f) => r2(p.movs.filter((m) => (pagoVigente(m) || m.tipo === 'nc') && m.aplicaA === f.id).reduce((s, m) => s + m.monto, 0));
    const pend = facs.map((f) => ({ ...f, saldo: r2(f.monto - pagado(f)) })).filter((f) => f.saldo > 0.009);
    const saldo = r2(pend.reduce((s, f) => s + f.saldo, 0));
    const prox = pend.slice().sort((a, b) => a.vence < b.vence ? -1 : 1)[0];
    return { pend, saldo, prox };
  }
  /* La cuenta corriente de un proveedor en orden, con el saldo corrido. Lo anulado queda en la lista pero no mueve el saldo. */
  function movsProveedor(p) {
    let s = 0;
    return p.movs.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((m) => { if (m.tipo === 'factura') s = r2(s + m.monto); else if (pagoVigente(m) || m.tipo === 'nc') s = r2(s - m.monto); return { ...m, saldo: s }; });
  }
  /* Comprado y pagado a un proveedor en un período: lo usan Proveedores y los informes. */
  function movsProveedorPeriodo(x, p) {
    const ms = x.movs.filter((m) => enPeriodo(m.fecha, p));
    return { comprado: r2(ms.reduce((s, m) => s + (m.tipo === 'factura' ? m.monto : m.tipo === 'nc' ? -m.monto : 0), 0)), pagado: r2(ms.filter(pagoVigente).reduce((s, m) => s + m.monto, 0)), ordenes: new Set(ms.filter(pagoVigente).map((m) => m.op)).size };
  }
  /* Cuánto debemos: la única cuenta. */
  const deudaProveedores = () => r2(DB.proveedores.reduce((s, p) => s + ctaProveedor(p).saldo, 0));
  const diasA = (x) => Math.floor((D(x) - INI_HOY) / 864e5);
  function badgeVence(x) {
    if (!x) return '<span class="badge b-neutro">Sin deuda</span>';
    const d = diasA(x);
    if (d < 0) return '<span class="badge b-bad"><i class="ph ph-warning"></i>Vencida ' + fFecha(x) + '</span>';
    if (d <= 7) return '<span class="badge b-warn">Vence ' + fFecha(x) + '</span>';
    return '<span class="badge b-neutro">Vence ' + fFecha(x) + '</span>';
  }
  /* Qué se paga en una orden: total de las facturas, retenciones y lo que sale de la caja. */
  function calcularPago(p, facturaIds) {
    const facs = ctaProveedor(p).pend.filter((f) => facturaIds.includes(f.id)).map((f) => { const ret = REGLAS.retencionesPago(p, f.saldo); return { f, ret, retenciones: r2(ret.reduce((s, x) => s + x.monto, 0)) }; });
    const tot = r2(facs.reduce((s, x) => s + x.f.saldo, 0));
    const ret = r2(facs.reduce((s, x) => s + x.retenciones, 0));
    return { facs, tot, ret, neto: r2(tot - ret) };
  }
  /* Pagar a un proveedor: la única función. Con cheque propio, el pago sale de Valores diferidos y el banco baja el día del débito. */
  function registrarPago(d) {
    const p = proveedor(d.proveedorId);
    if (!p) return { errores: ['proveedor'] };
    const k = calcularPago(p, d.facturas || []);
    const conCheque = d.medio === 'Cheque propio';
    const errores = [];
    if (!k.facs.length) errores.push('al menos una factura');
    let cq = null;
    if (conCheque) {
      cq = chequera(d.chequeraId);
      if (!cq) errores.push('chequera');
      else if (cq.proximo > cq.hasta) errores.push('chequera con cheques disponibles');
      if (!d.debito) errores.push('fecha de débito');
      else if (deISODate(d.debito) < INI_HOY) errores.push('fecha de débito (de hoy en adelante)');
    } else {
      const c = caja(d.cajaId);
      if (!c) errores.push('caja');
      else if (k.neto > saldoCaja(c.id).saldo + 0.009) errores.push('caja con saldo suficiente');
    }
    if (errores.length) return { errores };
    const op = ++DB.contadores.op, fecha = ahora();
    let ch = null;
    if (conCheque) {
      ch = { id: nuevoId('ch'), nro: String(cq.proximo++).padStart(8, '0'), chequeraId: cq.id, proveedorId: p.id, op, banco: cq.banco, monto: k.neto, emision: fecha, debito: new Date(d.debito + 'T09:00:00').toISOString(), baja: null };
      DB.cheques.push(ch);
    }
    k.facs.forEach((x, i) => {
      const m = { id: 'op' + op + (k.facs.length > 1 ? '-' + (i + 1) : ''), tipo: 'pago', op, fecha, comp: 'Orden de pago ' + op, monto: x.f.saldo, caja: conCheque ? 'valores' : d.cajaId, medio: d.medio || 'Transferencia o depósito', retenciones: x.retenciones, ret: x.ret, aplicaA: x.f.id, operadorId: USUARIO };
      if (ch) m.chequeId = ch.id;
      p.movs.push(m);
    });
    guardar();
    return { op, tot: k.tot, ret: k.ret, neto: k.neto, cheque: ch };
  }
  /* Anular una orden de pago (o su cheque: anulado o rechazado). Reabre las facturas y deshace el débito si lo hubo. */
  function anularPago(proveedorId, op, motivo) {
    const p = proveedor(proveedorId);
    const movs = p ? p.movs.filter((m) => pagoVigente(m) && m.op === Number(op)) : [];
    if (!movs.length) return { errores: ['orden de pago vigente'] };
    const fecha = ahora(), tipo = motivo || 'Anulado';
    const ch = movs[0].chequeId ? cheque(movs[0].chequeId) : null;
    if (ch) {
      const deb = debitoDe(ch);
      if (deb) deb.anulado = { fecha, operadorId: USUARIO };
      ch.baja = { tipo, fecha };
    }
    movs.forEach((m) => { m.anulado = { fecha, motivo: tipo, operadorId: USUARIO }; });
    guardar();
    return { ok: true, cheque: ch };
  }
  /* Cargar una factura de compra con su neto, IVA, percepciones y no gravado. */
  function cargarFactura(d) {
    const p = proveedor(d.proveedorId);
    const errores = [];
    if (!p) errores.push('proveedor (elegilo de la lista)');
    if (!/^\d{4}-\d{8}$/.test(d.comp || '')) errores.push('comprobante con formato 0002-00012345');
    const conIva = !!d.arcaId || (p && (p.tipo === 'Proveedor' || p.tipo === 'Servicio'));
    const k = REGLAS.calcularCompra({ neto: conIva ? d.neto || 0 : 0, alic: conIva ? d.alic || 0 : 0, perc: conIva ? d.perc : [], noGravado: d.noGravado || 0 });
    if (conIva && !(d.neto > 0)) errores.push('neto gravado');
    if ([d.neto, d.noGravado].concat((d.perc || []).map((x) => x.monto)).some((n) => n != null && !(n >= 0))) errores.push('importes (no pueden ser negativos)');
    if (!(k.monto > 0)) errores.push('total');
    if (!d.fecha) errores.push('fecha');
    if (!d.vence || d.vence < d.fecha) errores.push('vencimiento (igual o posterior a la fecha)');
    if (p && p.movs.some((x) => x.tipo === 'factura' && x.comp.endsWith(d.comp))) errores.push('comprobante (ya está cargado para este proveedor)');
    if (errores.length) return { errores };
    const tipoComp = p.tipo === 'Sueldo' ? 'Liquidación' : p.tipo === 'Impuesto' ? 'Obligación' : 'Factura A';
    const partes = d.comp.split('-');
    const f = { id: nuevoId('f'), tipo: 'factura', fecha: new Date(d.fecha + 'T12:00:00').toISOString(), comp: tipoComp + ' ' + d.comp, tipoComp, pv: partes[0], nro: partes[1], ...k, vence: new Date(d.vence + 'T12:00:00').toISOString(), detalle: d.detalle || p.rubro, operadorId: USUARIO };
    if (d.arcaId) f.arcaId = d.arcaId;
    p.movs.push(f); guardar();
    return { factura: f, proveedor: p };
  }

  /* ================= clientes ================= */
  function ctaCliente(c) {
    const vs = DB.ventas.filter((v) => v.clienteId === c.id && esVenta(v));
    const movs = [];
    vs.forEach((v) => {
      movs.push({ fecha: v.fecha, comp: compTxt(v), debe: v.total, haber: 0, ventaId: v.id });
      if (anulada(v) && v.nc) movs.push({ fecha: v.nc.fecha, comp: ncTxt(v), debe: 0, haber: v.total, ventaId: v.id });
      else v.cobros.forEach((cb) => movs.push({ fecha: cb.fecha, comp: 'Recibo ' + String(cb.nro).padStart(8, '0') + ' · ' + cb.medio, debe: 0, haber: cb.monto, ventaId: v.id }));
    });
    movs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    let s = 0; movs.forEach((m) => { s = r2(s + m.debe - m.haber); m.saldo = s; });
    const total = r2(vs.filter((v) => !anulada(v)).reduce((a, v) => a + v.total, 0));
    const ultima = vs.length ? vs.reduce((a, v) => v.fecha > a ? v.fecha : a, '') : null;
    return { movs, saldo: r2(vs.reduce((a, v) => a + saldoVenta(v), 0)), total, compras: vs.filter((v) => !anulada(v)).length, ultima };
  }
  /* Cuánto nos deben: la única cuenta. */
  const aCobrar = () => r2(DB.ventas.reduce((s, v) => s + saldoVenta(v), 0));
  /* Las ventas que tienen saldo: de acá salen el aviso del Panel y el informe de saldos. */
  const ventasConSaldo = () => DB.ventas.filter((v) => saldoVenta(v) > 0.009);

  /* ================= stock ================= */
  /* El stock tampoco se guarda: es el stock inicial de cada depósito más los movimientos, menos lo vendido.
     Por eso anular una venta devuelve el stock sin tocar nada más. */
  const TIPOS_STOCK = { venta: 'Venta', compra: 'Compra', fabricacion: 'Fabricación', transferencia: 'Transferencia', ajuste: 'Ajuste', 'dev-cliente': 'Devolución de cliente', 'dev-proveedor': 'Devolución a proveedor' };
  const esCombo = (p) => !!(p && p.combo);
  const esMateria = (p) => !!p && p.tipo === 'materia';
  const terminados = () => DB.productos.filter((p) => p.tipo !== 'materia');
  const materias = () => DB.productos.filter(esMateria);
  const componentes = (p, cant) => esCombo(p) ? p.combo.map((c) => ({ productoId: c.productoId, cant: c.cant * cant })) : [{ productoId: p.id, cant }];
  const costoDe = (p) => REGLAS.costoDe(p, producto);
  const precioDe = (p, listaId) => (p.precios && (p.precios[listaId] || p.precios.minorista)) || 0;
  const depositosDe = (p) => DB.depositos.filter((d) => !!d.materia === esMateria(p));
  const ubicTxt = (u) => u ? u.pasillo + '-' + String(u.estante).padStart(2, '0') + '-' + u.nivel : '';
  /* Recorre los artículos reales de una lista de renglones: un combo se abre en sus componentes. */
  const cadaComponente = (items, fn) => (items || []).forEach((l) => { const p = producto(l.productoId); if (p) componentes(p, l.cant).forEach((c) => fn(c.productoId, c.cant)); });
  const itemsRemito = (r) => r.ventaId ? ((venta(r.ventaId) || {}).items || []).filter((l) => l.productoId) : r.items || [];
  const reservaStock = (v) => esVenta(v) && !anulada(v) && !!v.deposito && !remitoDe(v);
  function stockMapa() {
    if (cache.stock) return cache.stock;
    const fis = {}, res = {};
    const sumar = (m, pid, dep, n) => { if (!dep || !n) return; const x = m[pid] || (m[pid] = {}); x[dep] = (x[dep] || 0) + n; };
    DB.productos.forEach((p) => { if (p.stockIni) Object.keys(p.stockIni).forEach((d) => sumar(fis, p.id, d, p.stockIni[d])); });
    DB.movsStock.forEach((s) => { if (s.anulado) return; sumar(fis, s.productoId, s.desde, -s.cant); sumar(fis, s.productoId, s.hacia, s.cant); });
    DB.remitos.forEach((r) => {
      if (r.estado === 'Anulado') return;
      if (r.tipo === 'venta') cadaComponente(itemsRemito(r), (pid, n) => { sumar(fis, pid, r.depositoId, -n); if (r.estado === 'Devuelto') sumar(fis, pid, r.devueltoA, n); });
      else if (r.estado === 'Entregado') cadaComponente(itemsRemito(r), (pid, n) => sumar(fis, pid, r.depositoId, n));
    });
    DB.ventas.forEach((v) => { if (reservaStock(v)) cadaComponente(v.items, (pid, n) => sumar(res, pid, v.deposito, n)); });
    return (cache.stock = { fis, res });
  }
  const deMapa = (m, pid, dep) => (m[pid] || {})[dep] || 0;
  const armables = (p, fn) => Math.max(0, Math.min.apply(null, p.combo.map((c) => Math.floor(fn(c.productoId) / c.cant))));
  /* Stock físico: lo que hay en el depósito (sin depósito, en todos). */
  function stockFisico(productoId, depositoId) {
    const p = producto(productoId); if (!p) return 0;
    if (esCombo(p)) return armables(p, (id) => stockFisico(id, depositoId));
    const m = stockMapa().fis;
    return r2(depositoId ? deMapa(m, productoId, depositoId) : DB.depositos.reduce((s, d) => s + deMapa(m, productoId, d.id), 0));
  }
  /* Reservado: vendido y todavía sin remito. */
  function stockReservado(productoId, depositoId) {
    const p = producto(productoId); if (!p || esCombo(p)) return 0;
    const m = stockMapa().res;
    return r2(depositoId ? deMapa(m, productoId, depositoId) : DB.depositos.reduce((s, d) => s + deMapa(m, productoId, d.id), 0));
  }
  /* Disponible para vender = físico - reservado. Sin depósito: en todos menos "A revisión". El de un combo es lo que se puede armar. */
  function stockDe(productoId, depositoId) {
    const p = producto(productoId); if (!p) return 0;
    if (esCombo(p)) return armables(p, (id) => stockDe(id, depositoId));
    const k = stockMapa();
    const disp = (dep) => deMapa(k.fis, productoId, dep) - deMapa(k.res, productoId, dep);
    return r2(depositoId ? disp(depositoId) : DB.depositos.reduce((s, d) => s + (d.noDisponible ? 0 : disp(d.id)), 0));
  }
  const stockRevision = (productoId) => r2(DB.depositos.reduce((s, d) => s + (d.noDisponible ? stockFisico(productoId, d.id) : 0), 0));
  const bajoMinimo = (p) => !esCombo(p) && stockDe(p.id) < (p.minimo || 0);
  /* Mover stock: la única función para compra, transferencia, ajuste y devoluciones. La transferencia es un registro con dos puntas. */
  function moverStock(d) {
    const p = producto(d.productoId);
    const a = d.desde ? deposito(d.desde) : null, b = d.hacia ? deposito(d.hacia) : null;
    const errores = [];
    if (!p) errores.push('artículo (elegilo de la lista)');
    else if (esCombo(p)) errores.push('artículo (un combo no tiene stock propio: se mueven sus componentes)');
    if (!TIPOS_STOCK[d.tipo] || d.tipo === 'venta') errores.push('tipo de movimiento');
    if (!(d.cant > 0)) errores.push('cantidad mayor a cero');
    if (d.tipo === 'transferencia') { if (!a || !b) errores.push('depósito de origen y de destino'); else if (a.id === b.id) errores.push('depósitos distintos'); }
    else if (!a && !b) errores.push('depósito');
    if (p && !esCombo(p)) [a, b].forEach((x) => { if (x && !!x.materia !== esMateria(p)) errores.push('depósito (' + x.nombre + ' no guarda ' + (esMateria(p) ? 'materia prima' : 'productos terminados') + ')'); });
    if (p && !esCombo(p) && a && d.cant > 0 && stockDe(p.id, a.id) < d.cant) errores.push('cantidad (en ' + a.nombre + ' hay ' + stockDe(p.id, a.id) + ')');
    if (d.tipo !== 'transferencia' && !String(d.motivo || '').trim()) errores.push('motivo');
    if (errores.length) return { errores };
    const s = { id: 'ms' + (++DB.contadores.stock), tipo: d.tipo, fecha: ahora(), productoId: p.id, cant: d.cant, desde: a ? a.id : null, hacia: b ? b.id : null, motivo: String(d.motivo || '').trim(), operadorId: USUARIO };
    if (d.ordenId) s.ordenId = d.ordenId;
    DB.movsStock.push(s); guardar();
    return { mov: s };
  }
  function anularMovStock(id) {
    const s = DB.movsStock.find((x) => x.id === id);
    if (!s || s.anulado) return { errores: ['movimiento vigente'] };
    if (s.hacia && stockDe(s.productoId, s.hacia) < s.cant) return { errores: ['stock en ' + nombreDe(deposito(s.hacia)) + ' para deshacer el movimiento'] };
    s.anulado = { fecha: ahora(), operadorId: USUARIO };
    guardar();
    return { mov: s };
  }
  /* Todos los movimientos de stock en una sola lista: los cargados y los que salen de los remitos. Con conAnulados, solo los anulados. */
  function movimientosStock(conAnulados) {
    const out = DB.movsStock.filter((s) => !!s.anulado === !!conAnulados).map((s) => ({ fecha: s.fecha, tipo: s.tipo, productoId: s.productoId, cant: s.cant, desde: s.desde, hacia: s.hacia, motivo: s.motivo, operadorId: s.operadorId, movId: s.id, ordenId: s.ordenId || null }));
    DB.remitos.forEach((r) => {
      const sale = r.tipo === 'venta';
      if ((r.estado === 'Anulado') !== !!conAnulados || (!sale && !conAnulados && r.estado !== 'Entregado')) return;
      const motivo = 'Remito ' + r.nro + (r.ventaId ? ' · venta ' + r.ventaId : r.proveedorId ? ' · ' + nombreDe(proveedor(r.proveedorId)) : '');
      cadaComponente(itemsRemito(r), (pid, n) => {
        const base = { fecha: r.fecha, productoId: pid, cant: n, operadorId: r.operadorId, remitoId: r.id };
        out.push({ ...base, tipo: sale ? 'venta' : r.tipo === 'compra' ? 'compra' : 'dev-cliente', desde: sale ? r.depositoId : null, hacia: sale ? null : r.depositoId, motivo });
        if (sale && r.estado === 'Devuelto') out.push({ ...base, tipo: 'dev-cliente', desde: null, hacia: r.devueltoA, motivo: 'Devuelto · ' + motivo });
      });
    });
    return out.sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  }
  function guardarDeposito(d, id) {
    const nombre = String(d.nombre || '').trim();
    const errores = [];
    if (nombre.length < 3) errores.push('nombre');
    else if (DB.depositos.some((x) => x.id !== id && mismoNombre(x.nombre, nombre))) errores.push('nombre (ya hay un depósito con ese nombre)');
    if (!id && !TIPOS_DEPOSITO.includes(d.tipo)) errores.push('tipo');
    if (errores.length) return { errores };
    let dep;
    if (id) { dep = deposito(id); dep.nombre = nombre; }
    else {
      dep = { id: nuevoId('dp'), nombre, tipo: d.tipo };
      if (d.tipo === 'Materia prima') dep.materia = true;
      if (d.tipo === 'A revisión') dep.noDisponible = true;
      if (d.canal) dep.canal = d.canal;
      DB.depositos.push(dep);
    }
    guardar();
    return { deposito: dep };
  }
  const TIPOS_DEPOSITO = ['Depósito', 'Tienda', 'Local', 'Outlet', 'Reserva', 'Materia prima', 'A revisión'];
  function guardarUbicacion(d) {
    const p = producto(d.productoId), dep = deposito(d.depositoId);
    const errores = [];
    if (!p || esCombo(p)) errores.push('artículo');
    if (!dep) errores.push('depósito');
    const pasillo = String(d.pasillo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,3}$/.test(pasillo)) errores.push('pasillo (hasta 3 letras o números)');
    if (!(Number.isInteger(d.estante) && d.estante >= 1 && d.estante <= 99)) errores.push('estante entre 1 y 99');
    if (!(Number.isInteger(d.nivel) && d.nivel >= 1 && d.nivel <= 9)) errores.push('nivel entre 1 y 9');
    if (errores.length) return { errores };
    (p.ubic || (p.ubic = {}))[dep.id] = { pasillo, estante: d.estante, nivel: d.nivel };
    guardar();
    return { ok: true };
  }

  /* ================= canales ================= */
  const PV_NO = ['0003', '0004', '0005', '0008', '0009'];
  function proximoPv() {
    let n = Math.max.apply(null, DB.puntosVenta.map((x) => Number(x.nro))) + 1;
    while (PV_NO.includes(String(n).padStart(4, '0'))) n++;
    return String(n).padStart(4, '0');
  }
  /* Alta o edición de un canal. "nueva" en caja o depósito los crea con las mismas funciones de siempre. */
  function guardarCanal(d, id) {
    const nombre = String(d.nombre || '').trim();
    const errores = [];
    if (nombre.length < 3) errores.push('nombre');
    else if (DB.canales.some((c) => c.id !== id && mismoNombre(c.nombre, nombre))) errores.push('nombre (ya hay un canal con ese nombre)');
    const actual = id ? canal(id) : null;
    if (!(actual && actual.conexion === 'manual') && !['vivo', 'asistida'].includes(d.conexion)) errores.push('forma de conexión');
    const pvNuevo = d.pv === 'nuevo';
    if (!pvNuevo && !DB.puntosVenta.some((x) => x.nro === d.pv)) errores.push('punto de venta');
    if (d.cajaId !== 'nueva' && d.cajaId && !caja(d.cajaId)) errores.push('caja donde cobra');
    if (!id && !d.cajaId) errores.push('caja donde cobra');
    if (d.depositoId !== 'nuevo' && (!deposito(d.depositoId) || deposito(d.depositoId).materia)) errores.push('depósito del que descuenta');
    if (!(d.comision >= 0 && d.comision <= 100)) errores.push('comisión entre 0 y 100');
    if (d.precioPct != null && !(d.precioPct >= -90 && d.precioPct <= 500)) errores.push('porcentaje del precio publicado (entre -90 y 500)');
    if (!errores.length && d.cajaId === 'nueva' && DB.cajas.some((c) => mismoNombre(c.nombre, nombre + ' a liquidar'))) errores.push('nombre (ya hay una caja "' + nombre + ' a liquidar")');
    if (!errores.length && d.depositoId === 'nuevo' && DB.depositos.some((x) => mismoNombre(x.nombre, nombre))) errores.push('nombre (ya hay un depósito "' + nombre + '")');
    if (errores.length) return { errores };
    const cn = actual || { id: nuevoId('cn'), tienda: true };
    let pv = d.pv;
    if (pvNuevo) { pv = proximoPv(); DB.puntosVenta.push({ nro: pv, nombre }); }
    if (DB.contadores.comp[pv] == null) DB.contadores.comp[pv] = 0;
    if (DB.contadores.nc[pv] == null) DB.contadores.nc[pv] = 0;
    const cajaId = d.cajaId === 'nueva' ? guardarCaja({ nombre: nombre + ' a liquidar', tipo: 'a-liquidar' }).caja.id : d.cajaId || null;
    const depositoId = d.depositoId === 'nuevo' ? guardarDeposito({ nombre, tipo: 'Tienda', canal: cn.id }).deposito.id : d.depositoId;
    Object.assign(cn, { nombre, pv, caja: cajaId, deposito: depositoId, comision: r2(d.comision) });
    if (cn.conexion !== 'manual') cn.conexion = d.conexion;
    if (cn.tienda) cn.precio = { lista: listaPrecios(d.precioLista) ? d.precioLista : reglaCanal(cn).lista, pct: d.precioPct != null ? r2(d.precioPct) : reglaCanal(cn).pct };
    if (!actual) DB.canales.push(cn);
    guardar();
    return { canal: cn };
  }

  /* ================= operaciones de venta ================= */
  const letraDe = (c) => c.iva === 'Responsable inscripto' ? 'A' : 'B';
  function emitirFactura(v) {
    const c = cliente(v.clienteId), pv = canal(v.canal).pv;
    DB.contadores.comp[pv] = (DB.contadores.comp[pv] || 0) + 1;
    v.comp = { tipo: 'Factura ' + letraDe(c), pv, nro: String(DB.contadores.comp[pv]).padStart(8, '0'), cae: String(71000000000000 + (v.id * 104729 + DB.contadores.comp[pv] * 15485863) % 8000000000000) };
  }
  /* Con qué se puede cobrar según el tipo de venta. La usan Nueva venta y Registrar cobro. */
  function opcionesCobro(version, enVenta) {
    const ops = [];
    if (version === 'Neutral') DB.cajas.filter((c) => c.neutral).forEach((c) => ops.push({ cajaId: c.id, medio: c.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia o depósito', label: c.nombre + (c.recargo ? ' (recargo ' + String(c.recargo).replace('.', ',') + '%)' : '') }));
    else {
      DB.cajas.filter((c) => c.tipo === 'efectivo' && !c.neutral).forEach((c) => ops.push({ cajaId: c.id, medio: 'Efectivo', label: c.nombre }));
      if (enVenta) DB.cajas.filter((c) => c.liquidaEn).forEach((c) => { ops.push({ cajaId: c.id, medio: 'Tarjeta de débito', label: 'Tarjeta de débito' }); ops.push({ cajaId: c.id, medio: 'Tarjeta de crédito', label: 'Tarjeta de crédito' }); });
      DB.cajas.filter((c) => c.tipo === 'banco').forEach((c) => ops.push({ cajaId: c.id, medio: 'Transferencia o depósito', label: 'Transferencia a ' + c.nombre }));
      if (caja('mp')) ops.push({ cajaId: 'mp', medio: 'Mercado Pago', label: 'Mercado Pago' });
      DB.cajas.filter((c) => c.tipo === 'cheques').forEach((c) => ops.push({ cajaId: c.id, medio: 'Cheque de tercero', label: 'Cheque de tercero' }));
    }
    if (enVenta) ops.push({ cajaId: '', medio: 'Cuenta corriente', label: 'Cuenta corriente' });
    return ops;
  }
  /* Un cobro sobre una venta. Lo que retiene la caja (Mutual, tarjetas) o el cliente queda en el mismo cobro. */
  function aplicarCobro(v, d, fecha) {
    const cj = caja(d.cajaId);
    const cb = { nro: ++DB.contadores.recibo, fecha, monto: r2(d.monto), caja: cj.id, medio: d.medio, operadorId: USUARIO };
    if (cj.tipo === 'cheques') cb.cheque = { nro: d.cheque.nro, banco: d.cheque.banco || 'A confirmar', vence: d.cheque.vence };
    if (d.retencion > 0) cb.retencion = r2(d.retencion);
    const retiene = retieneCaja(cj, cb.monto);
    if (retiene) cb.comision = retiene;
    if (cj.liquidaEn) {
      const deb = d.medio === 'Tarjeta de débito';
      cb.acreditaEn = cj.liquidaEn; cb.automatico = true; cb.comision = r2(cb.monto * (deb ? 0.012 : 0.029));
      v.acred.estado = 'A liquidar'; v.acred.fecha = masDias(D(fecha), deb ? 1 : 8).toISOString();
    }
    v.cobros.push(cb);
    return cb;
  }
  function validarCobro(d, saldo) {
    const errores = [];
    const cj = caja(d.cajaId);
    if (!cj) errores.push('forma de cobro');
    if (!(d.monto > 0)) errores.push('monto');
    else if (d.monto > saldo + 0.009) errores.push('monto (es mayor que el saldo)');
    if (cj && cj.tipo === 'cheques') {
      if (!d.cheque || !/^\d{6,10}$/.test(d.cheque.nro || '')) errores.push('número de cheque');
      if (!d.cheque || !d.cheque.vence) errores.push('vencimiento del cheque');
    }
    if (d.retencion != null && !(d.retencion >= 0 && d.retencion < d.monto)) errores.push('retención (menor que el monto)');
    return errores;
  }
  /* Nueva venta: la única función. Calcula con la regla compartida, valida stock en el depósito y deja todo enlazado por id. */
  function registrarVenta(d) {
    const c = cliente(d.clienteId), cn = canal(d.canalId), dep = deposito(d.depositoId);
    const esCot = d.version === 'Cotización';
    const errores = [];
    if (!['Oficial', 'Neutral', 'Seña', 'Cotización'].includes(d.version)) errores.push('tipo de operación');
    if (!c) errores.push('cliente (elegilo de la lista)');
    if (!cn || cn.conexion !== 'manual') errores.push('canal');
    if (!vendedor(d.vendedorId) || vendedor(d.vendedorId).baja) errores.push('vendedor');
    if (!dep || dep.materia || dep.noDisponible) errores.push('depósito');
    const listaId = c ? c.lista || 'minorista' : 'minorista';
    const lineas = (d.items || []).map((it) => { const p = producto(it.productoId); return p && !esMateria(p) ? { productoId: p.id, nombre: p.nombre, cant: it.cant, precio: precioDe(p, listaId), bonif: it.bonif || 0, alic: p.alic == null ? 21 : p.alic, costo: costoDe(p) } : null; });
    if (!lineas.length || lineas.some((l) => !l)) errores.push('al menos un producto');
    else {
      if (lineas.some((l) => !(Number.isInteger(l.cant) && l.cant > 0))) errores.push('cantidad mayor a cero');
      if (lineas.some((l) => !(l.bonif >= 0 && l.bonif < 100))) errores.push('bonificación del renglón entre 0 y 99');
    }
    const ajustes = (d.ajustes || []).filter((a) => a.valor);
    ajustes.forEach((a) => {
      const que = a.tipo === 'recargo' ? 'recargo' : 'bonificación';
      if (!(a.valor > 0) || (a.modo === 'pct' && a.valor > 100)) errores.push(que + ' (porcentaje hasta 100 o monto mayor a cero)');
      if (!String(a.concepto || '').trim()) errores.push(a.tipo === 'recargo' ? 'concepto del recargo' : 'concepto de la bonificación');
    });
    if (errores.length) return { errores };
    const k = REGLAS.calcularVenta({ items: lineas, ajustes, cliente: c, version: d.version });
    if (!(k.total > 0)) errores.push('total mayor a cero');
    const cobro = d.cobro || {}, ctaCte = cobro.medio === 'Cuenta corriente';
    if (!esCot) {
      const falta = faltaStock(lineas, dep.id);
      if (falta) errores.push(falta);
      if (ctaCte && c.tipo === 'Consumidor final') errores.push('forma de cobro (cuenta corriente es solo para mayoristas y distribuidores)');
      if (d.version === 'Seña' && !(d.sena > 0 && d.sena <= k.total)) errores.push('monto de la seña (entre $ 1 y el total)');
      if (d.version === 'Seña' && ctaCte) errores.push('forma de cobro de la seña');
      if (!ctaCte) validarCobro({ ...cobro, monto: d.version === 'Seña' ? d.sena : k.total }, k.total).forEach((e) => { if (!errores.includes(e)) errores.push(e); });
    }
    if (errores.length) return { errores };
    const fecha = ahora();
    const v = {
      id: ++DB.contadores.venta, fecha, canal: cn.id, clienteId: c.id, version: d.version, lista: listaId, comp: null,
      items: lineas, subtotal: k.subtotal, ajustes: k.ajustes, imp: k.imp, total: k.total, deposito: dep.id, vendedorId: d.vendedorId, operadorId: USUARIO,
      envio: cn.id === 'mayorista' ? 'Transporte propio' : 'Retira en fábrica', estado: esCot ? 'Cotización' : 'Vigente',
      cobros: [], acred: { estado: '', fecha, comision: 0, envio: 0, retencion: 0, cuotas: 0 }, nc: null
    };
    if (d.version === 'Oficial') emitirFactura(v);
    else if (d.version === 'Neutral') v.comp = { tipo: 'Comprobante interno', pv: '', nro: String(++DB.contadores.interno).padStart(8, '0'), cae: '' };
    else if (d.version === 'Seña') v.comp = { tipo: 'Recibo de seña', pv: '', nro: 'S-' + v.id, cae: '' };
    else v.comp = { tipo: 'Cotización', pv: '', nro: 'C-' + v.id, cae: '' };
    if (!esCot) {
      if (!ctaCte) aplicarCobro(v, { ...cobro, monto: d.version === 'Seña' ? d.sena : k.total }, fecha);
      if (ctaCte || d.version === 'Seña') v.acred.vence = masDias(HOY, 30).toISOString();
    }
    DB.ventas.push(v); guardar();
    return { venta: v };
  }
  /* Devuelve el texto del primer faltante de stock, o vacío si alcanza. Un combo se mide por sus componentes. */
  function faltaStock(lineas, depositoId) {
    const pide = {};
    lineas.forEach((l) => { const p = producto(l.productoId); if (p) componentes(p, l.cant).forEach((c) => { pide[c.productoId] = (pide[c.productoId] || 0) + c.cant; }); });
    const sin = Object.keys(pide).find((pid) => stockDe(pid, depositoId) < pide[pid]);
    return sin ? 'stock de ' + producto(sin).nombre + ' en ' + nombreDe(deposito(depositoId)) + ' (hay ' + stockDe(sin, depositoId) + ')' : '';
  }
  /* Registrar un cobro sobre una o varias ventas: se aplica a las más viejas primero. */
  function registrarCobro(ventas, d) {
    const saldo = r2(ventas.reduce((s, v) => s + saldoVenta(v), 0));
    const errores = validarCobro(d, saldo);
    if (errores.length) return { errores };
    let resto = d.monto, ret = d.retencion || 0;
    const fecha = ahora();
    ventas.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).forEach((v) => {
      if (resto <= 0) return;
      const aplica = r2(Math.min(resto, saldoVenta(v))); if (aplica <= 0) return;
      const r = r2(Math.min(ret, aplica - 0.01));
      aplicarCobro(v, { ...d, monto: aplica, retencion: r > 0 ? r : 0 }, fecha);
      resto = r2(resto - aplica); ret = r2(ret - Math.max(0, r));
    });
    guardar();
    return { recibo: DB.contadores.recibo, monto: d.monto };
  }
  /* Anular una venta. Lo cobrado y la cuenta corriente salen de la venta, así que vuelven solos, y la reserva de stock se libera.
     Si tenía remito y todavía no había salido, el remito se anula. Si ya salió, la mercadería vuelve con un remito de devolución a "A revisión". */
  function anularVenta(id) {
    const v = venta(id);
    if (!v || anulada(v) || !esVenta(v)) return { errores: ['venta vigente'] };
    const rm = remitoDe(v), fecha = ahora();
    v.estado = 'Anulada';
    if (v.version === 'Oficial') {
      const pv = v.comp.pv; DB.contadores.nc[pv] = (DB.contadores.nc[pv] || 0) + 1;
      v.nc = { tipo: 'Nota de crédito ' + (v.comp.tipo.endsWith('A') ? 'A' : 'B'), pv, nro: String(DB.contadores.nc[pv]).padStart(8, '0'), fecha };
    } else v.nc = { tipo: 'Anulación interna', pv: '', nro: String(v.id), fecha };
    if (rm && (rm.estado === 'Pendiente' || rm.estado === 'Preparado')) { rm.estado = 'Anulado'; (rm.historial || (rm.historial = [])).push({ estado: 'Anulado', fecha, operadorId: USUARIO }); }
    else if (rm) {
      const rev = DB.depositos.find((x) => x.noDisponible);
      const dv = nuevoRemito({ tipo: 'devolucion', ventaId: v.id, depositoId: rev ? rev.id : rm.depositoId, estado: 'Entregado' });
      v.devolucion = { remitoId: dv.id, deposito: dv.depositoId, fecha };
    }
    v.acred = { estado: 'Devuelta', fecha, comision: 0, envio: 0, retencion: 0, cuotas: 0 };
    guardar();
    return { venta: v };
  }
  function convertirCotizacion(id) {
    const v = venta(id);
    if (!v || esVenta(v)) return { errores: ['cotización'] };
    const falta = faltaStock(v.items, v.deposito);
    if (falta) return { errores: [falta] };
    const k = REGLAS.calcularVenta({ items: v.items, ajustes: v.ajustes, cliente: cliente(v.clienteId), version: 'Oficial' });
    Object.assign(v, { version: 'Oficial', estado: 'Vigente', subtotal: k.subtotal, ajustes: k.ajustes, imp: k.imp, total: k.total });
    emitirFactura(v);
    v.acred.vence = masDias(HOY, 30).toISOString();
    guardar();
    return { venta: v };
  }
  /* Conciliar: el movimiento del extracto que faltaba se carga como gasto bancario. */
  function conciliarCaja(id) {
    const c = caja(id);
    if (!c || !c.difExtracto) return { errores: ['diferencia para conciliar'] };
    const r = movimientoCaja({ tipo: c.difExtracto < 0 ? 'retiro' : 'ingreso', cajaId: id, monto: Math.abs(c.difExtracto), concepto: 'Gasto bancario', detalle: 'Comisión por mantenimiento de cuenta', fecha: masDias(INI_HOY, -1).toISOString() });
    if (r.errores) return r;
    c.difExtracto = 0; guardar();
    return r;
  }

  /* ================= remitos ================= */
  /* Regla única: la venta RESERVA el stock y el remito lo DESCUENTA de su depósito de salida.
     Disponible = físico - reservado. Un remito de compra o de devolución suma al stock cuando se recibe. */
  const ESTADOS_REMITO = ['Pendiente', 'Preparado', 'En camino', 'Entregado', 'Devuelto', 'Anulado'];
  const TIPOS_REMITO = { venta: 'De venta', compra: 'De compra', devolucion: 'De devolución' };
  const PASOS_REMITO = { venta: ['Pendiente', 'Preparado', 'En camino', 'Entregado'], compra: ['Pendiente', 'Entregado'], devolucion: ['Pendiente', 'Entregado'] };
  const badgeRemito = (e) => ({ Pendiente: 'b-warn', Preparado: 'b-info', 'En camino': 'b-info', Entregado: 'b-ok', Devuelto: 'b-bad', Anulado: 'b-neutro' }[e] || 'b-neutro');
  const estadoRemitoTxt = (r) => r.tipo !== 'venta' && r.estado === 'Entregado' ? 'Recibido' : r.estado;
  function nuevoRemito(d) {
    const r = { id: nuevoId('rm'), nro: '0001-' + String(++DB.contadores.remito).padStart(8, '0'), tipo: d.tipo, fecha: ahora(), estado: d.estado, depositoId: d.depositoId, ventaId: d.ventaId || null, proveedorId: d.proveedorId || null, items: d.items || null, grupo: null, operadorId: USUARIO };
    DB.remitos.push(r);
    return r;
  }
  /* Generar remitos: uno por venta, de una o de varias a la vez. Valida todo antes de tocar nada. */
  function generarRemitos(ventaIds) {
    const vs = Array.from(new Set((ventaIds || []).map(Number))).map(venta);
    const errores = [];
    if (!vs.length) errores.push('al menos una venta');
    else if (vs.some((v) => !v || !aRemitir(v))) errores.push('ventas para remitir (alguna ya tiene remito, está anulada o es una seña sin cobrar)');
    else {
      const pide = {};
      vs.forEach((v) => cadaComponente(v.items, (pid, n) => { const k = pid + '|' + v.deposito; pide[k] = (pide[k] || 0) + n; }));
      const sin = Object.keys(pide).find((k) => stockFisico(k.split('|')[0], k.split('|')[1]) < pide[k]);
      if (sin) errores.push('stock físico de ' + nombreDe(producto(sin.split('|')[0])) + ' en ' + nombreDe(deposito(sin.split('|')[1])));
    }
    if (errores.length) return { errores };
    const remitos = vs.map((v) => nuevoRemito({ tipo: 'venta', ventaId: v.id, depositoId: v.deposito, estado: v.envio === 'Retira en fábrica' ? 'Entregado' : 'Pendiente' }));
    guardar();
    return { remitos };
  }
  /* Cambiar el estado de un remito. Solo avanza. Anular devuelve el stock; devuelto lo manda a "A revisión". */
  function cambiarEstadoRemito(id, estado) {
    const r = remito(id);
    if (!r || r.estado === 'Anulado' || r.estado === 'Devuelto') return { errores: ['remito vigente'] };
    if (estado === 'Anulado') {
      if (r.tipo === 'venta' && r.estado === 'Entregado') return { errores: ['remito sin entregar (si ya se entregó, va como devuelto)'] };
      if (r.tipo !== 'venta' && r.estado === 'Entregado') { const falta = faltaStock(itemsRemito(r), r.depositoId); if (falta) return { errores: [falta] }; }
    } else if (estado === 'Devuelto') {
      if (r.tipo !== 'venta' || !['En camino', 'Entregado'].includes(r.estado)) return { errores: ['remito de venta en camino o entregado'] };
      const rev = DB.depositos.find((x) => x.noDisponible);
      r.devueltoA = rev ? rev.id : r.depositoId;
    } else if (PASOS_REMITO[r.tipo].indexOf(estado) <= PASOS_REMITO[r.tipo].indexOf(r.estado)) return { errores: ['un estado posterior a ' + r.estado] };
    r.estado = estado;
    (r.historial || (r.historial = [])).push({ estado, fecha: ahora(), operadorId: USUARIO });
    guardar();
    return { remito: r };
  }
  function cambiarEstadoRemitos(ids, estado) {
    let hechos = 0; const errores = [];
    (ids || []).forEach((id) => { const r = cambiarEstadoRemito(id, estado); if (r.errores) r.errores.forEach((e) => { if (!errores.includes(e)) errores.push(e); }); else hechos++; });
    return hechos ? { hechos, omitidos: (ids || []).length - hechos } : { errores: errores.length ? errores : ['al menos un remito'] };
  }
  /* Agrupar remitos en una hoja de ruta, para sacarlos juntos. */
  function agruparRemitos(ids) {
    const rs = Array.from(new Set(ids || [])).map(remito);
    if (rs.length < 2) return { errores: ['al menos dos remitos'] };
    if (rs.some((r) => !r || r.tipo !== 'venta' || !['Pendiente', 'Preparado', 'En camino'].includes(r.estado))) return { errores: ['remitos de venta que todavía no se entregaron'] };
    const grupo = 'H-' + String(++DB.contadores.grupo).padStart(4, '0');
    rs.forEach((r) => { r.grupo = grupo; });
    guardar();
    return { grupo, remitos: rs };
  }
  /* Remito de compra: ingreso de mercadería de un proveedor. */
  function registrarIngreso(d) {
    const p = proveedor(d.proveedorId), dep = deposito(d.depositoId);
    const items = (d.items || []).map((it) => ({ productoId: it.productoId, cant: it.cant }));
    const errores = [];
    if (!p) errores.push('proveedor (elegilo de la lista)');
    if (!dep) errores.push('depósito');
    if (!items.length) errores.push('al menos un artículo');
    items.forEach((it) => {
      const a = producto(it.productoId);
      if (!a || esCombo(a)) { if (!errores.includes('artículo (elegilo de la lista)')) errores.push('artículo (elegilo de la lista)'); return; }
      if (!(it.cant > 0)) errores.push('cantidad de ' + a.nombre);
      if (dep && !!dep.materia !== esMateria(a)) errores.push('depósito (' + dep.nombre + ' no guarda ' + (esMateria(a) ? 'materia prima' : 'productos terminados') + ')');
    });
    if (errores.length) return { errores };
    const r = nuevoRemito({ tipo: 'compra', proveedorId: p.id, depositoId: dep.id, items, estado: d.recibido ? 'Entregado' : 'Pendiente' });
    guardar();
    return { remito: r };
  }
  /* Rendición: todo lo que salió por día y por producto en el período. Sale de los remitos de venta que no están anulados. */
  function rendicion(p, depositoId) {
    const porDia = {}, porProd = {}, remitos = [];
    let nRemitos = 0, total = 0;
    DB.remitos.forEach((r) => {
      if (r.tipo !== 'venta' || r.estado === 'Anulado' || !enPeriodo(r.fecha, p) || (depositoId && r.depositoId !== depositoId)) return;
      nRemitos++; remitos.push(r);
      const dia = toISODate(D(r.fecha));
      itemsRemito(r).forEach((l) => {
        const k = dia + '|' + l.productoId;
        const x = porDia[k] || (porDia[k] = { dia, productoId: l.productoId, nombre: l.nombre, cant: 0, remitos: 0 });
        x.cant += l.cant; x.remitos++;
        const y = porProd[l.productoId] || (porProd[l.productoId] = { productoId: l.productoId, nombre: l.nombre, cant: 0 });
        y.cant += l.cant; total += l.cant;
      });
    });
    return { filas: Object.values(porDia).sort((a, b) => a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : b.cant - a.cant), porProducto: Object.values(porProd).sort((a, b) => b.cant - a.cant), total, nRemitos, remitos };
  }

  /* ================= producción ================= */
  const ESTADOS_ORDEN = ['Pendiente', 'En proceso', 'Terminada', 'Anulada'];
  const badgeOrden = (e) => ({ Pendiente: 'b-warn', 'En proceso': 'b-info', Terminada: 'b-ok', Anulada: 'b-neutro' }[e] || 'b-neutro');
  const depFabrica = () => DB.depositos.find((d) => d.tipo === 'Fábrica') || DB.depositos.find((d) => !d.materia && !d.noDisponible);
  const depMateria = () => DB.depositos.find((d) => d.materia);
  /* Lo que consume una orden, contra lo que hay de materia prima. */
  function materialesOrden(o) {
    const p = producto(o.productoId), dm = depMateria();
    return ((p && p.materiales) || []).map((m) => { const necesita = r2(m.cant * o.cant), hay = dm ? stockDe(m.productoId, dm.id) : 0; return { productoId: m.productoId, necesita, hay, falta: r2(Math.max(0, necesita - hay)) }; });
  }
  function guardarOrden(d) {
    const p = producto(d.productoId);
    const errores = [];
    if (!p || esMateria(p)) errores.push('producto (elegilo de la lista)');
    else if (esCombo(p)) errores.push('producto (un combo no se fabrica: se fabrican sus componentes)');
    else if (!(p.materiales || []).length) errores.push('producto con lista de materiales');
    if (!(Number.isInteger(d.cant) && d.cant > 0)) errores.push('cantidad mayor a cero');
    if (!operador(d.responsableId) || d.responsableId === 'sis') errores.push('responsable');
    if (!d.prevista) errores.push('fecha prevista');
    if (errores.length) return { errores };
    const o = { id: nuevoId('of'), nro: ++DB.contadores.orden, productoId: p.id, cant: d.cant, fecha: ahora(), prevista: new Date(d.prevista + 'T12:00:00').toISOString(), responsableId: d.responsableId, estado: 'Pendiente', operadorId: USUARIO };
    DB.ordenes.push(o); guardar();
    return { orden: o };
  }
  /* Terminar una orden suma el producto a Fábrica y descuenta la materia prima. Anular una terminada lo deshace. */
  function cambiarEstadoOrden(id, estado) {
    const o = orden(id);
    if (!o || o.estado === 'Anulada') return { errores: ['orden vigente'] };
    const fecha = ahora();
    if (estado === 'En proceso') {
      if (o.estado !== 'Pendiente') return { errores: ['orden pendiente'] };
      o.inicio = fecha;
    } else if (estado === 'Terminada') {
      if (o.estado === 'Terminada') return { errores: ['orden sin terminar'] };
      const mats = materialesOrden(o), sin = mats.find((m) => m.falta > 0), dm = depMateria(), df = depFabrica();
      if (!dm || !df) return { errores: ['depósitos de materia prima y de fábrica'] };
      if (sin) return { errores: ['materia prima (faltan ' + fCant(sin.falta) + ' de ' + nombreDe(producto(sin.productoId)) + ')'] };
      const motivo = 'Orden de fabricación ' + o.nro;
      mats.forEach((m) => moverStock({ tipo: 'fabricacion', productoId: m.productoId, cant: m.necesita, desde: dm.id, motivo, ordenId: o.id }));
      moverStock({ tipo: 'fabricacion', productoId: o.productoId, cant: o.cant, hacia: df.id, motivo, ordenId: o.id });
      if (!o.inicio) o.inicio = fecha;
      o.terminada = fecha;
    } else if (estado === 'Anulada') {
      if (o.estado === 'Terminada') {
        const movs = DB.movsStock.filter((s) => s.ordenId === o.id && !s.anulado);
        const entrada = movs.find((s) => s.hacia);
        if (entrada && stockDe(entrada.productoId, entrada.hacia) < entrada.cant) return { errores: ['stock en ' + nombreDe(deposito(entrada.hacia)) + ' para deshacer la fabricación (ya se movió o se vendió)'] };
        movs.forEach((s) => anularMovStock(s.id));
      }
      o.anulada = fecha;
    } else return { errores: ['estado'] };
    o.estado = estado;
    guardar();
    return { orden: o };
  }

  /* ================= publicaciones ================= */
  /* Cada tienda publica una de las listas de precios, con un porcentaje, o un precio fijo por producto.
     El stock publicado es lo disponible en el depósito de la tienda. */
  const tiendas = () => DB.canales.filter((c) => c.tienda);
  const reglaCanal = (c) => c.precio || { lista: 'minorista', pct: 0 };
  const reglaTxt = (c) => { const r = reglaCanal(c); return 'Lista ' + nombreDe(listaPrecios(r.lista), 'Minorista') + (r.pct ? (r.pct > 0 ? ' + ' : ' - ') + String(Math.abs(r.pct)).replace('.', ',') + '%' : ''); };
  function publicacion(p, c) {
    const pub = (p.publi || {})[c.id] || {}, r = reglaCanal(c);
    const precio = pub.fijo || Math.round(precioDe(p, r.lista) * (1 + r.pct / 100));
    const stock = stockDe(p.id, c.deposito);
    return { p, c, precio, publicado: pub.precio || 0, fijo: pub.fijo || 0, stock, estado: stock <= 0 ? 'Pausado sin stock' : pub.precio === precio ? 'Sincronizado' : 'Pendiente' };
  }
  const publicaciones = () => terminados().flatMap((p) => tiendas().map((c) => publicacion(p, c)));
  const badgePubli = (e) => ({ Sincronizado: 'b-ok', Pendiente: 'b-warn', 'Pausado sin stock': 'b-neutro' }[e] || 'b-neutro');
  const canalesPorPublicar = (p) => tiendas().filter((c) => publicacion(p, c).estado === 'Pendiente').length;
  function publicarPendientes(canalId) {
    const pend = publicaciones().filter((x) => x.estado === 'Pendiente' && (!canalId || x.c.id === canalId));
    pend.forEach((x) => { const pub = x.p.publi || (x.p.publi = {}); pub[x.c.id] = { ...(pub[x.c.id] || {}), precio: x.precio }; });
    guardar();
    return { publicadas: pend.length };
  }
  function fijarPrecioPublicado(productoId, canalId, fijo) {
    const p = producto(productoId), c = canal(canalId);
    if (!p || !c || !c.tienda) return { errores: ['producto y tienda'] };
    if (!(fijo >= 0)) return { errores: ['precio (o vacío para volver a la regla de la tienda)'] };
    const pub = p.publi || (p.publi = {});
    pub[c.id] = { ...(pub[c.id] || {}), fijo: fijo ? r2(fijo) : 0 };
    guardar();
    return { publicacion: publicacion(p, c) };
  }
  /* Cambio masivo de precios: la vista previa y el cambio usan la misma cuenta. */
  function previaPrecios(d) {
    if (!Number.isFinite(d.pct) || d.pct === 0 || d.pct < -90 || d.pct > 500) return { errores: ['porcentaje distinto de cero (entre -90 y 500)'] };
    const filas = terminados().filter((p) => !d.rubro || p.rubro === d.rubro).flatMap((p) => DB.listas.filter((l) => !d.lista || l.id === d.lista).map((l) => ({ p, lista: l, antes: precioDe(p, l.id), despues: Math.round(precioDe(p, l.id) * (1 + d.pct / 100) / 100) * 100 })));
    return filas.length ? { filas } : { errores: ['productos para cambiar'] };
  }
  function cambiarPrecios(d) {
    const pv = previaPrecios(d);
    if (pv.errores) return pv;
    pv.filas.forEach((x) => { x.p.precios[x.lista.id] = x.despues; });
    guardar();
    const productos = new Set(pv.filas.map((x) => x.p.id));
    return { cambios: pv.filas.length, productos: productos.size, porPublicar: publicaciones().filter((x) => x.estado === 'Pendiente' && productos.has(x.p.id)).length };
  }

  /* ================= ARCA (simulado) ================= */
  const soloDigitos = (s) => String(s || '').replace(/\D/g, '');
  const proveedorPorCuit = (cuit) => DB.proveedores.find((p) => p.cuit && soloDigitos(p.cuit) === soloDigitos(cuit));
  const yaCargado = (p, x) => !!p && p.movs.some((m) => m.tipo === 'factura' && m.pv === x.pv && m.nro === x.nro);
  /* Trae las facturas recibidas que ARCA tiene y el sistema no. Traer dos veces no duplica nada. */
  function traerDeArca() {
    const nuevos = DB.arca.pool.filter((x) => !DB.arca.recibidos.some((r) => r.id === x.id));
    nuevos.forEach((x) => { const p = proveedorPorCuit(x.cuit); DB.arca.recibidos.push({ ...x, estado: yaCargado(p, x) ? 'Duplicada' : 'Para revisar', proveedorId: p ? p.id : null, traido: ahora() }); });
    DB.arca.ultimaConsulta = ahora();
    guardar();
    return { nuevos: nuevos.length, duplicadas: DB.arca.recibidos.filter((r) => nuevos.some((x) => x.id === r.id) && r.estado === 'Duplicada').length };
  }
  /* Cargar un comprobante traído de ARCA: misma función que la carga a mano, con el CUIT validado contra el maestro. */
  function cargarDeArca(id, d) {
    const x = DB.arca.recibidos.find((r) => r.id === id);
    if (!x || x.estado !== 'Para revisar') return { errores: ['comprobante para revisar'] };
    const p = proveedor(d.proveedorId);
    if (!p) return { errores: ['proveedor (elegilo de la lista o crealo con ese CUIT)'] };
    if (soloDigitos(p.cuit) !== soloDigitos(x.cuit)) return { errores: ['proveedor (el CUIT del comprobante es ' + x.cuit + ')'] };
    if (!String(d.tipoGasto || '').trim()) return { errores: ['tipo de gasto'] };
    const r = cargarFactura({ proveedorId: p.id, comp: x.pv + '-' + x.nro, fecha: toISODate(D(x.fecha)), vence: d.vence, neto: x.neto, alic: x.alic, perc: x.perc, noGravado: x.noGravado, detalle: String(d.tipoGasto).trim(), arcaId: x.id });
    if (r.errores) { if (yaCargado(p, x)) { x.estado = 'Duplicada'; x.proveedorId = p.id; guardar(); } return r; }
    x.estado = 'Cargada'; x.proveedorId = p.id; x.facturaId = r.factura.id;
    guardar();
    return r;
  }
  /* Comprobantes emitidos: lo que dice ARCA contra lo facturado en el sistema, por punto de venta. En la maqueta ARCA devuelve lo mismo. */
  function comparacionArca(p) {
    const emitidos = (v) => (v.nc && v.nc.pv ? 2 : 1);
    return DB.puntosVenta.map((pv) => {
      const vs = DB.ventas.filter((v) => v.version === 'Oficial' && v.comp.pv === pv.nro && enPeriodo(v.fecha, p));
      const sistema = { n: vs.reduce((s, v) => s + emitidos(v), 0), total: resumen(vs).vendido };
      return { pv, sistema, arca: { n: sistema.n, total: sistema.total }, diferencia: 0, revisar: DB.arca.revisar.filter((x) => vs.some((v) => v.id === x.ventaId)) };
    });
  }
  function asignarPuntoVenta(canalId, nro) {
    const c = canal(canalId);
    if (!c || !DB.puntosVenta.some((x) => x.nro === nro)) return { errores: ['canal y punto de venta'] };
    c.pv = nro;
    if (DB.contadores.comp[nro] == null) DB.contadores.comp[nro] = 0;
    if (DB.contadores.nc[nro] == null) DB.contadores.nc[nro] = 0;
    guardar();
    return { canal: c };
  }

  /* ================= maestros: vendedores, operadores y listas de precios ================= */
  const ROLES = ['Administración', 'Ventas', 'Depósito', 'Contabilidad'];
  const activos = (col) => DB[col].filter((x) => !x.baja && x.id !== 'sis');
  function guardarMaestro(col, d, id) {
    const nombre = String(d.nombre || '').trim();
    const que = { vendedores: 'un vendedor', operadores: 'un operador', listas: 'una lista' }[col];
    const errores = [];
    if (!que) return { errores: ['maestro'] };
    if (nombre.length < 3) errores.push('nombre');
    else if (DB[col].some((x) => x.id !== id && mismoNombre(x.nombre, nombre))) errores.push('nombre (ya hay ' + que + ' con ese nombre)');
    if (col === 'operadores' && !ROLES.includes(d.rol)) errores.push('rol');
    if (col === 'listas' && !id && !(d.pct > 0 && d.pct <= 300)) errores.push('porcentaje sobre la lista Minorista (entre 1 y 300)');
    if (id === 'sis') errores.push('registro editable');
    if (errores.length) return { errores };
    let x = id ? DB[col].find((y) => y.id === id) : null;
    if (!x) { x = { id: nuevoId({ vendedores: 've', operadores: 'u', listas: 'li' }[col]) }; DB[col].push(x); }
    x.nombre = nombre;
    if (col === 'operadores') x.rol = d.rol;
    if (col !== 'listas') x.baja = !!d.baja;
    /* una lista nueva arranca con todos los productos a un porcentaje de la Minorista */
    if (col === 'listas' && !id) { x.factor = r2(d.pct / 100); terminados().forEach((p) => { p.precios[x.id] = Math.round(precioDe(p, 'minorista') * d.pct / 100 / 100) * 100; }); }
    guardar();
    return { registro: x };
  }
  /* Armar o editar un combo: sus componentes definen su stock y su costo. */
  function guardarCombo(productoId, comps) {
    const p = producto(productoId);
    const errores = [];
    if (!p || esMateria(p)) return { errores: ['producto'] };
    if (!esCombo(p) && (Object.keys(p.stockIni || {}).length || DB.ventas.some((v) => v.items.some((l) => l.productoId === p.id)) || DB.movsStock.some((s) => s.productoId === p.id))) errores.push('producto sin stock ni ventas propias (un producto con movimientos no se puede volver combo)');
    const lista = (comps || []).map((c) => ({ productoId: c.productoId, cant: c.cant }));
    if (!lista.length) errores.push('al menos un componente');
    lista.forEach((c) => {
      const x = producto(c.productoId);
      if (!x || esMateria(x) || esCombo(x) || x.id === p.id) { if (!errores.includes('componentes (productos terminados que no sean combos)')) errores.push('componentes (productos terminados que no sean combos)'); }
      else if (!(Number.isInteger(c.cant) && c.cant > 0)) errores.push('cantidad de ' + x.nombre);
    });
    if (new Set(lista.map((c) => c.productoId)).size !== lista.length) errores.push('componentes sin repetir');
    if (errores.length) return { errores };
    p.combo = lista; delete p.costo; delete p.stockIni; delete p.materiales; delete p.ubic;
    guardar();
    return { producto: p };
  }

  /* ================= cobros: anular uno suelto y depositar cheques de terceros ================= */
  /* Anular un cobro lo saca de los cobros de la venta (queda en el historial). La cuenta corriente y la caja salen de ahí, así que se acomodan solas. */
  function anularCobro(ventaId, nro) {
    const v = venta(ventaId), c = v && v.cobros.find((x) => x.nro === Number(nro));
    if (!c || anulada(v)) return { errores: ['cobro vigente'] };
    if (canal(v.canal).tienda) return { errores: ['cobro cargado a mano (los de las tiendas entran solos)'] };
    if (c.depositado) return { errores: ['cheque sin depositar (primero anulá el depósito desde la caja)'] };
    const fecha = ahora();
    v.cobros = v.cobros.filter((x) => x !== c);
    (v.cobrosAnulados || (v.cobrosAnulados = [])).push({ ...c, anulado: { fecha, operadorId: USUARIO } });
    if (c.acreditaEn && !v.cobros.some((x) => x.acreditaEn)) v.acred.estado = '';
    if (!v.acred.vence) v.acred.vence = masDias(HOY, 30).toISOString();
    guardar();
    return { venta: v };
  }
  const chequesEnCartera = () => DB.ventas.flatMap((v) => anulada(v) ? [] : v.cobros.filter(enCartera).map((c) => ({ v, c })));
  /* Depositar cheques de terceros, uno o varios: cada uno es una transferencia de la cartera al banco. */
  function depositarCheques(recibos, bancoId) {
    const b = caja(bancoId);
    const lista = chequesEnCartera().filter((x) => (recibos || []).map(Number).includes(x.c.nro));
    const errores = [];
    if (!b || b.tipo !== 'banco') errores.push('banco donde se depositan');
    if (!lista.length || lista.length !== new Set((recibos || []).map(Number)).size) errores.push('cheques en cartera');
    if (errores.length) return { errores };
    let total = 0;
    const movs = lista.map(({ v, c }) => {
      const r = transferir({ desde: c.caja, hacia: b.id, monto: netoCobro(v, c), detalle: 'Depósito del cheque ' + c.cheque.nro + ' de ' + nombreDe(cliente(v.clienteId)), cobro: { ventaId: v.id, nro: c.nro } });
      if (r.mov) { c.depositado = { fecha: r.mov.fecha, movId: r.mov.id, banco: b.id }; total += r.mov.monto; }
      return r.mov;
    }).filter(Boolean);
    guardar();
    return movs.length ? { movs, total: r2(total) } : { errores: ['saldo en la cartera de cheques'] };
  }

  /* ================= UI general ================= */
  const UI = {
    ventas: { tab: 'todas', canal: '', q: '', limite: 60 },
    clientes: { tab: 'todos', q: '', conSaldo: false, limite: 60 },
    proveedores: { tab: 'Proveedor', q: '' },
    productos: { tab: 'lista', q: '', rubro: '', canal: '', estado: '' },
    cajas: { tab: 'cajas', cheques: 'A debitar', anulados: '' },
    depositos: { tab: 'remitir', q: '', pasillo: '', tipo: '', remEstado: 'curso', remTipo: '', limite: 80 },
    produccion: { tab: 'tablero', estado: '' },
    config: { tab: 'canales' },
    informes: { q: '', todo: '' }
  };
  let toastT;
  function toast(msg, ic) {
    const t = $('#toast'); setHTML(t, '<i class="ph-fill ' + (ic || 'ph-check-circle') + '"></i><span>' + esc(msg) + '</span>'); t.classList.add('visible');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('visible'), 3600);
  }
  const avisoError = (r) => toast('No se pudo: falta ' + r.errores.join(', ') + '.', 'ph-warning-circle');

  /* El menú sale de la base: una tienda nueva aparece sola en Canales. */
  function menu() {
    return [
      { grupo: null, items: [['inicio', 'Panel general', 'ph-squares-four']] },
      { grupo: 'Canales', items: DB.canales.filter((c) => c.tienda).map((c) => ['ventas?canal=' + c.id, c.nombre, 'ph-storefront', c.id]).concat([['cajas?caja=mp', 'Mercado Pago', 'ph-wallet', 'mp']]) },
      { grupo: 'Ventas', items: [['ventas', 'Centro de ventas', 'ph-receipt'], ['clientes', 'Clientes', 'ph-users']] },
      { grupo: 'Compras', items: [['proveedores', 'Proveedores y gastos', 'ph-truck']] },
      { grupo: 'Productos y depósito', items: [['productos', 'Productos y stock', 'ph-package'], ['depositos', 'Depósito', 'ph-warehouse']] },
      { grupo: 'Producción', items: [['produccion', 'Órdenes de fabricación', 'ph-factory']] },
      { grupo: 'Tesorería', items: [['cajas', 'Cajas y bancos', 'ph-bank']] },
      { grupo: 'Informes', items: [['informes', 'Informes', 'ph-chart-bar']] },
      { grupo: 'Configuración', items: [['config', 'Configuración', 'ph-gear-six']] }
    ];
  }
  function pintarNav() {
    const actual = location.hash.replace(/^#\//, '') || 'inicio';
    const nRemitir = ventasARemitir().length;
    let html = '';
    menu().forEach((g) => {
      html += '<div class="nav-grupo">' + (g.grupo ? '<h3>' + esc(g.grupo) + '</h3>' : '');
      g.items.forEach(([ruta, nombre, ic, mk]) => {
        const activo = actual === ruta || (ruta === 'ventas' && actual.startsWith('ventas') && !actual.includes('canal=')) || (ruta === 'informes' && actual.startsWith('informe')) || (['cajas', 'depositos', 'productos', 'config'].includes(ruta) && actual.startsWith(ruta + '?tab')) || (ruta === 'config' && actual === 'canales');
        const badge = (ruta === 'ventas' || ruta === 'depositos') && nRemitir ? '<span class="badge b-warn" title="Ventas a remitir">' + nRemitir + '</span>' : '';
        html += '<a href="#/' + esc(ruta) + '"' + (activo ? ' aria-current="page"' : '') + '>' + (mk ? marca(mk, 'sm') : '<i class="ph ' + ic + '"></i>') + '<span>' + esc(nombre) + '</span>' + badge + '</a>';
      });
      html += '</div>';
    });
    html += '<div class="nav-grupo"><a href="#/inicio" data-accion="restablecer"><i class="ph ph-arrow-counter-clockwise"></i><span>Restablecer ejemplo</span></a></div>';
    setHTML($('#nav'), html);
  }

  /* ================= selector de fechas: un solo componente para todas las pantallas ================= */
  const CAL = { el: null, mes: null, ancla: '', boton: null };
  function selectorFechas(rapidos) {
    const p = periodo();
    const seg = rapidos ? '<div class="segmentado" role="group" aria-label="Período">' + [['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', mayus(nombreMes(INI_HOY))]].map(([k, n]) => '<button type="button" data-accion="atajo-fechas" data-atajo="' + k + '" aria-pressed="' + (p.atajo === k) + '">' + esc(n) + '</button>').join('') + '</div>' : '';
    return seg + '<div class="fechas"><button type="button" class="btn" data-accion="abrir-fechas" aria-haspopup="dialog" aria-expanded="false" title="Elegir período"><i class="ph ph-calendar-blank"></i><span>' + esc(p.atajo && !rapidos ? p.corto + ' · ' + p.fechas : p.fechas) + '</span><i class="ph ph-caret-down"></i></button></div>';
  }
  function abrirCal(boton) {
    cerrarCal();
    const el = document.createElement('div');
    el.className = 'cal' + (boton.getBoundingClientRect().left < window.innerWidth / 2 ? ' izq' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Elegir período');
    /* en celular se abre como panel desde abajo, con un velo detrás: va directo en el body para que nada lo recorte */
    const movil = esMovil();
    if (movil) { const velo = document.createElement('div'); velo.className = 'cal-velo'; document.body.appendChild(velo); el.classList.add('hoja'); }
    (movil ? document.body : boton.closest('.fechas')).appendChild(el);
    CAL.boton = boton;
    boton.setAttribute('aria-expanded', 'true');
    const h = deISODate(RANGO.hasta);
    CAL.el = el; CAL.ancla = ''; CAL.mes = new Date(h.getFullYear(), h.getMonth(), 1);
    pintarCal(RANGO.hasta);
  }
  function cerrarCal(conFoco) {
    if (!CAL.el) return;
    const b = CAL.boton;
    $$('.cal-velo').forEach((x) => x.parentNode.removeChild(x));
    CAL.el.parentNode.removeChild(CAL.el); CAL.el = null; CAL.boton = null;
    if (b) { b.setAttribute('aria-expanded', 'false'); if (conFoco) b.focus({ preventScroll: true }); }
  }
  function pintarCal(focoDia) {
    const y = CAL.mes.getFullYear(), mes = CAL.mes.getMonth();
    const hoy = toISODate(INI_HOY), ini = CAL.ancla || RANGO.desde, fin = CAL.ancla || RANGO.hasta;
    const hueco = (new Date(y, mes, 1).getDay() + 6) % 7, dias = new Date(y, mes + 1, 0).getDate();
    let celdas = '';
    for (let i = 0; i < hueco; i++) celdas += '<span></span>';
    for (let d = 1; d <= dias; d++) {
      const k = toISODate(new Date(y, mes, d));
      const punta = k === ini || k === fin;
      celdas += '<button type="button" class="cal-dia' + (punta ? ' extremo' : k > ini && k < fin ? ' en-rango' : '') + (k === hoy ? ' hoy' : '') + '" data-accion="cal-dia" data-dia="' + k + '" aria-label="' + esc(fDiaLargo(new Date(y, mes, d))) + '" aria-pressed="' + punta + '">' + d + '</button>';
    }
    setHTML(CAL.el, '<div class="cal-atajos">' + ATAJOS.map((a) => '<button type="button" data-accion="atajo-fechas" data-atajo="' + a[0] + '" aria-pressed="' + (RANGO.atajo === a[0]) + '">' + a[1] + '</button>').join('') + '</div>' +
      '<div class="cal-mes"><div class="cal-cab"><button type="button" class="btn icon ghost sm" data-accion="cal-mes" data-paso="-1" aria-label="Mes anterior"><i class="ph ph-caret-left"></i></button><b>' + esc(mayus(nombreMes(CAL.mes)) + ' ' + y) + '</b><button type="button" class="btn icon ghost sm" data-accion="cal-mes" data-paso="1" aria-label="Mes siguiente"><i class="ph ph-caret-right"></i></button></div>' +
      '<div class="cal-grilla">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => '<span class="cal-dow">' + x + '</span>').join('') + celdas + '</div>' +
      '<p class="cal-pie">' + (CAL.ancla ? 'Ahora elegí el último día' : 'Elegí el primer día y después el último') + '</p></div>');
    const f = (focoDia && CAL.el.querySelector('[data-dia="' + focoDia + '"]')) || CAL.el.querySelector('.cal-dia.extremo') || CAL.el.querySelector('.cal-dia');
    if (f) f.focus({ preventScroll: true });
  }
  function elegirDia(k) {
    if (!CAL.ancla) { CAL.ancla = k; pintarCal(k); return; }
    fijarRango(deISODate(CAL.ancla), deISODate(k), '');
    aplicarRango();
  }
  /* Cambiar el período redibuja la pantalla que esté abierta. El período queda para todas. */
  function aplicarRango() {
    cerrarCal(); UI.animar = true; render();
    const b = $('[data-accion="abrir-fechas"]'); if (b) b.focus({ preventScroll: true });
  }
  function teclaCal(e) {
    const paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const act = document.activeElement;
    if (!paso || !act || !act.dataset || !act.dataset.dia) return false;
    e.preventDefault();
    const d = masDias(deISODate(act.dataset.dia), paso);
    CAL.mes = new Date(d.getFullYear(), d.getMonth(), 1);
    pintarCal(toISODate(d));
    return true;
  }

  /* ================= router ================= */
  function ruta() {
    const h = location.hash.replace(/^#\//, '') || 'inicio';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    return { partes: path.split('/'), params };
  }
  const VISTAS = () => ({ inicio: vInicio, ventas: vVentas, clientes: vClientes, proveedores: vProveedores, cajas: vCajas, productos: vProductos, depositos: vDepositos, produccion: vProduccion, config: vConfig, canales: vConfig, informes: vInformes, informe: vInforme });
  function render(navegando) {
    const { partes, params } = ruta();
    const vista = $('#vista');
    cerrarMenu(); cerrarCal();
    const V = VISTAS()[partes[0]] || vInicio;
    if (navegando && partes[0] === 'ventas') {
      UI.ventas.canal = params.get('canal') || '';
      UI.ventas.tab = params.get('tab') || 'todas';
      UI.ventas.q = '';
      UI.ventas.limite = 60;
    }
    if (navegando && partes[0] === 'cajas') UI.cajas.tab = params.get('tab') === 'cheques' ? 'cheques' : 'cajas';
    if (navegando && partes[0] === 'canales') UI.config.tab = 'canales';
    if (navegando && params.get('tab') && ['config', 'depositos', 'productos', 'produccion'].includes(partes[0])) UI[partes[0]].tab = params.get('tab');
    setHTML(vista, '<div' + (navegando ? ' class="entra"' : '') + '>' + V(partes, params) + '</div>');
    etiquetarTablas();
    pintarNav();
    indicadores();
    marcarDesbordes();
    if (partes[0] === 'inicio' || !partes[0]) { montarPuente(); if (UI.animar) contar(); }
    UI.animar = false;
    if (navegando && partes[0] === 'cajas' && params.get('caja')) { abrirCaja(params.get('caja')); history.replaceState(null, '', '#/cajas'); }
    if (navegando) { vista.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }

  /* ================= INICIO: panel general ================= */
  function vInicio() {
    const p = periodo();
    const vs = ventasDelPeriodo();
    const R = resumen(vs);
    const DIAS = serieDias(p);
    const pct = R.vendido ? Math.round(R.cobrado / R.vendido * 1000) / 10 : 0;

    const porCanal = DB.canales.map((c) => ({ c, r: resumen(vs.filter((v) => v.canal === c.id)) })).filter((x) => x.r.bruto > 0 || x.c.tienda);
    const filasCanal = porCanal.map(({ c, r }) => '<tr class="clic" data-ir="ventas?canal=' + esc(c.id) + '"><td>' + chipCanal(c.id) + '</td><td class="num">' + r.n + '</td><td class="num">' + fmtM(r.vendido) + '</td><td class="num">' + fmtM(r.cobrado) + '</td><td class="num">' + fmtM(r.descuentos) + '</td><td class="num">' + fmtM(r.transito) + '</td><td class="num"><b>' + fmtM(r.acreditado) + '</b></td></tr>').join('');

    /* para revisar: siempre al día de hoy, no depende del período */
    const nRemitir = ventasARemitir().length;
    const ctacte = ventasConSaldo();
    const aLiquidar = DB.ventas.filter((v) => !anulada(v) && v.acred && v.acred.estado === 'A liquidar');
    const terceros = DB.ventas.flatMap((v) => anulada(v) ? [] : v.cobros.filter(enCartera)).filter((c) => diasA(c.cheque.vence) <= 30);
    const propios = chequesADebitar().filter((ch) => diasA(ch.debito) <= 7);
    const provVence = DB.proveedores.map((x) => ({ x, cta: ctaProveedor(x) })).filter(({ cta }) => cta.prox && diasA(cta.prox.vence) <= 7);
    const sinConciliar = DB.cajas.filter((c) => (c.difExtracto || 0) !== 0);
    const alertas = [
      nRemitir && ['ph-package', 'b-warn', plural(nRemitir, 'venta para remitir', 'ventas para remitir'), 'Pagadas y sin remito todavía', 'ventas?tab=remitir'],
      ctacte.length && ['ph-clock', 'b-warn', fmt0(aCobrar()) + ' a cobrar en cuenta corriente', plural(ctacte.length, 'venta con saldo', 'ventas con saldo'), 'ventas?tab=nocobradas'],
      aLiquidar.length && ['ph-hourglass-medium', 'b-info', fmt0(aLiquidar.reduce((s, v) => s + netoVenta(v), 0)) + ' a liquidar por tiendas y tarjetas', plural(aLiquidar.length, 'venta cobrada', 'ventas cobradas') + ' por ellos, todavía sin depositar', 'ventas?tab=transito'],
      terceros.length && ['ph-money', 'b-info', plural(terceros.length, 'cheque de terceros', 'cheques de terceros') + ' para depositar este mes', fmt0(terceros.reduce((s, c) => s + c.monto, 0)) + ' en cartera', 'cajas?caja=cheques'],
      propios.length && ['ph-calendar-check', 'b-info', plural(propios.length, 'cheque propio debita', 'cheques propios debitan') + ' en 7 días', fmt0(propios.reduce((s, ch) => s + ch.monto, 0)) + ' a salir de los bancos', 'cajas?tab=cheques'],
      provVence.length && ['ph-truck', 'b-warn', plural(provVence.length, 'pago a proveedores vence', 'pagos a proveedores vencen') + ' esta semana', fmt0(provVence.reduce((s, x) => s + x.cta.saldo, 0)) + ' en total', 'proveedores'],
      sinConciliar.length && ['ph-bank', 'b-bad', sinConciliar[0].nombre + ': 1 movimiento del extracto sin cargar', 'El saldo del sistema no coincide con el banco', 'cajas?caja=' + sinConciliar[0].id]
    ].filter(Boolean);
    const listaAlertas = alertas.map(([ic, b, t, s, ir]) => '<li><span class="badge ' + b + ' cuadrado"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div><button type="button" class="btn sm" data-ir="' + esc(ir) + '">Ver</button></li>').join('');

    const debePrestamos = prestamosPor('recibido');
    const tesoro = DB.cajas.filter((c) => ['banco', 'billetera', 'efectivo', 'cheques', 'interna'].includes(c.tipo)).map((c) => { const s = saldoCaja(c.id); return '<div class="n">' + marca(c.id, 'sm') + '<span>' + esc(c.nombre) + '</span>' + (s.conciliado ? '' : ' <span class="badge b-bad">Revisar</span>') + '</div><div class="num">' + fmt0(s.saldo) + '</div>'; }).join('') +
      (totalADebitar() ? '<div class="n aparte"><span class="marca ico t-ambar sm"><i class="ph-duotone ph-calendar-check"></i></span><span>Cheques propios a debitar</span></div><div class="num aparte">' + fmt0(-totalADebitar()) + '</div>' : '') +
      (debePrestamos ? '<div class="n aparte"><span class="marca ico t-pizarra sm"><i class="ph-duotone ph-handshake"></i></span><span>Préstamos por devolver</span></div><div class="num aparte">' + fmt0(-debePrestamos) + '</div>' : '');

    return '' +
      '<div class="encabezado"><div><h1>Panel general</h1><p>' + esc(p.texto) + '</p></div><div class="acciones">' + selectorFechas(true) + '</div></div>' +
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
          '<div class="cierre"><i class="ph-fill ph-check-circle"></i><span>Diferencia sin explicar entre vendido y acreditado</span><span class="num" id="sin-explicar">' + fmt(R.sinExplicar) + '</span></div>' +
        '</div></section>' +
          '<section class="card"><div class="card-h"><h2>Por canal</h2><span class="sub">Tocá un canal para ver sus ventas</span></div><div class="card-b" style="padding:12px 0 0"><div class="tabla-wrap"><table class="compacta"><thead><tr><th>Canal</th><th class="num">Ventas</th><th class="num">Vendido</th><th class="num">Cobrado</th><th class="num" title="Comisiones, envíos, retenciones y costo de cuotas">Descuentos</th><th class="num">En tránsito</th><th class="num">Acreditado</th></tr></thead><tbody>' + filasCanal + '</tbody><tfoot><tr><td>Total</td><td class="num">' + R.n + '</td><td class="num">' + fmtM(R.vendido) + '</td><td class="num">' + fmtM(R.cobrado) + '</td><td class="num">' + fmtM(R.descuentos) + '</td><td class="num">' + fmtM(R.transito) + '</td><td class="num">' + fmtM(R.acreditado) + '</td></tr></tfoot></table></div></div></section>' +
        '</div>' +
        '<div class="pila">' +
          '<section class="card"><div class="card-h"><h2>Para revisar</h2><span class="sub">Al día de hoy</span></div><div class="card-b">' + (listaAlertas ? '<ul class="alertas">' + listaAlertas + '</ul>' : '<div class="vacio-estado"><i class="ph ph-check-circle"></i><p>Nada pendiente.</p></div>') + '</div></section>' +
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

  function montarPuente() {
    const cont = $('#puente'); if (!cont) return;
    const R = resumen(ventasDelPeriodo());
    const pasos = [
      ['Vendido', R.bruto, 'total', 'ventas'],
      ['Anuladas', -R.anuladas, 'resta', 'ventas?tab=anuladas'],
      ['Cta. cte.', -R.ctacte, 'pend', 'ventas?tab=nocobradas'],
      ['Cobrado', R.cobrado, 'total', 'ventas'],
      ['Comisiones', -R.comision, 'resta', 'ventas'],
      ['Envíos', -R.envio, 'resta', 'ventas'],
      ['Retenciones', -R.retencion, 'resta', 'ventas'],
      ['Cuotas', -R.cuotas, 'resta', 'ventas'],
      ['En tránsito', -R.transito, 'pend', 'ventas?tab=transito'],
      ['Acreditado', R.acreditado, 'total', 'ventas']
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
    ['remitir', 'A remitir', aRemitir],
    ['enviar', 'A enviar', aEnviar],
    ['nocobradas', 'No cobradas', (v) => saldoVenta(v) > 0.009],
    ['transito', 'En tránsito', (v) => !anulada(v) && ['A liberar', 'A liquidar', 'Cheque en cartera'].includes(estadoAcred(v))],
    ['senas', 'Señas', (v) => v.version === 'Seña' && !anulada(v)],
    ['devoluciones', 'Devoluciones', (v) => anulada(v) && !!v.devolucion],
    ['anuladas', 'Anuladas', (v) => anulada(v)],
    ['cotizaciones', 'Cotizaciones', (v) => !esVenta(v)]
  ];
  /* Lo pendiente de remitir o de enviar se mira al día de hoy: no lo recorta el período. */
  const TABS_HOY = ['remitir', 'enviar'];
  function filtrarVentas(tabId) {
    const f = UI.ventas;
    const tab = TABS_VENTAS.find((t) => t[0] === (tabId || f.tab)) || TABS_VENTAS[0];
    const p = TABS_HOY.includes(tab[0]) ? null : periodo();
    const q = sinAcentos(f.q.trim());
    const qNum = parseNum(f.q.trim());
    return DB.ventas.filter((v) => {
      if (!tab[2](v)) return false;
      if (tab[0] !== 'cotizaciones' && !esVenta(v)) return false;
      if (f.canal && v.canal !== f.canal) return false;
      if (p && !enPeriodo(v.fecha, p)) return false;
      if (q) {
        const cli = cliente(v.clienteId);
        const txt = sinAcentos(v.id + ' ' + compTxt(v) + ' ' + cli.nombre + ' ' + cli.doc + ' ' + nombreDe(vendedor(v.vendedorId)) + ' ' + v.items.map((l) => l.nombre).join(' '));
        if (!coincide(txt, q) && !(Number.isFinite(qNum) && Math.abs(v.total - qNum) < 1)) return false;
      }
      return true;
    }).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  }
  function vVentas() {
    const f = UI.ventas;
    if (f.canal && !canal(f.canal)) f.canal = '';
    if (!TABS_VENTAS.some((t) => t[0] === f.tab)) f.tab = 'todas';
    const lista = filtrarVentas();
    const cuenta = {}; TABS_VENTAS.forEach(([id]) => { cuenta[id] = id === f.tab ? lista.length : filtrarVentas(id).length; });
    const tabs = TABS_VENTAS.map(([id, nom]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-ventas" data-tab="' + id + '">' + nom + ' <span class="cuenta">' + cuenta[id] + '</span></button>').join('');
    const opCanal = '<option value="">Todos los canales</option>' + DB.canales.map((c) => '<option value="' + esc(c.id) + '"' + (f.canal === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>').join('');
    const R = resumen(lista);
    const filas = lista.slice(0, f.limite).map(filaVenta).join('');
    const titulo = f.canal ? canal(f.canal).nombre : 'Centro de ventas';
    const bajada = TABS_HOY.includes(f.tab) ? 'Pendientes al día de hoy, de cualquier fecha' : f.canal ? 'Ventas de este canal, con su cobro y su acreditación' : 'Todas las ventas de todos los canales en un solo lugar';
    return '' +
      '<div class="encabezado"><div><h1>' + esc(titulo) + '</h1><p>' + bajada + '</p></div><div class="acciones">' +
        '<button type="button" class="btn" data-accion="tab-ventas" data-tab="remitir" title="Ventas pagadas que todavía no salieron"><i class="ph ph-truck"></i>A remitir <span class="badge ' + (cuenta.remitir ? 'b-warn' : 'b-ok') + '">' + cuenta.remitir + '</span></button>' +
        '<button type="button" class="btn primary" data-accion="nueva-venta" data-version="Oficial"><i class="ph ph-plus"></i>Nueva venta</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="ventas">' + tabs + '</div>' +
      '<div class="toolbar"><div class="filtros">' +
        '<label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-ventas-q" placeholder="Cliente, comprobante, producto o monto" value="' + esc(f.q) + '" aria-label="Buscar ventas"></label>' +
        '<select class="input" id="f-ventas-canal" aria-label="Canal">' + opCanal + '</select>' +
        (TABS_HOY.includes(f.tab) ? '' : selectorFechas()) +
        (f.q || f.canal ? '<button type="button" class="btn ghost" data-accion="limpiar-ventas"><i class="ph ph-x"></i>Limpiar</button>' : '') +
      '</div><div class="acciones"><button type="button" class="btn" data-accion="exportar-ventas"><i class="ph ph-file-xls"></i>Exportar</button></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Comprobante</th><th class="num">Total</th><th>Cobro</th><th>Acreditación</th></tr></thead><tbody>' +
        (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-magnifying-glass"></i><p>No hay ventas con estos filtros.</p></div></td></tr>') +
      '</tbody>' + (lista.length ? '<tfoot><tr><td colspan="5">' + plural(lista.length, 'venta', 'ventas') + ' · cobrado ' + fmt0(R.cobrado) + ' · acreditado ' + fmt0(R.acreditado) + '</td><td class="num">' + fmt0(R.vendido + (f.tab === 'anuladas' || f.tab === 'devoluciones' ? R.anuladas : 0)) + '</td><td colspan="2"></td></tr></tfoot>' : '') + '</table>' +
      (lista.length > f.limite ? '<div class="mas"><button type="button" class="btn" data-accion="mas-ventas">Mostrar 60 más (quedan ' + (lista.length - f.limite) + ')</button></div>' : '') + '</div>';
  }
  const compCorto = (v) => compTxt(v).replace(/^Factura /, '').replace(/^Recibo de seña/, 'Seña').replace(/^Comprobante interno/, 'Interno').replace(/^Nota de débito /, 'ND ');
  function filaVenta(v) {
    const cli = cliente(v.clienteId);
    const ec = estadoCobro(v), ea = estadoAcred(v);
    const aviso = aRemitir(v) ? ' <span class="badge b-warn" title="A remitir"><i class="ph ph-truck"></i></span>' : aEnviar(v) ? ' <span class="badge b-info" title="A enviar"><i class="ph ph-paper-plane-tilt"></i></span>' : '';
    return '<tr class="clic" data-venta="' + v.id + '"><td class="num">' + v.id + aviso + '</td><td>' + fFechaHora(v.fecha) + '</td><td><div class="persona"><span class="av">' + esc(iniciales(cli.nombre)) + '</span><span class="trunc">' + esc(cli.nombre) + '</span></div></td><td>' + chipCanal(v.canal) + '</td><td class="mono">' + esc(compCorto(v)) + '</td><td class="num">' + fmt(v.total) + '</td><td><span class="badge ' + badgeCobro(ec) + '">' + esc(ec) + '</span></td><td>' + (ea ? '<span class="badge ' + badgeAcred(ea) + '"><i class="ph ' + iconoAcred(ea) + '"></i>' + esc(ea) + '</span>' : '') + '</td></tr>';
  }

  function abrirVenta(id) {
    const v = venta(id); if (!v) return;
    const cli = cliente(v.clienteId), c = canal(v.canal);
    const a = v.acred || {}, d = descuentos(v);
    const ec = estadoCobro(v), ea = estadoAcred(v);
    const conBonif = v.items.some((l) => l.bonif);
    const items = v.items.map((l) => '<tr><td>' + esc(l.nombre) + (l.servicio ? '<span class="sec">Servicio</span>' : '') + '</td><td class="num">' + l.cant + '</td><td class="num">' + fmt(l.precio) + '</td>' + (conBonif ? '<td class="num">' + (l.bonif ? String(l.bonif).replace('.', ',') + '%' : '') + '</td>' : '') + '<td class="num">' + fmt(importeLinea(l)) + '</td></tr>').join('');
    const cols = conBonif ? 4 : 3;
    const pie = (t, n, cls) => '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td colspan="' + cols + '">' + esc(t) + '</td><td class="num">' + fmt(n) + '</td></tr>';
    const pct = (x) => String(x).replace('.', ',') + '%';
    const totales = (v.ajustes.length || (v.imp && v.imp.tributos) ? pie('Subtotal', v.subtotal, 'suave') : '') +
      v.ajustes.map((x) => pie((x.tipo === 'recargo' ? 'Recargo' : 'Bonificación') + (x.modo === 'pct' ? ' ' + pct(x.valor) : '') + ' · ' + x.concepto, x.tipo === 'recargo' ? x.monto : -x.monto, 'suave')).join('') +
      (v.imp ? v.imp.alicuotas.map((x) => x.alic === 0 ? pie('Exento', x.neto, 'suave') : pie('Neto gravado al ' + pct(x.alic), x.neto, 'suave') + pie('IVA ' + pct(x.alic), x.iva, 'suave')).join('') + v.imp.percepciones.map((x) => pie('Percepción ' + x.imp + ' ' + pct(x.alic), x.monto, 'suave')).join('') : '') +
      pie('Total', v.total);
    const rm = anulada(v) ? null : remitoDe(v);
    const filaCobro = (cb, anul) => '<tr' + (anul ? ' class="tachado"' : '') + '><td>' + fFecha(cb.fecha) + '</td><td>' + esc(cb.medio) + (cb.cuotas > 1 ? ' en ' + cb.cuotas + ' cuotas' : '') + (cb.cheque ? '<span class="sec">Cheque ' + esc(cb.cheque.banco) + ' N° ' + esc(cb.cheque.nro) + ', vence ' + fFecha(cb.cheque.vence) + (cb.depositado ? ' · depositado en ' + esc(nombreDe(caja(cb.depositado.banco))) : '') + '</span>' : '') + (cb.retencion ? '<span class="sec">Incluye retención de ' + fmt(cb.retencion) + '</span>' : '') + '</td><td>' + esc(nombreDe(caja(anul ? cb.caja : cajaDeCobro(v, cb)))) + '</td><td class="num">' + fmt(cb.monto) + '</td><td>' + (anul ? '<span class="badge b-neutro">Anulado</span>' : !anulada(v) && !c.tienda ? '<button type="button" class="btn sm ghost" data-accion="anular-cobro" data-id="' + v.id + '" data-nro="' + cb.nro + '">Anular</button>' : '') + '</td></tr>';
    const cobros = v.cobros.map((cb) => filaCobro(cb)).join('') + (v.cobrosAnulados || []).map((cb) => filaCobro(cb, true)).join('');
    const cajaCobro = v.cobros[0] ? caja(cajaDeCobro(v, v.cobros[0])) : null;
    const quienCobra = v.cobros[0] ? caja(v.cobros[0].caja) : null;
    const pasos = [];
    pasos.push(['ph-receipt', 'Venta registrada', fFechaHora(v.fecha) + (c.conexion === 'manual' ? ' · ' + nombreDe(operador(v.operadorId)) : ' · entró sola desde ' + c.nombre), true]);
    if (v.version === 'Oficial') pasos.push(['ph-file-text', compTxt(v) + ' emitida', 'CAE ' + v.comp.cae, true]);
    if (v.version === 'Neutral') pasos.push(['ph-file-text', compTxt(v), 'Sin CAE ni IVA: no entra en lo contable', true]);
    if (v.cobros.length) pasos.push(['ph-hand-coins', ec === 'Parcial' ? 'Cobro parcial' : 'Cobrada', fFechaHora(v.cobros[0].fecha) + ' · ' + v.cobros[0].medio, true]);
    else if (esVenta(v) && !anulada(v)) pasos.push(['ph-clock', 'A cobrar', 'Vence ' + fFecha(a.vence || a.fecha), false]);
    if (rm) pasos.push(['ph-truck', 'Remito ' + rm.nro + ' · ' + rm.estado, v.envio + ' · salió de ' + nombreDe(deposito(rm.depositoId)), rm.estado === 'En camino' || rm.estado === 'Entregado']);
    else if (aRemitir(v)) pasos.push(['ph-truck', 'Pendiente de remitir', v.envio + ' · stock reservado en ' + nombreDe(deposito(v.deposito)), false]);
    if (anulada(v)) pasos.push(['ph-arrow-u-up-left', 'Anulada con ' + ncTxt(v), fFecha(v.nc.fecha) + ' · se devolvió el cobro' + (v.devolucion ? ' y la mercadería volvió a ' + nombreDe(deposito(v.devolucion.deposito)) : ''), true]);
    else if (ea === 'Acreditada' && cajaCobro) pasos.push(['ph-bank', 'Acreditada en ' + cajaCobro.nombre, fFecha(a.fecha) + ' · ' + fmt(acreditadoVenta(v)), true]);
    else if (ea === 'A liberar' || ea === 'A liquidar') pasos.push(['ph-hourglass-medium', (ea === 'A liberar' ? 'Se libera el ' : 'Se liquida el ') + fFecha(a.fecha), 'Entran ' + fmt(netoVenta(v)) + ' a ' + nombreDe(caja(v.cobros[0].acreditaEn || v.cobros[0].caja)), false]);
    else if (ea === 'Cheque en cartera') pasos.push(['ph-money', 'Cheque para depositar', 'Vence ' + fFecha(a.fecha), false]);
    const tl = pasos.map(([ic, t, s, ok]) => '<li><span class="p' + (ok ? '' : ' pend') + '"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></li>').join('');
    const quienComision = quienCobra && quienCobra.recargo ? 'Recargo que retiene ' + quienCobra.nombre : quienCobra && quienCobra.liquidaEn ? 'Comisión de la tarjeta' : 'Comisión de ' + c.nombre;
    const desg = esVenta(v) && !anulada(v) ? '<div class="desglose">' +
      '<span>Total de la venta</span><span class="num">' + fmt(v.total) + '</span>' +
      (saldoVenta(v) > 0 ? '<span class="resta">Falta cobrar</span><span class="num resta">-' + fmt(saldoVenta(v)) + '</span>' : '') +
      (d.comision ? '<span class="resta">' + esc(quienComision) + '</span><span class="num resta">-' + fmt(d.comision) + '</span>' : '') +
      (d.envio ? '<span class="resta">Envío a cargo de HDC</span><span class="num resta">-' + fmt(d.envio) + '</span>' : '') +
      (d.cuotas ? '<span class="resta">Costo de cuotas sin interés</span><span class="num resta">-' + fmt(d.cuotas) + '</span>' : '') +
      (d.retencion ? '<span class="resta">Retenciones que nos hicieron</span><span class="num resta">-' + fmt(d.retencion) + '</span>' : '') +
      '<span class="final">' + (ea === 'Acreditada' ? 'Acreditado' : 'Neto a acreditar') + '</span><span class="final num">' + fmt(netoVenta(v)) + '</span></div>' +
      (c.tienda && deducciones(v) ? '<p class="nota">Comisión, envío y retenciones de esta venta, tal como los informa ' + esc(c.id === 'ml' ? 'Mercado Pago' : c.nombre) + '.</p>' : '') : '';
    const u = utilidadVenta(v);
    const acciones = [];
    if (saldoVenta(v) > 0.009) acciones.push('<button type="button" class="btn primary" data-accion="cobrar-venta" data-id="' + v.id + '"><i class="ph ph-hand-coins"></i>Registrar cobro</button>');
    if (aRemitir(v)) acciones.push('<button type="button" class="btn" data-accion="remitir" data-id="' + v.id + '"><i class="ph ph-truck"></i>Remitir</button>');
    if (aEnviar(v)) acciones.push('<button type="button" class="btn" data-accion="despachar" data-id="' + v.id + '"><i class="ph ph-paper-plane-tilt"></i>Marcar en camino</button>');
    if (rm) acciones.push('<button type="button" class="btn" data-remito="' + esc(rm.id) + '"><i class="ph ph-file-text"></i>Ver remito</button>');
    if (!esVenta(v)) acciones.push('<button type="button" class="btn primary" data-accion="convertir-cotizacion" data-id="' + v.id + '"><i class="ph ph-arrow-right"></i>Pasar a venta</button>');
    acciones.push('<button type="button" class="btn" data-accion="imprimir"><i class="ph ph-printer"></i>Imprimir</button>');
    if (!anulada(v) && esVenta(v)) acciones.push('<button type="button" class="btn ghost" data-accion="anular" data-id="' + v.id + '"><i class="ph ph-x-circle"></i>Anular</button>');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>Venta ' + v.id + '</h2><div class="sub">' + chipCanal(v.canal) + ' · ' + fFechaHora(v.fecha) + '</div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' + (anulada(v) ? '<span class="badge b-bad">Anulada</span>' : '<span class="badge ' + badgeCobro(ec) + '">' + esc(ec) + '</span>') + (ea && !anulada(v) ? '<span class="badge ' + badgeAcred(ea) + '"><i class="ph ' + iconoAcred(ea) + '"></i>' + esc(ea) + '</span>' : '') + (v.version !== 'Oficial' ? '<span class="badge b-neutro">' + esc(v.version) + '</span>' : '') + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' +
        '<div class="d-sec"><h3>Cliente y comprobante</h3><dl class="kv"><dt>Cliente</dt><dd><a href="#" data-cliente="' + esc(cli.id) + '">' + esc(cli.nombre) + '</a></dd><dt>' + (cli.doc.includes('-') ? 'CUIT' : 'DNI') + '</dt><dd class="mono">' + esc(cli.doc) + '</dd><dt>Condición IVA</dt><dd>' + esc(cli.iva) + '</dd><dt>Jurisdicción</dt><dd>' + esc(cli.jurisdiccion || 'Sin cargar') + '</dd><dt>Comprobante</dt><dd class="mono">' + esc(compTxt(v)) + '</dd><dt>Lista de precios</dt><dd>' + esc(nombreDe(listaPrecios(v.lista), 'Minorista')) + '</dd>' +
          (v.vendedorId ? '<dt>Vendedor</dt><dd>' + esc(nombreDe(vendedor(v.vendedorId))) + '</dd>' : '') + '<dt>Cargó</dt><dd>' + esc(nombreDe(operador(v.operadorId), 'Sistema')) + '</dd>' +
          (v.deposito ? '<dt>Sale de</dt><dd>' + esc(nombreDe(deposito(v.deposito))) + '</dd>' : '') + '<dt>Envío</dt><dd>' + esc(v.envio) + '</dd></dl></div>' +
        '<div class="d-sec"><h3>Productos</h3><div class="tabla-wrap"><table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th>' + (conBonif ? '<th class="num">Bonif.</th>' : '') + '<th class="num">Importe</th></tr></thead><tbody>' + items + '</tbody><tfoot>' + totales + '</tfoot></table></div></div>' +
        (desg ? '<div class="d-sec"><h3>De lo vendido a lo acreditado</h3>' + desg + '</div>' : '') +
        (esVenta(v) && !anulada(v) ? '<div class="d-sec"><h3>Costo y utilidad</h3><dl class="kv"><dt>' + (v.imp ? 'Venta sin IVA' : 'Venta') + '</dt><dd class="num">' + fmt(u.neto) + '</dd><dt>Costo</dt><dd class="num">' + fmt(u.costo) + '</dd><dt>Utilidad</dt><dd class="num"><b>' + fmt(u.utilidad) + '</b> · ' + pct(u.pct) + '</dd></dl></div>' : '') +
        (cobros ? '<div class="d-sec"><h3>Cobros</h3><div class="tabla-wrap"><table class="compacta"><thead><tr><th>Fecha</th><th>Medio</th><th>Caja</th><th class="num">Monto</th><th></th></tr></thead><tbody>' + cobros + '</tbody></table></div></div>' : '') +
        '<div class="d-sec"><h3>Recorrido</h3><ul class="linea-tiempo">' + tl + '</ul></div>' +
      '</div>');
  }

  /* ================= CLIENTES ================= */
  function vClientes() {
    const f = UI.clientes;
    const q = sinAcentos(f.q.trim());
    const todos = DB.clientes.map((c) => ({ c, k: ctaCliente(c) }));
    const tabs = [['todos', 'Todos', () => true], ['cf', 'Consumidores finales', (x) => x.c.tipo === 'Consumidor final'], ['may', 'Mayoristas y distribuidores', (x) => x.c.tipo !== 'Consumidor final']];
    const tab = tabs.find((t) => t[0] === f.tab);
    let lista = todos.filter(tab[2]).filter((x) => !f.conSaldo || x.k.saldo > 0.009).filter((x) => !q || coincide(x.c.nombre + ' ' + x.c.doc + ' ' + x.c.localidad, q));
    lista.sort((a, b) => (b.k.saldo - a.k.saldo) || ((b.k.ultima || '') > (a.k.ultima || '') ? 1 : -1));
    const deuda = aCobrar();
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
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>' + (c.doc.includes('-') ? 'CUIT' : 'DNI') + '</dt><dd class="mono">' + esc(c.doc) + '</dd><dt>Condición IVA</dt><dd>' + esc(c.iva) + '</dd><dt>Jurisdicción</dt><dd>' + esc(c.jurisdiccion || 'Sin cargar') + '</dd><dt>Condición de pago</dt><dd>' + esc(c.condicion) + '</dd><dt>Lista de precios</dt><dd>' + esc(nombreDe(listaPrecios(c.lista), 'Minorista')) + '</dd><dt>Vendedor</dt><dd>' + esc(nombreDe(vendedor(c.vendedorId), 'Sin asignar')) + '</dd><dt>Percepciones</dt><dd>' + (c.percepciones.length ? esc(c.percepciones.map((x) => x.imp + ' ' + String(x.alic).replace('.', ',') + '%').join(', ')) : 'No aplica') + '</dd><dt>Email</dt><dd>' + esc(c.email || 'Sin cargar') + '</dd></dl></div>' +
        '<div class="d-sec"><h3>Cuenta corriente</h3><p style="margin:0 0 8px;color:var(--ink-soft);font-size:13px">Facturas, cobros y notas de crédito en una sola lista, con el saldo al día.</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Sin movimientos</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= PROVEEDORES ================= */
  function vProveedores() {
    const f = UI.proveedores;
    const p = periodo();
    const q = sinAcentos(f.q.trim());
    const todos = DB.proveedores.map((x) => ({ p: x, k: ctaProveedor(x), per: movsProveedorPeriodo(x, p) }));
    const tipos = [['Proveedor', 'Proveedores'], ['Servicio', 'Servicios'], ['Impuesto', 'Impuestos'], ['Sueldo', 'Sueldos'], ['todos', 'Todos']];
    const lista = todos.filter((x) => f.tab === 'todos' || x.p.tipo === f.tab).filter((x) => !q || coincide(x.p.nombre + ' ' + x.p.cuit + ' ' + x.p.rubro, q)).sort((a, b) => b.k.saldo - a.k.saldo);
    const semana = todos.reduce((s, x) => s + x.k.pend.filter((fc) => diasA(fc.vence) >= 0 && diasA(fc.vence) <= 7).reduce((a, fc) => a + fc.saldo, 0), 0);
    const vencido = todos.reduce((s, x) => s + x.k.pend.filter((fc) => diasA(fc.vence) < 0).reduce((a, fc) => a + fc.saldo, 0), 0);
    const pagado = r2(todos.reduce((s, x) => s + x.per.pagado, 0)), ordenes = todos.reduce((s, x) => s + x.per.ordenes, 0);
    const filas = lista.map(({ p: x, k, per }) => '<tr class="clic" data-proveedor="' + esc(x.id) + '"><td>' + esc(x.nombre) + '<span class="sec">' + esc(x.rubro) + '</span></td><td class="mono">' + esc(x.cuit || '') + '</td><td>' + esc(x.tipo) + '</td><td class="num">' + k.pend.length + '</td><td>' + badgeVence(k.prox && k.prox.vence) + '</td><td class="num">' + fmt0(per.comprado) + '</td><td class="num">' + fmt0(per.pagado) + '</td><td class="num">' + (k.saldo > 0 ? '<b>' + fmt(k.saldo) + '</b>' : fmt(0)) + '</td></tr>').join('');
    return '' +
      '<div class="encabezado"><div><h1>Proveedores y gastos</h1><p>Proveedores, servicios, impuestos y sueldos separados, cada uno con su cuenta corriente</p></div><div class="acciones"><button type="button" class="btn" data-accion="nueva-factura-prov"><i class="ph ph-file-plus"></i>Cargar factura</button><button type="button" class="btn primary" data-accion="nuevo-proveedor"><i class="ph ph-plus"></i>Nuevo</button></div></div>' +
      '<div class="kpis">' + kpi('ph-scales', 'Deuda total', fmtM(deudaProveedores()), 'Facturas pendientes de pago') + kpi('ph-calendar-check', 'Vence en 7 días', fmtM(semana), 'Hasta el ' + fFecha(masDias(INI_HOY, 7))) + kpi('ph-warning', 'Vencido', fmtM(vencido), vencido > 0 ? 'Revisar' : 'Nada vencido', vencido <= 0) + kpi('ph-arrow-up-right', 'Pagado en el período', fmtM(pagado), plural(ordenes, 'orden de pago', 'órdenes de pago') + ' · ' + p.fechas) + '</div>' +
      '<div class="tabs" role="tablist" data-key="proveedores">' + tipos.map(([id, n]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-proveedores" data-tab="' + id + '">' + n + ' <span class="cuenta">' + todos.filter((x) => id === 'todos' || x.p.tipo === id).length + '</span></button>').join('') + '</div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-prov-q" placeholder="Nombre, CUIT o rubro" value="' + esc(f.q) + '" aria-label="Buscar proveedores"></label>' + selectorFechas() + '</div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Nombre</th><th>CUIT</th><th>Tipo</th><th class="num">Pendientes</th><th>Próximo vencimiento</th><th class="num" title="Facturas del período elegido">Comprado</th><th class="num" title="Órdenes de pago del período elegido">Pagado</th><th class="num">Saldo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-truck"></i><p>No hay resultados.</p></div></td></tr>') + '</tbody></table></div>';
  }
  function abrirProveedor(id) {
    const p = proveedor(id); if (!p) return;
    const k = ctaProveedor(p);
    const movs = movsProveedor(p).reverse();
    const filas = movs.map((m) => {
      const nc = m.tipo === 'nc', pago = m.tipo === 'pago' || nc, vig = pagoVigente(m) || nc;
      const sec = nc ? esc(m.detalle || '') + ' · IVA ' + fmt(m.iva) : pago ? esc(m.medio || '') + (m.chequeId ? ' N° ' + esc(nombreCheque(m.chequeId)) : '') + (m.retenciones ? ' · retenciones ' + fmt(m.retenciones) : '') : 'Vence ' + fFecha(m.vence) + (m.iva ? ' · IVA ' + fmt(m.iva) : '');
      const accion = !pago || nc ? '' : !vig ? '<span class="badge ' + (m.anulado.motivo === 'Rechazado' ? 'b-bad' : 'b-neutro') + '">' + esc(m.anulado.motivo) + '</span>' : m.chequeId ? '<button type="button" class="btn sm" data-cheque="' + esc(m.chequeId) + '">Ver cheque</button>' : '<button type="button" class="btn sm ghost" data-accion="anular-pago" data-id="' + esc(p.id) + '" data-op="' + m.op + '">Anular</button>';
      return '<tr' + (pago && !vig ? ' class="tachado"' : '') + '><td>' + fFecha(m.fecha) + '</td><td class="mono">' + esc(m.comp) + '<span class="sec">' + sec + '</span></td><td class="num">' + (pago ? '' : fmt(m.monto)) + '</td><td class="num">' + (pago ? fmt(m.monto) : '') + '</td><td class="num">' + fmt(m.saldo) + '</td><td>' + accion + '</td></tr>';
    }).join('');
    const pend = k.pend.map((fc) => '<tr><td class="mono">' + esc(fc.comp) + '</td><td>' + badgeVence(fc.vence) + '</td><td class="num">' + fmt(fc.saldo) + '</td></tr>').join('');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(p.nombre) + '</h2><div class="sub">' + esc(p.tipo) + ' · ' + esc(p.rubro) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (k.saldo > 0 ? '<button type="button" class="btn primary" data-accion="pagar-proveedor" data-id="' + esc(p.id) + '"><i class="ph ph-arrow-up-right"></i>Pagar</button>' : '') + '<button type="button" class="btn" data-accion="nueva-factura-prov" data-id="' + esc(p.id) + '"><i class="ph ph-file-plus"></i>Cargar factura</button><button type="button" class="btn" data-accion="editar-proveedor" data-id="' + esc(p.id) + '"><i class="ph ph-pencil-simple"></i>Editar</button></div>' +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>CUIT</dt><dd class="mono">' + esc(p.cuit || 'No aplica') + '</dd><dt>Jurisdicción</dt><dd>' + esc(p.jurisdiccion || 'No aplica') + '</dd><dt>Condición de pago</dt><dd>' + esc(p.condicion) + '</dd><dt>Saldo</dt><dd class="num"><b>' + fmt(k.saldo) + '</b></dd></dl></div>' +
        (pend ? '<div class="d-sec"><h3>Pendiente de pago</h3><div class="tabla-wrap"><table><thead><tr><th>Comprobante</th><th>Vencimiento</th><th class="num">Saldo</th></tr></thead><tbody>' + pend + '</tbody></table></div></div>' : '') +
        '<div class="d-sec"><h3>Cuenta corriente</h3><p class="nota">Facturas y pagos juntos: cada pago queda aplicado a su factura. Lo anulado no cuenta en el saldo.</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="num">Factura</th><th class="num">Pago</th><th class="num">Saldo</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="6">Sin movimientos</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= CAJAS ================= */
  const GRUPOS_CAJA = [['Bancos y billeteras', ['banco', 'billetera']], ['A liquidar', ['a-liquidar']], ['Efectivo y cajas internas', ['efectivo', 'interna']], ['Cheques, valores y retenciones', ['cheques', 'valores', 'retenciones']], ['Préstamos', ['prestamo']]];
  /* El saldo de las tarjetas se mira al cierre del período elegido. Si el período llega a hoy, es el saldo de hoy. */
  const corteCajas = () => { const p = periodo(); return p.incluyeHoy ? FIN_HOY : p.hasta; };
  function tarjetaCaja(c, corte, hoy) {
    const s = saldoCaja(c.id, corte);
    const conFuente = (c.tipo === 'banco' || c.tipo === 'billetera') && hoy;
    let monto = s.saldo, bajo = hoy ? 'Saldo en el sistema' : 'Saldo al ' + fFecha(corte), estado = '<span class="badge b-neutro">' + esc(c.fuente) + '</span>';
    if (c.tipo === 'a-liquidar') { monto = r2(s.saldo + s.pendiente); bajo = 'A liquidar'; estado = '<span class="badge b-info"><i class="ph ph-hourglass-medium"></i>Esperando liquidación</span>'; }
    else if (c.tipo === 'valores') { monto = -s.saldo; bajo = 'A debitar de los bancos'; estado = '<span class="badge b-info">' + plural(chequesADebitar().length, 'cheque a debitar', 'cheques a debitar') + '</span>'; }
    else if (c.tipo === 'cheques') estado = '<span class="badge b-neutro">' + plural(s.movs.filter((m) => m.cheque).length, 'cheque', 'cheques') + '</span>';
    else if (c.tipo === 'retenciones') bajo = 'A favor en impuestos';
    else if (c.tipo === 'prestamo') { const i = prestamoInfo(c); monto = i.falta; bajo = i.recibido ? 'Falta devolver' : 'Falta que devuelvan'; estado = '<span class="badge b-neutro">' + (i.recibido ? 'Recibido de ' : 'Otorgado a ') + esc(c.prestamo.contraparte) + '</span>'; }
    else if (conFuente) estado = s.conciliado ? '<span class="badge b-ok"><i class="ph ph-check-circle"></i>Conciliado</span>' : '<span class="badge b-bad"><i class="ph ph-warning"></i>Diferencia ' + fmt(s.fuente - s.saldo) + '</span>';
    else if (c.neutral) estado = '<span class="badge b-neutro">Cobra Neutral' + (c.recargo ? ' · recargo ' + String(c.recargo).replace('.', ',') + '%' : '') + '</span>';
    return '<button type="button" class="caja-card" data-caja="' + esc(c.id) + '"><div class="t">' + marca(c.id, 'md') + esc(c.nombre) + '</div>' +
      '<div class="saldo">' + fmt0(monto) + '</div><div class="fuente">' + esc(bajo) + '</div>' +
      (conFuente || s.aDebitar ? '<div class="comparar">' + (conFuente ? '<span>Según ' + esc(c.fuente) + '</span><span class="num">' + fmt0(s.fuente) + '</span>' : '') + (conFuente && s.pendiente ? '<span>A liberar</span><span class="num">' + fmt0(s.pendiente) + '</span>' : '') + (s.aDebitar ? '<span>A debitar por cheques propios</span><span class="num">' + fmt0(-s.aDebitar) + '</span>' : '') + '</div>' : '') +
      '<div class="estado">' + estado + '</div></button>';
  }
  function vCajas() {
    const p = periodo(), corte = corteCajas(), hoy = p.incluyeHoy;
    const enCheques = UI.cajas.tab === 'cheques';
    const tabs = '<div class="tabs" role="tablist" data-key="cajas"><button type="button" role="tab" aria-selected="' + !enCheques + '" data-accion="tab-cajas" data-tab="cajas">Cajas <span class="cuenta">' + DB.cajas.length + '</span></button><button type="button" role="tab" aria-selected="' + enCheques + '" data-accion="tab-cajas" data-tab="cheques">Cheques propios <span class="cuenta">' + chequesADebitar().length + '</span></button></div>';
    const cab = '<div class="encabezado"><div><h1>Cajas y bancos</h1><p>Cada caja comparada con su fuente: el banco, la billetera o la liquidación del canal</p></div><div class="acciones">' +
      (enCheques ? '<button type="button" class="btn primary" data-accion="nueva-chequera"><i class="ph ph-plus"></i>Nueva chequera</button>' :
        selectorFechas() + '<button type="button" class="btn" data-accion="arqueo"><i class="ph ph-scales"></i>Arqueo</button><button type="button" class="btn" data-accion="mov-caja" data-tipo="retiro"><i class="ph ph-minus"></i>Retiro</button><button type="button" class="btn" data-accion="mov-caja" data-tipo="ingreso"><i class="ph ph-plus"></i>Ingreso</button><button type="button" class="btn" data-accion="mov-caja" data-tipo="transferencia"><i class="ph ph-arrows-left-right"></i>Transferir</button><button type="button" class="btn primary" data-accion="nueva-caja"><i class="ph ph-plus"></i>Nueva caja</button>') + '</div></div>';
    if (enCheques) return cab + tabs + vCheques();
    const tot = { disp: 0, pend: 0, chq: 0, ef: 0 };
    DB.cajas.forEach((c) => {
      const s = saldoCaja(c.id, corte);
      if (c.tipo === 'banco' || c.tipo === 'billetera') tot.disp += s.saldo;
      if (c.tipo === 'a-liquidar') tot.pend += s.saldo;
      tot.pend += s.pendiente;
      if (c.tipo === 'cheques') tot.chq += s.saldo;
      if (c.tipo === 'efectivo' || c.tipo === 'interna') tot.ef += s.saldo;
    });
    const grupos = GRUPOS_CAJA.map(([nombre, tipos]) => { const cs = DB.cajas.filter((c) => tipos.includes(c.tipo)); return cs.length ? '<h2 class="grupo-t">' + nombre + '</h2><div class="cajas-grid">' + cs.map((c) => tarjetaCaja(c, corte, hoy)).join('') + '</div>' : ''; }).join('');
    return cab + tabs +
      '<div class="kpis">' + kpi('ph-bank', 'En bancos y billeteras', fmtM(tot.disp), hoy ? (totalADebitar() ? 'Hoy. A debitar por cheques propios ' + fmtM(totalADebitar()) : 'Disponible hoy') : 'Al ' + fFecha(corte), true) + kpi('ph-hourglass-medium', 'A liberar y liquidar', fmtM(tot.pend), 'Billeteras, tiendas y tarjetas') + kpi('ph-money', 'Cheques de terceros', fmtM(tot.chq), 'En cartera, para depositar') + kpi('ph-coins', 'Efectivo y cajas internas', fmtM(tot.ef), 'Del día, vendedores, Mutual y socios') + '</div>' +
      grupos;
  }
  function abrirCaja(id) {
    const c = caja(id); if (!c) return;
    const p = periodo(), corte = corteCajas(), hoy = p.incluyeHoy;
    const s = saldoCaja(id, corte);
    const conFuente = (c.tipo === 'banco' || c.tipo === 'billetera') && hoy;
    const delPeriodo = s.movs.filter((m) => D(m.fecha) >= p.desde);
    const entra = r2(delPeriodo.filter((m) => !m.pendiente && m.monto > 0).reduce((a, m) => a + m.monto, 0)), sale = r2(delPeriodo.filter((m) => !m.pendiente && m.monto < 0).reduce((a, m) => a + m.monto, 0));
    const filas = delPeriodo.slice(0, 120).map((m) => {
      const clic = m.ventaId ? ' class="clic" data-venta="' + m.ventaId + '"' : m.chequeId ? ' class="clic" data-cheque="' + esc(m.chequeId) + '"' : m.proveedorId ? ' class="clic" data-proveedor="' + esc(m.proveedorId) + '"' : '';
      const marcaMov = m.pendiente ? '<span class="badge b-info">' + (c.tipo === 'a-liquidar' ? 'A liquidar' : 'A liberar') + '</span>' : m.movId && !m.chequeId ? '<button type="button" class="btn sm ghost" data-accion="anular-mov-caja" data-id="' + esc(m.movId) + '" data-caja-id="' + esc(c.id) + '" title="Anular este movimiento' + (m.interno ? ' en las dos cajas' : '') + '">Anular</button>' : '';
      return '<tr' + clic + '><td>' + fFecha(m.fecha) + '</td><td>' + esc(m.concepto) + '<span class="sec">' + esc(m.detalle) + (m.cheque ? ' · ' + esc(m.cheque.banco) + ' N° ' + esc(m.cheque.nro) + ', vence ' + fFecha(m.cheque.vence) : '') + '</span></td><td>' + marcaMov + '</td><td class="num">' + fmt(m.monto) + '</td></tr>';
    }).join('');
    const dif = conFuente && !s.conciliado ? '<div class="d-sec"><h3>Sin conciliar</h3><div class="desglose"><span>Débito del extracto del ' + fFecha(masDias(INI_HOY, -1)) + '<br><span style="color:var(--ink-soft);font-size:12.5px">Comisión por mantenimiento de cuenta</span></span><span class="num resta">' + fmt(c.difExtracto) + '</span></div><div style="margin-top:10px"><button type="button" class="btn primary" data-accion="conciliar" data-id="' + esc(c.id) + '"><i class="ph ph-check"></i>Cargar como gasto bancario</button></div></div>' : '';
    const acciones = [];
    const mueve = ['banco', 'billetera', 'efectivo', 'interna', 'prestamo'].includes(c.tipo);
    let kpis;
    if (c.tipo === 'prestamo') {
      const i = prestamoInfo(c);
      acciones.push('<button type="button" class="btn primary" data-accion="mov-caja" data-tipo="transferencia" data-' + (i.recibido ? 'hacia' : 'desde') + '="' + esc(c.id) + '"><i class="ph ph-arrow-u-up-left"></i>Registrar devolución</button>');
      acciones.push('<button type="button" class="btn" data-accion="mov-caja" data-tipo="transferencia" data-' + (i.recibido ? 'desde' : 'hacia') + '="' + esc(c.id) + '"><i class="ph ph-plus"></i>' + (i.recibido ? 'Recibir más' : 'Prestar más') + '</button>');
      kpis = '<div class="kpis en-3">' + kpi('ph-handshake', i.recibido ? 'Nos prestaron' : 'Prestamos', fmt0(i.capital), (i.recibido ? 'De ' : 'A ') + c.prestamo.contraparte) + kpi('ph-arrow-u-up-left', i.recibido ? 'Devolvimos' : 'Nos devolvieron', fmt0(i.devuelto), plural(c.prestamo.cuotas, 'cuota pactada', 'cuotas pactadas')) + kpi('ph-hourglass-medium', i.recibido ? 'Falta devolver' : 'Falta que devuelvan', fmt0(i.falta), i.falta ? 'Saldo del préstamo' : 'Cancelado', !i.falta) + '</div>';
    } else if (c.tipo === 'valores') {
      acciones.push('<button type="button" class="btn primary" data-ir="cajas?tab=cheques"><i class="ph ph-list"></i>Ver cheques propios</button>');
      kpis = '<div class="kpis en-2">' + kpi('ph-calendar-check', 'A debitar de los bancos', fmt0(-s.saldo), plural(chequesADebitar().length, 'cheque emitido', 'cheques emitidos')) + kpi('ph-check-circle', 'Ya debitado', fmt0(DB.cheques.filter((ch) => estadoCheque(ch) === 'Debitado').reduce((a, ch) => a + ch.monto, 0)), 'Salió del banco en la fecha del cheque') + '</div>';
    } else {
      if (mueve) acciones.push('<button type="button" class="btn primary" data-accion="mov-caja" data-tipo="transferencia" data-desde="' + esc(c.id) + '"><i class="ph ph-arrows-left-right"></i>Transferir</button>');
      if (c.tipo === 'efectivo' || c.tipo === 'interna') acciones.push('<button type="button" class="btn" data-accion="arqueo" data-id="' + esc(c.id) + '"><i class="ph ph-scales"></i>Arqueo</button>');
      if (c.tipo === 'cheques') acciones.push('<button type="button" class="btn primary" data-accion="depositar-cheques"><i class="ph ph-bank"></i>Depositar cheques</button>');
      kpis = '<div class="kpis ' + (conFuente || s.aDebitar ? 'en-3' : 'en-2') + '">' + kpi('ph-database', hoy ? 'En el sistema' : 'Al ' + fFecha(corte), fmt0(s.saldo), 'Saldo calculado') + (conFuente ? kpi('ph-bank', 'Según ' + c.fuente, fmt0(s.fuente), s.conciliado ? 'Coincide' : 'No coincide', s.conciliado) : '') + (s.aDebitar && !conFuente ? kpi('ph-calendar-check', 'A debitar', fmt0(-s.aDebitar), 'Cheques propios') : '') + kpi('ph-hourglass-medium', c.tipo === 'a-liquidar' ? 'A liquidar' : 'A liberar', fmt0(s.pendiente), 'Todavía no disponible') + '</div>';
    }
    acciones.push('<button type="button" class="btn" data-accion="editar-caja" data-id="' + esc(c.id) + '"><i class="ph ph-pencil-simple"></i>Editar</button>');
    const arq = DB.arqueos.filter((a) => a.cajaId === c.id).sort((a, b) => a.fecha < b.fecha ? 1 : -1).slice(0, 5).map((a) => '<tr><td>' + fFechaHora(a.fecha) + '</td><td class="num">' + fmt(a.sistema) + '</td><td class="num">' + fmt(a.contado) + '</td><td class="num">' + (a.diferencia ? '<span class="badge b-warn">' + fmt(a.diferencia) + '</span>' : '<span class="badge b-ok">Coincide</span>') + '</td></tr>').join('');
    /* los movimientos anulados no cuentan en el saldo, pero se pueden ver */
    const anulados = DB.movsCaja.filter((m) => m.anulado && (m.desde === id || m.hacia === id)).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    const verAnulados = UI.cajas.anulados === id && anulados.length > 0;
    const botonAnulados = anulados.length ? ' <button type="button" class="btn sm ghost" data-accion="ver-anulados-caja" data-id="' + esc(c.id) + '">' + (verAnulados ? 'Volver a los movimientos' : 'Anulados (' + anulados.length + ')') + '</button>' : '';
    const seccionMovs = verAnulados
      ? '<div class="d-sec"><h3>Movimientos anulados' + botonAnulados + '</h3><p class="nota">No cuentan en el saldo de ninguna caja.</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Anulado</th><th class="num">Monto</th></tr></thead><tbody>' + anulados.map((m) => '<tr class="tachado"><td>' + fFecha(m.fecha) + '</td><td>' + esc(m.tipo === 'transferencia' ? 'Transferencia de ' + nombreDe(caja(m.desde)) + ' a ' + nombreDe(caja(m.hacia)) : m.concepto) + '<span class="sec">' + esc(m.detalle || '') + '</span></td><td>' + fFecha(m.anulado.fecha) + '</td><td class="num">' + fmt(m.hacia === id ? m.monto : -m.monto) + '</td></tr>').join('') + '</tbody></table></div></div>'
      : '<div class="d-sec"><h3>Movimientos · ' + esc(p.fechas) + botonAnulados + '</h3><p class="nota">Entró ' + fmt(entra) + ' · salió ' + fmt(-sale) + ' · ' + plural(delPeriodo.length, 'movimiento', 'movimientos') + '</p><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th></th><th class="num">Monto</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Sin movimientos en el período</td></tr>') + '</tbody></table></div></div>';
    abrirDrawer('' +
      '<div class="d-h">' + marca(c.id, 'lg') + '<div><h2>' + esc(c.nombre) + '</h2><div class="sub">' + esc(c.fuente) + '</div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' +
        kpis +
        (s.aDebitar && conFuente ? '<div class="desglose"><span>Saldo de hoy</span><span class="num">' + fmt(s.saldo) + '</span><span class="resta">A debitar por cheques propios</span><span class="num resta">-' + fmt(s.aDebitar) + '</span><span class="final">Queda después de los cheques</span><span class="final num">' + fmt(s.saldo - s.aDebitar) + '</span></div>' : '') +
        dif +
        (arq ? '<div class="d-sec"><h3>Últimos arqueos</h3><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th class="num">Sistema</th><th class="num">Contado</th><th class="num">Diferencia</th></tr></thead><tbody>' + arq + '</tbody></table></div></div>' : '') +
        seccionMovs +
      '</div>');
  }

  /* ---------- cheques propios ---------- */
  function vCheques() {
    const f = UI.cajas;
    const de = (e) => DB.cheques.filter((ch) => e === 'baja' ? !!ch.baja : estadoCheque(ch) === e);
    const pend = de('A debitar'), deb = de('Debitado'), bajas = de('baja');
    const semana = pend.filter((ch) => diasA(ch.debito) <= 7);
    const vistas = [['A debitar', 'Pendientes de débito', pend], ['Debitado', 'Debitados', deb], ['baja', 'Anulados', bajas]];
    const lista = (vistas.find((x) => x[0] === f.cheques) || vistas[0])[2].slice().sort((a, b) => a.debito < b.debito ? -1 : 1);
    const filas = lista.map((ch) => { const e = estadoCheque(ch); return '<tr class="clic" data-cheque="' + esc(ch.id) + '"><td class="mono">' + esc(ch.nro) + '</td><td>' + esc(nombreDe(proveedor(ch.proveedorId))) + '</td><td>' + esc(nombreDe(caja(ch.banco))) + '</td><td class="num">' + fmt(ch.monto) + '</td><td>' + fFecha(ch.emision) + '</td><td>' + fFecha(ch.debito) + '</td><td><span class="badge ' + badgeCheque(e) + '">' + esc(e) + '</span></td></tr>'; }).join('');
    const chequeras = DB.chequeras.map((q) => '<tr><td>' + esc(nombreDe(caja(q.banco))) + '</td><td class="mono">' + String(q.desde).padStart(8, '0') + ' al ' + String(q.hasta).padStart(8, '0') + '</td><td class="mono">' + (q.proximo > q.hasta ? 'Terminada' : String(q.proximo).padStart(8, '0')) + '</td><td class="num">' + Math.max(0, q.hasta - q.proximo + 1) + '</td></tr>').join('');
    return '' +
      '<div class="kpis">' + kpi('ph-calendar-check', 'Pendiente de débito', fmtM(totalADebitar()), plural(pend.length, 'cheque emitido', 'cheques emitidos'), true) + kpi('ph-clock', 'Debitan en 7 días', fmtM(semana.reduce((s, ch) => s + ch.monto, 0)), plural(semana.length, 'cheque', 'cheques')) + kpi('ph-check-circle', 'Debitados', fmtM(deb.reduce((s, ch) => s + ch.monto, 0)), plural(deb.length, 'cheque', 'cheques')) + kpi('ph-x-circle', 'Anulados o rechazados', String(bajas.length), 'La factura vuelve a quedar pendiente') + '</div>' +
      '<div class="toolbar"><div class="filtros"><div class="segmentado" role="group" aria-label="Estado">' + vistas.map(([id, n, l]) => '<button type="button" data-accion="vista-cheques" data-vista="' + id + '" aria-pressed="' + (f.cheques === id) + '">' + n + ' (' + l.length + ')</button>').join('') + '</div></div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Cheque</th><th>Proveedor</th><th>Banco</th><th class="num">Importe</th><th>Emisión</th><th>Débito</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="7"><div class="vacio-estado"><i class="ph ph-money"></i><p>No hay cheques en esta vista.</p></div></td></tr>') + '</tbody>' + (lista.length ? '<tfoot><tr><td colspan="3">' + plural(lista.length, 'cheque', 'cheques') + '</td><td class="num">' + fmt(lista.reduce((s, ch) => s + ch.monto, 0)) + '</td><td colspan="3"></td></tr></tfoot>' : '') + '</table></div>' +
      '<h2 class="grupo-t">Chequeras</h2><div class="tabla-wrap"><table><thead><tr><th>Banco</th><th>Numeración</th><th>Próximo cheque</th><th class="num">Quedan</th></tr></thead><tbody>' + chequeras + '</tbody></table></div>';
  }
  function abrirCheque(id) {
    const ch = cheque(id); if (!ch) return;
    const e = estadoCheque(ch), p = proveedor(ch.proveedorId), q = chequera(ch.chequeraId), deb = debitoDe(ch);
    const pagos = p ? p.movs.filter((m) => m.tipo === 'pago' && m.chequeId === ch.id) : [];
    const facturas = pagos.map((m) => { const f = p.movs.find((x) => x.id === m.aplicaA); return '<tr><td class="mono">' + esc(f ? f.comp : '') + '</td><td class="num">' + fmt(m.monto) + '</td><td class="num">' + fmt(m.retenciones || 0) + '</td></tr>'; }).join('');
    const acciones = [];
    if (e === 'A debitar') {
      if (D(ch.debito) <= FIN_HOY) acciones.push('<button type="button" class="btn primary" data-accion="debitar-cheque" data-id="' + esc(ch.id) + '"><i class="ph ph-check"></i>Registrar débito</button>');
      acciones.push('<button type="button" class="btn" data-accion="baja-cheque" data-motivo="Anulado" data-id="' + esc(ch.id) + '"><i class="ph ph-x-circle"></i>Anular cheque</button>');
      acciones.push('<button type="button" class="btn" data-accion="baja-cheque" data-motivo="Rechazado" data-id="' + esc(ch.id) + '"><i class="ph ph-warning"></i>Marcar rechazado</button>');
    } else if (e === 'Debitado') acciones.push('<button type="button" class="btn" data-accion="deshacer-debito" data-id="' + esc(ch.id) + '"><i class="ph ph-arrow-u-up-left"></i>Deshacer débito</button>');
    const pasos = [['ph-pen-nib', 'Emitido con la orden de pago ' + ch.op, fFecha(ch.emision) + ' · la factura quedó pagada', true]];
    if (ch.baja) pasos.push(['ph-x-circle', ch.baja.tipo, fFecha(ch.baja.fecha) + ' · la factura volvió a quedar pendiente', true]);
    else if (deb) pasos.push(['ph-bank', 'Debitado de ' + nombreDe(caja(ch.banco)), fFecha(deb.fecha) + ' · ' + fmt(ch.monto), true]);
    else pasos.push(['ph-hourglass-medium', 'Se debita el ' + fFecha(ch.debito), 'Hasta ese día no baja el saldo de ' + nombreDe(caja(ch.banco)), false]);
    abrirDrawer('' +
      '<div class="d-h">' + marca(ch.banco, 'lg') + '<div><h2>Cheque ' + esc(ch.nro) + '</h2><div class="sub">' + esc(nombreDe(p)) + '</div><div style="margin-top:8px"><span class="badge ' + badgeCheque(e) + '">' + esc(e) + '</span></div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        (acciones.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' : '') +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>Proveedor</dt><dd><a href="#" data-proveedor="' + esc(ch.proveedorId) + '">' + esc(nombreDe(p)) + '</a></dd><dt>Banco</dt><dd>' + esc(nombreDe(caja(ch.banco))) + '</dd><dt>Chequera</dt><dd class="mono">' + (q ? String(q.desde).padStart(8, '0') + ' al ' + String(q.hasta).padStart(8, '0') : 'Sin chequera') + '</dd><dt>Importe</dt><dd class="num"><b>' + fmt(ch.monto) + '</b></dd><dt>Emisión</dt><dd>' + fFecha(ch.emision) + '</dd><dt>Fecha de débito</dt><dd>' + fFecha(ch.debito) + '</dd></dl></div>' +
        (facturas ? '<div class="d-sec"><h3>Facturas que paga</h3><div class="tabla-wrap"><table><thead><tr><th>Comprobante</th><th class="num">Pagado</th><th class="num">Retenciones</th></tr></thead><tbody>' + facturas + '</tbody></table></div></div>' : '') +
        '<div class="d-sec"><h3>Recorrido</h3><ul class="linea-tiempo">' + pasos.map(([ic, t, s, ok]) => '<li><span class="p' + (ok ? '' : ' pend') + '"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></li>').join('') + '</ul></div>' +
      '</div>');
  }

  /* ================= PRODUCTOS ================= */
  function vendidasProducto(id) {
    return DB.ventas.filter((v) => esVenta(v) && !anulada(v)).reduce((s, v) => s + v.items.filter((l) => l.productoId === id).reduce((a, l) => a + l.cant, 0), 0);
  }
  /* Stock valorizado: lo disponible más lo que está "A revisión", al costo o por una lista de precios. Los combos no suman: valen sus componentes. */
  function valorizado(arts, listaId, depositoId) {
    return r2(arts.filter((p) => !esCombo(p)).reduce((s, p) => s + stockFisico(p.id, depositoId) * (listaId ? precioDe(p, listaId) : costoDe(p)), 0));
  }
  const margenDe = (p) => { const pr = precioDe(p, 'minorista'); return pr ? Math.round((pr / (1 + (p.alic == null ? 21 : p.alic) / 100) - costoDe(p)) / (pr / (1 + (p.alic == null ? 21 : p.alic) / 100)) * 100) : 0; };
  const fCant = (n) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  function vProductos() {
    const f = UI.productos;
    const q = sinAcentos(f.q.trim());
    const todos = terminados();
    const porPublicar = publicaciones().filter((x) => x.estado === 'Pendiente').length;
    const cab = '<div class="encabezado"><div><h1>Productos y stock</h1><p>' + todos.length + ' productos · stock valorizado al costo ' + fmt0(valorizado(todos)) + '</p></div><div class="acciones"><button type="button" class="btn" data-accion="precios-masivo"><i class="ph ph-percent"></i>Cambio masivo de precios</button><button type="button" class="btn primary" data-accion="nuevo-producto"><i class="ph ph-plus"></i>Nuevo producto</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="productos">' + [['lista', 'Productos', todos.length], ['publicaciones', 'Publicaciones', porPublicar]].map(([id, n, c]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-productos" data-tab="' + id + '">' + n + ' <span class="cuenta">' + c + '</span></button>').join('') + '</div>';
    if (f.tab === 'publicaciones') return cab + vPublicaciones(q, porPublicar);
    const rubros = Array.from(new Set(todos.map((p) => p.rubro)));
    const lista = todos.filter((p) => (!f.rubro || p.rubro === f.rubro) && (!q || coincide(p.nombre + ' ' + p.sku, q)));
    const filas = lista.map((p) => '<tr class="clic" data-producto="' + esc(p.id) + '"><td>' + esc(p.nombre) + '<span class="sec mono">' + esc(p.sku) + (esCombo(p) ? ' · combo' : '') + '</span></td><td>' + esc(p.rubro) + '</td>' + DB.listas.map((l) => '<td class="num">' + fmt0(precioDe(p, l.id)) + '</td>').join('') + '<td class="num">' + fmt0(costoDe(p)) + '</td><td class="num">' + margenDe(p) + '%</td><td class="num">' + fCant(stockDe(p.id)) + '</td><td class="num">' + vendidasProducto(p.id) + '</td><td>' + (esCombo(p) ? '<span class="badge b-neutro">Se arma</span>' : bajoMinimo(p) ? '<span class="badge b-bad">Bajo mínimo</span>' : '<span class="badge b-ok">OK</span>') + '</td></tr>').join('');
    return cab +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-prod-q" placeholder="Nombre o código" value="' + esc(f.q) + '" aria-label="Buscar productos"></label><select class="input" id="f-prod-rubro" aria-label="Rubro"><option value="">Todos los rubros</option>' + rubros.map((r) => '<option' + (f.rubro === r ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Producto</th><th>Rubro</th>' + DB.listas.map((l) => '<th class="num">' + esc(l.nombre) + '</th>').join('') + '<th class="num">Costo</th><th class="num" title="Sobre el precio minorista sin IVA">Margen</th><th class="num" title="Disponible para vender: físico menos reservado">Stock</th><th class="num">Vendidas</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="' + (7 + DB.listas.length) + '"><div class="vacio-estado"><i class="ph ph-package"></i><p>No hay productos con estos filtros.</p></div></td></tr>') + '</tbody></table></div>';
  }
  /* Publicaciones: el precio y el stock que ve cada tienda salen de acá. */
  function vPublicaciones(q, porPublicar) {
    const f = UI.productos;
    const todas = publicaciones();
    const n = (e) => todas.filter((x) => x.estado === e).length;
    const lista = todas.filter((x) => (!f.canal || x.c.id === f.canal) && (!f.estado || x.estado === f.estado) && (!q || coincide(x.p.nombre + ' ' + x.p.sku, q)));
    const filas = lista.map((x) => '<tr><td>' + esc(x.p.nombre) + '<span class="sec mono">' + esc(x.p.sku) + '</span></td><td>' + chipCanal(x.c.id) + '</td><td>' + (x.fijo ? 'Precio fijo' : esc(reglaTxt(x.c))) + '</td><td class="num">' + (x.publicado ? fmt0(x.publicado) : '') + '</td><td class="num"><b>' + fmt0(x.precio) + '</b></td><td class="num' + (x.stock > 0 ? '' : ' cero') + '">' + fCant(Math.max(0, x.stock)) + '</td><td><span class="badge ' + badgePubli(x.estado) + '">' + esc(x.estado) + '</span></td><td><button type="button" class="btn sm ghost" data-accion="precio-fijo" data-id="' + esc(x.p.id) + '" data-canal="' + esc(x.c.id) + '">Precio fijo</button></td></tr>').join('');
    const estados = ['Sincronizado', 'Pendiente', 'Pausado sin stock'];
    return '<div class="kpis">' + kpi('ph-check-circle', 'Sincronizadas', String(n('Sincronizado')), 'La tienda muestra lo mismo que el sistema', !porPublicar) + kpi('ph-arrows-clockwise', 'Pendientes de publicar', String(porPublicar), porPublicar ? 'Cambió el precio y falta publicarlo' : 'Nada pendiente') + kpi('ph-pause-circle', 'Pausadas sin stock', String(n('Pausado sin stock')), 'Se reactivan solas cuando entra stock') + kpi('ph-storefront', 'Tiendas', String(tiendas().length), todas.length + ' publicaciones') + '</div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-prod-q" placeholder="Nombre o código" value="' + esc(f.q) + '" aria-label="Buscar publicaciones"></label><select class="input" id="f-pub-canal" aria-label="Tienda">' + opciones([['', 'Todas las tiendas']].concat(tiendas().map((c) => [c.id, c.nombre])), f.canal) + '</select><select class="input" id="f-pub-estado" aria-label="Estado">' + opciones([['', 'Todos los estados']].concat(estados.map((e) => [e, e])), f.estado) + '</select></div>' +
      '<div class="acciones"><button type="button" class="btn primary" data-accion="publicar-pendientes"' + (porPublicar ? '' : ' disabled') + '><i class="ph ph-arrows-clockwise"></i>Publicar pendientes' + (porPublicar ? ' (' + porPublicar + ')' : '') + '</button></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Producto</th><th>Tienda</th><th>Regla de precio</th><th class="num">Publicado</th><th class="num">A publicar</th><th class="num" title="Disponible en el depósito de la tienda">Stock publicado</th><th>Estado</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-storefront"></i><p>No hay publicaciones con estos filtros.</p></div></td></tr>') + '</tbody></table></div>' +
      '<p class="nota" style="margin-top:12px">La regla de cada tienda se cambia en Configuración. En la maqueta publicar es simulado: en el sistema real el precio y el stock se publican en la tienda.</p>';
  }
  function abrirProducto(id) {
    const p = producto(id); if (!p) return;
    const mat = esMateria(p), combo = esCombo(p);
    const ult = DB.ventas.filter((v) => v.items.some((l) => l.productoId === id)).sort((a, b) => a.fecha < b.fecha ? 1 : -1).slice(0, 12);
    const filas = ult.map((v) => '<tr class="clic" data-venta="' + v.id + '"><td>' + fFecha(v.fecha) + '</td><td>' + chipCanal(v.canal) + '</td><td class="trunc">' + esc(cliente(v.clienteId).nombre) + '</td><td class="num">' + v.items.find((l) => l.productoId === id).cant + '</td></tr>').join('');
    const porDep = depositosDe(p).filter((d) => stockFisico(p.id, d.id) !== 0 || stockReservado(p.id, d.id) !== 0 || (!combo && p.ubic && p.ubic[d.id])).map((d) => '<tr><td>' + esc(d.nombre) + (d.noDisponible ? '<span class="sec">No disponible para vender</span>' : '') + '</td><td class="mono">' + (combo ? '' : esc(ubicTxt(p.ubic && p.ubic[d.id])) + ' <button type="button" class="btn sm ghost" data-accion="ubicacion" data-id="' + esc(p.id) + '" data-deposito="' + esc(d.id) + '" aria-label="Cambiar ubicación"><i class="ph ph-map-pin"></i></button>') + '</td><td class="num">' + fCant(stockFisico(p.id, d.id)) + '</td><td class="num">' + fCant(stockReservado(p.id, d.id)) + '</td><td class="num"><b>' + fCant(d.noDisponible ? 0 : stockDe(p.id, d.id)) + '</b></td></tr>').join('');
    const partes = (arr, titulo) => arr && arr.length ? '<div class="d-sec"><h3>' + titulo + '</h3><div class="tabla-wrap"><table><thead><tr><th>Artículo</th><th class="num">Cantidad</th><th class="num">Costo</th></tr></thead><tbody>' + arr.map((c) => { const x = producto(c.productoId); return '<tr class="clic" data-producto="' + esc(c.productoId) + '"><td>' + esc(nombreDe(x)) + '</td><td class="num">' + fCant(c.cant) + ' ' + esc(x ? x.unidad || 'un' : '') + '</td><td class="num">' + fmt(costoDe(x) * c.cant) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '';
    const botones = (combo ? '' : '<button type="button" class="btn primary" data-accion="mov-stock" data-tipo="ajuste" data-id="' + esc(p.id) + '"><i class="ph ph-arrows-down-up"></i>Mover stock</button><button type="button" class="btn" data-accion="mov-stock" data-tipo="transferencia" data-id="' + esc(p.id) + '"><i class="ph ph-arrows-left-right"></i>Transferir</button>') + (mat ? '' : '<button type="button" class="btn" data-accion="editar-producto" data-id="' + esc(p.id) + '"><i class="ph ph-pencil-simple"></i>Editar precios</button>');
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(p.nombre) + '</h2><div class="sub mono">' + esc(p.sku) + ' · ' + esc(p.rubro) + '</div>' + (combo ? '<div style="margin-top:8px"><span class="badge b-neutro">Combo</span></div>' : '') + '</div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + botones + '</div>' +
        '<div class="kpis en-3">' + kpi('ph-warehouse', combo ? 'Se pueden armar' : 'Disponible', fCant(stockDe(p.id)), combo ? 'Según sus componentes' : (p.unidad || 'un') + ' en todos los depósitos') + (mat ? kpi('ph-warning', 'Mínimo', fCant(p.minimo), bajoMinimo(p) ? 'Por debajo del mínimo' : 'Stock suficiente', !bajoMinimo(p)) : kpi('ph-magnifying-glass', 'A revisión', fCant(stockRevision(p.id)), 'Devoluciones sin revisar')) + (mat ? kpi('ph-currency-circle-dollar', 'Valorizado', fmtM(valorizado([p])), 'Al costo') : kpi('ph-chart-line-up', 'Vendidas', String(vendidasProducto(p.id)), 'Todos los canales')) + '</div>' +
        (mat ? '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>Unidad</dt><dd>' + esc(p.unidad) + '</dd><dt>Costo</dt><dd class="num">' + fmt(p.costo) + '</dd><dt>Proveedor</dt><dd>' + (proveedor(p.proveedorId) ? '<a href="#" data-proveedor="' + esc(p.proveedorId) + '">' + esc(proveedor(p.proveedorId).nombre) + '</a>' : 'Sin asignar') + '</dd><dt>Stock mínimo</dt><dd>' + fCant(p.minimo) + ' ' + esc(p.unidad) + '</dd></dl></div>'
          : '<div class="d-sec"><h3>Precios</h3><dl class="kv">' + DB.listas.map((l) => '<dt>Lista ' + esc(l.nombre) + '</dt><dd class="num">' + fmt(precioDe(p, l.id)) + '</dd>').join('') + '<dt>' + (combo ? 'Costo (suma de componentes)' : 'Costo') + '</dt><dd class="num">' + fmt(costoDe(p)) + '</dd><dt>IVA</dt><dd>' + String(p.alic == null ? 21 : p.alic).replace('.', ',') + '%</dd><dt>Margen</dt><dd>' + margenDe(p) + '% sobre minorista sin IVA</dd>' + (combo ? '' : '<dt>Stock mínimo</dt><dd>' + fCant(p.minimo) + ' unidades</dd>') + '</dl></div>') +
        partes(p.combo, 'Componentes del combo') +
        (porDep ? '<div class="d-sec"><h3>Stock por depósito</h3><div class="tabla-wrap"><table><thead><tr><th>Depósito</th><th>Ubicación</th><th class="num">Físico</th><th class="num" title="Vendido y todavía sin remito">Reservado</th><th class="num">Disponible</th></tr></thead><tbody>' + porDep + '</tbody></table></div></div>' : '') +
        partes(p.materiales, 'Lista de materiales (para fabricar una unidad)') +
        (mat ? '' : '<div class="d-sec"><h3>Últimas ventas</h3><div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Canal</th><th>Cliente</th><th class="num">Cant.</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Sin ventas</td></tr>') + '</tbody></table></div></div>') +
      '</div>');
  }

  /* ================= DEPÓSITO: remitos, rendición y stock en un solo lugar ================= */
  const iconoTipoStock = { venta: 'ph-receipt', compra: 'ph-shopping-cart', fabricacion: 'ph-factory', transferencia: 'ph-arrows-left-right', ajuste: 'ph-arrows-down-up', 'dev-cliente': 'ph-arrow-u-up-left', 'dev-proveedor': 'ph-arrow-u-up-right' };
  const EN_CURSO = ['Pendiente', 'Preparado', 'En camino'];
  const depCorto = (d) => d.nombre.replace('Mercado Libre (Full)', 'Full ML').replace('Provincia Compras', 'Provincia');
  const resumenItems = (items) => items.filter((l) => l.productoId).map((l) => l.cant + ' x ' + l.nombre).join(', ');
  const origenRemito = (r) => r.ventaId ? 'Venta ' + r.ventaId + ' · ' + nombreDe(cliente((venta(r.ventaId) || {}).clienteId)) : nombreDe(proveedor(r.proveedorId));
  const marcarTodos = (clase) => '<input type="checkbox" data-accion="marcar-todos" data-clase="' + clase + '" aria-label="Marcar todos">';
  function dpRemitir(q) {
    const lista = ventasARemitir().filter((v) => !q || coincide(v.id + ' ' + nombreDe(cliente(v.clienteId)) + ' ' + resumenItems(v.items), q)).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    const filas = lista.map((v) => '<tr class="clic" data-venta="' + v.id + '"><td class="chk"><input type="checkbox" class="chk-remitir" value="' + v.id + '" aria-label="Marcar la venta ' + v.id + '"></td><td class="num">' + v.id + '</td><td>' + fFechaHora(v.fecha) + '</td><td class="trunc">' + esc(nombreDe(cliente(v.clienteId))) + '</td><td>' + chipCanal(v.canal) + '</td><td class="trunc">' + esc(resumenItems(v.items)) + '</td><td>' + esc(nombreDe(deposito(v.deposito))) + '</td><td>' + esc(v.envio) + '</td><td><button type="button" class="btn sm" data-accion="remitir" data-id="' + v.id + '">Remitir</button></td></tr>').join('');
    return '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-dep-q" placeholder="Venta, cliente o producto" value="' + esc(UI.depositos.q) + '" aria-label="Buscar ventas para remitir"></label></div><div class="acciones"><button type="button" class="btn primary" data-accion="generar-remitos"><i class="ph ph-truck"></i>Generar remito de las marcadas</button></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th class="chk">' + marcarTodos('chk-remitir') + '</th><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Productos</th><th>Sale de</th><th>Envío</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="9"><div class="vacio-estado"><i class="ph ph-check-circle"></i><p>No hay ventas para remitir.</p></div></td></tr>') + '</tbody>' + (lista.length ? '<tfoot><tr><td colspan="9">' + plural(lista.length, 'venta para remitir', 'ventas para remitir') + ' · el stock está reservado en su depósito hasta que sale el remito</td></tr></tfoot>' : '') + '</table></div>';
  }
  function dpRemitos(q) {
    const f = UI.depositos;
    const todos = DB.remitos.filter((r) => (f.remEstado === 'curso' ? EN_CURSO.includes(r.estado) : !f.remEstado || r.estado === f.remEstado) && (!f.remTipo || r.tipo === f.remTipo) && (!q || coincide(r.nro + ' ' + origenRemito(r) + ' ' + (r.grupo || ''), q))).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    const filas = todos.slice(0, f.limite).map((r) => '<tr class="clic" data-remito="' + esc(r.id) + '"><td class="chk"><input type="checkbox" class="chk-remito" value="' + esc(r.id) + '" aria-label="Marcar el remito ' + esc(r.nro) + '"></td><td class="mono">' + esc(r.nro) + '</td><td>' + fFecha(r.fecha) + '</td><td>' + TIPOS_REMITO[r.tipo] + '</td><td class="trunc">' + esc(origenRemito(r)) + '</td><td>' + esc(nombreDe(deposito(r.depositoId))) + '</td><td class="mono">' + esc(r.grupo || '') + '</td><td><span class="badge ' + badgeRemito(r.estado) + '">' + esc(estadoRemitoTxt(r)) + '</span></td></tr>').join('');
    const estados = [['curso', 'En curso'], ['', 'Todos los estados']].concat(ESTADOS_REMITO.map((e) => [e, e]));
    return '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-dep-q" placeholder="Remito, cliente u hoja de ruta" value="' + esc(f.q) + '" aria-label="Buscar remitos"></label><select class="input" id="f-rem-estado" aria-label="Estado">' + opciones(estados, f.remEstado) + '</select><select class="input" id="f-rem-tipo" aria-label="Tipo de remito">' + opciones([['', 'Todos los tipos']].concat(Object.keys(TIPOS_REMITO).map((k) => [k, TIPOS_REMITO[k]])), f.remTipo) + '</select></div>' +
      '<div class="acciones"><button type="button" class="btn" data-accion="remitos-agrupar" title="Juntar los marcados en una hoja de ruta"><i class="ph ph-stack"></i>Agrupar</button><button type="button" class="btn" data-accion="remitos-estado" data-estado="Preparado">Preparado</button><button type="button" class="btn" data-accion="remitos-estado" data-estado="En camino">En camino</button><button type="button" class="btn" data-accion="remitos-estado" data-estado="Entregado">Entregado</button></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th class="chk">' + marcarTodos('chk-remito') + '</th><th>Remito</th><th>Fecha</th><th>Tipo</th><th>Origen</th><th>Depósito</th><th>Hoja de ruta</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-truck"></i><p>No hay remitos con estos filtros.</p></div></td></tr>') + '</tbody>' + (todos.length ? '<tfoot><tr><td colspan="8">' + plural(todos.length, 'remito', 'remitos') + '</td></tr></tfoot>' : '') + '</table>' +
      (todos.length > f.limite ? '<div class="mas"><button type="button" class="btn" data-accion="mas-movs-stock">Mostrar 80 más (quedan ' + (todos.length - f.limite) + ')</button></div>' : '') + '</div>';
  }
  function dpRendicion() {
    const p = periodo(), R = rendicion(p);
    let dia = '', filas = '';
    R.filas.forEach((x) => {
      if (x.dia !== dia) { dia = x.dia; filas += '<tr class="grupo"><td colspan="2">' + esc(mayus(fDiaLargo(deISODate(dia)))) + '</td><td class="num">' + fCant(R.filas.filter((y) => y.dia === dia).reduce((s, y) => s + y.cant, 0)) + '</td></tr>'; }
      filas += '<tr class="clic" data-producto="' + esc(x.productoId) + '"><td>' + esc(x.nombre) + '</td><td class="num">' + x.remitos + '</td><td class="num">' + fCant(x.cant) + '</td></tr>';
    });
    const porProd = R.porProducto.map((x) => '<tr class="clic" data-producto="' + esc(x.productoId) + '"><td>' + esc(x.nombre) + '</td><td class="num">' + fCant(x.cant) + '</td></tr>').join('');
    return '<div class="toolbar"><div class="filtros">' + selectorFechas() + '</div><div class="acciones"><button type="button" class="btn" data-accion="exportar-rendicion"><i class="ph ph-file-xls"></i>Exportar</button><button type="button" class="btn" data-accion="imprimir-vista"><i class="ph ph-printer"></i>Imprimir</button></div></div>' +
      '<p class="nota">Todo lo que salió con remito: ' + esc(p.texto) + ' · ' + plural(R.nRemitos, 'remito', 'remitos') + ' · ' + fCant(R.total) + ' unidades</p>' +
      '<div class="grilla-2"><div class="tabla-wrap"><table><thead><tr><th>Por día y producto</th><th class="num">Remitos</th><th class="num">Unidades</th></tr></thead><tbody>' + (filas || '<tr><td colspan="3"><div class="vacio-estado"><i class="ph ph-truck"></i><p>No salió nada en este período.</p></div></td></tr>') + '</tbody>' + (R.filas.length ? '<tfoot><tr><td>Total</td><td class="num">' + R.nRemitos + '</td><td class="num">' + fCant(R.total) + '</td></tr></tfoot>' : '') + '</table></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Total por producto</th><th class="num">Unidades</th></tr></thead><tbody>' + (porProd || '<tr><td colspan="2">Sin salidas</td></tr>') + '</tbody>' + (R.porProducto.length ? '<tfoot><tr><td>Total</td><td class="num">' + fCant(R.total) + '</td></tr></tfoot>' : '') + '</table></div></div>';
  }
  function dpMovimientos(q) {
    const f = UI.depositos, anul = f.tipo === 'anulados';
    const todos = movimientosStock(anul).filter((m) => (anul || !f.tipo || m.tipo === f.tipo) && (!q || coincide(nombreDe(producto(m.productoId)) + ' ' + m.motivo, q)));
    const filas = todos.slice(0, f.limite).map((m) => { const p = producto(m.productoId); return '<tr' + (m.remitoId ? ' class="clic' + (anul ? ' tachado' : '') + '" data-remito="' + esc(m.remitoId) + '"' : anul ? ' class="tachado"' : '') + '><td>' + fFecha(m.fecha) + '</td><td><span class="badge b-neutro"><i class="ph ' + iconoTipoStock[m.tipo] + '"></i>' + esc(TIPOS_STOCK[m.tipo]) + '</span></td><td>' + esc(nombreDe(p)) + '</td><td class="num">' + fCant(m.cant) + ' ' + esc(p ? p.unidad || 'un' : '') + '</td><td>' + esc(nombreDe(deposito(m.desde))) + '</td><td>' + esc(nombreDe(deposito(m.hacia))) + '</td><td>' + esc(m.motivo) + '<span class="sec">' + esc(nombreDe(operador(m.operadorId))) + '</span></td><td>' + (anul ? '<span class="badge b-neutro">Anulado</span>' : m.movId && !m.ordenId ? '<button type="button" class="btn sm ghost" data-accion="anular-mov-stock" data-id="' + esc(m.movId) + '">Anular</button>' : '') + '</td></tr>'; }).join('');
    return '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-dep-q" placeholder="Artículo o motivo" value="' + esc(f.q) + '" aria-label="Buscar movimientos"></label><select class="input" id="f-dep-tipo" aria-label="Tipo de movimiento">' + opciones([['', 'Todos los tipos']].concat(Object.keys(TIPOS_STOCK).map((k) => [k, TIPOS_STOCK[k]])).concat([['anulados', 'Anulados']]), f.tipo) + '</select></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Fecha</th><th>Tipo</th><th>Artículo</th><th class="num">Cantidad</th><th>Sale de</th><th>Entra a</th><th>Motivo</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-arrows-left-right"></i><p>No hay movimientos con estos filtros.</p></div></td></tr>') + '</tbody></table>' + (todos.length > f.limite ? '<div class="mas"><button type="button" class="btn" data-accion="mas-movs-stock">Mostrar 80 más (quedan ' + (todos.length - f.limite) + ')</button></div>' : '') + '</div>';
  }
  function dpStock(q, mat) {
    const f = UI.depositos;
    const tarjetas = DB.depositos.filter((d) => !!d.materia === mat).map((d) => {
      const arts = DB.productos.filter((p) => !esCombo(p) && !!d.materia === esMateria(p));
      const n = arts.filter((p) => stockFisico(p.id, d.id) > 0).length, uds = arts.reduce((s, p) => s + stockFisico(p.id, d.id), 0);
      return '<button type="button" class="caja-card" data-deposito="' + esc(d.id) + '"><div class="t"><span class="marca ico md ' + (d.noDisponible ? 't-ambar' : d.materia ? 't-pizarra' : 't-verde') + '"><i class="ph-duotone ' + (d.materia ? 'ph-stack' : d.noDisponible ? 'ph-magnifying-glass' : 'ph-warehouse') + '"></i></span>' + esc(d.nombre) + '</div><div class="saldo">' + fCant(Math.round(uds)) + '</div><div class="fuente">' + (d.materia ? 'unidades de materia prima' : 'unidades en el depósito') + ' · ' + plural(n, 'artículo', 'artículos') + '</div><div class="estado"><span class="badge ' + (d.noDisponible ? 'b-warn' : 'b-neutro') + '">' + (d.noDisponible ? 'No disponible para vender' : esc(d.tipo)) + '</span> <span class="badge b-neutro">' + fmtM(valorizado(arts, null, d.id)) + '</span></div></button>';
    }).join('');
    const deps = DB.depositos.filter((d) => !!d.materia === mat);
    const ref = mat ? (depMateria() || {}).id : 'principal';
    const arts = mat ? materias() : terminados().filter((p) => !esCombo(p));
    const pasillos = Array.from(new Set(arts.map((p) => p.ubic && p.ubic[ref] && p.ubic[ref].pasillo).filter(Boolean))).sort();
    const lista = arts.filter((p) => (!q || coincide(p.nombre + ' ' + p.sku, q)) && (!f.pasillo || (f.pasillo === 'alerta' ? bajoMinimo(p) : p.ubic && p.ubic[ref] && p.ubic[ref].pasillo === f.pasillo)));
    const filas = lista.map((p) => '<tr class="clic" data-producto="' + esc(p.id) + '"><td>' + esc(p.nombre) + '<span class="sec mono">' + esc(p.sku) + '</span></td><td class="mono">' + esc(ubicTxt(p.ubic && p.ubic[ref])) + '</td>' + deps.map((d) => { const n = stockFisico(p.id, d.id); return '<td class="num' + (n ? '' : ' cero') + '">' + fCant(n) + '</td>'; }).join('') + '<td class="num' + (stockReservado(p.id) ? '' : ' cero') + '">' + fCant(stockReservado(p.id)) + '</td><td class="num"><b>' + fCant(stockDe(p.id)) + '</b>' + (mat ? ' ' + esc(p.unidad) : '') + '</td><td>' + (bajoMinimo(p) ? '<span class="badge b-bad">Bajo mínimo</span>' : '<span class="badge b-ok">OK</span>') + '</td></tr>').join('');
    return '<div class="cajas-grid chicas">' + tarjetas + '</div>' +
      '<div class="toolbar"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-dep-q" placeholder="Nombre o código" value="' + esc(f.q) + '" aria-label="Buscar artículos"></label><select class="input" id="f-dep-pasillo" aria-label="Ubicación"><option value="">Todas las ubicaciones</option>' + pasillos.map((x) => '<option value="' + esc(x) + '"' + (f.pasillo === x ? ' selected' : '') + '>Pasillo ' + esc(x) + '</option>').join('') + '<option value="alerta"' + (f.pasillo === 'alerta' ? ' selected' : '') + '>Solo bajo mínimo</option></select></div></div>' +
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>' + (mat ? 'Material' : 'Producto') + '</th><th title="Pasillo, estante y nivel en ' + esc(nombreDe(deposito(ref))) + '">Ubicación</th>' + deps.map((d) => '<th class="num" title="Stock físico en ' + esc(d.nombre) + '">' + esc(depCorto(d)) + '</th>').join('') + '<th class="num" title="Vendido y todavía sin remito">Reservado</th><th class="num" title="Físico menos reservado. No cuenta A revisión">Disponible</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="' + (5 + deps.length) + '"><div class="vacio-estado"><i class="ph ph-package"></i><p>No hay artículos con estos filtros.</p></div></td></tr>') + '</tbody></table></div>';
  }
  function vDepositos() {
    const f = UI.depositos;
    const q = sinAcentos(f.q.trim());
    const tabs = [['remitir', 'Para remitir', ventasARemitir().length], ['remitos', 'Remitos', DB.remitos.filter((r) => EN_CURSO.includes(r.estado)).length], ['rendicion', 'Rendición', null], ['terminados', 'Stock', terminados().filter((p) => !esCombo(p)).length], ['materia', 'Materia prima', materias().length], ['movimientos', 'Movimientos', null]];
    if (!tabs.some((t) => t[0] === f.tab)) f.tab = 'remitir';
    const cuerpo = f.tab === 'remitir' ? dpRemitir(q) : f.tab === 'remitos' ? dpRemitos(q) : f.tab === 'rendicion' ? dpRendicion() : f.tab === 'movimientos' ? dpMovimientos(q) : dpStock(q, f.tab === 'materia');
    return '' +
      '<div class="encabezado"><div><h1>Depósito</h1><p>La venta reserva el stock y el remito lo descuenta. Remitos, rendición y stock en un solo lugar</p></div><div class="acciones"><button type="button" class="btn" data-accion="nuevo-ingreso"><i class="ph ph-arrow-down"></i>Ingreso de proveedor</button><button type="button" class="btn" data-accion="mov-stock" data-tipo="ajuste"><i class="ph ph-arrows-down-up"></i>Mover stock</button><button type="button" class="btn" data-accion="mov-stock" data-tipo="transferencia"><i class="ph ph-arrows-left-right"></i>Transferir</button><button type="button" class="btn primary" data-accion="nuevo-deposito"><i class="ph ph-plus"></i>Nuevo depósito</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="depositos">' + tabs.map(([id, n, c]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-depositos" data-tab="' + id + '">' + n + (c == null ? '' : ' <span class="cuenta">' + c + '</span>') + '</button>').join('') + '</div>' +
      cuerpo;
  }
  function abrirRemito(id) {
    const r = remito(id); if (!r) return;
    const v = r.ventaId ? venta(r.ventaId) : null, sale = r.tipo === 'venta';
    const items = itemsRemito(r).map((l) => { const p = producto(l.productoId); return '<tr class="clic" data-producto="' + esc(l.productoId) + '"><td>' + esc(nombreDe(p, l.nombre)) + (p && esCombo(p) ? '<span class="sec">Combo: salen sus componentes</span>' : '') + '</td><td class="num">' + fCant(l.cant) + ' ' + esc(p ? p.unidad || 'un' : '') + '</td></tr>'; }).join('');
    const acciones = [];
    const boton = (estado, txt, ic, pri) => '<button type="button" class="btn' + (pri ? ' primary' : '') + '" data-accion="remito-estado" data-id="' + esc(r.id) + '" data-estado="' + estado + '"><i class="ph ' + ic + '"></i>' + txt + '</button>';
    const pasos = PASOS_REMITO[r.tipo], sig = pasos[pasos.indexOf(r.estado) + 1];
    if (sig) acciones.push(boton(sig, sale ? 'Marcar ' + sig.toLowerCase() : 'Marcar recibido', 'ph-check', true));
    if (sale && (r.estado === 'En camino' || r.estado === 'Entregado')) acciones.push(boton('Devuelto', 'Volvió la mercadería', 'ph-arrow-u-up-left'));
    if (r.estado !== 'Anulado' && r.estado !== 'Devuelto' && !(sale && r.estado === 'Entregado')) acciones.push(boton('Anulado', 'Anular remito', 'ph-x-circle'));
    const hist = [['ph-file-text', 'Remito generado', fFechaHora(r.fecha) + ' · ' + nombreDe(operador(r.operadorId), 'Sistema')]].concat((r.historial || []).map((h) => ['ph-check', h.estado === 'Entregado' && !sale ? 'Recibido' : h.estado, fFechaHora(h.fecha) + ' · ' + nombreDe(operador(h.operadorId), 'Sistema')]));
    abrirDrawer('' +
      '<div class="d-h"><div><h2>Remito ' + esc(r.nro) + '</h2><div class="sub">' + TIPOS_REMITO[r.tipo] + ' · ' + fFechaHora(r.fecha) + '</div><div style="margin-top:8px"><span class="badge ' + badgeRemito(r.estado) + '">' + esc(estadoRemitoTxt(r)) + '</span></div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        (acciones.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' : '') +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv">' + (v ? '<dt>Venta</dt><dd><a href="#" data-venta="' + v.id + '">Venta ' + v.id + '</a> · ' + esc(nombreDe(cliente(v.clienteId))) + '</dd><dt>Envío</dt><dd>' + esc(v.envio) + '</dd>' : '<dt>Proveedor</dt><dd><a href="#" data-proveedor="' + esc(r.proveedorId) + '">' + esc(nombreDe(proveedor(r.proveedorId))) + '</a></dd>') +
          '<dt>' + (sale ? 'Sale de' : 'Entra a') + '</dt><dd>' + esc(nombreDe(deposito(r.depositoId))) + '</dd>' + (r.devueltoA ? '<dt>Volvió a</dt><dd>' + esc(nombreDe(deposito(r.devueltoA))) + '</dd>' : '') + (r.grupo ? '<dt>Hoja de ruta</dt><dd class="mono">' + esc(r.grupo) + '</dd>' : '') + '</dl></div>' +
        '<div class="d-sec"><h3>' + (sale ? 'Lo que sale' : 'Lo que entra') + '</h3><p class="nota">' + (r.estado === 'Anulado' ? 'Remito anulado: no movió stock.' : sale ? (r.estado === 'Devuelto' ? 'Salió y volvió: está en ' + esc(nombreDe(deposito(r.devueltoA))) + '.' : 'Descontado del stock físico de ' + esc(nombreDe(deposito(r.depositoId))) + '.') : r.estado === 'Entregado' ? 'Sumado al stock de ' + esc(nombreDe(deposito(r.depositoId))) + '.' : 'Suma al stock cuando se recibe.') + '</p><div class="tabla-wrap"><table><thead><tr><th>Artículo</th><th class="num">Cantidad</th></tr></thead><tbody>' + (items || '<tr><td colspan="2">Sin artículos</td></tr>') + '</tbody></table></div></div>' +
        '<div class="d-sec"><h3>Recorrido</h3><ul class="linea-tiempo">' + hist.map(([ic, t, s]) => '<li><span class="p"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></li>').join('') + '</ul></div>' +
      '</div>');
  }
  function abrirDeposito(id) {
    const d = deposito(id); if (!d) return;
    const arts = DB.productos.filter((p) => !esCombo(p) && !!d.materia === esMateria(p) && stockFisico(p.id, d.id) > 0).sort((a, b) => stockFisico(b.id, d.id) - stockFisico(a.id, d.id));
    const filas = arts.map((p) => '<tr class="clic" data-producto="' + esc(p.id) + '"><td>' + esc(p.nombre) + '<span class="sec mono">' + esc(p.sku) + '</span></td><td class="mono">' + esc(ubicTxt(p.ubic && p.ubic[d.id])) + '</td><td class="num">' + fCant(stockFisico(p.id, d.id)) + ' ' + esc(p.unidad || 'un') + '</td><td class="num">' + fmt0(stockFisico(p.id, d.id) * costoDe(p)) + '</td></tr>').join('');
    const cn = d.canal ? canal(d.canal) : DB.canales.find((c) => c.deposito === d.id);
    abrirDrawer('' +
      '<div class="d-h"><div><h2>' + esc(d.nombre) + '</h2><div class="sub">' + esc(d.tipo) + (cn ? ' · descuenta ' + esc(cn.nombre) : '') + '</div>' + (d.noDisponible ? '<div style="margin-top:8px"><span class="badge b-warn">No disponible para vender</span></div>' : '') + '</div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-accion="mov-stock" data-tipo="transferencia" data-desde="' + esc(d.id) + '"><i class="ph ph-arrows-left-right"></i>Transferir desde acá</button><button type="button" class="btn" data-accion="editar-deposito" data-id="' + esc(d.id) + '"><i class="ph ph-pencil-simple"></i>Editar</button></div>' +
        '<div class="kpis en-3">' + kpi('ph-package', 'Artículos', String(arts.length), 'Con stock') + kpi('ph-stack', 'Unidades', fCant(Math.round(arts.reduce((s, p) => s + stockFisico(p.id, d.id), 0))), d.materia ? 'De materia prima' : 'De productos') + kpi('ph-currency-circle-dollar', 'Valorizado', fmtM(valorizado(arts, null, d.id)), 'Al costo') + '</div>' +
        '<div class="d-sec"><h3>Stock en este depósito</h3><div class="tabla-wrap"><table><thead><tr><th>Artículo</th><th>Ubicación</th><th class="num">Stock</th><th class="num">Al costo</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Sin stock</td></tr>') + '</tbody></table></div></div>' +
      '</div>');
  }

  /* ================= CONFIGURACIÓN: canales, facturación y maestros ================= */
  const TABS_CONFIG = [['canales', 'Canales y tiendas'], ['facturacion', 'Facturación'], ['vendedores', 'Vendedores'], ['operadores', 'Operadores'], ['listas', 'Listas de precios']];
  function cfgCanales() {
    const vs = ventasDelPeriodo(), p = periodo();
    const filas = DB.canales.map((c) => {
      const r = resumen(vs.filter((v) => v.canal === c.id));
      return '<tr class="clic" data-canal="' + esc(c.id) + '"><td>' + chipCanal(c.id) + '</td><td><span class="badge ' + (c.conexion === 'vivo' ? 'b-ok' : c.conexion === 'asistida' ? 'b-info' : 'b-neutro') + '">' + CONEXION[c.conexion] + '</span></td><td class="mono">' + esc(c.pv) + '</td><td>' + esc(nombreDe(caja(c.caja), 'Según el cobro')) + '</td><td>' + esc(nombreDe(deposito(c.deposito))) + '</td><td>' + (c.tienda ? esc(reglaTxt(c)) : '') + '</td><td class="num">' + (c.comision ? String(c.comision).replace('.', ',') + '%' : '') + '</td><td class="num">' + r.n + '</td><td class="num">' + fmt0(r.vendido) + '</td></tr>';
    }).join('');
    return '<div class="tabla-wrap"><table><thead><tr><th>Canal</th><th>Cómo entra</th><th>Punto de venta</th><th>Cobra en</th><th>Descuenta de</th><th>Publica</th><th class="num">Comisión estimada</th><th class="num" title="' + esc(p.texto) + '">Ventas</th><th class="num" title="' + esc(p.texto) + '">Vendido</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="nota" style="margin-top:12px">Una tienda nueva aparece sola en el menú, en los filtros y en los informes. Renombrar un canal no desengancha sus ventas.</p>';
  }
  function cfgFacturacion() {
    const p = periodo();
    const pvs = DB.puntosVenta.map((pv) => {
      const usan = DB.canales.filter((c) => c.pv === pv.nro), otros = DB.canales.filter((c) => c.pv !== pv.nro);
      return '<tr><td class="mono">' + esc(pv.nro) + '</td><td>' + esc(pv.nombre) + '</td><td>' + (usan.map((c) => chipCanal(c.id)).join(' ') || '<span class="badge b-neutro">Sin asignar</span>') + '</td><td class="num">' + DB.ventas.filter((v) => v.version === 'Oficial' && v.comp.pv === pv.nro).length + '</td><td><select class="input sel-pv" data-pv="' + esc(pv.nro) + '" aria-label="Asignar un canal al punto de venta ' + esc(pv.nro) + '">' + opciones([['', 'Asignar un canal']].concat(otros.map((c) => [c.id, c.nombre]))) + '</select></td></tr>';
    }).join('');
    const rec = DB.arca.recibidos.slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1).map((x) => '<tr><td>' + fFecha(x.fecha) + '</td><td class="mono">' + esc(x.tipoComp + ' ' + x.pv + '-' + x.nro) + '</td><td class="mono">' + esc(x.cuit) + '</td><td>' + esc(nombreDe(proveedor(x.proveedorId), x.razon)) + (x.proveedorId ? '' : '<span class="sec">No está en Proveedores</span>') + '</td><td class="num">' + fmt(x.monto) + '</td><td><span class="badge ' + ({ 'Para revisar': 'b-warn', Cargada: 'b-ok', Duplicada: 'b-neutro' }[x.estado]) + '">' + esc(x.estado) + '</span>' + (x.estado === 'Duplicada' ? '<span class="sec">Ya estaba cargada: no se carga dos veces</span>' : '') + '</td><td>' + (x.estado === 'Para revisar' ? '<button type="button" class="btn sm" data-accion="revisar-arca" data-id="' + esc(x.id) + '">Revisar</button>' : x.facturaId ? '<button type="button" class="btn sm ghost" data-proveedor="' + esc(x.proveedorId) + '">Ver</button>' : '') + '</td></tr>').join('');
    const cmp = comparacionArca(p);
    const tot = (f) => r2(cmp.reduce((s, x) => s + f(x), 0));
    const emitidos = cmp.map((x) => '<tr><td class="mono">' + esc(x.pv.nro) + '</td><td>' + esc(x.pv.nombre) + '</td><td class="num">' + x.sistema.n + '</td><td class="num">' + fmt(x.sistema.total) + '</td><td class="num">' + x.arca.n + '</td><td class="num">' + fmt(x.arca.total) + '</td><td class="num">' + fmt(x.diferencia) + '</td><td>' + (x.revisar.length ? '<span class="badge b-warn">' + x.revisar.length + ' para revisar</span>' : '<span class="badge b-ok">Coincide</span>') + '</td></tr>').join('');
    const revisar = DB.arca.revisar.map((x) => { const v = venta(x.ventaId); return v ? '<li><span class="badge b-warn cuadrado"><i class="ph ph-warning"></i></span><div><div class="t">' + esc(compTxt(v)) + ' · ' + fmt(v.total) + '</div><div class="s">' + esc(x.motivo) + '</div></div><button type="button" class="btn sm" data-venta="' + v.id + '">Ver</button><button type="button" class="btn sm ghost" data-accion="arca-revisada" data-id="' + v.id + '">Ya la revisé</button></li>' : ''; }).join('');
    return '<h2 class="grupo-t">Puntos de venta dados de alta en ARCA</h2>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Punto de venta</th><th>Nombre</th><th>Canales que facturan por acá</th><th class="num">Comprobantes</th><th>Reasignar</th></tr></thead><tbody>' + pvs + '</tbody></table></div>' +
      '<h2 class="grupo-t">Comprobantes recibidos de proveedores</h2>' +
      '<p class="nota">' + (DB.arca.ultimaConsulta ? 'Última consulta: ' + fFechaHora(DB.arca.ultimaConsulta) + '. ' : '') + 'Lo que ARCA tiene y el sistema no queda para revisar: se le pone proveedor y tipo de gasto, y se carga.</p>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Comprobante</th><th>CUIT</th><th>Razón social</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody>' + (rec || '<tr><td colspan="7"><div class="vacio-estado"><i class="ph ph-cloud-arrow-down"></i><p>Todavía no se trajo nada de ARCA.</p></div></td></tr>') + '</tbody></table></div>' +
      '<h2 class="grupo-t">Comprobantes emitidos: ARCA contra el sistema</h2>' +
      '<div class="toolbar"><div class="filtros">' + selectorFechas() + '</div></div>' +
      '<div class="tabla-wrap"><table><thead><tr><th>Punto de venta</th><th>Nombre</th><th class="num">En el sistema</th><th class="num">Total del sistema</th><th class="num">En ARCA</th><th class="num">Total en ARCA</th><th class="num">Diferencia</th><th></th></tr></thead><tbody>' + emitidos + '</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">' + tot((x) => x.sistema.n) + '</td><td class="num">' + fmt(tot((x) => x.sistema.total)) + '</td><td class="num">' + tot((x) => x.arca.n) + '</td><td class="num">' + fmt(tot((x) => x.arca.total)) + '</td><td class="num" id="arca-diferencia">' + fmt(tot((x) => x.diferencia)) + '</td><td></td></tr></tfoot></table></div>' +
      (revisar ? '<div class="card" style="margin-top:12px"><div class="card-h"><h2>Para revisar</h2><span class="sub">Los totales coinciden, pero ARCA informa algo distinto en el comprobante</span></div><div class="card-b"><ul class="alertas">' + revisar + '</ul></div></div>' : '') +
      '<p class="nota" style="margin-top:12px">En la maqueta la consulta a ARCA es simulada.</p>';
  }
  function cfgMaestro(col) {
    const fila = (x, celdas) => '<tr class="clic' + (x.baja ? ' tachado' : '') + '" data-maestro="' + col + '|' + esc(x.id) + '"><td>' + esc(x.nombre) + '</td>' + celdas + '</tr>';
    const estado = (x) => '<td>' + (x.baja ? '<span class="badge b-neutro">Dado de baja</span>' : '<span class="badge b-ok">Activo</span>') + '</td>';
    if (col === 'vendedores') return '<div class="tabla-wrap"><table><thead><tr><th>Vendedor</th><th class="num">Clientes asignados</th><th class="num">Ventas</th><th class="num">Vendido</th><th>Estado</th></tr></thead><tbody>' + DB.vendedores.map((x) => { const r = resumen(DB.ventas.filter((v) => v.vendedorId === x.id)); return fila(x, '<td class="num">' + DB.clientes.filter((c) => c.vendedorId === x.id).length + '</td><td class="num">' + r.n + '</td><td class="num">' + fmt0(r.vendido) + '</td>' + estado(x)); }).join('') + '</tbody></table></div><p class="nota" style="margin-top:12px">El vendedor es quien vende: va en el cliente y en cada venta de Mostrador, Mayorista y Neutral.</p>';
    if (col === 'operadores') return '<div class="tabla-wrap"><table><thead><tr><th>Operador</th><th>Rol</th><th class="num">Ventas cargadas</th><th>Estado</th></tr></thead><tbody>' + DB.operadores.map((x) => x.id === 'sis' ? '<tr><td>' + esc(x.nombre) + '</td><td>Lo que entra solo</td><td class="num">' + DB.ventas.filter((v) => v.operadorId === 'sis').length + '</td><td><span class="badge b-ok">Activo</span></td></tr>' : fila(x, '<td>' + esc(x.rol) + '</td><td class="num">' + DB.ventas.filter((v) => v.operadorId === x.id).length + '</td>' + estado(x))).join('') + '</tbody></table></div><p class="nota" style="margin-top:12px">El operador es el usuario que cargó. En la maqueta es solo el listado, sin ingreso con clave.</p>';
    const ej = terminados()[0];
    return '<div class="tabla-wrap"><table><thead><tr><th>Lista</th><th class="num">Clientes</th><th class="num">Productos con precio</th><th class="num">' + esc(ej ? ej.nombre : 'Ejemplo') + '</th></tr></thead><tbody>' + DB.listas.map((x) => fila(x, '<td class="num">' + DB.clientes.filter((c) => c.lista === x.id).length + '</td><td class="num">' + terminados().filter((p) => p.precios[x.id] > 0).length + '</td><td class="num">' + (ej ? fmt0(precioDe(ej, x.id)) : '') + '</td>')).join('') + '</tbody></table></div><p class="nota" style="margin-top:12px">Cada cliente tiene su lista. Los precios de cada lista se cargan en el producto o con el cambio masivo.</p>';
  }
  function vConfig() {
    const f = UI.config;
    if (!TABS_CONFIG.some((t) => t[0] === f.tab)) f.tab = 'canales';
    const boton = { canales: ['nuevo-canal', 'Agregar tienda', 'ph-plus', ''], facturacion: ['traer-arca', 'Traer comprobantes de ARCA', 'ph-cloud-arrow-down', ''], vendedores: ['nuevo-maestro', 'Nuevo vendedor', 'ph-plus', 'vendedores'], operadores: ['nuevo-maestro', 'Nuevo operador', 'ph-plus', 'operadores'], listas: ['nuevo-maestro', 'Nueva lista', 'ph-plus', 'listas'] }[f.tab];
    const bajada = { canales: 'Cómo entra cada canal, por dónde factura, dónde cobra y de qué depósito descuenta', facturacion: 'Puntos de venta, comprobantes recibidos y control contra ARCA', vendedores: 'Quién vende', operadores: 'Quién carga y con qué rol', listas: 'Las listas de precios de la empresa' }[f.tab];
    return '' +
      '<div class="encabezado"><div><h1>Configuración</h1><p>' + bajada + '</p></div><div class="acciones"><button type="button" class="btn primary" data-accion="' + boton[0] + '"' + (boton[3] ? ' data-col="' + boton[3] + '"' : '') + '><i class="ph ' + boton[2] + '"></i>' + boton[1] + '</button></div></div>' +
      '<div class="tabs" role="tablist" data-key="config">' + TABS_CONFIG.map(([id, n]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-config" data-tab="' + id + '">' + n + '</button>').join('') + '</div>' +
      (f.tab === 'canales' ? cfgCanales() : f.tab === 'facturacion' ? cfgFacturacion() : cfgMaestro(f.tab));
  }

  /* ================= PRODUCCIÓN ================= */
  const faltaMateria = (o) => materialesOrden(o).some((m) => m.falta > 0);
  function vProduccion() {
    const p = periodo(), f = UI.produccion;
    const de = (e) => DB.ordenes.filter((o) => o.estado === e);
    const pend = de('Pendiente'), proc = de('En proceso'), term = de('Terminada').filter((o) => enPeriodo(o.terminada, p));
    const uds = (os) => os.reduce((s, o) => s + o.cant, 0);
    const mpBajo = materias().filter(bajoMinimo);
    const tarjeta = (o) => '<button type="button" class="orden-card" data-orden="' + esc(o.id) + '"><span class="t">Orden ' + o.nro + ' · ' + esc(nombreDe(operador(o.responsableId))) + '</span><span class="p">' + esc(nombreDe(producto(o.productoId))) + '</span><span class="s">' + plural(o.cant, 'unidad', 'unidades') + ' · ' + (o.estado === 'Terminada' ? 'terminada el ' + fFecha(o.terminada) : 'para el ' + fFecha(o.prevista)) + '</span>' + (o.estado === 'Terminada' ? '' : '<span><span class="badge ' + (faltaMateria(o) ? 'b-bad' : 'b-ok') + '">' + (faltaMateria(o) ? 'Falta materia prima' : 'Materia prima lista') + '</span></span>') + '</button>';
    const columna = (nombre, os, vacio) => '<section class="col"><h3>' + nombre + ' <span class="cuenta">' + os.length + '</span></h3>' + (os.map(tarjeta).join('') || '<div class="vacio">' + vacio + '</div>') + '</section>';
    let cuerpo;
    if (f.tab === 'lista') {
      const lista = DB.ordenes.filter((o) => !f.estado || o.estado === f.estado).sort((a, b) => b.nro - a.nro);
      const filas = lista.map((o) => '<tr class="clic' + (o.estado === 'Anulada' ? ' tachado' : '') + '" data-orden="' + esc(o.id) + '"><td class="num">' + o.nro + '</td><td>' + esc(nombreDe(producto(o.productoId))) + '</td><td class="num">' + o.cant + '</td><td>' + esc(nombreDe(operador(o.responsableId))) + '</td><td>' + fFecha(o.fecha) + '</td><td>' + fFecha(o.prevista) + '</td><td>' + (o.terminada ? fFecha(o.terminada) : '') + '</td><td><span class="badge ' + badgeOrden(o.estado) + '">' + esc(o.estado) + '</span></td></tr>').join('');
      cuerpo = '<div class="toolbar"><div class="filtros"><select class="input" id="f-ord-estado" aria-label="Estado">' + opciones([['', 'Todos los estados']].concat(ESTADOS_ORDEN.map((e) => [e, e])), f.estado) + '</select></div></div>' +
        '<div class="tabla-wrap"><table><thead><tr><th>Orden</th><th>Producto</th><th class="num">Cantidad</th><th>Responsable</th><th>Alta</th><th>Prevista</th><th>Terminada</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="8"><div class="vacio-estado"><i class="ph ph-factory"></i><p>No hay órdenes con este estado.</p></div></td></tr>') + '</tbody></table></div>';
    } else cuerpo = '<div class="tablero">' + columna('Pendiente', pend, 'Nada pendiente') + columna('En proceso', proc, 'Nada en proceso') + columna('Terminada', term, 'Ninguna en el período') + '</div><p class="nota" style="margin-top:12px">Al terminar una orden, el producto entra a ' + esc(nombreDe(depFabrica())) + ' y la materia prima se descuenta sola.</p>';
    return '' +
      '<div class="encabezado"><div><h1>Producción</h1><p>Órdenes de fabricación: qué se está haciendo, qué se terminó y qué materia prima falta</p></div><div class="acciones">' + selectorFechas() + '<button type="button" class="btn primary" data-accion="nueva-orden"><i class="ph ph-plus"></i>Nueva orden</button></div></div>' +
      '<div class="kpis">' + kpi('ph-gear-six', 'En proceso', String(proc.length), plural(uds(proc), 'unidad', 'unidades'), true) + kpi('ph-hourglass-medium', 'Pendientes', String(pend.length), plural(uds(pend), 'unidad', 'unidades')) + kpi('ph-check-circle', 'Terminadas en el período', String(term.length), plural(uds(term), 'unidad', 'unidades') + ' · ' + p.fechas) + kpi('ph-warning', 'Materia prima bajo el mínimo', String(mpBajo.length), mpBajo.length ? mpBajo.slice(0, 2).map((m) => m.nombre).join(', ') : 'Todo sobre el mínimo', !mpBajo.length) + '</div>' +
      '<div class="tabs" role="tablist" data-key="produccion">' + [['tablero', 'Tablero'], ['lista', 'Lista']].map(([id, n]) => '<button type="button" role="tab" aria-selected="' + (f.tab === id) + '" data-accion="tab-produccion" data-tab="' + id + '">' + n + (id === 'lista' ? ' <span class="cuenta">' + DB.ordenes.length + '</span>' : '') + '</button>').join('') + '</div>' +
      cuerpo;
  }
  function abrirOrden(id) {
    const o = orden(id); if (!o) return;
    const p = producto(o.productoId), df = depFabrica(), principal = deposito('principal');
    const term = o.estado === 'Terminada';
    const boton = (estado, txt, ic, pri) => '<button type="button" class="btn' + (pri ? ' primary' : '') + '" data-accion="orden-estado" data-id="' + esc(o.id) + '" data-estado="' + estado + '"><i class="ph ' + ic + '"></i>' + txt + '</button>';
    const acciones = [];
    if (o.estado === 'Pendiente') acciones.push(boton('En proceso', 'Empezar', 'ph-play', true));
    if (o.estado === 'Pendiente' || o.estado === 'En proceso') acciones.push(boton('Terminada', 'Terminar', 'ph-check', o.estado === 'En proceso'));
    const enFabrica = term && df ? stockDe(p.id, df.id) : 0;
    if (term && principal && df && df.id !== principal.id && enFabrica > 0) acciones.push('<button type="button" class="btn primary" data-accion="mov-stock" data-tipo="transferencia" data-id="' + esc(p.id) + '" data-desde="' + esc(df.id) + '" data-hacia="' + esc(principal.id) + '" data-cant="' + Math.min(o.cant, enFabrica) + '"><i class="ph ph-arrows-left-right"></i>Pasar a ' + esc(principal.nombre) + '</button>');
    if (o.estado !== 'Anulada') acciones.push(boton('Anulada', 'Anular', 'ph-x-circle'));
    const mats = term || o.estado === 'Anulada'
      ? (p.materiales || []).map((m) => { const x = producto(m.productoId); return '<tr><td>' + esc(nombreDe(x)) + '</td><td class="num">' + fCant(r2(m.cant * o.cant)) + ' ' + esc(x ? x.unidad : '') + '</td></tr>'; }).join('')
      : materialesOrden(o).map((m) => { const x = producto(m.productoId); return '<tr class="clic" data-producto="' + esc(m.productoId) + '"><td>' + esc(nombreDe(x)) + '</td><td class="num">' + fCant(m.necesita) + ' ' + esc(x ? x.unidad : '') + '</td><td class="num">' + fCant(m.hay) + '</td><td>' + (m.falta ? '<span class="badge b-bad">Faltan ' + fCant(m.falta) + '</span>' : '<span class="badge b-ok">Alcanza</span>') + '</td></tr>'; }).join('');
    const pasos = [['ph-file-plus', 'Orden creada', fFechaHora(o.fecha) + ' · ' + nombreDe(operador(o.operadorId)), true]];
    if (o.inicio) pasos.push(['ph-play', 'En proceso', fFechaHora(o.inicio), true]);
    if (o.terminada) pasos.push(['ph-check', 'Terminada: ' + plural(o.cant, 'unidad entró', 'unidades entraron') + ' a ' + nombreDe(df), fFechaHora(o.terminada) + ' · se descontó la materia prima', true]);
    else if (o.estado !== 'Anulada') pasos.push(['ph-hourglass-medium', 'Prevista para el ' + fFecha(o.prevista), 'Al terminar suma el producto y descuenta la materia prima', false]);
    if (o.anulada) pasos.push(['ph-x-circle', 'Anulada', fFechaHora(o.anulada) + (o.terminada ? ' · el stock volvió a como estaba' : ''), true]);
    abrirDrawer('' +
      '<div class="d-h"><div><h2>Orden de fabricación ' + o.nro + '</h2><div class="sub">' + esc(nombreDe(p)) + '</div><div style="margin-top:8px"><span class="badge ' + badgeOrden(o.estado) + '">' + esc(o.estado) + '</span></div></div><button type="button" class="btn icon ghost cerrar" data-accion="cerrar-drawer" aria-label="Cerrar"><i class="ph ph-x"></i></button></div>' +
      '<div class="d-b">' +
        (acciones.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + acciones.join('') + '</div>' : '') +
        '<div class="d-sec"><h3>Datos</h3><dl class="kv"><dt>Producto</dt><dd><a href="#" data-producto="' + esc(p.id) + '">' + esc(p.nombre) + '</a></dd><dt>Cantidad</dt><dd>' + plural(o.cant, 'unidad', 'unidades') + '</dd><dt>Responsable</dt><dd>' + esc(nombreDe(operador(o.responsableId))) + '</dd><dt>Fecha prevista</dt><dd>' + fFecha(o.prevista) + '</dd>' + (term ? '<dt>Queda en ' + esc(nombreDe(df)) + '</dt><dd>' + fCant(enFabrica) + ' disponibles</dd>' : '') + '</dl></div>' +
        '<div class="d-sec"><h3>' + (term ? 'Materia prima que consumió' : 'Materia prima que consume') + '</h3><div class="tabla-wrap"><table><thead><tr><th>Material</th><th class="num">Necesita</th>' + (term || o.estado === 'Anulada' ? '' : '<th class="num">Hay</th><th></th>') + '</tr></thead><tbody>' + (mats || '<tr><td colspan="4">Sin lista de materiales</td></tr>') + '</tbody></table></div></div>' +
        '<div class="d-sec"><h3>Recorrido</h3><ul class="linea-tiempo">' + pasos.map(([ic, t, s, ok]) => '<li><span class="p' + (ok ? '' : ' pend') + '"><i class="ph ' + ic + '"></i></span><div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div></li>').join('') + '</ul></div>' +
      '</div>');
  }

  /* ================= INFORMES ================= */
  /* Todos los informes salen de las mismas funciones que usan las pantallas. Un solo motor los dibuja:
     cada informe es una definición (filtros, modos y un cálculo que devuelve indicadores, tablas y cruces). */

  /* ---------- datos compartidos por los informes ---------- */
  const sumaPor = (arr, fn) => r2(arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0));
  const pctDe = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const fPct = (n) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  /* Versión para los filtros de gestión. Una seña va con lo Oficial (se factura al completarse): Oficial + Neutral = Todas. */
  const versionDe = (v) => v.version === 'Neutral' ? 'Neutral' : 'Oficial';
  const pasaVersion = (v, ver) => !ver || ver === 'todas' || versionDe(v) === (ver === 'neutral' ? 'Neutral' : 'Oficial');
  /* Las ventas (sin cotizaciones) con los filtros de gestión. Con período, por la fecha de la venta, igual que el Panel. */
  const ventasFiltradas = (f, p) => DB.ventas.filter((v) => esVenta(v) && (!p || enPeriodo(v.fecha, p)) && pasaVersion(v, f.version) && (!f.canal || v.canal === f.canal) && (!f.vendedor || v.vendedorId === f.vendedor) && (!f.operador || v.operadorId === f.operador) && (!f.lista || v.lista === f.lista));
  const porDiaDe = (vs) => { const m = {}; vs.forEach((v) => { const k = toISODate(D(v.fecha)); (m[k] || (m[k] = [])).push(v); }); return m; };
  /* Los renglones vendidos, cada uno con su parte de la venta. Bonificaciones y recargos de la venta se reparten por importe:
     la suma de los importes da la venta sin percepciones y la de los netos da la "venta sin IVA" del bloque Costo y utilidad. */
  function renglonesVenta(v) {
    if (!esVenta(v) || anulada(v) || !v.items.length) return [];
    const u = utilidadVenta(v), base = r2(v.total - (v.imp ? v.imp.tributos : 0));
    const sub = v.items.reduce((s, l) => s + importeLinea(l), 0);
    let restoI = base, restoN = u.neto;
    return v.items.map((l, i) => {
      const ult = i === v.items.length - 1, peso = sub ? importeLinea(l) / sub : 1 / v.items.length;
      const importe = ult ? restoI : r2(base * peso), neto = ult ? restoN : r2(u.neto * peso);
      restoI = r2(restoI - importe); restoN = r2(restoN - neto);
      return { v, productoId: l.productoId, nombre: l.nombre, cant: l.cant, importe, neto, costo: r2((l.costo || 0) * l.cant) };
    });
  }
  /* Comprobantes oficiales emitidos en el período (facturas, notas de débito y de crédito), de un punto de venta o de todos.
     La única fuente de los libros de IVA, la posición de IVA, los archivos de percepciones y el Resumen de compras y ventas.
     La nota de crédito va con su fecha y resta. Lo Neutral nunca entra: no tiene punto de venta ni CAE. */
  const ORDEN_COMP = ['Factura A', 'Nota de débito A', 'Nota de crédito A', 'Factura B', 'Nota de débito B', 'Nota de crédito B'];
  function comprobantesVenta(p, pv) {
    const out = [];
    DB.ventas.forEach((v) => {
      if (v.version !== 'Oficial' || !v.imp || !v.comp || !v.comp.pv) return;
      const cli = cliente(v.clienteId);
      const fila = (fecha, tipo, comp, nroPv, nro, s) => {
        const a = (x) => r2(s * x);
        const iva105 = a(v.imp.alicuotas.filter((x) => x.alic === 10.5).reduce((t, x) => t + x.iva, 0));
        const percIva = a(v.imp.percepciones.filter((x) => x.imp === 'IVA').reduce((t, x) => t + x.monto, 0));
        return { fecha, tipo, comp, pv: nroPv, nro, v, cliente: cli, signo: s, neto: a(v.imp.neto), exento: a(v.imp.exento || 0), iva: a(v.imp.iva), iva21: r2(a(v.imp.iva) - iva105), iva105, tributos: a(v.imp.tributos), percIva, percIibb: r2(a(v.imp.tributos) - percIva), total: a(v.total),
          alicuotas: v.imp.alicuotas.map((x) => ({ alic: x.alic, neto: a(x.neto), iva: a(x.iva) })), percepciones: v.imp.percepciones.map((x) => ({ imp: x.imp, alic: x.alic, monto: a(x.monto) })) };
      };
      if ((!pv || v.comp.pv === pv) && enPeriodo(v.fecha, p)) out.push(fila(v.fecha, v.comp.tipo, compTxt(v), v.comp.pv, v.comp.nro, 1));
      if (v.nc && v.nc.pv && (!pv || v.nc.pv === pv) && enPeriodo(v.nc.fecha, p)) out.push(fila(v.nc.fecha, v.nc.tipo, ncTxt(v), v.nc.pv, v.nc.nro, -1));
    });
    return out.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.comp < b.comp ? -1 : 1);
  }
  /* El Libro de IVA contra el Panel: ventas oficiales del período, más las notas de crédito que caen en otro período que su factura. */
  function cruceLibroPanel(p, pv) {
    const vs = DB.ventas.filter((v) => v.version === 'Oficial' && v.comp && v.comp.pv && (!pv || v.comp.pv === pv));
    const panel = resumen(vs.filter((v) => enPeriodo(v.fecha, p))).vendido;
    const ncOtro = r2(vs.reduce((s, v) => {
      if (!anulada(v) || !v.nc || !v.nc.pv) return s;
      const f = enPeriodo(v.fecha, p), n = enPeriodo(v.nc.fecha, p);
      return s + (f && !n ? v.total : !f && n ? -v.total : 0);
    }, 0));
    return { panel, ncOtro, libro: r2(panel + ncOtro) };
  }
  /* Facturas de compra del período, con o sin IVA. La única fuente de Compras, el Libro de IVA Compras, las percepciones de proveedores y la posición de IVA. */
  function comprobantesCompra(p, soloIva) {
    const out = [];
    DB.proveedores.forEach((x) => x.movs.forEach((m0) => {
      if ((m0.tipo !== 'factura' && m0.tipo !== 'nc') || (p && !enPeriodo(m0.fecha, p)) || (soloIva && !(x.cuit && Math.abs(m0.neto) > 0))) return;
      const signo = m0.tipo === 'nc' ? -1 : 1;
      const m = signo > 0 ? m0 : { ...m0, neto: -m0.neto, iva: -m0.iva, noGravado: -(m0.noGravado || 0), monto: -m0.monto, perc: (m0.perc || []).map((q) => ({ ...q, monto: -q.monto })) };
      const perc = m.perc || [];
      out.push({ m, prov: x, fecha: m.fecha, signo, perc: sumaPor(perc, (q) => q.monto), percIva: sumaPor(perc.filter((q) => q.imp === 'IVA'), (q) => q.monto), percIibb: sumaPor(perc.filter((q) => q.imp !== 'IVA'), (q) => q.monto) });
    }));
    return out.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  }
  /* Retenciones que les practicamos a los proveedores al pagarles: salen de cada orden de pago vigente. */
  function retencionesPracticadas(p) {
    const out = [];
    DB.proveedores.forEach((x) => x.movs.forEach((m) => { if (pagoVigente(m) && enPeriodo(m.fecha, p)) (m.ret || []).forEach((r) => { if (r.monto > 0) out.push({ fecha: m.fecha, op: m.op, prov: x, imp: r.imp, alic: r.alic, base: m.monto, monto: r.monto }); }); }));
    return out.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  }
  /* Retenciones que nos hicieron: son los movimientos de la caja Retenciones, así el informe y la caja dan lo mismo. */
  const cuitCon = (diez) => { const d = String(diez); const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; let t = 0; for (let i = 0; i < 10; i++) t += Number(d[i]) * m[i]; let v = 11 - (t % 11); if (v === 11) v = 0; if (v === 10) v = 9; return d.slice(0, 2) + '-' + d.slice(2) + '-' + v; };
  const cuitAgente = (id) => cuitCon('3071' + String(950000 + Array.from(String(id)).reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 49999, 7)).padStart(6, '0'));
  const CUIT_EMPRESA = cuitCon('3071588420');
  function retencionesSufridas(p) {
    const cj = DB.cajas.find((c) => c.tipo === 'retenciones');
    if (!cj) return [];
    return movimientosCaja(cj.id).filter((m) => m.ventaId && enPeriodo(m.fecha, p)).map((m) => {
      const v = venta(m.ventaId), cn = canal(v.canal), cli = cliente(v.clienteId), tienda = !!(cn && cn.tienda);
      return { fecha: m.fecha, v, monto: m.monto, agente: tienda ? (cn.id === 'ml' ? 'Mercado Pago' : cn.nombre) : cli.nombre, cuit: tienda ? cuitAgente(cn.id) : cli.doc, jur: cli.jurisdiccion || 'Buenos Aires' };
    }).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  }
  const costoOrden = (o) => { const p = producto(o.productoId); return r2(((p && p.materiales) || []).reduce((s, m) => s + m.cant * o.cant * costoDe(producto(m.productoId)), 0)); };
  /* Ranking de productos vendidos. Un combo desglosado reparte su venta entre sus componentes según su precio de lista. */
  function repartirCombo(pr, x) {
    const comps = pr.combo.map((c) => ({ p: producto(c.productoId), cant: c.cant })).filter((c) => c.p);
    const pesoT = comps.reduce((s, c) => s + precioDe(c.p, 'minorista') * c.cant, 0) || 1;
    let rn = x.neto, ri = x.importe;
    return comps.map((c, i) => {
      const ult = i === comps.length - 1, w = precioDe(c.p, 'minorista') * c.cant / pesoT;
      const neto = ult ? r2(rn) : r2(x.neto * w), importe = ult ? r2(ri) : r2(x.importe * w);
      rn -= neto; ri -= importe;
      return { productoId: c.p.id, nombre: c.p.nombre, cant: c.cant * x.cant, neto, importe, costo: r2(costoDe(c.p) * c.cant * x.cant) };
    });
  }
  /* Lo que queda afuera de los rankings: envíos y otros servicios. Con eso cierran con la venta sin IVA de Utilidad en ventas. */
  function cierreRanking(f, p, tot) {
    const vs = ventasFiltradas(f, p).filter((v) => !anulada(v));
    const serv = sumaPor(vs.flatMap(renglonesVenta).filter((x) => !x.productoId), (x) => x.neto);
    return cierreI('Más envíos y servicios (' + fmt0(serv) + ', fuera del ranking): cierra con la venta sin IVA de Utilidad en ventas', sumaPor(vs, (v) => utilidadVenta(v).neto), r2(tot + serv));
  }
  function rankingProductos(f, p) {
    const m = {};
    ventasFiltradas(f, p).forEach((v) => renglonesVenta(v).forEach((x) => {
      if (!x.productoId) return;
      const pr = producto(x.productoId);
      const partes = f.combos === 'desglosar' && esCombo(pr) ? repartirCombo(pr, x) : [x];
      partes.forEach((y) => {
        const z = m[y.productoId] || (m[y.productoId] = { productoId: y.productoId, nombre: y.nombre, rubro: (producto(y.productoId) || {}).rubro || '', u: 0, ventas: new Set(), neto: 0, importe: 0 });
        z.u += y.cant; z.ventas.add(x.v.id); z.neto += y.neto; z.importe += y.importe;
      });
    }));
    return Object.values(m).map((z) => ({ ...z, n: z.ventas.size, neto: r2(z.neto), importe: r2(z.importe) }));
  }

  /* ---------- archivos de presentación: diseño de registro ---------- */
  const dd = (n) => String(n).padStart(2, '0');
  const fechaBarra = (x) => { const d = D(x); return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const fechaAMD = (x) => { const d = D(x); return d.getFullYear() + dd(d.getMonth() + 1) + dd(d.getDate()); };
  const textoFijo = (s, n) => sinAcentos(String(s == null ? '' : s)).toUpperCase().replace(/[^A-Z0-9 .,-]/g, ' ').slice(0, n).padEnd(n);
  const ceros = (s, n) => String(s == null ? '' : s).replace(/\D/g, '').padStart(n, '0').slice(-n);
  const importeComa = (x, n) => { const neg = x < 0, t = Math.abs(x).toFixed(2).replace('.', ','); return (neg ? '-' : '') + t.padStart(n - (neg ? 1 : 0), '0'); };
  const importeCent = (x, n) => String(Math.round(Math.abs(x) * 100)).padStart(n, '0');
  const COD_CBTE = { 'Factura A': '001', 'Nota de débito A': '002', 'Nota de crédito A': '003', 'Factura B': '006', 'Nota de débito B': '007', 'Nota de crédito B': '008' };
  const COD_JUR = { CABA: '901', 'Buenos Aires': '902', 'Córdoba': '904', 'Entre Ríos': '908', Mendoza: '913', 'Neuquén': '915', Salta: '917', 'Santa Fe': '921' };
  const letraDeComp = (tipo) => tipo.slice(-1);
  const tipoArba = (tipo) => tipo.startsWith('Nota de crédito') ? 'C' : tipo.startsWith('Nota de débito') ? 'D' : 'F';
  const docCod = (doc) => String(doc).includes('-') ? '80' : '96';
  const aaaamm = (p) => p.desde.getFullYear() + dd(p.desde.getMonth() + 1);

  /* ---------- filtros: cada uno con sus opciones. Los valores viven en la dirección de la página (#/informe/id?filtro=valor) ---------- */
  const FILTROS = {
    version: { l: 'Versión', ops: () => [['todas', 'Todas las versiones'], ['oficial', 'Oficial'], ['neutral', 'Neutral']] },
    canal: { l: 'Canal', ops: () => [['', 'Todos los canales']].concat(DB.canales.map((c) => [c.id, c.nombre])) },
    vendedor: { l: 'Vendedor (quién vendió)', ops: () => [['', 'Todos los vendedores']].concat(DB.vendedores.map((x) => [x.id, x.nombre + (x.baja ? ' (baja)' : '')])) },
    operador: { l: 'Operador (quién cargó)', ops: () => [['', 'Todos los operadores']].concat(DB.operadores.map((x) => [x.id, x.nombre])) },
    deposito: { l: 'Depósito', ops: () => [['', 'Todos los depósitos']].concat(DB.depositos.map((d) => [d.id, d.nombre])) },
    caja: { l: 'Caja', ops: () => [['', 'Todas las cajas']].concat(DB.cajas.map((c) => [c.id, c.nombre])) },
    banco: { l: 'Banco', ops: () => [['', 'Todos los bancos']].concat(DB.cajas.filter((c) => c.tipo === 'banco').map((c) => [c.id, c.nombre])) },
    cliente: { l: 'Cliente', ops: (actual) => { const conSaldo = new Set(ventasConSaldo().map((v) => v.clienteId)); return [['', 'Elegí un cliente']].concat(DB.clientes.filter((c) => c.tipo !== 'Consumidor final' || conSaldo.has(c.id) || c.id === actual).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((c) => [c.id, c.nombre])); } },
    proveedor: { l: 'Proveedor', ops: () => [['', 'Todos los proveedores']].concat(DB.proveedores.map((x) => [x.id, x.nombre])) },
    tipoProv: { l: 'Tipo', ops: () => [['', 'Todos los tipos'], ['Proveedor', 'Proveedores'], ['Servicio', 'Servicios'], ['Impuesto', 'Impuestos'], ['Sueldo', 'Sueldos']] },
    rubro: { l: 'Rubro', ops: () => [['', 'Todos los rubros']].concat(Array.from(new Set(DB.productos.filter((p) => !esCombo(p)).map((p) => p.rubro))).map((r) => [r, r])) },
    lista: { l: 'Lista de precios', ops: () => [['', 'Todas las listas']].concat(DB.listas.map((x) => [x.id, x.nombre])) },
    pv: { l: 'Punto de venta', ops: () => [['', 'Todos los puntos de venta']].concat(DB.puntosVenta.map((x) => [x.nro, x.nro + ' · ' + x.nombre])) },
    tipoStock: { l: 'Tipo de movimiento', ops: () => [['', 'Todos los tipos']].concat(Object.keys(TIPOS_STOCK).map((k) => [k, TIPOS_STOCK[k]])) },
    quincena: { l: 'Quincena', ops: () => [['mes', 'Mes completo'], ['1', 'Primera quincena'], ['2', 'Segunda quincena']] },
    valor: { l: 'Valorizar', ops: () => [['costo', 'Al costo']].concat(DB.listas.map((x) => [x.id, 'Lista ' + x.nombre])) },
    combos: { l: 'Combos', ops: () => [['mantener', 'Combos como combo'], ['desglosar', 'Combos desglosados']] },
    articulos: { l: 'Artículos', ops: () => [['terminados', 'Productos terminados'], ['materia', 'Materia prima']] }
  };

  /* ---------- piezas para las definiciones ---------- */
  const colI = (t, tipo, x) => Object.assign({ t, tipo: tipo || 'txt' }, x || {});
  const filaI = (v, ir, g) => ({ v, ir: ir || null, g });
  const totI = (filas, i) => sumaPor(filas, (r) => r.v[i]);
  const cierreI = (txt, valor, contra) => ({ txt, valor: r2(valor), ok: Math.abs(r2(valor) - r2(contra)) < 0.01 });
  const margenI = (iU, iN) => (rows) => rows.length ? pctDe(totI(rows, iU), totI(rows, iN)) : null;
  const sinFiltro = (f, ks) => ks.every((k) => !f[k] || f[k] === 'todas');
  const estadoVence = (x) => { const d = diasA(x); return d < 0 ? ['Vencida hace ' + plural(-d, 'día', 'días'), 'b-bad'] : d === 0 ? ['Vence hoy', 'b-warn'] : d <= 7 ? ['Vence en ' + plural(d, 'día', 'días'), 'b-warn'] : ['Vence en ' + d + ' días', 'b-neutro']; };
  const badgeMin = (p) => esCombo(p) ? null : bajoMinimo(p) ? ['Bajo mínimo', 'b-bad'] : ['OK', 'b-ok'];
  const COLS_RESUMEN = () => [colI('Comprobantes'), colI('Cantidad', 'n'), colI('Gravado', 'monto'), colI('IVA', 'monto'), colI('No gravado y exento', 'monto'), colI('Percepciones', 'monto'), colI('Total', 'monto')];
  /* Saldos de clientes: venta por venta, para poder abrir por vencimiento, antigüedad o mes. */
  const venceVenta = (v) => (v.acred && (v.acred.vence || v.acred.fecha)) || v.fecha;
  const antiguedad = (v) => Math.max(0, -diasA(v.fecha));

  /* Percepciones o retenciones de Ingresos Brutos de una jurisdicción: el mismo cálculo para ARBA y para AGIP. */
  function infIIBB(id, n, imp, org) {
    return { id, g: 'Contables', n, contable: true, archivo: true, fil: ['quincena'], modos: [['percepciones', 'Percepciones'], ['retenciones', 'Retenciones']], clave: org + ' ingresos brutos archivo quincena percepciones retenciones',
      calc(f, p) {
        const enQ = (x) => f.quincena === 'mes' || (f.quincena === '1') === (D(x).getDate() <= 15);
        const cuitE = CUIT_EMPRESA.replace(/\D/g, '');
        let filas, cols, lineas, nombre;
        if (f.modo === 'retenciones') {
          const rs = retencionesPracticadas(p).filter((r) => r.imp === imp && enQ(r.fecha));
          cols = [colI('Fecha', 'fecha'), colI('Orden de pago', 'mono'), colI('Proveedor'), colI('CUIT', 'mono'), colI('Base', 'monto'), colI('Alícuota', 'pct'), colI('Retención', 'monto')];
          filas = rs.map((r) => filaI([r.fecha, 'OP ' + r.op, [r.prov.nombre, r.prov.jurisdiccion], r.prov.cuit, r.base, r.alic, r.monto], ['proveedor', r.prov.id]));
          lineas = org === 'ARBA'
            ? rs.map((r) => r.prov.cuit + fechaBarra(r.fecha) + '0001' + ceros(r.op, 8) + importeComa(r.monto, 11) + 'A')
            : rs.map((r) => '1' + '029' + fechaBarra(r.fecha) + '06' + ' ' + ceros(r.op, 16) + fechaBarra(r.fecha) + importeComa(r.base, 16) + ceros('', 16) + '3' + ceros(r.prov.cuit, 11) + '2' + ceros(r.prov.cuit, 11) + '1' + textoFijo(r.prov.nombre, 30) + importeComa(0, 16) + importeComa(0, 16) + importeComa(r.base, 16) + importeComa(r.alic, 5) + importeComa(r.monto, 16) + importeComa(r.monto, 16));
          nombre = org === 'ARBA' ? 'AR-' + cuitE + '-' + aaaamm(p) + '-6-LOTE1.txt' : 'ARCIBA-RET-' + cuitE + '-' + aaaamm(p) + '.txt';
        } else {
          const ps = comprobantesVenta(p).flatMap((x) => x.percepciones.filter((q) => q.imp === imp && q.monto).map((q) => ({ x, q }))).filter((y) => enQ(y.x.fecha));
          cols = [colI('Fecha', 'fecha'), colI('Comprobante', 'mono'), colI('Cliente'), colI('CUIT', 'mono'), colI('Base imponible', 'monto'), colI('Alícuota', 'pct'), colI('Percepción', 'monto')];
          filas = ps.map(({ x, q }) => filaI([x.fecha, x.comp, [x.cliente.nombre, x.cliente.jurisdiccion], x.cliente.doc, x.neto, q.alic, q.monto], ['venta', x.v.id]));
          lineas = org === 'ARBA'
            ? ps.map(({ x, q }) => x.cliente.doc + fechaBarra(x.fecha) + tipoArba(x.tipo) + letraDeComp(x.tipo) + ceros(x.pv, 4) + ceros(x.nro, 8) + importeComa(x.neto, 12) + importeComa(q.monto, 11) + 'A')
            : ps.map(({ x, q }) => '2' + '029' + fechaBarra(x.fecha) + (x.signo < 0 ? '03' : x.tipo.startsWith('Nota de débito') ? '02' : '01') + letraDeComp(x.tipo) + ceros(x.pv + x.nro, 16) + fechaBarra(x.fecha) + importeComa(x.total, 16) + ceros('', 16) + '3' + ceros(x.cliente.doc, 11) + '2' + ceros(x.cliente.doc, 11) + '1' + textoFijo(x.cliente.nombre, 30) + importeComa(0, 16) + importeComa(x.iva, 16) + importeComa(x.neto, 16) + importeComa(q.alic, 5) + importeComa(q.monto, 16) + importeComa(q.monto, 16));
          nombre = org === 'ARBA' ? 'AR-' + cuitE + '-' + aaaamm(p) + (f.quincena === 'mes' ? '0' : f.quincena) + '-7-LOTE1.txt' : 'ARCIBA-PER-' + cuitE + '-' + aaaamm(p) + '.txt';
        }
        const ret = f.modo === 'retenciones', total = totI(filas, 6);
        return {
          kpis: [['ph-receipt-x', ret ? 'Retenido' : 'Percibido', fmtM(total), org + (f.quincena === 'mes' ? ', mes completo' : f.quincena === '1' ? ', primera quincena' : ', segunda quincena'), true], ['ph-scales', 'Base imponible', fmtM(totI(filas, 4)), 'Neto de los comprobantes'], ['ph-files', ret ? 'Órdenes de pago' : 'Comprobantes', String(filas.length), ret ? 'Con retención practicada' : 'Con percepción'], ['ph-file-arrow-down', 'Archivo', plural(lineas.length, 'línea', 'líneas'), 'Listo para presentar']],
          tablas: [{ cols, filas, vacio: ret ? 'No hay retenciones de esta jurisdicción en el período.' : 'No hay percepciones de esta jurisdicción en el período.' }],
          archivo: { nombre, lineas }
        };
      } };
  }

  /* ---------- las definiciones: lista definitiva de la ADENDA ---------- */
  const GRUPOS_INF = ['Operaciones', 'Clientes', 'Proveedores', 'Productos', 'Caja y cobranzas', 'Contables'];
  const INFS = [
    { id: 'panel', g: 'Operaciones', n: 'Panel general', link: 'inicio', clave: 'vendido cobrado acreditado puente tablero' },
    { id: 'resumen-cv', g: 'Operaciones', n: 'Resumen de compras y ventas', ver: true, clave: 'gravado iva no gravado percepciones notas de debito credito saldos deudores acreedores',
      nota: 'Las notas de crédito restan. Las señas y lo Neutral van sin IVA discriminado. Las compras no tienen versión Neutral.',
      calc(f, p) {
        const comp = f.version === 'neutral' ? [] : comprobantesVenta(p);
        const linea = (nombre, xs, sec) => filaI([[nombre, sec || ''], xs.length, sumaPor(xs, (x) => x.neto), sumaPor(xs, (x) => x.iva), sumaPor(xs, (x) => x.exento), sumaPor(xs, (x) => x.tributos), sumaPor(xs, (x) => x.total)]);
        const sinIva = (nombre, arr, sec) => filaI([[nombre, sec], arr.length, 0, 0, 0, 0, sumaPor(arr, (v) => v.total)]);
        const vs = ventasFiltradas(f, p).filter((v) => !anulada(v));
        const ventas = [linea('Facturas', comp.filter((x) => x.tipo.startsWith('Factura'))), linea('Notas de débito', comp.filter((x) => x.tipo.startsWith('Nota de débito'))), linea('Notas de crédito', comp.filter((x) => x.tipo.startsWith('Nota de crédito')), 'Restan')];
        if (f.version !== 'neutral') ventas.push(sinIva('Recibos de seña', vs.filter((v) => v.version === 'Seña'), 'Se facturan al completarse'));
        if (f.version !== 'oficial') ventas.push(sinIva('Comprobantes internos', vs.filter((v) => v.version === 'Neutral'), 'Neutral: sin IVA ni CAE'));
        const cc = f.version === 'neutral' ? [] : comprobantesCompra(p);
        const lineaC = (nombre, xs, sec) => filaI([[nombre, sec], xs.length, sumaPor(xs, (x) => x.m.neto), sumaPor(xs, (x) => x.m.iva), sumaPor(xs, (x) => x.m.noGravado), sumaPor(xs, (x) => x.perc), sumaPor(xs, (x) => x.m.monto)]);
        const compras = f.version === 'neutral' ? [] : [lineaC('Facturas de compra', cc.filter((x) => x.signo > 0 && x.m.neto > 0), 'Proveedores y servicios con IVA'), lineaC('Gastos sin IVA', cc.filter((x) => x.signo > 0 && !(x.m.neto > 0)), 'Sueldos, impuestos y tasas'), lineaC('Notas de crédito de proveedores', cc.filter((x) => x.signo < 0), 'Restan')];
        const deben = sumaPor(ventasConSaldo().filter((v) => pasaVersion(v, f.version)), saldoVenta), debemos = f.version === 'neutral' ? 0 : deudaProveedores();
        const totV = totI(ventas, 6), totC = totI(compras, 6);
        const panel = resumen(ventasFiltradas(f, p)).vendido, nc = f.version === 'neutral' ? 0 : cruceLibroPanel(p).ncOtro;
        return {
          kpis: [['ph-receipt', 'Ventas', fmtM(totV), 'Facturas, notas y comprobantes', true], ['ph-shopping-cart', 'Compras', fmtM(totC), 'Proveedores, servicios y gastos'], ['ph-clock', 'Saldo deudor', fmtM(deben), 'Nos deben, al día de hoy'], ['ph-scales', 'Saldo acreedor', fmtM(debemos), 'Debemos, al día de hoy']],
          tablas: [{ titulo: 'Ventas', cols: COLS_RESUMEN(), filas: ventas }, { titulo: 'Compras', cols: COLS_RESUMEN(), filas: compras, vacio: 'Las compras no tienen versión Neutral.' },
            { titulo: 'Cuentas corrientes al día de hoy', cols: [colI('Concepto'), colI('Saldo', 'saldo')], filas: [filaI([['Saldo deudor', 'Lo que nos deben los clientes'], deben], ['ir', 'informe/saldos-clientes']), filaI([['Saldo acreedor', 'Lo que les debemos a los proveedores'], debemos], ['ir', 'informe/saldos-proveedores']), filaI([['Diferencia', 'Deudores menos acreedores'], r2(deben - debemos)])] }],
          cierres: [cierreI('Cierra con el Panel: vendido del período' + (nc ? ', más notas de crédito de ventas de otro período' : ''), r2(panel + nc), totV)]
        };
      } },
    { id: 'ventas', g: 'Operaciones', n: 'Ventas', ver: true, fil: ['canal', 'vendedor', 'operador'], modos: [['canal', 'Por canal'], ['dia', 'Por día'], ['producto', 'Por producto']], clave: 'ventas por canal por dia por producto vendido facturacion',
      calc(f, p) {
        const vs = ventasFiltradas(f, p), R = resumen(vs);
        const libre = sinFiltro(f, ['version', 'canal', 'vendedor', 'operador']);
        let t, cierres = [];
        if (f.modo === 'producto') {
          const m = {};
          vs.forEach((v) => renglonesVenta(v).forEach((x) => {
            const k = x.productoId || 'servicios';
            const y = m[k] || (m[k] = { k, nombre: x.productoId ? x.nombre : 'Envíos y otros servicios', rubro: x.productoId ? (producto(x.productoId) || {}).rubro : 'Servicios', u: 0, ventas: new Set(), imp: 0, neto: 0 });
            y.u += x.cant; y.ventas.add(x.v.id); y.imp += x.importe; y.neto += x.neto;
          }));
          const filas = Object.values(m).sort((a, b) => b.imp - a.imp).map((y) => filaI([[y.nombre, y.rubro], y.ventas.size, y.u, r2(y.imp), r2(y.neto)], producto(y.k) ? ['producto', y.k] : null));
          t = { cols: [colI('Producto'), colI('Ventas', 'n'), colI('Unidades', 'cant', { suma: true }), colI('Importe', 'monto', { ayuda: 'Con IVA y sin percepciones' }), colI('Sin IVA', 'monto')], filas };
          const perc = sumaPor(vs.filter((v) => !anulada(v) && v.imp), (v) => v.imp.tributos);
          cierres.push(cierreI('Cierra con Ventas por canal: vendido menos percepciones', r2(R.vendido - perc), totI(filas, 3)));
        } else if (f.modo === 'dia') {
          const pd = porDiaDe(vs);
          const filas = Object.keys(pd).sort().map((d) => { const r = resumen(pd[d]); return filaI([deISODate(d), r.n, r.vendido, r.cobrado, r.descuentos, r.acreditado]); }).filter((x) => x.v[1] || x.v[2]);
          t = { cols: [colI('Día', 'fecha'), colI('Ventas', 'n'), colI('Vendido', 'monto'), colI('Cobrado', 'monto'), colI('Descuentos', 'monto'), colI('Acreditado', 'monto')], filas };
          if (libre) cierres.push(cierreI('Cierra con el Panel: vendido del período', resumen(ventasDelPeriodo()).vendido, totI(filas, 2)));
        } else {
          const filas = DB.canales.map((c) => ({ c, r: resumen(vs.filter((v) => v.canal === c.id)) })).filter((x) => x.r.bruto > 0 || (!f.canal && x.c.tienda)).map(({ c, r }) => filaI([c.id, r.n, r.vendido, r.cobrado, r.descuentos, r.transito, r.acreditado], ['ir', 'ventas?canal=' + c.id]));
          t = { cols: [colI('Canal', 'canal'), colI('Ventas', 'n'), colI('Vendido', 'monto'), colI('Cobrado', 'monto'), colI('Descuentos', 'monto', { ayuda: 'Comisiones, envíos, retenciones y cuotas' }), colI('En tránsito', 'monto'), colI('Acreditado', 'monto')], filas };
          if (libre) cierres.push(cierreI('Cierra con el Panel: vendido del período', resumen(ventasDelPeriodo()).vendido, totI(filas, 2)));
        }
        return { kpis: [['ph-receipt', 'Vendido', fmtM(R.vendido), plural(R.n, 'venta', 'ventas'), true], ['ph-hand-coins', 'Cobrado', fmtM(R.cobrado), fPct(pctDe(R.cobrado, R.vendido)) + ' de lo vendido'], ['ph-bank', 'Acreditado', fmtM(R.acreditado), 'Neto de comisiones y retenciones'], ['ph-tag', 'Ticket promedio', fmtM(R.n ? R.vendido / R.n : 0), 'Vendido sobre ventas']], tablas: [t], cierres };
      } },
    { id: 'compras', g: 'Operaciones', n: 'Compras', fil: ['tipoProv', 'proveedor'], modos: [['proveedor', 'Por proveedor'], ['tipo', 'Por tipo de gasto']], clave: 'compras gastos proveedores servicios impuestos sueldos',
      calc(f, p) {
        const cc = comprobantesCompra(p).filter((x) => (!f.tipoProv || x.prov.tipo === f.tipoProv) && (!f.proveedor || x.prov.id === f.proveedor));
        const g = {};
        cc.forEach((x) => { const k = f.modo === 'tipo' ? x.m.detalle || x.prov.rubro : x.prov.id; (g[k] || (g[k] = [])).push(x); });
        const vals = (xs) => [xs.length, sumaPor(xs, (x) => x.m.neto), sumaPor(xs, (x) => x.m.iva), sumaPor(xs, (x) => x.perc), sumaPor(xs, (x) => x.m.noGravado), sumaPor(xs, (x) => x.m.monto)];
        const cols = [colI(f.modo === 'tipo' ? 'Tipo de gasto' : 'Proveedor'), colI(f.modo === 'tipo' ? 'Proveedores' : 'Tipo', f.modo === 'tipo' ? 'n' : 'txt'), colI('Facturas', 'n'), colI('Neto', 'monto'), colI('IVA', 'monto'), colI('Percepciones', 'monto'), colI('No gravado', 'monto'), colI('Total', 'monto')];
        const filas = Object.keys(g).map((k) => { const xs = g[k], x0 = xs[0].prov; return f.modo === 'tipo' ? filaI([[k, Array.from(new Set(xs.map((x) => x.prov.tipo))).join(', ')], new Set(xs.map((x) => x.prov.id)).size].concat(vals(xs))) : filaI([[x0.nombre, x0.rubro], x0.tipo].concat(vals(xs)), ['proveedor', x0.id]); }).sort((a, b) => b.v[7] - a.v[7]);
        const total = totI(filas, 7);
        return { kpis: [['ph-shopping-cart', 'Comprado', fmtM(total), plural(cc.length, 'factura', 'facturas'), true], ['ph-percent', 'IVA crédito fiscal', fmtM(totI(filas, 4)), 'De las facturas con IVA'], ['ph-receipt', 'Percepciones', fmtM(totI(filas, 5)), 'Que nos cobraron los proveedores'], ['ph-truck', 'Proveedores', String(new Set(cc.map((x) => x.prov.id)).size), 'Con facturas en el período']],
          tablas: [{ cols, filas }], cierres: sinFiltro(f, ['tipoProv', 'proveedor']) ? [cierreI('Cierra con Proveedores y gastos: comprado en el período', sumaPor(DB.proveedores, (x) => movsProveedorPeriodo(x, p).comprado), total)] : [] };
      } },
    { id: 'vca', g: 'Operaciones', n: 'Vendido, cobrado y acreditado', ver: true, fil: ['canal'], clave: 'vendido cobrado acreditado por dia transito cuenta corriente diferencia sin explicar',
      calc(f, p) {
        const vs = ventasFiltradas(f, p), R = resumen(vs), pd = porDiaDe(vs);
        const filas = Object.keys(pd).sort().map((d) => { const r = resumen(pd[d]); return filaI([deISODate(d), r.n, r.vendido, r.cobrado, r.descuentos, r.transito, r.ctacte, r.acreditado, r.sinExplicar]); }).filter((x) => x.v[1] || x.v[2]);
        const cierres = [cierreI('Diferencia sin explicar entre vendido y acreditado', R.sinExplicar, 0)];
        if (sinFiltro(f, ['version', 'canal'])) cierres.push(cierreI('Cierra con el Panel: acreditado del período', resumen(ventasDelPeriodo()).acreditado, totI(filas, 7)));
        return { kpis: [['ph-receipt', 'Vendido', fmtM(R.vendido), plural(R.n, 'venta', 'ventas')], ['ph-hand-coins', 'Cobrado', fmtM(R.cobrado), fPct(pctDe(R.cobrado, R.vendido)) + ' de lo vendido'], ['ph-bank', 'Acreditado', fmtM(R.acreditado), 'Ya está en las cuentas', true], ['ph-hourglass-medium', 'Por entrar', fmtM(R.ctacte + R.transito), 'Cuenta corriente y en tránsito']],
          tablas: [{ cols: [colI('Día', 'fecha'), colI('Ventas', 'n'), colI('Vendido', 'monto'), colI('Cobrado', 'monto'), colI('Descuentos', 'monto'), colI('En tránsito', 'monto'), colI('Cta. cte.', 'monto'), colI('Acreditado', 'monto'), colI('Sin explicar', 'monto')], filas }], cierres };
      } },
    { id: 'produccion', g: 'Operaciones', n: 'Producción del período', modos: [['orden', 'Por orden'], ['producto', 'Por producto']], clave: 'produccion ordenes de fabricacion terminadas materia prima consumida',
      calc(f, p) {
        const term = DB.ordenes.filter((o) => o.estado === 'Terminada' && enPeriodo(o.terminada, p)).sort((a, b) => a.terminada < b.terminada ? -1 : 1);
        let t;
        if (f.modo === 'producto') {
          const g = {};
          term.forEach((o) => (g[o.productoId] || (g[o.productoId] = [])).push(o));
          t = { cols: [colI('Producto'), colI('Órdenes', 'n'), colI('Unidades', 'cant', { suma: true }), colI('Costo de materia prima', 'monto')], filas: Object.keys(g).map((k) => { const pr = producto(k); return filaI([[nombreDe(pr), pr ? pr.rubro : ''], g[k].length, g[k].reduce((s, o) => s + o.cant, 0), sumaPor(g[k], costoOrden)], ['producto', k]); }) };
        } else t = { cols: [colI('Orden', 'mono'), colI('Producto'), colI('Unidades', 'cant', { suma: true }), colI('Responsable'), colI('Prevista', 'fecha'), colI('Terminada', 'fecha'), colI('Costo de materia prima', 'monto')], filas: term.map((o) => filaI([String(o.nro), [nombreDe(producto(o.productoId))], o.cant, nombreDe(operador(o.responsableId)), o.prevista, o.terminada, costoOrden(o)], ['orden', o.id])) };
        const cons = {};
        movimientosStock().filter((m) => m.tipo === 'fabricacion' && m.desde && enPeriodo(m.fecha, p)).forEach((m) => { cons[m.productoId] = (cons[m.productoId] || 0) + m.cant; });
        const mats = Object.keys(cons).map((k) => { const x = producto(k); return filaI([[nombreDe(x), x ? x.sku : ''], x ? x.unidad : '', r2(cons[k]), r2(cons[k] * costoDe(x))], ['producto', k]); }).sort((a, b) => b.v[3] - a.v[3]);
        const costo = sumaPor(term, costoOrden);
        return { kpis: [['ph-check-circle', 'Órdenes terminadas', String(term.length), 'En el período', true], ['ph-package', 'Unidades fabricadas', fCant(term.reduce((s, o) => s + o.cant, 0)), 'Entraron a ' + nombreDe(depFabrica())], ['ph-gear-six', 'En proceso', String(DB.ordenes.filter((o) => o.estado === 'En proceso').length), 'Al día de hoy'], ['ph-stack', 'Materia prima consumida', fmtM(costo), 'Al costo']],
          tablas: [t, { titulo: 'Materia prima consumida', cols: [colI('Material'), colI('Unidad'), colI('Cantidad', 'cant'), colI('Al costo', 'monto')], filas: mats, vacio: 'No se consumió materia prima en el período.' }],
          cierres: [cierreI('La materia prima consumida es la de las órdenes terminadas', totI(mats, 3), costo)] };
      } },
    { id: 'rendicion', g: 'Operaciones', n: 'Remitos y rendición', fil: ['deposito'], modos: [['dia', 'Por día'], ['producto', 'Por producto'], ['remitos', 'Remitos']], clave: 'remitos rendicion deposito salidas hoja de ruta',
      calc(f, p) {
        const R = rendicion(p, f.deposito);
        let t;
        if (f.modo === 'producto') t = { cols: [colI('Producto'), colI('Unidades', 'cant', { suma: true })], filas: R.porProducto.map((x) => filaI([x.nombre, x.cant], ['producto', x.productoId])) };
        else if (f.modo === 'remitos') t = { cols: [colI('Remito', 'mono'), colI('Fecha', 'fecha'), colI('Venta'), colI('Sale de'), colI('Hoja de ruta', 'mono'), colI('Estado', 'badge'), colI('Unidades', 'cant', { suma: true })], filas: R.remitos.slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1).map((r) => filaI([r.nro, r.fecha, [origenRemito(r)], nombreDe(deposito(r.depositoId)), r.grupo || '', [estadoRemitoTxt(r), badgeRemito(r.estado)], itemsRemito(r).reduce((s, l) => s + l.cant, 0)], ['remito', r.id])) };
        else t = { cols: [colI('Producto'), colI('Remitos', 'n'), colI('Unidades', 'cant', { suma: true })], filas: R.filas.map((x) => filaI([x.nombre, x.remitos, x.cant], ['producto', x.productoId], x.dia)), agrupar: { titulo: (g) => mayus(fDiaLargo(deISODate(g))) } };
        return { kpis: [['ph-truck', 'Remitos', String(R.nRemitos), 'De venta, sin los anulados', true], ['ph-package', 'Unidades', fCant(R.total), 'Salieron del depósito'], ['ph-list-checks', 'Productos', String(R.porProducto.length), 'Distintos'], ['ph-check-circle', 'Entregados', String(R.remitos.filter((r) => r.estado === 'Entregado').length), 'Del período']], tablas: [t] };
      } },

    { id: 'saldos-clientes', g: 'Clientes', n: 'Saldos de clientes', aHoy: true, ver: true, fil: ['vendedor'], modos: [['saldos', 'Saldos'], ['vencimientos', 'Con vencimientos'], ['antiguedad', '30, 60, 90 o más'], ['mensual', 'Mensual'], ['vendedor', 'Por vendedor']], clave: 'saldos en cuentas corrientes clientes deuda antiguedad a cobrar cuenta corriente vencimientos',
      calc(f) {
        const vs = ventasConSaldo().filter((v) => pasaVersion(v, f.version) && (!f.vendedor || (cliente(v.clienteId) || {}).vendedorId === f.vendedor));
        const g = {};
        vs.forEach((v) => (g[v.clienteId] || (g[v.clienteId] = [])).push(v));
        const vencido = (xs) => sumaPor(xs.filter((v) => diasA(venceVenta(v)) < 0), saldoVenta), saldo = (xs) => sumaPor(xs, saldoVenta);
        const clis = Object.keys(g).map((k) => ({ c: cliente(k), xs: g[k] })).sort((a, b) => saldo(b.xs) - saldo(a.xs));
        const nombre = (c) => [c.nombre, c.localidad];
        let cols, filas;
        if (f.modo === 'antiguedad') {
          const tramos = [[0, 30], [31, 60], [61, 90], [91, 1e9]];
          cols = [colI('Cliente'), colI('0 a 30 días', 'monto'), colI('31 a 60 días', 'monto'), colI('61 a 90 días', 'monto'), colI('Más de 90 días', 'monto'), colI('Total', 'monto')];
          filas = clis.map(({ c, xs }) => filaI([nombre(c)].concat(tramos.map(([a, b]) => sumaPor(xs.filter((v) => antiguedad(v) >= a && antiguedad(v) <= b), saldoVenta))).concat([saldo(xs)]), ['cliente', c.id]));
        } else if (f.modo === 'mensual') {
          const meses = Array.from(new Set(vs.map((v) => toISODate(D(v.fecha)).slice(0, 7)))).sort();
          const etiqueta = (m) => { const d = deISODate(m + '-01'); return mayus(nombreMes(d)).slice(0, 3) + ' ' + d.getFullYear(); };
          cols = [colI('Cliente')].concat(meses.map((m) => colI(etiqueta(m), 'monto'))).concat([colI('Total', 'monto')]);
          filas = clis.map(({ c, xs }) => filaI([nombre(c)].concat(meses.map((m) => sumaPor(xs.filter((v) => toISODate(D(v.fecha)).slice(0, 7) === m), saldoVenta))).concat([saldo(xs)]), ['cliente', c.id]));
        } else if (f.modo === 'vencimientos') {
          cols = [colI('Cliente'), colI('Vence', 'fecha', { ayuda: 'El vencimiento más viejo con saldo' }), colI('Estado', 'badge'), colI('Vencido', 'monto'), colI('A vencer', 'monto'), colI('Saldo', 'monto')];
          filas = clis.map(({ c, xs }) => { const v1 = xs.map(venceVenta).sort()[0]; return filaI([nombre(c), v1, estadoVence(v1), vencido(xs), r2(saldo(xs) - vencido(xs)), saldo(xs)], ['cliente', c.id]); }).sort((a, b) => a.v[1] < b.v[1] ? -1 : 1);
        } else if (f.modo === 'vendedor') {
          cols = [colI('Cliente'), colI('CUIT o DNI', 'mono'), colI('Comprobantes', 'n'), colI('Vencido', 'monto'), colI('Saldo', 'monto')];
          filas = clis.map(({ c, xs }) => filaI([nombre(c), c.doc, xs.length, vencido(xs), saldo(xs)], ['cliente', c.id], nombreDe(vendedor(c.vendedorId), 'Sin vendedor asignado')));
        } else {
          cols = [colI('Cliente'), colI('CUIT o DNI', 'mono'), colI('Condición'), colI('Vendedor'), colI('Comprobantes', 'n'), colI('Saldo', 'monto')];
          filas = clis.map(({ c, xs }) => filaI([nombre(c), c.doc, c.condicion, nombreDe(vendedor(c.vendedorId), 'Sin asignar'), xs.length, saldo(xs)], ['cliente', c.id]));
        }
        const total = saldo(vs), venc = vencido(vs);
        return { kpis: [['ph-clock', 'A cobrar', fmtM(total), plural(clis.length, 'cliente con saldo', 'clientes con saldo'), true], ['ph-warning', 'Vencido', fmtM(venc), fPct(pctDe(venc, total)) + ' del saldo', venc <= 0], ['ph-calendar-x', 'Más de 90 días', fmtM(sumaPor(vs.filter((v) => antiguedad(v) > 90), saldoVenta)), 'Desde la fecha del comprobante'], ['ph-receipt', 'Comprobantes', String(vs.length), 'Con saldo pendiente']],
          tablas: [{ cols, filas, agrupar: f.modo === 'vendedor' ? {} : null, vacio: 'Ningún cliente tiene saldo con estos filtros.' }],
          cierres: sinFiltro(f, ['version', 'vendedor']) ? [cierreI('Cierra con el Panel: a cobrar en cuenta corriente', aCobrar(), totI(filas, cols.length - 1))] : [] };
      } },
    { id: 'actividad-cliente', g: 'Clientes', n: 'Actividad de un cliente', fil: ['cliente'], oblig: ['cliente'], clave: 'actividad cliente cuenta corriente movimientos facturas recibos',
      calc(f, p) {
        const c = cliente(f.cliente);
        if (!c) return { kpis: [], tablas: [{ cols: [colI('Cliente')], filas: [], vacio: 'Elegí un cliente.' }] };
        const k = ctaCliente(c), antes = k.movs.filter((m) => D(m.fecha) < p.desde), en = k.movs.filter((m) => enPeriodo(m.fecha, p));
        const s0 = antes.length ? antes[antes.length - 1].saldo : 0, sF = en.length ? en[en.length - 1].saldo : s0;
        const filas = [filaI([new Date(p.desde.getTime() - 1), ['Saldo anterior', c.nombre], null, null, s0])].concat(en.map((m) => filaI([m.fecha, [m.comp], m.debe || null, m.haber || null, m.saldo], ['venta', m.ventaId])));
        const debe = totI(filas, 2), haber = totI(filas, 3);
        const cierres = [cierreI('Saldo anterior más debe menos haber: saldo al cierre', sF, r2(s0 + debe - haber))];
        if (p.incluyeHoy) cierres.push(cierreI('Cierra con la ficha del cliente: saldo de hoy', k.saldo, sF));
        return { kpis: [['ph-clock-counter-clockwise', 'Saldo anterior', fmtM(s0), 'Al ' + fFecha(masDias(p.desde, -1))], ['ph-receipt', 'Debe', fmtM(debe), 'Facturas y notas de débito'], ['ph-hand-coins', 'Haber', fmtM(haber), 'Cobros y notas de crédito'], ['ph-scales', 'Saldo al cierre', fmtM(sF), c.condicion, true]],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Comprobante', 'mono'), colI('Debe', 'monto'), colI('Haber', 'monto'), colI('Saldo', 'saldo')], filas }], cierres };
      } },
    { id: 'cobros', g: 'Clientes', n: 'Cobros', ver: true, fil: ['caja', 'vendedor', 'operador'], modos: [['detalle', 'Recibos'], ['medio', 'Por medio de pago']], clave: 'cobros recibos cobranzas medio de pago',
      nota: 'Los recibos con fecha en el período, de ventas vigentes. Lo anulado no cuenta.',
      calc(f, p) {
        const xs = [];
        DB.ventas.forEach((v) => {
          if (!esVenta(v) || anulada(v) || !pasaVersion(v, f.version) || (f.vendedor && v.vendedorId !== f.vendedor)) return;
          v.cobros.forEach((c) => { if (enPeriodo(c.fecha, p) && (!f.caja || c.caja === f.caja || cajaDeCobro(v, c) === f.caja) && (!f.operador || (c.operadorId || v.operadorId) === f.operador)) xs.push({ v, c, neto: netoCobro(v, c) }); });
        });
        xs.sort((a, b) => a.c.fecha < b.c.fecha ? -1 : 1);
        let t;
        if (f.modo === 'medio') {
          const g = {};
          xs.forEach((x) => (g[x.c.medio] || (g[x.c.medio] = [])).push(x));
          t = { cols: [colI('Medio'), colI('Recibos', 'n'), colI('Monto', 'monto'), colI('Descuentos', 'monto'), colI('Neto', 'monto')], filas: Object.keys(g).map((k) => filaI([k, g[k].length, sumaPor(g[k], (x) => x.c.monto), sumaPor(g[k], (x) => x.c.monto - x.neto), sumaPor(g[k], (x) => x.neto)])).sort((a, b) => b.v[2] - a.v[2]) };
        } else t = { cols: [colI('Fecha', 'fecha'), colI('Recibo', 'mono'), colI('Cliente'), colI('Medio'), colI('Caja'), colI('Monto', 'monto'), colI('Descuentos', 'monto', { ayuda: 'Comisiones, retenciones y lo que descuenta el canal' }), colI('Neto', 'monto')],
          filas: xs.map((x) => filaI([x.c.fecha, String(x.c.nro).padStart(8, '0'), [nombreDe(cliente(x.v.clienteId)), 'Venta ' + x.v.id], [x.c.medio, x.c.cheque ? 'Cheque N° ' + x.c.cheque.nro : ''], nombreDe(caja(cajaDeCobro(x.v, x.c))), x.c.monto, r2(x.c.monto - x.neto), x.neto], ['venta', x.v.id])) };
        const monto = sumaPor(xs, (x) => x.c.monto), neto = sumaPor(xs, (x) => x.neto);
        return { kpis: [['ph-hand-coins', 'Cobrado', fmtM(monto), plural(xs.length, 'recibo', 'recibos'), true], ['ph-receipt-x', 'Retenciones', fmtM(sumaPor(xs, (x) => x.c.retencion)), 'Que nos hicieron al cobrar'], ['ph-minus-circle', 'Descuentos', fmtM(r2(monto - neto)), 'Comisiones y retenciones'], ['ph-bank', 'Neto', fmtM(neto), 'Lo que entra a las cajas']], tablas: [t] };
      } },

    { id: 'saldos-proveedores', g: 'Proveedores', n: 'Saldos con proveedores', aHoy: true, fil: ['tipoProv'], clave: 'saldos en cuentas corrientes proveedores deuda a pagar cuenta corriente',
      calc(f) {
        const xs = DB.proveedores.filter((x) => !f.tipoProv || x.tipo === f.tipoProv).map((x) => ({ x, k: ctaProveedor(x) })).filter((y) => y.k.saldo > 0.009).sort((a, b) => b.k.saldo - a.k.saldo);
        const venc = (k) => sumaPor(k.pend.filter((fc) => diasA(fc.vence) < 0), (fc) => fc.saldo), semana = (k) => sumaPor(k.pend.filter((fc) => diasA(fc.vence) >= 0 && diasA(fc.vence) <= 7), (fc) => fc.saldo);
        const filas = xs.map(({ x, k }) => filaI([[x.nombre, x.rubro], x.cuit || 'No aplica', x.tipo, k.pend.length, venc(k), r2(k.saldo - venc(k)), k.saldo, k.prox && k.prox.vence], ['proveedor', x.id]));
        const total = totI(filas, 6);
        return { kpis: [['ph-scales', 'Deuda', fmtM(total), plural(xs.length, 'proveedor con saldo', 'proveedores con saldo'), true], ['ph-warning', 'Vencido', fmtM(totI(filas, 4)), 'Revisar', totI(filas, 4) <= 0], ['ph-calendar-check', 'Vence en 7 días', fmtM(sumaPor(xs, (y) => semana(y.k))), 'Hasta el ' + fFecha(masDias(INI_HOY, 7))], ['ph-files', 'Facturas pendientes', String(sumaPor(xs, (y) => y.k.pend.length)), 'Con saldo']],
          tablas: [{ cols: [colI('Proveedor'), colI('CUIT', 'mono'), colI('Tipo'), colI('Pendientes', 'n'), colI('Vencido', 'monto'), colI('A vencer', 'monto'), colI('Saldo', 'monto'), colI('Próximo vencimiento', 'fecha')], filas }],
          cierres: f.tipoProv ? [] : [cierreI('Cierra con Proveedores y gastos: deuda total', deudaProveedores(), total)] };
      } },
    { id: 'actividad-proveedor', g: 'Proveedores', n: 'Actividad de un proveedor', fil: ['proveedor'], oblig: ['proveedor'], clave: 'actividad proveedor cuenta corriente facturas pagos',
      calc(f, p) {
        const x = proveedor(f.proveedor);
        if (!x) return { kpis: [], tablas: [{ cols: [colI('Proveedor')], filas: [], vacio: 'Elegí un proveedor.' }] };
        const ms = movsProveedor(x).filter((m) => m.tipo === 'factura' || m.tipo === 'nc' || pagoVigente(m));
        const antes = ms.filter((m) => D(m.fecha) < p.desde), en = ms.filter((m) => enPeriodo(m.fecha, p));
        const s0 = antes.length ? antes[antes.length - 1].saldo : 0, sF = en.length ? en[en.length - 1].saldo : s0;
        const filas = [filaI([new Date(p.desde.getTime() - 1), ['Saldo anterior', x.nombre], null, null, s0])].concat(en.map((m) => filaI([m.fecha, [m.comp, m.tipo === 'factura' ? 'Vence ' + fFecha(m.vence) : m.tipo === 'nc' ? m.detalle || 'Nota de crédito' : (m.medio || '') + (m.retenciones ? ' · retenciones ' + fmt(m.retenciones) : '')], m.tipo === 'factura' ? m.monto : null, m.tipo !== 'factura' ? m.monto : null, m.saldo], m.chequeId ? ['cheque', m.chequeId] : ['proveedor', x.id])));
        const fac = totI(filas, 2), pag = totI(filas, 3);
        const cierres = [cierreI('Saldo anterior más facturas menos pagos y notas de crédito: saldo al cierre', sF, r2(s0 + fac - pag))];
        if (p.incluyeHoy) cierres.push(cierreI('Cierra con la ficha del proveedor: saldo de hoy', ctaProveedor(x).saldo, sF));
        return { kpis: [['ph-clock-counter-clockwise', 'Saldo anterior', fmtM(s0), 'Al ' + fFecha(masDias(p.desde, -1))], ['ph-file-plus', 'Facturas', fmtM(fac), 'Del período'], ['ph-arrow-up-right', 'Pagos y NC', fmtM(pag), 'Órdenes de pago y notas de crédito'], ['ph-scales', 'Saldo al cierre', fmtM(sF), x.condicion, true]],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Comprobante', 'mono'), colI('Factura', 'monto'), colI('Pago o NC', 'monto'), colI('Saldo', 'saldo')], filas }], cierres };
      } },
    { id: 'pagos', g: 'Proveedores', n: 'Pagos', fil: ['tipoProv', 'caja'], clave: 'pagos ordenes de pago retenciones practicadas cheques',
      calc(f, p) {
        const ops = {};
        DB.proveedores.forEach((x) => { if (f.tipoProv && x.tipo !== f.tipoProv) return; x.movs.forEach((m) => {
          if (!pagoVigente(m) || !enPeriodo(m.fecha, p)) return;
          const ch = m.chequeId ? cheque(m.chequeId) : null;
          if (f.caja && m.caja !== f.caja && !(ch && ch.banco === f.caja)) return;
          const k = x.id + '|' + m.op; (ops[k] || (ops[k] = { x, m0: m, ch, ms: [] })).ms.push(m);
        }); });
        const ret = (ms, pre) => sumaPor(ms, (m) => sumaPor((m.ret || []).filter((r) => r.imp.startsWith(pre)), (r) => r.monto));
        const filas = Object.values(ops).sort((a, b) => a.m0.fecha < b.m0.fecha ? -1 : 1).map((o) => filaI([o.m0.fecha, 'OP ' + o.m0.op, [o.x.nombre, o.x.tipo], [o.m0.medio || '', o.ch ? 'Cheque N° ' + o.ch.nro + ' · ' + nombreDe(caja(o.ch.banco)) : nombreDe(caja(o.m0.caja))], o.ms.length, sumaPor(o.ms, (m) => m.monto), ret(o.ms, 'Ganancias'), ret(o.ms, 'IIBB'), sumaPor(o.ms, (m) => m.monto - (m.retenciones || 0))], o.ch ? ['cheque', o.ch.id] : ['proveedor', o.x.id]));
        const pagado = totI(filas, 5);
        return { kpis: [['ph-arrow-up-right', 'Pagado', fmtM(pagado), plural(filas.length, 'orden de pago', 'órdenes de pago'), true], ['ph-receipt-x', 'Retenciones practicadas', fmtM(r2(totI(filas, 6) + totI(filas, 7))), 'Ganancias e Ingresos Brutos'], ['ph-bank', 'Salió de las cajas', fmtM(totI(filas, 8)), 'Neto de retenciones'], ['ph-money', 'Con cheque propio', String(filas.filter((r) => r.ir && r.ir[0] === 'cheque').length), 'Debitan en su fecha']],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Orden', 'mono'), colI('Proveedor'), colI('Medio'), colI('Facturas', 'n'), colI('Pagado', 'monto'), colI('Ganancias', 'monto'), colI('IIBB', 'monto'), colI('Neto', 'monto')], filas }],
          cierres: sinFiltro(f, ['tipoProv', 'caja']) ? [cierreI('Cierra con Proveedores y gastos: pagado en el período', sumaPor(DB.proveedores, (x) => movsProveedorPeriodo(x, p).pagado), pagado)] : [] };
      } },
    { id: 'compras-saldar', g: 'Proveedores', n: 'Compras a saldar', aHoy: true, fil: ['tipoProv', 'proveedor'], clave: 'compras a saldar facturas pendientes vencimientos a pagar',
      calc(f) {
        const pend = DB.proveedores.filter((x) => (!f.tipoProv || x.tipo === f.tipoProv) && (!f.proveedor || x.id === f.proveedor)).flatMap((x) => ctaProveedor(x).pend.map((fc) => ({ x, fc }))).sort((a, b) => a.fc.vence < b.fc.vence ? -1 : 1);
        const grupo = (fc) => diasA(fc.vence) < 0 ? 'vencidas' : diasA(fc.vence) <= 7 ? 'semana' : 'despues';
        const filas = pend.map(({ x, fc }) => filaI([fc.vence, [x.nombre, x.rubro], fc.comp, fc.fecha, estadoVence(fc.vence), fc.saldo], ['proveedor', x.id], grupo(fc)));
        const total = totI(filas, 5), de = (g) => sumaPor(filas.filter((r) => r.g === g), (r) => r.v[5]);
        return { kpis: [['ph-scales', 'A saldar', fmtM(total), plural(filas.length, 'factura', 'facturas'), true], ['ph-warning', 'Vencido', fmtM(de('vencidas')), 'Revisar', de('vencidas') <= 0], ['ph-calendar-check', 'Vence en 7 días', fmtM(de('semana')), 'Hasta el ' + fFecha(masDias(INI_HOY, 7))], ['ph-calendar', 'Más adelante', fmtM(de('despues')), 'Después de esta semana']],
          tablas: [{ cols: [colI('Vence', 'fecha'), colI('Proveedor'), colI('Comprobante', 'mono'), colI('Fecha', 'fecha'), colI('Estado', 'badge'), colI('Saldo', 'monto')], filas, agrupar: { orden: ['vencidas', 'semana', 'despues'], titulo: (g) => ({ vencidas: 'Vencidas', semana: 'Vencen en los próximos 7 días', despues: 'Más adelante' }[g]) } }],
          cierres: sinFiltro(f, ['tipoProv', 'proveedor']) ? [cierreI('Cierra con Proveedores y gastos: deuda total', deudaProveedores(), total)] : [] };
      } },
    { id: 'cheques-debitar', g: 'Proveedores', n: 'Cheques propios a debitar', aHoy: true, fil: ['banco'], clave: 'cheques propios valores diferidos chequera debito',
      calc(f) {
        const chs = chequesADebitar().filter((ch) => !f.banco || ch.banco === f.banco).sort((a, b) => a.debito < b.debito ? -1 : 1);
        const filas = chs.map((ch) => filaI([ch.debito, ch.nro, [nombreDe(proveedor(ch.proveedorId))], ch.emision, 'OP ' + ch.op, estadoVence(ch.debito)[0].replace('Vence', 'Debita').replace('Vencida', 'Venció'), ch.monto], ['cheque', ch.id], ch.banco));
        const total = totI(filas, 6), valores = DB.cajas.find((c) => c.tipo === 'valores');
        return { kpis: [['ph-calendar-check', 'A debitar', fmtM(total), plural(chs.length, 'cheque emitido', 'cheques emitidos'), true], ['ph-clock', 'Debitan en 7 días', fmtM(sumaPor(chs.filter((ch) => diasA(ch.debito) <= 7), (ch) => ch.monto)), 'Hasta el ' + fFecha(masDias(INI_HOY, 7))], ['ph-bank', 'Bancos', String(new Set(chs.map((ch) => ch.banco)).size), 'Con cheques pendientes'], ['ph-calendar-blank', 'Próximo débito', chs[0] ? fFecha(chs[0].debito) : 'Ninguno', chs[0] ? fmt0(chs[0].monto) : 'Nada pendiente']],
          tablas: [{ cols: [colI('Débito', 'fecha'), colI('Cheque', 'mono'), colI('Proveedor'), colI('Emisión', 'fecha'), colI('Orden', 'mono'), colI('Cuándo'), colI('Importe', 'monto')], filas, agrupar: { titulo: (g) => nombreDe(caja(g)) } }],
          cierres: !f.banco && valores ? [cierreI('Cierra con Valores diferidos: pendiente de débito', -saldoCaja(valores.id).saldo, total)] : [] };
      } },

    { id: 'stock-actual', g: 'Productos', n: 'Stock actual', aHoy: true, fil: ['articulos', 'deposito', 'rubro'], modos: [['deposito', 'Por depósito'], ['rubro', 'Por rubro'], ['ubicacion', 'Por ubicación'], ['alerta', 'Solo en alerta']], clave: 'stock existencias inventario ubicacion pasillo estante minimo alerta',
      calc(f) {
        const mat = f.articulos === 'materia';
        const arts = DB.productos.filter((p) => !esCombo(p) && esMateria(p) === mat && (!f.rubro || p.rubro === f.rubro));
        const deps = DB.depositos.filter((d) => !!d.materia === mat && (!f.deposito || d.id === f.deposito));
        const fis = (p) => r2(deps.reduce((s, d) => s + stockFisico(p.id, d.id), 0)), res = (p) => r2(deps.reduce((s, d) => s + stockReservado(p.id, d.id), 0)), disp = (p) => r2(deps.reduce((s, d) => s + (d.noDisponible ? 0 : stockDe(p.id, d.id)), 0));
        const rev = (p) => r2(deps.reduce((s, d) => s + (d.noDisponible ? stockFisico(p.id, d.id) : 0), 0));
        const nombre = (p) => [p.nombre, p.sku];
        let t, cierres = [];
        if (f.modo === 'rubro') {
          const g = {};
          arts.forEach((p) => (g[p.rubro] || (g[p.rubro] = [])).push(p));
          t = { cols: [colI('Rubro'), colI('Artículos', 'n'), colI('Físico', 'cant', { suma: true }), colI('Reservado', 'cant', { suma: true }), colI('Disponible', 'cant', { suma: true }), colI('A revisión', 'cant', { suma: true }), colI('Bajo mínimo', 'n')], filas: Object.keys(g).map((k) => filaI([k, g[k].length, sumaPor(g[k], fis), sumaPor(g[k], res), sumaPor(g[k], disp), sumaPor(g[k], rev), g[k].filter(bajoMinimo).length])) };
        } else if (f.modo === 'ubicacion') {
          const filas = [];
          deps.forEach((d) => arts.forEach((p) => { const u = p.ubic && p.ubic[d.id], n = stockFisico(p.id, d.id); if (u || n) filas.push(filaI([u ? ubicTxt(u) : 'Sin ubicación', nombre(p), n, d.noDisponible ? 0 : stockDe(p.id, d.id)], ['producto', p.id], d.id)); }));
          const orden = deps.map((d) => d.id);
          filas.sort((a, b) => (orden.indexOf(a.g) - orden.indexOf(b.g)) || (a.v[0] < b.v[0] ? -1 : a.v[0] > b.v[0] ? 1 : 0));
          t = { cols: [colI('Ubicación', 'mono', { ayuda: 'Pasillo, estante y nivel' }), colI('Artículo'), colI('Físico', 'cant', { suma: true }), colI('Disponible', 'cant', { suma: true })], filas, agrupar: { titulo: (g) => nombreDe(deposito(g)) } };
        } else if (f.modo === 'alerta') {
          t = { cols: [colI('Artículo'), colI('Disponible', 'cant'), colI('Mínimo', 'cant'), colI('Faltan', 'cant', { suma: true }), colI('Estado', 'badge')], filas: arts.filter(bajoMinimo).map((p) => filaI([nombre(p), stockDe(p.id), p.minimo || 0, r2(Math.max(0, (p.minimo || 0) - stockDe(p.id))), badgeMin(p)], ['producto', p.id])), vacio: 'Nada por debajo del mínimo.' };
        } else if (deps.length === 1) {
          const d = deps[0];
          t = { cols: [colI('Artículo'), colI('Ubicación', 'mono'), colI('Físico', 'cant', { suma: true }), colI('Reservado', 'cant', { suma: true }), colI('Disponible', 'cant', { suma: true }), colI('Estado', 'badge')], filas: arts.map((p) => filaI([nombre(p), ubicTxt(p.ubic && p.ubic[d.id]), stockFisico(p.id, d.id), stockReservado(p.id, d.id), d.noDisponible ? 0 : stockDe(p.id, d.id), badgeMin(p)], ['producto', p.id])) };
        } else {
          t = { cols: [colI('Artículo')].concat(deps.map((d) => colI(depCorto(d), 'cant', { suma: true, ayuda: 'Stock físico en ' + d.nombre }))).concat([colI('Reservado', 'cant', { suma: true }), colI('Disponible', 'cant', { suma: true })]),
            filas: arts.map((p) => filaI([nombre(p)].concat(deps.map((d) => stockFisico(p.id, d.id))).concat([res(p), disp(p)]), ['producto', p.id])) };
          if (!f.deposito && !f.rubro) cierres.push(cierreI('El stock físico total es la suma de los depósitos', sumaPor(arts, (p) => stockFisico(p.id)), sumaPor(t.filas, (r) => r.v.slice(1, 1 + deps.length).reduce((s, n) => s + n, 0))));
        }
        return { kpis: [['ph-warehouse', 'Unidades', fCant(sumaPor(arts, fis)), 'Físico en ' + (deps.length === 1 ? deps[0].nombre : plural(deps.length, 'depósito', 'depósitos')), true], ['ph-check-circle', 'Disponibles', fCant(sumaPor(arts, disp)), 'Físico menos reservado'], ['ph-lock-simple', 'Reservadas', fCant(sumaPor(arts, res)), 'Vendidas y sin remito'], ['ph-warning', 'Bajo mínimo', String(arts.filter(bajoMinimo).length), 'Artículos', !arts.some(bajoMinimo)]],
          tablas: [t], cierres };
      } },
    { id: 'stock-valorizado', g: 'Productos', n: 'Stock actual valorizado', aHoy: true, fil: ['valor', 'articulos', 'deposito'], modos: [['producto', 'Por producto'], ['deposito', 'Por depósito']], clave: 'stock valorizado costo lista de precios revision deposito',
      calc(f) {
        const mat = f.articulos === 'materia', lista = f.valor === 'costo' || mat ? null : f.valor;
        const arts = DB.productos.filter((p) => !esCombo(p) && esMateria(p) === mat).sort((a, b) => a.rubro.localeCompare(b.rubro, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
        const deps = DB.depositos.filter((d) => !!d.materia === mat && (!f.deposito || d.id === f.deposito));
        const disp = deps.filter((d) => !d.noDisponible), rev = deps.filter((d) => d.noDisponible);
        const uEn = (p, ds) => r2(ds.reduce((s, d) => s + stockFisico(p.id, d.id), 0)), vEn = (ps, ds) => r2(ds.reduce((s, d) => s + valorizado(ps, lista, d.id), 0));
        let t;
        if (f.modo === 'deposito') t = { cols: [colI('Depósito'), colI('Artículos', 'n'), colI('Unidades', 'cant', { suma: true }), colI('Valorizado', 'monto')], filas: deps.map((d) => filaI([[d.nombre, d.tipo], arts.filter((p) => stockFisico(p.id, d.id) > 0).length, r2(arts.reduce((s, p) => s + stockFisico(p.id, d.id), 0)), valorizado(arts, lista, d.id)], ['deposito', d.id], d.noDisponible ? 'rev' : 'disp')), agrupar: { orden: ['disp', 'rev'], titulo: (g) => g === 'rev' ? 'No disponible para vender: A revisión' : 'Disponible para vender' } };
        else t = { cols: [colI('Artículo'), colI('Rubro'), colI('Para vender', 'cant', { suma: true, ayuda: 'Unidades en los depósitos disponibles' }), colI(lista ? 'Precio de lista' : 'Costo', 'precio'), colI('Valorizado', 'monto'), colI('A revisión', 'cant', { suma: true }), colI('A revisión $', 'monto')], filas: arts.map((p) => filaI([[p.nombre, p.sku], p.rubro, uEn(p, disp), lista ? precioDe(p, lista) : costoDe(p), vEn([p], disp), uEn(p, rev), vEn([p], rev)], ['producto', p.id])).filter((r) => r.v[2] || r.v[5]) };
        const vDisp = vEn(arts, disp), vRev = vEn(arts, rev), total = r2(vDisp + vRev);
        if (f.modo !== 'deposito') t.pie2 = (rows) => rows.length === t.filas.length ? { txt: 'Total con A revisión', v: { 4: r2(totI(rows, 4) + totI(rows, 6)) } } : null;
        const todo = f.deposito ? valorizado(arts, lista, f.deposito) : valorizado(arts, lista);
        return { kpis: [['ph-currency-circle-dollar', 'Total del stock', fmtM(total), (lista ? 'A lista ' + nombreDe(listaPrecios(lista)) : 'Al costo') + ', con A revisión', true], ['ph-warehouse', 'Disponible para vender', fmtM(vDisp), 'Lo que se puede vender hoy'], ['ph-magnifying-glass', 'A revisión', fmtM(vRev), 'Devoluciones sin revisar, aparte'], ['ph-package', 'Unidades', fCant(sumaPor(arts, (p) => uEn(p, deps))), mat ? 'De materia prima' : 'De productos terminados']],
          tablas: [t], cierres: [cierreI('La suma de los depósitos da el total del stock', todo, f.modo === 'deposito' ? totI(t.filas, 3) : r2(totI(t.filas, 4) + totI(t.filas, 6)))],
          nota: mat && f.valor !== 'costo' ? 'La materia prima se valoriza al costo: no tiene precio de lista.' : 'Los combos no suman: valen sus componentes. Lo que está A revisión va aparte.' };
      } },
    { id: 'movimientos-stock', g: 'Productos', n: 'Movimientos de stock', fil: ['tipoStock', 'deposito', 'operador'], clave: 'movimientos stock transferencias ajustes compras fabricacion devoluciones remitos',
      calc(f, p) {
        const ms = movimientosStock().filter((m) => enPeriodo(m.fecha, p) && (!f.tipoStock || m.tipo === f.tipoStock) && (!f.deposito || m.desde === f.deposito || m.hacia === f.deposito) && (!f.operador || m.operadorId === f.operador));
        const unid = (m) => { const x = producto(m.productoId); return x ? x.unidad || 'un' : ''; };
        const base = (m) => [m.fecha, TIPOS_STOCK[m.tipo], [nombreDe(producto(m.productoId)), unid(m)], [m.desde ? nombreDe(deposito(m.desde)) : 'Entra', m.hacia ? 'a ' + nombreDe(deposito(m.hacia)) : 'Sale'], nombreDe(deposito(m.desde)), nombreDe(deposito(m.hacia))];
        const cols = [colI('Fecha', 'fecha'), colI('Tipo'), colI('Artículo'), colI('Depósitos', 'txt', { soloPantalla: true }), colI('Sale de', 'txt', { soloExcel: true }), colI('Entra a', 'txt', { soloExcel: true })].concat(f.deposito ? [colI('Entró', 'cant', { suma: true }), colI('Salió', 'cant', { suma: true })] : [colI('Cantidad', 'cant')]).concat([colI('Motivo')]);
        const filas = ms.map((m) => filaI(base(m).concat(f.deposito ? [m.hacia === f.deposito ? m.cant : null, m.desde === f.deposito ? m.cant : null] : [m.cant]).concat([[m.motivo, nombreDe(operador(m.operadorId), 'Sistema')]]), m.remitoId ? ['remito', m.remitoId] : ['producto', m.productoId]));
        const de = (t) => ms.filter((m) => m.tipo === t).length;
        return { kpis: f.deposito ? [['ph-arrow-down', 'Entró', fCant(totI(filas, 6)), 'Unidades a ' + nombreDe(deposito(f.deposito)), true], ['ph-arrow-up', 'Salió', fCant(totI(filas, 7)), 'Unidades'], ['ph-scales', 'Neto', fCant(r2(totI(filas, 6) - totI(filas, 7))), 'Entró menos salió'], ['ph-list', 'Movimientos', String(ms.length), 'En el período']]
          : [['ph-list', 'Movimientos', String(ms.length), 'En el período', true], ['ph-receipt', 'Salidas por venta', String(de('venta')), 'Remitos'], ['ph-arrows-left-right', 'Transferencias', String(de('transferencia')), 'Entre depósitos'], ['ph-arrows-down-up', 'Ajustes y fabricación', String(de('ajuste') + de('fabricacion')), 'Con motivo']],
          tablas: [{ cols, filas }] };
      } },
    { id: 'ranking-cantidad', g: 'Productos', n: 'Ranking por cantidad', ver: true, fil: ['canal', 'vendedor', 'operador', 'lista', 'combos'], clave: 'ranking mas vendidos unidades',
      calc(f, p) {
        const rk = rankingProductos(f, p).sort((a, b) => b.u - a.u || b.neto - a.neto);
        const filas = rk.map((z, i) => filaI([i + 1, [z.nombre, z.rubro], z.u, z.n, z.neto], ['producto', z.productoId]));
        return { kpis: [['ph-package', 'Unidades', fCant(totI(filas, 2)), plural(rk.length, 'producto vendido', 'productos vendidos'), true], ['ph-trophy', 'El más vendido', rk[0] ? fCant(rk[0].u) + ' u.' : 'Sin ventas', rk[0] ? rk[0].nombre : ''], ['ph-currency-circle-dollar', 'Facturado sin IVA', fmtM(totI(filas, 4)), 'De estos productos'], ['ph-stack', 'Combos', f.combos === 'desglosar' ? 'Desglosados' : 'Como combo', f.combos === 'desglosar' ? 'Cuentan sus componentes' : 'Cuentan como un producto']],
          tablas: [{ cols: [colI('#', 'n'), colI('Producto'), colI('Unidades', 'cant', { suma: true }), colI('Ventas', 'n'), colI('Facturado sin IVA', 'monto')], filas }], cierres: [cierreRanking(f, p, totI(filas, 4))] };
      } },
    { id: 'ranking-facturacion', g: 'Productos', n: 'Ranking por facturación', ver: true, fil: ['canal', 'vendedor', 'operador', 'lista', 'combos'], clave: 'ranking mayor facturacion',
      calc(f, p) {
        const rk = rankingProductos(f, p).sort((a, b) => b.neto - a.neto), tot = sumaPor(rk, (z) => z.neto);
        const filas = rk.map((z, i) => filaI([i + 1, [z.nombre, z.rubro], z.neto, pctDe(z.neto, tot), z.u], ['producto', z.productoId]));
        return { kpis: [['ph-currency-circle-dollar', 'Facturado sin IVA', fmtM(tot), plural(rk.length, 'producto', 'productos'), true], ['ph-trophy', 'El que más factura', rk[0] ? fmtM(rk[0].neto) : 'Sin ventas', rk[0] ? rk[0].nombre : ''], ['ph-percent', 'Los 3 primeros', fPct(pctDe(sumaPor(rk.slice(0, 3), (z) => z.neto), tot)), 'Del total'], ['ph-package', 'Unidades', fCant(sumaPor(rk, (z) => z.u)), 'Vendidas']],
          tablas: [{ cols: [colI('#', 'n'), colI('Producto'), colI('Facturado sin IVA', 'monto'), colI('% del total', 'pct', { total: (rows) => rows.length ? pctDe(totI(rows, 2), tot) : null }), colI('Unidades', 'cant', { suma: true })], filas }], cierres: [cierreRanking(f, p, tot)] };
      } },
    { id: 'ranking-8020', g: 'Productos', n: 'Ranking 80/20', ver: true, fil: ['canal', 'vendedor', 'operador', 'lista', 'combos'], clave: 'ranking 80 20 pareto clase a b c',
      calc(f, p) {
        const rk = rankingProductos(f, p).sort((a, b) => b.neto - a.neto), tot = sumaPor(rk, (z) => z.neto);
        let acum = 0;
        const filas = rk.map((z, i) => { const antes = pctDe(acum, tot); acum += z.neto; const clase = antes < 80 ? 'A' : antes < 95 ? 'B' : 'C'; return filaI([i + 1, [z.nombre, z.rubro], z.neto, pctDe(z.neto, tot), pctDe(acum, tot), ['Clase ' + clase, clase === 'A' ? 'b-ok' : clase === 'B' ? 'b-info' : 'b-neutro']], ['producto', z.productoId]); });
        const a = filas.filter((r) => r.v[5][0] === 'Clase A');
        return { kpis: [['ph-chart-pie-slice', 'Clase A', plural(a.length, 'producto', 'productos'), fPct(pctDe(a.length, rk.length)) + ' de los productos vendidos', true], ['ph-currency-circle-dollar', 'Facturan', fPct(pctDe(sumaPor(a, (r) => r.v[2]), tot)), 'Del total sin IVA'], ['ph-coins', 'Facturado sin IVA', fmtM(tot), plural(rk.length, 'producto', 'productos')], ['ph-list-numbers', 'Clases B y C', String(rk.length - a.length), 'El resto del surtido']],
          tablas: [{ cols: [colI('#', 'n'), colI('Producto'), colI('Facturado sin IVA', 'monto'), colI('%', 'pct', { total: (rows) => rows.length ? pctDe(totI(rows, 2), tot) : null }), colI('% acumulado', 'pct'), colI('Clase', 'badge')], filas }], cierres: [cierreRanking(f, p, tot)],
          nota: 'Clase A: de mayor a menor, los productos hasta llegar al 80% de lo facturado, incluido el que lo cruza. Clase B: hasta el 95%. Clase C: el resto.' };
      } },
    { id: 'utilidad', g: 'Productos', n: 'Utilidad en ventas', ver: true, fil: ['canal', 'vendedor', 'operador'], modos: [['producto', 'Por producto'], ['venta', 'Por venta'], ['canal', 'Por canal']], clave: 'utilidad margen costo ganancia combos',
      calc(f, p) {
        const vs = ventasFiltradas(f, p).filter((v) => !anulada(v));
        const mg = margenI(4, 2);
        let cols, filas;
        if (f.modo === 'venta') {
          cols = [colI('Venta', 'mono'), colI('Fecha', 'fecha'), colI('Cliente'), colI('Canal', 'canal'), colI('Venta sin IVA', 'monto'), colI('Costo', 'monto'), colI('Utilidad', 'monto'), colI('Margen', 'pct', { total: margenI(6, 4) })];
          filas = vs.map((v) => { const u = utilidadVenta(v); return filaI([String(v.id), v.fecha, [nombreDe(cliente(v.clienteId))], v.canal, u.neto, u.costo, u.utilidad, u.pct], ['venta', v.id]); });
        } else if (f.modo === 'canal') {
          cols = [colI('Canal', 'canal'), colI('Ventas', 'n'), colI('Venta sin IVA', 'monto'), colI('Costo', 'monto'), colI('Utilidad', 'monto'), colI('Margen', 'pct', { total: mg })];
          filas = DB.canales.map((c) => { const xs = vs.filter((v) => v.canal === c.id).map(utilidadVenta); const n = sumaPor(xs, (u) => u.neto), u = sumaPor(xs, (x) => x.utilidad); return filaI([c.id, xs.length, n, sumaPor(xs, (x) => x.costo), u, pctDe(u, n)]); }).filter((r) => r.v[1]);
        } else {
          const m = {};
          vs.forEach((v) => renglonesVenta(v).forEach((x) => { const k = x.productoId || 'servicios'; const y = m[k] || (m[k] = { k, nombre: x.productoId ? x.nombre : 'Envíos y otros servicios', rubro: x.productoId ? (producto(x.productoId) || {}).rubro : 'Servicios', u: 0, neto: 0, costo: 0 }); y.u += x.cant; y.neto += x.neto; y.costo += x.costo; }));
          cols = [colI('Producto'), colI('Unidades', 'cant', { suma: true }), colI('Venta sin IVA', 'monto'), colI('Costo', 'monto', { ayuda: 'El de un combo es la suma de sus componentes' }), colI('Utilidad', 'monto'), colI('Margen', 'pct', { total: mg })];
          filas = Object.values(m).map((y) => { const n = r2(y.neto), c = r2(y.costo); return filaI([[y.nombre, y.rubro], y.u, n, c, r2(n - c), pctDe(n - c, n)], producto(y.k) ? ['producto', y.k] : null); }).sort((a, b) => b.v[4] - a.v[4]);
        }
        const us = vs.map(utilidadVenta), neto = sumaPor(us, (u) => u.neto), costo = sumaPor(us, (u) => u.costo), util = sumaPor(us, (u) => u.utilidad);
        const iU = f.modo === 'venta' ? 6 : 4;
        return { kpis: [['ph-receipt', 'Venta sin IVA', fmtM(neto), plural(vs.length, 'venta', 'ventas')], ['ph-stack', 'Costo', fmtM(costo), 'Guardado en cada renglón al vender'], ['ph-chart-line-up', 'Utilidad', fmtM(util), 'Venta sin IVA menos costo', true], ['ph-percent', 'Margen', fPct(pctDe(util, neto)), 'Sobre la venta sin IVA']],
          tablas: [{ cols, filas }], cierres: [cierreI('Cierra con el bloque Costo y utilidad de cada venta', util, totI(filas, iU))], nota: 'El costo de un combo es la suma de sus componentes: nunca se carga a mano.' };
      } },
    { id: 'materia-prima', g: 'Productos', n: 'Materia prima', aHoy: 'mixto', clave: 'materia prima insumos consumo minimo compras',
      calc(f, p) {
        const ms = movimientosStock().filter((m) => enPeriodo(m.fecha, p));
        const cons = (x) => sumaPor(ms.filter((m) => m.productoId === x.id && m.tipo === 'fabricacion' && m.desde), (m) => m.cant), rec = (x) => sumaPor(ms.filter((m) => m.productoId === x.id && m.tipo === 'compra' && m.hacia), (m) => m.cant);
        const filas = materias().map((x) => filaI([[x.nombre, x.sku], x.unidad, stockFisico(x.id), x.minimo || 0, cons(x), rec(x), costoDe(x), valorizado([x]), badgeMin(x)], ['producto', x.id]));
        return { kpis: [['ph-currency-circle-dollar', 'Valorizado', fmtM(totI(filas, 7)), 'Al costo, al día de hoy', true], ['ph-warning', 'Bajo el mínimo', String(materias().filter(bajoMinimo).length), 'Materiales', !materias().some(bajoMinimo)], ['ph-factory', 'Consumido', fmtM(sumaPor(materias(), (x) => cons(x) * costoDe(x))), 'En el período, al costo'], ['ph-arrow-down', 'Recibido', fmtM(sumaPor(materias(), (x) => rec(x) * costoDe(x))), 'Remitos de compra del período']],
          tablas: [{ cols: [colI('Material'), colI('Unidad'), colI('Stock', 'cant'), colI('Mínimo', 'cant'), colI('Consumido', 'cant', { ayuda: 'En las órdenes del período' }), colI('Recibido', 'cant', { ayuda: 'Remitos de compra del período' }), colI('Costo', 'precio'), colI('Valorizado', 'monto'), colI('Estado', 'badge')], filas }] };
      } },

    { id: 'medios-pago', g: 'Caja y cobranzas', n: 'Medios de pago', ver: true, fil: ['caja', 'vendedor', 'operador'], clave: 'medios de pago efectivo tarjeta mercado pago cheque transferencia',
      nota: 'Cómo se cobró lo vendido en el período, por medio y por caja.',
      calc(f, p) {
        const xs = [];
        ventasFiltradas(f, p).filter((v) => !anulada(v)).forEach((v) => v.cobros.forEach((c) => { if (!f.caja || c.caja === f.caja || cajaDeCobro(v, c) === f.caja) xs.push({ v, c, neto: netoCobro(v, c) }); }));
        const g = {};
        xs.forEach((x) => { const k = x.c.medio + '|' + x.c.caja; (g[k] || (g[k] = [])).push(x); });
        const filas = Object.keys(g).map((k) => { const ys = g[k]; return filaI([ys[0].c.medio, nombreDe(caja(ys[0].c.caja)), ys.length, sumaPor(ys, (x) => x.c.monto), sumaPor(ys, (x) => x.c.monto - x.neto), sumaPor(ys, (x) => x.neto)], ['caja', ys[0].c.caja]); }).sort((a, b) => b.v[3] - a.v[3]);
        const monto = totI(filas, 3);
        return { kpis: [['ph-hand-coins', 'Cobrado', fmtM(monto), plural(xs.length, 'cobro', 'cobros'), true], ['ph-minus-circle', 'Descuentos', fmtM(totI(filas, 4)), 'Comisiones, envíos y retenciones'], ['ph-bank', 'Neto', fmtM(totI(filas, 5)), 'Lo que entra a las cajas'], ['ph-credit-card', 'Medios', String(new Set(xs.map((x) => x.c.medio)).size), 'Distintos']],
          tablas: [{ cols: [colI('Medio'), colI('Caja'), colI('Cobros', 'n'), colI('Monto', 'monto'), colI('Descuentos', 'monto'), colI('Neto', 'monto')], filas }],
          cierres: sinFiltro(f, ['version', 'caja', 'vendedor', 'operador']) ? [cierreI('Cierra con el Panel: cobrado del período', resumen(ventasDelPeriodo()).cobrado, monto)] : [] };
      } },
    { id: 'movimientos-caja', g: 'Caja y cobranzas', n: 'Movimientos de caja', ver: true, fil: ['caja'], oblig: ['caja'], clave: 'movimientos de caja ingresos egresos saldo banco',
      calc(f, p) {
        const c = caja(f.caja);
        if (!c) return { kpis: [], tablas: [{ cols: [colI('Caja')], filas: [], vacio: 'Elegí una caja.' }] };
        const corte = p.incluyeHoy ? FIN_HOY : p.hasta, todas = f.version === 'todas';
        const s0 = saldoCaja(c.id, new Date(p.desde.getTime() - 1)).saldo, sF = saldoCaja(c.id, corte).saldo;
        const verMov = (m) => m.ventaId ? versionDe(venta(m.ventaId)) : c.neutral ? 'Neutral' : 'Oficial';
        const movs = movimientosCaja(c.id).filter((m) => !m.pendiente && D(m.fecha) >= p.desde && D(m.fecha) <= corte && (todas || verMov(m) === (f.version === 'neutral' ? 'Neutral' : 'Oficial'))).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
        let s = s0;
        const filas = (todas ? [filaI([new Date(p.desde.getTime() - 1), ['Saldo anterior', c.nombre], null, null, s0])] : []).concat(movs.map((m) => { s = r2(s + m.monto); return filaI([m.fecha, [m.concepto, m.detalle], m.monto > 0 ? m.monto : null, m.monto < 0 ? -m.monto : null].concat(todas ? [s] : []), m.ventaId ? ['venta', m.ventaId] : m.chequeId ? ['cheque', m.chequeId] : m.proveedorId ? ['proveedor', m.proveedorId] : null); }));
        const ing = totI(filas, 2), egr = totI(filas, 3);
        const pend = sumaPor(movimientosCaja(c.id).filter((m) => m.pendiente && D(m.fecha) <= corte), (m) => m.monto);
        return { kpis: [['ph-clock-counter-clockwise', 'Saldo anterior', fmtM(s0), 'Al ' + fFecha(masDias(p.desde, -1))], ['ph-arrow-down', 'Ingresos', fmtM(ing), plural(movs.filter((m) => m.monto > 0).length, 'movimiento', 'movimientos')], ['ph-arrow-up', 'Egresos', fmtM(egr), plural(movs.filter((m) => m.monto < 0).length, 'movimiento', 'movimientos')], todas ? ['ph-scales', 'Saldo al cierre', fmtM(sF), pend ? 'Además ' + fmt0(pend) + ' a liberar' : 'Al ' + fFecha(corte), true] : ['ph-funnel', 'Versión', f.version === 'neutral' ? 'Neutral' : 'Oficial', 'Solo esos movimientos', true]],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Concepto'), colI('Ingreso', 'monto'), colI('Egreso', 'monto')].concat(todas ? [colI('Saldo', 'saldo', { total: (rows) => rows.length === filas.length ? sF : null })] : []), filas, totalTxt: todas ? 'Total y saldo al ' + fFecha(corte) : 'Total' }],
          cierres: todas ? [cierreI('Saldo anterior más ingresos menos egresos: saldo de la caja al ' + fFecha(corte), sF, r2(s0 + ing - egr))] : [] };
      } },
    { id: 'arqueos', g: 'Caja y cobranzas', n: 'Arqueos', fil: ['caja'], clave: 'arqueos contar caja diferencia efectivo',
      calc(f, p) {
        const as = DB.arqueos.filter((a) => enPeriodo(a.fecha, p) && (!f.caja || a.cajaId === f.caja)).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
        const filas = as.map((a) => filaI([a.fecha, nombreDe(caja(a.cajaId)), a.sistema, a.contado, a.diferencia, a.diferencia ? (a.movId ? ['Ajuste cargado', 'b-info'] : ['Sin ajustar', 'b-warn']) : ['Coincide', 'b-ok'], nombreDe(operador(a.operadorId))], ['caja', a.cajaId]));
        return { kpis: [['ph-scales', 'Arqueos', String(as.length), 'En el período', true], ['ph-warning', 'Con diferencia', String(as.filter((a) => a.diferencia).length), 'Contado distinto del sistema'], ['ph-plus-minus', 'Diferencia total', fmt0(totI(filas, 4)), 'Suma de las diferencias'], ['ph-clock', 'Último', as[0] ? fFecha(as[0].fecha) : 'Sin arqueos', as[0] ? nombreDe(caja(as[0].cajaId)) : '']],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Caja'), colI('Sistema', 'saldo'), colI('Contado', 'saldo'), colI('Diferencia', 'monto'), colI('Ajuste', 'badge'), colI('Operador')], filas, vacio: 'No hubo arqueos en el período.' }] };
      } },
    { id: 'vendedores', g: 'Caja y cobranzas', n: 'Ventas y cobranzas por vendedor', ver: true, fil: ['canal'], clave: 'vendedores ventas cobranzas comisiones mostrador mayorista',
      calc(f, p) {
        const vs = ventasFiltradas(f, p);
        const grupos = DB.vendedores.map((x) => ({ n: [x.nombre, x.baja ? 'Dado de baja' : ''], vs: vs.filter((v) => v.vendedorId === x.id) })).concat([{ n: ['Sin vendedor', 'Tiendas que entran solas'], vs: vs.filter((v) => !v.vendedorId || !vendedor(v.vendedorId)) }]).filter((g) => g.vs.length);
        const filas = grupos.map((g) => { const r = resumen(g.vs); return filaI([g.n, r.n, r.vendido, r.cobrado, sumaPor(g.vs, saldoVenta), new Set(g.vs.filter((v) => !anulada(v)).map((v) => v.clienteId)).size]); });
        const conV = filas.filter((r) => r.v[0][0] !== 'Sin vendedor');
        return { kpis: [['ph-user', 'Vendido con vendedor', fmtM(totI(conV, 2)), plural(conV.length, 'vendedor', 'vendedores'), true], ['ph-hand-coins', 'Cobrado', fmtM(totI(conV, 3)), 'De sus ventas'], ['ph-clock', 'A cobrar', fmtM(totI(conV, 4)), 'Saldo de sus ventas'], ['ph-storefront', 'Sin vendedor', fmtM(totI(filas, 2) - totI(conV, 2)), 'Tiendas']],
          tablas: [{ cols: [colI('Vendedor'), colI('Ventas', 'n'), colI('Vendido', 'monto'), colI('Cobrado', 'monto'), colI('A cobrar', 'monto'), colI('Clientes', 'n')], filas }],
          cierres: sinFiltro(f, ['version', 'canal']) ? [cierreI('Cierra con el Panel: vendido del período', resumen(ventasDelPeriodo()).vendido, totI(filas, 2))] : [] };
      } },
    { id: 'transito', g: 'Caja y cobranzas', n: 'Plata en tránsito', aHoy: true, fil: ['canal'], modos: [['fecha', 'Por fecha'], ['canal', 'Por canal']], clave: 'plata en transito a liberar a liquidar cheques en cartera tiendas tarjetas',
      calc(f) {
        const vs = DB.ventas.filter((v) => esVenta(v) && Math.abs(transitoVenta(v)) > 0.009 && (!f.canal || v.canal === f.canal));
        const entra = (v) => { const ch = v.cobros.find(enCartera); return estadoAcred(v) === 'Cheque en cartera' && ch ? ch.cheque.vence : v.acred.fecha; };
        let t;
        if (f.modo === 'canal') t = { cols: [colI('Canal', 'canal'), colI('Ventas', 'n'), colI('A liberar', 'monto'), colI('A liquidar', 'monto'), colI('Cheques en cartera', 'monto'), colI('Total', 'monto')], filas: DB.canales.map((c) => { const xs = vs.filter((v) => v.canal === c.id), de = (e) => sumaPor(xs.filter((v) => estadoAcred(v) === e), transitoVenta); return filaI([c.id, xs.length, de('A liberar'), de('A liquidar'), de('Cheque en cartera'), sumaPor(xs, transitoVenta)]); }).filter((r) => r.v[1]) };
        else t = { cols: [colI('Entra el', 'fecha'), colI('Venta', 'mono'), colI('Canal', 'canal'), colI('Estado', 'badge'), colI('Neto', 'monto')], filas: vs.slice().sort((a, b) => entra(a) < entra(b) ? -1 : 1).map((v) => { const e = estadoAcred(v); return filaI([entra(v), String(v.id), v.canal, [e, badgeAcred(e)], transitoVenta(v)], ['venta', v.id]); }) };
        const total = sumaPor(vs, transitoVenta);
        return { kpis: [['ph-hourglass-medium', 'En tránsito', fmtM(total), plural(vs.length, 'venta', 'ventas'), true], ['ph-calendar-check', 'Entra en 7 días', fmtM(sumaPor(vs.filter((v) => diasA(entra(v)) <= 7), transitoVenta)), 'Hasta el ' + fFecha(masDias(INI_HOY, 7))], ['ph-money', 'Cheques en cartera', fmtM(sumaPor(vs.filter((v) => estadoAcred(v) === 'Cheque en cartera'), transitoVenta)), 'Para depositar'], ['ph-storefront', 'Tiendas y tarjetas', fmtM(sumaPor(vs.filter((v) => pendienteCanal(v)), transitoVenta)), 'A liberar y a liquidar']],
          tablas: [t], cierres: f.canal ? [] : [cierreI('Cierra con el Panel, todas las fechas: en tránsito', resumen(DB.ventas).transito, total)] };
      } },
    { id: 'conciliacion', g: 'Caja y cobranzas', n: 'Conciliación bancaria', aHoy: true, clave: 'conciliacion bancaria extracto banco diferencia',
      calc() {
        const cs = DB.cajas.filter((c) => c.tipo === 'banco' || c.tipo === 'billetera').map((c) => ({ c, s: saldoCaja(c.id) }));
        const filas = cs.map(({ c, s }) => filaI([[c.nombre, c.fuente], s.saldo, s.fuente, r2(s.fuente - s.saldo), s.conciliado ? ['Conciliado', 'b-ok'] : ['Con diferencia', 'b-bad']], ['caja', c.id]));
        const faltan = cs.filter(({ c }) => c.difExtracto).map(({ c }) => filaI([masDias(INI_HOY, -1), c.nombre, 'Comisión por mantenimiento de cuenta', c.difExtracto], ['caja', c.id]));
        return { kpis: [['ph-check-circle', 'Conciliadas', String(cs.filter((x) => x.s.conciliado).length) + ' de ' + cs.length, 'Bancos y billeteras', cs.every((x) => x.s.conciliado)], ['ph-warning', 'Con diferencia', String(cs.filter((x) => !x.s.conciliado).length), 'Revisar el extracto'], ['ph-plus-minus', 'Diferencia', fmt0(totI(filas, 3)), 'Extracto menos sistema'], ['ph-bank', 'Según el sistema', fmtM(totI(filas, 1)), 'Saldo de hoy']],
          tablas: [{ cols: [colI('Caja'), colI('Según el sistema', 'monto'), colI('Según el extracto', 'monto'), colI('Diferencia', 'monto'), colI('Estado', 'badge')], filas }, { titulo: 'Movimientos del extracto que faltan cargar', cols: [colI('Fecha', 'fecha'), colI('Caja'), colI('Concepto'), colI('Importe', 'monto')], filas: faltan, vacio: 'Todo lo del extracto está cargado.' }],
          cierres: [cierreI('La diferencia es lo del extracto que falta cargar', totI(faltan, 3), totI(filas, 3))] };
      } },
    { id: 'prestamos', g: 'Caja y cobranzas', n: 'Préstamos', aHoy: true, clave: 'prestamos deuda bancaria cuotas adelantos personal',
      calc() {
        const ps = DB.cajas.filter((c) => c.tipo === 'prestamo').map((c) => ({ c, i: prestamoInfo(c) }));
        const filas = ps.map(({ c, i }) => filaI([[c.nombre, (i.recibido ? 'De ' : 'A ') + c.prestamo.contraparte], i.recibido ? ['Recibido', 'b-warn'] : ['Otorgado', 'b-info'], i.capital, i.devuelto, i.falta, c.prestamo.cuotas], ['caja', c.id], i.recibido ? 'recibido' : 'otorgado'));
        const debe = sumaPor(ps.filter((x) => x.i.recibido), (x) => x.i.falta), nosDeben = sumaPor(ps.filter((x) => !x.i.recibido), (x) => x.i.falta);
        return { kpis: [['ph-handshake', 'Falta devolver', fmtM(debe), 'Préstamos que nos dieron', true], ['ph-arrow-u-up-left', 'Nos tienen que devolver', fmtM(nosDeben), 'Préstamos que dimos'], ['ph-list', 'Préstamos', String(ps.length), 'Cada uno es una caja'], ['ph-coins', 'Capital', fmtM(sumaPor(ps, (x) => x.i.capital)), 'Total prestado']],
          tablas: [{ cols: [colI('Préstamo'), colI('Tipo', 'badge'), colI('Capital', 'monto'), colI('Devuelto', 'monto'), colI('Falta', 'monto'), colI('Cuotas', 'n')], filas, agrupar: { orden: ['recibido', 'otorgado'], titulo: (g) => g === 'recibido' ? 'Préstamos recibidos' : 'Préstamos otorgados' }, subtotal: true }],
          cierres: [cierreI('Cierra con el Panel: préstamos por devolver', prestamosPor('recibido'), debe)] };
      } },

    { id: 'iva-ventas', g: 'Contables', n: 'Libro de IVA Ventas detallado', contable: true, fil: ['pv'], clave: 'libro iva ventas facturas notas de credito debito puntos de venta',
      calc(f, p) {
        /* orden del libro: tipo de comprobante, punto de venta y número */
        const cs = comprobantesVenta(p, f.pv).sort((a, b) => (ORDEN_COMP.indexOf(a.tipo) - ORDEN_COMP.indexOf(b.tipo)) || (a.pv < b.pv ? -1 : a.pv > b.pv ? 1 : 0) || (a.nro < b.nro ? -1 : a.nro > b.nro ? 1 : 0));
        const filas = cs.map((x) => filaI([x.fecha, x.tipo.slice(-1) + ' ' + x.pv + '-' + x.nro, x.tipo, x.pv, x.nro, [x.cliente.nombre, x.cliente.doc], x.cliente.nombre, x.cliente.doc, x.neto, x.exento, x.iva21, x.iva105, x.percIva, x.percIibb, x.total], ['venta', x.v.id], x.tipo));
        const TIT = { 'Factura A': 'Facturas A', 'Nota de débito A': 'Notas de débito A', 'Nota de crédito A': 'Notas de crédito A (restan)', 'Factura B': 'Facturas B', 'Nota de débito B': 'Notas de débito B', 'Nota de crédito B': 'Notas de crédito B (restan)' };
        const total = totI(filas, 14), cr = cruceLibroPanel(p, f.pv);
        const tablas = [{ tarjeta: 'libro', cols: [colI('Fecha', 'fecha', { rol: 'fecha' }), colI('Comprobante', 'mono', { soloPantalla: true, rol: 'comp' }), colI('Tipo', 'txt', { soloExcel: true }), colI('Punto de venta', 'mono', { soloExcel: true }), colI('Número', 'mono', { soloExcel: true }), colI('Cliente y CUIT', 'txt', { soloPantalla: true, rol: 'cli' }), colI('Razón social', 'txt', { soloExcel: true }), colI('CUIT o DNI', 'mono', { soloExcel: true }),
          colI('Neto gravado', 'monto'), colI('Exento', 'monto', { ayuda: 'Exento y no gravado: depósito en garantía por pallets' }), colI('IVA 21%', 'monto'), colI('IVA 10,5%', 'monto'), colI('Perc. IVA', 'monto', { ayuda: 'Percepciones de IVA' }), colI('Perc. IIBB', 'monto', { ayuda: 'Percepciones de Ingresos Brutos' }), colI('Total', 'monto', { rol: 'total' })], filas, agrupar: { orden: ORDEN_COMP, titulo: (g) => TIT[g] || g } }];
        const cierres = [cierreI('Cierra con el Panel: ventas oficiales del período' + (cr.ncOtro ? ', más notas de crédito de ventas de otro período' : ''), cr.libro, total)];
        if (!f.pv) {
          const porPv = DB.puntosVenta.map((pv) => { const xs = comprobantesVenta(p, pv.nro); return filaI([pv.nro, pv.nombre, xs.length, sumaPor(xs, (x) => x.neto), sumaPor(xs, (x) => x.iva), sumaPor(xs, (x) => x.tributos), sumaPor(xs, (x) => x.total)], ['ir', 'informe/iva-ventas?pv=' + pv.nro]); }).filter((r) => r.v[2]);
          tablas.push({ titulo: 'Por punto de venta', cols: [colI('Punto de venta', 'mono'), colI('Nombre'), colI('Comprobantes', 'n'), colI('Neto gravado', 'monto'), colI('IVA', 'monto'), colI('Percepciones', 'monto'), colI('Total', 'monto')], filas: porPv });
          cierres.push(cierreI('Todos los puntos de venta juntos dan la suma de cada uno', totI(porPv, 6), total));
        }
        return { kpis: [['ph-scales', 'Neto gravado', fmtM(totI(filas, 8)), plural(cs.length, 'comprobante', 'comprobantes')], ['ph-percent', 'IVA débito fiscal', fmtM(r2(totI(filas, 10) + totI(filas, 11))), '21% y 10,5%', true], ['ph-receipt', 'Percepciones', fmtM(r2(totI(filas, 12) + totI(filas, 13))), 'IVA ' + fmtM(totI(filas, 12)) + ' · IIBB ' + fmtM(totI(filas, 13))], ['ph-coins', 'Total', fmtM(total), f.pv ? 'Punto de venta ' + f.pv : 'Todos los puntos de venta']], tablas, cierres };
      } },
    { id: 'iva-compras', g: 'Contables', n: 'Libro de IVA Compras detallado', contable: true, clave: 'libro iva compras credito fiscal percepciones no gravado',
      calc(f, p) {
        const cc = comprobantesCompra(p, true);
        const filas = cc.map((x) => filaI([x.fecha, x.m.comp.replace(/^Factura /, '').replace(/^Nota de crédito /, 'NC '), x.m.tipoComp, x.m.pv, x.m.nro, [x.prov.nombre, x.prov.cuit], x.prov.nombre, x.prov.cuit, x.m.neto, x.m.noGravado, x.m.iva, x.m.alic, x.percIva, x.percIibb, x.m.monto], ['proveedor', x.prov.id]));
        return { kpis: [['ph-scales', 'Neto gravado', fmtM(totI(filas, 8)), plural(cc.length, 'comprobante', 'comprobantes')], ['ph-percent', 'IVA crédito fiscal', fmtM(totI(filas, 10)), '21%, 10,5% y 27%', true], ['ph-receipt', 'Percepciones', fmtM(r2(totI(filas, 12) + totI(filas, 13))), 'De IVA e Ingresos Brutos'], ['ph-coins', 'Total', fmtM(totI(filas, 14)), 'Facturas de compra']],
          tablas: [{ tarjeta: 'libro', cols: [colI('Fecha', 'fecha', { rol: 'fecha' }), colI('Comprobante', 'mono', { soloPantalla: true, rol: 'comp' }), colI('Tipo', 'txt', { soloExcel: true }), colI('Punto de venta', 'mono', { soloExcel: true }), colI('Número', 'mono', { soloExcel: true }), colI('Proveedor y CUIT', 'txt', { soloPantalla: true, rol: 'cli' }), colI('Razón social', 'txt', { soloExcel: true }), colI('CUIT', 'mono', { soloExcel: true }), colI('Neto gravado', 'monto'), colI('No gravado', 'monto', { ayuda: 'No gravado y exento' }), colI('IVA', 'monto'), colI('Alíc.', 'pct', { ayuda: 'Alícuota de IVA' }), colI('Perc. IVA', 'monto'), colI('Perc. IIBB', 'monto'), colI('Total', 'monto', { rol: 'total' })], filas }] };
      } },
    { id: 'posicion-iva', g: 'Contables', n: 'Posición de IVA del mes', contable: true, clave: 'posicion iva debito credito fiscal saldo declaracion jurada',
      nota: 'Para la declaración jurada, elegí el mes completo en el calendario.',
      calc(f, p) {
        const cv = comprobantesVenta(p), cc = comprobantesCompra(p, true);
        const pos = cv.filter((x) => x.signo > 0), neg = cv.filter((x) => x.signo < 0), conPerc = cc.filter((x) => x.percIva);
        const deb = sumaPor(pos, (x) => x.iva), nc = sumaPor(neg, (x) => x.iva), cred = sumaPor(cc, (x) => x.m.iva), perc = sumaPor(cc, (x) => x.percIva);
        const filas = [filaI([['Facturas y notas de débito', 'IVA de las ventas'], pos.length, deb], ['ir', 'informe/iva-ventas'], 'debito'), filaI([['Notas de crédito', 'Restan'], neg.length, nc], null, 'debito'),
          filaI([['Facturas de compra', 'IVA de las compras'], cc.length, -cred], ['ir', 'informe/iva-compras'], 'credito'),
          filaI([['Percepciones de IVA sufridas', 'Las que nos cobraron los proveedores'], conPerc.length, -perc], ['ir', 'informe/perc-proveedores'], 'pagos'), filaI([['Retenciones de IVA sufridas', 'Ninguna en el período'], 0, 0], null, 'pagos')];
        const saldo = totI(filas, 2);
        const alics = [21, 10.5, 27].map((a) => { const d = sumaPor(cv, (x) => sumaPor(x.alicuotas.filter((y) => y.alic === a), (y) => y.iva)), c = sumaPor(cc.filter((x) => x.m.alic === a), (x) => x.m.iva); return filaI([fPct(a), d, c, r2(d - c)]); }).filter((r) => r.v[1] || r.v[2]);
        return { kpis: [['ph-arrow-up-right', 'Débito fiscal', fmtM(r2(deb + nc)), 'Ventas menos notas de crédito'], ['ph-arrow-down-left', 'Crédito fiscal', fmtM(cred), plural(cc.length, 'factura de compra', 'facturas de compra')], ['ph-receipt-x', 'Percepciones de IVA', fmtM(perc), 'A cuenta del impuesto'], ['ph-scales', saldo >= 0 ? 'Saldo a pagar' : 'Saldo a favor', fmtM(Math.abs(saldo)), p.fechas, true]],
          tablas: [{ cols: [colI('Concepto'), colI('Comprobantes', 'n'), colI('Importe', 'monto')], filas, agrupar: { orden: ['debito', 'credito', 'pagos'], titulo: (g) => ({ debito: 'Débito fiscal', credito: 'Crédito fiscal', pagos: 'Percepciones y retenciones sufridas' }[g]) }, totalTxt: saldo >= 0 ? 'Saldo a pagar' : 'Saldo a favor' },
            { titulo: 'Por alícuota', cols: [colI('Alícuota'), colI('Débito', 'monto'), colI('Crédito', 'monto'), colI('Diferencia', 'monto')], filas: alics }],
          cierres: [cierreI('El débito fiscal es el IVA del Libro de IVA Ventas', r2(deb + nc), sumaPor(cv, (x) => x.iva21 + x.iva105))] };
      } },
    { id: 'libro-excel', g: 'Contables', n: 'Libro de compras y ventas a Excel', contable: true, modos: [['ventas', 'Ventas'], ['compras', 'Compras']], clave: 'libro compras ventas excel exportar',
      nota: 'Pensado para bajar a Excel: un renglón por comprobante, con todas sus columnas.',
      calc(f, p) {
        const perc = (x, imp) => sumaPor(x.percepciones.filter((q) => q.imp === imp), (q) => q.monto);
        if (f.modo === 'compras') {
          const cc = comprobantesCompra(p);
          const filas = cc.map((x) => filaI([x.fecha, x.m.comp.replace(/^Factura /, '').replace(/^Nota de crédito /, 'NC ').replace(/^Liquidación /, 'Liq. ').replace(/^Obligación /, 'Oblig. '), x.m.tipoComp, x.m.pv || '', x.m.nro || '', [x.prov.nombre, x.prov.cuit || ''], x.prov.nombre, x.prov.cuit || 'No aplica', x.prov.jurisdiccion || '', x.m.neto, x.m.noGravado, x.m.iva, x.percIva, x.percIibb, x.m.monto], ['proveedor', x.prov.id]));
          return { kpis: [['ph-files', 'Comprobantes', String(cc.length), 'De compra', true], ['ph-scales', 'Neto gravado', fmtM(totI(filas, 9)), 'Con IVA'], ['ph-percent', 'IVA', fmtM(totI(filas, 11)), 'Crédito fiscal'], ['ph-coins', 'Total', fmtM(totI(filas, 14)), 'Facturas y gastos']],
            tablas: [{ tarjeta: 'libro', cols: [colI('Fecha', 'fecha', { rol: 'fecha' }), colI('Comprobante', 'mono', { soloPantalla: true, rol: 'comp' }), colI('Tipo', 'txt', { soloExcel: true }), colI('Punto de venta', 'mono', { soloExcel: true }), colI('Número', 'mono', { soloExcel: true }), colI('Proveedor', 'txt', { soloPantalla: true, rol: 'cli' }), colI('Razón social', 'txt', { soloExcel: true }), colI('CUIT', 'mono', { soloExcel: true }), colI('Jurisdicción', 'txt', { soloExcel: true }), colI('Neto gravado', 'monto'), colI('No gravado', 'monto'), colI('IVA', 'monto'), colI('Perc. IVA', 'monto'), colI('Perc. IIBB', 'monto'), colI('Total', 'monto', { rol: 'total' })], filas }] };
        }
        const cv = comprobantesVenta(p);
        const filas = cv.map((x) => filaI([x.fecha, x.tipo.slice(-1) + ' ' + x.pv + '-' + x.nro, x.tipo, x.pv, x.nro, [x.cliente.nombre, x.cliente.doc], x.cliente.nombre, x.cliente.doc, x.cliente.iva, x.cliente.jurisdiccion || '', x.neto, x.exento, x.iva21, x.iva105, x.tributos, perc(x, 'IIBB Buenos Aires'), perc(x, 'IIBB CABA'), perc(x, 'IVA'), x.total], ['venta', x.v.id]));
        return { kpis: [['ph-files', 'Comprobantes', String(cv.length), 'De venta, solo Oficial', true], ['ph-scales', 'Neto gravado', fmtM(totI(filas, 10)), 'Notas de crédito restadas'], ['ph-percent', 'IVA', fmtM(r2(totI(filas, 12) + totI(filas, 13))), 'Débito fiscal'], ['ph-coins', 'Total', fmtM(totI(filas, 18)), 'Igual al Libro de IVA Ventas']],
          tablas: [{ tarjeta: 'libro', cols: [colI('Fecha', 'fecha', { rol: 'fecha' }), colI('Comprobante', 'mono', { soloPantalla: true, rol: 'comp' }), colI('Tipo', 'txt', { soloExcel: true }), colI('Punto de venta', 'mono', { soloExcel: true }), colI('Número', 'mono', { soloExcel: true }), colI('Cliente', 'txt', { soloPantalla: true, rol: 'cli' }), colI('Razón social', 'txt', { soloExcel: true }), colI('CUIT o DNI', 'mono', { soloExcel: true }), colI('Condición IVA', 'txt', { soloExcel: true }), colI('Jurisdicción', 'txt', { soloExcel: true }), colI('Neto gravado', 'monto'), colI('Exento', 'monto'), colI('IVA 21%', 'monto'), colI('IVA 10,5%', 'monto'), colI('Percepciones', 'monto', { soloPantalla: true }), colI('Perc. IIBB Bs. As.', 'monto', { soloExcel: true }), colI('Perc. IIBB CABA', 'monto', { soloExcel: true }), colI('Perc. IVA', 'monto', { soloExcel: true }), colI('Total', 'monto', { rol: 'total' })], filas }] };
      } },
    infIIBB('arba', 'Percepciones y retenciones de Buenos Aires', 'IIBB Buenos Aires', 'ARBA'),
    infIIBB('agip', 'Percepciones y retenciones de CABA', 'IIBB CABA', 'AGIP'),
    { id: 'sufridas', g: 'Contables', n: 'Retenciones y percepciones sufridas', contable: true, archivo: true, modos: [['todas', 'Todas'], ['retenciones', 'Retenciones'], ['percepciones', 'Percepciones']], clave: 'retenciones percepciones sufridas deducciones sifere a favor',
      calc(f, p) {
        const rets = f.modo === 'percepciones' ? [] : retencionesSufridas(p).map((r) => ({ fecha: r.fecha, g: 'Retenciones de Ingresos Brutos', jur: r.jur, agente: r.agente, cuit: r.cuit, comp: compTxt(r.v), monto: r.monto, ir: ['venta', r.v.id], iibb: true }));
        const percs = f.modo === 'retenciones' ? [] : comprobantesCompra(p).flatMap((x) => (x.m.perc || []).filter((q) => q.monto > 0).map((q) => ({ fecha: x.fecha, g: q.imp === 'IVA' ? 'Percepciones de IVA' : 'Percepciones de Ingresos Brutos', jur: q.imp === 'IVA' ? 'Nacional' : q.imp.replace('IIBB ', ''), agente: x.prov.nombre, cuit: x.prov.cuit, comp: x.m.comp, monto: q.monto, ir: ['proveedor', x.prov.id], iibb: q.imp !== 'IVA' })));
        const xs = rets.concat(percs).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
        const filas = xs.map((x) => filaI([x.fecha, x.jur, [x.agente], x.cuit, x.comp, x.monto], x.ir, x.g));
        const de = (g) => sumaPor(xs.filter((x) => x.g === g), (x) => x.monto);
        const lineas = xs.filter((x) => x.iibb && COD_JUR[x.jur]).map((x) => COD_JUR[x.jur] + x.cuit + fechaBarra(x.fecha) + (x.g.startsWith('Retenciones') ? '0001' + ceros(x.comp, 16) : ceros(x.comp.slice(-13, -9), 4) + ceros(x.comp, 16)) + 'F' + 'A' + ceros(x.comp, 20) + importeComa(x.monto, 11));
        const cj = DB.cajas.find((c) => c.tipo === 'retenciones');
        return { kpis: [['ph-receipt-x', 'Retenciones', fmtM(de('Retenciones de Ingresos Brutos')), 'Que nos hicieron al cobrar', true], ['ph-receipt', 'Percepciones de IIBB', fmtM(de('Percepciones de Ingresos Brutos')), 'De las compras'], ['ph-percent', 'Percepciones de IVA', fmtM(de('Percepciones de IVA')), 'A cuenta del IVA'], ['ph-coins', 'Total a favor', fmtM(totI(filas, 5)), plural(xs.length, 'comprobante', 'comprobantes')]],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Jurisdicción'), colI('Agente'), colI('CUIT', 'mono'), colI('Comprobante', 'mono'), colI('Importe', 'monto')], filas, agrupar: { orden: ['Retenciones de Ingresos Brutos', 'Percepciones de Ingresos Brutos', 'Percepciones de IVA'] } }],
          archivo: { nombre: 'SIFERE-' + CUIT_EMPRESA.replace(/\D/g, '') + '-' + aaaamm(p) + '.txt', lineas },
          cierres: f.modo !== 'percepciones' && cj ? [cierreI('Cierra con la caja Retenciones: lo que entró en el período', sumaPor(movimientosCaja(cj.id).filter((m) => m.ventaId && enPeriodo(m.fecha, p)), (m) => m.monto), de('Retenciones de Ingresos Brutos'))] : [] };
      } },
    { id: 'jurisdiccion', g: 'Contables', n: 'Ventas por jurisdicción (Convenio Multilateral)', contable: true, archivo: true, clave: 'ventas por jurisdiccion convenio multilateral cm05 sifere coeficientes provincias',
      calc(f, p) {
        const cv = comprobantesVenta(p), g = {};
        cv.forEach((x) => { const j = x.cliente.jurisdiccion || 'Buenos Aires'; (g[j] || (g[j] = [])).push(x); });
        const tot = sumaPor(cv, (x) => x.neto);
        const filas = Object.keys(g).map((j) => filaI([j, COD_JUR[j] || '', g[j].length, sumaPor(g[j], (x) => x.neto), pctDe(sumaPor(g[j], (x) => x.neto), tot)])).sort((a, b) => b.v[3] - a.v[3]);
        const lineas = filas.map((r) => (r.v[1] || '000') + ';' + textoFijo(r.v[0], 20).trim() + ';' + importeComa(r.v[3], 15) + ';' + (tot ? (r.v[3] / tot).toFixed(4).replace('.', ',') : '0,0000'));
        return { kpis: [['ph-scales', 'Neto gravado', fmtM(tot), plural(cv.length, 'comprobante', 'comprobantes'), true], ['ph-map-trifold', 'Jurisdicciones', String(filas.length), 'Con ventas en el período'], ['ph-crown', 'La de más ventas', filas[0] ? fPct(filas[0].v[4]) : 'Sin ventas', filas[0] ? filas[0].v[0] : ''], ['ph-file-arrow-down', 'Archivo', plural(lineas.length, 'línea', 'líneas'), 'Base imponible por jurisdicción']],
          tablas: [{ cols: [colI('Jurisdicción'), colI('Código', 'mono'), colI('Comprobantes', 'n'), colI('Neto gravado', 'monto'), colI('Participación', 'pct', { total: (rows) => rows.length ? pctDe(totI(rows, 3), tot) : null })], filas }],
          archivo: { nombre: 'VENTAS-JURISDICCION-' + aaaamm(p) + '.txt', lineas }, nota: 'Por la jurisdicción del cliente. Las notas de crédito restan.' };
      } },
    { id: 'perc-proveedores', g: 'Contables', n: 'Percepciones de proveedores', contable: true, clave: 'percepciones de proveedores compras iibb iva exportar',
      calc(f, p) {
        const cc = comprobantesCompra(p);
        const xs = cc.flatMap((x) => (x.m.perc || []).filter((q) => q.monto > 0).map((q) => ({ x, q })));
        const filas = xs.map(({ x, q }) => filaI([x.fecha, [x.prov.nombre, x.prov.rubro], x.prov.cuit, x.m.comp, q.imp === 'IVA' ? 'Nacional' : q.imp.replace('IIBB ', ''), q.monto], ['proveedor', x.prov.id], q.imp === 'IVA' ? 'Percepciones de IVA' : 'Percepciones de Ingresos Brutos'));
        const de = (g) => sumaPor(filas.filter((r) => r.g === g), (r) => r.v[5]);
        return { kpis: [['ph-receipt', 'Percepciones', fmtM(totI(filas, 5)), plural(new Set(xs.map((y) => y.x.m.id)).size, 'factura', 'facturas'), true], ['ph-percent', 'De IVA', fmtM(de('Percepciones de IVA')), 'A cuenta del IVA'], ['ph-map-pin', 'De Ingresos Brutos', fmtM(de('Percepciones de Ingresos Brutos')), 'Buenos Aires y CABA'], ['ph-truck', 'Proveedores', String(new Set(xs.map((y) => y.x.prov.id)).size), 'Que nos percibieron']],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Proveedor'), colI('CUIT', 'mono'), colI('Comprobante', 'mono'), colI('Jurisdicción'), colI('Importe', 'monto')], filas, agrupar: {} }],
          cierres: [cierreI('Cierra con el Libro de IVA Compras: percepciones', sumaPor(comprobantesCompra(p, true), (x) => x.perc), totI(filas, 5))] };
      } },
    { id: 'sicore', g: 'Contables', n: 'SICORE: percepciones de IVA y retenciones', contable: true, archivo: true, modos: [['todo', 'Todo'], ['retenciones', 'Retenciones de Ganancias'], ['percepciones', 'Percepciones de IVA']], clave: 'sicore ganancias iva archivo retenciones percepciones',
      calc(f, p) {
        const rets = f.modo === 'percepciones' ? [] : retencionesPracticadas(p).filter((r) => r.imp === 'Ganancias').map((r) => ({ fecha: r.fecha, g: '217 · Ganancias', comp: 'OP ' + r.op, nro: r.op, cod: '06', sujeto: r.prov.nombre, cuit: r.prov.cuit, reg: '078', base: r.base, monto: r.monto, total: r.base, op: '1', ir: ['proveedor', r.prov.id] }));
        const percs = f.modo === 'retenciones' ? [] : comprobantesVenta(p).flatMap((x) => x.percepciones.filter((q) => q.imp === 'IVA' && q.monto).map((q) => ({ fecha: x.fecha, g: '767 · IVA', comp: x.comp, nro: x.pv + x.nro, cod: x.signo < 0 ? '03' : '01', sujeto: x.cliente.nombre, cuit: x.cliente.doc, reg: '493', base: x.neto, monto: q.monto, total: x.total, op: '2', ir: ['venta', x.v.id] })));
        const xs = rets.concat(percs).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
        const filas = xs.map((x) => filaI([x.fecha, x.comp, [x.sujeto], x.cuit, x.reg, x.base, x.monto], x.ir, x.g));
        const lineas = xs.map((x) => x.cod + fechaBarra(x.fecha) + ceros(x.nro, 16) + importeComa(x.total, 16) + x.g.slice(0, 3) + x.reg + x.op + importeComa(x.base, 14) + fechaBarra(x.fecha) + '01' + '0' + importeComa(x.monto, 14) + '000,00' + ' '.repeat(10) + '80' + ceros(x.cuit, 20) + ceros('', 14));
        const de = (g) => sumaPor(xs.filter((x) => x.g === g), (x) => x.monto);
        return { kpis: [['ph-receipt-x', 'Retenciones de Ganancias', fmtM(de('217 · Ganancias')), 'Practicadas al pagar'], ['ph-percent', 'Percepciones de IVA', fmtM(de('767 · IVA')), 'Practicadas al facturar'], ['ph-coins', 'Total a depositar', fmtM(totI(filas, 6)), plural(xs.length, 'comprobante', 'comprobantes'), true], ['ph-file-arrow-down', 'Archivo', plural(lineas.length, 'línea', 'líneas'), 'Para importar en SICORE']],
          tablas: [{ cols: [colI('Fecha', 'fecha'), colI('Comprobante', 'mono'), colI('Sujeto'), colI('CUIT', 'mono'), colI('Régimen', 'mono'), colI('Base imponible', 'monto'), colI('Importe', 'monto')], filas, agrupar: { orden: ['217 · Ganancias', '767 · IVA'], titulo: (g) => 'Impuesto ' + g } }],
          archivo: { nombre: 'SICORE-' + CUIT_EMPRESA.replace(/\D/g, '') + '-' + aaaamm(p) + '.txt', lineas } };
      } },
    { id: 'iva-digital', g: 'Contables', n: 'Libro de IVA Digital', contable: true, archivo: true, modos: [['ventas', 'Ventas'], ['compras', 'Compras']], clave: 'libro iva digital citi archivo ventas compras',
      calc(f, p) {
        let filas, lineas, nombre;
        if (f.modo === 'compras') {
          const cc = comprobantesCompra(p, true);
          filas = cc.map((x) => filaI([x.fecha, x.signo < 0 ? '003' : '001', x.m.comp.replace(/^Factura /, '').replace(/^Nota de crédito /, 'NC '), [x.prov.nombre, x.prov.cuit], x.prov.cuit, x.m.neto, x.m.iva, r2(x.perc + x.m.noGravado), x.m.monto], ['proveedor', x.prov.id]));
          lineas = cc.map((x) => fechaAMD(x.fecha) + (x.signo < 0 ? '003' : '001') + ceros(x.m.pv, 5) + ceros(x.m.nro, 20) + ' '.repeat(16) + '80' + ceros(x.prov.cuit, 20) + textoFijo(x.prov.nombre, 30) + importeCent(x.m.monto, 15) + importeCent(x.m.noGravado, 15) + importeCent(0, 15) + importeCent(x.percIva, 15) + importeCent(0, 15) + importeCent(x.percIibb, 15) + importeCent(0, 15) + importeCent(0, 15) + 'PES' + '0001000000' + '1' + '0' + importeCent(x.m.iva, 15) + importeCent(0, 15) + ceros('', 11) + ' '.repeat(30) + importeCent(0, 15));
          nombre = 'LIBRO_IVA_DIGITAL_COMPRAS_CBTE_' + aaaamm(p) + '.txt';
        } else {
          const cv = comprobantesVenta(p);
          filas = cv.map((x) => filaI([x.fecha, COD_CBTE[x.tipo] || '', x.tipo.slice(-1) + ' ' + x.pv + '-' + x.nro, [x.cliente.nombre, x.cliente.doc], x.cliente.doc, x.neto, x.iva, x.tributos, x.total], ['venta', x.v.id]));
          const perc = (x, iva) => Math.abs(sumaPor(x.percepciones.filter((q) => (q.imp === 'IVA') === iva), (q) => q.monto));
          lineas = cv.map((x) => fechaAMD(x.fecha) + (COD_CBTE[x.tipo] || '000') + ceros(x.pv, 5) + ceros(x.nro, 20) + ceros(x.nro, 20) + docCod(x.cliente.doc) + ceros(x.cliente.doc, 20) + textoFijo(x.cliente.nombre, 30) + importeCent(x.total, 15) + importeCent(0, 15) + importeCent(0, 15) + importeCent(Math.abs(x.exento), 15) + importeCent(perc(x, true), 15) + importeCent(perc(x, false), 15) + importeCent(0, 15) + importeCent(0, 15) + 'PES' + '0001000000' + x.alicuotas.length + '0' + importeCent(0, 15) + '00000000');
          nombre = 'LIBRO_IVA_DIGITAL_VENTAS_CBTE_' + aaaamm(p) + '.txt';
        }
        return { kpis: [['ph-files', 'Comprobantes', String(filas.length), f.modo === 'compras' ? 'De compra' : 'De venta, solo Oficial', true], ['ph-scales', 'Neto gravado', fmtM(totI(filas, 5)), 'Notas de crédito restadas'], ['ph-percent', 'IVA', fmtM(totI(filas, 6)), f.modo === 'compras' ? 'Crédito fiscal' : 'Débito fiscal'], ['ph-file-arrow-down', 'Archivo', plural(lineas.length, 'línea', 'líneas'), f.modo === 'compras' ? 'Comprobantes de compra' : 'Comprobantes de venta']],
          tablas: [{ tarjeta: 'libro', cols: [colI('Fecha', 'fecha', { rol: 'fecha' }), colI('Código', 'mono'), colI('Comprobante', 'mono', { rol: 'comp' }), colI(f.modo === 'compras' ? 'Proveedor y CUIT' : 'Cliente y CUIT', 'txt', { rol: 'cli' }), colI('CUIT o DNI', 'mono', { soloExcel: true }), colI('Neto gravado', 'monto'), colI('IVA', 'monto'), colI('Otros tributos', 'monto'), colI('Total', 'monto', { rol: 'total' })], filas }],
          archivo: { nombre, lineas } };
      } },
    { id: 'padron', g: 'Contables', n: 'Padrón de alícuotas', contable: true, aHoy: true, modos: [['todos', 'Todos'], ['clientes', 'Clientes'], ['proveedores', 'Proveedores']], busqueda: 'Buscá por CUIT o razón social', clave: 'padron arba agip alicuotas cuit consulta percepcion retencion',
      nota: 'En el sistema real el padrón de ARBA y AGIP se actualiza solo cada mes. Acá, las alícuotas de la base de ejemplo.',
      calc(f) {
        const alic = (arr, imp) => { const x = arr.find((y) => y.imp === imp); return x ? x.alic : null; };
        const clis = f.modo === 'proveedores' ? [] : DB.clientes.filter((c) => String(c.doc).includes('-')).map((c) => filaI([c.doc, [c.nombre, c.localidad], 'Cliente', c.jurisdiccion || '', alic(c.percepciones, 'IIBB Buenos Aires'), alic(c.percepciones, 'IIBB CABA'), alic(c.percepciones, 'IVA'), null, null], ['cliente', c.id]));
        const provs = f.modo === 'clientes' ? [] : DB.proveedores.filter((x) => x.cuit).map((x) => { const r = REGLAS.retencionesPago(x, 100); return filaI([x.cuit, [x.nombre, x.rubro], 'Proveedor', x.jurisdiccion || '', null, null, null, alic(r, 'IIBB ' + x.jurisdiccion) || (r.find((y) => y.imp.startsWith('IIBB')) || {}).alic || null, alic(r, 'Ganancias')], ['proveedor', x.id]); });
        const filas = clis.concat(provs);
        return { kpis: [['ph-identification-card', 'CUIT en la base', String(filas.length), 'Clientes y proveedores', true], ['ph-receipt', 'Con percepción', String(clis.filter((r) => r.v[4] || r.v[5] || r.v[6]).length), 'Clientes a los que les percibimos'], ['ph-receipt-x', 'Con retención', String(provs.filter((r) => r.v[7] || r.v[8]).length), 'Proveedores a los que les retenemos'], ['ph-cloud-arrow-down', 'Padrón', 'Al ' + fFecha(HOY), 'Consulta simulada']],
          tablas: [{ cols: [colI('CUIT', 'mono'), colI('Razón social'), colI('Es'), colI('Jurisdicción'), colI('Perc. IIBB Bs. As.', 'pct'), colI('Perc. IIBB CABA', 'pct'), colI('Perc. IVA', 'pct'), colI('Ret. IIBB', 'pct'), colI('Ret. Ganancias', 'pct')], filas }] };
      } }
  ];
  const INF = {}; INFS.forEach((d) => { INF[d.id] = d; });

  /* ---------- el motor: filtros, cálculo, búsqueda y totales ---------- */
  const filtrosDe = (def) => (def.ver ? ['version'] : []).concat(def.fil || []);
  const opcionesFiltro = (def, k, actual) => { const o = FILTROS[k].ops(actual); return (def.oblig || []).includes(k) ? o.filter((x) => x[0] !== '') : o; };
  /* Los filtros salen de la dirección (o de un objeto, en las pruebas). Un valor que no está entre las opciones se ignora. */
  function filtrosInforme(def, params) {
    const get = (k) => { if (!params) return null; const x = typeof params.get === 'function' ? params.get(k) : params[k]; return x == null ? null : String(x); };
    const f = { q: get('q') || '' };
    if (def.modos) { const m = get('modo'); f.modo = def.modos.some((x) => x[0] === m) ? m : def.modos[0][0]; }
    filtrosDe(def).forEach((k) => { const x = get(k), o = opcionesFiltro(def, k, x); f[k] = o.some((y) => y[0] === x) ? x : (o[0] || [''])[0]; });
    return f;
  }
  const sumaCol = (c) => c.suma != null ? c.suma : c.tipo === 'monto';
  function textoCelda(c, x) {
    if (x == null || x === '') return '';
    if (c.tipo === 'fecha') return fFecha(x);
    if (c.tipo === 'canal') return nombreDe(canal(x), x);
    if (c.tipo === 'badge') return x[0];
    if (Array.isArray(x)) return x.filter((y) => y !== '' && y != null).join(' · ');
    return x;
  }
  function prepararTabla(t, q) {
    const vis = q ? t.filas.filter((r) => coincide(t.cols.map((c, i) => textoCelda(c, r.v[i])).join(' '), q)) : t.filas;
    const sumar = (rows) => t.cols.map((c, i) => c.total ? c.total(rows) : sumaCol(c) ? totI(rows, i) : null);
    return Object.assign({}, t, { vis, tot: sumar(vis), sumar });
  }
  /* Calcula un informe con sus filtros: la misma cuenta para la pantalla, el Excel y las pruebas. */
  function calcularInforme(id, params) {
    const def = INF[id];
    if (!def || !def.calc) return null;
    const f = filtrosInforme(def, params), p = periodo();
    const R = def.calc(f, p) || {};
    const q = sinAcentos(f.q.trim());
    R.f = f; R.def = def; R.p = p;
    R.kpis = R.kpis || [];
    R.tablas = (R.tablas || []).map((t) => prepararTabla(t, q));
    R.cierres = q ? [] : (R.cierres || []);
    if (q && R.tablas[0]) R.kpis = kpisDeBusqueda(R.tablas[0], f.q.trim());
    return R;
  }
  /* Con una búsqueda, los indicadores se rehacen con los renglones que quedan: la cantidad y hasta tres totales de la tabla.
     Cada uno guarda su valor y su columna (x[5] y x[6]) para poder comprobarlo. */
  function kpisDeBusqueda(t, q) {
    const cols = t.cols.map((c, i) => i).filter((i) => !t.cols[i].soloExcel && !t.cols[i].total && t.tot[i] != null && t.cols[i].tipo === 'monto');
    const conValor = cols.filter((i) => t.tot[i]);
    const elegidas = Array.from(new Set((conValor.length ? [conValor[0], conValor[Math.floor(conValor.length / 2)], conValor[conValor.length - 1]] : cols.slice(0, 1)).filter((i) => i != null)));
    return [['ph-magnifying-glass', 'Renglones', t.vis.length + ' de ' + t.filas.length, 'Con la búsqueda "' + q + '"', true, t.vis.length, null]]
      .concat(elegidas.map((i) => ['ph-sigma', t.cols[i].t, fmtM(t.tot[i]), 'De los renglones que se ven', false, t.tot[i], i]));
  }

  /* ---------- dibujo ---------- */
  const ES_NUM = { monto: 1, precio: 1, saldo: 1, cant: 1, n: 1, pct: 1 };
  /* Las tablas anchas (8 columnas o más) van más densas y sin el signo $ en cada celda. */
  const fmtSin = (n) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function celdaInf(c, x, th, densa) {
    const vacio = x == null || x === '';
    const cls = [ES_NUM[c.tipo] ? 'num' : '', c.tipo === 'mono' ? 'mono' : '', !ES_NUM[c.tipo] && !['mono', 'canal', 'badge', 'fecha'].includes(c.tipo) && (c.corta || densa) ? 'trunc' : '', c.rol ? 'r-' + c.rol : '', th && c.total ? 'propio' : '', !vacio && ES_NUM[c.tipo] && c.tipo !== 'n' && c.tipo !== 'pct' && Math.abs(Number(x)) < 0.005 ? 'cero' : ''].filter(Boolean).join(' ');
    const ab = '<td' + (th ? ' data-th="' + esc(th) + '"' : '') + (cls ? ' class="' + cls + '"' : '') + '>';
    if (vacio) return ab + '</td>';
    const dos = (y) => Array.isArray(y) ? esc(y[0]) + (y[1] ? '<span class="sec">' + esc(y[1]) + '</span>' : '') : esc(y);
    switch (c.tipo) {
      case 'monto': case 'precio': case 'saldo': return ab + (densa ? fmtSin(x) : fmt(x)) + '</td>';
      case 'cant': return ab + fCant(x) + '</td>';
      case 'n': return ab + esc(x) + '</td>';
      case 'pct': return ab + fPct(x) + '</td>';
      case 'fecha': return ab + fFecha(x) + '</td>';
      case 'canal': return ab + chipCanal(x) + '</td>';
      case 'badge': return ab + '<span class="badge ' + esc(x[1]) + '">' + esc(x[0]) + '</span></td>';
      default: return ab + dos(x) + '</td>';
    }
  }
  /* En pantalla se ven los primeros renglones (los totales son siempre de todos). Exportar e Imprimir llevan todo. */
  const LIMITE_INF = 150, LIMITE_GRUPO = 60;
  function tablaInf(t, todo) {
    const ver = t.cols.map((c, i) => c.soloExcel ? -1 : i).filter((i) => i >= 0);
    const n = ver.length, hayTot = t.tot.some((x, i) => x != null && !t.cols[i].soloExcel), densa = n >= 8;
    let quedan = todo ? Infinity : LIMITE_INF;
    const fila = (r) => quedan-- > 0 ? filaInf(r) : '';
    const filaInf = (r) => '<tr' + (r.ir ? ' class="clic" data-' + r.ir[0] + '="' + esc(r.ir[1]) + '"' : '') + '>' + ver.map((i) => celdaInf(t.cols[i], r.v[i], '', densa)).join('') + '</tr>';
    const filaTot = (txt, tot, conTh) => ver.map((i, k) => k === 0 ? '<td>' + esc(txt) + '</td>' : tot[i] == null ? '<td></td>' : celdaInf(t.cols[i], tot[i], conTh ? t.cols[i].t : '', densa)).join('');
    let cuerpo = '';
    if (t.agrupar && t.vis.length) {
      const orden = [];
      t.vis.forEach((r) => { if (!orden.includes(r.g)) orden.push(r.g); });
      if (t.agrupar.orden) orden.sort((a, b) => (t.agrupar.orden.indexOf(a) + 1 || 99) - (t.agrupar.orden.indexOf(b) + 1 || 99));
      orden.forEach((g) => {
        const rs = t.vis.filter((r) => r.g === g), tit = t.agrupar.titulo ? t.agrupar.titulo(g) : g;
        if (!todo) quedan = LIMITE_GRUPO;
        cuerpo += '<tr class="grupo"><td colspan="' + n + '">' + esc(tit) + '</td></tr>' + rs.map(fila).join('') + (hayTot ? '<tr class="subtotal">' + filaTot('Subtotal', t.sumar(rs)) + '</tr>' : '');
      });
    } else cuerpo = t.vis.map(fila).join('');
    if (!t.vis.length) cuerpo = '<tr><td colspan="' + n + '"><div class="vacio-estado"><i class="ph ph-magnifying-glass"></i><p>' + esc(t.vacio || 'No hay datos con estos filtros.') + '</p></div></td></tr>';
    const vistos = todo ? t.vis.length : t.agrupar ? Array.from(new Set(t.vis.map((r) => r.g))).reduce((s2, g) => s2 + Math.min(LIMITE_GRUPO, t.vis.filter((r) => r.g === g).length), 0) : Math.min(LIMITE_INF, t.vis.length);
    const corto = vistos < t.vis.length;
    const pie2 = typeof t.pie2 === 'function' ? t.pie2(t.vis) : null;
    return (t.titulo ? '<h2 class="grupo-t">' + esc(t.titulo) + '</h2>' : '') +
      '<div class="tabla-wrap"><table class="compacta inf' + (densa ? ' densa' : '') + (t.tarjeta ? ' ' + t.tarjeta : '') + '"><thead><tr>' + ver.map((i) => t.cols[i]).map((c) => '<th' + (ES_NUM[c.tipo] ? ' class="num"' : '') + (c.ayuda ? ' title="' + esc(c.ayuda) + '"' : '') + '>' + esc(c.t) + '</th>').join('') + '</tr></thead><tbody>' + cuerpo + '</tbody>' +
      (hayTot && t.vis.length ? '<tfoot><tr>' + filaTot(t.totalTxt || 'Total', t.tot, true) + '</tr>' + (pie2 ? '<tr class="pie2">' + filaTot(pie2.txt, t.cols.map((c, i) => pie2.v[i] == null ? null : pie2.v[i]), true) + '</tr>' : '') + '</tfoot>' : '') + '</table>' +
      (corto ? '<div class="mas"><span class="nota" style="margin:0 10px 0 0">Se ven ' + vistos + ' de ' + t.vis.length + ' renglones. Los totales son de todos.</span><button type="button" class="btn" data-accion="inf-todo">Mostrar todos</button></div>' : '') + '</div>';
  }
  const MEJORAS_INF = [['ph-calendar-blank', 'Un solo calendario para todos los informes'], ['ph-stack', 'Libro de IVA con todos los puntos de venta en una sola corrida'], ['ph-file-xls', 'Todo exporta a Excel'], ['ph-shield-check', 'Lo Neutral nunca entra en lo contable']];
  function vInformes() {
    const q = sinAcentos(UI.informes.q.trim());
    const vis = INFS.filter((d) => !q || coincide(d.n + ' ' + d.g + ' ' + (d.clave || ''), q));
    const cards = GRUPOS_INF.map((g) => {
      const items = vis.filter((d) => d.g === g);
      if (!items.length) return '';
      return '<section class="card"><div class="card-h"><h2>' + esc(g) + '</h2><span class="sub">' + (g === 'Contables' ? 'Solo Oficial' : plural(items.length, 'informe', 'informes')) + '</span></div><div class="card-b"><ul class="inf-lista">' +
        items.map((d) => '<li><a href="#/' + (d.link || 'informe/' + d.id) + '"><i class="ph ' + (d.link ? 'ph-squares-four' : d.archivo ? 'ph-file-arrow-down' : 'ph-chart-bar') + '"></i><span>' + esc(d.n) + '</span>' + (d.aHoy === true ? '<span class="tag">A hoy</span>' : d.archivo ? '<span class="tag">Archivo</span>' : '') + '</a></li>').join('') + '</ul></div></section>';
    }).join('');
    return '<div class="encabezado"><div><h1>Informes</h1><p>Todos salen de la misma base: si dos informes miran lo mismo, dan el mismo número.</p></div></div>' +
      '<ul class="inf-mejoras">' + MEJORAS_INF.map(([ic, t]) => '<li><i class="ph ' + ic + '"></i>' + esc(t) + '</li>').join('') + '</ul>' +
      '<div class="toolbar inf-tool"><div class="filtros"><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-informes-q" placeholder="Buscar un informe" value="' + esc(UI.informes.q) + '" aria-label="Buscar un informe"></label>' + (q ? '<span class="nota" style="margin:0">' + plural(vis.length, 'informe', 'informes') + '</span>' : '') + '</div></div>' +
      '<p class="nota inf-leyenda"><span class="tag">A hoy</span> una foto de hoy: no usa el calendario. <span class="tag">Archivo</span> además de la tabla, arma el archivo para presentar.</p>' +
      (cards ? '<div class="informes-grid">' + cards + '</div>' : '<div class="vacio-estado"><i class="ph ph-magnifying-glass"></i><p>Ningún informe se llama así.</p></div>');
  }
  function vInforme(partes, params) {
    const def = INF[partes[1]];
    if (!def || !def.calc) return '<div class="vacio-estado"><i class="ph ph-file-x"></i><p>Informe no encontrado.</p><a class="btn" href="#/informes">Volver a informes</a></div>';
    const R = calcularInforme(def.id, params), f = R.f, p = R.p;
    const bajada = (def.aHoy === true ? 'Al día de hoy, ' + fFecha(HOY) : def.aHoy === 'mixto' ? 'Stock al día de hoy · movimientos: ' + p.texto : p.texto) + (def.contable ? ' · Solo Oficial: lo Neutral no entra' : '');
    const def0 = filtrosInforme(def, null);
    const sucio = !!f.q || filtrosDe(def).some((k) => f[k] !== def0[k]);
    const sel = (k) => '<div class="filtro"><span class="filtro-l">' + esc(FILTROS[k].l) + '</span><select class="input" data-inf-filtro="' + k + '" aria-label="' + esc(FILTROS[k].l) + '">' + opciones(opcionesFiltro(def, k, f[k]), f[k]) + '</select></div>';
    const todos = filtrosDe(def), prim = todos.length > 3 ? todos.slice(0, 2) : todos, sec = todos.length > 3 ? todos.slice(2) : [];
    const activos = sec.filter((k) => f[k] !== def0[k]).length;
    const selects = prim.map(sel).join('') + (sec.length ? '<details class="mas-filtros"' + (activos ? ' open' : '') + '><summary class="btn ghost"><i class="ph ph-sliders-horizontal"></i>Más filtros' + (activos ? ' (' + activos + ')' : '') + '</summary><div class="mas-filtros-c">' + sec.map(sel).join('') + '</div></details>' : '');
    const modos = def.modos ? '<div class="segmentado" role="group" aria-label="Cómo verlo">' + def.modos.map(([k, n]) => '<button type="button" data-accion="inf-modo" data-modo="' + k + '" aria-pressed="' + (f.modo === k) + '">' + esc(n) + '</button>').join('') + '</div>' : '';
    const k = R.kpis.length;
    const ar = R.archivo;
    return '<div class="inf-membrete solo-impresion">Flia. HDC Group · CUIT ' + esc(CUIT_EMPRESA) + ' · emitido el ' + fFecha(HOY) + ' · Datos de ejemplo</div>' +
      '<div class="encabezado"><div><a href="#/informes" class="btn ghost sm" style="margin-left:-10px"><i class="ph ph-arrow-left"></i>Informes · ' + esc(def.g) + '</a><h1>' + esc(def.n) + '</h1><p>' + esc(bajada) + '</p></div><div class="acciones">' +
        '<button type="button" class="btn" data-accion="exportar-informe" data-id="' + def.id + '"><i class="ph ph-file-xls"></i>Exportar a Excel</button><button type="button" class="btn" data-accion="imprimir-informe" data-id="' + def.id + '"><i class="ph ph-printer"></i>Imprimir</button>' +
        (ar ? '<button type="button" class="btn primary" data-accion="descargar-archivo" data-id="' + def.id + '"' + (ar.lineas.length ? '' : ' disabled') + '><i class="ph ph-download-simple"></i>Descargar archivo</button>' : '') + '</div></div>' +
      (modos ? '<div class="inf-modos">' + modos + '</div>' : '') +
      '<div class="toolbar inf-tool"><div class="filtros"><div class="filtro buscar-f"><span class="filtro-l">Buscar</span><label class="buscar"><i class="ph ph-magnifying-glass"></i><input class="input" type="search" id="f-inf-q" placeholder="' + esc(def.busqueda || 'Buscar en el informe') + '" value="' + esc(f.q) + '" aria-label="Buscar en el informe"></label></div>' +
        (def.aHoy === true ? '' : '<div class="filtro"><span class="filtro-l">Período</span>' + selectorFechas() + '</div>') + selects +
        (sucio ? '<button type="button" class="btn ghost" data-accion="limpiar-informe"><i class="ph ph-x"></i>Limpiar</button>' : '') + '</div></div>' +
      '<p class="inf-filtros-txt"><b>Filtros:</b> ' + esc(textoFiltrosInf(def, f, p)) + '</p>' +
      (f.q.trim() ? '<p class="nota">Con la búsqueda, los indicadores y los totales son de los renglones que se ven. Los cruces se ven sin búsqueda.</p>' : '') +
      (k ? '<div class="kpis' + (k < 4 ? ' k' + k : '') + '">' + R.kpis.map((x) => kpi(x[0], x[1], x[2], x[3], x[4])).join('') + '</div>' : '') +
      (R.cierres.length ? '<div class="cierres">' + R.cierres.map((c) => '<div class="cierre' + (c.ok ? '' : ' mal') + '"><i class="ph-fill ' + (c.ok ? 'ph-check-circle' : 'ph-warning-circle') + '"></i><span>' + esc(c.txt) + '</span><span class="num">' + fmt(c.valor) + '</span></div>').join('') + '</div>' : '') +
      R.tablas.map((t) => tablaInf(t, UI.informes.todo === def.id)).join('') +
      (ar ? '<section class="card archivo"><div class="card-h"><h2>Vista previa del archivo</h2><span class="sub mono">' + esc(ar.nombre) + '</span></div><div class="card-b">' + (ar.lineas.length ? '<pre class="previa">' + esc(ar.lineas.slice(0, 8).join('\n')) + '</pre><p class="nota" style="margin:8px 0 0">' + plural(ar.lineas.length, 'línea', 'líneas') + (ar.lineas.length > 8 ? ', se ven las primeras 8' : '') + '. Diseño de registro del organismo, con los datos de ejemplo.</p>' : '<p class="nota" style="margin:0">No hay nada para presentar en este período.</p>') + '</div></section>' : '') +
      (R.nota || def.nota ? '<p class="nota" style="margin-top:12px">' + esc(R.nota || def.nota) + '</p>' : '');
  }
  /* La línea "Filtros:" que se ve en pantalla y sale impresa: período (o a hoy), modo, cada filtro y la búsqueda. */
  function textoFiltrosInf(def, f, p) {
    const partes = [def.aHoy === true ? 'Al día de hoy, ' + fFecha(HOY) : 'Período ' + p.fechas];
    if (def.modos) partes.push('Ver ' + (def.modos.find((m) => m[0] === f.modo) || def.modos[0])[1].toLowerCase());
    filtrosDe(def).forEach((k) => { const o = opcionesFiltro(def, k, f[k]).find((x) => x[0] === f[k]); partes.push(FILTROS[k].l + ': ' + (o ? o[1] : '')); });
    if (f.q.trim()) partes.push('Búsqueda: "' + f.q.trim() + '"');
    if (def.contable) partes.push('Solo Oficial');
    return partes.join(' · ');
  }
  /* Cambiar un filtro reescribe la dirección (sin crear historial) y redibuja: el filtro queda al refrescar. */
  function fijarFiltroInf(k, val) {
    const { partes, params } = ruta();
    if (partes[0] !== 'informe') return;
    if (val == null || val === '') params.delete(k); else params.set(k, val);
    const qs = params.toString();
    history.replaceState(null, '', '#/informe/' + partes[1] + (qs ? '?' + qs : ''));
    refrescar();
  }
  const nombreArchivoInf = (R) => 'informe-' + R.def.id + (R.def.aHoy === true ? '-al-' + toISODate(INI_HOY) : '-' + RANGO.desde + '-a-' + RANGO.hasta);
  /* Exportar a Excel: lo mismo que se ve, con los filtros y la búsqueda, los subtotales y el total. */
  function exportarInforme(id, params) {
    const R = calcularInforme(id, params || ruta().params);
    if (!R) return null;
    const lineas = [];
    R.tablas.forEach((t, i) => {
      const ex = t.cols.map((c, j) => c.soloPantalla ? -1 : j).filter((j) => j >= 0);
      const fila = (r) => ex.map((j) => textoCelda(t.cols[j], r.v[j]));
      const tot = (txt, x) => ex.map((j, k) => k === 0 ? txt : x[j] == null ? '' : x[j]);
      if (i) { lineas.push([]); if (t.titulo) lineas.push([t.titulo]); lineas.push(ex.map((j) => t.cols[j].t)); }
      const hayTot = t.tot.some((x) => x != null);
      if (t.agrupar) {
        const orden = [];
        t.vis.forEach((r) => { if (!orden.includes(r.g)) orden.push(r.g); });
        if (t.agrupar.orden) orden.sort((a, b) => (t.agrupar.orden.indexOf(a) + 1 || 99) - (t.agrupar.orden.indexOf(b) + 1 || 99));
        orden.forEach((g) => { const rs = t.vis.filter((r) => r.g === g), tit = t.agrupar.titulo ? t.agrupar.titulo(g) : g; lineas.push([tit]); rs.forEach((r) => lineas.push(fila(r))); if (hayTot) lineas.push(tot('Subtotal ' + tit, t.sumar(rs))); });
      } else t.vis.forEach((r) => lineas.push(fila(r)));
      if (hayTot && t.vis.length) lineas.push(tot(t.totalTxt || 'Total', t.tot));
      const pie2 = typeof t.pie2 === 'function' ? t.pie2(t.vis) : null;
      if (pie2 && t.vis.length) lineas.push(tot(pie2.txt, t.cols.map((c, j) => pie2.v[j] == null ? null : pie2.v[j])));
    });
    if (!R.tablas.some((t) => t.vis.length)) return null;
    const cab = R.tablas[0] ? R.tablas[0].cols.filter((c) => !c.soloPantalla).map((c) => c.t) : [];
    descargarCSV(nombreArchivoInf(R), cab, lineas);
    return { cab, lineas };
  }
  function descargarArchivoInf(id, params) {
    const R = calcularInforme(id, params || ruta().params);
    if (!R || !R.archivo || !R.archivo.lineas.length) return null;
    descargar(R.archivo.nombre, R.archivo.lineas.join('\r\n') + '\r\n', 'text/plain;charset=utf-8');
    return R.archivo;
  }
  function descargarCSV(nombre, cols, filas) {
    const linea = (arr) => arr.map((x) => { const s = typeof x === 'number' ? String(x).replace('.', ',') : String(x == null ? '' : x); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    descargar(nombre + '.csv', '﻿' + [linea(cols)].concat(filas.map(linea)).join('\r\n'), 'text/csv;charset=utf-8');
  }
  /* Baja un archivo armado en el navegador: el Excel (CSV) o el .txt de un archivo de presentación. */
  function descargar(nombre, contenido, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
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

  const opciones = (pares, sel) => pares.map(([v, t]) => '<option value="' + esc(v) + '"' + (String(v) === String(sel == null ? '' : sel) ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
  const pieModal = (id, txt) => '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn primary" id="' + id + '">' + esc(txt || 'Guardar') + '</button></div>';
  const numOpc = (s) => String(s || '').trim() === '' ? 0 : parseNum(s);

  /* ---------- nueva venta ---------- */
  function modalNuevaVenta(version, clienteId) {
    const tipos = ['Oficial', 'Neutral', 'Seña', 'Cotización'];
    const nombres = { Oficial: 'Venta oficial', Neutral: 'Neutral', Seña: 'Seña', Cotización: 'Cotización' };
    const cli0 = clienteId ? cliente(clienteId) : null;
    const manuales = DB.canales.filter((c) => c.conexion === 'manual');
    const canal0 = cli0 && cli0.tipo !== 'Consumidor final' ? 'mayorista' : 'mostrador';
    const deps = DB.depositos.filter((d) => !d.materia && !d.noDisponible);
    const filaAjuste = (tipo, nombre, ej) => '<div class="ajuste" data-ajuste="' + tipo + '"><span class="aj-n">' + nombre + '</span><select class="input aj-modo" aria-label="' + nombre + ': en porcentaje o en monto"><option value="pct">%</option><option value="monto">$</option></select><input class="input num aj-valor" inputmode="decimal" placeholder="0" aria-label="' + nombre + ': valor"><input class="input aj-concepto" placeholder="' + ej + '" aria-label="' + nombre + ': concepto"></div>';
    abrirModal(cabModal('Nueva operación') +
      '<div class="m-b">' +
        '<div class="segmentado" role="group" aria-label="Tipo">' + tipos.map((t) => '<button type="button" data-tipo="' + t + '" aria-pressed="' + (t === version) + '">' + nombres[t] + '</button>').join('') + '</div>' +
        '<div class="fila-2"><div class="campo"><label for="nv-canal">Canal</label><select class="input" id="nv-canal">' + opciones(manuales.map((c) => [c.id, c.nombre]), canal0) + '</select></div>' +
        '<div class="campo sugerencias"><label for="nv-cliente">Cliente</label><input class="input" id="nv-cliente" autocomplete="off" placeholder="Nombre, CUIT o DNI" value="' + esc(cli0 ? cli0.nombre : '') + '" data-id="' + esc(cli0 ? cli0.id : '') + '"><div class="lista"></div><span class="ayuda" id="nv-cli-info">' + (cli0 ? esc(cli0.iva) : 'Si no está, se carga desde Clientes') + '</span></div></div>' +
        '<div class="fila-2"><div class="campo"><label for="nv-vendedor">Vendedor</label><select class="input" id="nv-vendedor">' + opciones([['', 'Elegir vendedor']].concat(activos('vendedores').map((x) => [x.id, x.nombre])), cli0 ? cli0.vendedorId : '') + '</select></div>' +
        '<div class="campo"><label for="nv-deposito">Sale del depósito</label><select class="input" id="nv-deposito">' + opciones(deps.map((d) => [d.id, d.nombre]), canal(canal0).deposito) + '</select></div></div>' +
        '<div class="campo"><label>Productos</label><div class="renglon con-bonif cab"><span>Producto</span><span>Cant.</span><span>Bonif. %</span><span></span></div><div id="nv-renglones" style="display:grid;gap:8px"></div><button type="button" class="btn sm" id="nv-agregar" style="align-self:flex-start"><i class="ph ph-plus"></i>Agregar producto</button></div>' +
        '<div class="campo"><label>Bonificación y recargo</label>' + filaAjuste('bonificacion', 'Bonificación', 'Ej: pago anticipado') + filaAjuste('recargo', 'Recargo', 'Ej: recargo Mutual') + '</div>' +
        '<div class="fila-2" id="nv-cobro-fila"><div class="campo"><label for="nv-cobro">Cobro</label><select class="input" id="nv-cobro"></select><span class="ayuda" id="nv-cobro-info"></span></div>' +
        '<div class="campo" id="nv-sena-campo" hidden><label for="nv-sena">Monto de la seña</label><input class="input num" id="nv-sena" inputmode="decimal" placeholder="0,00"></div></div>' +
        '<div class="fila-2" id="nv-cheque" hidden><div class="campo"><label for="nv-chq-nro">Número de cheque</label><input class="input mono" id="nv-chq-nro" inputmode="numeric"></div><div class="campo"><label for="nv-chq-vto">Vencimiento</label><input class="input" type="date" id="nv-chq-vto" value="' + toISODate(masDias(INI_HOY, 30)) + '"></div></div>' +
        '<div class="desglose" id="nv-desglose" hidden></div>' +
        '<div class="total-modal"><span id="nv-comp">Factura B</span><b id="nv-total">$ 0,00</b></div>' +
      '</div>' + pieModal('nv-guardar'), (m) => {
      let tipo = version;
      const cliIn = $('#nv-cliente', m), cobroSel = $('#nv-cobro', m), cont = $('#nv-renglones', m);
      const listaActual = () => { const c = cliente(cliIn.dataset.id); return c ? c.lista || 'minorista' : ($('#nv-canal', m).value === 'mayorista' ? 'mayorista' : 'minorista'); };
      const cobroActual = () => { const p = cobroSel.value.split('|'); return { cajaId: p[0], medio: p[1] }; };
      const pintarCobros = () => {
        const antes = cobroSel.value;
        const ops = opcionesCobro(tipo, true).filter((o) => !(tipo === 'Seña' && o.medio === 'Cuenta corriente'));
        setHTML(cobroSel, opciones(ops.map((o) => [o.cajaId + '|' + o.medio, o.label]), antes));
        if (!ops.some((o) => o.cajaId + '|' + o.medio === antes)) cobroSel.selectedIndex = 0;
      };
      /* si la caja elegida cobra con recargo, se sugiere solo (y se quita solo si se cambia de caja) */
      const sugerirRecargo = () => {
        const cj = caja(cobroActual().cajaId), fila = $('[data-ajuste="recargo"]', m), val = $('.aj-valor', fila);
        if (cj && cj.recargo && (val.value.trim() === '' || fila.dataset.auto)) { $('.aj-modo', fila).value = 'pct'; val.value = String(cj.recargo).replace('.', ','); $('.aj-concepto', fila).value = 'Recargo ' + cj.nombre; fila.dataset.auto = '1'; }
        else if ((!cj || !cj.recargo) && fila.dataset.auto) { val.value = ''; $('.aj-concepto', fila).value = ''; fila.dataset.auto = ''; }
      };
      const leer = () => {
        const renglones = $$('.renglon', cont).map((r) => ({ p: producto($('.r-prod', r).dataset.id), cant: parseInt($('.r-cant', r).value, 10), bonif: numOpc($('.r-bonif', r).value), toc: $('.r-prod', r).value.trim() !== '' }));
        const ajustes = $$('.ajuste', m).map((f) => ({ tipo: f.dataset.ajuste, modo: $('.aj-modo', f).value, valor: numOpc($('.aj-valor', f).value), concepto: $('.aj-concepto', f).value.trim() })).filter((a) => a.valor || a.concepto);
        const cobro = cobroActual();
        if (caja(cobro.cajaId) && caja(cobro.cajaId).tipo === 'cheques') cobro.cheque = { nro: $('#nv-chq-nro', m).value.trim(), vence: $('#nv-chq-vto', m).value ? new Date($('#nv-chq-vto', m).value + 'T12:00:00').toISOString() : '' };
        return { renglones, datos: { version: tipo, canalId: $('#nv-canal', m).value, clienteId: cliIn.dataset.id, vendedorId: $('#nv-vendedor', m).value, depositoId: $('#nv-deposito', m).value, items: renglones.filter((r) => r.p).map((r) => ({ productoId: r.p.id, cant: r.cant, bonif: r.bonif })), ajustes, cobro, sena: parseNum($('#nv-sena', m).value) } };
      };
      function recalcular() {
        const { renglones, datos } = leer();
        const c = cliente(datos.clienteId), l = listaActual();
        const lineas = renglones.filter((r) => r.p && r.cant > 0 && r.bonif >= 0 && r.bonif < 100).map((r) => ({ cant: r.cant, precio: precioDe(r.p, l), bonif: r.bonif, alic: r.p.alic == null ? 21 : r.p.alic }));
        const k = REGLAS.calcularVenta({ items: lineas, ajustes: datos.ajustes.filter((a) => a.valor > 0), cliente: c, version: tipo });
        $('#nv-total', m).textContent = fmt(k.total);
        $('#nv-comp', m).textContent = tipo === 'Oficial' ? 'Factura ' + (c ? letraDe(c) : 'B') : tipo === 'Neutral' ? 'Comprobante interno, sin IVA' : tipo === 'Seña' ? 'Recibo de seña' : 'Cotización (no mueve stock ni caja)';
        $('#nv-cobro-fila', m).hidden = tipo === 'Cotización';
        $('#nv-sena-campo', m).hidden = tipo !== 'Seña';
        const cj = caja(cobroActual().cajaId);
        $('#nv-cheque', m).hidden = tipo === 'Cotización' || !(cj && cj.tipo === 'cheques');
        $('#nv-cobro-info', m).textContent = cj && cj.recargo ? cj.nombre + ' retiene su recargo al liquidar' : cj && cj.liquidaEn ? 'Queda en ' + cj.nombre + ' hasta que liquida' : '';
        const det = k.ajustes.length || (k.imp && k.imp.tributos);
        $('#nv-desglose', m).hidden = !det;
        if (det) setHTML($('#nv-desglose', m), '<span>Subtotal</span><span class="num">' + fmt(k.subtotal) + '</span>' + k.ajustes.map((a) => '<span' + (a.tipo === 'recargo' ? '' : ' class="resta"') + '>' + (a.tipo === 'recargo' ? 'Recargo' : 'Bonificación') + (a.concepto ? ' · ' + esc(a.concepto) : '') + '</span><span class="num' + (a.tipo === 'recargo' ? '' : ' resta') + '">' + fmt(a.tipo === 'recargo' ? a.monto : -a.monto) + '</span>').join('') + (k.imp ? k.imp.percepciones.map((x) => '<span>Percepción ' + esc(x.imp) + '</span><span class="num">' + fmt(x.monto) + '</span>').join('') : ''));
        return k.total;
      }
      sugeridor(cliIn, (q) => DB.clientes.filter((c) => !q || coincide(c.nombre + ' ' + c.doc, q)).slice(0, 8).map((c) => ({ id: c.id, label: c.nombre, sub: c.doc })), (it) => {
        const c = cliente(it.id);
        $('#nv-cli-info', m).textContent = c.iva + ' · ' + c.condicion + ' · lista ' + nombreDe(listaPrecios(c.lista), 'Minorista');
        $('#nv-canal', m).value = c.tipo === 'Consumidor final' ? 'mostrador' : 'mayorista';
        if (c.vendedorId) $('#nv-vendedor', m).value = c.vendedorId;
        if (c.condicion.startsWith('Cuenta') && tipo !== 'Seña') cobroSel.value = '|Cuenta corriente';
        recalcular();
      });
      const agregar = () => {
        const div = document.createElement('div'); div.className = 'renglon con-bonif';
        setHTML(div, '<div class="sugerencias"><input class="input r-prod" autocomplete="off" placeholder="Buscar producto" aria-label="Producto"><div class="lista"></div></div><input class="input num r-cant" inputmode="numeric" value="1" aria-label="Cantidad"><input class="input num r-bonif" inputmode="decimal" placeholder="0" aria-label="Bonificación del renglón en porcentaje"><button type="button" class="btn icon ghost r-quitar" aria-label="Quitar"><i class="ph ph-x"></i></button>');
        cont.appendChild(div);
        sugeridor($('.r-prod', div), (q) => terminados().filter((p) => !q || coincide(p.nombre + ' ' + p.sku, q)).map((p) => ({ id: p.id, label: p.nombre, sub: fmt0(precioDe(p, listaActual())) + ' · hay ' + stockDe(p.id, $('#nv-deposito', m).value) })), recalcular);
        $('.r-cant', div).addEventListener('input', recalcular);
        $('.r-bonif', div).addEventListener('input', recalcular);
        $('.r-quitar', div).addEventListener('click', () => { div.remove(); recalcular(); });
        if (!esMovil()) $('.r-prod', div).focus();
      };
      $('#nv-agregar', m).addEventListener('click', agregar);
      $('#nv-canal', m).addEventListener('change', () => { const cn = canal($('#nv-canal', m).value); if (cn) $('#nv-deposito', m).value = cn.deposito; recalcular(); });
      cobroSel.addEventListener('change', () => { sugerirRecargo(); recalcular(); });
      $$('.ajuste', m).forEach((f) => { $$('select, input', f).forEach((x) => x.addEventListener('input', () => { f.dataset.auto = ''; recalcular(); })); });
      campoMonto($('#nv-sena', m));
      $$('.segmentado button', m).forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; $$('.segmentado button', m).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintarCobros(); sugerirRecargo(); recalcular(); }));
      pintarCobros(); agregar(); sugerirRecargo(); recalcular();
      if (!esMovil()) cliIn.focus();
      $('#nv-guardar', m).addEventListener('click', () => {
        const { renglones, datos } = leer();
        const previos = [];
        if (renglones.some((r) => r.toc && !r.p)) previos.push('producto (elegilo de la lista o quitá el renglón con la x)');
        if (renglones.some((r) => !Number.isFinite(r.bonif))) previos.push('bonificación del renglón (un número)');
        if (datos.ajustes.some((a) => !Number.isFinite(a.valor))) previos.push('bonificación o recargo (un número)');
        const r = previos.length ? { errores: previos } : registrarVenta(datos);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        const v = r.venta;
        cerrarModal();
        toast(tipo === 'Oficial' ? 'Venta ' + v.id + ' guardada. ' + compTxt(v) + ' emitida (en la maqueta no se envía a ARCA).' : tipo + ' ' + v.id + ' guardada.');
        render(); abrirVenta(v.id);
      });
    });
  }

  /* ---------- cobrar ---------- */
  function modalCobro(ventas, titulo) {
    const saldo = r2(ventas.reduce((s, v) => s + saldoVenta(v), 0));
    const ops = opcionesCobro(ventas.every((v) => v.version === 'Neutral') ? 'Neutral' : 'Oficial', false);
    abrirModal(cabModal(titulo) +
      '<div class="m-b"><div class="total-modal"><span>Saldo a cobrar</span><b>' + fmt(saldo) + '</b></div>' +
      '<div class="fila-2"><div class="campo"><label for="cb-monto">Monto</label><input class="input num" id="cb-monto" inputmode="decimal" value="' + fmtInput(saldo) + '"><span class="ayuda">Punto para miles, coma para centavos</span></div>' +
      '<div class="campo"><label for="cb-medio">Medio y caja</label><select class="input" id="cb-medio">' + opciones(ops.map((o) => [o.cajaId + '|' + o.medio, o.label])) + '</select></div></div>' +
      '<div class="fila-2" id="cb-cheque" hidden><div class="campo"><label for="cb-chq-nro">Número de cheque</label><input class="input mono" id="cb-chq-nro" inputmode="numeric"></div><div class="campo"><label for="cb-chq-vto">Vencimiento</label><input class="input" type="date" id="cb-chq-vto" value="' + toISODate(masDias(INI_HOY, 30)) + '"></div></div>' +
      '<div class="campo"><label for="cb-ret">Retención que nos hicieron (opcional)</label><input class="input num" id="cb-ret" inputmode="decimal" placeholder="0,00"><span class="ayuda">Va dentro del monto: entra a la caja Retenciones y no al banco</span></div>' +
      (ventas.length > 1 ? '<p class="nota">Se aplica a las facturas más viejas primero.</p>' : '') + '</div>' + pieModal('cb-ok', 'Registrar cobro'), (m) => {
      campoMonto($('#cb-monto', m)); campoMonto($('#cb-ret', m));
      const esCheque = () => { const cj = caja($('#cb-medio', m).value.split('|')[0]); return !!cj && cj.tipo === 'cheques'; };
      $('#cb-medio', m).addEventListener('change', () => { $('#cb-cheque', m).hidden = !esCheque(); });
      $('#cb-ok', m).addEventListener('click', () => {
        const partes = $('#cb-medio', m).value.split('|');
        const d = { monto: parseNum($('#cb-monto', m).value), cajaId: partes[0], medio: partes[1], retencion: numOpc($('#cb-ret', m).value) };
        if (esCheque()) d.cheque = { nro: $('#cb-chq-nro', m).value.trim(), vence: $('#cb-chq-vto', m).value ? new Date($('#cb-chq-vto', m).value + 'T12:00:00').toISOString() : '' };
        const r = registrarCobro(ventas, d);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Cobro de ' + fmt(r.monto) + ' registrado. Recibo ' + String(r.recibo).padStart(8, '0') + '.');
        render(); if (ventas.length === 1) abrirVenta(ventas[0].id); else abrirCliente(ventas[0].clienteId);
      });
    });
  }

  /* ---------- clientes: alta y edición ---------- */
  function modalCliente(id) {
    const c = id ? cliente(id) : { nombre: '', doc: '', tipo: 'Mayorista', iva: 'Responsable inscripto', localidad: '', jurisdiccion: 'Buenos Aires', condicion: 'Cuenta corriente 30 días', lista: 'mayorista', vendedorId: '', percepciones: [], email: '', telefono: '' };
    const op = (arr, v) => arr.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
    const perc = Object.keys(REGLAS.ALICUOTAS);
    abrirModal(cabModal(id ? 'Editar cliente' : 'Nuevo cliente') +
      '<div class="m-b"><div class="campo"><label for="cl-nombre">Razón social o nombre</label><input class="input" id="cl-nombre" value="' + esc(c.nombre) + '"></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-tipo">Tipo</label><select class="input" id="cl-tipo">' + op(['Mayorista', 'Distribuidor', 'Consumidor final'], c.tipo) + '</select></div><div class="campo"><label for="cl-doc">CUIT o DNI</label><input class="input mono" id="cl-doc" value="' + esc(c.doc) + '" placeholder="30-12345678-9"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-iva">Condición IVA</label><select class="input" id="cl-iva">' + op(['Responsable inscripto', 'Monotributo', 'Exento', 'Consumidor final'], c.iva) + '</select></div><div class="campo"><label for="cl-cond">Condición de pago</label><select class="input" id="cl-cond">' + op(['Contado', 'Transferencia contado', 'Cheque a 30 días', 'Cuenta corriente 30 días'], c.condicion) + '</select></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-loc">Localidad</label><input class="input" id="cl-loc" value="' + esc(c.localidad) + '"></div><div class="campo"><label for="cl-jur">Jurisdicción</label><select class="input" id="cl-jur">' + op(REGLAS.JURISDICCIONES, c.jurisdiccion) + '</select></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cl-lista">Lista de precios</label><select class="input" id="cl-lista">' + opciones(DB.listas.map((l) => [l.id, l.nombre]), c.lista) + '</select></div><div class="campo"><label for="cl-vend">Vendedor</label><select class="input" id="cl-vend">' + opciones([['', 'Sin asignar']].concat(DB.vendedores.filter((x) => !x.baja || x.id === c.vendedorId).map((x) => [x.id, x.nombre])), c.vendedorId) + '</select></div></div>' +
      '<div class="campo"><label for="cl-email">Email</label><input class="input" id="cl-email" type="email" value="' + esc(c.email) + '"></div>' +
      '<div class="campo"><label>Percepciones que se le aplican</label><div style="display:flex;gap:14px;flex-wrap:wrap">' + perc.map((p) => '<label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" value="' + esc(p) + '"' + (c.percepciones.some((x) => x.imp === p) ? ' checked' : '') + '>' + esc(p) + '</label>').join('') + '</div><span class="ayuda">En el sistema final sale del padrón de cada jurisdicción por CUIT</span></div></div>' + pieModal('cl-ok'), (m) => {
      $('#cl-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#cl-nombre', m).value.trim(), tipo: $('#cl-tipo', m).value, doc: $('#cl-doc', m).value.trim(), iva: $('#cl-iva', m).value, condicion: $('#cl-cond', m).value, localidad: $('#cl-loc', m).value.trim(), jurisdiccion: $('#cl-jur', m).value, lista: $('#cl-lista', m).value, vendedorId: $('#cl-vend', m).value || null, email: $('#cl-email', m).value.trim(),
          percepciones: $$('input[type=checkbox]:checked', m).map((x) => { const ya = c.percepciones.find((y) => y.imp === x.value); return { imp: x.value, alic: ya ? ya.alic : REGLAS.ALICUOTAS[x.value] }; }) };
        const errores = [];
        if (d.nombre.length < 3) errores.push('razón social');
        const dig = d.doc.replace(/\D/g, '');
        if (d.tipo !== 'Consumidor final' && !cuitValido(dig)) errores.push('CUIT válido (11 números)');
        if (d.tipo === 'Consumidor final' && !(dig.length === 11 ? cuitValido(dig) : /^\d{7,8}$/.test(dig))) errores.push('DNI o CUIT válido');
        if (!d.localidad) errores.push('localidad');
        if (d.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) errores.push('email válido');
        if (DB.clientes.some((x) => x.id !== id && x.doc.replace(/\D/g, '') === dig)) errores.push('CUIT o DNI (ya existe otro cliente con ese número)');
        if (!mostrarErrores(m, errores)) return;
        if (dig.length === 11) d.doc = dig.slice(0, 2) + '-' + dig.slice(2, 10) + '-' + dig.slice(10); else d.doc = dig;
        let cl;
        if (id) { cl = cliente(id); Object.assign(cl, d); } else { cl = { id: nuevoId('c'), telefono: '', ...d }; DB.clientes.push(cl); }
        guardar(); cerrarModal(); toast(id ? 'Cliente actualizado.' : 'Cliente ' + cl.nombre + ' creado.');
        if (location.hash !== '#/clientes') location.hash = '#/clientes'; else render();
        setTimeout(() => abrirCliente(cl.id), 30);
      });
    });
  }

  /* ---------- proveedores: alta, factura y pago ---------- */
  function modalProveedor(id, pre) {
    const p = id ? proveedor(id) : { nombre: (pre && pre.nombre) || '', cuit: (pre && pre.cuit) || '', tipo: 'Proveedor', rubro: '', jurisdiccion: 'Buenos Aires', condicion: '30 días' };
    const op = (arr, v) => arr.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
    abrirModal(cabModal(id ? 'Editar' : 'Nuevo proveedor, servicio o gasto') +
      '<div class="m-b"><div class="campo"><label for="pv-nombre">Nombre</label><input class="input" id="pv-nombre" value="' + esc(p.nombre) + '"></div>' +
      '<div class="fila-2"><div class="campo"><label for="pv-tipo">Tipo</label><select class="input" id="pv-tipo">' + op(['Proveedor', 'Servicio', 'Impuesto', 'Sueldo'], p.tipo) + '</select><span class="ayuda">Los sueldos y servicios no se mezclan con los proveedores</span></div><div class="campo"><label for="pv-cuit">CUIT</label><input class="input mono" id="pv-cuit" value="' + esc(p.cuit) + '"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="pv-rubro">Rubro</label><input class="input" id="pv-rubro" value="' + esc(p.rubro) + '" placeholder="Ej: madera, pintura, embalaje"></div><div class="campo"><label for="pv-cond">Condición de pago</label><select class="input" id="pv-cond">' + op(['Contado', '15 días', '30 días', '60 días'], p.condicion) + '</select></div></div>' +
      '<div class="campo"><label for="pv-jur">Jurisdicción</label><select class="input" id="pv-jur">' + op(['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe'], p.jurisdiccion || 'Buenos Aires') + '</select><span class="ayuda">Define a qué jurisdicción van las retenciones de Ingresos Brutos</span></div></div>' + pieModal('pv-ok'), (m) => {
      $('#pv-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#pv-nombre', m).value.trim(), tipo: $('#pv-tipo', m).value, cuit: $('#pv-cuit', m).value.trim(), rubro: $('#pv-rubro', m).value.trim(), condicion: $('#pv-cond', m).value, jurisdiccion: $('#pv-jur', m).value };
        const errores = [];
        if (d.nombre.length < 3) errores.push('nombre');
        const dig = d.cuit.replace(/\D/g, '');
        if (d.tipo !== 'Sueldo' && !cuitValido(dig)) errores.push('CUIT válido');
        if (dig && DB.proveedores.some((x) => x.id !== id && x.cuit.replace(/\D/g, '') === dig)) errores.push('CUIT (ya existe otro con ese número)');
        if (!d.rubro) errores.push('rubro');
        if (!mostrarErrores(m, errores)) return;
        if (dig.length === 11) d.cuit = dig.slice(0, 2) + '-' + dig.slice(2, 10) + '-' + dig.slice(10);
        let pr;
        if (id) { pr = proveedor(id); Object.assign(pr, d); } else { pr = { id: nuevoId('p'), movs: [], ...d }; DB.proveedores.push(pr); }
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
      '<div class="fila-2"><div class="campo"><label for="fp-comp">Comprobante</label><input class="input mono" id="fp-comp" placeholder="0002-00012345"><span class="ayuda">En el sistema final se valida contra ARCA</span></div><div class="campo"><label for="fp-fecha">Fecha</label><input class="input" type="date" id="fp-fecha" value="' + toISODate(INI_HOY) + '"></div></div>' +
      '<div id="fp-fiscal"><div class="fila-2"><div class="campo"><label for="fp-neto">Neto gravado</label><input class="input num" id="fp-neto" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="fp-alic">IVA</label><select class="input" id="fp-alic"><option value="21">21%</option><option value="10.5">10,5%</option><option value="27">27%</option><option value="0">Sin IVA</option></select></div></div>' +
      '<div class="fila-2" style="margin-top:14px"><div class="campo"><label for="fp-iibb">Percepción de Ingresos Brutos</label><input class="input num" id="fp-iibb" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="fp-piva">Percepción de IVA</label><input class="input num" id="fp-piva" inputmode="decimal" placeholder="0,00"></div></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="fp-ng" id="fp-ng-l">No gravado</label><input class="input num" id="fp-ng" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="fp-vence">Vence</label><input class="input" type="date" id="fp-vence" value="' + toISODate(masDias(INI_HOY, 30)) + '"></div></div>' +
      '<div class="total-modal"><span id="fp-det">Total del comprobante</span><b id="fp-total">$ 0,00</b></div></div>' + pieModal('fp-ok'), (m) => {
      const prov = () => proveedor($('#fp-prov', m).dataset.id);
      const leer = () => {
        const p = prov(), conIva = !p || p.tipo === 'Proveedor' || p.tipo === 'Servicio';
        return { proveedorId: p ? p.id : '', comp: $('#fp-comp', m).value.trim(), fecha: $('#fp-fecha', m).value, vence: $('#fp-vence', m).value, neto: conIva ? numOpc($('#fp-neto', m).value) : 0, alic: Number($('#fp-alic', m).value),
          perc: conIva ? [{ imp: 'IIBB ' + (p && p.jurisdiccion === 'CABA' ? 'CABA' : 'Buenos Aires'), monto: numOpc($('#fp-iibb', m).value) }, { imp: 'IVA', monto: numOpc($('#fp-piva', m).value) }] : [], noGravado: numOpc($('#fp-ng', m).value), conIva };
      };
      const pintar = () => {
        const d = leer();
        $('#fp-fiscal', m).hidden = !d.conIva;
        $('#fp-ng-l', m).textContent = d.conIva ? 'No gravado' : 'Importe';
        const k = REGLAS.calcularCompra({ neto: d.neto || 0, alic: d.alic, perc: d.perc.map((x) => ({ imp: x.imp, monto: x.monto || 0 })), noGravado: d.noGravado || 0 });
        $('#fp-total', m).textContent = fmt(k.monto);
        $('#fp-det', m).textContent = d.conIva && k.iva ? 'Total · IVA ' + fmt(k.iva) : 'Total del comprobante';
      };
      sugeridor($('#fp-prov', m), (q) => DB.proveedores.filter((p) => !q || coincide(p.nombre + ' ' + p.cuit, q)).map((p) => ({ id: p.id, label: p.nombre, sub: p.tipo })), pintar);
      ['#fp-neto', '#fp-iibb', '#fp-piva', '#fp-ng'].forEach((s) => { campoMonto($(s, m)); $(s, m).addEventListener('input', pintar); });
      $('#fp-alic', m).addEventListener('change', pintar);
      pintar();
      $('#fp-ok', m).addEventListener('click', () => {
        const d = leer();
        const mal = [d.neto, d.noGravado].concat(d.perc.map((x) => x.monto)).some((n) => !Number.isFinite(n));
        const r = mal ? { errores: ['importes (punto para miles, coma para centavos)'] } : cargarFactura(d);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        UI.proveedores.tab = r.proveedor.tipo;
        cerrarModal(); toast('Comprobante cargado en la cuenta de ' + r.proveedor.nombre + '.');
        if (location.hash !== '#/proveedores') location.hash = '#/proveedores'; else render();
        setTimeout(() => abrirProveedor(r.proveedor.id), 30);
      });
    });
  }
  function modalPago(id) {
    const p = proveedor(id); const k = ctaProveedor(p);
    const filas = k.pend.map((f) => '<label class="fila-check"><input type="checkbox" value="' + esc(f.id) + '" checked><span class="mono">' + esc(f.comp) + '<span class="sec">Vence ' + fFecha(f.vence) + '</span></span><span class="num">' + fmt(f.saldo) + '</span></label>').join('');
    const formas = DB.cajas.filter((c) => c.tipo === 'banco').map((c) => ['t|' + c.id, 'Transferencia desde ' + c.nombre])
      .concat(DB.cajas.filter((c) => (c.tipo === 'efectivo' || c.tipo === 'interna') && !c.neutral).map((c) => ['e|' + c.id, 'Efectivo de ' + c.nombre]))
      .concat(DB.chequeras.filter((q) => q.proximo <= q.hasta).map((q) => ['c|' + q.id, 'Cheque propio de ' + nombreDe(caja(q.banco)) + ' N° ' + String(q.proximo).padStart(8, '0')]));
    abrirModal(cabModal('Orden de pago · ' + p.nombre) +
      '<div class="m-b"><div class="campo"><label>Facturas a pagar</label><div style="display:grid;gap:6px">' + filas + '</div></div>' +
      '<div class="fila-2"><div class="campo"><label for="op-forma">Se paga con</label><select class="input" id="op-forma">' + opciones(formas) + '</select></div>' +
      '<div class="campo" id="op-deb-campo" hidden><label for="op-debito">Fecha de débito del cheque</label><input class="input" type="date" id="op-debito" value="' + toISODate(masDias(INI_HOY, 30)) + '"></div></div>' +
      '<div class="desglose" id="op-desglose"></div></div>' + pieModal('op-ok', 'Generar orden de pago'), (m) => {
      const leer = () => {
        const f = $('#op-forma', m).value.split('|');
        return { proveedorId: p.id, facturas: $$('input[type=checkbox]:checked', m).map((x) => x.value), medio: f[0] === 'c' ? 'Cheque propio' : f[0] === 'e' ? 'Efectivo' : 'Transferencia o depósito', cajaId: f[0] === 'c' ? '' : f[1], chequeraId: f[0] === 'c' ? f[1] : '', debito: $('#op-debito', m).value };
      };
      const calc = () => {
        const d = leer(), c = calcularPago(p, d.facturas), conCheque = d.medio === 'Cheque propio';
        $('#op-deb-campo', m).hidden = !conCheque;
        const porImp = {}; c.facs.forEach((x) => x.ret.forEach((r) => { porImp[r.imp] = r2((porImp[r.imp] || 0) + r.monto); }));
        setHTML($('#op-desglose', m), '<span>Total de facturas</span><span class="num">' + fmt(c.tot) + '</span>' + Object.keys(porImp).map((imp) => '<span class="resta">Retención de ' + esc(imp) + '</span><span class="num resta">-' + fmt(porImp[imp]) + '</span>').join('') + '<span class="final">' + (conCheque ? 'Importe del cheque' : 'A pagar') + '</span><span class="final num">' + fmt(c.neto) + '</span>' +
          (conCheque ? '<span class="chico">La factura queda pagada hoy. El banco baja el día del débito.</span><span></span>' : '<span class="chico">Disponible en la caja</span><span class="num chico">' + fmt(caja(d.cajaId) ? saldoCaja(d.cajaId).saldo : 0) + '</span>'));
      };
      $$('input[type=checkbox]', m).forEach((x) => x.addEventListener('change', calc));
      $('#op-forma', m).addEventListener('change', calc);
      calc();
      $('#op-ok', m).addEventListener('click', () => {
        const r = registrarPago(leer());
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal();
        toast(r.cheque ? 'Orden de pago ' + r.op + ' generada. Cheque ' + r.cheque.nro + ' por ' + fmt(r.neto) + ', debita el ' + fFecha(r.cheque.debito) + '.' : 'Orden de pago ' + r.op + ' generada por ' + fmt(r.neto) + '. Certificados de retención listos (simulado).');
        render(); abrirProveedor(p.id);
      });
    });
  }

  /* ---------- cajas: transferir, ingreso y retiro (un solo formulario, se abre desde cualquier pantalla) ---------- */
  function modalMovCaja(tipo, pre) {
    pre = pre || {};
    const mueven = DB.cajas.filter((c) => ['banco', 'billetera', 'efectivo', 'interna'].concat(tipo === 'transferencia' ? ['prestamo'] : []).includes(c.tipo));
    const ops = (sel) => opciones(mueven.map((c) => [c.id, c.nombre]), sel);
    const t = { transferencia: 'Transferir entre cajas', ingreso: 'Ingreso a caja', retiro: 'Retiro de caja' }[tipo];
    const desde0 = pre.desde || (pre.hacia === mueven[0].id ? mueven[1].id : mueven[0].id);
    const hacia0 = pre.hacia || (mueven.find((c) => c.tipo === 'banco' && c.id !== desde0) || mueven.find((c) => c.id !== desde0)).id;
    abrirModal(cabModal(t) +
      '<div class="m-b"><div class="fila-2">' +
        (tipo !== 'ingreso' ? '<div class="campo"><label for="mc-desde">Desde</label><select class="input" id="mc-desde">' + ops(desde0) + '</select><span class="ayuda" id="mc-disp"></span></div>' : '') +
        (tipo !== 'retiro' ? '<div class="campo"><label for="mc-hacia">' + (tipo === 'ingreso' ? 'Caja' : 'Hacia') + '</label><select class="input" id="mc-hacia">' + ops(tipo === 'ingreso' ? pre.hacia : hacia0) + '</select></div>' : '') +
      '</div><div class="fila-2"><div class="campo"><label for="mc-monto">Monto</label><input class="input num" id="mc-monto" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="mc-detalle">Detalle</label><input class="input" id="mc-detalle" placeholder="' + (tipo === 'transferencia' ? 'Ej: retiro de Mercado Pago, cuota 2' : 'Motivo') + '"></div></div>' +
      (tipo === 'transferencia' ? '<p class="nota">Sale de una caja y entra en la otra en un solo movimiento. No es ingreso ni gasto.</p>' : '') + '</div>' + pieModal('mc-ok'), (m) => {
      campoMonto($('#mc-monto', m));
      const disp = () => { const el = $('#mc-disp', m); if (!el) return; const c = caja($('#mc-desde', m).value); el.textContent = c && !admiteNegativo(c) ? 'Disponible ' + fmt(saldoCaja(c.id).saldo) : ''; };
      if ($('#mc-desde', m)) $('#mc-desde', m).addEventListener('change', disp);
      disp();
      $('#mc-ok', m).addEventListener('click', () => {
        const monto = parseNum($('#mc-monto', m).value), det = $('#mc-detalle', m).value.trim();
        const desde = $('#mc-desde', m) ? $('#mc-desde', m).value : null, hacia = $('#mc-hacia', m) ? $('#mc-hacia', m).value : null;
        const r = tipo === 'transferencia' ? transferir({ desde, hacia, monto, detalle: det }) : movimientoCaja({ tipo, cajaId: desde || hacia, monto, detalle: det });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(tipo === 'transferencia' ? 'Transferencia de ' + fmt(r.mov.monto) + ' guardada en las dos cajas.' : 'Movimiento guardado.');
        render(); if (pre.desde || pre.hacia) abrirCaja(pre.desde || pre.hacia);
      });
    });
  }
  function modalCaja(id) {
    const c = id ? caja(id) : null;
    const conNeutral = (t) => t === 'interna' || t === 'efectivo';
    const bancos = DB.cajas.filter((x) => ['banco', 'billetera', 'efectivo', 'interna'].includes(x.tipo));
    abrirModal(cabModal(c ? 'Editar caja' : 'Nueva caja') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="cj-nombre">Nombre</label><input class="input" id="cj-nombre" value="' + esc(c ? c.nombre : '') + '"></div>' +
      (c ? '<div class="campo"><label>Tipo</label><input class="input" value="' + esc((TIPOS_CAJA.find((t) => t[0] === c.tipo) || ['', c.tipo === 'valores' ? 'Valores diferidos' : 'Retenciones'])[1]) + '" readonly></div>' : '<div class="campo"><label for="cj-tipo">Tipo</label><select class="input" id="cj-tipo">' + opciones(TIPOS_CAJA) + '</select></div>') + '</div>' +
      (c ? '' : '<div class="campo" id="cj-ini-campo"><label for="cj-inicial">Saldo inicial</label><input class="input num" id="cj-inicial" inputmode="decimal" placeholder="0,00"><span class="ayuda">Lo que tiene hoy. Después el saldo lo calcula el sistema</span></div>') +
      '<div class="fila-2" id="cj-neutral"' + (c && conNeutral(c.tipo) ? '' : ' hidden') + '><div class="campo"><label for="cj-neu">Uso</label><label class="btn"><input type="checkbox" id="cj-neu"' + (c && c.neutral ? ' checked' : '') + '> Cobra ventas Neutral</label></div><div class="campo"><label for="cj-recargo">Recargo al cobrar (%)</label><input class="input num" id="cj-recargo" inputmode="decimal" placeholder="0" value="' + (c && c.recargo ? String(c.recargo).replace('.', ',') : '') + '"><span class="ayuda">Se sugiere solo en la venta</span></div></div>' +
      (c ? '' : '<div id="cj-prestamo" hidden><div class="fila-2"><div class="campo"><label for="cj-sentido">El préstamo es</label><select class="input" id="cj-sentido"><option value="recibido">Recibido (nos prestaron)</option><option value="otorgado">Otorgado (prestamos nosotros)</option></select></div><div class="campo"><label for="cj-contra">Con quién</label><input class="input" id="cj-contra" placeholder="Banco, socio o persona"></div></div>' +
        '<div class="fila-2" style="margin-top:14px"><div class="campo"><label for="cj-capital">Monto del préstamo</label><input class="input num" id="cj-capital" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="cj-cuotas">Cuotas</label><input class="input num" id="cj-cuotas" inputmode="numeric" value="1"></div></div>' +
        '<div class="campo" style="margin-top:14px"><label for="cj-mueve" id="cj-mueve-l">Caja donde entra la plata</label><select class="input" id="cj-mueve">' + opciones(bancos.map((x) => [x.id, x.nombre])) + '</select><span class="ayuda">Prestar o devolver es una transferencia entre cajas</span></div></div>') +
      '</div>' + pieModal('cj-ok'), (m) => {
      const tipoSel = $('#cj-tipo', m);
      const ver = () => {
        const t = tipoSel.value;
        $('#cj-neutral', m).hidden = !conNeutral(t);
        $('#cj-prestamo', m).hidden = t !== 'prestamo';
        $('#cj-ini-campo', m).hidden = t === 'prestamo';
        $('#cj-mueve-l', m).textContent = $('#cj-sentido', m).value === 'recibido' ? 'Caja donde entra la plata' : 'Caja de donde sale la plata';
      };
      if (tipoSel) { tipoSel.addEventListener('change', ver); $('#cj-sentido', m).addEventListener('change', ver); campoMonto($('#cj-inicial', m)); campoMonto($('#cj-capital', m)); ver(); }
      $('#cj-ok', m).addEventListener('click', () => {
        const d = { nombre: $('#cj-nombre', m).value, neutral: $('#cj-neu', m).checked, recargo: numOpc($('#cj-recargo', m).value) };
        if (!c) {
          d.tipo = tipoSel.value; d.inicial = numOpc($('#cj-inicial', m).value);
          if (d.tipo === 'prestamo') d.prestamo = { sentido: $('#cj-sentido', m).value, contraparte: $('#cj-contra', m).value, capital: parseNum($('#cj-capital', m).value), cuotas: parseInt($('#cj-cuotas', m).value, 10), cajaId: $('#cj-mueve', m).value };
        }
        const r = guardarCaja(d, id);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(c ? 'Caja actualizada.' : 'Caja ' + r.caja.nombre + ' creada.');
        UI.cajas.tab = 'cajas';
        if (location.hash !== '#/cajas') location.hash = '#/cajas'; else render();
        setTimeout(() => abrirCaja(r.caja.id), 30);
      });
    });
  }
  function modalArqueo(id) {
    const cs = DB.cajas.filter((c) => c.tipo === 'efectivo' || c.tipo === 'interna');
    abrirModal(cabModal('Arqueo de caja') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="ar-caja">Caja</label><select class="input" id="ar-caja">' + opciones(cs.map((c) => [c.id, c.nombre]), id) + '</select></div><div class="campo"><label for="ar-contado">Contado</label><input class="input num" id="ar-contado" inputmode="decimal" placeholder="0,00"><span class="ayuda">Lo que hay en la caja de verdad</span></div></div>' +
      '<div class="desglose" id="ar-desglose"></div>' +
      '<label class="btn" style="justify-self:start"><input type="checkbox" id="ar-ajustar" checked> Dejar la diferencia cargada como ajuste</label></div>' + pieModal('ar-ok', 'Guardar arqueo'), (m) => {
      campoMonto($('#ar-contado', m));
      const pintar = () => {
        const sis = saldoCaja($('#ar-caja', m).value).saldo, con = parseNum($('#ar-contado', m).value);
        const dif = Number.isFinite(con) ? r2(con - sis) : null;
        setHTML($('#ar-desglose', m), '<span>Según el sistema</span><span class="num">' + fmt(sis) + '</span><span>Contado</span><span class="num">' + (dif == null ? '' : fmt(con)) + '</span><span class="final">Diferencia</span><span class="final num">' + (dif == null ? '' : fmt(dif)) + '</span>');
      };
      $('#ar-caja', m).addEventListener('change', pintar); $('#ar-contado', m).addEventListener('input', pintar);
      pintar();
      $('#ar-ok', m).addEventListener('click', () => {
        const r = registrarArqueo({ cajaId: $('#ar-caja', m).value, contado: parseNum($('#ar-contado', m).value), ajustar: $('#ar-ajustar', m).checked });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(r.arqueo.diferencia ? 'Arqueo guardado con una diferencia de ' + fmt(r.arqueo.diferencia) + '.' : 'Arqueo guardado: coincide con el sistema.');
        render(); abrirCaja(r.arqueo.cajaId);
      });
    });
  }
  function modalChequera() {
    abrirModal(cabModal('Nueva chequera') +
      '<div class="m-b"><div class="campo"><label for="cq-banco">Banco</label><select class="input" id="cq-banco">' + opciones(DB.cajas.filter((c) => c.tipo === 'banco').map((c) => [c.id, c.nombre])) + '</select></div>' +
      '<div class="fila-2"><div class="campo"><label for="cq-desde">Primer número</label><input class="input mono" id="cq-desde" inputmode="numeric"></div><div class="campo"><label for="cq-hasta">Último número</label><input class="input mono" id="cq-hasta" inputmode="numeric"></div></div></div>' + pieModal('cq-ok'), (m) => {
      $('#cq-ok', m).addEventListener('click', () => {
        const n = (s) => /^\d{1,9}$/.test($(s, m).value.trim()) ? Number($(s, m).value.trim()) : NaN;
        const r = guardarChequera({ banco: $('#cq-banco', m).value, desde: n('#cq-desde'), hasta: n('#cq-hasta') });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Chequera cargada.'); render();
      });
    });
  }

  /* ---------- stock: un solo formulario para transferir y para el resto de los movimientos ---------- */
  function modalMovStock(tipo, pre) {
    pre = pre || {};
    const transf = tipo === 'transferencia';
    const p0 = pre.productoId ? producto(pre.productoId) : null;
    const CLASES = [['ajuste-in', 'Ajuste: ingreso'], ['ajuste-out', 'Ajuste: egreso'], ['dev-proveedor', 'Devolución a proveedor']];
    const MOTIVO = { 'dev-proveedor': 'Devolución a proveedor' };
    abrirModal(cabModal(transf ? 'Transferir entre depósitos' : 'Movimiento de stock') +
      '<div class="m-b">' + (transf ? '' : '<div class="campo"><label for="ms-clase">Tipo de movimiento</label><select class="input" id="ms-clase">' + opciones(CLASES) + '</select></div>') +
      '<div class="campo sugerencias"><label for="ms-prod">Artículo</label><input class="input" id="ms-prod" autocomplete="off" placeholder="Producto o materia prima" value="' + esc(p0 ? p0.nombre : '') + '" data-id="' + esc(p0 ? p0.id : '') + '"><div class="lista"></div></div>' +
      '<div class="fila-2">' + (transf ? '<div class="campo"><label for="ms-desde">Desde</label><select class="input" id="ms-desde"></select></div><div class="campo"><label for="ms-hacia">Hacia</label><select class="input" id="ms-hacia"></select></div>' : '<div class="campo"><label for="ms-dep">Depósito</label><select class="input" id="ms-dep"></select></div><div class="campo"><label for="ms-cant">Cantidad</label><input class="input num" id="ms-cant" inputmode="decimal" placeholder="0"></div>') + '</div>' +
      '<div class="fila-2">' + (transf ? '<div class="campo"><label for="ms-cant">Cantidad</label><input class="input num" id="ms-cant" inputmode="decimal" placeholder="0"></div>' : '') + '<div class="campo"><label for="ms-motivo">' + (transf ? 'Detalle' : 'Motivo') + '</label><input class="input" id="ms-motivo" placeholder="' + (transf ? 'Ej: envío a Full' : 'Ej: recuento, rotura') + '"></div></div>' +
      '<p class="nota">' + (transf ? 'Sale de un depósito y entra en el otro en un solo movimiento: el stock total no cambia.' : 'Las compras entran con Ingreso de proveedor y las ventas salen con su remito.') + '</p></div>' + pieModal('ms-ok'), (m) => {
      const prodIn = $('#ms-prod', m);
      const pintarDeps = () => {
        const p = producto(prodIn.dataset.id);
        const deps = p ? depositosDe(p) : DB.depositos;
        const pares = deps.map((d) => [d.id, d.nombre + (p ? ' (' + fCant(stockDe(p.id, d.id)) + ')' : '')]);
        if (transf) {
          const de = $('#ms-desde', m).value || pre.desde || (p && deps.slice().sort((a, b) => stockDe(p.id, b.id) - stockDe(p.id, a.id))[0].id) || '';
          setHTML($('#ms-desde', m), opciones(pares, de));
          const a = $('#ms-hacia', m).value;
          setHTML($('#ms-hacia', m), opciones(pares, a && a !== $('#ms-desde', m).value ? a : pre.hacia && pre.hacia !== $('#ms-desde', m).value ? pre.hacia : (deps.find((d) => d.id !== $('#ms-desde', m).value) || {}).id));
        } else {
          setHTML($('#ms-dep', m), opciones(pares, $('#ms-dep', m).value || pre.desde));
        }
      };
      sugeridor(prodIn, (q) => DB.productos.filter((p) => !esCombo(p) && (!q || coincide(p.nombre + ' ' + p.sku, q))).map((p) => ({ id: p.id, label: p.nombre, sub: esMateria(p) ? 'Materia prima' : p.sku })), pintarDeps);
      if (!transf) $('#ms-clase', m).addEventListener('change', () => { const mo = $('#ms-motivo', m), cl = $('#ms-clase', m).value; if (!mo.value.trim() || Object.values(MOTIVO).includes(mo.value)) mo.value = MOTIVO[cl] || ''; pintarDeps(); });
      else $('#ms-desde', m).addEventListener('change', pintarDeps);
      pintarDeps();
      if (pre.cant) $('#ms-cant', m).value = String(pre.cant);
      $('#ms-ok', m).addEventListener('click', () => {
        const cant = parseNum($('#ms-cant', m).value), motivo = $('#ms-motivo', m).value;
        let d;
        if (transf) d = { tipo: 'transferencia', productoId: prodIn.dataset.id, cant, desde: $('#ms-desde', m).value, hacia: $('#ms-hacia', m).value, motivo };
        else {
          const clase = $('#ms-clase', m).value, sale = clase === 'ajuste-out' || clase === 'dev-proveedor';
          d = { tipo: clase.startsWith('ajuste') ? 'ajuste' : clase, productoId: prodIn.dataset.id, cant, desde: sale ? $('#ms-dep', m).value : null, hacia: sale ? null : $('#ms-dep', m).value, motivo };
        }
        const r = moverStock(d);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(transf ? 'Transferencia guardada en los dos depósitos.' : 'Movimiento de stock guardado.');
        render(); if (pre.productoId) abrirProducto(pre.productoId); else if (pre.desde) abrirDeposito(pre.desde);
      });
    });
  }
  function modalDeposito(id) {
    const d0 = id ? deposito(id) : null;
    abrirModal(cabModal(d0 ? 'Editar depósito' : 'Nuevo depósito') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="dp-nombre">Nombre</label><input class="input" id="dp-nombre" value="' + esc(d0 ? d0.nombre : '') + '"></div>' +
      (d0 ? '<div class="campo"><label>Tipo</label><input class="input" value="' + esc(d0.tipo) + '" readonly></div>' : '<div class="campo"><label for="dp-tipo">Tipo</label><select class="input" id="dp-tipo">' + opciones(TIPOS_DEPOSITO.map((t) => [t, t])) + '</select><span class="ayuda">"A revisión" no cuenta como stock para vender</span></div>') + '</div></div>' + pieModal('dp-ok'), (m) => {
      $('#dp-ok', m).addEventListener('click', () => {
        const r = guardarDeposito({ nombre: $('#dp-nombre', m).value, tipo: d0 ? d0.tipo : $('#dp-tipo', m).value }, id);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(d0 ? 'Depósito actualizado.' : 'Depósito ' + r.deposito.nombre + ' creado.');
        if (location.hash !== '#/depositos') location.hash = '#/depositos'; else render();
        setTimeout(() => abrirDeposito(r.deposito.id), 30);
      });
    });
  }
  function modalUbicacion(productoId, depositoId) {
    const p = producto(productoId), d = deposito(depositoId); if (!p || !d) return;
    const u = (p.ubic && p.ubic[d.id]) || { pasillo: '', estante: '', nivel: '' };
    abrirModal(cabModal('Ubicación en ' + d.nombre) +
      '<div class="m-b"><p class="nota">' + esc(p.nombre) + '</p><div class="fila-3"><div class="campo"><label for="ub-pasillo">Pasillo</label><input class="input mono" id="ub-pasillo" value="' + esc(u.pasillo) + '" placeholder="A"></div><div class="campo"><label for="ub-estante">Estante</label><input class="input num" id="ub-estante" inputmode="numeric" value="' + esc(u.estante) + '" placeholder="1"></div><div class="campo"><label for="ub-nivel">Nivel</label><input class="input num" id="ub-nivel" inputmode="numeric" value="' + esc(u.nivel) + '" placeholder="1"></div></div></div>' + pieModal('ub-ok'), (m) => {
      $('#ub-ok', m).addEventListener('click', () => {
        const r = guardarUbicacion({ productoId, depositoId, pasillo: $('#ub-pasillo', m).value, estante: parseInt($('#ub-estante', m).value, 10), nivel: parseInt($('#ub-nivel', m).value, 10) });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Ubicación guardada.'); render(); abrirProducto(productoId);
      });
    });
  }

  /* ---------- canales y tiendas ---------- */
  function modalCanal(id) {
    const c = id ? canal(id) : null;
    const manual = c && c.conexion === 'manual';
    const pvs = DB.puntosVenta.map((x) => [x.nro, x.nro + ' · ' + x.nombre]).concat([['nuevo', 'Nuevo punto de venta ' + proximoPv()]]);
    const cajas = (c ? [] : [['nueva', 'Crear su caja "a liquidar"']]).concat(manual ? [['', 'Según el cobro']] : []).concat(DB.cajas.filter((x) => ['a-liquidar', 'billetera', 'banco'].includes(x.tipo)).map((x) => [x.id, x.nombre]));
    const deps = DB.depositos.filter((x) => !x.materia && !x.noDisponible).map((x) => [x.id, x.nombre]).concat(c ? [] : [['nuevo', 'Crear un depósito propio']]);
    abrirModal(cabModal(c ? 'Editar canal' : 'Agregar tienda') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="cn-nombre">Nombre</label><input class="input" id="cn-nombre" value="' + esc(c ? c.nombre : '') + '" placeholder="Ej: tienda de un banco"></div>' +
      '<div class="campo"><label for="cn-conexion">Cómo entran las ventas</label>' + (manual ? '<input class="input" value="' + CONEXION.manual + '" readonly>' : '<select class="input" id="cn-conexion">' + opciones([['vivo', CONEXION.vivo], ['asistida', CONEXION.asistida]], c ? c.conexion : 'vivo') + '</select><span class="ayuda">Conexión asistida: la opera Argos</span>') + '</div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cn-pv">Punto de venta</label><select class="input" id="cn-pv">' + opciones(pvs, c ? c.pv : 'nuevo') + '</select></div><div class="campo"><label for="cn-comision">Comisión estimada (%)</label><input class="input num" id="cn-comision" inputmode="decimal" value="' + (c ? String(c.comision || 0).replace('.', ',') : '') + '" placeholder="0"></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="cn-caja">Caja donde cobra</label><select class="input" id="cn-caja">' + opciones(cajas, c ? c.caja || '' : 'nueva') + '</select></div><div class="campo"><label for="cn-deposito">Depósito del que descuenta</label><select class="input" id="cn-deposito">' + opciones(deps, c ? c.deposito : 'principal') + '</select></div></div>' + (manual ? '' : '<div class="fila-2"><div class="campo"><label for="cn-lista">Lista de precios que publica</label><select class="input" id="cn-lista">' + opciones(DB.listas.map((l) => [l.id, l.nombre]), c ? reglaCanal(c).lista : 'minorista') + '</select></div><div class="campo"><label for="cn-pct">Ajuste sobre esa lista (%)</label><input class="input num" id="cn-pct" inputmode="decimal" placeholder="0" value="' + (c && reglaCanal(c).pct ? String(reglaCanal(c).pct).replace('.', ',') : '') + '"><span class="ayuda">Ej: 8 para publicar 8% más caro</span></div></div>') + '</div>' + pieModal('cn-ok', c ? 'Guardar' : 'Agregar tienda'), (m) => {
      $('#cn-ok', m).addEventListener('click', () => {
        const r = guardarCanal({ nombre: $('#cn-nombre', m).value, conexion: manual ? 'manual' : $('#cn-conexion', m).value, pv: $('#cn-pv', m).value, cajaId: $('#cn-caja', m).value, depositoId: $('#cn-deposito', m).value, comision: numOpc($('#cn-comision', m).value), precioLista: $('#cn-lista', m) ? $('#cn-lista', m).value : undefined, precioPct: $('#cn-pct', m) ? numOpc($('#cn-pct', m).value) : undefined }, id);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(c ? 'Canal actualizado.' : r.canal.nombre + ' agregada. Ya está en el menú, en los filtros y en los informes.');
        if (location.hash !== '#/canales') location.hash = '#/canales'; else render();
      });
    });
  }

  /* ---------- productos: precios y combos ---------- */
  function modalProducto(id) {
    const p = id ? producto(id) : { nombre: '', sku: '', rubro: 'Sillas', precios: {}, costo: '', alic: 21, minimo: 30 };
    const eraCombo = esCombo(p);
    const rubros = Array.from(new Set(['Sillas', 'Mesas', 'Combos', 'Oficina', 'Gamer', 'Banquetas', 'Deco'].concat(terminados().map((x) => x.rubro))));
    const campoPrecio = (l) => '<div class="campo"><label for="pr-' + esc(l.id) + '">Lista ' + esc(l.nombre) + '</label><input class="input num pr-lista" data-lista="' + esc(l.id) + '" id="pr-' + esc(l.id) + '" inputmode="decimal" value="' + (p.precios[l.id] ? fmtInput(p.precios[l.id]) : '') + '"></div>';
    const pares = []; for (let i = 0; i < DB.listas.length; i += 2) pares.push('<div class="fila-2">' + campoPrecio(DB.listas[i]) + (DB.listas[i + 1] ? campoPrecio(DB.listas[i + 1]) : '') + '</div>');
    abrirModal(cabModal(id ? (eraCombo ? 'Editar combo' : 'Editar precios') : 'Nuevo producto') +
      '<div class="m-b"><div class="fila-2"><div class="campo"><label for="pr-nombre">Nombre</label><input class="input" id="pr-nombre" value="' + esc(p.nombre) + '"' + (id ? ' readonly' : '') + '></div><div class="campo"><label for="pr-sku">Código</label><input class="input mono" id="pr-sku" value="' + esc(p.sku) + '"' + (id ? ' readonly' : '') + '></div></div>' +
      pares.join('') +
      '<div class="fila-2"><div class="campo"><label for="pr-costo">Costo</label><input class="input num" id="pr-costo" inputmode="decimal" value="' + (eraCombo ? fmtInput(costoDe(p)) : p.costo ? fmtInput(p.costo) : '') + '"' + (eraCombo ? ' readonly' : '') + '><span class="ayuda" id="pr-costo-ayuda">' + (eraCombo ? 'Es la suma de sus componentes' : '') + '</span></div><div class="campo"><label for="pr-rubro">Rubro</label><select class="input" id="pr-rubro">' + rubros.map((r) => '<option' + (r === p.rubro ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select></div></div>' +
      '<div class="fila-2"><div class="campo"><label for="pr-alic">IVA</label><select class="input" id="pr-alic">' + opciones([[21, '21%'], [10.5, '10,5%']], p.alic == null ? 21 : p.alic) + '</select></div>' + (id ? '' : '<div class="campo"><label for="pr-combo">Tipo</label><label class="btn"><input type="checkbox" id="pr-combo"> Es un combo de otros productos</label></div>') + '</div>' +
      '<div class="campo" id="pr-comps-campo"' + (eraCombo ? '' : ' hidden') + '><label>Componentes del combo</label><div id="pr-comps" style="display:grid;gap:8px"></div><button type="button" class="btn sm" id="pr-comp-mas" style="align-self:flex-start"><i class="ph ph-plus"></i>Agregar componente</button><span class="ayuda">El stock y el costo del combo salen de sus componentes</span></div>' +
      (id ? '<p class="nota">En el sistema real el precio nuevo se publica solo en las tiendas.</p>' : '') + '</div>' + pieModal('pr-ok'), (m) => {
      const cont = $('#pr-comps', m);
      const esComboAhora = () => eraCombo || (!id && $('#pr-combo', m).checked);
      const agregar = (c) => {
        const x = c ? producto(c.productoId) : null;
        const div = document.createElement('div'); div.className = 'renglon';
        setHTML(div, '<div class="sugerencias"><input class="input r-prod" autocomplete="off" placeholder="Buscar producto" aria-label="Componente" value="' + esc(x ? x.nombre : '') + '" data-id="' + esc(x ? x.id : '') + '"><div class="lista"></div></div><input class="input num r-cant" inputmode="numeric" value="' + (c ? c.cant : 1) + '" aria-label="Cantidad"><button type="button" class="btn icon ghost r-quitar" aria-label="Quitar"><i class="ph ph-x"></i></button>');
        cont.appendChild(div);
        sugeridor($('.r-prod', div), (q) => terminados().filter((t) => !esCombo(t) && t.id !== id && (!q || coincide(t.nombre + ' ' + t.sku, q))).map((t) => ({ id: t.id, label: t.nombre, sub: 'costo ' + fmt0(costoDe(t)) })), () => {});
        $('.r-quitar', div).addEventListener('click', () => div.remove());
      };
      (p.combo || []).forEach(agregar);
      $('#pr-comp-mas', m).addEventListener('click', () => agregar(null));
      if (!id) $('#pr-combo', m).addEventListener('change', () => {
        const si = $('#pr-combo', m).checked;
        $('#pr-comps-campo', m).hidden = !si; $('#pr-costo', m).readOnly = si; $('#pr-costo-ayuda', m).textContent = si ? 'Es la suma de sus componentes' : '';
        if (si) { $('#pr-costo', m).value = ''; if (!cont.children.length) agregar(null); }
      });
      $$('.pr-lista', m).concat(eraCombo ? [] : [$('#pr-costo', m)]).forEach((x) => campoMonto(x));
      $('#pr-ok', m).addEventListener('click', () => {
        const combo = esComboAhora();
        const precios = {}; $$('.pr-lista', m).forEach((x) => { precios[x.dataset.lista] = parseNum(x.value); });
        const d = { nombre: $('#pr-nombre', m).value.trim(), sku: $('#pr-sku', m).value.trim().toUpperCase(), precios, costo: parseNum($('#pr-costo', m).value), rubro: $('#pr-rubro', m).value, alic: Number($('#pr-alic', m).value) };
        const filas = $$('.renglon', cont).map((r) => ({ productoId: $('.r-prod', r).dataset.id, cant: parseInt($('.r-cant', r).value, 10), toc: $('.r-prod', r).value.trim() !== '' }));
        const errores = [];
        if (d.nombre.length < 3) errores.push('nombre');
        if (!/^[A-Z0-9-]{3,}$/.test(d.sku)) errores.push('código');
        if (!id && DB.productos.some((x) => x.sku === d.sku)) errores.push('código (ya existe)');
        DB.listas.forEach((l) => { if (!(precios[l.id] > 0)) errores.push('precio de la lista ' + l.nombre); });
        if (!combo && !(d.costo > 0)) errores.push('costo');
        if (combo && filas.some((f) => f.toc && !f.productoId)) errores.push('componente (elegilo de la lista o quitalo con la x)');
        if (!mostrarErrores(m, errores)) return;
        let pr = id ? producto(id) : null;
        if (!pr) { pr = { id: nuevoId('pr'), tipo: 'terminado', unidad: 'un', minimo: 30, nombre: d.nombre, sku: d.sku, rubro: d.rubro, alic: d.alic, precios, costo: combo ? 0 : d.costo, materiales: [], stockIni: {}, ubic: {} }; DB.productos.push(pr); }
        if (combo) {
          const r = guardarCombo(pr.id, filas.filter((f) => f.productoId).map((f) => ({ productoId: f.productoId, cant: f.cant })));
          if (r.errores) { if (!id) DB.productos.pop(); mostrarErrores(m, r.errores); return; }
        }
        if (id) { Object.assign(pr, { precios, rubro: d.rubro, alic: d.alic }); if (!combo) pr.costo = d.costo; }
        guardar(); cerrarModal();
        const n = canalesPorPublicar(pr);
        toast(id ? 'Precios actualizados.' + (n ? ' Se publica en ' + plural(n, 'tienda', 'tiendas') + '.' : '') : (combo ? 'Combo creado.' : 'Producto creado.') + ' Queda para publicar en ' + plural(n, 'tienda', 'tiendas') + '.');
        if (location.hash !== '#/productos') location.hash = '#/productos'; else render();
        setTimeout(() => abrirProducto(pr.id), 30);
      });
    });
  }
  function modalPrecioFijo(productoId, canalId) {
    const p = producto(productoId), c = canal(canalId); if (!p || !c) return;
    const x = publicacion(p, c);
    abrirModal(cabModal('Precio en ' + c.nombre) +
      '<div class="m-b"><p class="nota">' + esc(p.nombre) + '</p><div class="desglose"><span>Regla de la tienda: ' + esc(reglaTxt(c)) + '</span><span class="num">' + fmt(Math.round(precioDe(p, reglaCanal(c).lista) * (1 + reglaCanal(c).pct / 100))) + '</span><span>Publicado hoy</span><span class="num">' + (x.publicado ? fmt(x.publicado) : 'Sin publicar') + '</span></div>' +
      '<div class="campo"><label for="pf-fijo">Precio fijo para esta tienda</label><input class="input num" id="pf-fijo" inputmode="decimal" placeholder="Vacío: usa la regla" value="' + (x.fijo ? fmtInput(x.fijo) : '') + '"><span class="ayuda">Dejalo vacío para volver a la regla de la tienda</span></div></div>' + pieModal('pf-ok'), (m) => {
      campoMonto($('#pf-fijo', m));
      $('#pf-ok', m).addEventListener('click', () => {
        const r = fijarPrecioPublicado(p.id, c.id, numOpc($('#pf-fijo', m).value));
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(r.publicacion.estado === 'Pendiente' ? 'Precio guardado. Queda pendiente de publicar en ' + c.nombre + '.' : 'Precio guardado.'); render();
      });
    });
  }
  function modalPrecios() {
    const rubros = Array.from(new Set(terminados().map((x) => x.rubro)));
    abrirModal(cabModal('Cambio masivo de precios') +
      '<div class="m-b"><div class="fila-3"><div class="campo"><label for="pm-rubro">Rubro</label><select class="input" id="pm-rubro">' + opciones([['', 'Todos']].concat(rubros.map((r) => [r, r]))) + '</select></div><div class="campo"><label for="pm-lista">Lista de precios</label><select class="input" id="pm-lista">' + opciones([['', 'Todas']].concat(DB.listas.map((l) => [l.id, l.nombre]))) + '</select></div><div class="campo"><label for="pm-pct">Porcentaje</label><input class="input num" id="pm-pct" inputmode="decimal" placeholder="Ej: 8 o -5"></div></div>' +
      '<div id="pm-vista"><p class="nota">Primero mirá la vista previa. Nada cambia hasta que confirmes.</p></div></div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="button" class="btn" id="pm-previa">Ver vista previa</button><button type="button" class="btn primary" id="pm-ok" disabled>Confirmar cambio</button></div>', (m) => {
      const leer = () => ({ rubro: $('#pm-rubro', m).value, lista: $('#pm-lista', m).value, pct: parseNum($('#pm-pct', m).value) });
      let visto = '';
      const invalidar = () => { visto = ''; $('#pm-ok', m).disabled = true; };
      ['#pm-rubro', '#pm-lista', '#pm-pct'].forEach((s) => $(s, m).addEventListener('input', invalidar));
      $('#pm-previa', m).addEventListener('click', () => {
        const d = leer(), pv = previaPrecios(d);
        if (pv.errores) { invalidar(); setHTML($('#pm-vista', m), ''); mostrarErrores(m, pv.errores); return; }
        mostrarErrores(m, []);
        const prods = new Set(pv.filas.map((x) => x.p.id)).size;
        setHTML($('#pm-vista', m), '<p class="nota">' + plural(pv.filas.length, 'precio cambia', 'precios cambian') + ' en ' + plural(prods, 'producto', 'productos') + '. Después hay que publicarlos en las tiendas.</p><div class="tabla-wrap"><table class="compacta"><thead><tr><th>Producto</th><th>Lista</th><th class="num">Hoy</th><th class="num">Queda</th></tr></thead><tbody>' + pv.filas.slice(0, 8).map((x) => '<tr><td>' + esc(x.p.nombre) + '</td><td>' + esc(x.lista.nombre) + '</td><td class="num">' + fmt0(x.antes) + '</td><td class="num"><b>' + fmt0(x.despues) + '</b></td></tr>').join('') + '</tbody>' + (pv.filas.length > 8 ? '<tfoot><tr><td colspan="4">y ' + (pv.filas.length - 8) + ' más</td></tr></tfoot>' : '') + '</table></div>');
        visto = JSON.stringify(d); $('#pm-ok', m).disabled = false;
      });
      $('#pm-ok', m).addEventListener('click', () => {
        const d = leer();
        if (visto !== JSON.stringify(d)) { invalidar(); return; }
        const r = cambiarPrecios(d);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(plural(r.cambios, 'precio cambiado', 'precios cambiados') + '. ' + (r.porPublicar ? plural(r.porPublicar, 'publicación queda', 'publicaciones quedan') + ' para publicar en las tiendas.' : 'No hay nada para publicar.'));
        render();
      });
    });
  }

  /* ---------- depósito: ingreso de proveedor ---------- */
  function modalIngreso() {
    const deps = DB.depositos.filter((d) => !d.noDisponible);
    abrirModal(cabModal('Ingreso de proveedor') +
      '<div class="m-b"><div class="fila-2"><div class="campo sugerencias"><label for="in-prov">Proveedor</label><input class="input" id="in-prov" autocomplete="off" placeholder="Buscar por nombre o CUIT"><div class="lista"></div></div><div class="campo"><label for="in-dep">Entra al depósito</label><select class="input" id="in-dep">' + opciones(deps.map((d) => [d.id, d.nombre]), (depMateria() || {}).id) + '</select></div></div>' +
      '<div class="campo"><label>Artículos</label><div id="in-renglones" style="display:grid;gap:8px"></div><button type="button" class="btn sm" id="in-agregar" style="align-self:flex-start"><i class="ph ph-plus"></i>Agregar artículo</button></div>' +
      '<label class="btn" style="justify-self:start"><input type="checkbox" id="in-recibido" checked> Ya se recibió: suma al stock ahora</label></div>' + pieModal('in-ok', 'Generar remito de compra'), (m) => {
      const cont = $('#in-renglones', m);
      sugeridor($('#in-prov', m), (q) => DB.proveedores.filter((p) => p.tipo === 'Proveedor' && (!q || coincide(p.nombre + ' ' + p.cuit, q))).map((p) => ({ id: p.id, label: p.nombre, sub: p.rubro })), () => {});
      const agregar = () => {
        const div = document.createElement('div'); div.className = 'renglon';
        setHTML(div, '<div class="sugerencias"><input class="input r-prod" autocomplete="off" placeholder="Materia prima o producto" aria-label="Artículo"><div class="lista"></div></div><input class="input num r-cant" inputmode="decimal" placeholder="0" aria-label="Cantidad"><button type="button" class="btn icon ghost r-quitar" aria-label="Quitar"><i class="ph ph-x"></i></button>');
        cont.appendChild(div);
        sugeridor($('.r-prod', div), (q) => DB.productos.filter((p) => !esCombo(p) && (!q || coincide(p.nombre + ' ' + p.sku, q))).sort((a, b) => Number(esMateria(b)) - Number(esMateria(a))).map((p) => ({ id: p.id, label: p.nombre, sub: esMateria(p) ? 'Materia prima · ' + p.unidad : p.sku })), () => {});
        $('.r-quitar', div).addEventListener('click', () => div.remove());
      };
      $('#in-agregar', m).addEventListener('click', agregar);
      agregar();
      $('#in-ok', m).addEventListener('click', () => {
        const filas = $$('.renglon', cont).map((r) => ({ productoId: $('.r-prod', r).dataset.id, cant: parseNum($('.r-cant', r).value), toc: $('.r-prod', r).value.trim() !== '' }));
        const r = filas.some((f) => f.toc && !f.productoId) ? { errores: ['artículo (elegilo de la lista o quitá el renglón con la x)'] } : registrarIngreso({ proveedorId: $('#in-prov', m).dataset.id, depositoId: $('#in-dep', m).value, items: filas.filter((f) => f.productoId), recibido: $('#in-recibido', m).checked });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Remito de compra ' + r.remito.nro + (r.remito.estado === 'Entregado' ? ' recibido: el stock ya entró.' : ' generado. Suma al stock cuando se reciba.'));
        render(); abrirRemito(r.remito.id);
      });
    });
  }

  /* ---------- producción: nueva orden ---------- */
  function modalOrden() {
    abrirModal(cabModal('Nueva orden de fabricación') +
      '<div class="m-b"><div class="campo sugerencias"><label for="of-prod">Producto a fabricar</label><input class="input" id="of-prod" autocomplete="off" placeholder="Buscar producto"><div class="lista"></div></div>' +
      '<div class="fila-3"><div class="campo"><label for="of-cant">Cantidad</label><input class="input num" id="of-cant" inputmode="numeric" placeholder="0"></div><div class="campo"><label for="of-resp">Responsable</label><select class="input" id="of-resp">' + opciones([['', 'Elegir']].concat(activos('operadores').map((x) => [x.id, x.nombre]))) + '</select></div><div class="campo"><label for="of-prev">Fecha prevista</label><input class="input" type="date" id="of-prev" value="' + toISODate(masDias(INI_HOY, 7)) + '"></div></div>' +
      '<div id="of-mats"><p class="nota">Elegí el producto y la cantidad para ver la materia prima que consume.</p></div></div>' + pieModal('of-ok', 'Crear orden'), (m) => {
      const leer = () => ({ productoId: $('#of-prod', m).dataset.id, cant: /^\d+$/.test($('#of-cant', m).value.trim()) ? Number($('#of-cant', m).value.trim()) : NaN, responsableId: $('#of-resp', m).value, prevista: $('#of-prev', m).value });
      const pintar = () => {
        const d = leer(), p = producto(d.productoId);
        if (!p || !(d.cant > 0)) return;
        const mats = materialesOrden({ productoId: p.id, cant: d.cant });
        setHTML($('#of-mats', m), '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>Materia prima</th><th class="num">Necesita</th><th class="num">Hay</th><th></th></tr></thead><tbody>' + mats.map((x) => { const a = producto(x.productoId); return '<tr><td>' + esc(nombreDe(a)) + '</td><td class="num">' + fCant(x.necesita) + ' ' + esc(a ? a.unidad : '') + '</td><td class="num">' + fCant(x.hay) + '</td><td>' + (x.falta ? '<span class="badge b-bad">Faltan ' + fCant(x.falta) + '</span>' : '<span class="badge b-ok">Alcanza</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (mats.some((x) => x.falta) ? '<p class="nota" style="margin-top:8px">Se puede crear igual: para terminarla va a hacer falta que entre la materia prima.</p>' : ''));
      };
      sugeridor($('#of-prod', m), (q) => terminados().filter((p) => !esCombo(p) && (p.materiales || []).length && (!q || coincide(p.nombre + ' ' + p.sku, q))).map((p) => ({ id: p.id, label: p.nombre, sub: 'hay ' + fCant(stockDe(p.id)) })), pintar);
      $('#of-cant', m).addEventListener('input', pintar);
      $('#of-ok', m).addEventListener('click', () => {
        const r = guardarOrden(leer());
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Orden de fabricación ' + r.orden.nro + ' creada.');
        if (location.hash !== '#/produccion') location.hash = '#/produccion'; else render();
        setTimeout(() => abrirOrden(r.orden.id), 30);
      });
    });
  }

  /* ---------- ARCA: revisar un comprobante recibido ---------- */
  function modalArca(id) {
    const x = DB.arca.recibidos.find((r) => r.id === id); if (!x) return;
    const p = proveedorPorCuit(x.cuit);
    const rubros = Array.from(new Set(DB.proveedores.map((q) => q.rubro).filter(Boolean)));
    abrirModal(cabModal('Revisar comprobante de ARCA') +
      '<div class="m-b"><dl class="kv"><dt>Comprobante</dt><dd class="mono">' + esc(x.tipoComp + ' ' + x.pv + '-' + x.nro) + '</dd><dt>Fecha</dt><dd>' + fFecha(x.fecha) + '</dd><dt>Emisor</dt><dd>' + esc(x.razon) + ' · <span class="mono">' + esc(x.cuit) + '</span></dd><dt>Neto gravado</dt><dd class="num">' + fmt(x.neto) + '</dd><dt>IVA ' + String(x.alic).replace('.', ',') + '%</dt><dd class="num">' + fmt(x.iva) + '</dd>' + (x.perc || []).map((q) => '<dt>Percepción ' + esc(q.imp) + '</dt><dd class="num">' + fmt(q.monto) + '</dd>').join('') + (x.noGravado ? '<dt>No gravado</dt><dd class="num">' + fmt(x.noGravado) + '</dd>' : '') + '<dt>Total</dt><dd class="num"><b>' + fmt(x.monto) + '</b></dd></dl>' +
      (p ? '<div class="fila-2"><div class="campo"><label>Proveedor</label><input class="input" value="' + esc(p.nombre) + '" readonly><span class="ayuda">Encontrado por el CUIT</span></div><div class="campo"><label for="ac-gasto">Tipo de gasto</label><select class="input" id="ac-gasto">' + opciones(rubros.map((r) => [r, r]), p.rubro) + '</select></div></div>' +
        '<div class="campo"><label for="ac-vence">Vence</label><input class="input" type="date" id="ac-vence" value="' + toISODate(masDias(D(x.fecha), 30)) + '"></div>'
        : '<div class="aviso-errores" role="alert">No hay un proveedor con este CUIT. Hay que darlo de alta para poder cargar el comprobante.</div>') + '</div>' +
      '<div class="m-f"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button>' + (p ? '<button type="button" class="btn primary" id="ac-ok">Cargar en la cuenta del proveedor</button>' : '<button type="button" class="btn primary" data-accion="nuevo-proveedor" data-cuit="' + esc(x.cuit) + '" data-nombre="' + esc(x.razon) + '">Crear el proveedor</button>') + '</div>', (m) => {
      if (!p) return;
      $('#ac-ok', m).addEventListener('click', () => {
        const r = cargarDeArca(x.id, { proveedorId: p.id, tipoGasto: $('#ac-gasto', m).value, vence: $('#ac-vence', m).value });
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast('Comprobante cargado en la cuenta de ' + p.nombre + '.'); render();
      });
    });
  }

  /* ---------- maestros: vendedores, operadores y listas de precios ---------- */
  function modalMaestro(col, id) {
    const x = id ? DB[col].find((y) => y.id === id) : null;
    const que = { vendedores: 'vendedor', operadores: 'operador', listas: 'lista de precios' }[col];
    if (!que || (id && !x)) return;
    abrirModal(cabModal((x ? 'Editar ' : col === 'listas' ? 'Nueva ' : 'Nuevo ') + que) +
      '<div class="m-b"><div class="campo"><label for="ma-nombre">Nombre</label><input class="input" id="ma-nombre" value="' + esc(x ? x.nombre : '') + '"></div>' +
      (col === 'operadores' ? '<div class="campo"><label for="ma-rol">Rol</label><select class="input" id="ma-rol">' + opciones(ROLES.map((r) => [r, r]), x ? x.rol : 'Ventas') + '</select><span class="ayuda">En la maqueta es solo el listado: no hay ingreso con clave</span></div>' : '') +
      (col === 'listas' && !x ? '<div class="campo"><label for="ma-pct">Arranca en este porcentaje de la lista Minorista</label><input class="input num" id="ma-pct" inputmode="decimal" placeholder="Ej: 85"><span class="ayuda">Después cada precio se puede cambiar en el producto</span></div>' : '') +
      (col !== 'listas' && x ? '<label class="btn" style="justify-self:start"><input type="checkbox" id="ma-baja"' + (x.baja ? ' checked' : '') + '> Dado de baja (no se borra: queda en lo que ya cargó)</label>' : '') + '</div>' + pieModal('ma-ok'), (m) => {
      $('#ma-ok', m).addEventListener('click', () => {
        const r = guardarMaestro(col, { nombre: $('#ma-nombre', m).value, rol: $('#ma-rol', m) ? $('#ma-rol', m).value : '', pct: $('#ma-pct', m) ? parseNum($('#ma-pct', m).value) : 0, baja: $('#ma-baja', m) ? $('#ma-baja', m).checked : false }, id);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(x ? 'Datos actualizados.' : mayus(que) + ' ' + r.registro.nombre + (col === 'listas' ? ' creada.' : ' creado.'));
        UI.config.tab = col;
        if (location.hash !== '#/config') location.hash = '#/config'; else render();
      });
    });
  }

  /* ---------- cheques de terceros: depositar uno o varios ---------- */
  function modalDepositar() {
    const lista = chequesEnCartera().sort((a, b) => a.c.cheque.vence < b.c.cheque.vence ? -1 : 1);
    const filas = lista.map(({ v, c }) => '<label class="fila-check"><input type="checkbox" class="chk-cheque" value="' + c.nro + '" data-monto="' + netoCobro(v, c) + '"><span>' + esc(c.cheque.banco) + ' N° <span class="mono">' + esc(c.cheque.nro) + '</span><span class="sec">' + esc(nombreDe(cliente(v.clienteId))) + ' · vence ' + fFecha(c.cheque.vence) + '</span></span><span class="num">' + fmt(netoCobro(v, c)) + '</span></label>').join('');
    abrirModal(cabModal('Depositar cheques de terceros') +
      '<div class="m-b"><div class="campo"><label>Cheques en cartera</label><div style="display:grid;gap:6px">' + (filas || '<p class="nota">No hay cheques en cartera.</p>') + '</div></div>' +
      '<div class="campo"><label for="dc-banco">Se depositan en</label><select class="input" id="dc-banco">' + opciones(DB.cajas.filter((c) => c.tipo === 'banco').map((c) => [c.id, c.nombre])) + '</select></div>' +
      '<div class="total-modal"><span id="dc-n">Ningún cheque marcado</span><b id="dc-total">$ 0,00</b></div></div>' + pieModal('dc-ok', 'Depositar'), (m) => {
      const marcados = () => $$('.chk-cheque:checked', m);
      const pintar = () => { const xs = marcados(); $('#dc-n', m).textContent = xs.length ? plural(xs.length, 'cheque marcado', 'cheques marcados') : 'Ningún cheque marcado'; $('#dc-total', m).textContent = fmt(xs.reduce((s, x) => s + Number(x.dataset.monto), 0)); };
      $$('.chk-cheque', m).forEach((x) => x.addEventListener('change', pintar));
      $('#dc-ok', m).addEventListener('click', () => {
        const r = depositarCheques(marcados().map((x) => Number(x.value)), $('#dc-banco', m).value);
        if (r.errores) { mostrarErrores(m, r.errores); return; }
        cerrarModal(); toast(plural(r.movs.length, 'cheque depositado', 'cheques depositados') + ' por ' + fmt(r.total) + '.');
        render(); abrirCaja(r.movs[0].desde);
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
    if (pr.length) out.push(['Productos y materia prima', pr.map((p) => ({ tipo: 'producto', id: p.id, label: p.nombre, sub: p.sku }))]);
    const cj = DB.cajas.filter((c) => coincide(c.nombre, s)).slice(0, 4);
    if (cj.length) out.push(['Cajas', cj.map((c) => ({ tipo: 'caja', id: c.id, label: c.nombre, sub: fmt0(c.tipo === 'prestamo' ? prestamoInfo(c).falta : saldoCaja(c.id).saldo) }))]);
    const ch = DB.cheques.filter((x) => coincide(x.nro + ' cheque ' + nombreDe(proveedor(x.proveedorId)), s)).slice(0, 4);
    if (ch.length) out.push(['Cheques propios', ch.map((x) => ({ tipo: 'cheque', id: x.id, label: 'Cheque ' + x.nro + ' · ' + nombreDe(proveedor(x.proveedorId)), sub: estadoCheque(x) }))]);
    const dp = DB.depositos.filter((d) => coincide(d.nombre + ' deposito', s)).slice(0, 4);
    if (dp.length) out.push(['Depósitos', dp.map((d) => ({ tipo: 'deposito', id: d.id, label: d.nombre, sub: d.tipo }))]);
    const rms = DB.remitos.filter((r) => coincide('remito ' + r.nro + ' ' + (r.grupo || ''), s)).slice(-4).reverse();
    if (rms.length) out.push(['Remitos', rms.map((r) => ({ tipo: 'remito', id: r.id, label: 'Remito ' + r.nro + ' · ' + origenRemito(r), sub: estadoRemitoTxt(r) }))]);
    const ofs = DB.ordenes.filter((o) => coincide('orden ' + o.nro + ' ' + nombreDe(producto(o.productoId)), s)).slice(0, 4);
    if (ofs.length) out.push(['Órdenes de fabricación', ofs.map((o) => ({ tipo: 'orden', id: o.id, label: 'Orden ' + o.nro + ' · ' + nombreDe(producto(o.productoId)), sub: o.estado }))]);
    const cn = DB.canales.filter((c) => coincide(c.nombre, s)).slice(0, 4);
    if (cn.length) out.push(['Canales', cn.map((c) => ({ tipo: 'canal', id: c.id, label: c.nombre, sub: CONEXION[c.conexion] }))]);
    const inf = INFS.filter((d) => coincide(d.n + ' informe ' + d.g + ' ' + (d.clave || ''), s)).slice(0, 6);
    if (inf.length) out.push(['Informes', inf.map((d) => ({ tipo: 'informe', id: d.id, label: d.n, sub: d.g }))]);
    return out;
  }
  const ir = (r) => () => { location.hash = '#/' + r; };
  const ACCIONES = [
    { label: 'Nueva venta oficial', ic: 'ph-plus-circle', run: () => modalNuevaVenta('Oficial') },
    { label: 'Nueva venta Neutral', ic: 'ph-plus-circle', run: () => modalNuevaVenta('Neutral') },
    { label: 'Nueva seña', ic: 'ph-plus-circle', run: () => modalNuevaVenta('Seña') },
    { label: 'Nueva cotización', ic: 'ph-file-dashed', run: () => modalNuevaVenta('Cotización') },
    { label: 'Cargar factura de proveedor', ic: 'ph-file-plus', run: () => modalFacturaProveedor(null) },
    { label: 'Transferir entre cajas', ic: 'ph-arrows-left-right', run: () => modalMovCaja('transferencia') },
    { label: 'Nueva caja o préstamo', ic: 'ph-bank', run: () => modalCaja(null) },
    { label: 'Arqueo de caja', ic: 'ph-scales', run: () => modalArqueo() },
    { label: 'Nueva chequera', ic: 'ph-money', run: () => modalChequera() },
    { label: 'Transferir entre depósitos', ic: 'ph-arrows-left-right', run: () => modalMovStock('transferencia') },
    { label: 'Movimiento de stock: ajuste, compra o devolución', ic: 'ph-arrows-down-up', run: () => modalMovStock('ajuste') },
    { label: 'Nuevo depósito', ic: 'ph-warehouse', run: () => modalDeposito(null) },
    { label: 'Agregar tienda', ic: 'ph-plugs-connected', run: () => modalCanal(null) },
    { label: 'Nueva orden de fabricación', ic: 'ph-factory', run: () => modalOrden() },
    { label: 'Ingreso de proveedor (remito de compra)', ic: 'ph-arrow-down', run: () => modalIngreso() },
    { label: 'Depositar cheques de terceros', ic: 'ph-money', run: () => modalDepositar() },
    { label: 'Cambio masivo de precios', ic: 'ph-percent', run: () => modalPrecios() },
    { label: 'Nuevo vendedor', ic: 'ph-user-plus', run: () => modalMaestro('vendedores', null) },
    { label: 'Nuevo operador', ic: 'ph-user-plus', run: () => modalMaestro('operadores', null) },
    { label: 'Nueva lista de precios', ic: 'ph-list-plus', run: () => modalMaestro('listas', null) },
    { label: 'Período: hoy', ic: 'ph-calendar-blank', run: () => { fijarAtajo('hoy'); render(); } },
    { label: 'Período: esta semana', ic: 'ph-calendar-blank', run: () => { fijarAtajo('semana'); render(); } },
    { label: 'Período: este mes', ic: 'ph-calendar-blank', run: () => { fijarAtajo('mes'); render(); } },
    { label: 'Ir a Panel general', ic: 'ph-squares-four', va: true, run: ir('inicio') },
    { label: 'Ir a Centro de ventas', ic: 'ph-receipt', va: true, run: ir('ventas') },
    { label: 'Ir a Ventas a remitir', ic: 'ph-truck', va: true, run: ir('ventas?tab=remitir') },
    { label: 'Ir a Clientes', ic: 'ph-users', va: true, run: ir('clientes') },
    { label: 'Ir a Proveedores y gastos', ic: 'ph-truck', va: true, run: ir('proveedores') },
    { label: 'Ir a Cajas y bancos', ic: 'ph-bank', va: true, run: ir('cajas') },
    { label: 'Ir a Cheques propios (valores diferidos)', ic: 'ph-calendar-check', va: true, run: ir('cajas?tab=cheques') },
    { label: 'Ir a Productos y stock', ic: 'ph-package', va: true, run: ir('productos') },
    { label: 'Ir a Publicaciones en las tiendas', ic: 'ph-storefront', va: true, run: ir('productos?tab=publicaciones') },
    { label: 'Ir a Depósito: ventas para remitir', ic: 'ph-truck', va: true, run: ir('depositos?tab=remitir') },
    { label: 'Ir a Remitos', ic: 'ph-file-text', va: true, run: ir('depositos?tab=remitos') },
    { label: 'Ir a Rendición del depósito', ic: 'ph-list-checks', va: true, run: ir('depositos?tab=rendicion') },
    { label: 'Ir a Stock por depósito', ic: 'ph-warehouse', va: true, run: ir('depositos?tab=terminados') },
    { label: 'Ir a Producción', ic: 'ph-factory', va: true, run: ir('produccion') },
    { label: 'Ir a Canales y tiendas', ic: 'ph-plugs-connected', va: true, run: ir('canales') },
    { label: 'Ir a Facturación y ARCA', ic: 'ph-cloud-arrow-down', va: true, run: ir('config?tab=facturacion') },
    { label: 'Ir a Vendedores, operadores y listas de precios', ic: 'ph-gear-six', va: true, run: ir('config?tab=vendedores') },
    { label: 'Ir a Informes', ic: 'ph-chart-bar', va: true, run: ir('informes') },
    { label: 'Cambiar tema claro u oscuro', ic: 'ph-moon', run: () => { const b = document.querySelector('[data-accion="tema"]'); if (b) b.click(); } }
  ];
  const ICONO_TIPO = { venta: 'ph-receipt', cliente: 'ph-user', proveedor: 'ph-truck', producto: 'ph-package', caja: 'ph-bank', cheque: 'ph-money', deposito: 'ph-warehouse', canal: 'ph-storefront', remito: 'ph-truck', orden: 'ph-factory', informe: 'ph-chart-bar' };
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
    if (q.trim()) { grupos.push(...res); if (acc.length) grupos.push(['Acciones', acc.slice(0, 6)]); }
    else grupos.push(['Acciones rápidas', acc.filter((a) => !a.va).slice(0, 6)], ['Ir a', acc.filter((a) => a.va)]);
    paletaItems = grupos.flatMap((g) => g[1]);
    if (paletaActivo >= paletaItems.length) paletaActivo = 0;
    let i = 0;
    setHTML($('#resultados-global'), paletaItems.length ? grupos.map(([t, items]) => '<h4>' + esc(t) + '</h4>' + items.map((it) => { const k = i++; return '<button type="button" role="option" data-i="' + k + '" aria-selected="' + (k === paletaActivo) + '" class="' + (k === paletaActivo ? 'activo' : '') + '"><i class="ph ' + esc(it.ic || 'ph-arrow-right') + '"></i><span>' + esc(it.label) + '</span><span class="r-sub">' + esc(it.sub || '') + '</span></button>'; }).join('')).join('') : '<div class="vacio">Sin resultados para "' + esc(q) + '"</div>');
    const act = $('#resultados-global .activo'); if (act) act.scrollIntoView({ block: 'nearest' });
  }
  function ejecutarItem(it) {
    cerrarPaleta();
    if (it.run) { it.run(); return; }
    if (it.tipo === 'canal') { location.hash = '#/ventas?canal=' + it.id; return; }
    if (it.tipo === 'informe') { location.hash = '#/' + (INF[it.id].link || 'informe/' + it.id); return; }
    const p = it.tipo === 'producto' ? producto(it.id) : null;
    const destino = { venta: 'ventas', cliente: 'clientes', proveedor: 'proveedores', producto: p && esMateria(p) ? 'depositos' : 'productos', caja: 'cajas', cheque: 'cajas?tab=cheques', deposito: 'depositos?tab=terminados', remito: 'depositos?tab=remitos', orden: 'produccion' }[it.tipo];
    const abrir = { venta: abrirVenta, cliente: abrirCliente, proveedor: abrirProveedor, producto: abrirProducto, caja: abrirCaja, cheque: abrirCheque, deposito: abrirDeposito, remito: abrirRemito, orden: abrirOrden }[it.tipo];
    if (it.tipo === 'proveedor') UI.proveedores.tab = proveedor(it.id).tipo;
    if (p && esMateria(p)) UI.depositos.tab = 'materia';
    if (location.hash !== '#/' + destino) location.hash = '#/' + destino; else render();
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
  /* En pantallas angostas las tablas de las vistas pasan a tarjetas: cada celda lleva el nombre de su columna. Solo dibuja. */
  function etiquetarTablas() {
    $$('#vista table').forEach((t) => {
      const ths = $$('thead th', t).map((th) => th.textContent.trim());
      if (!ths.length) return;
      t.classList.add('a-tarjetas');
      $$('tbody tr', t).forEach((tr) => { if (tr.children.length === ths.length) Array.from(tr.children).forEach((td, i) => { if (ths[i]) td.setAttribute('data-th', ths[i]); }); });
    });
  }
  /* Pestañas y modos que no entran: degradé en el borde mientras quede algo a la derecha. Solo dibuja. */
  function marcarDesbordes() {
    $$('#vista .tabs, #vista .inf-modos').forEach((x) => x.classList.toggle('con-mas', x.scrollWidth - x.clientWidth - x.scrollLeft > 4));
  }
  document.addEventListener('scroll', (e) => { if (e.target && e.target.classList && (e.target.classList.contains('tabs') || e.target.classList.contains('inf-modos'))) marcarDesbordes(); }, true);
  window.addEventListener('resize', () => marcarDesbordes());
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
  function restablecer() {
    DB = window.HDC_SEED(); guardar(); fijarAtajo('mes');
    Object.assign(UI.ventas, { tab: 'todas', canal: '', q: '', limite: 60 });
    Object.assign(UI.cajas, { tab: 'cajas', cheques: 'A debitar' });
    Object.assign(UI.depositos, { tab: 'remitir', q: '', pasillo: '', tipo: '', remEstado: 'curso', remTipo: '', limite: 80 });
    Object.assign(UI.productos, { tab: 'lista', q: '', rubro: '', canal: '', estado: '' });
    Object.assign(UI.produccion, { tab: 'tablero', estado: '' });
    UI.config.tab = 'canales';
    UI.informes.q = '';
  }
  function arcaRevisada(ventaId) { DB.arca.revisar = DB.arca.revisar.filter((x) => x.ventaId !== Number(ventaId)); guardar(); return { ok: true }; }
  /* Lo que devuelve una operación: si trae errores se avisa y no se toca nada más. */
  const hecho = (r, msg) => { if (r.errores) { avisoError(r); return false; } toast(msg); return true; };
  document.addEventListener('click', (e) => {
    if (CAL.el && !e.target.closest('.fechas') && !e.target.closest('.cal')) cerrarCal();
    const ac = e.target.closest('[data-accion]');
    const irA = e.target.closest('[data-ir]');
    const fila = e.target.closest('input[type=checkbox]') ? null : e.target.closest('[data-venta],[data-cliente],[data-proveedor],[data-producto],[data-caja],[data-cheque],[data-deposito],[data-canal],[data-remito],[data-orden],[data-maestro]');
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
        case 'abrir-fechas': if (CAL.el && CAL.boton === ac) cerrarCal(true); else abrirCal(ac); return;
        case 'atajo-fechas': fijarAtajo(ac.dataset.atajo); aplicarRango(); return;
        case 'cal-mes': { const paso = Number(ac.dataset.paso); CAL.mes = new Date(CAL.mes.getFullYear(), CAL.mes.getMonth() + paso, 1); pintarCal(); const b = CAL.el.querySelector('[data-paso="' + paso + '"]'); if (b) b.focus(); return; }
        case 'cal-dia': elegirDia(ac.dataset.dia); return;
        case 'paleta': abrirPaleta(); return;
        case 'nueva-venta': modalNuevaVenta(ac.dataset.version || 'Oficial', ac.dataset.clienteId); return;
        case 'cerrar-drawer': cerrarDrawer(); return;
        case 'cerrar-modal': cerrarModal(); return;
        case 'tab-ventas': UI.ventas.tab = ac.dataset.tab; UI.ventas.limite = 60; refrescar(); return;
        case 'tab-clientes': UI.clientes.tab = ac.dataset.tab; UI.clientes.limite = 60; refrescar(); return;
        case 'tab-proveedores': UI.proveedores.tab = ac.dataset.tab; refrescar(); return;
        case 'tab-cajas': UI.cajas.tab = ac.dataset.tab; refrescar(); return;
        case 'vista-cheques': UI.cajas.cheques = ac.dataset.vista; refrescar(); return;
        case 'tab-depositos': Object.assign(UI.depositos, { tab: ac.dataset.tab, q: '', pasillo: '', tipo: '', limite: 80 }); refrescar(); return;
        case 'mas-ventas': UI.ventas.limite += 60; refrescar(); return;
        case 'mas-clientes': UI.clientes.limite += 60; refrescar(); return;
        case 'mas-movs-stock': UI.depositos.limite += 80; refrescar(); return;
        case 'limpiar-ventas': Object.assign(UI.ventas, { q: '', canal: '' }); if (location.hash !== '#/ventas') history.replaceState(null, '', '#/ventas'); refrescar(); return;
        case 'exportar-ventas': descargarCSV('ventas-hdc', ['Venta', 'Fecha', 'Cliente', 'Canal', 'Versión', 'Comprobante', 'Vendedor', 'Total', 'Cobrado', 'Estado de cobro', 'Acreditación', 'Neto'], filtrarVentas().map((v) => [v.id, fFechaHora(v.fecha), cliente(v.clienteId).nombre, canal(v.canal).nombre, v.version, compTxt(v), nombreDe(vendedor(v.vendedorId)), v.total, cobrado(v), estadoCobro(v), estadoAcred(v), netoVenta(v)])); toast('Excel descargado.'); return;
        case 'exportar-informe': if (exportarInforme(id)) toast('Excel descargado.'); else toast('No hay datos para exportar.', 'ph-info'); return;
        case 'descargar-archivo': if (descargarArchivoInf(id)) toast('Archivo descargado. En la maqueta, con datos de ejemplo.'); return;
        case 'inf-modo': fijarFiltroInf('modo', ac.dataset.modo); return;
        case 'inf-todo': UI.informes.todo = ruta().partes[1]; refrescar(); return;
        case 'imprimir-informe': UI.informes.todo = id; refrescar(); window.print(); return;
        case 'limpiar-informe': { const { partes, params } = ruta(); const m = params.get('modo'); history.replaceState(null, '', '#/informe/' + partes[1] + (m ? '?modo=' + encodeURIComponent(m) : '')); refrescar(); return; }
        case 'cobrar-venta': modalCobro([venta(id)], 'Registrar cobro · Venta ' + id); return;
        case 'cobrar-cliente': modalCobro(DB.ventas.filter((v) => v.clienteId === id && saldoVenta(v) > 0.009), 'Registrar cobro · ' + cliente(id).nombre); return;
        case 'remitir': { const r = generarRemitos([id]); if (hecho(r, r.remitos ? 'Remito ' + r.remitos[0].nro + ' generado. El stock salió de ' + nombreDe(deposito(r.remitos[0].depositoId)) + '.' : '')) { const enFicha = $('#drawer-wrap').classList.contains('abierto'); render(); if (enFicha) abrirVenta(id); } return; }
        case 'despachar': { const rm = remitoDe(venta(id)); if (rm && hecho(cambiarEstadoRemito(rm.id, 'En camino'), 'Venta ' + id + ' en camino.')) { render(); abrirVenta(id); } return; }
        case 'convertir-cotizacion': { const r = convertirCotizacion(id); if (hecho(r, 'Cotización pasada a venta. Factura emitida (simulada).')) { render(); abrirVenta(id); } return; }
        case 'anular': { const v0 = venta(id); confirmar('Anular venta ' + id, (v0.version === 'Oficial' ? 'Se emite una nota de crédito por el total, se' : 'Se') + ' devuelve el cobro y el stock vuelve' + (remitoDe(v0) && !aEnviar(v0) ? ' al depósito A revisión' : ' a su depósito') + '. No se puede deshacer.', 'Anular venta', () => {
          const r = anularVenta(id);
          if (hecho(r, r.venta ? 'Venta anulada. ' + ncTxt(r.venta) + (r.venta.version === 'Oficial' ? ' emitida (simulada).' : '.') : '')) { render(); abrirVenta(id); }
        }); return; }
        case 'imprimir': toast('En el sistema final se descarga el PDF del comprobante con su QR de ARCA.'); return;
        case 'nuevo-cliente': modalCliente(null); return;
        case 'editar-cliente': modalCliente(id); return;
        case 'nuevo-proveedor': modalProveedor(null, { cuit: ac.dataset.cuit, nombre: ac.dataset.nombre }); return;
        case 'editar-proveedor': modalProveedor(id); return;
        case 'nueva-factura-prov': modalFacturaProveedor(id); return;
        case 'pagar-proveedor': modalPago(id); return;
        case 'anular-pago': { const op = ac.dataset.op; confirmar('Anular orden de pago ' + op, 'La factura vuelve a quedar pendiente y la plata vuelve a la caja.', 'Anular orden de pago', () => { if (hecho(anularPago(id, op), 'Orden de pago ' + op + ' anulada. La factura quedó pendiente.')) { render(); abrirProveedor(id); } }); return; }
        case 'mov-caja': modalMovCaja(ac.dataset.tipo, { desde: ac.dataset.desde, hacia: ac.dataset.hacia }); return;
        case 'anular-mov-caja': { const cajaId = ac.dataset.cajaId; confirmar('Anular movimiento', 'Si es una transferencia, se anula en las dos cajas a la vez.', 'Anular movimiento', () => { if (hecho(anularMovCaja(id), 'Movimiento anulado.')) { render(); abrirCaja(cajaId); } }); return; }
        case 'nueva-caja': modalCaja(null); return;
        case 'editar-caja': modalCaja(id); return;
        case 'arqueo': modalArqueo(id); return;
        case 'conciliar': if (hecho(conciliarCaja(id), caja(id).nombre + ' conciliado con el extracto.')) { render(); abrirCaja(id); } return;
        case 'nueva-chequera': modalChequera(); return;
        case 'debitar-cheque': if (hecho(debitarCheque(id), 'Débito registrado: el cheque salió del banco.')) { render(); abrirCheque(id); } return;
        case 'deshacer-debito': { const deb = debitoDe(cheque(id)); if (deb && hecho(anularMovCaja(deb.id), 'Débito deshecho: el cheque vuelve a estar a debitar.')) { render(); abrirCheque(id); } return; }
        case 'baja-cheque': { const ch = cheque(id), motivo = ac.dataset.motivo; confirmar(motivo === 'Rechazado' ? 'Marcar cheque rechazado' : 'Anular cheque', 'Se anula la orden de pago ' + ch.op + ' y la factura vuelve a quedar pendiente.', motivo === 'Rechazado' ? 'Marcar rechazado' : 'Anular cheque', () => { if (hecho(anularPago(ch.proveedorId, ch.op, motivo), 'Cheque ' + ch.nro + ' ' + motivo.toLowerCase() + '. La factura quedó pendiente.')) { render(); abrirCheque(id); } }); return; }
        case 'mov-stock': modalMovStock(ac.dataset.tipo, { productoId: id, desde: ac.dataset.desde, hacia: ac.dataset.hacia, cant: ac.dataset.cant }); return;
        case 'anular-mov-stock': confirmar('Anular movimiento de stock', 'El stock vuelve a como estaba. Si es una transferencia, se anula en los dos depósitos.', 'Anular movimiento', () => { if (hecho(anularMovStock(id), 'Movimiento de stock anulado.')) render(); }); return;
        case 'nuevo-deposito': modalDeposito(null); return;
        case 'editar-deposito': modalDeposito(id); return;
        case 'ubicacion': modalUbicacion(id, ac.dataset.deposito); return;
        case 'nuevo-canal': modalCanal(null); return;
        case 'editar-producto': modalProducto(id); return;
        case 'nuevo-producto': modalProducto(null); return;
        case 'marcar-todos': $$('.' + ac.dataset.clase).forEach((x) => { x.checked = ac.checked; }); return;
        case 'generar-remitos': { const r = generarRemitos($$('.chk-remitir:checked').map((x) => x.value)); if (hecho(r, r.remitos ? plural(r.remitos.length, 'remito generado', 'remitos generados') + '. El stock ya salió del depósito.' : '')) render(); return; }
        case 'remito-estado': {
          const estado = ac.dataset.estado;
          const seguir = () => { if (hecho(cambiarEstadoRemito(id, estado), estado === 'Anulado' ? 'Remito anulado: el stock volvió a como estaba.' : estado === 'Devuelto' ? 'Remito devuelto: la mercadería quedó en A revisión.' : 'Remito actualizado.')) { render(); abrirRemito(id); } };
          if (estado === 'Anulado') confirmar('Anular remito', 'El stock vuelve a como estaba antes del remito. Si es de venta, la venta queda otra vez para remitir.', 'Anular remito', seguir);
          else if (estado === 'Devuelto') confirmar('Volvió la mercadería', 'La mercadería entra a A revisión y la venta queda otra vez para remitir.', 'Marcar devuelto', seguir);
          else seguir();
          return;
        }
        case 'remitos-estado': { const r = cambiarEstadoRemitos($$('.chk-remito:checked').map((x) => x.value), ac.dataset.estado); if (hecho(r, r.hechos ? plural(r.hechos, 'remito pasó', 'remitos pasaron') + ' a ' + ac.dataset.estado + (r.omitidos ? ' (' + r.omitidos + ' sin cambio)' : '') + '.' : '')) render(); return; }
        case 'remitos-agrupar': { const r = agruparRemitos($$('.chk-remito:checked').map((x) => x.value)); if (hecho(r, r.grupo ? plural(r.remitos.length, 'remito', 'remitos') + ' en la hoja de ruta ' + r.grupo + '.' : '')) render(); return; }
        case 'nuevo-ingreso': modalIngreso(); return;
        case 'exportar-rendicion': { const rd = rendicion(periodo()); descargarCSV('rendicion-hdc', ['Día', 'Producto', 'Remitos', 'Unidades'], rd.filas.map((x) => [fFecha(deISODate(x.dia)), x.nombre, x.remitos, x.cant]).concat([['Total', '', rd.nRemitos, rd.total]])); toast('Excel descargado.'); return; }
        case 'imprimir-vista': window.print(); return;
        case 'tab-produccion': UI.produccion.tab = ac.dataset.tab; refrescar(); return;
        case 'nueva-orden': modalOrden(); return;
        case 'orden-estado': {
          const estado = ac.dataset.estado, o = orden(id);
          const seguir = () => { if (hecho(cambiarEstadoOrden(id, estado), estado === 'Terminada' ? 'Orden terminada: el producto entró a ' + nombreDe(depFabrica()) + ' y se descontó la materia prima.' : estado === 'Anulada' ? 'Orden anulada.' : 'Orden en proceso.')) { render(); abrirOrden(id); } };
          if (estado === 'Anulada') confirmar('Anular orden ' + o.nro, o.estado === 'Terminada' ? 'El producto sale de Fábrica y la materia prima vuelve a su depósito.' : 'La orden queda anulada. No movió stock.', 'Anular orden', seguir); else seguir();
          return;
        }
        case 'tab-productos': UI.productos.tab = ac.dataset.tab; refrescar(); return;
        case 'publicar-pendientes': { const r = publicarPendientes(UI.productos.canal); toast(plural(r.publicadas, 'publicación actualizada', 'publicaciones actualizadas') + '. En el sistema real se publica en la tienda.'); render(); return; }
        case 'precio-fijo': modalPrecioFijo(id, ac.dataset.canal); return;
        case 'precios-masivo': modalPrecios(); return;
        case 'tab-config': UI.config.tab = ac.dataset.tab; refrescar(); return;
        case 'traer-arca': { const r = traerDeArca(); toast(r.nuevos ? plural(r.nuevos, 'comprobante traído', 'comprobantes traídos') + ' de ARCA' + (r.duplicadas ? ' (' + r.duplicadas + ' ya ' + (r.duplicadas === 1 ? 'estaba cargado' : 'estaban cargados') + ')' : '') + '.' : 'No hay comprobantes nuevos en ARCA.'); render(); return; }
        case 'revisar-arca': modalArca(id); return;
        case 'arca-revisada': arcaRevisada(id); toast('Marcada como revisada.'); render(); return;
        case 'nuevo-maestro': modalMaestro(ac.dataset.col, null); return;
        case 'anular-cobro': { const nro = ac.dataset.nro; confirmar('Anular cobro', 'El recibo ' + String(nro).padStart(8, '0') + ' se anula: la plata sale de la caja y la venta vuelve a tener saldo.', 'Anular cobro', () => { if (hecho(anularCobro(id, nro), 'Cobro anulado. La venta quedó con saldo a cobrar.')) { render(); abrirVenta(id); } }); return; }
        case 'depositar-cheques': modalDepositar(); return;
        case 'ver-anulados-caja': UI.cajas.anulados = UI.cajas.anulados === id ? '' : id; abrirCaja(id); return;
        case 'restablecer': e.preventDefault(); confirmar('Restablecer datos de ejemplo', 'Se borra todo lo que cargaste en esta maqueta y vuelve la base de ejemplo original.', 'Restablecer', () => { restablecer(); location.hash = '#/inicio'; render(); toast('Base de ejemplo restablecida.'); }); return;
      }
    }
    if (irA && !e.target.closest('a[href]')) { location.hash = '#/' + irA.dataset.ir; return; }
    if (fila) {
      if (e.target.closest('a[data-cliente],a[data-proveedor],a[data-venta],a[data-producto]')) e.preventDefault();
      if (fila.dataset.venta) abrirVenta(fila.dataset.venta);
      else if (fila.dataset.cliente) abrirCliente(fila.dataset.cliente);
      else if (fila.dataset.cheque) abrirCheque(fila.dataset.cheque);
      else if (fila.dataset.proveedor) abrirProveedor(fila.dataset.proveedor);
      else if (fila.dataset.producto) abrirProducto(fila.dataset.producto);
      else if (fila.dataset.caja) abrirCaja(fila.dataset.caja);
      else if (fila.dataset.deposito) abrirDeposito(fila.dataset.deposito);
      else if (fila.dataset.canal) modalCanal(fila.dataset.canal);
      else if (fila.dataset.remito) abrirRemito(fila.dataset.remito);
      else if (fila.dataset.orden) abrirOrden(fila.dataset.orden);
      else if (fila.dataset.maestro) modalMaestro(fila.dataset.maestro.split('|')[0], fila.dataset.maestro.split('|')[1]);
    }
  });
  function refrescar() {
    const activo = document.activeElement && document.activeElement.id;
    const pos = activo && document.activeElement.selectionStart;
    const { partes, params } = ruta();
    const V = { ventas: vVentas, clientes: vClientes, proveedores: vProveedores, productos: vProductos, cajas: vCajas, depositos: vDepositos, produccion: vProduccion, config: vConfig, canales: vConfig, informes: vInformes, informe: vInforme }[partes[0]];
    if (!V) { render(); return; }
    cerrarCal();
    setHTML($('#vista'), '<div>' + V(partes, params) + '</div>');
    etiquetarTablas();
    pintarNav();
    indicadores();
    marcarDesbordes();
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
    if (id === 'f-dep-q') debounce(() => { UI.depositos.q = e.target.value; UI.depositos.limite = 80; refrescar(); });
    if (id === 'f-informes-q') debounce(() => { UI.informes.q = e.target.value; refrescar(); });
    if (id === 'f-inf-q') debounce(() => fijarFiltroInf('q', e.target.value));
  });
  document.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'f-ventas-canal') { UI.ventas.canal = e.target.value; UI.ventas.limite = 60; refrescar(); }
    if (id === 'f-clientes-saldo') { UI.clientes.conSaldo = e.target.checked; refrescar(); }
    if (id === 'f-prod-rubro') { UI.productos.rubro = e.target.value; refrescar(); }
    if (id === 'f-dep-pasillo') { UI.depositos.pasillo = e.target.value; refrescar(); }
    if (id === 'f-dep-tipo') { UI.depositos.tipo = e.target.value; UI.depositos.limite = 80; refrescar(); }
    if (id === 'f-rem-estado') { UI.depositos.remEstado = e.target.value; UI.depositos.limite = 80; refrescar(); }
    if (id === 'f-rem-tipo') { UI.depositos.remTipo = e.target.value; UI.depositos.limite = 80; refrescar(); }
    if (id === 'f-ord-estado') { UI.produccion.estado = e.target.value; refrescar(); }
    if (id === 'f-pub-canal') { UI.productos.canal = e.target.value; refrescar(); }
    if (id === 'f-pub-estado') { UI.productos.estado = e.target.value; refrescar(); }
    if (e.target.dataset && e.target.dataset.infFiltro) fijarFiltroInf(e.target.dataset.infFiltro, e.target.value);
    if (e.target.classList && e.target.classList.contains('sel-pv') && e.target.value) { const r = asignarPuntoVenta(e.target.value, e.target.dataset.pv); if (hecho(r, r.canal ? r.canal.nombre + ' ahora factura por el punto de venta ' + e.target.dataset.pv + '.' : '')) refrescar(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#paleta-wrap').classList.contains('abierto')) cerrarPaleta(); else abrirPaleta(); return; }
    if (CAL.el && teclaCal(e)) return;
    if (e.key === 'Escape') {
      if ($('#paleta-wrap').classList.contains('abierto')) { cerrarPaleta(); return; }
      if (CAL.el) { cerrarCal(true); return; }
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
  fijarAtajo('mes');
  montarBusqueda();
  render(true);

  /* Para las pruebas automáticas (pruebas-maqueta): expone las mismas funciones que usan las pantallas. No se usa en la maqueta. */
  if (window.HDC_PRUEBAS) {
    window.HDC_API = {
      get DB() { return DB; }, UI, REGLAS, restablecer, render, periodo, fijarRango, fijarAtajo, ventasDelPeriodo, filtrarVentas, resumen, serieDias,
      saldoCaja, movimientosCaja, prestamoInfo, transferir, movimientoCaja, anularMovCaja, registrarArqueo, guardarCaja, conciliarCaja,
      estadoCheque, debitoDe, debitarCheque, totalADebitar, guardarChequera,
      ctaProveedor, deudaProveedores, calcularPago, registrarPago, anularPago, cargarFactura, pagoVigente,
      ctaCliente, aCobrar, saldoVenta, cobrado, acreditadoVenta, utilidadVenta,
      stockDe, stockRevision, moverStock, anularMovStock, movimientosStock, guardarDeposito, guardarUbicacion, valorizado, costoDe,
      guardarCanal, proximoPv, opcionesCobro, registrarVenta, registrarCobro, anularVenta, anularCobro, depositarCheques, chequesEnCartera, convertirCotizacion,
      remitoDe, aRemitir, ventasARemitir, generarRemitos, cambiarEstadoRemito, cambiarEstadoRemitos, agruparRemitos, registrarIngreso, rendicion,
      stockFisico, stockReservado, guardarOrden, cambiarEstadoOrden, materialesOrden,
      publicaciones, publicacion, publicarPendientes, fijarPrecioPublicado, previaPrecios, cambiarPrecios,
      traerDeArca, cargarDeArca, comparacionArca, asignarPuntoVenta, arcaRevisada, guardarMaestro, guardarCombo,
      INFS, calcularInforme, filtrosInforme, exportarInforme, descargarArchivoInf, comprobantesVenta, comprobantesCompra, cruceLibroPanel, renglonesVenta, versionDe, ventasConSaldo, transitoVenta, retencionesSufridas, retencionesPracticadas, prestamosPor, movsProveedor, buscarGlobal, cuitValido,
      abrir: { venta: abrirVenta, cliente: abrirCliente, proveedor: abrirProveedor, caja: abrirCaja, cheque: abrirCheque, producto: abrirProducto, deposito: abrirDeposito, remito: abrirRemito, orden: abrirOrden }
    };
  }
})();

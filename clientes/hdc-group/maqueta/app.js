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
  const VERSION = 7;
  const KEY = 'hdc-argos-maqueta-v7';
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
    const base = v.imp ? v.imp.neto : r2(v.total);
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
    macro: { img: L + 'macro.png' }
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
      const ac = acreditadoVenta(v); r.acreditado += ac; r.transito += netoVenta(v) - ac;
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
    const pagado = (f) => r2(p.movs.filter((m) => pagoVigente(m) && m.aplicaA === f.id).reduce((s, m) => s + m.monto, 0));
    const pend = facs.map((f) => ({ ...f, saldo: r2(f.monto - pagado(f)) })).filter((f) => f.saldo > 0.009);
    const saldo = r2(pend.reduce((s, f) => s + f.saldo, 0));
    const prox = pend.slice().sort((a, b) => a.vence < b.vence ? -1 : 1)[0];
    return { pend, saldo, prox };
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
  function rendicion(p) {
    const porDia = {}, porProd = {};
    let nRemitos = 0, total = 0;
    DB.remitos.forEach((r) => {
      if (r.tipo !== 'venta' || r.estado === 'Anulado' || !enPeriodo(r.fecha, p)) return;
      nRemitos++;
      const dia = toISODate(D(r.fecha));
      itemsRemito(r).forEach((l) => {
        const k = dia + '|' + l.productoId;
        const x = porDia[k] || (porDia[k] = { dia, productoId: l.productoId, nombre: l.nombre, cant: 0, remitos: 0 });
        x.cant += l.cant; x.remitos++;
        const y = porProd[l.productoId] || (porProd[l.productoId] = { productoId: l.productoId, nombre: l.nombre, cant: 0 });
        y.cant += l.cant; total += l.cant;
      });
    });
    return { filas: Object.values(porDia).sort((a, b) => a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : b.cant - a.cant), porProducto: Object.values(porProd).sort((a, b) => b.cant - a.cant), total, nRemitos };
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
    config: { tab: 'canales' }
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
  const CAL = { el: null, mes: null, ancla: '' };
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
    boton.closest('.fechas').appendChild(el);
    boton.setAttribute('aria-expanded', 'true');
    const h = deISODate(RANGO.hasta);
    CAL.el = el; CAL.ancla = ''; CAL.mes = new Date(h.getFullYear(), h.getMonth(), 1);
    pintarCal(RANGO.hasta);
  }
  function cerrarCal(conFoco) {
    if (!CAL.el) return;
    const b = CAL.el.parentElement && CAL.el.parentElement.querySelector('[data-accion="abrir-fechas"]');
    CAL.el.remove(); CAL.el = null;
    if (b) { b.setAttribute('aria-expanded', 'false'); if (conFoco) b.focus(); }
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
    if (f) f.focus();
  }
  function elegirDia(k) {
    if (!CAL.ancla) { CAL.ancla = k; pintarCal(k); return; }
    fijarRango(deISODate(CAL.ancla), deISODate(k), '');
    aplicarRango();
  }
  /* Cambiar el período redibuja la pantalla que esté abierta. El período queda para todas. */
  function aplicarRango() {
    cerrarCal(); UI.animar = true; render();
    const b = $('[data-accion="abrir-fechas"]'); if (b) b.focus();
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
    const ctacte = DB.ventas.filter((v) => saldoVenta(v) > 0.009);
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

    const debePrestamos = r2(DB.cajas.filter((c) => c.tipo === 'prestamo' && c.prestamo.sentido === 'recibido').reduce((s, c) => s + prestamoInfo(c).falta, 0));
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
      (v.imp ? v.imp.alicuotas.map((x) => pie('Neto gravado al ' + pct(x.alic), x.neto, 'suave') + pie('IVA ' + pct(x.alic), x.iva, 'suave')).join('') + v.imp.percepciones.map((x) => pie('Percepción ' + x.imp + ' ' + pct(x.alic), x.monto, 'suave')).join('') : '') +
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
    const delPeriodo = (x) => {
      const ms = x.movs.filter((m) => enPeriodo(m.fecha, p));
      return { comprado: r2(ms.filter((m) => m.tipo === 'factura').reduce((s, m) => s + m.monto, 0)), pagado: r2(ms.filter(pagoVigente).reduce((s, m) => s + m.monto, 0)), ordenes: new Set(ms.filter(pagoVigente).map((m) => m.op)).size };
    };
    const todos = DB.proveedores.map((x) => ({ p: x, k: ctaProveedor(x), per: delPeriodo(x) }));
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
    let s = 0;
    const movs = p.movs.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((m) => { if (m.tipo === 'factura') s = r2(s + m.monto); else if (pagoVigente(m)) s = r2(s - m.monto); return { ...m, saldo: s }; }).reverse();
    const filas = movs.map((m) => {
      const pago = m.tipo === 'pago', vig = pagoVigente(m);
      const sec = pago ? esc(m.medio || '') + (m.chequeId ? ' N° ' + esc(nombreCheque(m.chequeId)) : '') + (m.retenciones ? ' · retenciones ' + fmt(m.retenciones) : '') : 'Vence ' + fFecha(m.vence) + (m.iva ? ' · IVA ' + fmt(m.iva) : '');
      const accion = !pago ? '' : !vig ? '<span class="badge ' + (m.anulado.motivo === 'Rechazado' ? 'b-bad' : 'b-neutro') + '">' + esc(m.anulado.motivo) + '</span>' : m.chequeId ? '<button type="button" class="btn sm" data-cheque="' + esc(m.chequeId) + '">Ver cheque</button>' : '<button type="button" class="btn sm ghost" data-accion="anular-pago" data-id="' + esc(p.id) + '" data-op="' + m.op + '">Anular</button>';
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
      '<div class="tabla-wrap"><table class="compacta"><thead><tr><th>' + (mat ? 'Material' : 'Producto') + '</th><th title="Pasillo, estante y nivel en ' + esc(nombreDe(deposito(ref))) + '">Ubicación</th>' + deps.map((d) => '<th class="num" title="Stock físico en ' + esc(d.nombre) + '">' + esc(d.nombre.replace('Mercado Libre (Full)', 'Full ML').replace('Provincia Compras', 'Provincia')) + '</th>').join('') + '<th class="num" title="Vendido y todavía sin remito">Reservado</th><th class="num" title="Físico menos reservado. No cuenta A revisión">Disponible</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="' + (5 + deps.length) + '"><div class="vacio-estado"><i class="ph ph-package"></i><p>No hay artículos con estos filtros.</p></div></td></tr>') + '</tbody></table></div>';
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
      vs.forEach((v) => v.items.forEach((l) => { const k = l.productoId || l.nombre; const x = m[k] || (m[k] = [l.nombre, 0, 0, 0]); x[1] += l.cant; x[2] += importeLinea(l); x[3] += importeLinea(l) - l.cant * (l.costo || 0); }));
      const filas = Object.values(m).sort((a, b) => b[2] - a[2]);
      if (id === 'utilidad-producto') return { titulo: 'Utilidad por producto', cols: ['Producto', 'Unidades', 'Facturado', 'Utilidad bruta', 'Margen'], num: [1, 2, 3, 4], filas: filas.map((x) => [x[0], x[1], x[2], x[3], Math.round(x[3] / x[2] * 100) + '%']) };
      return { titulo: 'Ventas por producto', cols: ['Producto', 'Unidades', 'Facturado'], num: [1, 2], filas: filas.map((x) => x.slice(0, 3)) };
    }
    if (id === 'iva-ventas') {
      const filas = DB.ventas.filter((v) => esVenta(v) && v.version === 'Oficial').sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((v) => [fFecha(v.fecha), compTxt(v), cliente(v.clienteId).nombre, cliente(v.clienteId).doc, anulada(v) ? 0 : v.imp.neto, anulada(v) ? 0 : v.imp.iva, anulada(v) ? 0 : v.imp.tributos, anulada(v) ? 0 : v.total]);
      return { titulo: 'Libro de IVA ventas', cols: ['Fecha', 'Comprobante', 'Cliente', 'CUIT / DNI', 'Neto gravado', 'IVA', 'Percepciones', 'Total'], num: [4, 5, 6, 7], filas };
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
      const filas = DB.proveedores.flatMap((p) => p.movs.filter((m) => pagoVigente(m) && m.retenciones).map((m) => [fFecha(m.fecha), p.nombre, p.cuit, m.comp, m.monto, m.retenciones]));
      return { titulo: 'Retenciones practicadas', cols: ['Fecha', 'Proveedor', 'CUIT', 'Orden de pago', 'Pagado', 'Retenido'], num: [4, 5], filas };
    }
    if (id === 'stock-valorizado') {
      const filas = DB.productos.filter((p) => !esCombo(p)).map((p) => { const u = stockFisico(p.id); return [p.nombre, u, costoDe(p), r2(u * costoDe(p))]; }).sort((a, b) => b[3] - a[3]);
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
  const ICONO_TIPO = { venta: 'ph-receipt', cliente: 'ph-user', proveedor: 'ph-truck', producto: 'ph-package', caja: 'ph-bank', cheque: 'ph-money', deposito: 'ph-warehouse', canal: 'ph-storefront', remito: 'ph-truck', orden: 'ph-factory' };
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
  }
  function arcaRevisada(ventaId) { DB.arca.revisar = DB.arca.revisar.filter((x) => x.ventaId !== Number(ventaId)); guardar(); return { ok: true }; }
  /* Lo que devuelve una operación: si trae errores se avisa y no se toca nada más. */
  const hecho = (r, msg) => { if (r.errores) { avisoError(r); return false; } toast(msg); return true; };
  document.addEventListener('click', (e) => {
    if (CAL.el && !e.target.closest('.fechas')) cerrarCal();
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
        case 'abrir-fechas': if (CAL.el && CAL.el.parentElement === ac.closest('.fechas')) cerrarCal(true); else abrirCal(ac); return;
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
        case 'exportar-informe': { const inf = datosInforme(id); descargarCSV(id, inf.cols, inf.filas); toast('Excel descargado.'); return; }
        case 'informe-final': abrirModal(cabModal(ac.dataset.nombre) + '<div class="m-b"><p style="margin:0">Este informe sale en el sistema final, con el formato que pide cada organismo, listo para presentar o pasarle al estudio contable. Usa la misma base que el resto de los informes.</p></div><div class="m-f"><button type="button" class="btn primary" data-accion="cerrar-modal">Entendido</button></div>'); return;
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
    const V = { ventas: vVentas, clientes: vClientes, proveedores: vProveedores, productos: vProductos, cajas: vCajas, depositos: vDepositos, produccion: vProduccion, config: vConfig, canales: vConfig }[partes[0]];
    if (!V) { render(); return; }
    cerrarCal();
    setHTML($('#vista'), '<div>' + V(partes, params) + '</div>');
    etiquetarTablas();
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
    if (id === 'f-dep-q') debounce(() => { UI.depositos.q = e.target.value; UI.depositos.limite = 80; refrescar(); });
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
      datosInforme, buscarGlobal,
      abrir: { venta: abrirVenta, cliente: abrirCliente, proveedor: abrirProveedor, caja: abrirCaja, cheque: abrirCheque, producto: abrirProducto, deposito: abrirDeposito, remito: abrirRemito, orden: abrirOrden }
    };
  }
})();

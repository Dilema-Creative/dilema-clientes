/* Motor de cálculo de la maqueta de Momo.
   Regla de Argos: UNA sola regla por concepto. Cada pantalla que muestra un saldo,
   un avance o un total lo pide acá; ninguna vista calcula plata por su cuenta. Nada se tipea: todo se deriva.
   Vínculos siempre por id (nunca por nombre). Lo anulado o rechazado deja de contar en todos lados a la vez. */
(function () {
  'use strict';
  let DB = null;
  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const MON = ['ARS', 'USD'];
  const cero = () => ({ ARS: 0, USD: 0 });
  const hoyISO = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 10); };
  const dias = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(hoyISO() + 'T12:00:00')) / 864e5);

  const M = {
    usar(db) { DB = db; },
    MON, cero, r2, hoyISO, dias,

    /* ---------- maestros ---------- */
    obra: (id) => DB.obras.find((o) => o.id === id),
    cliente: (id) => DB.clientes.find((c) => c.id === id),
    prov: (id) => DB.proveedores.find((p) => p.id === id),
    usuario: (id) => DB.equipo.find((u) => u.id === id),
    rubro: (id) => DB.rubros.find((r) => r.id === id),
    cert: (id) => DB.certificados.find((c) => c.id === id),
    cheque: (id) => DB.cheques.find((c) => c.id === id),
    indice: (mes) => DB.indicesCAC.find((i) => i.mes === mes) || null,
    indiceBase: () => M.indice(DB.config.baseCAC || '2026-03') || DB.indicesCAC[0],

    /* ---------- presupuesto ---------- */
    presDe: (obraId) => DB.presupuestos.filter((p) => p.obra === obraId).sort((a, b) => a.version - b.version),
    presAprobado(obraId) { const l = M.presDe(obraId).filter((p) => p.estado === 'aprobado'); return l[l.length - 1] || null; },
    presBorrador: (obraId) => M.presDe(obraId).find((p) => p.estado === 'borrador') || null,
    presVigente: (obraId) => M.presAprobado(obraId) || M.presBorrador(obraId) || M.presDe(obraId).slice(-1)[0] || null,
    totPres(p) {
      const o = M.obra(p.obra); const hon = (o ? o.honorarios : DB.config.honorarios) / 100;
      const t = { ARS: { costo: 0, venta: 0, hon: 0, total: 0 }, USD: { costo: 0, venta: 0, hon: 0, total: 0 } };
      p.items.forEach((i) => { const m = t[i.mon]; m.costo += i.cant * i.costo; m.venta += i.cant * i.venta; });
      MON.forEach((k) => { const m = t[k]; m.costo = r2(m.costo); m.venta = r2(m.venta); m.hon = r2(m.venta * hon); m.total = r2(m.venta + m.hon); });
      return t;
    },
    margenItem: (i) => i.venta > 0 ? r2((i.venta - i.costo) / i.venta * 100) : 0,

    /* ---------- certificados ---------- */
    certsDe: (obraId, conBorrador) => DB.certificados.filter((c) => c.obra === obraId && c.estado !== 'anulado' && (conBorrador || c.estado === 'emitido')).sort((a, b) => a.num - b.num),
    borradorDe: (obraId) => DB.certificados.find((c) => c.obra === obraId && c.estado === 'borrador') || null,
    /* % acumulado de un ítem en los certificados emitidos anteriores al número dado (o todos) */
    acumAnterior(obraId, itemId, antesDeNum) {
      return r2(M.certsDe(obraId).filter((c) => antesDeNum == null || c.num < antesDeNum).reduce((s, c) => s + (Number(c.avances[itemId]) || 0), 0));
    },
    acumTotal: (obraId, itemId) => M.acumAnterior(obraId, itemId, null),
    calcCert(cert) {
      const o = M.obra(cert.obra); const p = M.presAprobado(cert.obra);
      const hon = o.honorarios / 100; const split = o.splitMO / 100; const ant = (o.anticipo && o.anticipo.fecha ? o.anticipo.pct : 0) / 100;
      const base = M.indiceBase(); const idx = M.indice(cert.mesCAC);
      const res = {}; const lineas = [];
      MON.forEach((k) => { res[k] = { basico: 0, hon: 0, dem: 0, eco: 0, honED: 0, cac: 0, cacMO: 0, cacMat: 0, anticipo: 0, subtotal: 0, iva: 0, total: 0 }; });
      (p ? p.items : []).forEach((i) => {
        const pct = Number(cert.avances[i.id]) || 0; if (!pct) return;
        const imp = r2(i.cant * i.venta * pct / 100); res[i.mon].basico += imp;
        lineas.push({ item: i, pct, imp });
      });
      (cert.ed || []).forEach((e) => { const imp = r2(e.cant * e.precio); if (e.tipo === 'demasia') res[e.mon].dem += imp; else res[e.mon].eco += imp; });
      const cac = { falta: !idx, mes: cert.mesCAC, pctMO: 0, pctMat: 0 };
      if (idx && base) { cac.pctMO = r2((idx.mo / base.mo - 1) * 100); cac.pctMat = r2((idx.mat / base.mat - 1) * 100); }
      MON.forEach((k) => {
        const m = res[k];
        m.basico = r2(m.basico); m.hon = r2(m.basico * hon); m.dem = r2(m.dem); m.eco = r2(m.eco); m.honED = r2(m.dem * hon);
        if (k === 'ARS' && idx) { m.cacMO = r2(m.basico * split * cac.pctMO / 100); m.cacMat = r2(m.basico * (1 - split) * cac.pctMat / 100); m.cac = r2(m.cacMO + m.cacMat); }
        m.anticipo = r2((m.basico + m.hon) * ant);
        m.subtotal = r2(m.basico + m.hon + m.dem - m.eco + m.honED + m.cac - m.anticipo);
        m.iva = cert.comp && cert.comp !== 'sin' ? r2(m.subtotal * DB.config.iva / 100) : 0;
        m.total = r2(m.subtotal + m.iva);
      });
      return { mon: res, cac, lineas, anticipoPct: ant * 100, hon: o.honorarios, split: o.splitMO };
    },
    /* Validación del certificado: lo que bloquea la emisión */
    erroresCert(cert) {
      const err = []; const p = M.presAprobado(cert.obra);
      if (!p) err.push('La obra no tiene presupuesto aprobado');
      if (!cert.fecha) err.push('Fecha del certificado');
      if (!M.indice(cert.mesCAC)) err.push('Índice CAC de ' + M.mesTxt(cert.mesCAC) + ' (no está cargado)');
      let algo = (cert.ed || []).length > 0;
      (p ? p.items : []).forEach((i) => {
        const v = Number(cert.avances[i.id]) || 0; if (v) algo = true;
        if (v < 0) err.push('Avance negativo en "' + i.desc + '"');
        if (M.acumAnterior(cert.obra, i.id, cert.num) + v > 100.0001) err.push('"' + i.desc + '" pasa el 100%');
      });
      (cert.ed || []).forEach((e) => { if (!e.desc || !(e.cant > 0) || !(e.precio > 0)) err.push('Demasía o economía incompleta'); });
      if (!algo) err.push('No hay avance ni demasías cargadas');
      return Array.from(new Set(err));
    },
    mesTxt(mes) { if (!mes) return ''; const [a, m] = mes.split('-'); return ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(m) - 1] + ' ' + a; },
    mesAnterior(iso) { const d = new Date((iso || hoyISO()) + 'T12:00:00'); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().slice(0, 7); },

    /* ---------- comprobantes al cliente (cargos) ---------- */
    cargos(obraId) {
      const o = M.obra(obraId); const out = [];
      if (o.anticipo && o.anticipo.fecha) {
        const p = M.presAprobado(obraId);
        if (p) {
          const t = M.totPres(p); const imp = cero(); const iva = cero();
          MON.forEach((k) => { const n = r2(t[k].total * o.anticipo.pct / 100); iva[k] = o.anticipo.comp !== 'sin' ? r2(n * DB.config.iva / 100) : 0; imp[k] = r2(n + iva[k]); });
          out.push({ id: 'ant-' + obraId, tipo: 'anticipo', obra: obraId, fecha: o.anticipo.fecha, comp: o.anticipo.comp, nombre: 'Anticipo ' + o.anticipo.pct + '%', importes: imp, iva });
        }
      }
      M.certsDe(obraId).forEach((c) => {
        const k = M.calcCert(c); const imp = cero(); const iva = cero();
        MON.forEach((m) => { imp[m] = k.mon[m].total; iva[m] = k.mon[m].iva; });
        out.push({ id: c.id, tipo: 'certificado', obra: obraId, fecha: c.fecha, comp: c.comp, nombre: 'Certificado N° ' + c.num, num: c.num, importes: imp, iva });
      });
      return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
    },
    cargo(id) { const oid = id.startsWith('ant-') ? id.slice(4) : (M.cert(id) || {}).obra; return oid ? M.cargos(oid).find((c) => c.id === id) : null; },
    /* Un cobro vale si no está anulado y su cheque no fue rechazado (rechazo = el comprobante vuelve a deberse) */
    cobroVale(c) { if (c.anulado) return 0; if (c.cheque) { const ch = M.cheque(c.cheque); if (ch && ch.estado === 'rechazado') return 0; } return Number(c.importe) || 0; },
    cobrosDe: (cargoId) => DB.cobros.filter((c) => c.cargo === cargoId),
    estadoCargo(cargo) {
      const cob = cero(); M.cobrosDe(cargo.id).forEach((c) => { cob[c.mon] = r2(cob[c.mon] + M.cobroVale(c)); });
      const saldo = cero(); MON.forEach((k) => { saldo[k] = r2(cargo.importes[k] - cob[k]); });
      const total = cargo.importes.ARS + cargo.importes.USD, cobrado = cob.ARS + cob.USD;
      const pend = MON.some((k) => saldo[k] > 0.5);
      const estado = !pend ? 'Cobrado' : cobrado > 0.5 ? 'Parcial' : 'Pendiente';
      return { cobrado: cob, saldo, estado, total };
    },
    /* Cuenta corriente de una obra: comprobantes al debe, cobros al haber, saldo corrido por moneda */
    ctaCte(obraId, verSin) {
      const filas = [];
      M.cargos(obraId).filter((c) => verSin || c.comp !== 'sin').forEach((c) => {
        MON.forEach((k) => { if (c.importes[k]) filas.push({ fecha: c.fecha, orden: 0, tipo: 'cargo', mon: k, cargo: c, debe: c.importes[k], haber: 0 }); });
        M.cobrosDe(c.id).forEach((cb) => filas.push({ fecha: cb.fecha, orden: 1, tipo: 'cobro', mon: cb.mon, cargo: c, cobro: cb, debe: 0, haber: M.cobroVale(cb) }));
      });
      filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
      const saldo = cero();
      filas.forEach((f) => { saldo[f.mon] = r2(saldo[f.mon] + f.debe - f.haber); f.saldo = saldo[f.mon]; });
      return { filas, saldo };
    },
    porCobrar(obraId, verSin) { const s = cero(); M.cargos(obraId).filter((c) => verSin || c.comp !== 'sin').forEach((c) => { const e = M.estadoCargo(c); MON.forEach((k) => { s[k] = r2(s[k] + Math.max(0, e.saldo[k])); }); }); return s; },
    cobradoObra(obraId, verSin) { const s = cero(); M.cargos(obraId).filter((c) => verSin || c.comp !== 'sin').forEach((c) => { const e = M.estadoCargo(c); MON.forEach((k) => { s[k] = r2(s[k] + e.cobrado[k]); }); }); return s; },

    /* ---------- proveedores de la obra ---------- */
    pagoVale: (p) => p.anulado ? 0 : Number(p.importe) || 0,
    pagosDe: (obraId, provId) => DB.pagos.filter((p) => p.obra === obraId && (!provId || p.prov === provId)),
    provDeObra(obraId) {
      const p = M.presAprobado(obraId); const map = {};
      const fila = (id) => map[id] || (map[id] = { prov: id, pactado: cero(), devengado: cero(), pagado: cero(), items: 0 });
      (p ? p.items : []).forEach((i) => {
        if (!i.prov) return; const f = fila(i.prov); f.items++;
        f.pactado[i.mon] = r2(f.pactado[i.mon] + i.cant * i.costo);
        f.devengado[i.mon] = r2(f.devengado[i.mon] + i.cant * i.costo * M.acumTotal(obraId, i.id) / 100);
      });
      M.certsDe(obraId).forEach((c) => (c.ed || []).forEach((e) => {
        if (!e.prov || !e.costo) return; const f = fila(e.prov); const n = r2(e.cant * e.costo) * (e.tipo === 'demasia' ? 1 : -1);
        f.pactado[e.mon] = r2(f.pactado[e.mon] + n); f.devengado[e.mon] = r2(f.devengado[e.mon] + n);
      }));
      M.pagosDe(obraId).forEach((pg) => { const f = fila(pg.prov); f.pagado[pg.mon] = r2(f.pagado[pg.mon] + M.pagoVale(pg)); });
      return Object.values(map).map((f) => {
        f.aPagar = cero(); f.resta = cero();
        MON.forEach((k) => { f.aPagar[k] = r2(f.devengado[k] - f.pagado[k]); f.resta[k] = r2(f.pactado[k] - f.pagado[k]); });
        return f;
      }).sort((a, b) => (M.prov(a.prov) || {}).razon.localeCompare((M.prov(b.prov) || {}).razon));
    },

    /* ---------- caja chica ---------- */
    cajaDe: (obraId) => DB.caja.filter((c) => c.obra === obraId).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    cajaSaldo(obraId) { return r2(M.cajaDe(obraId).filter((c) => !c.anulado).reduce((s, c) => s + (c.tipo === 'reposicion' ? c.importe : -c.importe), 0)); },
    cajaGastado(obraId) { return r2(M.cajaDe(obraId).filter((c) => !c.anulado && c.tipo === 'gasto').reduce((s, c) => s + c.importe, 0)); },

    /* ---------- resumen de obra (todas las cifras salen de las reglas de arriba) ---------- */
    resumen(obraId, verSin) {
      const p = M.presVigente(obraId);
      const t = p ? M.totPres(p) : { ARS: { costo: 0, venta: 0, hon: 0, total: 0 }, USD: { costo: 0, venta: 0, hon: 0, total: 0 } };
      const ap = M.presAprobado(obraId);
      let pesoTot = 0, pesoHecho = 0; const tc = DB.config.tcRef;
      (ap ? ap.items : []).forEach((i) => { const w = i.cant * i.venta * (i.mon === 'USD' ? tc : 1); pesoTot += w; pesoHecho += w * M.acumTotal(obraId, i.id) / 100; });
      const certificado = cero(); M.certsDe(obraId).forEach((c) => { const k = M.calcCert(c); MON.forEach((m) => { certificado[m] = r2(certificado[m] + k.mon[m].basico); }); });
      const provs = M.provDeObra(obraId); const pagado = cero(), aPagar = cero(), pactado = cero();
      provs.forEach((f) => MON.forEach((k) => { pagado[k] = r2(pagado[k] + f.pagado[k]); aPagar[k] = r2(aPagar[k] + Math.max(0, f.aPagar[k])); pactado[k] = r2(pactado[k] + f.pactado[k]); }));
      const caja = M.cajaGastado(obraId);
      const margen = {}; MON.forEach((k) => { margen[k] = t[k].total ? r2((t[k].total - t[k].costo) / t[k].total * 100) : 0; });
      return {
        pres: t, aprobado: !!ap, avance: pesoTot ? r2(pesoHecho / pesoTot * 100) : 0, certificado,
        cobrado: M.cobradoObra(obraId, verSin), porCobrar: M.porCobrar(obraId, verSin),
        pactado, pagado, aPagar, caja, cajaSaldo: M.cajaSaldo(obraId), margen
      };
    },
    avanceRubros(obraId) {
      const ap = M.presAprobado(obraId); if (!ap) return [];
      const tc = DB.config.tcRef; const map = {};
      ap.items.forEach((i) => { const w = i.cant * i.venta * (i.mon === 'USD' ? tc : 1); const r = map[i.rubro] || (map[i.rubro] = { rubro: i.rubro, tot: 0, hecho: 0 }); r.tot += w; r.hecho += w * M.acumTotal(obraId, i.id) / 100; });
      return Object.values(map).map((r) => ({ rubro: r.rubro, pct: r.tot ? r2(r.hecho / r.tot * 100) : 0 })).sort((a, b) => Number(M.rubro(a.rubro).num) - Number(M.rubro(b.rubro).num));
    },

    /* ---------- flujo mensual (cobros que valen contra egresos: pagos, caja chica y gastos del estudio), en pesos ---------- */
    flujoMensual(n, verSin) {
      const meses = []; const d = new Date(hoyISO() + 'T12:00:00'); d.setDate(1);
      for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); meses.push({ mes: x.toISOString().slice(0, 7), cobros: 0, egresos: 0 }); }
      const en = (f) => meses.find((m) => m.mes === f.slice(0, 7));
      DB.cobros.forEach((c) => { if (c.mon !== 'ARS') return; const cg = M.cargo(c.cargo); if (!verSin && cg && cg.comp === 'sin') return; const m = en(c.fecha); if (m) m.cobros += M.cobroVale(c); });
      DB.pagos.forEach((p) => { if (p.mon !== 'ARS') return; const m = en(p.fecha); if (m) m.egresos += M.pagoVale(p); });
      DB.caja.forEach((c) => { if (c.anulado || c.tipo !== 'gasto') return; const m = en(c.fecha); if (m) m.egresos += c.importe; });
      DB.gastos.forEach((g) => { if (g.anulado) return; const m = en(g.fecha); if (m) m.egresos += g.importe; });
      meses.forEach((m) => { m.cobros = r2(m.cobros); m.egresos = r2(m.egresos); });
      return meses;
    },
    /* ---------- cuenta corriente total de un cliente (suma de sus obras) ---------- */
    ctaCliente(clienteId, verSin) {
      return DB.obras.filter((o) => o.cliente === clienteId).map((o) => {
        const cargos = M.cargos(o.id).filter((c) => verSin || c.comp !== 'sin'); const tot = cero();
        cargos.forEach((c) => MON.forEach((k) => { tot[k] = r2(tot[k] + c.importes[k]); }));
        return { obra: o, facturado: tot, cobrado: M.cobradoObra(o.id, verSin), saldo: M.porCobrar(o.id, verSin) };
      });
    },

    /* ---------- cheques ---------- */
    estadoCheque(ch) { if (ch.tipo === 'propio' && ch.estado === 'emitido' && dias(ch.pago) <= 0) return 'debitado'; return ch.estado; },

    /* ---------- validaciones de maestros ---------- */
    cuitValido(c) {
      const d = String(c || '').replace(/\D/g, ''); if (d.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(d)) return false;
      const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * m[i];
      let v = 11 - (s % 11); if (v === 11) v = 0; if (v === 10) return false;
      return v === Number(d[10]);
    },
    usosCliente: (id) => DB.obras.filter((o) => o.cliente === id).length,
    usosProveedor(id) { return DB.presupuestos.reduce((s, p) => s + p.items.filter((i) => i.prov === id).length, 0) + DB.pagos.filter((p) => p.prov === id).length; }
  };


  /* ---------- facturación (ventas emitidas en ARCA, compras, IVA del mes) ---------- */
  /* Comprobantes emitidos: salen de los mismos cargos de la cuenta del cliente (una sola regla) */
  M.ventas = function () {
    const out = [];
    DB.obras.forEach((o) => M.cargos(o.id).filter((c) => c.comp && c.comp !== 'sin').forEach((c) => {
      const fe = c.tipo === 'anticipo' ? (o.anticipo.fe || {}) : ((M.cert(c.id) || {}).fe || {});
      const e = M.estadoCargo(c);
      MON.forEach((k) => {
        if (!c.importes[k]) return;
        out.push({ fecha: c.fecha, obra: o, cliente: M.cliente(o.cliente), cargo: c, tipo: 'Factura ' + c.comp, numero: fe.pv ? fe.pv + '-' + fe.nro : '', cae: fe.cae || '', vto: fe.vto || '', mon: k, neto: r2(c.importes[k] - c.iva[k]), iva: c.iva[k], total: c.importes[k], estado: e.estado });
      });
    }));
    (DB.notasCredito || []).forEach((n) => out.push(Object.assign({ estado: 'Emitida' }, n, { obra: M.obra(n.obra), cliente: M.cliente(M.obra(n.obra).cliente) })));
    return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
  };
  /* Facturas de proveedores: el estado sale de los pagos al mismo proveedor en la misma obra, a la más vieja primero */
  M.compras = function () {
    const grupos = {}; const estado = {};
    DB.facturasCompra.filter((f) => !f.anulada).forEach((f) => { const k = f.prov + '|' + (f.obra || ''); (grupos[k] = grupos[k] || []).push(f); });
    Object.keys(grupos).forEach((k) => {
      const [prov, obra] = k.split('|');
      let pagado = DB.pagos.filter((p) => p.prov === prov && (p.obra || '') === obra && p.mon === 'ARS').reduce((s, p) => s + M.pagoVale(p), 0);
      grupos[k].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((f) => {
        const ap = Math.max(0, Math.min(f.total, pagado)); pagado = r2(pagado - ap);
        estado[f.id] = { pagado: r2(ap), saldo: r2(f.total - ap), estado: ap >= f.total - 0.5 ? 'Pagada' : ap > 0.5 ? 'Parcial' : 'Pendiente' };
      });
    });
    return DB.facturasCompra.map((f) => Object.assign({}, f, f.anulada ? { pagado: 0, saldo: 0, estado: 'Anulada' } : estado[f.id])).sort((a, b) => b.fecha.localeCompare(a.fecha));
  };
  M.facturadoProv = (obraId, provId) => r2(DB.facturasCompra.filter((f) => !f.anulada && f.obra === obraId && f.prov === provId).reduce((s, f) => s + f.neto, 0));
  M.ivaMensual = function () {
    const m = {};
    const mes = (f) => m[f.slice(0, 7)] || (m[f.slice(0, 7)] = { mes: f.slice(0, 7), ventasNeto: 0, debito: 0, comprasNeto: 0, credito: 0, perc: 0 });
    M.ventas().filter((v) => v.mon === 'ARS').forEach((v) => { const x = mes(v.fecha); x.ventasNeto = r2(x.ventasNeto + v.neto); x.debito = r2(x.debito + v.iva); });
    DB.facturasCompra.filter((f) => !f.anulada).forEach((f) => { const x = mes(f.fecha); x.comprasNeto = r2(x.comprasNeto + f.neto); x.credito = r2(x.credito + f.iva); x.perc = r2(x.perc + (f.perc || 0)); });
    return Object.values(m).map((x) => Object.assign(x, { saldo: r2(x.debito - x.credito - x.perc) })).sort((a, b) => b.mes.localeCompare(a.mes));
  };
  M.facturaDuplicada = (prov, tipo, numero, salvoId) => DB.facturasCompra.some((f) => f.id !== salvoId && !f.anulada && f.prov === prov && f.tipo === tipo && f.numero === numero);

  /* ---------- bancos y efectivo: saldo de cada cuenta armado con los mismos cobros, pagos, cheques y gastos ---------- */
  M.bancos = function () {
    const ctas = DB.cuentas.map((c) => Object.assign({}, c, { movs: [] }));
    const porNombre = (n) => ctas.find((c) => c.nombre === n) || ctas.find((c) => c.tipo === 'banco');
    const ef = ctas.find((c) => c.tipo === 'caja');
    const add = (c, fecha, txt, imp) => { if (c && fecha && imp) c.movs.push({ fecha, txt, imp: r2(imp) }); };
    DB.cobros.forEach((cb) => {
      if (cb.mon !== 'ARS' || !M.cobroVale(cb)) return; const cg = M.cargo(cb.cargo); const o = M.obra(cb.obra);
      const txt = 'Cobro ' + (cg ? cg.nombre : '') + ' · ' + (o ? o.nombre : '');
      if (cb.medio === 'transferencia') add(porNombre(cb.banco), cb.fecha, txt, cb.importe);
      else if (cb.medio === 'efectivo') add(ef, cb.fecha, txt, cb.importe);
    });
    DB.cheques.filter((c) => c.tipo === 'tercero' && c.estado === 'depositado').forEach((c) => add(porNombre(c.cuentaDeposito || 'Banco Galicia'), c.deposito, 'Depósito cheque ' + c.banco + ' N° ' + c.numero, c.importe));
    DB.pagos.forEach((p) => {
      if (p.mon !== 'ARS' || !M.pagoVale(p)) return; const txt = 'Pago a ' + (M.prov(p.prov) || {}).razon;
      if (p.medio === 'transferencia') add(porNombre(p.banco || 'Banco Galicia'), p.fecha, txt, -p.importe);
      else if (p.medio === 'efectivo') add(ef, p.fecha, txt, -p.importe);
    });
    DB.cheques.filter((c) => c.tipo === 'propio' && M.estadoCheque(c) === 'debitado').forEach((c) => add(porNombre(c.banco), c.pago, 'Débito cheque propio N° ' + c.numero, -c.importe));
    DB.gastos.filter((g) => !g.anulado).forEach((g) => add(g.medio === 'efectivo' ? ef : porNombre('Banco Galicia'), g.fecha, g.desc, -g.importe));
    DB.caja.filter((c) => !c.anulado && c.tipo === 'reposicion').forEach((c) => add(ef, c.fecha, 'Fondo caja chica · ' + (M.obra(c.obra) || {}).nombre, -c.importe));
    ctas.forEach((c) => {
      c.movs.sort((a, b) => a.fecha.localeCompare(b.fecha)); let s = c.inicial;
      c.movs.forEach((m) => { s = r2(s + m.imp); m.saldo = s; }); c.saldo = s;
      c.aDebitar = r2(DB.cheques.filter((q) => q.tipo === 'propio' && M.estadoCheque(q) === 'emitido' && q.banco === c.nombre).reduce((x, q) => x + q.importe, 0));
    });
    return ctas;
  };

  /* Cobros de ejemplo marcados "auto": se completan con el saldo exacto del comprobante, en orden */
  M.resolverAutos = function () {
    DB.cobros.forEach((c) => {
      if (!c.auto) return;
      const cargo = M.cargo(c.cargo); if (!cargo) { c.importe = 0; delete c.auto; return; }
      c.importe = 0; const e = M.estadoCargo(cargo); c.importe = Math.max(0, e.saldo[c.mon]); delete c.auto;
    });
  };

  window.Motor = M;
})();

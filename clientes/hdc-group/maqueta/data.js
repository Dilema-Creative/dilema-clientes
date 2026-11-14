/* Maqueta Argos para HDC Group: base de datos de EJEMPLO.
   Todo es inventado: clientes, proveedores, montos, numeración y bancos.
   Generador con semilla fija: la primera vez (o al restablecer) siempre arma la misma base.
   Los saldos de cajas y el stock NO se guardan: salen de los movimientos (ver app.js). */
(function () {
  'use strict';

  window.HDC_HOY = new Date(2026, 9, 9, 11, 40);

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /* Reglas de cálculo que comparten la base de ejemplo y la app: una sola cuenta para cada número. */
  window.HDC_REGLAS = {
    MEDIOS: ['Efectivo', 'Mercado Pago', 'Cheque de tercero', 'Cheque propio', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia o depósito', 'Retención', 'Percepción', 'Ajuste'],
    ALICUOTAS: { 'IIBB Buenos Aires': 3, 'IIBB CABA': 2, IVA: 3 },
    JURISDICCIONES: ['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Entre Ríos', 'Mendoza', 'Neuquén', 'Salta'],
    /* Importe de un renglón, con su bonificación. */
    importeLinea: function (l) { return r2(l.cant * l.precio * (1 - (l.bonif || 0) / 100)); },
    /* Costo de un artículo. El de un combo es la suma de sus componentes: nunca se carga a mano. */
    costoDe: function (p, buscar) {
      if (!p) return 0;
      if (p.combo) return r2(p.combo.reduce((s, c) => s + window.HDC_REGLAS.costoDe(buscar(c.productoId), buscar) * c.cant, 0));
      return p.costo || 0;
    },
    /* Venta: subtotal de renglones (cada uno con su bonificación), menos bonificaciones, más recargos.
       Si es Oficial: neto e IVA por alícuota (cada producto tiene la suya) y percepciones del cliente. */
    calcularVenta: function (d) {
      const subtotal = r2(d.items.reduce((s, l) => s + window.HDC_REGLAS.importeLinea(l), 0));
      let base = subtotal; const ajustes = [];
      ['bonificacion', 'recargo'].forEach((tipo) => {
        const sobre = base;
        (d.ajustes || []).filter((a) => a.tipo === tipo).forEach((a) => {
          const monto = r2(a.modo === 'pct' ? sobre * a.valor / 100 : a.valor);
          ajustes.push({ tipo, modo: a.modo, valor: a.valor, concepto: a.concepto, monto });
          base = r2(base + (tipo === 'recargo' ? monto : -monto));
        });
      });
      let imp = null, total = base;
      if (d.version === 'Oficial') {
        const porAlic = {};
        d.items.forEach((l) => { const a = l.alic == null ? 21 : l.alic; porAlic[a] = (porAlic[a] || 0) + window.HDC_REGLAS.importeLinea(l); });
        const alics = Object.keys(porAlic).map(Number).sort((a, b) => b - a);
        let resto = base;
        const alicuotas = alics.map((a, i) => {
          const conIva = i === alics.length - 1 ? resto : r2(porAlic[a] * (subtotal ? base / subtotal : 1));
          resto = r2(resto - conIva);
          const neto = r2(conIva / (1 + a / 100));
          return { alic: a, neto, iva: r2(conIva - neto) };
        });
        const neto = r2(alicuotas.reduce((s, x) => s + x.neto, 0));
        const percepciones = ((d.cliente && d.cliente.percepciones) || []).map((p) => ({ imp: p.imp, alic: p.alic, monto: r2(neto * p.alic / 100) }));
        const tributos = r2(percepciones.reduce((s, p) => s + p.monto, 0));
        imp = { neto, iva: r2(alicuotas.reduce((s, x) => s + x.iva, 0)), alicuotas, percepciones, tributos };
        total = r2(base + tributos);
      }
      return { subtotal, ajustes, base, imp, total };
    },
    /* Compra: neto gravado + IVA + percepciones + no gravado. */
    calcularCompra: function (d) {
      const iva = r2(d.neto * d.alic / 100);
      const perc = (d.perc || []).filter((p) => p.monto > 0);
      return { neto: r2(d.neto), alic: d.alic, iva, perc, noGravado: r2(d.noGravado || 0), monto: r2(d.neto + iva + perc.reduce((s, p) => s + p.monto, 0) + (d.noGravado || 0)) };
    },
    /* Retenciones que se le practican a un proveedor al pagarle (ejemplo: Ganancias 2% e Ingresos Brutos 1%). */
    retencionesPago: function (prov, monto) {
      if (prov.tipo !== 'Proveedor') return [];
      const jur = ['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe'].includes(prov.jurisdiccion) ? prov.jurisdiccion : 'Buenos Aires';
      return [{ imp: 'Ganancias', alic: 2, monto: r2(monto * 0.02) }, { imp: 'IIBB ' + jur, alic: 1, monto: r2(monto * 0.01) }];
    }
  };
  const REGLAS = window.HDC_REGLAS;

  window.HDC_SEED = function () {
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rnd = mulberry32(48151623);
    const entre = (a, b) => a + rnd() * (b - a);
    const entero = (a, b) => Math.floor(entre(a, b + 1));
    const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];
    const elegirPeso = (pares) => {
      const tot = pares.reduce((s, p) => s + p[1], 0);
      let r = rnd() * tot;
      for (const p of pares) { r -= p[1]; if (r <= 0) return p[0]; }
      return pares[pares.length - 1][0];
    };
    const HOY = window.HDC_HOY;
    const INI_HOY = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
    const conDigito = (c) => {
      const d = c.replace(/\D/g, '').slice(0, 10);
      if (d.length !== 10) return c;
      const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let t = 0; for (let i = 0; i < 10; i++) t += Number(d[i]) * m[i];
      let v = 11 - (t % 11); if (v === 11) v = 0; if (v === 10) v = 9;
      return d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + v;
    };
    const iso = (d) => d.toISOString();
    const masDias = (f, n) => { const x = new Date(f); x.setDate(x.getDate() + n); x.setHours(entero(8, 18), entero(0, 59)); return x; };
    const dia = (d, h, m) => new Date(2026, 9, d, h, m || 0);

    /* Puntos de venta dados de alta en ARCA. Cada canal factura por uno. */
    const puntosVenta = [
      { nro: '0001', nombre: 'Mostrador' },
      { nro: '0002', nombre: 'Mercado Libre' },
      { nro: '0006', nombre: 'Tiendanube' },
      { nro: '0007', nombre: 'Mayorista' },
      { nro: '0010', nombre: 'Frávega' },
      { nro: '0011', nombre: 'Provincia Compras' },
      { nro: '0012', nombre: 'Tienda BNA' }
    ];

    /* conexion: vivo (entra sola), asistida (la opera Argos), manual (se carga en el sistema) */
    const canales = [
      { id: 'ml', nombre: 'Mercado Libre', tienda: true, conexion: 'vivo', pv: '0002', caja: 'mp', deposito: 'full', comision: 14.5 },
      { id: 'tn', nombre: 'Tiendanube', tienda: true, conexion: 'vivo', pv: '0006', caja: 'pagonube', deposito: 'principal', comision: 4.49 },
      { id: 'fravega', nombre: 'Frávega', tienda: true, conexion: 'vivo', pv: '0010', caja: 'marketplaces', deposito: 'dep-fravega', comision: 16 },
      { id: 'provincia', nombre: 'Provincia Compras', tienda: true, conexion: 'vivo', pv: '0011', caja: 'provincia', deposito: 'dep-provincia', comision: 10.5, ic: 'ph-bank', tono: 't-verde' },
      { id: 'bna', nombre: 'Tienda BNA', tienda: true, conexion: 'asistida', pv: '0012', caja: 'bna', deposito: 'principal', comision: 11, ic: 'ph-bank', tono: 't-azul' },
      { id: 'mayorista', nombre: 'Mayorista', tienda: false, conexion: 'manual', pv: '0007', caja: null, deposito: 'principal', comision: 0 },
      { id: 'mostrador', nombre: 'Mostrador', tienda: false, conexion: 'manual', pv: '0001', caja: null, deposito: 'principal', comision: 0 }
    ];

    /* tipo: banco, billetera, efectivo, cheques, a-liquidar, prestamo, interna, valores (cheques propios emitidos), retenciones */
    const cajas = [
      { id: 'mp', nombre: 'Mercado Pago', tipo: 'billetera', fuente: 'Mercado Pago', inicial: 18450300 },
      { id: 'pagonube', nombre: 'Pago Nube', tipo: 'billetera', fuente: 'Liquidación de Pago Nube', inicial: 1920450 },
      { id: 'credicoop', nombre: 'Banco Credicoop', tipo: 'banco', fuente: 'Extracto de Credicoop', inicial: 0 },
      { id: 'santander', nombre: 'Banco Santander', tipo: 'banco', fuente: 'Extracto de Santander', inicial: 0, difExtracto: -184300 },
      { id: 'macro', nombre: 'Banco Macro', tipo: 'banco', fuente: 'Extracto de Macro', inicial: 0 },
      { id: 'marketplaces', nombre: 'Frávega a liquidar', tipo: 'a-liquidar', fuente: 'Liquidación de Frávega', inicial: 0 },
      { id: 'provincia', nombre: 'Provincia Compras a liquidar', tipo: 'a-liquidar', fuente: 'Liquidación de Provincia Compras', inicial: 0, ic: 'ph-bank', tono: 't-verde' },
      { id: 'bna', nombre: 'Tienda BNA a liquidar', tipo: 'a-liquidar', fuente: 'Liquidación de Tienda BNA', inicial: 0, ic: 'ph-bank', tono: 't-azul' },
      { id: 'tarjetas', nombre: 'Tarjetas a liquidar', tipo: 'a-liquidar', fuente: 'Liquidación de tarjetas', inicial: 0, liquidaEn: 'credicoop', ic: 'ph-credit-card', tono: 't-pizarra' },
      { id: 'efectivo', nombre: 'Efectivo del día', tipo: 'efectivo', fuente: 'Arqueo de caja', inicial: 1385000 },
      { id: 'vendedores', nombre: 'Efectivo de vendedores', tipo: 'efectivo', fuente: 'Rendición de vendedores', inicial: 0, neutral: true },
      { id: 'mutual', nombre: 'Mutual', tipo: 'interna', fuente: 'Liquidación de la Mutual', inicial: 0, neutral: true, recargo: 5 },
      { id: 'socio1', nombre: 'Caja Ernesto', tipo: 'interna', fuente: 'Caja personal de socio', inicial: 850000 },
      { id: 'socio2', nombre: 'Caja Graciela', tipo: 'interna', fuente: 'Caja personal de socio', inicial: 420000 },
      { id: 'cheques', nombre: 'Cheques de terceros', tipo: 'cheques', fuente: 'Cartera de cheques', inicial: 0 },
      { id: 'valores', nombre: 'Valores diferidos', tipo: 'valores', fuente: 'Cheques propios emitidos', inicial: 0 },
      { id: 'retenciones', nombre: 'Retenciones', tipo: 'retenciones', fuente: 'Retenciones que nos hicieron', inicial: 0 },
      { id: 'pr-macro', nombre: 'Préstamo Banco Macro', tipo: 'prestamo', fuente: 'Capital de trabajo', inicial: -13500000, prestamo: { sentido: 'recibido', contraparte: 'Banco Macro', capital: 18000000, cuotas: 12 } },
      { id: 'pr-personal', nombre: 'Préstamo al personal', tipo: 'prestamo', fuente: 'Adelantos a devolver', inicial: 0, prestamo: { sentido: 'otorgado', contraparte: 'Personal de planta', capital: 2400000, cuotas: 6 } }
    ];

    /* materia: solo guarda materia prima. noDisponible: lo que está ahí no se puede vender (pero vale plata). */
    const depositos = [
      { id: 'principal', nombre: 'Principal', tipo: 'Principal' },
      { id: 'fabrica', nombre: 'Fábrica', tipo: 'Fábrica' },
      { id: 'materia', nombre: 'Materia prima', tipo: 'Materia prima', materia: true },
      { id: 'full', nombre: 'Mercado Libre (Full)', tipo: 'Tienda', canal: 'ml' },
      { id: 'dep-fravega', nombre: 'Frávega', tipo: 'Tienda', canal: 'fravega' },
      { id: 'dep-provincia', nombre: 'Provincia Compras', tipo: 'Tienda', canal: 'provincia' },
      { id: 'outlet', nombre: 'Outlet', tipo: 'Outlet' },
      { id: 'reserva', nombre: 'Reserva', tipo: 'Reserva' },
      { id: 'showroom', nombre: 'Showroom', tipo: 'Local' },
      { id: 'local1', nombre: 'Local 1', tipo: 'Local' },
      { id: 'local2', nombre: 'Local 2', tipo: 'Local' },
      { id: 'revision', nombre: 'A revisión', tipo: 'A revisión', noDisponible: true }
    ];

    const listas = [
      { id: 'minorista', nombre: 'Minorista', factor: 1 },
      { id: 'mayorista', nombre: 'Mayorista', factor: 0.68 },
      { id: 'distribuidor', nombre: 'Distribuidor', factor: 0.6 },
      { id: 'locales', nombre: 'Locales', factor: 0.95 }
    ];

    /* Vendedor: quien vende. Operador: el usuario que cargó. "Sistema" es lo que entra solo. */
    const vendedores = ['Romina Salinas', 'Hernán Bianchi', 'Celeste Ojeda', 'Iván Peralta'].map((nombre, i) => ({ id: 've' + (i + 1), nombre }));
    const operadores = [
      ['sis', 'Sistema', 'Sistema'], ['u1', 'Administración', 'Administración'], ['u2', 'Lucía Ferreyra', 'Ventas'], ['u3', 'Martín Sosa', 'Ventas'],
      ['u4', 'Sofía Quiroga', 'Administración'], ['u5', 'Gonzalo Arce', 'Depósito'], ['u6', 'Valentina Paz', 'Depósito'], ['u7', 'Nicolás Toledo', 'Administración'],
      ['u8', 'Camila Godoy', 'Administración'], ['u9', 'Federico Luna', 'Depósito'], ['u10', 'Agustina Rojas', 'Contabilidad']
    ].map(([id, nombre, rol]) => ({ id, nombre, rol }));

    /* Materia prima: mismo maestro de artículos, otro tipo. */
    const materias = [
      ['MP-CAN-25', 'Caño de acero de 1 pulgada', 'm', 3800, 'p2', 400],
      ['MP-CHA-18', 'Chapa de acero 1,8 mm', 'kg', 2100, 'p2', 300],
      ['MP-HAY-TIR', 'Tirante de haya', 'm', 5200, 'p1', 500],
      ['MP-MDF-18', 'Placa de MDF 18 mm', 'un', 38500, 'p1', 20],
      ['MP-PP-INY', 'Polipropileno para inyección', 'kg', 2900, 'p8', 600],
      ['MP-ESP-AD', 'Espuma de alta densidad', 'kg', 9800, 'p3', 80],
      ['MP-ECO-OSC', 'Ecocuero oscuro', 'm', 7400, 'p3', 90],
      ['MP-TEL-GRI', 'Tela de tapicería gris', 'm', 6900, 'p3', 90],
      ['MP-PIN-OSC', 'Pintura en polvo oscura', 'kg', 11200, 'p4', 40],
      ['MP-PIN-BLA', 'Pintura en polvo blanca', 'kg', 11800, 'p4', 40],
      ['MP-VID-R90', 'Vidrio templado redondo 90 cm', 'un', 31000, 'p7', 25],
      ['MP-VID-140', 'Vidrio templado 140x80', 'un', 52000, 'p7', 20],
      ['MP-KIT-TOR', 'Kit de tornillería', 'un', 950, 'p6', 600],
      ['MP-REG-4', 'Regatones (juego de 4)', 'un', 420, 'p6', 600],
      ['MP-BAS-GIR', 'Base giratoria con ruedas', 'un', 21500, 'p6', 40],
      ['MP-PIS-GAS', 'Pistón a gas', 'un', 8900, 'p6', 40],
      ['MP-CAJ-GDE', 'Caja de embalaje grande', 'un', 2600, 'p5', 200],
      ['MP-CAJ-MED', 'Caja de embalaje mediana', 'un', 1700, 'p5', 300]
    ].map(([sku, nombre, unidad, costo, proveedorId, minimo], i) => ({ id: 'mp' + (i + 1), tipo: 'materia', sku, nombre, unidad, costo, proveedorId, minimo, rubro: 'Materia prima', stockIni: {}, ubic: { materia: { pasillo: 'M' + (1 + i % 3), estante: 1 + Math.floor(i / 3), nivel: 1 + i % 2 } } }));
    const mat = (sku) => materias.find((m) => m.sku === sku).id;

    /* Lista de materiales por producto (lo que consume fabricar una unidad). */
    const TUL = [['MP-PP-INY', 9], ['MP-HAY-TIR', 4.8], ['MP-KIT-TOR', 4], ['MP-REG-4', 4], ['MP-CAJ-MED', 1]];
    const NOR = [['MP-HAY-TIR', 9.6], ['MP-ESP-AD', 1.2], ['MP-TEL-GRI', 1.6], ['MP-KIT-TOR', 4], ['MP-CAJ-MED', 1]];
    const LISTAS = {
      'SIL-TUL-B4': TUL, 'SIL-TUL-G4': TUL, 'SIL-NOR-N4': NOR,
      'SIL-NOR-G6': NOR.map(([s, c]) => [s, s === 'MP-CAJ-MED' ? 1 : r2(c * 1.5)]),
      'SIL-MIL-B4': [['MP-CAN-25', 10], ['MP-PIN-BLA', 0.6], ['MP-ESP-AD', 1], ['MP-ECO-OSC', 1.4], ['MP-REG-4', 4], ['MP-CAJ-MED', 1]],
      'SIL-WIN-N4': [['MP-HAY-TIR', 11], ['MP-PIN-OSC', 0.5], ['MP-KIT-TOR', 4], ['MP-CAJ-MED', 1]],
      'SIL-BIS-4': [['MP-CAN-25', 9], ['MP-PIN-OSC', 0.5], ['MP-MDF-18', 0.25], ['MP-REG-4', 4], ['MP-CAJ-MED', 1]],
      'SIL-TOL-G1': [['MP-CHA-18', 3.2], ['MP-PIN-OSC', 0.15], ['MP-REG-4', 1], ['MP-CAJ-MED', 1]],
      'MES-RED-90': [['MP-VID-R90', 1], ['MP-HAY-TIR', 3.2], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'MES-REC-140': [['MP-VID-140', 1], ['MP-CAN-25', 6.5], ['MP-PIN-OSC', 0.4], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'MES-TOL-G': [['MP-CHA-18', 14], ['MP-PIN-OSC', 0.6], ['MP-REG-4', 1], ['MP-CAJ-GDE', 1]],
      'MES-NOR-160': [['MP-MDF-18', 1], ['MP-HAY-TIR', 8.4], ['MP-KIT-TOR', 3], ['MP-CAJ-GDE', 2]],
      'OFI-EJE-G': [['MP-BAS-GIR', 1], ['MP-PIS-GAS', 1], ['MP-ESP-AD', 1.4], ['MP-ECO-OSC', 1.8], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'OFI-GER-C': [['MP-BAS-GIR', 1], ['MP-PIS-GAS', 1], ['MP-ESP-AD', 1.9], ['MP-ECO-OSC', 2.6], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'GAM-PRO-G': [['MP-BAS-GIR', 1], ['MP-PIS-GAS', 1], ['MP-ESP-AD', 1.6], ['MP-TEL-GRI', 2.1], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'GAM-PRO-R': [['MP-BAS-GIR', 1], ['MP-PIS-GAS', 1], ['MP-ESP-AD', 1.6], ['MP-ECO-OSC', 2.1], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'GAM-ESC-120': [['MP-MDF-18', 0.5], ['MP-CAN-25', 5], ['MP-PIN-OSC', 0.3], ['MP-KIT-TOR', 1], ['MP-CAJ-GDE', 1]],
      'BAN-ALT-2': [['MP-CAN-25', 6], ['MP-PIN-OSC', 0.3], ['MP-MDF-18', 0.2], ['MP-REG-4', 2], ['MP-CAJ-MED', 1]],
      'DEC-PER-1': [['MP-HAY-TIR', 2.6], ['MP-KIT-TOR', 1], ['MP-CAJ-MED', 1]]
    };

    const cien = (n) => Math.round(n / 100) * 100;
    const COMBOS = { 'COM-RED-TUL': [['pr9', 1], ['pr1', 1]], 'COM-NOR-160': [['pr21', 1], ['pr4', 1]] };
    const productos = [
      ['SIL-TUL-B4', 'Silla Tulip blanca x4', 119900, 'Sillas'],
      ['SIL-TUL-G4', 'Silla Tulip grafito x4', 119900, 'Sillas'],
      ['SIL-NOR-N4', 'Silla Nórdica natural x4', 109900, 'Sillas'],
      ['SIL-NOR-G6', 'Silla Nórdica gris x6', 159900, 'Sillas'],
      ['SIL-MIL-B4', 'Silla Milán blanca x4', 134900, 'Sillas'],
      ['SIL-WIN-N4', 'Silla Windsor nogal x4', 129900, 'Sillas'],
      ['SIL-BIS-4', 'Silla Bistró x4', 99900, 'Sillas'],
      ['SIL-TOL-G1', 'Silla Tolix grafito', 27900, 'Sillas'],
      ['MES-RED-90', 'Mesa redonda de vidrio 90 cm', 98900, 'Mesas'],
      ['MES-REC-140', 'Mesa rectangular de vidrio 140x80', 164900, 'Mesas'],
      ['MES-TOL-G', 'Mesa Tolix de metal grafito', 119900, 'Mesas'],
      ['COM-RED-TUL', 'Combo mesa redonda + 4 sillas Tulip', 269900, 'Combos'],
      ['COM-NOR-160', 'Combo comedor Nórdico 160 + 6 sillas', 389900, 'Combos'],
      ['OFI-EJE-G', 'Sillón ejecutivo grafito', 189900, 'Oficina'],
      ['OFI-GER-C', 'Sillón gerencial de cuero', 259900, 'Oficina'],
      ['GAM-PRO-G', 'Silla gamer Pro gris', 229900, 'Gamer'],
      ['GAM-PRO-R', 'Silla gamer Pro roja', 229900, 'Gamer'],
      ['GAM-ESC-120', 'Escritorio gamer 120 cm', 64900, 'Gamer'],
      ['BAN-ALT-2', 'Banqueta alta x2', 79900, 'Banquetas'],
      ['DEC-PER-1', 'Perchero de pie', 34900, 'Deco'],
      ['MES-NOR-160', 'Mesa Nórdica de madera 160 cm', 249900, 'Mesas']
    ].map(([sku, nombre, precio, rubro], i) => {
      const p = {
        id: 'pr' + (i + 1), tipo: 'terminado', sku, nombre, unidad: 'un', rubro, alic: rubro === 'Oficina' ? 10.5 : 21,
        precios: { minorista: precio, mayorista: cien(precio * 0.68), distribuidor: cien(precio * 0.6), locales: cien(precio * 0.95) },
        costo: cien(precio * entre(0.3, 0.4)), minimo: 30
      };
      /* Un combo no tiene stock ni costo propios: salen de sus componentes. */
      if (COMBOS[sku]) { delete p.costo; p.combo = COMBOS[sku].map(([id, cant]) => ({ productoId: id, cant })); return p; }
      p.materiales = LISTAS[sku].map(([s, cant]) => ({ productoId: mat(s), cant }));
      p.stockIni = {};
      p.ubic = { principal: { pasillo: 'ABCDEF'[i % 6], estante: 1 + Math.floor(i / 6) * 3 + i % 3, nivel: 1 + i % 4 } };
      return p;
    });
    const buscarProd = (id) => productos.find((p) => p.id === id);
    const costoDe = (p) => REGLAS.costoDe(p, buscarProd);
    const linea = (p, cant, lista, bonif) => ({ productoId: p.id, nombre: p.nombre, cant, precio: p.precios[lista], bonif: bonif || 0, alic: p.alic, costo: costoDe(p) });
    const pesoProducto = productos.map((p) => [p, p.rubro === 'Sillas' ? 3 : p.rubro === 'Combos' ? 2 : p.rubro === 'Deco' ? 0.5 : 1.1]);

    const NOMBRES = ['Lucía', 'Martín', 'Sofía', 'Gonzalo', 'Valentina', 'Nicolás', 'Camila', 'Federico', 'Agustina', 'Matías', 'Florencia', 'Joaquín', 'Micaela', 'Tomás', 'Rocío', 'Facundo', 'Julieta', 'Ezequiel', 'Antonela', 'Santiago', 'Melina', 'Lautaro', 'Brenda', 'Ramiro', 'Yamila', 'Hernán', 'Daiana', 'Leandro', 'Celeste', 'Gastón', 'Romina', 'Iván', 'Noelia', 'Pablo', 'Carla', 'Emiliano', 'Belén', 'Diego', 'Abril', 'Cristian'];
    const APELLIDOS = ['Ferreyra', 'Gutiérrez', 'Orozco', 'Acosta', 'Medina', 'Sosa', 'Quiroga', 'Arrieta', 'Villalba', 'Pacheco', 'Ojeda', 'Paz', 'Maidana', 'Arce', 'Toledo', 'Correa', 'Godoy', 'Peralta', 'Ríos', 'Funes', 'Giménez', 'Cabrera', 'Ponce', 'Luna', 'Cáceres', 'Aguirre', 'Salinas', 'Navarro', 'Rojas', 'Figueroa', 'Bianchi', 'Zárate', 'Ibarra', 'Lescano', 'Báez', 'Lucero', 'Ferrari', 'Herrera', 'Ruiz', 'Olmedo'];
    const PROVINCIA = { Paraná: 'Entre Ríos', 'La Plata': 'Buenos Aires', CABA: 'CABA', Lanús: 'Buenos Aires', Avellaneda: 'Buenos Aires', Morón: 'Buenos Aires', 'San Isidro': 'Buenos Aires', Córdoba: 'Córdoba', Rosario: 'Santa Fe', Mendoza: 'Mendoza', 'Mar del Plata': 'Buenos Aires', Tigre: 'Buenos Aires', Pilar: 'Buenos Aires', Neuquén: 'Neuquén', Salta: 'Salta', 'Bahía Blanca': 'Buenos Aires', 'Santa Fe': 'Santa Fe', Tandil: 'Buenos Aires' };
    const LOCALIDADES = Object.keys(PROVINCIA);

    const clientes = [];
    function consumidor(lista) {
      const localidad = elegir(LOCALIDADES);
      const c = { id: 'c' + (clientes.length + 1), nombre: elegir(NOMBRES) + ' ' + elegir(APELLIDOS), doc: String(entero(20000000, 45999999)), tipo: 'Consumidor final', iva: 'Consumidor final', localidad, jurisdiccion: PROVINCIA[localidad], condicion: 'Contado', lista: lista || 'minorista', vendedorId: null, percepciones: [], email: '', telefono: '' };
      clientes.push(c); return c;
    }
    /* Mayoristas y distribuidores: cada uno con su lista, su vendedor y las percepciones que le tocan según su jurisdicción. */
    const mayoristas = [
      ['Mueblería Los Robles SRL', '30-71482215-6', 'Rosario', 'Cuenta corriente 30 días', 'Mayorista', []],
      ['Hogar Belgrano SA', '30-70955318-2', 'CABA', 'Cheque a 30 días', 'Mayorista', [['IIBB CABA', 2]]],
      ['Interiores del Litoral SAS', '30-71734408-9', 'Santa Fe', 'Transferencia contado', 'Distribuidor', []],
      ['Casa Andina Muebles SRL', '30-71215590-4', 'Mendoza', 'Cuenta corriente 30 días', 'Mayorista', []],
      ['Equipamiento Austral SA', '30-70876129-0', 'Neuquén', 'Cheque a 30 días', 'Distribuidor', [['IVA', 3]]],
      ['Decorar Tandil SRL', '30-71590062-7', 'Tandil', 'Transferencia contado', 'Mayorista', [['IIBB Buenos Aires', 3]]],
      ['Oficina Total SAS', '30-71880741-3', 'CABA', 'Cuenta corriente 30 días', 'Mayorista', [['IIBB CABA', 2], ['IIBB Buenos Aires', 1.5]]],
      ['Mobiliario Serrano SRL', '30-71344856-1', 'Córdoba', 'Cheque a 30 días', 'Mayorista', []],
      ['La Casa del Comedor SA', '30-70712934-5', 'Mar del Plata', 'Cuenta corriente 30 días', 'Mayorista', [['IIBB Buenos Aires', 3], ['IVA', 3]]],
      ['Hoteles y Gastronomía Sur SA', '30-71066243-8', 'Bahía Blanca', 'Transferencia contado', 'Mayorista', [['IIBB Buenos Aires', 2.5]]],
      ['Muebles Norteños SRL', '30-71427705-2', 'Salta', 'Cheque a 30 días', 'Distribuidor', []],
      ['Ambientes Pilar SRL', '30-71655390-0', 'Pilar', 'Cuenta corriente 30 días', 'Mayorista', [['IIBB Buenos Aires', 3]]]
    ].map(([nombre, doc, localidad, condicion, tipo, perc], i) => {
      const c = { id: 'm' + (i + 1), nombre, doc: conDigito(doc), tipo, iva: 'Responsable inscripto', localidad, jurisdiccion: PROVINCIA[localidad], condicion, lista: tipo === 'Distribuidor' ? 'distribuidor' : 'mayorista', vendedorId: vendedores[i % vendedores.length].id, percepciones: perc.map(([imp, alic]) => ({ imp, alic })), email: 'compras@' + nombre.toLowerCase().split(' ')[0].normalize('NFD').replace(/[^a-z]/g, '') + '.com.ar', telefono: '' };
      clientes.push(c); return c;
    });

    const contadores = {
      venta: 10000, recibo: 7400, op: 2210, interno: 380, mov: 0, stock: 0, arqueo: 0, remito: 3300, grupo: 0, orden: 1040, id: 100000, /* id: lo nuevo arranca lejos de los ids de la base de ejemplo */
      comp: { '0001': 4120, '0002': 21350, '0006': 6210, '0007': 1840, '0010': 930, '0011': 310, '0012': 145 },
      nc: { '0001': 40, '0002': 610, '0006': 95, '0007': 12, '0010': 8, '0011': 3, '0012': 2 },
      nd: { '0007': 3 }
    };

    const SIN_DESC = () => ({ comision: 0, envio: 0, retencion: 0, cuotas: 0 });
    const operadorDe = { mostrador: ['u2', 'u3'], mayorista: ['u2', 'u3', 'u4'] };

    const ventas = [];
    function crearVenta(canal, fecha) {
      const may = canal.id === 'mayorista';
      const pool = clientes.filter((c) => c.tipo === 'Consumidor final' && c.lista === 'minorista');
      const dep = canal.id === 'mostrador' ? elegirPeso([['principal', 5], ['showroom', 2], ['local1', 2], ['local2', 1]]) : null;
      const enLocal = dep === 'local1' || dep === 'local2';
      const cli = may ? elegir(mayoristas) : enLocal ? consumidor('locales') : (rnd() < 0.05 && pool.length > 25 ? elegir(pool) : consumidor());
      const items = [];
      if (may) {
        const n = entero(2, 4);
        for (let i = 0; i < n; i++) {
          const p = elegirPeso(pesoProducto);
          if (!items.some((l) => l.productoId === p.id)) items.push(linea(p, entero(4, 16), cli.lista, rnd() < 0.15 ? elegir([3, 5, 10]) : 0));
        }
      } else {
        const p = elegirPeso(pesoProducto);
        items.push(linea(p, rnd() < 0.07 ? 2 : 1, cli.lista));
      }
      const envio = may ? 'Transporte propio' : canal.id === 'ml' ? elegirPeso([['Mercado Envíos Full', 6], ['Mercado Envíos Flex', 3], ['Retira en fábrica', 1]]) : canal.id === 'mostrador' ? 'Retira en fábrica' : elegirPeso([['Correo a domicilio', 7], ['Retira en fábrica', 2]]);
      /* cuando el envío lo paga el comprador, va como un renglón de servicio */
      if (canal.id === 'tn' && envio === 'Correo a domicilio' && rnd() < 0.5) items.push({ productoId: null, servicio: true, nombre: 'Envío a domicilio', cant: 1, precio: cien(entre(8900, 18900)), bonif: 0, alic: 21, costo: 0 });
      const k = REGLAS.calcularVenta({ items, ajustes: may && rnd() < 0.2 ? [{ tipo: 'bonificacion', modo: 'pct', valor: 5, concepto: 'Pago anticipado' }] : [], cliente: cli, version: 'Oficial' });
      contadores.comp[canal.pv] += 1;
      const manual = may || canal.id === 'mostrador';
      const v = {
        id: ++contadores.venta, fecha: iso(fecha), canal: canal.id, clienteId: cli.id, version: 'Oficial', lista: cli.lista,
        comp: { tipo: 'Factura ' + (may ? 'A' : 'B'), pv: canal.pv, nro: String(contadores.comp[canal.pv]).padStart(8, '0'), cae: String(entero(7.1e13, 7.9e13)) },
        items, subtotal: k.subtotal, ajustes: k.ajustes, imp: k.imp, total: k.total,
        deposito: dep || (canal.id === 'ml' ? (envio === 'Mercado Envíos Full' ? 'full' : 'principal') : canal.deposito),
        vendedorId: may ? cli.vendedorId : canal.id === 'mostrador' ? elegir(vendedores).id : null,
        operadorId: manual ? elegir(operadorDe[canal.id]) : 'sis',
        envio, estado: 'Vigente', remitida: true, despachada: true, cobros: [], acred: null, nc: null
      };
      if (!may && rnd() < 0.12) { v.remitida = false; v.despachada = false; }
      else if (envio !== 'Retira en fábrica' && envio !== 'Mercado Envíos Full' && fecha >= dia(8, 0) && rnd() < 0.6) v.despachada = false;
      liquidar(v, canal, cli, fecha);
      ventas.push(v);
    }

    function liquidar(v, canal, cli, fecha) {
      const t = v.total;
      const recibo = (monto, caja, medio, extra) => ({ ...(extra || {}), nro: ++contadores.recibo, fecha: iso(extra && extra.fecha ? extra.fecha : fecha), monto: r2(monto), caja, medio });
      if (canal.id === 'mayorista') {
        if (cli.condicion.startsWith('Transferencia')) {
          v.cobros.push(recibo(t, elegir(['credicoop', 'santander', 'macro']), 'Transferencia o depósito', { retencion: r2(t * 0.025) }));
          v.acred = { estado: 'Acreditada', fecha: iso(fecha), ...SIN_DESC() };
        } else if (cli.condicion.startsWith('Cheque')) {
          const vto = masDias(fecha, 30);
          v.cobros.push(recibo(t, 'cheques', 'Cheque de tercero', { cheque: { nro: String(entero(10000000, 99999999)), banco: elegir(['Santander', 'Macro', 'Credicoop', 'Patagonia', 'Hipotecario']), vence: iso(vto) }, retencion: r2(t * 0.025) }));
          v.acred = { estado: 'Cheque en cartera', fecha: iso(vto), ...SIN_DESC() };
        } else {
          const vto = masDias(fecha, 30);
          /* pago a cuenta unos días después, solo si ese día ya pasó: nada con fecha futura cuenta hoy */
          const fPago = masDias(fecha, entero(1, 4));
          if (rnd() < 0.3 && fPago <= HOY) v.cobros.push(recibo(t * entre(0.3, 0.6), 'credicoop', 'Transferencia o depósito', { fecha: fPago }));
          v.acred = { estado: 'Cuenta corriente', fecha: iso(vto), vence: iso(vto), comision: 0, envio: 0, retencion: 0, cuotas: 0 };
        }
        return;
      }
      if (canal.id === 'mostrador') {
        const como = elegirPeso([['efectivo', 35], ['debito', 35], ['credito', 30]]);
        if (como === 'efectivo') {
          v.cobros.push(recibo(t, 'efectivo', 'Efectivo'));
          v.acred = { estado: 'Acreditada', fecha: iso(fecha), ...SIN_DESC() };
        } else {
          /* las tarjetas quedan en "Tarjetas a liquidar" y cuando liquidan entran al banco */
          const deb = como === 'debito';
          const fLiq = masDias(fecha, deb ? 1 : 8);
          v.cobros.push(recibo(t, 'tarjetas', deb ? 'Tarjeta de débito' : 'Tarjeta de crédito', { acreditaEn: 'credicoop', automatico: true, comision: r2(t * (deb ? 0.012 : 0.029)) }));
          v.acred = { estado: fLiq <= HOY ? 'Acreditada' : 'A liquidar', fecha: iso(fLiq), ...SIN_DESC() };
        }
        return;
      }
      const medio = elegirPeso([['Tarjeta de crédito', 55], ['Mercado Pago', 24], ['Tarjeta de débito', 13], ['Transferencia o depósito', 8]]);
      const enCuotas = medio === 'Tarjeta de crédito' && rnd() < 0.7;
      const cuotas = enCuotas ? elegir([3, 6, 6, 12]) : 1;
      let com = 0, env = 0, cuo = 0, dias = 0, pend = 'A liberar';
      const ret = r2(t * 0.02);
      if (canal.id === 'ml') { com = r2(t * entre(0.13, 0.155)); env = v.envio.startsWith('Mercado') ? r2(Math.min(t * entre(0.035, 0.06), 13900)) : 0; cuo = enCuotas ? r2(t * (cuotas === 3 ? 0.052 : cuotas === 6 ? 0.094 : 0.168)) : 0; dias = elegirPeso([[0, 4], [1, 3], [2, 2], [5, 1], [10, 1]]); }
      if (canal.id === 'tn') { com = r2(t * 0.0449); cuo = enCuotas ? r2(t * (cuotas === 3 ? 0.06 : cuotas === 6 ? 0.105 : 0.18)) : 0; dias = entero(3, 14); }
      if (canal.id === 'fravega') { com = r2(t * entre(0.15, 0.17)); dias = 15 - fecha.getDate() + 6; pend = 'A liquidar'; }
      if (canal.id === 'provincia' || canal.id === 'bna') { com = r2(t * entre(0.09, 0.12)); cuo = enCuotas ? r2(t * 0.11) : 0; dias = entero(18, 25); pend = 'A liquidar'; }
      v.cobros.push(recibo(t, canal.caja, medio, { cuotas, operacion: String(entero(4100000000, 4199999999)), automatico: true }));
      const fLib = dias === 0 ? new Date(fecha.getTime() + 3 * 3600e3) : masDias(fecha, dias);
      v.acred = { estado: fLib <= HOY ? 'Acreditada' : pend, fecha: iso(fLib), comision: com, envio: env, retencion: ret, cuotas: cuo };
    }

    /* Ventas Neutral: comprobante interno. Las cobran los vendedores en efectivo o la Mutual por transferencia, con su recargo. */
    let neutralMay = 0;
    function crearNeutral(fecha) {
      const may = rnd() < 0.3;
      const cli = may ? elegir(mayoristas) : consumidor();
      const p = elegirPeso(pesoProducto);
      const items = [linea(p, may ? entero(2, 8) : 1, cli.lista)];
      const ctaCte = may && neutralMay++ % 2 === 0; /* una de cada dos Neutral a mayoristas va a cuenta corriente */
      const porMutual = !ctaCte && rnd() < 0.4;
      const k = REGLAS.calcularVenta({ items, ajustes: porMutual ? [{ tipo: 'recargo', modo: 'pct', valor: 5, concepto: 'Recargo Mutual' }] : [], cliente: cli, version: 'Neutral' });
      const vto = masDias(fecha, 30);
      ventas.push({
        id: ++contadores.venta, fecha: iso(fecha), canal: may ? 'mayorista' : 'mostrador', clienteId: cli.id, version: 'Neutral', lista: cli.lista,
        comp: { tipo: 'Comprobante interno', pv: '', nro: String(++contadores.interno).padStart(8, '0'), cae: '' },
        items, subtotal: k.subtotal, ajustes: k.ajustes, imp: null, total: k.total, deposito: 'principal',
        vendedorId: may ? cli.vendedorId : elegir(vendedores).id, operadorId: elegir(['u2', 'u3']),
        envio: may ? 'Transporte propio' : 'Retira en fábrica', estado: 'Vigente', remitida: true, despachada: true, nc: null,
        cobros: ctaCte ? [] : [{ nro: ++contadores.recibo, fecha: iso(fecha), monto: k.total, caja: porMutual ? 'mutual' : 'vendedores', medio: porMutual ? 'Transferencia o depósito' : 'Efectivo', ...(porMutual ? { comision: k.ajustes[0].monto } : {}) }],
        acred: ctaCte ? { estado: 'Cuenta corriente', fecha: iso(vto), vence: iso(vto), ...SIN_DESC() } : { estado: 'Acreditada', fecha: iso(fecha), ...SIN_DESC() }
      });
    }

    const porDia = { ml: 46, tn: 8, fravega: 2, provincia: 1, bna: 1, mostrador: 3, mayorista: 3 };
    for (let d = 1; d <= 9; d++) {
      const dow = new Date(2026, 9, d).getDay();
      const f = dow === 0 ? 0.6 : dow === 6 ? 0.75 : 1;
      const hMax = d === 9 ? 11 : 23;
      for (const canal of canales) {
        let n = Math.round(porDia[canal.id] * f * entre(0.8, 1.2));
        if ((canal.id === 'mayorista' || canal.id === 'mostrador') && (dow === 0 || dow === 6)) n = canal.id === 'mostrador' && dow === 6 ? 1 : 0;
        if (d === 9) n = Math.round(n * 0.45);
        for (let i = 0; i < n; i++) {
          const h = canal.id === 'mayorista' || canal.id === 'mostrador' ? entero(9, Math.min(17, hMax)) : entero(0, hMax);
          crearVenta(canal, new Date(2026, 9, d, h, entero(0, 59)));
        }
      }
      const nNeutral = dow === 0 ? 0 : Math.round((dow === 6 ? 2 : 4) * entre(0.7, 1.3) * (d === 9 ? 0.5 : 1));
      for (let i = 0; i < nNeutral; i++) crearNeutral(new Date(2026, 9, d, entero(9, Math.min(17, hMax)), entero(0, 59)));
    }

    /* Notas de débito de ejemplo: un renglón de concepto, sin producto ni stock. */
    [[3, 'm2', 'Gastos por cheque rechazado', 48400], [6, 'm9', 'Diferencia de precio', 96800]].forEach(([d, cliId, concepto, monto]) => {
      const cli = clientes.find((c) => c.id === cliId);
      const items = [{ productoId: null, servicio: true, nombre: concepto, cant: 1, precio: monto, bonif: 0, alic: 21, costo: 0 }];
      const k = REGLAS.calcularVenta({ items, ajustes: [], cliente: cli, version: 'Oficial' });
      contadores.nd['0007'] += 1;
      const fecha = dia(d, 12, 10), vto = masDias(fecha, 30);
      ventas.push({
        id: ++contadores.venta, fecha: iso(fecha), canal: 'mayorista', clienteId: cli.id, version: 'Oficial', lista: cli.lista,
        comp: { tipo: 'Nota de débito A', pv: '0007', nro: String(contadores.nd['0007']).padStart(8, '0'), cae: String(entero(7.1e13, 7.9e13)) },
        items, subtotal: k.subtotal, ajustes: [], imp: k.imp, total: k.total, deposito: null,
        vendedorId: cli.vendedorId, operadorId: 'u4', envio: 'No lleva envío', estado: 'Vigente', remitida: true, despachada: true, cobros: [], nc: null,
        acred: { estado: 'Cuenta corriente', fecha: iso(vto), vence: iso(vto), ...SIN_DESC() }
      });
    });
    /* Señas (reservan stock y quedan con saldo) y cotizaciones (no mueven stock ni caja). */
    [[6, 'pr13', 0.3, 'efectivo', 'Efectivo'], [8, 'pr15', 0.5, 'efectivo', 'Efectivo'], [9, 'pr10', 0.4, 'credicoop', 'Transferencia o depósito']].forEach(([d, pid, parte, cajaId, medio]) => {
      const cli = consumidor(), items = [linea(buscarProd(pid), 1, cli.lista)];
      const k = REGLAS.calcularVenta({ items, ajustes: [], cliente: cli, version: 'Seña' });
      const fecha = dia(d, 10, 20), id = ++contadores.venta;
      ventas.push({
        id, fecha: iso(fecha), canal: 'mostrador', clienteId: cli.id, version: 'Seña', lista: cli.lista, comp: { tipo: 'Recibo de seña', pv: '', nro: 'S-' + id, cae: '' },
        items, subtotal: k.subtotal, ajustes: [], imp: null, total: k.total, deposito: 'principal', vendedorId: elegir(vendedores).id, operadorId: 'u2',
        envio: 'Retira en fábrica', estado: 'Vigente', remitida: false, despachada: false, nc: null,
        cobros: [{ nro: ++contadores.recibo, fecha: iso(fecha), monto: cien(k.total * parte), caja: cajaId, medio }],
        acred: { estado: '', fecha: iso(fecha), vence: iso(masDias(fecha, 30)), ...SIN_DESC() }
      });
    });
    [[7, 'm4', [['pr5', 12], ['pr9', 6]]], [9, 'm11', [['pr16', 8]]]].forEach(([d, cliId, renglones]) => {
      const cli = clientes.find((c) => c.id === cliId), items = renglones.map(([pid, n]) => linea(buscarProd(pid), n, cli.lista));
      const k = REGLAS.calcularVenta({ items, ajustes: [], cliente: cli, version: 'Cotización' });
      const fecha = dia(d, 9, 45), id = ++contadores.venta;
      ventas.push({
        id, fecha: iso(fecha), canal: 'mayorista', clienteId: cli.id, version: 'Cotización', lista: cli.lista, comp: { tipo: 'Cotización', pv: '', nro: 'C-' + id, cae: '' },
        items, subtotal: k.subtotal, ajustes: [], imp: null, total: k.total, deposito: 'principal', vendedorId: cli.vendedorId, operadorId: 'u3',
        envio: 'Transporte propio', estado: 'Cotización', remitida: false, despachada: false, nc: null, cobros: [],
        acred: { estado: '', fecha: iso(fecha), ...SIN_DESC() }
      });
    });
    ventas.sort((a, b) => a.fecha < b.fecha ? -1 : 1);

    /* Anuladas con nota de crédito. Si la mercadería ya había salido, vuelve al depósito "A revisión". */
    ventas.filter((v) => v.canal !== 'mayorista' && v.version === 'Oficial').forEach((v) => {
      if (rnd() < 0.015) {
        const salio = v.remitida;
        v.estado = 'Anulada'; v.remitida = false; v.despachada = false;
        contadores.nc[v.comp.pv] += 1;
        const f = masDias(new Date(v.fecha), entero(0, 2));
        v.nc = { tipo: 'Nota de crédito B', pv: v.comp.pv, nro: String(contadores.nc[v.comp.pv]).padStart(8, '0'), fecha: iso(f > HOY ? HOY : f) };
        if (salio) v.devolucion = { deposito: 'revision', fecha: v.nc.fecha };
        v.acred = { estado: 'Devuelta', fecha: v.nc.fecha, ...SIN_DESC() };
      }
    });

    /* Remitos. Regla única: la venta RESERVA el stock y el remito lo DESCUENTA de su depósito de salida. Uno por venta.
       tipo: venta, compra (ingreso de proveedor, suma al recibirse) o devolucion (vuelve mercadería, suma al recibirse). */
    const remitos = [];
    const remito = (r) => { const x = { id: 'rm' + (remitos.length + 1), nro: '0001-' + String(++contadores.remito).padStart(8, '0'), tipo: r.tipo, fecha: r.fecha, estado: r.estado, depositoId: r.depositoId, ventaId: r.ventaId || null, proveedorId: r.proveedorId || null, items: r.items || null, grupo: null, operadorId: r.operadorId }; remitos.push(x); return x; };
    ventas.forEach((v) => {
      const salio = v.remitida || !!v.devolucion, despachada = v.despachada;
      delete v.remitida; delete v.despachada;
      if (!salio || !v.deposito) return;
      const solo = v.operadorId === 'sis' && v.envio === 'Mercado Envíos Full';
      const estado = v.devolucion || v.envio === 'Retira en fábrica' || solo ? 'Entregado' : despachada ? (new Date(v.fecha) < dia(8, 0) ? 'Entregado' : 'En camino') : (v.id % 2 ? 'Pendiente' : 'Preparado');
      remito({ tipo: 'venta', fecha: iso(new Date(Math.min(new Date(v.fecha).getTime() + 2 * 3600e3, HOY.getTime()))), estado, depositoId: v.deposito, ventaId: v.id, operadorId: solo ? 'sis' : (v.id % 2 ? 'u5' : 'u6') });
      if (v.devolucion) v.devolucion.remitoId = remito({ tipo: 'devolucion', fecha: v.devolucion.fecha, estado: 'Entregado', depositoId: 'revision', ventaId: v.id, operadorId: 'u6' }).id;
    });
    const enViaje = remitos.filter((r) => r.estado === 'En camino').slice(0, 4);
    if (enViaje.length > 1) { contadores.grupo = 1; enViaje.forEach((r) => { r.grupo = 'H-0001'; }); }

    /* Stock al 01/10 por depósito: lo que quedó hoy más lo que se vendió. El stock de hoy lo calcula la app. */
    const vendido = {};
    ventas.forEach((v) => {
      if (v.version === 'Cotización' || (v.estado === 'Anulada' && !v.devolucion)) return;
      v.items.forEach((l) => {
        const p = buscarProd(l.productoId); if (!p) return;
        (p.combo || [{ productoId: p.id, cant: 1 }]).forEach((c) => { const k = c.productoId + '|' + v.deposito; vendido[k] = (vendido[k] || 0) + l.cant * c.cant; });
      });
    });
    productos.forEach((p, i) => {
      if (p.combo) return;
      const justo = i === 7 || i === 18;
      const sinFull = p.rubro === 'Deco' || p.rubro === 'Banquetas';
      const queda = justo ? { principal: entero(6, 14), 'dep-fravega': entero(0, 3) } : {
        principal: entero(40, 380), fabrica: rnd() < 0.6 ? entero(8, 60) : 0, full: sinFull ? 0 : entero(0, 140), 'dep-fravega': entero(3, 24), 'dep-provincia': entero(2, 16),
        outlet: rnd() < 0.4 ? entero(2, 14) : 0, reserva: rnd() < 0.5 ? entero(4, 30) : 0, showroom: entero(1, 4), local1: entero(2, 12), local2: entero(2, 12)
      };
      depositos.forEach((d) => { const n = (queda[d.id] || 0) + (vendido[p.id + '|' + d.id] || 0); if (n) p.stockIni[d.id] = n; });
    });
    materias.forEach((m, i) => { m.stockIni.materia = i === 4 || i === 10 || i === 15 ? Math.round(m.minimo * entre(0.3, 0.8)) : Math.round(m.minimo * entre(1.4, 4)); });

    /* Movimientos de stock de ejemplo. tipo: compra, fabricacion, transferencia, ajuste, dev-cliente, dev-proveedor.
       Las ventas no se guardan acá: el movimiento de venta sale de la venta misma. La transferencia es un solo registro con sus dos puntas. */
    const todos = productos.concat(materias);
    const movsStock = [
      [2, 'transferencia', 'pr1', 40, 'principal', 'full', 'Envío a Full', 'u5'],
      [3, 'transferencia', 'pr5', 6, 'principal', 'dep-fravega', 'Reposición de Frávega', 'u5'],
      [5, 'ajuste', 'pr9', 2, 'principal', null, 'Rotura o falla', 'u6'],
      [6, 'transferencia', 'pr3', 5, 'principal', 'outlet', 'Segunda selección', 'u5'],
      [6, 'dev-proveedor', 'mp11', 4, 'materia', null, 'Vidrios con fallas', 'u7'],
      [8, 'ajuste', 'pr14', 1, null, 'principal', 'Recuento', 'u6']
    ].map(([d, tipo, productoId, cant, desde, hacia, motivo, operadorId], i) => {
      if (desde) { const p = todos.find((x) => x.id === productoId); p.stockIni[desde] = (p.stockIni[desde] || 0) + cant; }
      return { id: 'ms' + (i + 1), tipo, fecha: iso(dia(d, 15, 20)), productoId, cant, desde, hacia, motivo, operadorId };
    });
    [[2, 'p1', 'mp3', 300, 'Entregado'], [7, 'p5', 'mp17', 200, 'Entregado'], [9, 'p8', 'mp5', 400, 'Pendiente']].forEach(([d, prov, pid, cant, estado]) => remito({ tipo: 'compra', fecha: iso(dia(d, 9, 30)), estado, depositoId: 'materia', proveedorId: prov, items: [{ productoId: pid, cant }], operadorId: 'u7' }));

    /* Órdenes de fabricación. Al terminar, la materia prima sale de su depósito y el producto entra a Fábrica. */
    const ordenes = [
      [1, 'pr1', 60, 2, 'Terminada', 5], [2, 'pr9', 40, 3, 'Terminada', 6], [3, 'pr14', 30, 5, 'Terminada', 8], [4, 'pr4', 50, 6, 'En proceso'],
      [5, 'pr16', 25, 7, 'En proceso'], [6, 'pr8', 80, 8, 'Pendiente'], [7, 'pr19', 60, 9, 'Pendiente'], [8, 'pr20', 40, 4, 'Anulada']
    ].map(([n, productoId, cant, d, estado, fin]) => {
      const o = { id: 'of' + n, nro: ++contadores.orden, productoId, cant, fecha: iso(dia(d, 8, 30)), prevista: iso(dia(Math.min(d + 6, 28), 12)), responsableId: n % 2 ? 'u9' : 'u5', estado, operadorId: 'u9' };
      if (estado === 'En proceso' || estado === 'Terminada') o.inicio = iso(dia(d, 14, 0));
      if (estado === 'Anulada') o.anulada = iso(dia(d + 1, 10, 0));
      if (estado === 'Terminada') {
        o.terminada = iso(dia(fin, 16, 0));
        const mov = (pid, c, desde, hacia) => movsStock.push({ id: 'ms' + (movsStock.length + 1), tipo: 'fabricacion', fecha: o.terminada, productoId: pid, cant: c, desde, hacia, motivo: 'Orden de fabricación ' + o.nro, operadorId: o.responsableId, ordenId: o.id });
        todos.find((x) => x.id === productoId).materiales.forEach((m) => { const c = r2(m.cant * cant); todos.find((x) => x.id === m.productoId).stockIni.materia += c; mov(m.productoId, c, 'materia', null); });
        mov(productoId, cant, null, 'fabrica');
      }
      return o;
    });
    contadores.stock = movsStock.length;

    /* Publicaciones: cada tienda publica una lista de precios (con un % o un precio fijo por producto). Se guarda el último precio publicado. */
    canales.forEach((c) => { if (c.tienda) c.precio = { lista: 'minorista', pct: 0 }; });
    productos.forEach((p) => { p.publi = {}; canales.forEach((c) => { if (c.tienda) p.publi[c.id] = { precio: p.precios.minorista }; }); });
    [['pr3', 'tn'], ['pr3', 'fravega'], ['pr16', 'ml']].forEach(([pid, cid]) => { const p = buscarProd(pid); p.publi[cid].precio = cien(p.precios.minorista * 0.95); });

    /* Proveedores, servicios, impuestos y sueldos: cada uno con su cuenta corriente */
    const proveedores = [
      ['Maderas Andinas SRL', 'gen', 'Proveedor', 'Madera', 'Buenos Aires'],
      ['Aceros y Tubos del Centro SA', 'gen', 'Proveedor', 'Caños y perfiles', 'Córdoba'],
      ['Espumas y Telas Rivera SRL', 'gen', 'Proveedor', 'Espuma y telas', 'Buenos Aires'],
      ['Recubrimientos Industriales SRL', 'gen', 'Proveedor', 'Pintura en polvo', 'CABA'],
      ['Embalajes Patagónicos SA', 'gen', 'Proveedor', 'Cajas y embalaje', 'Buenos Aires'],
      ['Herrajes Integrales SRL', 'gen', 'Proveedor', 'Herrajes y tornillería', 'Santa Fe'],
      ['Vidriería Templar SRL', 'gen', 'Proveedor', 'Vidrio templado', 'Buenos Aires'],
      ['Ferretería Industrial Norte SRL', 'gen', 'Proveedor', 'Insumos varios', 'CABA'],
      ['Energía eléctrica', 'gen', 'Servicio', 'Luz de la planta', 'Buenos Aires'],
      ['Envíos a domicilio', 'gen', 'Servicio', 'Correo a clientes', 'CABA'],
      ['Transportes El Pampero', 'gen', 'Servicio', 'Fletes a mayoristas', 'Buenos Aires'],
      ['Internet y telefonía', 'gen', 'Servicio', 'Conectividad', 'CABA'],
      ['Vigilancia Integral SRL', 'gen', 'Servicio', 'Seguridad', 'Buenos Aires'],
      ['ARCA', '', 'Impuesto', 'IVA y Ganancias', ''],
      ['Rentas provinciales', '', 'Impuesto', 'Ingresos Brutos', ''],
      ['Municipalidad', '', 'Impuesto', 'Tasa de seguridad e higiene', ''],
      ['Sueldos de planta', '', 'Sueldo', 'Producción y depósito', ''],
      ['Sueldos de administración', '', 'Sueldo', 'Administración y ventas', '']
    ].map(([nombre, cuit, tipo, rubro, jurisdiccion], i) => ({ id: 'p' + (i + 1), nombre, cuit: cuit ? conDigito('30' + String(entero(7000000, 7199999)) + '0') : '', tipo, rubro, jurisdiccion, condicion: tipo === 'Proveedor' ? '30 días' : 'Contado', movs: [] }));

    /* Cada factura de compra guarda su neto, IVA, percepciones y no gravado. Sueldos e impuestos no llevan IVA.
       Cheques propios: el pago sale de Valores diferidos y el banco recién baja el día del débito. */
    const chequeras = [['credicoop', 41870001], ['santander', 20316501], ['macro', 77402301]].map(([banco, desde], i) => ({ id: 'cq' + (i + 1), banco, desde, hasta: desde + 49, proximo: desde }));
    const cheques = [];
    proveedores.forEach((p, pi) => {
      const base = p.tipo === 'Proveedor' ? entre(1.2e6, 7.5e6) : p.tipo === 'Servicio' ? entre(0.25e6, 1.6e6) : p.tipo === 'Impuesto' ? entre(1.5e6, 6e6) : entre(5e6, 12e6);
      const nFac = p.tipo === 'Sueldo' ? 2 : p.tipo === 'Proveedor' ? entero(3, 6) : entero(1, 3);
      const conIva = p.tipo === 'Proveedor' || p.tipo === 'Servicio';
      const alic = p.nombre === 'Energía eléctrica' || p.nombre === 'Internet y telefonía' ? 27 : p.nombre === 'Transportes El Pampero' ? 10.5 : 21;
      const facs = [];
      for (let i = 0; i < nFac; i++) {
        const f = i >= nFac - 2 ? new Date(2026, 9, entero(1, 8), entero(9, 17)) : new Date(2026, 8, entero(5, 29), entero(9, 17));
        const venceDias = p.tipo === 'Proveedor' ? entero(12, 40) : p.tipo === 'Sueldo' ? 4 : entero(5, 14);
        const tipoComp = p.tipo === 'Sueldo' ? 'Liquidación' : p.tipo === 'Impuesto' ? 'Obligación' : 'Factura A';
        const pv = String(entero(1, 9)).padStart(4, '0'), nro = String(entero(1000, 99999)).padStart(8, '0');
        const bruto = r2(base * entre(0.5, 1.2));
        let k;
        if (conIva) {
          const neto = r2(bruto / (1 + alic / 100));
          k = REGLAS.calcularCompra({ neto, alic, perc: [{ imp: 'IIBB ' + (p.jurisdiccion === 'CABA' ? 'CABA' : 'Buenos Aires'), monto: pi % 2 === 0 ? r2(neto * 0.025) : 0 }, { imp: 'IVA', monto: pi % 3 === 0 ? r2(neto * 0.03) : 0 }], noGravado: p.tipo === 'Servicio' ? r2(neto * 0.04) : 0 });
        } else k = { neto: 0, alic: 0, iva: 0, perc: [], noGravado: bruto, monto: bruto };
        facs.push({ id: 'f' + p.id + i, tipo: 'factura', fecha: iso(f), comp: tipoComp + ' ' + pv + '-' + nro, tipoComp, pv, nro, ...k, vence: iso(masDias(f, venceDias)), detalle: p.rubro, operadorId: 'u7' });
      }
      facs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
      p.movs.push(...facs);
      facs.forEach((fac, i) => {
        if (i < facs.length - 1 || rnd() < 0.25) {
          const f = masDias(new Date(fac.fecha), entero(3, 18));
          if (f > HOY) return;
          const ret = REGLAS.retencionesPago(p, fac.monto);
          const retenciones = r2(ret.reduce((s, x) => s + x.monto, 0));
          const banco = elegir(['credicoop', 'santander', 'macro']);
          const op = ++contadores.op;
          const pago = { id: 'op' + op, tipo: 'pago', op, fecha: iso(f), comp: 'Orden de pago ' + op, monto: fac.monto, caja: banco, medio: 'Transferencia o depósito', retenciones, ret, aplicaA: fac.id, operadorId: 'u8' };
          if (p.tipo === 'Proveedor' && rnd() < 0.5) {
            const deb = masDias(f, elegir([7, 15, 30, 45, 60])); deb.setHours(9, 0);
            const cq = chequeras.find((x) => x.banco === banco);
            const ch = { id: 'ch' + (cheques.length + 1), nro: String(cq.proximo++).padStart(8, '0'), chequeraId: cq.id, proveedorId: p.id, op, banco, monto: r2(fac.monto - retenciones), emision: iso(f), debito: iso(deb), baja: null };
            cheques.push(ch);
            pago.caja = 'valores'; pago.medio = 'Cheque propio'; pago.chequeId = ch.id;
          }
          p.movs.push(pago);
        }
      });
      p.movs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    });
    /* los dos más viejos ya debitaron */
    cheques.slice().sort((a, b) => a.emision < b.emision ? -1 : 1).slice(0, 2).forEach((c) => { const d = new Date(c.emision); d.setDate(d.getDate() + 12); d.setHours(9, 0); c.debito = iso(d); });
    /* Lo que ARCA tiene y el sistema todavía no. Se trae desde Configuración, Facturación: cuatro de proveedores conocidos,
       uno de un CUIT que no está en el maestro y uno que ya estaba cargado (lo tiene que detectar como duplicado). */
    const enArca = (prov, d, pv, nro, bruto, alic) => ({ cuit: prov.cuit, razon: prov.nombre, tipoComp: 'Factura A', pv, nro, fecha: iso(dia(d, 10, 0)), ...REGLAS.calcularCompra({ neto: r2(bruto / (1 + alic / 100)), alic, perc: [], noGravado: 0 }) });
    const yaCargada = proveedores[0].movs.find((m) => m.tipo === 'factura');
    const arca = {
      pool: [
        enArca(proveedores[1], 7, '0002', '00018842', 3872000, 21), enArca(proveedores[4], 8, '0001', '00007731', 1452000, 21),
        enArca(proveedores[8], 6, '0015', '00420019', 1016000, 27), enArca(proveedores[10], 8, '0002', '00003390', 663000, 10.5),
        enArca({ cuit: conDigito('30716004410'), nombre: 'Lubricantes del Sur SRL' }, 5, '0001', '00001207', 242000, 21),
        { cuit: proveedores[0].cuit, razon: proveedores[0].nombre, tipoComp: yaCargada.tipoComp, pv: yaCargada.pv, nro: yaCargada.nro, fecha: yaCargada.fecha, neto: yaCargada.neto, alic: yaCargada.alic, iva: yaCargada.iva, perc: yaCargada.perc, noGravado: yaCargada.noGravado, monto: yaCargada.monto }
      ].map((x, i) => ({ id: 'ac' + (i + 1), ...x })),
      recibidos: [],
      revisar: [{ ventaId: ventas.find((v) => v.version === 'Oficial' && v.canal === 'tn' && v.estado !== 'Anulada').id, motivo: 'En ARCA figura con fecha del día siguiente' }]
    };

    /* uno que debita hoy, para poder registrar el débito en la demostración */
    const paraHoy = cheques.filter((c) => new Date(c.debito) > HOY).sort((a, b) => a.debito < b.debito ? -1 : 1)[0];
    if (paraHoy) paraHoy.debito = iso(new Date(INI_HOY.getTime() + 9 * 3600e3));

    /* saldos iniciales de los bancos que cubren pagos y cheques */
    const salidas = {};
    proveedores.forEach((p) => p.movs.forEach((m) => { if (m.tipo === 'pago' && m.caja !== 'valores') salidas[m.caja] = (salidas[m.caja] || 0) + m.monto - (m.retenciones || 0); }));
    cheques.forEach((c) => { salidas[c.banco] = (salidas[c.banco] || 0) + c.monto; });
    cajas.forEach((c) => { if (c.tipo === 'banco') c.inicial = cien((salidas[c.id] || 0) + entre(9e6, 24e6)); });

    /* Movimientos entre cajas: un solo registro con sus dos puntas (desde y hacia). Nunca son ingreso ni gasto.
       tipo: transferencia (desde y hacia), ingreso (solo hacia), retiro (solo desde). */
    const movsCaja = [];
    const mover = (fecha, desde, hacia, monto, detalle, extra) => movsCaja.push({ id: 'mc' + (movsCaja.length + 1), tipo: desde && hacia ? 'transferencia' : hacia ? 'ingreso' : 'retiro', fecha: iso(fecha), desde, hacia, monto, concepto: 'Transferencia', detalle, operadorId: 'u8', ...(extra || {}) });
    [[2, 'credicoop', 8500000], [5, 'santander', 6000000], [6, 'credicoop', 7200000], [8, 'macro', 4000000]].forEach(([d, hacia, monto]) => mover(dia(d, 10, 15), 'mp', hacia, monto, 'Retiro de Mercado Pago'));
    mover(dia(2, 11, 0), 'credicoop', 'pr-personal', 2400000, 'Préstamo otorgado');
    mover(dia(5, 10, 30), 'macro', 'pr-macro', 1500000, 'Cuota 4 de 12');
    mover(dia(6, 18, 5), 'efectivo', 'socio1', 300000, 'Retiro de socio');
    mover(dia(7, 16, 0), 'pr-personal', 'efectivo', 400000, 'Cuota 1 de 6');
    /* lo Neutral que ya se rindió: los vendedores entregan el efectivo y la Mutual liquida */
    const netoNeutral = (cajaId, hasta) => ventas.reduce((s, v) => s + (v.cobros[0] && v.cobros[0].caja === cajaId && new Date(v.fecha) <= hasta ? v.total - (v.cobros[0].comision || 0) : 0), 0);
    const rendV = Math.floor(netoNeutral('vendedores', dia(7, 17, 30)) * 0.6 / 1000) * 1000;
    if (rendV > 0) mover(dia(7, 17, 30), 'vendedores', 'efectivo', rendV, 'Rendición de vendedores');
    const liqM = Math.floor(netoNeutral('mutual', dia(8, 12, 0)) * 0.6 / 1000) * 1000;
    if (liqM > 0) mover(dia(8, 12, 0), 'mutual', 'credicoop', liqM, 'Liquidación de la Mutual');
    /* cheques propios que ya debitaron: banco a Valores diferidos, en la fecha del cheque */
    cheques.filter((c) => new Date(c.debito) < INI_HOY).forEach((c) => mover(new Date(c.debito), c.banco, 'valores', c.monto, 'Débito del cheque ' + c.nro, { chequeId: c.id }));

    /* Arqueos del efectivo: lo contado contra lo que dice el sistema. La diferencia del 08/10 quedó cargada como ajuste. */
    const efectivoAl = (hasta) => r2(cajas.find((c) => c.id === 'efectivo').inicial
      + ventas.reduce((s, v) => s + (v.estado !== 'Anulada' ? v.cobros.reduce((a, c) => a + (c.caja === 'efectivo' && new Date(c.fecha) <= hasta ? c.monto : 0), 0) : 0), 0)
      + movsCaja.reduce((s, m) => s + (new Date(m.fecha) <= hasta ? (m.hacia === 'efectivo' ? m.monto : 0) - (m.desde === 'efectivo' ? m.monto : 0) : 0), 0));
    const arqueos = [];
    [[2, 0], [5, 0], [8, -1500]].forEach(([d, dif]) => {
      const fecha = dia(d, 18, 30), sistema = efectivoAl(fecha);
      const a = { id: 'ar' + (++contadores.arqueo), cajaId: 'efectivo', fecha: iso(fecha), sistema, contado: r2(sistema + dif), diferencia: dif, operadorId: 'u8', movId: null };
      if (dif) { mover(new Date(fecha.getTime() + 60000), dif < 0 ? 'efectivo' : null, dif < 0 ? null : 'efectivo', Math.abs(dif), 'Diferencia del arqueo del ' + String(d).padStart(2, '0') + '/10', { concepto: 'Ajuste por arqueo', arqueoId: a.id }); a.movId = movsCaja[movsCaja.length - 1].id; }
      arqueos.push(a);
    });
    contadores.mov = movsCaja.length;

    return { version: 7, puntosVenta, canales, cajas, depositos, listas, vendedores, operadores, productos: todos, clientes, ventas, remitos, ordenes, proveedores, chequeras, cheques, movsCaja, movsStock, arqueos, arca, contadores };
  };
})();

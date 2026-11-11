/* Maqueta Argos para HDC Group: base de datos de EJEMPLO.
   Todo es inventado: clientes, proveedores, montos, numeración y bancos.
   Generador con semilla fija: la primera vez (o al restablecer) siempre arma la misma base. */
(function () {
  'use strict';

  window.HDC_HOY = new Date(2026, 9, 9, 11, 40);

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
    const r2 = (n) => Math.round(n * 100) / 100;
    const HOY = window.HDC_HOY;
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

    const canales = [
      { id: 'ml', nombre: 'Mercado Libre', ini: 'ML', pv: '0002', caja: 'mp' },
      { id: 'tn', nombre: 'Tiendanube', ini: 'TN', pv: '0006', caja: 'pagonube' },
      { id: 'fravega', nombre: 'Frávega', ini: 'FR', pv: '0010', caja: 'marketplaces' },
      { id: 'bancos', nombre: 'Tiendas de bancos', ini: 'TB', pv: '0010', caja: 'tiendasbancos' },
      { id: 'mayorista', nombre: 'Mayorista', ini: 'MY', pv: '0007', caja: null },
      { id: 'mostrador', nombre: 'Mostrador', ini: 'MO', pv: '0001', caja: null }
    ];

    const cajas = [
      { id: 'mp', nombre: 'Mercado Pago', tipo: 'billetera', fuente: 'Mercado Pago', inicial: 18450300 },
      { id: 'pagonube', nombre: 'Pago Nube', tipo: 'billetera', fuente: 'Liquidación de Pago Nube', inicial: 1920450 },
      { id: 'marketplaces', nombre: 'Frávega a liquidar', tipo: 'a-liquidar', fuente: 'Liquidación de Frávega', inicial: 0 },
      { id: 'tiendasbancos', nombre: 'Tiendas de bancos a liquidar', tipo: 'a-liquidar', fuente: 'Liquidaciones de los bancos', inicial: 0 },
      { id: 'credicoop', nombre: 'Banco Credicoop', tipo: 'banco', fuente: 'Extracto de Credicoop', inicial: 22310800 },
      { id: 'santander', nombre: 'Banco Santander', tipo: 'banco', fuente: 'Extracto de Santander', inicial: 9844120, difExtracto: -184300 },
      { id: 'macro', nombre: 'Banco Macro', tipo: 'banco', fuente: 'Extracto de Macro', inicial: 4127650 },
      { id: 'cheques', nombre: 'Cheques en cartera', tipo: 'cheques', fuente: 'Cartera de cheques', inicial: 0 },
      { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', fuente: 'Arqueo del 08/10', inicial: 1385000 }
    ];

    const productos = [
      ['SIL-TUL-B4', 'Silla Tulip blanca x4', 119900, 'Sillas'],
      ['SIL-TUL-N4', 'Silla Tulip negra x4', 119900, 'Sillas'],
      ['SIL-NOR-N4', 'Silla Nórdica natural x4', 109900, 'Sillas'],
      ['SIL-NOR-G6', 'Silla Nórdica gris x6', 159900, 'Sillas'],
      ['SIL-MIL-B4', 'Silla Milán blanca x4', 134900, 'Sillas'],
      ['SIL-WIN-N4', 'Silla Windsor negra x4', 129900, 'Sillas'],
      ['SIL-BIS-4', 'Silla Bistró x4', 99900, 'Sillas'],
      ['SIL-TOL-N1', 'Silla Tolix negra', 27900, 'Sillas'],
      ['MES-RED-90', 'Mesa redonda de vidrio 90 cm', 98900, 'Mesas'],
      ['MES-REC-140', 'Mesa rectangular de vidrio 140x80', 164900, 'Mesas'],
      ['MES-TOL-N', 'Mesa Tolix de metal negra', 119900, 'Mesas'],
      ['COM-RED-TUL', 'Combo mesa redonda + 4 sillas Tulip', 269900, 'Combos'],
      ['COM-NOR-160', 'Combo comedor Nórdico 160 + 6 sillas', 389900, 'Combos'],
      ['OFI-EJE-N', 'Sillón ejecutivo negro', 189900, 'Oficina'],
      ['OFI-GER-C', 'Sillón gerencial de cuero', 259900, 'Oficina'],
      ['GAM-PRO-G', 'Silla gamer Pro gris', 229900, 'Gamer'],
      ['GAM-PRO-R', 'Silla gamer Pro roja', 229900, 'Gamer'],
      ['GAM-ESC-120', 'Escritorio gamer 120 cm', 64900, 'Gamer'],
      ['BAN-ALT-2', 'Banqueta alta x2', 79900, 'Banquetas'],
      ['DEC-PER-1', 'Perchero de pie', 34900, 'Deco']
    ].map(([sku, nombre, precio, rubro], i) => ({
      id: 'pr' + (i + 1), sku, nombre, precio, precioMayorista: Math.round(precio * 0.68 / 100) * 100, rubro,
      costo: Math.round(precio * entre(0.47, 0.58) / 100) * 100,
      stock: { fabrica: entero(40, 380), full: rubro === 'Deco' || rubro === 'Banquetas' ? 0 : entero(0, 140) },
      minimo: 30
    }));
    const pesoProducto = productos.map((p) => [p, p.rubro === 'Sillas' ? 3 : p.rubro === 'Combos' ? 2 : p.rubro === 'Deco' ? 0.5 : 1.1]);

    const NOMBRES = ['Lucía', 'Martín', 'Sofía', 'Gonzalo', 'Valentina', 'Nicolás', 'Camila', 'Federico', 'Agustina', 'Matías', 'Florencia', 'Joaquín', 'Micaela', 'Tomás', 'Rocío', 'Facundo', 'Julieta', 'Ezequiel', 'Antonela', 'Santiago', 'Melina', 'Lautaro', 'Brenda', 'Ramiro', 'Yamila', 'Hernán', 'Daiana', 'Leandro', 'Celeste', 'Gastón', 'Romina', 'Iván', 'Noelia', 'Pablo', 'Carla', 'Emiliano', 'Belén', 'Diego', 'Abril', 'Cristian'];
    const APELLIDOS = ['Ferreyra', 'Gutiérrez', 'Orozco', 'Acosta', 'Medina', 'Sosa', 'Quiroga', 'Arrieta', 'Villalba', 'Pacheco', 'Ojeda', 'Paz', 'Maidana', 'Arce', 'Toledo', 'Correa', 'Godoy', 'Peralta', 'Ríos', 'Funes', 'Giménez', 'Cabrera', 'Ponce', 'Luna', 'Cáceres', 'Aguirre', 'Salinas', 'Navarro', 'Rojas', 'Figueroa', 'Bianchi', 'Zárate', 'Ibarra', 'Lescano', 'Báez', 'Lucero', 'Ferrari', 'Herrera', 'Ruiz', 'Olmedo'];
    const LOCALIDADES = ['Paraná', 'La Plata', 'CABA', 'Lanús', 'Avellaneda', 'Morón', 'San Isidro', 'Córdoba', 'Rosario', 'Mendoza', 'Mar del Plata', 'Tigre', 'Pilar', 'Neuquén', 'Salta', 'Bahía Blanca', 'Santa Fe', 'Tandil'];

    const clientes = [];
    function consumidor() {
      const c = { id: 'c' + (clientes.length + 1), nombre: elegir(NOMBRES) + ' ' + elegir(APELLIDOS), doc: String(entero(20000000, 45999999)), tipo: 'Consumidor final', iva: 'Consumidor final', localidad: elegir(LOCALIDADES), condicion: 'Contado', percepciones: [], email: '', telefono: '' };
      clientes.push(c); return c;
    }
    const mayoristas = [
      ['Mueblería Los Robles SRL', '30-71482215-6', 'Rosario', 'Cuenta corriente 30 días'],
      ['Hogar Belgrano SA', '30-70955318-2', 'CABA', 'Cheque a 30 días'],
      ['Interiores del Litoral SAS', '30-71734408-9', 'Santa Fe', 'Transferencia contado'],
      ['Casa Andina Muebles SRL', '30-71215590-4', 'Mendoza', 'Cuenta corriente 30 días'],
      ['Equipamiento Austral SA', '30-70876129-0', 'Neuquén', 'Cheque a 30 días'],
      ['Decorar Tandil SRL', '30-71590062-7', 'Tandil', 'Transferencia contado'],
      ['Oficina Total SAS', '30-71880741-3', 'CABA', 'Cuenta corriente 30 días'],
      ['Mobiliario Serrano SRL', '30-71344856-1', 'Córdoba', 'Cheque a 30 días'],
      ['La Casa del Comedor SA', '30-70712934-5', 'Mar del Plata', 'Cuenta corriente 30 días'],
      ['Hoteles y Gastronomía Sur SA', '30-71066243-8', 'Bahía Blanca', 'Transferencia contado'],
      ['Muebles Norteños SRL', '30-71427705-2', 'Salta', 'Cheque a 30 días'],
      ['Ambientes Pilar SRL', '30-71655390-0', 'Pilar', 'Cuenta corriente 30 días']
    ].map(([nombre, doc, localidad, condicion], i) => {
      const c = { id: 'm' + (i + 1), nombre, doc: conDigito(doc), tipo: 'Mayorista', iva: 'Responsable inscripto', localidad, condicion, percepciones: ['IIBB Buenos Aires', 'IIBB CABA', 'IVA'], email: 'compras@' + nombre.toLowerCase().split(' ')[0].normalize('NFD').replace(/[^a-z]/g, '') + '.com.ar', telefono: '' };
      clientes.push(c); return c;
    });

    const contadores = { venta: 10000, comp: { '0001': 4120, '0002': 21350, '0006': 6210, '0007': 1840, '0010': 930 }, nc: { '0001': 40, '0002': 610, '0006': 95, '0007': 12, '0010': 8 }, recibo: 7400, op: 2210, mov: 0 };

    const ventas = [];
    function crearVenta(canal, fecha) {
      const may = canal.id === 'mayorista';
      const pool = clientes.filter((c) => c.tipo === 'Consumidor final');
      const cli = may ? elegir(mayoristas) : (rnd() < 0.05 && pool.length > 25 ? elegir(pool) : consumidor());
      const items = [];
      if (may) {
        const n = entero(2, 4);
        for (let i = 0; i < n; i++) {
          const p = elegirPeso(pesoProducto);
          if (!items.some((l) => l.productoId === p.id)) items.push({ productoId: p.id, nombre: p.nombre, cant: entero(4, 16), precio: p.precioMayorista });
        }
      } else {
        const p = elegirPeso(pesoProducto);
        items.push({ productoId: p.id, nombre: p.nombre, cant: rnd() < 0.07 ? 2 : 1, precio: p.precio });
      }
      const total = r2(items.reduce((s, l) => s + l.cant * l.precio, 0));
      contadores.comp[canal.pv] += 1;
      const v = {
        id: ++contadores.venta, fecha: iso(fecha), canal: canal.id, clienteId: cli.id, version: 'Oficial',
        comp: { tipo: 'Factura ' + (may ? 'A' : 'B'), pv: canal.pv, nro: String(contadores.comp[canal.pv]).padStart(8, '0'), cae: String(entero(7.1e13, 7.9e13)) },
        items, total,
        envio: may ? 'Transporte propio' : canal.id === 'ml' ? elegirPeso([['Mercado Envíos Full', 6], ['Mercado Envíos Flex', 3], ['Retira en fábrica', 1]]) : canal.id === 'mostrador' ? 'Retira en fábrica' : elegirPeso([['Correo a domicilio', 7], ['Retira en fábrica', 2]]),
        estado: 'Finalizada', remitida: true, cobros: [], acred: null, nc: null, operador: elegir(['Administración', 'Ventas 1', 'Ventas 2', 'Depósito'])
      };
      if (!may && rnd() < 0.12) { v.estado = 'Pendiente de remitir'; v.remitida = false; }
      liquidar(v, canal, cli, fecha);
      ventas.push(v);
    }

    function liquidar(v, canal, cli, fecha) {
      const t = v.total;
      const recibo = (monto, caja, medio, extra) => ({ nro: ++contadores.recibo, fecha: iso(extra && extra.fecha ? extra.fecha : fecha), monto: r2(monto), caja, medio, ...(extra || {}) });
      if (canal.id === 'mayorista') {
        if (cli.condicion.startsWith('Transferencia')) {
          v.cobros.push(recibo(t, elegir(['credicoop', 'santander', 'macro']), 'Transferencia'));
          v.acred = { estado: 'Acreditada', fecha: iso(fecha), comision: 0, envio: 0, retencion: r2(t * 0.025), cuotas: 0 };
        } else if (cli.condicion.startsWith('Cheque')) {
          const vto = masDias(fecha, 30);
          v.cobros.push(recibo(t, 'cheques', 'Cheque de terceros', { cheque: { nro: String(entero(10000000, 99999999)), banco: elegir(['Santander', 'Macro', 'Credicoop', 'Patagonia', 'Hipotecario']), vence: iso(vto) } }));
          v.acred = { estado: 'Cheque en cartera', fecha: iso(vto), comision: 0, envio: 0, retencion: r2(t * 0.025), cuotas: 0 };
        } else {
          const vto = masDias(fecha, 30);
          if (rnd() < 0.3) v.cobros.push(recibo(t * entre(0.3, 0.6), 'credicoop', 'Transferencia', { fecha: masDias(fecha, entero(1, 4)) }));
          v.acred = { estado: 'Cuenta corriente', fecha: iso(vto), vence: iso(vto), comision: 0, envio: 0, retencion: 0, cuotas: 0 };
        }
        return;
      }
      if (canal.id === 'mostrador') {
        const deb = rnd() < 0.55;
        v.cobros.push(recibo(t, deb ? 'credicoop' : 'efectivo', deb ? 'Tarjeta de débito' : 'Efectivo'));
        v.acred = { estado: 'Acreditada', fecha: iso(deb ? masDias(fecha, 1) : fecha), comision: deb ? r2(t * 0.012) : 0, envio: 0, retencion: 0, cuotas: 0 };
        return;
      }
      const medio = elegirPeso([['Tarjeta de crédito', 55], ['Dinero en cuenta', 24], ['Tarjeta de débito', 13], ['Transferencia', 8]]);
      const enCuotas = medio === 'Tarjeta de crédito' && rnd() < 0.7;
      const cuotas = enCuotas ? elegir([3, 6, 6, 12]) : 1;
      let com = 0, env = 0, cuo = 0, dias = 0, pend = 'A liberar';
      const ret = r2(t * 0.02);
      if (canal.id === 'ml') { com = r2(t * entre(0.13, 0.155)); env = v.envio.startsWith('Mercado') ? r2(Math.min(t * entre(0.035, 0.06), 13900)) : 0; cuo = enCuotas ? r2(t * (cuotas === 3 ? 0.052 : cuotas === 6 ? 0.094 : 0.168)) : 0; dias = elegirPeso([[0, 4], [1, 3], [2, 2], [5, 1], [10, 1]]); }
      if (canal.id === 'tn') { com = r2(t * 0.0449); cuo = enCuotas ? r2(t * (cuotas === 3 ? 0.06 : cuotas === 6 ? 0.105 : 0.18)) : 0; dias = entero(3, 14); }
      if (canal.id === 'fravega') { com = r2(t * entre(0.15, 0.17)); dias = 15 - fecha.getDate() + 6; pend = 'A liquidar'; }
      if (canal.id === 'bancos') { com = r2(t * entre(0.09, 0.12)); cuo = enCuotas ? r2(t * 0.11) : 0; dias = entero(18, 25); pend = 'A liquidar'; }
      v.cobros.push(recibo(t, canal.caja, medio, { cuotas, operacion: String(entero(4100000000, 4199999999)), automatico: true }));
      const fLib = dias === 0 ? new Date(fecha.getTime() + 3 * 3600e3) : masDias(fecha, dias);
      v.acred = { estado: fLib <= HOY ? 'Acreditada' : pend, fecha: iso(fLib), comision: com, envio: env, retencion: ret, cuotas: cuo };
    }

    const porDia = { ml: 46, tn: 8, fravega: 2, bancos: 2, mostrador: 2, mayorista: 3 };
    for (let d = 1; d <= 9; d++) {
      const dow = new Date(2026, 9, d).getDay();
      const f = dow === 0 ? 0.6 : dow === 6 ? 0.75 : 1;
      for (const canal of canales) {
        let n = Math.round(porDia[canal.id] * f * entre(0.8, 1.2));
        if ((canal.id === 'mayorista' || canal.id === 'mostrador') && (dow === 0 || dow === 6)) n = canal.id === 'mostrador' && dow === 6 ? 1 : 0;
        if (d === 9) n = Math.round(n * 0.45);
        const hMax = d === 9 ? 11 : 23;
        for (let i = 0; i < n; i++) {
          const h = canal.id === 'mayorista' || canal.id === 'mostrador' ? entero(9, Math.min(17, hMax)) : entero(0, hMax);
          crearVenta(canal, new Date(2026, 9, d, h, entero(0, 59)));
        }
      }
    }
    ventas.sort((a, b) => a.fecha < b.fecha ? -1 : 1);

    ventas.filter((v) => v.canal !== 'mayorista').forEach((v) => {
      if (rnd() < 0.015) {
        v.estado = 'Anulada'; v.remitida = false;
        contadores.nc[v.comp.pv] += 1;
        const f = masDias(new Date(v.fecha), entero(0, 2));
        v.nc = { tipo: 'Nota de crédito B', pv: v.comp.pv, nro: String(contadores.nc[v.comp.pv]).padStart(8, '0'), fecha: iso(f > HOY ? HOY : f) };
        v.acred = { estado: 'Devuelta', fecha: v.nc.fecha, comision: 0, envio: 0, retencion: 0, cuotas: 0 };
      }
    });

    /* Proveedores, servicios, impuestos y sueldos: cada uno con su cuenta corriente */
    const proveedores = [
      ['Maderas Andinas SRL', 'gen', 'Proveedor', 'Madera'],
      ['Aceros y Tubos del Centro SA', 'gen', 'Proveedor', 'Caños y perfiles'],
      ['Espumas y Telas Rivera SRL', 'gen', 'Proveedor', 'Espuma y telas'],
      ['Recubrimientos Industriales SRL', 'gen', 'Proveedor', 'Pintura en polvo'],
      ['Embalajes Patagónicos SA', 'gen', 'Proveedor', 'Cajas y embalaje'],
      ['Herrajes Integrales SRL', 'gen', 'Proveedor', 'Herrajes y tornillería'],
      ['Vidriería Templar SRL', 'gen', 'Proveedor', 'Vidrio templado'],
      ['Ferretería Industrial Norte SRL', 'gen', 'Proveedor', 'Insumos varios'],
      ['Energía eléctrica', 'gen', 'Servicio', 'Luz de la planta'],
      ['Envíos a domicilio', 'gen', 'Servicio', 'Correo a clientes'],
      ['Transportes El Pampero', 'gen', 'Servicio', 'Fletes a mayoristas'],
      ['Internet y telefonía', 'gen', 'Servicio', 'Conectividad'],
      ['Vigilancia Integral SRL', 'gen', 'Servicio', 'Seguridad'],
      ['ARCA', '', 'Impuesto', 'IVA y Ganancias'],
      ['Rentas provinciales', '', 'Impuesto', 'Ingresos Brutos'],
      ['Municipalidad', '', 'Impuesto', 'Tasa de seguridad e higiene'],
      ['Sueldos de planta', '', 'Sueldo', 'Producción y depósito'],
      ['Sueldos de administración', '', 'Sueldo', 'Administración y ventas']
    ].map(([nombre, cuit, tipo, rubro], i) => ({ id: 'p' + (i + 1), nombre, cuit: cuit ? conDigito('30' + String(entero(7000000, 7199999)) + '0') : '', tipo, rubro, condicion: tipo === 'Proveedor' ? '30 días' : 'Contado', movs: [] }));

    proveedores.forEach((p) => {
      const base = p.tipo === 'Proveedor' ? entre(1.2e6, 7.5e6) : p.tipo === 'Servicio' ? entre(0.25e6, 1.6e6) : p.tipo === 'Impuesto' ? entre(1.5e6, 6e6) : entre(5e6, 12e6);
      const nFac = p.tipo === 'Sueldo' ? 2 : p.tipo === 'Proveedor' ? entero(3, 6) : entero(1, 3);
      const facs = [];
      for (let i = 0; i < nFac; i++) {
        const f = i >= nFac - 2 ? new Date(2026, 9, entero(1, 8), entero(9, 17)) : new Date(2026, 8, entero(5, 29), entero(9, 17));
        const venceDias = p.tipo === 'Proveedor' ? entero(12, 40) : p.tipo === 'Sueldo' ? 4 : entero(5, 14);
        const pre = p.tipo === 'Sueldo' ? 'Liquidación' : p.tipo === 'Impuesto' ? 'Obligación' : 'Factura A';
        facs.push({ id: 'f' + p.id + i, tipo: 'factura', fecha: iso(f), comp: pre + ' ' + String(entero(1, 9)).padStart(4, '0') + '-' + String(entero(1000, 99999)).padStart(8, '0'), monto: r2(base * entre(0.5, 1.2)), vence: iso(masDias(f, venceDias)), detalle: p.rubro });
      }
      facs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
      p.movs.push(...facs);
      facs.forEach((fac, i) => {
        if (i < facs.length - 1 || rnd() < 0.25) {
          const f = masDias(new Date(fac.fecha), entero(3, 18));
          if (f > HOY) return;
          const ret = p.tipo === 'Proveedor' ? r2(fac.monto * 0.03) : 0;
          p.movs.push({ id: 'op' + (++contadores.op), tipo: 'pago', fecha: iso(f), comp: 'Orden de pago ' + contadores.op, monto: fac.monto, caja: elegir(['credicoop', 'santander', 'macro']), retenciones: ret, aplicaA: fac.id });
        }
      });
      p.movs.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    });

    /* saldos iniciales que cubren los pagos, y retiros de Mercado Pago a los bancos */
    const salidas = {};
    proveedores.forEach((p) => p.movs.forEach((m) => { if (m.tipo === 'pago') salidas[m.caja] = (salidas[m.caja] || 0) + m.monto - (m.retenciones || 0); }));
    cajas.forEach((c) => { if (c.tipo === 'banco') c.inicial = Math.round(((salidas[c.id] || 0) + entre(9e6, 24e6)) / 100) * 100; });
    const movsCaja = [
      [2, 'credicoop', 8500000], [5, 'santander', 6000000], [6, 'credicoop', 7200000], [8, 'macro', 4000000]
    ].map(([d, hacia, monto], i) => ({ id: 'mc' + (i + 1), tipo: 'transferencia', fecha: iso(new Date(2026, 9, d, 10, 15)), desde: 'mp', hacia, monto, concepto: 'Transferencia', detalle: 'Retiro de Mercado Pago' }));
    contadores.mov = movsCaja.length;

    return { version: 5, canales, cajas, productos, clientes, ventas, proveedores, movsCaja, contadores };
  };
})();

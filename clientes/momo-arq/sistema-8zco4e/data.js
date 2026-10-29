/* Base de ejemplo de la maqueta de Momo. Todo es ficticio: obras, clientes, proveedores y montos inventados.
   Las fechas se arman relativas a hoy, así la maqueta siempre se ve "al día". */
(function () {
  'use strict';

  const HOY = new Date(); HOY.setHours(12, 0, 0, 0);
  const dia = (n) => { const d = new Date(HOY); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const mesDe = (n) => { const d = new Date(HOY); d.setMonth(d.getMonth() + n, 1); return d.toISOString().slice(0, 7); };
  const ts = (n, h) => { const d = new Date(HOY); d.setDate(d.getDate() + n); d.setHours(h || 10, 17, 0, 0); return d.toISOString(); };

  /* CUIT con dígito verificador válido */
  function cuit(pref, cuerpo) {
    const base = String(pref) + String(cuerpo).padStart(8, '0');
    const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(base[i]) * m[i];
    let v = 11 - (s % 11); if (v === 11) v = 0;
    if (v === 10) return cuit(pref, Number(cuerpo) + 1);
    return base + v;
  }

  window.MOMO_HOY = HOY;
  window.MOMO_SEED = function () {
    const rubros = [
      ['r01', '1', 'Preliminares'], ['r02', '2', 'Proyectos, instalaciones y habilitaciones'], ['r03', '3', 'Demolición'],
      ['r04', '4', 'Durlock'], ['r05', '5', 'Albañilería'], ['r06', '6', 'Pintura'], ['r07', '7', 'Mobiliario'],
      ['r08', '8', 'Instalación sanitaria'], ['r09', '9', 'Instalación eléctrica'], ['r10', '10', 'Cubierta, aberturas y vidriería'],
      ['r11', '11', 'Materiales para revestimientos'], ['r12', '12', 'Marmolería'], ['r13', '13', 'Materiales sanitarios'],
      ['r14', '14', 'Materiales generales'], ['r15', '15', 'Termomecánicas'], ['r16', '16', 'Calefacción'], ['r17', '17', 'Varios']
    ].map(([id, num, nombre]) => ({ id, num, nombre }));

    const equipo = [
      { id: 'u1', nombre: 'Ale', apellido: 'Socio', perfil: 'socio', mail: 'ale@momoarq.ar' },
      { id: 'u2', nombre: 'María', apellido: 'Socia', perfil: 'socio', mail: 'maria@momoarq.ar' },
      { id: 'u3', nombre: 'Andy', apellido: 'Arquitecto', perfil: 'arq', mail: 'andy@momoarq.ar' },
      { id: 'u4', nombre: 'Carla', apellido: 'Administración', perfil: 'adm', mail: 'administracion@momoarq.ar' }
    ];

    const clientes = [
      { id: 'c1', razon: 'Ferro Indumentaria SA', cuit: cuit(30, 71264833), cf: false, iva: 'Responsable inscripto', contacto: 'Julieta Massa', tel: '11 5263-4471', mail: 'jmassa@ferroind.com.ar', dir: 'Av. Córdoba 4850, CABA' },
      { id: 'c2', razon: 'Arrieta, Tomás', cuit: cuit(20, 28441902), cf: true, iva: 'Consumidor final', contacto: 'Tomás y Clara Arrieta', tel: '11 3398-1205', mail: 'tarrieta@gmail.com', dir: 'Lavalleja 1180, CABA' },
      { id: 'c3', razon: 'Nórdica Seguros SA', cuit: cuit(30, 70912377), cf: false, iva: 'Responsable inscripto', contacto: 'Paula Etchegaray', tel: '11 4011-7720', mail: 'petchegaray@nordicaseg.com.ar', dir: 'Bouchard 547, CABA' },
      { id: 'c4', razon: 'Grupo Vértice Retail SRL', cuit: cuit(30, 71698021), cf: false, iva: 'Responsable inscripto', contacto: 'Martín Quiroga', tel: '11 6655-0912', mail: 'mquiroga@verticeretail.com', dir: 'Juana Manso 1600, CABA' },
      { id: 'c6', razon: 'Lumbre Cafés SRL', cuit: cuit(30, 71833120), cf: false, iva: 'Responsable inscripto', contacto: 'Federico Ibarra', tel: '11 3911-2040', mail: 'fibarra@lumbre.com.ar', dir: 'Av. Cabildo 2240, CABA' },
      { id: 'c5', razon: 'Casa Luthier SA', cuit: '', cf: false, iva: 'Responsable inscripto', contacto: 'Ramiro Lenz', tel: '11 4776-3381', mail: '', dir: 'Honduras 5650, CABA', aCompletar: true }
    ];

    const proveedores = [
      { id: 'p1', razon: 'Cuadrilla Momo', cuit: '', interno: true, rubros: ['r03', 'r05', 'r17'], contacto: 'Equipo propio', tel: '', cbu: '' },
      { id: 'p2', razon: 'Sistemas en Seco Rivas', cuit: cuit(20, 30552118), rubros: ['r04'], contacto: 'Hernán Rivas', tel: '11 3021-4408', cbu: '0170099220000067890123' },
      { id: 'p3', razon: 'Pinturas y Obras Benítez', cuit: cuit(20, 25877310), rubros: ['r06'], contacto: 'Darío Benítez', tel: '11 6120-7733', cbu: '0720015988000035441209' },
      { id: 'p4', razon: 'Electro Lugano SRL', cuit: cuit(30, 71455260), rubros: ['r09'], contacto: 'Sergio Pellegrini', tel: '11 4601-2290', cbu: '0110123430012345678901' },
      { id: 'p5', razon: 'Carpintería Ordóñez', cuit: cuit(20, 22310675), rubros: ['r07'], contacto: 'Raúl Ordóñez', tel: '11 5730-1184', cbu: '1910001155000100223344' },
      { id: 'p6', razon: 'Vidrios del Plata SA', cuit: cuit(30, 50781144), rubros: ['r10'], contacto: 'Mónica Ferreira', tel: '11 4302-9910', cbu: '0070999030000012345670' },
      { id: 'p7', razon: 'Climatización Austral SRL', cuit: cuit(30, 71122984), rubros: ['r15', 'r16'], contacto: 'Diego Soria', tel: '11 2203-5571', cbu: '0340040108409876543210' },
      { id: 'p8', razon: 'Sanitarios Cabrera', cuit: cuit(20, 31998402), rubros: ['r08', 'r13'], contacto: 'Lucas Cabrera', tel: '11 3355-6621', cbu: '' },
      { id: 'p9', razon: 'Corralón Saavedra SA', cuit: cuit(30, 63345128), rubros: ['r14', 'r11'], contacto: 'Mostrador', tel: '11 4543-0090', cbu: '0150501401000123456789' },
      { id: 'p11', razon: 'Cristalería Norte SRL', cuit: cuit(30, 70455613), rubros: ['r10'], contacto: 'Jorge Albano', tel: '11 4741-8800', cbu: '0170311820000004455661' },
      { id: 'p10', razon: 'Herrería Medina', cuit: '', rubros: ['r10'], contacto: 'Ezequiel Medina', tel: '11 6789-3320', cbu: '', aCompletar: true }
    ];

    /* Ítems: [id, rubro, descripción, unidad, cantidad, costo unitario, venta unitaria, proveedor, moneda] */
    const it = (a) => ({ id: a[0], rubro: a[1], desc: a[2], unidad: a[3], cant: a[4], costo: a[5], venta: a[6], prov: a[7] || '', mon: a[8] || 'ARS' });

    const notas = {
      i104: 'Incluye carpeta $ 170.000, demolición escalera $ 220.000, recuadro columna subsuelo, relleno de canaletas, limpieza y alquiler de puntales.',
      i110: 'Incluye cerradura, bandeja de cobro y zócalo de acero.',
      i207: 'Equipos: suite bajo silueta con conducto, secundaria y escritorio mural, quincho 360, living mural.'
    };
    const cotiz = {
      i113: [{ prov: 'p6', monto: 6200000, nota: 'Templado 10 mm, 30 días' }, { prov: 'p11', monto: 6650000, nota: 'Laminado 5+5' }, { prov: 'p10', monto: 7100000, nota: 'Con marco de hierro' }],
      i307: [{ prov: 'p6', monto: 9800000, nota: 'Perfilería negra, 45 días' }, { prov: 'p11', monto: 9350000, nota: 'Perfilería aluminio natural' }, { prov: 'p10', monto: 10400000, nota: 'Marco de hierro, 60 días' }]
    };
    const presupuestos = [
      { id: 'pr1', obra: 'o1', version: 1, estado: 'aprobado', fecha: dia(-88), aprobado: { por: 'u1', ts: ts(-82) }, items: [
        ['i101', 'r01', 'Visita a obra y relevamiento', 'gl', 1, 280000, 380000, 'p1'],
        ['i102', 'r02', 'Aviso de obra y programa de seguridad e higiene', 'gl', 1, 420000, 560000, 'p1'],
        ['i103', 'r03', 'Demolición de tabiques existentes', 'm2', 85, 9800, 13900, 'p1'],
        ['i104', 'r03', 'Retiro de solado y carpeta', 'm2', 140, 7200, 10200, 'p1'],
        ['i105', 'r04', 'Cielorraso suspendido de placa', 'm2', 120, 24500, 33800, 'p2'],
        ['i106', 'r04', 'Tabiques de placa con aislación', 'm2', 45, 31200, 43500, 'p2'],
        ['i107', 'r05', 'Carpeta niveladora en salón de ventas', 'm2', 140, 14800, 20500, 'p1'],
        ['i108', 'r06', 'Pintura de cielorrasos y paredes', 'm2', 380, 6900, 9600, 'p3'],
        ['i109', 'r07', 'Probadores en MDF laqueado', 'u', 3, 1650000, 2290000, 'p5'],
        ['i110', 'r07', 'Mostrador de caja con guardado', 'u', 1, 2380000, 3300000, 'p5'],
        ['i111', 'r09', 'Tablero eléctrico seccional', 'u', 1, 1450000, 1980000, 'p4'],
        ['i112', 'r09', 'Bocas de iluminación y tomas', 'u', 46, 68000, 94000, 'p4'],
        ['i113', 'r10', 'Frente vidriado templado con puerta', 'gl', 1, 6200000, 8450000, 'p6'],
        ['i114', 'r17', 'Limpieza periódica y final de obra', 'gl', 1, 520000, 720000, 'p1'],
        ['i115', 'r17', 'Seguros de accidentes personales', 'gl', 1, 310000, 310000, 'p1']
      ].map(it) },
      { id: 'pr2', obra: 'o2', version: 1, estado: 'aprobado', fecha: dia(-55), aprobado: { por: 'u2', ts: ts(-48) }, items: [
        ['i201', 'r03', 'Demolición de tabiques y apertura de vanos', 'm2', 60, 10400, 14600, 'p1'],
        ['i202', 'r05', 'Revoque y carpeta planta alta', 'm2', 95, 16800, 23200, 'p1'],
        ['i203', 'r05', 'Colocación de pisos planta baja', 'm2', 110, 12900, 17800, 'p1'],
        ['i204', 'r06', 'Pintura general interior', 'm2', 420, 6700, 9300, 'p3'],
        ['i205', 'r08', 'Instalación cloacal y agua baño suite', 'gl', 1, 2650000, 3600000, 'p8'],
        ['i206', 'r09', 'Recableado y nuevo tablero', 'gl', 1, 3100000, 4250000, 'p4'],
        ['i207', 'r15', 'Sistema VRV integral (5 unidades)', 'gl', 1, 11800, 14200, 'p7', 'USD'],
        ['i208', 'r16', 'Caldera dual y radiadores', 'gl', 1, 4300, 5250, 'p7', 'USD'],
        ['i209', 'r17', 'Ayuda de gremios', 'gl', 1, 640000, 880000, 'p1']
      ].map(it) },
      { id: 'pr3', obra: 'o3', version: 1, estado: 'borrador', fecha: dia(-6), items: [
        ['i301', 'r01', 'Relevamiento y armado de cómputos', 'gl', 1, 350000, 480000, 'p1'],
        ['i302', 'r03', 'Desarme de puestos y divisiones existentes', 'm2', 310, 6100, 8700, 'p1'],
        ['i303', 'r04', 'Cielorraso acústico', 'm2', 480, 27800, 38900, 'p2'],
        ['i304', 'r04', 'Salas de reunión en placa con doble aislación', 'm2', 96, 36500, 50900, 'p2'],
        ['i305', 'r06', 'Pintura general', 'm2', 900, 6600, 9200, 'p3'],
        ['i306', 'r09', 'Iluminación LED y puestos de trabajo', 'u', 120, 72000, 99500, 'p4'],
        ['i307', 'r10', 'Mamparas vidriadas salas', 'gl', 1, 9800000, 13300000, 'p6'],
        ['i308', 'r15', 'Adecuación de conductos y rejillas', 'gl', 1, 6400, 8100, 'p7', 'USD']
      ].map(it) },
      { id: 'pr5', obra: 'o5', version: 1, estado: 'rechazado', fecha: dia(-35), rechazado: { por: 'u2', ts: ts(-20), motivo: 'El cliente eligió otra propuesta' }, items: [
        ['i501', 'r03', 'Demolición y retiro de mobiliario existente', 'gl', 1, 900000, 1250000, 'p1'],
        ['i502', 'r07', 'Barra de café en madera y acero', 'u', 1, 5200000, 7100000, 'p5'],
        ['i503', 'r09', 'Iluminación y tomas', 'gl', 1, 2100000, 2850000, 'p4']
      ].map(it) },
      { id: 'pr4', obra: 'o4', version: 1, estado: 'aprobado', fecha: dia(-150), aprobado: { por: 'u1', ts: ts(-146) }, items: [
        ['i401', 'r07', 'Estructura de stand y módulos de exhibición', 'gl', 1, 7400000, 9900000, 'p5'],
        ['i402', 'r09', 'Iluminación y conexión eléctrica', 'gl', 1, 1850000, 2500000, 'p4'],
        ['i403', 'r17', 'Montaje, desmontaje y fletes', 'gl', 1, 1600000, 2200000, 'p1']
      ].map(it) }
    ];

    presupuestos.forEach((p) => p.items.forEach((i) => { i.iibb = 0; i.interno = i.costo ? Math.round((i.venta / i.costo - 1) * 10000) / 100 : 0; if (notas[i.id]) i.nota = notas[i.id]; if (cotiz[i.id]) i.cotizaciones = cotiz[i.id]; }));

    const obras = [
      { id: 'o1', foto: 'https://freight.cargo.site/w/1200/q/75/i/3926d9ae4138ebf8f5b9852a5c731d74b86f8a50676b5f8f424340cd228ed3e1/Owoko7-copia.jpg', num: 412, nombre: 'Ferro · Local Palermo Soho', cliente: 'c1', dir: 'Gurruchaga 1720, CABA', estado: 'curso', inicio: dia(-80), fin: dia(25), resp: 'u3', honorarios: 12, splitMO: 40, anticipo: { pct: 30, fecha: dia(-81), comp: 'A' } },
      { id: 'o2', foto: 'https://freight.cargo.site/w/1200/q/75/i/b43d5bcc59db66093dfde715d6ba34624140051e0672fe64e1601a12035657e5/TB-Piso-24-.jpg', num: 415, nombre: 'Casa Arrieta · Reforma integral', cliente: 'c2', dir: 'Lavalleja 1180, CABA', estado: 'curso', inicio: dia(-45), fin: dia(70), resp: 'u3', honorarios: 12, splitMO: 40, anticipo: { pct: 25, fecha: dia(-47), comp: 'B' } },
      { id: 'o3', foto: 'https://freight.cargo.site/w/1200/q/75/i/550d7d6aa31322879b04544fc120b9bfab8d04b0c9d06bf08722e2827320c776/Oficina3Web.jpg', num: 418, nombre: 'Nórdica · Oficinas piso 7', cliente: 'c3', dir: 'Bouchard 547, CABA', estado: 'presupuesto', inicio: '', fin: '', resp: 'u3', honorarios: 12, splitMO: 40, anticipo: { pct: 30, fecha: '', comp: '' } },
      { id: 'o5', foto: 'https://freight.cargo.site/w/1200/q/75/i/3a67bdd4ea1c66d81c182881b8ef443df4d061263197bde7cf28073f7ac8aec0/3.jpg', num: 410, nombre: 'Lumbre · Café Belgrano', cliente: 'c6', dir: 'Av. Cabildo 2240, CABA', estado: 'archivada', motivo: 'El cliente eligió otra propuesta', inicio: '', fin: '', resp: 'u3', honorarios: 12, splitMO: 40, anticipo: { pct: 30, fecha: '', comp: '' } },
      { id: 'o4', foto: 'https://freight.cargo.site/w/1200/q/75/i/2e8bc68e19aefe45af1c2a64b4c3313e13eb4f343e717dac196d68b9a7fb89df/0.jpg', num: 402, nombre: 'Vértice · Stand Expo Retail', cliente: 'c4', dir: 'La Rural, Palermo', estado: 'terminada', inicio: dia(-140), fin: dia(-118), resp: 'u3', honorarios: 10, splitMO: 40, anticipo: { pct: 50, fecha: dia(-144), comp: 'A' } }
    ];

    const indicesCAC = [
      { mes: '2026-03', mo: 16205.2, mat: 22204.2 }, { mes: '2026-04', mo: 16611.4, mat: 22731.8 },
      { mes: '2026-05', mo: 16992.7, mat: 23210.5 }, { mes: '2026-06', mo: 17418.3, mat: 23702.9 },
      { mes: '2026-07', mo: 17889.6, mat: 24247.1 }, { mes: '2026-08', mo: 18318.2, mat: 24733.6 },
      { mes: '2026-09', mo: 18757.9, mat: 25276.4 }
    ];

    const certificados = [
      { id: 'ce1', obra: 'o1', num: 1, fecha: dia(-48), mesCAC: '2026-08', comp: 'A',
        avances: { i101: 100, i102: 100, i103: 100, i104: 100, i105: 40, i106: 50, i107: 60, i112: 20, i114: 30, i115: 50 },
        ed: [{ id: 'ed1', tipo: 'demasia', desc: 'Refuerzo de estructura para cartel de fachada', cant: 1, mo: 500000, mat: 750000, precio: 1250000, costo: 900000, prov: 'p1', mon: 'ARS' }],
        creado: { por: 'u4', ts: ts(-48, 16) } },
      { id: 'ce2', obra: 'o1', num: 2, fecha: dia(-16), mesCAC: '2026-09', comp: 'A',
        avances: { i105: 60, i106: 50, i107: 40, i108: 70, i109: 60, i111: 100, i112: 60, i113: 50, i114: 30, i115: 50 },
        ed: [{ id: 'ed2', tipo: 'economia', desc: 'Se mantiene el solado existente en depósito', cant: 22, mo: 4100, mat: 6100, precio: 10200, costo: 7200, prov: 'p1', mon: 'ARS' }],
        creado: { por: 'u4', ts: ts(-16, 15) } },
      { id: 'ce3', obra: 'o2', num: 1, fecha: dia(-11), mesCAC: '2026-09', comp: 'sin',
        avances: { i201: 100, i202: 50, i204: 20, i205: 40, i206: 50, i207: 30, i209: 30 },
        ed: [{ id: 'ed3', tipo: 'demasia', desc: 'Vestidor suite (pedido nuevo del cliente)', cant: 1, mo: 1500000, mat: 2400000, precio: 3900000, costo: 2850000, prov: 'p5', mon: 'ARS' }],
        creado: { por: 'u1', ts: ts(-11, 11) } },
      { id: 'ce4', obra: 'o4', num: 1, fecha: dia(-125), mesCAC: '2026-05', comp: 'A',
        avances: { i401: 60, i402: 50, i403: 40 }, ed: [], creado: { por: 'u4', ts: ts(-125, 12) } },
      { id: 'ce5', obra: 'o4', num: 2, fecha: dia(-117), mesCAC: '2026-06', comp: 'A',
        avances: { i401: 40, i402: 50, i403: 60 }, ed: [], creado: { por: 'u4', ts: ts(-117, 12) } }
    ];

    const cheques = [
      { id: 'ch1', tipo: 'tercero', numero: '45021877', banco: 'Banco Galicia', librador: 'Ferro Indumentaria SA', importe: 6500000, emision: dia(-44), pago: dia(-14), estado: 'depositado', deposito: dia(-13) },
      { id: 'ch2', tipo: 'tercero', numero: '10477302', banco: 'Banco Santander', librador: 'Ferro Indumentaria SA', importe: 8000000, emision: dia(-9), pago: dia(3), estado: 'cartera' },
      { id: 'ch3', tipo: 'tercero', numero: '33910045', banco: 'Banco Macro', librador: 'Ferro Indumentaria SA', importe: 5200000, emision: dia(-9), pago: dia(33), estado: 'cartera' },
      { id: 'ch4', tipo: 'propio', numero: '00012488', banco: 'Banco Galicia', librador: 'Momo Arquitectura', importe: 3400000, emision: dia(-6), pago: dia(5), estado: 'emitido' },
      { id: 'ch5', tipo: 'tercero', numero: '78120394', banco: 'Banco Nación', librador: 'Grupo Vértice Retail SRL', importe: 4100000, emision: dia(-120), pago: dia(-105), estado: 'endosado' }
    ];

    const cobros = [
      { id: 'cb1', obra: 'o1', cargo: 'ant-o1', fecha: dia(-79), importe: 0, auto: 'ant', mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', creado: { por: 'u4', ts: ts(-79) } },
      { id: 'cb2', obra: 'o1', cargo: 'ce1', fecha: dia(-44), importe: 6500000, mon: 'ARS', medio: 'cheque', cheque: 'ch1', creado: { por: 'u4', ts: ts(-44) } },
      { id: 'cb3', obra: 'o1', cargo: 'ce1', fecha: dia(-40), importe: 0, auto: 'saldo', mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', creado: { por: 'u4', ts: ts(-40) } },
      { id: 'cb4', obra: 'o1', cargo: 'ce2', fecha: dia(-9), importe: 8000000, mon: 'ARS', medio: 'cheque', cheque: 'ch2', creado: { por: 'u4', ts: ts(-9) } },
      { id: 'cb5', obra: 'o1', cargo: 'ce2', fecha: dia(-9), importe: 5200000, mon: 'ARS', medio: 'cheque', cheque: 'ch3', creado: { por: 'u4', ts: ts(-9, 11) } },
      { id: 'cb6', obra: 'o2', cargo: 'ant-o2', fecha: dia(-46), importe: 0, auto: 'ant', mon: 'ARS', medio: 'transferencia', banco: 'Banco Santander', creado: { por: 'u1', ts: ts(-46) } },
      { id: 'cb7', obra: 'o2', cargo: 'ant-o2', fecha: dia(-46), importe: 0, auto: 'ant', mon: 'USD', medio: 'efectivo', creado: { por: 'u1', ts: ts(-46, 12) } },
      { id: 'cb8', obra: 'o2', cargo: 'ce3', fecha: dia(-6), importe: 0, auto: 'saldo-usd', mon: 'USD', medio: 'efectivo', creado: { por: 'u1', ts: ts(-6) } },
      { id: 'cb9', obra: 'o4', cargo: 'ant-o4', fecha: dia(-143), importe: 4100000, mon: 'ARS', medio: 'cheque', cheque: 'ch5', creado: { por: 'u4', ts: ts(-143) } },
      { id: 'cb12', obra: 'o4', cargo: 'ant-o4', fecha: dia(-142), importe: 0, auto: 'saldo', mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', creado: { por: 'u4', ts: ts(-142) } },
      { id: 'cb10', obra: 'o4', cargo: 'ce4', fecha: dia(-110), importe: 0, auto: 'saldo', mon: 'ARS', medio: 'transferencia', banco: 'Banco Santander', creado: { por: 'u4', ts: ts(-110) } },
      { id: 'cb11', obra: 'o4', cargo: 'ce5', fecha: dia(-100), importe: 0, auto: 'saldo', mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', creado: { por: 'u4', ts: ts(-100) } }
    ];

    const pagos = [
      { id: 'pg1', obra: 'o1', prov: 'p2', fecha: dia(-42), importe: 2400000, mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', detalle: 'Anticipo cielorrasos', creado: { por: 'u4', ts: ts(-42) } },
      { id: 'pg2', obra: 'o1', prov: 'p1', fecha: dia(-40), importe: 3100000, mon: 'ARS', medio: 'efectivo', detalle: 'Quincena cuadrilla', creado: { por: 'u4', ts: ts(-40) } },
      { id: 'pg3', obra: 'o1', prov: 'p6', fecha: dia(-30), importe: 3100000, mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', detalle: 'Anticipo 50% frente vidriado', creado: { por: 'u4', ts: ts(-30) } },
      { id: 'pg4', obra: 'o1', prov: 'p4', fecha: dia(-12), importe: 1900000, mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', detalle: 'Tablero y primeras bocas', creado: { por: 'u4', ts: ts(-12) } },
      { id: 'pg5', obra: 'o1', prov: 'p5', fecha: dia(-6), importe: 3400000, mon: 'ARS', medio: 'cheque-propio', cheque: 'ch4', detalle: 'Probadores, avance', creado: { por: 'u1', ts: ts(-6) } },
      { id: 'pg6', obra: 'o2', prov: 'p1', fecha: dia(-20), importe: 1450000, mon: 'ARS', medio: 'efectivo', detalle: 'Demolición', creado: { por: 'u1', ts: ts(-20) } },
      { id: 'pg7', obra: 'o2', prov: 'p7', fecha: dia(-15), importe: 4000, mon: 'USD', medio: 'efectivo', detalle: 'Anticipo equipos VRV', creado: { por: 'u1', ts: ts(-15) } },
      { id: 'pg8', obra: 'o4', prov: 'p5', fecha: dia(-105), importe: 4100000, mon: 'ARS', medio: 'cheque-tercero', cheque: 'ch5', detalle: 'Endoso cheque Vértice', creado: { por: 'u4', ts: ts(-105) } },
      { id: 'pg9', obra: 'o4', prov: 'p5', fecha: dia(-100), importe: 3300000, mon: 'ARS', medio: 'transferencia', banco: 'Banco Santander', detalle: 'Saldo stand', creado: { por: 'u4', ts: ts(-100) } },
      { id: 'pg10', obra: 'o4', prov: 'p4', fecha: dia(-100), importe: 1850000, mon: 'ARS', medio: 'transferencia', banco: 'Banco Galicia', detalle: 'Iluminación', creado: { por: 'u4', ts: ts(-100) } },
      { id: 'pg11', obra: 'o4', prov: 'p1', fecha: dia(-100), importe: 1600000, mon: 'ARS', medio: 'efectivo', detalle: 'Montaje y fletes', creado: { por: 'u4', ts: ts(-100) } }
    ];

    const caja = [
      { id: 'cc1', obra: 'o1', fecha: dia(-60), tipo: 'reposicion', desc: 'Fondo inicial caja de obra', importe: 400000, resp: 'u3', creado: { por: 'u4', ts: ts(-60) } },
      { id: 'cc2', obra: 'o1', fecha: dia(-52), tipo: 'gasto', desc: 'Fletes de escombros', importe: 96000, resp: 'u3', creado: { por: 'u3', ts: ts(-52) } },
      { id: 'cc3', obra: 'o1', fecha: dia(-31), tipo: 'gasto', desc: 'Ferretería: tarugos, tornillería, discos', importe: 58300, resp: 'u3', creado: { por: 'u3', ts: ts(-31) } },
      { id: 'cc4', obra: 'o1', fecha: dia(-8), tipo: 'gasto', desc: 'Volquete', importe: 145000, resp: 'u3', creado: { por: 'u3', ts: ts(-8) } },
      { id: 'cc5', obra: 'o2', fecha: dia(-40), tipo: 'reposicion', desc: 'Fondo inicial caja de obra', importe: 300000, resp: 'u3', creado: { por: 'u4', ts: ts(-40) } },
      { id: 'cc6', obra: 'o2', fecha: dia(-22), tipo: 'gasto', desc: 'Protección de pisos y cinta', importe: 41200, resp: 'u3', creado: { por: 'u3', ts: ts(-22) } }
    ];

    const gastos = [
      { id: 'g1', fecha: dia(-25), rubro: 'Alquiler', desc: 'Alquiler estudio Gutenberg', importe: 1450000, medio: 'transferencia', creado: { por: 'u4', ts: ts(-25) } },
      { id: 'g2', fecha: dia(-20), rubro: 'Servicios', desc: 'Internet y telefonía', importe: 86500, medio: 'transferencia', creado: { por: 'u4', ts: ts(-20) } },
      { id: 'g3', fecha: dia(-14), rubro: 'Software', desc: 'Licencias de diseño', importe: 312000, medio: 'tarjeta', creado: { por: 'u4', ts: ts(-14) } },
      { id: 'g4', fecha: dia(-3), rubro: 'Movilidad', desc: 'Combustible y peajes', importe: 74300, medio: 'efectivo', creado: { por: 'u4', ts: ts(-3) } }
    ];

    const tareas = [
      { id: 't1', obra: 'o1', titulo: 'Pedir planos de fachada aprobados por la marca', resp: 'u3', vence: dia(-2), col: 'curso', creado: { por: 'u2', ts: ts(-10) } },
      { id: 't2', obra: 'o1', titulo: 'Comparar 3 cotizaciones de iluminación de fachada', resp: 'u3', vence: dia(4), col: 'pendiente', creado: { por: 'u2', ts: ts(-7) } },
      { id: 't3', obra: 'o1', titulo: 'Certificado 3: relevar avance con fotos', resp: 'u3', vence: dia(6), col: 'pendiente', creado: { por: 'u1', ts: ts(-3) } },
      { id: 't4', obra: 'o1', titulo: 'Depositar cheque Santander de Ferro', resp: 'u4', vence: dia(3), col: 'pendiente', creado: { por: 'u4', ts: ts(-9) } },
      { id: 't5', obra: 'o2', titulo: 'Confirmar con Tomás el modelo de grifería', resp: 'u3', vence: dia(1), col: 'revision', creado: { por: 'u2', ts: ts(-5) } },
      { id: 't6', obra: 'o2', titulo: 'Pedir presupuesto de vestidor a Ordóñez', resp: 'u3', vence: dia(-12), col: 'hecha', creado: { por: 'u2', ts: ts(-18) } },
      { id: 't7', obra: 'o3', titulo: 'Cerrar cómputo de mamparas con Vidrios del Plata', resp: 'u3', vence: dia(2), col: 'curso', creado: { por: 'u1', ts: ts(-5) } },
      { id: 't8', obra: 'o3', titulo: 'Enviar presupuesto a Paula (Nórdica)', resp: 'u1', vence: dia(5), col: 'pendiente', creado: { por: 'u1', ts: ts(-4) } },
      { id: 't9', obra: '', titulo: 'Renovar seguro de accidentes personales del equipo', resp: 'u4', vence: dia(9), col: 'pendiente', creado: { por: 'u2', ts: ts(-2) } },
      { id: 't10', obra: 'o4', titulo: 'Archivar fotos finales del stand para portfolio', resp: 'u3', vence: dia(-30), col: 'hecha', creado: { por: 'u2', ts: ts(-40) } }
    ];

    const documentos = [
      { id: 'd1', obra: 'o1', nombre: 'Planta de arquitectura v4.pdf', tipo: 'Plano', fecha: dia(-70), por: 'u3' },
      { id: 'd2', obra: 'o1', nombre: 'Fachada render aprobado.jpg', tipo: 'Imagen', fecha: dia(-66), por: 'u3' },
      { id: 'd3', obra: 'o1', nombre: 'Aviso de obra GCBA.pdf', tipo: 'Trámite', fecha: dia(-78), por: 'u4' },
      { id: 'd4', obra: 'o1', nombre: 'Avance semana 9 (12 fotos)', tipo: 'Fotos de obra', fecha: dia(-5), por: 'u3' },
      { id: 'd5', obra: 'o2', nombre: 'Relevamiento planta alta.dwg', tipo: 'Plano', fecha: dia(-50), por: 'u3' },
      { id: 'd6', obra: 'o2', nombre: 'Selección de revestimientos baño suite.pdf', tipo: 'Documento', fecha: dia(-21), por: 'u3' }
    ];

    const auditoria = [
      { ts: ts(-1, 18), por: 'u3', txt: 'Movió "Pedir planos de fachada aprobados por la marca" a En curso', obra: 'o1' },
      { ts: ts(-3, 9), por: 'u1', txt: 'Creó la tarea "Certificado 3: relevar avance con fotos"', obra: 'o1' },
      { ts: ts(-6, 12), por: 'u1', txt: 'Registró un pago a Carpintería Ordóñez por $ 3.400.000 con cheque propio', obra: 'o1' },
      { ts: ts(-6, 10), por: 'u1', txt: 'Registró un cobro de USD de Arrieta, Tomás', obra: 'o2' },
      { ts: ts(-6, 9), por: 'u1', txt: 'Armó el presupuesto de Nórdica · Oficinas piso 7 (borrador)', obra: 'o3' },
      { ts: ts(-8, 15), por: 'u3', txt: 'Cargó un gasto de caja chica: Volquete', obra: 'o1' }
    ];

    /* facturas de proveedores ya cargadas: [id, prov, obra, tipo, numero, fecha, neto, alícuota, percepciones, descripción] */
    const fc = (a) => { const iva = a[3] === 'C' ? 0 : Math.round(a[6] * a[7]) / 100; return { id: a[0], prov: a[1], obra: a[2], tipo: a[3], numero: a[4], fecha: a[5], neto: a[6], alic: a[3] === 'C' ? 0 : a[7], iva, perc: a[8] || 0, total: Math.round((a[6] + iva + (a[8] || 0)) * 100) / 100, desc: a[9], origen: 'manual', creado: { por: 'u4', ts: ts(-1) } }; };
    const facturasCompra = [
      ['fc1', 'p2', 'o1', 'A', '0002-00000451', dia(-41), 1983471.07, 21, 0, 'Anticipo cielorrasos y tabiques'],
      ['fc2', 'p6', 'o1', 'A', '0003-00002210', dia(-31), 2561983.47, 21, 0, 'Anticipo 50% frente vidriado'],
      ['fc3', 'p4', 'o1', 'A', '0001-00000987', dia(-13), 2000000, 21, 0, 'Tablero seccional y primeras bocas'],
      ['fc4', 'p5', 'o1', 'A', '0004-00000112', dia(-7), 2809917.36, 21, 0, 'Probadores, avance 60%'],
      ['fc5', 'p9', 'o1', 'A', '0005-00012811', dia(-25), 620000, 21, 18600, 'Placas, perfiles y masilla'],
      ['fc6', 'p8', 'o2', 'C', '0002-00000081', dia(-18), 950000, 0, 0, 'Instalación cloacal baño suite, avance']
    ].map(fc);
    /* comprobantes que ya figuran en ARCA (Mis Comprobantes) y todavía no se cargaron */
    const arcaRecibidos = [
      { id: 'ar1', prov: 'p9', tipo: 'A', numero: '0005-00012876', fecha: dia(-4), neto: 845000, alic: 21, perc: 25350, desc: 'Porcelanato y pegamento', sugerida: 'o1' },
      { id: 'ar2', prov: 'p3', tipo: 'A', numero: '0001-00000233', fecha: dia(-3), neto: 1500000, alic: 21, perc: 0, desc: 'Pintura de cielorrasos y paredes, avance', sugerida: 'o1' },
      { id: 'ar3', prov: 'p7', tipo: 'A', numero: '0006-00000412', fecha: dia(-2), neto: 2300000, alic: 21, perc: 0, desc: 'Equipos VRV, primera entrega', sugerida: 'o2' },
      { id: 'ar4', prov: 'p6', tipo: 'A', numero: '0003-00002210', fecha: dia(-31), neto: 2561983.47, alic: 21, perc: 0, desc: 'Anticipo 50% frente vidriado', sugerida: 'o1' }
    ].map((x) => Object.assign(x, { iva: Math.round(x.neto * x.alic) / 100, total: Math.round((x.neto + Math.round(x.neto * x.alic) / 100 + x.perc) * 100) / 100 }));
    const padron = {};
    padron[cuit(30, 71522418)] = { razon: 'Aberturas Delta SRL', iva: 'Responsable inscripto', dir: 'Av. San Martín 4120, Florida' };
    padron[cuit(20, 33812774)] = { razon: 'Giménez, Lucas Martín', iva: 'Monotributista', dir: 'Moreno 2210, Ramos Mejía' };
    const cuentas = [
      { id: 'galicia', nombre: 'Banco Galicia', tipo: 'banco', numero: 'CC $ 4021-8 033-5', inicial: 2150000 },
      { id: 'santander', nombre: 'Banco Santander', tipo: 'banco', numero: 'CC $ 112-009871/4', inicial: 640000 },
      { id: 'efectivo', nombre: 'Efectivo', tipo: 'caja', numero: 'Caja fuerte del estudio', inicial: 9300000 }
    ];

    return {
      version: 1,
      contadores: { obra: 418, id: 1000 },
      config: { honorarios: 12, splitMO: 40, iva: 21, tcRef: 1485 },
      rubros, unidades: ['gl', 'm2', 'ml', 'm3', 'u', 'kg'],
      bancos: ['Banco Galicia', 'Banco Santander', 'Banco Macro', 'Banco Nación', 'Banco Provincia', 'BBVA', 'Banco Credicoop', 'Banco Patagonia', 'Banco Supervielle', 'Banco ICBC'],
      equipo, clientes, proveedores, obras, presupuestos, certificados, indicesCAC,
      cobros, pagos, cheques, caja, gastos, tareas, documentos, auditoria,
      facturasCompra, arcaRecibidos, padron, cuentas, notasCredito: []
    };
  };
})();

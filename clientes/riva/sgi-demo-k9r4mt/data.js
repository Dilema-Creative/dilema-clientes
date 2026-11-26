/* ============================================================
   Riva · SGI — Base de datos de EJEMPLO (Argos · Dilema).
   TODO inventado: ni obras, ni personas, ni proveedores reales.
   Los códigos y nombres de documentos siguen la estructura ISO
   del sistema (procedimientos / formularios / instructivos / anexos).
   ============================================================ */
window.SEED_VERSION = 2;
window.HOY = '2026-11-26';

window.SEED = {
  empresa: {
    nombre: 'Riva',
    razon: 'Riva · Empresa Constructora (datos de ejemplo)',
    cuit: '30-71903846-5',
    alcance: 'Construcción de obras civiles y obras de arquitectura e ingeniería. Actividades desarrolladas en la República Argentina.',
    politicaFecha: '2019-06-26',
    manualRev: 'Rev. 06.5',
    nube: 'OwnCloud · Gestión de Calidad Integrada'
  },

  certificados: [
    { norma:'ISO 9001:2015',  cls:'iso9',  desc:'Gestión de la Calidad',            nro:'IRAM-RG-1428', emision:'2019-07-10', vence:'2027-07-09', org:'IRAM' },
    { norma:'ISO 14001:2015', cls:'iso14', desc:'Gestión Ambiental',                nro:'IRAM-RGA-0391', emision:'2021-09-02', vence:'2027-09-01', org:'IRAM' },
    { norma:'ISO 45001:2018', cls:'iso45', desc:'Seguridad y Salud en el Trabajo',  nro:'IRAM-RGS-0277', emision:'2021-09-02', vence:'2027-09-01', org:'IRAM' },
  ],
  proximaAuditoriaExterna: { tipo:'Mantenimiento IRAM (3 normas)', fecha:'2027-02-18', dias:null },

  // sc = sigla; iso = norma dominante para color
  sectores: [
    { sc:'GC', nombre:'Gestión de Calidad' },
    { sc:'DI', nombre:'Dirección' },
    { sc:'AD', nombre:'Administración' },
    { sc:'CO', nombre:'Compras' },
    { sc:'MN', nombre:'Mantenimiento' },
    { sc:'LI', nombre:'Licitaciones' },
    { sc:'PE', nombre:'Personal' },
    { sc:'CN', nombre:'Construcciones' },
    { sc:'RL', nombre:'Legales' },
    { sc:'GS', nombre:'Seguridad y Salud en el Trabajo' },
    { sc:'GA', nombre:'Gestión Ambiental' },
  ],

  // Documentos del sistema (estructura real del SGI, datos de control inventados)
  documentos: [
    // GC
    { cod:'GC-01', nombre:'Información documentada', tipo:'Procedimiento', sec:'GC', rev:'06', estado:'Vigente', emision:'2024-03-12', prox:'2027-03-12', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-01-F1', nombre:'Listado de documentos del sistema', tipo:'Formulario', sec:'GC', rev:'09', estado:'Vigente', emision:'2026-10-02', prox:'2027-10-02', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-01-F3', nombre:'Distribución de documentos', tipo:'Formulario', sec:'GC', rev:'04', estado:'Vigente', emision:'2026-08-20', prox:'2027-08-20', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-02', nombre:'Auditoría interna', tipo:'Procedimiento', sec:'GC', rev:'05', estado:'Vigente', emision:'2025-02-10', prox:'2028-02-10', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-02-F1', nombre:'Cronograma de auditorías internas', tipo:'Formulario', sec:'GC', rev:'03', estado:'Vigente', emision:'2026-01-15', prox:'2027-01-15', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-02-F2', nombre:'Informe de auditoría', tipo:'Formulario', sec:'GC', rev:'03', estado:'Vigente', emision:'2025-02-10', prox:'2028-02-10', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-03', nombre:'No conformes y acciones correctivas', tipo:'Procedimiento', sec:'GC', rev:'07', estado:'Vigente', emision:'2025-06-04', prox:'2028-06-04', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-03-F1', nombre:'Formulario Único de Acciones (FUA)', tipo:'Formulario', sec:'GC', rev:'05', estado:'Vigente', emision:'2025-06-04', prox:'2028-06-04', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-03-F2', nombre:'Seguimiento de NC y AC', tipo:'Formulario', sec:'GC', rev:'04', estado:'Vigente', emision:'2025-06-04', prox:'2028-06-04', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-04', nombre:'Satisfacción de clientes', tipo:'Procedimiento', sec:'GC', rev:'04', estado:'Vigente', emision:'2024-11-11', prox:'2027-11-11', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-04-F1', nombre:'Encuesta de satisfacción', tipo:'Formulario', sec:'GC', rev:'03', estado:'Vigente', emision:'2024-11-11', prox:'2027-11-11', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-04-F2', nombre:'Planilla de recolección de datos', tipo:'Formulario', sec:'GC', rev:'02', estado:'En revisión', emision:'2023-05-19', prox:'2026-10-20', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-05', nombre:'Mejora', tipo:'Procedimiento', sec:'GC', rev:'03', estado:'Vigente', emision:'2025-01-20', prox:'2028-01-20', resp:'Resp. Gestión de Calidad' },
    { cod:'GC-05-F3', nombre:'Seguimientos — Producción', tipo:'Formulario', sec:'GC', rev:'05', estado:'Vigente', emision:'2026-07-01', prox:'2027-07-01', resp:'Resp. Gestión de Calidad' },
    // DI
    { cod:'DI-01', nombre:'Revisión por la Dirección', tipo:'Procedimiento', sec:'DI', rev:'05', estado:'Vigente', emision:'2025-03-03', prox:'2028-03-03', resp:'Dirección' },
    { cod:'DI-01-F1', nombre:'Revisión por la Dirección', tipo:'Formulario', sec:'DI', rev:'04', estado:'Vigente', emision:'2026-03-20', prox:'2027-03-20', resp:'Dirección' },
    { cod:'DI-02', nombre:'Planeamiento estratégico', tipo:'Procedimiento', sec:'DI', rev:'03', estado:'Vigente', emision:'2024-02-14', prox:'2027-02-14', resp:'Dirección' },
    { cod:'DI-02-F1', nombre:'Análisis FODA', tipo:'Formulario', sec:'DI', rev:'03', estado:'Vigente', emision:'2026-02-10', prox:'2027-02-10', resp:'Dirección' },
    { cod:'DI-02-F5', nombre:'Matriz de riesgos FODA', tipo:'Formulario', sec:'DI', rev:'02', estado:'Vigente', emision:'2026-02-10', prox:'2027-02-10', resp:'Dirección' },
    { cod:'DI-04', nombre:'Mapa de procesos integrados', tipo:'Procedimiento', sec:'DI', rev:'02', estado:'Vigente', emision:'2024-02-14', prox:'2027-02-14', resp:'Dirección' },
    // CO
    { cod:'CO-01', nombre:'Compras y contrataciones', tipo:'Procedimiento', sec:'CO', rev:'08', estado:'Vigente', emision:'2026-04-22', prox:'2027-04-22', resp:'Resp. Compras' },
    { cod:'CO-01-F1', nombre:'Pedido de obra', tipo:'Formulario', sec:'CO', rev:'05', estado:'Vigente', emision:'2026-04-22', prox:'2027-04-22', resp:'Resp. Compras' },
    { cod:'CO-01-F3', nombre:'Comparativa V1', tipo:'Formulario', sec:'CO', rev:'04', estado:'Vigente', emision:'2026-04-22', prox:'2027-04-22', resp:'Resp. Compras' },
    { cod:'CO-01-F4', nombre:'Orden de compra básica', tipo:'Formulario', sec:'CO', rev:'06', estado:'Vigente', emision:'2026-04-22', prox:'2027-04-22', resp:'Resp. Compras' },
    { cod:'CO-01-A3', nombre:'Condiciones generales de Orden de Compra', tipo:'Anexo', sec:'CO', rev:'03', estado:'Vigente', emision:'2025-09-10', prox:'2028-09-10', resp:'Legales' },
    { cod:'CO-02', nombre:'Evaluación de proveedores', tipo:'Procedimiento', sec:'CO', rev:'04', estado:'Vigente', emision:'2025-07-30', prox:'2028-07-30', resp:'Resp. Compras' },
    { cod:'CO-02-F1', nombre:'Evaluación de proveedores', tipo:'Formulario', sec:'CO', rev:'04', estado:'Vigente', emision:'2025-07-30', prox:'2028-07-30', resp:'Resp. Compras' },
    // MN
    { cod:'MN-01', nombre:'Mantenimiento de equipos', tipo:'Procedimiento', sec:'MN', rev:'05', estado:'Vigente', emision:'2025-05-12', prox:'2028-05-12', resp:'Resp. Mantenimiento' },
    { cod:'MN-01-F2', nombre:'Orden de mantenimiento y reparación', tipo:'Formulario', sec:'MN', rev:'04', estado:'Vigente', emision:'2026-05-12', prox:'2027-05-12', resp:'Resp. Mantenimiento' },
    { cod:'MN-02', nombre:'Control de instrumentos de medición', tipo:'Procedimiento', sec:'MN', rev:'03', estado:'Vigente', emision:'2025-05-12', prox:'2028-05-12', resp:'Resp. Mantenimiento' },
    { cod:'MN-02-F3', nombre:'Cronograma de control de instrumentos', tipo:'Formulario', sec:'MN', rev:'03', estado:'En revisión', emision:'2023-10-05', prox:'2026-10-05', resp:'Resp. Mantenimiento' },
    // LI
    { cod:'LI-01', nombre:'Licitaciones', tipo:'Procedimiento', sec:'LI', rev:'06', estado:'Vigente', emision:'2026-06-18', prox:'2027-06-18', resp:'Resp. Licitaciones' },
    { cod:'LI-01-F6', nombre:'Planilla de cierre', tipo:'Formulario', sec:'LI', rev:'05', estado:'Vigente', emision:'2026-06-18', prox:'2027-06-18', resp:'Resp. Licitaciones' },
    // PE
    { cod:'PE-01', nombre:'Competencias', tipo:'Procedimiento', sec:'PE', rev:'05', estado:'Vigente', emision:'2025-08-14', prox:'2028-08-14', resp:'Resp. Personal' },
    { cod:'PE-01-F4', nombre:'Plan anual de capacitación', tipo:'Formulario', sec:'PE', rev:'06', estado:'Vigente', emision:'2026-01-09', prox:'2027-01-09', resp:'Resp. Personal' },
    { cod:'PE-01-A1', nombre:'Reglamento interno', tipo:'Anexo', sec:'PE', rev:'03', estado:'Vigente', emision:'2024-04-01', prox:'2027-04-01', resp:'Legales' },
    // RL
    { cod:'RL-01', nombre:'Identificación y verificación de requisitos legales', tipo:'Procedimiento', sec:'RL', rev:'04', estado:'Vigente', emision:'2025-10-21', prox:'2028-10-21', resp:'Legales' },
    { cod:'RL-01-F2', nombre:'Programa anual de monitoreo de normativa', tipo:'Formulario', sec:'RL', rev:'03', estado:'Vigente', emision:'2026-02-05', prox:'2027-02-05', resp:'Legales' },
    // CN
    { cod:'CN-01', nombre:'Ejecución de obra', tipo:'Procedimiento', sec:'CN', rev:'09', estado:'Vigente', emision:'2026-09-15', prox:'2027-09-15', resp:'Resp. Construcciones' },
    { cod:'CN-01-F1', nombre:'Plan de calidad', tipo:'Formulario', sec:'CN', rev:'07', estado:'Vigente', emision:'2026-09-15', prox:'2027-09-15', resp:'Resp. Construcciones' },
    { cod:'CN-01-F7', nombre:'Plan de tareas semanal', tipo:'Formulario', sec:'CN', rev:'06', estado:'Vigente', emision:'2026-09-15', prox:'2027-09-15', resp:'Resp. Construcciones' },
    { cod:'CN-04', nombre:'Inspección de recepción, proceso y final', tipo:'Procedimiento', sec:'CN', rev:'05', estado:'Vigente', emision:'2026-03-28', prox:'2027-03-28', resp:'Resp. Construcciones' },
    { cod:'CN-04-IO3-F1', nombre:'Instalaciones de gas', tipo:'Instructivo', sec:'CN', rev:'02', estado:'Vigente', emision:'2025-11-30', prox:'2027-11-30', resp:'Resp. Construcciones' },
    { cod:'CN-05', nombre:'Entrega de obra', tipo:'Procedimiento', sec:'CN', rev:'04', estado:'Vigente', emision:'2025-04-18', prox:'2028-04-18', resp:'Resp. Construcciones' },
    { cod:'CN-06', nombre:'Posventa', tipo:'Procedimiento', sec:'CN', rev:'03', estado:'Obsoleto', emision:'2022-01-10', prox:'2025-01-10', resp:'Resp. Construcciones' },
    { cod:'CN-06', nombre:'Posventa', tipo:'Procedimiento', sec:'CN', rev:'04', estado:'Vigente', emision:'2025-10-02', prox:'2028-10-02', resp:'Resp. Construcciones' },
    { cod:'CN-06-F1', nombre:'Seguimiento de reclamo de clientes', tipo:'Formulario', sec:'CN', rev:'03', estado:'Vigente', emision:'2025-10-02', prox:'2028-10-02', resp:'Resp. Construcciones' },
    // GS / GA
    { cod:'GS-01', nombre:'Identificación de peligros y evaluación de riesgos', tipo:'Procedimiento', sec:'GS', rev:'04', estado:'Vigente', emision:'2026-05-06', prox:'2027-05-06', resp:'Resp. SSTyA' },
    { cod:'GS-01-F1', nombre:'Matriz IPER', tipo:'Formulario', sec:'GS', rev:'05', estado:'Vigente', emision:'2026-05-06', prox:'2027-05-06', resp:'Resp. SSTyA' },
    { cod:'GA-01', nombre:'Identificación y evaluación de aspectos ambientales', tipo:'Procedimiento', sec:'GA', rev:'03', estado:'Vigente', emision:'2026-05-06', prox:'2027-05-06', resp:'Resp. SSTyA' },
    { cod:'GA-01-F1', nombre:'Matriz de aspectos e impactos ambientales', tipo:'Formulario', sec:'GA', rev:'03', estado:'Vigente', emision:'2026-05-06', prox:'2027-05-06', resp:'Resp. SSTyA' },
  ],

  // FUA — Formulario Único de Acción. estado: Abierta / En análisis / Acción en curso / Verificación / Cerrada
  fuas: [
    { cod:'FUA-2026-041', tipo:'NC', titulo:'Hormigón H-30 con resistencia por debajo de especificación en losa N3', sec:'CN', origen:'Obra · Edificio Ríosol', apertura:'2026-11-18', vence:'2026-12-05', resp:'J. Olivares', estado:'Acción en curso',
      desc:'El ensayo de rotura de probetas a 28 días dio 24,6 MPa contra 30 MPa de especificación en la losa del nivel 3.',
      disposicion:'Se bloqueó el avance sobre la losa y se solicitó estudio de testigos (extracción de carota) al laboratorio externo.',
      causa:'Demora en el transporte del camión mixer (tiempo de descarga 2h10 vs 1h máx), agravado por falta de control de asentamiento en recepción.',
      accion:'Incorporar control de slump obligatorio al pie de obra y límite de tiempo de descarga en el pliego del proveedor de hormigón.', verif:'', cierre:'' },
    { cod:'FUA-2026-040', tipo:'RC', titulo:'Reclamo del cliente por filtración en junta de dilatación — Posventa', sec:'CN', origen:'Cliente · Inversora del Plata S.A.', apertura:'2026-11-12', vence:'2026-11-27', resp:'M. Sosa', estado:'Verificación',
      desc:'El cliente reporta filtración de agua en la junta de dilatación del subsuelo tras lluvias intensas.',
      disposicion:'Cuadrilla de posventa selló la junta con membrana líquida y se reparó el revestimiento afectado.',
      causa:'Sellador de junta aplicado sin respetar el tiempo de curado por apuro en la entrega.',
      accion:'Agregar punto de inspección de juntas al plan de calidad (CN-01-F1) con registro fotográfico antes de tapar.', verif:'Se verificará en la próxima lluvia o con prueba de estanqueidad programada para el 2026-11-26.', cierre:'' },
    { cod:'FUA-2026-039', tipo:'Obs', titulo:'Instrumento de medición (nivel óptico) sin etiqueta de calibración vigente', sec:'MN', origen:'Auditoría interna · Mantenimiento', apertura:'2026-11-05', vence:'2026-11-20', resp:'R. Vega', estado:'Cerrada',
      desc:'Durante la auditoría se encontró un nivel óptico en obra sin la etiqueta de calibración (MN-02-F2).',
      disposicion:'Se retiró el instrumento de uso y se envió a calibrar.',
      causa:'El cronograma de calibración (MN-02-F3) no contemplaba el instrumento al haberse incorporado fuera del alta.',
      accion:'Actualizar el cronograma al dar de alta cualquier instrumento y verificar etiquetas en la inspección mensual.', verif:'Verificado el 2026-11-19: instrumento calibrado, etiqueta colocada y cronograma actualizado.', cierre:'2026-11-19' },
    { cod:'FUA-2026-038', tipo:'OM', titulo:'Digitalizar el pedido de obra para acortar el circuito de compras', sec:'CO', origen:'Mejora · Compras', apertura:'2026-10-28', vence:'2026-12-20', resp:'L. Pérez', estado:'En análisis',
      desc:'Oportunidad de mejora: el pedido de obra (CO-01-F1) hoy circula en papel y demora la comparativa.',
      disposicion:'No aplica (oportunidad de mejora).',
      causa:'Beneficio esperado: reducir el tiempo entre pedido y orden de compra de 6 a 2 días y evitar extravío de pedidos.',
      accion:'Evaluar circuito digital del pedido con aprobación por jefe de obra.', verif:'', cierre:'' },
    { cod:'FUA-2026-037', tipo:'NC', titulo:'Proveedor de encofrados entregó material sin remito conforme', sec:'CO', origen:'Proceso · Recepción', apertura:'2026-10-20', vence:'2026-11-10', resp:'L. Pérez', estado:'Cerrada',
      desc:'Se recibió un lote de paneles de encofrado sin remito y con 3 unidades dañadas.',
      disposicion:'Se rechazó el lote y se solicitó reposición al proveedor.',
      causa:'Falta de criterio de aceptación en la orden de compra y proveedor con evaluación condicionada no observada.',
      accion:'Incluir condiciones de recepción en la OC y no emitir OC a proveedores "Condicionado" sin visto del responsable.', verif:'Verificado 2026-11-06: nuevo lote conforme, proveedor reevaluado.', cierre:'2026-11-06' },
    { cod:'FUA-2026-036', tipo:'AC', titulo:'Desvío en el plan de tareas semanal por falta de personal en estructura', sec:'CN', origen:'Obra · Centro Logístico Pilar Norte', apertura:'2026-10-14', vence:'2026-11-02', resp:'J. Olivares', estado:'Cerrada',
      desc:'El plan de tareas semanal (CN-01-F7) mostró un atraso del 18% en la etapa de estructura.',
      disposicion:'Se reprogramó el histograma de recursos y se sumó una cuadrilla de subcontratista.',
      causa:'Subdimensionamiento del plan de contrataciones frente al pico de hormigonado.',
      accion:'Revisar el histograma (CN-01-F3) contra el plan de trabajo en la reunión semanal de obra.', verif:'Verificado 2026-10-31: atraso recuperado al 4%.', cierre:'2026-10-31' },
    { cod:'FUA-2026-035', tipo:'NC', titulo:'EPP incompleto en frente de excavación — hallazgo de inspección de seguridad', sec:'GS', origen:'Inspección · SSTyA', apertura:'2026-10-02', vence:'2026-10-18', resp:'C. Giménez', estado:'Cerrada',
      desc:'Dos operarios sin protección auditiva en tarea de corte con amoladora.',
      disposicion:'Se detuvo la tarea y se entregó EPP faltante en el momento.',
      causa:'Stock de EPP en pañol de obra por debajo del mínimo y charla de inicio sin registro.',
      accion:'Definir stock mínimo de EPP por obra y registrar la charla diaria de seguridad.', verif:'Verificado 2026-10-16: stock repuesto, charlas con registro.', cierre:'2026-10-16' },
    { cod:'FUA-2026-034', tipo:'Obs', titulo:'Documento GC-04-F2 vencido en su fecha de revisión', sec:'GC', origen:'Auditoría interna · Calidad', apertura:'2026-09-25', vence:'2026-10-25', resp:'A. Ferrer', estado:'Verificación',
      desc:'La planilla de recolección de datos de satisfacción (GC-04-F2) superó su fecha de próxima revisión.',
      disposicion:'Se marcó el documento "En revisión" en el listado.',
      causa:'Sobrecarga del área y falta de aviso anticipado de vencimiento de documentos.',
      accion:'Configurar aviso de documentos a 60 días del vencimiento de revisión.', verif:'', cierre:'' },
    { cod:'FUA-2026-033', tipo:'OM', titulo:'Encuesta de satisfacción por mail en lugar de papel', sec:'GC', origen:'Mejora · Calidad', apertura:'2026-09-15', vence:'2026-12-15', resp:'A. Ferrer', estado:'Acción en curso',
      desc:'Oportunidad de mejora: enviar la encuesta de satisfacción (GC-04-F1) por correo para subir la tasa de respuesta.',
      disposicion:'No aplica (oportunidad de mejora).',
      causa:'Beneficio: hoy responde el 45% de los clientes; se busca llegar al 70%.',
      accion:'Probar envío digital en las próximas 3 entregas de obra.', verif:'', cierre:'' },
    { cod:'FUA-2026-032', tipo:'NC', titulo:'Residuos de obra sin segregar en Ampliación Planta Zárate', sec:'GA', origen:'Inspección · Ambiente', apertura:'2026-09-08', vence:'2026-09-28', resp:'C. Giménez', estado:'Cerrada',
      desc:'Escombros mezclados con residuos reciclables en el punto de acopio de la obra.',
      disposicion:'Se re-segregó el acopio y se señalizaron los contenedores.',
      causa:'Falta de cartelería de segregación y de capacitación al personal nuevo.',
      accion:'Incluir segregación de residuos en la inducción (PE-01-F6) y colocar cartelería estándar.', verif:'Verificado 2026-09-26: acopio conforme.', cierre:'2026-09-26' },
    { cod:'FUA-2026-031', tipo:'RC', titulo:'Reclamo por terminación de pintura en unidad tipo', sec:'CN', origen:'Cliente · Fideicomiso Las Araucarias', apertura:'2026-08-30', vence:'2026-09-20', resp:'M. Sosa', estado:'Cerrada',
      desc:'El cliente observó diferencias de tono en la pintura de dos ambientes.',
      disposicion:'Se repintaron los ambientes con el mismo lote de pintura.',
      causa:'Uso de dos lotes distintos de pintura sin registro de control.',
      accion:'Registrar lote de pintura por ambiente en el control de proceso (CN-04).', verif:'Verificado 2026-09-18: terminación conforme, cliente satisfecho.', cierre:'2026-09-18' },
    { cod:'FUA-2026-030', tipo:'AC', titulo:'Brecha de competencias en operador de topografía', sec:'PE', origen:'Proceso · Personal', apertura:'2026-08-20', vence:'2026-10-20', resp:'S. Díaz', estado:'Cerrada',
      desc:'La evaluación de cumplimiento (PE-01-F3) detectó brecha en manejo de estación total.',
      disposicion:'Se asignó un referente para supervisar las mediciones críticas.',
      causa:'Falta de capacitación específica tras incorporación.',
      accion:'Agregar capacitación de estación total al plan anual (PE-01-F4).', verif:'Verificado 2026-10-15: operador capacitado y evaluado, brecha cerrada.', cierre:'2026-10-15' },
  ],

  auditorias: [
    { cod:'AI-2026-01', sector:'Construcciones', tipo:'Interna', fecha:'2026-03-11', estado:'Cerrada', auditor:'Auditor líder (externo)', nc:1, obs:2, om:1 },
    { cod:'AI-2026-02', sector:'Compras', tipo:'Interna', fecha:'2026-05-14', estado:'Cerrada', auditor:'A. Ferrer', nc:0, obs:1, om:2 },
    { cod:'AI-2026-03', sector:'Seguridad y Ambiente', tipo:'Interna', fecha:'2026-07-09', estado:'Cerrada', auditor:'Auditor líder (externo)', nc:2, obs:1, om:0 },
    { cod:'AI-2026-04', sector:'Calidad y Dirección', tipo:'Interna', fecha:'2026-09-24', estado:'Cerrada', auditor:'A. Ferrer', nc:0, obs:2, om:1 },
    { cod:'AI-2026-05', sector:'Mantenimiento y Personal', tipo:'Interna', fecha:'2026-11-05', estado:'Cerrada', auditor:'Auditor líder (externo)', nc:0, obs:1, om:1 },
    { cod:'AE-2027-01', sector:'Todas (3 normas)', tipo:'Certificación IRAM', fecha:'2027-02-18', estado:'Programada', auditor:'IRAM', nc:null, obs:null, om:null },
  ],

  obras: [
    { cod:'OB-24-07', nombre:'Edificio Ríosol', cliente:'Inversora del Plata S.A.', ubic:'Vicente López, Bs. As.', tipo:'Edificio de viviendas', avance:72, inicio:'2025-03-10', fin:'2027-02-28', estado:'En ejecución', planCal:88, inspTotal:46, inspAprob:41, inspPend:3, inspObs:2, reclamos:1 },
    { cod:'OB-24-11', nombre:'Centro Logístico Pilar Norte', cliente:'Grupo Benardo Logística', ubic:'Pilar, Bs. As.', tipo:'Nave industrial', avance:54, inicio:'2025-06-02', fin:'2026-12-20', estado:'En ejecución', planCal:91, inspTotal:38, inspAprob:35, inspPend:2, inspObs:1, reclamos:0 },
    { cod:'OB-25-03', nombre:'Ampliación Planta Zárate', cliente:'Alimentos del Litoral S.A.', ubic:'Zárate, Bs. As.', tipo:'Obra industrial', avance:38, inicio:'2026-02-17', fin:'2027-05-30', estado:'En ejecución', planCal:84, inspTotal:22, inspAprob:19, inspPend:3, inspObs:0, reclamos:0 },
    { cod:'OB-23-09', nombre:'Escuela Técnica Nº 12 — San Martín', cliente:'Gobierno Provincial (ejemplo)', ubic:'Gral. San Martín, Bs. As.', tipo:'Obra pública', avance:100, inicio:'2024-04-08', fin:'2025-11-15', estado:'Entregada', planCal:95, inspTotal:58, inspAprob:58, inspPend:0, inspObs:0, reclamos:2 },
    { cod:'OB-25-06', nombre:'Fideicomiso Las Araucarias', cliente:'Fideicomiso Las Araucarias', ubic:'Pilar, Bs. As.', tipo:'Vivienda unifamiliar premium', avance:100, inicio:'2025-01-20', fin:'2026-08-10', estado:'En garantía', planCal:90, inspTotal:33, inspAprob:33, inspPend:0, inspObs:0, reclamos:1 },
  ],

  proveedores: [
    { nombre:'Hormigonera del Norte S.A.', rubro:'Hormigón elaborado', cuit:'30-70811223-4', estado:'Condicionado', puntaje:72, ultEval:'2026-10-05', poliza:'Vigente' },
    { nombre:'Aceros Pampa S.R.L.', rubro:'Acero / hierro', cuit:'30-69552018-9', estado:'Aprobado', puntaje:91, ultEval:'2026-09-12', poliza:'Vigente' },
    { nombre:'Encofrados Modulares S.A.', rubro:'Encofrados', cuit:'30-71220934-1', estado:'Aprobado', puntaje:86, ultEval:'2026-11-06', poliza:'Vigente' },
    { nombre:'Áridos y Canteras SRL', rubro:'Áridos', cuit:'30-68490112-3', estado:'Aprobado', puntaje:88, ultEval:'2026-08-21', poliza:'Vigente' },
    { nombre:'Instalaciones Sanitarias Delta', rubro:'Subcontratista sanitario', cuit:'30-70993471-6', estado:'Condicionado', puntaje:68, ultEval:'2026-10-19', poliza:'Por vencer' },
    { nombre:'Electro Obras Integral', rubro:'Subcontratista eléctrico', cuit:'30-71455820-7', estado:'Aprobado', puntaje:84, ultEval:'2026-09-30', poliza:'Vigente' },
    { nombre:'Pinturería Industrial Centro', rubro:'Pinturas y revestimientos', cuit:'30-66820145-2', estado:'No apto', puntaje:49, ultEval:'2026-09-18', poliza:'Vencida' },
    { nombre:'Grúas y Montajes del Sur', rubro:'Alquiler de equipos', cuit:'30-71002388-5', estado:'Aprobado', puntaje:90, ultEval:'2026-11-02', poliza:'Vigente' },
  ],

  equipos: [
    { cod:'EQ-012', nombre:'Retroexcavadora CAT 420', obra:'Ampliación Planta Zárate', estado:'Operativo', ultMant:'2026-10-11', proxMant:'2027-01-11' },
    { cod:'EQ-007', nombre:'Grúa torre Potain', obra:'Edificio Ríosol', estado:'Operativo', ultMant:'2026-09-28', proxMant:'2026-12-28' },
    { cod:'EQ-019', nombre:'Vibrador de inmersión', obra:'Centro Logístico Pilar Norte', estado:'En reparación', ultMant:'2026-11-14', proxMant:'2026-11-29' },
    { cod:'EQ-004', nombre:'Compresor Atlas Copco', obra:'Edificio Ríosol', estado:'Operativo', ultMant:'2026-08-30', proxMant:'2026-11-30' },
    { cod:'EQ-021', nombre:'Hidrolavadora industrial', obra:'Depósito central', estado:'Operativo', ultMant:'2026-10-02', proxMant:'2027-04-02' },
  ],

  instrumentos: [
    { cod:'IM-03', nombre:'Nivel óptico automático', obra:'Edificio Ríosol', estado:'Calibrado', ultCal:'2026-11-19', proxCal:'2027-05-19', patron:'Lab. externo acreditado' },
    { cod:'IM-05', nombre:'Estación total', obra:'Centro Logístico Pilar Norte', estado:'Calibrado', ultCal:'2026-06-10', proxCal:'2026-12-10', patron:'Lab. externo acreditado' },
    { cod:'IM-08', nombre:'Esclerómetro (martillo de Schmidt)', obra:'Edificio Ríosol', estado:'Por vencer', ultCal:'2025-12-15', proxCal:'2026-12-15', patron:'Lab. externo acreditado' },
    { cod:'IM-11', nombre:'Termohigrómetro', obra:'Depósito central', estado:'Vencido', ultCal:'2025-10-20', proxCal:'2026-10-20', patron:'Lab. externo acreditado' },
    { cod:'IM-02', nombre:'Cinta métrica patrón 50 m', obra:'Ampliación Planta Zárate', estado:'Calibrado', ultCal:'2026-09-01', proxCal:'2027-09-01', patron:'Trazable a patrón nacional' },
    { cod:'IM-14', nombre:'Manómetro prueba hidráulica', obra:'Edificio Ríosol', estado:'Calibrado', ultCal:'2026-10-07', proxCal:'2027-04-07', patron:'Lab. externo acreditado' },
  ],

  personal: [
    { nombre:'J. Olivares', puesto:'Jefe de Obra', sector:'CN', cap:92, induccion:'Sí', comp:'Cumple' },
    { nombre:'M. Sosa', puesto:'Capataz general', sector:'CN', cap:85, induccion:'Sí', comp:'Cumple' },
    { nombre:'A. Ferrer', puesto:'Responsable de Gestión de Calidad', sector:'GC', cap:100, induccion:'Sí', comp:'Cumple' },
    { nombre:'C. Giménez', puesto:'Responsable SSTyA', sector:'GS', cap:96, induccion:'Sí', comp:'Cumple' },
    { nombre:'L. Pérez', puesto:'Responsable de Compras', sector:'CO', cap:80, induccion:'Sí', comp:'Cumple' },
    { nombre:'R. Vega', puesto:'Responsable de Mantenimiento', sector:'MN', cap:74, induccion:'Sí', comp:'Brecha' },
    { nombre:'S. Díaz', puesto:'Responsable de Personal', sector:'PE', cap:88, induccion:'Sí', comp:'Cumple' },
    { nombre:'P. Romero', puesto:'Operador de topografía', sector:'CN', cap:78, induccion:'Sí', comp:'Cumple' },
    { nombre:'N. Acosta', puesto:'Oficial albañil', sector:'CN', cap:64, induccion:'En curso', comp:'Brecha' },
    { nombre:'D. Herrera', puesto:'Administrativo de obra', sector:'AD', cap:82, induccion:'Sí', comp:'Cumple' },
  ],

  capacitaciones: [
    { tema:'Trabajo en altura y uso de arnés', fecha:'2026-03-18', sector:'GS', estado:'Realizada', asist:24 },
    { tema:'Lectura de planos y control dimensional', fecha:'2026-05-06', sector:'CN', estado:'Realizada', asist:12 },
    { tema:'Segregación de residuos de obra', fecha:'2026-07-22', sector:'GA', estado:'Realizada', asist:31 },
    { tema:'Uso de estación total', fecha:'2026-10-14', sector:'CN', estado:'Realizada', asist:4 },
    { tema:'Interpretación de la norma ISO 9001:2015', fecha:'2026-12-04', sector:'GC', estado:'Programada', asist:0 },
    { tema:'Primeros auxilios y RCP', fecha:'2026-12-16', sector:'GS', estado:'Programada', asist:0 },
  ],

  objetivos: [
    { sector:'Calidad', iso:'iso9', indicador:'FUAs cerradas en plazo', meta:85, real:82, unidad:'%' },
    { sector:'Calidad', iso:'iso9', indicador:'Satisfacción de clientes (promedio)', meta:85, real:89, unidad:'%' },
    { sector:'Construcciones', iso:'iso9', indicador:'Inspecciones aprobadas en 1ª instancia', meta:90, real:93, unidad:'%' },
    { sector:'Construcciones', iso:'iso9', indicador:'Obras entregadas en plazo', meta:80, real:75, unidad:'%' },
    { sector:'Compras', iso:'iso9', indicador:'Proveedores aprobados sobre el total', meta:80, real:72, unidad:'%' },
    { sector:'Seguridad', iso:'iso45', indicador:'Índice de frecuencia de accidentes', meta:100, real:100, unidad:'%', nota:'Sin accidentes con días perdidos en el año' },
    { sector:'Seguridad', iso:'iso45', indicador:'Inspecciones de seguridad realizadas', meta:95, real:98, unidad:'%' },
    { sector:'Ambiente', iso:'iso14', indicador:'Residuos segregados correctamente', meta:90, real:86, unidad:'%' },
    { sector:'Ambiente', iso:'iso14', indicador:'Cumplimiento de requisitos legales ambientales', meta:100, real:94, unidad:'%' },
    { sector:'Personal', iso:'iso9', indicador:'Plan anual de capacitación cumplido', meta:90, real:84, unidad:'%' },
  ],

  satisfaccion: [
    { cliente:'Gobierno Provincial (ejemplo)', obra:'Escuela Técnica Nº 12', score:92, fecha:'2025-12-02' },
    { cliente:'Fideicomiso Las Araucarias', obra:'Las Araucarias', score:88, fecha:'2026-09-01' },
    { cliente:'Inversora del Plata S.A.', obra:'Edificio Ríosol (parcial)', score:86, fecha:'2026-07-15' },
    { cliente:'Grupo Benardo Logística', obra:'Pilar Norte (parcial)', score:90, fecha:'2026-10-20' },
  ],

  riesgos: [
    { tarea:'Excavación profunda', peligro:'Derrumbe de talud', nivel:'Alto', control:'Entibado + inspección diaria', estado:'Controlado' },
    { tarea:'Trabajo en altura', peligro:'Caída de altura', nivel:'Alto', control:'Arnés + línea de vida + capacitación', estado:'Controlado' },
    { tarea:'Izaje con grúa torre', peligro:'Caída de carga', nivel:'Alto', control:'Plan de izaje + señalero habilitado', estado:'Controlado' },
    { tarea:'Corte con amoladora', peligro:'Proyección de partículas / ruido', nivel:'Medio', control:'EPP + pantalla + protección auditiva', estado:'En seguimiento' },
    { tarea:'Hormigonado', peligro:'Dermatitis por contacto', nivel:'Bajo', control:'Guantes + crema barrera', estado:'Controlado' },
  ],

  aspectosAmb: [
    { aspecto:'Generación de residuos de construcción', impacto:'Ocupación de suelo / disposición', signif:'Significativo', control:'Plan de segregación y transportista habilitado' },
    { aspecto:'Consumo de agua en obra', impacto:'Uso de recurso natural', signif:'Moderado', control:'Medición y reúso en curado' },
    { aspecto:'Emisión de polvo', impacto:'Calidad del aire', signif:'Moderado', control:'Riego de caminos y cobertura de acopios' },
    { aspecto:'Efluentes de lavado de mixer', impacto:'Suelo / agua', signif:'Significativo', control:'Pileta de decantación obligatoria' },
    { aspecto:'Consumo de combustible de equipos', impacto:'Emisiones GEI', signif:'Moderado', control:'Mantenimiento preventivo (MN-01)' },
  ],

  incidentes: [
    { fecha:'2026-04-03', obra:'Edificio Ríosol', tipo:'Cuasi-accidente', gravedad:'Leve', estado:'Cerrado', desc:'Caída de herramienta desde andamio sin personas debajo.' },
    { fecha:'2026-08-19', obra:'Centro Logístico Pilar Norte', tipo:'Primeros auxilios', gravedad:'Leve', estado:'Cerrado', desc:'Corte superficial en mano, atendido en obra.' },
  ],

  legales: [
    { requisito:'Ley 19.587 — Higiene y Seguridad en el Trabajo', tipo:'Seguridad', aplica:'Sí', estado:'Cumple', ultVerif:'2026-09-10', prox:'2027-03-10' },
    { requisito:'Dec. 911/96 — Seguridad en la construcción', tipo:'Seguridad', aplica:'Sí', estado:'Cumple', ultVerif:'2026-09-10', prox:'2027-03-10' },
    { requisito:'Res. SRT 51/97 y 35/98 — Aviso de obra / Legajo técnico', tipo:'Seguridad', aplica:'Sí', estado:'Cumple', ultVerif:'2026-10-01', prox:'2027-04-01' },
    { requisito:'Ley 25.675 — General del Ambiente', tipo:'Ambiente', aplica:'Sí', estado:'Cumple', ultVerif:'2026-08-05', prox:'2027-02-05' },
    { requisito:'Gestión de residuos — normativa provincial', tipo:'Ambiente', aplica:'Sí', estado:'En seguimiento', ultVerif:'2026-10-18', prox:'2026-12-18' },
    { requisito:'Habilitación municipal de obra', tipo:'General', aplica:'Sí', estado:'Cumple', ultVerif:'2026-07-20', prox:'2027-07-20' },
  ],

  partesInteresadas: [
    { parte:'Clientes / comitentes', necesidad:'Obra en plazo, calidad y sin reclamos', nivel:'Alto' },
    { parte:'Personal propio', necesidad:'Condiciones seguras y capacitación', nivel:'Alto' },
    { parte:'Subcontratistas', necesidad:'Reglas claras y pagos en término', nivel:'Medio' },
    { parte:'Organismos de control (SRT, municipio)', necesidad:'Cumplimiento legal', nivel:'Alto' },
    { parte:'Comunidad del entorno de obra', necesidad:'Bajo impacto (ruido, polvo, tránsito)', nivel:'Medio' },
    { parte:'IRAM', necesidad:'Mantenimiento de las certificaciones', nivel:'Alto' },
  ],

  foda: {
    f:['Certificación integrada en las 3 normas desde 2019/2021','Equipo técnico estable y capacitado','Procedimientos de obra maduros (CN-01 Rev. 09)'],
    o:['Licitaciones públicas que exigen ISO','Digitalización del sistema de gestión','Obras industriales en expansión en la zona'],
    d:['Sistema documental disperso en carpetas de nube','Avisos de vencimientos manuales','Baja tasa de respuesta de encuestas de satisfacción'],
    a:['Volatilidad de precios de insumos','Escasez de mano de obra calificada','Cambios en normativa ambiental provincial'],
  },

  revisionDireccion: {
    fecha:'2026-03-20', estado:'Realizada', proxima:'2027-03-19',
    entradas:['Resultados de auditorías internas y externa','Estado de FUAs y acciones','Satisfacción de clientes','Cumplimiento de objetivos','Desempeño de proveedores','Adecuación de recursos'],
    salidas:['Plan de mejora 2026 aprobado','Refuerzo de personal en estructura','Decisión de digitalizar el SGI (proyecto Argos)'],
  },
};

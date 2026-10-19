export interface ChecklistGroup {
  title: string
  items: { id: string; text: string }[]
}

export interface Checklist {
  id: string
  title: string
  emoji: string
  description: string
  from: number  // lifeWeek (ver guides.ts)
  to: number
  groups: ChecklistGroup[]
}

function g(title: string, prefix: string, texts: string[]): ChecklistGroup {
  return { title, items: texts.map((text, i) => ({ id: `${prefix}${i + 1}`, text })) }
}

export const CHECKLISTS: Checklist[] = [
  {
    id: 'preconcepcion',
    title: 'Antes de buscar',
    emoji: '🌱',
    description: 'Los deberes de los dos para empezar con buen pie.',
    from: -80, to: -36,
    groups: [
      g('Ella', 'a', [
        'Consulta preconcepcional con médico de familia o matrona',
        'Empezar ácido fólico 400 mcg (y yodo si lo indican)',
        'Analítica: rubeola, varicela, toxoplasma, serologías',
        'Revisar medicación habitual con el médico',
        'Citología al día',
        'Revisión dental',
      ]),
      g('Tú', 'b', [
        'Dejar el tabaco y el vapeo',
        'Reducir alcohol al mínimo',
        'Revisar medicación / suplementos (sin testosterona ni anabolizantes)',
        'Ejercicio regular y peso saludable',
      ]),
      g('Juntos', 'c', [
        'Vacunas al día (tétanos, sarampión, gripe)',
        'Hablar de cómo repartiréis permisos y cuidados',
        'Revisar presupuesto y ahorro para el primer año',
        'Descargar la tarjeta de los días fértiles en la app',
      ]),
    ],
  },
  {
    id: 'embarazo',
    title: 'Embarazo por trimestres',
    emoji: '🤰',
    description: 'Lo que no se puede escapar en estos 9 meses.',
    from: -38, to: 0,
    groups: [
      g('1.er trimestre', 'a', [
        'Primera cita con la matrona',
        'Analítica del 1.er trimestre',
        'Ecografía semana 11-14 y cribado combinado',
        'Decidir cuándo y cómo contarlo',
      ]),
      g('2.º trimestre', 'b', [
        'Ecografía morfológica (semana 20)',
        'Test de O\'Sullivan (semana 24-28)',
        'Vacuna de la tosferina (semana 27-32)',
        'Apuntarse a educación maternal',
        'Comunicar el embarazo en el trabajo y planificar permisos',
        'Elegir pediatra / centro de salud',
      ]),
      g('3.er trimestre', 'c', [
        'Ecografía del 3.er trimestre',
        'Exudado de estreptococo B (semana 35-37)',
        'Plan de parto escrito',
        'Silla de coche instalada',
        'Bolsa del hospital lista (semana 34-36)',
        'Curso de primeros auxilios pediátricos',
        'Visitar el hospital / paritorio',
        'Congelar comida para las primeras semanas',
      ]),
    ],
  },
  {
    id: 'esenciales',
    title: 'Esenciales para la llegada',
    emoji: '🛒',
    description: 'Lo que de verdad hace falta (y nada más).',
    from: -26, to: 2,
    groups: [
      g('Dormir', 'a', [
        'Cuna o minicuna con colchón firme',
        'Sábanas ajustables (3)',
        'Saco de dormir de su talla',
      ]),
      g('Pasear y coche', 'b', [
        'Silla de coche i-Size (R129) instalada',
        'Cochecito o capazo',
        'Portabebés ergonómico',
      ]),
      g('Higiene y salud', 'c', [
        'Pañales talla recién nacido',
        'Toallitas sin perfume o algodón',
        'Crema para el pañal',
        'Termómetro digital',
        'Suero fisiológico en monodosis',
        'Paracetamol pediátrico (consultar dosis por peso)',
        'Tijeras o lima de uñas para bebé',
      ]),
      g('Ropa', 'd', [
        '6-8 bodies talla 1 mes',
        '6-8 pijamas o peleles',
        'Gorrito y calcetines',
        'Muselinas (6)',
      ]),
      g('Comer', 'e', [
        'Cojín de lactancia (opcional)',
        'Discos de lactancia y crema de lanolina',
        'Si hay fórmula: 4-6 biberones y tetinas de flujo lento',
      ]),
    ],
  },
  {
    id: 'bolsa-hospital',
    title: 'Bolsa del hospital',
    emoji: '🎒',
    description: 'Tenerla lista en la semana 34-36, junto a la puerta.',
    from: -10, to: 0,
    groups: [
      g('Documentos', 'a', [
        'DNI de los dos',
        'Tarjeta sanitaria',
        'Cartilla del embarazo y últimas analíticas/ecografías',
        'Plan de parto (2 copias)',
      ]),
      g('Para ella', 'b', [
        '2-3 camisones o pijamas abiertos por delante',
        'Bata y zapatillas',
        'Sujetadores de lactancia',
        'Bragas desechables o de algodón de talla grande',
        'Compresas posparto',
        'Neceser (cepillo, champú, gomas de pelo, cacao)',
        'Ropa cómoda para el alta',
      ]),
      g('Para el bebé', 'c', [
        '3-4 bodies y pijamas',
        'Gorrito y calcetines/manoplas',
        'Muselinas',
        'Manta o arrullo',
        'Ropa para salir del hospital',
        'Pañales y toallitas (por si acaso)',
      ]),
      g('Para ti', 'd', [
        'Muda de ropa y neceser',
        'Cargador y batería externa',
        'Snacks y agua',
        'Monedas o tarjeta para parking y máquinas',
        'Cámara / espacio libre en el móvil',
        'Silla del coche instalada para volver',
      ]),
    ],
  },
  {
    id: 'tramites',
    title: 'Trámites tras nacer',
    emoji: '📄',
    description: 'Burocracia de las primeras semanas.',
    from: -4, to: 26,
    groups: [
      g('Primeros días', 'a', [
        'Inscripción en el Registro Civil (hospital en 72 h o 10 días)',
        'Certificado de nacimiento',
        'Empadronamiento',
        'Tarjeta sanitaria y asignación de pediatra',
        'Alta en seguro privado (si tenéis)',
      ]),
      g('Permisos y prestaciones', 'b', [
        'Certificado de empresa (ella)',
        'Certificado de empresa (tú)',
        'Solicitar prestación por nacimiento — ella',
        'Solicitar prestación por nacimiento — tú',
        'Planificar las semanas flexibles y avisar a la empresa con 15 días',
        'Solicitar permiso de lactancia',
        'Deducción por maternidad (pago anticipado)',
        'Revisar ayudas de tu comunidad y ayuntamiento',
      ]),
      g('Más adelante', 'c', [
        'DNI / pasaporte del bebé (si viajáis)',
        'Actualizar beneficiarios de seguros',
        'Preinscripción escuela infantil',
      ]),
    ],
  },
  {
    id: 'casa-segura',
    title: 'Casa segura',
    emoji: '🏠',
    description: 'Antes de que empiece a gatear (hacia los 6-8 meses).',
    from: 16, to: 156,
    groups: [
      g('General', 'a', [
        'Protectores de enchufes',
        'Muebles altos y TV anclados a la pared',
        'Barreras en escaleras',
        'Protectores de esquinas en mesas bajas',
        'Cordones de cortinas y persianas fuera de su alcance',
        'Cierres en ventanas y balcones; sin muebles para trepar',
        'Detector de humo',
      ]),
      g('Cocina', 'b', [
        'Productos de limpieza en alto y con cierre',
        'Cierres en cajones con cuchillos',
        'Mangos de sartenes hacia dentro',
        'Bolsas de plástico guardadas',
      ]),
      g('Baño y medicinas', 'c', [
        'Botiquín en alto y cerrado',
        'Termo a 50 ºC como máximo',
        'Alfombrilla antideslizante en la bañera',
        'Tapa del váter con cierre',
      ]),
      g('Objetos peligrosos', 'd', [
        'Pilas de botón e imanes fuera de su alcance',
        'Nada pequeño que quepa en un tubo de papel higiénico a su alcance',
        'Plantas tóxicas fuera de casa o en alto',
      ]),
    ],
  },
]

export function getChecklist(id: string): Checklist | undefined {
  return CHECKLISTS.find(c => c.id === id)
}

export function checkKey(profileId: number, listId: string, itemId: string): string {
  return `${profileId}|${listId}|${itemId}`
}

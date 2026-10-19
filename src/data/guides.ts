/**
 * Biblioteca de guías. Contenido orientativo basado en recomendaciones de la AEP,
 * Ministerio de Sanidad, AESAN, OMS y SEGO. No sustituye a matrona ni pediatra.
 *
 * Escala de "lifeWeek" para la relevancia:
 *   buscando embarazo = -60 · semana N de embarazo = N - 40 · semana N de vida = N
 */

export type GuideCategory =
  | 'preconcepcion'
  | 'embarazo'
  | 'parto'
  | 'recien-nacido'
  | 'alimentacion'
  | 'salud'
  | 'crianza'
  | 'tramites'

export interface GuideSection {
  title: string
  items: string[]
}

export interface Guide {
  id: string
  title: string
  emoji: string
  category: GuideCategory
  summary: string
  from: number
  to: number
  alert?: string
  tools?: { label: string; to: string }[]
  sections: GuideSection[]
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  preconcepcion: 'Buscando bebé',
  embarazo: 'Embarazo',
  parto: 'Parto',
  'recien-nacido': 'Recién nacido',
  alimentacion: 'Alimentación',
  salud: 'Salud y urgencias',
  crianza: 'Crianza 1-3 años',
  tramites: 'Trámites y dinero',
}

export const GUIDES: Guide[] = [
  // ── Preconcepción ──────────────────────────────────────────────────────────
  {
    id: 'antes-de-buscar',
    title: 'Antes de buscar el embarazo',
    emoji: '🌱',
    category: 'preconcepcion',
    summary: 'Lo que conviene hacer 3 meses antes: ella y tú.',
    from: -80, to: -36,
    tools: [{ label: 'Checklist preconcepción', to: '/herramientas/checklist/preconcepcion' }],
    sections: [
      {
        title: 'Consulta preconcepcional',
        items: [
          'Pedid cita con el médico de familia o la matrona: revisan antecedentes, medicación y vacunas.',
          'Analítica básica: grupo sanguíneo y Rh, inmunidad frente a rubeola, varicela y toxoplasma, serologías (VIH, hepatitis B y C, sífilis).',
          'Si hay alguna enfermedad crónica (tiroides, diabetes, epilepsia, hipertensión) hay que ajustar el tratamiento ANTES del embarazo.',
          'Revisión dental: el embarazo empeora las encías.',
        ],
      },
      {
        title: 'Para ella',
        items: [
          'Ácido fólico 400 mcg al día desde al menos 1 mes antes (idealmente 3) y hasta la semana 12. Previene defectos del tubo neural.',
          'Yodo: suele recomendarse un suplemento de 150-200 mcg; confirmadlo con la matrona.',
          'Si no está vacunada de rubeola o varicela: vacunarse y esperar 1 mes antes de buscar.',
          'Alcohol: cero en cuanto empecéis a buscar. No hay cantidad segura.',
        ],
      },
      {
        title: 'Para ti (sí, también cuenta)',
        items: [
          'Los espermatozoides tardan unos 74 días en formarse: lo que hagas hoy se nota en 3 meses.',
          'Deja el tabaco (y el vapeo): reduce la calidad del semen y el humo pasivo afecta al embarazo.',
          'Reduce el alcohol, evita el calor excesivo en los testículos (saunas, portátil en las piernas) y mantén un peso saludable.',
          'Revisa con tu médico si tomas anabolizantes, testosterona o ciertos fármacos: pueden afectar a la fertilidad.',
        ],
      },
    ],
  },
  {
    id: 'fertilidad',
    title: 'Fertilidad: cómo funciona',
    emoji: '📅',
    category: 'preconcepcion',
    summary: 'Ventana fértil, test de embarazo y cuándo consultar.',
    from: -80, to: -36,
    tools: [{ label: 'Calculadora de días fértiles', to: '/herramientas/fertilidad' }],
    sections: [
      {
        title: 'La ventana fértil',
        items: [
          'La ovulación suele ocurrir unos 14 días antes de la siguiente regla (no siempre el día 14 del ciclo).',
          'Los días fértiles son los 5 previos a la ovulación y el propio día: el espermatozoide sobrevive hasta 5 días.',
          'Relaciones cada 1-2 días en esa ventana es lo más eficaz. No hace falta "programar" cada hora.',
          'Los test de ovulación (LH) y el moco cervical tipo clara de huevo ayudan a afinar.',
        ],
      },
      {
        title: 'Expectativas realistas',
        items: [
          'Una pareja sana tiene un 20-25 % de probabilidad por ciclo. Tardar varios meses es lo normal.',
          'El 80-85 % de las parejas consigue embarazo en el primer año.',
          'El estrés no ayuda, pero tampoco es "la culpa". Cuidaos como pareja durante el proceso.',
        ],
      },
      {
        title: 'Test de embarazo y cuándo consultar',
        items: [
          'Haz el test desde el día en que debería bajar la regla, mejor con la primera orina de la mañana.',
          'Positivo: pedid cita con la matrona o médico de familia del centro de salud.',
          'Consultad fertilidad si tras 12 meses no hay embarazo (6 meses si ella tiene 35 años o más), o antes si hay ciclos muy irregulares o antecedentes conocidos.',
          'El estudio es de los dos: el seminograma es sencillo y aporta mucha información.',
        ],
      },
    ],
  },
  {
    id: 'economia-familiar',
    title: 'Dinero y organización',
    emoji: '💶',
    category: 'tramites',
    summary: 'Presupuesto, permisos y decisiones que conviene hablar antes.',
    from: -80, to: 10,
    sections: [
      {
        title: 'Hablad antes de que llegue',
        items: [
          '¿Cómo vais a repartir los permisos por nacimiento? Cada progenitor tiene el suyo y no es transferible.',
          '¿Quién cuidará cuando terminen los permisos: escuela infantil, abuelos, reducción de jornada, excedencia?',
          'Repartid tareas de casa ahora: con un bebé no hay tiempo de negociar.',
        ],
      },
      {
        title: 'Gastos del primer año',
        items: [
          'Lo grande: silla de coche, cochecito, cuna. Mucho se puede heredar o comprar de segunda mano (salvo la silla de coche si no conoces su historial).',
          'Lo recurrente: pañales (unos 6-10 al día al principio), leche de fórmula si se usa, ropa que se queda pequeña en semanas.',
          'Haz un fondo para imprevistos y revisa si os conviene un seguro de vida o actualizar beneficiarios.',
        ],
      },
    ],
  },

  // ── Embarazo ───────────────────────────────────────────────────────────────
  {
    id: 'pruebas-embarazo',
    title: 'Calendario de pruebas del embarazo',
    emoji: '🩺',
    category: 'embarazo',
    summary: 'Ecografías, analíticas y vacunas semana a semana (sanidad pública).',
    from: -36, to: 0,
    tools: [{ label: 'Añadir citas', to: '/herramientas/citas' }],
    sections: [
      {
        title: 'Primer trimestre',
        items: [
          'Semana 6-10: primera visita con la matrona. Historia clínica, analítica del 1.er trimestre, tensión y peso.',
          'Semana 11-14: ecografía del 1.er trimestre y cribado combinado (análisis + translucencia nucal) de cromosomopatías.',
          'Si el cribado sale de riesgo alto, os ofrecerán ADN fetal en sangre materna o una prueba diagnóstica.',
        ],
      },
      {
        title: 'Segundo trimestre',
        items: [
          'Semana 18-22: ecografía morfológica. La más larga e importante: revisa órganos uno a uno. Aquí suele verse el sexo.',
          'Semana 24-28: test de O\'Sullivan (cribado de diabetes gestacional) y analítica del 2.º trimestre.',
          'Si ella es Rh negativo: inmunoglobulina anti-D hacia la semana 28.',
          'Semana 27-32 (ideal): vacuna de la tosferina (dTpa). Protege al bebé los primeros meses.',
        ],
      },
      {
        title: 'Tercer trimestre',
        items: [
          'Semana 32-36: ecografía del 3.er trimestre (crecimiento, posición, placenta).',
          'Semana 32-36: en algunas comunidades se ofrece la vacuna frente al VRS en el embarazo como alternativa al nirsevimab del bebé.',
          'Semana 35-37: exudado vaginal y rectal para estreptococo del grupo B.',
          'Desde la semana 40: monitores y controles de bienestar fetal. Se suele plantear inducción entre la 41 y la 42.',
          'Vacuna de la gripe en temporada (y la que recomiende Sanidad ese año) en cualquier trimestre.',
        ],
      },
    ],
  },
  {
    id: 'alimentacion-embarazo',
    title: 'Comer en el embarazo',
    emoji: '🥗',
    category: 'embarazo',
    summary: 'Qué evitar y por qué: toxoplasma, listeria, mercurio.',
    from: -38, to: 0,
    sections: [
      {
        title: 'Evitar',
        items: [
          'Alcohol: nada. Ni cerveza sin alcohol 0,0 si no es realmente 0,0.',
          'Carne cruda o poco hecha, embutidos crudos curados (si no es inmune a toxoplasma; congelar a -20 ºC 48 h reduce el riesgo).',
          'Leche cruda y quesos sin pasteurizar; quesos blandos de corteza enmohecida (brie, camembert) salvo cocinados. Riesgo de listeria.',
          'Pescado crudo (sushi) salvo que esté previamente congelado. Ahumados refrigerados.',
          'Pez espada, tiburón, atún rojo y lucio: mucho mercurio.',
          'Cafeína: máximo unos 200 mg al día (2 cafés pequeños).',
        ],
      },
      {
        title: 'Sí',
        items: [
          'Pescado blanco y azul pequeño 3-4 veces por semana (sardina, boquerón, salmón, merluza).',
          'Lavar bien frutas y verduras; cocinar bien carne y huevos.',
          'Sal yodada y el suplemento que indique la matrona (ácido fólico, yodo, hierro si hace falta).',
          'Tú puedes ayudar cocinando y haciendo la compra: es una de las tareas más útiles del embarazo.',
        ],
      },
    ],
  },
  {
    id: 'acompanar-embarazo',
    title: 'Cómo acompañar el embarazo',
    emoji: '🤝',
    category: 'embarazo',
    summary: 'El papel de la pareja: presencia, logística y cuidado.',
    from: -38, to: 0,
    sections: [
      {
        title: 'Estar',
        items: [
          'Ve a las ecografías y a las clases de preparación al parto (educación maternal): tienes derecho a permiso para acompañar a los exámenes prenatales.',
          'Pregunta cómo se encuentra, no solo cómo está el bebé.',
          'Las náuseas, el cansancio del 1.er trimestre y el insomnio del 3.º son reales: asume más tareas de casa sin que te lo pidan.',
        ],
      },
      {
        title: 'Preparar',
        items: [
          'Aprende la ruta al hospital, dónde aparcar y por qué puerta se entra de noche.',
          'Haz un curso de primeros auxilios pediátricos (RCP y atragantamiento). Dura una tarde y te dará muchísima calma.',
          'Lee sobre lactancia: el apoyo de la pareja es uno de los factores que más influye en que salga bien.',
        ],
      },
      {
        title: 'Vosotros',
        items: [
          'Las relaciones sexuales son seguras en un embarazo normal salvo que la matrona diga lo contrario.',
          'Es normal tener miedo o sentirse "fuera". Habladlo. Tu vínculo con el bebé también empieza ahora: háblale, ponle música.',
        ],
      },
    ],
  },
  {
    id: 'preparar-llegada',
    title: 'Preparar la casa y las compras',
    emoji: '🛒',
    category: 'embarazo',
    summary: 'Lo esencial, lo útil y lo que te puedes ahorrar.',
    from: -20, to: 0,
    tools: [
      { label: 'Checklist de esenciales', to: '/herramientas/checklist/esenciales' },
      { label: 'Bolsa del hospital', to: '/herramientas/checklist/bolsa-hospital' },
    ],
    sections: [
      {
        title: 'Imprescindible',
        items: [
          'Silla de coche homologada i-Size (R129) instalada ANTES del parto: sin ella no deberíais salir del hospital en coche.',
          'Un sitio seguro para dormir: cuna o minicuna con colchón firme que encaje sin huecos.',
          'Pañales de recién nacido, toallitas o algodón, crema de pañal.',
          'Ropa de bodies y pijamas en talla 1 mes (no compres mucho de 0: se queda pequeña en días).',
          'Termómetro digital.',
        ],
      },
      {
        title: 'Puede esperar o ahorrar',
        items: [
          'Cambiador: una toalla en una cómoda sirve.',
          'Calientabiberones, esterilizador eléctrico, bañera con patas: útiles pero no necesarios.',
          'Chichoneras, almohadas, posicionadores y peluches en la cuna: NO. Aumentan el riesgo de muerte súbita.',
        ],
      },
    ],
  },

  // ── Parto ──────────────────────────────────────────────────────────────────
  {
    id: 'senales-parto',
    title: 'Señales de parto: cuándo ir al hospital',
    emoji: '🚗',
    category: 'parto',
    summary: 'La regla 5-1-1, la bolsa y las señales de alarma.',
    from: -8, to: 0,
    alert: 'Si hay sangrado abundante, líquido verde o con sangre, fiebre, dolor de cabeza intenso con visión borrosa, o deja de notar al bebé: hospital ya.',
    tools: [
      { label: 'Temporizador de contracciones', to: '/herramientas/contracciones' },
      { label: 'Contador de movimientos', to: '/herramientas/patadas' },
    ],
    sections: [
      {
        title: 'Contracciones',
        items: [
          'Las de Braxton-Hicks (de "ensayo") son irregulares y ceden con reposo o una ducha.',
          'Primer parto, regla 5-1-1: cada 5 minutos, que duran 1 minuto, durante 1 hora. Entonces, al hospital.',
          'Si vivís lejos o no es el primer parto, salid antes. Ante la duda, llamad al hospital: están para eso.',
          'Mide desde el inicio de una contracción al inicio de la siguiente. Usa el temporizador de la app.',
        ],
      },
      {
        title: 'Rotura de bolsa',
        items: [
          'Puede ser un chorro o un goteo continuo. Anota la hora y el color.',
          'Líquido claro: id al hospital con calma (no hace falta correr si no hay contracciones fuertes).',
          'Líquido verde, marrón o con sangre: id ya.',
        ],
      },
      {
        title: 'Otras razones para ir',
        items: [
          'Notar menos movimientos del bebé de lo habitual.',
          'Sangrado como una regla o más.',
          'Dolor de cabeza fuerte, visión con destellos, hinchazón brusca de cara y manos (posible preeclampsia).',
          'Fiebre de 38 ºC o más.',
        ],
      },
    ],
  },
  {
    id: 'plan-parto',
    title: 'Plan de parto',
    emoji: '📝',
    category: 'parto',
    summary: 'Las decisiones que conviene pensar y llevar escritas.',
    from: -12, to: 0,
    sections: [
      {
        title: 'Qué decidir',
        items: [
          'Acompañante durante dilatación, expulsivo y, si es posible, cesárea.',
          'Alivio del dolor: epidural, óxido nitroso, pelota, ducha, movimiento libre.',
          'Piel con piel inmediato y pinzamiento tardío del cordón.',
          'Quién corta el cordón, si queréis donar sangre de cordón.',
          'Alimentación: lactancia materna, mixta o fórmula. Vitamina K y colirio al bebé.',
        ],
      },
      {
        title: 'Cómo hacerlo',
        items: [
          'Muchos hospitales tienen su modelo: pedidlo en la visita o a la matrona.',
          'Llevad 2 copias impresas en la bolsa.',
          'Es una guía, no un contrato: el parto puede cambiar y lo importante es que os expliquen cada decisión.',
        ],
      },
    ],
  },
  {
    id: 'tu-papel-parto',
    title: 'Tu papel en el parto',
    emoji: '💪',
    category: 'parto',
    summary: 'Qué hacer (y qué no) mientras ella da a luz.',
    from: -6, to: 1,
    sections: [
      {
        title: 'Durante',
        items: [
          'Tu trabajo es su calma: voz tranquila, agua, masaje lumbar, recordarle respirar.',
          'Defiende su plan de parto si ella no puede hablar, pero confía en el equipo.',
          'Come algo y bebe: un acompañante mareado no ayuda.',
          'Si es cesárea, quizás te pidan esperar fuera al principio. Prepárate para hacer piel con piel tú.',
        ],
      },
      {
        title: 'Justo después',
        items: [
          'Haz fotos, sí, pero mira con tus ojos también.',
          'Controla las visitas: las primeras horas son para vosotros tres.',
          'Pregunta a la matrona cómo ayudar con el primer agarre al pecho.',
        ],
      },
    ],
  },

  // ── Recién nacido ─────────────────────────────────────────────────────────
  {
    id: 'primeros-dias',
    title: 'Los primeros días en casa',
    emoji: '🍼',
    category: 'recien-nacido',
    summary: 'Cordón, ictericia, peso, pañales y primeras pruebas.',
    from: -2, to: 4,
    tools: [{ label: 'Registro diario', to: '/herramientas/registro' }],
    sections: [
      {
        title: 'En el hospital o los primeros días',
        items: [
          'Vitamina K y pomada ocular al nacer.',
          'Prueba del talón (cribado metabólico) a partir de las 48 h de vida.',
          'Cribado auditivo antes del alta o en las primeras semanas.',
          'Primera visita al pediatra y a la matrona del centro de salud entre los 3 y 5 días.',
        ],
      },
      {
        title: 'Normal',
        items: [
          'Perder hasta un 7-10 % del peso los primeros días; lo recupera hacia los 10-15 días.',
          'Meconio (caca negra y pegajosa) los primeros 2-3 días, luego verdosa y después amarilla y grumosa con lactancia.',
          'Al menos 5-6 pañales mojados al día a partir del 5.º día.',
          'Estornudos, hipo, ruiditos al dormir, manchas en la piel, ojos que se cruzan a ratos.',
        ],
      },
      {
        title: 'Cordón umbilical',
        items: [
          'Mantenlo limpio y seco; agua y jabón si se ensucia, y secar bien. No hacen falta alcohol ni antisépticos de rutina.',
          'Dobla el pañal por debajo para que le dé el aire.',
          'Cae entre los 5 y 15 días. Consulta si huele mal, supura o la piel alrededor está roja.',
        ],
      },
      {
        title: 'Consulta pronto si',
        items: [
          'Color amarillo intenso que avanza a barriga y piernas, o aparece en las primeras 24 h.',
          'Menos pañales mojados de lo esperado, orina muy oscura, labios secos.',
          'Fiebre (38 ºC o más) en menores de 3 meses: urgencias.',
        ],
      },
    ],
  },
  {
    id: 'sueno-seguro',
    title: 'Sueño seguro',
    emoji: '😴',
    category: 'recien-nacido',
    summary: 'Cómo reducir el riesgo de muerte súbita del lactante.',
    from: -4, to: 52,
    alert: 'Siempre boca arriba, en superficie firme, sin nada suelto en la cuna.',
    sections: [
      {
        title: 'Lo básico',
        items: [
          'Boca arriba para dormir, siempre, también en las siestas.',
          'Colchón firme y plano, sábana ajustable. Sin almohada, mantas sueltas, chichoneras ni peluches.',
          'En vuestra habitación (cuna propia o sidecar) al menos los primeros 6 meses.',
          'Temperatura de 20-22 ºC; no lo abrigues de más ni le tapes la cabeza. Mejor saco de dormir que manta.',
          'Casa sin humo, también en la ropa y el coche.',
        ],
      },
      {
        title: 'Situaciones de riesgo',
        items: [
          'Nunca dormir con él en un sofá o sillón: es la situación más peligrosa.',
          'No compartir cama si alguno fuma, ha bebido, toma medicación que dé sueño o está muy agotado, ni si el bebé fue prematuro o de bajo peso.',
          'El chupete al dormir parece proteger; si hay lactancia, mejor ofrecerlo cuando esté bien establecida (3-4 semanas).',
        ],
      },
      {
        title: 'Expectativas',
        items: [
          'Un recién nacido duerme 16-18 h en ciclos de 2-4 h. Despertarse de noche es normal y protector durante meses.',
          'Diferencia día y noche: luz y ruido normales de día; penumbra y voz baja de noche.',
          'Una rutina corta (baño o masaje, pijama, toma, cuna) ayuda a partir de los 2-3 meses.',
        ],
      },
    ],
  },
  {
    id: 'lactancia',
    title: 'Lactancia materna',
    emoji: '🤱',
    category: 'alimentacion',
    summary: 'A demanda, agarre, señales de que va bien y cómo ayudar.',
    from: -6, to: 104,
    tools: [{ label: 'Registrar tomas', to: '/herramientas/registro' }],
    sections: [
      {
        title: 'Cómo funciona',
        items: [
          'A demanda: 8-12 tomas en 24 h al principio. Cuanto más mama, más leche se produce.',
          'Señales de hambre tempranas: se chupa las manos, busca, abre la boca. El llanto es una señal tardía.',
          'Buen agarre: boca muy abierta, labios evertidos, más areola por abajo que por arriba, no duele.',
          'Señales de que va bien: 5-6 pañales mojados al día, cacas amarillas y recupera el peso hacia los 10-15 días.',
        ],
      },
      {
        title: 'Pide ayuda si',
        items: [
          'Hay dolor que no mejora, grietas o sangre.',
          'Pecho rojo, caliente y fiebre (posible mastitis).',
          'El bebé está muy dormido y no pide, o no gana peso.',
          'Matrona del centro de salud, consultoras IBCLC y grupos de apoyo a la lactancia son gratuitos y muy útiles.',
        ],
      },
      {
        title: 'Tu papel',
        items: [
          'Trae agua y algo de comer en cada toma nocturna. Coloca cojines.',
          'Haz todo lo demás: cambiar, sacar gases, dormirle, bañarle, cuidar la casa y frenar visitas.',
          'Si se extrae leche: a temperatura ambiente hasta 4 h, en nevera hasta 4 días, en congelador 6 meses (descongelar en nevera, no microondas).',
          'Lactancia exclusiva recomendada hasta los 6 meses y luego, junto a otros alimentos, hasta que madre y bebé quieran.',
        ],
      },
    ],
  },
  {
    id: 'biberon',
    title: 'Biberón y leche de fórmula',
    emoji: '🍼',
    category: 'alimentacion',
    summary: 'Preparación segura y cantidades orientativas.',
    from: -2, to: 52,
    sections: [
      {
        title: 'Preparación',
        items: [
          'Lávate las manos. Primero el agua, después los cacitos rasos del polvo, siempre la proporción del envase.',
          'Agua: del grifo si es de buena calidad o embotellada de mineralización débil. En los primeros meses, hervirla y dejar templar es lo más seguro.',
          'Comprueba la temperatura en la muñeca. Si usas microondas, agita bien: crea puntos muy calientes.',
          'Lo que sobra de una toma se tira al cabo de 1 h. No guardes biberones preparados a temperatura ambiente.',
        ],
      },
      {
        title: 'Cantidades orientativas (cada bebé es distinto)',
        items: [
          'Primera semana: 30-60 ml por toma, 8-12 tomas.',
          '1 mes: 90-120 ml, 6-8 tomas.',
          '2-3 meses: 120-180 ml, 5-6 tomas.',
          '4-6 meses: 180-210 ml, 4-5 tomas.',
          'Mejor guiarse por sus señales de hambre y saciedad que acabar el biberón. Método "a ritmo del bebé": biberón horizontal y pausas.',
        ],
      },
    ],
  },
  {
    id: 'llanto-colicos',
    title: 'Llanto y cólicos',
    emoji: '😭',
    category: 'recien-nacido',
    summary: 'Por qué llora, cómo calmarle y cómo cuidarte tú.',
    from: 0, to: 20,
    alert: 'Nunca zarandees a un bebé. Si llegas al límite, déjalo seguro en la cuna, sal de la habitación unos minutos y respira.',
    sections: [
      {
        title: 'Lo normal',
        items: [
          'El llanto aumenta a partir de las 2 semanas, tiene su pico hacia las 6-8 semanas y mejora sobre los 3-4 meses.',
          'Suele concentrarse por la tarde-noche. Llorar 2-3 h al día puede ser normal.',
          'Repasa: hambre, pañal, gases, frío/calor, cansancio, necesidad de brazos.',
        ],
      },
      {
        title: 'Qué funciona',
        items: [
          'Contacto: brazos, piel con piel, portabebés ergonómico.',
          'Movimiento rítmico, ruido blanco o "shhh" fuerte cerca del oído, chupete.',
          'Postura de "tigre en la rama" (boca abajo sobre tu antebrazo) mientras está despierto y vigilado.',
          'Turnaos: el que está descansado coge al bebé.',
        ],
      },
      {
        title: 'Consulta si',
        items: [
          'Llanto muy agudo o distinto, o no se calma con nada durante horas.',
          'Fiebre, vómitos, rechaza comer, sangre en la caca o pierde peso.',
        ],
      },
    ],
  },
  {
    id: 'salud-mental-postparto',
    title: 'Salud mental en el posparto (los dos)',
    emoji: '🧠',
    category: 'recien-nacido',
    summary: 'Tristeza puerperal, depresión posparto y depresión paterna.',
    from: -2, to: 52,
    alert: 'Si alguno tiene pensamientos de hacerse daño o hacer daño al bebé: 112 o la línea 024 (atención a la conducta suicida, 24 h).',
    sections: [
      {
        title: 'Tristeza posparto ("baby blues")',
        items: [
          'Hasta 8 de cada 10 madres: llanto fácil, irritabilidad y altibajos los primeros 3-10 días.',
          'Mejora sola en 2 semanas con descanso y apoyo.',
        ],
      },
      {
        title: 'Depresión posparto',
        items: [
          'Afecta a 1 de cada 7 madres y a 1 de cada 10 padres. Puede aparecer durante todo el primer año.',
          'Señales: tristeza o vacío casi todos los días, no disfrutar de nada, ansiedad intensa, sentirse mala madre/mal padre, no poder dormir aunque el bebé duerma.',
          'En padres a menudo se ve como irritabilidad, aislamiento, trabajar o beber más.',
          'Tiene tratamiento. Hablad con la matrona, el médico de familia o el pediatra: también pregunta por vosotros.',
        ],
      },
      {
        title: 'Prevenir',
        items: [
          'Turnos de sueño: que cada uno tenga al menos un bloque de 4-5 h seguidas.',
          'Aceptar ayuda concreta (comida, colada) y decir que no a visitas que cansan.',
          'Salir a la calle cada día, aunque sea 20 minutos.',
        ],
      },
    ],
  },
  {
    id: 'recuperacion-pareja',
    title: 'La recuperación de ella tras el parto',
    emoji: '💛',
    category: 'recien-nacido',
    summary: 'Cuarentena, señales de alarma y cómo cuidarla.',
    from: -2, to: 12,
    sections: [
      {
        title: 'Normal',
        items: [
          'Sangrado (loquios) que va de rojo a rosado y a blanquecino durante 4-6 semanas.',
          'Entuertos: contracciones del útero, más fuertes al dar el pecho.',
          'Molestias en puntos o cicatriz de cesárea durante 1-3 semanas. Tras cesárea no debe coger peso más allá del bebé.',
          'Sudores nocturnos, cansancio enorme, pecho que "sube" hacia el día 3-4.',
        ],
      },
      {
        title: 'Urgencias si',
        items: [
          'Sangrado que empapa una compresa en 1 hora o coágulos grandes.',
          'Fiebre de 38 ºC o más, loquios que huelen mal.',
          'Dolor o hinchazón en una pierna, dificultad para respirar o dolor en el pecho.',
          'Dolor de cabeza intenso o alteraciones de la visión.',
        ],
      },
      {
        title: 'Después',
        items: [
          'Revisión posparto con la matrona hacia las 6 semanas: suelo pélvico y anticoncepción.',
          'La lactancia no es un anticonceptivo fiable si no se cumplen condiciones estrictas.',
          'Las relaciones sexuales se retoman cuando ella esté preparada, sin prisas.',
        ],
      },
    ],
  },

  // ── Alimentación ───────────────────────────────────────────────────────────
  {
    id: 'alimentacion-complementaria',
    title: 'Empezar a comer: alimentación complementaria',
    emoji: '🥑',
    category: 'alimentacion',
    summary: 'A partir de los 6 meses: cuándo, cómo y en qué orden.',
    from: 20, to: 60,
    sections: [
      {
        title: 'Cuándo',
        items: [
          'Hacia los 6 meses (no antes de los 4), cuando se sienta con poco apoyo, muestra interés por la comida y ha perdido el reflejo de sacar la lengua.',
          'La leche (materna o fórmula) sigue siendo el alimento principal hasta el año.',
        ],
      },
      {
        title: 'Cómo',
        items: [
          'Triturado, chafado o en trozos blandos que pueda coger (BLW): todas las opciones son válidas. Avanzar texturas pronto evita rechazos.',
          'No hay un orden obligatorio. Prioriza alimentos ricos en hierro: carne, pescado, huevo, legumbres.',
          'Introduce alérgenos (huevo bien cocido, cacahuete en crema diluida, pescado) pronto y de uno en uno; retrasarlos no previene alergias.',
          'Ofrece agua en vaso con las comidas.',
          'Siempre sentado, erguido y vigilado. Nada de comer en el coche o andando.',
        ],
      },
      {
        title: 'Formas seguras',
        items: [
          'Trozos blandos que se aplastan entre dos dedos, en bastones del tamaño de su puño.',
          'Uvas, cerezas, tomates cherry y aceitunas: cortados en cuartos a lo largo.',
          'Frutos secos: solo molidos o en crema hasta los 5-6 años.',
          'Ten en cuenta que las arcadas son normales (protegen); el atragantamiento es silencioso. Aprende la maniobra.',
        ],
      },
    ],
  },
  {
    id: 'alimentos-a-evitar',
    title: 'Alimentos a evitar en bebés',
    emoji: '🚫',
    category: 'alimentacion',
    summary: 'Miel, sal, mercurio, nitratos y otros por edades.',
    from: 20, to: 260,
    sections: [
      {
        title: 'Antes del año',
        items: [
          'Miel: riesgo de botulismo infantil.',
          'Leche de vaca como bebida principal (sí en yogur, queso o cocinada en pequeñas cantidades).',
          'Sal y azúcar añadidos.',
          'Espinacas y acelgas (nitratos). De 1 a 3 años, como máximo una pequeña ración al día.',
          'Bebidas vegetales como sustituto de la leche.',
        ],
      },
      {
        title: 'Hasta más tarde',
        items: [
          'Pez espada, tiburón, atún rojo y lucio: evitar hasta los 10 años (mercurio).',
          'Bebida de arroz: evitar hasta los 6 años (arsénico).',
          'Frutos secos enteros, palomitas, caramelos duros: riesgo de atragantamiento hasta los 5-6 años.',
          'Carne de caza abatida con munición de plomo: evitar hasta los 6 años.',
          'Algas: limitar por su alto contenido en yodo.',
          'Zumos (aunque sean naturales), refrescos, bebidas energéticas y ultraprocesados: mejor fruta entera y agua.',
        ],
      },
    ],
  },

  // ── Salud y urgencias ─────────────────────────────────────────────────────
  {
    id: 'fiebre',
    title: 'Fiebre: qué hacer',
    emoji: '🌡️',
    category: 'salud',
    summary: 'Cómo medirla, cuándo preocuparse y cómo tratar el malestar.',
    from: 0, to: 520,
    alert: 'Fiebre en un bebé de menos de 3 meses: siempre a urgencias, aunque parezca estar bien.',
    tools: [{ label: 'Calculadora de dosis', to: '/herramientas/dosis' }],
    sections: [
      {
        title: 'Medir',
        items: [
          'Termómetro digital en la axila (en bebés pequeños el rectal es más fiable). Fiebre: 38 ºC o más.',
          'No uses termómetros de mercurio.',
        ],
      },
      {
        title: 'Tratar',
        items: [
          'La fiebre es una defensa: se trata el malestar, no el número.',
          'Paracetamol o ibuprofeno (este último desde los 3 meses) a la dosis según PESO, no según edad. No alternarlos de rutina.',
          'Ofrecer líquidos a menudo, ropa ligera. No baños de agua fría ni alcohol en la piel.',
          'Apunta cada dosis y la hora (puedes hacerlo en el registro de la app) para no repetir antes de tiempo.',
        ],
      },
      {
        title: 'Consulta el mismo día si',
        items: [
          'Tiene entre 3 y 6 meses, o la fiebre dura más de 48-72 h.',
          'Está decaído o irritable incluso cuando baja la fiebre.',
          'Respira con dificultad, rechaza líquidos, moja pocos pañales o aparecen manchas en la piel.',
        ],
      },
    ],
  },
  {
    id: 'urgencias',
    title: 'Cuándo ir a urgencias',
    emoji: '🚑',
    category: 'salud',
    summary: 'Las señales que no deben esperar.',
    from: -4, to: 520,
    alert: 'Emergencias: 112. Intoxicaciones: Servicio de Información Toxicológica 91 562 04 20 (24 h).',
    sections: [
      {
        title: 'Llama al 112',
        items: [
          'No respira, se pone morado o azulado, o está inconsciente.',
          'Convulsión (sacudidas, mirada perdida) que no cede en unos minutos o es la primera vez.',
          'Atragantamiento que no se resuelve.',
        ],
      },
      {
        title: 'Ve a urgencias',
        items: [
          'Fiebre en menores de 3 meses.',
          'Dificultad para respirar: se le marcan las costillas, hunde el cuello, respira muy rápido o hace ruido al respirar.',
          'Manchas rojas o moradas que NO desaparecen al estirar la piel o al presionar con un vaso.',
          'Muy adormilado, difícil de despertar, o irritable y no se calma con nada.',
          'Fontanela (la "mollera") abombada, o hundida con signos de deshidratación.',
          'Vómitos continuos, vómitos verdes o con sangre, o más de 6-8 h sin mojar el pañal.',
          'Golpe en la cabeza con pérdida de conocimiento, vómitos repetidos o comportamiento extraño.',
          'Se ha tragado una pila de botón, imanes o un producto tóxico (no provoques el vómito).',
          'Quemaduras más grandes que su palma, o en cara, manos o genitales.',
        ],
      },
      {
        title: 'Ten a mano',
        items: [
          'Tarjeta sanitaria, cartilla de vacunas y lista de medicamentos que toma.',
          'Su peso aproximado (para dosis).',
          'El teléfono de tu centro de salud y del servicio de consejo sanitario de tu comunidad.',
        ],
      },
    ],
  },
  {
    id: 'atragantamiento',
    title: 'Atragantamiento: la maniobra',
    emoji: '🆘',
    category: 'salud',
    summary: 'Qué hacer si se atraganta. Apréndelo antes de necesitarlo.',
    from: -8, to: 520,
    alert: 'Esto es un recordatorio, no sustituye a un curso práctico de primeros auxilios pediátricos.',
    sections: [
      {
        title: 'Si tose o llora',
        items: [
          'Déjale toser: es lo más eficaz. Vigila sin meter los dedos en la boca a ciegas.',
        ],
      },
      {
        title: 'Si no puede toser, llorar ni respirar — menor de 1 año',
        items: [
          'Pide a alguien que llame al 112.',
          'Bocabajo sobre tu antebrazo, cabeza más baja que el cuerpo, sujetando la mandíbula: 5 golpes secos entre los omóplatos con el talón de la mano.',
          'Dale la vuelta, bocarriba, cabeza baja: 5 compresiones en el centro del pecho con dos dedos, justo bajo la línea de los pezones.',
          'Repite 5 + 5 hasta que expulse el objeto o pierda el conocimiento.',
        ],
      },
      {
        title: 'Mayor de 1 año',
        items: [
          '5 golpes en la espalda con el niño inclinado hacia delante.',
          '5 compresiones abdominales (Heimlich): puño entre ombligo y esternón, empujando hacia dentro y arriba.',
          'Alterna hasta que lo expulse.',
        ],
      },
      {
        title: 'Si pierde el conocimiento',
        items: [
          'Llama al 112 (altavoz) e inicia RCP: 5 respiraciones de rescate y luego 30 compresiones / 2 respiraciones.',
          'Antes de cada respiración, mira la boca y saca el objeto solo si lo ves.',
        ],
      },
    ],
  },
  {
    id: 'revisiones-nino-sano',
    title: 'Revisiones del niño sano',
    emoji: '👶',
    category: 'salud',
    summary: 'El calendario de revisiones pediátricas y qué miran en cada una.',
    from: -2, to: 320,
    tools: [{ label: 'Mis citas', to: '/herramientas/citas' }, { label: 'Vacunas', to: '/vacunas' }],
    sections: [
      {
        title: 'Calendario habitual (varía según comunidad)',
        items: [
          '3-5 días de vida: primera visita (peso, ictericia, lactancia, prueba del talón).',
          '15 días y 1 mes.',
          '2, 4 y 6 meses (coinciden con vacunas los de 2 y 4 meses).',
          '9 y 12 meses (o 11-12).',
          '15 y 18 meses.',
          '2 años, 3-4 años y 6 años.',
        ],
      },
      {
        title: 'Cómo sacarles partido',
        items: [
          'Llevad las dudas apuntadas (el diario de la app es perfecto para eso).',
          'Pide que te enseñen las curvas de percentiles y qué significan.',
          'Pregunta por desarrollo, sueño, alimentación… y también por cómo estáis vosotros.',
        ],
      },
    ],
  },
  {
    id: 'dientes',
    title: 'Dientes y cuidado bucal',
    emoji: '🦷',
    category: 'salud',
    summary: 'Dentición, cepillado y prevención de caries.',
    from: 16, to: 260,
    sections: [
      {
        title: 'Dentición',
        items: [
          'El primer diente suele salir entre los 4 y los 10 meses (los incisivos inferiores).',
          'Puede dar babas, ganas de morder, irritabilidad y algo de malestar. La fiebre alta NO es por los dientes: busca otra causa.',
          'Mordedores fríos (de nevera, no congelados) y masajear la encía con el dedo limpio. Evita geles anestésicos y collares de ámbar (riesgo de asfixia).',
        ],
      },
      {
        title: 'Cepillado',
        items: [
          'Desde el primer diente, 2 veces al día, con pasta de 1.000 ppm de flúor.',
          'Menores de 3 años: cantidad de un grano de arroz. De 3 a 6 años: un guisante (1.000-1.450 ppm).',
          'Cepilla tú hasta los 7-8 años, aunque él también "lo intente".',
          'Nada de dormirse con biberón de leche o zumo. Primera visita al dentista hacia el año.',
        ],
      },
    ],
  },
  {
    id: 'seguridad-hogar',
    title: 'Casa segura',
    emoji: '🏠',
    category: 'salud',
    summary: 'Prevención de accidentes según va gateando y caminando.',
    from: 16, to: 260,
    tools: [{ label: 'Checklist casa segura', to: '/herramientas/checklist/casa-segura' }],
    sections: [
      {
        title: 'Lo más peligroso',
        items: [
          'Caídas: nunca solo en el cambiador o la cama, ni un segundo. Barreras en escaleras.',
          'Ahogamiento: nunca solo en la bañera ni en piscina, aunque haya poca agua.',
          'Ventanas y balcones: sin muebles cerca por los que trepar, cierres de seguridad.',
          'Pilas de botón e imanes: si se traga uno, urgencias inmediatamente.',
          'Muebles altos y televisores anclados a la pared.',
        ],
      },
      {
        title: 'Cocina y baño',
        items: [
          'Mangos de sartenes hacia dentro, fuegos de atrás.',
          'Productos de limpieza y medicamentos en alto y cerrados, en su envase original.',
          'Agua caliente del termo a un máximo de 50 ºC para evitar quemaduras.',
          'Nunca bebidas calientes con el bebé en brazos.',
        ],
      },
    ],
  },
  {
    id: 'silla-coche',
    title: 'Silla de coche',
    emoji: '🚙',
    category: 'salud',
    summary: 'A contramarcha, bien anclada y sin abrigo.',
    from: -16, to: 520,
    sections: [
      {
        title: 'Reglas de oro',
        items: [
          'A contramarcha como mínimo hasta los 15 meses (norma i-Size); lo recomendable es hasta los 4 años.',
          'Nunca en el asiento delantero a contramarcha con el airbag activado.',
          'Arnés ajustado: no debe caber más de un dedo entre arnés y clavícula.',
          'Sin abrigos ni monos gruesos debajo del arnés: quítaselo y ponle una manta encima.',
          'Los capazos/grupos 0 no son para dormir horas fuera del coche: en trayectos largos, paradas cada 1,5-2 h.',
        ],
      },
      {
        title: 'Comprar e instalar',
        items: [
          'Homologación R129 (i-Size). Mejor con ISOFIX y pata de apoyo.',
          'Evita sillas de segunda mano si no conoces su historial (pueden haber sufrido un accidente).',
          'Practica la instalación antes del parto.',
        ],
      },
    ],
  },

  // ── Crianza 1-3 ───────────────────────────────────────────────────────────
  {
    id: 'rabietas',
    title: 'Rabietas y límites',
    emoji: '🌋',
    category: 'crianza',
    summary: 'Por qué ocurren y cómo acompañarlas sin perder los nervios.',
    from: 52, to: 260,
    sections: [
      {
        title: 'Por qué',
        items: [
          'Entre los 18 meses y los 4 años el cerebro emocional va mucho más rápido que el que regula.',
          'Hambre, sueño, cambios y no poder expresar lo que quiere son los detonantes más habituales.',
          'No es manipulación ni un fallo vuestro: es una etapa del desarrollo.',
        ],
      },
      {
        title: 'Durante',
        items: [
          'Asegura que nadie se haga daño. Baja a su altura, voz calmada y pocas palabras.',
          'Nombra la emoción: "Estás muy enfadado porque querías seguir en el parque".',
          'Mantén el límite sin dar explicaciones largas. No cedas al grito, pero tampoco castigues la emoción.',
          'Ofrece contacto cuando esté listo: algunos niños quieren abrazo y otros espacio.',
        ],
      },
      {
        title: 'Prevenir',
        items: [
          'Rutinas previsibles y avisar de los cambios ("dos toboganes más y nos vamos").',
          'Dar opciones limitadas: "¿te pones el abrigo tú o te ayudo?".',
          'Atención positiva cuando lo hace bien, no solo cuando falla.',
          'Cuídate tú: si estás al límite, relévate con tu pareja.',
        ],
      },
    ],
  },
  {
    id: 'lenguaje',
    title: 'Lenguaje: cómo estimularlo y señales de alerta',
    emoji: '🗣️',
    category: 'crianza',
    summary: 'Hitos del habla y cuándo comentarlo con el pediatra.',
    from: 8, to: 208,
    sections: [
      {
        title: 'Estimular',
        items: [
          'Habla mucho: narra lo que haces ("ahora te pongo el calcetín").',
          'Lee cada día y canta canciones con gestos.',
          'Responde a sus sonidos y deja pausas para que "conteste".',
          'Amplía: si dice "agua", tú "¿quieres agua fresquita?". No le corrijas, repítelo bien.',
          'Pantallas fuera: el lenguaje se aprende en interacción, no viendo vídeos.',
        ],
      },
      {
        title: 'Comenta con el pediatra si',
        items: [
          '6 meses: no se ríe ni hace sonidos, no se gira a tu voz.',
          '12 meses: no balbucea "mamama/papapa", no señala, no responde a su nombre.',
          '18 meses: no dice palabras sueltas o no entiende órdenes sencillas.',
          '24 meses: menos de 50 palabras o no une dos palabras.',
          'A cualquier edad: pierde palabras o habilidades que ya tenía.',
        ],
      },
    ],
  },
  {
    id: 'esfinteres',
    title: 'Dejar el pañal',
    emoji: '🚽',
    category: 'crianza',
    summary: 'Señales de que está listo y cómo hacerlo sin presión.',
    from: 78, to: 260,
    sections: [
      {
        title: 'Está listo si',
        items: [
          'Aguanta seco 1-2 horas o se despierta seco de la siesta.',
          'Avisa (o se esconde) cuando hace caca o pis.',
          'Le interesa el váter, se quita el pantalón y entiende instrucciones sencillas.',
          'Suele ocurrir entre los 2 y los 3 años. Antes de tiempo solo alarga el proceso.',
        ],
      },
      {
        title: 'Cómo',
        items: [
          'Elegid una época tranquila (no con hermano recién nacido, mudanza o inicio de cole).',
          'Orinal accesible, ofrécelo tras despertar y tras las comidas.',
          'Ropa fácil de quitar y muchos recambios. Los escapes son parte del aprendizaje: sin enfados ni premios exagerados.',
          'El pañal de noche va a su ritmo: mojar la cama hasta los 5 años es normal.',
        ],
      },
    ],
  },
  {
    id: 'pantallas-juego',
    title: 'Juego y pantallas',
    emoji: '🧸',
    category: 'crianza',
    summary: 'Qué juegos ayudan por edad y la regla de las pantallas.',
    from: 0, to: 260,
    sections: [
      {
        title: 'Pantallas',
        items: [
          'Menores de 2 años: evitarlas, salvo videollamadas con la familia.',
          'De 2 a 5 años: menos de 1 hora al día, contenido de calidad y mejor acompañado.',
          'Nunca durante las comidas ni la hora antes de dormir.',
          'Lo que más influye es el ejemplo: tu móvil también cuenta.',
        ],
      },
      {
        title: 'Juego por edades',
        items: [
          '0-6 meses: caras, voz, tiempo boca abajo despierto (tummy time) varias veces al día.',
          '6-12 meses: cucú-tras, meter y sacar, sonajeros, libros de tela.',
          '1-2 años: encajables, pelotas, cubos, cocinitas, correpasillos.',
          '2-3 años: juego simbólico, plastilina, puzles sencillos, parque y naturaleza.',
          'Juguetes sencillos y pocos a la vez: rótalos.',
        ],
      },
    ],
  },
  {
    id: 'escuela-infantil',
    title: 'Escuela infantil y cuidado',
    emoji: '🏫',
    category: 'crianza',
    summary: 'Plazos, adaptación y los virus del primer año.',
    from: 8, to: 160,
    sections: [
      {
        title: 'Organizarse',
        items: [
          'Las preinscripciones de escuelas infantiles públicas (0-3) suelen abrirse en primavera para el curso de septiembre. Infórmate en tu ayuntamiento con tiempo.',
          'En muchas comunidades el tramo de 2 a 3 años ya es gratuito o está subvencionado.',
          'Visita varias, pregunta ratio de niños por educadora, periodo de adaptación y política de enfermedades.',
        ],
      },
      {
        title: 'Adaptación',
        items: [
          'Empieza con pocas horas y ve aumentando. Despedidas cortas y sin desaparecer a escondidas.',
          'Es normal que llore o duerma peor las primeras semanas.',
          'El primer año enfermará a menudo (8-10 catarros es habitual). Pensad un plan B para los días de fiebre.',
        ],
      },
    ],
  },

  // ── Trámites ──────────────────────────────────────────────────────────────
  {
    id: 'tramites-nacimiento',
    title: 'Trámites tras el nacimiento',
    emoji: '📄',
    category: 'tramites',
    summary: 'Registro civil, permisos, prestaciones, empadronamiento y tarjeta sanitaria.',
    from: -12, to: 26,
    alert: 'Datos de 2026. Confírmalos en la sede de la Seguridad Social y en tu comunidad: la normativa cambia a menudo.',
    tools: [{ label: 'Checklist de trámites', to: '/herramientas/checklist/tramites' }],
    sections: [
      {
        title: 'Primera semana',
        items: [
          'Inscripción en el Registro Civil: la mayoría de hospitales la tramitan en 72 h. Si no, tenéis 10 días en el Registro Civil (ampliable a 30 con causa justificada).',
          'El libro de familia en papel ya no se emite: se usa la certificación del registro.',
          'Empadronamiento del bebé en el ayuntamiento.',
          'Tarjeta sanitaria y asignación de pediatra en el centro de salud.',
          'Si tenéis seguro privado, dad de alta al bebé (suele haber un plazo corto para que no haya carencias).',
        ],
      },
      {
        title: 'Permiso por nacimiento y cuidado del menor',
        items: [
          'Desde 2025 cada progenitor tiene 19 semanas retribuidas al 100 % por la Seguridad Social (familias monoparentales: 32).',
          'Reparto: 6 semanas obligatorias e ininterrumpidas justo tras el parto; el resto puede disfrutarse de forma flexible (hasta los 12 meses), y 2 semanas hasta que el menor cumple 8 años.',
          'Avisa a tu empresa con 15 días de antelación para las semanas flexibles.',
          'Solicita la prestación en la sede electrónica de la Seguridad Social (Tu Seguridad Social) con el certificado de empresa.',
        ],
      },
      {
        title: 'Otros derechos y ayudas',
        items: [
          'Permiso por lactancia: 1 hora de ausencia al día hasta los 9 meses, o acumulado en jornadas completas si lo permite el convenio. Lo pueden disfrutar ambos.',
          'Permiso parental de 8 semanas hasta los 8 años (consulta cuántas son retribuidas en ese momento).',
          'Reducción de jornada por guarda legal y excedencia por cuidado de hijos.',
          'Deducción por maternidad en el IRPF (hasta 1.200 € al año por hijo menor de 3 años, más un incremento por gastos de guardería autorizada). Puede cobrarse por adelantado.',
          'Complemento de ayuda para la infancia, ayudas autonómicas y municipales por nacimiento: revisa las de tu comunidad y ayuntamiento.',
          'Si vais a viajar, el bebé necesita DNI o pasaporte propio.',
        ],
      },
    ],
  },
]

/** lifeWeek: escala común (ver arriba). */
export function lifeWeekFor(phase: string | undefined, currentWeek: number): number {
  if (phase === 'trying') return -60
  return currentWeek
}

export function relevantGuides(lifeWeek: number, limit = 4): Guide[] {
  return GUIDES
    .filter(g => lifeWeek >= g.from && lifeWeek <= g.to)
    .sort((a, b) => (b.from - a.from) || (a.to - b.to))
    .slice(0, limit)
}

export function getGuide(id: string): Guide | undefined {
  return GUIDES.find(g => g.id === id)
}

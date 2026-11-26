/**
 * Lo que hay que hacer (y comprobar) desde el parto hasta la cuarentena.
 * Plazos orientativos según el Programa de cribado neonatal del SNS, la AEP
 * y la Seguridad Social. Cada elemento se guarda como check en la lista
 * NEWBORN_LIST_ID, igual que los hitos o las vacunas.
 */

export const NEWBORN_LIST_ID = 'recien-nacido'

export type NewbornCategory = 'hospital' | 'cuidados' | 'tramites' | 'mama'

export interface NewbornTask {
  id: string
  category: NewbornCategory
  title: string
  detail: string
  /** Horas desde el nacimiento en que debería estar hecho. Sin valor = cuando toque. */
  dueHours?: number
  /** Pide anotar un resultado (prueba del talón, audición…). */
  hasResult?: boolean
  link?: { to: string; label: string }
}

const D = 24

export const NEWBORN_CATEGORIES: Record<NewbornCategory, string> = {
  hospital: 'Pruebas y cuidados en el hospital',
  cuidados: 'Primeros días en casa',
  tramites: 'Papeleo',
  mama: 'Para mamá',
}

export const NEWBORN_TASKS: NewbornTask[] = [
  // Hospital
  { id: 'piel', category: 'hospital', dueHours: 1, title: 'Piel con piel y primera toma',
    detail: 'En la primera hora, si todo va bien. Ayuda a regular su temperatura y a arrancar la lactancia.' },
  { id: 'vit-k', category: 'hospital', dueHours: 6, title: 'Vitamina K (inyección)',
    detail: 'Previene hemorragias del recién nacido. Se pone en las primeras horas tras el parto.' },
  { id: 'ojos', category: 'hospital', dueHours: 6, title: 'Pomada en los ojos',
    detail: 'Profilaxis de infecciones oculares. Se aplica en las primeras horas.' },
  { id: 'exploracion', category: 'hospital', dueHours: 48, title: 'Exploración completa del pediatra',
    detail: 'Corazón, caderas (Ortolani/Barlow), reflejo rojo de los ojos, genitales y reflejos. Antes del alta.', hasResult: true },
  { id: 'pulsiox', category: 'hospital', dueHours: 48, title: 'Pulsioximetría (cribado de cardiopatías)',
    detail: 'Un sensor en la mano y el pie mide el oxígeno. Se hace entre las 24 y 48 h de vida.', hasResult: true },
  { id: 'talon', category: 'hospital', dueHours: 72, title: 'Prueba del talón (cribado metabólico)',
    detail: 'Unas gotas de sangre del talón entre las 24 y 72 h. Si no recibís carta o llamada, es que ha salido normal; guardad el resguardo.', hasResult: true },
  { id: 'audicion', category: 'hospital', dueHours: 72, title: 'Cribado auditivo',
    detail: 'Otoemisiones o potenciales evocados, mientras duerme. Que no lo pase a la primera en un oído es frecuente: se repite en unas semanas.', hasResult: true },
  { id: 'grupo', category: 'hospital', title: 'Grupo sanguíneo y Coombs (si lo hacen)',
    detail: 'Se suele hacer si la madre es grupo 0 o Rh negativo. Apuntadlo en la ficha médica.', hasResult: true,
    link: { to: '/ficha', label: 'Abrir ficha médica' } },
  { id: 'informe', category: 'hospital', dueHours: 72, title: 'Recoger el informe de alta',
    detail: 'Del bebé y de la madre. Lo pedirán en el pediatra y en el registro. Hacedle una foto.' },

  // Primeros días
  { id: 'pis', category: 'cuidados', dueHours: 24, title: 'Primer pis',
    detail: 'Debería hacer pis en las primeras 24 h. Apuntad los pañales en el registro.',
    link: { to: '/herramientas/registro', label: 'Abrir registro' } },
  { id: 'meconio', category: 'cuidados', dueHours: 48, title: 'Primera caca (meconio)',
    detail: 'Negra y pegajosa, en las primeras 48 h. Luego se vuelve verdosa y después amarilla.' },
  { id: 'tomas', category: 'cuidados', dueHours: 72, title: '8-12 tomas al día',
    detail: 'No dejéis pasar más de 3-4 h sin que coma, aunque haya que despertarlo. Tatuś te avisa desde Inicio.',
    link: { to: '/herramientas/registro', label: 'Apuntar tomas' } },
  { id: 'peso-alta', category: 'cuidados', dueHours: 72, title: 'Apuntar el peso al alta',
    detail: 'Es normal que pierda hasta un 7-10 % los primeros días.',
    link: { to: '/crecimiento', label: 'Abrir crecimiento' } },
  { id: 'silla', category: 'cuidados', dueHours: 72, title: 'Silla del coche bien instalada para el alta',
    detail: 'Grupo 0+/i-Size, siempre a contramarcha y con el arnés ajustado (sin abrigo gordo debajo).' },
  { id: 'pediatra', category: 'cuidados', dueHours: 5 * D, title: 'Primera visita al pediatra y la matrona',
    detail: 'Entre los 3 y 5 días de vida: peso, ictericia, cordón y lactancia. Pedid cita nada más llegar a casa.',
    link: { to: '/herramientas/citas', label: 'Apuntar cita' } },
  { id: 'vit-d', category: 'cuidados', dueHours: 15 * D, title: 'Vitamina D (400 UI al día)',
    detail: 'Recomendada en lactancia materna desde los primeros días, cuando la indique el pediatra.' },
  { id: 'recupera-peso', category: 'cuidados', dueHours: 15 * D, title: 'Recupera su peso de nacimiento',
    detail: 'Hacia los 10-15 días. Si no, el pediatra revisará la lactancia.' },
  { id: 'cordon', category: 'cuidados', dueHours: 21 * D, title: 'Se cae el cordón',
    detail: 'Limpio y seco (agua y jabón, sin alcohol obligatorio). Suele caer entre los 5 y 15 días. Consulta si huele mal, supura o la piel alrededor se pone roja.' },

  // Papeleo
  { id: 'empresa', category: 'tramites', dueHours: 3 * D, title: 'Avisar a las empresas',
    detail: 'Comunicad el nacimiento para que empiecen los permisos.' },
  { id: 'registro', category: 'tramites', dueHours: 10 * D, title: 'Inscripción en el Registro Civil',
    detail: 'Normalmente la tramita el hospital en 72 h con el formulario que firmáis allí. Si no, tenéis 10 días para hacerlo en el Registro Civil.' },
  { id: 'tarjeta', category: 'tramites', dueHours: 15 * D, title: 'Alta en la Seguridad Social y tarjeta sanitaria',
    detail: 'Como beneficiario de uno de los dos, y asignación de pediatra en vuestro centro de salud.' },
  { id: 'prestacion', category: 'tramites', dueHours: 15 * D, title: 'Pedir la prestación por nacimiento (los dos)',
    detail: 'En la sede electrónica de la Seguridad Social. Las primeras 6 semanas tras el parto son obligatorias y a jornada completa para cada progenitor.' },
  { id: 'padron', category: 'tramites', dueHours: 30 * D, title: 'Empadronar al bebé',
    detail: 'En vuestro ayuntamiento, con el certificado o libro de familia digital.' },
  { id: 'seguro', category: 'tramites', dueHours: 30 * D, title: 'Seguro médico privado (si tenéis)',
    detail: 'Muchas aseguradoras dan 30 días para incluirlo sin carencias.' },
  { id: 'ayudas', category: 'tramites', title: 'Revisar ayudas de vuestra comunidad y la deducción por maternidad',
    detail: 'Cheque bebé, ayudas autonómicas o municipales y el abono anticipado de la deducción.' },

  // Mamá
  { id: 'medicacion', category: 'mama', dueHours: 1 * D, title: 'Apuntar la medicación del alta',
    detail: 'Analgésicos, hierro, heparina… Tatuś avisa de la próxima toma.',
    link: { to: '/herramientas/medicacion', label: 'Abrir medicación' } },
  { id: 'matrona-mama', category: 'mama', dueHours: 10 * D, title: 'Revisión de la matrona (puerperio)',
    detail: 'Entre los 7 y 10 días: puntos o cicatriz, sangrado, pecho y estado de ánimo.' },
  { id: 'cuarentena', category: 'mama', dueHours: 42 * D, title: 'Revisión de la cuarentena',
    detail: 'Hacia las 6 semanas. Buen momento para hablar de suelo pélvico y anticoncepción.' },
]

export type TaskState = 'done' | 'overdue' | 'now' | 'week' | 'later' | 'anytime'

const H = 3_600_000

export function taskDueAt(task: NewbornTask, birth: Date): Date | undefined {
  return task.dueHours === undefined ? undefined : new Date(+new Date(birth) + task.dueHours * H)
}

/** En qué grupo cae una tarea: vencida, próximas 48 h, esta semana, más adelante. */
export function taskState(task: NewbornTask, birth: Date, done: boolean, now = new Date()): TaskState {
  if (done) return 'done'
  const due = taskDueAt(task, birth)
  if (!due) return 'anytime'
  const left = +due - +now
  if (left < 0) return 'overdue'
  if (left <= 48 * H) return 'now'
  if (left <= 7 * 24 * H) return 'week'
  return 'later'
}

/** «antes de las 16:01», «antes de mañana a las 9:00», «tocaba hace 3 h». */
export function dueLabel(due: Date, now = new Date()): string {
  const diff = +due - +now
  const sameDay = new Date(due).toDateString() === now.toDateString()
  const time = new Date(due).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  if (diff < 0) {
    const h = Math.round(-diff / H)
    return h < 24 ? `tocaba hace ${Math.max(1, h)} h` : `tocaba hace ${Math.round(h / 24)} días`
  }
  if (sameDay) return `antes de las ${time}`
  if (diff < 48 * H) return `antes de mañana a las ${time}`
  return `antes del ${new Date(due).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

/** Días durante los que la guía del recién nacido aparece en Inicio. */
export const NEWBORN_HOME_DAYS = 45

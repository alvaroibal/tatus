/**
 * Hitos del desarrollo por edad, adaptados de "Learn the Signs. Act Early" (CDC/AAP, revisión 2022).
 * Cada hito lo alcanzan 3 de cada 4 niños a esa edad: no lograrlo en la fecha exacta no es un diagnóstico,
 * pero sí un buen motivo para comentarlo en la revisión.
 */

export type MilestoneArea = 'social' | 'lenguaje' | 'cognitivo' | 'motor'

export interface MilestoneGroup {
  months: number
  label: string
  items: { id: string; area: MilestoneArea; text: string }[]
}

export const AREA_LABELS: Record<MilestoneArea, string> = {
  social: 'Social y emocional',
  lenguaje: 'Lenguaje y comunicación',
  cognitivo: 'Aprender y pensar',
  motor: 'Movimiento',
}

function grp(months: number, label: string, items: [MilestoneArea, string][]): MilestoneGroup {
  return { months, label, items: items.map(([area, text], i) => ({ id: `m${months}-${i + 1}`, area, text })) }
}

export const MILESTONES: MilestoneGroup[] = [
  grp(2, '2 meses', [
    ['social', 'Se calma cuando le hablas o le coges'],
    ['social', 'Sonríe cuando le hablas o le sonríes'],
    ['lenguaje', 'Hace sonidos además del llanto'],
    ['lenguaje', 'Reacciona a ruidos fuertes'],
    ['cognitivo', 'Te sigue con la mirada cuando te mueves'],
    ['motor', 'Levanta la cabeza cuando está boca abajo'],
    ['motor', 'Mueve los dos brazos y las dos piernas'],
  ]),
  grp(4, '4 meses', [
    ['social', 'Sonríe por su cuenta para llamar tu atención'],
    ['social', 'Se ríe (aún no a carcajadas) cuando juegas con él'],
    ['lenguaje', 'Hace sonidos como "oooo" o "aahh"'],
    ['lenguaje', 'Gira la cabeza hacia tu voz'],
    ['cognitivo', 'Se mira las manos con interés'],
    ['motor', 'Sostiene la cabeza firme sin apoyo cuando le coges'],
    ['motor', 'Agarra un juguete si se lo pones en la mano'],
    ['motor', 'Se apoya en codos o antebrazos boca abajo'],
  ]),
  grp(6, '6 meses', [
    ['social', 'Reconoce a las personas de su entorno'],
    ['social', 'Le gusta mirarse en el espejo'],
    ['lenguaje', 'Se turna contigo haciendo sonidos'],
    ['lenguaje', 'Hace pedorretas y chilla'],
    ['cognitivo', 'Se lleva las cosas a la boca para explorarlas'],
    ['cognitivo', 'Estira el brazo para coger un juguete'],
    ['motor', 'Se da la vuelta de boca abajo a boca arriba'],
    ['motor', 'Se sienta apoyándose en las manos'],
  ]),
  grp(9, '9 meses', [
    ['social', 'Se pone tímido o nervioso con desconocidos'],
    ['social', 'Reacciona cuando te vas (te busca o llora)'],
    ['lenguaje', 'Balbucea "mamamama", "babababa"'],
    ['lenguaje', 'Levanta los brazos para que le cojas'],
    ['cognitivo', 'Busca algo que se le ha caído'],
    ['cognitivo', 'Golpea dos objetos entre sí'],
    ['motor', 'Se sienta sin apoyo'],
    ['motor', 'Se pasa objetos de una mano a otra'],
  ]),
  grp(12, '12 meses', [
    ['social', 'Juega a juegos como "palmas palmitas"'],
    ['lenguaje', 'Dice adiós con la mano'],
    ['lenguaje', 'Llama a sus padres "mamá", "papá" o con otro nombre especial'],
    ['lenguaje', 'Entiende el "no" (se para un momento)'],
    ['cognitivo', 'Busca algo que has escondido delante de él'],
    ['motor', 'Se pone de pie agarrándose'],
    ['motor', 'Camina agarrado a los muebles'],
    ['motor', 'Coge cosas pequeñas con el pulgar y el índice'],
  ]),
  grp(15, '15 meses', [
    ['social', 'Te enseña un objeto que le gusta'],
    ['social', 'Aplaude cuando está contento'],
    ['lenguaje', 'Intenta decir 1 o 2 palabras además de mamá/papá'],
    ['lenguaje', 'Señala para pedir algo o pedir ayuda'],
    ['cognitivo', 'Intenta usar los objetos como se usan (teléfono, taza, libro)'],
    ['motor', 'Da algunos pasos solo'],
    ['motor', 'Come solo con los dedos'],
  ]),
  grp(18, '18 meses', [
    ['social', 'Se aleja un poco de ti pero comprueba que sigues cerca'],
    ['social', 'Señala para enseñarte algo interesante'],
    ['lenguaje', 'Intenta decir 3 o más palabras además de mamá/papá'],
    ['lenguaje', 'Sigue una orden sencilla sin gestos ("dámelo")'],
    ['cognitivo', 'Imita tareas de casa (barrer, limpiar)'],
    ['motor', 'Camina sin agarrarse'],
    ['motor', 'Garabatea'],
    ['motor', 'Intenta comer con cuchara'],
  ]),
  grp(24, '2 años', [
    ['social', 'Se da cuenta cuando alguien está triste o se ha hecho daño'],
    ['lenguaje', 'Dice al menos dos palabras juntas ("más agua")'],
    ['lenguaje', 'Señala al menos dos partes del cuerpo cuando se las nombras'],
    ['lenguaje', 'Usa gestos como lanzar un beso o decir sí con la cabeza'],
    ['cognitivo', 'Juega con más de un juguete a la vez'],
    ['motor', 'Da patadas a una pelota'],
    ['motor', 'Corre'],
    ['motor', 'Sube algunos escalones caminando'],
  ]),
  grp(30, '30 meses', [
    ['social', 'Juega al lado de otros niños y a veces con ellos'],
    ['social', 'Te enseña lo que sabe hacer ("¡mira!")'],
    ['lenguaje', 'Dice unas 50 palabras'],
    ['lenguaje', 'Dice "yo", "mí" o "nosotros"'],
    ['cognitivo', 'Juega a imaginar (un bloque es comida)'],
    ['cognitivo', 'Sigue instrucciones de dos pasos'],
    ['motor', 'Salta con los dos pies'],
    ['motor', 'Pasa páginas de una en una'],
  ]),
  grp(36, '3 años', [
    ['social', 'Se calma en unos 10 minutos cuando le dejas en la escuela'],
    ['social', 'Se une a otros niños para jugar'],
    ['lenguaje', 'Mantiene una conversación con al menos dos intercambios'],
    ['lenguaje', 'Pregunta "qué", "dónde", "por qué"'],
    ['lenguaje', 'Se le entiende la mayor parte de lo que dice'],
    ['cognitivo', 'Copia un círculo'],
    ['motor', 'Se pone ropa sencilla solo'],
    ['motor', 'Come con tenedor'],
  ]),
]

export const MILESTONE_LIST_ID = 'hitos'

/** Grupo que toca revisar ahora: el último cuya edad ya se ha cumplido. */
export function currentMilestoneGroup(ageMonths: number): MilestoneGroup | undefined {
  return [...MILESTONES].reverse().find(g => ageMonths >= g.months)
}

/** Siguiente grupo por llegar (para "lo que viene"). */
export function nextMilestoneGroup(ageMonths: number): MilestoneGroup | undefined {
  return MILESTONES.find(g => g.months > ageMonths)
}

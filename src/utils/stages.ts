import stagesData from '../data/stages.json'
import toddlerData from '../data/toddler_stages.json'
import type { Stage } from './getStage'

/** Semanas 0-51 (una por semana) + bloques de 1 a 5 años. */
export const ALL_STAGES: Stage[] = [...(stagesData as Stage[]), ...(toddlerData as Stage[])]

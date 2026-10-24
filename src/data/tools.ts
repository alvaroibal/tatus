import type { IconName } from '../components/Icon'

export interface ToolDef {
  id: string
  to: string
  icon: IconName
  title: string
  short: string
  subtitle: string
  from: number  // lifeWeek (ver guides.ts)
  to_: number
}

export const TOOLS: ToolDef[] = [
  { id: 'fertilidad', short: 'Ciclo', to: '/herramientas/fertilidad', icon: 'sprout', title: 'Días fértiles', subtitle: 'Ventana fértil y fecha del test', from: -80, to_: -36 },
  { id: 'fecha-parto', short: 'Fecha parto', to: '/herramientas/fecha-parto', icon: 'calendar', title: 'Fecha probable de parto', subtitle: 'Semanas de embarazo y fechas clave', from: -80, to_: -1 },
  { id: 'patadas', short: 'Movimientos', to: '/herramientas/patadas', icon: 'move', title: '¿Se mueve menos?', subtitle: 'Qué es normal y cuándo consultar', from: -16, to_: 0 },
  { id: 'contracciones', short: 'Contracc.', to: '/herramientas/contracciones', icon: 'timer', title: 'Contracciones', subtitle: 'Temporizador con regla 5-1-1', from: -6, to_: 0 },
  { id: 'registro', short: 'Registro', to: '/herramientas/registro', icon: 'bottle', title: 'Registro diario', subtitle: 'Tomas, pañales, sueño y medicinas', from: 0, to_: 156 },
  { id: 'crecimiento', short: 'Crecer', to: '/crecimiento', icon: 'chart', title: 'Crecimiento', subtitle: 'Peso, talla, cabeza y percentiles OMS', from: 0, to_: 520 },
  { id: 'desarrollo', short: 'Hitos', to: '/herramientas/desarrollo', icon: 'sparkles', title: 'Hitos del desarrollo', subtitle: 'Qué suele hacer a su edad', from: 4, to_: 200 },
  { id: 'alimentos', short: 'Alimentos', to: '/herramientas/alimentos', icon: 'utensils', title: 'Primeros alimentos', subtitle: 'Lo que ha probado y alérgenos', from: 18, to_: 156 },
  { id: 'vacunas', short: 'Vacunas', to: '/vacunas', icon: 'syringe', title: 'Vacunas', subtitle: 'Calendario y control de dosis', from: -4, to_: 520 },
  { id: 'dosis', short: 'Dosis', to: '/herramientas/dosis', icon: 'pill', title: 'Dosis según prospecto', subtitle: 'Paracetamol e ibuprofeno por peso', from: 12, to_: 520 },
  { id: 'citas', short: 'Citas', to: '/herramientas/citas', icon: 'stethoscope', title: 'Citas', subtitle: 'Ecos, pediatra y revisiones', from: -80, to_: 520 },
  { id: 'resumen', short: 'Resumen', to: '/herramientas/resumen', icon: 'document', title: 'Resumen para el pediatra', subtitle: 'Últimos 7 días, peso y dudas', from: 0, to_: 520 },
  { id: 'ficha', short: 'Ficha', to: '/ficha', icon: 'shield', title: 'Ficha médica', subtitle: 'Alergias, grupo sanguíneo, contactos', from: -4, to_: 520 },
  { id: 'checklists', short: 'Listas', to: '/herramientas/checklist', icon: 'checklist', title: 'Checklists', subtitle: 'Bolsa del hospital, trámites, casa segura…', from: -80, to_: 520 },
]

export function getTool(id: string): ToolDef {
  return TOOLS.find(t => t.id === id)!
}

/**
 * La pestaña central de la barra cambia según la etapa: lo que más se usa en cada momento.
 */
export function contextualTool(phase: string | undefined, currentWeek: number): ToolDef {
  if (phase === 'trying') return getTool('fertilidad')
  if (currentWeek < 0) return currentWeek >= -4 ? getTool('contracciones') : getTool('citas')
  if (currentWeek < 156) return getTool('registro')
  return getTool('crecimiento')
}

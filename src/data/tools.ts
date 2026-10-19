export interface ToolDef {
  id: string
  to: string
  emoji: string
  title: string
  short: string
  subtitle: string
  from: number  // lifeWeek (ver guides.ts)
  to_: number
}

export const TOOLS: ToolDef[] = [
  { id: 'fertilidad', short: 'Días fértiles', to: '/herramientas/fertilidad', emoji: '📅', title: 'Días fértiles', subtitle: 'Ventana fértil y fecha del test', from: -80, to_: -36 },
  { id: 'fecha-parto', short: 'Fecha parto', to: '/herramientas/fecha-parto', emoji: '🗓️', title: 'Fecha probable de parto', subtitle: 'Semanas de embarazo y fechas clave', from: -80, to_: -1 },
  { id: 'patadas', short: 'Patadas', to: '/herramientas/patadas', emoji: '🦶', title: 'Movimientos del bebé', subtitle: 'Cuenta 10 movimientos', from: -12, to_: 0 },
  { id: 'contracciones', short: 'Contracc.', to: '/herramientas/contracciones', emoji: '⏱️', title: 'Contracciones', subtitle: 'Temporizador con regla 5-1-1', from: -6, to_: 0 },
  { id: 'registro', short: 'Registro', to: '/herramientas/registro', emoji: '🍼', title: 'Registro diario', subtitle: 'Tomas, pañales, sueño y medicinas', from: 0, to_: 156 },
  { id: 'crecimiento', short: 'Crecer', to: '/crecimiento', emoji: '📈', title: 'Crecimiento', subtitle: 'Peso, talla y percentiles OMS', from: 0, to_: 520 },
  { id: 'vacunas', short: 'Vacunas', to: '/vacunas', emoji: '💉', title: 'Vacunas', subtitle: 'Calendario y control de dosis', from: -4, to_: 520 },
  { id: 'dosis', short: 'Dosis', to: '/herramientas/dosis', emoji: '💊', title: 'Dosis orientativa', subtitle: 'Paracetamol e ibuprofeno por peso', from: 12, to_: 520 },
  { id: 'citas', short: 'Citas', to: '/herramientas/citas', emoji: '🩺', title: 'Citas', subtitle: 'Ecos, pediatra y revisiones', from: -80, to_: 520 },
  { id: 'checklists', short: 'Listas', to: '/herramientas/checklist', emoji: '✅', title: 'Checklists', subtitle: 'Bolsa del hospital, trámites, casa segura…', from: -80, to_: 520 },
]

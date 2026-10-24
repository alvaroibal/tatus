export interface Region {
  code: string
  name: string
}

export const REGIONS: Region[] = [
  { code: 'AN', name: 'Andalucía' },
  { code: 'AR', name: 'Aragón' },
  { code: 'AS', name: 'Asturias' },
  { code: 'IB', name: 'Illes Balears' },
  { code: 'CN', name: 'Canarias' },
  { code: 'CB', name: 'Cantabria' },
  { code: 'CL', name: 'Castilla y León' },
  { code: 'CM', name: 'Castilla-La Mancha' },
  { code: 'CT', name: 'Cataluña' },
  { code: 'VC', name: 'Comunitat Valenciana' },
  { code: 'EX', name: 'Extremadura' },
  { code: 'GA', name: 'Galicia' },
  { code: 'MD', name: 'Comunidad de Madrid' },
  { code: 'MC', name: 'Región de Murcia' },
  { code: 'NC', name: 'Navarra' },
  { code: 'PV', name: 'País Vasco' },
  { code: 'RI', name: 'La Rioja' },
  { code: 'CE', name: 'Ceuta' },
  { code: 'ML', name: 'Melilla' },
]

export function regionName(code: string | undefined): string | undefined {
  return REGIONS.find(r => r.code === code)?.name
}

/**
 * Diferencias conocidas respecto al calendario común 2026.
 * Hepatitis A: solo Cataluña, Ceuta y Melilla la tenían en calendario antes de la recomendación AEP 2026.
 */
export function vaccineRegionNote(vaccineName: string, region: string | undefined): string | null {
  if (vaccineName.startsWith('Hepatitis A')) {
    if (!region) return 'Recomendada por la AEP desde 2026. Indica tu comunidad en Ajustes para saber si está financiada.'
    return ['CT', 'CE', 'ML'].includes(region)
      ? `Incluida en el calendario de ${regionName(region)}.`
      : `Recomendada por la AEP, pero puede no estar aún en el calendario de ${regionName(region)}: pregunta en tu centro de salud.`
  }
  return null
}

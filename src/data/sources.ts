/** Fuentes oficiales citadas en la Guía. Se enlaza a la portada de cada organismo para que el enlace no caduque. */

export interface Source {
  name: string
  org: string
  url: string
}

export const SOURCES = {
  enfamilia: { name: 'En Familia', org: 'Asociación Española de Pediatría (AEP)', url: 'https://enfamilia.aeped.es' },
  familiaysalud: { name: 'Familia y Salud', org: 'Asociación Española de Pediatría de Atención Primaria (AEPap)', url: 'https://www.familiaysalud.es' },
  cavaep: { name: 'Calendario de vacunaciones 2026', org: 'Comité Asesor de Vacunas de la AEP', url: 'https://vacunasaep.org' },
  sanidadVacunas: { name: 'Calendario común de vacunación a lo largo de toda la vida 2026', org: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/areas/promocionPrevencion/vacunaciones/calendario/docs/CalendarioVacunacion_Todalavida.pdf' },
  aesan: { name: 'Recomendaciones de consumo y alimentación infantil', org: 'Agencia Española de Seguridad Alimentaria y Nutrición (AESAN)', url: 'https://www.aesan.gob.es' },
  ihan: { name: 'Iniciativa para la Humanización de la Asistencia al Nacimiento y la Lactancia', org: 'IHAN España (OMS/UNICEF)', url: 'https://www.ihan.es' },
  aepLactancia: { name: 'Comité de Lactancia Materna', org: 'Asociación Española de Pediatría (AEP)', url: 'https://www.aeped.es' },
  guiasalud: { name: 'Guía de práctica clínica de atención en el embarazo y puerperio', org: 'GuíaSalud · Ministerio de Sanidad', url: 'https://portal.guiasalud.es' },
  sego: { name: 'Información para pacientes', org: 'Sociedad Española de Ginecología y Obstetricia (SEGO)', url: 'https://sego.es' },
  oms: { name: 'Patrones de crecimiento infantil', org: 'Organización Mundial de la Salud', url: 'https://www.who.int/tools/child-growth-standards' },
  cdcHitos: { name: 'Learn the Signs. Act Early (hitos del desarrollo, revisión 2022)', org: 'CDC (EE. UU.) / AAP', url: 'https://www.cdc.gov/ncbddd/actearly/' },
  segSocial: { name: 'Prestación por nacimiento y cuidado de menor', org: 'Seguridad Social', url: 'https://www.seg-social.es' },
  boe: { name: 'Real Decreto-ley 9/2025 (permisos por nacimiento)', org: 'Boletín Oficial del Estado', url: 'https://www.boe.es' },
  dgt: { name: 'Sistemas de retención infantil', org: 'Dirección General de Tráfico (DGT)', url: 'https://www.dgt.es' },
  aemps: { name: 'Fichas técnicas y prospectos (CIMA)', org: 'Agencia Española de Medicamentos (AEMPS)', url: 'https://cima.aemps.es' },
  toxicologia: { name: 'Servicio de Información Toxicológica', org: 'Instituto Nacional de Toxicología', url: 'https://www.mjusticia.gob.es' },
  linea024: { name: 'Línea 024 de atención a la conducta suicida', org: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/linea024/' },
  erc: { name: 'Guías de reanimación pediátrica', org: 'Consejo Español de RCP / European Resuscitation Council', url: 'https://www.cercp.org' },
} satisfies Record<string, Source>

export type SourceId = keyof typeof SOURCES

/** Mes en que se revisó por última vez el contenido contra estas fuentes. */
export const CONTENT_REVIEWED = 'octubre de 2026'

/** Cuando un profesional sanitario revise la Guía, pon aquí su nombre y colegiado. */
export const CLINICAL_REVIEWER: string | null = null

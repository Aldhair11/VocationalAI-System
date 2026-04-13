/** Notas alineadas con GradesDTO del backend (camelCase; Jackson acepta alias). */
export const GRADE_KEYS = [
  "notaMatematica",
  "notaComunicacion",
  "notaCienciaTecnologia",
  "notaCienciasSociales",
  "notaIngles",
  "notaArteCultura",
  "notaEducacionFisica",
  "notaDesarrolloPersonal",
] as const

export type GradesMap = Record<(typeof GRADE_KEYS)[number], number>

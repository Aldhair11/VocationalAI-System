import type { GradesMap } from "@/lib/types/grades"

/** Etiquetas para UI (nunca muestra llaves JSON crudas) */
export const GRADE_LABELS: Record<keyof GradesMap, string> = {
  notaMatematica: "Matemática",
  notaComunicacion: "Comunicación",
  notaCienciaTecnologia: "Ciencia y Tecnología",
  notaCienciasSociales: "Ciencias Sociales",
  notaIngles: "Inglés",
  notaArteCultura: "Arte y Cultura",
  notaEducacionFisica: "Educación Física",
  notaDesarrolloPersonal: "Desarrollo Personal",
}

export function labelForGradeKey(key: keyof GradesMap): string {
  return GRADE_LABELS[key] ?? key
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Fecha ISO del lunes de la semana a la que pertenece `date`. */
export function mondayOf(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - sinceMonday);
  return toIso(copy);
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

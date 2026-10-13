// Data de criação da OS informada no formulário (YYYY-MM-DD, dia do calendário do usuário)

/** Data local como YYYY-MM-DD (o que o <input type="date"> usa). */
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * YYYY-MM-DD -> instante gravado. Meio-dia UTC: cai no mesmo dia em qualquer fuso do Brasil
 * (09:00 em UTC-3), então a listagem e os filtros por período não deslocam o dia.
 */
export function orderDateFromInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`)
}

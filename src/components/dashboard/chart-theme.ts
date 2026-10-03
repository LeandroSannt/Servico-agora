// Valores da paleta de referência da skill dataviz (validada em modo claro).
export const CHART_COLORS = {
  series: '#2a78d6',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  secondary: '#52514e',
}

// Ordem fixa por status; cores validadas pelo validador da skill (adjacentes CVD ΔE ≥ 9).
export const STATUS_SERIES = [
  { key: 'ordersReceived', label: 'Recebido', color: '#2a78d6' },
  { key: 'ordersInProgress', label: 'Em Andamento', color: '#eb6834' },
  { key: 'ordersPaused', label: 'Pausado', color: '#1baf7a' },
  { key: 'ordersFinished', label: 'Finalizado', color: '#eda100' },
  { key: 'ordersPaid', label: 'Pago', color: '#e87ba4' },
] as const

export const axisTick = { fontSize: 12, fill: CHART_COLORS.muted }

export const tooltipContentStyle = {
  borderRadius: 8,
  border: `1px solid ${CHART_COLORS.grid}`,
  boxShadow: '0 4px 12px rgba(11,11,11,0.08)',
  fontSize: 12,
  color: CHART_COLORS.ink,
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatBRLCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatPeriod(period: string, granularity: 'day' | 'month'): string {
  if (granularity === 'day') {
    const [, month, day] = period.split('-')
    return `${day}/${month}`
  }
  const [year, month] = period.split('-')
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`
}

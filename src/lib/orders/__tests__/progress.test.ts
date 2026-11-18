import { describe, it, expect } from 'vitest'
import { buildProgressSteps } from '../progress'

const base = { createdAt: '2026-11-01T12:00:00.000Z' }

describe('buildProgressSteps', () => {
  it('OS recebida: primeira etapa em curso, demais pendentes', () => {
    const steps = buildProgressSteps({ ...base, status: 'RECEIVED' })
    expect(steps.map((s) => s.state)).toEqual(['current', 'todo', 'todo', 'todo'])
    expect(steps[0].date).toBe(base.createdAt)
  })

  it('OS pausada fica na etapa de andamento com o rótulo Pausado', () => {
    const steps = buildProgressSteps({ ...base, status: 'PAUSED' })
    expect(steps[1]).toMatchObject({ label: 'Pausado', state: 'paused' })
    expect(steps.map((s) => s.state)).toEqual(['done', 'paused', 'todo', 'todo'])
  })

  it('OS finalizada mostra a data de finalização', () => {
    const steps = buildProgressSteps({ ...base, status: 'FINISHED', finishedAt: '2026-11-03T15:00:00.000Z' })
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo'])
    expect(steps[2].date).toBe('2026-11-03T15:00:00.000Z')
  })

  it('OS paga: todas as etapas concluídas', () => {
    const steps = buildProgressSteps({ ...base, status: 'PAID', paidAt: '2026-11-04T10:00:00.000Z' })
    expect(steps.every((s) => s.state === 'done')).toBe(true)
  })
})

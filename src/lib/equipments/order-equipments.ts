// Funções puras sobre equipamentos da OS: sem acesso a banco, podem ser importadas pelo client.

/** Ids de equipamentos pedidos em todas as linhas, sem repetir. */
export function collectEquipmentIds(items: { equipmentIds?: string[] | null }[]): string[] {
  return Array.from(new Set(items.flatMap((i) => i.equipmentIds ?? [])))
}

/**
 * Ids inválidos para a OS: não pertencem ao cliente, ou estão arquivados sem já estarem
 * vinculados à OS (na edição, um equipamento arquivado depois continua aceito).
 */
export function invalidEquipmentIds(
  requested: string[],
  owned: { id: string; isActive: boolean }[],
  alreadyLinked: Set<string>
): string[] {
  const byId = new Map(owned.map((e) => [e.id, e]))
  return requested.filter((id) => {
    const eq = byId.get(id)
    return !eq || (!eq.isActive && !alreadyLinked.has(id))
  })
}

type ServiceWithEquipments = { equipments?: { equipment: { id: string; name: string } }[] | null }

/** Nomes distintos dos equipamentos de todas as linhas, na ordem em que aparecem. */
export function orderEquipmentNames(services: ServiceWithEquipments[]): string[] {
  const seen = new Map<string, string>()
  for (const s of services) {
    for (const { equipment } of s.equipments ?? []) {
      if (!seen.has(equipment.id)) seen.set(equipment.id, equipment.name)
    }
  }
  return Array.from(new Set(seen.values()))
}

/** "A, B +2"; "—" quando vazio. */
export function summarizeNames(names: string[], max = 2): string {
  if (names.length === 0) return '—'
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}

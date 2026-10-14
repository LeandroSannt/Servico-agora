export const MAX_TAGS = 20
export const MAX_TAG_LENGTH = 60

/** Apara, colapsa espaços, remove vazios e duplicatas (sem diferenciar maiúsculas) e limita ao máximo. */
export function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    const label = raw.trim().replace(/\s+/g, ' ')
    if (!label) continue
    const key = label.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length === MAX_TAGS) break
  }
  return out
}

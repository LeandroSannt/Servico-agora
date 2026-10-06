import { z } from 'zod'

// Texto opcional: string vazia/espaços vira null (coluna nullable)
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))

export const equipmentSchema = z.object({
  name: z.string().trim().min(1, 'Nome do equipamento é obrigatório'),
  brand: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  notes: optionalText,
})

// PATCH: chave ausente fica ausente (não apaga o campo). Não reutilizar optionalText aqui:
// no Zod 4, .optional() em volta de .nullish().transform() roda o transform e devolve null.
const patchText = z
  .string()
  .trim()
  .nullable()
  .transform((v) => v || null)
  .optional()

export const updateEquipmentSchema = z.object({
  name: z.string().trim().min(1, 'Nome do equipamento é obrigatório').optional(),
  brand: patchText,
  model: patchText,
  serialNumber: patchText,
  notes: patchText,
  isActive: z.boolean().optional(),
})

export type EquipmentInput = z.input<typeof equipmentSchema>
export type EquipmentData = z.output<typeof equipmentSchema>
export type UpdateEquipmentData = z.output<typeof updateEquipmentSchema>

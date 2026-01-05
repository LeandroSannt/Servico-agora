import { z } from 'zod'

// Aceita string ou número e transforma para número
const priceSchema = z.union([
  z.string().transform((val) => parseFloat(val) || 0),
  z.number(),
]).pipe(z.number().min(0, 'Preço deve ser maior ou igual a zero'))

export const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: priceSchema,
  storeId: z.string().min(1, 'Loja é obrigatória'),
  isActive: z.boolean(),
})

// Tipo de entrada do formulário (pode receber string ou number)
export type ServiceFormData = {
  name: string
  description?: string
  price: number
  storeId: string
  isActive: boolean
}

import { z } from 'zod'

export const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  isActive: z.boolean(),
})

export type ServiceFormData = z.infer<typeof serviceSchema>

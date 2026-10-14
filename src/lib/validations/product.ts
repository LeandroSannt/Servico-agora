import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().optional().or(z.literal('')),
  price: z.coerce
    .number({ error: 'Informe o preço' })
    .min(0, 'Preço deve ser maior ou igual a zero')
    .transform((v) => Math.round(v * 100) / 100),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  isActive: z.boolean().optional(),
})
export type ProductFormData = z.input<typeof productSchema>

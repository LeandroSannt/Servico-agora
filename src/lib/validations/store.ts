import { z } from 'zod'

export const storeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

export type StoreFormData = z.infer<typeof storeSchema>

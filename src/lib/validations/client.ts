import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido'),
  document: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  isVip: z.boolean().optional(),
  vipCompanyName: z.string().trim().max(120, 'Máximo de 120 caracteres').optional().or(z.literal('')),
})

export type ClientFormData = z.infer<typeof clientSchema>

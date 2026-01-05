import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']),
  companyId: z.string().optional(),
  storeId: z.string().optional(),
})

export const userUpdateSchema = userSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
})

export type UserFormData = z.infer<typeof userSchema>
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>

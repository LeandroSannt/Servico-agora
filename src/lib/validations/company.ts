import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z
    .string()
    .min(14, 'CNPJ inválido')
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 14, 'CNPJ deve ter 14 dígitos'),
  managerName: z.string().min(2, 'Nome do gestor deve ter pelo menos 2 caracteres'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .transform((val) => val.replace(/\D/g, '')),
  email: z.string().email('Email inválido'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export type CompanyFormData = z.infer<typeof companySchema>

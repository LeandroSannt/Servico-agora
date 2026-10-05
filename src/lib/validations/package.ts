import { z } from 'zod'

// Aceita string (input com máscara) ou número
const positivePriceSchema = z
  .union([z.string().transform((val) => parseFloat(val) || 0), z.number()])
  .pipe(z.number().positive('Preço deve ser maior que zero'))

export const servicePackageSchema = z.object({
  storeId: z.string().min(1, 'Loja é obrigatória'),
  serviceId: z.string().min(1, 'Serviço é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(2, 'Quantidade mínima é 2'),
  price: positivePriceSchema,
  isActive: z.boolean().optional(),
})

// Loja e serviço são imutáveis após criar
export const servicePackageUpdateSchema = servicePackageSchema
  .omit({ storeId: true, serviceId: true })
  .partial()

export const sellPackageSchema = z.object({
  packageId: z.string().min(1, 'Pacote é obrigatório'),
  notes: z.string().max(500, 'Observação muito longa').optional(),
})

export type ServicePackageFormData = {
  storeId: string
  serviceId: string
  name: string
  description?: string
  quantity: number
  price: number
  isActive?: boolean
}
export type SellPackageFormData = z.infer<typeof sellPackageSchema>

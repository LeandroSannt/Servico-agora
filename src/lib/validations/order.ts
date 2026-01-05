import { z } from 'zod'

export const orderServiceSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, 'Nome do serviço é obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser pelo menos 1'),
  saveGlobally: z.boolean().optional(),
  isExisting: z.boolean().optional(), // Serviço já existe na OS (não deve ser salvo globalmente)
})

export const serviceOrderSchema = z.object({
  description: z.string().optional(),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  services: z.array(orderServiceSchema).min(1, 'Adicione pelo menos um serviço'),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'PAID']),
  pausedReason: z.string().optional(), // Motivo quando status = PAUSED
})

export type OrderServiceFormData = z.infer<typeof orderServiceSchema>
export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>
export type UpdateOrderStatusFormData = z.infer<typeof updateOrderStatusSchema>

import { z } from 'zod'

export const orderServiceSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, 'Nome do serviço é obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero'),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(1, 'Quantidade deve ser pelo menos 1'),
  saveGlobally: z.boolean().optional(),
  isExisting: z.boolean().optional(), // Serviço já existe na OS (não deve ser salvo globalmente)
  // Unidades deste item que saem do saldo de pacote do cliente (o servidor zera o preço)
  usePackageQuantity: z.coerce.number().int().min(0).optional(),
  // Equipamentos do cliente em que o serviço foi feito (sem duplicados)
  equipmentIds: z
    .array(z.string().min(1))
    .transform((ids) => Array.from(new Set(ids)))
    .optional(),
})

// Produto avulso (sem catálogo), digitado na OS
export const orderProductSchema = z.object({
  name: z.string().trim().min(1, 'Nome do produto é obrigatório'),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(1, 'Quantidade deve ser pelo menos 1'),
  // Arredonda a centavos: igual à coluna Decimal(10,2), para o total bater com os produtos gravados
  unitPrice: z.coerce
    .number()
    .min(0, 'Preço deve ser maior ou igual a zero')
    .transform((v) => Math.round(v * 100) / 100),
})

export const serviceOrderSchema = z
  .object({
    description: z.string().optional(),
    clientId: z.string().min(1, 'Cliente é obrigatório'),
    storeId: z.string().min(1, 'Loja é obrigatória'),
    services: z.array(orderServiceSchema),
    products: z.array(orderProductSchema).default([]),
  })
  // path em services: o OrderForm mostra o erro onde já mostrava "pelo menos um serviço"
  .refine((d) => d.services.length + d.products.length > 0, {
    message: 'Adicione pelo menos um serviço ou produto',
    path: ['services'],
  })

export const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'PAID']),
  pausedReason: z.string().optional(), // Motivo quando status = PAUSED
})

export type OrderServiceFormData = z.infer<typeof orderServiceSchema>
export type OrderProductFormData = z.infer<typeof orderProductSchema>
export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>
export type UpdateOrderStatusFormData = z.infer<typeof updateOrderStatusSchema>

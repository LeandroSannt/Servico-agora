import type {
  User,
  Client,
  Service,
  ServiceOrder,
  OrderService,
  Store,
  Company,
  UserRole,
  OrderStatus,
} from '@prisma/client'

// Re-exportando tipos do Prisma
export type {
  User,
  Client,
  Service,
  ServiceOrder,
  OrderService,
  Store,
  Company,
  UserRole,
  OrderStatus,
}

// Tipos com relações
export type ServiceOrderWithRelations = ServiceOrder & {
  client: Client
  store: Store
  createdBy: User
  services: OrderService[]
}

export type ServiceOrderListItem = ServiceOrder & {
  client: Pick<Client, 'id' | 'name'>
  store: Pick<Store, 'id' | 'name'>
}

// DTOs para criação/atualização
export type CreateServiceOrderInput = {
  description?: string
  clientId: string
  storeId: string
  services: {
    serviceId?: string
    serviceName: string
    description?: string
    price: number
    quantity: number
    saveGlobally?: boolean
    isExisting?: boolean
  }[]
}

export type UpdateServiceOrderInput = Partial<CreateServiceOrderInput> & {
  status?: OrderStatus
}

export type CreateClientInput = {
  name: string
  email?: string
  phone: string
  document?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  notes?: string
  storeId: string
}

export type UpdateClientInput = Partial<CreateClientInput>

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role?: UserRole
  phone?: string
  companyId?: string
  storeId?: string
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
  password?: string
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatDocument(doc: string): string {
  const cleaned = doc.replace(/\D/g, '')
  if (cleaned.length === 14) return formatCNPJ(doc)
  if (cleaned.length === 11) return formatCPF(doc)
  return doc
}

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `OS${year}${month}${random}`
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  STARTED: 'Iniciado',
  WAITING: 'Aguardando',
  FINISHED: 'Finalizado',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  STARTED: 'bg-blue-100 text-blue-800',
  WAITING: 'bg-yellow-100 text-yellow-800',
  FINISHED: 'bg-green-100 text-green-800',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Admin da Empresa',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Funcionário',
}

// Mask types
export type MaskType = 'phone' | 'cpf' | 'cnpj' | 'cpfCnpj' | 'cep' | 'currency'

// Apply mask to input value
export function applyMask(value: string, mask: MaskType): string {
  const cleaned = value.replace(/\D/g, '')

  switch (mask) {
    case 'phone':
      return applyPhoneMask(cleaned)
    case 'cpf':
      return applyCpfMask(cleaned)
    case 'cnpj':
      return applyCnpjMask(cleaned)
    case 'cpfCnpj':
      return applyCpfCnpjMask(cleaned)
    case 'cep':
      return applyCepMask(cleaned)
    case 'currency':
      return applyCurrencyMask(cleaned)
    default:
      return value
  }
}

function applyPhoneMask(value: string): string {
  const limited = value.slice(0, 11)
  if (limited.length <= 2) return limited
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
  }
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
}

function applyCpfMask(value: string): string {
  const limited = value.slice(0, 11)
  if (limited.length <= 3) return limited
  if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`
  if (limited.length <= 9) {
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`
  }
  return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`
}

function applyCnpjMask(value: string): string {
  const limited = value.slice(0, 14)
  if (limited.length <= 2) return limited
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`
  if (limited.length <= 8) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`
  }
  if (limited.length <= 12) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`
  }
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`
}

function applyCpfCnpjMask(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 11) {
    return applyCpfMask(cleaned)
  }
  return applyCnpjMask(cleaned)
}

function applyCepMask(value: string): string {
  const limited = value.slice(0, 8)
  if (limited.length <= 5) return limited
  return `${limited.slice(0, 5)}-${limited.slice(5)}`
}

function applyCurrencyMask(value: string): string {
  if (!value) return ''
  const numericValue = parseInt(value, 10)
  if (isNaN(numericValue)) return ''
  const formatted = (numericValue / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `R$ ${formatted}`
}

// Parse masked value to raw value (for form submission)
export function unmaskValue(value: string, mask: MaskType): string {
  if (mask === 'currency') {
    const numericString = value.replace(/\D/g, '')
    const numericValue = parseInt(numericString, 10)
    if (isNaN(numericValue)) return '0'
    return (numericValue / 100).toString()
  }
  return value.replace(/\D/g, '')
}

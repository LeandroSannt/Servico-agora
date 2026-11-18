import { randomBytes } from 'crypto'

/** 18 bytes aleatórios = 24 caracteres base64url (144 bits): impossível de adivinhar. */
export function generatePublicToken(): string {
  return randomBytes(18).toString('base64url')
}

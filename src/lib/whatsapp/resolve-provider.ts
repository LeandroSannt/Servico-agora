import type { WhatsAppConfig } from '@prisma/client'
import { EvolutionProvider } from './providers/evolution'
import { MetaProvider } from './providers/meta'
import { MetaMockProvider } from './providers/meta-mock'
import type { MessagingProvider } from './types'

export const isMetaMock = () => process.env.META_MOCK === 'true'

const metaApiVersion = () => process.env.META_GRAPH_API_VERSION || 'v21.0'

// Provedor a partir da configuração da empresa
export function providerForConfig(config: WhatsAppConfig): MessagingProvider {
  if (config.provider === 'META') {
    if (isMetaMock()) return new MetaMockProvider()
    return new MetaProvider({
      phoneNumberId: config.metaPhoneNumberId ?? '',
      wabaId: config.metaWabaId ?? '',
      accessToken: config.metaAccessToken ?? '',
      appId: config.metaAppId ?? undefined,
      apiVersion: metaApiVersion(),
    })
  }
  return new EvolutionProvider({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey ?? '',
    instanceName: config.instanceName ?? '',
  })
}

// Provedor global do .env (quando a empresa não tem configuração). null se não há credenciais.
export function globalProvider(): MessagingProvider | null {
  const provider = (process.env.WHATSAPP_PROVIDER || 'EVOLUTION').toUpperCase()

  if (provider === 'META') {
    if (isMetaMock()) return new MetaMockProvider()
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID
    const accessToken = process.env.META_ACCESS_TOKEN
    if (!phoneNumberId || !accessToken) return null
    return new MetaProvider({
      phoneNumberId,
      wabaId: process.env.META_WABA_ID ?? '',
      accessToken,
      appId: process.env.META_APP_ID || undefined,
      apiVersion: metaApiVersion(),
    })
  }

  const apiKey = process.env.EVOLUTION_API_KEY
  if (!apiKey) return null
  return new EvolutionProvider({
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey,
    instanceName: process.env.EVOLUTION_INSTANCE || 'servico-agora',
  })
}

export const globalProviderName = () => (process.env.WHATSAPP_PROVIDER || 'EVOLUTION').toUpperCase()

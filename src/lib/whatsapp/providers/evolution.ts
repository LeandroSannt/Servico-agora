import axios from 'axios'
import { formatPhoneNumber } from '../message-data'
import type { ConnectionResult, MessagingProvider, SendResult, TemplateRef } from '../types'

interface EvolutionCredentials {
  apiUrl: string
  apiKey: string
  instanceName: string
}

// Normaliza a URL removendo barras finais para evitar URLs duplicadas (ex: //instance)
const normalizeUrl = (url: string) => url.replace(/\/+$/, '')

const ownerToPhone = (ownerJid?: string | null) => ownerJid?.replace('@s.whatsapp.net', '') || null

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[]; error?: string } | undefined
    const detail = Array.isArray(data?.message) ? data?.message.join('; ') : data?.message || data?.error
    return `${error.response?.status ?? ''} ${detail || error.message}`.trim()
  }
  return error instanceof Error ? error.message : 'Erro desconhecido'
}

/**
 * Provedor Evolution API (instância não oficial conectada por QR Code).
 * Só fala HTTP com a Evolution; regras de negócio e logs ficam em ../index.ts.
 */
export class EvolutionProvider implements MessagingProvider {
  readonly name = 'EVOLUTION' as const
  private readonly apiUrl: string
  private readonly apiKey: string
  private readonly instanceName: string

  constructor({ apiUrl, apiKey, instanceName }: EvolutionCredentials) {
    this.apiUrl = normalizeUrl(apiUrl)
    this.apiKey = apiKey
    this.instanceName = instanceName
  }

  private get headers() {
    return { 'Content-Type': 'application/json', apikey: this.apiKey }
  }

  async sendMessage({ phone, template }: { phone: string; template: TemplateRef }): Promise<SendResult> {
    if (template.kind !== 'text') return { ok: false, error: 'Evolution só envia texto' }
    if (!this.apiKey) return { ok: false, error: 'API Key não configurada' }

    try {
      const response = await axios.post(
        `${this.apiUrl}/message/sendText/${this.instanceName}`,
        { number: formatPhoneNumber(phone), text: template.text },
        { headers: this.headers, timeout: 30000 }
      )
      const ok = response.status === 200 || response.status === 201
      return ok
        ? { ok, providerMessageId: response.data?.key?.id }
        : { ok, error: `Resposta inesperada: ${response.status}` }
    } catch (error) {
      return { ok: false, error: describeError(error) }
    }
  }

  async sendDocument({
    phone,
    template,
    pdf,
    fileName,
  }: {
    phone: string
    template: TemplateRef
    pdf: Buffer
    fileName: string
  }): Promise<SendResult> {
    if (template.kind !== 'text') return { ok: false, error: 'Evolution só envia texto' }
    if (!this.apiKey) return { ok: false, error: 'API Key não configurada' }

    try {
      const response = await axios.post(
        `${this.apiUrl}/message/sendMedia/${this.instanceName}`,
        {
          number: formatPhoneNumber(phone),
          mediatype: 'document',
          mimetype: 'application/pdf',
          caption: template.text,
          fileName,
          media: pdf.toString('base64'),
        },
        { headers: this.headers, timeout: 60000 }
      )
      const ok = response.status === 200 || response.status === 201
      return ok
        ? { ok, providerMessageId: response.data?.key?.id }
        : { ok, error: `Resposta inesperada: ${response.status}` }
    } catch (error) {
      return { ok: false, error: describeError(error) }
    }
  }

  async checkConnection(): Promise<ConnectionResult> {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${this.instanceName}`, {
        headers: { apikey: this.apiKey },
        timeout: 10000,
      })
      const connected = response.data?.instance?.state === 'open'
      return { connected, phoneNumber: connected ? ownerToPhone(response.data?.instance?.ownerJid) : null }
    } catch (error) {
      return { connected: false, error: describeError(error) }
    }
  }

  private async createInstance(): Promise<string | null> {
    const response = await axios.post(
      `${this.apiUrl}/instance/create`,
      { instanceName: this.instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
      { headers: this.headers, timeout: 15000 }
    )
    return response.data?.qrcode?.base64 || null
  }

  private async connect(): Promise<string | null> {
    const response = await axios.get(`${this.apiUrl}/instance/connect/${this.instanceName}`, {
      headers: { apikey: this.apiKey },
      timeout: 30000,
    })
    return response.data?.qrcode?.base64 || response.data?.base64 || null
  }

  /**
   * Cria a instância se não existir e devolve o QR Code em base64.
   * Devolve null quando não há QR (a instância pode já estar conectada; o chamador reconsulta a conexão).
   */
  async ensureInstanceAndGetQRCode(): Promise<string | null> {
    // Já conectado?
    const state = await this.checkConnection()
    if (state.connected) return null

    // Tentar criar (pode já existir)
    try {
      const qr = await this.createInstance()
      if (qr) return qr
    } catch (error) {
      if (!axios.isAxiosError(error)) throw error
      // 409 / "already exists": segue para o connect
    }

    try {
      return await this.connect()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const qr = await this.createInstance()
        if (qr) return qr
        return this.connect()
      }
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await axios.delete(`${this.apiUrl}/instance/logout/${this.instanceName}`, {
      headers: { apikey: this.apiKey },
      timeout: 10000,
    })
  }
}

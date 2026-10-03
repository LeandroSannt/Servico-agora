import axios, { AxiosInstance } from 'axios'
import type { MetaTemplateStatus } from '@prisma/client'
import { formatPhoneNumber } from '../message-data'
import type {
  ConnectionResult,
  MessagingProvider,
  MetaTemplateDefinition,
  MetaTemplateResult,
  MetaTemplateStatusMap,
  SendResult,
  TemplateRef,
} from '../types'

export interface MetaCredentials {
  phoneNumberId: string
  wabaId: string
  accessToken: string
  appId?: string
  apiVersion: string
}

interface GraphError {
  message?: string
  code?: number
  error_subcode?: number
  error_data?: { details?: string }
}

interface GraphTemplate {
  name: string
  status: string
  rejected_reason?: string
}

const TEMPLATE_EXISTS_SUBCODE = 2388024

// Mapeia o status bruto da Meta para o enum do banco
export function mapMetaStatus(status: string | undefined): MetaTemplateStatus {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED'
    case 'PENDING':
    case 'IN_APPEAL':
      return 'PENDING'
    case 'REJECTED':
      return 'REJECTED'
    case 'PAUSED':
      return 'PAUSED'
    case undefined:
      return 'NOT_CREATED'
    default:
      // DISABLED, PENDING_DELETION, DELETED, LIMIT_EXCEEDED...
      return 'REJECTED'
  }
}

/**
 * Provedor Meta (WhatsApp Cloud API). Só fala HTTP com o Graph API;
 * regras de negócio e logs ficam em ../index.ts.
 */
export class MetaProvider implements MessagingProvider {
  readonly name = 'META' as const
  private readonly http: AxiosInstance
  private readonly creds: MetaCredentials

  constructor(creds: MetaCredentials) {
    this.creds = creds
    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${creds.apiVersion}`,
      headers: { Authorization: `Bearer ${creds.accessToken}` },
      timeout: 30000,
    })
  }

  // ---------- utilidades ----------

  private graphError(error: unknown): GraphError | undefined {
    if (axios.isAxiosError(error)) return (error.response?.data as { error?: GraphError } | undefined)?.error
    return undefined
  }

  private extractError(error: unknown): string {
    const e = this.graphError(error)
    if (e) {
      const details = e.error_data?.details ? ` - ${e.error_data.details}` : ''
      return `${e.message ?? 'Erro da Meta'}${details} [${e.code ?? '-'}/${e.error_subcode ?? '-'}]`
    }
    if (axios.isAxiosError(error)) return error.message
    return error instanceof Error ? error.message : 'Erro desconhecido'
  }

  private bodyComponent(params: string[]) {
    return { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }
  }

  private async postMessage(payload: Record<string, unknown>): Promise<SendResult> {
    try {
      const { data } = await this.http.post(`/${this.creds.phoneNumberId}/messages`, payload)
      const id: string | undefined = data?.messages?.[0]?.id
      return id ? { ok: true, providerMessageId: id } : { ok: false, error: 'Resposta da Meta sem ID de mensagem' }
    } catch (error) {
      return { ok: false, error: this.extractError(error) }
    }
  }

  // ---------- envio ----------

  async sendMessage({ phone, template }: { phone: string; template: TemplateRef }): Promise<SendResult> {
    if (template.kind !== 'meta') return { ok: false, error: 'Meta exige template aprovado' }
    return this.postMessage({
      messaging_product: 'whatsapp',
      to: formatPhoneNumber(phone),
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: [this.bodyComponent(template.params)],
      },
    })
  }

  private async uploadMedia(pdf: Buffer, fileName: string): Promise<string> {
    const form = new FormData()
    form.append('messaging_product', 'whatsapp')
    form.append('type', 'application/pdf')
    form.append('file', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), fileName)
    const { data } = await this.http.post(`/${this.creds.phoneNumberId}/media`, form, { timeout: 60000 })
    if (!data?.id) throw new Error('Upload de mídia sem ID na resposta')
    return data.id as string
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
    if (template.kind !== 'meta') return { ok: false, error: 'Meta exige template aprovado' }

    let mediaId: string
    try {
      mediaId = await this.uploadMedia(pdf, fileName)
    } catch (error) {
      return { ok: false, error: `Upload do PDF falhou: ${this.extractError(error)}` }
    }

    return this.postMessage({
      messaging_product: 'whatsapp',
      to: formatPhoneNumber(phone),
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: [
          { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: fileName } }] },
          this.bodyComponent(template.params),
        ],
      },
    })
  }

  // ---------- conexão ----------

  async checkConnection(): Promise<ConnectionResult> {
    try {
      const { data } = await this.http.get(`/${this.creds.phoneNumberId}`, {
        params: { fields: 'display_phone_number,verified_name,quality_rating' },
        timeout: 10000,
      })
      const phoneNumber = String(data?.display_phone_number ?? '').replace(/\D/g, '') || null
      return { connected: true, phoneNumber }
    } catch (error) {
      const e = this.graphError(error)
      if (e?.code === 190) return { connected: false, error: 'Token inválido ou expirado' }
      return { connected: false, error: this.extractError(error) }
    }
  }

  // ---------- templates ----------

  // Upload resumível do PDF de exemplo exigido pelo cabeçalho DOCUMENT do template
  private async uploadExampleHandle(pdf: Buffer, fileName: string): Promise<string> {
    if (!this.creds.appId) throw new Error('App ID não informado')
    const oauth = { Authorization: `OAuth ${this.creds.accessToken}` }

    const session = await this.http.post(`/${this.creds.appId}/uploads`, null, {
      params: { file_name: fileName, file_length: pdf.length, file_type: 'application/pdf' },
      headers: oauth,
    })
    const sessionId: string | undefined = session.data?.id
    if (!sessionId) throw new Error('Sessão de upload sem ID')

    const upload = await this.http.post(`/${sessionId}`, pdf, {
      headers: { ...oauth, file_offset: '0', 'Content-Type': 'application/octet-stream' },
      timeout: 60000,
      maxBodyLength: Infinity,
    })
    const handle: string | undefined = upload.data?.h
    if (!handle) throw new Error('Upload sem handle (h) na resposta')
    return handle
  }

  private async fetchTemplate(name: string): Promise<GraphTemplate | undefined> {
    const { data } = await this.http.get(`/${this.creds.wabaId}/message_templates`, {
      params: { name, fields: 'name,status,rejected_reason' },
    })
    return (data?.data as GraphTemplate[] | undefined)?.find((t) => t.name === name)
  }

  async createTemplates(defs: MetaTemplateDefinition[]): Promise<MetaTemplateResult[]> {
    const results: MetaTemplateResult[] = []

    for (const def of defs) {
      try {
        const components: Record<string, unknown>[] = []
        if (def.headerDocument) {
          const handle = await this.uploadExampleHandle(def.headerDocument.examplePdf, def.headerDocument.fileName)
          components.push({ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [handle] } })
        }
        components.push({ type: 'BODY', text: def.bodyText, example: { body_text: [def.bodyExamples] } })

        const { data } = await this.http.post(`/${this.creds.wabaId}/message_templates`, {
          name: def.name,
          category: def.category,
          language: def.language,
          components,
        })
        results.push({ name: def.name, status: data?.status ?? 'PENDING' })
      } catch (error) {
        const e = this.graphError(error)
        const alreadyExists =
          e?.error_subcode === TEMPLATE_EXISTS_SUBCODE || /already exists/i.test(e?.message ?? '')
        if (alreadyExists) {
          try {
            const existing = await this.fetchTemplate(def.name)
            results.push({
              name: def.name,
              status: existing?.status ?? 'PENDING',
              rejectedReason: existing?.rejected_reason,
            })
            continue
          } catch (lookupError) {
            results.push({ name: def.name, status: 'NOT_CREATED', error: this.extractError(lookupError) })
            continue
          }
        }
        results.push({ name: def.name, status: 'NOT_CREATED', error: this.extractError(error) })
      }
    }

    return results
  }

  async getTemplateStatuses(names: string[]): Promise<MetaTemplateStatusMap> {
    const wanted = new Set(names)
    const result: MetaTemplateStatusMap = {}
    let url: string | null = `/${this.creds.wabaId}/message_templates`
    let params: Record<string, unknown> | undefined = { fields: 'name,status,rejected_reason', limit: 100 }

    while (url) {
      const response = await this.http.get<{ data?: GraphTemplate[]; paging?: { next?: string } }>(url, { params })
      for (const t of response.data?.data ?? []) {
        if (wanted.has(t.name)) result[t.name] = { status: t.status, rejectedReason: t.rejected_reason }
      }
      url = response.data?.paging?.next ?? null
      params = undefined // o link "next" já traz os parâmetros
    }

    return result
  }
}

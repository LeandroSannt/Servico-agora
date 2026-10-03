import type {
  ConnectionResult,
  MessagingProvider,
  MetaTemplateDefinition,
  MetaTemplateResult,
  MetaTemplateStatusMap,
  SendResult,
  TemplateRef,
} from '../types'

/**
 * Simula a Meta em desenvolvimento (META_MOCK=true): não chama a API,
 * registra o payload no console e devolve sucesso.
 */
export class MetaMockProvider implements MessagingProvider {
  readonly name = 'META_MOCK' as const

  private log(action: string, payload: Record<string, unknown>) {
    console.log(`[WhatsApp:META_MOCK] ${action}`, JSON.stringify(payload, null, 2))
  }

  private result(): SendResult {
    return { ok: true, providerMessageId: `mock-${Date.now()}` }
  }

  async sendMessage({ phone, template }: { phone: string; template: TemplateRef }): Promise<SendResult> {
    if (template.kind !== 'meta') return { ok: false, error: 'Meta exige template aprovado' }
    this.log('sendMessage', { phone, template: template.name, language: template.language, params: template.params })
    return this.result()
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
    this.log('uploadMedia + sendDocument', {
      phone,
      fileName,
      pdfBytes: pdf.length,
      template: template.name,
      language: template.language,
      params: template.params,
    })
    return this.result()
  }

  async checkConnection(): Promise<ConnectionResult> {
    this.log('checkConnection', {})
    return { connected: true, phoneNumber: '5500000000000' }
  }

  async createTemplates(defs: MetaTemplateDefinition[]): Promise<MetaTemplateResult[]> {
    this.log('createTemplates', { names: defs.map((d) => d.name) })
    return defs.map((d) => ({ name: d.name, status: 'APPROVED' }))
  }

  async getTemplateStatuses(names: string[]): Promise<MetaTemplateStatusMap> {
    this.log('getTemplateStatuses', { names })
    return Object.fromEntries(names.map((n) => [n, { status: 'APPROVED' }]))
  }
}

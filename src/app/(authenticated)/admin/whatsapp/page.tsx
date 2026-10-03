'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  MessageSquare,
  Settings,
  QrCode,
  BarChart3,
  Edit,
  Save,
  X,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  FileText,
  Send,
  Phone,
  Building2,
  CloudUpload,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button, Badge, Modal, Select, Input } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import {
  useWhatsAppConfig,
  useCreateWhatsAppConfig,
  useUpdateWhatsAppConfig,
  useMessageLogs,
  useCheckWhatsAppConnection,
  useDisconnectWhatsApp,
  useUpdateMessageTemplate,
  useSyncMetaTemplates,
  useRefreshMetaTemplateStatus,
  useTestWhatsAppMessage,
  useWhatsAppStatus,
  useCompanies,
  type MessageTemplate,
  type MetaTemplateStatusName,
  type WhatsAppProviderName,
} from '@/hooks/api'
import { metaTemplateBodies } from '@/lib/whatsapp/message-data'
import { useSession } from 'next-auth/react'
import axios from 'axios'

interface Company {
  id: string
  name: string
  cnpj: string | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebido', color: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  PAUSED: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-800' },
  FINISHED: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
  PAID: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800' },
}

const messageStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  READ: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
}

const metaStatusLabels: Record<MetaTemplateStatusName, { label: string; color: string }> = {
  NOT_CREATED: { label: 'Não criado', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'Em análise', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  PAUSED: { label: 'Pausado', color: 'bg-orange-100 text-orange-800' },
}

const PROVIDER_OPTIONS = [
  { value: 'META', label: 'Meta (WhatsApp Cloud API oficial)' },
  { value: 'EVOLUTION', label: 'Evolution API (QR Code)' },
]

// Função para gerar nome da instância a partir do nome da company (Evolution)
function generateInstanceName(companyName: string, companyId: string): string {
  const slug = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${companyId.slice(-6)}`
}

// API Key da Evolution sempre vem do ambiente
const EVOLUTION_API_KEY = process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || 'mude-me'
const EVOLUTION_API_URL = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'http://localhost:8080'

interface ConfigForm {
  provider: WhatsAppProviderName
  metaPhoneNumberId: string
  metaWabaId: string
  metaAppId: string
  metaAccessToken: string
}

const emptyForm: ConfigForm = {
  provider: 'META',
  metaPhoneNumberId: '',
  metaWabaId: '',
  metaAppId: '',
  metaAccessToken: '',
}

function errorText(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { error?: string; details?: unknown }
    const details = typeof data.details === 'string' ? ` - ${data.details}` : ''
    return `${data.error || fallback}${details}`
  }
  return fallback
}

export default function WhatsAppConfigPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const userCompanyId = session?.user?.companyId
  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  // Estado para company selecionada
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'qrcode' | 'logs'>('config')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [form, setForm] = useState<ConfigForm>(emptyForm)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)

  // Buscar companies (apenas para SUPER_ADMIN)
  const { data: companiesData } = useCompanies({ limit: 100 })
  const companies: Company[] = useMemo(() => companiesData?.data || [], [companiesData])

  // Determinar qual companyId usar
  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : userCompanyId

  // Hooks
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useWhatsAppConfig(effectiveCompanyId || undefined)
  const { data: logsData, isLoading: logsLoading } = useMessageLogs({ companyId: effectiveCompanyId || undefined })
  const { data: globalStatus } = useWhatsAppStatus()
  const createConfig = useCreateWhatsAppConfig()
  const updateConfig = useUpdateWhatsAppConfig()
  const updateTemplate = useUpdateMessageTemplate()
  const checkConnection = useCheckWhatsAppConnection()
  const disconnect = useDisconnectWhatsApp()
  const syncTemplates = useSyncMetaTemplates()
  const refreshTemplates = useRefreshMetaTemplateStatus()
  const testMessage = useTestWhatsAppMessage()

  const isMeta = config?.provider === 'META'
  const isMock = config?.mock === true || (!config && globalStatus?.mock === true)

  // Definir company padrão para COMPANY_ADMIN ou primeira company para SUPER_ADMIN
  useEffect(() => {
    if (!isSuperAdmin && userCompanyId) {
      setSelectedCompanyId(userCompanyId)
    } else if (isSuperAdmin && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [isSuperAdmin, userCompanyId, companies, selectedCompanyId])

  // Update connection status based on config
  useEffect(() => {
    setConnectionStatus(config?.isConnected ? 'connected' : 'disconnected')
  }, [config])

  // Obter company selecionada
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  const openConfigModal = () => {
    setForm({
      provider: config?.provider ?? 'META',
      metaPhoneNumberId: config?.metaPhoneNumberId ?? '',
      metaWabaId: config?.metaWabaId ?? '',
      metaAppId: config?.metaAppId ?? '',
      metaAccessToken: '',
    })
    setIsConfigModalOpen(true)
  }

  const handleSaveConfig = async () => {
    if (!effectiveCompanyId || !selectedCompany) return

    try {
      if (form.provider === 'META') {
        const metaFields = {
          provider: 'META' as const,
          metaPhoneNumberId: form.metaPhoneNumberId.trim(),
          metaWabaId: form.metaWabaId.trim(),
          metaAppId: form.metaAppId.trim() || undefined,
        }
        if (config) {
          await updateConfig.mutateAsync({
            id: config.id,
            ...metaFields,
            ...(form.metaAccessToken ? { metaAccessToken: form.metaAccessToken } : {}),
          })
        } else {
          await createConfig.mutateAsync({
            ...metaFields,
            metaAccessToken: form.metaAccessToken,
            companyId: effectiveCompanyId,
          })
        }
      } else {
        const evolutionFields = {
          provider: 'EVOLUTION' as const,
          instanceName: generateInstanceName(selectedCompany.name, selectedCompany.id),
          apiKey: EVOLUTION_API_KEY,
          apiUrl: EVOLUTION_API_URL,
        }
        if (config) {
          await updateConfig.mutateAsync({ id: config.id, ...evolutionFields })
        } else {
          await createConfig.mutateAsync({ ...evolutionFields, companyId: effectiveCompanyId })
        }
      }
      setIsConfigModalOpen(false)
      refetchConfig()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      alert(errorText(error, 'Erro ao salvar configuração'))
    }
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setTemplateContent(template.content)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        content: templateContent,
        isActive: editingTemplate.isActive,
      })
      setEditingTemplate(null)
      refetchConfig()
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      alert(errorText(error, 'Erro ao salvar template'))
    }
  }

  const handleToggleTemplate = async (template: MessageTemplate) => {
    try {
      await updateTemplate.mutateAsync({ id: template.id, isActive: !template.isActive })
      refetchConfig()
    } catch (error) {
      console.error('Erro ao atualizar template:', error)
    }
  }

  const handleSyncTemplates = async () => {
    if (!effectiveCompanyId) return
    setSyncFeedback(null)
    try {
      const { results } = await syncTemplates.mutateAsync({ companyId: effectiveCompanyId })
      const failed = results.filter((r) => r.error)
      setSyncFeedback(
        failed.length === 0
          ? `${results.length} template(s) enviados à Meta.`
          : `${results.length - failed.length} enviados; ${failed.length} com problema: ${failed.map((f) => `${f.name} (${f.error})`).join('; ')}`
      )
      refetchConfig()
    } catch (error) {
      setSyncFeedback(errorText(error, 'Erro ao criar templates na Meta'))
    }
  }

  const handleRefreshTemplates = async () => {
    if (!effectiveCompanyId) return
    setSyncFeedback(null)
    try {
      await refreshTemplates.mutateAsync({ companyId: effectiveCompanyId })
      setSyncFeedback('Status atualizado a partir da Meta.')
      refetchConfig()
    } catch (error) {
      setSyncFeedback(errorText(error, 'Erro ao consultar status na Meta'))
    }
  }

  const handleTestConnection = async () => {
    setConnectionError(null)
    setConnectionStatus('connecting')
    try {
      const result = await checkConnection.mutateAsync({ companyId: effectiveCompanyId || undefined })
      setConnectionStatus(result.connected ? 'connected' : 'disconnected')
      if (!result.connected) setConnectionError(result.error || 'Não foi possível conectar')
      refetchConfig()
    } catch (error) {
      setConnectionStatus('disconnected')
      setConnectionError(errorText(error, 'Erro ao verificar conexão'))
    }
  }

  const handleSendTest = async () => {
    if (!testPhone.trim()) return
    setTestResult(null)
    try {
      const result = await testMessage.mutateAsync({ phone: testPhone.trim(), companyId: effectiveCompanyId || undefined })
      setTestResult({ ok: result.success, text: result.message || result.error || 'Enviado' })
    } catch (error) {
      setTestResult({ ok: false, text: errorText(error, 'Falha ao enviar mensagem de teste') })
    }
  }

  const handleGetQRCode = async () => {
    if (!effectiveCompanyId) return

    setIsLoadingQR(true)
    setConnectionStatus('connecting')
    setConnectionError(null)

    try {
      const response = await axios.get(`/api/whatsapp/qrcode?companyId=${effectiveCompanyId}`)

      if (response.data.connected) {
        setConnectionStatus('connected')
        setQrCodeData(null)
        refetchConfig()
      } else if (response.data.qrCode) {
        setQrCodeData(response.data.qrCode)
        startConnectionPolling()
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error)
      setConnectionStatus('disconnected')
      setConnectionError(errorText(error, 'Erro ao obter QR Code'))
    } finally {
      setIsLoadingQR(false)
    }
  }

  const startConnectionPolling = () => {
    const interval = setInterval(async () => {
      try {
        const result = await checkConnection.mutateAsync({ companyId: effectiveCompanyId || undefined })
        if (result.connected) {
          setConnectionStatus('connected')
          setQrCodeData(null)
          refetchConfig()
          clearInterval(interval)
        }
      } catch {
        // Continue polling
      }
    }, 3000)

    setTimeout(() => {
      clearInterval(interval)
      setConnectionStatus((current) => (current === 'connecting' ? 'disconnected' : current))
      setQrCodeData(null)
    }, 120000)
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return

    try {
      await disconnect.mutateAsync(effectiveCompanyId || undefined)
      setConnectionStatus('disconnected')
      refetchConfig()
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    }
  }

  const templates = config?.templates || []
  const stats = logsData?.stats || { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, read: 0 }
  const metaBodies = metaTemplateBodies(selectedCompany?.name ?? '')

  if (configLoading && effectiveCompanyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const testMessageCard = (
    <Card>
      <CardHeader>
        <CardTitle>Mensagem de teste</CardTitle>
        <CardDescription>Envia o template de &quot;Finalizado&quot; com dados fictícios para o número informado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              placeholder="(00) 00000-0000"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <Button onClick={handleSendTest} disabled={testMessage.isPending || !testPhone.trim()}>
            {testMessage.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar teste
          </Button>
        </div>
        {testResult && (
          <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>{testResult.text}</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração WhatsApp</h1>
          <p className="text-gray-500">Configure a integração com WhatsApp para notificações automáticas</p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          ) : connectionStatus === 'connecting' ? (
            <Badge className="bg-yellow-100 text-yellow-800">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Conectando...
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <WifiOff className="w-3 h-3 mr-1" />
              Desconectado
            </Badge>
          )}
        </div>
      </div>

      {isMock && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Modo de simulação ativo (META_MOCK)</p>
            <p>Nenhuma mensagem é enviada à Meta. Os envios são registrados no console do servidor e nos logs.</p>
          </div>
        </div>
      )}

      {/* Seletor de Company (apenas para SUPER_ADMIN) */}
      {isSuperAdmin && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <Select
                  label="Selecione a Empresa"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  placeholder="Selecione uma empresa..."
                  options={companies.map((company) => ({ value: company.id, label: company.name }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!effectiveCompanyId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma empresa</h3>
            <p className="text-gray-500">Escolha uma empresa para configurar a integração WhatsApp</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(
                [
                  ['config', 'Configuração', Settings],
                  ['templates', 'Templates', FileText],
                  ['qrcode', 'Conexão', isMeta ? Wifi : QrCode],
                  ['logs', 'Relatório', BarChart3],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab: Configuração */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {!config ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">WhatsApp não configurado</h3>
                    <p className="text-gray-500 mb-2">
                      Configure a integração para <strong>{selectedCompany?.name}</strong>
                    </p>
                    <p className="text-sm text-gray-400 mb-6">Escolha o provedor e informe as credenciais</p>
                    <Button onClick={openConfigModal}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuração da API</CardTitle>
                      <CardDescription>
                        {isMeta ? 'Dados de conexão com a WhatsApp Cloud API (Meta)' : 'Dados de conexão com a Evolution API'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Empresa</label>
                        <p className="text-gray-900 font-medium">{selectedCompany?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Provedor</label>
                        <p className="text-gray-900">{isMeta ? 'Meta (WhatsApp Cloud API)' : 'Evolution API'}</p>
                      </div>
                      {isMeta ? (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Phone Number ID</label>
                            <p className="text-gray-900 font-mono text-sm">{config.metaPhoneNumberId}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">WABA ID</label>
                            <p className="text-gray-900 font-mono text-sm">{config.metaWabaId}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">App ID</label>
                            <p className="text-gray-900 font-mono text-sm">{config.metaAppId || 'não informado'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Token de acesso</label>
                            <p className="text-gray-900 text-sm">
                              {config.hasMetaAccessToken ? `configurado (…${config.metaAccessTokenHint})` : 'não configurado'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Nome da Instância</label>
                            <p className="text-gray-900 font-mono text-sm">{config.instanceName}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">URL da API</label>
                            <p className="text-gray-900">{config.apiUrl}</p>
                          </div>
                        </>
                      )}
                      {config.phoneNumber && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Número Conectado</label>
                          <p className="text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-green-600" />+{config.phoneNumber}
                          </p>
                        </div>
                      )}
                      <div className="pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={openConfigModal}>
                          <Settings className="w-4 h-4 mr-2" />
                          Atualizar Configuração
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Estatísticas</CardTitle>
                      <CardDescription>Mensagens enviadas por esta empresa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                          <p className="text-sm text-gray-500">Total de mensagens</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {(stats.sent || 0) + (stats.delivered || 0) + (stats.read || 0)}
                          </p>
                          <p className="text-sm text-gray-500">Enviadas com sucesso</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                          <p className="text-sm text-gray-500">Pendentes</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
                          <p className="text-sm text-gray-500">Falhas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Tab: Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {templates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template configurado</h3>
                    <p className="text-gray-500">Configure primeiro a integração WhatsApp para criar templates</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isMeta && (
                    <Card>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                            <p>
                              Na Meta, o texto é fixo e aprovado uma vez; os dados da OS entram nas variáveis. O texto é editado
                              no Meta Business Manager; após alterar, clique em &quot;Atualizar status&quot;.
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={handleRefreshTemplates} disabled={refreshTemplates.isPending}>
                              <RefreshCw className={`w-4 h-4 mr-2 ${refreshTemplates.isPending ? 'animate-spin' : ''}`} />
                              Atualizar status
                            </Button>
                            <Button size="sm" onClick={handleSyncTemplates} disabled={syncTemplates.isPending}>
                              <CloudUpload className={`w-4 h-4 mr-2 ${syncTemplates.isPending ? 'animate-pulse' : ''}`} />
                              Criar templates na Meta
                            </Button>
                          </div>
                        </div>
                        {syncFeedback && <p className="text-sm text-gray-700">{syncFeedback}</p>}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-6">
                    {templates.map((template) => {
                      const metaStatus = metaStatusLabels[template.metaStatus] ?? metaStatusLabels.NOT_CREATED
                      return (
                        <Card key={template.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <CardTitle>{template.name}</CardTitle>
                                <Badge className={statusLabels[template.triggerStatus].color}>
                                  {statusLabels[template.triggerStatus].label}
                                </Badge>
                                {isMeta && <Badge className={metaStatus.color}>{metaStatus.label}</Badge>}
                                {!template.isActive && <Badge className="bg-gray-100 text-gray-800">Desativado</Badge>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleToggleTemplate(template)} title={template.isActive ? 'Desativar' : 'Ativar'}>
                                  {template.isActive ? <X className="w-4 h-4 text-red-600" /> : <Check className="w-4 h-4 text-green-600" />}
                                </Button>
                                {!isMeta && (
                                  <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)} title="Editar texto">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {template.description && <CardDescription>{template.description}</CardDescription>}
                            {isMeta && (
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                {template.metaTemplateName} · {template.metaLanguage}
                              </p>
                            )}
                            {isMeta && template.metaRejectReason && (
                              <p className="text-xs text-red-600 mt-1">{template.metaRejectReason}</p>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                              <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono leading-relaxed">
                                {isMeta ? metaBodies[template.triggerStatus].text : template.content}
                              </pre>
                            </div>
                            <div className="mt-4">
                              {isMeta ? (
                                <p className="text-xs text-gray-600">
                                  <strong className="text-gray-800">Pré-visualização somente leitura.</strong> Variáveis preenchidas pelo
                                  sistema: cliente, nº da OS, loja, serviços, total{template.triggerStatus === 'PAUSED' ? ', motivo da pausa' : ''}.
                                  {template.triggerStatus === 'PAID' && ' O PDF da OS vai no cabeçalho do template.'}
                                </p>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-600">
                                    <strong className="text-gray-800">Variáveis disponíveis:</strong> {'{{clientName}}'}, {'{{orderNumber}}'},{' '}
                                    {'{{storeName}}'}, {'{{companyName}}'}, {'{{services}}'}, {'{{totalAmount}}'}, {'{{pausedReason}}'}
                                  </p>
                                  {template.triggerStatus === 'PAUSED' && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      A variável {'{{pausedReason}}'} exibe o motivo informado ao pausar o serviço.
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Conexão */}
          {activeTab === 'qrcode' && (
            <div className="max-w-lg mx-auto space-y-6">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle>Conexão WhatsApp</CardTitle>
                  <CardDescription>
                    {connectionStatus === 'connected'
                      ? `WhatsApp de ${selectedCompany?.name} está conectado`
                      : isMeta
                        ? 'Valide o token e o número da WhatsApp Cloud API'
                        : 'Escaneie o QR Code com seu WhatsApp para conectar'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  {!config ? (
                    <div className="py-8">
                      <WifiOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Configure primeiro a integração WhatsApp na aba &quot;Configuração&quot;</p>
                    </div>
                  ) : isMeta ? (
                    <div className="py-8 space-y-4">
                      <div
                        className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                          connectionStatus === 'connected' ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        {connectionStatus === 'connected' ? (
                          <Wifi className="w-12 h-12 text-green-600" />
                        ) : (
                          <WifiOff className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <p className="text-lg font-medium text-gray-900">
                        {connectionStatus === 'connected' ? 'Conta Meta verificada' : 'Conexão não verificada'}
                      </p>
                      {config.phoneNumber && connectionStatus === 'connected' && (
                        <p className="text-gray-500">+{config.phoneNumber}</p>
                      )}
                      {connectionError && <p className="text-sm text-red-600">{connectionError}</p>}
                      <Button onClick={handleTestConnection} disabled={checkConnection.isPending}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${checkConnection.isPending ? 'animate-spin' : ''}`} />
                        Testar conexão
                      </Button>
                    </div>
                  ) : connectionStatus === 'connected' ? (
                    <div className="py-8">
                      <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Wifi className="w-12 h-12 text-green-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">WhatsApp Conectado</p>
                      {config.phoneNumber && <p className="text-gray-500 mb-6">+{config.phoneNumber}</p>}
                      <Button variant="outline" onClick={handleDisconnect}>
                        <WifiOff className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </div>
                  ) : qrCodeData ? (
                    <div className="py-4">
                      <div className="bg-white p-4 rounded-lg inline-block shadow-lg mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeData} alt="QR Code WhatsApp" className="w-64 h-64" />
                      </div>
                      <p className="text-sm text-gray-500">
                        Abra o WhatsApp no celular da empresa, vá em Dispositivos conectados e escaneie este QR Code
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2 text-yellow-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Aguardando conexão...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <QrCode className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                      {connectionError && <p className="text-sm text-red-600 mb-4">{connectionError}</p>}
                      <Button onClick={handleGetQRCode} disabled={isLoadingQR}>
                        {isLoadingQR ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Gerando QR Code...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-2" />
                            Gerar QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {config && testMessageCard}
            </div>
          )}

          {/* Tab: Relatório */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(
                  [
                    [stats.total, 'Total', 'text-gray-900'],
                    [stats.pending, 'Pendentes', 'text-yellow-600'],
                    [stats.sent, 'Enviadas', 'text-blue-600'],
                    [stats.delivered, 'Entregues', 'text-green-600'],
                    [stats.failed, 'Falhas', 'text-red-600'],
                  ] as const
                ).map(([value, label, color]) => (
                  <Card key={label}>
                    <CardContent className="py-4">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-sm text-gray-500">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Mensagens</CardTitle>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : !logsData?.data.length ? (
                    <div className="text-center py-8">
                      <Send className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Nenhuma mensagem enviada ainda</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Telefone</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">OS</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logsData.data.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm">{log.phone}</td>
                              <td className="py-3 px-4 text-sm">{log.orderNumber || '-'}</td>
                              <td className="py-3 px-4">
                                <Badge className={messageStatusColors[log.status] || 'bg-gray-100'} title={log.errorMessage || undefined}>
                                  {log.status}
                                </Badge>
                                {log.errorMessage && (
                                  <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                    {log.errorMessage}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Config Modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={config ? 'Atualizar Configuração WhatsApp' : 'Configurar WhatsApp'}
      >
        <div className="space-y-4">
          <Select
            label="Provedor"
            value={form.provider}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as WhatsAppProviderName }))}
            options={PROVIDER_OPTIONS}
          />

          {form.provider === 'META' ? (
            <>
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                Dados do Meta Business Manager (WhatsApp &gt; Configuração da API). As notificações usam templates aprovados
                pela Meta, criados pela aba Templates.
              </div>
              <Input
                label="Phone Number ID *"
                placeholder="Ex.: 123456789012345"
                value={form.metaPhoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, metaPhoneNumberId: e.target.value }))}
              />
              <Input
                label="WhatsApp Business Account ID (WABA) *"
                placeholder="Ex.: 987654321098765"
                value={form.metaWabaId}
                onChange={(e) => setForm((f) => ({ ...f, metaWabaId: e.target.value }))}
              />
              <Input
                label="App ID (opcional)"
                placeholder="Necessário para o template de OS paga com PDF"
                value={form.metaAppId}
                onChange={(e) => setForm((f) => ({ ...f, metaAppId: e.target.value }))}
              />
              <Input
                label={config?.hasMetaAccessToken ? 'Token de acesso (deixe vazio para manter)' : 'Token de acesso *'}
                type="password"
                autoComplete="off"
                placeholder={config?.hasMetaAccessToken ? `•••• ${config.metaAccessTokenHint}` : 'Token permanente do System User'}
                value={form.metaAccessToken}
                onChange={(e) => setForm((f) => ({ ...f, metaAccessToken: e.target.value }))}
              />
            </>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Configuração Automática</h4>
              <p className="text-sm text-blue-700">A instância será criada com base na empresa selecionada:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-medium text-blue-900">Empresa:</span>
                  <span className="text-blue-700">{selectedCompany?.name}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium text-blue-900">Instância:</span>
                  <span className="text-blue-700 font-mono">
                    {selectedCompany ? generateInstanceName(selectedCompany.name, selectedCompany.id) : '-'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium text-blue-900">API URL:</span>
                  <span className="text-blue-700 font-mono text-xs">{EVOLUTION_API_URL}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={
                createConfig.isPending ||
                updateConfig.isPending ||
                !selectedCompany ||
                (form.provider === 'META' &&
                  (!form.metaPhoneNumberId.trim() ||
                    !form.metaWabaId.trim() ||
                    (!form.metaAccessToken && !config?.hasMetaAccessToken)))
              }
            >
              {createConfig.isPending || updateConfig.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {config ? 'Atualizar Configuração' : 'Criar Configuração'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Edit Modal (Evolution) */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={`Editar Template - ${editingTemplate?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo da Mensagem</label>
            <textarea
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              rows={12}
              style={{ color: '#111827' }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-600 mt-1">
              <strong className="text-gray-800">Variáveis:</strong> {'{{clientName}}'}, {'{{orderNumber}}'}, {'{{storeName}}'},{' '}
              {'{{companyName}}'}, {'{{services}}'}, {'{{totalAmount}}'}, {'{{pausedReason}}'}
            </p>
            {editingTemplate?.triggerStatus === 'PAUSED' && (
              <p className="text-xs text-amber-600 mt-1">Use {'{{pausedReason}}'} para exibir o motivo informado ao pausar o serviço.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Template
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button, Badge, Modal, Select } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import {
  useWhatsAppConfig,
  useCreateWhatsAppConfig,
  useUpdateWhatsAppConfig,
  useMessageLogs,
  useCheckWhatsAppConnection,
  useDisconnectWhatsApp,
  useUpdateMessageTemplate,
  useCompanies,
} from '@/hooks/api'
import { useSession } from 'next-auth/react'
import axios from 'axios'

interface Template {
  id: string
  name: string
  description: string | null
  triggerStatus: 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'PAID'
  content: string
  isActive: boolean
  isDefault: boolean
}

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

// Função para gerar nome da instância a partir do nome da company
function generateInstanceName(companyName: string, companyId: string): string {
  const slug = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${companyId.slice(-6)}`
}

// API Key sempre vem do ambiente - nunca deve ser gerada ou alterada
const API_KEY = process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || 'mude-me'

export default function WhatsAppConfigPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const userCompanyId = session?.user?.companyId
  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  // Estado para company selecionada
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'qrcode' | 'logs'>('config')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')

  // Buscar companies (apenas para SUPER_ADMIN)
  const { data: companiesData } = useCompanies({ limit: 100 })
  const companies: Company[] = companiesData?.data || []

  // Determinar qual companyId usar
  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : userCompanyId

  // Hooks
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useWhatsAppConfig(effectiveCompanyId || undefined)
  const { data: logsData, isLoading: logsLoading } = useMessageLogs({ companyId: effectiveCompanyId || undefined })
  const createConfig = useCreateWhatsAppConfig()
  const updateConfig = useUpdateWhatsAppConfig()
  const updateTemplate = useUpdateMessageTemplate()
  const checkConnection = useCheckWhatsAppConnection()
  const disconnect = useDisconnectWhatsApp()

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
    if (config?.isConnected) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('disconnected')
    }
  }, [config])

  // Obter company selecionada
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  const handleSaveConfig = async () => {
    if (!effectiveCompanyId || !selectedCompany) return

    try {
      const instanceName = generateInstanceName(selectedCompany.name, selectedCompany.id)
      const apiUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'http://localhost:8080'

      if (config) {
        await updateConfig.mutateAsync({
          id: config.id,
          instanceName,
          apiKey: API_KEY, // Sempre usa a API Key do ambiente
          apiUrl,
        })
      } else {
        await createConfig.mutateAsync({
          instanceName,
          apiKey: API_KEY, // Sempre usa a API Key do ambiente
          apiUrl,
          companyId: effectiveCompanyId,
        })
      }
      setIsConfigModalOpen(false)
      refetchConfig()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as { error?: string; details?: string }
        alert(`Erro ao salvar configuração: ${errorData.error || 'Erro desconhecido'}${errorData.details ? ` - ${errorData.details}` : ''}`)
      } else {
        alert('Erro ao salvar configuração')
      }
    }
  }

  const handleEditTemplate = (template: Template) => {
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
      alert('Erro ao salvar template')
    }
  }

  const handleToggleTemplate = async (template: Template) => {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        isActive: !template.isActive,
      })
      refetchConfig()
    } catch (error) {
      console.error('Erro ao atualizar template:', error)
    }
  }

  const handleGetQRCode = async () => {
    if (!effectiveCompanyId) return

    setIsLoadingQR(true)
    setConnectionStatus('connecting')

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
      if (connectionStatus === 'connecting') {
        setConnectionStatus('disconnected')
        setQrCodeData(null)
      }
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

  if (configLoading && effectiveCompanyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

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
                  options={companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  }))}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione uma empresa
            </h3>
            <p className="text-gray-500">
              Escolha uma empresa para configurar a integração WhatsApp
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Configuração
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Templates
              </button>
              <button
                onClick={() => setActiveTab('qrcode')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'qrcode'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <QrCode className="w-4 h-4 inline mr-2" />
                Conexão
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Relatório
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {!config ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      WhatsApp não configurado
                    </h3>
                    <p className="text-gray-500 mb-2">
                      Configure a integração para <strong>{selectedCompany?.name}</strong>
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                      Será criada uma instância com nome baseado na empresa
                    </p>
                    <Button onClick={() => setIsConfigModalOpen(true)}>
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
                      <CardDescription>Dados de conexão com a Evolution API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Empresa</label>
                        <p className="text-gray-900 font-medium">{selectedCompany?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome da Instância</label>
                        <p className="text-gray-900 font-mono text-sm">{config.instanceName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">URL da API</label>
                        <p className="text-gray-900">{config.apiUrl}</p>
                      </div>
                      {config.phoneNumber && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Número Conectado</label>
                          <p className="text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-green-600" />
                            +{config.phoneNumber}
                          </p>
                        </div>
                      )}
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsConfigModalOpen(true)}
                        >
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
                          <p className="text-3xl font-bold text-green-600">{(stats.sent || 0) + (stats.delivered || 0) + (stats.read || 0)}</p>
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

          {activeTab === 'templates' && (
            <div className="space-y-6">
              {templates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum template configurado
                    </h3>
                    <p className="text-gray-500">
                      Configure primeiro a integração WhatsApp para criar templates
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle>{template.name}</CardTitle>
                            <Badge className={statusLabels[template.triggerStatus].color}>
                              {statusLabels[template.triggerStatus].label}
                            </Badge>
                            {!template.isActive && (
                              <Badge className="bg-gray-100 text-gray-800">Desativado</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleTemplate(template as Template)}
                            >
                              {template.isActive ? (
                                <X className="w-4 h-4 text-red-600" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template as Template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono leading-relaxed">
                            {template.content}
                          </pre>
                        </div>
                        <div className="mt-4">
                          <p className="text-xs text-gray-600">
                            <strong className="text-gray-800">Variáveis disponíveis:</strong> {'{{clientName}}'}, {'{{orderNumber}}'}, {'{{storeName}}'}, {'{{companyName}}'}, {'{{services}}'}, {'{{totalAmount}}'}, {'{{pausedReason}}'}
                          </p>
                          {template.triggerStatus === 'PAUSED' && (
                            <p className="text-xs text-amber-600 mt-1">
                              A variável {'{{pausedReason}}'} exibe o motivo informado ao pausar o serviço.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="max-w-lg mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle>Conexão WhatsApp</CardTitle>
                  <CardDescription>
                    {connectionStatus === 'connected'
                      ? `WhatsApp de ${selectedCompany?.name} está conectado`
                      : 'Escaneie o QR Code com seu WhatsApp para conectar'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  {!config ? (
                    <div className="py-8">
                      <WifiOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        Configure primeiro a integração WhatsApp na aba &quot;Configuração&quot;
                      </p>
                    </div>
                  ) : connectionStatus === 'connected' ? (
                    <div className="py-8">
                      <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Wifi className="w-12 h-12 text-green-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">WhatsApp Conectado</p>
                      {config.phoneNumber && (
                        <p className="text-gray-500 mb-6">+{config.phoneNumber}</p>
                      )}
                      <Button variant="outline" onClick={handleDisconnect}>
                        <WifiOff className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </div>
                  ) : qrCodeData ? (
                    <div className="py-4">
                      <div className="bg-white p-4 rounded-lg inline-block shadow-lg mb-4">
                        <img
                          src={qrCodeData}
                          alt="QR Code WhatsApp"
                          className="w-64 h-64"
                        />
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
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-sm text-gray-500">Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
                    <p className="text-sm text-gray-500">Enviadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                    <p className="text-sm text-gray-500">Entregues</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    <p className="text-sm text-gray-500">Falhas</p>
                  </CardContent>
                </Card>
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
                                <Badge className={messageStatusColors[log.status] || 'bg-gray-100'}>
                                  {log.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                              </td>
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

      {/* Config Modal - Simplificado */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={config ? "Atualizar Configuração WhatsApp" : "Configurar WhatsApp"}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              {config ? 'Atualizar Configuração' : 'Configuração Automática'}
            </h4>
            <p className="text-sm text-blue-700">
              {config
                ? 'A configuração será atualizada com os dados abaixo:'
                : 'A configuração será criada automaticamente com base na empresa selecionada:'
              }
            </p>
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
                <span className="text-blue-700 font-mono text-xs">
                  {process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'http://localhost:8080'}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={createConfig.isPending || updateConfig.isPending || !selectedCompany}
            >
              {(createConfig.isPending || updateConfig.isPending) ? (
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

      {/* Template Edit Modal */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={`Editar Template - ${editingTemplate?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo da Mensagem
            </label>
            <textarea
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              rows={12}
              style={{ color: '#111827' }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-600 mt-1">
              <strong className="text-gray-800">Variáveis:</strong> {'{{clientName}}'}, {'{{orderNumber}}'}, {'{{storeName}}'}, {'{{companyName}}'}, {'{{services}}'}, {'{{totalAmount}}'}, {'{{pausedReason}}'}
            </p>
            {editingTemplate?.triggerStatus === 'PAUSED' && (
              <p className="text-xs text-amber-600 mt-1">
                Use {'{{pausedReason}}'} para exibir o motivo informado ao pausar o serviço.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={updateTemplate.isPending}
            >
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

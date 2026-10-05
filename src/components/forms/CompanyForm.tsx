'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from '@/components/ui'
import { companySchema, type CompanyFormData } from '@/lib/validations'
import { useCreateCompany, useUpdateCompany } from '@/hooks/api'
import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { ACCEPTED_LOGO_TYPES, MAX_SOURCE_BYTES, resizeImageToDataUrl } from '@/lib/image-resize'

interface CompanyFormProps {
  company?: {
    id: string
    name: string
    cnpj: string | null
    managerName: string | null
    phone: string | null
    email: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    primaryColor: string | null
    secondaryColor: string | null
    logoUrl?: string | null
    isActive?: boolean
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const createMutation = useCreateCompany()
  const updateMutation = useUpdateCompany()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Logo: logoValue undefined = sem alteração; null = remover; string = novo data URL
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logoUrl ?? null)
  const [logoValue, setLogoValue] = useState<string | null | undefined>(undefined)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      cnpj: company?.cnpj || '',
      managerName: company?.managerName || '',
      phone: company?.phone || '',
      email: company?.email || '',
      address: company?.address || '',
      city: company?.city || '',
      state: company?.state || '',
      zipCode: company?.zipCode || '',
      primaryColor: company?.primaryColor || '#3B82F6',
      secondaryColor: company?.secondaryColor || '#1E40AF',
      isActive: company?.isActive ?? true,
    },
  })

  const primaryColor = watch('primaryColor')
  const secondaryColor = watch('secondaryColor')
  const isActive = watch('isActive')

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar empresa',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo novamente
    if (!file) return

    setLogoError(null)
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Use PNG, JPG ou WebP')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setLogoError('Arquivo muito grande (máx. 5 MB)')
      return
    }

    setProcessing(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512)
      setLogoPreview(dataUrl)
      setLogoValue(dataUrl)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Não foi possível processar a imagem')
    } finally {
      setProcessing(false)
    }
  }

  const handleLogoRemove = () => {
    setLogoPreview(null)
    setLogoValue(null)
    setLogoError(null)
  }

  const onSubmit = async (formData: CompanyFormData) => {
    const data: CompanyFormData = {
      ...formData,
      ...(logoValue !== undefined ? { logo: logoValue } : {}),
    }
    try {
      if (company) {
        await updateMutation.mutateAsync({ id: company.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess()
    } catch {
      // Error is handled by useEffect above
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.root.message}
        </div>
      )}

      {/* Dados básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome da Empresa"
          placeholder="Ex: Empresa ABC"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          mask="cnpj"
          error={errors.cnpj?.message}
          {...register('cnpj')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome do Gestor"
          placeholder="Nome completo"
          error={errors.managerName?.message}
          {...register('managerName')}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          mask="phone"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="email@empresa.com"
        error={errors.email?.message}
        {...register('email')}
      />

      {/* Endereço */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço"
            placeholder="Rua, número"
            {...register('address')}
          />
          <Input
            label="CEP"
            placeholder="00000-000"
            mask="cep"
            {...register('zipCode')}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="Cidade"
            placeholder="Cidade"
            {...register('city')}
          />
          <Input
            label="Estado"
            placeholder="UF"
            {...register('state')}
          />
        </div>
      </div>

      {/* Personalização */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Personalização</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cor Primária
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-10 h-10 rounded border cursor-pointer"
                value={primaryColor || '#3B82F6'}
                onChange={(e) => setValue('primaryColor', e.target.value)}
              />
              <Input
                placeholder="#3B82F6"
                className="flex-1"
                value={primaryColor || ''}
                onChange={(e) => setValue('primaryColor', e.target.value)}
                error={errors.primaryColor?.message}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cor Secundária
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-10 h-10 rounded border cursor-pointer"
                value={secondaryColor || '#1E40AF'}
                onChange={(e) => setValue('secondaryColor', e.target.value)}
              />
              <Input
                placeholder="#1E40AF"
                className="flex-1"
                value={secondaryColor || ''}
                onChange={(e) => setValue('secondaryColor', e.target.value)}
                error={errors.secondaryColor?.message}
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL / rota autenticada: não passam pelo otimizador do Next
              <img
                src={logoPreview}
                alt="Logo da empresa"
                className="w-16 h-16 object-contain bg-white border rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 border rounded-lg flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing || isLoading}
                >
                  {processing ? 'Processando...' : 'Enviar imagem'}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={processing || isLoading}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                PNG, JPG ou WebP. A imagem é reduzida para até 512 px.
              </p>
              {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">Preview</p>
          <div
            className="h-12 rounded-lg flex items-center justify-center gap-2 text-white font-semibold"
            style={{ backgroundColor: primaryColor }}
          >
            {logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element -- data URL / rota autenticada: não passam pelo otimizador do Next
              <img
                src={logoPreview}
                alt=""
                className="w-8 h-8 object-contain bg-white rounded flex-shrink-0"
              />
            )}
            <span className="truncate">{watch('name') || 'Nome da Empresa'}</span>
          </div>
        </div>
      </div>

      {/* Status da Empresa - apenas ao editar */}
      {company && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Status da Empresa</h3>
          <div className={`p-4 rounded-lg border ${isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isActive ? 'text-green-800' : 'text-red-800'}`}>
                  {isActive ? 'Empresa Ativa' : 'Empresa Inativa'}
                </p>
                <p className={`text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {isActive
                    ? 'Todos os usuários podem acessar o sistema normalmente.'
                    : 'Nenhum usuário desta empresa poderá acessar o sistema.'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isActive}
                  onChange={(e) => setValue('isActive', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {!isActive && (
              <p className="mt-3 text-sm text-red-700 bg-red-100 p-2 rounded">
                Atenção: Ao desativar a empresa, todos os usuários vinculados serão impedidos de acessar o sistema até que a empresa seja reativada.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={processing} className="w-full sm:w-auto">
          {company ? 'Salvar Alterações' : 'Criar Empresa'}
        </Button>
      </div>
    </form>
  )
}

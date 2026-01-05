'use client'

import { useState } from 'react'
import { Plus, Search, Store, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Button, Input, Badge, EmptyState, Modal, Select } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import StoreForm from '@/components/forms/StoreForm'
import { useStores, useDeleteStore, useCompanies } from '@/hooks/api'
import { formatPhone } from '@/lib/utils'

interface StoreData {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  isActive: boolean
  company: {
    id: string
    name: string
  }
  _count?: {
    users: number
    clients: number
    services: number
    serviceOrders: number
  }
}

export default function StoresPage() {
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: storesData, isLoading: loading } = useStores({
    search,
    companyId: selectedCompanyId || undefined,
    limit: 50,
  })
  const { data: companiesData } = useCompanies({ limit: 100 })
  const deleteMutation = useDeleteStore()

  const stores = storesData?.data || []
  const companies = companiesData?.data || []

  const handleEdit = (store: StoreData) => {
    setSelectedStore(store)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleCreate = () => {
    setSelectedStore(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao excluir loja:', error)
      alert('Erro ao excluir loja')
    }
  }

  const handleFormSuccess = () => {
    setIsModalOpen(false)
    setSelectedStore(null)
  }

  // Mobile card view for stores
  const StoreCard = ({ store }: { store: StoreData }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{store.name}</p>
            <p className="text-xs text-gray-500 truncate">{store.email || '-'}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpenActionsId(openActionsId === store.id ? null : store.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === store.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(store)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(store.id)
                    setOpenActionsId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="text-xs">{store.company.name}</Badge>
        </div>
        <div className="text-gray-600">
          {store.phone ? formatPhone(store.phone) : '-'}
        </div>
        <div className="text-gray-500 text-xs">
          {store.city && store.state ? `${store.city}/${store.state}` : '-'}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t text-sm">
        <div className="text-gray-600">
          <span className="font-medium text-gray-900">{store._count?.serviceOrders || 0}</span> OS
          <span className="mx-1">·</span>
          <span className="font-medium text-gray-900">{store._count?.clients || 0}</span> clientes
        </div>
        <Badge variant={store.isActive ? 'success' : 'danger'} className="text-xs">
          {store.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lojas</h1>
          <p className="text-sm sm:text-base text-gray-500">Gerencie as lojas das empresas</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Nova Loja
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'Todas as empresas' },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Store className="w-8 h-8" />}
              title="Nenhuma loja encontrada"
              description="Cadastre a primeira loja para começar"
              action={
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Loja
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Estatísticas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{store.name}</p>
                            <p className="text-sm text-gray-500">{store.email || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">{store.company.name}</Badge>
                      </TableCell>
                      <TableCell>{store.phone ? formatPhone(store.phone) : '-'}</TableCell>
                      <TableCell>
                        {store.city && store.state ? `${store.city}/${store.state}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-gray-900">{store._count?.serviceOrders || 0}</span>
                          <span className="text-gray-500"> OS</span>
                          <span className="mx-1">·</span>
                          <span className="text-gray-900">{store._count?.clients || 0}</span>
                          <span className="text-gray-500"> clientes</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={store.isActive ? 'success' : 'danger'}>
                          {store.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(store)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(store.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedStore(null)
        }}
        title={selectedStore ? 'Editar Loja' : 'Nova Loja'}
        size="lg"
      >
        <StoreForm
          store={selectedStore}
          companies={companies}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsModalOpen(false)
            setSelectedStore(null)
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-gray-600">
            Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="w-full sm:w-auto"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

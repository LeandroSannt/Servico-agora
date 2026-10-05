'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, Package, MoreVertical } from 'lucide-react'
import { Button, Input, Modal, Badge, EmptyState } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import PackageForm from '@/components/forms/PackageForm'
import { usePackages, useDeletePackage, type ServicePackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

export default function PackagesPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)

  const { data, isLoading } = usePackages({ search })
  const deleteMutation = useDeletePackage()

  const packages = data?.data || []

  const handleCreate = () => {
    setSelectedPackage(null)
    setIsModalOpen(true)
  }

  const handleEdit = (pkg: ServicePackage) => {
    setSelectedPackage(pkg)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
      if (result?.message?.includes('desativado')) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Erro ao excluir pacote:', error)
      const axiosError = error as { response?: { data?: { error?: string } } }
      alert(axiosError?.response?.data?.error || 'Erro ao excluir pacote')
    }
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    setSelectedPackage(null)
  }

  const ServiceCell = ({ pkg }: { pkg: ServicePackage }) => (
    <>
      {pkg.service.name}
      {!pkg.service.isActive && (
        <Badge variant="warning" className="ml-2">
          Serviço inativo
        </Badge>
      )}
    </>
  )

  // Mobile card view for packages
  const PackageCard = ({ pkg }: { pkg: ServicePackage }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{pkg.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            <ServiceCell pkg={pkg} />
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {pkg.quantity} un · {formatCurrency(pkg.price)}
          </p>
          {pkg.savingsPercent > 0 && (
            <p className="text-sm text-green-600 font-medium mt-0.5">Economia de {pkg.savingsPercent}%</p>
          )}
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setOpenActionsId(openActionsId === pkg.id ? null : pkg.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === pkg.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(pkg.id)
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

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Badge variant={pkg.isActive ? 'success' : 'default'} className="text-xs">
            {pkg.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <span className="text-xs text-gray-500">{pkg.store.name}</span>
        </div>
        <span className="text-sm text-gray-600">{pkg._count.sales} vendas</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pacotes</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">Pacotes pré-pagos com desconto</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="Nenhum pacote encontrado"
          description="Cadastre um pacote para vender a seus clientes"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pacote
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Preço/un</TableHead>
                  <TableHead>Economia</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>
                      <ServiceCell pkg={pkg} />
                    </TableCell>
                    <TableCell>{pkg.quantity}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(pkg.price)}
                    </TableCell>
                    <TableCell>{formatCurrency(pkg.unitPrice)}</TableCell>
                    <TableCell>
                      {pkg.savingsPercent > 0 ? (
                        <span className="text-green-600 font-medium">{pkg.savingsPercent}%</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{pkg._count.sales}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.isActive ? 'success' : 'default'}>
                        {pkg.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pkg)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(pkg.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPackage ? 'Editar Pacote' : 'Novo Pacote'}
      >
        <PackageForm
          pkg={selectedPackage}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir pacote"
      >
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-gray-600">
            Se o pacote já foi vendido, ele será apenas desativado e os saldos dos clientes continuam válidos.
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

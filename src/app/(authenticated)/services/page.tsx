'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, DollarSign, MoreVertical } from 'lucide-react'
import { Button, Input, Modal, Badge, EmptyState } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import ServiceForm from '@/components/forms/ServiceForm'
import { useServices, useDeleteService } from '@/hooks/api'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  store: { id: string; name: string }
  createdAt: string
}

export default function ServicesPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)

  const { data: servicesData, isLoading } = useServices({ search, limit: 50 })
  const deleteMutation = useDeleteService()

  const services = servicesData?.data || []

  const handleCreate = () => {
    setSelectedService(null)
    setIsModalOpen(true)
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao deletar serviço:', error)
      alert('Erro ao deletar serviço')
    }
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    setSelectedService(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Mobile card view for services
  const ServiceCard = ({ service }: { service: Service }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{service.name}</p>
          {service.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{service.description}</p>
          )}
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setOpenActionsId(openActionsId === service.id ? null : service.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === service.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(service)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(service.id)
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
          <Badge variant={service.isActive ? 'success' : 'default'} className="text-xs">
            {service.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <span className="text-xs text-gray-500">{service.store.name}</span>
        </div>
        <span className="font-semibold text-green-600">{formatCurrency(service.price)}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Serviços</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">Gerencie os serviços oferecidos</p>
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
          Novo Serviço
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="Nenhum serviço encontrado"
          description="Cadastre um novo serviço para começar"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-gray-600 max-w-xs truncate">
                      {service.description || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(service.price)}
                    </TableCell>
                    <TableCell>{service.store.name}</TableCell>
                    <TableCell>
                      <Badge variant={service.isActive ? 'success' : 'default'}>
                        {service.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(service.id)}
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
        title={selectedService ? 'Editar Serviço' : 'Novo Serviço'}
      >
        <ServiceForm
          service={selectedService}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
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
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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

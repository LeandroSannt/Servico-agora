'use client'

import { useState } from 'react'
import { Plus, Search, Users, Edit, Trash2, Phone, Mail, MoreVertical } from 'lucide-react'
import { Button, Input, Badge, EmptyState, Modal } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import ClientForm from '@/components/forms/ClientForm'
import { useClients, useDeleteClient } from '@/hooks/api'
import { formatPhone, formatDocument } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  document: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  store: { id: string; name: string }
  _count?: { serviceOrders: number }
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: clientsData, isLoading: loading } = useClients({ search, limit: 50 })
  const deleteMutation = useDeleteClient()

  const clients = clientsData?.data || []

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleCreate = () => {
    setSelectedClient(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente')
    }
  }

  const handleFormSuccess = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  // Mobile card view for clients
  const ClientCard = ({ client }: { client: Client }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-medium text-green-600 flex-shrink-0">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{client.name}</p>
            <p className="text-xs text-gray-500">{client.store.name}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpenActionsId(openActionsId === client.id ? null : client.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === client.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(client)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(client.id)
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
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{formatPhone(client.phone)}</span>
        </div>
        {client.email && (
          <div className="flex items-center gap-2 text-gray-500">
            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t text-sm">
        <div className="text-gray-500">
          {client.city && client.state ? `${client.city}/${client.state}` : '-'}
        </div>
        <Badge variant="primary" className="text-xs">
          {client._count?.serviceOrders || 0} OS
        </Badge>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm sm:text-base text-gray-500">Gerencie seus clientes</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="Nenhum cliente encontrado"
              description="Cadastre seu primeiro cliente para começar"
              action={
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-medium text-green-600">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.store.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {formatPhone(client.phone)}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {client.document ? formatDocument(client.document) : '-'}
                      </TableCell>
                      <TableCell>
                        {client.city && client.state
                          ? `${client.city}/${client.state}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">
                          {client._count?.serviceOrders || 0} OS
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(client.id)}
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
          setSelectedClient(null)
        }}
        title={selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <ClientForm
          client={selectedClient}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsModalOpen(false)
            setSelectedClient(null)
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
            Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
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

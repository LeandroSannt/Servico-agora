'use client'

import { useState } from 'react'
import { Plus, Search, UserCog, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Button, Input, Badge, EmptyState, Modal, Select } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import UserForm from '@/components/forms/UserForm'
import { useUsers, useDeleteUser, useCompanies } from '@/hooks/api'
import { USER_ROLE_LABELS } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  company: { id: string; name: string } | null
  store: { id: string; name: string } | null
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: usersData, isLoading: loading } = useUsers({
    search,
    companyId: selectedCompanyId || undefined,
    limit: 50,
  })
  const { data: companiesData } = useCompanies({ limit: 100 })
  const deleteMutation = useDeleteUser()

  const users = usersData?.data || []
  const companies = companiesData?.data || []

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário')
    }
  }

  const handleFormSuccess = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger'
      case 'COMPANY_ADMIN':
        return 'warning'
      case 'MANAGER':
        return 'primary'
      default:
        return 'default'
    }
  }

  // Mobile card view for users
  const UserCard = ({ user }: { user: User }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-600 flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpenActionsId(openActionsId === user.id ? null : user.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === user.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(user)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(user.id)
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

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={getRoleBadgeVariant(user.role) as 'default' | 'primary' | 'success' | 'warning' | 'danger'} className="text-xs">
          {USER_ROLE_LABELS[user.role] || user.role}
        </Badge>
        <Badge variant={user.isActive ? 'success' : 'danger'} className="text-xs">
          {user.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="text-sm text-gray-600 pt-2 border-t space-y-0.5">
        <div><span className="text-gray-500">Empresa:</span> {user.company?.name || '-'}</div>
        <div><span className="text-gray-500">Loja:</span> {user.store?.name || '-'}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm sm:text-base text-gray-500">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
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
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<UserCog className="w-8 h-8" />}
              title="Nenhum usuário encontrado"
              description="Cadastre o primeiro usuário para começar"
              action={
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-600">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role) as 'default' | 'primary' | 'success' | 'warning' | 'danger'}>
                          {USER_ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.company?.name || '-'}</TableCell>
                      <TableCell>{user.store?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'success' : 'danger'}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(user.id)}
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
          setSelectedUser(null)
        }}
        title={selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="lg"
      >
        <UserForm
          user={selectedUser}
          companies={companies}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsModalOpen(false)
            setSelectedUser(null)
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
            Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
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

'use client'

import { useState } from 'react'
import { Plus, Search, Building2, Edit, Trash2, MoreVertical } from 'lucide-react'
import { Button, Input, Badge, EmptyState, Modal } from '@/components/ui'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import CompanyForm from '@/components/forms/CompanyForm'
import { useCompanies, useDeleteCompany } from '@/hooks/api'
import { formatCNPJ, formatPhone } from '@/lib/utils'

interface Company {
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
  isActive: boolean
  _count?: {
    stores: number
    users: number
  }
}

export default function CompaniesPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: companiesData, isLoading: loading } = useCompanies({ search, limit: 50 })
  const deleteMutation = useDeleteCompany()

  const companies = companiesData?.data || []

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleCreate = () => {
    setSelectedCompany(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao excluir empresa:', error)
      alert('Erro ao excluir empresa')
    }
  }

  const handleFormSuccess = () => {
    setIsModalOpen(false)
    setSelectedCompany(null)
  }

  // Mobile card view for companies
  const CompanyCard = ({ company }: { company: Company }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ backgroundColor: company.primaryColor || '#3B82F6' }}
          >
            {company.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{company.name}</p>
            <p className="text-xs text-gray-500 truncate">{company.email}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpenActionsId(openActionsId === company.id ? null : company.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === company.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(company)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(company.id)
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

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">CNPJ:</span>
          <span className="ml-1 font-mono text-gray-700">{company.cnpj ? formatCNPJ(company.cnpj) : '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Gestor:</span>
          <span className="ml-1 text-gray-700">{company.managerName || '-'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-900 font-medium">{company._count?.stores || 0}</span>
          <span className="text-gray-500">lojas</span>
        </div>
        <Badge variant={company.isActive ? 'success' : 'danger'} className="text-xs">
          {company.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm sm:text-base text-gray-500">Gerencie as empresas (White Labels) do sistema</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CNPJ ou email..."
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
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Building2 className="w-8 h-8" />}
              title="Nenhuma empresa encontrada"
              description="Comece cadastrando a primeira empresa no sistema"
              action={
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Lojas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: company.primaryColor || '#3B82F6' }}
                          >
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{company.name}</p>
                            <p className="text-sm text-gray-500">{company.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {company.cnpj ? formatCNPJ(company.cnpj) : '-'}
                      </TableCell>
                      <TableCell>{company.managerName || '-'}</TableCell>
                      <TableCell>{company.phone ? formatPhone(company.phone) : '-'}</TableCell>
                      <TableCell>
                        <span className="text-gray-900 font-medium">{company._count?.stores || 0}</span>
                        <span className="text-gray-500 text-sm ml-1">lojas</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.isActive ? 'success' : 'danger'}>
                          {company.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(company)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(company.id)}
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
          setSelectedCompany(null)
        }}
        title={selectedCompany ? 'Editar Empresa' : 'Nova Empresa'}
        size="lg"
      >
        <CompanyForm
          company={selectedCompany}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsModalOpen(false)
            setSelectedCompany(null)
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
            Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.
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

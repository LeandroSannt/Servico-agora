'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, ShoppingBag, MoreVertical, Power } from 'lucide-react'
import { Button, Input, Modal, Badge, EmptyState } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import ProductForm from '@/components/forms/ProductForm'
import { useProducts, useDeleteProduct, useUpdateProduct } from '@/hooks/api'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | string
  isActive: boolean
  store: { id: string; name: string }
  createdAt: string
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)

  const { data: productsData, isLoading } = useProducts({ search, limit: 50 })
  const deleteMutation = useDeleteProduct()
  const updateMutation = useUpdateProduct()

  const products = productsData?.data || []

  const handleCreate = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
      if (result?.archived) alert('Produto já usado em ordens de serviço: foi desativado em vez de excluído.')
    } catch (error) {
      console.error('Erro ao deletar produto:', error)
      alert('Erro ao deletar produto')
    }
  }

  const handleToggleActive = async (product: Product) => {
    setOpenActionsId(null)
    try {
      await updateMutation.mutateAsync({ id: product.id, data: { isActive: !product.isActive } })
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      alert('Erro ao atualizar produto')
    }
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  // Mobile card view for products
  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{product.name}</p>
          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{product.description}</p>
          )}
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setOpenActionsId(openActionsId === product.id ? null : product.id)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
          {openActionsId === product.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenActionsId(null)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => handleEdit(product)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(product)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Power className="h-4 w-4" />
                  {product.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm(product.id)
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
          <Badge variant={product.isActive ? 'success' : 'default'} className="text-xs">
            {product.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <span className="text-xs text-gray-500">{product.store.name}</span>
        </div>
        <span className="font-semibold text-green-600">{formatCurrency(product.price)}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">Gerencie os produtos oferecidos</p>
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
          Novo Produto
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="Nenhum produto encontrado"
          description="Cadastre um novo produto para começar"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
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
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-gray-600 max-w-xs truncate">
                      {product.description || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell>{product.store.name}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'success' : 'default'}>
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(product)}
                          title={product.isActive ? 'Desativar' : 'Ativar'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(product.id)}
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
        title={selectedProduct ? 'Editar Produto' : 'Novo Produto'}
      >
        <ProductForm
          product={selectedProduct}
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
            Tem certeza que deseja excluir este produto? Se já foi usado em alguma OS, ele será apenas desativado.
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

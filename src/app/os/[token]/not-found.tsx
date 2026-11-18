export default function PublicOrderNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-center">
      <div className="max-w-sm rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Link inválido</h1>
        <p className="mt-2 text-sm text-gray-600">
          Esta ordem de serviço não foi encontrada ou o link foi substituído. Peça um novo link à loja.
        </p>
      </div>
    </main>
  )
}

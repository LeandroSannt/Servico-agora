import { jsPDF } from 'jspdf'

interface OrderService {
  name: string
  price: number
  quantity: number
  description?: string | null
  equipments?: string[]
}

interface OrderProduct {
  name: string
  quantity: number
  unitPrice: number
}

export interface OrderPdfData {
  orderNumber: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  storeName: string
  companyName: string
  services: OrderService[]
  products?: OrderProduct[]
  totalAmount: number
  createdAt: Date | string
  finishedAt?: Date | string | null
  paidAt?: Date | string | null
  description?: string | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildOrderPdf(data: OrderPdfData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  const ensureSpace = () => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  // Cabeçalho de tabela (Item / Qtd / Valor Unit. / Total)
  const tableHeader = (first: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(first, margin, y)
    doc.text('Qtd', pageWidth - 70, y, { align: 'right' })
    doc.text('Valor Unit.', pageWidth - 45, y, { align: 'right' })
    doc.text('Total', pageWidth - margin, y, { align: 'right' })
    y += 3
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
  }

  const truncate = (s: string, max: number) => (s.length > max ? s.substring(0, max) + '...' : s)

  // Header - Company Name
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(data.companyName, pageWidth / 2, y, { align: 'center' })
  y += 8

  // Store Name
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(data.storeName, pageWidth / 2, y, { align: 'center' })
  y += 15

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDEM DE SERVICO', pageWidth / 2, y, { align: 'center' })
  y += 5

  // Order Number
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${data.orderNumber}`, pageWidth / 2, y, { align: 'center' })
  y += 15

  // Horizontal line
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Client Info Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO CLIENTE', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Nome: ${data.clientName}`, margin, y)
  y += 6
  doc.text(`Telefone: ${data.clientPhone}`, margin, y)
  y += 6
  if (data.clientEmail) {
    doc.text(`Email: ${data.clientEmail}`, margin, y)
    y += 6
  }
  y += 5

  // Horizontal line
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  if (data.services.length > 0) {
    ensureSpace()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SERVICOS REALIZADOS', margin, y)
    y += 10
    tableHeader('Servico')

    for (const service of data.services) {
      doc.text(truncate(service.name, 35), margin, y)
      doc.text(String(service.quantity), pageWidth - 70, y, { align: 'right' })
      doc.text(formatCurrency(service.price), pageWidth - 45, y, { align: 'right' })
      doc.text(formatCurrency(service.price * service.quantity), pageWidth - margin, y, { align: 'right' })
      y += 6

      const subLines = [
        service.description ? truncate(service.description, 60) : null,
        service.equipments?.length ? truncate(`Equipamentos: ${service.equipments.join(', ')}`, 80) : null,
      ].filter((l): l is string => !!l)
      for (const line of subLines) {
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(`  ${line}`, margin, y)
        doc.setTextColor(0)
        doc.setFontSize(9)
        y += 5
      }
      ensureSpace()
    }
  }

  if (data.products?.length) {
    y += data.services.length > 0 ? 5 : 0
    // Título + cabeçalho não podem ficar sozinhos no fim da página
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PRODUTOS', margin, y)
    y += 10
    tableHeader('Produto')

    for (const product of data.products) {
      doc.text(truncate(product.name, 35), margin, y)
      doc.text(String(product.quantity), pageWidth - 70, y, { align: 'right' })
      doc.text(formatCurrency(product.unitPrice), pageWidth - 45, y, { align: 'right' })
      doc.text(formatCurrency(product.unitPrice * product.quantity), pageWidth - margin, y, { align: 'right' })
      y += 6
      ensureSpace()
    }
  }

  y += 5
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Total
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', pageWidth - 70, y)
  doc.text(formatCurrency(data.totalAmount), pageWidth - margin, y, { align: 'right' })
  y += 15

  // Dates Section
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Data de Criacao: ${formatDate(data.createdAt)}`, margin, y)
  y += 5
  if (data.finishedAt) {
    doc.text(`Data de Conclusao: ${formatDate(data.finishedAt)}`, margin, y)
    y += 5
  }
  if (data.paidAt) {
    doc.text(`Data de Pagamento: ${formatDate(data.paidAt)}`, margin, y)
    y += 5
  }

  // Description if exists
  if (data.description) {
    y += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Observacoes:', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    // Split description into multiple lines if needed
    const maxWidth = pageWidth - (margin * 2)
    const lines = doc.splitTextToSize(data.description, maxWidth)
    doc.text(lines, margin, y)
    y += lines.length * 5
  }

  // Footer
  y = 280
  doc.setFontSize(8)
  doc.setTextColor(128)
  doc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text(data.companyName, pageWidth / 2, y, { align: 'center' })

  return doc
}

export function generateOrderPdf(data: OrderPdfData): Buffer {
  return Buffer.from(buildOrderPdf(data).output('arraybuffer'))
}

export function generateOrderPdfBase64(data: OrderPdfData): string {
  return buildOrderPdf(data).output('datauristring').split(',')[1]
}

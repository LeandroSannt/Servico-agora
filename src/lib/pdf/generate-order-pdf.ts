import { jsPDF } from 'jspdf'

interface OrderService {
  name: string
  price: number
  quantity: number
  description?: string | null
}

export interface OrderPdfData {
  orderNumber: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  storeName: string
  companyName: string
  services: OrderService[]
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

export function generateOrderPdf(data: OrderPdfData): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

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

  // Services Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICOS REALIZADOS', margin, y)
  y += 10

  // Services table header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Servico', margin, y)
  doc.text('Qtd', pageWidth - 70, y, { align: 'right' })
  doc.text('Valor Unit.', pageWidth - 45, y, { align: 'right' })
  doc.text('Total', pageWidth - margin, y, { align: 'right' })
  y += 3

  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // Services list
  doc.setFont('helvetica', 'normal')
  for (const service of data.services) {
    const serviceTotal = service.price * service.quantity

    // Service name (may need to wrap if too long)
    const serviceName = service.name.length > 35
      ? service.name.substring(0, 35) + '...'
      : service.name

    doc.text(serviceName, margin, y)
    doc.text(String(service.quantity), pageWidth - 70, y, { align: 'right' })
    doc.text(formatCurrency(service.price), pageWidth - 45, y, { align: 'right' })
    doc.text(formatCurrency(serviceTotal), pageWidth - margin, y, { align: 'right' })
    y += 6

    // Description if exists
    if (service.description) {
      doc.setFontSize(8)
      doc.setTextColor(100)
      const desc = service.description.length > 60
        ? service.description.substring(0, 60) + '...'
        : service.description
      doc.text(`  ${desc}`, margin, y)
      doc.setTextColor(0)
      doc.setFontSize(9)
      y += 5
    }

    // Check if we need a new page
    if (y > 260) {
      doc.addPage()
      y = 20
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

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

export function generateOrderPdfBase64(data: OrderPdfData): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

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

  // Services Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICOS REALIZADOS', margin, y)
  y += 10

  // Services table header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Servico', margin, y)
  doc.text('Qtd', pageWidth - 70, y, { align: 'right' })
  doc.text('Valor Unit.', pageWidth - 45, y, { align: 'right' })
  doc.text('Total', pageWidth - margin, y, { align: 'right' })
  y += 3

  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // Services list
  doc.setFont('helvetica', 'normal')
  for (const service of data.services) {
    const serviceTotal = service.price * service.quantity

    // Service name (may need to wrap if too long)
    const serviceName = service.name.length > 35
      ? service.name.substring(0, 35) + '...'
      : service.name

    doc.text(serviceName, margin, y)
    doc.text(String(service.quantity), pageWidth - 70, y, { align: 'right' })
    doc.text(formatCurrency(service.price), pageWidth - 45, y, { align: 'right' })
    doc.text(formatCurrency(serviceTotal), pageWidth - margin, y, { align: 'right' })
    y += 6

    // Description if exists
    if (service.description) {
      doc.setFontSize(8)
      doc.setTextColor(100)
      const desc = service.description.length > 60
        ? service.description.substring(0, 60) + '...'
        : service.description
      doc.text(`  ${desc}`, margin, y)
      doc.setTextColor(0)
      doc.setFontSize(9)
      y += 5
    }

    // Check if we need a new page
    if (y > 260) {
      doc.addPage()
      y = 20
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

  // Return as base64
  return doc.output('datauristring').split(',')[1]
}

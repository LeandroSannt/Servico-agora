import nodemailer from 'nodemailer'

interface OrderFinishedEmailData {
  clientName: string
  clientEmail: string
  orderNumber: string
  storeName: string
  companyName: string
  services: { name: string; price: number; quantity: number }[]
  totalAmount: number
}

// Configuração do transporter (usar variáveis de ambiente em produção)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOrderFinishedEmail(data: OrderFinishedEmailData) {
  const { clientName, clientEmail, orderNumber, storeName, companyName, services, totalAmount } = data

  // Lista de serviços em formato mobile-friendly (cards ao invés de tabela)
  const servicesHtml = services
    .map(
      (s) => `
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">${s.name}</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #6b7280; font-size: 13px;">Qtd: ${s.quantity} × R$ ${s.price.toFixed(2)}</span>
          <span style="font-weight: 600; color: #059669; font-size: 14px;">R$ ${(s.price * s.quantity).toFixed(2)}</span>
        </div>
      </div>
    `
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Serviço Finalizado</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <!-- Container principal -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 16px 8px;">
            <!-- Card principal -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #3B82F6; padding: 24px 16px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">${companyName}</h1>
                  <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">${storeName}</p>
                </td>
              </tr>

              <!-- Ícone de sucesso -->
              <tr>
                <td style="padding: 24px 16px 0 16px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    <tr>
                      <td style="width: 56px; height: 56px; background-color: #10B981; border-radius: 50%; text-align: center; vertical-align: middle;">
                        <span style="color: white; font-size: 28px; line-height: 56px;">✓</span>
                      </td>
                    </tr>
                  </table>
                  <h2 style="color: #111827; margin: 12px 0 6px 0; font-size: 18px; font-weight: 600;">Serviço Finalizado!</h2>
                  <p style="color: #6b7280; margin: 0; font-size: 13px;">Seu serviço está pronto para retirada</p>
                </td>
              </tr>

              <!-- Conteúdo -->
              <tr>
                <td style="padding: 20px 16px;">
                  <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">
                    Olá <strong>${clientName}</strong>,
                  </p>

                  <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                    Sua ordem de serviço <strong style="color: #3B82F6;">#${orderNumber}</strong> foi concluída com sucesso.
                  </p>

                  <!-- Detalhes do serviço -->
                  <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Detalhes do Serviço</h3>
                    ${servicesHtml}

                    <!-- Total -->
                    <div style="border-top: 2px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="font-weight: 700; color: #111827; font-size: 15px;">Total</td>
                          <td style="font-weight: 700; color: #059669; font-size: 18px; text-align: right;">R$ ${totalAmount.toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>
                  </div>

                  <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">
                    Por favor, compareça à nossa loja para retirar seu produto/serviço.
                  </p>

                  <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                    Em caso de dúvidas, entre em contato conosco.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
                    Este é um email automático. Por favor, não responda.
                  </p>
                  <p style="color: #9ca3af; font-size: 10px; margin: 0;">
                    © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const mailOptions = {
    from: `"${companyName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: clientEmail,
    subject: `Seu serviço #${orderNumber} está pronto para retirada - ${storeName}`,
    html,
  }

  await transporter.sendMail(mailOptions)
}

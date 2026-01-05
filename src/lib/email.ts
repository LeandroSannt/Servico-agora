import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  try {
    const info = await transporter.sendMail({
      from: `"Serviço Agora" <${from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    console.log('Email enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    throw error
  }
}

// Templates de email

export function welcomeEmailTemplate(name: string, email: string, tempPassword?: string) {
  return {
    subject: 'Bem-vindo ao Serviço Agora!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3B82F6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Serviço Agora</h1>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Olá, ${name}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Sua conta foi criada com sucesso no sistema Serviço Agora.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #374151;"><strong>Email:</strong> ${email}</p>
              ${tempPassword ? `<p style="margin: 10px 0 0; color: #374151;"><strong>Senha temporária:</strong> ${tempPassword}</p>` : ''}
            </div>
            ${tempPassword ? `
            <p style="color: #ef4444; font-size: 14px;">
              Por segurança, recomendamos que você altere sua senha no primeiro acesso.
            </p>
            ` : ''}
            <a href="${process.env.AUTH_URL || 'http://localhost:3000'}/login"
               style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              Acessar Sistema
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              Se você não solicitou esta conta, por favor ignore este email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Serviço Agora. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

export function passwordResetEmailTemplate(name: string, resetLink: string) {
  return {
    subject: 'Redefinição de Senha - Serviço Agora',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3B82F6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Serviço Agora</h1>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Olá, ${name}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.
            </p>
            <a href="${resetLink}"
               style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Redefinir Senha
            </a>
            <p style="color: #6b7280; font-size: 14px;">
              Este link expira em 1 hora.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá a mesma.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Serviço Agora. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

export function serviceOrderCreatedEmailTemplate(
  customerName: string,
  orderNumber: string,
  storeName: string,
  deviceInfo: string,
  description: string
) {
  return {
    subject: `Ordem de Serviço #${orderNumber} - Serviço Agora`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3B82F6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Serviço Agora</h1>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Olá, ${customerName}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Sua ordem de serviço foi criada com sucesso!
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px; color: #374151;"><strong>Número da OS:</strong> #${orderNumber}</p>
              <p style="margin: 0 0 10px; color: #374151;"><strong>Loja:</strong> ${storeName}</p>
              <p style="margin: 0 0 10px; color: #374151;"><strong>Equipamento:</strong> ${deviceInfo}</p>
              <p style="margin: 0; color: #374151;"><strong>Descrição:</strong> ${description}</p>
            </div>
            <p style="color: #4b5563; line-height: 1.6;">
              Você receberá atualizações sobre o status do seu serviço por email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              Em caso de dúvidas, entre em contato com a loja.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Serviço Agora. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

export function serviceOrderStatusUpdateEmailTemplate(
  customerName: string,
  orderNumber: string,
  newStatus: string,
  statusMessage: string
) {
  const statusColors: Record<string, string> = {
    PENDING: '#f59e0b',
    IN_PROGRESS: '#3b82f6',
    WAITING_PARTS: '#8b5cf6',
    WAITING_APPROVAL: '#f97316',
    COMPLETED: '#10b981',
    DELIVERED: '#059669',
    CANCELLED: '#ef4444',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Andamento',
    WAITING_PARTS: 'Aguardando Peças',
    WAITING_APPROVAL: 'Aguardando Aprovação',
    COMPLETED: 'Concluído',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  }

  return {
    subject: `Atualização OS #${orderNumber} - ${statusLabels[newStatus] || newStatus}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3B82F6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Serviço Agora</h1>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Olá, ${customerName}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              O status da sua ordem de serviço foi atualizado.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px; color: #374151;"><strong>OS #${orderNumber}</strong></p>
              <span style="display: inline-block; background-color: ${statusColors[newStatus] || '#6b7280'}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold;">
                ${statusLabels[newStatus] || newStatus}
              </span>
            </div>
            ${statusMessage ? `
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;">${statusMessage}</p>
            </div>
            ` : ''}
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              Em caso de dúvidas, entre em contato com a loja.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Serviço Agora. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

// Função auxiliar para verificar a configuração de email
export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log('Configuração de email verificada com sucesso')
    return true
  } catch (error) {
    console.error('Erro na configuração de email:', error)
    return false
  }
}

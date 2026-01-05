import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL || 'postgresql://admin:admin123@localhost:5432/servico_agora?schema=public'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Verificar se já existe um SUPER_ADMIN
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  })

  if (existingAdmin) {
    console.log('✅ Usuário admin mestre já existe:', existingAdmin.email)
  } else {
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Criar usuário admin mestre
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador Master',
        email: 'admin@servicoagora.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    })

    console.log('✅ Usuário admin mestre criado com sucesso!')
    console.log('📧 Email:', admin.email)
    console.log('🔑 Senha: admin123')
    console.log('')
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!')
  }

  console.log('')
  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                primaryColor: true,
                secondaryColor: true,
                isActive: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        })

        if (!user) {
          throw new Error('Usuário não encontrado')
        }

        if (!user.isActive) {
          throw new Error('Usuário inativo')
        }

        // Verificar se a empresa está ativa (SUPER_ADMIN não tem empresa)
        if (user.company && !user.company.isActive) {
          throw new Error('Empresa inativa. Entre em contato com o administrador.')
        }

        // Verificar se a loja está ativa (SUPER_ADMIN e COMPANY_ADMIN não têm loja obrigatória)
        if (user.store && !user.store.isActive) {
          throw new Error('Loja inativa. Entre em contato com o administrador.')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Senha incorreta')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          storeId: user.storeId,
          company: user.company ? {
            id: user.company.id,
            name: user.company.name,
            logoUrl: user.company.logoUrl,
            primaryColor: user.company.primaryColor,
            secondaryColor: user.company.secondaryColor,
          } : null,
          store: user.store ? {
            id: user.store.id,
            name: user.store.name,
          } : null,
        }
      },
    }),
  ],
})

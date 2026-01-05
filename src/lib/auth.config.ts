import type { NextAuthConfig } from 'next-auth'

// Esta configuração é usada pelo middleware (Edge Runtime)
// Não pode usar Prisma ou bcrypt aqui
export const authConfig: NextAuthConfig = {
  providers: [], // Providers são configurados em auth.ts
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.storeId = user.storeId
        token.company = user.company
        token.store = user.store
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string | null
        session.user.storeId = token.storeId as string | null
        session.user.company = token.company as {
          id: string
          name: string
          logoUrl: string | null
          primaryColor: string | null
          secondaryColor: string | null
        } | null
        session.user.store = token.store as {
          id: string
          name: string
        } | null
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublicRoute = ['/login', '/api/auth'].some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      if (!isLoggedIn && !isPublicRoute) {
        return false // Redireciona para login
      }

      if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/', nextUrl.origin))
      }

      // Verificar rotas de SUPER_ADMIN
      const superAdminRoutes = ['/admin/companies']
      const isSuperAdminRoute = superAdminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )
      if (isSuperAdminRoute && auth?.user?.role !== 'SUPER_ADMIN') {
        return Response.redirect(new URL('/', nextUrl.origin))
      }

      // Verificar rotas de admin (SUPER_ADMIN ou COMPANY_ADMIN)
      const adminRoutes = ['/admin/stores', '/admin/users']
      const isAdminRoute = adminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )
      if (isAdminRoute && !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(auth?.user?.role || '')) {
        return Response.redirect(new URL('/', nextUrl.origin))
      }

      return true
    },
  },
}

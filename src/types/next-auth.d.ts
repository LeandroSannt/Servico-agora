import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    name: string
    email: string
    role: string
    companyId: string | null
    storeId: string | null
    company: {
      id: string
      name: string
      logoUrl: string | null
      primaryColor: string | null
      secondaryColor: string | null
    } | null
    store: {
      id: string
      name: string
    } | null
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    companyId: string | null
    storeId: string | null
    company: {
      id: string
      name: string
      logoUrl: string | null
      primaryColor: string | null
      secondaryColor: string | null
    } | null
    store: {
      id: string
      name: string
    } | null
  }
}

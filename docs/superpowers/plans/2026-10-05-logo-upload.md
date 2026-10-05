# Upload da Logo da Empresa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a URL da logo por upload de imagem (PNG/JPG/WebP redimensionada no navegador) guardada em base64 no banco e servida por rota própria.

**Architecture:** Três colunas novas em `Company`; validação pura (`src/lib/company-logo.ts`) que confere os bytes da imagem; rota `GET /api/companies/[id]/logo` com cache versionado; respostas e sessão carregam só a URL curta calculada; formulário redimensiona com canvas.

**Tech Stack:** Next.js 14 App Router, Prisma 7 (`omit`), Zod 4, React Hook Form, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-logo-upload-design.md`

**Ambiente:** repo `C:\Users\lsn_c\Projetos\servico-agora`, branch `feature/logo-upload`. Postgres local `localhost:5434` (container `servico-agora-db`). Prisma precisa de `--config prisma/prisma.config.ts` (`npm run db:push` já passa; `npx prisma generate --config prisma/prisma.config.ts`). Não rodar `next build` com dev server ativo. Commits novos (amend bloqueado), LF, nunca `git add -A`.

---

### Task 1: Schema e lógica pura da logo

**Files:**
- Modify: `prisma/schema.prisma` (model `Company`)
- Create: `src/lib/company-logo.ts`
- Create: `src/lib/__tests__/company-logo.test.ts`

- [ ] **Step 1: Colunas.** Em `model Company`, após `logoUrl`:

```prisma
  // Logo enviada (base64 sem prefixo); logoMimeType não nulo ⇔ há logo enviada
  logoData      String?   @db.Text @map("logo_data")
  logoMimeType  String?   @map("logo_mime_type")
  logoUpdatedAt DateTime? @map("logo_updated_at")
```

Run: `npm run db:push` e `npx prisma generate --config prisma/prisma.config.ts`. Expected: "in sync", sem pedido de reset.

- [ ] **Step 2: Testes (falhando).** Criar `src/lib/__tests__/company-logo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseLogoDataUrl, companyLogoUrl, InvalidLogoError, MAX_LOGO_BYTES } from '@/lib/company-logo'

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64')
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]

describe('parseLogoDataUrl', () => {
  it('aceita PNG, JPEG e WebP', () => {
    expect(parseLogoDataUrl(`data:image/png;base64,${b64(PNG)}`).mimeType).toBe('image/png')
    expect(parseLogoDataUrl(`data:image/jpeg;base64,${b64(JPEG)}`).mimeType).toBe('image/jpeg')
    const r = parseLogoDataUrl(`data:image/webp;base64,${b64(WEBP)}`)
    expect(r.mimeType).toBe('image/webp')
    expect(r.base64).toBe(b64(WEBP))
    expect(r.bytes).toBe(WEBP.length)
  })
  it('rejeita SVG e GIF', () => {
    expect(() => parseLogoDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toThrow(InvalidLogoError)
    expect(() => parseLogoDataUrl(`data:image/gif;base64,${b64([0x47, 0x49, 0x46, 0x38])}`)).toThrow(InvalidLogoError)
  })
  it('rejeita tipo declarado diferente dos bytes', () => {
    expect(() => parseLogoDataUrl(`data:image/png;base64,${b64(JPEG)}`)).toThrow('Imagem inválida')
  })
  it('rejeita base64 inválido e texto que não é data URL', () => {
    expect(() => parseLogoDataUrl('data:image/png;base64,@@@@')).toThrow(InvalidLogoError)
    expect(() => parseLogoDataUrl('https://exemplo.com/logo.png')).toThrow(InvalidLogoError)
  })
  it('rejeita acima do limite', () => {
    const big = new Array(MAX_LOGO_BYTES + 1).fill(0)
    PNG.forEach((v, i) => (big[i] = v))
    expect(() => parseLogoDataUrl(`data:image/png;base64,${b64(big)}`)).toThrow('Imagem muito grande')
  })
})

describe('companyLogoUrl', () => {
  const updated = new Date('2026-10-05T12:00:00Z')
  it('logo enviada vira rota versionada', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: 'image/webp', logoUpdatedAt: updated, logoUrl: 'https://x/y.png' }))
      .toBe(`/api/companies/c1/logo?v=${updated.getTime()}`)
  })
  it('sem logo enviada usa a URL legada', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: null, logoUpdatedAt: null, logoUrl: 'https://x/y.png' })).toBe('https://x/y.png')
  })
  it('sem nada devolve null', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: null, logoUpdatedAt: null, logoUrl: null })).toBeNull()
  })
})
```

Run: `npm test -- company-logo` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** `src/lib/company-logo.ts`:

```ts
export const MAX_LOGO_BYTES = 300 * 1024

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'] as const
type LogoMime = (typeof ALLOWED)[number]

export class InvalidLogoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLogoError'
  }
}

const INVALID = 'Imagem inválida: use PNG, JPG ou WebP'

function sniff(buf: Buffer): LogoMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** Valida um data URL de imagem e devolve o base64 puro. O tipo é conferido pelos bytes. */
export function parseLogoDataUrl(dataUrl: string): { mimeType: LogoMime; base64: string; bytes: number } {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl.trim())
  if (!match) throw new InvalidLogoError(INVALID)
  const declared = match[1] as LogoMime
  if (!ALLOWED.includes(declared)) throw new InvalidLogoError(INVALID)

  const buf = Buffer.from(match[2], 'base64')
  if (buf.length === 0) throw new InvalidLogoError(INVALID)
  if (buf.length > MAX_LOGO_BYTES) throw new InvalidLogoError('Imagem muito grande (máx. 300 KB)')
  if (sniff(buf) !== declared) throw new InvalidLogoError(INVALID)

  return { mimeType: declared, base64: buf.toString('base64'), bytes: buf.length }
}

/** URL pública da logo: rota versionada se houver logo enviada; senão a URL legada. */
export function companyLogoUrl(c: {
  id: string
  logoMimeType: string | null
  logoUpdatedAt: Date | null
  logoUrl: string | null
}): string | null {
  if (c.logoMimeType) return `/api/companies/${c.id}/logo?v=${c.logoUpdatedAt ? c.logoUpdatedAt.getTime() : 0}`
  return c.logoUrl || null
}
```

Run: `npm test -- company-logo` → todos passam. `npx tsc --noEmit`, `npm run lint` limpos.

- [ ] **Step 4: Commit** `prisma/schema.prisma src/lib/company-logo.ts src/lib/__tests__/company-logo.test.ts` — "feat(logo): colunas da logo e validacao da imagem".

---

### Task 2: API e sessão

**Files:**
- Modify: `src/lib/validations/company.ts`
- Create: `src/lib/company-logo-data.ts` (montagem dos dados do Prisma a partir de `logo`)
- Create: `src/app/api/companies/[id]/logo/route.ts`
- Modify: `src/app/api/companies/route.ts`, `src/app/api/companies/[id]/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts` (select da empresa)
- Modify: `src/lib/auth.ts`

- [ ] **Step 0: Nunca carregar a imagem por padrão.** Em `src/lib/prisma.ts`, criar o client com omissão global: `new PrismaClient({ adapter, omit: { company: { logoData: true } } })`. Assim nenhuma consulta existente (OS, lojas, usuários, sessão) carrega a imagem; só quem pede explicitamente (`select: { logoData: true }` na rota da imagem). Conferir que `npx tsc --noEmit` passa e que os tipos de `company` nas rotas existentes não exigem mais `logoData`.

- [ ] **Step 1: Schema Zod.** Em `companySchema`, remover `logoUrl` e adicionar `logo: z.string().max(450_000, 'Imagem muito grande').nullable().optional()` (corta payloads absurdos antes de decodificar).

- [ ] **Step 2: Dados de gravação.** Criar `src/lib/company-logo-data.ts`:

```ts
import { parseLogoDataUrl, companyLogoUrl } from './company-logo'

/** Converte o campo `logo` do formulário nos campos do Prisma (undefined = não mexer). */
export function logoUpdateData(logo: string | null | undefined) {
  if (logo === undefined) return {}
  if (logo === null) return { logoData: null, logoMimeType: null, logoUpdatedAt: null, logoUrl: null }
  const parsed = parseLogoDataUrl(logo)
  return { logoData: parsed.base64, logoMimeType: parsed.mimeType, logoUpdatedAt: new Date(), logoUrl: null }
}

/** Remove os bytes e calcula a URL pública antes de devolver uma empresa ao cliente. */
export function toPublicCompany<T extends { id: string; logoMimeType: string | null; logoUpdatedAt: Date | null; logoUrl: string | null }>(
  c: T & { logoData?: unknown }
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logoData, ...rest } = c
  return { ...rest, logoUrl: companyLogoUrl(rest) }
}
```
Adicione um teste rápido em `src/lib/__tests__/company-logo-data.test.ts`: `undefined` → `{}`; `null` → zera os quatro campos; data URL PNG válido → `logoMimeType 'image/png'`, `logoUrl null`, `logoUpdatedAt` Date; `toPublicCompany` remove `logoData` e calcula `logoUrl`.

- [ ] **Step 3: Rota da imagem** `src/app/api/companies/[id]/logo/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/companies/[id]/logo — bytes da logo enviada (URL versionada por ?v=)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const company = await prisma.company.findUnique({
    where: { id },
    select: { logoData: true, logoMimeType: true },
  })
  if (!company?.logoData || !company.logoMimeType) {
    return NextResponse.json({ error: 'Logo não encontrada' }, { status: 404 })
  }

  return new NextResponse(Buffer.from(company.logoData, 'base64'), {
    headers: {
      'Content-Type': company.logoMimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
```

- [ ] **Step 4: Rotas de empresa.**
  - `GET /api/companies`: `data: companies.map(toPublicCompany)` (a omissão global já tira `logoData`).
  - `POST /api/companies`: `const { logo, ...rest } = companySchema.parse(body)`; `create({ data: { ...rest, ...logoUpdateData(logo) } })`; responder `toPublicCompany(company)`. No `catch`, antes do ZodError: `if (error instanceof InvalidLogoError) return NextResponse.json({ error: error.message }, { status: 400 })`.
  - `[id]` GET/PUT/DELETE: começar com `const { error: authError } = await requireRoles(['SUPER_ADMIN']); if (authError) return authError`. GET com `toPublicCompany`. PUT: `const { logo, ...rest } = companySchema.partial().parse(body)`; `update({ where, data: { ...rest, ...logoUpdateData(logo) } })`; `toPublicCompany`; mesmo tratamento de `InvalidLogoError` e adicionar o ramo ZodError (400) que o PUT hoje não tem.
- [ ] **Step 5: OS.** Em `src/app/api/orders/[id]/route.ts` GET, a empresa seleciona `{ id, name, primaryColor, logoUrl }`; trocar por `{ id, name, primaryColor, logoUrl: true, logoMimeType: true, logoUpdatedAt: true }` e, antes de responder, substituir `order.store.company.logoUrl` por `companyLogoUrl(order.store.company)` (remover `logoMimeType`/`logoUpdatedAt` da resposta para manter o formato).
- [ ] **Step 6: Sessão.** Em `src/lib/auth.ts`, o `select` de `company` passa a incluir `logoMimeType: true, logoUpdatedAt: true` além de `id` e `logoUrl`; no objeto retornado, `logoUrl: companyLogoUrl(user.company)`.
- [ ] **Step 7: Verificar.** `npm test`, `npx tsc --noEmit`, `npm run lint`. Teste contra o banco local (arquivo temporário, limpeza no `finally`): criar empresa temporária, gravar via `logoUpdateData` um PNG mínimo, ler pela mesma consulta da rota e conferir bytes e tipo; `logoUpdateData(null)` zera tudo.
- [ ] **Step 8: Commit** — "feat(logo): rota da imagem, gravacao por upload e sessao com URL curta".

---

### Task 3: Interface

**Files:**
- Create: `src/lib/image-resize.ts`
- Modify: `src/components/forms/CompanyForm.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/hooks/api/use-companies.ts` (tipos)

- [ ] **Step 1:** `src/lib/image-resize.ts`:

```ts
export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_SOURCE_BYTES = 5 * 1024 * 1024

/** Reduz a imagem para caber em `max`×`max` e devolve um data URL WebP (ou PNG se o navegador não gerar WebP). */
export async function resizeImageToDataUrl(file: File, max = 512): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Não foi possível ler a imagem'))
      el.src = url
    })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL('image/webp', 0.9)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

- [ ] **Step 2: CompanyForm.** Remover o `Input` "URL do Logo" e `logoUrl` dos `defaultValues`/tipo do form. Estado local: `logoPreview` (inicia com `company?.logoUrl ?? null`), `logoValue` (`undefined | string | null`), `logoError`. Bloco "Logo" no lugar do input: prévia 64×64 (`<img>` com `object-contain bg-white border rounded`) ou placeholder com ícone; botão "Enviar imagem" que abre `<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden">`; botão "Remover" quando houver prévia. Ao escolher: validar tipo em `ACCEPTED_LOGO_TYPES` e tamanho ≤ `MAX_SOURCE_BYTES` (mensagens "Use PNG, JPG ou WebP" / "Arquivo muito grande (máx. 5 MB)"), `resizeImageToDataUrl`, atualizar prévia e `logoValue`. "Remover": prévia null, `logoValue = null`. No `onSubmit`, enviar `...(logoValue !== undefined ? { logo: logoValue } : {})`. Mostrar a logo na prévia de cor, à esquerda do nome. Textos com cor explícita (`text-gray-900`/`text-gray-700`). Ajustar o tipo da mutation em `use-companies.ts` para aceitar `logo?: string | null` e não exigir `logoUrl`.
- [ ] **Step 2b: Lista de empresas.** Em `src/app/(authenticated)/admin/companies/page.tsx`, onde o card/linha mostra a inicial do nome (`company.name.charAt(0)`), mostrar `<img src={company.logoUrl}>` (mesmo tamanho, `object-contain bg-white`) quando houver `logoUrl`, senão a inicial como hoje.

- [ ] **Step 3: Sidebar.** Trocar `<Image src={company.logoUrl} ... />` por `<img src={company.logoUrl} alt={company.name} width={40} height={40} className="w-10 h-10 rounded-lg object-contain bg-white" />` e remover o import de `next/image` se não for mais usado. Adicionar `{/* eslint-disable-next-line @next/next/no-img-element */}` se o lint reclamar, com comentário explicando (o otimizador buscaria a rota sem cookies). Com `onError`, esconder a imagem e mostrar o ícone `Building2` (a URL da sessão pode apontar para uma logo removida até o próximo login).
- [ ] **Step 4: Verificar** `npx tsc --noEmit`, `npm run lint`, `npm test`. Sem browser (o controlador verifica).
- [ ] **Step 5: Commit** — "feat(logo): upload da logo no cadastro da empresa".

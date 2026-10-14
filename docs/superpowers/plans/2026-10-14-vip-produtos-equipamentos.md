# Cliente VIP, produtos e equipamentos enriquecidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar cliente VIP (OS zerada, fora do financeiro), catálogo de produtos com menu próprio e uso na OS, e equipamentos com características, fotos e cadastro rápido na OS.

**Architecture:** Mudanças aditivas no Prisma (`db push`), regras puras em `src/lib/*` testadas com vitest, rotas Next seguindo os padrões de `services` e `clients/[id]/equipments`, UI com react-hook-form + React Query como nos formulários atuais. Quatro PRs sequenciais a partir de `origin/main`.

**Tech Stack:** Next.js (app router), Prisma 7 + PostgreSQL, Zod 4, React Query, axios, vitest, Tailwind.

Spec: `docs/superpowers/specs/2026-10-14-vip-produtos-equipamentos-design.md`

## Convenções do ambiente

- Testes: `npx vitest run <arquivo>`; suíte toda: `npm test`. Tipos: `npx tsc --noEmit`.
- Schema: editar `prisma/schema.prisma`, depois `npx prisma db push --config prisma/prisma.config.ts` e `npx prisma generate`. Postgres local em `localhost:5434`; dev server `npm run dev -- -p 3001`.
- Não rodar `next build` com o dev server ligado (ver memória "Armadilhas de desenvolvimento").
- Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Branch por parte: `git checkout -b feature/<nome> origin/main` (a Parte 1 já parte de `feature/vip-produtos-equipamentos`, que contém o spec; abrir o PR dela a partir dessa branch, e as demais a partir de `origin/main` depois do merge).
- Cores/dark mode: reutilizar classes dos componentes existentes (ver memória "cor no dark mode").

---

# PARTE 1 — Cliente VIP (PR 1, branch `feature/vip-produtos-equipamentos` → renomear para `feature/cliente-vip` antes do push)

### Task 1.1: Schema

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1:** No model `Client`, após `document`, adicionar:

```prisma
  // VIP: não paga serviços; fora dos gráficos financeiros
  isVip          Boolean @default(false) @map("is_vip")
  vipCompanyName String? @map("vip_company_name")
```

No model `ServiceOrder`, após `totalAmount`:

```prisma
  // Snapshot do VIP do cliente ao criar a OS; total gravado = 0 e fora da receita
  isVipOrder  Boolean @default(false) @map("is_vip_order")
```

- [ ] **Step 2:** `npx prisma db push --config prisma/prisma.config.ts && npx prisma generate`. Esperado: "Your database is now in sync".
- [ ] **Step 3:** Commit `feat(db): campos de cliente VIP e snapshot na OS`.

### Task 1.2: Regra pura de total VIP

**Files:** Create `src/lib/vip.ts`, `src/lib/__tests__/vip.test.ts`

- [ ] **Step 1: teste**

```ts
import { describe, it, expect } from 'vitest'
import { orderTotalFor, normalizeVipCompanyName } from '../vip'

describe('orderTotalFor', () => {
  it('zera o total de OS VIP', () => expect(orderTotalFor(150.5, true)).toBe(0))
  it('mantém o total de OS comum', () => expect(orderTotalFor(150.5, false)).toBe(150.5))
})

describe('normalizeVipCompanyName', () => {
  it('limpa quando não é VIP', () => expect(normalizeVipCompanyName(false, 'ACME')).toBeNull())
  it('apara espaços quando VIP', () => expect(normalizeVipCompanyName(true, '  ACME ')).toBe('ACME'))
  it('vazio vira null', () => expect(normalizeVipCompanyName(true, '   ')).toBeNull())
  it('undefined vira null', () => expect(normalizeVipCompanyName(true, undefined)).toBeNull())
})
```

- [ ] **Step 2:** `npx vitest run src/lib/__tests__/vip.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: implementação**

```ts
/** Total gravado da OS: VIP não paga (itens mantêm o preço, o total é zero). */
export function orderTotalFor(total: number, isVip: boolean): number {
  return isVip ? 0 : total
}

/** Nome da empresa só existe para VIP; vazio vira null. */
export function normalizeVipCompanyName(isVip: boolean, name: string | null | undefined): string | null {
  if (!isVip) return null
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed : null
}
```

- [ ] **Step 4:** Rodar o teste → PASS. **Step 5:** Commit `feat(vip): regras de total e nome da empresa`.

### Task 1.3: Validação e API de clientes

**Files:** Modify `src/lib/validations/client.ts`, `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`, `src/hooks/api/use-clients.ts`

- [ ] **Step 1:** Em `clientSchema` adicionar:

```ts
  isVip: z.boolean().optional().default(false),
  vipCompanyName: z.string().trim().max(120, 'Máximo de 120 caracteres').optional().or(z.literal('')),
```

- [ ] **Step 2:** Nas rotas POST (`clients/route.ts`) e PUT/PATCH (`clients/[id]/route.ts`): antes de gravar, `data.vipCompanyName = normalizeVipCompanyName(data.isVip, data.vipCompanyName)` (importar de `@/lib/vip`). Ler os arquivos e aplicar onde o objeto `data` do `prisma.client.create/update` é montado; se a rota usa `validatedData` direto, sobrescrever o campo no objeto antes de passar.
- [ ] **Step 3:** Em `use-clients.ts`, adicionar `isVip: boolean` e `vipCompanyName: string | null` ao tipo `Client`.
- [ ] **Step 4:** `npx tsc --noEmit` → sem erros novos. Commit `feat(clients): cliente VIP na API`.

### Task 1.4: Total VIP na criação/edição de OS

**Files:** Modify `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1 (POST):** após validar o cliente (`const client = ...`), calcular:

```ts
const isVipOrder = client.isVip
const totalAmount = orderTotalFor(computeOrderTotal(validatedData.services, validatedData.products), isVipOrder)
```

e passar `isVipOrder` no `tx.serviceOrder.create({ data: { ..., totalAmount, isVipOrder } })`. Importar `orderTotalFor` de `@/lib/vip`.
- [ ] **Step 2 (PUT `[id]`):** o `existingOrder` precisa trazer `isVipOrder` (verificar o `select`/`include` da leitura; adicionar se for `select`). Calcular `totalAmount = orderTotalFor(computeOrderTotal(...), existingOrder.isVipOrder)`. O cliente não muda na edição, e o snapshot original é preservado.
- [ ] **Step 3:** `npx tsc --noEmit`; `npm test` → verde. Commit `feat(orders): total zerado para cliente VIP`.

### Task 1.5: Dashboard fora do financeiro

**Files:** Modify `src/app/api/dashboard/stats/route.ts`, `src/app/api/dashboard/charts/route.ts`

- [ ] **Step 1 (stats):** nos dois `aggregate` de receita (`FINISHED`/`PAID`) trocar `where: { ...orderWhere, status: X }` por `where: { ...orderWhere, status: X, isVipOrder: false }`. As contagens por status não mudam.
- [ ] **Step 2 (charts):** em `prisma.serviceOrder.findMany` adicionar `isVipOrder: true` ao `select`; em `prisma.orderService.findMany` mudar o `where` para `{ order: { ...orderWhere, createdAt: periodWhere, isVipOrder: false } }`.
  - `ordersOverTime`: continuar contando todas as OS, mas somar `revenue` só se `!order.isVipOrder`.
  - `topClients`: no loop `for (const order of orders)` fazer `if (order.isVipOrder) continue` antes de agregar (ranking é por valor/receita).
- [ ] **Step 3:** Smoke manual (Task 1.7). Commit `feat(dashboard): exclui OS VIP da receita e rankings`.

### Task 1.6: UI

**Files:** Modify `src/components/forms/ClientForm.tsx`, `src/app/(authenticated)/clients/page.tsx`, `src/components/forms/OrderForm.tsx`, `src/lib/pdf/generate-order-pdf.ts` (somente se o total já vem de `totalAmount`; nada a fazer se sim)

- [ ] **Step 1 (ClientForm):** adicionar `Checkbox` (de `@/components/ui`) "Cliente VIP" ligado a `isVip` via `register`/`watch`; quando `watch('isVip')` for true renderizar `Input` "Nome da empresa" (`vipCompanyName`). Incluir `isVip`/`vipCompanyName` nos `defaultValues` (valores do cliente em edição; `false`/`''` na criação). Verificar também o modal de cliente rápido do `OrderForm` (`showNewClientModal`) — se ele monta um payload próprio, deixar VIP fora dele (somente o cadastro completo define VIP).
- [ ] **Step 2 (listagem):** na tabela de clientes, ao lado do nome, `Badge` "VIP" quando `client.isVip`, com `client.vipCompanyName` em texto secundário.
- [ ] **Step 3 (OrderForm):** o `OrderForm` precisa saber se o cliente selecionado é VIP (lista de clientes em `useClients` já traz o objeto). Calcular `const selectedClientIsVip = !!clients.find(c => c.id === watch('clientId'))?.isVip` (na edição, usar `order.isVipOrder` se disponível; incluir `isVipOrder` no tipo `order` do form e no retorno da API, que já devolve o registro completo). Quando VIP: o total exibido (`formatCurrency(servicesTotal() + productsTotal())`) vira `formatCurrency(0)` e aparece o aviso `"Cliente VIP: o total da OS será R$ 0,00"` acima do total.
- [ ] **Step 4:** `npx tsc --noEmit`; `npm test`. Commit `feat(ui): cliente VIP no cadastro, listagem e OS`.

### Task 1.7: Verificação e PR

- [ ] **Step 1:** Subir dev server (`preview_start`), criar cliente VIP com empresa, criar OS com serviço R$ 100: total R$ 0,00; abrir dashboard e confirmar que a receita não muda; desmarcar VIP e conferir que `vipCompanyName` foi limpo.
- [ ] **Step 2:** `npm test` e `npx tsc --noEmit` verdes. Renomear branch (`git branch -m feature/cliente-vip`), `git push -u origin feature/cliente-vip`, abrir PR (corpo termina com a linha 🤖 Generated with Claude Code).

---

# PARTE 2 — Catálogo de produtos (PR 2, branch `feature/produtos-catalogo`)

### Task 2.1: Schema

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1:** Adicionar o model e relações:

```prisma
// Catálogo de produtos da loja (sem estoque)
model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  storeId String @map("store_id")
  store   Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)

  orderProducts OrderProduct[]

  @@index([storeId])
  @@map("products")
}
```

Em `Store` adicionar `products Product[]`. Em `OrderProduct` adicionar:

```prisma
  productId String?  @map("product_id")
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
```

e atualizar o comentário ("Produto vendido na OS; opcionalmente do catálogo").
- [ ] **Step 2:** `db push` + `generate`. Commit `feat(db): catálogo de produtos`.

### Task 2.2: Validações

**Files:** Create `src/lib/validations/product.ts`; modify `src/lib/validations/index.ts`, `src/lib/validations/order.ts`, `src/lib/validations/__tests__/order.test.ts`

- [ ] **Step 1: teste** (acrescentar em `order.test.ts`):

```ts
it('aceita produto do catálogo e saveToCatalog', () => {
  const r = orderProductSchema.parse({ name: 'Filtro', quantity: 2, unitPrice: 10, productId: 'p1', saveToCatalog: false })
  expect(r.productId).toBe('p1')
})
```

- [ ] **Step 2:** Rodar → FAIL (campo removido pelo Zod/ausente). **Step 3:** em `orderProductSchema` acrescentar `productId: z.string().min(1).optional(), saveToCatalog: z.boolean().optional(),`. Exportar o schema `orderProductSchema` no teste se ainda não estiver importado.
- [ ] **Step 4:** Criar `product.ts`:

```ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().optional().or(z.literal('')),
  price: z.coerce
    .number({ error: 'Informe o preço' })
    .min(0, 'Preço deve ser maior ou igual a zero')
    .transform((v) => Math.round(v * 100) / 100),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  isActive: z.boolean().optional(),
})
export type ProductFormData = z.input<typeof productSchema>
```

e `export * from './product'` em `index.ts`. **Step 5:** `npx vitest run src/lib/validations` → PASS. Commit.

### Task 2.3: Resolução de produtos da OS (regra pura)

**Files:** Create `src/lib/products/order-products.ts`, `src/lib/products/__tests__/order-products.test.ts`

Contrato: `resolveOrderProducts(tx, storeId, products)` devolve `{ name, quantity, unitPrice, productId: string | null }[]`, criando produtos no catálogo para itens com `saveToCatalog: true` sem `productId`; lança `ProductAccessError` se algum `productId` não pertencer à loja.

- [ ] **Step 1: teste** com `tx` falso:

```ts
import { describe, it, expect, vi } from 'vitest'
import { resolveOrderProducts, ProductAccessError } from '../order-products'

const base = { name: 'Filtro', quantity: 1, unitPrice: 10 }

function fakeTx(found: string[] = []) {
  return {
    product: {
      findMany: vi.fn(async () => found.map((id) => ({ id }))),
      create: vi.fn(async ({ data }: { data: { name: string } }) => ({ id: `new-${data.name}` })),
    },
  }
}

describe('resolveOrderProducts', () => {
  it('mantém avulso sem vínculo', async () => {
    const tx = fakeTx()
    expect(await resolveOrderProducts(tx as never, 's1', [base])).toEqual([{ ...base, productId: null }])
    expect(tx.product.create).not.toHaveBeenCalled()
  })
  it('vincula produto da loja', async () => {
    const tx = fakeTx(['p1'])
    const r = await resolveOrderProducts(tx as never, 's1', [{ ...base, productId: 'p1' }])
    expect(r[0].productId).toBe('p1')
  })
  it('rejeita produto de outra loja', async () => {
    const tx = fakeTx([])
    await expect(resolveOrderProducts(tx as never, 's1', [{ ...base, productId: 'x' }])).rejects.toBeInstanceOf(ProductAccessError)
  })
  it('salva no catálogo quando pedido', async () => {
    const tx = fakeTx()
    const r = await resolveOrderProducts(tx as never, 's1', [{ ...base, saveToCatalog: true }])
    expect(tx.product.create).toHaveBeenCalledOnce()
    expect(r[0].productId).toBe('new-Filtro')
  })
})
```

- [ ] **Step 2:** rodar → FAIL. **Step 3: implementação**

```ts
import type { Prisma } from '@prisma/client'

export class ProductAccessError extends Error {
  constructor() {
    super('Produto não pertence à loja da OS')
    this.name = 'ProductAccessError'
  }
}

interface Input {
  name: string
  quantity: number
  unitPrice: number
  productId?: string
  saveToCatalog?: boolean
}

export async function resolveOrderProducts(tx: Prisma.TransactionClient, storeId: string, products: Input[]) {
  const ids = Array.from(new Set(products.map((p) => p.productId).filter((x): x is string => !!x)))
  if (ids.length > 0) {
    const found = await tx.product.findMany({ where: { id: { in: ids }, storeId }, select: { id: true } })
    if (found.length !== ids.length) throw new ProductAccessError()
  }
  const out: { name: string; quantity: number; unitPrice: number; productId: string | null }[] = []
  for (const p of products) {
    let productId = p.productId ?? null
    if (!productId && p.saveToCatalog === true) {
      const created = await tx.product.create({ data: { name: p.name, price: p.unitPrice, storeId } })
      productId = created.id
    }
    out.push({ name: p.name, quantity: p.quantity, unitPrice: p.unitPrice, productId })
  }
  return out
}
```

- [ ] **Step 4:** rodar → PASS. Commit `feat(products): resolução de produtos da OS`.

### Task 2.4: Usar na criação/edição de OS

**Files:** Modify `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/lib/packages/order-include.ts` (se `orderProductsInclude` não trouxer `productId`, é campo escalar, já vem)

- [ ] **Step 1:** Em ambos, substituir o loop `for (const p of validatedData.products) { tx.orderProduct.create(...) }` por:

```ts
const resolved = await resolveOrderProducts(tx, storeId, validatedData.products)
for (const p of resolved) {
  await tx.orderProduct.create({
    data: { orderId, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice, productId: p.productId },
  })
}
```

(`storeId`: `validatedData.storeId` no POST; `existingOrder.storeId` no PUT; `orderId`: `created.id` no POST, `id` no PUT. Garantir que o `existingOrder` do PUT traz `storeId`.)
- [ ] **Step 2:** No `catch` das duas rotas, antes do 500: `if (error instanceof ProductAccessError) return NextResponse.json({ error: error.message }, { status: 400 })`.
- [ ] **Step 3:** `npm test` + `tsc`. Commit `feat(orders): produtos do catálogo e salvar no catálogo`.

### Task 2.5: API de produtos

**Files:** Create `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`

- [ ] **Step 1:** Copiar `src/app/api/services/route.ts` e `src/app/api/services/[id]/route.ts`, trocando `service`→`product`, `serviceSchema`→`productSchema`, mensagens ("serviços"→"produtos"), `prisma.service`→`prisma.product`. GET aceita também `active=1` (só ativos): `if (searchParams.get('active') === '1') where.isActive = true`.
- [ ] **Step 2:** No DELETE de `[id]`: se existir `orderProduct.count({ where: { productId: id } }) > 0`, fazer `update({ isActive: false })` e responder `{ archived: true }`; senão apagar e responder `{ archived: false }`.
- [ ] **Step 3:** Commit `feat(products): API do catálogo`.

### Task 2.6: Hook, página, formulário e menu

**Files:** Create `src/hooks/api/use-products.ts`, `src/components/forms/ProductForm.tsx`, `src/app/(authenticated)/products/page.tsx`; modify `src/hooks/api/index.ts`, `src/components/forms/index.ts`, `src/components/layout/Sidebar.tsx`

- [ ] **Step 1:** `use-products.ts` espelha `use-services.ts` (list com `search`/`storeId`/`active`, create, update, delete). Exportar no `index.ts` dos hooks.
- [ ] **Step 2:** `ProductForm.tsx` espelha `ServiceForm.tsx` (nome, descrição, preço, loja com a mesma regra de seleção de loja do ServiceForm).
- [ ] **Step 3:** `products/page.tsx` espelha `services/page.tsx` (busca, tabela, modal criar/editar, ações). Acrescentar coluna/ação de ativar-desativar via update `{ isActive }`.
- [ ] **Step 4:** `Sidebar.tsx`: inserir item após o de `/services` com mesmas props (`href: '/products'`, ícone `Package` de lucide-react — conferir se já é usado por `/packages`; se for, usar `ShoppingBag`; label "Produtos"; mesmas `roles`).
- [ ] **Step 5:** `tsc`; abrir `/products` no preview, criar/editar/desativar. Commit `feat(products): menu e tela de produtos`.

### Task 2.7: Seleção de produto na OS

**Files:** Modify `src/components/orders/OrderProductsSection.tsx`, `src/components/forms/OrderForm.tsx`

- [ ] **Step 1:** `OrderProductsSection` recebe novas props `storeId: string` e `setValue`/`watch` (de `useFormContext` ou props, seguir como `OrderForm` passa `control/register`). Usar `useProducts({ storeId, active: true })`.
- [ ] **Step 2:** Acima da lista, um `Select` "Adicionar produto cadastrado": ao escolher, `append({ name: p.name, quantity: 1, unitPrice: Number(p.price), productId: p.id })`. Manter o botão "Adicionar Produto" (avulso) que passa a fazer `append({ name:'', quantity:1, unitPrice:0, saveToCatalog:false })`.
- [ ] **Step 3:** Em linhas sem `productId`, mostrar `Checkbox` "Salvar no catálogo" ligado a `products.${index}.saveToCatalog`.
- [ ] **Step 4:** `OrderForm`: passar `storeId={watch('storeId')}` e incluir `productId`/`saveToCatalog` no mapeamento do payload (`products: (data.products ?? []).map(...)` ~linha 383) e `productId` nos `defaultValues` da edição (~linha 116, `p.productId ?? undefined`; adicionar `productId` ao tipo `order.products`).
- [ ] **Step 5:** Preview: criar OS com produto cadastrado e com avulso "salvar no catálogo"; conferir que aparece em `/products`. `npm test`, `tsc`. Commit `feat(orders): selecionar produto do catálogo na OS`. Push e PR.

---

# PARTE 3 — Características e fotos do equipamento (PR 3, branch `feature/equipamento-detalhes`)

### Task 3.1: Schema

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1:** Em `Equipment` adicionar `tags EquipmentTag[]` e `photos EquipmentPhoto[]`, e criar:

```prisma
// Característica livre do equipamento (ex.: "Inverter", "220V")
model EquipmentTag {
  id          String @id @default(cuid())
  label       String
  equipmentId String @map("equipment_id")
  equipment   Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@unique([equipmentId, label])
  @@map("equipment_tags")
}

// Foto do equipamento (base64 sem prefixo, já redimensionada no cliente)
model EquipmentPhoto {
  id          String   @id @default(cuid())
  data        String   @db.Text
  mimeType    String   @map("mime_type")
  sizeBytes   Int      @map("size_bytes")
  createdAt   DateTime @default(now()) @map("created_at")
  equipmentId String   @map("equipment_id")
  equipment   Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@index([equipmentId])
  @@map("equipment_photos")
}
```

- [ ] **Step 2:** `db push` + `generate`. Commit `feat(db): características e fotos de equipamento`.

### Task 3.2: Características (regra pura + validação)

**Files:** Create `src/lib/equipments/tags.ts`, `src/lib/equipments/__tests__/tags.test.ts`; modify `src/lib/validations/equipment.ts`

- [ ] **Step 1: teste**

```ts
import { describe, it, expect } from 'vitest'
import { normalizeTags, MAX_TAGS } from '../tags'

describe('normalizeTags', () => {
  it('apara, colapsa espaços e remove vazios', () => {
    expect(normalizeTags(['  Inverter ', '', '  ', 'Wi   Fi'])).toEqual(['Inverter', 'Wi Fi'])
  })
  it('deduplica sem diferenciar maiúsculas, mantendo a primeira', () => {
    expect(normalizeTags(['Inverter', 'inverter', 'INVERTER', '220V'])).toEqual(['Inverter', '220V'])
  })
  it('limita ao máximo', () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `t${i}`)
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS)
  })
})
```

- [ ] **Step 2:** FAIL. **Step 3:**

```ts
export const MAX_TAGS = 20
export const MAX_TAG_LENGTH = 60

export function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    const label = raw.trim().replace(/\s+/g, ' ')
    if (!label) continue
    const key = label.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length === MAX_TAGS) break
  }
  return out
}
```

- [ ] **Step 4:** Em `equipment.ts` adicionar `tags: z.array(z.string().max(MAX_TAG_LENGTH, 'Característica muito longa')).max(MAX_TAGS * 2).optional().transform((t) => (t ? normalizeTags(t) : undefined))` tanto em `equipmentSchema` quanto em `updateEquipmentSchema` (ausente = não altera). Testes → PASS. Commit.

### Task 3.3: Fotos (regra pura)

**Files:** Create `src/lib/equipments/photos.ts`, `src/lib/equipments/__tests__/photos.test.ts`

- [ ] **Step 1: teste**

```ts
import { describe, it, expect } from 'vitest'
import { parsePhotoDataUrl, MAX_PHOTOS, MAX_PHOTO_BYTES } from '../photos'

const b64 = (n: number) => Buffer.alloc(n, 1).toString('base64')

describe('parsePhotoDataUrl', () => {
  it('aceita jpeg válido', () => {
    const r = parsePhotoDataUrl(`data:image/jpeg;base64,${b64(1000)}`)
    expect(r).toMatchObject({ ok: true, mimeType: 'image/jpeg', sizeBytes: 1000 })
  })
  it('rejeita tipo não permitido', () => {
    expect(parsePhotoDataUrl(`data:image/gif;base64,${b64(10)}`)).toMatchObject({ ok: false })
  })
  it('rejeita acima do limite', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(MAX_PHOTO_BYTES + 1)}`)).toMatchObject({ ok: false })
  })
  it('rejeita formato inválido', () => {
    expect(parsePhotoDataUrl('lixo')).toMatchObject({ ok: false })
  })
  it('expõe o limite de 5 fotos', () => expect(MAX_PHOTOS).toBe(5))
})
```

- [ ] **Step 2:** FAIL. **Step 3:**

```ts
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 800 * 1024
export const ACCEPTED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

type Parsed = { ok: true; mimeType: string; data: string; sizeBytes: number } | { ok: false; error: string }

export function parsePhotoDataUrl(dataUrl: unknown): Parsed {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'Imagem inválida' }
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl)
  if (!m) return { ok: false, error: 'Imagem inválida' }
  const mimeType = m[1].toLowerCase()
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: 'Use PNG, JPEG ou WebP' }
  }
  const data = m[2]
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  const sizeBytes = Math.floor((data.length * 3) / 4) - padding
  if (sizeBytes > MAX_PHOTO_BYTES) return { ok: false, error: 'Imagem acima de 800 KB' }
  return { ok: true, mimeType, data, sizeBytes }
}
```

- [ ] **Step 4:** PASS. Commit.

### Task 3.4: API de equipamentos com tags e serialização

**Files:** Create `src/lib/equipments/serialize.ts`; modify `src/app/api/clients/[id]/equipments/route.ts`, `src/app/api/clients/[id]/equipments/[equipmentId]/route.ts`

- [ ] **Step 1:** `serialize.ts`:

```ts
import type { Prisma } from '@prisma/client'

export const equipmentInclude = {
  tags: { select: { label: true }, orderBy: { label: 'asc' } },
  photos: { select: { id: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.EquipmentInclude

type Row = Prisma.EquipmentGetPayload<{ include: typeof equipmentInclude }>

export function serializeEquipment({ tags, photos, ...rest }: Row) {
  return { ...rest, tags: tags.map((t) => t.label), photos: photos.map((p) => ({ id: p.id })) }
}
```

- [ ] **Step 2 (GET/POST lista):** `findMany({ ..., include: equipmentInclude })` e `.map(serializeEquipment)`. No POST: extrair `const { tags = [], ...fields } = parsed.data`; `prisma.equipment.create({ data: { ...fields, clientId: id, tags: { create: tags.map((label) => ({ label })) } }, include: equipmentInclude })` e responder `serializeEquipment(created)`.
- [ ] **Step 3 (PATCH):** extrair `tags` de `parsed.data`; dentro de `prisma.$transaction`: `updateMany` com o restante (se houver campos), e se `tags !== undefined`: `equipmentTag.deleteMany({ where: { equipmentId } })` + `createMany`. Reler com `include: equipmentInclude` e serializar. Manter o 404 por `count === 0` — quando só `tags` vier, verificar a existência com `findFirst({ where: { id: equipmentId, clientId: id } })` antes.
- [ ] **Step 4:** `tsc`; ajustar o tipo `Equipment` em `use-equipments.ts` adicionando `tags: string[]; photos: { id: string }[]` e `EquipmentInput` com `tags?: string[]`. Commit `feat(equipments): características na API`.

### Task 3.5: API de fotos

**Files:** Create `src/app/api/clients/[id]/equipments/[equipmentId]/photos/route.ts`, `.../photos/[photoId]/route.ts`

- [ ] **Step 1 (POST):** usar `requireClientAccess(id, 'adicionar fotos em')`, ler `{ dataUrl }`, `parsePhotoDataUrl`, e em transação com lock:

```ts
const result = await prisma.$transaction(async (tx) => {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM equipments WHERE id = ${equipmentId} AND client_id = ${id} FOR UPDATE`
  if (locked.length === 0) return 'not-found' as const
  const count = await tx.equipmentPhoto.count({ where: { equipmentId } })
  if (count >= MAX_PHOTOS) return 'limit' as const
  return tx.equipmentPhoto.create({
    data: { equipmentId, data: parsed.data, mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes },
    select: { id: true },
  })
})
```

Respostas: `not-found` → 404, `limit` → 400 `"Máximo de 5 fotos por equipamento"`, ok → 201 `{ id }`.
- [ ] **Step 2 (GET `[photoId]`):** `requireClientAccess(id)`, `findFirst({ where: { id: photoId, equipmentId, equipment: { clientId: id } } })`; responder `new NextResponse(Buffer.from(photo.data, 'base64'), { headers: { 'Content-Type': photo.mimeType, 'Cache-Control': 'private, max-age=86400' } })`.
- [ ] **Step 3 (DELETE `[photoId]`):** `deleteMany` com o mesmo `where`; 404 se `count === 0`; 200 `{ ok: true }`.
- [ ] **Step 4:** Commit `feat(equipments): API de fotos`.

### Task 3.6: Hooks e UI

**Files:** Modify `src/hooks/api/use-equipments.ts`, `src/components/equipments/ClientEquipmentsModal.tsx`, `src/components/orders/EquipmentPicker.tsx`; Create `src/components/equipments/TagInput.tsx`, `src/components/equipments/EquipmentPhotos.tsx`

- [ ] **Step 1 (hooks):** adicionar `useUploadEquipmentPhoto(clientId)` (`POST .../photos` com `{ dataUrl }`) e `useDeleteEquipmentPhoto(clientId)`, ambos invalidando `['client-equipments', clientId]`. Util `equipmentPhotoUrl(clientId, equipmentId, photoId)` retornando a URL do GET.
- [ ] **Step 2 (`TagInput`):** props `{ value: string[]; onChange(v: string[]): void; disabled? }`. Input de texto; Enter ou vírgula adiciona via `normalizeTags([...value, text])`; chips com botão × para remover; mensagem quando atinge `MAX_TAGS`.
- [ ] **Step 3 (`EquipmentPhotos`):** props `{ clientId; equipmentId?: string; pending: File[]; onPendingChange(f: File[]): void; photos: {id:string}[] }`. Botão "Adicionar foto" (`<input type="file" accept="image/png,image/jpeg,image/webp">`); redimensiona com `resizeImageToDataUrl(file, 1280)` de `@/lib/image-resize` (conferir se a função aceita `max` e se o limite interno MAX_LOGO_DATA_BYTES comporta 800 KB; se não, parametrizar o limite com um terceiro argumento opcional sem mudar o comportamento atual da logo). Com `equipmentId`: envia na hora; sem: guarda no estado `pending`. Miniaturas com × para remover; desabilita o botão ao chegar em `MAX_PHOTOS`.
- [ ] **Step 4:** `ClientEquipmentsModal`: no formulário de criar/editar incluir `TagInput` e `EquipmentPhotos`; na lista, mostrar tags como chips e miniaturas. Ao criar: `POST` do equipamento, depois enviar fotos pendentes com o `id` retornado.
- [ ] **Step 5:** `EquipmentPicker`: exibir as tags do equipamento em texto pequeno ao lado do nome.
- [ ] **Step 6:** Preview: criar equipamento com 2 características e 2 fotos; editar removendo uma; 6ª foto bloqueada. `npm test`, `tsc`. Commit `feat(equipments): características e fotos na UI`. Push e PR.

---

# PARTE 4 — Cadastro rápido de equipamento na OS (PR 4, branch `feature/os-equipamento-rapido`)

### Task 4.1: Formulário reutilizável

**Files:** Create `src/components/equipments/EquipmentFields.tsx`; modify `src/components/equipments/ClientEquipmentsModal.tsx`

- [ ] **Step 1:** Extrair do modal os campos do formulário de equipamento (nome, marca, modelo, série, cor, observações, `TagInput`, `EquipmentPhotos`) para `EquipmentFields`, mantendo o comportamento do modal (refactor sem mudança funcional; conferir no preview que criar/editar continua igual).
- [ ] **Step 2:** Commit `refactor(equipments): campos de equipamento reutilizáveis`.

### Task 4.2: Mini-formulário na OS

**Files:** Create `src/components/orders/QuickEquipmentModal.tsx`; modify `src/components/orders/EquipmentPicker.tsx`, `src/components/forms/OrderForm.tsx`

- [ ] **Step 1:** `QuickEquipmentModal` (usa `Modal` de `@/components/ui`): props `{ open; clientId; onClose; onCreated(equipment: Equipment): void }`. Usa `useCreateEquipment(clientId)` com `EquipmentFields`; após o POST, envia fotos pendentes (`useUploadEquipmentPhoto`) e chama `onCreated`. Erros do servidor aparecem no próprio modal; falha parcial de foto mostra aviso e mantém o equipamento criado (reabrir edita pelo modal de equipamentos).
- [ ] **Step 2:** `EquipmentPicker`: nova prop `onCreateNew?: () => void`; quando `hasClient` e definida, botão "+ Novo equipamento" abaixo da lista (também visível quando a lista está vazia, substituindo a frase "Nenhum equipamento...").
- [ ] **Step 3:** `OrderForm`: estado `quickEquipmentFor: number | null` (índice da linha de serviço); `onCreateNew={() => setQuickEquipmentFor(index)}`; `onCreated`: `setValue(`services.${i}.equipmentIds`, [...atuais, novo.id])` e fechar. A lista usa `useClientEquipments`, já invalidada pelo hook de criação.
- [ ] **Step 4:** Preview: criar cliente rápido na OS → adicionar serviço → "Novo equipamento" com tags e foto → equipamento já marcado na linha → salvar OS; reabrir a OS e conferir vínculo. `npm test`, `tsc`. Commit `feat(orders): cadastro rápido de equipamento na OS`. Push e PR.

---

## Cobertura do spec

| Spec | Tarefas |
|---|---|
| 1. VIP | 1.1–1.7 |
| 2. Produtos + menu + OS | 2.1–2.7 |
| 3. Cadastro rápido na OS | 4.1–4.2 |
| 4. Características | 3.1, 3.2, 3.4, 3.6 |
| 5. Fotos | 3.1, 3.3, 3.5, 3.6 |

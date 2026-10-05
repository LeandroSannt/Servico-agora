# Pacotes de Serviços Pré-pagos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a empresa cadastre pacotes ("10 limpezas por R$ 250"), venda a clientes, e que a OS consuma o saldo com itens a R$ 0, mantendo saldo sempre correto e com histórico.

**Architecture:** Três tabelas novas (`service_packages`, `client_packages`, `package_usages`); saldo calculado por livro-razão (quantidade − consumos); item coberto da OS é um `OrderService` normal com preço 0 e um `PackageUsage` apontando para ele. Lógica de saldo/divisão em funções puras testadas com Vitest; rotas Next.js seguem o padrão existente (`requireAuth`, filtros por loja/empresa, React Query no front).

**Tech Stack:** Next.js 14 (App Router), Prisma 7 + PostgreSQL, Zod 4, React Hook Form, TanStack Query, Tailwind, Vitest (novo).

**Spec:** `docs/superpowers/specs/2026-10-05-pacotes-de-servicos-design.md`

**Branch:** `feature/pacotes-de-servicos` (já existe, criada a partir da `main`).

**Pré-requisito local:** Postgres de desenvolvimento no ar (`npm run docker:up`; o `.env` aponta para `localhost:5434`). Comandos abaixo rodam na raiz do projeto.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts`, `package.json` | Vitest com alias `@/` e script `test` |
| `prisma/schema.prisma` | Enum `ClientPackageStatus`, modelos `ServicePackage`, `ClientPackage`, `PackageUsage`, relações inversas |
| `src/lib/packages/errors.ts` | `InsufficientBalanceError` |
| `src/lib/packages/balance.ts` | Saldo por pacote e por serviço (puro) |
| `src/lib/packages/allocate.ts` | Distribuição FIFO de consumo (puro) |
| `src/lib/packages/split.ts` | Divide item da OS em coberto(s) + cobrado (puro) |
| `src/lib/packages/order-include.ts` | `include` compartilhado de itens da OS com `packageUsage` |
| `src/lib/packages/consume.ts` | Cria itens da OS e consumos dentro da transação (lock + FIFO) |
| `src/lib/packages/client-packages.ts` | Consultas de saldo/pacotes de clientes e serialização |
| `src/lib/packages/store-access.ts` | Verificação de acesso do usuário a uma loja |
| `src/lib/validations/package.ts`, `order.ts`, `index.ts` | Schemas Zod |
| `src/app/api/packages/route.ts`, `[id]/route.ts` | CRUD de pacotes |
| `src/app/api/clients/[id]/packages/route.ts`, `[clientPackageId]/route.ts` | Saldo, venda e cancelamento |
| `src/app/api/clients/route.ts` | `balances` por cliente na lista |
| `src/app/api/orders/route.ts`, `[id]/route.ts` | Consumo de pacote ao criar/editar OS; includes |
| `src/app/api/dashboard/stats/route.ts`, `src/hooks/api/use-dashboard.ts`, `src/app/(authenticated)/page.tsx` | Receita de pacotes |
| `src/hooks/api/use-packages.ts`, `use-client-packages.ts`, `index.ts` | React Query |
| `src/components/layout/Sidebar.tsx` | Item "Pacotes" |
| `src/app/(authenticated)/packages/page.tsx`, `src/components/forms/PackageForm.tsx` | Tela de pacotes |
| `src/components/packages/SellPackageModal.tsx`, `ClientPackagesModal.tsx`, `src/app/(authenticated)/clients/page.tsx` | Venda e histórico |
| `src/components/forms/OrderForm.tsx` | "Usar pacote" |
| `src/app/(authenticated)/orders/page.tsx`, `src/hooks/api/use-orders.ts` | Sufixo "(pacote)" e tipos |
| `.github/workflows/deploy.yml` | `npm test` no job `check` |

---

### Task 1: Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/packages/__tests__/smoke.test.ts` (temporário, apagado na Task 3)
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Instalar Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Script de teste**

Em `package.json`, dentro de `"scripts"`, adicionar após `"lint"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Config com alias `@/`**

Criar `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 4: Teste de fumaça**

Criar `src/lib/packages/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest', () => {
  it('roda', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Rodar**

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 6: Excluir testes do build do Next**

`tsconfig.json` inclui `**/*.ts`; o `next build` só compila o que é importado, então os testes não entram no bundle. Nada a fazer. Confirmar que `npx tsc --noEmit` passa (os tipos do Vitest são resolvidos pelo pacote).

Run: `npx tsc --noEmit`
Expected: sem saída (sucesso).

- [ ] **Step 7: CI**

Em `.github/workflows/deploy.yml`, job `check`, após a linha `- run: npx tsc --noEmit` adicionar:

```yaml
      - run: npm test
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/packages/__tests__/smoke.test.ts .github/workflows/deploy.yml
git commit -m "test: adiciona Vitest e roda no CI"
```

---

### Task 2: Schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Relações inversas nos modelos existentes**

Em `model Store`, após `serviceOrders ServiceOrder[]`:

```prisma
  servicePackages ServicePackage[]
```

Em `model Service`, após `orderServices OrderService[]`:

```prisma
  packages       ServicePackage[]
  clientPackages ClientPackage[]
```

Em `model Client`, após `serviceOrders ServiceOrder[]`:

```prisma
  packages ClientPackage[]
```

Em `model User`, após `serviceOrdersCreated ServiceOrder[] @relation("OrderCreator")`:

```prisma
  soldPackages ClientPackage[] @relation("PackageSeller")
```

Em `model ServiceOrder`, após `services OrderService[]`:

```prisma
  packageUsages PackageUsage[]
```

Em `model OrderService`, após `order   ServiceOrder @relation(...)`:

```prisma
  packageUsage PackageUsage?
```

- [ ] **Step 2: Modelos novos**

Adicionar ao final de `prisma/schema.prisma` (antes dos modelos de WhatsApp ou ao fim do arquivo; a posição não importa):

```prisma
// ==================== PACOTES PRÉ-PAGOS ====================

enum ClientPackageStatus {
  ACTIVE
  CANCELLED
}

// Pacote oferecido pela loja: N unidades de um serviço por um preço fechado
model ServicePackage {
  id          String   @id @default(cuid())
  name        String
  description String?
  quantity    Int
  price       Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  storeId   String  @map("store_id")
  store     Store   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  // NoAction (não Restrict) para a exclusão em cascata de loja/empresa funcionar
  serviceId String  @map("service_id")
  service   Service @relation(fields: [serviceId], references: [id], onDelete: NoAction)

  sales ClientPackage[]

  @@map("service_packages")
}

// Venda de um pacote a um cliente (copia os dados do pacote no momento da venda)
model ClientPackage {
  id          String              @id @default(cuid())
  name        String
  quantity    Int
  price       Decimal             @db.Decimal(10, 2)
  status      ClientPackageStatus @default(ACTIVE)
  notes       String?
  soldAt      DateTime            @default(now()) @map("sold_at")
  cancelledAt DateTime?           @map("cancelled_at")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  clientId  String         @map("client_id")
  client    Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  packageId String         @map("package_id")
  package   ServicePackage @relation(fields: [packageId], references: [id], onDelete: NoAction)
  serviceId String         @map("service_id")
  service   Service        @relation(fields: [serviceId], references: [id], onDelete: NoAction)
  soldById  String         @map("sold_by_id")
  soldBy    User           @relation("PackageSeller", fields: [soldById], references: [id], onDelete: NoAction)

  usages PackageUsage[]

  @@index([clientId, serviceId, status])
  @@map("client_packages")
}

// Consumo de saldo por um item de OS. Apagar o item apaga o consumo (devolve saldo).
model PackageUsage {
  id        String   @id @default(cuid())
  quantity  Int
  createdAt DateTime @default(now()) @map("created_at")

  clientPackageId String        @map("client_package_id")
  clientPackage   ClientPackage @relation(fields: [clientPackageId], references: [id], onDelete: Cascade)
  orderId         String        @map("order_id")
  order           ServiceOrder  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderServiceId  String        @unique @map("order_service_id")
  orderService    OrderService  @relation(fields: [orderServiceId], references: [id], onDelete: Cascade)

  @@index([clientPackageId])
  @@map("package_usages")
}
```

- [ ] **Step 3: Corrigir o script `db:push`**

O config do Prisma fica em `prisma/prisma.config.ts` e o Prisma 7 só procura na raiz; sem `--config` o comando falha com "The datasource.url property is required". Em `package.json`, trocar:

```json
    "db:push": "prisma db push",
```

por:

```json
    "db:push": "prisma db push --config prisma/prisma.config.ts",
```

- [ ] **Step 4: Aplicar no banco local e gerar client**

Run: `npm run db:push`
Expected: `Your database is now in sync with your Prisma schema.` e `Generated Prisma Client`.

- [ ] **Step 5: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma package.json
git commit -m "feat(pacotes): schema de pacotes, vendas e consumos"
```

---

### Task 3: Lógica pura — saldo, alocação FIFO e divisão de item (TDD)

**Files:**
- Create: `src/lib/packages/errors.ts`
- Create: `src/lib/packages/balance.ts`
- Create: `src/lib/packages/allocate.ts`
- Create: `src/lib/packages/split.ts`
- Create: `src/lib/packages/__tests__/balance.test.ts`
- Create: `src/lib/packages/__tests__/allocate.test.ts`
- Create: `src/lib/packages/__tests__/split.test.ts`
- Delete: `src/lib/packages/__tests__/smoke.test.ts`

- [ ] **Step 1: Erro tipado**

Criar `src/lib/packages/errors.ts`:

```ts
// Lançado dentro da transação da OS quando o saldo não cobre o pedido.
// A rota captura e responde 409 { error, serviceId, remaining }.
export class InsufficientBalanceError extends Error {
  constructor(
    public readonly serviceId: string,
    public readonly remaining: number
  ) {
    super('Saldo do pacote insuficiente')
    this.name = 'InsufficientBalanceError'
  }
}
```

- [ ] **Step 2: Testes de saldo (falhando)**

Criar `src/lib/packages/__tests__/balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { remainingOf, toBalances, computeBalance, type PackageWithUsages } from '@/lib/packages/balance'

const d = (s: string) => new Date(s)

const pkgA: PackageWithUsages = {
  id: 'A', quantity: 10, soldAt: d('2026-01-01'),
  usages: [{ quantity: 3, orderId: 'os1' }, { quantity: 2, orderId: 'os2' }],
}
const pkgB: PackageWithUsages = { id: 'B', quantity: 5, soldAt: d('2026-02-01'), usages: [] }

describe('remainingOf', () => {
  it('quantidade menos consumos', () => {
    expect(remainingOf(pkgA)).toBe(5)
  })
  it('saldo zero quando tudo consumido', () => {
    expect(remainingOf({ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] })).toBe(0)
  })
  it('ignora consumos da OS em edição', () => {
    expect(remainingOf(pkgA, 'os1')).toBe(8)
  })
})

describe('toBalances', () => {
  it('ordena por soldAt asc e devolve id + remaining', () => {
    expect(toBalances([pkgB, pkgA])).toEqual([
      { id: 'A', remaining: 5 },
      { id: 'B', remaining: 5 },
    ])
  })
  it('exclui pacotes zerados', () => {
    expect(toBalances([{ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] }])).toEqual([])
  })
})

describe('computeBalance', () => {
  it('soma os saldos', () => {
    expect(computeBalance([pkgA, pkgB])).toBe(10)
  })
  it('lista vazia é zero', () => {
    expect(computeBalance([])).toBe(0)
  })
  it('credita consumo da OS em edição', () => {
    expect(computeBalance([pkgA, pkgB], 'os2')).toBe(12)
  })
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npm test -- balance`
Expected: FAIL (`Cannot find module '@/lib/packages/balance'`).

- [ ] **Step 4: Implementar saldo**

Criar `src/lib/packages/balance.ts`:

```ts
export interface PackageUsageLite {
  quantity: number
  orderId: string
}

export interface PackageWithUsages {
  id: string
  quantity: number
  soldAt: Date
  usages: PackageUsageLite[]
}

export interface PackageBalance {
  id: string
  remaining: number
}

/** Saldo de um pacote. Consumos da OS em edição (`editingOrderId`) não contam como usados. */
export function remainingOf(pkg: PackageWithUsages, editingOrderId?: string | null): number {
  const used = pkg.usages
    .filter((u) => !editingOrderId || u.orderId !== editingOrderId)
    .reduce((sum, u) => sum + u.quantity, 0)
  return Math.max(0, pkg.quantity - used)
}

/** Saldos por pacote, mais antigos primeiro (FIFO), só os que ainda têm saldo. */
export function toBalances(packages: PackageWithUsages[], editingOrderId?: string | null): PackageBalance[] {
  return [...packages]
    .sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime())
    .map((p) => ({ id: p.id, remaining: remainingOf(p, editingOrderId) }))
    .filter((b) => b.remaining > 0)
}

/** Saldo total de um serviço para o cliente. */
export function computeBalance(packages: PackageWithUsages[], editingOrderId?: string | null): number {
  return toBalances(packages, editingOrderId).reduce((sum, b) => sum + b.remaining, 0)
}
```

- [ ] **Step 5: Rodar**

Run: `npm test -- balance`
Expected: 8 passed.

- [ ] **Step 6: Testes de alocação (falhando)**

Criar `src/lib/packages/__tests__/allocate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { allocateFifo } from '@/lib/packages/allocate'
import { InsufficientBalanceError } from '@/lib/packages/errors'

const balances = [
  { id: 'A', remaining: 2 },
  { id: 'B', remaining: 5 },
]

describe('allocateFifo', () => {
  it('consome do pacote mais antigo primeiro', () => {
    const r = allocateFifo(balances, 2, 'svc')
    expect(r.allocations).toEqual([{ clientPackageId: 'A', quantity: 2 }])
    expect(r.balances).toEqual([{ id: 'B', remaining: 5 }])
  })
  it('atravessa dois pacotes', () => {
    const r = allocateFifo(balances, 3, 'svc')
    expect(r.allocations).toEqual([
      { clientPackageId: 'A', quantity: 2 },
      { clientPackageId: 'B', quantity: 1 },
    ])
    expect(r.balances).toEqual([{ id: 'B', remaining: 4 }])
  })
  it('quantidade zero não aloca nada', () => {
    const r = allocateFifo(balances, 0, 'svc')
    expect(r.allocations).toEqual([])
    expect(r.balances).toEqual(balances)
  })
  it('lança erro com o saldo restante quando excede', () => {
    expect(() => allocateFifo(balances, 8, 'svc')).toThrowError(InsufficientBalanceError)
    try {
      allocateFifo(balances, 8, 'svc')
    } catch (e) {
      const err = e as InsufficientBalanceError
      expect(err.serviceId).toBe('svc')
      expect(err.remaining).toBe(7)
    }
  })
  it('não muta a entrada', () => {
    const input = balances.map((b) => ({ ...b }))
    allocateFifo(input, 3, 'svc')
    expect(input).toEqual(balances)
  })
})
```

- [ ] **Step 7: Rodar para ver falhar**

Run: `npm test -- allocate`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 8: Implementar alocação**

Criar `src/lib/packages/allocate.ts`:

```ts
import type { PackageBalance } from './balance'
import { InsufficientBalanceError } from './errors'

export interface Allocation {
  clientPackageId: string
  quantity: number
}

export interface AllocationResult {
  allocations: Allocation[]
  /** Saldos restantes após a alocação (sem os zerados), para o próximo item do mesmo serviço. */
  balances: PackageBalance[]
}

/** Distribui `qty` pelos pacotes na ordem recebida (FIFO). Lança se o saldo não cobre. */
export function allocateFifo(balances: PackageBalance[], qty: number, serviceId: string): AllocationResult {
  const total = balances.reduce((sum, b) => sum + b.remaining, 0)
  if (qty > total) throw new InsufficientBalanceError(serviceId, total)

  const allocations: Allocation[] = []
  const next: PackageBalance[] = []
  let left = qty

  for (const b of balances) {
    const take = Math.min(b.remaining, left)
    if (take > 0) allocations.push({ clientPackageId: b.id, quantity: take })
    left -= take
    const rest = b.remaining - take
    if (rest > 0) next.push({ id: b.id, remaining: rest })
  }

  return { allocations, balances: next }
}
```

- [ ] **Step 9: Rodar**

Run: `npm test -- allocate`
Expected: 5 passed.

- [ ] **Step 10: Testes de divisão (falhando)**

Criar `src/lib/packages/__tests__/split.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { splitOrderItem, type OrderItemInput } from '@/lib/packages/split'

const item: OrderItemInput = {
  serviceId: 'svc',
  serviceName: 'Limpeza',
  description: 'Completa',
  price: 30,
  quantity: 3,
  saveGlobally: true,
}

describe('splitOrderItem', () => {
  it('sem alocação devolve o item como está', () => {
    expect(splitOrderItem(item, [])).toEqual([
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 30, quantity: 3, saveGlobally: true },
    ])
  })
  it('parcial: coberto a R$0 + cobrado com o resto', () => {
    expect(splitOrderItem(item, [{ clientPackageId: 'A', quantity: 2 }])).toEqual([
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 0, quantity: 2, saveGlobally: false, allocation: { clientPackageId: 'A', quantity: 2 } },
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 30, quantity: 1, saveGlobally: true },
    ])
  })
  it('totalmente coberto por dois pacotes vira dois itens a R$0 e nenhum cobrado', () => {
    const out = splitOrderItem(item, [
      { clientPackageId: 'A', quantity: 2 },
      { clientPackageId: 'B', quantity: 1 },
    ])
    expect(out).toHaveLength(2)
    expect(out.map((o) => o.price)).toEqual([0, 0])
    expect(out.map((o) => o.allocation?.clientPackageId)).toEqual(['A', 'B'])
  })
  it('descrição ausente vira null', () => {
    const out = splitOrderItem({ ...item, description: undefined }, [])
    expect(out[0].description).toBeNull()
  })
})
```

- [ ] **Step 11: Rodar para ver falhar**

Run: `npm test -- split`
Expected: FAIL.

- [ ] **Step 12: Implementar divisão**

Criar `src/lib/packages/split.ts`:

```ts
import type { Allocation } from './allocate'

export interface OrderItemInput {
  serviceId?: string | null
  serviceName: string
  description?: string | null
  price: number
  quantity: number
  saveGlobally?: boolean
  usePackageQuantity?: number
}

export interface SplitItem {
  serviceId: string | null
  serviceName: string
  description: string | null
  price: number
  quantity: number
  saveGlobally: boolean
  /** Presente só nos itens cobertos pelo pacote (preço 0). */
  allocation?: Allocation
}

/** Um item coberto por alocação (preço 0) + um item cobrado com o restante, se sobrar. */
export function splitOrderItem(item: OrderItemInput, allocations: Allocation[]): SplitItem[] {
  const base = {
    serviceId: item.serviceId?.trim() || null,
    serviceName: item.serviceName,
    description: item.description || null,
  }

  const covered: SplitItem[] = allocations.map((allocation) => ({
    ...base,
    price: 0,
    quantity: allocation.quantity,
    saveGlobally: false,
    allocation,
  }))

  const coveredQty = allocations.reduce((sum, a) => sum + a.quantity, 0)
  const chargedQty = item.quantity - coveredQty
  if (chargedQty > 0) {
    covered.push({ ...base, price: item.price, quantity: chargedQty, saveGlobally: item.saveGlobally ?? false })
  }
  return covered
}
```

- [ ] **Step 13: Rodar tudo e remover o smoke**

```bash
rm src/lib/packages/__tests__/smoke.test.ts
```

Run: `npm test`
Expected: 17 passed, 3 arquivos.

- [ ] **Step 14: Commit**

```bash
git add src/lib/packages
git commit -m "feat(pacotes): saldo, alocacao FIFO e divisao de item com testes"
```

---

### Task 4: Validações Zod

**Files:**
- Create: `src/lib/validations/package.ts`
- Modify: `src/lib/validations/order.ts`
- Modify: `src/lib/validations/index.ts`

- [ ] **Step 1: Schemas de pacote**

Criar `src/lib/validations/package.ts`:

```ts
import { z } from 'zod'

// Aceita string (input com máscara) ou número
const positivePriceSchema = z
  .union([z.string().transform((val) => parseFloat(val) || 0), z.number()])
  .pipe(z.number().positive('Preço deve ser maior que zero'))

export const servicePackageSchema = z.object({
  storeId: z.string().min(1, 'Loja é obrigatória'),
  serviceId: z.string().min(1, 'Serviço é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(2, 'Quantidade mínima é 2'),
  price: positivePriceSchema,
  isActive: z.boolean().optional(),
})

// Loja e serviço são imutáveis após criar
export const servicePackageUpdateSchema = servicePackageSchema
  .omit({ storeId: true, serviceId: true })
  .partial()

export const sellPackageSchema = z.object({
  packageId: z.string().min(1, 'Pacote é obrigatório'),
  notes: z.string().max(500, 'Observação muito longa').optional(),
})

export type ServicePackageFormData = {
  storeId: string
  serviceId: string
  name: string
  description?: string
  quantity: number
  price: number
  isActive?: boolean
}
export type SellPackageFormData = z.infer<typeof sellPackageSchema>
```

- [ ] **Step 2: Campo `usePackageQuantity` no item da OS**

Em `src/lib/validations/order.ts`, dentro de `orderServiceSchema`, após `isExisting`:

```ts
  // Unidades deste item que saem do saldo de pacote do cliente (o servidor zera o preço)
  usePackageQuantity: z.coerce.number().int().min(0).optional(),
```

- [ ] **Step 3: Exportar**

Em `src/lib/validations/index.ts` adicionar:

```ts
export * from './package'
```

- [ ] **Step 4: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations
git commit -m "feat(pacotes): schemas de pacote, venda e usePackageQuantity"
```

---

### Task 5: Helpers de servidor — acesso à loja, include da OS e consumo na transação

**Files:**
- Create: `src/lib/packages/store-access.ts`
- Create: `src/lib/packages/order-include.ts`
- Create: `src/lib/packages/consume.ts`

- [ ] **Step 1: Acesso à loja**

Criar `src/lib/packages/store-access.ts`:

```ts
import { NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/auth-utils'

/** Mesma regra das rotas de serviços/clientes. Devolve a resposta de erro ou null se pode. */
export function denyIfNoStoreAccess(
  user: AuthUser,
  store: { id: string; companyId: string },
  verb = 'acessar'
): NextResponse | null {
  if (user.role === 'SUPER_ADMIN') return null
  if (user.role === 'COMPANY_ADMIN') {
    return store.companyId === user.companyId
      ? null
      : NextResponse.json({ error: `Você não tem permissão para ${verb} esta loja` }, { status: 403 })
  }
  return user.storeId === store.id
    ? null
    : NextResponse.json({ error: `Você só pode ${verb} a sua própria loja` }, { status: 403 })
}
```

- [ ] **Step 2: Include compartilhado dos itens da OS**

Criar `src/lib/packages/order-include.ts`:

```ts
import { Prisma } from '@prisma/client'

/** Itens da OS com o consumo de pacote, em ordem estável (o OrderForm reagrupa por ordem). */
export const orderServicesInclude = {
  include: {
    packageUsage: {
      select: {
        quantity: true,
        clientPackage: { select: { id: true, name: true } },
      },
    },
  },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
} satisfies Prisma.ServiceOrder$servicesArgs

export type OrderServiceWithUsage = Prisma.OrderServiceGetPayload<typeof orderServicesInclude>

/** Nome exibido em PDF/WhatsApp: "Limpeza (pacote)" quando coberto. */
export function displayServiceName(s: { serviceName: string; packageUsage: unknown | null }): string {
  return s.packageUsage ? `${s.serviceName} (pacote)` : s.serviceName
}
```

- [ ] **Step 3: Consumo dentro da transação**

Criar `src/lib/packages/consume.ts`:

```ts
import { Prisma } from '@prisma/client'
import { toBalances, type PackageBalance } from './balance'
import { allocateFifo } from './allocate'
import { splitOrderItem, type OrderItemInput } from './split'

interface Params {
  orderId: string
  clientId: string
  items: OrderItemInput[]
}

/**
 * Cria os itens da OS (divididos em coberto/cobrado) e os consumos de pacote.
 * Deve rodar dentro de `prisma.$transaction`. No PUT, o `deleteMany` dos itens antigos
 * precisa rodar ANTES, para o saldo lido aqui já não contar o consumo da própria OS.
 * Lança InsufficientBalanceError se o saldo não cobre.
 */
export async function createOrderItemsWithPackages(tx: Prisma.TransactionClient, { orderId, clientId, items }: Params) {
  // Saldos por serviço, carregados sob lock só para os serviços que vão usar pacote
  const balancesByService = new Map<string, PackageBalance[]>()

  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    const serviceId = item.serviceId?.trim()
    if (use <= 0 || !serviceId || balancesByService.has(serviceId)) continue

    // Serializa salvamentos concorrentes do mesmo cliente+serviço (Prisma não expõe FOR UPDATE)
    await tx.$queryRaw`
      SELECT id FROM client_packages
      WHERE client_id = ${clientId} AND service_id = ${serviceId} AND status = 'ACTIVE'
      FOR UPDATE`

    const packages = await tx.clientPackage.findMany({
      where: { clientId, serviceId, status: 'ACTIVE' },
      select: { id: true, quantity: true, soldAt: true, usages: { select: { quantity: true, orderId: true } } },
    })
    balancesByService.set(serviceId, toBalances(packages))
  }

  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    const serviceId = item.serviceId?.trim() || null
    let allocations: { clientPackageId: string; quantity: number }[] = []

    if (use > 0 && serviceId) {
      const result = allocateFifo(balancesByService.get(serviceId) ?? [], use, serviceId)
      allocations = result.allocations
      balancesByService.set(serviceId, result.balances)
    }

    for (const part of splitOrderItem(item, allocations)) {
      const created = await tx.orderService.create({
        data: {
          orderId,
          serviceId: part.serviceId,
          serviceName: part.serviceName,
          description: part.description,
          price: part.price,
          quantity: part.quantity,
          saveGlobally: part.saveGlobally,
        },
      })
      if (part.allocation) {
        await tx.packageUsage.create({
          data: {
            clientPackageId: part.allocation.clientPackageId,
            orderId,
            orderServiceId: created.id,
            quantity: part.allocation.quantity,
          },
        })
      }
    }
  }
}

/** Total cobrado: itens cobertos saem a 0. */
export function computeOrderTotal(items: OrderItemInput[]): number {
  return items.reduce((sum, i) => sum + i.price * Math.max(0, i.quantity - (i.usePackageQuantity ?? 0)), 0)
}
```

- [ ] **Step 4: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso. Se `Prisma.ServiceOrder$servicesArgs` não existir no client gerado, trocar o `satisfies` por `as const` e manter o tipo via `Prisma.OrderServiceGetPayload<{ include: { packageUsage: ... } }>`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/packages
git commit -m "feat(pacotes): helpers de acesso, include da OS e consumo transacional"
```

---

### Task 6: API `/api/packages`

**Files:**
- Create: `src/lib/packages/package-serializer.ts`
- Create: `src/lib/packages/__tests__/package-serializer.test.ts`
- Create: `src/app/api/packages/route.ts`
- Create: `src/app/api/packages/[id]/route.ts`

- [ ] **Step 1: Serializador (fora do `route.ts`)**

Next.js só permite exportar handlers de arquivos `route.ts` (o build falha, como já aconteceu com `sanitizeConfig`). Por isso o include e o cálculo derivado ficam em módulo próprio.

Criar `src/lib/packages/package-serializer.ts`:

```ts
export const packageInclude = {
  store: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, price: true, isActive: true } },
  _count: { select: { sales: true } },
} as const

type PackageRow = {
  price: unknown
  quantity: number
  service: { price: unknown }
}

/** Preço por unidade e economia (%) em relação ao avulso, calculados no servidor. */
export function withDerived<T extends PackageRow>(pkg: T) {
  const price = Number(pkg.price)
  const unitPrice = Math.round((price / pkg.quantity) * 100) / 100
  const servicePrice = Number(pkg.service.price)
  const savingsPercent = servicePrice > 0 ? Math.round((1 - unitPrice / servicePrice) * 100) : 0
  return { ...pkg, price, unitPrice, savingsPercent }
}
```

Criar `src/lib/packages/__tests__/package-serializer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { withDerived } from '@/lib/packages/package-serializer'

describe('withDerived', () => {
  it('calcula preco unitario e economia', () => {
    const r = withDerived({ price: '250', quantity: 10, service: { price: '30' } })
    expect(r.price).toBe(250)
    expect(r.unitPrice).toBe(25)
    expect(r.savingsPercent).toBe(17)
  })
  it('pacote mais caro que o avulso da economia negativa sem quebrar', () => {
    const r = withDerived({ price: 400, quantity: 10, service: { price: 30 } })
    expect(r.savingsPercent).toBe(-33)
  })
  it('servico sem preco da economia zero', () => {
    expect(withDerived({ price: 100, quantity: 4, service: { price: 0 } }).savingsPercent).toBe(0)
  })
})
```

Run: `npm test -- package-serializer`
Expected: 3 passed.

- [ ] **Step 2: Lista e criação**

Criar `src/app/api/packages/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { servicePackageSchema } from '@/lib/validations'
import { requireAuth, requireRoles, getCompanyFilter, getStoreFilter } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { packageInclude, withDerived } from '@/lib/packages/package-serializer'

// GET /api/packages?storeId=&isActive=&sellable=&search=
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const isActive = searchParams.get('isActive')
    const sellable = searchParams.get('sellable') === 'true'

    const where: Record<string, unknown> = { ...getStoreFilter(user!) }

    // Diferente de /api/services: MANAGER também fica restrito à própria empresa (spec)
    if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(user!.role)) {
      const companyFilter = getCompanyFilter(user!)
      if (companyFilter.companyId) where.store = { companyId: companyFilter.companyId }
    }

    if (storeId && (user!.role === 'SUPER_ADMIN' || user!.role === 'COMPANY_ADMIN' || user!.storeId === storeId)) {
      where.storeId = storeId
    }

    if (isActive === 'true' || isActive === 'false') where.isActive = isActive === 'true'

    if (sellable) {
      where.isActive = true
      where.service = { isActive: true }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const packages = await prisma.servicePackage.findMany({
      where,
      include: packageInclude,
      orderBy: [{ service: { name: 'asc' } }, { quantity: 'asc' }],
    })

    return NextResponse.json({ data: packages.map(withDerived) })
  } catch (error) {
    console.error('Erro ao listar pacotes:', error)
    return NextResponse.json({ error: 'Erro ao listar pacotes' }, { status: 500 })
  }
}

// POST /api/packages
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error

    const body = await request.json()
    const data = servicePackageSchema.parse(body)

    const store = await prisma.store.findUnique({ where: { id: data.storeId } })
    if (!store) return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, store, 'criar pacotes em')
    if (denied) return denied

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
    if (!service || !service.isActive || service.storeId !== data.storeId) {
      return NextResponse.json({ error: 'Serviço inválido para esta loja' }, { status: 400 })
    }

    const created = await prisma.servicePackage.create({
      data: {
        storeId: data.storeId,
        serviceId: data.serviceId,
        name: data.name,
        description: data.description || null,
        quantity: data.quantity,
        price: data.price,
        isActive: data.isActive ?? true,
      },
      include: packageInclude,
    })

    return NextResponse.json(withDerived(created), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar pacote' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Detalhe, edição e exclusão**

Criar `src/app/api/packages/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { servicePackageUpdateSchema } from '@/lib/validations'
import { requireAuth, requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { packageInclude, withDerived } from '@/lib/packages/package-serializer'

type Ctx = { params: Promise<{ id: string }> }

async function loadPackage(id: string) {
  return prisma.servicePackage.findUnique({ where: { id }, include: { ...packageInclude, store: { select: { id: true, name: true, companyId: true } } } })
}

// GET /api/packages/[id]
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const pkg = await loadPackage(id)
    if (!pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, pkg.store)
    if (denied) return denied

    return NextResponse.json(withDerived(pkg))
  } catch (error) {
    console.error('Erro ao buscar pacote:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacote' }, { status: 500 })
  }
}

// PUT /api/packages/[id] — loja e serviço são imutáveis
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params
    const body = await request.json()

    const existing = await loadPackage(id)
    if (!existing) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, existing.store, 'editar pacotes de')
    if (denied) return denied

    if ((body.storeId && body.storeId !== existing.storeId) || (body.serviceId && body.serviceId !== existing.serviceId)) {
      return NextResponse.json({ error: 'Loja e serviço do pacote não podem ser alterados' }, { status: 400 })
    }

    const data = servicePackageUpdateSchema.parse(body)
    const updated = await prisma.servicePackage.update({
      where: { id },
      data: { ...data, description: data.description ?? undefined },
      include: packageInclude,
    })

    return NextResponse.json(withDerived(updated))
  } catch (error) {
    console.error('Erro ao atualizar pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar pacote' }, { status: 500 })
  }
}

// DELETE /api/packages/[id] — apaga se nunca vendido; senão desativa
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params

    const existing = await loadPackage(id)
    if (!existing) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, existing.store, 'excluir pacotes de')
    if (denied) return denied

    if (existing._count.sales === 0) {
      await prisma.servicePackage.delete({ where: { id } })
      return NextResponse.json({ message: 'Pacote excluído com sucesso' })
    }

    await prisma.servicePackage.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Pacote já vendido; foi desativado' })
  } catch (error) {
    console.error('Erro ao excluir pacote:', error)
    return NextResponse.json({ error: 'Erro ao excluir pacote' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso.

- [ ] **Step 5: Teste manual rápido com o dev server**

Run: `npm run dev` (porta 3001 conforme ambiente local) e, logado como admin, no console do navegador:

```js
await fetch('/api/packages').then(r => r.json())
```

Expected: `{ data: [] }`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/packages src/lib/packages/package-serializer.ts src/lib/packages/__tests__/package-serializer.test.ts
git commit -m "feat(pacotes): API de pacotes (CRUD com soft delete apos venda)"
```

---

### Task 7: Saldo e pacotes do cliente — serviço compartilhado e API

**Files:**
- Create: `src/lib/packages/client-packages.ts`
- Create: `src/app/api/clients/[id]/packages/route.ts`
- Create: `src/app/api/clients/[id]/packages/[clientPackageId]/route.ts`
- Modify: `src/app/api/clients/route.ts`

- [ ] **Step 1: Consultas compartilhadas**

Criar `src/lib/packages/client-packages.ts`:

```ts
import prisma from '@/lib/prisma'
import { remainingOf } from './balance'

export interface ServiceBalance {
  serviceId: string
  serviceName: string
  remaining: number
}

const clientPackageInclude = {
  service: { select: { id: true, name: true } },
  soldBy: { select: { name: true } },
  usages: {
    select: {
      quantity: true,
      createdAt: true,
      orderId: true,
      order: { select: { id: true, orderNumber: true, status: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

/** Saldo por serviço (só ACTIVE, só remaining > 0) para vários clientes de uma vez. */
export async function getBalancesByClient(clientIds: string[]): Promise<Map<string, ServiceBalance[]>> {
  const result = new Map<string, ServiceBalance[]>()
  if (clientIds.length === 0) return result

  const packages = await prisma.clientPackage.findMany({
    where: { clientId: { in: clientIds }, status: 'ACTIVE' },
    select: {
      id: true,
      clientId: true,
      quantity: true,
      soldAt: true,
      service: { select: { id: true, name: true } },
      usages: { select: { quantity: true, orderId: true } },
    },
  })

  for (const pkg of packages) {
    const remaining = remainingOf(pkg)
    if (remaining <= 0) continue
    const list = result.get(pkg.clientId) ?? []
    const entry = list.find((b) => b.serviceId === pkg.service.id)
    if (entry) entry.remaining += remaining
    else list.push({ serviceId: pkg.service.id, serviceName: pkg.service.name, remaining })
    result.set(pkg.clientId, list)
  }
  return result
}

export async function listClientPackages(clientId: string) {
  const packages = await prisma.clientPackage.findMany({
    where: { clientId },
    include: clientPackageInclude,
    orderBy: { soldAt: 'desc' },
  })
  const balances = (await getBalancesByClient([clientId])).get(clientId) ?? []
  return { balances, packages: packages.map(serializeClientPackage) }
}

export async function loadClientPackage(id: string) {
  return prisma.clientPackage.findUnique({ where: { id }, include: clientPackageInclude })
}

type Row = NonNullable<Awaited<ReturnType<typeof loadClientPackage>>>

export function serializeClientPackage(cp: Row) {
  const used = cp.usages.reduce((sum, u) => sum + u.quantity, 0)
  return {
    id: cp.id,
    name: cp.name,
    serviceId: cp.serviceId,
    serviceName: cp.service.name,
    quantity: cp.quantity,
    used,
    remaining: cp.status === 'ACTIVE' ? Math.max(0, cp.quantity - used) : 0,
    price: Number(cp.price),
    status: cp.status,
    soldAt: cp.soldAt,
    cancelledAt: cp.cancelledAt,
    soldBy: { name: cp.soldBy.name },
    notes: cp.notes,
    usages: cp.usages.map((u) => ({
      quantity: u.quantity,
      createdAt: u.createdAt,
      order: u.order,
    })),
  }
}
```

- [ ] **Step 2: Rota de saldo e venda**

Criar `src/app/api/clients/[id]/packages/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sellPackageSchema } from '@/lib/validations'
import { requireAuth, requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { listClientPackages, loadClientPackage, serializeClientPackage } from '@/lib/packages/client-packages'

type Ctx = { params: Promise<{ id: string }> }

async function loadClientWithStore(id: string) {
  return prisma.client.findUnique({ where: { id }, include: { store: { select: { id: true, companyId: true } } } })
}

// GET /api/clients/[id]/packages — saldo por serviço + histórico
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const client = await loadClientWithStore(id)
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, client.store)
    if (denied) return denied

    return NextResponse.json(await listClientPackages(id))
  } catch (error) {
    console.error('Erro ao listar pacotes do cliente:', error)
    return NextResponse.json({ error: 'Erro ao listar pacotes do cliente' }, { status: 500 })
  }
}

// POST /api/clients/[id]/packages — vende um pacote (registrado como pago)
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params
    const body = await request.json()
    const data = sellPackageSchema.parse(body)

    const client = await loadClientWithStore(id)
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, client.store, 'vender pacotes em')
    if (denied) return denied

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: data.packageId },
      include: { service: { select: { isActive: true } } },
    })
    if (!pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    if (!pkg.isActive) return NextResponse.json({ error: 'Pacote inativo' }, { status: 400 })
    if (!pkg.service.isActive) return NextResponse.json({ error: 'Serviço do pacote está inativo' }, { status: 400 })
    if (pkg.storeId !== client.storeId) {
      return NextResponse.json({ error: 'Pacote não pertence à loja do cliente' }, { status: 400 })
    }

    const created = await prisma.clientPackage.create({
      data: {
        clientId: client.id,
        packageId: pkg.id,
        serviceId: pkg.serviceId,
        name: pkg.name,
        quantity: pkg.quantity,
        price: pkg.price,
        notes: data.notes || null,
        soldById: user!.id,
      },
    })

    const full = await loadClientPackage(created.id)
    return NextResponse.json(serializeClientPackage(full!), { status: 201 })
  } catch (error) {
    console.error('Erro ao vender pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao vender pacote' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Rota de cancelamento**

Criar `src/app/api/clients/[id]/packages/[clientPackageId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { loadClientPackage, serializeClientPackage } from '@/lib/packages/client-packages'

type Ctx = { params: Promise<{ id: string; clientPackageId: string }> }

// DELETE /api/clients/[id]/packages/[clientPackageId] — cancela venda sem consumo
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id, clientPackageId } = await params

    const cp = await loadClientPackage(clientPackageId)
    if (!cp || cp.clientId !== id) return NextResponse.json({ error: 'Pacote do cliente não encontrado' }, { status: 404 })

    const client = await prisma.client.findUnique({ where: { id }, include: { store: { select: { id: true, companyId: true } } } })
    const denied = denyIfNoStoreAccess(user!, client!.store, 'cancelar vendas em')
    if (denied) return denied

    if (cp.status !== 'ACTIVE') return NextResponse.json({ error: 'Pacote já cancelado' }, { status: 400 })
    if (cp.usages.length > 0) {
      return NextResponse.json({ error: 'Pacote já utilizado; não pode ser cancelado' }, { status: 400 })
    }

    await prisma.clientPackage.update({
      where: { id: clientPackageId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })

    const full = await loadClientPackage(clientPackageId)
    return NextResponse.json(serializeClientPackage(full!))
  } catch (error) {
    console.error('Erro ao cancelar pacote:', error)
    return NextResponse.json({ error: 'Erro ao cancelar pacote' }, { status: 500 })
  }
}
```

- [ ] **Step 4: `balances` na lista de clientes**

Em `src/app/api/clients/route.ts`:

Adicionar import:

```ts
import { getBalancesByClient } from '@/lib/packages/client-packages'
```

Substituir o `return NextResponse.json({ data: clients, ... })` do GET por:

```ts
    const balancesByClient = await getBalancesByClient(clients.map((c) => c.id))

    return NextResponse.json({
      data: clients.map((c) => ({ ...c, balances: balancesByClient.get(c.id) ?? [] })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
```

- [ ] **Step 5: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso.

- [ ] **Step 6: Commit**

```bash
git add src/lib/packages/client-packages.ts src/app/api/clients
git commit -m "feat(pacotes): saldo, venda e cancelamento de pacotes do cliente"
```

---

### Task 8: Consumo de pacote na criação e edição de OS

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Imports em `src/app/api/orders/route.ts`**

Adicionar:

```ts
import { createOrderItemsWithPackages, computeOrderTotal } from '@/lib/packages/consume'
import { orderServicesInclude, displayServiceName } from '@/lib/packages/order-include'
import { InsufficientBalanceError } from '@/lib/packages/errors'
```

- [ ] **Step 2: Include da lista (GET)**

No `findMany` do GET, trocar `services: true,` por:

```ts
          services: orderServicesInclude,
```

- [ ] **Step 3: Validações baratas e total no POST**

Após `const validatedData = serviceOrderSchema.parse(body)`, adicionar:

```ts
    for (const item of validatedData.services) {
      const use = item.usePackageQuantity ?? 0
      if (use > 0 && !item.serviceId?.trim()) {
        return NextResponse.json({ error: 'Só serviços cadastrados podem usar pacote' }, { status: 400 })
      }
      if (use > item.quantity) {
        return NextResponse.json({ error: 'Quantidade do pacote maior que a do item' }, { status: 400 })
      }
    }
```

Substituir o bloco `// Calcular total ... }, 0)` por:

```ts
    const totalAmount = computeOrderTotal(validatedData.services)
```

- [ ] **Step 4: Criação em transação**

Substituir todo o bloco `const order = await prisma.serviceOrder.create({ ... })` (do comentário `// Criar ordem com serviços` até o fim do `include`) por:

```ts
    // Criar ordem e itens (com consumo de pacote) em uma transação
    const orderId = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceOrder.create({
        data: {
          orderNumber,
          description: validatedData.description,
          storeId: validatedData.storeId,
          clientId: validatedData.clientId,
          createdById: user!.id,
          totalAmount,
        },
        select: { id: true },
      })
      await createOrderItemsWithPackages(tx, {
        orderId: created.id,
        clientId: validatedData.clientId,
        items: validatedData.services,
      })
      return created.id
    })

    const order = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true } },
        store: { include: { company: true } },
        services: orderServicesInclude,
      },
    })
```

- [ ] **Step 5: Sufixo "(pacote)" na notificação do POST**

No `sendOrderStatusWhatsApp` do POST, trocar `name: s.serviceName,` por:

```ts
          name: displayServiceName(s),
```

- [ ] **Step 6: 409 no catch do POST**

No `catch` do POST, antes do `if (error instanceof Error && error.name === 'ZodError')`:

```ts
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: 'Saldo do pacote insuficiente', serviceId: error.serviceId, remaining: error.remaining },
        { status: 409 }
      )
    }
```

- [ ] **Step 7: Imports em `src/app/api/orders/[id]/route.ts`**

```ts
import { createOrderItemsWithPackages, computeOrderTotal } from '@/lib/packages/consume'
import { orderServicesInclude, displayServiceName } from '@/lib/packages/order-include'
import { InsufficientBalanceError } from '@/lib/packages/errors'
```

- [ ] **Step 8: Include no GET e no PATCH**

No GET, trocar:

```ts
        services: {
          include: {
            service: true,
          },
        },
```

por:

```ts
        services: {
          ...orderServicesInclude,
          include: { ...orderServicesInclude.include, service: true },
        },
```

No PATCH, nos dois `include` (de `existingOrder` e de `order`), trocar `services: true,` por `services: orderServicesInclude,`. Nos dois mapeamentos `services: order.services.map((s) => ({ name: s.serviceName, ...` trocar `name: s.serviceName` por `name: displayServiceName(s)`.

- [ ] **Step 9: PUT com consumo**

No PUT, após `const validatedData = serviceOrderSchema.parse(body)`, adicionar as mesmas validações baratas do Step 3. Substituir o bloco de total por `const totalAmount = computeOrderTotal(validatedData.services)`.

Substituir a transação inteira (`const order = await prisma.$transaction(async (tx) => { ... })`) por:

```ts
    // deleteMany ANTES de ler saldo: os consumos desta OS são apagados por cascata
    // e não contam como usados ao recriar os itens.
    await prisma.$transaction(async (tx) => {
      await tx.orderService.deleteMany({ where: { orderId: id } })
      await tx.serviceOrder.update({
        where: { id },
        data: { description: validatedData.description, totalAmount },
      })
      await createOrderItemsWithPackages(tx, {
        orderId: id,
        clientId: existingOrder.clientId,
        items: validatedData.services,
      })
    })

    const order = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true } },
        store: true,
        services: orderServicesInclude,
      },
    })
```

- [ ] **Step 10: 409 no catch do PUT**

Mesmo bloco do Step 6, no `catch` do PUT.

- [ ] **Step 11: Tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sucesso. Possível erro: `existingOrder.clientId` — o `findUnique` do PUT já devolve o campo (não usa `select`), então existe.

- [ ] **Step 12: Verificação manual mínima (sem pacote)**

Com `npm run dev`, criar uma OS normal pela tela e editar a quantidade de um item. Nada deve mudar de comportamento. Conferir no banco:

```bash
docker exec -it servico-agora-db psql -U admin -d servico_agora -c "select count(*) from package_usages"
```

Expected: `0`.

- [ ] **Step 13: Commit**

```bash
git add src/app/api/orders
git commit -m "feat(pacotes): OS consome saldo de pacote na criacao e edicao"
```

---

### Task 9: Receita de pacotes no dashboard

**Files:**
- Modify: `src/app/api/dashboard/stats/route.ts`
- Modify: `src/hooks/api/use-dashboard.ts`
- Modify: `src/app/(authenticated)/page.tsx`

- [ ] **Step 1: Agregado no servidor**

Em `src/app/api/dashboard/stats/route.ts`, no array do `Promise.all`, adicionar como último elemento (e `packagesRevenueAgg` ao final da desestruturação):

```ts
      // Pacotes vendidos (ativos) no período
      prisma.clientPackage.aggregate({
        where: {
          status: 'ACTIVE',
          client: clientWhere,
          ...(Object.keys(dateFilter).length > 0 ? { soldAt: dateFilter } : {}),
        },
        _sum: { price: true },
      }),
```

Antes do `return`, calcular:

```ts
    const packagesRevenue = Number(packagesRevenueAgg._sum.price || 0)
```

No JSON de resposta, adicionar `packagesRevenue,` e trocar `totalRevenue` por:

```ts
      totalRevenue:
        Number(revenueFinished._sum.totalAmount || 0) +
        Number(revenuePaid._sum.totalAmount || 0) +
        packagesRevenue,
```

- [ ] **Step 2: Tipo no hook**

Em `src/hooks/api/use-dashboard.ts`, interface `DashboardStats`, adicionar `packagesRevenue: number`.

- [ ] **Step 3: Card**

Em `src/app/(authenticated)/page.tsx`, no card "Faturamento Total", trocar a linha `<p className="text-blue-200 text-xs mt-0.5 sm:mt-1">Finalizadas + Pagas</p>` por:

```tsx
              <p className="text-blue-200 text-xs mt-0.5 sm:mt-1">
                Finalizadas + Pagas + Pacotes ({formatCurrency(stats?.packagesRevenue || 0)})
              </p>
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`; abrir o dashboard. Expected: card mostra "Pacotes (R$ 0,00)".

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/stats/route.ts src/hooks/api/use-dashboard.ts "src/app/(authenticated)/page.tsx"
git commit -m "feat(pacotes): receita de pacotes no dashboard"
```

---

### Task 10: Hooks React Query

**Files:**
- Create: `src/hooks/api/use-packages.ts`
- Create: `src/hooks/api/use-client-packages.ts`
- Modify: `src/hooks/api/index.ts`

- [ ] **Step 1: Pacotes**

Criar `src/hooks/api/use-packages.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ServicePackageFormData } from '@/lib/validations'

export interface ServicePackage {
  id: string
  name: string
  description: string | null
  quantity: number
  price: number
  unitPrice: number
  savingsPercent: number
  isActive: boolean
  storeId: string
  serviceId: string
  store: { id: string; name: string }
  service: { id: string; name: string; price: number | string; isActive: boolean }
  _count: { sales: number }
  createdAt: string
}

interface UsePackagesParams {
  search?: string
  storeId?: string
  sellable?: boolean
  enabled?: boolean
}

export function usePackages(params: UsePackagesParams = {}) {
  const { search = '', storeId, sellable, enabled = true } = params
  return useQuery<{ data: ServicePackage[] }>({
    queryKey: ['packages', { search, storeId, sellable }],
    queryFn: async () => {
      const { data } = await axios.get('/api/packages', {
        params: { search, storeId, sellable: sellable ? 'true' : undefined },
      })
      return data
    },
    enabled,
  })
}

export function useCreatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ServicePackageFormData) => (await axios.post('/api/packages', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}

export function useUpdatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServicePackageFormData> }) =>
      (await axios.put(`/api/packages/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}

export function useDeletePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/api/packages/${id}`)).data as { message: string },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}
```

- [ ] **Step 2: Pacotes do cliente**

Criar `src/hooks/api/use-client-packages.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { SellPackageFormData } from '@/lib/validations'

export interface ServiceBalance {
  serviceId: string
  serviceName: string
  remaining: number
}

export interface ClientPackage {
  id: string
  name: string
  serviceId: string
  serviceName: string
  quantity: number
  used: number
  remaining: number
  price: number
  status: 'ACTIVE' | 'CANCELLED'
  soldAt: string
  cancelledAt: string | null
  soldBy: { name: string }
  notes: string | null
  usages: { quantity: number; createdAt: string; order: { id: string; orderNumber: string; status: string } }[]
}

export interface ClientPackagesResponse {
  balances: ServiceBalance[]
  packages: ClientPackage[]
}

export function useClientPackages(clientId: string | null | undefined) {
  return useQuery<ClientPackagesResponse>({
    queryKey: ['client-packages', clientId],
    queryFn: async () => (await axios.get(`/api/clients/${clientId}/packages`)).data,
    enabled: !!clientId,
  })
}

function invalidateAfterSale(queryClient: ReturnType<typeof useQueryClient>, clientId: string) {
  queryClient.invalidateQueries({ queryKey: ['client-packages', clientId] })
  queryClient.invalidateQueries({ queryKey: ['clients'] })
  queryClient.invalidateQueries({ queryKey: ['packages'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
}

export function useSellPackage(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SellPackageFormData) => (await axios.post(`/api/clients/${clientId}/packages`, data)).data,
    onSuccess: () => invalidateAfterSale(queryClient, clientId),
  })
}

export function useCancelClientPackage(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (clientPackageId: string) =>
      (await axios.delete(`/api/clients/${clientId}/packages/${clientPackageId}`)).data,
    onSuccess: () => invalidateAfterSale(queryClient, clientId),
  })
}
```

- [ ] **Step 3: Exportar e invalidar saldo ao salvar OS**

Em `src/hooks/api/index.ts` adicionar:

```ts
export * from './use-packages'
export * from './use-client-packages'
```

Em `src/hooks/api/use-orders.ts`, nos `onSuccess` de `useCreateOrder`, `useUpdateOrder` e `useDeleteOrder`, adicionar:

```ts
      queryClient.invalidateQueries({ queryKey: ['client-packages'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
```

- [ ] **Step 4: Tipos**

Run: `npx tsc --noEmit`
Expected: sucesso.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/api
git commit -m "feat(pacotes): hooks de pacotes e pacotes do cliente"
```

---

### Task 11: Menu e tela de Pacotes

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/components/forms/PackageForm.tsx`
- Modify: `src/components/forms/index.ts`
- Create: `src/app/(authenticated)/packages/page.tsx`

- [ ] **Step 1: Item no menu**

Em `src/components/layout/Sidebar.tsx`, adicionar `Package` ao import de `lucide-react` e, em `menuItems`, após o item `/services`:

```ts
    {
      href: '/packages',
      label: 'Pacotes',
      icon: <Package className="w-5 h-5" />,
    },
```

- [ ] **Step 2: Formulário**

Criar `src/components/forms/PackageForm.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { servicePackageSchema, type ServicePackageFormData } from '@/lib/validations'
import { useCreatePackage, useUpdatePackage, useStores, useServices, type ServicePackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

interface PackageFormProps {
  pkg?: ServicePackage | null
  onSuccess: () => void
  onCancel: () => void
}

export default function PackageForm({ pkg, onSuccess, onCancel }: PackageFormProps) {
  const createMutation = useCreatePackage()
  const updateMutation = useUpdatePackage()
  const isLoading = createMutation.isPending || updateMutation.isPending
  const [nameTouched, setNameTouched] = useState(!!pkg)

  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ServicePackageFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(servicePackageSchema) as any,
    defaultValues: {
      storeId: pkg?.store.id || '',
      serviceId: pkg?.service.id || '',
      name: pkg?.name || '',
      description: pkg?.description || '',
      quantity: pkg?.quantity || 10,
      price: pkg?.price || 0,
      isActive: pkg?.isActive ?? true,
    },
  })

  const storeId = watch('storeId')
  const serviceId = watch('serviceId')
  const quantity = Number(watch('quantity')) || 0
  const price = Number(watch('price')) || 0

  const { data: servicesData } = useServices({ storeId, limit: 100 })
  const services = (servicesData?.data || []).filter((s) => s.isActive || s.id === serviceId)
  const service = services.find((s) => s.id === serviceId)
  const servicePrice = Number(service?.price || 0)

  // Nome sugerido "10× Limpeza" enquanto o usuário não editar o nome
  useEffect(() => {
    if (nameTouched || !service || quantity < 1) return
    setValue('name', `${quantity}× ${service.name}`)
  }, [nameTouched, service, quantity, setValue])

  useEffect(() => {
    const error = createMutation.error || updateMutation.error
    if (error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      setError('root', { message: axiosError?.response?.data?.error || 'Erro ao salvar pacote' })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const unitPrice = quantity > 0 ? price / quantity : 0
  const savings = servicePrice > 0 ? Math.round((1 - unitPrice / servicePrice) * 100) : 0

  const onSubmit = async (data: ServicePackageFormData) => {
    const normalized = {
      ...data,
      price: Number(data.price) || 0,
      quantity: Number(data.quantity) || 0,
    }
    try {
      if (pkg) {
        // Loja e serviço são imutáveis; não enviar
        await updateMutation.mutateAsync({
          id: pkg.id,
          data: {
            name: normalized.name,
            description: normalized.description,
            quantity: normalized.quantity,
            price: normalized.price,
            isActive: normalized.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync(normalized)
      }
      onSuccess()
    } catch {
      // tratado no useEffect
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.root.message}</div>
      )}

      {pkg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Loja</p>
            <p className="font-medium">{pkg.store.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Serviço</p>
            <p className="font-medium">{pkg.service.name}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Loja"
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Selecione a loja"
            error={errors.storeId?.message}
            {...register('storeId', { onChange: () => setValue('serviceId', '') })}
          />
          <Select
            label="Serviço"
            options={services.map((s) => ({ value: s.id, label: `${s.name} — ${formatCurrency(Number(s.price))}` }))}
            placeholder={storeId ? 'Selecione o serviço' : 'Selecione a loja primeiro'}
            disabled={!storeId}
            error={errors.serviceId?.message}
            {...register('serviceId')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Quantidade de unidades"
          type="number"
          min="2"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Input
          label="Preço do pacote (R$)"
          placeholder="R$ 0,00"
          mask="currency"
          error={errors.price?.message}
          {...register('price')}
        />
      </div>

      {quantity > 0 && price > 0 && (
        <p className="text-sm text-gray-600 -mt-2">
          {formatCurrency(unitPrice)} por unidade
          {servicePrice > 0 && (
            <>
              {' · '}
              {savings >= 0 ? (
                <span className="text-green-600">economia de {savings}% em relação ao avulso ({formatCurrency(servicePrice)})</span>
              ) : (
                <span className="text-amber-600">mais caro que o avulso ({formatCurrency(servicePrice)})</span>
              )}
            </>
          )}
        </p>
      )}

      <Input
        label="Nome do pacote"
        placeholder="Ex: 10× Limpeza"
        error={errors.name?.message}
        {...register('name', { onChange: () => setNameTouched(true) })}
      />

      <Textarea label="Descrição" placeholder="Opcional" {...register('description')} />

      {pkg && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" className="h-4 w-4 rounded border-gray-300 text-blue-600" {...register('isActive')} />
          <label htmlFor="isActive" className="text-sm text-gray-700">Pacote ativo (disponível para venda)</label>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {pkg ? 'Salvar Alterações' : 'Cadastrar Pacote'}
        </Button>
      </div>
    </form>
  )
}
```

Em `src/components/forms/index.ts` adicionar `export { default as PackageForm } from './PackageForm'`.

- [ ] **Step 3: Página**

Criar `src/app/(authenticated)/packages/page.tsx` seguindo exatamente a estrutura de `services/page.tsx` (header, busca, EmptyState, cards mobile, tabela desktop, modal de form, modal de confirmação). Diferenças:

- Hook: `const { data, isLoading } = usePackages({ search })`; `const packages = data?.data || []`; `const deleteMutation = useDeletePackage()`.
- Título "Pacotes", subtítulo "Pacotes pré-pagos com desconto", botão "Novo Pacote", ícone de EmptyState `Package`.
- Colunas da tabela: Nome · Serviço · Qtd · Preço · Preço/un · Economia · Vendas · Status · Ações.
  - Serviço: `pkg.service.name` e, se `!pkg.service.isActive`, `<Badge variant="warning" className="ml-2">Serviço inativo</Badge>`.
  - Preço/un: `formatCurrency(pkg.unitPrice)`.
  - Economia: `pkg.savingsPercent > 0 ? <span className="text-green-600 font-medium">{pkg.savingsPercent}%</span> : '—'`.
  - Vendas: `pkg._count.sales`.
- `handleDelete`: após `mutateAsync`, se `result.message` contém "desativado", `alert(result.message)`.
- Texto do modal de exclusão: "Se o pacote já foi vendido, ele será apenas desativado e os saldos dos clientes continuam válidos."
- Card mobile: nome, serviço, "{quantity} un · {formatCurrency(price)}", economia, badge de status, vendas.
- Modal com `<PackageForm pkg={selected} onSuccess={...} onCancel={...} />`, título "Editar Pacote" / "Novo Pacote".

- [ ] **Step 4: Verificar no navegador**

Com `npm run dev`: menu mostra "Pacotes"; `/packages` abre vazia; "Novo Pacote" → escolher loja, serviço, quantidade 10, preço 250 → nome vira "10× {serviço}", texto mostra "R$ 25,00 por unidade · economia de X%". Salvar → aparece na lista. Editar e desativar → badge "Inativo". Excluir (sem vendas) → some.

Run: `npx tsc --noEmit && npm run lint`
Expected: sucesso.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/forms "src/app/(authenticated)/packages"
git commit -m "feat(pacotes): tela de pacotes e item no menu"
```

---

### Task 12: Venda e histórico de pacotes em Clientes

**Files:**
- Create: `src/components/packages/SellPackageModal.tsx`
- Create: `src/components/packages/ClientPackagesModal.tsx`
- Modify: `src/app/(authenticated)/clients/page.tsx`
- Modify: `src/hooks/api/use-clients.ts`

- [ ] **Step 1: Tipo do cliente com saldo**

Em `src/hooks/api/use-clients.ts`, na interface `Client`, adicionar:

```ts
  balances?: { serviceId: string; serviceName: string; remaining: number }[]
```

- [ ] **Step 2: Modal de venda**

Criar `src/components/packages/SellPackageModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal, Select, Textarea, Button } from '@/components/ui'
import { usePackages, useSellPackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  client: { id: string; name: string; storeId: string } | null
  onClose: () => void
}

export default function SellPackageModal({ client, onClose }: Props) {
  const [packageId, setPackageId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = usePackages({ storeId: client?.storeId, sellable: true, enabled: !!client })
  const packages = data?.data || []
  const selected = packages.find((p) => p.id === packageId)
  const sell = useSellPackage(client?.id || '')

  const close = () => {
    setPackageId('')
    setNotes('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    if (!packageId) return setError('Escolha um pacote')
    try {
      await sell.mutateAsync({ packageId, notes: notes || undefined })
      close()
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError(axiosError?.response?.data?.error || 'Erro ao vender pacote')
    }
  }

  return (
    <Modal isOpen={!!client} onClose={close} title={`Vender pacote — ${client?.name ?? ''}`}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {!isLoading && packages.length === 0 ? (
          <p className="text-sm text-gray-600">
            Nenhum pacote disponível para venda nesta loja.{' '}
            <Link href="/packages" className="text-blue-600 underline">Cadastrar pacotes</Link>
          </p>
        ) : (
          <>
            <Select
              label="Pacote"
              placeholder="Selecione o pacote"
              options={packages.map((p) => ({ value: p.id, label: `${p.name} — ${formatCurrency(p.price)}` }))}
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            />
            {selected && (
              <p className="text-sm text-gray-600">
                {selected.quantity} unidades de <strong>{selected.service.name}</strong> por {formatCurrency(selected.price)}{' '}
                ({formatCurrency(selected.unitPrice)}/un)
              </p>
            )}
            <Textarea
              label="Observação"
              placeholder="Ex.: pago em dinheiro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
          <Button variant="outline" onClick={close} disabled={sell.isPending}>Cancelar</Button>
          <Button onClick={submit} isLoading={sell.isPending} disabled={!packageId}>Registrar venda</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Modal de histórico**

Criar `src/components/packages/ClientPackagesModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { useClientPackages, useCancelClientPackage, type ClientPackage } from '@/hooks/api'
import { formatCurrency, ORDER_STATUS_LABELS } from '@/lib/utils'

interface Props {
  client: { id: string; name: string } | null
  canCancel: boolean
  onClose: () => void
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default function ClientPackagesModal({ client, canCancel, onClose }: Props) {
  const { data, isLoading } = useClientPackages(client?.id)
  const cancel = useCancelClientPackage(client?.id || '')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ClientPackage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doCancel = async () => {
    if (!confirm) return
    try {
      await cancel.mutateAsync(confirm.id)
      setConfirm(null)
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError(axiosError?.response?.data?.error || 'Erro ao cancelar')
      setConfirm(null)
    }
  }

  return (
    <Modal isOpen={!!client} onClose={onClose} title={`Pacotes — ${client?.name ?? ''}`} size="lg">
      <div className="space-y-3">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
        {!isLoading && (data?.packages.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">Este cliente ainda não comprou pacotes.</p>
        )}

        {data?.packages.map((p) => {
          const cancelled = p.status === 'CANCELLED'
          const pct = p.quantity > 0 ? Math.round((p.remaining / p.quantity) * 100) : 0
          return (
            <div key={p.id} className={`border rounded-lg p-3 ${cancelled ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-medium ${cancelled ? 'line-through' : ''}`}>{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(p.soldAt)} · {formatCurrency(p.price)} · vendido por {p.soldBy.name}
                  </p>
                  {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
                </div>
                {cancelled ? <Badge variant="default">Cancelado</Badge> : <Badge variant="success">{p.remaining} restantes</Badge>}
              </div>

              {!cancelled && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{p.used} de {p.quantity} usados</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  className="text-xs text-blue-600 flex items-center gap-1"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  {expanded === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {p.usages.length} uso(s)
                </button>
                {canCancel && !cancelled && p.used === 0 && (
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirm(p)}>
                    Cancelar venda
                  </Button>
                )}
              </div>

              {expanded === p.id && p.usages.length > 0 && (
                <ul className="mt-2 text-xs text-gray-600 space-y-1 border-t pt-2">
                  {p.usages.map((u, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {formatDate(u.createdAt)} · {u.quantity} un ·{' '}
                        <Link href={`/orders?search=${u.order.orderNumber}`} className="text-blue-600 underline">
                          OS {u.order.orderNumber}
                        </Link>
                      </span>
                      <span>{ORDER_STATUS_LABELS[u.order.status] ?? u.order.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title="Cancelar venda">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Cancelar a venda de <strong>{confirm?.name}</strong>? O saldo deixa de valer. Esta ação não registra devolução de dinheiro.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>Voltar</Button>
            <Button variant="danger" onClick={doCancel} isLoading={cancel.isPending}>Cancelar venda</Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
```

- [ ] **Step 4: Página de clientes**

Em `src/app/(authenticated)/clients/page.tsx`:

Imports: adicionar `Package, History` ao `lucide-react`; `import { useSession } from 'next-auth/react'`; `import SellPackageModal from '@/components/packages/SellPackageModal'`; `import ClientPackagesModal from '@/components/packages/ClientPackagesModal'`.

Na interface `Client` local, adicionar `storeId: string` e `balances?: { serviceId: string; serviceName: string; remaining: number }[]`.

No componente, após os `useState` existentes:

```tsx
  const { data: session } = useSession()
  const canSell = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')
  const [sellFor, setSellFor] = useState<Client | null>(null)
  const [historyFor, setHistoryFor] = useState<Client | null>(null)

  const balanceLabel = (client: Client) => {
    const b = client.balances ?? []
    if (b.length === 0) return null
    const shown = b.slice(0, 2).map((x) => `${x.remaining} ${x.serviceName}`).join(', ')
    return b.length > 2 ? `${shown} +${b.length - 2}` : shown
  }
```

Tabela desktop: adicionar `<TableHead>Saldo</TableHead>` após "OS" e a célula:

```tsx
                      <TableCell>
                        {balanceLabel(client) ? (
                          <Badge variant="info">{balanceLabel(client)}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
```

Nas ações desktop, antes do botão Editar:

```tsx
                          <Button variant="ghost" size="icon" title="Pacotes" onClick={() => setHistoryFor(client)}>
                            <History className="w-4 h-4" />
                          </Button>
                          {canSell && (
                            <Button variant="ghost" size="icon" title="Vender pacote" onClick={() => setSellFor(client)}>
                              <Package className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
```

Card mobile: no menu de ações, antes de "Editar", dois botões equivalentes ("Pacotes" e, se `canSell`, "Vender pacote") fechando o menu (`setOpenActionsId(null)`); no rodapé do card, se `balanceLabel(client)`, um `<Badge variant="info" className="text-xs">` ao lado do badge de OS.

Antes do fechamento do `div` raiz, os modais:

```tsx
      <SellPackageModal client={sellFor} onClose={() => setSellFor(null)} />
      <ClientPackagesModal client={historyFor} canCancel={canSell} onClose={() => setHistoryFor(null)} />
```

- [ ] **Step 5: Verificar no navegador**

Em Clientes: ícone de pacote abre o modal; vender "10× Limpeza" → coluna Saldo mostra "10 Limpeza"; ícone de histórico mostra o pacote com "0 de 10 usados" e botão "Cancelar venda"; cancelar → badge "Cancelado" e saldo some. Vender de novo para seguir com a Task 13.

Run: `npx tsc --noEmit && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/components/packages src/hooks/api/use-clients.ts "src/app/(authenticated)/clients/page.tsx"
git commit -m "feat(pacotes): venda e historico de pacotes na tela de clientes"
```

---

### Task 13: "Usar pacote" no OrderForm e sufixo na tela de OS

**Files:**
- Modify: `src/components/forms/OrderForm.tsx`
- Modify: `src/app/(authenticated)/orders/page.tsx`
- Modify: `src/hooks/api/use-orders.ts`

- [ ] **Step 1: Tipos de item com `serviceId` e `packageUsage`**

Em `src/hooks/api/use-orders.ts`, interface `OrderService`, adicionar:

```ts
  serviceId: string | null
  packageUsage?: { quantity: number; clientPackage: { id: string; name: string } } | null
```

Em `src/app/(authenticated)/orders/page.tsx`, interface `OrderService`, adicionar os mesmos dois campos.

Em `src/components/forms/OrderForm.tsx`, na prop `order.services[]`, adicionar:

```ts
      serviceId: string | null
      packageUsage?: { quantity: number; clientPackage: { id: string; name: string } } | null
```

- [ ] **Step 2: Reagrupar itens na edição**

Em `OrderForm.tsx`, acima do componente, adicionar a função pura:

```ts
type IncomingItem = NonNullable<OrderFormProps['order']>['services'][number]

/**
 * Itens consecutivos do mesmo serviço em que algum veio de pacote viram um só item
 * (quantidade total, usePackageQuantity = cobertos). Preço: do item cobrado irmão;
 * senão o preço atual do catálogo; senão 0 (editável).
 */
function regroupOrderItems(items: IncomingItem[], catalogPrice: (serviceId: string) => number | undefined) {
  const out: {
    serviceId: string
    serviceName: string
    description: string
    price: number
    quantity: number
    saveGlobally: boolean
    isExisting: boolean
    usePackageQuantity: number
  }[] = []

  for (const s of items) {
    const prev = out[out.length - 1]
    const samePackageGroup =
      prev && s.serviceId && prev.serviceId === s.serviceId && (s.packageUsage || prev.usePackageQuantity > 0)

    if (samePackageGroup) {
      prev.quantity += s.quantity
      if (s.packageUsage) prev.usePackageQuantity += s.quantity
      else prev.price = Number(s.price)
      continue
    }

    out.push({
      serviceId: s.serviceId ?? '',
      serviceName: s.serviceName,
      description: s.description || '',
      price: s.packageUsage ? (catalogPrice(s.serviceId ?? '') ?? 0) : Number(s.price),
      quantity: s.quantity,
      saveGlobally: false,
      isExisting: true,
      usePackageQuantity: s.packageUsage ? s.quantity : 0,
    })
  }
  return out
}
```

O `defaultValues.services` do `useForm` passa a ser:

```ts
      services: order?.services ? regroupOrderItems(order.services, () => undefined) : [emptyServiceItem],
```

e `emptyServiceItem` ganha `usePackageQuantity: 0` (idem ao objeto do `append` em "Adicionar Serviço").

Como `useServices` carrega depois da montagem, corrigir o preço 0 dos itens totalmente cobertos quando o catálogo chegar. Após a declaração de `services` (lista do catálogo), adicionar:

```ts
  // Item totalmente coberto nasce com preço 0; quando o catálogo carrega, assume o preço atual
  const catalogLoaded = services.length > 0
  useEffect(() => {
    if (!order || !catalogLoaded) return
    watchedServices.forEach((s, index) => {
      if (s.usePackageQuantity && s.usePackageQuantity > 0 && !s.price) {
        const price = services.find((c) => c.id === s.serviceId)?.price
        if (price) setValue(`services.${index}.price`, Number(price))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoaded])
```

- [ ] **Step 3: Saldos do cliente e uso efetivo**

Imports: `useClientPackages` de `@/hooks/api`; `useMemo` de `react`; `Package` de `lucide-react`.

Após `const storeId = watch('storeId')`, adicionar:

```ts
  const clientId = watch('clientId')
  const { data: clientPackages, refetch: refetchBalances } = useClientPackages(clientId)

  // Saldo por serviço; na edição, consumos da própria OS voltam a contar como disponíveis
  const balanceByService = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of clientPackages?.balances ?? []) map.set(b.serviceId, b.remaining)
    if (order) {
      for (const p of clientPackages?.packages ?? []) {
        for (const u of p.usages) {
          if (u.order.id === order.id) map.set(p.serviceId, (map.get(p.serviceId) ?? 0) + u.quantity)
        }
      }
    }
    return map
  }, [clientPackages, order])

  // Uso efetivo por item, em ordem: nunca promete mais que o saldo
  const effectiveUse = useMemo(() => {
    const left = new Map(balanceByService)
    return (watchedServices ?? []).map((s) => {
      const requested = Number(s.usePackageQuantity) || 0
      if (!s.serviceId || requested <= 0) return 0
      const avail = left.get(s.serviceId) ?? 0
      const use = Math.min(requested, Number(s.quantity) || 1, avail)
      left.set(s.serviceId, avail - use)
      return use
    })
  }, [watchedServices, balanceByService])
```

Em `handleServiceSelect`, no ramo `if (service)`, após `setValue(\`services.${index}.price\`, service.price)`:

```ts
        const qty = Number(watchedServices[index]?.quantity) || 1
        setValue(`services.${index}.usePackageQuantity`, Math.min(qty, balanceByService.get(serviceId) ?? 0))
```

No ramo `'new'`: `setValue(\`services.${index}.usePackageQuantity\`, 0)`.

`calculateTotal` passa a ser:

```ts
  const calculateTotal = () =>
    watchedServices?.reduce((sum, s, i) => sum + (Number(s.price) || 0) * Math.max(0, (Number(s.quantity) || 1) - effectiveUse[i]), 0) || 0
```

No `onSubmit`, no `map` de `services`, adicionar `usePackageQuantity: effectiveUse[index]` (trocar `(service) =>` por `(service, index) =>`).

Tratamento do 409: no `useEffect` de erros, antes do `setError('root', ...)`:

```ts
      const data = axiosError?.response?.data as { error?: string; remaining?: number } | undefined
      if (axiosError?.response?.status === 409) {
        refetchBalances()
        setError('root', { message: `Saldo do pacote mudou: restam ${data?.remaining ?? 0}. Ajuste o item.` })
        return
      }
```

(`refetchBalances` entra nas dependências do efeito; adicionar `axiosError.response.status` requer tipar `axiosError` como `{ response?: { status?: number; data?: ... } }`.)

- [ ] **Step 4: Bloco "Usar pacote" na UI**

No bloco "Existing service" (o `else` que mostra `Serviço Existente`), substituir o `<p className="text-green-600 font-semibold">...` por:

```tsx
                      <p className="text-green-600 font-semibold">
                        {formatCurrency(watchedServices[index].price)} x{' '}
                        {Math.max(0, (Number(watchedServices[index].quantity) || 1) - effectiveUse[index])} ={' '}
                        {formatCurrency(
                          watchedServices[index].price *
                            Math.max(0, (Number(watchedServices[index].quantity) || 1) - effectiveUse[index])
                        )}
                      </p>
```

E logo após o `</div>` que fecha `text-sm text-gray-600 bg-white p-3 rounded border`, adicionar:

```tsx
                  {(() => {
                    const svcId = watchedServices[index]?.serviceId
                    const balance = svcId ? balanceByService.get(svcId) ?? 0 : 0
                    const requested = Number(watchedServices[index]?.usePackageQuantity) || 0
                    if (!svcId || (balance === 0 && requested === 0)) return null
                    const qty = Number(watchedServices[index]?.quantity) || 1
                    const use = effectiveUse[index]
                    return (
                      <div className="flex flex-col gap-1 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            checked={requested > 0}
                            onChange={(e) =>
                              setValue(`services.${index}.usePackageQuantity`, e.target.checked ? Math.min(qty, balance) : 0)
                            }
                          />
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Usar pacote</span>
                          <span className="text-blue-700">· cliente tem {balance} no pacote</span>
                        </label>
                        {requested > 0 && use < qty && (
                          <p className="text-blue-700 pl-6">
                            {use} pelo pacote · {qty - use} cobrado a {formatCurrency(watchedServices[index].price)}
                          </p>
                        )}
                      </div>
                    )
                  })()}
```

- [ ] **Step 5: Sufixo "(pacote)" na tela de OS**

Em `src/app/(authenticated)/orders/page.tsx`, no modal de visualização, trocar `{service.serviceName}` por:

```tsx
                        {service.serviceName}
                        {service.packageUsage && <span className="ml-1 text-xs text-blue-600">(pacote)</span>}
```

Se a listagem/cards também renderizarem nomes de serviços (buscar `serviceName` no arquivo), aplicar o mesmo sufixo.

- [ ] **Step 6: Verificar no navegador (roteiro completo)**

Pré-condição: cliente com pacote "10× Limpeza" vendido (Task 12) e saldo 10.

1. Nova OS para esse cliente → adicionar "Limpeza", quantidade 3 → aparece "Usar pacote · cliente tem 10 no pacote", total R$ 0,00. Salvar.
2. Na lista, visualizar a OS: item "Limpeza (pacote)" × 3 a R$ 0,00. Em Clientes, saldo "7 Limpeza".
3. Editar a OS: item aparece como um só ("Limpeza", qtd 3, usar pacote marcado, "cliente tem 10"). Mudar quantidade para 12 → "10 pelo pacote · 2 cobrado a R$ 30,00", total R$ 60,00. Salvar → saldo 0; a OS tem dois itens (10 a R$ 0 e 2 a R$ 30).
4. Editar de novo e desmarcar "Usar pacote" → total R$ 360,00. Salvar → saldo volta a 10.
5. Nova OS com 12 limpezas usando pacote; em outra aba, antes de salvar, criar outra OS que consome 5 → ao salvar a primeira: mensagem "Saldo do pacote mudou: restam 5. Ajuste o item."
6. Excluir uma OS que consumiu → saldo volta.
7. Histórico do cliente lista cada uso com nº da OS; "Cancelar venda" não aparece após uso.
8. Dashboard: "Pacotes (R$ 250,00)" somado ao total.

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add src/components/forms/OrderForm.tsx "src/app/(authenticated)/orders/page.tsx" src/hooks/api/use-orders.ts
git commit -m "feat(pacotes): usar saldo de pacote na OS e exibir itens cobertos"
```

---

### Task 14: Fechamento

**Files:**
- Modify: `deploy/README.md` (opcional: nota de migração)

- [ ] **Step 1: Suíte completa**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: tudo verde; Vitest com 20 testes em 4 arquivos. O `build` confirma que nenhum `route.ts` exporta algo além de handlers.

- [ ] **Step 2: Push e PR**

```bash
git push -u origin feature/pacotes-de-servicos
gh pr create --base main --head feature/pacotes-de-servicos --title "Pacotes de serviços pré-pagos" --body-file docs/superpowers/specs/2026-10-05-pacotes-de-servicos-design.md
```

O job `check` do CI roda `tsc`, `lint` e `test`. Após merge, o deploy automático aplica o schema via `prisma db push` no entrypoint e publica.

- [ ] **Step 3: Pós-deploy em produção**

Abrir https://servicoagora.com.br, cadastrar um pacote real, vender a um cliente de teste e criar uma OS usando o saldo. Conferir saldo e dashboard.

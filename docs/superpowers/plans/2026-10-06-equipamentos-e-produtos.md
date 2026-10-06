# Equipamentos do cliente e produtos avulsos na OS — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar equipamentos por cliente e vinculá-los a cada serviço da OS. Também permitir lançar produtos avulsos na OS, com o valor somado ao total. Equipamentos e produtos aparecem na listagem, no detalhe e no PDF.

**Architecture:** São três tabelas Prisma novas: `Equipment`, `OrderServiceEquipment` (ligação N:N com a linha `OrderService`) e `OrderProduct`. A lógica pura (validação, total, reagrupamento, formatação) fica em `src/lib`, coberta por Vitest. As rotas de OS gravam os vínculos dentro da transação já existente: a divisão por pacote copia os equipamentos para cada registro gerado, e o reagrupamento só funde registros que tenham o mesmo conjunto de equipamentos. A UI ganha um modal de equipamentos na tela de clientes e componentes novos no formulário de OS (`src/components/orders/`), para não inchar ainda mais o `OrderForm.tsx`, que já tem 813 linhas.

**Tech Stack:** Next.js 14 (App Router), Prisma 7 + Postgres, Zod 4, react-hook-form 7, TanStack Query 5, jsPDF, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-06-equipamentos-e-produtos-design.md`

---

## Avisos do ambiente (ler antes de começar)

- Postgres local na porta **5434** e dev server na **3001** (`npm run dev -- -p 3001`; `.claude/launch.json` já está configurado). Comandos Prisma precisam de `--config prisma/prisma.config.ts`. O fluxo de schema é `prisma db push` (não há migrations).
- **Não rode `npx next build` com o dev server ligado**: ele sobrescreve o `.next` e quebra o servidor. Valide com `npx tsc --noEmit`, `npm run lint` e `npm test`.
- `git commit --amend` é bloqueado: faça commits novos.
- Arquivos novos às vezes saem com CRLF. Confira com `git ls-files --eol <arquivo>` (deve mostrar `i/lf`).
- Todo texto novo na UI precisa de classe de cor explícita (`text-gray-900`, `text-gray-700` etc.). Sem isso, ele some em modais brancos quando o SO está em modo escuro.
- Testes Vitest **não** podem depender de banco (o CI não tem Postgres).
- Branch: `feature/equipamentos-produtos` (já criada a partir de `origin/main`). **Não** dê push na `main`, porque isso faz deploy.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Modelos `Equipment`, `OrderServiceEquipment`, `OrderProduct` + relações inversas |
| `src/lib/validations/equipment.ts` | Criar | `equipmentSchema`, `updateEquipmentSchema` |
| `src/lib/validations/order.ts` | Modificar | `equipmentIds` por serviço, `orderProductSchema`, `products`, refine "serviço ou produto" |
| `src/lib/validations/index.ts` | Modificar | Exportar `equipment` |
| `src/lib/packages/consume.ts` | Modificar | `computeOrderTotal(items, products)`; gravar equipamentos em cada registro da divisão |
| `src/lib/packages/split.ts` | Modificar | `OrderItemInput.equipmentIds?` |
| `src/lib/packages/regroup.ts` | Modificar | `equipmentIds` no item do form; só funde registros com o mesmo conjunto |
| `src/lib/packages/order-include.ts` | Modificar | Incluir os equipamentos nas linhas; `orderProductsInclude` |
| `src/lib/equipments/order-equipments.ts` | Criar | Funções puras: `collectEquipmentIds`, `invalidEquipmentIds`, `orderEquipmentNames`, `summarizeNames` |
| `src/lib/equipments/lock.ts` | Criar | `lockAndValidateOrderEquipments(tx, …)` (FOR SHARE + validação) |
| `src/lib/equipments/errors.ts` | Criar | `InvalidEquipmentError`, `equipmentErrorResponse` |
| `src/lib/equipments/client-access.ts` | Criar | `requireClientAccess(clientId)` (auth + loja) |
| `src/app/api/clients/[id]/equipments/route.ts` | Criar | GET lista / POST cria |
| `src/app/api/clients/[id]/equipments/[equipmentId]/route.ts` | Criar | PATCH edita/reativa / DELETE apaga ou arquiva |
| `src/app/api/orders/route.ts` | Modificar | Produtos, equipamentos, total, includes |
| `src/app/api/orders/[id]/route.ts` | Modificar | GET/PATCH/PUT: includes, produtos, equipamentos, `paidData` |
| `src/lib/whatsapp/types.ts` | Modificar | `OrderPaidMessageData` com `equipments` por serviço e `products` |
| `src/lib/whatsapp/message-data.ts` | Modificar | Fallback "—" sem serviços |
| `src/lib/whatsapp/index.ts` | Modificar | Repassar equipamentos/produtos ao PDF |
| `src/lib/email/send-email.ts` | Modificar | Fallback "—" sem serviços |
| `src/lib/pdf/generate-order-pdf.ts` | Modificar | Builder único; seção de serviços condicional; equipamentos; tabela de produtos |
| `src/hooks/api/use-equipments.ts` | Criar | Hooks React Query |
| `src/hooks/api/index.ts` | Modificar | Exportar `use-equipments` |
| `src/components/equipments/ClientEquipmentsModal.tsx` | Criar | Modal de equipamentos do cliente |
| `src/app/(authenticated)/clients/page.tsx` | Modificar | Ação "Equipamentos" |
| `src/components/orders/EquipmentPicker.tsx` | Criar | Checkboxes de equipamentos de uma linha de serviço |
| `src/components/orders/OrderProductsSection.tsx` | Criar | Seção "Produtos" do formulário |
| `src/components/forms/OrderForm.tsx` | Modificar | Integrar o picker, os produtos e o total |
| `src/app/(authenticated)/orders/page.tsx` | Modificar | Coluna/card "Equipamentos"; detalhe com equipamentos e produtos |
| `src/hooks/api/use-orders.ts` | Modificar | Tipos com `equipments` e `products` |

Testes novos/alterados: `src/lib/validations/__tests__/order.test.ts`, `src/lib/validations/__tests__/equipment.test.ts`, `src/lib/packages/__tests__/consume.test.ts`, `src/lib/packages/__tests__/regroup.test.ts`, `src/lib/equipments/__tests__/order-equipments.test.ts`, `src/lib/whatsapp/__tests__/message-data.test.ts`, `src/lib/pdf/__tests__/generate-order-pdf.test.ts`.

---

### Task 1: Schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar as relações inversas nos modelos existentes**

Em `model Client`, logo após `packages ClientPackage[]`:

```prisma
  equipments Equipment[]
```

Em `model ServiceOrder`, logo após `packageUsages PackageUsage[]`:

```prisma
  products OrderProduct[]
```

Em `model OrderService`, logo após `packageUsage PackageUsage?`:

```prisma
  equipments OrderServiceEquipment[]
```

- [ ] **Step 2: Adicionar os modelos novos**

Logo após o bloco `model OrderService { … }` (antes de `// ==================== WHATSAPP ====================`):

```prisma
// ==================== EQUIPAMENTOS / PRODUTOS ====================

// Equipamento do cliente (ex.: "Split sala"). Removido com vínculo em OS => arquivado (isActive=false).
model Equipment {
  id           String   @id @default(cuid())
  name         String
  brand        String?
  model        String?
  serialNumber String?  @map("serial_number")
  notes        String?
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  clientId String @map("client_id")
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  orderServices OrderServiceEquipment[]

  @@index([clientId])
  @@map("equipments")
}

// Equipamentos de cada linha de serviço da OS. Cascade nos dois lados (regra do projeto);
// o histórico é protegido na API: DELETE de equipamento usado arquiva em vez de apagar.
model OrderServiceEquipment {
  orderServiceId String       @map("order_service_id")
  orderService   OrderService @relation(fields: [orderServiceId], references: [id], onDelete: Cascade)
  equipmentId    String       @map("equipment_id")
  equipment      Equipment    @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@id([orderServiceId, equipmentId])
  @@index([equipmentId])
  @@map("order_service_equipments")
}

// Produto avulso vendido na OS (sem catálogo); entra no total da OS
model OrderProduct {
  id        String   @id @default(cuid())
  name      String
  quantity  Int      @default(1)
  unitPrice Decimal  @db.Decimal(10, 2) @map("unit_price")
  createdAt DateTime @default(now()) @map("created_at")

  orderId String       @map("order_id")
  order   ServiceOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("order_products")
}
```

- [ ] **Step 3: Aplicar no banco local e gerar o client**

Run: `npm run db:push`
Expected: `Your database is now in sync with your Prisma schema.` (sem aviso de perda de dados)

Run: `npx prisma generate --config prisma/prisma.config.ts`
Expected: `Generated Prisma Client`

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(equipamentos): modelos Equipment, OrderServiceEquipment e OrderProduct"
```

---

### Task 2: Validações (Zod)

**Files:**
- Create: `src/lib/validations/equipment.ts`
- Modify: `src/lib/validations/order.ts`, `src/lib/validations/index.ts`
- Test: `src/lib/validations/__tests__/order.test.ts`, `src/lib/validations/__tests__/equipment.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `src/lib/validations/__tests__/order.test.ts` (e trocar o import para `import { orderServiceSchema, serviceOrderSchema, orderProductSchema } from '@/lib/validations/order'`):

```ts
describe('serviceOrderSchema: serviços e produtos', () => {
  const base = { clientId: 'c1', storeId: 's1' }
  const service = { serviceName: 'Limpeza', price: 30, quantity: 1 }
  const product = { name: 'Corrente', quantity: 1, unitPrice: 50 }

  it('aceita OS só com produto', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [], products: [product] })
    expect(r.success).toBe(true)
  })

  it('products é opcional e vira []', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [service] })
    expect(r.success).toBe(true)
    expect(r.data?.products).toEqual([])
  })

  it('rejeita OS sem serviço e sem produto, com o erro em services', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [], products: [] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Adicione pelo menos um serviço ou produto')
    expect(r.error?.issues[0].path).toEqual(['services'])
  })

  it('normaliza equipmentIds duplicados', () => {
    const r = serviceOrderSchema.safeParse({
      ...base,
      services: [{ ...service, equipmentIds: ['e1', 'e2', 'e1'] }],
    })
    expect(r.data?.services[0].equipmentIds).toEqual(['e1', 'e2'])
  })
})

describe('orderProductSchema', () => {
  it('rejeita nome vazio', () => {
    const r = orderProductSchema.safeParse({ name: '  ', quantity: 1, unitPrice: 10 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Nome do produto é obrigatório')
  })

  it('rejeita preço negativo', () => {
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 1, unitPrice: -1 }).success).toBe(false)
  })

  it('arredonda o preço a centavos', () => {
    expect(orderProductSchema.parse({ name: 'X', quantity: 1, unitPrice: 15.555 }).unitPrice).toBe(15.56)
  })

  it('rejeita quantidade 0 ou fracionária', () => {
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 0, unitPrice: 1 }).success).toBe(false)
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 1.5, unitPrice: 1 }).success).toBe(false)
  })
})
```

Criar `src/lib/validations/__tests__/equipment.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { equipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment'

describe('equipmentSchema', () => {
  it('exige nome', () => {
    const r = equipmentSchema.safeParse({ name: ' ' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Nome do equipamento é obrigatório')
  })

  it('campos opcionais vazios viram null e o nome é aparado', () => {
    const r = equipmentSchema.safeParse({ name: ' Split sala ', brand: '', model: '  ', serialNumber: 'AB1' })
    expect(r.data).toEqual({ name: 'Split sala', brand: null, model: null, serialNumber: 'AB1', notes: null })
  })
})

describe('updateEquipmentSchema', () => {
  it('aceita só isActive (reativar) sem apagar os outros campos', () => {
    expect(updateEquipmentSchema.safeParse({ isActive: true }).data).toEqual({ isActive: true })
  })

  it('string vazia limpa o campo', () => {
    expect(updateEquipmentSchema.safeParse({ brand: '' }).data).toEqual({ brand: null })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/validations`
Expected: FAIL (`orderProductSchema` não exportado; o módulo `equipment` não existe)

- [ ] **Step 3: Implementar**

Criar `src/lib/validations/equipment.ts`:

```ts
import { z } from 'zod'

// Texto opcional: string vazia/espaços vira null (coluna nullable)
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))

export const equipmentSchema = z.object({
  name: z.string().trim().min(1, 'Nome do equipamento é obrigatório'),
  brand: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  notes: optionalText,
})

// PATCH: chave ausente fica ausente (não apaga o campo). Não reutilizar optionalText aqui:
// no Zod 4, .optional() em volta de .nullish().transform() roda o transform e devolve null.
const patchText = z
  .string()
  .trim()
  .nullable()
  .transform((v) => v || null)
  .optional()

export const updateEquipmentSchema = z.object({
  name: z.string().trim().min(1, 'Nome do equipamento é obrigatório').optional(),
  brand: patchText,
  model: patchText,
  serialNumber: patchText,
  notes: patchText,
  isActive: z.boolean().optional(),
})

export type EquipmentInput = z.input<typeof equipmentSchema>
export type EquipmentData = z.output<typeof equipmentSchema>
export type UpdateEquipmentData = z.output<typeof updateEquipmentSchema>
```

Atenção: o teste "aceita só isActive" protege o "Reativar" da UI (`PATCH {isActive:true}`). Se ele falhar, o PATCH apagaria marca/modelo/série/observações. Verificado no Zod 4.3: `patchText` devolve `{isActive:true}` → `{isActive:true}`, `{brand:''}` → `{brand:null}` e `' X '` → `'X'`.

Em `src/lib/validations/order.ts`, substituir o conteúdo por:

```ts
import { z } from 'zod'

export const orderServiceSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, 'Nome do serviço é obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero'),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(1, 'Quantidade deve ser pelo menos 1'),
  saveGlobally: z.boolean().optional(),
  isExisting: z.boolean().optional(), // Serviço já existe na OS (não deve ser salvo globalmente)
  // Unidades deste item que saem do saldo de pacote do cliente (o servidor zera o preço)
  usePackageQuantity: z.coerce.number().int().min(0).optional(),
  // Equipamentos do cliente em que o serviço foi feito (sem duplicados)
  equipmentIds: z
    .array(z.string().min(1))
    .optional()
    .transform((ids) => (ids ? Array.from(new Set(ids)) : ids)),
})

// Produto avulso (sem catálogo), digitado na OS
export const orderProductSchema = z.object({
  name: z.string().trim().min(1, 'Nome do produto é obrigatório'),
  quantity: z.coerce.number().int('Quantidade deve ser inteira').min(1, 'Quantidade deve ser pelo menos 1'),
  // Arredonda a centavos: igual à coluna Decimal(10,2), para o total bater com os produtos gravados
  unitPrice: z.coerce
    .number()
    .min(0, 'Preço deve ser maior ou igual a zero')
    .transform((v) => Math.round(v * 100) / 100),
})

export const serviceOrderSchema = z
  .object({
    description: z.string().optional(),
    clientId: z.string().min(1, 'Cliente é obrigatório'),
    storeId: z.string().min(1, 'Loja é obrigatória'),
    services: z.array(orderServiceSchema),
    products: z.array(orderProductSchema).default([]),
  })
  // path em services: o OrderForm mostra o erro onde já mostrava "pelo menos um serviço"
  .refine((d) => d.services.length + d.products.length > 0, {
    message: 'Adicione pelo menos um serviço ou produto',
    path: ['services'],
  })

export const updateOrderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'PAID']),
  pausedReason: z.string().optional(), // Motivo quando status = PAUSED
})

export type OrderServiceFormData = z.infer<typeof orderServiceSchema>
export type OrderProductFormData = z.infer<typeof orderProductSchema>
export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>
export type UpdateOrderStatusFormData = z.infer<typeof updateOrderStatusSchema>
```

Em `src/lib/validations/index.ts`, acrescentar `export * from './equipment'`.

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/lib/validations`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros (`products` já passa pelo `...data` do OrderForm). Se aparecer algum erro, investigue antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations
git commit -m "feat(equipamentos): validacoes de equipamento, produtos e equipmentIds na OS"
```

---

### Task 3: Funções puras de equipamentos

**Files:**
- Create: `src/lib/equipments/order-equipments.ts`
- Test: `src/lib/equipments/__tests__/order-equipments.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  collectEquipmentIds,
  invalidEquipmentIds,
  orderEquipmentNames,
  summarizeNames,
} from '@/lib/equipments/order-equipments'

describe('collectEquipmentIds', () => {
  it('junta os ids de todas as linhas sem repetir', () => {
    expect(collectEquipmentIds([{ equipmentIds: ['a', 'b'] }, { equipmentIds: ['b', 'c'] }, {}])).toEqual(['a', 'b', 'c'])
  })
})

describe('invalidEquipmentIds', () => {
  const owned = [
    { id: 'ativo', isActive: true },
    { id: 'arquivado', isActive: false },
  ]

  it('id que não é do cliente é inválido', () => {
    expect(invalidEquipmentIds(['ativo', 'outro'], owned, new Set())).toEqual(['outro'])
  })

  it('arquivado só é aceito se já estava vinculado à OS', () => {
    expect(invalidEquipmentIds(['arquivado'], owned, new Set())).toEqual(['arquivado'])
    expect(invalidEquipmentIds(['arquivado'], owned, new Set(['arquivado']))).toEqual([])
  })
})

describe('orderEquipmentNames', () => {
  it('nomes distintos na ordem da primeira aparição', () => {
    const services = [
      { equipments: [{ equipment: { id: '1', name: 'Split sala' } }, { equipment: { id: '2', name: 'Split quarto' } }] },
      { equipments: [{ equipment: { id: '1', name: 'Split sala' } }] },
      {},
    ]
    expect(orderEquipmentNames(services)).toEqual(['Split sala', 'Split quarto'])
  })
})

describe('summarizeNames', () => {
  it('vazio vira travessão', () => expect(summarizeNames([])).toBe('—'))
  it('até o máximo mostra todos', () => expect(summarizeNames(['A', 'B'])).toBe('A, B'))
  it('acima do máximo resume com +N', () => expect(summarizeNames(['A', 'B', 'C', 'D'])).toBe('A, B +2'))
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/equipments`
Expected: FAIL (o módulo não existe)

- [ ] **Step 3: Implementar `src/lib/equipments/order-equipments.ts`**

```ts
// Funções puras sobre equipamentos da OS: sem acesso a banco, podem ser importadas pelo client.

/** Ids de equipamentos pedidos em todas as linhas, sem repetir. */
export function collectEquipmentIds(items: { equipmentIds?: string[] | null }[]): string[] {
  return Array.from(new Set(items.flatMap((i) => i.equipmentIds ?? [])))
}

/**
 * Ids inválidos para a OS: não pertencem ao cliente, ou estão arquivados sem já estarem
 * vinculados à OS (na edição, um equipamento arquivado depois continua aceito).
 */
export function invalidEquipmentIds(
  requested: string[],
  owned: { id: string; isActive: boolean }[],
  alreadyLinked: Set<string>
): string[] {
  const byId = new Map(owned.map((e) => [e.id, e]))
  return requested.filter((id) => {
    const eq = byId.get(id)
    return !eq || (!eq.isActive && !alreadyLinked.has(id))
  })
}

type ServiceWithEquipments = { equipments?: { equipment: { id: string; name: string } }[] | null }

/** Nomes distintos dos equipamentos de todas as linhas, na ordem em que aparecem. */
export function orderEquipmentNames(services: ServiceWithEquipments[]): string[] {
  const seen = new Map<string, string>()
  for (const s of services) {
    for (const { equipment } of s.equipments ?? []) {
      if (!seen.has(equipment.id)) seen.set(equipment.id, equipment.name)
    }
  }
  return Array.from(new Set(seen.values()))
}

/** "A, B +2"; "—" quando vazio. */
export function summarizeNames(names: string[], max = 2): string {
  if (names.length === 0) return '—'
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/lib/equipments`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/equipments
git commit -m "feat(equipamentos): funcoes puras de validacao e exibicao"
```

---

### Task 4: Total da OS com produtos

**Files:**
- Modify: `src/lib/packages/consume.ts:103-106`
- Test: `src/lib/packages/__tests__/consume.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Dentro de `describe('computeOrderTotal', …)` em `consume.test.ts`, acrescentar:

```ts
  it('soma os produtos (quantidade x preço unitário)', () => {
    expect(
      computeOrderTotal(
        [{ serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 2 }],
        [
          { quantity: 2, unitPrice: 15.5 },
          { quantity: 1, unitPrice: 9.9 },
        ]
      )
    ).toBe(70.9)
  })

  it('OS só com produtos', () => {
    expect(computeOrderTotal([], [{ quantity: 3, unitPrice: 0.1 }])).toBe(0.3)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/packages/__tests__/consume.test.ts`
Expected: FAIL (`70.9` esperado, recebido `30`; e `0.30000000000000004`/`0`)

- [ ] **Step 3: Implementar**

Substituir `computeOrderTotal` em `src/lib/packages/consume.ts`:

```ts
/** Total cobrado: itens cobertos saem a 0; produtos somam quantidade x preço. Arredondado a centavos. */
export function computeOrderTotal(
  items: OrderItemInput[],
  products: { quantity: number; unitPrice: number }[] = []
): number {
  const services = items.reduce((sum, i) => sum + i.price * Math.max(0, i.quantity - (i.usePackageQuantity ?? 0)), 0)
  const extras = products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)
  return Math.round((services + extras) * 100) / 100
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/lib/packages/__tests__/consume.test.ts`
Expected: PASS (inclusive os 4 testes antigos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/packages/consume.ts src/lib/packages/__tests__/consume.test.ts
git commit -m "feat(produtos): total da OS soma os produtos"
```

---

### Task 5: Equipamentos na divisão por pacote e no reagrupamento

**Files:**
- Modify: `src/lib/packages/split.ts` (interface `OrderItemInput`), `src/lib/packages/consume.ts` (loop de criação), `src/lib/packages/regroup.ts`
- Test: `src/lib/packages/__tests__/consume.test.ts`, `src/lib/packages/__tests__/regroup.test.ts`

- [ ] **Step 1: Teste do consumo (falha)**

Acrescentar em `consume.test.ts`:

```ts
describe('createOrderItemsWithPackages: equipamentos', () => {
  it('cada registro da divisão (coberto + cobrado) recebe os mesmos equipamentos', async () => {
    const created: Record<string, unknown>[] = []
    const tx = {
      $queryRaw: async () => [{ id: 'p1' }],
      clientPackage: {
        findMany: async () => [{ id: 'p1', serviceId: 'svc', quantity: 5, soldAt: new Date('2026-01-01'), usages: [] }],
      },
      orderService: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data)
          return { id: `os${created.length}` }
        },
      },
      packageUsage: { create: async () => ({}) },
    } as unknown as Prisma.TransactionClient

    await createOrderItemsWithPackages(tx, {
      orderId: 'o',
      clientId: 'c',
      items: [
        { serviceId: 'svc', serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 2, equipmentIds: ['e1', 'e2'] },
        { serviceName: 'Avulso', price: 10, quantity: 1 },
      ],
    })

    expect(created).toHaveLength(3)
    const links = { create: [{ equipmentId: 'e1' }, { equipmentId: 'e2' }] }
    expect(created[0].equipments).toEqual(links) // coberto
    expect(created[1].equipments).toEqual(links) // cobrado
    expect(created[2].equipments).toBeUndefined() // sem equipamento
  })
})
```

- [ ] **Step 2: Testes do reagrupamento (falham)**

Em `regroup.test.ts`, no primeiro teste (`'itens comuns ficam iguais…'`), acrescentar `equipmentIds: [],` aos **dois** objetos esperados no `toEqual`. Depois, acrescentar ao `describe('regroupOrderItems', …)`:

```ts
  const eq = (...ids: string[]) => ids.map((id) => ({ equipment: { id } }))

  it('leva os equipmentIds (ordenados) do grupo', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 }, equipments: eq('e2', 'e1') }),
        item({ price: 30, quantity: 1, equipments: eq('e1', 'e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ quantity: 3, usePackageQuantity: 2, equipmentIds: ['e1', 'e2'] })
  })

  it('não funde coberto e cobrado do mesmo serviço com equipamentos diferentes', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e1') }),
        item({ price: 30, quantity: 1, equipments: eq('e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.equipmentIds)).toEqual([['e1'], ['e2']])
  })

  it('não funde duas cobertas com equipamentos diferentes', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e1') }),
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
  })
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/lib/packages`
Expected: FAIL (`equipments` indefinido no create; `equipmentIds` ausente no reagrupamento)

- [ ] **Step 4: Implementar**

Em `src/lib/packages/split.ts`, na interface `OrderItemInput`, acrescentar:

```ts
  /** Equipamentos do cliente desta linha; copiados para cada registro gerado pela divisão. */
  equipmentIds?: string[]
```

Em `src/lib/packages/consume.ts`, dentro de `for (const item of items)`, antes do `for (const part of …)`:

```ts
    const equipmentLinks = item.equipmentIds?.length
      ? { create: item.equipmentIds.map((equipmentId) => ({ equipmentId })) }
      : undefined
```

E no `tx.orderService.create({ data: { … } })`, acrescentar ao final de `data`:

```ts
          equipments: equipmentLinks,
```

Em `src/lib/packages/regroup.ts`:

1. Em `IncomingOrderItem`, acrescentar `equipments?: { equipment: { id: string } }[] | null`.
2. Em `FormOrderItem`, acrescentar `equipmentIds: string[]`.
3. Acrescentar, acima de `plainItem`:

```ts
/** Ids dos equipamentos do registro, ordenados (para comparar conjuntos). */
function equipmentIdsOf(s: IncomingOrderItem): string[] {
  return (s.equipments ?? []).map((e) => e.equipment.id).sort()
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])
```

4. Em `plainItem`, acrescentar `equipmentIds: equipmentIdsOf(s),` ao objeto retornado.
5. Em `regroupOrderItems`, trocar `sameService` por:

```ts
    // Mesmo serviço E mesmo conjunto de equipamentos: linhas do formulário diferentes com
    // equipamentos diferentes não podem ser fundidas (perderia o vínculo)
    const sameLine = (next: IncomingOrderItem | undefined) =>
      !!next && !!s.serviceId && next.serviceId === s.serviceId && sameIds(equipmentIdsOf(next), group.equipmentIds)
```

e trocar os dois usos de `sameService(items[i])` por `sameLine(items[i])`. A declaração de `sameLine` precisa vir **depois** de `const group = …`. Atualize também o comentário JSDoc da função: "um grupo … absorve as cobertas seguintes do mesmo serviço **e com os mesmos equipamentos**…".

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run src/lib/packages`
Expected: PASS (todos, inclusive os antigos de `regroup.test.ts` e `consume.test.ts`)

- [ ] **Step 6: Commit**

```bash
git add src/lib/packages
git commit -m "feat(equipamentos): divisao por pacote copia equipamentos; reagrupamento respeita o conjunto"
```

---

### Task 6: Includes, trava/validação de equipamentos e rotas de OS

**Files:**
- Create: `src/lib/equipments/errors.ts`, `src/lib/equipments/lock.ts`
- Modify: `src/lib/packages/order-include.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Erro e resposta HTTP — `src/lib/equipments/errors.ts`**

```ts
import { NextResponse } from 'next/server'

export class InvalidEquipmentError extends Error {
  constructor(public readonly equipmentIds: string[]) {
    super('Equipamento inválido para este cliente')
    this.name = 'InvalidEquipmentError'
  }
}

/** 400 para equipamento de outro cliente/arquivado; null se não for esse erro. */
export function equipmentErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof InvalidEquipmentError)) return null
  return NextResponse.json({ error: error.message, equipmentIds: error.equipmentIds }, { status: 400 })
}
```

- [ ] **Step 2: Trava + validação — `src/lib/equipments/lock.ts`**

```ts
import { Prisma } from '@prisma/client'
import { collectEquipmentIds, invalidEquipmentIds } from './order-equipments'
import { InvalidEquipmentError } from './errors'

interface Params {
  clientId: string
  items: { equipmentIds?: string[] | null }[]
  /** Na edição: equipamentos já vinculados à OS (lidos ANTES do deleteMany dos itens). */
  alreadyLinked?: Set<string>
}

/**
 * Trava (FOR SHARE) os equipamentos pedidos e valida que são do cliente e ativos (ou já vinculados).
 * Deve rodar dentro da transação da OS, antes de criar os itens. O FOR SHARE serializa com o
 * DELETE de equipamento (FOR UPDATE): ou o DELETE espera e depois vê o vínculo (arquiva), ou a OS
 * espera e depois não acha o equipamento (400).
 */
export async function lockAndValidateOrderEquipments(
  tx: Prisma.TransactionClient,
  { clientId, items, alreadyLinked = new Set() }: Params
): Promise<void> {
  const ids = collectEquipmentIds(items)
  if (ids.length === 0) return
  const rows = await tx.$queryRaw<{ id: string; is_active: boolean }[]>`
    SELECT id, is_active FROM equipments
    WHERE client_id = ${clientId} AND id = ANY(${ids})
    ORDER BY id
    FOR SHARE`
  const invalid = invalidEquipmentIds(
    ids,
    rows.map((r) => ({ id: r.id, isActive: r.is_active })),
    alreadyLinked
  )
  if (invalid.length > 0) throw new InvalidEquipmentError(invalid)
}
```

- [ ] **Step 3: Includes — `src/lib/packages/order-include.ts`**

Dentro de `orderServicesInclude.include`, depois de `service: { select: { price: true } },`:

```ts
    // Equipamentos da linha (nome para listagem/detalhe/PDF; isActive para o form na edição)
    equipments: {
      select: { equipment: { select: { id: true, name: true, brand: true, model: true, isActive: true } } },
      orderBy: { equipment: { name: 'asc' } },
    },
```

E, ao final do arquivo:

```ts
/** Produtos avulsos da OS em ordem estável. */
export const orderProductsInclude = {
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
} satisfies Prisma.ServiceOrder$productsArgs
```

- [ ] **Step 4: `src/app/api/orders/route.ts`**

1. Imports: acrescentar `orderProductsInclude` ao import de `@/lib/packages/order-include`, e também:

```ts
import { lockAndValidateOrderEquipments } from '@/lib/equipments/lock'
import { equipmentErrorResponse } from '@/lib/equipments/errors'
```

2. GET (listagem): no `include` do `findMany`, depois de `services: orderServicesInclude,`, acrescentar `products: orderProductsInclude,`.
3. POST: trocar `const totalAmount = computeOrderTotal(validatedData.services)` por `const totalAmount = computeOrderTotal(validatedData.services, validatedData.products)`.
4. POST, dentro do `$transaction`, entre o `tx.serviceOrder.create(...)` e o `createOrderItemsWithPackages(...)`:

```ts
      await lockAndValidateOrderEquipments(tx, {
        clientId: validatedData.clientId,
        items: validatedData.services,
      })
```

e logo depois do `createOrderItemsWithPackages(...)`:

```ts
      for (const p of validatedData.products) {
        // Um a um: a ordem de exibição é createdAt+id, como nos itens de serviço
        await tx.orderProduct.create({
          data: { orderId: created.id, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice },
        })
      }
```

5. POST, no `findUniqueOrThrow` final, acrescentar `products: orderProductsInclude,` ao `include`.
6. POST, no `catch`: trocar `const mapped = packageErrorResponse(error)` por `const mapped = packageErrorResponse(error) ?? equipmentErrorResponse(error)`.

- [ ] **Step 5: `src/app/api/orders/[id]/route.ts`**

1. Imports: os mesmos três do Step 4 (`orderProductsInclude`, `lockAndValidateOrderEquipments`, `equipmentErrorResponse`).
2. GET: no `include`, acrescentar `products: orderProductsInclude,` depois do bloco `services`.
3. PATCH: no `include` do `prisma.serviceOrder.update(...)` (o que retorna `order`), acrescentar `products: orderProductsInclude,`. No `paidData`, trocar o `map` de `services` e acrescentar `products`:

```ts
            services: order.services.map((s) => ({
              name: displayServiceName(s),
              price: Number(s.price),
              quantity: s.quantity,
              description: s.description,
              equipments: s.equipments.map((e) => e.equipment.name),
            })),
            products: order.products.map((p) => ({
              name: p.name,
              quantity: p.quantity,
              unitPrice: Number(p.unitPrice),
            })),
```

(O tipo `OrderPaidMessageData` só ganha esses campos na Task 8. Como `paidData` é uma variável, o TypeScript não acusa os campos extras, mas o PDF só os usa depois da Task 8.)

4. PUT: `const totalAmount = computeOrderTotal(validatedData.services, validatedData.products)`.
5. PUT, no `$transaction`, substituir o trecho entre o `tx.serviceOrder.update(...)` e o `return tx.serviceOrder.findUniqueOrThrow` por:

```ts
      // Vínculos atuais ANTES do deleteMany (a cascata os apaga): arquivados já vinculados
      // continuam aceitos na edição
      const linked = await tx.orderServiceEquipment.findMany({
        where: { orderService: { orderId: id } },
        select: { equipmentId: true },
      })
      // O cliente da OS não muda na edição: valida sempre contra o cliente gravado
      await lockAndValidateOrderEquipments(tx, {
        clientId: existingOrder.clientId,
        items: validatedData.services,
        alreadyLinked: new Set(linked.map((l) => l.equipmentId)),
      })
      await tx.orderService.deleteMany({ where: { orderId: id } })
      await createOrderItemsWithPackages(tx, {
        orderId: id,
        clientId: existingOrder.clientId,
        items: validatedData.services,
      })
      await tx.orderProduct.deleteMany({ where: { orderId: id } })
      for (const p of validatedData.products) {
        await tx.orderProduct.create({
          data: { orderId: id, name: p.name, quantity: p.quantity, unitPrice: p.unitPrice },
        })
      }
```

Mantenha o comentário longo que explica a ordem (a)/(b). A leitura de `linked` e a validação ficam entre o `update` (trava da OS) e o `deleteMany`, o que preserva (a) e (b).

6. PUT, no `findUniqueOrThrow`, acrescentar `products: orderProductsInclude,`.
7. PUT, no `catch`: `const mapped = packageErrorResponse(error) ?? equipmentErrorResponse(error)`.

- [ ] **Step 6: Testes existentes continuam passando**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Typecheck e commit**

Run: `npx tsc --noEmit`
Expected: sem erros


```bash
git add src/lib/equipments src/lib/packages/order-include.ts src/app/api/orders
git commit -m "feat(equipamentos): rotas de OS gravam equipamentos e produtos com trava"
```

---

### Task 7: API de equipamentos do cliente

**Files:**
- Create: `src/lib/equipments/client-access.ts`, `src/app/api/clients/[id]/equipments/route.ts`, `src/app/api/clients/[id]/equipments/[equipmentId]/route.ts`

- [ ] **Step 1: `src/lib/equipments/client-access.ts`**

```ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, type AuthUser } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'

type Access = { error: NextResponse; user?: never; client?: never } | { error: null; user: AuthUser; client: { id: string } }

/** Login + cliente existente + loja do cliente acessível ao usuário (mesma regra de pacotes). */
export async function requireClientAccess(clientId: string, verb?: string): Promise<Access> {
  const { user, error } = await requireAuth()
  if (error) return { error }
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, store: { select: { id: true, companyId: true } } },
  })
  if (!client) return { error: NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }) }
  const denied = denyIfNoStoreAccess(user!, client.store, verb)
  if (denied) return { error: denied }
  return { error: null, user: user!, client: { id: client.id } }
}
```

Confira se `AuthUser` é exportado por `src/lib/auth-utils.ts` (o `store-access.ts` já importa `type AuthUser` de lá). Se não for, use `NonNullable<Awaited<ReturnType<typeof requireAuth>>['user']>`.

- [ ] **Step 2: `src/app/api/clients/[id]/equipments/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { equipmentSchema } from '@/lib/validations'
import { requireClientAccess } from '@/lib/equipments/client-access'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/clients/[id]/equipments?includeArchived=1 — ativos por padrão
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireClientAccess(id)
    if (access.error) return access.error

    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === '1'
    const equipments = await prisma.equipment.findMany({
      where: { clientId: id, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json(equipments)
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error)
    return NextResponse.json({ error: 'Erro ao listar equipamentos' }, { status: 500 })
  }
}

// POST /api/clients/[id]/equipments — cadastra equipamento
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireClientAccess(id, 'cadastrar equipamentos em')
    if (access.error) return access.error

    const parsed = equipmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    const created = await prisma.equipment.create({ data: { ...parsed.data, clientId: id } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar equipamento:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar equipamento' }, { status: 500 })
  }
}
```

- [ ] **Step 3: `src/app/api/clients/[id]/equipments/[equipmentId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateEquipmentSchema } from '@/lib/validations'
import { requireClientAccess } from '@/lib/equipments/client-access'

type Ctx = { params: Promise<{ id: string; equipmentId: string }> }

const notFound = () => NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 })

// PATCH — edita campos; { isActive: true } reativa um arquivado
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId } = await params
    const access = await requireClientAccess(id, 'editar equipamentos de')
    if (access.error) return access.error

    const parsed = updateEquipmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    // Só o equipamento deste cliente (updateMany com clientId evita editar o de outro cliente)
    const { count } = await prisma.equipment.updateMany({ where: { id: equipmentId, clientId: id }, data: parsed.data })
    if (count === 0) return notFound()
    return NextResponse.json(await prisma.equipment.findUnique({ where: { id: equipmentId } }))
  } catch (error) {
    console.error('Erro ao editar equipamento:', error)
    return NextResponse.json({ error: 'Erro ao editar equipamento' }, { status: 500 })
  }
}

// DELETE — apaga se nunca usado; se já usado em OS, arquiva (histórico preservado)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId } = await params
    const access = await requireClientAccess(id, 'remover equipamentos de')
    if (access.error) return access.error

    // FOR UPDATE serializa com a gravação de OS (FOR SHARE em lockAndValidateOrderEquipments):
    // um vínculo criado concorrentemente é visto pelo count e o equipamento é arquivado
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM equipments WHERE id = ${equipmentId} AND client_id = ${id} FOR UPDATE`
      if (locked.length === 0) return null
      const used = await tx.orderServiceEquipment.count({ where: { equipmentId } })
      if (used > 0) {
        await tx.equipment.update({ where: { id: equipmentId }, data: { isActive: false } })
        return { archived: true }
      }
      await tx.equipment.delete({ where: { id: equipmentId } })
      return { archived: false }
    })
    return result ? NextResponse.json(result) : notFound()
  } catch (error) {
    console.error('Erro ao remover equipamento:', error)
    return NextResponse.json({ error: 'Erro ao remover equipamento' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Typecheck das rotas novas**

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add src/lib/equipments/client-access.ts "src/app/api/clients/[id]/equipments"
git commit -m "feat(equipamentos): API de equipamentos do cliente"
```

---

### Task 8: WhatsApp (fallback e dados do PDF) + PDF

**Files:**
- Modify: `src/lib/whatsapp/types.ts`, `src/lib/whatsapp/message-data.ts`, `src/lib/whatsapp/index.ts`, `src/lib/pdf/generate-order-pdf.ts`, `src/lib/email/send-email.ts`
- Test: `src/lib/whatsapp/__tests__/message-data.test.ts`, `src/lib/pdf/__tests__/generate-order-pdf.test.ts`

- [ ] **Step 1: Testes que falham**

`src/lib/whatsapp/__tests__/message-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildVariables, toMetaParams } from '@/lib/whatsapp/message-data'

const base = {
  clientName: 'Maria',
  clientPhone: '11999990000',
  orderNumber: '1042',
  storeName: 'Loja',
  companyName: 'Empresa',
  companyId: 'c1',
  totalAmount: 50,
}

describe('buildVariables sem serviços (OS só com produtos)', () => {
  it('services e servicesMultiline usam "—"', () => {
    const v = buildVariables({ ...base, status: 'RECEIVED', services: [] })
    expect(v.services).toBe('—')
    expect(v.servicesMultiline).toBe('—')
  })

  it('nenhum parâmetro Meta fica vazio', () => {
    const v = buildVariables({ ...base, status: 'RECEIVED', services: [] })
    expect(toMetaParams('RECEIVED', v).every((p) => p.length > 0)).toBe(true)
  })
})
```

`src/lib/pdf/__tests__/generate-order-pdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateOrderPdf, type OrderPdfData } from '@/lib/pdf/generate-order-pdf'

const base: OrderPdfData = {
  orderNumber: '1042',
  clientName: 'Maria',
  clientPhone: '11999990000',
  storeName: 'Loja',
  companyName: 'Empresa',
  services: [],
  totalAmount: 0,
  createdAt: new Date('2026-10-06T12:00:00Z'),
}

// jsPDF sem compressão: o texto aparece literal no conteúdo
const text = (data: OrderPdfData) => generateOrderPdf(data).toString('latin1')

describe('generateOrderPdf', () => {
  it('OS só com produtos: sem cabeçalho de serviços, com tabela de produtos', () => {
    const out = text({ ...base, products: [{ name: 'Corrente', quantity: 2, unitPrice: 25 }], totalAmount: 50 })
    expect(out.startsWith('%PDF')).toBe(true)
    expect(out).not.toContain('SERVICOS REALIZADOS')
    expect(out).toContain('PRODUTOS')
    expect(out).toContain('Corrente')
  })

  it('mostra os equipamentos abaixo do serviço', () => {
    const out = text({
      ...base,
      services: [{ name: 'Limpeza', price: 30, quantity: 1, equipments: ['Split sala', 'Split quarto'] }],
      totalAmount: 30,
    })
    expect(out).toContain('SERVICOS REALIZADOS')
    expect(out).toContain('Equipamentos: Split sala, Split quarto')
    expect(out).not.toContain('PRODUTOS')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/whatsapp src/lib/pdf`
Expected: FAIL (`''` em vez de `'—'`; o PDF sempre tem "SERVICOS REALIZADOS" e não tem "PRODUTOS")

- [ ] **Step 3: Tipos — `src/lib/whatsapp/types.ts`**

Em `OrderPaidMessageData`, trocar a linha `services` e acrescentar `products`:

```ts
  services: { name: string; price: number; quantity: number; description?: string | null; equipments?: string[] }[]
  products?: { name: string; quantity: number; unitPrice: number }[]
```

- [ ] **Step 4: Fallback — `src/lib/whatsapp/message-data.ts`**

Em `buildVariables`, trocar as linhas de `servicesMultiline` e `services` por:

```ts
    // OS só com produtos: a Meta rejeita parâmetro vazio
    servicesMultiline:
      data.services
        .map((s) => `  • ${s.name} (${s.quantity}x) - R$ ${(s.price * s.quantity).toFixed(2)}`)
        .join('\n') || '—',
    services: data.services.map((s) => `${s.name} (${s.quantity}x) R$ ${brl(s.price * s.quantity)}`).join('; ') || '—',
```

- [ ] **Step 5: PDF — `src/lib/pdf/generate-order-pdf.ts`**

O arquivo tem o corpo **duplicado** em `generateOrderPdf` e `generateOrderPdfBase64`. Extraia um builder único e acrescente as seções novas:

1. Interfaces:

```ts
interface OrderService {
  name: string
  price: number
  quantity: number
  description?: string | null
  equipments?: string[]
}

interface OrderProduct {
  name: string
  quantity: number
  unitPrice: number
}
```

e, em `OrderPdfData`, acrescentar `products?: OrderProduct[]`.

2. Renomeie o corpo atual de `generateOrderPdf` (de `const doc = new jsPDF()` até antes de `// Return as Buffer`) para `function buildOrderPdf(data: OrderPdfData): jsPDF { …; return doc }`. Então:

```ts
export function generateOrderPdf(data: OrderPdfData): Buffer {
  return Buffer.from(buildOrderPdf(data).output('arraybuffer'))
}

export function generateOrderPdfBase64(data: OrderPdfData): string {
  return buildOrderPdf(data).output('datauristring').split(',')[1]
}
```

Apague o corpo duplicado de `generateOrderPdfBase64`.

3. Dentro de `buildOrderPdf`, declare logo após `let y = 20`:

```ts
  const ensureSpace = () => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  // Cabeçalho de tabela (Item / Qtd / Valor Unit. / Total)
  const tableHeader = (first: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(first, margin, y)
    doc.text('Qtd', pageWidth - 70, y, { align: 'right' })
    doc.text('Valor Unit.', pageWidth - 45, y, { align: 'right' })
    doc.text('Total', pageWidth - margin, y, { align: 'right' })
    y += 3
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
  }

  const truncate = (s: string, max: number) => (s.length > max ? s.substring(0, max) + '...' : s)
```

4. Substitua o bloco que vai de `// Services Section` até o fim do `for (const service of data.services) { … }` por:

```ts
  if (data.services.length > 0) {
    ensureSpace()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SERVICOS REALIZADOS', margin, y)
    y += 10
    tableHeader('Servico')

    for (const service of data.services) {
      doc.text(truncate(service.name, 35), margin, y)
      doc.text(String(service.quantity), pageWidth - 70, y, { align: 'right' })
      doc.text(formatCurrency(service.price), pageWidth - 45, y, { align: 'right' })
      doc.text(formatCurrency(service.price * service.quantity), pageWidth - margin, y, { align: 'right' })
      y += 6

      const subLines = [
        service.description ? truncate(service.description, 60) : null,
        service.equipments?.length ? truncate(`Equipamentos: ${service.equipments.join(', ')}`, 80) : null,
      ].filter((l): l is string => !!l)
      for (const line of subLines) {
        doc.setFontSize(8)
        doc.setTextColor(100)
        doc.text(`  ${line}`, margin, y)
        doc.setTextColor(0)
        doc.setFontSize(9)
        y += 5
      }
      ensureSpace()
    }
  }

  if (data.products?.length) {
    y += data.services.length > 0 ? 5 : 0
    // Título + cabeçalho não podem ficar sozinhos no fim da página
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PRODUTOS', margin, y)
    y += 10
    tableHeader('Produto')

    for (const product of data.products) {
      doc.text(truncate(product.name, 35), margin, y)
      doc.text(String(product.quantity), pageWidth - 70, y, { align: 'right' })
      doc.text(formatCurrency(product.unitPrice), pageWidth - 45, y, { align: 'right' })
      doc.text(formatCurrency(product.unitPrice * product.quantity), pageWidth - margin, y, { align: 'right' })
      y += 6
      ensureSpace()
    }
  }
```

O restante (linha, TOTAL, datas, observações, rodapé) continua igual.

5. `src/lib/email/send-email.ts`, em `sendOrderFinishedEmail`: OS só com produtos ficaria com a lista de serviços vazia. Acrescentar `||` com fallback ao fim da expressão de `servicesHtml` (depois do `.join('')`), sem mudar o `.map` existente:

```ts
    .join('') || '<div style="color: #6b7280; font-size: 14px; padding: 12px;">—</div>'
```

O e-mail continua sem listar produtos (fora do escopo); o total já os inclui.

6. `src/lib/whatsapp/index.ts`, em `pdfData`:

```ts
    services: data.services.map((s) => ({
      name: s.name,
      price: s.price,
      quantity: s.quantity,
      description: s.description,
      equipments: s.equipments,
    })),
    products: data.products,
```

- [ ] **Step 6: Rodar os testes e o typecheck**

Run: `npx vitest run src/lib/whatsapp src/lib/pdf`
Expected: PASS

Se o teste do PDF falhar porque o texto não aparece literal (a compressão estaria ligada), troque a asserção por uma checagem do tamanho/assinatura e valide o conteúdo manualmente na Task 13. Não ligue/desligue a compressão só por causa do teste.

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add src/lib/whatsapp src/lib/pdf src/lib/email/send-email.ts
git commit -m "feat(produtos): PDF com equipamentos e produtos; fallback de servicos vazio no WhatsApp"
```

---

### Task 9: Hooks de equipamentos

**Files:**
- Create: `src/hooks/api/use-equipments.ts`
- Modify: `src/hooks/api/index.ts`

- [ ] **Step 1: Implementar `src/hooks/api/use-equipments.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { EquipmentInput } from '@/lib/validations'

export interface Equipment {
  id: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  notes: string | null
  isActive: boolean
  clientId: string
}

export function useClientEquipments(clientId: string | null | undefined, opts: { includeArchived?: boolean } = {}) {
  const includeArchived = !!opts.includeArchived
  return useQuery<Equipment[]>({
    queryKey: ['client-equipments', clientId, includeArchived],
    queryFn: async () =>
      (await axios.get(`/api/clients/${clientId}/equipments`, { params: includeArchived ? { includeArchived: 1 } : {} })).data,
    enabled: !!clientId,
  })
}

function useInvalidate(clientId: string) {
  const queryClient = useQueryClient()
  // Prefixo: invalida as variantes com e sem arquivados
  return () => queryClient.invalidateQueries({ queryKey: ['client-equipments', clientId] })
}

export function useCreateEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async (data: EquipmentInput) => (await axios.post(`/api/clients/${clientId}/equipments`, data)).data as Equipment,
    onSuccess: invalidate,
  })
}

export function useUpdateEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EquipmentInput> & { isActive?: boolean } }) =>
      (await axios.patch(`/api/clients/${clientId}/equipments/${id}`, data)).data as Equipment,
    onSuccess: invalidate,
  })
}

export function useDeleteEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async (id: string) =>
      (await axios.delete(`/api/clients/${clientId}/equipments/${id}`)).data as { archived: boolean },
    onSuccess: invalidate,
  })
}
```

Em `src/hooks/api/index.ts`, acrescentar `export * from './use-equipments'`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/hooks/api
git commit -m "feat(equipamentos): hooks React Query"
```

---

### Task 10: Modal de equipamentos na tela de clientes

**Files:**
- Create: `src/components/equipments/ClientEquipmentsModal.tsx`
- Modify: `src/app/(authenticated)/clients/page.tsx`

- [ ] **Step 1: Criar `src/components/equipments/ClientEquipmentsModal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Pencil, Trash2, RotateCcw, Plus } from 'lucide-react'
import { Modal, Button, Input, Textarea, Badge } from '@/components/ui'
import {
  useClientEquipments,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  type Equipment,
} from '@/hooks/api'
import { equipmentSchema } from '@/lib/validations'

interface Props {
  client: { id: string; name: string } | null
  onClose: () => void
}

export default function ClientEquipmentsModal({ client, onClose }: Props) {
  return (
    <Modal isOpen={!!client} onClose={onClose} title={`Equipamentos — ${client?.name ?? ''}`} size="lg">
      {client && <Content key={client.id} clientId={client.id} />}
    </Modal>
  )
}

const EMPTY = { name: '', brand: '', model: '', serialNumber: '', notes: '' }
type FormState = typeof EMPTY

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback

function Content({ clientId }: { clientId: string }) {
  const [showArchived, setShowArchived] = useState(false)
  const { data: equipments = [], isLoading, isError, refetch } = useClientEquipments(clientId, { includeArchived: showArchived })
  const create = useCreateEquipment(clientId)
  const update = useUpdateEquipment(clientId)
  const remove = useDeleteEquipment(clientId)

  // editing: null = formulário fechado; 'new' = cadastrando; id = editando
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const openNew = () => {
    setForm(EMPTY)
    setEditing('new')
    setError(null)
  }
  const openEdit = (e: Equipment) => {
    setForm({
      name: e.name,
      brand: e.brand ?? '',
      model: e.model ?? '',
      serialNumber: e.serialNumber ?? '',
      notes: e.notes ?? '',
    })
    setEditing(e.id)
    setError(null)
  }

  const save = async () => {
    const parsed = equipmentSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    try {
      if (editing === 'new') await create.mutateAsync(form)
      else if (editing) await update.mutateAsync({ id: editing, data: form })
      setEditing(null)
      setNotice(null)
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar equipamento'))
    }
  }

  const onRemove = async (e: Equipment) => {
    if (!window.confirm(`Remover "${e.name}"?`)) return
    try {
      const { archived } = await remove.mutateAsync(e.id)
      setNotice(
        archived
          ? `"${e.name}" já foi usado em OS e foi arquivado: não aparece em novas OS, mas continua no histórico.`
          : `"${e.name}" removido.`
      )
    } catch (err) {
      setNotice(errorMessage(err, 'Erro ao remover equipamento'))
    }
  }

  const reactivate = async (e: Equipment) => {
    try {
      await update.mutateAsync({ id: e.id, data: { isActive: true } })
      setNotice(`"${e.name}" reativado.`)
    } catch (err) {
      setNotice(errorMessage(err, 'Erro ao reativar equipamento'))
    }
  }

  const set = (k: keyof FormState) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }))
  const saving = create.isPending || update.isPending

  return (
    <div className="space-y-4">
      {notice && <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">{notice}</div>}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostrar arquivados
        </label>
        {editing === null && (
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo equipamento
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Input label="Nome *" placeholder="Ex.: Split sala" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Marca" value={form.brand} onChange={set('brand')} />
            <Input label="Modelo" value={form.model} onChange={set('model')} />
            <Input label="Nº de série" value={form.serialNumber} onChange={set('serialNumber')} />
          </div>
          <Textarea label="Observações" value={form.notes} onChange={set('notes')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} isLoading={saving}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-600">Carregando…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Erro ao carregar equipamentos.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : equipments.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum equipamento cadastrado.</p>
      ) : (
        <ul className="divide-y border rounded-lg bg-white">
          {equipments.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {e.name}
                  {!e.isActive && (
                    <Badge variant="secondary" className="ml-2">
                      Arquivado
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {[e.brand, e.model].filter(Boolean).join(' · ') || '—'}
                  {e.serialNumber ? ` · Série ${e.serialNumber}` : ''}
                </p>
                {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {e.isActive ? (
                  <>
                    <Button type="button" variant="ghost" size="icon" title="Editar" aria-label={`Editar ${e.name}`} onClick={() => openEdit(e)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" title="Remover" aria-label={`Remover ${e.name}`} onClick={() => onRemove(e)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="ghost" size="icon" title="Reativar" aria-label={`Reativar ${e.name}`} onClick={() => reactivate(e)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Confira os nomes das props de `Button` (`variant`, `size="icon"`, `isLoading`) e de `Badge` (`variant="secondary"`) em `src/components/ui/`; os dois já são usados assim em `clients/page.tsx` e em `orders/page.tsx`.

- [ ] **Step 2: Ligar na tela de clientes — `src/app/(authenticated)/clients/page.tsx`**

1. Import do ícone: acrescentar `Wrench` à lista do `lucide-react`.
2. Import: `import ClientEquipmentsModal from '@/components/equipments/ClientEquipmentsModal'`.
3. Estado, junto de `historyFor`: `const [equipmentsFor, setEquipmentsFor] = useState<Client | null>(null)`.
4. Menu do card mobile: antes do botão "Pacotes" (`setHistoryFor(client)`), acrescentar:

```tsx
                <button
                  onClick={() => {
                    setEquipmentsFor(client)
                    setOpenActionsId(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Equipamentos
                </button>
```

5. Ações da tabela desktop: antes do botão `title="Pacotes"`:

```tsx
                          <Button variant="ghost" size="icon" title="Equipamentos" aria-label={`Equipamentos de ${client.name}`} onClick={() => setEquipmentsFor(client)}>
                            <Wrench className="w-4 h-4" />
                          </Button>
```

6. Junto de `<ClientPackagesModal … />` no fim do JSX:

```tsx
      <ClientEquipmentsModal client={equipmentsFor} onClose={() => setEquipmentsFor(null)} />
```

- [ ] **Step 3: Typecheck e lint**

Run: `npx tsc --noEmit`
Expected: sem erros

Run: `npm run lint`
Expected: sem erros novos

- [ ] **Step 4: Commit**

```bash
git add src/components/equipments "src/app/(authenticated)/clients/page.tsx"
git commit -m "feat(equipamentos): modal de equipamentos na tela de clientes"
```

---

### Task 11: Formulário da OS (equipamentos por serviço + produtos)

**Files:**
- Create: `src/components/orders/EquipmentPicker.tsx`, `src/components/orders/OrderProductsSection.tsx`
- Modify: `src/components/forms/OrderForm.tsx`

- [ ] **Step 1: `src/components/orders/EquipmentPicker.tsx`**

```tsx
'use client'

import { Wrench } from 'lucide-react'
import type { Equipment } from '@/hooks/api'

interface Props {
  /** Equipamentos do cliente (na edição inclui arquivados; só aparecem se já selecionados). */
  equipments: Equipment[]
  value: string[]
  onChange: (ids: string[]) => void
  hasClient: boolean
  loading?: boolean
}

/** Checkboxes dos equipamentos do cliente para uma linha de serviço da OS. */
export default function EquipmentPicker({ equipments, value, onChange, hasClient, loading }: Props) {
  const selected = new Set(value)
  const options = equipments.filter((e) => e.isActive || selected.has(e.id))

  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((v) => v !== id))

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Wrench className="w-4 h-4 text-gray-500" />
        Equipamentos
      </p>
      {!hasClient ? (
        <p className="text-xs text-gray-500">Selecione o cliente para escolher equipamentos.</p>
      ) : loading ? (
        <p className="text-xs text-gray-500">Carregando equipamentos…</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum equipamento cadastrado para este cliente.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {options.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={selected.has(e.id)}
                onChange={(ev) => toggle(e.id, ev.target.checked)}
              />
              {e.name}
              {!e.isActive && <span className="text-xs text-gray-500">(arquivado)</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `src/components/orders/OrderProductsSection.tsx`**

```tsx
'use client'

import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import type { ServiceOrderFormData } from '@/lib/validations'

interface Props {
  control: Control<ServiceOrderFormData>
  register: UseFormRegister<ServiceOrderFormData>
  errors: FieldErrors<ServiceOrderFormData>
}

/** Produtos avulsos da OS (sem catálogo). O total é calculado pelo OrderForm. */
export default function OrderProductsSection({ control, register, errors }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'products' })

  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Produtos</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, unitPrice: 0 })}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Produto
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto. Use para itens vendidos junto com a OS.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-gray-50">
              <div className="col-span-12 sm:col-span-6">
                <Input
                  label="Produto"
                  placeholder="Ex.: Corrente de bicicleta"
                  error={errors.products?.[index]?.name?.message}
                  {...register(`products.${index}.name` as const)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  label="Qtd"
                  type="number"
                  min="1"
                  error={errors.products?.[index]?.quantity?.message}
                  {...register(`products.${index}.quantity` as const, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Input
                  label="Preço unit. (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.products?.[index]?.unitPrice?.message}
                  {...register(`products.${index}.unitPrice` as const, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end pt-7">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Remover produto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Integrar no `src/components/forms/OrderForm.tsx`**

1. Imports:
   - `import { useForm, useFieldArray, Controller } from 'react-hook-form'`
   - acrescentar `useClientEquipments` ao import de `@/hooks/api`
   - `import EquipmentPicker from '@/components/orders/EquipmentPicker'`
   - `import OrderProductsSection from '@/components/orders/OrderProductsSection'`
2. Tipo `OrderFormProps['order']`:
   - em cada item de `services`, acrescentar `equipments?: { equipment: { id: string; name: string; isActive: boolean } }[]`
   - acrescentar ao `order`: `products?: { id: string; name: string; quantity: number; unitPrice: number | string }[]`
3. `emptyServiceItem`: acrescentar `equipmentIds: [] as string[],`. No `append({...})` do botão "Adicionar Serviço", acrescentar `equipmentIds: [],`.
4. `defaultValues`: acrescentar

```ts
      products: (order?.products ?? []).map((p) => ({ name: p.name, quantity: p.quantity, unitPrice: Number(p.unitPrice) })),
```

5. Logo após `const clientId = watch('clientId')`:

```ts
  const watchedProducts = watch('products')
  // Na edição também os arquivados: os já vinculados continuam selecionáveis (marcados "arquivado")
  const { data: clientEquipments = [], isLoading: equipmentsLoading } = useClientEquipments(clientId, {
    includeArchived: !!order,
  })
```

6. `resetPackageUse`: no fim da função, acrescentar a limpeza dos equipamentos (eles pertencem ao cliente anterior):

```ts
    items.forEach((_, i) => setValue(`services.${i}.equipmentIds`, []))
```

Ela já é chamada no `onChange` do select de cliente e em `handleCreateClient`. Atualize o comentário acima dela: "Saldos e equipamentos pertencem ao cliente anterior…".

7. Na linha de serviço: logo antes do `</div>` que fecha o container `key={field.id}` (depois do `})()}` das três variações), acrescentar:

```tsx
              <Controller
                control={control}
                name={`services.${index}.equipmentIds`}
                render={({ field: f }) => (
                  <EquipmentPicker
                    equipments={clientEquipments}
                    value={f.value ?? []}
                    onChange={f.onChange}
                    hasClient={!!clientId}
                    loading={equipmentsLoading}
                  />
                )}
              />
```

8. Permitir remover a última linha de serviço: trocar `{fields.length > 1 && (` por `{(fields.length > 1 || (watchedProducts?.length ?? 0) > 0) && (` no botão de lixeira da linha. Assim, a OS só fica sem serviço se tiver produto. Ajuste o `)}` correspondente se for preciso; a estrutura não muda.
9. Mensagem do refine (o zodResolver põe o erro de array em `services.root`):

```tsx
        {(errors.services?.message || errors.services?.root?.message) && (
          <p className="text-sm text-red-600 mt-2">{errors.services?.message || errors.services?.root?.message}</p>
        )}
```

10. Seção de produtos: entre o `</div>` que fecha `{/* Services */}` e `{/* Total */}`:

```tsx
      <OrderProductsSection control={control} register={register} errors={errors} />
```

11. Total: trocar `calculateTotal` e o bloco `{/* Total */}`:

```ts
  const servicesTotal = () =>
    watchedServices?.reduce((sum, s, i) => {
      const charged = Math.max(0, (Number(s.quantity) || 1) - (effectiveUse[i] ?? 0))
      return sum + (Number(s.price) || 0) * charged
    }, 0) || 0

  const productsTotal = () =>
    (watchedProducts ?? []).reduce((sum, p) => sum + (Number(p.unitPrice) || 0) * (Number(p.quantity) || 0), 0)
```

```tsx
      {/* Total */}
      <div className="border-t pt-4 space-y-1">
        {(watchedProducts?.length ?? 0) > 0 && (
          <>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Serviços</span>
              <span>{formatCurrency(servicesTotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Produtos</span>
              <span>{formatCurrency(productsTotal())}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center text-lg font-bold">
          <span className="text-gray-900">Total:</span>
          <span className="text-green-600">{formatCurrency(servicesTotal() + productsTotal())}</span>
        </div>
      </div>
```

12. `onSubmit`, em `normalizedData`, acrescentar:

```ts
        products: (data.products ?? []).map((p) => ({
          name: p.name,
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.unitPrice) || 0,
        })),
```

- [ ] **Step 4: Typecheck e lint**

Run: `npx tsc --noEmit`
Expected: sem erros

Run: `npm run lint`
Expected: sem erros novos

- [ ] **Step 5: Commit**

```bash
git add src/components/orders src/components/forms/OrderForm.tsx
git commit -m "feat(equipamentos): equipamentos por servico e produtos no formulario da OS"
```

---

### Task 12: Listagem e detalhe da OS

**Files:**
- Modify: `src/app/(authenticated)/orders/page.tsx`, `src/hooks/api/use-orders.ts`

- [ ] **Step 1: Tipos**

Em `src/hooks/api/use-orders.ts` e em `orders/page.tsx`, no `interface OrderService`, acrescentar:

```ts
  equipments?: { equipment: { id: string; name: string; isActive: boolean } }[]
```

E no `interface Order` dos dois arquivos:

```ts
  products?: { id: string; name: string; quantity: number; unitPrice: number | string }[]
```

- [ ] **Step 2: Coluna e card**

1. Imports em `orders/page.tsx`: acrescentar `Wrench` ao `lucide-react` e

```ts
import { orderEquipmentNames, summarizeNames } from '@/lib/equipments/order-equipments'
```

2. Tabela desktop: novo `<TableHead>Equipamentos</TableHead>` depois de `<TableHead>Cliente</TableHead>`. Na linha, depois da `<TableCell>` do cliente:

```tsx
                      <TableCell className="max-w-[220px]">
                        {(() => {
                          const names = orderEquipmentNames(order.services)
                          return (
                            <span
                              className={names.length ? 'text-sm text-gray-800' : 'text-gray-400'}
                              title={names.join(', ') || undefined}
                            >
                              {summarizeNames(names)}
                            </span>
                          )
                        })()}
                      </TableCell>
```

3. `OrderCard` (mobile): depois de `<p className="text-xs text-gray-500">{order.client.phone}</p>`:

```tsx
            {orderEquipmentNames(order.services).length > 0 && (
              <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5 truncate">
                <Wrench className="h-3 w-3 shrink-0" />
                {summarizeNames(orderEquipmentNames(order.services))}
              </p>
            )}
```

- [ ] **Step 3: Modal de detalhe**

1. No bloco `{/* Services */}`, envolver tudo em `{viewOrder.services.length > 0 && ( … )}`.
2. Dentro de cada serviço, depois do `{service.description && (…)}`:

```tsx
                      {(service.equipments?.length ?? 0) > 0 && (
                        <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                          <Wrench className="h-3 w-3 shrink-0" />
                          Equipamentos: {service.equipments!.map((e) => e.equipment.name).join(', ')}
                        </p>
                      )}
```

3. Logo depois do bloco de serviços, antes de `{/* Dates */}`:

```tsx
            {/* Products */}
            {(viewOrder.products?.length ?? 0) > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Produtos</h4>
                <div className="space-y-2">
                  {viewOrder.products!.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg gap-4">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{p.name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm text-gray-700">
                          {formatCurrency(Number(p.unitPrice))} x {p.quantity}
                        </p>
                        <p className="font-semibold text-green-600 text-sm sm:text-base">
                          {formatCurrency(Number(p.unitPrice) * p.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 4: Typecheck, lint e testes**

Run: `npx tsc --noEmit`
Expected: sem erros

Run: `npm run lint`
Expected: sem erros novos

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(authenticated)/orders/page.tsx" src/hooks/api/use-orders.ts
git commit -m "feat(equipamentos): equipamentos e produtos na listagem e no detalhe da OS"
```

---

### Task 13: Verificação no navegador (dev server 3001)

Sem commit de código, salvo correções encontradas.

- [ ] **Step 1:** Subir o ambiente: Postgres (`npm run docker:up`, se não estiver de pé) e o dev server pelo `preview_start` (config do `.claude/launch.json`). Fazer login com o admin do seed.
- [ ] **Step 2: Clientes.** Abrir "Equipamentos" de um cliente e cadastrar "Split sala" (marca/modelo/série) e "Split quarto". Editar um deles. Remover um equipamento nunca usado e conferir que ele some de vez.
- [ ] **Step 3: Nova OS com pacote + equipamentos + produto.** Usar um cliente com saldo de pacote (ou vender um). Na linha do serviço do pacote, marcar os dois equipamentos, usar o pacote parcialmente (quantidade 3, pacote 2) e adicionar o produto "Corrente" (2 × R$ 25). Conferir os subtotais e o total no formulário. Salvar.
- [ ] **Step 4: Listagem.** A coluna "Equipamentos" mostra "Split quarto, Split sala" (ordem alfabética, porque vem do include por linha), e o total inclui R$ 50 dos produtos. Conferir também o card no mobile (`resize_window` preset mobile, depois voltar ao desktop).
- [ ] **Step 5: Edição.** Abrir a edição e conferir que a linha reagrupada mantém os dois equipamentos marcados e o uso de pacote, e que o produto aparece. Desmarcar um equipamento, salvar e conferir na listagem.
- [ ] **Step 6: Arquivamento.** Remover "Split sala" na tela de clientes: deve aparecer o aviso "arquivado". A OS antiga continua mostrando o equipamento. Uma nova OS não oferece "Split sala". Na edição da OS antiga, ele aparece marcado com "(arquivado)" e salva sem erro.
- [ ] **Step 7: OS só com produtos.** Nova OS: adicionar um produto, remover a linha de serviço vazia e salvar. Conferir o total. Tentar salvar sem serviço e sem produto: deve aparecer "Adicione pelo menos um serviço ou produto".
- [ ] **Step 8: PDF/WhatsApp.** Com `META_MOCK=true`, marcar como PAGA a OS do Step 3 e a OS só com produtos. Ver nos logs do servidor (`preview_logs`) que o envio não falhou. Para inspecionar o PDF, gere localmente com um script temporário no scratchpad que chame `generateOrderPdf` com os dados da OS. Não versione o script.
- [ ] **Step 9: Segurança (manual, via `javascript_tool` com `fetch`).** `PUT /api/orders/<id>` com um `equipmentIds` de outro cliente deve devolver 400 "Equipamento inválido para este cliente".
- [ ] **Step 10:** Rodar `npm test`, `npx tsc --noEmit` e `npm run lint` uma última vez. Conferir que os arquivos novos têm LF: `git ls-files --eol src/lib/equipments src/components/equipments src/components/orders "src/app/api/clients/[id]/equipments"`.
- [ ] **Step 11:** Tirar screenshot da listagem e do formulário como evidência. Corrigir o que for encontrado em commits novos.

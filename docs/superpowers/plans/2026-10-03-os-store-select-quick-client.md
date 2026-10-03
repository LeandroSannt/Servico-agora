# Seleção de loja e atalho de cliente na OS — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuários sem loja vinculada escolhem a loja ao criar uma OS, e o atalho "Novo Cliente" fica visível e funcional, com aviso quando a loja não tem clientes.

**Architecture:** Toda a mudança fica em `src/components/forms/OrderForm.tsx`. O `storeId` passa a ser lido do form via `watch`, o bloco "Loja" vira um `Select` quando o usuário não tem loja e não está editando, e o modal "Novo Cliente" recebe a loja via `resetClientForm` ao abrir.

**Tech Stack:** Next.js 14, react-hook-form 7.69, zod, TanStack Query 5, componentes `Select`/`Button`/`Modal` de `@/components/ui`.

**Spec:** `docs/superpowers/specs/2026-10-03-os-store-select-quick-client-design.md`

**Testes:** o projeto não tem runner de testes. Verificação é `npx tsc --noEmit`, `npm run lint` e roteiro manual no browser (Task 4).

---

### Task 1: `storeId` observado e modo só-leitura

**Files:**
- Modify: `src/components/forms/OrderForm.tsx:47-49` (derivação de storeId), `:80-92` (field array e queries)

- [ ] **Step 1: Trocar a derivação de `storeId`**

Substituir:
```tsx
  // Usar a loja do usuário logado ou da ordem existente
  const storeId = order?.store?.id || userStore?.id || ''
  const storeName = order?.store?.name || userStore?.name || ''
```
por:
```tsx
  // Loja fixa quando editando ou quando o usuário tem loja vinculada;
  // caso contrário o usuário escolhe a loja num select.
  const isStoreReadOnly = !!order || !!userStore
  const initialStoreId = order?.store?.id || userStore?.id || ''
  const storeName = order?.store?.name || userStore?.name || ''

  const emptyServiceItem = {
    serviceId: '',
    serviceName: '',
    description: '',
    price: 0,
    quantity: 1,
    saveGlobally: false,
    isExisting: false,
  }
```

- [ ] **Step 2: Usar `initialStoreId` e `emptyServiceItem` nos defaults; ler `storeId` via `watch`**

Em `defaultValues`, trocar `storeId: storeId,` por `storeId: initialStoreId,` e o literal do item vazio de serviço por `[emptyServiceItem]`.

Substituir:
```tsx
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'services',
  })

  const watchedServices = watch('services')

  // Fetch clients and services using React Query (usando storeId do usuário)
  const { data: clientsData } = useClients({ storeId: storeId, limit: 100 })
  const clients = clientsData?.data || []
```
por:
```tsx
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'services',
  })

  const watchedServices = watch('services')
  const storeId = watch('storeId')

  // Lojas disponíveis (só usadas no modo com select; requisição leve, aceita)
  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  // Fetch clients and services using React Query (filtrados pela loja do form)
  const { data: clientsData, isSuccess: clientsLoaded } = useClients({ storeId: storeId, limit: 100 })
  const clients = clientsData?.data || []
```

- [ ] **Step 3: Importar `useStores`**

Linha 8: adicionar `useStores` à lista importada de `@/hooks/api`.

- [ ] **Step 4: Ajustar o sub-form de cliente**

Em `defaultValues` do `useForm<ClientFormData>`, trocar `storeId: storeId,` por `storeId: initialStoreId,`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/forms/OrderForm.tsx
git commit -m "refactor(os): storeId do formulário passa a ser observado via watch"
```

---

### Task 2: Bloco "Loja" com select e limpeza ao trocar

**Files:**
- Modify: `src/components/forms/OrderForm.tsx:199-210` (bloco Loja)

- [ ] **Step 1: Substituir o bloco Loja**

Substituir:
```tsx
        {/* Loja (somente leitura) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Loja</label>
          <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-900">{storeName || 'Nenhuma loja vinculada'}</span>
          </div>
          <input type="hidden" value={storeId} {...register('storeId')} />
          {errors.storeId?.message && (
            <p className="mt-1.5 text-xs text-red-600">{errors.storeId.message}</p>
          )}
        </div>
```
por:
```tsx
        {/* Loja: somente leitura (editando ou usuário com loja) ou select */}
        {isStoreReadOnly ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Loja</label>
            <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg">
              <Store className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-900">{storeName || 'Nenhuma loja vinculada'}</span>
            </div>
            <input type="hidden" value={initialStoreId} {...register('storeId')} />
            {errors.storeId?.message && (
              <p className="mt-1.5 text-xs text-red-600">{errors.storeId.message}</p>
            )}
          </div>
        ) : (
          <Select
            label="Loja"
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Selecione a loja"
            error={errors.storeId?.message}
            {...register('storeId', {
              onChange: () => {
                // Clientes e serviços pertencem à loja anterior
                setValue('clientId', '')
                replace([emptyServiceItem])
                setShowNewService(null)
              },
            })}
          />
        )}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/OrderForm.tsx
git commit -m "feat(os): usuários sem loja vinculada escolhem a loja ao criar OS"
```

---

### Task 3: Atalho de cliente e aviso de lista vazia

**Files:**
- Modify: `src/components/forms/OrderForm.tsx` (handler de abertura, bloco Cliente, modal)

- [ ] **Step 1: Criar `openNewClientModal`**

Logo antes de `const handleCreateClient`, adicionar:
```tsx
  const openNewClientModal = () => {
    // O sub-form captura storeId só na montagem; injeta a loja atual ao abrir.
    resetClientForm({ name: '', phone: '', email: '', document: '', storeId })
    setNewClientError(null)
    setShowNewClientModal(true)
  }
```

- [ ] **Step 2: Substituir o bloco Cliente**

Substituir:
```tsx
        {/* Cliente */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Cliente"
                options={clients.map((c) => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                placeholder="Selecione o cliente"
                error={errors.clientId?.message}
                disabled={!storeId || !!order}
                {...register('clientId')}
              />
            </div>
            {!order && storeId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewClientModal(true)}
                className="h-10 px-3"
                title="Novo Cliente"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
```
por:
```tsx
        {/* Cliente */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Cliente"
                options={clients.map((c) => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                placeholder={storeId ? 'Selecione o cliente' : 'Selecione a loja primeiro'}
                error={errors.clientId?.message}
                disabled={!storeId || !!order}
                {...register('clientId')}
              />
            </div>
            {!order && storeId && (
              <Button
                type="button"
                variant="outline"
                onClick={openNewClientModal}
                className="h-10 px-3"
                title="Novo Cliente"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!order && storeId && clientsLoaded && clients.length === 0 && (
            <p className="mt-1.5 text-xs text-gray-500">
              Nenhum cliente nesta loja.{' '}
              <button
                type="button"
                onClick={openNewClientModal}
                className="font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Cadastrar novo cliente
              </button>
            </p>
          )}
        </div>
```

- [ ] **Step 3: Remover o hidden input do modal**

No modal "Novo Cliente", remover a linha:
```tsx
          <input type="hidden" value={storeId} {...registerClient('storeId')} />
```
(o `storeId` já está no estado do sub-form via `resetClientForm`).

- [ ] **Step 4: Typecheck e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros (warnings pré-existentes são aceitáveis).

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/OrderForm.tsx
git commit -m "feat(os): atalho 'Cadastrar novo cliente' quando a loja não tem clientes"
```

---

### Task 4: Verificação manual no browser

Dev server em `http://localhost:3001`, Postgres em `localhost:5434`.

- [ ] **Step 1: Admin sem loja** — logar como `admin@servicoagora.com`; Ordens de Serviço > Nova OS. Esperado: Loja é um select com placeholder "Selecione a loja"; Cliente desabilitado com "Selecione a loja primeiro"; botão "+" oculto.
- [ ] **Step 2: Escolher a loja.** Esperado: Cliente habilita; botão "+" aparece; aviso "Nenhum cliente nesta loja. Cadastrar novo cliente" aparece.
- [ ] **Step 3: Clicar em "Cadastrar novo cliente".** Preencher nome e telefone; "Criar Cliente". Esperado: modal fecha, cliente selecionado, aviso some.
- [ ] **Step 4: Escolher um serviço e "Criar Ordem de Serviço".** Esperado: OS criada, aparece na lista.
- [ ] **Step 5: Regressão** — logar como `leandro.sdonascimento@gmail.com`; Nova OS. Esperado: Loja só-leitura com o nome da loja, como antes.
- [ ] **Step 6: Registrar evidência** (screenshots) e reportar.

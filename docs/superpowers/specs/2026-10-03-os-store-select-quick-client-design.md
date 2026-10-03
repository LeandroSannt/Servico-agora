# Seleção de loja e atalho de cliente no formulário de OS

**Data:** 2026-10-03
**Arquivo afetado:** `src/components/forms/OrderForm.tsx`

## Problema

O formulário "Nova Ordem de Serviço" usa apenas a loja vinculada ao usuário logado. Usuários sem loja (SUPER_ADMIN, COMPANY_ADMIN) veem "Nenhuma loja vinculada", o select de Cliente fica desabilitado e o botão "+ Novo Cliente" (que já existe) fica oculto, pois ambos dependem de `storeId`. Na prática esses usuários não conseguem criar OS.

Além disso, quando a loja não tem clientes, nada indica ao usuário que ele pode cadastrar um cliente ali mesmo.

## Objetivo

1. Permitir que usuários sem loja vinculada escolham a loja ao criar uma OS.
2. Tornar o atalho de criação de cliente visível e óbvio quando a lista está vazia.

## Fora de escopo

- Alterar APIs ou schemas Zod (loja e cliente continuam obrigatórios).
- Permitir troca de loja ao editar uma OS existente.
- Refatorar o OrderForm em subcomponentes.

## Design

### Campo Loja

- Condição de só-leitura: `order` existe **ou** `session.user.store` existe. (Hoje o bloco só-leitura é sempre renderizado; a condição é nova.)
- Caso contrário, renderizar `<Select label="Loja" placeholder="Selecione a loja">` com as lojas de `useStores({ limit: 100 })`, registrado em `storeId`. O `placeholder` é obrigatório: sem ele o browser mostraria a primeira loja como selecionada enquanto o valor do form continua vazio. A API `/api/stores` já filtra por empresa conforme o perfil; SUPER_ADMIN vê todas.
- O `<input type="hidden">` atual de `storeId` só é renderizado no modo só-leitura.

### Loja como fonte de verdade

- `storeId` passa a ser lido via `watch('storeId')`, com `defaultValues.storeId = order?.store?.id || userStore?.id || ''`.
- `useClients` e `useServices` recebem esse `storeId` observado.
- Ao mudar `storeId` (apenas no modo com select), limpar o que pertence à loja anterior. Fazer isso no `onChange` do registro, não em `useEffect` sobre o valor observado (dispararia na montagem):
  `register('storeId', { onChange: () => { setValue('clientId', ''); replace([itemVazio]); setShowNewService(null) } })`,
  onde `replace` vem do `useFieldArray` já existente (hoje só `fields, append, remove` são desestruturados) e `itemVazio` é o mesmo objeto usado em `defaultValues.services[0]`.

### Campo Cliente e atalho

- Select desabilitado enquanto `!storeId`, com placeholder "Selecione a loja primeiro"; com loja, placeholder "Selecione o cliente".
- Botão "+" (ícone `UserPlus`) visível quando `!order && storeId` (igual a hoje).
- Novo: quando há `storeId`, `isSuccess` de `useClients` é `true` e `clients.length === 0`, mostrar abaixo do select:
  "Nenhum cliente nesta loja. **Cadastrar novo cliente**" — o trecho em negrito é um `<button type="button">` que abre o mesmo modal.
- O modal "Novo Cliente" continua visualmente igual, mas o `storeId` do sub-formulário precisa ser injetado na abertura. Hoje `defaultValues.storeId` do `useForm` do cliente é capturado uma vez na montagem (vazio para quem não tem loja) e o `<input type="hidden">` não atualiza o estado do react-hook-form, então a validação "Loja é obrigatória" falharia em silêncio.
  Solução: criar um `openNewClientModal()` usado pelo botão "+" e pelo link do aviso, que chama `resetClientForm({ name: '', phone: '', email: '', document: '', storeId })` com o `storeId` observado e então abre o modal. `reset` com valores também atualiza os defaults do sub-form, então os `resetClientForm()` existentes no fechar/cancelar continuam corretos. O `<input type="hidden">` do modal pode ser removido.

### Erros e estados

- Validação Zod inalterada: "Loja é obrigatória" e "Cliente é obrigatório" aparecem nos respectivos campos.
- Enquanto `useStores` carrega, o select de loja mostra lista vazia; sem tratamento extra.
- `useStores` é chamado incondicionalmente, inclusive para usuários com loja vinculada, onde o resultado não é usado. Aceito: é uma requisição leve e evita mexer no hook.

## Verificação

Manual, no browser, logado como `admin@servicoagora.com` (sem loja):

1. Abrir "Nova OS": campo Loja é um select; Cliente desabilitado com "Selecione a loja primeiro"; botão "+" oculto.
2. Escolher a loja: Cliente habilita, botão "+" aparece, aviso "Nenhum cliente nesta loja. Cadastrar novo cliente" aparece (banco tem 0 clientes).
3. Clicar no aviso: modal abre; preencher nome e telefone; salvar.
4. Modal fecha, cliente fica selecionado, aviso some.
5. Escolher um serviço e salvar a OS com sucesso.
6. Logar com `leandro.sdonascimento@gmail.com` (tem loja): campo Loja continua só-leitura como antes.

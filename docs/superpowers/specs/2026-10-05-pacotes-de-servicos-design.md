# Pacotes de serviços pré-pagos

**Data:** 2026-10-05
**Branch:** `feature/pacotes-de-servicos`

## Problema

Hoje cada serviço tem um preço unitário e a OS cobra preço × quantidade. Empresas querem vender pacotes pré-pagos com desconto (ex.: uma limpeza custa R$ 30, mas o pacote de 10 sai por R$ 250). O cliente final paga uma vez e vai consumindo ao longo do tempo. O sistema não tem como registrar essa venda nem controlar quantas unidades restam.

## Objetivo

1. A empresa cadastra pacotes por loja: N unidades de um serviço por um preço fechado.
2. A empresa vende um pacote a um cliente; o cliente passa a ter saldo daquele serviço.
3. Ao criar ou editar uma OS, o sistema sugere usar o saldo e, se aceito, as unidades cobertas saem a R$ 0.
4. O saldo é sempre correto, inclusive após editar ou excluir OS, e tem histórico de uso.
5. O dinheiro dos pacotes vendidos aparece no faturamento do dashboard.

## Fora de escopo

- Validade/expiração do saldo.
- Pacotes com mais de um serviço.
- Pacotes recorrentes (assinatura).
- Venda de pacote como item dentro da OS.
- Pacotes por empresa valendo em várias lojas.
- Relatório ou exportação de pacotes.
- Estorno financeiro: cancelar uma venda só remove o saldo, não registra devolução de dinheiro.

## Decisões

- **Saldo por livro-razão, não por contador.** O saldo é `quantidade − soma(consumos)`. Cada uso grava um registro de consumo ligado ao item da OS. Apagar o item (edição ou exclusão da OS) apaga o consumo por cascata e devolve o saldo sem código específico.
- **Item coberto é um item normal com preço 0.** `OrderService` não muda. Se a OS tem 3 limpezas e o saldo é 2, o servidor grava dois itens: "Limpeza" × 2 a R$ 0 (com consumo) e "Limpeza" × 1 a R$ 30. Total, PDF e WhatsApp continuam funcionando sem alteração estrutural.
- **Venda copia os dados do pacote.** Nome, serviço, quantidade e preço são copiados para a venda, como a OS já copia nome e preço do serviço. Alterar o pacote depois não muda vendas passadas.
- **Venda registrada como paga na hora**, em tela própria no cadastro de clientes.

## Modelo de dados (Prisma)

Nomes de tabela seguem o padrão snake_case com `@@map`, campos com `@map`.

### `ServicePackage` → `service_packages`

| Campo | Tipo | Observação |
|---|---|---|
| id | String cuid | |
| name | String | Sugerido como "10× Limpeza", editável |
| description | String? | |
| quantity | Int | ≥ 2 |
| price | Decimal(10,2) | > 0 |
| isActive | Boolean, default true | |
| storeId | FK Store, cascade | |
| serviceId | FK Service, `onDelete: NoAction` | Serviço da mesma loja. `NoAction` (não `Restrict`) para a exclusão em cascata de loja/empresa continuar funcionando; a proteção contra apagar o serviço diretamente é a mesma |
| createdAt / updatedAt | | |

Relações inversas: `Store.servicePackages`, `Service.packages`.

### `ClientPackage` → `client_packages`

| Campo | Tipo | Observação |
|---|---|---|
| id | String cuid | |
| clientId | FK Client, cascade | |
| packageId | FK ServicePackage, `onDelete: NoAction` | Origem |
| serviceId | FK Service, `onDelete: NoAction` | Copiado da origem; usado para casar com itens da OS |
| name | String | Copiado |
| quantity | Int | Copiado |
| price | Decimal(10,2) | Copiado; valor pago |
| status | enum `ClientPackageStatus` { ACTIVE, CANCELLED } | |
| notes | String? | Ex.: forma de pagamento |
| soldById | FK User | Quem vendeu |
| soldAt | DateTime, default now | Data da venda (usada no faturamento) |
| cancelledAt | DateTime? | |
| createdAt / updatedAt | | |

Relações inversas: `Client.packages`, `ServicePackage.sales`, `User.soldPackages` (relação nomeada `PackageSeller`).

### `PackageUsage` → `package_usages`

| Campo | Tipo | Observação |
|---|---|---|
| id | String cuid | |
| clientPackageId | FK ClientPackage, cascade | |
| orderId | FK ServiceOrder, cascade | |
| orderServiceId | FK OrderService, cascade, `@unique` | Um item da OS tem no máximo um consumo |
| quantity | Int | ≥ 1 |
| createdAt | | |

Relações inversas: `ClientPackage.usages`, `ServiceOrder.packageUsages`, `OrderService.packageUsage?`.

Índices: `client_packages(client_id, service_id, status)`, `package_usages(client_package_id)`.

### Saldo

`saldo(clientPackage) = quantity − sum(usages.quantity)`. Saldo do cliente para um serviço = soma dos saldos dos `ClientPackage` ACTIVE daquele cliente e serviço. Função única em `src/lib/packages/balance.ts`, usada por API e pela transação da OS.

### Migração

Só tabelas e enum novos; nenhuma coluna existente muda. Em produção o entrypoint roda `prisma db push`, que cria as tabelas. Localmente, `npm run db:push`.

## API

Permissões seguem o padrão de `/api/services`: SUPER_ADMIN vê tudo; COMPANY_ADMIN só lojas da sua empresa; MANAGER e EMPLOYEE só a própria loja. Escrita em pacotes (criar, editar, desativar) exige SUPER_ADMIN, COMPANY_ADMIN ou MANAGER. Vender e cancelar venda: os mesmos perfis. Usar saldo na OS: qualquer perfil que já pode criar OS.

### `GET /api/packages?storeId=&isActive=&sellable=`

Lista pacotes com `service { id, name, price, isActive }` e `_count.sales`. `sellable=true` devolve só pacotes ativos cujo serviço também está ativo (usado pelo modal de venda); sem o parâmetro, a página de pacotes vê todos, inclusive os de serviço inativo. Resposta inclui `unitPrice = price / quantity` e `savingsPercent = 1 − unitPrice / service.price` calculados no servidor (arredondados a 2 casas e inteiro, respectivamente).

### `POST /api/packages`

Body validado por `servicePackageSchema` (`src/lib/validations/package.ts`): `storeId`, `serviceId`, `name` (1..100), `description?`, `quantity` (int ≥ 2), `price` (> 0). Regras: serviço deve existir, estar ativo e pertencer a `storeId`; senão 400 "Serviço inválido para esta loja".

### `GET/PUT/DELETE /api/packages/[id]`

- PUT: mesmos campos exceto `storeId` e `serviceId` (imutáveis; 400 se enviados diferentes).
- DELETE: se `_count.sales === 0` apaga; senão desativa (`isActive=false`) e responde `{ message: 'Pacote já vendido; foi desativado' }`. Mesmo comportamento de soft delete do serviço.

### `GET /api/clients/[id]/packages`

Resposta:

```ts
{
  balances: Array<{ serviceId: string; serviceName: string; remaining: number }>,
  packages: Array<{
    id, name, serviceId, serviceName, quantity, used, remaining, price,
    status, soldAt, soldBy: { name }, notes,
    usages: Array<{ quantity, createdAt, order: { id, orderNumber, status } }>
  }>
}
```

`balances` só inclui serviços com `remaining > 0`. Ordenado por `soldAt desc`.

### `POST /api/clients/[id]/packages`

Body `sellPackageSchema`: `packageId`, `notes?`. Regras: cliente existe e o usuário tem acesso à loja dele; pacote existe, ativo (400 "Pacote inativo"), serviço do pacote ativo (400 "Serviço do pacote está inativo"), e `package.storeId === client.storeId` (senão 400 "Pacote não pertence à loja do cliente"). Cria `ClientPackage` copiando os dados, `soldById = user.id`. Responde 201 com o pacote no formato acima.

### `DELETE /api/clients/[id]/packages/[clientPackageId]`

Cancela. Regras: pertence ao cliente; `status === 'ACTIVE'`; `usages.length === 0`, senão 400 "Pacote já utilizado; não pode ser cancelado". Define `status = CANCELLED`, `cancelledAt = now`.

### `POST /api/orders` e `PUT /api/orders/[id]`

`orderServiceSchema` ganha `usePackageQuantity: z.coerce.number().int().min(0).optional()` — quantas unidades deste item devem sair do saldo. O cliente nunca envia preço 0 por conta própria; se enviar `usePackageQuantity > 0`, o servidor:

0. Antes da transação, validações baratas: item com `usePackageQuantity > 0` exige `serviceId` (400 "Só serviços cadastrados podem usar pacote") e `usePackageQuantity ≤ quantity` (400 "Quantidade do pacote maior que a do item").
1. Dentro da transação (PUT já usa `prisma.$transaction`; POST passa a usar). **No PUT, o `deleteMany` dos `orderService` antigos roda primeiro**, o que apaga os `PackageUsage` da própria OS por cascata; assim a leitura de saldo a seguir já não conta o consumo da OS em edição, sem regra especial no servidor. Para cada item com `usePackageQuantity > 0`:
   - Trava os `ClientPackage` ACTIVE do cliente para aquele `serviceId` com `$queryRaw` (`SELECT id FROM client_packages WHERE client_id = $1 AND service_id = $2 AND status = 'ACTIVE' FOR UPDATE`; Prisma não expõe `FOR UPDATE`), depois lê pacotes e consumos e calcula o saldo, ordenando por `soldAt asc`. O bloqueio serializa só salvamentos concorrentes do mesmo cliente e serviço, que é o caso que importa; OS de outros serviços ou uma venda simultânea não são bloqueadas e não precisam ser.
   - Se `usePackageQuantity > saldo` lança `InsufficientBalanceError { serviceId, remaining }` (classe em `src/lib/packages/errors.ts`). A rota captura fora da transação e responde 409 `{ error: 'Saldo do pacote insuficiente', serviceId, remaining }`. Sem isso o erro cairia no `catch` genérico como 500.
   - Grava o item coberto: `quantity = usePackageQuantity`, `price = 0`, `serviceName` e `description` normais, `saveGlobally = false`. Distribui o consumo pelos pacotes mais antigos primeiro (FIFO), criando um `PackageUsage` por pacote tocado. Como `orderServiceId` é único, se o consumo precisar tocar dois pacotes, grava um item coberto por pacote (ex.: 2 do pacote A e 1 do pacote B viram dois itens a R$ 0).
   - Se `quantity − usePackageQuantity > 0`, grava o item cobrado com o restante ao `price` enviado.
2. `totalAmount` soma só os itens cobrados (os cobertos têm preço 0, então a soma atual já está correta).
3. Resposta de criação/edição inclui os itens com `packageUsage`.

`GET /api/orders` (lista) e `GET /api/orders/[id]` passam a incluir `services.packageUsage { quantity, clientPackage { id, name } }` com `orderBy: { createdAt: 'asc' }` no include (hoje `services: true` não ordena, e o reagrupamento no formulário depende da ordem). A lista é o que alimenta a tela de OS e o formulário de edição, então o include é obrigatório nas duas rotas. `OrderService.serviceId` já vem no payload.

### `GET /api/dashboard/stats`

Adiciona `packagesRevenue`: `sum(ClientPackage.price)` com `status = ACTIVE` no mesmo filtro de período e escopo de loja/empresa (via `client.storeId`). `totalRevenue` passa a somar `packagesRevenue`. Resposta ganha o campo e o card de faturamento mostra a linha "Pacotes".

`GET /api/dashboard/charts` — "Top serviços" já conta `OrderService.quantity` por serviço; itens cobertos entram naturalmente. Sem mudança.

## Front-end

### Menu

Sidebar ganha "Pacotes" (`/packages`, ícone `Package` do lucide) logo abaixo de "Serviços", visível para os perfis que veem Serviços.

### Página `/packages`

Mesma estrutura de `/services` (lista, filtro de loja para quem tem mais de uma, busca, modal de formulário). Colunas: Nome, Serviço, Qtd, Preço do pacote, Preço/un, Economia, Vendas, Status, Ações. Economia em verde ("17%"), ou "—" se o pacote for mais caro que o avulso (permitido, mas sem destaque).

`PackageForm` (`src/components/forms/PackageForm.tsx`): Loja (mesmo comportamento do `ServiceForm`), Serviço (select dos serviços ativos da loja; desabilitado até escolher loja), Quantidade, Preço, Nome, Descrição. Ao mudar serviço ou quantidade, se o usuário não editou o nome manualmente, preenche "{quantidade}× {serviço}". Abaixo do preço mostra "R$ 25,00 por unidade · economia de 17% em relação ao avulso (R$ 30,00)" em tempo real. Na edição, Loja e Serviço ficam só-leitura.

Hooks em `src/hooks/api/usePackages.ts` seguindo o padrão dos existentes (React Query, invalidação por chave).

### Clientes

- Coluna nova na lista: "Saldo", mostrando até dois serviços ("7 Limpeza, 2 Lavagem") e "+N" se houver mais; vazio se não há saldo. Dados vêm de um campo `balances: Array<{ serviceId, serviceName, remaining }>` em cada cliente de `GET /api/clients`, com o mesmo formato e regra do endpoint de pacotes do cliente (só ACTIVE, só `remaining > 0`), agregado no servidor com uma consulta por página (evita N requisições).
- Ações por cliente: "Vender pacote" (ícone `Package`) e "Pacotes" (ícone `History`), visíveis para quem pode vender.
- Modal **Vender pacote**: select de pacotes ativos da loja do cliente mostrando "10× Limpeza — R$ 250,00"; abaixo, resumo "10 unidades de Limpeza por R$ 250,00 (R$ 25,00/un)"; campo Observação; botão "Registrar venda". Sucesso fecha o modal, invalida clientes e mostra toast "Pacote vendido". Se a loja não tem pacotes ativos: estado vazio com link para `/packages`.
- Modal **Pacotes do cliente**: lista de `packages` com nome, barra "7 de 10 restantes", preço, data, vendedor, observação, status. Expandir mostra os consumos (data, quantidade, nº da OS com link para `/orders?search=...`). Botão "Cancelar venda" só quando `used === 0 && status === 'ACTIVE'`, com confirmação. Cancelado aparece riscado com badge "Cancelado".

### OrderForm (Nova OS e edição)

**Pré-requisito na edição.** Hoje o formulário mapeia os itens de uma OS existente com `serviceId: ''` e o tipo da prop `order.services` nem tem `serviceId`. Isso precisa mudar: o tipo ganha `serviceId: string | null` e `packageUsage?: { quantity, clientPackage: { id, name } } | null`, e o mapeamento preserva `serviceId: s.serviceId ?? ''`. Sem isso, editar uma OS que usou pacote falharia com 400 ou, pior, salvaria cobrando tudo e perderia o consumo (o PUT apaga e recria os itens).

- Ao ter `clientId`, carrega `GET /api/clients/[id]/packages` e guarda `balances` por `serviceId`. Na edição, soma ao saldo as unidades consumidas pela própria OS (`usages` cujo `order.id` é a OS em edição), espelhando o efeito do `deleteMany` no servidor.
- Cada item ganha o campo `usePackageQuantity` (default 0). Ao escolher um serviço com saldo > 0, define `usePackageQuantity = min(quantity, saldoDisponível)` e mostra sob o item:
  - checkbox marcado **"Usar pacote"** + texto "Cliente tem 7 no pacote";
  - se `quantity > saldo`: "2 pelo pacote · 1 cobrado a R$ 30,00".
- `saldoDisponível` de um serviço desconta o que outros itens do mesmo formulário já estão usando, para o total do formulário nunca prometer mais que o saldo.
- Desmarcar zera `usePackageQuantity`. Mudar `quantity` recalcula respeitando o teto.
- Subtotal do item = `price × (quantity − usePackageQuantity)`; `calculateTotal` acompanha. O front não altera `price`.
- Itens vindos do servidor com `packageUsage` aparecem agrupados de volta num único item de formulário: itens consecutivos com o mesmo `serviceId` em que pelo menos um tem `packageUsage` viram um item com `quantity` total e `usePackageQuantity` = soma dos cobertos, para o operador ver "3 limpezas, 2 pelo pacote" e não dois itens separados. Ao salvar, o servidor divide de novo.
- **Preço unitário do item reagrupado**: vem do item cobrado irmão, se houver; senão (OS totalmente coberta, ex.: 2 de 2), vem do `price` atual do serviço no catálogo (`useServices` da loja já está carregado no formulário); se o serviço não estiver na lista (inativo), fica 0 e o campo de preço continua editável como hoje. Isso garante que, se o operador aumentar a quantidade ou desmarcar "Usar pacote", as unidades descobertas sejam cobradas.
- Erro 409 do servidor: toast "Saldo do pacote mudou: restam {remaining}. Ajuste o item." e recarrega `balances`.

### Lista e detalhe de OS, PDF e WhatsApp

Itens com `packageUsage` exibem o nome com sufixo " (pacote)" e preço R$ 0,00. O PDF e as mensagens já recebem `services[]` mapeados nas rotas; o mapeamento adiciona o sufixo ao `serviceName` quando houver `packageUsage`. Nenhuma mudança em `generate-order-pdf.ts`.

## Regras de negócio (resumo)

- Pacote: serviço ativo da mesma loja; quantidade ≥ 2; preço > 0. Loja e serviço imutáveis após criar.
- Desativar pacote impede novas vendas; saldos vendidos continuam válidos.
- Excluir pacote só sem vendas; com vendas, desativa.
- Desativar serviço (DELETE atual) continua permitido. Pacotes dele deixam de ser vendáveis (`sellable=true` os exclui e o POST de venda recusa) e a página de pacotes mostra badge "Serviço inativo". Saldos já vendidos continuam utilizáveis em OS.
- Venda: cliente e pacote da mesma loja; valor = preço do pacote no momento; registrada como paga em `soldAt`.
- Cancelar venda: só ACTIVE e sem consumo.
- Consumo: FIFO por `soldAt`; nunca excede o saldo; validado com lock na transação; consumos da própria OS em edição contam como disponíveis.
- Saldo nunca é armazenado; sempre calculado.

## Erros

| Situação | Resposta |
|---|---|
| Serviço de outra loja ou inativo ao criar pacote | 400 "Serviço inválido para esta loja" |
| Pacote de outra loja na venda | 400 "Pacote não pertence à loja do cliente" |
| Pacote inativo na venda | 400 "Pacote inativo" |
| Serviço do pacote inativo na venda | 400 "Serviço do pacote está inativo" |
| Cancelar venda com consumo | 400 "Pacote já utilizado; não pode ser cancelado" |
| Saldo insuficiente ao salvar OS | 409 `{ error, serviceId, remaining }` |
| `usePackageQuantity` sem `serviceId` | 400 "Só serviços cadastrados podem usar pacote" |
| `usePackageQuantity > quantity` | 400 "Quantidade do pacote maior que a do item" |
| Sem permissão na loja | 403 "Acesso negado" (padrão atual) |

## Testes

O projeto não tem testes automatizados. Esta entrega adiciona **Vitest** (`npm test`) com testes unitários da lógica de negócio, isolados do banco por meio de funções puras em `src/lib/packages/`:

- `balance.ts`: `computeBalance(packages, usages)` e `availableForOrder(..., editingOrderId)`. A segunda é usada só pelo OrderForm (no servidor o `deleteMany` já resolve); continua pura e testada.
- `split.ts`: `splitOrderItem(item, available)` → itens coberto(s)/cobrado, incluindo o caso de dois pacotes (FIFO) e `usePackageQuantity = 0`.
- `allocate.ts`: `allocateFifo(packages, qty)` → distribuição por pacote; erro quando excede.

Casos obrigatórios: saldo zero; saldo parcial (3 pedidos, 2 de saldo); consumo que atravessa dois pacotes; edição que mantém o consumo da própria OS; cancelamento bloqueado com consumo; pacote mais caro que o avulso (economia negativa não quebra).

A transação da OS, as rotas e as telas são verificadas manualmente no navegador (`npm run dev`), com roteiro no plano de implementação: cadastrar pacote, vender, criar OS com 3 unidades e saldo 2, conferir itens divididos e saldo 0, editar OS para 1 unidade e conferir saldo 1, excluir OS e conferir saldo 2, tentar cancelar venda com consumo, dashboard mostrando "Pacotes".

## Arquivos previstos

- `prisma/schema.prisma` (3 modelos, 1 enum, relações inversas)
- `src/lib/validations/package.ts`, ajuste em `order.ts`
- `src/lib/packages/{balance,split,allocate,errors}.ts` + testes em `src/lib/packages/__tests__/`
- `src/app/api/packages/route.ts`, `src/app/api/packages/[id]/route.ts`
- `src/app/api/clients/[id]/packages/route.ts`, `.../[clientPackageId]/route.ts`
- `src/app/api/clients/route.ts` (campo `balances`), `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/dashboard/stats/route.ts`
- `src/hooks/api/usePackages.ts`, `useClientPackages.ts`
- `src/app/(authenticated)/packages/page.tsx`, `src/components/forms/PackageForm.tsx`
- `src/app/(authenticated)/clients/page.tsx` (coluna, dois modais), `src/components/forms/OrderForm.tsx`, `src/app/(authenticated)/orders/page.tsx` (sufixo "(pacote)"), `src/components/layout/Sidebar.tsx`, dashboard (card de faturamento)
- `package.json` (vitest, script `test`), `vitest.config.ts`, `.github/workflows/deploy.yml` (job `check` roda `npm test`)

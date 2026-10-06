# Equipamentos do cliente e produtos avulsos na OS

**Data:** 2026-10-06
**Branch:** `feature/equipamentos-produtos` (a partir de `origin/main`)

## Problema

1. O cliente pode ter vários equipamentos (ex.: "Split sala", "Bicicleta Caloi"). Hoje não há onde cadastrá-los, e a OS não diz em qual equipamento cada serviço foi feito.
2. Na OS também se vendem itens avulsos (ex.: "Corrente de bicicleta"), sem catálogo, cujo valor deve somar no total da OS.

## Decisões (aprovadas)

- **Equipamento:** nome (obrigatório), marca, modelo, nº de série e observações. Pertence a um cliente.
- **Cadastro só na tela de clientes**: a ação "Equipamentos" abre um modal com a lista e as opções de criar, editar e remover.
- **Vínculo por linha de serviço da OS**: cada serviço pode ter 0, 1 ou vários equipamentos do cliente. É opcional.
- **Remoção:** se o equipamento nunca foi usado em OS, é apagado de vez. Se já foi usado, é **arquivado** (`isActive=false`): some da seleção em novas OSs e continua aparecendo nas OSs antigas.
- **Produto avulso:** nome, quantidade e preço unitário, digitados na hora, sem catálogo. Total da OS = serviços cobrados + Σ(quantidade × preço) dos produtos.
- **OS só com produtos é permitida:** a OS precisa ter pelo menos 1 serviço **ou** 1 produto.
- **Exibição:** formulário da OS, listagem (coluna "Equipamentos"), modal de detalhe e PDF. **O texto** das mensagens de WhatsApp/e-mail fica de fora: `{{services}}` continua listando só serviços, e `{{totalAmount}}` passa a incluir os produtos, porque é o total da OS. Numa OS só com produtos, `services`/`servicesMultiline` usam o fallback "—", já que a Meta rejeita parâmetro de template vazio.
- **O PDF** só é gerado hoje no fluxo de WhatsApp ao marcar a OS como PAGA (`src/lib/whatsapp/index.ts:222`, a partir dos dados montados no PATCH de status). Para mostrar equipamentos e produtos no PDF, esses dados passam por `OrderPaidMessageData` → `OrderPdfData`. O texto da mensagem não muda.
- **Permissões de equipamento:** iguais às de editar o cliente. Qualquer papel com acesso à loja do cliente (EMPLOYEE inclusive) lista, cria, edita e remove.
- **Dashboard:** a receita (que soma `totalAmount`) passa a incluir os produtos, e isso é esperado. O "Top serviços" não muda.
- **Cliente da OS não muda na edição** (o select já fica desabilitado e o PUT ignora `clientId`). Os equipamentos são sempre validados contra `existingOrder.clientId`, nunca contra o `clientId` do corpo da requisição.

## Fora de escopo

- Catálogo/estoque de produtos e autocomplete de nomes já usados.
- Vincular produto a equipamento.
- Histórico/filtro de OSs por equipamento.
- Produtos/equipamentos no texto das mensagens de WhatsApp/e-mail; gráficos específicos de produtos.

## Modelo de dados

Todas as mudanças são aditivas, seguras para o `prisma db push` do deploy.

```prisma
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

model OrderServiceEquipment {
  orderServiceId String       @map("order_service_id")
  orderService   OrderService @relation(fields: [orderServiceId], references: [id], onDelete: Cascade)
  equipmentId    String       @map("equipment_id")
  equipment      Equipment    @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@id([orderServiceId, equipmentId])
  @@index([equipmentId])
  @@map("order_service_equipments")
}

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

Relações inversas: `Client.equipments`, `OrderService.equipments`, `ServiceOrder.products`.

Todas as FKs novas usam `Cascade`, seguindo a regra do projeto (`schema.prisma:375-377`): nada de Restrict/NoAction em cadeias de cascata de loja/empresa. A proteção do histórico fica na API. O DELETE do equipamento arquiva em vez de apagar quando há vínculo, então o cascade da ligação só dispara quando a loja/empresa inteira é apagada.

## Divisão de pacotes e reagrupamento

O servidor grava cada linha do formulário como [linhas cobertas…, no máximo uma linha cobrada] (`createOrderItemsWithPackages`). Regras:

- **Gravação:** todos os `OrderService` gerados a partir de uma linha do formulário recebem **o mesmo** conjunto `equipmentIds`.
- **Reagrupamento** (`regroupOrderItems`): o grupo leva os `equipmentIds` do primeiro registro. Os registros absorvidos têm o mesmo conjunto por construção.
- **Caso-limite:** duas linhas consecutivas do mesmo serviço, a primeira coberta e a segunda cobrada, com equipamentos diferentes. O reagrupamento já as funde hoje, e isso é um comportamento conhecido. Para não perder o vínculo, o reagrupamento **só absorve** um registro seguinte se o conjunto de equipamentos for igual (comparação de conjuntos ordenados). Caso contrário, abre um grupo novo.

## Lógica pura (testada com Vitest)

- `src/lib/validations/order.ts`
  - `orderServiceSchema` ganha `equipmentIds: z.array(z.string().min(1)).optional()` (sem duplicados: normalizar com `Array.from(new Set(...))`).
  - Novo `orderProductSchema`: `name` (min 1, "Nome do produto é obrigatório"), `quantity` (inteiro ≥ 1), `unitPrice` (≥ 0).
  - `serviceOrderSchema`: `services` passa a aceitar array vazio; `products: z.array(orderProductSchema).default([])`; `.refine` exige `services.length + products.length ≥ 1` com a mensagem "Adicione pelo menos um serviço ou produto" e `path: ['services']`, para o erro aparecer onde o form já mostra `errors.services?.message`.
- `src/lib/validations/equipment.ts`: `equipmentSchema` com `name` obrigatório e os demais campos opcionais (strings vazias viram `null`).
- `computeOrderTotal(items, products = [])`: soma os serviços como hoje + Σ `quantity × unitPrice` dos produtos.
- `src/lib/equipments/validate-order-equipments.ts`: `invalidEquipmentIds(requested, allowed)` (pura) devolve os ids que não pertencem ao cliente ou que estão arquivados sem já estarem vinculados à OS.
- `src/lib/equipments/format.ts`: `orderEquipmentNames(services)` devolve os nomes distintos em ordem de primeira aparição, e `summarizeNames(names, max = 2)` devolve "A, B +1".

## API

**Equipamentos** (mesmo controle de acesso por loja de `clients/[id]/packages`):

- `GET /api/clients/[id]/equipments?includeArchived=1`: por padrão retorna só os ativos, ordenados por nome.
- `POST /api/clients/[id]/equipments`: cria e devolve 201.
- `PATCH /api/clients/[id]/equipments/[equipmentId]`: edita os campos, e `isActive: true` permite reativar.
- `DELETE /api/clients/[id]/equipments/[equipmentId]`: se há `OrderServiceEquipment`, faz `isActive=false` e devolve `{ archived: true }`; senão apaga e devolve `{ archived: false }`. Se uma OS vincular o equipamento entre a checagem e o delete, o cascade apagaria o vínculo. Para evitar isso, a checagem e o delete rodam numa transação que trava a linha do equipamento (`SELECT … FOR UPDATE`), e a gravação da OS trava os equipamentos que referencia (`FOR SHARE`) ao validá-los. Equipamento de outro cliente devolve 404.
- O acesso segue `clients/[id]/route.ts`: o cliente precisa estar numa loja acessível ao usuário (SUPER_ADMIN tudo; COMPANY_ADMIN a própria empresa; MANAGER/EMPLOYEE a própria loja).

**OS** (`POST /api/orders`, `PUT /api/orders/[id]`):

- Dentro da transação: carrega os equipamentos do cliente da OS (na criação, `validatedData.clientId`, já validado contra a loja; na edição, `existingOrder.clientId`) e valida com `invalidEquipmentIds`. Se houver inválidos, devolve 400 "Equipamento inválido para este cliente". Na edição, os ids `allowed` incluem os arquivados que já estavam vinculados à OS. Esses vínculos precisam ser lidos **antes** do `tx.orderService.deleteMany` em `orders/[id]/route.ts`, porque a cascata apaga os `OrderServiceEquipment`.
- `createOrderItemsWithPackages` recebe `equipmentIds` por item e cria `equipments: { create: ids.map(...) }` em cada `OrderService` gerado.
- Os produtos são gravados com `createMany`. Na edição, segue a mesma estratégia já usada para os serviços: apaga e recria.
- `totalAmount = computeOrderTotal(services, products)`.
- `orderServicesInclude` inclui `equipments: { select: { equipment: { select: { id, name, brand, model, isActive } } } }`, e as respostas de OS incluem `products` ordenados por `createdAt, id`.
- Listagem (`GET /api/orders`): cada OS traz `services[].equipments` e `products`. O payload continua pequeno porque só vai o nome e o id.

## Telas

- **Clientes** (`clients/page.tsx`): nova ação "Equipamentos" (ícone `Wrench`), no menu e no card mobile, que abre o `ClientEquipmentsModal` (`src/components/equipments/`). O modal tem a lista com nome, marca/modelo e nº de série, um formulário inline para adicionar/editar e um botão de remover que avisa quando o equipamento foi arquivado. Tem também a opção "Mostrar arquivados", com a ação "Reativar". O hook `use-equipments.ts` fica em `src/hooks/api/`, no padrão React Query.
- **OrderForm:**
  - Em cada linha de serviço: um campo "Equipamentos" com checkboxes dos equipamentos ativos do cliente (mais os arquivados já vinculados, marcados como "(arquivado)"). Sem cliente selecionado, fica desabilitado. Se o cliente não tem equipamentos, mostra "Nenhum equipamento cadastrado para este cliente".
  - Trocar o cliente zera os `equipmentIds` de todas as linhas.
  - Nova seção "Produtos" abaixo dos serviços: linhas com nome, quantidade e preço unitário, mais "Adicionar produto" e o botão de remover. O resumo mostra os subtotais de serviços e de produtos e o total geral.
  - A lista de serviços pode ficar vazia se houver produto. O botão de remover a última linha de serviço passa a ser permitido. A OS nova continua começando com uma linha de serviço vazia; para fazer uma OS só de produtos, o usuário remove essa linha.
- **Listagem de OS:** nova coluna "Equipamentos" na tabela e uma linha no card mobile, com `summarizeNames(orderEquipmentNames(...))` e "—" quando vazio. O título (`title`) mostra a lista completa.
- **Modal de detalhe:** abaixo de cada serviço, "Equipamentos: Split sala, Split quarto"; um bloco "Produtos" com quantidade × preço = subtotal.
- **PDF** (`generate-order-pdf.ts`): a linha "Equipamentos: …" fica abaixo de cada serviço que tenha equipamentos, e uma tabela "Produtos" fica antes do total. O cabeçalho "SERVIÇOS REALIZADOS" só aparece se houver serviço. Os dados chegam pelo PATCH de status (`orders/[id]/route.ts`, include e mapeamento de `paidData`) → `OrderPaidMessageData` → `OrderPdfData`, e o mesmo vale para a outra chamada de `generateOrderPdf` em `whatsapp/index.ts`.

## Testes

- Schema: OS só com produto é válida; OS vazia é inválida; produto com preço negativo é inválido; `equipmentIds` duplicados são normalizados.
- `computeOrderTotal`: serviços + produtos, com e sem pacote.
- `regroupOrderItems`: preserva `equipmentIds`; não funde registros com conjuntos diferentes.
- `createOrderItemsWithPackages` (unidade com tx mock, se o arquivo de teste já existir nesse formato): cada registro da divisão recebe os mesmos equipamentos.
- `invalidEquipmentIds`: id de outro cliente, arquivado novo, arquivado já vinculado.
- `orderEquipmentNames` / `summarizeNames`.
- `message-data`: OS sem serviços gera `services`/`servicesMultiline` = "—".
- Manual no navegador (dev server na 3001): cadastrar equipamentos, criar OS com pacote + equipamentos + produto, editar, conferir a listagem, o detalhe e o PDF.

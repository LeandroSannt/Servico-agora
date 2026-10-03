# Gráficos no Dashboard

**Data:** 2026-10-03

## Problema

O dashboard mostra apenas contadores e totais de receita. Não há visualização de tendência, de quais serviços vendem mais, de quem são os principais clientes nem de como a base de clientes cresce.

## Objetivo

Adicionar cinco gráficos ao dashboard, respeitando o filtro de período já existente e a visibilidade por perfil (loja ou empresa), sem alterar os cards atuais.

## Fora de escopo

- Exportação de gráficos, drill-down por clique, filtros além do período existente.
- Alterar o contrato (query params/resposta) da API `/api/dashboard/stats` ou os cards atuais. O refactor interno para `getDashboardScope` é permitido.
- Testes automatizados (o projeto não tem runner); verificação é manual.

## Decisões

- **Biblioteca:** `recharts` (v3, peer React 16.8+). Instalar como dependência de produção.
- **Dados:** um único endpoint `GET /api/dashboard/charts?startDate&endDate` devolve todas as séries. A rosca de status **não** usa esse endpoint; reutiliza os contadores de `useDashboardStats`.
- **Agregação:** `findMany` com `select` mínimo e agregação em JavaScript para todas as séries. `groupBy` do Prisma não serve para `price * quantity` (só soma colunas isoladas). Volume esperado é pequeno (assistências técnicas). Se crescer, trocar por SQL com `date_trunc`.
- **Client components:** todos os arquivos em `src/components/dashboard/` começam com `'use client'` (recharts usa hooks e contexto).
- **Dependência:** `npm i recharts@^3`.

## API

### Filtro por perfil

Extrair para `getDashboardScope(user): { orderWhere: Prisma.ServiceOrderWhereInput; clientWhere: Prisma.ClientWhereInput }` em `src/lib/dashboard-scope.ts` e usar nas duas rotas (charts e stats). Regra:

- SUPER_ADMIN → `{}` (tudo).
- COMPANY_ADMIN e MANAGER → `{ store: { companyId: user.companyId } }`, ou `{}` se `companyId` for null.
- EMPLOYEE → `{ storeId: user.storeId }`, ou `{}` se `storeId` for null.

**Observação:** hoje a rota de stats (`src/app/api/dashboard/stats/route.ts:16-30`) deixa MANAGER cair em `{}` e ver todas as empresas, porque `getStoreFilter` devolve vazio para MANAGER e ele não está na lista que aplica o filtro de empresa. A extração corrige isso intencionalmente.

### Filtro por período

Igual à rota de stats, em UTC: `createdAt >= new Date(startDate)` e `createdAt < end`, onde `end = new Date(endDate); end.setUTCDate(end.getUTCDate() + 1)` (a rota de stats usa `setDate`, versão local; aqui é a versão UTC). Aplica-se a OS e OrderService (via `order.createdAt`). **Não** se aplica a "Novos clientes por mês".

### Resposta

```ts
interface DashboardCharts {
  granularity: 'day' | 'month'
  ordersOverTime: { period: string; count: number; revenue: number }[]
  // period: 'YYYY-MM-DD' quando day, 'YYYY-MM' quando month
  topServices: { name: string; quantity: number; total: number }[]        // top 5
  newClientsByMonth: { period: string; count: number }[]                   // 'YYYY-MM', 6 itens
  topClients: {
    id: string; name: string; orders: number; total: number
    topServices: string[]                                                  // até 3 nomes
  }[]                                                                      // top 5
}
```

### Regras de cálculo

- **Fuso:** todas as chaves de bucket e janelas são calculadas em UTC, consistente com `new Date(startDate)` da rota de stats. `period` = `createdAt.toISOString().slice(0, 10)` (day) ou `.slice(0, 7)` (month). "Primeiro dia de N meses atrás" = `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - N, 1))`. Buckets contínuos iteram com `setUTCDate`/`setUTCMonth`.
- **Granularidade:** `day` se `startDate` e `endDate` existem e a diferença é ≤ 31 dias; senão `month`. Com `month` e período informado, os buckets vão do mês de `startDate` ao mês de `endDate` (inclusive). Se apenas uma das datas existir, tratar como "Todo período". Sem período ("Todo período"), `month` cobrindo os últimos 12 meses (inclui o mês atual), e o filtro `createdAt >= primeiro dia de 11 meses atrás` substitui o filtro de período, aplicado às duas consultas (OS e OrderService), de modo que todas as séries dependentes de período cobrem os mesmos 12 meses.
- **ordersOverTime:** buckets contínuos (todos os dias ou meses do intervalo aparecem, com zero quando vazio). `count` = OS criadas no bucket. `revenue` = soma de `totalAmount` das OS do bucket com status `FINISHED` ou `PAID` (mesma definição do card "Faturamento Total"), agrupada por `createdAt` da OS, não por `paidAt`.
- **Consulta de serviços (compartilhada):** `prisma.orderService.findMany({ where: { order: { ...orderWhere, createdAt } }, select: { serviceName: true, price: true, quantity: true, order: { select: { clientId: true } } } })`. Alimenta `topServices` e `topClients[].topServices`.
- **topServices:** agrupar por `serviceName` (case-sensitive, como gravado). `quantity` = soma de `quantity`; `total` = soma de `Number(price) * quantity`. Ordenar por `quantity` desc, depois `total` desc, depois `name` asc; 5 primeiros.
- **newClientsByMonth:** `Client` no escopo com `createdAt >= primeiro dia de 5 meses atrás`, agrupado por mês; 6 buckets contínuos.
- **topClients:** OS no escopo e período agrupadas por `clientId`: `orders` = contagem, `total` = soma de `totalAmount` (todas as OS, não só pagas, pois representa volume de negócio). Ordenar por `orders` desc, depois `total` desc, depois `name` asc; 5 primeiros. Para cada um, `topServices` = 3 `serviceName` com maior soma de `quantity` nas OS desse cliente (empate: soma de `price * quantity` desc, depois `serviceName` asc). Nome vem de `client.name` (incluir `client: { select: { name: true } }` na consulta de OS).
- Decimais do Prisma convertidos com `Number()`.

### Erros

`401` via `requireAuth`; `500` com `{ error: 'Erro ao buscar gráficos' }` e `console.error`, como a rota de stats.

## Front-end

### Hook

`useDashboardCharts({ startDate, endDate })` em `src/hooks/api/use-dashboard.ts`, mesmo padrão de `useDashboardStats` (React Query, axios). Exportar o tipo `DashboardCharts`.

### Componentes (`src/components/dashboard/`)

- `ChartCard.tsx` — card branco com `title`, `subtitle?`, e três estados: `isLoading` (skeleton cinza de altura fixa), `isError` ("Não foi possível carregar"), `isEmpty` ("Sem dados no período"). Recebe `children` para o gráfico. Altura do corpo: 256px.
- `OrdersByStatusChart.tsx` — `PieChart` (rosca, `innerRadius`) com os cinco status. Props: `stats` (objeto de `useDashboardStats`). Cores: RECEIVED `#6b7280`, IN_PROGRESS `#3b82f6`, PAUSED `#f59e0b`, FINISHED `#22c55e`, PAID `#059669` (mesmas famílias dos cards). Legenda com rótulos em português. Vazio quando a soma é 0.
- `OrdersOverTimeChart.tsx` — `ComposedChart`: barras `count` (eixo esquerdo) + linha `revenue` (eixo direito, formatado em BRL). Eixo X formata `period`: `dd/MM` para day, `MMM/yy` para month. Props: `data`, `granularity`.
- `TopServicesChart.tsx` — `BarChart` horizontal (`layout="vertical"`), barra = `quantity`, tooltip mostra quantidade e `total` em BRL. Props: `data`.
- `NewClientsChart.tsx` — `BarChart` vertical com `count` por mês. Props: `data`.
- `TopClientsChart.tsx` — `BarChart` horizontal, barra = `total` em BRL, tooltip mostra `orders` e lista `topServices`. Props: `data`.
- `index.ts` reexporta.
- Todos os gráficos ficam dentro de `ResponsiveContainer width="100%" height="100%"`.
- Regra de `isEmpty`: `OrdersByStatusChart` → soma dos cinco contadores = 0; `OrdersOverTimeChart` e `NewClientsChart` → todos os buckets com `count === 0`; `TopServicesChart` e `TopClientsChart` → `data.length === 0`.
- Barras horizontais: `<BarChart layout="vertical">` com `<XAxis type="number" />` e `<YAxis type="category" dataKey="name" width={120} />`.
- Eixo duplo: `<YAxis yAxisId="left" />`, `<YAxis yAxisId="right" orientation="right" tickFormatter={BRL} />`, `<Bar yAxisId="left" dataKey="count" />`, `<Line yAxisId="right" dataKey="revenue" />`.
- Antes de escrever os componentes, carregar a skill `dataviz` e seguir sua orientação de cores, marcas e tooltip; a paleta de status acima é fixa por consistência com os cards, as demais séries usam a paleta da skill.

### Dashboard (`src/app/(authenticated)/page.tsx`)

- Chamar `useDashboardCharts` com os mesmos `dateFilters`.
- **Não** incluir `chartsLoading` no `isLoading` global; os cards e a lista de ordens aparecem imediatamente e cada `ChartCard` mostra seu skeleton.
- Nova seção após os cards de receita e antes de "Ações Rápidas":
  - `<h2>` "Gráficos" no mesmo estilo dos outros títulos de seção.
  - Grade `grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6` com, nesta ordem: OS por status, OS ao longo do tempo, Serviços mais vendidos, Top clientes, Novos clientes por mês.
  - Subtítulo do card de novos clientes: "Últimos 6 meses, independente do filtro".

## Verificação manual

Logado como `admin@servicoagora.com` em `http://localhost:3001`:

1. Dashboard carrega; cards aparecem antes dos gráficos; os cinco cards de gráfico aparecem na seção "Gráficos".
2. Rosca bate com os contadores dos cards (1 OS Recebida hoje → fatia única "Recebido").
3. "Hoje": OS ao longo do tempo com 1 bucket (granularidade dia) e 1 OS. "Todo período": 12 meses, OS no mês atual.
4. Serviços mais vendidos: "teste" com quantidade 1 e R$ 50,00.
5. Top clientes: "Cliente Teste OS 2" com 1 OS, R$ 50,00 e "teste" no tooltip.
6. Novos clientes por mês: 6 barras, mês atual com 2.
7. Período "Mês passado": gráficos dependentes de período mostram "Sem dados no período"; novos clientes continua igual.
8. Largura de celular (375px): cards empilham em 1 coluna, sem scroll horizontal.
9. `npx tsc --noEmit` e `npm run lint` sem erros.

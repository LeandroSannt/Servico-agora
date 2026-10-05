# Upload da logo da empresa

**Data:** 2026-10-05
**Branch:** `feature/logo-upload` (empilhado sobre `feature/pacotes-de-servicos`, que traz o Vitest)

## Problema

A logo da empresa hoje é só uma URL externa (`Company.logoUrl`). O administrador precisa hospedar a imagem em outro lugar. Queremos enviar o arquivo pelo sistema e guardá-lo no banco em base64.

## Decisões (aprovadas)

- **Só upload.** O campo "URL do Logo" sai do formulário. Logos antigas por URL continuam aparecendo até alguém enviar uma imagem ou remover a logo.
- **PNG, JPG ou WebP, redimensionada no navegador** para no máximo 512 px no maior lado e convertida para WebP (fallback PNG se o navegador não gerar WebP). SVG não é aceito.
- **A imagem não vai na sessão.** O JWT da sessão fica em cookie (limite de ~4 KB). A sessão guarda só um endereço curto de uma rota que serve a imagem.

## Fora de escopo

- Atualizar a logo na barra lateral de quem já está logado sem novo login (a sessão só lê a empresa no login, igual hoje).
- Logo em PDF, e-mail ou WhatsApp.
- Upload de outras imagens.

## Modelo de dados

`Company` ganha três colunas opcionais (aditivas, seguras para o `prisma db push` do deploy):

| Campo | Tipo | Observação |
|---|---|---|
| logoData | String? `@db.Text` `@map("logo_data")` | Imagem em base64, sem o prefixo `data:` |
| logoMimeType | String? `@map("logo_mime_type")` | `image/png`, `image/jpeg` ou `image/webp`; não nulo ⇔ há logo enviada |
| logoUpdatedAt | DateTime? `@map("logo_updated_at")` | Versão para invalidar cache |

`logoUrl` continua no schema (legado).

## Lógica pura (`src/lib/company-logo.ts`, testada com Vitest)

- `MAX_LOGO_BYTES = 300 * 1024`.
- `parseLogoDataUrl(dataUrl: string): { mimeType, base64, bytes }` — aceita só `data:image/(png|jpeg|webp);base64,...`; decodifica; rejeita acima de `MAX_LOGO_BYTES`; **detecta o tipo pelos bytes iniciais** (PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, WebP `RIFF????WEBP`) e exige que bata com o declarado; lança `InvalidLogoError` (mensagem em português) caso contrário.
- `companyLogoUrl(c: { id, logoMimeType, logoUpdatedAt, logoUrl })`: se há `logoMimeType`, devolve `/api/companies/{id}/logo?v={logoUpdatedAt.getTime()}`; senão `logoUrl` legado; senão `null`.

## API

### `GET /api/companies/[id]/logo` (nova)

- `requireAuth` (qualquer usuário logado; a logo aparece na barra lateral de todos os perfis).
- Lê `logoData` e `logoMimeType`; 404 se não houver.
- Responde os bytes com `Content-Type` = `logoMimeType`, `Cache-Control: private, max-age=31536000, immutable` (a URL muda a cada troca via `?v=`), `X-Content-Type-Options: nosniff`.

### `POST /api/companies` e `PUT /api/companies/[id]`

- `companySchema` perde `logoUrl` e ganha `logo: z.string().nullable().optional()`:
  - `undefined` → não mexe na logo;
  - `null` → remove (zera `logoData`, `logoMimeType`, `logoUpdatedAt` **e** `logoUrl` legado);
  - string → `parseLogoDataUrl`; grava `logoData`, `logoMimeType`, `logoUpdatedAt = now`, e zera `logoUrl` legado.
- `InvalidLogoError` → 400 `{ error: mensagem }`.

### Respostas de empresa

`GET /api/companies`, `GET/PUT/POST /api/companies/[id]` **nunca** devolvem `logoData` (usar `omit: { logoData: true }`) e devolvem `logoUrl` calculado por `companyLogoUrl`. O mesmo vale para `GET /api/orders/[id]` (inclui `store.company.logoUrl`).

### Autorização

`GET`, `PUT` e `DELETE /api/companies/[id]` hoje não verificam perfil; passam a exigir `SUPER_ADMIN`, igual à listagem e à criação (a tela de Empresas só é acessível a esse perfil, então nada quebra).

## Sessão

`src/lib/auth.ts` deixa de selecionar `logoUrl` sozinho e passa a selecionar `id, logoUrl, logoMimeType, logoUpdatedAt`, gravando na sessão `company.logoUrl = companyLogoUrl(...)`. Tipos em `src/types/next-auth.d.ts` não mudam (continua `logoUrl: string | null`).

## Front-end

- **CompanyForm:** remove o input de URL. Novo bloco "Logo": prévia atual (se houver), botão "Enviar imagem" (`<input type="file" accept="image/png,image/jpeg,image/webp">`) e "Remover". Ao escolher arquivo: rejeita tipos fora da lista e arquivos de origem acima de 5 MB; `resizeImageToDataUrl(file, 512)` (canvas → `toDataURL('image/webp', 0.9)`, fallback PNG) e mostra a prévia; guarda o data URL em `logo`. "Remover" define `logo = null`. Se o usuário não mexer, `logo` fica `undefined` e não é enviado. Erros de leitura/arquivo aparecem abaixo do campo. A prévia de cor do formulário passa a exibir a logo à esquerda do nome.
- `resizeImageToDataUrl` fica em `src/lib/image-resize.ts` (usa DOM; não testado em Vitest/node).
- **Sidebar:** troca `next/image` por `<img>` (o otimizador do Next buscaria a rota sem os cookies do usuário e seria barrado pelo login), mantendo tamanho e estilo.
- `use-companies.ts`: tipo do formulário aceita `logo?: string | null`.

## Erros

| Situação | Resposta |
|---|---|
| Tipo não aceito, base64 inválido, bytes não batem com o tipo | 400 "Imagem inválida: use PNG, JPG ou WebP" |
| Acima de 300 KB após o redimensionamento | 400 "Imagem muito grande (máx. 300 KB)" |
| Logo inexistente na rota de imagem | 404 |
| Arquivo de origem acima de 5 MB ou tipo errado (navegador) | mensagem no formulário, nada é enviado |

## Testes

Vitest em `src/lib/__tests__/company-logo.test.ts`: aceita PNG/JPEG/WebP mínimos válidos; rejeita SVG, GIF, tipo declarado diferente dos bytes, base64 corrompido, acima do limite; `companyLogoUrl` com logo enviada, só URL legada e nenhuma.

Navegador: enviar PNG grande → prévia reduzida → salvar → logo aparece na lista e (após novo login) na barra lateral; remover → some; arquivo `.svg`/`.gif` → mensagem; tamanho do registro no banco < 300 KB.

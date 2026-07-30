# Plano de atualizacao visual premium

Este documento organiza as proximas telas e pontos do AxisFin que ainda precisam receber a nova identidade premium baseada no conceito Prisma Axis.

## Ja aplicado

- Identidade Prisma Axis em `AxisFinLogo`, `axisfin-icon.svg` e `axisfin-logo.svg`.
- Shell principal do app: fundo, sidebar desktop, scroll e navegacao mobile.
- Home/dashboard: cards principais, contas com identidade visual e cartoes ativos do mes.
- Login/cadastro: acabamento premium, logo nova e campos mais coerentes.
- Modal principal de lancamento: estrutura mais limpa, foco em valor/titulo/data/origem/categoria, tipo de despesa visivel e calendario via portal.
- Prompt PWA usando o SVG novo.

## Prioridade 1 - Fluxos de uso diario

### Transacoes

- Arquivo principal: `src/components/transactions/TransactionsView.tsx`
- Atualizar lista de lancamentos para o mesmo padrao de cards premium.
- Revisar filtros, busca e estados vazios.
- Garantir boa leitura de valor, pessoa/reembolso, categoria e status.
- Avaliar acoes de editar/excluir para evitar excesso visual.

### Cartoes e faturas

- Arquivos principais:
  - `src/components/cards/CardsView.tsx`
  - `src/components/cards/CardInvoiceActions.tsx`
  - `src/components/cards/AddCardModal.tsx`
- Atualizar cards de cartao para linguagem premium.
- Manter ordem manual da fatura bem evidente.
- Melhorar listas de despesas da fatura para conferencia.
- Revisar botoes de pagamento, edicao, fechamento e menu de acoes.

### Contas

- Arquivos principais:
  - `src/components/accounts/AccountsView.tsx`
  - `src/components/accounts/AddAccountModal.tsx`
- Aplicar visual premium nos cards de conta.
- Destacar saldo, movimento do mes e instituicao com identidade propria.
- Revisar modal de conta para ficar consistente com o novo modal de lancamento.

## Prioridade 2 - Areas de acompanhamento

### Reembolsos

- Arquivo principal: `src/components/reimbursements/ReimbursementsView.tsx`
- Aplicar cards premium para pessoas.
- Melhorar lista filtrada por pessoa selecionada.
- Separar visualmente "a receber", "recebido" e itens de terceiros.
- Manter clareza para despesas divididas em dois itens.

### Metas e compromissos

- Arquivo principal: `src/components/goals/GoalsView.tsx`
- Atualizar cards de metas e compromissos.
- Dar mais destaque a progresso, risco e proximas datas.
- Evitar layout muito colorido ou com excesso de badges.

### Relatorios

- Arquivo principal: `src/components/reports/ReportsView.tsx`
- Aplicar acabamento nos cards de analise e graficos.
- Revisar tabelas/listas longas para ficarem mais densas e legiveis no PC.
- Melhorar estados de carregamento e vazio.

## Prioridade 3 - Perfil, suporte e consistencia

### Perfil

- Arquivo principal: `src/components/profile/ProfileView.tsx`
- Atualizar secoes de configuracao, preferencias e exportacao.
- Manter visual utilitario, com menos blocos competindo.

### Notificacoes

- Arquivo principal: `src/components/notifications/NotificationsView.tsx`
- Aplicar cards/listas premium.
- Melhorar leitura de status lida/nao lida.

### Modais secundarios

- Arquivos principais:
  - `src/components/categories/AddCategoryModal.tsx`
  - `src/components/cards/AddCardModal.tsx`
  - `src/components/accounts/AddAccountModal.tsx`
- Padronizar header, campos, botoes, estados de erro e altura maxima.
- Usar a mesma logica visual do novo modal de lancamento.

## Assets PWA e marca

- Regenerar `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `apple-touch-icon.png` com a logo Prisma Axis.
- Regenerar splash screens se for manter experiencia PWA completa no iOS.
- Revisar `manifest.webmanifest` se o nome curto e cores devem mudar para o novo tom premium.

## Checklist por tela

- A tela usa `premium-card`, `premium-card-soft`, `premium-metal` ou variacoes equivalentes?
- Os dados mais importantes aparecem primeiro?
- No PC, a tela evita largura estreita demais e rolagem desnecessaria?
- No mobile, botoes e campos continuam confortaveis para toque?
- Textos cabem sem quebrar layout?
- Estados vazios, loading, erro e confirmacoes seguem a nova identidade?
- Acoes perigosas continuam claras e nao parecem acoes primarias?


# Plano de atualizacao visual premium

Este documento organiza as proximas telas e pontos do AxisFin que ainda precisam receber a nova identidade premium baseada no conceito Prisma Axis.

## Ja aplicado

- Identidade Prisma Axis em `AxisFinLogo`, `axisfin-icon.svg` e `axisfin-logo.svg`.
- Shell principal do app: fundo, sidebar desktop, scroll e navegacao mobile.
- Home/dashboard: cards principais, contas com identidade visual e cartoes ativos do mes.
- Login/cadastro: acabamento premium, logo nova e campos mais coerentes.
- Modal principal de lancamento: estrutura mais limpa, foco em valor/titulo/data/origem/categoria, tipo de despesa visivel e calendario via portal.
- Transacoes: primeira passada premium em filtros, resumo, listas, estados vazios e confirmacao de pagamento.
- Cartoes/faturas: primeira passada premium em cards, resumo da fatura, lista de despesas e estados vazios.
- Contas: primeira passada premium em resumo, cards de conta, movimentos e estados vazios.
- Reembolsos: primeira passada premium em filtros, pessoas, resumo, lista e modal de recebimento.
- Metas/compromissos: primeira passada premium em tabs, cards, estados vazios e modais.
- Relatorios/orcamentos: primeira passada premium em escopo, widgets, graficos, orcamentos e modais.
- Perfil: primeira passada premium em perfil, preferencias, entidades, exportacao e reset.
- Notificacoes: primeira passada premium em resumo, lista e leitura de status.
- Modais secundarios: primeira passada premium em conta, cartao e categoria.
- Acessibilidade/navegacao: foco visivel, link para pular ao conteudo, navegacao com estado ativo e scroll base corrigido no shell.
- Prompt PWA usando o SVG novo.

## Prioridade 1 - Fluxos de uso diario

### Transacoes

- Arquivo principal: `src/components/transactions/TransactionsView.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar responsivo e microinteracoes.
- Atualizar lista de lancamentos para o mesmo padrao de cards premium. Concluido na primeira passada.
- Revisar filtros, busca e estados vazios. Concluido na primeira passada.
- Garantir boa leitura de valor, pessoa/reembolso, categoria e status.
- Avaliar acoes de editar/excluir para evitar excesso visual.

### Cartoes e faturas

- Arquivos principais:
  - `src/components/cards/CardsView.tsx`
  - `src/components/cards/CardInvoiceActions.tsx`
  - `src/components/cards/AddCardModal.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar acoes especificas e modal de cartao.
- Atualizar cards de cartao para linguagem premium. Concluido na primeira passada.
- Manter ordem manual da fatura bem evidente.
- Melhorar listas de despesas da fatura para conferencia. Concluido na primeira passada visual.
- Revisar botoes de pagamento, edicao, fechamento e menu de acoes.

### Contas

- Arquivos principais:
  - `src/components/accounts/AccountsView.tsx`
  - `src/components/accounts/AddAccountModal.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar modal de conta.
- Aplicar visual premium nos cards de conta. Concluido na primeira passada.
- Destacar saldo, movimento do mes e instituicao com identidade propria. Concluido na primeira passada.
- Revisar modal de conta para ficar consistente com o novo modal de lancamento.

## Prioridade 2 - Areas de acompanhamento

### Reembolsos

- Arquivo principal: `src/components/reimbursements/ReimbursementsView.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar detalhes responsivos e acao de editar.
- Aplicar cards premium para pessoas. Concluido na primeira passada.
- Melhorar lista filtrada por pessoa selecionada. Concluido na primeira passada visual.
- Separar visualmente "a receber", "recebido" e itens de terceiros. Concluido na primeira passada.
- Manter clareza para despesas divididas em dois itens.

### Metas e compromissos

- Arquivo principal: `src/components/goals/GoalsView.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar densidade dos formularios.
- Atualizar cards de metas e compromissos. Concluido na primeira passada.
- Dar mais destaque a progresso, risco e proximas datas.
- Evitar layout muito colorido ou com excesso de badges.

### Relatorios

- Arquivo principal: `src/components/reports/ReportsView.tsx`
- Status: primeira passada aplicada em 2026-07-30; inclui `BudgetSection`.
- Aplicar acabamento nos cards de analise e graficos. Concluido na primeira passada.
- Revisar tabelas/listas longas para ficarem mais densas e legiveis no PC.
- Melhorar estados de carregamento e vazio.

## Prioridade 3 - Perfil, suporte e consistencia

### Perfil

- Arquivo principal: `src/components/profile/ProfileView.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar densidade em PC.
- Atualizar secoes de configuracao, preferencias e exportacao. Concluido na primeira passada.
- Manter visual utilitario, com menos blocos competindo. Concluido na primeira passada.

### Notificacoes

- Arquivo principal: `src/components/notifications/NotificationsView.tsx`
- Status: primeira passada aplicada em 2026-07-30.
- Aplicar cards/listas premium. Concluido na primeira passada.
- Melhorar leitura de status lida/nao lida. Concluido na primeira passada.

### Modais secundarios

- Arquivos principais:
  - `src/components/categories/AddCategoryModal.tsx`
  - `src/components/cards/AddCardModal.tsx`
  - `src/components/accounts/AddAccountModal.tsx`
- Status: primeira passada aplicada em 2026-07-30; ainda revisar campos internos mais densos.
- Padronizar header, campos, botoes, estados de erro e altura maxima. Concluido na primeira passada.
- Usar a mesma logica visual do novo modal de lancamento. Concluido na primeira passada.

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
- Tab/Shift+Tab mostram foco visivel e seguem uma ordem natural?
- Listas longas rolam dentro da area principal sem sumir atras do menu inferior?

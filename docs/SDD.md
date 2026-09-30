# AxisFin - SDD

## Visao geral

AxisFin e um aplicativo financeiro pessoal web/mobile-first em Vite, React, TypeScript e Supabase. O produto organiza dinheiro real, competencia mensal, cartoes, faturas, caixinhas, reembolsos, metas, compromissos e relatorios.

Este documento e o norte tecnico e funcional do projeto. Ele deve refletir o estado real do app, nao uma versao idealizada.

## Escopo atual

- Autenticacao com Supabase Auth.
- Persistencia financeira em Supabase/Postgres.
- Contas, cartoes, categorias e transacoes.
- Despesas de conta, despesas de cartao, receitas e transferencias.
- Despesas fixas recorrentes.
- Compras parceladas.
- Reembolsos e despesas de terceiros.
- Pagamento de fatura com baixa em conta.
- Caixinhas/reservas e movimentacoes vinculadas a conta.
- Ajuste manual de saldo com lancamento financeiro de diferenca.
- Importacao CSV de fatura Nubank.
- Dashboard, central do mes, transacoes, contas, cartoes, caixinhas, metas, relatorios, reembolsos, notificacoes e perfil.

## Fora de escopo atual

- Open Finance automatizado.
- Leitura automatica de email ou PDF de fatura.
- Conciliacao bancaria oficial por API.
- Multiusuario/contabilidade familiar com permissoes.
- IA financeira em producao.
- Anexos/comprovantes persistidos em Storage para transacoes.

## Fluxos principais reais

### Navegacao

A navegacao principal organiza o app por intencao:

- Hoje: Home e Central do Mes.
- Movimentos: Transacoes, Cartoes e Reembolsos.
- Patrimonio: Contas, Caixinhas e Metas & Compromissos.
- Analise: Relatorios.
- Configuracao: Perfil.

No mobile, Home, Central e Cartoes continuam como atalhos principais; os demais fluxos ficam agrupados no menu secundario.

### Registro manual

O usuario abre o modal de novo lancamento e escolhe entre lancamento rapido, despesa no cartao, despesa em conta, receita ou transferencia. O fluxo atual e poderoso, mas concentra muitas decisoes em um modal.

O modal deve mostrar um resumo "Ao salvar" antes da confirmacao, explicando o impacto do registro: parcelas criadas, regra fixa, divisao de reembolso, transferencia entre contas, receita ou credito de fatura.

O formulario manual deve ser organizado em blocos progressivos: identificacao, detalhes da despesa quando aplicavel, origem/estado e avancado. Importacao em lote de fatura fica no fluxo de Cartoes, dentro da fatura.

Risco atual: excesso de estados e condicionais no mesmo componente.

### Cartao e fatura

Despesa de cartao entra na fatura pelo ciclo de fechamento/vencimento. A fatura mostra total, valor pessoal, valor de terceiros, pendencias de reembolso, estornos, status e lista reordenavel.

O visual de cartao fisico e compartilhado entre a tela Cartoes e a Home para manter consistencia em total de fatura, bandeira, status e ciclo. Selects de conta/cartao tambem devem usar o seletor visual compartilhado, mantendo o select nativo por baixo para acessibilidade e dando contexto de saldo, limite e instituicao.

### Importacao de fatura

O usuario importa CSV Nubank, revisa itens, ignora entradas que nao sao despesa, investiga candidatos e cria despesas em lote. Para reembolso/divisao, o importador deve respeitar a mesma regra do cadastro manual.

### Contas e saldo

Contas exibem saldo real, movimentos do mes e detalhe por conta. Ajuste manual de saldo deve gerar um lancamento financeiro de entrada ou saida para explicar a diferenca.

### Caixinhas

Caixinhas sao reservas separadas do saldo disponivel. Movimentos podem representar aplicacao, retirada, rendimento e atualizacao de saldo. Aplicacao/retirada vinculada a conta deve movimentar tambem a conta correspondente.

### Reembolsos

Despesas de terceiros podem ser 100% de terceiro ou divididas. O app registra pessoa, valor pendente, status, recebimento parcial/total e conta de recebimento.

### Central do Mes

Central operacional para pagar faturas/despesas, registrar reembolsos, revisar compromissos fixos/parcelados e decidir se o mes pode ser fechado.

A tela funciona como cockpit de acao: no topo, a faixa "Resolver agora" concentra a proxima fatura, a proxima despesa de conta, o proximo reembolso e a proxima fixa que pode ser ignorada. A priorizacao por atraso, hoje e proximos sete dias responde "o que preciso resolver agora?", enquanto Home fica com leitura de situacao e Transacoes fica como trilha de auditoria/investigacao.

### Relatorios

Relatorios sao separados em `Mes`, `Ano` e `Patrimonio`. Cada visao deve responder primeiro a pergunta executiva antes dos graficos: se o mes sobrou ou faltou, se o ano acumula sobra ou deficit, e qual e a composicao atual do patrimonio. O detalhamento fixo/parcelado/variavel fica progressivo para nao competir com o resumo.

## Arquitetura e stack identificadas

- Vite + React 19 + TypeScript.
- Tailwind CSS v4.
- Supabase JS client.
- Recharts para graficos.
- Vercel Speed Insights.
- Test runner proprio via `tsx`.
- Graphify para mapa tecnico do codigo em `src/graphify-out/`.

Arquivos de alta centralidade segundo Graphify:

- `src/App.tsx`
- `src/components/transactions/AddEntryModal.tsx`
- `src/components/month-center/MonthCenterView.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/cards/CardsView.tsx`
- `src/features/finance/financeStore.ts`
- `src/lib/utils/finance.ts`
- `src/lib/utils/transactionMeta.ts`

## Dados, entradas e saidas

Principais entidades:

- `Account`
- `Card`
- `Category`
- `Transaction`
- `RecurringTransaction`
- `ReimbursementPerson`
- `ReserveBox`
- `ReserveBoxMovement`
- `Goal`
- `Commitment`
- `Budget`
- `AppNotification`

Entradas:

- formulario manual;
- lancamento rapido por texto/voz;
- CSV de fatura Nubank;
- ajuste manual de saldo;
- movimentos de caixinha;
- configuracoes do perfil.

Saidas:

- UI do app;
- CSV/exportacoes;
- relatorios visuais;
- grafo Graphify local;
- documentos D.N.E.E.

## Regras de negocio percebidas

- Saldo atual e caixa real confirmado.
- Despesa no cartao nao reduz conta ate o pagamento da fatura.
- Pagamento de fatura reduz a conta escolhida.
- Transferencia move saldo entre contas e nao altera patrimonio total.
- Despesa pessoal pesa no resultado pessoal.
- Despesa de terceiro deve ser separada de gasto pessoal.
- Reembolso esperado pode compor visao geral, mas nao deve parecer dinheiro ja recebido.
- Compra parcelada deve dividir o valor total pelo numero de parcelas.
- Edicao de parcela/fixa precisa deixar claro se afeta apenas uma ocorrencia ou tambem futuras.
- Ajuste manual de saldo com diferenca deve criar lancamento explicativo.
- Caixinhas ficam separadas do saldo disponivel de contas.
- Graphify deve ser atualizado apos mudancas de codigo relevantes com `npm.cmd run graphify:src`, quando o ambiente permitir.

## Graphify como mapa tecnico vivo

Graphify e parte oficial da governanca tecnica do AxisFin.

Uso esperado:

- consultar `src/graphify-out/GRAPH_REPORT.md` antes de grandes refatoracoes;
- abrir `src/graphify-out/graph.html` para visualizar comunidades e relacoes;
- manter `docs/axisfin-graphify-map.md` como leitura humana resumida;
- usar `npm.cmd run graphify:src` apos mudancas de codigo para atualizar o mapa;
- registrar no changelog quando o Graphify indicar mudanca relevante de centralidade, comunidade ou gargalo.

Estado conhecido em 2026-09-30:

- 843 nos;
- 3026 arestas;
- 38 comunidades;
- nenhum ciclo de importacao detectado;
- pontos centrais: `App()`, `getUserFriendlyError()`, `readTransactionMeta()`, `Transaction`, `Card`, `MonthCenterView()`, `Account`.

Observacao: nas ultimas tentativas o Graphify foi bloqueado por politicas/cache do Windows/uv. Quando isso ocorrer, registrar a falha e usar o ultimo `graph.json` como referencia ate o ambiente permitir atualizar.

## Criterios de qualidade

- `npm.cmd run lint` deve passar para mudancas de codigo.
- `npm.cmd test` deve passar quando regras financeiras ou utilitarios forem alterados.
- `npm.cmd run build` deve passar antes de push.
- Mudancas financeiras devem ter teste focado quando houver regra nova.
- Mudancas relevantes devem atualizar `docs/ROADMAP.md`, `docs/SDD.md` e `docs/CHANGELOG_EVIDENCES.md`.
- A documentacao Markdown e fonte de verdade; `visao-projeto.html` e apenas leitura visual.

## Direcao visual

Home, Relatorios e Central do Mes devem priorizar leitura operacional. Cards destacados ficam reservados para saldo, resumo, decisao ou objetos visuais fortes como cartao fisico. Listas e recortes repetidos usam superficie mais quieta: borda sutil, fundo baixo contraste e densidade maior.

Cartoes, Transacoes e Contas usam tokens compartilhados de tela, superficie, lista, estado vazio, modal e controles para manter o mesmo vocabulario visual sem repetir classes longas em cada fluxo.

Perfil, Metas, Caixinhas e Reembolsos seguem o mesmo padrao visual: paineis neutros para configuracao e listas, destaque apenas para alertas, chamadas de acao e objetos de valor financeiro.

## Riscos e pontos de atencao

- `AddEntryModal` concentra fluxo demais.
- `App.tsx` concentra orquestracao demais.
- Muitas telas usam visual premium em excesso, reduzindo hierarquia.
- Relatorios podem ficar completos, mas pouco escaneaveis.
- Reembolso, fatura e competencia mensal sao regras sensiveis e devem evitar dupla contagem.
- Graphify pode ficar stale quando o ambiente bloquear atualizacao.

## Debitos estruturais

- Quebrar telas grandes em componentes/hook menores.
- Criar modais internos no lugar de `window.confirm`, `prompt` e `alert`.
- Reorganizar navegacao por intencao de uso.
- Consolidar tokens visuais para reduzir classes soltas.
- Tornar o fluxo de importacao de fatura mais investigavel e auditavel.

## Pontos a complementar

- [A VALIDAR] Modelo final de fechamento mensal persistido.
- [A VALIDAR] Politica de auditoria para acoes financeiras criticas.
- [A VALIDAR] Estrategia de anexos/comprovantes.
- [A VALIDAR] Como medir sucesso da simplificacao visual.

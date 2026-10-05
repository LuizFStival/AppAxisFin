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

As regras puras de criacao ficam em `addEntryRules`, `addEntryBuilder` e `addEntrySavePlan`; textos, labels, preview de parcelas e resumo de impacto ficam em `addEntryPresentation`; contexto derivado de cartao, conta, receita, transferencia, reembolso e edicao fica em `addEntryFlowContext`; validacao de submit, criacao de categoria/pessoa e categorias de sistema ficam em `addEntryHandlers`. O `AddEntryModal` deve ficar cada vez mais restrito a estado local, handlers assíncronos e composicao visual.

Risco atual: excesso de estados e condicionais no mesmo componente.

### Cartao e fatura

Despesa de cartao entra na fatura pelo ciclo de fechamento/vencimento. A fatura mostra total, valor pessoal, valor de terceiros, pendencias de reembolso, estornos, status e lista reordenavel.

Pagamento de fatura e uma baixa de caixa da conta escolhida, nao um novo gasto de competencia. Telas de transacoes, relatorios, breakdown fixo/parcelado/variavel e filtros de "meus gastos" devem ignorar `invoicePayment` para evitar dupla contagem com as compras da fatura.

O visual de cartao fisico e compartilhado entre a tela Cartoes e a Home para manter consistencia em total de fatura, bandeira, status e ciclo. Selects de conta/cartao tambem devem usar o seletor visual compartilhado, mantendo o select nativo por baixo para acessibilidade e dando contexto de saldo, limite e instituicao.

### Importacao de fatura

O usuario importa CSV Nubank, revisa itens, ignora entradas que nao sao despesa, investiga candidatos e cria despesas em lote. Para reembolso/divisao, o importador deve respeitar a mesma regra do cadastro manual.

### Contas e saldo

Contas exibem saldo real, movimentos do mes e detalhe por conta. Ajuste manual de saldo deve gerar um lancamento financeiro de entrada ou saida para explicar a diferenca.

Quando a diferenca de saldo for rendimento, tarifa, correcao ou dinheiro externo, o lancamento explicativo entra no resultado como receita ou despesa propria. Quando a diferenca representa apenas dinheiro movido entre bolsos do proprio usuario, como resgate/aplicacao entre conta e caixinha, o lancamento deve ser marcado como transferencia interna (`internalTransfer` em `notes`) e ficar fora de receita, despesa e resultado do mes.

Contas e patrimonio devem indicar a confianca do saldo. Se uma conta ou caixinha ficar mais de 7 dias sem conferencia, a UI exibe badge de saldo desatualizado. Quando o total consolidado mistura datas de conferencia diferentes, o app deve avisar que o patrimonio nao representa uma foto unica do mesmo dia.

### Caixinhas

Caixinhas sao reservas separadas do saldo disponivel. Movimentos podem representar aplicacao, retirada, rendimento e atualizacao de saldo. Aplicacao/retirada vinculada a conta deve movimentar tambem a conta correspondente.

Quando uma aplicacao em caixinha usa uma conta com saldo cadastrado insuficiente, o app permite continuar e exibe aviso de que a conta ficara negativa no sistema. Essa regra cobre casos em que o saldo real existe fora do app, mas a conta ainda nao foi conferida/atualizada. Resgates continuam limitados pelo saldo real da caixinha.

### Reembolsos

Despesas de terceiros podem ser 100% de terceiro ou divididas. O app registra pessoa, valor pendente, status, recebimento parcial/total e conta de recebimento.

Receita propria e reembolso nao devem ser misturados. O card principal de resultado considera apenas receita propria menos despesa propria. Valores de terceiros ficam em "Contas a receber", separados entre pendente e recebido quando a tela tiver esse detalhe. Gasto pago para terceiros explica caixa, mas nao deve inflar despesa propria.

### Central do Mes

Central operacional para pagar faturas/despesas, registrar reembolsos, revisar compromissos fixos/parcelados e decidir se o mes pode ser fechado.

A tela funciona como cockpit de acao: no topo, a faixa "Resolver agora" concentra a proxima fatura, a proxima despesa de conta, o proximo reembolso e a proxima fixa que pode ser ignorada. A priorizacao por atraso, hoje e proximos sete dias responde "o que preciso resolver agora?", enquanto Home fica com leitura de situacao e Transacoes fica como trilha de auditoria/investigacao.

O bloco de fixas e parceladas tambem mostra compromisso futuro: total parcelado ja assumido depois do mes selecionado, projecao mes a mes e mes de zeragem. A base e a parte pessoal das transacoes com `entryMode: installment`, usando o mes de competencia da fatura quando a parcela esta no cartao.

As parcelas e demais despesas proprias podem ser classificadas por natureza: essencial, bem duravel ou superfluo. A Central usa essa classificacao para mostrar quanto do compromisso futuro e necessidade/patrimonio de uso e quanto e escolha de consumo.

### Relatorios

Relatorios sao separados em `Mes`, `Ano` e `Patrimonio`. Cada visao deve responder primeiro a pergunta executiva antes dos graficos: se o mes sobrou ou faltou, se o ano acumula sobra ou deficit, e qual e a composicao atual do patrimonio. O detalhamento fixo/parcelado/variavel fica progressivo para nao competir com o resumo.

A visao patrimonial tambem mostra a variacao mensal estimada: patrimonio atual menos movimento do mes, destacando aportes externos. Esse numero e separado do resultado de competencia, porque saque/resgate de caixinha pode mudar o caixa disponivel sem ser receita, e aplicacao pode reduzir conta sem ser despesa.

O download CSV de Relatorios funciona como prova real mensal do sistema. Para o mes selecionado, ele deve organizar resumo financeiro, despesas por categoria e tipo, faturas do mes, itens de cada fatura, receita propria, debitos de conta, pagamentos de fatura, reembolsos, transferencias internas e patrimonio atual. Pagamento de fatura aparece como baixa de caixa explicativa, mas nao como novo gasto de competencia, evitando dupla contagem com as compras do cartao.

Relatorios tambem mostram qualidade do gasto por natureza: essencial, bem duravel, superfluo e sem natureza quando houver lancamento antigo sem classificacao. Essa leitura usa a parte pessoal das despesas e nao deve contar pagamento de fatura como novo gasto.

Proxima evolucao planejada: permitir exportar mais de um mes no mesmo CSV, com selecao rapida de 3, 4, 5 ou 6 meses e periodo personalizado. A exportacao multi-mes deve manter cada mes auditavel individualmente e adicionar um resumo consolidado do periodo, sem misturar receita propria, reembolso e transferencia interna.

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
- CSV/exportacoes, incluindo a prova real mensal de Relatorios;
- relatorios visuais;
- grafo Graphify local;
- documentos D.N.E.E.

## Regras de negocio percebidas

- Saldo atual e caixa real confirmado.
- Despesa no cartao nao reduz conta ate o pagamento da fatura.
- Pagamento de fatura reduz a conta escolhida.
- Pagamento de fatura nao deve compor gasto pessoal, gasto variavel/fixo/parcelado nem resultado por competencia, para nao somar a baixa da conta com as compras ja registradas na fatura.
- Transferencia move saldo entre contas e nao altera patrimonio total.
- Transferencia interna entre conta, caixinha ou ajuste marcado como interno explica movimento de caixa, mas nao e receita propria nem despesa propria.
- Receita propria exclui reembolso e transferencia interna.
- Despesa pessoal pesa no resultado pessoal.
- Despesa de terceiro deve ser separada de gasto pessoal.
- Reembolso esperado deve compor "Contas a receber", nao "Receita propria".
- Resultado do mes = receita propria - despesa propria.
- Compra parcelada deve dividir o valor total pelo numero de parcelas.
- Compromisso futuro deve mostrar saldo parcelado restante, projecao mes a mes e mes de zeragem.
- Ao registrar parcelamento, o modal deve mostrar valor por parcela, impacto mensal da parte pessoal e total que fica comprometido para meses futuros.
- Parcelas e despesas proprias devem poder ser classificadas como essencial, bem duravel ou superfluo.
- Compromissos futuros e relatorios devem mostrar percentual de essencial/duravel vs superfluo.
- Evento/Projeto deve estar disponivel para qualquer lancamento e permitir comparativos com ou sem eventos.
- Variacao patrimonial mensal deve ser apresentada separada do resultado contabil do mes.
- Confianca do saldo deve considerar `lastBalanceUpdate`: mais de 7 dias sem conferencia gera alerta, e datas diferentes no consolidado devem ser explicitadas.
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

Estado conhecido em 2026-10-04:

- 986 nos;
- 3617 arestas;
- 46 comunidades;
- nenhum ciclo de importacao detectado;
- pontos centrais: `App()`, `getUserFriendlyError()`, `Transaction`, `readTransactionMeta()`, `Card`, `Account`, `formatCurrency()`, `MonthCenterView()`, `roundMoney()`, `Category`.

Observacao: na ultima execucao o conjunto de comunidades mudou desde a rotulagem anterior; 41 nomes foram reaproveitados pelo hub ate uma futura rodada de `graphify label`.

Observacao Windows: o script `scripts/run-graphify-src.mjs` usa `uvx.exe --no-cache --python 3.12 --from graphifyy graphify` para evitar travas de cache do `uv`. Dentro do sandbox ainda pode ocorrer bloqueio de `_socket` (`os error 10013`). Se o terminal aprovado baixar o pacote mas a politica do Windows bloquear o wrapper `graphify` (`os error 4551`), usar o fallback `uvx.exe --no-cache --python 3.12 --from graphifyy python -m graphify src` e depois `uvx.exe --no-cache --python 3.12 --from graphifyy python -m graphify cluster-only src`.

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

Acoes destrutivas ou sensiveis usam modal interno compartilhado (`ActionDialog`) em vez de `window.confirm`, `window.prompt` ou `window.alert`. Escolhas com escopo financeiro, como excluir uma ocorrencia fixa ou uma serie, devem ser botoes explicitos, nao texto digitado.

Acoes bem sucedidas devem responder visualmente com feedback curto (`FeedbackToast`) quando a mudanca altera caixa, patrimonio, faturas, reembolsos ou configuracoes importantes. O objetivo e reduzir duvida depois do clique e estimular uso continuo sem transformar o app em uma tela barulhenta.

O controle transversal de dialogs e toasts vive em `useAppFeedback`, evitando que `App.tsx` concentre estado de UI global. Novos feedbacks devem usar esse hook em vez de recriar estado local no componente raiz.

Na Home, blocos densos devem ser extraidos quando acumularem regra, calculo e renderizacao. `Cartões do mês` fica em `DashboardCardsSection`, mantendo `DashboardView` mais focada em composicao da pagina.

## Riscos e pontos de atencao

- `AddEntryModal` ainda aparece como god node por handlers assíncronos, embora regras, apresentacao, contexto derivado e validacoes ja estejam fora do componente.
- `App.tsx` concentra orquestracao demais.
- Muitas telas usam visual premium em excesso, reduzindo hierarquia.
- Relatorios podem ficar completos, mas pouco escaneaveis.
- Reembolso, fatura e competencia mensal sao regras sensiveis e devem evitar dupla contagem.
- Graphify pode ficar stale quando o ambiente bloquear atualizacao.
- Ajuste manual de saldo deve continuar criando lancamento de entrada/saida quando houver diferenca, pois esse registro explica rendimento, tarifa, correcao ou saida nao lancada.

## Debitos estruturais

- Quebrar telas grandes em componentes/hook menores.
- Manter modais internos no lugar de `window.confirm`, `window.prompt` e `window.alert` para acoes financeiras.
- Reorganizar navegacao por intencao de uso.
- Consolidar tokens visuais para reduzir classes soltas.
- Tornar o fluxo de importacao de fatura mais investigavel e auditavel.

## Pontos a complementar

- [A VALIDAR] Modelo final de fechamento mensal persistido.
- [A VALIDAR] Politica de auditoria para acoes financeiras criticas.
- [A VALIDAR] Estrategia de anexos/comprovantes.
- [A VALIDAR] Como medir sucesso da simplificacao visual.

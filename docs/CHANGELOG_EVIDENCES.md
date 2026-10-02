# AxisFin - Decisoes e Evidencias

## Decisoes relevantes

### 2026-09-30 - Adotar D.N.E.E. Docs

### Antes

O projeto tinha documentos soltos de estudo visual, SDD historico e mapa Graphify, mas nao possuia a estrutura canonica D.N.E.E. com quatro fontes Markdown principais.

### Depois

Foram criados `SOBRE.md`, `SDD.md`, `ROADMAP.md`, `CHANGELOG_EVIDENCES.md` e `visao-projeto.html` dentro de `docs/`.

### Decisao

Usar D.N.E.E. Docs como processo de governanca para mudancas relevantes no AxisFin.

### Evidencia

- `docs/SOBRE.md`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` falhou pelo bloqueio conhecido de socket/rede no Windows.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` falhou por politica de Controle de Aplicativo bloqueando o Python do `uv` (`os error 4551`).
- `npm.cmd run graphify:src` falhou pelo bloqueio conhecido de socket/rede no Windows.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou: 843 nos, 3026 arestas e 38 comunidades.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou e atualizou `GRAPH_REPORT.md`, `graph.json` e `graph.html`.
- `npm.cmd run graphify:src` falhou pelo bloqueio conhecido de socket/rede no Windows.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou.
- `docs/CHANGELOG_EVIDENCES.md`
- `docs/visao-projeto.html`

### Impacto observado

[A VALIDAR] Impacto operacional sera medido nas proximas tarefas, observando se a documentacao reduz retrabalho e perda de contexto.

### Proximos passos

Atualizar README e usar o ROADMAP como fonte de priorizacao.

## 2026-09-30 - Graphify entra na governanca do projeto

### Antes

Graphify ja existia em `src/graphify-out/` e havia um documento `docs/axisfin-graphify-map.md`, mas ele nao estava conectado ao processo de roadmap e decisoes.

### Depois

Graphify foi incorporado ao SDD e ao Roadmap como mapa tecnico vivo para refatoracoes, auditorias e acompanhamento de complexidade.

### Decisao

Toda refatoracao relevante deve consultar o Graphify antes de alterar codigo e tentar atualizar `src/graphify-out/` depois da mudanca.

### Evidencia

- `docs/SDD.md`, secao "Graphify como mapa tecnico vivo".
- `docs/ROADMAP.md`, Fase 7.
- `src/graphify-out/GRAPH_REPORT.md`.

### Impacto observado

Graphify mostrou pontos centrais atuais: `App()`, `getUserFriendlyError()`, `readTransactionMeta()`, `Transaction`, `Card`, `MonthCenterView()`, `Account`.

### Proximos passos

Resolver ou contornar bloqueio local do `uv`/Python que impede atualizacoes do Graphify em algumas execucoes no Windows.

## 2026-09-30 - Navegacao por intencao

### Antes

O menu lateral desktop listava todas as telas no mesmo nivel, fazendo fluxos operacionais, patrimoniais, analiticos e de configuracao competirem por atencao.

### Depois

A navegacao foi agrupada por intencao: Hoje, Movimentos, Patrimonio, Analise e Configuracao. No mobile, os atalhos principais foram preservados e o menu secundario passou a mostrar os mesmos agrupamentos.

### Decisao

Manter as rotas existentes e mudar apenas a hierarquia de apresentacao, reduzindo risco funcional enquanto melhora orientacao do usuario.

### Evidencia

- `src/components/layout/AppShell.tsx`
- `src/components/layout/BottomNavigation.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd test` passou.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` passou fora do sandbox: 827 nos, 2816 arestas, 33 comunidades.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` foi tentado, mas o Windows bloqueou `_socket` do Python usado pelo Graphify.

### Impacto observado

[A VALIDAR] Usuario deve localizar mais rapido onde registrar, conferir, analisar e configurar sem precisar memorizar a lista inteira de telas.

### Proximos passos

Avancar para a simplificacao do modal de lancamento, principalmente compra comum, parcelamento, transferencia e reembolso.

## 2026-09-30 - Modal de lancamento com resumo de impacto

### Antes

O modal ja tinha regras para parcelamento, fixas, transferencia e reembolso, mas o usuario precisava confiar que o app faria a coisa certa antes de salvar.

### Depois

Foi adicionada uma area "Ao salvar" que explica o impacto do lancamento antes da confirmacao. O texto muda para parcelamento, fixa, divisao/reembolso, credito de fatura, receita, despesa comum, transferencia e edicao de series.

### Decisao

Atacar a Fase 2 em fatias: primeiro clareza e prevencao de erro, depois separacao visual mais profunda dos subfluxos.

### Evidencia

- `src/components/transactions/AddEntryModal.tsx`
- `src/components/transactions/ExpenseOptions.tsx`
- `src/components/transactions/addEntrySavePlan.test.ts`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd test` passou.
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` foi tentado, mas o Windows bloqueou `_socket` do Python usado pelo Graphify.

### Impacto observado

[A VALIDAR] Usuario deve conseguir ver antes de salvar se uma compra parcelada sera dividida, se a edicao afeta so uma parcela ou futuras, e como reembolso/divisao sera registrado.

### Proximos passos

Separar visualmente os subfluxos do modal para reduzir campos visiveis no primeiro nivel.

## 2026-09-30 - Cartoes do mes com visual de cartao fisico

### Antes

A Home mostrava "Cartoes do mes" em cards resumidos, diferentes do visual principal da tela Cartoes.

### Depois

O preview fisico do cartao foi extraido para um componente compartilhado e usado tambem na Home, preservando total da fatura, status, bandeira, ciclo, vencimento, limite e acoes de fatura.

### Decisao

Padronizar a linguagem visual de cartoes antes de uma limpeza maior de layout, evitando dois modelos visuais para a mesma entidade.

### Evidencia

- `src/components/cards/CardPhysicalPreview.tsx`
- `src/components/cards/CardsView.tsx`
- `src/components/dashboard/DashboardView.tsx`
- `docs/SDD.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` foi tentado, mas o Windows bloqueou `_socket` do Python usado pelo Graphify.

### Impacto observado

[A VALIDAR] A Home deve parecer mais conectada com a tela Cartoes e facilitar reconhecimento visual das faturas do mes.

### Proximos passos

Continuar a limpeza visual reduzindo cards redundantes e hierarquizando melhor Home, Relatorios e Central.

## 2026-09-30 - Fase 2 concluida no modal de lancamento

### Antes

O modal ja tinha seletor inicial e resumo de impacto, mas o formulario ainda misturava identificacao, opcoes de despesa, origem e campos auxiliares no mesmo nivel visual.

### Depois

O formulario manual foi reorganizado em blocos progressivos: Identificacao, Detalhes da despesa, Origem e estado, e Avancado. O seletor inicial tambem passou a indicar que importacao em lote de fatura pertence ao fluxo de Cartoes.

### Decisao

Encerrar a Fase 2 como simplificacao de experiencia, mantendo a refatoracao tecnica profunda de `AddEntryModal` para uma fase posterior orientada pelo Graphify.

### Evidencia

- `src/components/transactions/AddEntryModal.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.

### Impacto observado

[A VALIDAR] Usuario deve distinguir com mais facilidade o que e dado principal, o que e detalhe de despesa, o que e origem financeira e o que e opcional/avancado.

### Proximos passos

Avancar para Fase 3: limpeza visual e hierarquia das telas principais.

## 2026-09-30 - Fase 3A: limpeza visual de Home, Relatorios e Central

### Antes

Home, Relatorios e Central usavam muitas superficies premium/cosmic em sequencia, inclusive em listas operacionais e itens repetidos. Isso deixava telas importantes visualmente mais pesadas do que precisavam ser.

### Depois

Foi feita uma primeira passada de hierarquia visual: Home ficou com header e contas mais quietos, Relatorios reduziu cards pesados nos blocos principais, e Central passou a usar superficies mais densas para listas de pagamentos, reembolsos e compromissos.

### Decisao

Tratar a Fase 3 em blocos. Esta entrega cobre Home, Relatorios e Central sem alterar calculos financeiros. Tokens visuais globais e limpeza de outras telas ficam para a proxima passada.

### Evidencia

- `src/components/dashboard/DashboardView.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/month-center/MonthCenterView.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou: 834 nos, 2938 arestas e 36 comunidades.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou e atualizou `GRAPH_REPORT.md`, `graph.json` e `graph.html`.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou: 828 nos, 2840 arestas e 33 comunidades.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou e atualizou `GRAPH_REPORT.md`, `graph.json` e `graph.html`.

### Impacto observado

[A VALIDAR] As telas devem ficar menos decorativas e mais escaneaveis, com cards fortes reservados para resumo, decisao ou objetos visuais importantes.

### Proximos passos

Criar tokens visuais compartilhados e continuar a limpeza em Cartoes, Transacoes e Contas.

## 2026-09-30 - Fase 3B: tokens visuais e limpeza de Cartoes, Transacoes e Contas

### Antes

Cartoes, Transacoes e Contas repetiam classes longas de superficie e alternavam `premium-card`, `premium-card-soft` e `cosmic-card` em resumos, filtros, listas e modais. Isso dificultava manter uma hierarquia consistente depois da primeira limpeza visual.

### Depois

Foi criado um pequeno conjunto de tokens compartilhados para telas, superficies, estados vazios, controles e modais. As tres telas passaram a usar esse vocabulario nos blocos principais, reduzindo repeticao e deixando listas operacionais mais neutras.

### Decisao

Manter os tokens como classes Tailwind nomeadas em TypeScript, sem introduzir dependencia nova. A limpeza continua incremental: primeiro superficies/listas, depois componentes menores e telas restantes.

### Evidencia

- `src/components/shared/visualTokens.ts`
- `src/components/cards/CardsView.tsx`
- `src/components/accounts/AccountsView.tsx`
- `src/components/transactions/TransactionsView.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou: 834 nos, 2869 arestas e 43 comunidades.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou e atualizou `GRAPH_REPORT.md`, `graph.json` e `graph.html`.

### Impacto observado

[A VALIDAR] Cartoes, Transacoes e Contas devem parecer mais alinhadas com Home, Relatorios e Central, com menos competicao visual entre resumo e lista.

### Proximos passos

Seguir a limpeza nas telas restantes ou avancar para Relatorios executivos.

## 2026-09-30 - Fase 3C: limpeza visual das telas restantes

### Antes

Perfil, Metas, Caixinhas e Reembolsos ainda usavam muitas superficies `premium-card`, `premium-card-soft` e `cosmic-card`, deixando configuracoes, listas e alertas com peso visual parecido.

### Depois

As quatro telas passaram a usar os tokens visuais compartilhados. Resumos, estados vazios, listas, filtros e modais ficaram mais alinhados com Home, Relatorios, Central, Cartoes, Transacoes e Contas.

### Decisao

Encerrar a primeira limpeza visual ampla da Fase 3 sem alterar fluxos financeiros. Refinamentos mais finos, como selects ricos e faturas/cartoes fisicos, ficam como proximos ajustes visuais.

### Evidencia

- `src/components/profile/ProfileView.tsx`
- `src/components/goals/GoalsView.tsx`
- `src/components/reserve-boxes/ReserveBoxesView.tsx`
- `src/components/reimbursements/ReimbursementsView.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Impacto observado

[A VALIDAR] O app deve parecer mais coeso entre telas operacionais, patrimoniais e de configuracao, com menos ruído de superficies concorrentes.

### Proximos passos

Decidir entre refinamento visual fino ou Fase 4 de Relatorios executivos.

## 2026-09-30 - Fase 3D: fechamento visual fino

### Antes

Selects de conta/cartao ainda apareciam como campo nativo simples em fluxos importantes: lancamento manual, lancamento rapido, pagamento de fatura, cadastro de cartao e registro de reembolso. O cartao fisico compartilhado tambem funcionava, mas ainda podia parecer mais ilustrativo do que funcional.

### Depois

Foi criado um seletor visual compartilhado para conta/cartao, preservando o select nativo invisivel para teclado/acessibilidade e exibindo logo, saldo, limite e bandeira como contexto. O preview fisico de cartao ganhou chip, area contactless, status e composicao mais estavel para Home e Cartoes.

### Decisao

Fechar a Fase 3 como concluida. Os proximos blocos devem voltar para produto/fluxo: Relatorios executivos e Central do Mes.

### Evidencia

- `src/components/shared/EntitySelect.tsx`
- `src/components/transactions/SourceSelector.tsx`
- `src/components/transactions/QuickEntry.tsx`
- `src/components/cards/CardInvoiceActions.tsx`
- `src/components/cards/AddCardModal.tsx`
- `src/components/reimbursements/ReimbursementsView.tsx`
- `src/components/reserve-boxes/ReserveBoxesView.tsx`
- `src/components/cards/CardPhysicalPreview.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`

### Impacto observado

[A VALIDAR] A escolha de origem/destino deve ficar mais clara nos fluxos de lancamento, pagamento de fatura, cadastro de cartao e reembolso, reduzindo campos com cara de texto puro.

### Proximos passos

Avancar para Fase 4: Relatorios executivos.

## 2026-09-30 - Fase 4A: Relatorios executivos

### Antes

Relatorios reunia indicadores, composicao, meta, ano, patrimonio e graficos em uma tela unica chamada "Detalhado". A leitura principal ficava misturada com os graficos e com detalhes, tornando mais dificil entender rapidamente se o mes, o ano e o patrimonio estavam saudaveis.

### Depois

Relatorios foi separado em tres visoes: `Mes`, `Ano` e `Patrimonio`. Cada visao ganhou uma resposta executiva no topo, antes dos graficos. O detalhamento fixo/parcelado/variavel passou a usar disclosure progressivo, e o CSV agora exporta blocos de mes, ano e patrimonio.

### Decisao

Entregar uma primeira versao completa da Fase 4 dentro de `ReportsView`, reaproveitando os calculos existentes para reduzir risco. Refinamentos futuros devem ser guiados por uso real e, se necessario, por uma refatoracao menor em subcomponentes.

### Evidencia

- `src/components/reports/ReportsView.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` falhou pelo bloqueio conhecido de socket/rede no Windows.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou.

### Impacto observado

[A VALIDAR] Usuario deve conseguir entender em poucos segundos se o mes foi positivo, como o ano esta acumulando e como o patrimonio esta dividido entre contas e caixinhas.

### Proximos passos

Validar visualmente a Fase 4A e depois seguir para Central do Mes como cockpit de acao.

## 2026-09-30 - Fase 5A: Central do Mes como cockpit de acao

### Antes

Central do Mes ja reunia pagamentos, compromissos, reembolsos e checklist de fechamento, mas algumas acoes ainda pareciam pontos de navegacao para outras telas. O usuario precisava lembrar onde resolver cada pendencia.

### Depois

Foi adicionada uma faixa "Resolver agora" com a proxima fatura, despesa de conta, reembolso e fixa ignoravel. O checklist de fechamento agora manda para a propria Central quando a pendencia pode ser resolvida ali, e os modais de pagamento/reembolso usam seletor visual de conta.

### Decisao

Consolidar a Central como cockpit operacional, preservando Home como leitura de situacao e Transacoes como auditoria/investigacao.

### Evidencia

- `src/components/month-center/MonthCenterView.tsx`
- `src/components/shared/EntitySelect.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Impacto observado

[A VALIDAR] Usuario deve conseguir resolver pendencias principais do mes sem alternar mentalmente entre Central, Cartoes, Reembolsos e Transacoes.

### Proximos passos

Validar a Fase 5 no uso real e depois avancar para Fase 6: substituir dialogs nativos por modais internos.

## 2026-09-30 - Fase 6A: dialogs nativos substituidos

### Antes

Acoes destrutivas e financeiras ainda dependiam de `window.confirm`, `window.prompt` e `alert`, principalmente em exclusao de lancamentos, series fixas, contas, cartoes, categorias, metas e compromissos. O fluxo de excluir serie tambem exigia digitar `1` ou `2`.

### Depois

Foi criado um `ActionDialog` compartilhado para confirmacao, escolha de escopo e aviso. O app passou a usar modal interno em exclusoes, arquivamentos, erros controlados e escolhas de serie/recorrencia. As opcoes de escopo agora sao botoes explicitos.

### Decisao

Tratar dialogs nativos como debito de UX e seguranca operacional. O `prompt()` remanescente em PWA e mantido porque pertence a API nativa de instalacao do navegador, nao a um fluxo financeiro.

### Evidencia

- `src/components/shared/ActionDialog.tsx`
- `src/App.tsx`
- `src/components/goals/GoalsView.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `rg "window\\.(confirm|prompt|alert)" src` nao encontrou dialogs financeiros.
- `npm.cmd run graphify:src` falhou pelo bloqueio conhecido de socket/rede no Windows.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify src` passou: 858 nos, 3071 arestas e 27 comunidades.
- `uvx.exe --no-cache --python 3.12 --from graphifyy graphify cluster-only src` passou e atualizou `GRAPH_REPORT.md`, `graph.json` e `graph.html`.

### Impacto observado

[A VALIDAR] Usuario deve entender melhor o impacto antes de excluir, arquivar ou alterar serie fixa/parcelada, sem depender de prompt textual do navegador.

### Proximos passos

Validar visualmente os modais internos e avancar para Fase 7: refatoracao orientada pelo Graphify.

## 2026-09-30 - Feedback visual para acoes importantes

### Antes

Muitas acoes importantes eram tecnicamente concluídas, mas silenciosas: pagar fatura, receber reembolso, ignorar fixa, salvar lancamento, atualizar saldo, criar conta/cartao/categoria ou arquivar/excluir entidades. Isso podia deixar duvida se a acao realmente aconteceu.

### Depois

Foi criado `FeedbackToast`, um aviso visual curto no rodape, usado por fluxos financeiros e de configuracao importantes. As mensagens mostram o resultado da acao e, quando util, o valor movimentado.

### Decisao

Usar feedback visual com moderação para reforçar progresso e confiança sem poluir o app. O toast confirma sucesso; erros continuam com `appError` ou `ActionDialog`, conforme o caso.

### Evidencia

- `src/components/shared/FeedbackToast.tsx`
- `src/App.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Impacto observado

[A VALIDAR] Usuario deve sentir mais resposta do app depois de salvar, pagar, receber, arquivar ou excluir, reduzindo necessidade de conferir manualmente se a ação pegou.

### Proximos passos

Validar os feedbacks no uso real e seguir para a refatoracao orientada pelo Graphify, com cuidado especial em `App.tsx`.

## 2026-10-01 - Fase 7A: primeira refatoracao guiada pelo Graphify

### Antes

`App.tsx` ainda concentrava estado transversal de dialogs/toasts, enquanto `DashboardView` misturava composicao da Home com calculo e renderizacao de `Cartões do mês`. O cartao fisico da Home tambem podia apertar rodape, fatura e bandeira em telas menores.

### Depois

Dialogs e toasts foram extraidos para `useAppFeedback`. O bloco `Cartões do mês` foi movido para `DashboardCardsSection`, mantendo os calculos da fatura junto do componente que renderiza a secao. `CardPhysicalPreview` passou a usar grid interna para manter cabecalho, chip/contato e rodape alinhados sem cortar fatura ou bandeira.

### Decisao

Iniciar a Fase 7 por extrações pequenas e de baixo risco, sem mudar regra financeira. Isso reduz centralidade aos poucos e cria pontos melhores para novos ajustes visuais.

### Evidencia

- `src/components/app/useAppFeedback.tsx`
- `src/components/dashboard/DashboardCardsSection.tsx`
- `src/components/dashboard/DashboardView.tsx`
- `src/components/cards/CardPhysicalPreview.tsx`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd run lint` passou.
- `npm.cmd test` passou com 16 arquivos de teste.
- `npm.cmd run build` passou.
- `git diff --check` passou.
- `npm.cmd run graphify:src` passou fora do sandbox e atualizou o grafo: 872 nos, 3140 arestas, 37 comunidades e nenhum ciclo de importacao.

### Impacto observado

[A VALIDAR] Home deve ficar mais facil de manter, e os cartoes do mes devem preservar melhor o alinhamento do rodape em tamanhos menores.

### Proximos passos

Continuar a Fase 7 em outro bloco de alta centralidade, provavelmente `AddEntryModal`, `ReportsView` ou `MonthCenterView`.

## 2026-10-02 - Fase 7B: AddEntryModal com apresentacao extraida

### Antes

`AddEntryModal` ainda concentrava textos, labels, preview de parcelamento, resumo de impacto, estado local, regras de formulario e orquestracao de salvamento. Isso aumentava o risco de regressao em fluxos sensiveis como compra parcelada, reembolso/divisao e edicao de parcelas/fixas.

### Depois

Textos de apresentacao, labels, subtitulos, preview de parcelas, resumo "Ao salvar" e criterio de contexto avancado foram extraidos para `addEntryPresentation`. O modal passou a delegar essa camada para helper puro, preservando a composicao visual e o plano de salvamento existente.

### Decisao

Continuar a Fase 7 em fatias pequenas e testaveis. Nesta rodada, a reducao de centralidade atacou apresentacao e explicacao de impacto, sem alterar persistencia financeira.

### Evidencia

- `src/components/transactions/AddEntryModal.tsx`
- `src/components/transactions/addEntryPresentation.ts`
- `src/components/transactions/addEntryPresentation.test.ts`
- `scripts/run-graphify-src.mjs`
- `src/lib/utils/accountBalanceAdjustment.test.ts`
- `src/lib/utils/invoiceImport.test.ts`
- `npm.cmd run lint` passou.
- `npm.cmd test` passou com 17 arquivos de teste.
- `npm.cmd run build` passou.
- `git diff --check` passou.
- `npm.cmd run graphify:src` falhou dentro do sandbox por bloqueio de `_socket` (`os error 10013`), mas passou em execucao aprovada com `uvx.exe --no-cache`.
- Graphify atualizado: 886 nos, 3192 arestas, 42 comunidades e nenhum ciclo de importacao detectado.

### Impacto observado

Parcelamento, reembolso/divisao, importacao CSV e ajuste manual de saldo foram revalidados por testes automatizados. O ajuste manual de saldo continua criando lancamento explicativo de entrada ou saida quando existe diferenca entre saldo anterior e saldo conferido.

O `AddEntryModal()` ainda aparece como god node com 48 conexoes no Graphify, entao o proximo passo e separar estado/orquestracao por fluxo, nao apenas textos e apresentacao.

### Proximos passos

Extrair a orquestracao de estado de `AddEntryModal` por fluxo financeiro e continuar reduzindo a centralidade de `App.tsx` com hooks por dominio.

## 2026-10-02 - Fase 7C: contexto de fluxo do AddEntryModal extraido

### Antes

Mesmo apos a extracao de apresentacao, `AddEntryModal` ainda calculava dentro do componente o contexto derivado de cartao, conta, receita, transferencia, reembolso e edicao: valor parseado, origem selecionada, datas fixas, divisao, reembolso, resumo, labels e `entryDraft`.

### Depois

Foi criado `addEntryFlowContext`, um helper puro que monta esse contexto e devolve os valores que o modal precisa para renderizar, validar e montar o plano de salvamento. O modal continua controlando estado local e handlers, mas deixou de misturar derivacao financeira com JSX.

### Decisao

Separar a orquestracao por fluxo em uma camada testavel antes de extrair handlers de submit/criacao. Isso preserva o comportamento atual e reduz risco nos fluxos sensiveis.

### Evidencia

- `src/components/transactions/addEntryFlowContext.ts`
- `src/components/transactions/addEntryFlowContext.test.ts`
- `src/components/transactions/AddEntryModal.tsx`
- `npm.cmd run lint` passou.
- `npm.cmd test` passou com 18 arquivos de teste.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` falhou no sandbox por `_socket` (`os error 10013`) e passou fora do sandbox/aprovado.
- Graphify atualizado: 903 nos, 3255 arestas, 36 comunidades e nenhum ciclo de importacao detectado.

### Impacto observado

Os testes cobrem explicitamente compra no cartao parcelada, despesa em conta, receita, transferencia, reembolso dividido e edicao de parcela futura. No Graphify, `AddEntryModal()` saiu do top 10 de god nodes; `addEntryFlowContext.ts` apareceu como comunidade propria com coesao 0.21.

### Proximos passos

Extrair handlers de criacao/submissao por fluxo, principalmente `handleSubmit`, criacao de categoria/pessoa e preparacao de categoria de reembolso/ajuste de fatura.

## 2026-10-02 - Fase 7D: regras de handlers do AddEntryModal extraidas

### Antes

`AddEntryModal` ainda mantinha dentro dos handlers regras de validacao do submit, criacao de categoria customizada, criacao de pessoa de reembolso e rascunhos das categorias de sistema `Reembolsos` e `Ajustes de fatura`.

### Depois

Foi criado `addEntryHandlers`, concentrando validacao pura de submissao, preparacao de categorias de sistema, validacao de pessoa e montagem de categoria customizada. O modal manteve os efeitos assíncronos e setters de estado, mas deixou de carregar as regras desses handlers inline.

### Decisao

Extrair primeiro as regras puras dos handlers antes de mover os handlers assíncronos para um hook. Essa ordem reduz risco porque preserva `onCreateCategory`, `onCreateReimbursementPerson`, `onSave` e os setters atuais no componente.

### Evidencia

- `src/components/transactions/addEntryHandlers.ts`
- `src/components/transactions/addEntryHandlers.test.ts`
- `src/components/transactions/AddEntryModal.tsx`
- `npm.cmd run lint` passou.
- `npm.cmd test` passou com 19 arquivos de teste.
- `npm.cmd run build` passou.
- `npm.cmd run graphify:src` falhou no sandbox por `_socket` (`os error 10013`) e passou fora do sandbox/aprovado.
- Graphify atualizado: 916 nos, 3306 arestas, 43 comunidades e nenhum ciclo de importacao detectado.

### Impacto observado

`AddEntryModal()` caiu de 48 para 43 edges em relacao a Fase 7B, mas ainda aparece como god node (#9). Isso indica que a proxima reducao precisa sair da camada de regras puras e ir para um hook de orquestracao dos handlers assíncronos.

### Proximos passos

Extrair um hook de handlers do modal ou dividir a orquestracao assíncrona por subfluxo: submit principal, categorias de sistema, reembolso/pessoa e lancamento rapido.

## 2026-10-02 - Aplicacao em caixinha com saldo cadastrado defasado

### Antes

O modal de aplicacao em caixinha bloqueava a operacao quando o valor informado era maior que o saldo cadastrado da conta de origem. Isso impedia registrar uma aplicacao real quando o saldo bancario existia, mas o saldo da conta no app ainda estava desatualizado.

### Depois

A aplicacao pode ser salva mesmo que a conta de origem fique negativa no app. O modal mostra um aviso com a diferenca projetada e orienta conferir ou atualizar o saldo da conta depois.

### Decisao

Tratar saldo cadastrado insuficiente como divergencia operacional, nao como bloqueio, somente no fluxo de aplicacao em caixinha. Resgates continuam bloqueados quando passam do saldo atual da caixinha.

### Evidencia

- `src/components/reserve-boxes/ReserveBoxesView.tsx`
- `src/lib/utils/reserveBoxes.ts`
- `src/lib/utils/reserveBoxes.test.ts`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `npm.cmd test -- reserveBoxes` passou.
- `npm.cmd run lint` passou.
- `npm.cmd test` passou com 19 arquivos de teste.
- `npm.cmd run build` passou.
- `git diff --check` passou com apenas avisos LF/CRLF conhecidos do Windows.
- `npm.cmd run graphify:src` falhou no sandbox por `_socket` (`os error 10013`) e passou fora do sandbox/aprovado.
- Graphify atualizado: 918 nos, 3317 arestas, 32 comunidades e nenhum ciclo de importacao detectado.

### Impacto observado

[A VALIDAR] Usuario deve conseguir registrar aplicacao real em caixinha mesmo quando a conta ainda precisa de conferencia de saldo, sem perder o alerta de divergencia.

### Proximos passos

Validar no uso real se o aviso e suficiente ou se o fluxo deve oferecer atalho direto para atualizar saldo da conta apos aplicar.

## Changelog

- 2026-09-30 - Estrutura D.N.E.E. criada para o AxisFin.
- 2026-09-30 - Graphify documentado como parte da visao de governanca tecnica.
- 2026-09-30 - Navegacao reorganizada por intencao no desktop e no mobile.
- 2026-09-30 - Modal de lancamento ganhou resumo de impacto antes de salvar.
- 2026-09-30 - Home passou a usar o visual de cartao fisico em Cartoes do mes.
- 2026-09-30 - Fase 2 do modal de lancamento concluida com formulario progressivo.
- 2026-09-30 - Fase 3A aplicou limpeza visual em Home, Relatorios e Central.
- 2026-09-30 - Fase 3B criou tokens visuais e limpou Cartoes, Transacoes e Contas.
- 2026-09-30 - Fase 3C limpou Perfil, Metas, Caixinhas e Reembolsos com os tokens visuais.
- 2026-09-30 - Fase 3D concluiu selects ricos de conta/cartao e refinou cartoes fisicos/faturas.
- 2026-09-30 - Fase 4A separou Relatorios em Mes, Ano e Patrimonio com resumo executivo e CSV agrupado.
- 2026-09-30 - Fase 5A consolidou Central do Mes como cockpit de acao.
- 2026-09-30 - Fase 6A substituiu dialogs nativos financeiros por modal interno compartilhado.
- 2026-09-30 - FeedbackToast adicionou respostas visuais para acoes importantes.
- 2026-10-01 - Fase 7A iniciou refatoracao guiada pelo Graphify com `useAppFeedback` e `DashboardCardsSection`.
- 2026-10-02 - Fase 7B extraiu apresentacao do `AddEntryModal`, revalidou fluxos sensiveis e documentou workaround Graphify no Windows.
- 2026-10-02 - Fase 7C extraiu contexto de fluxo do `AddEntryModal` e cobriu cartao, conta, receita, transferencia, reembolso e edicao.
- 2026-10-02 - Fase 7D extraiu regras de submit, categorias e pessoa de reembolso do `AddEntryModal`.
- 2026-10-02 - Aplicacao em caixinha passou a permitir conta negativa no app quando o saldo cadastrado esta defasado.

## Metricas observadas ou sugeridas

Metricas tecnicas atuais extraidas do Graphify em 2026-10-02:

- 918 nos.
- 3317 arestas.
- 32 comunidades.
- 0 ciclos de importacao detectados.

Metricas sugeridas:

- tempo para fechar o mes;
- divergencia entre saldo real e saldo registrado;
- quantidade de reembolsos pendentes com mais de 30 dias;
- numero de cliques para registrar compra comum;
- tamanho/centralidade dos principais arquivos apos refatoracao;
- taxa de sucesso de importacao de fatura sem ajuste manual.

## Pendencias de validacao

- [A VALIDAR] Se a documentacao D.N.E.E. sera revisada antes de cada implementacao grande.
- [A VALIDAR] Se a pagina visual deve ser versionada como artefato estatico ou publicada.
- [A VALIDAR] Sandbox ainda pode bloquear Graphify por `_socket`; no Windows local/aprovado, `npm.cmd run graphify:src` usa `uvx.exe --no-cache` para evitar o problema de cache do `uv`.

## Pontos a complementar

- [PERGUNTA AO RESPONSAVEL] Qual metrica de produto mais importa primeiro: velocidade de lancamento, fechamento do mes ou confianca no saldo?

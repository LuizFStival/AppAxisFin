# AxisFin - Roadmap

## Status geral

Fase atual: consolidacao de produto, governanca D.N.E.E. e simplificacao de experiencia.

O app ja possui muitos fluxos financeiros reais. A prioridade agora e reduzir complexidade, melhorar hierarquia visual e manter documentacao viva para evitar retrabalho.

## Fase atual

Organizar o produto em torno de quatro intenções:

1. Entender o hoje.
2. Registrar e conferir movimentos.
3. Cuidar do patrimonio.
4. Analisar e decidir.

## Roadmap por fases

### Fase 0 - Governanca D.N.E.E.

- [x] Criar `docs/SOBRE.md`.
- [x] Criar `docs/SDD.md`.
- [x] Criar `docs/ROADMAP.md`.
- [x] Criar `docs/CHANGELOG_EVIDENCES.md`.
- [x] Criar `docs/visao-projeto.html`.
- [x] Integrar Graphify como mapa tecnico vivo da documentacao.
- [x] Revisar README para apontar para a documentacao D.N.E.E.

### Fase 1 - Navegacao e arquitetura de produto

- [x] Redesenhar navegacao desktop por grupos de intencao.
- [x] Revisar mobile: manter poucos atalhos e um menu secundario claro.
- [x] Definir quais telas sao operacionais, analiticas, patrimoniais e configuracao.
- [x] Atualizar `AppView` apenas se a nova hierarquia exigir mudanca real de rotas.

Critérios de aceite:

- Usuario entende onde lancar, conferir, analisar e configurar.
- Itens de menor uso deixam de competir com Home/Central/Cartoes.
- Mobile continua confortavel.

### Fase 2 - Simplificacao do modal de lancamento

- [x] Separar fluxo por tipo: compra no cartao, despesa em conta, receita, transferencia e importacao.
- [x] Reduzir quantidade de campos visiveis no primeiro nivel.
- [x] Mostrar opcoes de parcela/fixa/serie no momento correto.
- [x] Garantir que edicao de parcelas/fixas mostre escopo antes de salvar.
- [x] Preservar lancamento rapido como entrada principal para gastos da semana.

Critérios de aceite:

- Fluxo comum de compra exige poucos passos.
- Reembolso/divisao continua disponivel, mas sem poluir caso comum.
- Parcelamento sempre mostra valor por parcela antes de salvar.
- Testes de `addEntryBuilder` e `addEntrySavePlan` continuam passando.

### Fase 3 - Limpeza visual e hierarquia

- [x] Criar ou consolidar tokens de superficie, borda, texto e acao.
- [x] Reduzir uso excessivo de `premium-card`, `cosmic-card`, gradients e radius grandes em Home, Relatorios e Central.
- [x] Padronizar listas operacionais com layout mais denso em Central do Mes.
- [x] Reservar cards destacados para resumos e decisoes na primeira passada visual.
- [x] Revisar cards aninhados em Cartoes, Transacoes e Contas na primeira passada visual.
- [x] Revisar cards aninhados restantes em Perfil, Metas, Caixinhas e Reembolsos.

Critérios de aceite:

- Tela parece mais limpa sem perder identidade premium.
- Informacao principal aparece antes de decoracao.
- Listas longas ficam mais escaneaveis.

### Fase 4 - Relatorios executivos

- [x] Separar Relatorios em `Mes`, `Ano` e `Patrimonio`.
- [x] Colocar respostas executivas antes dos graficos.
- [x] Manter detalhamento fixo/parcelado/variavel, mas com disclosure progressivo.
- [x] Revisar exportacao CSV para refletir os novos agrupamentos.

Critérios de aceite:

- Usuario entende se o mes foi bom ou ruim em menos de 10 segundos.
- Visao anual mostra sobra, meses positivos/negativos e patrimonio.
- Detalhes existem, mas nao competem com o resumo.

### Fase 5 - Central do Mes como cockpit de acao

- [x] Centralizar pagar fatura, pagar despesa de conta, receber reembolso e ignorar fixa.
- [x] Melhorar priorizacao por atraso, hoje e proximos dias.
- [x] Tornar fechamento do mes uma decisao guiada.
- [x] Evitar duplicidade mental com Home e Transacoes.

Critérios de aceite:

- Central responde "o que preciso resolver agora?".
- Home responde "como estou hoje?".
- Transacoes responde "qual registro explica isso?".

### Fase 6 - Substituir dialogs nativos

- [x] Trocar `window.confirm` por modal visual interno.
- [x] Trocar `window.prompt` por fluxo controlado.
- [x] Trocar `alert` por feedback inline/toast/modal.
- [x] Padronizar acoes perigosas.
- [x] Adicionar feedback visual curto para acoes financeiras bem sucedidas.

Critérios de aceite:

- Nenhuma acao financeira critica depende de confirmacao nativa do navegador.
- Usuario entende impacto antes de excluir, arquivar ou alterar serie.
- Observacao: o `prompt()` remanescente em PWA e a API nativa de instalacao (`installEvent.prompt()`), nao um dialog financeiro.

### Fase 7 - Refatoracao orientada pelo Graphify

- [ ] Reduzir centralidade de `App.tsx` extraindo orquestradores por dominio.
- [x] Iniciar reducao de centralidade extraindo dialogs/toasts para `useAppFeedback`.
- [x] Extrair `Cartões do mês` da Home para `DashboardCardsSection`.
- [ ] Reduzir complexidade de `AddEntryModal`.
- [ ] Quebrar `ReportsView`, `CardsView`, `MonthCenterView` e `AccountsView` em subcomponentes/hook menores.
- [ ] Atualizar Graphify apos cada bloco de refatoracao.
- [x] Atualizar Graphify apos a Fase 7A.
- [ ] Registrar mudancas de centralidade em `CHANGELOG_EVIDENCES.md`.

Critérios de aceite:

- Arquivos centrais ficam menores e com responsabilidade mais clara.
- Sem regressao em lint/test/build.
- Graphify nao aponta novos ciclos de importacao.

## Backlog priorizado

### P0 - Critico

- [ ] Resolver bloqueio de ambiente do Graphify/uv no Windows ou documentar workaround confiavel.
- [ ] Revalidar todos os fluxos de parcelamento, reembolso e importacao CSV apos mudancas recentes.
- [ ] Garantir que ajuste manual de saldo sempre cria lancamento explicativo quando houver diferenca.

### P1 - Produto

- [x] Reorganizar navegacao.
- [x] Simplificar modal de lancamento.
- [x] Reformatar Relatorios.
- [x] Consolidar Central do Mes.

### P2 - Visual

- [x] Reduzir excesso de cards/gradientes em Home, Relatorios e Central.
- [x] Uniformizar selects ricos para contas/cartoes.
- [x] Melhorar listas densas no desktop para Cartoes, Transacoes e Contas.
- [x] Refinar cartoes fisicos e faturas.
- [x] Adicionar toasts de feedback para estimular uso e confirmar acoes.

### P3 - Tecnico

- [x] Criar primeiro hook transversal para feedback/dialogs do App.
- [ ] Criar hooks por dominio para App.
- [ ] Criar componentes menores para telas grandes.
- [ ] Adicionar testes para importacao de fatura e ajustes de saldo.
- [ ] Revisar metadata em `notes` e criar helpers sempre que surgir regra nova.

## Bugs conhecidos

- [A VALIDAR] Ambiente local pode bloquear Graphify por `uv`/Python/cache.
- [A VALIDAR] Fluxos importados de fatura com reembolso precisam de mais testes de ponta a ponta.
- [A VALIDAR] Visual de algumas telas pode estar muito denso em telas pequenas.

## Debitos tecnicos

- `AddEntryModal` com muitos estados locais.
- `App.tsx` com muitos handlers financeiros.
- Dialogs nativos financeiros substituidos; manter auditoria para nao reintroduzir `window.confirm`, `window.prompt` ou `window.alert`.
- Varios documentos historicos ainda fora do padrao D.N.E.E.
- Graphify deve ser atualizado apos cada bloco de mudanca de codigo.

## Melhorias sugeridas

- Criar `docs/flows/` somente se o projeto crescer alem dos quatro documentos principais.
- Criar checklist de QA manual por fluxo financeiro.
- Criar "modo conferencia" para fatura importada.
- Criar historico de auditoria financeiro para acoes sensiveis.

## Proximas acoes

1. Validar a navegacao reorganizada no uso real.
2. Validar Fase 4A em uso real: leitura de Mes, Ano, Patrimonio e CSV.
3. Validar Fase 5 no uso real: resolver faturas, contas, reembolsos e fixas sem sair da Central.
4. Validar Fase 6 no uso real: exclusoes, arquivamentos, series fixas e metas devem usar modal interno.
5. Continuar Fase 7: extrair blocos grandes sem mudar regra financeira.
6. Executar uma tarefa por vez seguindo Descobrir, Nortear, Especificar e Evidenciar.

## Pontos a complementar

- [A VALIDAR] Quais telas mais incomodam no uso diario real.
- [A VALIDAR] Se a pagina visual D.N.E.E. deve ser aberta via arquivo local ou publicada junto ao app.

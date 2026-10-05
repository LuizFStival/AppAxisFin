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
- [x] Extrair apresentacao, labels e resumo de impacto do `AddEntryModal` para helper puro.
- [x] Extrair contexto derivado de fluxo do `AddEntryModal` para helper puro.
- [x] Extrair regras de submit, criacao de categoria/pessoa e categorias de sistema para helper puro.
- [ ] Continuar reducao de complexidade de `AddEntryModal` separando handlers assíncronos em hook de orquestracao.
- [ ] Quebrar `ReportsView`, `CardsView`, `MonthCenterView` e `AccountsView` em subcomponentes/hook menores.
- [x] Atualizar Graphify apos cada bloco de refatoracao concluido nesta rodada.
- [x] Atualizar Graphify apos a Fase 7A.
- [x] Registrar mudancas de centralidade em `CHANGELOG_EVIDENCES.md`.

Critérios de aceite:

- Arquivos centrais ficam menores e com responsabilidade mais clara.
- Sem regressao em lint/test/build.
- Graphify nao aponta novos ciclos de importacao.

### Fase 8 - Variacao patrimonial e confianca do saldo

- [x] Criar indicador de variacao patrimonial mensal: patrimonio fim - patrimonio inicio - aportes externos.
- [x] Exibir resposta executiva: "Seu caixa cresceu/caiu R$ X este mes".
- [x] Separar resultado de competencia de variacao de patrimonio, para casos de saque/resgate de caixinha.
- [x] Exibir badge de saldo desatualizado quando a conferencia da conta passar de 7 dias.
- [x] Alertar quando o total de patrimonio misturar contas conferidas em datas diferentes.

Critérios de aceite:

- Usuario entende se o patrimonio cresceu ou caiu mesmo quando o resultado do mes foi deficitario.
- Cada conta deixa clara sua data de conferencia.
- Total consolidado nao parece uma foto unica quando as datas forem diferentes.

### Fase 9 - Compromissos futuros e parcelas

- [x] Criar painel de compromisso futuro.
- [x] Exibir total comprometido em parcelas futuras.
- [x] Exibir projecao mes a mes ate a ultima parcela.
- [x] Exibir o mes em que o compromisso zera.
- [x] Mostrar alerta de impacto no fluxo mensal e no total comprometido ao registrar parcelamento.

Critérios de aceite:

- Usuario sabe quanto ja assumiu para os proximos meses.
- Ao criar uma compra parcelada, o app mostra o valor por parcela e o impacto futuro antes de salvar.
- Parcelas futuras nao ficam escondidas dentro da lista do mes atual.

### Fase 10 - Natureza das parcelas e qualidade do gasto

- [x] Classificar parcela por natureza: essencial, bem duravel ou superfluo.
- [x] Permitir editar a natureza nas parcelas existentes.
- [x] Exibir composicao do comprometimento por natureza.
- [x] Mostrar percentual de compromissos essenciais/duraveis vs superfluos.
- [x] Exibir qualidade do gasto do mes em Relatorios.
- [x] Incluir natureza da despesa na prova real CSV mensal.

Critérios de aceite:

- Usuario consegue responder quanto do comprometimento futuro e necessidade, patrimonio de uso ou escolha superflua.
- Relatorios e Central do Mes conseguem destacar quando superfluos comprometem meses futuros.

### Fase 11 - Evento/Projeto em todos os lancamentos

- [ ] Disponibilizar campo Evento/Projeto em qualquer lancamento, nao apenas em reembolsaveis.
- [ ] Reutilizar eventos existentes e permitir criar novo evento no fluxo de lancamento.
- [ ] Exibir evento nas listas de transacoes, faturas e relatorios.
- [ ] Criar filtro "excluir eventos" em comparativos mes a mes.

Critérios de aceite:

- Viagens, projetos e gastos extraordinarios deixam de inflar categorias recorrentes.
- Usuario consegue comparar rotina normal com e sem eventos.

### Fase 12 - Comparativos executivos com eventos

- [ ] Criar comparativo mes a mes por categoria.
- [ ] Permitir alternar comparativo com eventos e sem eventos.
- [ ] Destacar maiores variacoes de categoria entre meses.
- [ ] Distinguir meta de investimento realizada por sobra real do mes vs realocacao de caixa.

Critérios de aceite:

- Usuario entende para onde o dinheiro foi em relacao aos meses anteriores.
- Aporte em investimento deixa claro se veio de sobra real ou apenas movimentacao de caixa.

### Fase 13 - Exportacao CSV multi-mes

- [ ] Permitir selecionar mais de um mes no Relatorio antes de baixar CSV.
- [ ] Oferecer atalhos: 3 meses, 4 meses, 5 meses, 6 meses e periodo personalizado.
- [ ] Exportar uma prova real consolidada por mes, mantendo os blocos atuais: receita propria, despesa propria, faturas, debitos, pagamentos de fatura, reembolsos, transferencias internas e patrimonio.
- [ ] Incluir aba/bloco de resumo consolidado do periodo.

Critérios de aceite:

- Usuario consegue baixar varios meses sem repetir exportacao manual mes a mes.
- Cada mes continua auditavel individualmente.
- O consolidado mostra totais do periodo sem misturar reembolso, transferencia interna e receita propria.

## Backlog priorizado

### P0 - Critico

- [x] Separar transferencia interna de receita/despesa no resultado mensal.
- [x] Separar receita propria de reembolso esperado em relatorios, transacoes e CSV de prova real.
- [x] Documentar workaround confiavel do Graphify/uv no Windows.
- [x] Revalidar fluxos de parcelamento, reembolso e importacao CSV cobertos por testes automatizados.
- [x] Confirmar que ajuste manual de saldo cria lancamento explicativo quando houver diferenca.
- [x] Permitir aplicacao em caixinha mesmo quando o saldo cadastrado da conta estiver defasado, com aviso de conta negativa no app.
- [x] Corrigir filtros e breakdowns para pagamento de fatura nao duplicar gasto pessoal da competencia.

### P1 - Produto

- [x] Fase 8: indicador de variacao patrimonial mensal e badge de saldo desatualizado.
- [x] Fase 9: painel de compromisso futuro e impacto de parcelamento.
- [x] Fase 10: natureza das parcelas.
- [ ] Fase 11: evento/projeto em todos os lancamentos.
- [ ] Fase 12: comparativos executivos com e sem eventos.
- [ ] Fase 13: exportacao CSV multi-mes.
- [x] Reorganizar navegacao.
- [x] Simplificar modal de lancamento.
- [x] Reformatar Relatorios.
- [x] Transformar download de Relatorios em prova real mensal com faturas, debitos, entradas, reembolsos e patrimonio.
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
- [x] Revalidar testes existentes para importacao de fatura e ajustes de saldo.
- [ ] Revisar metadata em `notes` e criar helpers sempre que surgir regra nova.

## Bugs conhecidos

- [A VALIDAR] Sandbox pode bloquear Graphify por `_socket`; workaround Windows usa `uvx.exe --no-cache` via `npm.cmd run graphify:src` fora do sandbox/aprovado.
- [A VALIDAR] Fluxos importados de fatura com reembolso precisam de mais testes de ponta a ponta.
- [A VALIDAR] Visual de algumas telas pode estar muito denso em telas pequenas.

## Debitos tecnicos

- `AddEntryModal` ainda tem muitos estados locais e handlers assíncronos, apesar de ja ter helpers para regras, salvamento, apresentacao, contexto de fluxo, validacao de submit e subcomponentes visuais.
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

1. Executar Fase 11: evento/projeto em todos os lancamentos.
2. Executar Fase 12: comparativos executivos com e sem eventos.
3. Executar Fase 13: exportacao CSV multi-mes.
4. Continuar Fase 7 em paralelo apenas quando a mudanca tocar arquivos centrais demais.
5. Executar uma tarefa por vez seguindo Descobrir, Nortear, Especificar e Evidenciar.

## Pontos a complementar

- [A VALIDAR] Quais telas mais incomodam no uso diario real.
- [A VALIDAR] Se a pagina visual D.N.E.E. deve ser aberta via arquivo local ou publicada junto ao app.

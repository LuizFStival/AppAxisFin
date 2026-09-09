# AxisFin Graphify Map

Atualizado em 2026-09-09 a partir de `src/graphify-out/GRAPH_REPORT.md`.

## Resultado do Mapeamento

- Escopo analisado: `src/`
- Arquivos de código: 93
- Nós no grafo: 745
- Conexões: 2483
- Comunidades: 27
- Custo de tokens: 0 input / 0 output
- Ciclos de importação: nenhum detectado

O Graphify foi aplicado apenas em `src/` para evitar leitura de arquivos sensíveis, `.env`, caches e artefatos de build.

## Núcleos do App

1. `readTransactionMeta()` concentra regras transversais de lançamentos, reembolsos, parcelas, natureza da despesa e metadados financeiros.
2. `Transaction`, `Card` e `Account` continuam sendo as entidades centrais do produto.
3. `AddEntryModal()` é um ponto de complexidade alto, porque mistura captura, classificação, origem, parcelamento, reembolso, estorno e persistência.
4. `MonthCenterView()` virou um segundo núcleo operacional, conectado a pagamentos, vencimentos, reembolsos e fechamento mensal.
5. `getUserFriendlyError()` cruza muitas áreas e deve continuar padronizando mensagens para não expor erro técnico ao usuário.

## Leitura de Produto

O mapa confirma que o AxisFin já tem base de aplicativo financeiro pessoal completo: lançamentos, cartões, contas, reembolsos, metas, relatórios, central mensal e persistência Supabase. A próxima evolução não deve ser adicionar muitas telas soltas, e sim organizar melhor os fluxos que já existem.

Prioridades sugeridas:

1. Separar a lógica de lançamento em módulos menores: criação simples, cartão, conta, parcelada, fixa, reembolso e estorno.
2. Consolidar `MonthCenterView` como central de ação: pagar, ignorar ocorrência fixa, cobrar reembolso, carregar pendência e fechar mês.
3. Transformar `finance.ts` em módulos por domínio, mantendo uma fachada única para cálculos usados pelas telas.
4. Reduzir dependência direta de metadados textuais nos fluxos críticos, criando helpers mais explícitos para reembolso, recorrência e fatura.
5. Criar testes focados em cenários reais do usuário: compra parcelada editada, despesa fixa ignorada no mês, pagamento parcial de terceiro e pagamento de fatura.

## Rodadas Aplicadas

### 2026-09-07

- Extraídas regras do modal de lançamento para `src/components/transactions/addEntryRules.ts`.
- Extraídas regras da Central do Mês para `src/components/month-center/monthCenterRules.ts`.
- Generalizado `runAppAction` para aceitar ações com retorno, preservando mensagens amigáveis.
- Atualizado o grafo incremental com `npm.cmd run graphify:src`.
- Extraídos subcomponentes visuais do modal de lançamento: `QuickEntry`, `ExpenseOptions`, `ReimbursementFields` e `SourceSelector`.
- Reduzida a centralidade visual do `AddEntryModal`, que passa a orquestrar estado e regras enquanto os blocos cuidam da interface.
- Regerado o grafo incremental: 626 nós, 2087 conexões e 27 comunidades.
- Separado o builder de lançamentos em `src/components/transactions/addEntryBuilder.ts`, cobrindo transação simples, parcelada, dividida, rápida e transferência.
- Criados helpers explícitos em `transactionMeta.ts` para reduzir leitura direta de metadados textuais.
- Consolidada parte das regras da Central do Mês em helpers puros: fixas, parceladas, reembolsos pendentes, agrupamento por pessoa e filtro meu/terceiros.
- Adicionados testes para `addEntryBuilder` e `monthCenterRules`.
- Regerado o grafo incremental: 657 nós, 2209 conexões e 23 comunidades.

### 2026-09-08

- Separado no dashboard o `Caixa do mês` do `Resultado pessoal`, reduzindo ambiguidade entre fluxo real de conta e competência mensal.
- Detalhada a fórmula do resultado pessoal no card da meta de investimento.
- Regerado o grafo incremental: 657 nós, 2202 conexões e 19 comunidades.
- O `AddEntryModal` segue como núcleo relevante, mas já aparece com menos centralidade após a extração de builder, regras e subcomponentes visuais.
- Extraído o plano de salvamento para `src/components/transactions/addEntrySavePlan.ts`, separando o comportamento de transferência, edição, fixa, parcelada, compartilhada e recorrente.
- Extraído o checklist de fechamento para `buildMonthClosingChecklist()`, preparando a Central do Mês para uma regra persistida de fechamento mensal.
- Criados helpers semânticos para metadados de transação, reduzindo leituras diretas de `notes/meta` em pontos da Central do Mês.
- Adicionados testes para o plano de salvamento e para a regra de fechamento.
- Regerado o grafo incremental: 683 nós, 2272 conexões e 26 comunidades.
- Corrigida a ação `Não usei` para remover a ocorrência fixa imediatamente do estado local após gravar a exclusão na regra recorrente.
- Regerado o grafo incremental: 684 nós, 2276 conexões e 25 comunidades.
- Adicionado arquivamento/desarquivamento de contas e cartões, mantendo histórico e escondendo itens inativos dos fluxos principais.
- Ajustados repositórios, snapshot financeiro e telas de Contas, Cartões e Perfil para respeitar `is_active`.
- Atualizada a regra de unicidade para permitir reaproveitar nomes arquivados sem conflito entre itens ativos.
- Regerado o grafo incremental: 686 nós, 2280 conexões e 28 comunidades.

### 2026-09-09

- Criada a seção `Caixinhas e Reservas` para acompanhar reservas separadas do saldo disponível em conta corrente.
- Adicionado domínio de `ReserveBox` e `ReserveBoxMovement`, com saldo atual, CDI, instituição, objetivo, identificação visual e histórico.
- Criado helper de cálculo em `reserveBoxes.ts` para total consolidado, saldo esperado e rendimento CDI estimado.
- Adicionada integração na Home com bloco de resumo das caixinhas sem alterar o cálculo de caixa do mês.
- Criadas tabelas Supabase `reserve_boxes` e `reserve_box_movements`, com RLS, grants e trigger de atualização de saldo.
- Adicionados testes para regras de reserva e cobertura de segurança do schema.
- Regerado o grafo incremental: 738 nós, 2457 conexões e 25 comunidades.
- Adicionada atualização manual de saldo real nas contas correntes, com data de conferência separada das caixinhas.
- Criada migration para `accounts.last_balance_update`, mantendo histórico operacional de quando o saldo de conta foi conferido.
- Regerado o grafo incremental: 742 nós, 2475 conexões e 28 comunidades.
- Corrigida a compatibilidade do app quando o Supabase remoto ainda não tem as migrations de caixinhas e conferência de saldo.
- O carregamento principal agora ignora temporariamente `reserve_boxes` ausente e cai para o formato antigo de `accounts` quando `last_balance_update` ainda não existe.
- Regerado o grafo incremental: 745 nós, 2483 conexões e 27 comunidades.

## Funcionalidades Para Reorganizar

### Lançamentos

- Manter lançamento rápido por texto/voz como entrada principal para gastos da semana.
- Deixar lançamento manual como modo detalhado.
- Separar comportamento por tipo: cartão, conta, fixa e parcelada.
- Revisar o modal para que campos avançados só apareçam quando ativados.

### Central do Mês

- Virar a tela principal de decisão: o que pagar, o que cobrar, o que ignorar e se o mês pode ser fechado.
- Agrupar pendências por prioridade e vencimento.
- Exibir reembolsos por pessoa, com parcial recebido e saldo pendente.
- Permitir ações diretas sem navegar para outra tela.

### Reembolsos

- Tratar pagamento parcial como fluxo nativo.
- Levar pendência para mês seguinte manualmente ou por regra de data.
- Mostrar histórico por pessoa.
- Destacar valores antigos que não podem ficar esquecidos.

### Evolução Financeira

- Responder perguntas práticas na home e relatórios:
  - quanto ainda posso gastar este mês?
  - quais despesas estão pesando?
  - o que é meu e o que é de terceiros?
  - este mês foi melhor ou pior que o anterior?
  - quais gastos supérfluos podem ser cortados?

## Comando

Para atualizar o mapa local:

```bash
npm.cmd run graphify:src
```

Saídas locais:

- `src/graphify-out/graph.html`
- `src/graphify-out/GRAPH_REPORT.md`
- `src/graphify-out/graph.json`

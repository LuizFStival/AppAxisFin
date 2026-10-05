# AxisFin - Sobre o projeto

## Em uma frase

AxisFin e um app financeiro pessoal para transformar contas, cartoes, caixinhas, reembolsos e compromissos em uma visao simples do que aconteceu, do que precisa ser resolvido e do que esta sobrando.

## Problema que resolve

O usuario precisa controlar dinheiro real em varias contas, cartoes e reservas sem confundir caixa disponivel, competencia mensal, fatura, valores de terceiros, parcelamentos e reembolsos.

O problema atual nao e apenas registrar lancamentos. O desafio e responder rapidamente:

- Quanto tenho hoje?
- Quanto realmente ganhei?
- Para onde meu dinheiro foi?
- O que ainda preciso pagar?
- O que falta receber de terceiros?
- Meu caixa cresceu ou caiu neste mes?
- O mes esta saudável ou estou gastando mais do que deveria?
- Meu patrimonio esta evoluindo?
- Quais fluxos estao complexos demais no produto?

## Para quem e

Principalmente para uso pessoal do Luiz, com possibilidade de evoluir para um produto financeiro pessoal mobile-first.

Perfil de uso atual:

- pessoa com multiplas contas bancarias;
- cartoes com ciclos de fatura diferentes;
- caixinhas/reservas separadas do caixa disponivel;
- despesas compartilhadas e reembolsos;
- necessidade de relatorios mensais e anuais;
- preferencia por uma experiencia visual premium, mas objetiva.

## O que faz hoje

- Autenticacao e persistencia via Supabase.
- Dashboard com saldo, entradas, saidas, resultado, contas, cartoes e caixinhas.
- Lancamentos de receita, despesa, transferencia, despesa fixa e despesa parcelada.
- Cartoes com faturas por ciclo, pagamento de fatura, ordenacao manual e importacao CSV Nubank.
- Contas com saldo atual, movimentos, transferencias e ajuste manual de saldo.
- Caixinhas com movimentacoes, aplicacao, retirada, rendimento e vinculo opcional com conta.
- Reembolsos por pessoa, status, valores pendentes/recebidos e recebimento parcial.
- Metas e compromissos financeiros.
- Relatorios com escopo geral/pessoal, fixo/parcelado/variavel, patrimonio e visao anual.
- Resultado mensal separando receita propria, despesa propria, contas a receber e transferencias internas.
- Variacao patrimonial estimada e alerta de confianca do saldo quando contas/caixinhas estao desatualizadas ou conferidas em datas diferentes.
- Painel de compromissos futuros com parcelas ja assumidas, projecao por mes e mes em que o compromisso zera.
- Natureza de gasto como essencial, bem duravel ou superfluo em lancamentos, compromissos futuros, Relatorios e CSV de prova real.
- Notificacoes de pendencias.
- Perfil com preferencias, categorias, exportacao e reset.

## Funcionalidades prontas

- Supabase como fonte de verdade dos dados financeiros.
- Regras financeiras centrais testadas em utilitarios.
- RLS e migrations para tabelas financeiras.
- Graphify aplicado em `src/` para mapear arquitetura, comunidades e pontos de complexidade.
- Documentos de estudo visual e mapa tecnico em `docs/`.

## Funcionalidades parciais

- Importacao de fatura Nubank ja existe, mas ainda precisa amadurecer investigacao/conciliação manual e experiencia de lote.
- Ajuste de saldo cria lancamento financeiro para diferenca, mas o fluxo ainda precisa ser validado com uso real.
- Relatorio anual/patrimonial existe e ja diferencia resultado de competencia de variacao patrimonial; ainda pode evoluir em comparativos e historico.
- Relatorios exportam prova real mensal, mas ainda precisam permitir exportacao multi-mes.
- Central do Mes ja organiza acoes, mas ainda disputa papel com Home, Transacoes e Relatorios.
- O modal de lancamento e completo, mas esta denso demais.

## Hipotese de valor

Se o AxisFin reduzir a friccao de registrar, conferir e decidir, o usuario passa a confiar mais nos numeros e consegue fechar o mes com menos retrabalho.

Valor esperado:

- menos tempo conferindo faturas e contas;
- menos risco de reembolso esquecido;
- mais clareza entre gasto pessoal e valor de terceiro;
- melhor visao de sobra, patrimonio e metas;
- menor custo mental para manter o app atualizado.

## Discovery resumido

Raio-X feito em 2026-09-30:

- O app esta funcionalmente rico.
- Os gargalos principais sao hierarquia, densidade visual e concentracao de fluxo.
- O maior ponto de complexidade e `AddEntryModal`.
- O Graphify aponta `App()`, `readTransactionMeta()`, `MonthCenterView()`, `CardsView`, `ReportsView` e `finance.ts` como nucleos de alta centralidade.
- A prioridade deve ser organizar a experiencia antes de adicionar novas telas.

## Pitch em 30 segundos

AxisFin e um painel financeiro pessoal que separa o dinheiro real em conta, os gastos por competencia, as faturas do cartao, as caixinhas e os valores de terceiros. Ele ajuda a saber o que pagar, o que cobrar, o que sobrou, onde o dinheiro esta indo e se o patrimonio esta evoluindo.

## Momento atual

Momento de consolidacao de produto.

O app ja tem muitas funcionalidades reais. A proxima fase deve reduzir ruido, melhorar fluxos e documentar decisoes para evitar retrabalho com IA.

## Mapa da documentacao

- `docs/SOBRE.md`: visao de produto e contexto de negocio.
- `docs/SDD.md`: norte tecnico, regras, fluxos e arquitetura.
- `docs/ROADMAP.md`: plano de acao, backlog e prioridades.
- `docs/CHANGELOG_EVIDENCES.md`: decisoes, evidencias e historico.
- `docs/visao-projeto.html`: leitura visual em 4 abas.
- `docs/axisfin-graphify-map.md`: historico tecnico do Graphify.
- `src/graphify-out/GRAPH_REPORT.md`: relatorio tecnico gerado pelo Graphify.
- `src/graphify-out/graph.html`: grafo interativo local.

## Pontos a complementar

- [A VALIDAR] Se o AxisFin sera apenas uso pessoal ou produto compartilhavel.
- [A VALIDAR] Quais metricas reais de sucesso serao acompanhadas: tempo de fechamento do mes, divergencia de saldo, quantidade de reembolsos atrasados, uso semanal.
- [A VALIDAR] Qual sera a hierarquia final da navegacao depois da simplificacao.

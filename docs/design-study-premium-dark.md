# Estudo de redesign: AxisFin Premium Dark

## Referencias visuais

As imagens anexadas apontam para uma estetica mobile-first, escura e premium, com sensacao de produto financeiro/gamificado. A linguagem visual e menos "dashboard SaaS" e mais "painel pessoal de controle": grafite, metal, vidro fosco, alto contraste controlado, cards com borda luminosa sutil e uma navegacao inferior em capsula.

## Direcao criativa

O AxisFin pode evoluir para uma identidade mais sofisticada sem perder clareza financeira. A base deve ser escura, com superfícies em camadas e poucos acentos fortes. Em vez de muitas cores competindo, cada tela deve ter um acento funcional:

- Home: branco/prata com acentos ciano para saldo e leitura geral.
- Cartoes/fatura: violeta ou azul frio, com detalhes metalicos.
- Reembolsos: amber/dourado, mantendo associacao com terceiros.
- Metas: verde ou esmeralda, com progresso em destaque.
- Alertas/pendencias: vermelho apenas para risco real.

## Principios de UI

1. Mobile primeiro, web por densidade

O modelo anexado funciona porque a tela principal parece uma experiencia nativa. Para o AxisFin, mobile deve ser a referencia visual primaria; no web, o layout pode expandir em colunas, mas mantendo a mesma linguagem de cards e navegacao.

2. Profundidade sem poluicao

Usar cards com fundo preto/grafite, borda `rgba(255,255,255,.08)`, sombra interna e brilho sutil no topo. Evitar gradientes coloridos grandes. A profundidade deve vir de luz, contraste e materiais, nao de excesso de cor.

3. Hierarquia financeira clara

Saldo, fatura, gastos do mes e reembolsos precisam aparecer como "instrumentos" de controle. Cada card deve responder uma pergunta rapidamente: quanto tenho, quanto devo, o que falta conferir, o que esta pendente.

4. Navegacao como objeto

Adotar uma bottom nav em capsula no mobile, inspirada na segunda referencia:

- item ativo em circulo escuro/preto com icone e label forte;
- itens inativos em cinza/prata;
- botao `Adicionar` separado, mais escuro, com simbolo `+`;
- no web, manter sidebar, mas aproximar visualmente: itens compactos, icones metalicos e estado ativo com superficie elevada.

## Tokens sugeridos

```css
:root {
  --axis-bg: #050607;
  --axis-surface: #0d0f11;
  --axis-surface-raised: #151719;
  --axis-border: rgba(255, 255, 255, 0.09);
  --axis-border-strong: rgba(255, 255, 255, 0.18);
  --axis-text: #f4f4f5;
  --axis-muted: #8d9096;
  --axis-soft: #c9cbd1;
  --axis-cyan: #69d2ff;
  --axis-violet: #9d8cff;
  --axis-amber: #d6b15d;
  --axis-green: #58d68d;
  --axis-danger: #ff6b7a;
}
```

## Componentes principais

### Home

- Topo limpo com saudacao pequena, avatar e notificacoes.
- Hero financeiro mais imersivo: saldo atual central, com selo/insignia discreta do AxisFin.
- Grid de estatisticas em cards: `Receitas`, `Despesas`, `Resultado`, `Dos outros`.
- Cards devem ter altura consistente e informacao compacta.

### Fatura/cartoes

- Fatura como lista de conferencia, mais parecida com extrato premium.
- Ordem manual deve ser tratada como parte da experiencia central: drag handle visivel, feedback de drop e estado "ordem salva".
- Despesas parceladas/fixas com badges pequenos e metalicos.

### Modal de lancamento

- O fluxo deve ser rapido, sem esconder decisoes essenciais.
- `Variavel / Fixa / Parcelada` deve ficar no corpo principal para despesas.
- Campos avancados continuam recolhidos, mas apenas para coisas raras: descricao longa, criar categoria, final de recorrencia, ajustes especificos.
- Para edicao de fixa/parcela, `Apenas esta / Esta e proximas` deve aparecer antes de salvar.

### Reembolsos

- Pessoas como cards horizontais pequenos, com estado ativo bem evidente.
- Ao selecionar uma pessoa, a lista deve parecer "fechada" naquele contexto, com titulo `Despesas de X`.
- Valores de terceiros em amber/dourado; recebido em verde.

## Bottom navigation mobile

Proposta de itens:

- Home
- Analise
- Cartoes
- Metas
- Reembolsos
- Add separado

O modelo mostra uma capsula clara sobre fundo escuro. Para o AxisFin, uma versao mais coerente seria capsula grafite/prata:

- fundo da capsula: `rgba(245,245,245,.88)` ou `#e6e6e6` se quisermos contraste forte;
- ativo: circulo preto com label branco;
- inativos: icones cinza escuro;
- add: botao externo preto com borda sutil e `+` branco/dourado.

## Riscos

- Escurecer demais pode reduzir legibilidade em web.
- Visual metalico em excesso pode parecer jogo, nao app financeiro.
- Bottom nav com muitos itens pode apertar labels em celulares pequenos.
- Cards com brilho/sombra demais podem piorar performance se aplicados em listas longas.

## Plano de migracao

1. Criar tokens de tema em CSS e substituir cores soltas aos poucos.
2. Redesenhar BottomNavigation mobile como capsula, sem mexer nas rotas.
3. Redesenhar AppShell/sidebar web com a mesma linguagem visual.
4. Atualizar Home com novo hero financeiro e cards premium.
5. Atualizar fatura/cartoes com feedback de ordem salva.
6. Padronizar modais com superficies, botoes e inputs do novo tema.
7. Revisar relatorios por ultimo, porque sao telas densas e dependem de legibilidade.

## Primeira entrega sugerida

Comecar por navegacao e Home. Isso da impacto visual imediato sem arriscar regras financeiras. Depois migrar Cartoes/Fatura, porque e onde a experiencia de conferencia precisa ficar mais forte.

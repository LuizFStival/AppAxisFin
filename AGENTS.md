## graphify

This project has a source-code knowledge graph at `src/graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first use the Graphify outputs when `src/graphify-out/graph.json` exists. Use query/path/explain against that graph for relationships and focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty `src/graphify-out/` files are expected after incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `src/graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `src/graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `npm.cmd run graphify:src` to keep the graph current. This scans only `src/`, avoids env files, and uses AST-only extraction for code.

## D.N.E.E. Docs

This project uses the D.N.E.E. Docs structure in `docs/`.

Source of truth:
- `docs/SOBRE.md`
- `docs/SDD.md`
- `docs/ROADMAP.md`
- `docs/CHANGELOG_EVIDENCES.md`

Human visual overview:
- `docs/visao-projeto.html`

Rules:
- Before relevant product, financial-rule, architecture, navigation, or visual changes, read the four source Markdown files.
- Use the roadmap to pick and track work.
- Update the related Markdown files in the same cycle as the implementation.
- Register meaningful decisions/evidence in `docs/CHANGELOG_EVIDENCES.md`.
- Treat `docs/axisfin-graphify-map.md` and `src/graphify-out/GRAPH_REPORT.md` as technical-map references for refactors and audits.
- Use `[A VALIDAR]`, `[PERGUNTA AO RESPONSAVEL]`, or `[HIPOTESE - CONFIRMAR]` instead of inventing missing information.

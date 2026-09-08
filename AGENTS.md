## graphify

This project has a source-code knowledge graph at `src/graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first use the Graphify outputs when `src/graphify-out/graph.json` exists. Use query/path/explain against that graph for relationships and focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty `src/graphify-out/` files are expected after incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `src/graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `src/graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `npm.cmd run graphify:src` to keep the graph current. This scans only `src/`, avoids env files, and uses AST-only extraction for code.

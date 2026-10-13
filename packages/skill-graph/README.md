# @cr/skill-graph  (SOURCE OF TRUTH for nodes + edges)

**Owner: Gabe** (structure). Edits to skill_graph.json are deliberate and gated by the invariant test; anyone may propose an edge change, Gabe merges after the test passes.

`src/skill_graph.json` is authoritative for node identity, lifecycle status, product_scope (mvp/target/extended), hard prerequisite edges, item-family definitions, and the node->lesson_shell mapping. If any doc disagrees with this file, this file wins.

`test/graph_invariants.py` checks it: MVP prereq-closed, no cycles, counts consistent, every in-product node has a lesson shell. Run: `python3 test/graph_invariants.py src/skill_graph.json` (also wired into CI). Never hand-count node/lesson totals; run the test.

Human-readable companions live in /docs (Node_Spine_v4, Prereq_Edges_And_Hubs, MVP_Node_List, Lesson_Cluster_Sketch).

**Status:** the typed loader and accessors exist in `src/index.ts`, and the scaffold imports them directly. Keep every consumer on this loader rather than transcribing registry data.

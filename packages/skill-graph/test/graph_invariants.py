#!/usr/bin/env python3
"""
Graph + spec invariant checker for the calculus-readiness skill graph.

WHY THIS EXISTS: the MVP node set was mislabeled "dependency-closed" three
separate times because closure was checked against hand-typed prereq maps
instead of the real graph. The FIX: this script reads ONE machine-readable
source of truth (skill_graph.json) that the product also consumes, so a stale
transcribed copy can never gate a decision again.

All counts are COMPUTED from the data, never asserted, because asserted counts
are exactly what kept drifting ("40" vs "56" vs 50 vs 42).

Usage:  python3 graph_invariants.py [path/to/skill_graph.json]
Exit 0 = all invariants pass. Non-zero = at least one failed.
"""

import json
import sys
from collections import defaultdict

# Statuses that count as real nodes in the live graph (retired/cut excluded).
LIVE = {"active_mvp", "active_post_mvp", "secondary"}
EXPECTED_MVP_COUNT = 6


def load(path):
    with open(path) as f:
        return json.load(f)


def build(nodes):
    by_id = {n["id"]: n for n in nodes}
    prereqs = {n["id"]: set(n.get("prereqs", [])) for n in nodes}
    return by_id, prereqs


def hard_edges(nodes, item_family):
    """All hard edges from live nodes. Item-family nodes contribute their
    MVP-family prereqs if an mvp_family is declared, else no hard edge
    (their prereqs are per-family, resolved at authoring)."""
    edges = []
    for n in nodes:
        if n["status"] not in LIVE:
            continue
        nid = n["id"]
        if n.get("item_family"):
            fam = item_family.get(nid, {})
            mvp_fam = fam.get("mvp_family")
            if mvp_fam and mvp_fam in fam.get("families", {}):
                for p in fam["families"][mvp_fam]:
                    edges.append((p, nid))
            # else: no hard edge contributed (family resolved later)
        else:
            for p in n.get("prereqs", []):
                edges.append((p, nid))
    return edges


def topo_ok(nodes_set, succ):
    indeg = {n: 0 for n in nodes_set}
    for a in succ:
        for b in succ[a]:
            if b in indeg:
                indeg[b] += 1
    queue = [n for n in nodes_set if indeg[n] == 0]
    seen = 0
    while queue:
        n = queue.pop()
        seen += 1
        for b in succ.get(n, ()):
            if b in indeg:
                indeg[b] -= 1
                if indeg[b] == 0:
                    queue.append(b)
    remaining = [n for n in nodes_set if indeg[n] > 0]
    return seen == len(nodes_set), remaining


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "skill_graph.json"
    data = load(path)
    nodes = data["nodes"]
    item_family = data.get("item_family_nodes", {})
    by_id, prereqs = build(nodes)
    failures = []

    live_ids = {n["id"] for n in nodes if n["status"] in LIVE}
    mvp_ids = {n["id"] for n in nodes if n["status"] == "active_mvp"}
    failures_scope = []

    # --- computed counts (printed, never asserted in prose) ---
    counts = defaultdict(int)
    for n in nodes:
        counts[n["status"]] += 1
    print("Computed node counts by lifecycle status:")
    for s in sorted(counts):
        print(f"  {s:20} {counts[s]}")
    core = counts["active_mvp"] + counts["active_post_mvp"]
    print(f"  {'-> CORE (mvp+post)':20} {core}")
    print(f"  {'-> LIVE (incl 2ndary)':20} {len(live_ids)}")
    print()

    # --- product-scope + lesson-shell counts (computed, never asserted) ---
    if any("product_scope" in n for n in nodes):
        scope = defaultdict(int)
        for n in nodes:
            scope[n.get("product_scope", "UNSET")] += 1
        in_product = scope["mvp"] + scope["target"]
        mvp_shells = {n.get("lesson_shell") for n in nodes if n.get("product_scope") == "mvp"}
        all_shells = {n.get("lesson_shell") for n in nodes
                      if n.get("product_scope") in ("mvp", "target") and n.get("lesson_shell")}
        # populations labeled separately (not a bare "excluded: N")
        extended = scope.get("extended", 0)
        retired_cut = sum(1 for n in nodes if n["status"] in ("retired", "cut"))
        print("Product scope (populations):")
        print(f"  mvp             {scope.get('mvp',0)}")
        print(f"  target          {scope.get('target',0)}")
        print(f"  -> in-product   {in_product}")
        print(f"  extended        {extended}  (CORE-adjacent, not required for readiness)")
        print(f"  retired/cut     {retired_cut}  (dead IDs, not live nodes)")
        print(f"Lesson shells: MVP {len(mvp_shells)} / full target {len(all_shells)}")
        print()
        # invariants: in-product nodes need a shell; extended/excluded/dead must not have one
        for n in nodes:
            sc, sh = n.get("product_scope"), n.get("lesson_shell")
            if sc in ("mvp", "target") and not sh:
                failures_scope.append(f"{n['id']} is in-product ({sc}) but has no lesson_shell")
            if sc in ("extended", "excluded") and sh:
                failures_scope.append(f"{n['id']} is {sc} but has lesson_shell {sh}")

    # 1. Every prereq references an existing, live node (typo / dangling guard).
    for nid, ps in prereqs.items():
        if by_id[nid]["status"] not in LIVE:
            continue
        for p in ps:
            if p not in by_id:
                failures.append(f"{nid} lists prereq {p} which does not exist")
            elif by_id[p]["status"] not in LIVE:
                failures.append(f"{nid} depends on non-live node {p} ({by_id[p]['status']})")

    # 2. No cycles in the full live hard-edge graph.
    edges = hard_edges(nodes, item_family)
    succ = defaultdict(set)
    for a, b in edges:
        succ[a].add(b)
    ok, rem = topo_ok(live_ids, succ)
    if not ok:
        failures.append(f"Cycle detected in live graph; nodes stuck: {sorted(rem)}")

    # 3. MVP count matches the locked expectation.
    print(f"MVP node count: {len(mvp_ids)} (expected {EXPECTED_MVP_COUNT})")
    if len(mvp_ids) != EXPECTED_MVP_COUNT:
        failures.append(f"MVP count is {len(mvp_ids)}, expected {EXPECTED_MVP_COUNT}: {sorted(mvp_ids)}")

    # 4. MVP set is prereq-closed (every hard prereq of an MVP node is also MVP).
    missing = defaultdict(set)
    for n in nodes:
        if n["status"] != "active_mvp":
            continue
        nid = n["id"]
        if n.get("item_family"):
            fam = item_family.get(nid, {})
            req = set(fam.get("families", {}).get(fam.get("mvp_family"), [])) if fam.get("mvp_family") else set()
        else:
            req = prereqs[nid]
        for p in req:
            if p not in mvp_ids:
                missing[nid].add(p)
    if missing:
        detail = "; ".join(f"{k} needs {sorted(v)}" for k, v in sorted(missing.items()))
        failures.append(f"MVP set NOT dependency-closed: {detail}")

    # 5. MVP induced subgraph is itself completable in order (acyclic, self-contained).
    mvp_succ = defaultdict(set)
    for a, b in edges:
        if a in mvp_ids and b in mvp_ids:
            mvp_succ[a].add(b)
    ok2, rem2 = topo_ok(mvp_ids, mvp_succ)
    if not ok2:
        failures.append(f"MVP subgraph not orderable (internal cycle): {sorted(rem2)}")

    # 6. The two records of MVP membership name the SAME set, in both directions.
    #
    # A node's MVP membership is written down twice: `status: "active_mvp"` and
    # `product_scope: "mvp"`. Check 3 counts only the first, so until this check existed
    # a flip of product_scope alone moved NO invariant at all -- measured, not argued:
    # setting a post-MVP node's product_scope to "mvp", and clearing an MVP node's
    # product_scope to "target", each left this script exiting 0. That is the silent
    # half-promotion by which a later era's node drifts into the diagnostic's scope.
    #
    # Asserted as a set equality rather than a second count because a count constrains
    # size, not shape: a swap that promotes one node and demotes another leaves the
    # count at 6 and the composition wrong.
    scope_mvp_ids = {n["id"] for n in nodes if n.get("product_scope") == "mvp"}
    status_only = sorted(mvp_ids - scope_mvp_ids)
    scope_only = sorted(scope_mvp_ids - mvp_ids)
    print(f"MVP membership: {len(mvp_ids)} by status, {len(scope_mvp_ids)} by product_scope")
    if status_only:
        failures.append(
            "half-promoted, status active_mvp but product_scope is not mvp: "
            + ", ".join(f"{i} (scope {by_id[i].get('product_scope', 'UNSET')})" for i in status_only)
        )
    if scope_only:
        failures.append(
            "half-promoted, product_scope mvp but status is not active_mvp: "
            + ", ".join(f"{i} (status {by_id[i]['status']})" for i in scope_only)
        )

    # Floor under that equality, because two empty sets are equal and would report green
    # over a graph with no MVP at all. Derived from the graph rather than written down:
    # the MVP population is whatever carries either label, and it must be a non-empty
    # PROPER subset of the live nodes -- an MVP that is empty, or that has swallowed the
    # whole graph, is not a scope.
    mvp_labeled = mvp_ids | scope_mvp_ids
    if not mvp_labeled:
        failures.append(
            "no node carries either MVP label, so the set equality above holds over nothing"
        )
    elif len(mvp_labeled) >= len(live_ids):
        failures.append(
            f"{len(mvp_labeled)} of {len(live_ids)} live nodes are labeled MVP; the MVP "
            "scope is meant to be a proper subset of the live graph"
        )
    not_live = sorted(i for i in mvp_labeled if by_id[i]["status"] not in LIVE)
    if not_live:
        failures.append(f"labeled MVP but not a live node: {not_live}")

    failures.extend(failures_scope)

    if failures:
        print("\nINVARIANT FAILURES:")
        for f in failures:
            print(f"  FAIL: {f}")
        sys.exit(1)
    print(f"\nAll graph invariants PASS.  ({len(edges)} hard edges over {len(live_ids)} live nodes)")
    sys.exit(0)


if __name__ == "__main__":
    main()

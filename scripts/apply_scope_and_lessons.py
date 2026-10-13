#!/usr/bin/env python3
"""
One-shot migration: add `product_scope` and `lesson_shell` to every node in
skill_graph.json, so both the product target (48 nodes) and the lesson-shell
count are COMPUTED from the registry, never asserted in prose.

- product_scope: "mvp" | "target" | "extended" | "excluded"
    mvp    = the 6-node depth-first D1 scope (status active_mvp)
    target = in the product's 48-node build target (PRD 5.3), beyond MVP
    extended = live CORE node outside the product target (roadmap only)
    excluded = retired or cut ID
- lesson_shell: the lesson-build unit a node belongs to (fold-in model from
    Lesson_Cluster_Sketch.md, extended to all 48 target nodes). Excluded nodes
    get null. Multiple nodes sharing a shell = a fold-in (cheaper than a full build).

Run once; it rewrites skill_graph.json in place and prints the computed counts.
"""
import json
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "packages/skill-graph/src/skill_graph.json"

# The 48-node product target = PRD 5.3 enumeration (47 CORE + TRG.6 secondary).
TARGET_48 = set("""
CG.1 EL.1 EL.2 EL.3 EL.5 EL.6 EXP.1 FUN.1 FUN.2 FUN.3 FUN.4 FUN.5 FUN.6 FUN.7
FUN.8 FUN.9 LF.1 LF.2 LF.3 LIN.1 LIN.3 LIN.4 NUM.2 NUM.3 NUM.4 NUM.5 NUM.F NUM.S
POL.1 POL.2 POL.3 POL.4 POL.5 POL.6 RAD.1 RAD.2 RAT.1 RAT.2 RAT.3 RAT.4 RAT.5
TRG.1 TRG.2 TRG.3 TRG.4 TRG.5 TRG.6 TRG.8
""".split())

# Lesson-shell mapping. Extends the Lesson_Cluster_Sketch fold-in clusters
# (L1-L26) to the full 48-target. The 10 nodes beyond the old ~38-node sketch
# are marked NEW; fold-ins share a host shell, own-builds get a new shell.
# FIRST-PASS HYPOTHESIS, per the sketch: the team confirms once lesson format
# is defined. Heavily-shared shells (L2, L9, L11, L18) may split under real design.
NODE_TO_SHELL = {
    # L1-L19: base clusters from the sketch
    "NUM.S": "L1", "NUM.F": "L1",
    "NUM.2": "L2", "NUM.3": "L2", "NUM.4": "L2",
    "NUM.5": "L3",
    "EXP.1": "L4",
    "RAD.1": "L5", "RAD.2": "L5",           # RAD.2 NEW: folds into radicals shell
    "LIN.1": "L6", "LIN.4": "L6", "LIN.3": "L6",  # LIN.3 NEW: literal eqns fold into solve-linear
    "POL.1": "L7", "POL.2": "L7",
    "POL.3": "L8", "POL.4": "L8", "POL.5": "L8",
    "RAT.1": "L9", "RAT.3": "L9", "RAT.2": "L9", "RAT.4": "L9",  # RAT.2/4 NEW: fold into rational shell
    "CG.1": "L10",
    "FUN.1": "L11", "FUN.2": "L11",
    "FUN.4": "L12",
    "FUN.6": "L13", "FUN.5": "L13",
    "LF.1": "L14",
    "EL.1": "L15",
    "EL.3": "L16",
    "TRG.1": "L17",
    "TRG.2": "L18", "TRG.3": "L18",
    "TRG.4": "L19",
    # L20-L26: expansion + readiness-validity builds from the sketch
    "FUN.8": "L20",
    "FUN.9": "L21",
    "LF.2": "L22", "LF.3": "L22",           # LF.3 NEW: linear-model folds into lines shell
    "EL.5": "L23", "EL.6": "L23",
    "TRG.5": "L24",
    "FUN.7": "L25",
    "RAT.5": "L26",
    # L27-L31: the remaining NEW target nodes (own builds; distinct interactions)
    "POL.6": "L27",   # NEW: polynomial end-behavior (graph interpretation)
    "EL.2": "L28",    # NEW: graph exponential functions (rides graphing component)
    "FUN.3": "L29",   # NEW: piecewise functions (distinct interaction)
    "TRG.6": "L30",   # NEW: graph tangent/reciprocal (secondary; rides graphing component)
    "TRG.8": "L31",   # NEW: solve trig equations (solving is its own interaction)
}


def main():
    with PATH.open(encoding="utf-8") as registry_file:
        data = json.load(registry_file)
    for n in data["nodes"]:
        nid, status = n["id"], n["status"]
        if status == "active_mvp":
            n["product_scope"] = "mvp"
        elif nid in TARGET_48:
            n["product_scope"] = "target"
        elif status == "active_post_mvp":
            n["product_scope"] = "extended"
        else:  # retired / cut
            n["product_scope"] = "excluded"
        # lesson shell only for in-product nodes
        if n["product_scope"] in ("mvp", "target"):
            shell = NODE_TO_SHELL.get(nid)
            n["lesson_shell"] = shell
            if shell is None:
                print(f"WARNING: in-product node {nid} has no lesson_shell assigned")
        else:
            n["lesson_shell"] = None

    # record the mapping decision in _meta
    data["_meta"]["product_scope_note"] = (
        "product_scope: mvp (6) + target (42) = 48-node product build target "
        "(PRD 5.3); extended = the 9 CORE nodes outside the product (roadmap only). "
        "lesson_shell encodes the fold-in model (Lesson_Cluster_Sketch.md, extended "
        "to all 48). Shell count is computed by count_lessons(), never asserted. "
        "Shared shells are fold-ins; first-pass hypothesis, team confirms at design."
    )

    with PATH.open("w", encoding="utf-8") as registry_file:
        json.dump(data, registry_file, indent=2)
        registry_file.write("\n")

    # computed counts
    scope = {}
    for n in data["nodes"]:
        scope[n["product_scope"]] = scope.get(n["product_scope"], 0) + 1
    mvp_shells = {n["lesson_shell"] for n in data["nodes"] if n["product_scope"] == "mvp"}
    all_shells = {n["lesson_shell"] for n in data["nodes"]
                  if n["product_scope"] in ("mvp", "target") and n["lesson_shell"]}
    print("product_scope counts:", scope)
    print(f"in-product nodes (mvp+target): {scope.get('mvp',0)+scope.get('target',0)}")
    print(f"MVP: {scope.get('mvp', 0)} nodes -> {len(mvp_shells)} lesson shells  {sorted(mvp_shells)}")
    print(f"Full product target: 48 nodes -> {len(all_shells)} lesson shells")


if __name__ == "__main__":
    main()

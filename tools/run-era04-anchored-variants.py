import json
import os
import subprocess
import sys
from pathlib import Path

base = Path(r"C:\Users\<user>\Downloads\calc-readiness\output\imagegen\era-04-succession-crisis-scenes")
jsonl = base / "imagegen-run-sheet.jsonl"
script = Path(r"C:\Users\<user>\.codex\skills\.system\imagegen\scripts\image_gen.py")

rows = {}
for line in jsonl.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line:
        continue
    obj = json.loads(line)
    rows[Path(obj["out"]).name] = obj

anchor_for = {
    "plinth-standing-figure.png": "plinth-bare.png",
    "plinth-seated-figure.png": "plinth-bare.png",
    "plinth-block-hoisted.png": "plinth-bare.png",
    "plinth-standing-figure-proposed.png": "plinth-bare.png",
    "drift-block-at-the-foot.png": "plinth-bare.png",
    "boundary-stone-chevron.png": "boundary-stone-unmarked.png",
    "boundary-stone-ring.png": "boundary-stone-unmarked.png",
    "boundary-stone-both.png": "boundary-stone-unmarked.png",
    "civic-building-shuttered.png": "civic-building-open.png",
    "civic-building-inscription.png": "civic-building-open.png",
    "civic-building-inscription-proposed.png": "civic-building-open.png",
    "counting-slab-one-row.png": "counting-slab-empty.png",
    "counting-slab-second-row.png": "counting-slab-empty.png",
    "counter-in-the-pedestal-socket.png": "counting-slab-empty.png",
}

missing = [k for k in anchor_for if k not in rows]
if missing:
    raise SystemExit(f"Missing prompts for: {missing}")

env = os.environ.copy()
if not env.get("OPENAI_API_KEY") and env.get("TFY_API_KEY"):
    env["OPENAI_API_KEY"] = env["TFY_API_KEY"]
env.setdefault("OPENAI_BASE_URL", "https://tfy.promptlens.trilogy.com")

for target_name, anchor_name in anchor_for.items():
    target_path = base / target_name
    anchor_path = base / anchor_name
    prompt = rows[target_name]["prompt"]

    cmd = [
        sys.executable,
        str(script),
        "edit",
        "--image",
        str(anchor_path),
        "--prompt",
        prompt,
        "--size",
        "1248x1248",
        "--out",
        str(target_path),
        "--force",
    ]

    print(f"\n=== {target_name} <= {anchor_name} ===")
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        raise SystemExit(result.returncode)

print("\nCompleted all 14 anchored variant edits.")

#!/usr/bin/env python3
"""Replace whole strings inside a lesson pack without reformatting the rest of it.

`json.dump` re-wraps the `visuals` array, so an edit made by loading and dumping shows up
in review as a diff over the whole file. This swaps the JSON-encoded form of one string
for another directly in the text, which touches exactly the line that changed.

Usage: import `swap(path, pairs)` from a one-off script.
"""

import json
import pathlib
import sys


def swap(path: str, pairs: list[tuple[str, str]]) -> None:
    p = pathlib.Path(path)
    raw = p.read_text()
    for old, new in pairs:
        old_json = json.dumps(old, ensure_ascii=False)
        new_json = json.dumps(new, ensure_ascii=False)
        count = raw.count(old_json)
        if count != 1:
            sys.exit(f"{path}: expected 1 match, found {count} for: {old[:70]}...")
        raw = raw.replace(old_json, new_json, 1)
    p.write_text(raw)
    json.loads(raw)
    print(f"edited {path}: {len(pairs)} string(s)")

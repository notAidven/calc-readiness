import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NO SHIPPED BUILDING MODEL CARRIES A VERTEX-COLOUR ATTRIBUTE, AND THE RENDERER DEPENDS ON
 * THAT BEING MEASURED RATHER THAN REMEMBERED.**
 *
 * In three.js, `vertexColors: true` over geometry with no `color` attribute renders **BLACK**:
 * the shader declares `attribute vec3 color`, WebGL supplies `(0, 0, 0)` for one the geometry
 * does not have, and the diffuse term is multiplied by it. Nothing throws, the material
 * compiles, the draw call is submitted and the triangle count is right — so every assertion
 * except one about pixels passes.
 *
 * The hard winter's frost treatment (`apps/web/src/city/three/winterFrost.ts`) wants that flag,
 * because the rime rides in on the colour attribute. It is therefore built to write the
 * attribute before it turns the flag on, and `winterFrost.test.ts` holds it to that. **This file
 * holds the premise underneath both**: that the attribute really is absent from the models, so
 * a treatment which merely assumed it was present would have blacked out every building in the
 * settlement the moment the crisis started.
 *
 * ## Why the census and not a note
 *
 * "No GLB has COLOR_0" is a fact about 43 binary files that nothing in the TypeScript tree can
 * see. Written as a comment it is true until someone re-exports a model from a tool that
 * happens to bake vertex colours — at which point the frost treatment's `toNonIndexed()` and
 * its own attribute would silently overwrite art that had been authored, which is a different
 * bug and a quieter one. Either direction is worth failing on, so the assertion is set
 * EQUALITY over the attribute set rather than "COLOR_0 is absent".
 *
 * ## Why it lives in `test/` and not beside the code it is about
 *
 * The web lane's harness has no `@types/node`: `node:fs` in an `apps/web` test is a `tsc`
 * error, which `hardWinterClockless.test.ts`'s own header records for the same reason. The
 * subject here is the tracked file list, which belongs to no workspace, so this is the root
 * `repo-hygiene` project's business.
 */

const repoRoot = resolveRepoRoot();

/** Where the city's building, road and town-hall models live. */
const MODEL_DIRECTORY = "apps/web/src/city/art/models";

/** The glTF binary container's magic word, `'glTF'` little-endian. */
const GLB_MAGIC = 0x46546c67;

interface Census {
  readonly files: readonly string[];
  readonly primitives: number;
  readonly attributes: Set<string>;
  readonly byFile: ReadonlyMap<string, Set<string>>;
}

function trackedModels(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", MODEL_DIRECTORY], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.endsWith(".glb"));
}

/**
 * Every vertex attribute every mesh primitive in every tracked model declares.
 *
 * A GLB's first chunk is always its JSON, and each mesh primitive names its own attributes
 * there, so this needs no loader and no GPU — which is what makes it cheap enough to run in the
 * node suite on every commit.
 */
/**
 * Every attribute name, and the primitive count, declared by one GLB buffer.
 *
 * Split out from {@link census} so it can be pinned against the SHAPE OF THE BUG on a synthetic
 * buffer — a reader that always returned an empty set would make every assertion below pass by
 * finding nothing, which is exactly how this guard would fail silently. Not exported: a test
 * file exports nothing, and the pin lives in this file with it.
 */
function attributesIn(buffer: Buffer): {
  primitives: number;
  attributes: Set<string>;
} {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error("not a GLB: the magic word is wrong");
  }
  // header: magic, version, total length; then the first chunk's length and type.
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")) as {
    meshes?: { primitives: { attributes: Record<string, number> }[] }[];
  };
  const attributes = new Set<string>();
  let primitives = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      primitives += 1;
      for (const key of Object.keys(primitive.attributes)) {
        attributes.add(key);
      }
    }
  }
  return { primitives, attributes };
}

function census(): Census {
  const files = trackedModels();
  const attributes = new Set<string>();
  const byFile = new Map<string, Set<string>>();
  let primitives = 0;

  for (const relative of files) {
    const read = attributesIn(readFileSync(posix.join(repoRoot, relative)));
    primitives += read.primitives;
    byFile.set(relative, read.attributes);
    for (const key of read.attributes) {
      attributes.add(key);
    }
  }

  return { files, primitives, attributes, byFile };
}

/** A minimal GLB carrying one mesh primitive with the given attribute names. */
function syntheticGlb(names: readonly string[]): Buffer {
  const attributes = Object.fromEntries(names.map((name, i) => [name, i]));
  let json = JSON.stringify({ meshes: [{ primitives: [{ attributes }] }] });
  while (json.length % 4 !== 0) {
    json += " ";
  }
  const chunk = Buffer.from(json, "utf8");
  const out = Buffer.alloc(20 + chunk.length);
  out.writeUInt32LE(GLB_MAGIC, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(chunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
  chunk.copy(out, 20);
  return out;
}

describe("the shipped building models declare exactly three vertex attributes", () => {
  it("censuses a real population of models, not an empty one", () => {
    const { files, primitives } = census();
    // Floors, because every assertion below is a claim about a set and holds trivially over an
    // empty one. A renamed directory, a wrong cwd or a deleted model set must read as a failure.
    expect(files.length).toBeGreaterThanOrEqual(40);
    expect(primitives).toBeGreaterThanOrEqual(3000);
    // Composition, not only size: the two model sets and the shared props are all in it, so a
    // census that reached only the flat directory would fail here.
    expect(files.some((path) => path.includes("/gridwork-modern/"))).toBe(true);
    expect(files.some((path) => path.includes("/townhall/"))).toBe(true);
    expect(files.some((path) => path.includes("/roads/"))).toBe(true);
  });

  it("finds POSITION, NORMAL and TEXCOORD_0, and nothing else, on every one of them", () => {
    const { attributes, byFile } = census();
    // Set EQUALITY rather than "COLOR_0 is absent", so a re-export that STARTS baking vertex
    // colours fails too — the frost treatment would overwrite them, which is the quieter bug.
    expect([...attributes].sort()).toEqual(["NORMAL", "POSITION", "TEXCOORD_0"]);
    // Per file, so one model that differs cannot hide inside the union.
    for (const [path, here] of byFile) {
      expect([...here].sort(), path).toEqual(["NORMAL", "POSITION", "TEXCOORD_0"]);
    }
  });

  it("means a vertexColors material must build its own attribute or render black", () => {
    // The consequence, stated where the measurement is, so the two cannot drift apart:
    // `winterFrost.ts` takes the attribute's presence as an argument and cannot be told to read
    // one it did not write, and `winterCrisisScene.browser.test.tsx` samples the black frame a
    // material that skipped that step actually produces.
    const { attributes } = census();
    expect(attributes.has("COLOR_0")).toBe(false);
  });

  /**
   * The three assertions above pass by finding nothing unexpected, which is also exactly how
   * they would look if the reader had been broken into always returning an empty set. This pins
   * it against the shape of the bug, in both directions.
   */
  it("detects COLOR_0 when it is there, and only then", () => {
    const clean = attributesIn(syntheticGlb(["POSITION", "NORMAL", "TEXCOORD_0"]));
    expect(clean.primitives).toBe(1);
    expect([...clean.attributes].sort()).toEqual(["NORMAL", "POSITION", "TEXCOORD_0"]);
    expect(clean.attributes.has("COLOR_0")).toBe(false);

    const baked = attributesIn(
      syntheticGlb(["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0"]),
    );
    expect(baked.attributes.has("COLOR_0")).toBe(true);
    // ...and the equality assertion the real census makes would fail on it, which is the
    // direction that catches a re-export that started baking vertex colours.
    expect([...baked.attributes].sort()).not.toEqual(["NORMAL", "POSITION", "TEXCOORD_0"]);

    // And a buffer that is not a GLB is an error rather than an empty answer, so a census over
    // unreadable files cannot report a clean sweep.
    expect(() => attributesIn(Buffer.alloc(64))).toThrow(/not a GLB/);
  });

  it("finds NORMAL on every primitive, which is what the rime reads its facing from", () => {
    // glTF allows a mesh to omit normals. `writeRime` handles that by declining to write the
    // attribute at all, and this is the measurement that says the fallback is a safety net
    // rather than the common path.
    const { byFile } = census();
    for (const [path, here] of byFile) {
      expect(here.has("NORMAL"), path).toBe(true);
    }
  });
});

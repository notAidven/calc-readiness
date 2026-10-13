import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { applyFrost, FROST_TINT, frostMaterial, writeRime } from "./winterFrost";

/**
 * **THE FROST TREATMENT, AND THE ONE WAY IT COULD HAVE BLACKED OUT EVERY BUILDING.**
 *
 * The design batch's asset 7 frosts a building by setting `vertexColors = true` on its
 * material and riding rime in on the colour attribute. In three.js that attribute has to
 * exist: the shader declares `attribute vec3 color`, WebGL supplies `(0,0,0)` for one the
 * geometry does not have, and the diffuse term is multiplied by it. A frosted building whose
 * geometry had no `color` attribute would render **black**, on every building at once, the
 * moment the crisis started.
 *
 * The batch's own `applyRime` does build the attribute, so the technique is sound where it is
 * used — but `frostMaterial` is exported beside it and the batch's onset note explicitly
 * offers the cheaper path of "precompute at amount = 1 and lerp material.color only", which is
 * a call site that sets the flag and never writes the attribute. So this file holds the
 * treatment to being unable to read an attribute it did not build.
 *
 * The other two thirds of the evidence live where they can: `test/buildingModelAttributes.test.ts`
 * censuses the 43 tracked GLBs and finds `COLOR_0` on none of their 3,397 primitives (it is in
 * the root project because the web lane's harness has no `@types/node`), and
 * `winterCrisisScene.browser.test.tsx` samples the black frame a material that skipped the
 * attribute actually produces — because "the attribute is present" is a claim about a buffer and
 * "the building is not black" is a claim about a frame.
 */

/** The shape every shipped GLB primitive actually has, built as a `BufferGeometry`. */
function glbShapedGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // `BoxGeometry` is indexed and carries position, normal and uv — which is exactly the
  // attribute set `test/buildingModelAttributes.test.ts` finds on all 3,397 shipped primitives.
  expect(geometry.index).not.toBeNull();
  expect(geometry.getAttribute("position")).toBeDefined();
  expect(geometry.getAttribute("normal")).toBeDefined();
  expect(geometry.getAttribute("uv")).toBeDefined();
  expect(geometry.getAttribute("color")).toBeUndefined();
  return geometry;
}

function meshLike(): THREE.Mesh {
  return new THREE.Mesh(
    glbShapedGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xc98a5e }),
  );
}

function authoredState(material: THREE.Material) {
  const row = material as THREE.Material & {
    flatShading?: boolean;
    fog?: boolean;
  };
  return {
    opacity: material.opacity,
    transparent: material.transparent,
    alphaTest: material.alphaTest,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    depthFunc: material.depthFunc,
    colorWrite: material.colorWrite,
    blending: material.blending,
    blendSrc: material.blendSrc,
    blendDst: material.blendDst,
    blendEquation: material.blendEquation,
    blendSrcAlpha: material.blendSrcAlpha,
    blendDstAlpha: material.blendDstAlpha,
    blendEquationAlpha: material.blendEquationAlpha,
    premultipliedAlpha: material.premultipliedAlpha,
    forceSinglePass: material.forceSinglePass,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    dithering: material.dithering,
    flatShading: row.flatShading,
    fog: row.fog,
  };
}

describe("the frost material cannot be told to read an attribute that is not there", () => {
  it("leaves vertexColors off when the geometry has none", () => {
    const material = frostMaterial(meshLike().material as THREE.Material, false);
    expect((material as THREE.MeshStandardMaterial).vertexColors).toBe(false);
  });

  it("turns it on only once the attribute has been written", () => {
    const geometry = glbShapedGeometry().toNonIndexed();
    expect(writeRime(geometry)).toBe(true);
    expect(geometry.getAttribute("color")).toBeDefined();
    const material = frostMaterial(
      new THREE.MeshStandardMaterial({ color: 0xc98a5e }),
      true,
    );
    expect((material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
  });

  it("declines to write rime on geometry with no normals, rather than half-doing it", () => {
    // A glTF mesh may legally omit normals. Reading `normal.count` on one would throw during
    // crisis entry, and guessing a facing would put rime on soffits.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    );
    expect(writeRime(geometry)).toBe(false);
    expect(geometry.getAttribute("color")).toBeUndefined();
  });
});

describe("applying frost to a model", () => {
  /** Every material in a tree, paired with whether its geometry carries a colour attribute. */
  function audit(root: THREE.Object3D): { vertexColors: boolean; faced: boolean }[] {
    const found: { vertexColors: boolean; faced: boolean }[] = [];
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const faced = mesh.geometry.getAttribute("color") !== undefined;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        found.push({
          vertexColors: (m as THREE.MeshStandardMaterial).vertexColors,
          faced,
        });
      }
    });
    return found;
  }

  function frostedTree(): THREE.Group {
    const root = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      const mesh = meshLike();
      mesh.position.y = i;
      root.add(mesh);
    }
    // One mesh with no normals, so the mixed case is in the population rather than assumed
    // away: it must come out frosted-by-colour and NOT reading a colour attribute.
    const bare = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
      ),
      new THREE.MeshStandardMaterial({ color: 0x8fa97e }),
    );
    root.add(bare);
    return root;
  }

  it("never leaves a vertexColors material over geometry with no colour attribute", () => {
    const root = frostedTree();
    expect(applyFrost(root)).toBe(5);
    const entries = audit(root);
    // A floor, because "none of them is broken" holds trivially over an empty tree.
    expect(entries.length).toBe(5);
    for (const entry of entries) {
      if (entry.vertexColors) {
        expect(entry.faced).toBe(true);
      }
    }
    // ...and it is genuinely reading vertex colours on the meshes that can, so the guard above
    // is not passing by having turned the whole feature off.
    expect(entries.filter((entry) => entry.vertexColors).length).toBe(4);
    expect(entries.filter((entry) => !entry.vertexColors).length).toBe(1);
  });

  it("cools every material toward the ice tone and desaturates it", () => {
    const root = frostedTree();
    const before = new THREE.Color(0xc98a5e);
    applyFrost(root);
    const after = ((root.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial)
      .color;
    const hslBefore = { h: 0, s: 0, l: 0 };
    const hslAfter = { h: 0, s: 0, l: 0 };
    before.getHSL(hslBefore);
    after.getHSL(hslAfter);
    expect(hslAfter.s).toBeLessThan(hslBefore.s);
    // Toward the tint rather than to it: a frosted building has to stay recognisably its own
    // hue, which is what makes the crisis a season rather than a repaint.
    expect(after.getHex()).not.toBe(FROST_TINT);
    expect(after.getHex()).not.toBe(before.getHex());
    expect(
      after.getHSL(hslAfter).l,
      "the tint is paler than era one's terracotta, so frost lifts it",
    ).toBeGreaterThan(hslBefore.l);
  });

  it("does not let a building glow, whatever emissive its model shipped with", () => {
    // Some GLBs carry emissive windows and `reviveMaterial` lifts them to 1.2 intensity. Under
    // an overcast sky that reads as lit rooms in a settlement that is freezing, so the frost
    // treatment zeroes it explicitly rather than leaving whichever pass ran last to decide.
    const mesh = meshLike();
    (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xffd98a);
    (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
    const root = new THREE.Group().add(mesh);
    applyFrost(root);
    const material = (root.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    expect(material.emissive.getHex()).toBe(0);
    expect(material.flatShading).toBe(true);
    expect(material.metalness).toBe(0);
    expect(material.roughness).toBe(1);
  });

  it("does not write to the material the fair-weather instances share", () => {
    // The loader caches one `gltf.scene` per URL and `prepareModel` clones the object graph,
    // which shares MATERIALS by reference. Mutating one here would frost the placement ghost,
    // the model preview and every other instance of the same building.
    const shared = new THREE.MeshStandardMaterial({ color: 0xc98a5e });
    const mesh = new THREE.Mesh(glbShapedGeometry(), shared);
    applyFrost(new THREE.Group().add(mesh));
    expect(shared.color.getHex(), "RUN016 final fair-cache color assertion").toBe(0xc98a5e);
    expect(shared.vertexColors).toBe(false);
    expect(mesh.material).not.toBe(shared);
  });

  it("preserves late-era Toon and Basic classes, maps, gradients, and authored state", () => {
    const map = new THREE.DataTexture(new Uint8Array([10, 80, 160, 255]), 1, 1);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.MirroredRepeatWrapping;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.anisotropy = 8;
    map.generateMipmaps = true;
    map.flipY = false;
    map.premultiplyAlpha = true;
    map.unpackAlignment = 1;
    map.colorSpace = THREE.SRGBColorSpace;
    const gradient = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]),
      3,
      1,
    );
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;

    const toon = new THREE.MeshToonMaterial({
      color: 0x4b9270,
      map,
      gradientMap: gradient,
    });
    toon.opacity = 0.34;
    toon.transparent = false;
    toon.alphaTest = 0.17;
    toon.side = THREE.DoubleSide;
    toon.depthTest = false;
    toon.depthWrite = false;
    toon.depthFunc = THREE.GreaterEqualDepth;
    toon.colorWrite = false;
    toon.blending = THREE.AdditiveBlending;
    toon.blendSrc = THREE.SrcAlphaFactor;
    toon.blendDst = THREE.OneFactor;
    toon.premultipliedAlpha = true;
    toon.forceSinglePass = true;
    toon.polygonOffset = true;
    toon.polygonOffsetFactor = 2;
    toon.polygonOffsetUnits = -1;
    toon.toneMapped = false;
    toon.dithering = true;
    (toon as THREE.MeshToonMaterial & { flatShading: boolean }).flatShading = false;
    toon.fog = false;

    const basic = new THREE.MeshBasicMaterial({
      color: 0x3fbce0,
      map,
      opacity: 0.68,
      transparent: true,
    });
    basic.depthTest = true;
    basic.depthWrite = false;
    basic.colorWrite = true;
    basic.blending = THREE.MultiplyBlending;
    basic.side = THREE.BackSide;
    basic.toneMapped = false;
    basic.fog = false;
    const toonState = authoredState(toon);
    const basicState = authoredState(basic);
    const toonColor = toon.color.getHex();
    const basicColor = basic.color.getHex();

    const first = new THREE.Mesh(glbShapedGeometry(), toon);
    first.name = "toon-first";
    const second = new THREE.Mesh(glbShapedGeometry(), toon);
    second.name = "toon-second";
    const unlit = new THREE.Mesh(glbShapedGeometry(), basic);
    unlit.name = "unlit";
    const root = new THREE.Group().add(first, second, unlit);
    expect(applyFrost(root)).toBe(3);

    const frostedToon = first.material as THREE.MeshToonMaterial;
    const repeatedToon = second.material as THREE.MeshToonMaterial;
    const frostedBasic = unlit.material as THREE.MeshBasicMaterial;
    expect(frostedToon).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(frostedBasic).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(repeatedToon, "one identity map is used for the whole frost root").toBe(
      frostedToon,
    );
    expect(frostedToon).not.toBe(toon);
    expect(frostedBasic).not.toBe(basic);
    expect(frostedToon.map).toBe(map);
    expect(frostedToon.gradientMap).toBe(gradient);
    expect(frostedBasic.map).toBe(map);
    expect(authoredState(frostedToon)).toStrictEqual(toonState);
    expect(authoredState(frostedBasic)).toStrictEqual(basicState);
    expect(frostedToon.color.getHex()).not.toBe(toonColor);
    expect(frostedBasic.color.getHex(), "RUN015 final unlit tint assertion").not.toBe(
      basicColor,
    );
    expect(frostedToon.vertexColors).toBe(true);
    expect(frostedBasic.vertexColors).toBe(true);

    expect(toon.color.getHex(), "RUN016 fair Toon cache remains unchanged").toBe(toonColor);
    expect(basic.color.getHex(), "RUN016 fair Basic cache remains unchanged").toBe(
      basicColor,
    );
    expect(toon.vertexColors).toBe(false);
    expect(basic.vertexColors).toBe(false);
  });

  it("puts the rime on the up-faces and none on the undersides", () => {
    // At the shipped 49° tilt the camera sees roofs and the tops of walls, so the up-face is
    // where a value shift is actually read. A soffit that took rime would be frost growing
    // where the weather cannot reach.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Array(9 * 3).fill(0), 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(
        [
          // a roof
          0, 1, 0, 0, 1, 0, 0, 1, 0,
          // a wall
          1, 0, 0, 1, 0, 0, 1, 0, 0,
          // a soffit
          0, -1, 0, 0, -1, 0, 0, -1, 0,
        ],
        3,
      ),
    );
    expect(writeRime(geometry)).toBe(true);
    const color = geometry.getAttribute("color") as THREE.BufferAttribute;
    const luminance = (i: number) =>
      color.getX(i) * 0.2126 + color.getY(i) * 0.7152 + color.getZ(i) * 0.0722;
    // The multiplier is 1 for untouched, so the soffit is exactly 1 and the roof is furthest
    // from it. The wall takes a whisper and sits between them.
    expect(luminance(6)).toBeCloseTo(1, 6);
    expect(luminance(0)).toBeLessThan(luminance(3));
    expect(luminance(3)).toBeLessThan(luminance(6));
  });
});

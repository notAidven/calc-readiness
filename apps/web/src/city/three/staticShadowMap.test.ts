import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { shadowCastingSignature } from "./staticShadowMap";

function caster(material: THREE.Material = new THREE.MeshStandardMaterial()): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.castShadow = true;
  return mesh;
}

function instancedCaster(): { root: THREE.Group; mesh: THREE.InstancedMesh } {
  const root = new THREE.Group();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial(),
    3,
  );
  mesh.castShadow = true;
  root.add(mesh);
  return { root, mesh };
}

describe("shadowCastingSignature", () => {
  test("tracks an InstancedMesh buffer version", () => {
    const { root, mesh } = instancedCaster();
    const initial = shadowCastingSignature(root);
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(4, 0, 0));
    mesh.instanceMatrix.needsUpdate = true;
    expect(
      shadowCastingSignature(root),
      "an uploaded instance matrix changed without invalidating its frozen shadow",
    ).not.toBe(initial);
  });

  test("tracks an InstancedMesh live instance count independently of its buffer", () => {
    const { root, mesh } = instancedCaster();
    const initial = shadowCastingSignature(root);
    mesh.count = 1;
    expect(
      shadowCastingSignature(root),
      "the number of instances casting into the map changed without invalidating it",
    ).not.toBe(initial);
  });

  test("tracks both ways an object can enter or leave a shadow pass", () => {
    const root = new THREE.Group();
    const mesh = caster();
    root.add(mesh);

    const casting = shadowCastingSignature(root);
    mesh.castShadow = false;
    const neither = shadowCastingSignature(root);
    expect(neither, "turning castShadow off left the old cast in the map").not.toBe(
      casting,
    );

    mesh.receiveShadow = true;
    expect(
      shadowCastingSignature(root),
      "turning receiveShadow on was invisible to a VSM-compatible signature",
    ).not.toBe(neither);
  });

  test("tracks material state that changes the depth pass", () => {
    const cases: readonly {
      readonly name: string;
      readonly change: (material: THREE.MeshStandardMaterial) => void;
    }[] = [
      { name: "material.visible", change: (material) => (material.visible = false) },
      { name: "alphaTest", change: (material) => (material.alphaTest = 0.4) },
      { name: "side", change: (material) => (material.side = THREE.DoubleSide) },
    ];

    for (const entry of cases) {
      const material = new THREE.MeshStandardMaterial();
      const root = new THREE.Group();
      root.add(caster(material));
      const initial = shadowCastingSignature(root);
      entry.change(material);
      expect(
        shadowCastingSignature(root),
        `${entry.name} changed without invalidating the shadow map`,
      ).not.toBe(initial);
    }
  });

  test("covers PlacedBuilding's transparent-mode transition without watching every fade step", () => {
    const material = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    root.add(caster(material));
    const initial = shadowCastingSignature(root);

    material.opacity = 0.5;
    expect(
      shadowCastingSignature(root),
      "opacity does not enter three's depth material and must not redraw shadows every fade frame",
    ).toBe(initial);

    material.transparent = true;
    material.needsUpdate = true;
    expect(
      shadowCastingSignature(root),
      "PlacedBuilding's material-mode transition was not covered",
    ).not.toBe(initial);
  });
});

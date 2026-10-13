import * as THREE from "three";
import { expect, test } from "vitest";

import { batchStaticIslandGraph } from "./islandBatching";

function coloredBox(color: number, x: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    }),
  );
  mesh.position.x = x;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

test("colour-only static materials share one draw without losing either colour", () => {
  const source = new THREE.Group();
  const left = coloredBox(0x336699, -2);
  const right = coloredBox(0xcc8844, 2);
  source.add(left, right);

  const batched = batchStaticIslandGraph(source, { bakeSolidColors: true });
  expect(
    batched.children,
    "two otherwise-compatible colours still became two WebGL submissions",
  ).toHaveLength(1);

  const mesh = batched.children[0] as THREE.Mesh;
  expect(mesh.castShadow).toBe(true);
  expect(mesh.receiveShadow).toBe(true);
  const material = mesh.material as THREE.MeshStandardMaterial;
  expect(material.vertexColors).toBe(true);
  expect(material.color.getHex()).toBe(0xffffff);

  const colors = mesh.geometry.getAttribute("color");
  expect(
    colors,
    "the authored material colours were not baked onto the merged vertices",
  ).toBeDefined();
  const seen = new Set<string>();
  for (let index = 0; index < colors.count; index += 1) {
    seen.add(
      [colors.getX(index), colors.getY(index), colors.getZ(index)]
        .map((channel) => channel.toFixed(6))
        .join(","),
    );
  }
  const expected = [left, right].map((entry) => {
    const color = (entry.material as THREE.MeshStandardMaterial).color;
    return [color.r, color.g, color.b].map((channel) => channel.toFixed(6)).join(",");
  });
  expect(seen).toEqual(new Set(expected));
});

import { expect, test } from "vitest";

import { TOWN_HALL_FOOTPRINT } from "../townHall";
import { TOWN_HALL_VISUAL_SCALE } from "./TownHall";

const SOURCE = (
  import.meta.glob("./TownHall.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)["./TownHall.tsx"] as string;

test("the real Town Hall mounts directly on era terrain with no visual platform", () => {
  expect(SOURCE.length).toBeGreaterThan(1000);
  expect(SOURCE).not.toMatch(/TownHallPlaza|buildTownHallPlaza|object=\{plaza\}/);

  // Interaction and collision authority remain even though the decorative slab is gone.
  expect(TOWN_HALL_FOOTPRINT).toEqual({ w: 3, d: 2 });
  expect(TOWN_HALL_VISUAL_SCALE).toBeGreaterThanOrEqual(0.75);
  expect(TOWN_HALL_VISUAL_SCALE).toBeLessThan(1);
  expect(SOURCE).toContain(`name={\`building-\${TOWN_HALL_ID}\`}`);
  expect(SOURCE).toContain("onSelect();");
  expect(SOURCE).not.toContain("TownHallIcon");
});

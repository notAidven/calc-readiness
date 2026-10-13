import { PLAGUE } from "@cr/game";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlagueSurface } from "./PlagueSurface";
import { PLAGUE_ITEM_POOL, PLAGUE_NODE_ORDER } from "./plagueItems";
import { createLocalPlagueSession, type PlagueStorage } from "./plaguePersistence";

function session() {
  const values = new Map<string, string>();
  const storage: PlagueStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return createLocalPlagueSession({ storage, userKey: "surface-test" });
}

const LABELS = {
  "care-house": "Care House at Town Hall",
  market: "Signed Numbers",
  printworks: "Fractions",
  chapel: "Number Lines",
  guildhall: "Powers",
} as const;

afterEach(() => {
  cleanup();
});

describe("the production Plague surface", () => {
  it("opens on the complete city network and keyboard-reachable interventions", async () => {
    render(
      <PlagueSurface
        session={session()}
        readMasteredNodes={() => PLAGUE_NODE_ORDER}
        nodeLabels={LABELS}
        onExit={() => undefined}
      />,
    );

    const first = await screen.findByTestId("pl-action-quarantine-market-care");
    const actions = document.querySelector(".pl-care-actions");
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByTestId("pl-action-care-care-house")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Building states" }).children).toHaveLength(5);
    expect(screen.getByRole("list", { name: "Town routes" }).children).toHaveLength(5);
    expect(screen.getByTestId("pl-infected")).toHaveTextContent("Infected 1");
    expect(screen.getByTestId("pl-exposed")).toHaveTextContent("Exposed 2");
    expect(screen.getByTestId("pl-threat")).toHaveTextContent("Live routes 2");
    await waitFor(() => expect(document.activeElement).toBe(first));

    fireEvent.click(screen.getByTestId("pl-action-care-care-house"));
    expect(
      await screen.findByText(`Care · question 1 of ${PLAGUE.batch_size}`),
    ).toBeInTheDocument();
  });

  it("shows the committed care station, then keeps spread behind a separate advance", async () => {
    const store = session();
    let state = await store.start();
    const questionIds = PLAGUE_ITEM_POOL.slice(0, PLAGUE.batch_size).map(
      (item) => item.item_version_id,
    );
    state = await store.dispatch({
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: questionIds,
      expected_revision: state.revision,
    });
    for (let index = 0; index < PLAGUE.batch_size; index += 1) {
      state = await store.dispatch({
        type: "answer",
        question_id: questionIds[index] as string,
        correct: index < 2,
        expected_revision: state.revision,
      });
    }

    render(
      <PlagueSurface
        session={store}
        readMasteredNodes={() => PLAGUE_NODE_ORDER}
        nodeLabels={LABELS}
        onExit={() => undefined}
      />,
    );

    expect(await screen.findByTestId("pl-advance")).toBeInTheDocument();
    expect(screen.getByText("Care House at Town Hall").parentElement).toHaveTextContent(
      "Cared for, strength 2",
    );
    expect(screen.getByTestId("pl-route-market-printworks")).toHaveAttribute(
      "data-risk",
      "true",
    );
    expect(screen.getByTestId("pl-care-live")).toHaveTextContent(
      "Infection has not moved yet",
    );

    fireEvent.click(screen.getByTestId("pl-advance"));
    await waitFor(() =>
      expect(screen.getByTestId("pl-care-live")).toHaveTextContent(
        "Care protected Care House at Town Hall",
      ),
    );
    expect(screen.getByTestId("pl-infected")).toHaveTextContent("Infected 1");
  });
});

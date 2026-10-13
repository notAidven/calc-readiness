import type { EraId } from "@cr/skill-graph";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CityLoad } from "../city/types";
import { beginDiagnostic, beginEraOne } from "./beginLaunch";
import type { LaunchStorage } from "./launchRecord";
import { readLaunchRecord, recordLaunchChoice } from "./launchRecord";
import { type LaunchChoice, resolveLaunchRoute } from "./launchRoute";

/**
 * **THE ORDINARY ROUTE'S FIRST DECISION, taken once the account's own city has been read.**
 *
 * ## It reads the city the app is already reading
 *
 * `reader` is `App`'s `apiCityBundle`, whose `load()` memoises the in-flight `GET /api/city`
 * (`loaded ??= …`). Sharing it rather than opening a second reader is deliberate: two readers of
 * one endpoint is two answers to "has this account begun", and the launcher and the city behind
 * it would eventually disagree about which learner they are looking at. `invalidate()` is that
 * same memo's own reset, which is what makes Retry a real retry rather than a re-render over a
 * cached rejection.
 *
 * ## Fail-closed
 *
 * A city read that fails does NOT fall through to the launcher, and it does not fall through to a
 * city either. Either would be a guess about progression made while the only thing that knows is
 * unreachable — and the guess that shows the launcher is the expensive one, because *Start at
 * Era 1* on an account already four eras in is exactly the "refresh reset my progress" defect.
 * So the failure gets its own surface with Retry, per §6 of
 * `docs/superpowers/specs/2026-08-07-production-backend-auth-persistence.md` ("query failures show
 * retry and never substitute demo/dev state").
 *
 * ## Everything read is stamped with who and which attempt it belongs to
 *
 * A city, a failure and a chosen door are each held with the subject they were produced for and
 * the attempt that produced them, and are ignored the moment either moves on. That is what makes
 * a second learner on a shared laptop, and a Retry landing after its predecessor, structurally
 * unable to decide this learner's question — rather than a reset effect that has to fire first.
 */

export type AccountLaunch =
  /** Not the account route (the exact demo showcase and local development). */
  | { readonly kind: "unavailable" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string; readonly retry: () => void }
  | { readonly kind: "launcher"; readonly choose: (choice: LaunchChoice) => void }
  | { readonly kind: "resume" };

/** The slice of `App`'s API city bundle this needs. */
export interface AccountCityReader {
  load(): Promise<CityLoad>;
  /** Initialize an untouched account and install the returned canonical city in the session. */
  bootstrap(): Promise<CityLoad>;
  invalidate(): void;
}

interface Stamped {
  readonly subject: string;
  readonly attempt: number;
}

export function useAccountLaunch({
  subject,
  reader,
  setEra,
  storage,
}: {
  /** The verified Cognito subject, or null on every non-account path. */
  readonly subject: string | null;
  readonly reader: AccountCityReader | null;
  readonly setEra: (eraId: EraId) => void;
  readonly storage?: LaunchStorage | null;
}): AccountLaunch {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<(Stamped & { city: CityLoad }) | null>(null);
  const [failed, setFailed] = useState<(Stamped & { message: string }) | null>(null);
  const [bootstrapping, setBootstrapping] = useState<Stamped | null>(null);
  const [bootstrapFailed, setBootstrapFailed] = useState<
    (Stamped & { message: string }) | null
  >(null);
  const bootstrapInFlight = useRef<{ subject: string; promise: Promise<void> } | null>(
    null,
  );
  const activeRequest = useRef({ subject, attempt });
  activeRequest.current = { subject, attempt };
  /** Set only after the server has accepted Era 1, or immediately for the diagnostic door. */
  const [taken, setTaken] = useState<{ subject: string; choice: LaunchChoice } | null>(
    null,
  );

  useEffect(() => {
    if (subject === null || reader === null) {
      return;
    }
    let active = true;
    void reader.load().then(
      (city) => {
        if (active) {
          setLoaded({ subject, attempt, city });
        }
      },
      (error: unknown) => {
        if (active) {
          setFailed({
            subject,
            attempt,
            message:
              error instanceof Error && error.message
                ? error.message
                : "We could not reach your account.",
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reader, subject, attempt]);

  const current = <T extends Stamped>(value: T | null): T | null =>
    value !== null && value.subject === subject && value.attempt === attempt ? value : null;

  const city = current(loaded)?.city ?? null;
  const failure = current(failed)?.message ?? null;
  const bootstrapFailure = current(bootstrapFailed)?.message ?? null;
  const bootstrapPending = current(bootstrapping) !== null;

  const startBootstrap = useCallback(() => {
    if (subject === null || reader === null) {
      return;
    }
    if (bootstrapInFlight.current?.subject === subject) {
      return;
    }
    const stamp = { subject, attempt };
    setBootstrapping(stamp);
    setBootstrapFailed(null);
    const flight: { subject: string; promise: Promise<void> } = {
      subject,
      promise: Promise.resolve(),
    };
    const request = reader.bootstrap().then(
      (canonical) => {
        if (
          activeRequest.current.subject !== stamp.subject ||
          activeRequest.current.attempt !== stamp.attempt
        ) {
          return;
        }
        setLoaded({ ...stamp, city: canonical });
        if (canonical.current_island !== undefined) {
          setEra(canonical.current_island);
        }
        // Cache only, and only after the server response and session rehydration succeeded.
        recordLaunchChoice(subject, "era-one", storage);
        setTaken({ subject, choice: "era-one" });
      },
      (error: unknown) => {
        if (
          activeRequest.current.subject !== stamp.subject ||
          activeRequest.current.attempt !== stamp.attempt
        ) {
          return;
        }
        setBootstrapFailed({
          ...stamp,
          message:
            error instanceof Error && error.message
              ? error.message
              : "We could not start your city.",
        });
      },
    );
    flight.promise = request;
    bootstrapInFlight.current = flight;
    void request.then(() => {
      if (bootstrapInFlight.current === flight) {
        bootstrapInFlight.current = null;
      }
    });
  }, [attempt, reader, setEra, storage, subject]);

  const retry = useCallback(() => {
    if (bootstrapFailure !== null) {
      bootstrapInFlight.current = null;
      startBootstrap();
      return;
    }
    reader?.invalidate();
    setAttempt((value) => value + 1);
  }, [bootstrapFailure, reader, startBootstrap]);

  const choose = useCallback(
    (choice: LaunchChoice) => {
      if (subject === null) {
        return;
      }
      if (choice === "era-one") {
        if (reader === null) {
          // Test-only readerless composition; production account builds always have the API.
          beginEraOne({
            subject,
            city: city ?? { node_states: [] },
            setEra,
            storage,
          });
          setTaken({ subject, choice });
        } else {
          startBootstrap();
        }
      } else {
        beginDiagnostic({ subject, storage });
        setTaken({ subject, choice });
      }
    },
    [city, reader, setEra, startBootstrap, storage, subject],
  );

  return useMemo<AccountLaunch>(() => {
    if (subject === null) {
      return { kind: "unavailable" };
    }
    if (taken !== null && taken.subject === subject) {
      return { kind: "resume" };
    }
    if (reader === null) {
      // Account composition with no configured API. `runtimeMode.ts` rejects that build, so
      // this is reachable only from a test harness; decide on the device note alone rather
      // than hanging on a read that will never arrive.
      return readLaunchRecord(subject, storage) === null
        ? { kind: "launcher", choose }
        : { kind: "resume" };
    }
    if (bootstrapFailure !== null) {
      return { kind: "error", message: bootstrapFailure, retry };
    }
    if (bootstrapPending) {
      return { kind: "loading" };
    }
    if (failure !== null) {
      return { kind: "error", message: failure, retry };
    }
    if (city === null) {
      return { kind: "loading" };
    }
    const route = resolveLaunchRoute({ city });
    return route === "launcher" ? { kind: "launcher", choose } : { kind: "resume" };
  }, [
    bootstrapFailure,
    bootstrapPending,
    choose,
    city,
    failure,
    reader,
    retry,
    storage,
    subject,
    taken,
  ]);
}

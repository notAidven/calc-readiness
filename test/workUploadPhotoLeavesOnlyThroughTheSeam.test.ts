import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **A STUDENT'S PHOTOGRAPH GOES TO ONE PLACE OUTSIDE OUR BOUNDARY, THROUGH ONE SEAM, AND IS
 * NEVER SCORED.**
 *
 * ## This file was `workUploadStaysInsideTheTrustBoundary.test.ts`, and the rename is the point
 *
 * Under the old name it enforced `docs/Photo_Work_Upload_Scope.md` §3.5's gate: no student
 * photo may be sent to a third-party model at all, so no file in the lane may so much as
 * name a vendor. On **2026-08-05 Gabe lifted that gate** — *"just assume FERPA isnt a problem
 * as of now; because its not tied to any specific school system, we're comfortable just
 * passing it into a frontier model and having it evaluate it. so just wire up that endpoint -
 * if security becomes a concern later on we can touch on that."* The §3.5 and §6 banners hold
 * the ruling, its stated basis and its explicit revisitability.
 *
 * A guard whose central claim has been overturned is not a guard to quietly loosen and leave
 * under its old name: the name would go on asserting the opposite of what the code does, to
 * every future reader, which is the same failure as leaving the docs unamended. So the claim
 * is restated rather than weakened, and it is a narrower claim that is still worth enforcing:
 *
 *  1. **§3.5 as amended — one destination, named, reached through one seam.** A photograph
 *     may leave for a vision model. It may leave through `VisionModel` and nothing else, and
 *     only two files in the whole web app and this service may name a model vendor: the
 *     adapter, and the registry that chooses between adapters. Both are named below with
 *     their reason and asserted in both directions. A third file naming one fails here, which
 *     is what keeps *"we can touch on that later"* to a stack parameter rather than a
 *     refactor.
 *  2. **No endpoint literal, anywhere.** Still absolute, and it now means something narrower
 *     and still useful: a destination for a student's photograph is a deployment decision
 *     with a person's name on it, and may not be a string somebody typed into a source file.
 *  3. **§6's other controls, which the ruling did NOT touch.** The parse reads the STORED
 *     object, so what leaves carries no EXIF; and ingest still calls no model, so uploading a
 *     photo is not consenting to have one read it.
 *  4. **§1 / §3.5 / §7 — the one-way invariant, unchanged.** An upload is never an input to
 *     mastery, placement or the pre/post metric, and neither is anything read out of one. The
 *     ruling made this MORE load-bearing rather than less: the route it opened is one whose
 *     best available model misreads something on 37.62% of real multi-step student pages
 *     (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4). The type-level half of it lives in
 *     `test/workUploadParseStaysFeedbackOnly.test.ts`; the module-graph half is here.
 *
 * ## The population, derived three ways, because a name is not a behaviour
 *
 * The rule is about modules that HANDLE A STUDENT'S PHOTOGRAPH, AN UPLOAD RECORD, OR A MODEL
 * EXCHANGE. Where that is implemented is a fact about the code; exhibiting it is a fact about
 * the product, and the second is the subject. Measured rather than argued: the previous
 * derivation (path names the feature, or imports `@cr/image-hygiene`) had exactly the gap
 * that predicts — `bedrockVisionModel.ts` is the file that posts the photograph to a vendor
 * and it satisfied neither clause, so it would have sat outside every sweep below. The third
 * clause is what closes it.
 *
 * The VENDOR rule gets a wider population still: every non-test source under the three lane
 * roots. "Which files may name a model vendor" is a question about the whole web app and the
 * whole service, not about a directory, and scoping it to the lane would have let the
 * composition root — the one place a provider is legitimately chosen — name one unobserved.
 */

const ROOT = resolveRepoRoot();

/** Where a work-upload or vision module can live. */
const LANE_ROOTS = [
  "apps/web/src",
  "services/diagnostic-api/src",
  "packages/image-hygiene/src",
];

function sourcesUnder(directory: string): string[] {
  const absolute = posix.join(ROOT, directory);
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = posix.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry.name)) {
        found.push(path);
      }
    }
  };
  walk(absolute);
  return found;
}

const ALL_SOURCES = LANE_ROOTS.flatMap(sourcesUnder);

/** Read once: every assertion below is about this text. */
const SOURCE_TEXT = new Map(ALL_SOURCES.map((path) => [path, readFileSync(path, "utf8")]));

const relative = (path: string) => path.slice(ROOT.length + 1);

/**
 * Test code, which is out of every population — and the exclusion is provable rather than
 * assumed: `it("keeps test doubles unreachable…")` below asserts that no shipped module
 * imports one. The double for the uploads bucket has a `https://uploads.test/…` URL in it,
 * and a rule that counted that as an endpoint would be measuring the wrong thing.
 */
const isTest = (path: string) => /\.test\.(ts|tsx)$/.test(path) || /\/test\//.test(path);

const SHIPPED = ALL_SOURCES.filter((path) => !isTest(path));

/** Import specifiers, with whether each was written as a type-only import. */
function imports(source: string): { specifier: string; typeOnly: boolean }[] {
  const found: { specifier: string; typeOnly: boolean }[] = [];
  for (const match of source.matchAll(
    /\bimport\s+(type\s+)?([\s\S]*?)from\s+["']([^"']+)["']/g,
  )) {
    if (match[3]) {
      found.push({
        specifier: match[3],
        // `import type { X } from` and `import { type X } from` are both type-only in effect;
        // what matters is that no VALUE crosses, so a clause of only `type` members counts.
        typeOnly:
          match[1] !== undefined || /^\{[^}]*\}$/.test(match[2]?.trim() ?? "")
            ? match[1] !== undefined ||
              (match[2] ?? "")
                .replace(/[{}]/g, "")
                .split(",")
                .filter((part) => part.trim() !== "")
                .every((part) => /^\s*type\s/.test(part))
            : false,
      });
    }
  }
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) {
      found.push({ specifier: match[1], typeOnly: false });
    }
  }
  return found;
}

/**
 * The lane: every shipped source that handles a photograph, an upload record or a model
 * exchange. Three clauses, and the third is the one the old derivation was missing.
 */
const LANE_ALL = SHIPPED.filter((path) => {
  const source = SOURCE_TEXT.get(path) ?? "";
  const namesTheFeature = /work.?upload/i.test(path);
  // Handles photo BYTES: §6 requires stripping their metadata, so anything holding them
  // imports this package. A behavioural membership test, not a naming convention.
  const handlesBytes = /image-hygiene/.test(path) || source.includes("@cr/image-hygiene");
  // Talks to a model, or is the thing that does. Either the file IS a vision module, or it
  // reaches one — which is how the composition root and the registry get swept, and how a
  // `services/diagnostic-api/src/photoReader.ts` that nobody thought to name `workUpload…`
  // would too.
  const reachesAModel =
    /vision-?model/i.test(path) ||
    /(^|\/)secrets\.ts$/.test(path) ||
    imports(source).some(({ specifier }) => /vision-?model/i.test(specifier));
  return namesTheFeature || handlesBytes || reachesAModel;
});

/**
 * THE ONE COMPOSITION ROOT IN THE LANE, named with what it is excused from and why.
 *
 * `env.ts` builds every service in this API from environment variables, which is how it ends
 * up choosing a vision provider and therefore how it lands in the lane. It holds no
 * photograph, no upload record and no model reply, and it legitimately VALUE-imports
 * `@cr/diagnostic-runtime/aurora` — the module that also exports `computeStudentReadiness`,
 * the pre/post metric itself — because that is where the Cognito verifier and the action
 * server live. So it is exempt from the type-only rule below and from nothing else: it is
 * held to the vendor rule, the endpoint rule and the grading-import rule like every other
 * file, and `it("keeps the composition-root exemption honest…")` fails if it stops being a
 * composition root or starts handling bytes.
 */
const COMPOSITION_ROOTS: ReadonlyMap<string, string> = new Map([
  [
    "services/diagnostic-api/src/env.ts",
    "the composition root: it builds every service from env and so names a provider id, but " +
      "holds no photograph, no upload record and no model reply. Its value import of " +
      "@cr/diagnostic-runtime/aurora is the Cognito verifier and the action server, which " +
      "a composition root cannot be built without.",
  ],
]);

const LANE = LANE_ALL.filter((path) => !COMPOSITION_ROOTS.has(relative(path)));

/**
 * Vendors and endpoints whose appearance means a student's photograph has a destination.
 * Not an exhaustive list of the world's model providers — it is the set anyone implementing
 * §3.5's parse would plausibly reach for, plus the SDK shapes they arrive as.
 */
const THIRD_PARTY_MODELS: readonly RegExp[] = [
  /openai/i,
  /anthropic/i,
  /claude[-.]?\d/i,
  /gemini/i,
  /generativelanguage/i,
  /vertexai/i,
  /mathpix/i,
  /bedrock/i,
  /textract/i,
  /rekognition/i,
  /\btesseract/i,
  /replicate\.com/i,
  /huggingface/i,
  /cognitiveservices/i,
  /clarifai/i,
  /ocr\.space/i,
  /google-cloud\/vision/i,
];

/**
 * THE TWO FILES LICENSED TO NAME A MODEL VENDOR, each with the reason it may.
 *
 * This is the whole of the surface the 2026-08-05 ruling opened, expressed as a list that
 * fails both ways. A third entry is a design change somebody has to argue for, and a file
 * that stops being an adapter cannot go on holding a licence it no longer needs.
 */
const VENDOR_LICENSED: ReadonlyMap<string, string> = new Map([
  [
    "services/diagnostic-api/src/bedrockVisionModel.ts",
    "the default adapter. Naming its vendor is what an adapter IS, and confining the name " +
      "to one file behind the VisionModel port is what makes the provider a deploy-time " +
      "choice rather than a refactor. It is also the keyless one: it signs with the " +
      "function's execution role, so there is no API key anywhere on the shipped path.",
  ],
  [
    "services/diagnostic-api/src/workUploadParseSeam.ts",
    "the registry. Choosing between named providers is what a registry is for, and having " +
      "exactly one place that does it is what stops a vendor's name spreading into the " +
      "route, the prompt, the reply contract or the spend cap — none of which know or care " +
      "which model answered.",
  ],
]);

/** Import specifiers that would give this lane a path into grading. */
const GRADING_PATH: readonly RegExp[] = [
  /@cr\/mastery-service/,
  /@cr\/scorer/,
  /@cr\/lesson\b/,
  /@cr\/components/,
  /answer-?checker/i,
  /checker-core/i,
  /practiceChecker/,
  /cfuChecker/,
];

describe("the work-upload lane's population", () => {
  it("spans all three lanes and names the modules that must be in it", () => {
    // A floor first — every sweep below is a "for each file", and an empty population passes
    // all of them.
    expect(LANE.length).toBeGreaterThanOrEqual(12);
    const paths = LANE.map(relative);
    for (const required of [
      // the browser half
      "apps/web/src/work-upload/store.ts",
      "apps/web/src/work-upload/presigned.ts",
      "apps/web/src/work-upload/WorkUpload.tsx",
      // the backend half, which the browser-only guard could never have seen
      "services/diagnostic-api/src/workUpload.ts",
      "services/diagnostic-api/src/workUploadObjects.ts",
      "services/diagnostic-api/src/workUploadParse.ts",
      "services/diagnostic-api/src/workUploadParseSeam.ts",
      // THE THIRD CLAUSE'S REASON FOR EXISTING. These three are the files that actually
      // reach a vendor, and none of them names the feature or imports @cr/image-hygiene —
      // so under the old two-clause derivation every rule below would have skipped them.
      "services/diagnostic-api/src/visionModel.ts",
      "services/diagnostic-api/src/bedrockVisionModel.ts",
      "services/diagnostic-api/src/httpVisionModel.ts",
      "services/diagnostic-api/src/secrets.ts",
      // and the bytes themselves
      "packages/image-hygiene/src/imageMetadata.ts",
    ]) {
      expect(paths, `${required} is not in the swept population`).toContain(required);
    }
    // Three lanes, so the sweep genuinely crosses the boundary the browser guard stops at.
    expect(paths.some((path) => path.startsWith("apps/web"))).toBe(true);
    expect(paths.some((path) => path.startsWith("services/"))).toBe(true);
    expect(paths.some((path) => path.startsWith("packages/"))).toBe(true);
  });

  it("keeps test doubles unreachable, which is what licenses excluding them", () => {
    // The population excludes test code. That is only legitimate while test code is
    // genuinely not part of the product: a shipped module importing a double would put a
    // fake bucket (and its fake URL), or a scripted model, inside the thing this file is
    // measuring, and the exclusion would be hiding it.
    for (const path of LANE_ALL) {
      for (const { specifier } of imports(SOURCE_TEXT.get(path) ?? "")) {
        expect(
          /(^|\/)test\//.test(specifier) || /\.test$/.test(specifier),
          `${relative(path)} imports test code (${specifier}) — it is shipped, so the ` +
            "double is shipped too",
        ).toBe(false);
      }
    }
  });

  it("keeps the composition-root exemption honest, in both directions", () => {
    for (const [path, why] of COMPOSITION_ROOTS) {
      expect(why.length).toBeGreaterThan(80);
      const absolute = posix.join(ROOT, path);
      // Forwards: an exemption for a file that is no longer in the lane exempts nothing, and
      // would sit here looking like coverage while the next one is added beside it.
      expect(
        LANE_ALL.map(relative),
        `${path} is exempted but is no longer derived into the lane at all`,
      ).toContain(path);
      const source = SOURCE_TEXT.get(absolute) ?? "";
      // Backwards, twice. It is excused for being a composition root, so it must still BE
      // one: if it stops value-importing the runtime it composes, the excuse is stale.
      expect(
        imports(source).some(
          ({ specifier, typeOnly }) =>
            /@cr\/diagnostic-runtime/.test(specifier) && !typeOnly,
        ),
        `${path} no longer value-imports @cr/diagnostic-runtime — the exemption describes ` +
          "something that has stopped being true, so delete it and let the rule apply",
      ).toBe(true);
      // And it is excused for holding NOTHING. A composition root that starts handling photo
      // bytes is not a composition root, and must obey the rule like everything else.
      expect(
        source.includes("@cr/image-hygiene"),
        `${path} handles photo bytes now, so it is not merely a composition root`,
      ).toBe(false);
    }
  });
});

describe("a photograph reaches a model through the seam, and only there", () => {
  it("names a model vendor in the two licensed files and nowhere else", () => {
    const offenders: string[] = [];
    for (const path of SHIPPED) {
      if (VENDOR_LICENSED.has(relative(path))) {
        continue;
      }
      const source = SOURCE_TEXT.get(path) ?? "";
      for (const vendor of THIRD_PARTY_MODELS) {
        if (vendor.test(source)) {
          offenders.push(`${relative(path)} names ${vendor}`);
        }
      }
    }
    expect(
      offenders,
      "§3.5's gate was lifted for one destination reached through one seam. A vendor named " +
        "outside the adapter and the registry is that seam leaking, and it is what makes " +
        "the owner's 'we can touch on that later' expensive instead of a stack parameter.",
    ).toEqual([]);
    // A floor under the population, so the sweep above is not holding over an empty walk.
    expect(SHIPPED.length).toBeGreaterThanOrEqual(50);
  });

  it("keeps each vendor licence honest, in both directions", () => {
    for (const [path, why] of VENDOR_LICENSED) {
      expect(why.length).toBeGreaterThan(100);
      const absolute = posix.join(ROOT, path);
      // Forwards: a licence for a file that no longer exists, or that no longer names a
      // vendor, is a licence excusing nothing — and it would sit here looking like the
      // surface had been reviewed.
      expect(SOURCE_TEXT.has(absolute), `${path} is licensed but does not exist`).toBe(
        true,
      );
      const source = SOURCE_TEXT.get(absolute) ?? "";
      expect(
        THIRD_PARTY_MODELS.some((vendor) => vendor.test(source)),
        `${path} is licensed to name a vendor and names none — delete the licence rather ` +
          "than leaving it to excuse whatever is added next",
      ).toBe(true);
      // Backwards: it is licensed because it is an adapter or the registry, which means it
      // deals in `VisionModel`. A file that names a vendor without going through the port is
      // the leak the licence was never meant to cover.
      expect(
        /VisionModel/.test(source),
        `${path} names a vendor without dealing in VisionModel — the licence says it is an ` +
          "adapter or the registry, and that is no longer what it is",
      ).toBe(true);
    }
    // Two, and the count is asserted so a third licence is a decision somebody makes on
    // purpose rather than a line added to a list.
    expect(VENDOR_LICENSED.size).toBe(2);
  });

  it("carries no absolute URL it could post an image to, but the one named exception", () => {
    /**
     * The ONE absolute-URL literal this lane is allowed, with its reason, asserted in both
     * directions below: it is not an endpoint at all. The rule survives the ruling because
     * it now says something narrower and still worth saying — the destination for a
     * student's photograph is configuration with a person behind it, never a string in a
     * source file. `httpVisionModel.ts` reaches an arbitrary vendor and contains no URL.
     */
    const allowed: ReadonlyMap<string, string> = new Map([
      [
        "http://ns.adobe.com/xap/1.0/",
        "the XMP namespace marker a JPEG APP1 segment opens with — a byte signature matched " +
          "against a local buffer to DELETE that segment, never fetched. Removing it would " +
          "stop the stripper recognizing XMP, which is a second copy of the GPS coordinates.",
      ],
    ]);
    const offenders: string[] = [];
    for (const path of LANE_ALL) {
      const source = SOURCE_TEXT.get(path) ?? "";
      // String LITERALS only: a prose URL in a docblock is a citation, not a destination.
      for (const match of source.matchAll(/["'`](https?:\/\/[^"'`\s]+)["'`]/g)) {
        const url = match[1] ?? "";
        if (!allowed.has(url)) {
          offenders.push(`${relative(path)} carries the literal ${url}`);
        }
      }
    }
    expect(offenders).toEqual([]);

    const allSource = LANE_ALL.map((path) => SOURCE_TEXT.get(path) ?? "").join("\n");
    for (const [url, why] of allowed) {
      expect(why.length).toBeGreaterThan(60);
      // Forwards: an exemption for a literal nothing uses exempts nothing.
      expect(allSource, `${url} is exempted but no longer appears in the lane`).toContain(
        url,
      );
      // Backwards: it is exempted because it is a byte signature. If it ever appears next to
      // a fetch, it has stopped being one.
      for (const path of LANE_ALL) {
        const source = SOURCE_TEXT.get(path) ?? "";
        if (!source.includes(url)) {
          continue;
        }
        expect(
          /fetch\(|axios|https?\.request|XMLHttpRequest/.test(source),
          `${relative(path)} both names ${url} and makes requests — the exemption says it ` +
            "is a signature matched against a local buffer, and that is no longer true",
        ).toBe(false);
      }
    }
  });

  it("never calls the parse from the INGEST path, which the ruling did not change", () => {
    // Uploading a photograph is not consenting to have a model read it (§6, opt-in). The
    // parse is a route a learner calls about an upload they already have, so `complete` may
    // not reach it — not the seam, not the port, not a provider.
    const ingest = SOURCE_TEXT.get(
      posix.join(ROOT, "services/diagnostic-api/src/workUpload.ts"),
    );
    expect(ingest).toBeDefined();
    for (const forbidden of [
      "workUploadParseSeam",
      "workUploadParse",
      "visionModel",
      "VisionModel",
    ]) {
      expect(
        ingest,
        `the ingest path names ${forbidden} — a model call in \`complete\` would make ` +
          "every upload a paid model read whether the learner asked for one or not",
      ).not.toContain(forbidden);
    }
  });

  it("hands the parse the STORED object, never bytes off a request and never a URL", () => {
    // §6's ingest strip is only worth anything if the parse reads what the strip WROTE. The
    // parse route reads through the object store, so its input is the post-sweep object by
    // construction; asserted here so a "reuse the bytes we already have" optimization cannot
    // quietly reintroduce the pre-strip ones.
    const parse = SOURCE_TEXT.get(
      posix.join(ROOT, "services/diagnostic-api/src/workUploadParse.ts"),
    );
    expect(parse).toBeDefined();
    expect(parse).toContain("objects.getObject(");
    // The port takes bytes, not a URL — a provider that fetches a URL needs a credential
    // into the private bucket, which is the one thing §6 exists to withhold.
    const port = SOURCE_TEXT.get(
      posix.join(ROOT, "services/diagnostic-api/src/visionModel.ts"),
    );
    const imageType = /export interface VisionImage \{[\s\S]*?\n\}/.exec(port ?? "");
    expect(imageType?.[0]).toBeDefined();
    expect(imageType?.[0]).toContain("bytes");
    expect(imageType?.[0]).not.toContain("url");
  });
});

describe("the one-way invariant, across the whole lane and not just the browser half", () => {
  it("imports nothing on the grading path", () => {
    const offenders: string[] = [];
    for (const path of LANE_ALL) {
      for (const { specifier } of imports(SOURCE_TEXT.get(path) ?? "")) {
        if (GRADING_PATH.some((pattern) => pattern.test(specifier))) {
          offenders.push(`${relative(path)} imports "${specifier}"`);
        }
      }
    }
    expect(
      offenders,
      "an upload is never an input to mastery, placement or the pre/post metric, and the " +
        "way that stays true is that there is no import to make it false. The 2026-08-05 " +
        "ruling did not touch this: it made it load-bearing, because the reading it " +
        "permitted is wrong on 37.62% of real student pages.",
    ).toEqual([]);
  });

  it("reaches @cr/diagnostic-runtime for TYPES only, and only from the service", () => {
    // The one specifier a server module legitimately needs: `DiagnosticAuthenticator` and
    // `DiagnosticServerResponse` live there, and a route cannot verify a Cognito token
    // without them. It is also where `computeStudentReadiness` lives — the pre/post metric
    // itself — so a VALUE import is exactly the path this invariant forbids, and a type
    // import structurally cannot carry one. The composition root is excused, by name, above.
    let typeOnlyUses = 0;
    for (const path of LANE) {
      for (const { specifier, typeOnly } of imports(SOURCE_TEXT.get(path) ?? "")) {
        if (!/@cr\/diagnostic(-runtime)?/.test(specifier)) {
          continue;
        }
        expect(
          relative(path).startsWith("services/"),
          `${relative(path)} imports ${specifier}, and only a server module may`,
        ).toBe(true);
        expect(
          typeOnly,
          `${relative(path)} imports ${specifier} as a VALUE — that module exports ` +
            "computeStudentReadiness, so a value import is a live route from an uploaded " +
            "photo into the pre/post metric",
        ).toBe(true);
        typeOnlyUses += 1;
      }
    }
    // Forwards: if nothing uses it, this exemption is stale and should be deleted rather
    // than left here excusing whatever is added next.
    expect(typeOnlyUses).toBeGreaterThanOrEqual(2);
  });

  it("exposes no scoring surface from the upload record", () => {
    // The record's TYPE, read as text: a field named here would be a field a scorer could
    // read, whatever the docblocks say.
    const wire = SOURCE_TEXT.get(
      posix.join(ROOT, "services/diagnostic-api/src/workUpload.ts"),
    );
    const recordType = /export interface WorkUploadRecordWire \{[\s\S]*?\n\}/.exec(
      wire ?? "",
    );
    expect(recordType?.[0]).toBeDefined();
    for (const forbidden of [
      "mastery",
      "score",
      "correct",
      "client_correct",
      "placement",
      "theta",
      "credit",
      "points",
    ]) {
      expect(recordType?.[0], `WorkUploadRecordWire carries "${forbidden}"`).not.toContain(
        forbidden,
      );
    }
  });
});

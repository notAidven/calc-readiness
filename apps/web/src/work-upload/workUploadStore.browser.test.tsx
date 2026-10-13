import { findImageMetadata } from "@cr/image-hygiene";
import { describe, expect, test, vi } from "vitest";

import { prepareForUpload } from "./imageIngest";
import {
  PresignedWorkUploadStore,
  type PresignRequest,
  type PresignResult,
  QR_FAST_FOLLOW_NOTE,
  requestPhonePairing,
} from "./presigned";
import { createWorkUploadStore, InMemoryWorkUploadStore } from "./store";
import type {
  LessonWorkUploadAssociation,
  StoredWorkUpload,
  WorkUploadAssociation,
} from "./types";
import { WorkUploadError } from "./types";
import { MAX_UPLOAD_BYTES, validateImageFile } from "./validation";

/**
 * Storage-seam tests (real Chromium: native File/Blob/crypto/URL/canvas). Covers the
 * in-memory store the dev and CI loop gets, the ingest validation gate, the client-side EXIF
 * strip, the presigned store now that the backend exists (with injected fakes — no network),
 * the QR fast-follow stub, and — load-bearing — the STORE-ONLY invariant: a stored upload
 * carries no scoring signal and the store exposes no grading surface.
 */

const ASSOCIATION: LessonWorkUploadAssociation = {
  surface: "lesson-practice",
  node_id: "NUM.F",
  item_version_id: "num-f.item.1",
  template_id: "num-f.reduce",
};

function imageFile(name = "work.png", type = "image/png", bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/**
 * A REAL JPEG, encoded by Chromium — because the client now strips metadata before uploading,
 * which means it also parses the container, which means a fixture of zero bytes is no longer
 * a photo as far as any of this is concerned. That is the behaviour, not an inconvenience: see
 * "refuses bytes that are not an image" below.
 */
async function realJpeg(width = 48, height = 32): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context in this browser");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111111";
  context.font = "16px sans-serif";
  context.fillText("3/4", 4, 22);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
  });
  if (!blob) {
    throw new Error("canvas produced no JPEG");
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** The GPS latitude bytes the EXIF fixture carries: 37° 25' 30.50" as LE rationals. */
const GPS_BYTES = new Uint8Array([
  37, 0, 0, 0, 1, 0, 0, 0, 25, 0, 0, 0, 1, 0, 0, 0, 234, 11, 0, 0, 100, 0, 0, 0,
]);

/** Splice an EXIF APP1 segment carrying those coordinates in after the JPEG's SOI. */
function withExifGps(jpeg: Uint8Array): Uint8Array {
  const header = new TextEncoder().encode(
    "Exif\u0000\u0000II*\u0000\u0008\u0000\u0000\u0000",
  );
  const payload = new Uint8Array(header.length + GPS_BYTES.length);
  payload.set(header, 0);
  payload.set(GPS_BYTES, header.length);
  const length = payload.length + 2;
  const segment = new Uint8Array(4 + payload.length);
  segment.set([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff], 0);
  segment.set(payload, 4);
  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(jpeg.subarray(2), 2 + segment.length);
  return out;
}

function containsBytes(haystack: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        continue outer;
      }
    }
    return true;
  }
  return false;
}

/** Keys that would mean an upload had leaked into the assessment/scoring path. */
const FORBIDDEN_KEYS = [
  "mastery",
  "score",
  "correct",
  "client_correct",
  "placement",
  "grade",
  "points",
  "ability",
];

describe("validateImageFile (ingest gate)", () => {
  test("accepts a small image", () => {
    expect(validateImageFile(imageFile()).ok).toBe(true);
  });

  test("rejects an empty file", () => {
    const result = validateImageFile(imageFile("x.png", "image/png", 0));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty");
    }
  });

  test("rejects a non-image file", () => {
    const result = validateImageFile(new File(["hi"], "notes.txt", { type: "text/plain" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_an_image");
    }
  });

  test("rejects a file over the size cap", () => {
    const result = validateImageFile(imageFile("big.png", "image/png", 2048), {
      maxBytes: 1024,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too_large");
    }
  });

  test("the default cap is 10 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("InMemoryWorkUploadStore", () => {
  test("stores a valid image and returns inert metadata", async () => {
    const store = new InMemoryWorkUploadStore();
    const record = await store.upload(imageFile(), ASSOCIATION);

    expect(record.id).toBeTruthy();
    expect(record.contentType).toBe("image/png");
    expect(record.sizeBytes).toBe(2048);
    expect(record.status).toBe("stored");
    expect(record.association).toEqual(ASSOCIATION);
    // Object key mirrors the eventual student-scoped S3 key shape.
    expect(record.objectKey).toContain("work-uploads/");
    expect(record.objectKey).toContain(ASSOCIATION.item_version_id);
  });

  test("rejects an invalid file with a WorkUploadError (never stored)", async () => {
    const store = new InMemoryWorkUploadStore();
    const bad = new File(["x"], "notes.txt", { type: "text/plain" });
    await expect(store.upload(bad, ASSOCIATION)).rejects.toBeInstanceOf(WorkUploadError);
    expect(await store.list()).toHaveLength(0);
  });

  test("lists uploads and narrows by association", async () => {
    const store = new InMemoryWorkUploadStore();
    await store.upload(imageFile(), ASSOCIATION);
    const other: WorkUploadAssociation = {
      surface: "lesson-practice",
      node_id: "NUM.A",
      item_version_id: "num-a.item.9",
    };
    await store.upload(imageFile("b.png"), other);

    expect(await store.list()).toHaveLength(2);
    const narrowed = await store.list({ item_version_id: ASSOCIATION.item_version_id });
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0]?.association.item_version_id).toBe(ASSOCIATION.item_version_id);
  });

  test("removes an upload", async () => {
    const store = new InMemoryWorkUploadStore();
    const record = await store.upload(imageFile(), ASSOCIATION);
    await store.remove(record.id);
    expect(await store.list()).toHaveLength(0);
    expect(store.getBlob(record.id)).toBeUndefined();
  });

  test("INVARIANT: the stored record carries no scoring signal", async () => {
    const store = new InMemoryWorkUploadStore();
    const record = await store.upload(imageFile(), ASSOCIATION);
    for (const key of FORBIDDEN_KEYS) {
      expect(record).not.toHaveProperty(key);
    }
    // Deep guard: nothing nested leaks a correctness/score field either.
    const serialized = JSON.stringify(record);
    for (const key of FORBIDDEN_KEYS) {
      expect(serialized).not.toContain(`"${key}"`);
    }
  });

  test("INVARIANT: the store exposes no grading surface", () => {
    const store = new InMemoryWorkUploadStore();
    const names = new Set([
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(store)),
      ...Object.keys(store),
    ]);
    expect(names.has("upload")).toBe(true);
    expect(names.has("remove")).toBe(true);
    expect(names.has("list")).toBe(true);
    for (const banned of ["grade", "score", "getMastery", "setMastery", "submitAnswer"]) {
      expect(names.has(banned)).toBe(false);
    }
  });
});

describe("the client-side strip, before a photo leaves the device", () => {
  test("removes the GPS block and still hands back a DECODABLE image", async () => {
    const original = await realJpeg(48, 32);
    const withGps = withExifGps(original);
    // The fixture is only evidence if the coordinates are provably in it.
    expect(containsBytes(withGps, GPS_BYTES)).toBe(true);
    expect(findImageMetadata(withGps).some((segment) => segment.kind === "exif")).toBe(
      true,
    );

    const prepared = await prepareForUpload(
      new File([withGps as unknown as BlobPart], "work.jpg", { type: "image/jpeg" }),
    );

    // THE MEASUREMENT: what would be PUT, searched for the coordinates.
    const outgoing = new Uint8Array(await prepared.blob.arrayBuffer());
    expect(containsBytes(outgoing, GPS_BYTES)).toBe(false);
    expect(findImageMetadata(outgoing)).toEqual([]);
    expect(prepared.removed.map((segment) => segment.kind)).toContain("exif");
    expect(prepared.transcoded).toBe(false);
    expect(prepared.contentType).toBe("image/jpeg");

    // AND IT IS STILL A PHOTOGRAPH. A stripper that broke the container would satisfy every
    // assertion above; the browser's own decoder is what rules that out.
    const decoded = await createImageBitmap(prepared.blob);
    expect(decoded.width).toBe(48);
    expect(decoded.height).toBe(32);
    decoded.close();
  });

  test("refuses bytes that are not an image the browser can decode", async () => {
    // `validateImageFile` only sees a declared `image/png`; this is the container check, and
    // it is the client half of the service's magic-number check.
    await expect(prepareForUpload(imageFile())).rejects.toBeInstanceOf(WorkUploadError);
    await expect(
      prepareForUpload(new File(["%PDF-1.7"], "notes.pdf", { type: "image/png" })),
    ).rejects.toThrow(/couldn't read that photo|can't prepare/i);
  });

  test("holds the prepared bytes to the size cap", async () => {
    const jpeg = await realJpeg(48, 32);
    await expect(
      prepareForUpload(
        new File([jpeg as unknown as BlobPart], "work.jpg", { type: "image/jpeg" }),
        16,
      ),
    ).rejects.toThrow(/too large/i);
  });
});

describe("PresignedWorkUploadStore (wired to the routes; injected fakes, no network)", () => {
  interface Harness {
    presign: (req: PresignRequest, token: string | null) => Promise<PresignResult>;
    complete: (
      req: { uploadId: string; association: WorkUploadAssociation; contentType: string },
      token: string | null,
    ) => Promise<StoredWorkUpload>;
    listRemote: () => Promise<readonly StoredWorkUpload[]>;
    deleteRemote: (id: string, token: string | null) => Promise<void>;
    presigns: { request: PresignRequest; token: string | null }[];
    completes: { uploadId: string; token: string | null }[];
    deletes: { id: string; token: string | null }[];
  }

  /** The four routes, in the shape the service answers them. */
  function fakeRoutes(overrides: { signedType?: string } = {}): Harness {
    const presigns: Harness["presigns"] = [];
    const completes: Harness["completes"] = [];
    const deletes: Harness["deletes"] = [];
    const stored: StoredWorkUpload = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      association: ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: 1234,
      createdAt: "2026-08-05T12:00:00.000Z",
      objectKey: "work-uploads/student-123/lesson-practice/NUM.F/num-f.item.1/obj.jpg",
      previewUrl: "https://uploads.example/get?sig=xyz",
      status: "uploaded",
    };
    return {
      presigns,
      completes,
      deletes,
      presign: async (request, token) => {
        presigns.push({ request, token });
        return {
          uploadUrl: "https://uploads.example/put?sig=abc",
          objectKey: stored.objectKey,
          uploadId: stored.id,
          contentType: overrides.signedType ?? request.contentType,
        };
      },
      complete: async (request, token) => {
        completes.push({ uploadId: request.uploadId, token });
        return stored;
      },
      listRemote: async () => [stored],
      deleteRemote: async (id, token) => {
        deletes.push({ id, token });
      },
    };
  }

  async function jpegFile(): Promise<File> {
    return new File([(await realJpeg()) as unknown as BlobPart], "work.jpg", {
      type: "image/jpeg",
    });
  }

  test("strips, presigns, PUTs, then confirms — and returns the SERVER's record", async () => {
    const routes = fakeRoutes();
    const puts: { url: string; type: string; bytes: Uint8Array }[] = [];
    const store = new PresignedWorkUploadStore({
      ...routes,
      getToken: async () => "jwt-token",
      putBlob: async (url, blob, type) => {
        puts.push({ url, type, bytes: new Uint8Array(await blob.arrayBuffer()) });
      },
    });

    const file = await jpegFile();
    const prepared = await prepareForUpload(file);
    const expectedBytes = new Uint8Array(await prepared.blob.arrayBuffer());
    const record = await store.upload(file, ASSOCIATION);

    expect(routes.presigns).toHaveLength(1);
    expect(routes.presigns[0]?.token).toBe("jwt-token");
    expect(routes.presigns[0]?.request.contentType).toBe("image/jpeg");
    expect(puts).toHaveLength(1);
    expect(puts[0]?.url).toContain("uploads.example");
    expect([...((puts[0]?.bytes ?? new Uint8Array()) as Uint8Array)]).toEqual([
      ...expectedBytes,
    ]);
    // The confirm step ran, and it is the record the store returns: until it does, nothing is
    // indexed, so a store that answered before it would be reporting a save that had not
    // happened.
    expect(routes.completes).toEqual([{ uploadId: record.id, token: "jwt-token" }]);
    expect(record.status).toBe("uploaded");
    expect(record.objectKey).toContain("student-123");
    for (const key of FORBIDDEN_KEYS) {
      expect(record).not.toHaveProperty(key);
    }
  });

  test("PUTs the type the presign SIGNED for, not the one it asked for", async () => {
    // The content type is inside the signature, so the route's echo is authoritative: sending
    // anything else is a 403 from S3.
    const routes = fakeRoutes({ signedType: "image/jpeg" });
    const puts: string[] = [];
    const store = new PresignedWorkUploadStore({
      ...routes,
      getToken: async () => "jwt-token",
      putBlob: async (_url, _blob, type) => {
        puts.push(type);
      },
    });
    await store.upload(await jpegFile(), ASSOCIATION);
    expect(puts).toEqual(["image/jpeg"]);
  });

  test("validates before presigning (a bad file never hits the network)", async () => {
    const routes = fakeRoutes();
    const store = new PresignedWorkUploadStore({
      ...routes,
      getToken: async () => "jwt-token",
      putBlob: async () => {
        throw new Error("should not PUT an invalid file");
      },
    });
    const bad = new File(["x"], "notes.txt", { type: "text/plain" });
    await expect(store.upload(bad, ASSOCIATION)).rejects.toBeInstanceOf(WorkUploadError);
    expect(routes.presigns).toHaveLength(0);
  });

  test("refuses rather than pretending, when there is no signed-in student", async () => {
    // A photo belongs to a verified `sub`. Falling back to the in-memory stub here would tell
    // a signed-out learner their work was saved into a tab they are about to close.
    const routes = fakeRoutes();
    const store = new PresignedWorkUploadStore({ ...routes, getToken: async () => null });
    await expect(store.upload(await jpegFile(), ASSOCIATION)).rejects.toMatchObject({
      name: "WorkUploadError",
      reason: "signed_out",
    });
    expect(routes.presigns).toHaveLength(0);
  });

  test("lists the owner's uploads and deletes one by id, with the bearer token", async () => {
    const routes = fakeRoutes();
    const store = new PresignedWorkUploadStore({
      ...routes,
      getToken: async () => "jwt-token",
    });

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.objectKey).toContain("student-123");

    await store.remove("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(routes.deletes).toEqual([
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", token: "jwt-token" },
    ]);
  });
});

describe("createWorkUploadStore picks by whether there is a server", () => {
  test("returns the in-memory store when nothing is configured (the dev and CI loop)", () => {
    // This is the branch CI observes, and it is the reason the in-memory store is not dead
    // code now that the backend exists: `VITE_DIAGNOSTIC_API_URL` is unset here.
    expect(createWorkUploadStore()).toBeInstanceOf(InMemoryWorkUploadStore);
  });

  test("returns the presigned byte path for an ordinary configured account build", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_pool");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "public-client");
    window.history.replaceState(null, "", "/");
    try {
      expect(createWorkUploadStore()).toBeInstanceOf(PresignedWorkUploadStore);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("QR desktop→phone hand-off (Option B fast-follow)", () => {
  test("is stubbed and throws with the documented reason", () => {
    expect(() => requestPhonePairing()).toThrow(QR_FAST_FOLLOW_NOTE);
    expect(QR_FAST_FOLLOW_NOTE).toMatch(/fast-follow/i);
  });
});

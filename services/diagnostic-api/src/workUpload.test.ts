import { S3Client } from "@aws-sdk/client-s3";
import type { DiagnosticAuthenticator } from "@cr/diagnostic-runtime";
import { findImageMetadata } from "@cr/image-hygiene";
import { describe, expect, it } from "vitest";

import { createDiagnosticApi } from "./app";
import {
  createFakeObjectStore,
  createFakeWorkUploadCluster,
  type FakeRow,
} from "./test/fakeWorkUpload";
import {
  createWorkUploadService,
  MAX_WORK_UPLOAD_BYTES,
  WORK_UPLOAD_KEY_PREFIX,
  WORK_UPLOAD_STATEMENTS,
  workUploadObjectKey,
} from "./workUpload";
import { createS3WorkUploadObjectStore } from "./workUploadObjects";
import {
  DEFAULT_WORK_UPLOAD_PARSER,
  selectVisionModel,
  WORK_UPLOAD_PARSERS,
} from "./workUploadParseSeam";

/**
 * The photo-of-work upload backend (`docs/Photo_Work_Upload_Scope.md` §§4–6).
 *
 * The load-bearing case in this file is **"one student cannot read another student's
 * photo"**, and it is written to be falsifiable: the DB double applies the WHERE clause it
 * finds in the statement rather than scoping by parameter, so deleting `and student_id =
 * :sid` from `WORK_UPLOAD_STATEMENTS` makes these cases fail instead of passing over a
 * double that was doing the work. See `test/fakeWorkUpload.ts`.
 *
 * The other load-bearing case is that EXIF/geolocation is REMOVED FROM THE STORED BYTES on
 * ingest, asserted by looking at what the bucket holds afterwards rather than at what the
 * service called.
 */

const STUDENT_A = "11111111-1111-4111-8111-111111111111";
const STUDENT_B = "22222222-2222-4222-8222-222222222222";

/** Tokens are `jwt:<sub>`; anything else is unverified, exactly as a bad signature would be. */
const authenticate: DiagnosticAuthenticator = async (token) => {
  const sub = typeof token === "string" ? /^jwt:(.+)$/.exec(token)?.[1] : undefined;
  return sub === undefined ? null : { student_id: sub as never };
};

const LESSON_ASSOCIATION = {
  surface: "lesson-practice",
  node_id: "NUM.F",
  item_version_id: "num-f.item.1",
  template_id: "num-f.reduce",
};

function bytes(...values: (number | number[] | Uint8Array | string)[]): Uint8Array {
  const flat: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      flat.push(value);
    } else if (typeof value === "string") {
      for (let index = 0; index < value.length; index += 1) {
        flat.push(value.charCodeAt(index));
      }
    } else {
      // Appended one at a time rather than spread: the oversize case builds a 10 MB array,
      // and `push(...huge)` is a stack overflow rather than a test.
      for (const byte of value) {
        flat.push(byte);
      }
    }
  }
  return new Uint8Array(flat);
}

/** The GPS latitude bytes the fixtures carry, hunted for in what ends up stored. */
const GPS_BYTES = bytes([37, 0, 0, 0, 1, 0, 0, 0, 25, 0, 0, 0, 1, 0, 0, 0]);

/** Whether `haystack` contains `needle`, byte for byte. No `Buffer`: this project has no node types. */
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

/** A JPEG whose APP1 segment carries an EXIF block with the coordinates above. */
function jpegWithGps(scanPadding = 0): Uint8Array {
  const exif = bytes("Exif\u0000\u0000", "II", [0x2a, 0x00, 8, 0, 0, 0], GPS_BYTES);
  const length = exif.length + 2;
  return bytes(
    [0xff, 0xd8],
    [0xff, 0xe1, (length >> 8) & 0xff, length & 0xff],
    [...exif],
    [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00],
    new Array(scanPadding).fill(0x5a),
    [0x11, 0x22, 0x33],
    [0xff, 0xd9],
  );
}

interface Harness {
  service: ReturnType<typeof createWorkUploadService>;
  cluster: ReturnType<typeof createFakeWorkUploadCluster>;
  objects: ReturnType<typeof createFakeObjectStore>;
  uploadId: string;
}

function harness(options: { rows?: readonly FakeRow[]; uploadId?: string } = {}): Harness {
  const uploadId = options.uploadId ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const cluster = createFakeWorkUploadCluster(options.rows ?? []);
  const objects = createFakeObjectStore();
  return {
    cluster,
    objects,
    uploadId,
    service: createWorkUploadService({
      db: cluster.db,
      authenticate,
      objects,
      newUploadId: () => uploadId,
    }),
  };
}

/** A stored upload belonging to `studentId`, as `complete` would have left it. */
function seededRow(studentId: string, uploadId: string): FakeRow {
  return {
    upload_id: uploadId,
    student_id: studentId,
    object_key: `${WORK_UPLOAD_KEY_PREFIX}${studentId}/lesson-practice/NUM.F/num-f.item.1/${uploadId}.jpg`,
    content_type: "image/jpeg",
    size_bytes: 4096,
    surface: "lesson-practice",
    node_id: "NUM.F",
    administration_id: null,
    item_version_id: "num-f.item.1",
    template_id: null,
    attempt_id: null,
    created_at: 1_780_000_500,
  };
}

/** presign → PUT the given bytes → complete. The whole authenticated happy path. */
async function uploadPhoto(
  bag: Harness,
  studentId: string,
  photo: Uint8Array,
  association: unknown = LESSON_ASSOCIATION,
) {
  const presigned = await bag.service.presign(`jwt:${studentId}`, {
    association,
    contentType: "image/jpeg",
    sizeBytes: photo.length,
  });
  const minted = presigned.body as { objectKey: string; uploadId: string };
  // The browser's PUT, straight to the bucket with the presigned URL.
  await bag.objects.putObject(minted.objectKey, "image/jpeg", photo);
  const completed = await bag.service.complete(`jwt:${studentId}`, {
    association,
    contentType: "image/jpeg",
    uploadId: minted.uploadId,
  });
  return { presigned, minted, completed };
}

describe("POST /api/work-upload — a valid authenticated upload", () => {
  it("mints a short-lived PUT under the caller's own prefix and records the row on complete", async () => {
    const bag = harness();
    const photo = jpegWithGps();
    const { presigned, minted, completed } = await uploadPhoto(bag, STUDENT_A, photo);

    expect(presigned.status).toBe(200);
    expect(minted.objectKey).toBe(
      `work-uploads/${STUDENT_A}/lesson-practice/NUM.F/num-f.item.1/${bag.uploadId}.jpg`,
    );
    expect(presigned.body).toMatchObject({
      uploadUrl: expect.stringContaining("uploads.test"),
      expiresInSeconds: 300,
      contentType: "image/jpeg",
    });

    expect(completed.status).toBe(200);
    const record = (completed.body as { upload: Record<string, unknown> }).upload;
    // Exactly the shape `apps/web`'s `parseStoredWorkUpload` reads — no more, no less.
    expect(Object.keys(record).sort()).toEqual([
      "association",
      "contentType",
      "createdAt",
      "id",
      "objectKey",
      "previewUrl",
      "sizeBytes",
      "status",
    ]);
    expect(record.status).toBe("uploaded");
    expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.association).toEqual(LESSON_ASSOCIATION);

    // One row, the caller's, pointing at the object that was actually stored.
    expect(bag.cluster.rows).toHaveLength(1);
    expect(bag.cluster.rows[0]).toMatchObject({
      student_id: STUDENT_A,
      object_key: minted.objectKey,
      content_type: "image/jpeg",
      surface: "lesson-practice",
      node_id: "NUM.F",
      administration_id: null,
    });
  });

  it("records a post-diagnostic review upload against its administration", async () => {
    const bag = harness();
    const administration = "33333333-3333-4333-8333-333333333333";
    const { completed } = await uploadPhoto(bag, STUDENT_A, jpegWithGps(), {
      surface: "diagnostic-review",
      administration_id: administration,
      item_version_id: "num-f.item.9",
    });

    expect(completed.status).toBe(200);
    expect(bag.cluster.rows[0]).toMatchObject({
      administration_id: administration,
      node_id: null,
      surface: "diagnostic-review",
    });
  });

  it("is idempotent, so a retried complete lands on the row that is already there", async () => {
    const bag = harness();
    const photo = jpegWithGps();
    const { minted } = await uploadPhoto(bag, STUDENT_A, photo);
    const again = await bag.service.complete(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId: minted.uploadId,
    });

    expect(again.status).toBe(200);
    expect(bag.cluster.rows).toHaveLength(1);
  });

  it("answers 401 on every route without a verified token", async () => {
    const bag = harness({
      rows: [seededRow(STUDENT_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")],
    });
    const unverified = [null, "", "not-a-jwt"];
    for (const token of unverified) {
      expect((await bag.service.presign(token, {})).status).toBe(401);
      expect((await bag.service.complete(token, {})).status).toBe(401);
      expect((await bag.service.list(token, null)).status).toBe(401);
      expect(
        (await bag.service.remove(token, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).status,
      ).toBe(401);
    }
    // And nothing was read, signed or written on the way to those 401s.
    expect(bag.cluster.issued).toEqual([]);
    expect(bag.objects.signed).toEqual([]);
  });
});

describe("the wrong content type is refused", () => {
  it("refuses a declared type that cannot be verified or stripped, before any upload", async () => {
    const bag = harness();
    for (const contentType of [
      "application/pdf",
      "text/plain",
      "image/heic",
      "",
      "image/*",
    ]) {
      const response = await bag.service.presign(`jwt:${STUDENT_A}`, {
        association: LESSON_ASSOCIATION,
        contentType,
        sizeBytes: 2048,
      });
      expect(response.status, contentType).toBe(415);
    }
    // No URL was minted, so there is no way to put anything in the bucket at all.
    expect(bag.objects.signed).toEqual([]);
  });

  it("refuses bytes that are not an image even when the declared type was, and deletes them", async () => {
    // THE CHECK A HEADER CANNOT MAKE. The caller signs for image/jpeg and PUTs a PDF; only
    // `complete` can see that, because only `complete` sees bytes.
    const bag = harness();
    const { minted, completed } = await uploadPhoto(
      bag,
      STUDENT_A,
      bytes("%PDF-1.7\n%junk"),
    );

    expect(completed.status).toBe(415);
    expect((completed.body as { error: string }).error).toMatch(/not a JPEG, PNG or WebP/);
    // The object is gone, not left in the bucket for a lifecycle rule to notice in 180 days.
    expect(bag.objects.deleted).toEqual([minted.objectKey]);
    expect(bag.objects.objects.has(minted.objectKey)).toBe(false);
    expect(bag.cluster.rows).toEqual([]);
  });

  it("records the sniffed type, not the caller's claim", async () => {
    const bag = harness();
    // A real PNG uploaded while declaring JPEG: storable, so the row must describe the file.
    const png = bytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      [0, 0, 0, 13],
      "IHDR",
      [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0],
      [1, 2, 3, 4],
      [0, 0, 0, 0],
      "IEND",
      [0, 0, 0, 0],
    );
    const { completed } = await uploadPhoto(bag, STUDENT_A, png);
    expect(completed.status).toBe(200);
    expect(bag.cluster.rows[0]?.content_type).toBe("image/png");
  });
});

describe("an oversize photo is refused", () => {
  it("refuses a declared size over the cap", async () => {
    const bag = harness();
    const response = await bag.service.presign(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: MAX_WORK_UPLOAD_BYTES + 1,
    });
    expect(response.status).toBe(413);
    expect(bag.objects.signed).toEqual([]);
  });

  it("refuses bytes over the cap even when the declared size was under it", async () => {
    // The size at presign is a CLAIM. A caller can sign for 2 KB and PUT 11 MB, and this is
    // where that is caught — against what the bucket actually holds.
    const bag = harness();
    const huge = jpegWithGps(MAX_WORK_UPLOAD_BYTES);
    const presigned = await bag.service.presign(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: 2048,
    });
    const minted = presigned.body as { objectKey: string; uploadId: string };
    await bag.objects.putObject(minted.objectKey, "image/jpeg", huge);

    const completed = await bag.service.complete(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId: minted.uploadId,
    });
    expect(completed.status).toBe(413);
    expect(bag.objects.objects.has(minted.objectKey)).toBe(false);
    expect(bag.cluster.rows).toEqual([]);
  });

  it("refuses a photo whose upload was cut off half way, and bins it", async () => {
    // The shape a dropped connection leaves: the first bytes arrived, so it SNIFFS as a JPEG,
    // and the container is broken inside. The strip throws on it, and that has to read as a
    // 415 about the file rather than a 500 about us — with the partial object removed, not
    // left for the retention rule to find in six months.
    const bag = harness();
    const truncated = jpegWithGps().subarray(0, 12);
    const presigned = await bag.service.presign(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: 2048,
    });
    const minted = presigned.body as { objectKey: string; uploadId: string };
    await bag.objects.putObject(minted.objectKey, "image/jpeg", truncated);

    const completed = await bag.service.complete(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId: minted.uploadId,
    });
    expect(completed.status).toBe(415);
    expect((completed.body as { error: string }).error).toMatch(/did not arrive complete/);
    expect(bag.objects.objects.has(minted.objectKey)).toBe(false);
    expect(bag.cluster.rows).toEqual([]);
  });

  it("refuses to index an upload that was never PUT", async () => {
    const bag = harness();
    const completed = await bag.service.complete(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId: bag.uploadId,
    });
    expect(completed.status).toBe(404);
    expect(bag.cluster.rows).toEqual([]);
  });
});

describe("EXIF/geolocation is gone from what is STORED", () => {
  it("strips the GPS block out of the object on ingest", async () => {
    const bag = harness();
    const photo = jpegWithGps();
    // The fixture is only evidence if the coordinates are provably in what was uploaded.
    expect(findImageMetadata(photo).map((segment) => segment.kind)).toEqual(["exif"]);

    const { minted, completed } = await uploadPhoto(bag, STUDENT_A, photo);
    const stored = bag.objects.objects.get(minted.objectKey);

    expect(completed.status).toBe(200);
    expect(stored).toBeDefined();
    // THE MEASUREMENT: the bytes in the bucket, searched for the coordinates.
    const inBucket = stored?.bytes ?? new Uint8Array();
    expect(containsBytes(inBucket, GPS_BYTES)).toBe(false);
    expect(findImageMetadata(inBucket)).toEqual([]);
    // The scan survived, so a reviewer can still read the handwriting.
    expect(containsBytes(inBucket, bytes([0x11, 0x22, 0x33]))).toBe(true);

    // The row's size is the STRIPPED size, and the response says what was removed.
    expect(bag.cluster.rows[0]?.size_bytes).toBe(stored?.bytes.length);
    expect(bag.cluster.rows[0]?.size_bytes).toBeLessThan(photo.length);
    expect((completed.body as { strippedOnIngest: unknown[] }).strippedOnIngest).toEqual([
      { kind: "exif", where: "JPEG APP1", byteLength: expect.any(Number) },
    ]);
  });

  it("leaves an already-stripped photo untouched and reports nothing removed", async () => {
    // What the shipped client produces: it strips before the PUT, so ingest finds nothing.
    const bag = harness();
    const clean = bytes(
      [0xff, 0xd8],
      [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00],
      [0x11, 0x22, 0x33],
      [0xff, 0xd9],
    );
    const { minted, completed } = await uploadPhoto(bag, STUDENT_A, clean);

    expect(completed.status).toBe(200);
    expect((completed.body as { strippedOnIngest: unknown[] }).strippedOnIngest).toEqual(
      [],
    );
    expect([...(bag.objects.objects.get(minted.objectKey)?.bytes ?? [])]).toEqual([
      ...clean,
    ]);
  });
});

describe("GET /api/work-upload — the owner only, which is the security property", () => {
  const A_UPLOAD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B_UPLOAD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  function twoStudents() {
    return harness({
      rows: [seededRow(STUDENT_A, A_UPLOAD), seededRow(STUDENT_B, B_UPLOAD)],
      uploadId: A_UPLOAD,
    });
  }

  it("lists the caller's own uploads and nothing else", async () => {
    const bag = twoStudents();
    const response = await bag.service.list(`jwt:${STUDENT_B}`, null);
    const uploads = (response.body as { uploads: { id: string; objectKey: string }[] })
      .uploads;

    expect(response.status).toBe(200);
    // NOT `toHaveLength(1)` alone: the row count is the point, and so is whose it is.
    expect(uploads.map((upload) => upload.id)).toEqual([B_UPLOAD]);
    expect(uploads[0]?.objectKey).toContain(STUDENT_B);
    for (const upload of uploads) {
      expect(upload.objectKey).not.toContain(STUDENT_A);
    }
    // AND no presigned URL was minted for the other student's object. A URL is the only
    // thing that can reach an object, so this is the reachability claim.
    expect(bag.objects.signed.map((request) => request.objectKey)).toEqual([
      seededRow(STUDENT_B, B_UPLOAD).object_key,
    ]);
  });

  it("narrows to one item and still refuses to cross the student boundary", async () => {
    const bag = twoStudents();
    const response = await bag.service.list(`jwt:${STUDENT_B}`, "num-f.item.1");
    const uploads = (response.body as { uploads: { id: string }[] }).uploads;
    expect(uploads.map((upload) => upload.id)).toEqual([B_UPLOAD]);

    // A different item: empty, rather than "somebody's upload of that item".
    const other = await bag.service.list(`jwt:${STUDENT_B}`, "num-a.item.7");
    expect((other.body as { uploads: unknown[] }).uploads).toEqual([]);
  });

  it("refuses to delete another student's upload, and leaves both halves of it alone", async () => {
    const bag = twoStudents();
    const response = await bag.service.remove(`jwt:${STUDENT_B}`, A_UPLOAD);

    // 404, not 403: our answer must not confirm that another student's id exists.
    expect(response.status).toBe(404);
    expect(bag.objects.deleted).toEqual([]);
    expect(bag.cluster.rows.map((row) => row.upload_id).sort()).toEqual(
      [A_UPLOAD, B_UPLOAD].sort(),
    );
  });

  it("deletes the caller's own upload — object first, then the row", async () => {
    const bag = twoStudents();
    const response = await bag.service.remove(`jwt:${STUDENT_A}`, A_UPLOAD);

    expect(response.status).toBe(200);
    expect(bag.objects.deleted).toEqual([seededRow(STUDENT_A, A_UPLOAD).object_key]);
    expect(bag.cluster.rows.map((row) => row.upload_id)).toEqual([B_UPLOAD]);
  });

  it("cannot be handed another student's object key, because no route accepts one", async () => {
    // The client sends an association and an id; the key is RECOMPUTED from the verified
    // sub. So this hostile `objectKey` is not rejected — it is not read at all, and the
    // upload lands under B's own prefix.
    const bag = harness({ uploadId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    const victimKey = seededRow(STUDENT_A, A_UPLOAD).object_key;
    const presigned = await bag.service.presign(`jwt:${STUDENT_B}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: 64,
      objectKey: victimKey,
    });
    const minted = presigned.body as { objectKey: string; uploadId: string };
    expect(minted.objectKey).toContain(`${WORK_UPLOAD_KEY_PREFIX}${STUDENT_B}/`);
    expect(minted.objectKey).not.toBe(victimKey);

    await bag.objects.putObject(minted.objectKey, "image/jpeg", jpegWithGps());
    const completed = await bag.service.complete(`jwt:${STUDENT_B}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId: minted.uploadId,
      objectKey: victimKey,
    });
    expect(completed.status).toBe(200);
    expect(bag.cluster.rows[0]?.object_key).toContain(STUDENT_B);
    expect(
      bag.objects.signed.every((request) => request.objectKey.includes(STUDENT_B)),
    ).toBe(true);
  });

  it("cannot climb out of its prefix with a traversing association", async () => {
    const bag = harness();
    const presigned = await bag.service.presign(`jwt:${STUDENT_B}`, {
      association: {
        surface: "lesson-practice",
        node_id: `../../${STUDENT_A}`,
        item_version_id: "../../../etc/passwd",
      },
      contentType: "image/jpeg",
      sizeBytes: 64,
    });
    const key = (presigned.body as { objectKey: string }).objectKey;
    // WHOSE PREFIX IT IS, which is the only thing that decides reachability: the second
    // segment is the verified sub and nothing a caller writes can change it. The hostile
    // ids survive as filing text inside later segments, harmlessly — a key is opaque to S3
    // — but they cannot introduce a separator or a `..`.
    expect(key.split("/").slice(0, 2)).toEqual([
      WORK_UPLOAD_KEY_PREFIX.slice(0, -1),
      STUDENT_B,
    ]);
    expect(key).not.toContain("..");
    // `work-uploads / sub / surface / anchor / item / id.jpg` — six, so neither hostile id
    // opened an extra level.
    expect(key.split("/")).toHaveLength(6);
  });
});

describe("every statement is sub-scoped", () => {
  it("binds :sid and filters on student_id in all five", async () => {
    // Derived from the exported statements rather than from the call sites, so a sixth
    // statement added tomorrow is inside this sweep whether or not anyone returns here.
    const statements = Object.entries(WORK_UPLOAD_STATEMENTS);
    expect(statements.length).toBeGreaterThanOrEqual(5);
    for (const [name, sql] of statements) {
      expect(sql, `${name} does not bind the caller's own id`).toContain(":sid::uuid");
      if (/^\s*insert/i.test(sql)) {
        // An insert cannot filter; it must WRITE the verified sub into the row.
        expect(sql, `${name} must store student_id from :sid`).toMatch(
          /\(\s*upload_id[\s\S]*student_id/,
        );
        continue;
      }
      expect(sql, `${name} reaches rows without scoping them to the caller`).toMatch(
        /where[\s\S]*student_id\s*=\s*:sid/i,
      );
    }
  });

  it("never issues an update, which is why the table has no update grant", async () => {
    for (const [name, sql] of Object.entries(WORK_UPLOAD_STATEMENTS)) {
      expect(/^\s*update\b/i.test(sql), `${name} is an update`).toBe(false);
      expect(/do\s+update/i.test(sql), `${name} upserts`).toBe(false);
    }
  });
});

describe("the presigner that actually signs (offline, static credentials)", () => {
  it("signs a PUT for one key, with a five-minute expiry", async () => {
    // The real @aws-sdk presigner, computing a real SigV4 query signature locally — no
    // network, no credentials from the environment. What a fake cannot check is that the
    // URL is scoped and short-lived, and that is exactly what is checked here.
    const objects = createS3WorkUploadObjectStore({
      bucket: "cr-work-uploads-test",
      client: new S3Client({
        region: "us-east-1",
        credentials: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "secret" },
      }),
    });
    const key = workUploadObjectKey(
      STUDENT_A,
      { surface: "lesson-practice", node_id: "NUM.F", item_version_id: "num-f.item.1" },
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "jpeg",
    );

    const put = await objects.presignPut(key, "image/jpeg");
    const url = new URL(put.url);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toContain("cr-work-uploads-test");
    expect(url.pathname).toContain(`work-uploads/${STUDENT_A}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    // The content type is part of the signature, so S3 refuses bytes sent under another.
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(put.expiresInSeconds).toBe(300);

    const get = await objects.presignGet(key);
    expect(new URL(get.url).searchParams.get("X-Amz-Expires")).toBe("300");
    // A signature over one key: it authorizes that object and no other.
    expect(new URL(get.url).pathname.endsWith(".jpg")).toBe(true);
  });
});

describe("the v2 AI-parse seam is wired, and the INGEST path still is not", () => {
  /**
   * §3.5's gate was lifted on 2026-08-05 (see that section's banner), so the registry that
   * had to stay empty now holds two providers. What did NOT change is where the parse
   * attaches: `complete` calls no model, so uploading a photo is not consenting to have one
   * read it. `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` holds that from outside;
   * this is the same claim measured through the service the browser actually talks to.
   */
  /**
   * THE CENSUS IS EXACT, AND IT IS WHAT KEEPS A CANNED PROVIDER OUT.
   *
   * Both entries reach a real model. A registry entry that answers from a table instead would be
   * the one whose selection by accident is invisible in the worst way: a learner shown a
   * confident transcript that no model produced, with no surface downstream able to tell. One
   * existed briefly — `scripted-demo`, for the scripted work-checker demonstration — and adding
   * its like back fails here, on the exact set, rather than needing a rule of its own.
   */
  it("registers exactly the named providers, and defaults to the keyless one", () => {
    expect(Object.keys(WORK_UPLOAD_PARSERS).sort()).toEqual([
      "bedrock-converse",
      "http-chat-completions",
    ]);
    // The default is the one with no API key: it signs with the execution role, so on the
    // shipped configuration there is no credential to store, rotate or leak.
    expect(DEFAULT_WORK_UPLOAD_PARSER).toBe("bedrock-converse");
    const model = selectVisionModel(DEFAULT_WORK_UPLOAD_PARSER, { modelId: "a-model" });
    expect(model.id).toBe("bedrock-converse");
    expect(model.modelId).toBe("a-model");
  });

  it("names which ids exist when the stack asks for one that does not", () => {
    // Derived from the registry rather than spelled out, because the point of the message is
    // to name what EXISTS: a hardcoded list here would go on reporting a registry the tree
    // has outgrown, and would break on the insertion ORDER of an entry rather than on
    // anything a caller cares about.
    const message = String(
      (() => {
        try {
          selectVisionModel("not-a-provider", { modelId: "m" });
          return new Error("selectVisionModel accepted an id the registry does not hold");
        } catch (error) {
          return error;
        }
      })(),
    );
    expect(message).toContain("not-a-provider");
    for (const id of Object.keys(WORK_UPLOAD_PARSERS)) {
      expect(message, `the error does not name the registered provider ${id}`).toContain(
        id,
      );
    }
    // A floor under the loop, which is satisfied for free over an empty registry. Two, because
    // the registry holds two since `scripted-demo` went with the demonstration it was built for;
    // the census above is what pins WHICH two.
    expect(Object.keys(WORK_UPLOAD_PARSERS).length).toBeGreaterThanOrEqual(2);
  });

  it("never reaches a model from the upload path, even when the parse is configured", async () => {
    // The whole ingest round trip, with a bucket and a table but no parse service anywhere
    // near it: `presign` → PUT → `complete` stores a row and calls nothing else.
    const bag = harness();
    const presigned = await bag.service.presign(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      sizeBytes: 4096,
    });
    const { uploadId, objectKey } = presigned.body as {
      uploadId: string;
      objectKey: string;
    };
    bag.objects.objects.set(objectKey, {
      contentType: "image/jpeg",
      bytes: jpegWithGps(),
    });
    const completed = await bag.service.complete(`jwt:${STUDENT_A}`, {
      association: LESSON_ASSOCIATION,
      contentType: "image/jpeg",
      uploadId,
    });
    expect(completed.status).toBe(200);
    // The row exists, and nothing about it names a reading. The parse is a separate request.
    expect(bag.cluster.rows).toHaveLength(1);
    for (const statement of bag.cluster.issued) {
      expect(statement.sql).not.toContain("work_upload_parse");
    }
  });
});

describe("the routes are mounted and gated", () => {
  it("serves all four work-upload routes and 401s them without a token", async () => {
    const bag = harness();
    const app = createDiagnosticApi({
      getServer: () => ({ handle: async () => ({ status: 200, body: {} }) }),
      getWorkUploads: () => bag.service,
    });
    const table = app.routes
      .filter((route) => route.method !== "ALL" && route.path.includes("work-upload"))
      .map((route) => `${route.method} ${route.path}`)
      .sort();
    expect(table).toEqual([
      "DELETE /api/work-upload",
      "GET /api/work-upload",
      "POST /api/work-upload",
      "POST /api/work-upload/complete",
    ]);

    for (const route of table) {
      const [method, path] = route.split(" ");
      const response = await app.request(String(path), {
        method,
        headers: { "content-type": "application/json" },
        ...(method === "POST" ? { body: "{}" } : {}),
      });
      expect(response.status, `${route} without a token`).toBe(401);
    }
  });

  it("passes the query parameters through, so ?item= and ?id= reach the service", async () => {
    const bag = harness({
      rows: [seededRow(STUDENT_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")],
    });
    const app = createDiagnosticApi({
      getServer: () => ({ handle: async () => ({ status: 200, body: {} }) }),
      getWorkUploads: () => bag.service,
    });

    const listed = await app.request("/api/work-upload?item=num-f.item.1", {
      headers: { authorization: `Bearer jwt:${STUDENT_A}` },
    });
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as { uploads: unknown[] }).uploads).toHaveLength(1);

    // A route that dropped `?item=` would list everything and still answer 200, so the
    // narrowing is asserted through the HTTP layer and not only through the service.
    const narrowed = await app.request("/api/work-upload?item=nothing.like.it", {
      headers: { authorization: `Bearer jwt:${STUDENT_A}` },
    });
    expect(((await narrowed.json()) as { uploads: unknown[] }).uploads).toEqual([]);

    const deleted = await app.request(
      "/api/work-upload?id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      { method: "DELETE", headers: { authorization: `Bearer jwt:${STUDENT_A}` } },
    );
    expect(deleted.status).toBe(200);
    expect(bag.cluster.rows).toEqual([]);
  });
});

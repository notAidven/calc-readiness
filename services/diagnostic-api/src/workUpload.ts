import type { DataApiExecutor, SqlParams } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  formatForContentType,
  type ImageFormat,
  imageContentType,
  type StripResult,
  sniffImageFormat,
  stripImageMetadata,
} from "@cr/image-hygiene";
import type { UUID } from "@cr/state-schema";

import type { WorkUploadObjectStore } from "./workUploadObjects";
import { describeWriteFailure } from "./writes";

/**
 * **THE PHOTO-OF-WORK UPLOAD BACKEND** — the four things
 * `docs/Photo_Work_Upload_Scope.md` §4 marks MUST ADD, minus the bucket (`infra/`) and the
 * table (`db/migrations/0009_work_upload.sql`).
 *
 * A student who got a question wrong, or gave up on it, can attach a photo of the working
 * they did on paper. It is held for a person to look at later and it is **one-way**: it is
 * never an input to mastery, placement, or the pre/post metric (§1, §3.5, §7). Nothing in
 * this file imports a scorer, a checker or the mastery service, and nothing it writes is
 * read by one — `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` holds that from
 * outside.
 *
 * ## The shape: presign → PUT → complete, and why there is a third step
 *
 * The browser PUTs its bytes straight to S3 with a short-lived presigned URL, so a 10 MB
 * photograph never travels through API Gateway (a 10 MB base64 body is ~13 MB, past
 * Lambda's 6 MB synchronous payload limit) and we pay for no bandwidth through the
 * function. That is the design §4 asks for, and it has one consequence worth being explicit
 * about, because it is the whole reason for the `complete` step:
 *
 *   **In a presigned-PUT design the route that mints the URL never sees the bytes.**
 *
 * §6 requires EXIF/geolocation to be stripped on ingest. A route that only signs a URL
 * cannot strip anything — there is nothing in its hands to strip — so "strip EXIF" has to
 * happen where the bytes are. Both places do it:
 *
 *  1. the BROWSER strips before it PUTs (`apps/web/src/work-upload`), so the geolocation of
 *     a child's home never leaves the device even once;
 *  2. `complete` strips AGAIN, server-side, reading the stored object back and overwriting
 *     it if anything was found. This is the one that is ENFORCED rather than trusted: a
 *     client that skipped step 1, or that is not our client at all, cannot get an
 *     unstripped photo indexed. The row is only written after the sweep, so a `work_upload`
 *     row means "these bytes have been read, verified as a JPEG/PNG/WebP, and stripped".
 *
 * `complete` is also where "image/* only" stops being a header check. The declared content
 * type is a claim; `sniffImageFormat` reads the magic number, so a caller who signs for
 * `image/png` and PUTs a PDF gets the object deleted and a 415, and the row is never
 * written.
 *
 * ## Identity: the object key is NEVER client-supplied, at any step
 *
 * Every key is `work-uploads/<sub>/<surface>/<anchor>/<upload_id>.<ext>`, computed by
 * {@link workUploadObjectKey} from the verified Cognito `sub` and the association. The
 * client sends an association and an id; it never sends a key, and `complete` recomputes
 * the key rather than accepting one. So there is no request shape in which a caller
 * addresses another learner's object — not by path traversal (segments are sanitized), not
 * by guessing (the sub is the second segment), not by replay. Three independent layers say
 * the same thing, which is what §6 means by private by default:
 *
 *  - the routes derive the key from the token's `sub`;
 *  - every DB statement is `where student_id = :sid`, so a read or a delete can only ever
 *    see the caller's own rows (this mirrors the city/measurement read path);
 *  - the table's `work_upload_key_is_student_scoped` check refuses a row whose key sits
 *    outside its own student's prefix, and the Lambda's IAM statement cannot reach outside
 *    `work-uploads/*` at all.
 */

/** The prefix every student photo lives under. Mirrored in `infra/` (see its comment). */
export const WORK_UPLOAD_KEY_PREFIX = "work-uploads/";

/**
 * The server's own size cap, in bytes. The browser has the same number
 * (`apps/web/src/work-upload/validation.ts` `MAX_UPLOAD_BYTES`) and so does the table's
 * `work_upload_size_within_cap`; this is the copy that is ENFORCED, since the other two are
 * respectively a courtesy and a backstop. 10 MB is generous for a page of working and small
 * enough that a term of uploads costs pennies to store.
 */
export const MAX_WORK_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Which wrong-answer / review surface a photo was attached to (doc §2). */
export type WorkUploadSurface = "lesson-practice" | "lesson-cfu" | "diagnostic-review";

const LESSON_SURFACES: readonly WorkUploadSurface[] = ["lesson-practice", "lesson-cfu"];

/**
 * What an upload is anchored to (doc §5), as it travels on the wire.
 *
 * The owning student is deliberately NOT here: it is the verified `sub` and nothing else.
 * A field for it would be a field a caller could set.
 */
export interface WorkUploadAssociationWire {
  readonly surface: WorkUploadSurface;
  readonly item_version_id: string;
  /** Lesson surfaces only. */
  readonly node_id?: string;
  /** `diagnostic-review` only — a finalized administration, never a live test (§2). */
  readonly administration_id?: string;
  readonly template_id?: string;
  readonly attempt_id?: string;
}

/**
 * One stored upload, in the shape the browser's `StoredWorkUpload` reads.
 *
 * Note what is absent and must stay absent: no score, no correctness, no mastery, no
 * placement. The record describes an artifact held for review. `apps/web`'s
 * `parseStoredWorkUpload` validates this shape at the boundary, so a field renamed here
 * fails loudly in the client instead of arriving as `undefined`.
 */
export interface WorkUploadRecordWire {
  readonly id: string;
  readonly association: WorkUploadAssociationWire;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly objectKey: string;
  /** A short-lived presigned GET, minted for the owner only. Absent if signing failed. */
  readonly previewUrl?: string;
  readonly status: "uploaded";
}

/**
 * Every statement this service issues, exported as data for the same reason
 * `CITY_WRITE_STATEMENTS` is: the one failure mode no in-memory double can reach is a table
 * or column `app_service` was never granted, which is a `permission denied` in production
 * and a green suite everywhere else. `test/workUploadGrants.test.ts` derives the grants from
 * `0009_work_upload.sql` and holds these to them.
 *
 * Every one of them is scoped to `:sid`. That is not a convention here, it is the read
 * model: there is no statement in this object that can see a row belonging to anybody but
 * the caller, and `workUpload.test.ts` asserts that over the whole set rather than per call
 * site.
 */
export const WORK_UPLOAD_STATEMENTS = {
  /**
   * `do nothing` on conflict makes `complete` idempotent: a client that retries after a
   * dropped response re-runs the hygiene sweep (cheap, and it finds nothing the second
   * time) and lands on the row that is already there. It needs INSERT only — nothing is
   * updated, which is what keeps this table free of an UPDATE grant.
   */
  insertUpload: `insert into public.work_upload
      (upload_id, student_id, object_key, content_type, size_bytes, surface,
       node_id, administration_id, item_version_id, template_id, attempt_id)
    values (:upload_id::uuid, :sid::uuid, :object_key, :content_type, :size_bytes, :surface,
            :node_id, :administration_id::uuid, :item_version_id, :template_id, :attempt_id)
    on conflict (upload_id) do nothing`,

  /**
   * The caller's own uploads, newest first.
   *
   * `created_at` is read as an epoch rather than as a timestamp string because the Data
   * API's JSON formatting hands timestamps back in Postgres's own spelling
   * (`2026-08-05 16:05:06.37+00`), which is not ISO-8601 and which `new Date()` parses
   * differently across engines. A number has one reading.
   */
  selectUploads: `select upload_id, object_key, content_type, size_bytes, surface,
      node_id, administration_id, item_version_id, template_id, attempt_id,
      extract(epoch from created_at) as created_at_epoch
    from public.work_upload
    where student_id = :sid::uuid
    order by created_at desc, upload_id`,

  /** The same, narrowed to one item — `GET /api/work-upload?item=…`. */
  selectUploadsForItem: `select upload_id, object_key, content_type, size_bytes, surface,
      node_id, administration_id, item_version_id, template_id, attempt_id,
      extract(epoch from created_at) as created_at_epoch
    from public.work_upload
    where student_id = :sid::uuid and item_version_id = :item
    order by created_at desc, upload_id`,

  /**
   * ONE upload, by id, IF IT IS THE CALLER'S.
   *
   * The `and student_id = :sid` is the whole security property of the read and delete
   * paths: another student's upload is not "forbidden", it simply does not exist for this
   * caller, so no answer of ours distinguishes a stranger's upload id from a made-up one.
   */
  selectOwnUpload: `select upload_id, object_key, content_type, size_bytes, surface,
      node_id, administration_id, item_version_id, template_id, attempt_id,
      extract(epoch from created_at) as created_at_epoch
    from public.work_upload
    where upload_id = :upload_id::uuid and student_id = :sid::uuid`,

  /** Student-initiated deletion of their own upload (§6). */
  deleteOwnUpload: `delete from public.work_upload
    where upload_id = :upload_id::uuid and student_id = :sid::uuid`,
} as const;

/** A `work_upload` row as the Data API hands it back. */
interface WorkUploadRow {
  upload_id: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  surface: string;
  node_id: string | null;
  administration_id: string | null;
  item_version_id: string;
  template_id: string | null;
  attempt_id: string | null;
  created_at_epoch: number | string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * One key segment, reduced to characters that cannot mean anything to S3 or to a path.
 *
 * The association comes from the client, so `node_id` and `item_version_id` are untrusted
 * strings that end up in an object key. Anything outside `[A-Za-z0-9._-]` becomes `_`, a
 * segment that is only dots becomes `_`, and the result is capped — so `../../someone-else`
 * cannot climb out of the student's prefix and a pathological id cannot blow the 1024-byte
 * key limit. The sanitized form is only ever a filing hint; the row carries the real ids.
 */
function keySegment(value: string): string {
  const cleaned = value
    .replace(/[^A-Za-z0-9._-]/g, "_")
    // Any run of dots collapses to one, so no key can contain `..` even inside a segment.
    // S3 itself has no path resolution and would treat it as an ordinary character, but
    // anything that later syncs a key to a filesystem does, and that is a cheap edge to
    // remove rather than to reason about downstream.
    .replace(/\.{2,}/g, ".")
    .slice(0, 64);
  return cleaned === "" || /^\.+$/.test(cleaned) ? "_" : cleaned;
}

const EXTENSIONS: Readonly<Record<ImageFormat, string>> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/**
 * The one place an object key is built: `work-uploads/<sub>/<surface>/<anchor>/<id>.<ext>`.
 *
 * A pure function of the verified `sub`, the association and the upload id, which is what
 * lets `complete` RECOMPUTE the key instead of trusting one from the request.
 */
export function workUploadObjectKey(
  studentId: string,
  association: WorkUploadAssociationWire,
  uploadId: string,
  format: ImageFormat,
): string {
  const anchor =
    association.surface === "diagnostic-review"
      ? keySegment(association.administration_id ?? "")
      : keySegment(association.node_id ?? "");
  return [
    `${WORK_UPLOAD_KEY_PREFIX}${studentId}`,
    keySegment(association.surface),
    anchor,
    keySegment(association.item_version_id),
    `${uploadId}.${EXTENSIONS[format]}`,
  ].join("/");
}

/** Read an untrusted association, or say which field refused. */
export function parseWorkUploadAssociation(
  value: unknown,
): { association: WorkUploadAssociationWire } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "association must be an object naming the surface and the item" };
  }
  const body = value as Record<string, unknown>;
  const surface = body.surface;
  if (
    surface !== "lesson-practice" &&
    surface !== "lesson-cfu" &&
    surface !== "diagnostic-review"
  ) {
    return {
      error:
        "association.surface must be one of lesson-practice, lesson-cfu, diagnostic-review",
    };
  }
  if (typeof body.item_version_id !== "string" || body.item_version_id === "") {
    return { error: "association.item_version_id must be a non-empty string" };
  }
  const optionalText = (key: string): string | undefined => {
    const raw = body[key];
    return typeof raw === "string" && raw !== "" ? raw : undefined;
  };
  if (surface === "diagnostic-review") {
    // A post-test review upload anchors on the finalized administration (§2/§5). It must be
    // a uuid because the column is one, and a 400 here beats a Postgres cast error.
    if (!isUuid(body.administration_id)) {
      return {
        error: "association.administration_id must be the administration's uuid",
      };
    }
    return {
      association: {
        surface,
        item_version_id: body.item_version_id,
        administration_id: body.administration_id,
        ...(optionalText("template_id")
          ? { template_id: optionalText("template_id") }
          : {}),
        ...(optionalText("attempt_id") ? { attempt_id: optionalText("attempt_id") } : {}),
      },
    };
  }
  if (typeof body.node_id !== "string" || body.node_id === "") {
    return { error: "association.node_id must be the skill node this attempt belongs to" };
  }
  return {
    association: {
      surface,
      item_version_id: body.item_version_id,
      node_id: body.node_id,
      ...(optionalText("template_id") ? { template_id: optionalText("template_id") } : {}),
      ...(optionalText("attempt_id") ? { attempt_id: optionalText("attempt_id") } : {}),
    },
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function rowToRecord(
  row: WorkUploadRow,
  previewUrl: string | undefined,
): WorkUploadRecordWire {
  const surface = row.surface as WorkUploadSurface;
  const association: WorkUploadAssociationWire = {
    surface,
    item_version_id: row.item_version_id,
    ...(row.node_id ? { node_id: row.node_id } : {}),
    ...(row.administration_id ? { administration_id: row.administration_id } : {}),
    ...(row.template_id ? { template_id: row.template_id } : {}),
    ...(row.attempt_id ? { attempt_id: row.attempt_id } : {}),
  };
  const epoch = toNumber(row.created_at_epoch);
  return {
    id: row.upload_id,
    association,
    contentType: row.content_type,
    sizeBytes: toNumber(row.size_bytes),
    createdAt: new Date(
      Number.isFinite(epoch) ? Math.round(epoch * 1000) : Date.now(),
    ).toISOString(),
    objectKey: row.object_key,
    ...(previewUrl ? { previewUrl } : {}),
    status: "uploaded",
  };
}

/**
 * The Cognito-verified, `sub`-scoped work-upload endpoints. Same contract as
 * `DiagnosticReadService`/`DiagnosticWriteService`: the token is verified inside the method,
 * the student id comes from the verified claim and never from the request, and an unverified
 * caller gets 401 before anything else happens.
 */
export interface WorkUploadService {
  /** `POST /api/work-upload` — mint a short-lived presigned PUT for one photo. */
  presign(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
  /**
   * `POST /api/work-upload/complete` — read the uploaded object back, verify it really is a
   * strippable image, strip its metadata, and index it.
   */
  complete(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
  /** `GET /api/work-upload?item=…` — the caller's own uploads + presigned previews. */
  list(
    token: string | null,
    itemVersionId: string | null,
  ): Promise<DiagnosticServerResponse>;
  /** `DELETE /api/work-upload?id=…` — student-initiated deletion of object + row (§6). */
  remove(token: string | null, uploadId: string | null): Promise<DiagnosticServerResponse>;
}

export interface WorkUploadServiceDeps {
  db: DataApiExecutor;
  authenticate: DiagnosticAuthenticator;
  objects: WorkUploadObjectStore;
  /** Injected in tests so an id is predictable; defaults to `crypto.randomUUID`. */
  newUploadId?: () => string;
}

/** A presigned GET, or undefined — a preview is a convenience and never worth a 500. */
async function previewFor(
  objects: WorkUploadObjectStore,
  objectKey: string,
): Promise<string | undefined> {
  try {
    return (await objects.presignGet(objectKey)).url;
  } catch {
    return undefined;
  }
}

export function createWorkUploadService(deps: WorkUploadServiceDeps): WorkUploadService {
  const { db, authenticate, objects } = deps;
  const newUploadId = deps.newUploadId ?? (() => crypto.randomUUID());

  /** Verify the bearer token → 401, else run the body scoped to the verified sub. */
  async function scoped(
    token: string | null,
    run: (studentId: UUID, sid: SqlParams) => Promise<DiagnosticServerResponse>,
  ): Promise<DiagnosticServerResponse> {
    const identity = await authenticate(token);
    if (!identity) {
      return { status: 401, body: { error: "unauthorized" } };
    }
    if (!isUuid(identity.student_id)) {
      // The `sub` becomes both a uuid column and a key prefix, so a non-uuid subject is a
      // pool misconfiguration rather than a request we can serve.
      return { status: 401, body: { error: "unauthorized" } };
    }
    try {
      return await run(identity.student_id, { sid: identity.student_id });
    } catch (error) {
      // Shared with the city paths, so an unapplied `0009` answers with the command that
      // applies it rather than looking like a broken service.
      return { status: 500, body: { error: describeWriteFailure(error) } };
    }
  }

  return {
    presign: (token, body) =>
      scoped(token, async (studentId) => {
        if (typeof body !== "object" || body === null) {
          return { status: 400, body: { error: "the request body must be an object" } };
        }
        const request = body as Record<string, unknown>;
        const parsed = parseWorkUploadAssociation(request.association);
        if ("error" in parsed) {
          return { status: 400, body: { error: parsed.error } };
        }
        // The declared type has to be one we can VERIFY and strip later, so an
        // unstrippable container is refused before a single byte is uploaded (§6). The
        // browser transcodes an iPhone's HEIC to JPEG for exactly this reason.
        const contentType =
          typeof request.contentType === "string" ? request.contentType : "";
        const format = formatForContentType(contentType);
        if (format === null) {
          return {
            status: 415,
            body: {
              error:
                "contentType must be image/jpeg, image/png or image/webp — the formats " +
                "whose metadata can be stripped before storage",
            },
          };
        }
        const sizeBytes = request.sizeBytes;
        if (!Number.isSafeInteger(sizeBytes) || (sizeBytes as number) <= 0) {
          return {
            status: 400,
            body: { error: "sizeBytes must be a whole number above 0" },
          };
        }
        if ((sizeBytes as number) > MAX_WORK_UPLOAD_BYTES) {
          return {
            status: 413,
            body: {
              error: `that photo is larger than the ${MAX_WORK_UPLOAD_BYTES}-byte limit`,
            },
          };
        }

        const uploadId = newUploadId();
        const objectKey = workUploadObjectKey(
          studentId,
          parsed.association,
          uploadId,
          format,
        );
        const put = await objects.presignPut(objectKey, imageContentType(format));
        return {
          status: 200,
          body: {
            uploadId,
            objectKey,
            uploadUrl: put.url,
            expiresInSeconds: put.expiresInSeconds,
            // Echoed because the presigned PUT is signed for it: the client must send this
            // exact header or S3 refuses the upload.
            contentType: imageContentType(format),
          },
        };
      }),

    complete: (token, body) =>
      scoped(token, async (studentId, sid) => {
        if (typeof body !== "object" || body === null) {
          return { status: 400, body: { error: "the request body must be an object" } };
        }
        const request = body as Record<string, unknown>;
        const parsed = parseWorkUploadAssociation(request.association);
        if ("error" in parsed) {
          return { status: 400, body: { error: parsed.error } };
        }
        if (!isUuid(request.uploadId)) {
          return {
            status: 400,
            body: { error: "uploadId must be the presigned upload's id" },
          };
        }
        const declared = formatForContentType(
          typeof request.contentType === "string" ? request.contentType : "",
        );
        if (declared === null) {
          return {
            status: 415,
            body: { error: "contentType must be image/jpeg, image/png or image/webp" },
          };
        }
        // RECOMPUTED, never read from the request: the same pure function `presign` used.
        const objectKey = workUploadObjectKey(
          studentId,
          parsed.association,
          request.uploadId,
          declared,
        );

        const stored = await objects.getObject(objectKey);
        if (stored === null) {
          return {
            status: 404,
            body: { error: "that photo was not uploaded, so there is nothing to save" },
          };
        }
        if (stored.length === 0 || stored.length > MAX_WORK_UPLOAD_BYTES) {
          // The cap again, this time against what was ACTUALLY stored. `presign` was told a
          // size by the client; this is the number that is true.
          await objects.deleteObject(objectKey);
          return {
            status: 413,
            body: {
              error: `that photo is larger than the ${MAX_WORK_UPLOAD_BYTES}-byte limit`,
            },
          };
        }
        // THE CONTENT CHECK. `image/*` from a header is a claim; this is the file.
        const actual = sniffImageFormat(stored);
        if (actual === null) {
          await objects.deleteObject(objectKey);
          return {
            status: 415,
            body: {
              error:
                "those bytes are not a JPEG, PNG or WebP image, so they were not stored",
            },
          };
        }
        // THE INGEST STRIP (§6), server-side and enforced. The browser strips too, so this
        // usually finds nothing; when it finds something the object is overwritten before
        // anything indexes it.
        //
        // A throw here is a photo whose container is broken INSIDE — the shape a PUT that was
        // cut off half way leaves, which sniffs as a JPEG because the first two bytes arrived.
        // That is the caller's problem and not ours, so it answers 415 like any other
        // unverifiable file rather than a 500, and the partial object goes. Without this it
        // would be a 500 plus a broken object sitting in the bucket until the retention rule
        // noticed it.
        let hygiene: StripResult;
        try {
          hygiene = stripImageMetadata(stored);
        } catch {
          await objects.deleteObject(objectKey);
          return {
            status: 415,
            body: {
              error:
                "that photo did not arrive complete, so it was not stored. Try adding it again.",
            },
          };
        }
        if (hygiene.removed.length > 0) {
          await objects.putObject(objectKey, imageContentType(actual), hygiene.bytes);
        }

        const association = parsed.association;
        await db.execute(WORK_UPLOAD_STATEMENTS.insertUpload, {
          ...sid,
          upload_id: request.uploadId,
          object_key: objectKey,
          // The SNIFFED type, not the declared one: the row describes the bytes.
          content_type: imageContentType(actual),
          size_bytes: hygiene.bytes.length,
          surface: association.surface,
          node_id: LESSON_SURFACES.includes(association.surface)
            ? (association.node_id ?? null)
            : null,
          administration_id:
            association.surface === "diagnostic-review"
              ? (association.administration_id ?? null)
              : null,
          item_version_id: association.item_version_id,
          template_id: association.template_id ?? null,
          attempt_id: association.attempt_id ?? null,
        });
        // Read back what was STORED rather than answering with what was intended, so the
        // response is evidence the row landed (and a retry answers with the first one).
        const rows = await db.query<WorkUploadRow>(WORK_UPLOAD_STATEMENTS.selectOwnUpload, {
          ...sid,
          upload_id: request.uploadId,
        });
        const row = rows[0];
        if (!row) {
          return { status: 500, body: { error: "the upload was not recorded" } };
        }
        return {
          status: 200,
          body: {
            upload: rowToRecord(row, await previewFor(objects, row.object_key)),
            /**
             * What the ingest sweep removed. Reported so a reviewer can SEE that stripping
             * happens on real uploads instead of taking the code's word for it; it names
             * the segments (`JPEG APP1`, `exif`) and never their contents.
             */
            strippedOnIngest: hygiene.removed,
          },
        };
      }),

    list: (token, itemVersionId) =>
      scoped(token, async (_studentId, sid) => {
        const rows =
          itemVersionId === null || itemVersionId === ""
            ? await db.query<WorkUploadRow>(WORK_UPLOAD_STATEMENTS.selectUploads, sid)
            : await db.query<WorkUploadRow>(WORK_UPLOAD_STATEMENTS.selectUploadsForItem, {
                ...sid,
                item: itemVersionId,
              });
        const uploads: WorkUploadRecordWire[] = [];
        for (const row of rows) {
          // Signed one at a time on purpose: the URL is minted from the ROW's key, and the
          // row came out of a `sub`-scoped select, so there is no path here that signs a
          // key the caller does not own.
          uploads.push(rowToRecord(row, await previewFor(objects, row.object_key)));
        }
        return { status: 200, body: { uploads } };
      }),

    remove: (token, uploadId) =>
      scoped(token, async (_studentId, sid) => {
        if (!isUuid(uploadId)) {
          return { status: 400, body: { error: "id must be an upload id" } };
        }
        const rows = await db.query<WorkUploadRow>(WORK_UPLOAD_STATEMENTS.selectOwnUpload, {
          ...sid,
          upload_id: uploadId,
        });
        const row = rows[0];
        if (!row) {
          // Another student's upload and a made-up id answer identically. A 403 here would
          // tell a caller that somebody else's id exists.
          return { status: 404, body: { error: "no upload of yours has that id" } };
        }
        // Object first: the requirement is that the PHOTO is gone. A row left behind by a
        // failure after this point is a dangling index entry, which is recoverable; the
        // reverse would leave an image nobody can see and nobody can delete.
        await objects.deleteObject(row.object_key);
        await db.execute(WORK_UPLOAD_STATEMENTS.deleteOwnUpload, {
          ...sid,
          upload_id: uploadId,
        });
        return { status: 200, body: { deleted: true } };
      }),
  };
}

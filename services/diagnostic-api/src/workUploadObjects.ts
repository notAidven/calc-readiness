import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * The object half of the photo-of-work upload: presigned URLs into the private uploads
 * bucket, plus the reads and writes the ingest hygiene sweep needs.
 *
 * ## Why this is a port with one adapter
 *
 * Everything the routes decide — whose key it is, what the caller may see, whether the
 * bytes are a strippable image — is decidable without S3, and every one of those decisions
 * is a privacy requirement (`docs/Photo_Work_Upload_Scope.md` §6). So the routes take this
 * interface and the suite gives them an in-memory double, exactly as the DB side takes a
 * `DataApiExecutor` and gets `fakeCluster`. What CANNOT be faked is the signature itself,
 * so `createS3WorkUploadObjectStore` is thin enough to read in one screen and its presigner
 * is exercised for real (offline, with static credentials) in `workUpload.test.ts`.
 *
 * ## The ceiling on every URL minted here is IAM, not this file
 *
 * A presigned URL carries the signer's own authority and nothing more. The Lambda role is
 * granted `PutObject`/`GetObject`/`DeleteObject` on `work-uploads/*` and no `ListBucket`
 * (`infra/lib/calc-readiness-stack.ts`), so even a routing bug cannot mint a URL that
 * enumerates the bucket or reaches outside the prefix. That is deliberate defence in depth
 * behind the `sub`-scoping the routes do.
 */

/** A short-lived presigned URL, with the window it is good for. */
export interface PresignedUrl {
  readonly url: string;
  readonly expiresInSeconds: number;
}

export interface WorkUploadObjectStore {
  /**
   * A presigned PUT for exactly this key and content type. The content type is part of the
   * signature, so a client that PUTs different bytes under a different type is refused by
   * S3 rather than by us.
   */
  presignPut(objectKey: string, contentType: string): Promise<PresignedUrl>;
  /** A presigned GET, minted only after the caller's ownership of the row is established. */
  presignGet(objectKey: string): Promise<PresignedUrl>;
  /** The stored bytes, or null when the key holds nothing (an abandoned upload). */
  getObject(objectKey: string): Promise<Uint8Array | null>;
  /** Overwrite the object — how the ingest sweep replaces a photo with its stripped self. */
  putObject(objectKey: string, contentType: string, bytes: Uint8Array): Promise<void>;
  /** Remove the object. Idempotent, as S3's own delete is. */
  deleteObject(objectKey: string): Promise<void>;
}

export interface S3WorkUploadObjectStoreConfig {
  readonly bucket: string;
  /**
   * How long a presigned PUT is valid. Five minutes: long enough for a slow phone to finish
   * uploading a 10 MB photo on a bad connection, short enough that a URL captured from a
   * log or a shared screen is useless (§6 "short-lived presigned URLs").
   */
  readonly putTtlSeconds?: number;
  /** How long a presigned GET (a preview of the student's own photo) is valid. */
  readonly getTtlSeconds?: number;
  /** Injected in tests; defaults to the ambient Lambda credentials + region. */
  readonly client?: S3Client;
}

export const DEFAULT_PUT_TTL_SECONDS = 300;
export const DEFAULT_GET_TTL_SECONDS = 300;

/** Whether an SDK error means "no such object" rather than "the call failed". */
function isNotFound(error: unknown): boolean {
  const candidate = error as
    | { name?: string; $metadata?: { httpStatusCode?: number } }
    | undefined;
  return (
    candidate?.name === "NoSuchKey" ||
    candidate?.name === "NotFound" ||
    candidate?.$metadata?.httpStatusCode === 404
  );
}

export function createS3WorkUploadObjectStore(
  config: S3WorkUploadObjectStoreConfig,
): WorkUploadObjectStore {
  const client = config.client ?? new S3Client({});
  const bucket = config.bucket;
  const putTtlSeconds = config.putTtlSeconds ?? DEFAULT_PUT_TTL_SECONDS;
  const getTtlSeconds = config.getTtlSeconds ?? DEFAULT_GET_TTL_SECONDS;

  return {
    async presignPut(objectKey, contentType) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }),
        {
          expiresIn: putTtlSeconds,
          // `content-type` INSIDE THE SIGNATURE, which it is not by default: a presigned PUT
          // signs only `host` unless asked, so without this a URL minted for `image/jpeg`
          // would accept a PDF and S3 would happily store it under that type. Signing the
          // header means the browser must send exactly this value or S3 refuses the upload —
          // one layer above `complete`'s magic-number check, which is what catches bytes that
          // lie about themselves rather than headers that do.
          signableHeaders: new Set(["content-type"]),
        },
      );
      return { url, expiresInSeconds: putTtlSeconds };
    },

    async presignGet(objectKey) {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        { expiresIn: getTtlSeconds },
      );
      return { url, expiresInSeconds: getTtlSeconds };
    },

    async getObject(objectKey) {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        const body = response.Body;
        if (!body) {
          return null;
        }
        return await body.transformToByteArray();
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    },

    async putObject(objectKey, contentType, bytes) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          ContentType: contentType,
          Body: bytes,
        }),
      );
    },

    async deleteObject(objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    },
  };
}

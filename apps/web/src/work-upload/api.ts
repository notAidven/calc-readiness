/**
 * The fetch half of the presigned work-upload store: the four routes in
 * `services/diagnostic-api/src/workUpload.ts`, bound to the deployed API and the Cognito
 * bearer token.
 *
 * Nothing here identifies the student. `student_id` is the verified `sub` server-side and the
 * object key is derived from it, so there is no field in any request below that a caller could
 * set to reach another learner's photo (doc §4/§6). What travels is: the association, the
 * content type, the size, and the id the presign route minted.
 *
 * ## Why every response is parsed rather than cast
 *
 * `parseStoredWorkUpload` is a real validator, not a type assertion. The wire shape is agreed
 * with `WorkUploadRecordWire` in another lane's source, and a `as StoredWorkUpload` would turn
 * a renamed field into `undefined` flowing into the UI — which for `objectKey` or `createdAt`
 * is a blank card the student cannot act on and nobody can debug. A throw at the boundary
 * names the field instead.
 */

import { apiBaseUrl, apiGetJson, apiPostJson, ApiResponseError, unwrapJson } from "../api";
import { PresignedWorkUploadStore } from "./presigned";
import type { StoredWorkUpload, WorkUploadAssociation, WorkUploadStatus } from "./types";
import { WorkUploadError } from "./types";

/** `…/api/work-upload`, or null when no server is configured. */
function workUploadUrl(suffix = "", query: Record<string, string> = {}): string | null {
  const base = apiBaseUrl();
  if (base === null) {
    return null;
  }
  const search = new URLSearchParams(query).toString();
  return `${base}/work-upload${suffix}${search ? `?${search}` : ""}`;
}

function requireUrl(suffix = "", query: Record<string, string> = {}): string {
  const url = workUploadUrl(suffix, query);
  if (url === null) {
    // Unreachable through the factory, which hands back the in-memory store when there is no
    // API. It stays because this module is exported: a caller constructing the presigned store
    // directly should be told which piece of configuration is doing the refusing.
    throw new Error(
      "Saving a photo for review needs a configured API (VITE_DIAGNOSTIC_API_URL); this build has none.",
    );
  }
  return url;
}

function fieldError(field: string): Error {
  return new Error(
    `The upload service answered without a usable \`${field}\`. The photo may not have been saved.`,
  );
}

function uploadFailure(error: unknown, action: "save" | "delete"): WorkUploadError {
  if (error instanceof WorkUploadError) {
    return error;
  }
  if (error instanceof ApiResponseError && (error.status === 401 || error.status === 403)) {
    return new WorkUploadError(
      "auth",
      "Your sign-in has expired. Sign in again, then try this photo once more.",
    );
  }
  if (action === "delete") {
    return new WorkUploadError(
      "delete",
      "We couldn't delete the saved photo. It is still private; try delete again.",
    );
  }
  return new WorkUploadError(
    "upload",
    "The upload service did not finish saving this photo. Try saving it again.",
  );
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value === "") {
    throw fieldError(field);
  }
  return value;
}

/** Read an association back off the wire, as the surface it says it is. */
function parseAssociation(value: unknown): WorkUploadAssociation {
  if (typeof value !== "object" || value === null) {
    throw fieldError("association");
  }
  const record = value as Record<string, unknown>;
  const surface = record.surface;
  const item_version_id = text(record.item_version_id, "association.item_version_id");
  if (surface === "diagnostic-review") {
    return {
      surface,
      item_version_id,
      administration_id: text(record.administration_id, "association.administration_id"),
    };
  }
  if (surface !== "lesson-practice" && surface !== "lesson-cfu") {
    throw fieldError("association.surface");
  }
  return {
    surface,
    item_version_id,
    node_id: text(record.node_id, "association.node_id"),
    ...(typeof record.template_id === "string" ? { template_id: record.template_id } : {}),
    ...(typeof record.attempt_id === "string" ? { attempt_id: record.attempt_id } : {}),
  };
}

/** Validate one record from the service. Throws, naming the field, rather than casting. */
export function parseStoredWorkUpload(value: unknown): StoredWorkUpload {
  if (typeof value !== "object" || value === null) {
    throw fieldError("upload");
  }
  const record = value as Record<string, unknown>;
  const status = record.status;
  if (status !== "stored" && status !== "uploaded") {
    throw fieldError("status");
  }
  if (typeof record.sizeBytes !== "number" || !Number.isFinite(record.sizeBytes)) {
    throw fieldError("sizeBytes");
  }
  return {
    id: text(record.id, "id"),
    association: parseAssociation(record.association),
    contentType: text(record.contentType, "contentType"),
    sizeBytes: record.sizeBytes,
    createdAt: text(record.createdAt, "createdAt"),
    objectKey: text(record.objectKey, "objectKey"),
    ...(typeof record.previewUrl === "string" ? { previewUrl: record.previewUrl } : {}),
    status: status as WorkUploadStatus,
  };
}

/**
 * Bind the store to the deployed routes and the Cognito token.
 *
 * `getAccessToken` is reached through a DYNAMIC import so the Cognito SDK stays out of the
 * lesson chunk: this module is imported by the store factory, which is imported by
 * `LessonPractice`, and the auth client deliberately keeps itself off that path (see its own
 * header). The import resolves once per call and is cached by the module registry.
 */
export function createPresignedWorkUploadStore(): PresignedWorkUploadStore {
  const getToken = async (): Promise<string | null> => {
    const { getAccessToken } = await import("../auth/cognitoClient");
    return getAccessToken();
  };

  return new PresignedWorkUploadStore({
    getToken,

    presign: async (request, token) => {
      try {
        const response = await apiPostJson<{
          uploadId?: unknown;
          objectKey?: unknown;
          uploadUrl?: unknown;
          contentType?: unknown;
        }>(requireUrl(), token, {
          association: request.association,
          contentType: request.contentType,
          sizeBytes: request.sizeBytes,
        });
        return {
          uploadId: text(response.uploadId, "uploadId"),
          objectKey: text(response.objectKey, "objectKey"),
          uploadUrl: text(response.uploadUrl, "uploadUrl"),
          // The route echoes the type it SIGNED for. It has to be sent verbatim on the PUT or S3
          // refuses the upload, so the presign response is authoritative over what we declared.
          contentType: text(response.contentType, "contentType"),
        };
      } catch (error) {
        throw uploadFailure(error, "save");
      }
    },

    complete: async (request, token) => {
      try {
        const response = await apiPostJson<{ upload?: unknown }>(
          requireUrl("/complete"),
          token,
          {
            uploadId: request.uploadId,
            association: request.association,
            contentType: request.contentType,
          },
        );
        return parseStoredWorkUpload(response.upload);
      } catch (error) {
        throw uploadFailure(error, "save");
      }
    },

    listRemote: async (filter, token) => {
      // The route narrows by item; the other two filters are association fields it does not
      // index on, so they are applied here. Either way the SERVER decides whose rows these
      // are — a filter is a convenience and never an access control.
      const query: Record<string, string> = filter?.item_version_id
        ? { item: filter.item_version_id }
        : {};
      const response = await apiGetJson<{ uploads?: unknown }>(
        requireUrl("", query),
        token,
      );
      const uploads = Array.isArray(response.uploads) ? response.uploads : [];
      return uploads.map(parseStoredWorkUpload).filter((upload) => {
        if (filter?.node_id) {
          return (
            upload.association.surface !== "diagnostic-review" &&
            upload.association.node_id === filter.node_id
          );
        }
        if (filter?.administration_id) {
          return (
            upload.association.surface === "diagnostic-review" &&
            upload.association.administration_id === filter.administration_id
          );
        }
        return true;
      });
    },

    deleteRemote: async (id, token) => {
      try {
        const response = await fetch(requireUrl("", { id }), {
          method: "DELETE",
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        await unwrapJson<{ deleted?: boolean }>(response, "upload service");
      } catch (error) {
        throw uploadFailure(error, "delete");
      }
    },
  });
}

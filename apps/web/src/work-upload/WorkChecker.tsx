import { useState } from "react";

import type { WorkParseClient } from "./parseTypes";
import type { StoredWorkUpload, WorkUploadAssociation, WorkUploadStore } from "./types";
import { WorkParseCard } from "./WorkParseCard";
import { WorkUpload } from "./WorkUpload";

export interface WorkCheckerProps {
  readonly association: WorkUploadAssociation;
  readonly store?: WorkUploadStore;
  readonly parseClient?: WorkParseClient;
}

function associationKey(association: WorkUploadAssociation): string {
  return [
    association.surface,
    association.item_version_id,
    association.surface === "diagnostic-review"
      ? association.administration_id
      : association.node_id,
  ].join(":");
}

/**
 * The post-reveal learner flow: capture/store first, then a separately consented model read.
 * The two actions stay separate here as well as on the backend, so upload never implies parse.
 */
export function WorkChecker({ association, store, parseClient }: WorkCheckerProps) {
  const key = associationKey(association);
  const [held, setHeld] = useState<{
    readonly associationKey: string;
    readonly upload: StoredWorkUpload | null;
  }>({ associationKey: key, upload: null });
  // LessonPractice normally remounts for a new item, but correctness cannot rely on that host
  // detail. Hide the prior problem's artifact synchronously, before an effect could run.
  const upload = held.associationKey === key ? held.upload : null;

  return (
    <aside className="work-checker" aria-label="Optional photo work checker">
      <WorkUpload
        key={key}
        association={association}
        store={store}
        onUploaded={(record) => setHeld({ associationKey: key, upload: record })}
        onRemoved={() => setHeld({ associationKey: key, upload: null })}
      />
      {upload && (
        <WorkParseCard key={upload.id} uploadId={upload.id} client={parseClient} />
      )}
    </aside>
  );
}

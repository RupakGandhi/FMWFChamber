import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export type StaffDraftScope = "program-editor" | "program-settings" | "email-templates";
export type StaffDraftStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;
const RETRY_DELAY_MS = 5000;

interface UseStaffDraftOptions<T> {
  programId: number;
  scope: StaffDraftScope;
  value: T;
  /** The editor differs from the live program. */
  dirty: boolean;
  /** The editor has loaded the live program. */
  ready: boolean;
  baseRevision: number;
  onRestore: (payload: T, baseRevision: number) => void;
  /** Called when staff throw a restored draft away, to show the live program again. */
  onDiscard: () => void;
}

/**
 * Autosaves staff edits to a private server-side draft and puts them back automatically
 * after a refresh or on reopening. A draft never changes the live program: only the
 * screen's Save action does, so autosave cannot publish a half-finished edit, submit an
 * application or open a program.
 */
export function useStaffDraft<T>({ programId, scope, value, dirty, ready, baseRevision, onRestore, onDiscard }: UseStaffDraftOptions<T>) {
  const { data: stored, isFetched } = trpc.staffDrafts.get.useQuery(
    { programId, scope },
    { gcTime: 0, refetchOnMount: "always", refetchOnWindowFocus: false, enabled: programId > 0 },
  );
  const saveDraft = trpc.staffDrafts.save.useMutation();
  const discardDraft = trpc.staffDrafts.discard.useMutation();

  const serialized = JSON.stringify(value);
  const latest = useRef({ value, serialized, baseRevision });
  latest.current = { value, serialized, baseRevision };

  const [restoreChecked, setRestoreChecked] = useState(false);
  const [restoredFrom, setRestoredFrom] = useState<{ updatedAt: Date; outdated: boolean } | null>(null);
  const [savedSerialized, setSavedSerialized] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const inFlight = useRef<Promise<unknown> | null>(null);
  const hasServerDraft = useRef(false);

  useEffect(() => {
    if (!ready || !isFetched || restoreChecked) return;
    setRestoreChecked(true);
    if (!stored) return;
    hasServerDraft.current = true;
    onRestore(stored.payload as T, stored.baseRevision);
    setRestoredFrom({ updatedAt: stored.updatedAt, outdated: stored.baseRevision !== baseRevision });
    // Runs once, when both the live program and any stored draft have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isFetched, restoreChecked, stored]);

  const persist = useCallback(async () => {
    if (inFlight.current) await inFlight.current.catch(() => undefined);
    const snapshot = latest.current;
    const request = saveDraft.mutateAsync({
      programId,
      scope,
      payload: snapshot.value,
      baseRevision: snapshot.baseRevision,
    });
    inFlight.current = request;
    try {
      const result = await request;
      hasServerDraft.current = true;
      setSavedSerialized(snapshot.serialized);
      setSavedAt(new Date(result.savedAt));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [programId, scope, saveDraft]);

  useEffect(() => {
    if (!restoreChecked) return;
    if (!dirty) {
      setFailed(false);
      setSavedSerialized(null);
      setRestoredFrom(null);
      if (hasServerDraft.current) {
        hasServerDraft.current = false;
        void (inFlight.current ?? Promise.resolve())
          .catch(() => undefined)
          .then(() => discardDraft.mutateAsync({ programId, scope }))
          .catch(() => {
            hasServerDraft.current = true;
          });
      }
      return;
    }
    if (serialized === savedSerialized) return;
    const timer = setTimeout(() => void persist(), failed ? RETRY_DELAY_MS : AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // persist and discardDraft change identity with mutation state, not with the edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreChecked, dirty, serialized, savedSerialized, failed, retryTick]);

  // A failed attempt with an unchanged editor would otherwise never run again.
  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => setRetryTick(tick => tick + 1), RETRY_DELAY_MS + 100);
    return () => clearTimeout(timer);
  }, [failed, retryTick]);

  const discard = useCallback(() => {
    setRestoredFrom(null);
    onDiscard();
  }, [onDiscard]);

  // Derived rather than stored, so "saved" can only show for exactly what is on screen.
  const status: StaffDraftStatus = !dirty
    ? "idle"
    : failed
      ? "error"
      : savedSerialized === serialized
        ? "saved"
        : "saving";

  return {
    status,
    savedAt,
    restoredFrom,
    discard,
    /** Whether the on-screen work is safe if the page closes now. */
    isProtected: !dirty || status === "saved",
  };
}

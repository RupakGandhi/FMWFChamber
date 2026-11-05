import { AlertTriangle, CheckCircle2, CloudOff, History, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StaffDraftStatus } from "@/hooks/useStaffDraft";

const timeOf = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Compact autosave state for a screen header. Shows nothing when there are no edits. */
export function StaffDraftStatusLabel({ status, savedAt }: { status: StaffDraftStatus; savedAt: Date | null }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving draft...
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
        <CloudOff className="h-4 w-4" />
        Draft not saved. Retrying...
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400" role="status">
      <CheckCircle2 className="h-4 w-4" />
      Draft saved{savedAt ? ` ${timeOf(savedAt)}` : ""}. Not live until you save.
    </span>
  );
}

/** Explains the save policy on every screen that autosaves. */
export function StaffDraftNote({ saveLabel }: { saveLabel: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      Your edits autosave as a private draft and come back after a refresh or when you reopen this page.
      Applicants, reviewers and other staff only see them after you click {saveLabel}.
      Opening a program and submitting applications are always separate actions.
    </p>
  );
}

interface StaffDraftRestoredProps {
  updatedAt: Date;
  outdated: boolean;
  saveLabel: string;
  onDiscard: () => void;
}

/** Shown when a staff member returns to a screen and their autosaved work was put back. */
export function StaffDraftRestored({ updatedAt, outdated, saveLabel, onDiscard }: StaffDraftRestoredProps) {
  return (
    <Alert>
      <History className="h-4 w-4" />
      <AlertTitle>Your unsaved work from {new Date(updatedAt).toLocaleString()} was restored</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          It is on screen below but is not live until you click {saveLabel}.
          {outdated && " This program has been saved by someone else since then, so saving will ask you to resolve that first."}
        </p>
        <Button size="sm" variant="outline" onClick={onDiscard}>Discard My Draft</Button>
      </AlertDescription>
    </Alert>
  );
}

interface EditConflictDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onOverwrite: () => void;
  onLoadLatest: () => void;
}

/** Shown instead of silently overwriting when someone else saved first. */
export function EditConflictDialog({ open, onKeepEditing, onOverwrite, onLoadLatest }: EditConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            This program changed while you were editing
          </AlertDialogTitle>
          <AlertDialogDescription>
            Someone else saved this program, or you saved it in another tab. Your changes have not been applied and your draft is still kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onKeepEditing}>Keep Editing</AlertDialogCancel>
          <Button variant="outline" onClick={onLoadLatest}>Load Latest (Lose Mine)</Button>
          <AlertDialogAction onClick={onOverwrite}>Replace With Mine</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

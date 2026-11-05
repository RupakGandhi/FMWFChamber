import { Download } from "lucide-react";
import { formatAnswer } from "@shared/awardEligibility";
import { isUploadedFile } from "@shared/formLogic";
import type { FormField } from "../../../drizzle/schema";

interface AnswerValueProps {
  fields?: FormField[];
  fieldId: string;
  value: unknown;
  /** Lets an assigned reviewer download uploads through their access link. */
  reviewerToken?: string;
}

/** One stored answer for staff or reviewers: uploads as a download, choices by label. */
export default function AnswerValue({ fields, fieldId, value, reviewerToken }: AnswerValueProps) {
  if (isUploadedFile(value)) {
    const query = reviewerToken ? `?reviewer=${encodeURIComponent(reviewerToken)}` : "";
    return (
      <a href={`/api/files/${value.fileToken}${query}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
        <Download className="h-4 w-4" />
        {value.name}
      </a>
    );
  }
  return <>{formatAnswer(fields, fieldId, value)}</>;
}

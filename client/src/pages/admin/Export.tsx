import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { FileSpreadsheet, Table, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import ProgramSubNav from "@/components/ProgramSubNav";
import { formatAnswer } from "@shared/awardEligibility";
import { allCriteria, questionCommentEntries } from "@shared/reviewRubric";
import { isUploadedFile } from "@shared/formLogic";

type ExportRow = Record<string, string | number>;

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const htmlCell = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
const printable = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function AdminExport() {
  const { programId } = useParams<{ programId: string }>();
  const pid = parseInt(programId || '0');

  const [includeScores, setIncludeScores] = useState(true);
  const [includeFormData, setIncludeFormData] = useState(true);
  const [includeReviewerComments, setIncludeReviewerComments] = useState(true);
  const [includeParticipantData, setIncludeParticipantData] = useState(true);
  const [includeEventData, setIncludeEventData] = useState(true);

  const { data: program } = trpc.programs.getById.useQuery({ id: pid });
  const { data: exportData, isLoading } = trpc.applications.exportData.useQuery({ programId: pid });

  const applications = exportData?.applications || [];
  const scores = exportData?.scores || [];
  const participantForms = exportData?.participantForms || [];
  const checkins = exportData?.checkins || [];
  const waitlistEntries = exportData?.waitlistEntries || [];

  const formKeys = useMemo(() => {
    const keys = new Set<string>();
    applications.forEach((application: any) => {
      Object.keys((application.formData || {}) as Record<string, unknown>).forEach(key => keys.add(key));
    });
    return Array.from(keys);
  }, [applications]);

  const fieldLabels = useMemo(() => new Map(
    (program?.formConfig?.fields || []).map(field => [field.id, field.label]),
  ), [program]);

  const scoreCriteria = useMemo(() => new Map(
    allCriteria(program?.scoringConfig).map(criterion => [criterion.id, criterion.name]),
  ), [program]);

  const rows = useMemo<ExportRow[]>(() => applications.map((application: any) => {
    const row: ExportRow = {
      'Application #': application.applicationNumber,
      'Rank': application.rank || '',
      ...(program?.programType === 'awards' ? {
        'Eligibility': application.eligibilityStatus,
        'Eligibility Reason': application.eligibilityReason || '',
      } : {}),
      'Status': application.status,
      'Applicant Name': application.applicantName || '',
      'Email': application.applicantEmail || '',
      'Phone': application.applicantPhone || '',
      'Organization': application.organizationName || '',
      'Submitted Date': new Date(application.submittedAt || application.createdAt).toLocaleString(),
    };

    const applicationScores = scores.filter((score: any) => score.applicationId === application.id);
    if (includeScores) {
      row['Average Score'] = application.averageScore ? Number(application.averageScore).toFixed(2) : '';
      row['Total Score'] = application.totalScore ? Number(application.totalScore).toFixed(2) : '';
      row['Review Count'] = application.reviewCount || applicationScores.length;
      row['Reviewer Score Detail'] = applicationScores.map((score: any) => {
        const criteria = Array.isArray(score.criteriaScores) ? score.criteriaScores : [];
        const details = criteria.map((criterion: any) => {
          const name = scoreCriteria.get(criterion.criteriaId) || criterion.criteriaId;
          const comment = includeReviewerComments && criterion.comment ? ` — ${criterion.comment}` : '';
          return `${name}: ${criterion.score}${comment}`;
        }).join('; ');
        return `${score.reviewerName}: ${score.totalScore}${details ? ` (${details})` : ''}`;
      }).join(' | ');
      if (includeReviewerComments) {
        row['Reviewer Overall Comments'] = applicationScores
          .filter((score: any) => score.comments)
          .map((score: any) => `${score.reviewerName}: ${score.comments}`)
          .join(' | ');
        row['Reviewer Comment-Only Answers'] = applicationScores
          .flatMap((score: any) => questionCommentEntries(program?.scoringConfig, score)
            .map(item => `${score.reviewerName} — ${item.label}: ${item.comment}`))
          .join(' | ');
      }
    }

    if (includeFormData) {
      const formData = (application.formData || {}) as Record<string, unknown>;
      formKeys.forEach(key => {
        const fields = program?.formConfig?.fields;
        const isChoice = !!fields?.find(field => field.id === key)?.options?.length;
        row[`Form: ${fieldLabels.get(key) || key}`] = isChoice || isUploadedFile(formData[key]) ? formatAnswer(fields, key, formData[key]) : printable(formData[key]);
      });
    }

    const participant = participantForms.find((form: any) => form.applicationId === application.id) as any;
    if (includeParticipantData) {
      row['Participant Name'] = participant?.participantName || '';
      row['T-Shirt Size'] = participant?.tshirtSize || '';
      row['Name Pronunciation'] = participant?.namePronunciation || '';
      row['Dietary Restrictions'] = participant?.dietaryRestrictions || '';
      row['Accessibility / Special Needs'] = participant?.specialNeeds || '';
      row['Commander Rank'] = participant?.rank || '';
      row['Military Branch'] = participant?.branch || '';
      row['Years of Service'] = participant?.yearsOfService || '';
      row['Guest / Plus One'] = participant?.plusOne ? `${participant.plusOneName || 'Yes'}${participant.plusOneTshirtSize ? ` (${participant.plusOneTshirtSize})` : ''}` : '';
      row['Additional Attendees'] = printable(participant?.attendees || '');
    }

    if (includeEventData) {
      const checkin = checkins.find((entry: any) => entry.applicationId === application.id) as any;
      const waitlist = waitlistEntries.find((entry: any) => entry.applicationId === application.id) as any;
      row['Check-In Status'] = checkin?.status || '';
      row['Check-In Notes'] = checkin?.notes || '';
      row['Waitlist Position'] = waitlist?.position || '';
      row['Waitlist Status'] = waitlist?.status || '';
    }

    return row;
  }), [applications, scores, participantForms, checkins, waitlistEntries, includeScores, includeFormData, includeReviewerComments, includeParticipantData, includeEventData, formKeys, fieldLabels, scoreCriteria]);

  const filenameBase = `${program?.slug || 'applications'}-export-${new Date().toISOString().split('T')[0]}`;

  const ensureRows = () => {
    if (rows.length === 0) {
      toast.error('No applications to export');
      return false;
    }
    return true;
  };

  const exportToCSV = () => {
    if (!ensureRows()) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.map(csvCell).join(','),
      ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
    ].join('\n');
    downloadBlob(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `${filenameBase}.csv`);
    toast.success('Complete CSV export downloaded');
  };

  const exportToExcel = () => {
    if (!ensureRows()) return;
    const headers = Object.keys(rows[0]);
    const table = `<table border="1"><thead><tr>${headers.map(header => `<th>${htmlCell(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${htmlCell(row[header])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<html><head><meta charset="UTF-8"></head><body><h1>${htmlCell(program?.name || 'Applications')}</h1>${table}</body></html>`;
    downloadBlob(html, 'application/vnd.ms-excel;charset=utf-8', `${filenameBase}.xls`);
    toast.success('Complete Excel export downloaded');
  };

  const exportToPDF = () => {
    if (!ensureRows()) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to generate the printable PDF');
      return;
    }

    const summaryRows = applications.map((application: any) => `
      <tr>
        <td>${htmlCell(application.rank || '')}</td>
        <td>${htmlCell(application.applicationNumber)}</td>
        <td>${htmlCell(application.applicantName || '')}</td>
        <td>${htmlCell(application.organizationName || '')}</td>
        <td>${htmlCell(application.status)}</td>
        <td>${htmlCell(application.averageScore ? Number(application.averageScore).toFixed(2) : '')}</td>
        <td>${htmlCell(application.reviewCount || 0)}</td>
      </tr>`).join('');

    const scoreDetails = includeScores ? applications.map((application: any) => {
      const applicationScores = scores.filter((score: any) => score.applicationId === application.id);
      if (applicationScores.length === 0) return '';
      return `<section class="application-detail">
        <h3>${htmlCell(application.applicationNumber)} — ${htmlCell(application.applicantName || 'Applicant')}</h3>
        <table><thead><tr><th>Reviewer</th><th>Total</th><th>Criteria & Comments</th>${includeReviewerComments ? '<th>Overall Comment</th>' : ''}</tr></thead><tbody>
          ${applicationScores.map((score: any) => {
            const criteria = Array.isArray(score.criteriaScores) ? score.criteriaScores : [];
            const criterionText = criteria.map((criterion: any) => {
              const name = scoreCriteria.get(criterion.criteriaId) || criterion.criteriaId;
              const comment = includeReviewerComments && criterion.comment ? ` — ${criterion.comment}` : '';
              return `${name}: ${criterion.score}${comment}`;
            }).join('; ');
            return `<tr><td>${htmlCell(score.reviewerName)}</td><td>${htmlCell(score.totalScore)}</td><td>${htmlCell(criterionText)}</td>${includeReviewerComments ? `<td>${htmlCell([score.comments, ...questionCommentEntries(program?.scoringConfig, score).map(item => `${item.label}: ${item.comment}`)].filter(Boolean).join(' | '))}</td>` : ''}</tr>`;
          }).join('')}
        </tbody></table>
      </section>`;
    }).join('') : '';

    const eventRows = includeEventData && program?.programType === 'registration' ? rows.map(row => `
      <tr><td>${htmlCell(row['Application #'])}</td><td>${htmlCell(row['Applicant Name'])}</td><td>${htmlCell(row['T-Shirt Size'])}</td><td>${htmlCell(row['Check-In Status'])}</td><td>${htmlCell(row['Waitlist Position'])}</td><td>${htmlCell(row['Waitlist Status'])}</td></tr>`).join('') : '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${htmlCell(program?.name || 'Applications')} Committee Report</title><style>
      @page { size: landscape; margin: 0.45in; }
      body { font-family: Arial, sans-serif; color: #1f2937; font-size: 10px; }
      h1 { margin: 0 0 4px; font-size: 20px; } h2 { margin: 22px 0 8px; font-size: 15px; } h3 { margin: 14px 0 6px; font-size: 12px; }
      .meta { color: #64748b; margin-bottom: 14px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }
      th, td { border: 1px solid #cbd5e1; padding: 5px; vertical-align: top; text-align: left; }
      th { background: #e2e8f0; } tr { page-break-inside: avoid; }
      .application-detail { page-break-inside: avoid; }
      .footer { margin-top: 18px; color: #64748b; }
    </style></head><body>
      <h1>${htmlCell(program?.name || 'Applications')}</h1>
      <div class="meta">Committee comparison report · Generated ${htmlCell(new Date().toLocaleString())} · ${applications.length} applications</div>
      <h2>Application & Score Summary</h2>
      <table><thead><tr><th>Rank</th><th>Application #</th><th>Applicant</th><th>Organization</th><th>Status</th><th>Average</th><th>Reviews</th></tr></thead><tbody>${summaryRows}</tbody></table>
      ${scoreDetails ? `<h2>Reviewer Score Comparison</h2>${scoreDetails}` : ''}
      ${eventRows ? `<h2>Event Operations</h2><table><thead><tr><th>Application #</th><th>Applicant</th><th>T-Shirt</th><th>Check-In</th><th>Waitlist Position</th><th>Waitlist Status</th></tr></thead><tbody>${eventRows}</tbody></table>` : ''}
      <div class="footer">FMWF Chamber Application Management System</div>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
    toast.success('Printable PDF report opened');
  };

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Export Data</h1>
          <p className="text-muted-foreground">{program?.name}</p>
        </div>

        <ProgramSubNav programId={pid} programType={program?.programType} activeTab="export" />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Choose the datasets included in every export format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Option id="scores" label="Scores, rankings, and per-reviewer criteria" checked={includeScores} onChange={setIncludeScores} />
              <Option id="comments" label="Reviewer criterion and overall comments" checked={includeReviewerComments} onChange={setIncludeReviewerComments} disabled={!includeScores} />
              <Option id="formData" label="All application form responses" checked={includeFormData} onChange={setIncludeFormData} />
              <Option id="participants" label="Participant, guest, commander, and T-shirt data" checked={includeParticipantData} onChange={setIncludeParticipantData} />
              {program?.programType === 'registration' && (
                <Option id="eventData" label="Check-In and waitlist records" checked={includeEventData} onChange={setIncludeEventData} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>{applications.length} applications will be exported</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={exportToCSV} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Table className="h-4 w-4 mr-2" />} Export as CSV
              </Button>
              <Button className="w-full" variant="outline" onClick={exportToExcel} disabled={isLoading}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
              </Button>
              <Button className="w-full" variant="outline" onClick={exportToPDF} disabled={isLoading}>
                <FileText className="h-4 w-4 mr-2" /> Printable PDF Committee Report
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>First 5 applications from the complete export dataset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50"><tr><th className="p-2 text-left">Application #</th><th className="p-2 text-left">Rank</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Status</th>{includeScores && <th className="p-2 text-left">Avg Score</th>}<th className="p-2 text-left">Reviews</th></tr></thead>
                <tbody>{applications.slice(0, 5).map((application: any) => (
                  <tr key={application.id} className="border-b"><td className="p-2 font-mono">{application.applicationNumber}</td><td className="p-2">{application.rank || '—'}</td><td className="p-2">{application.applicantName || 'N/A'}</td><td className="p-2">{application.status}</td>{includeScores && <td className="p-2">{application.averageScore ? Number(application.averageScore).toFixed(1) : '—'}</td>}<td className="p-2">{application.reviewCount || 0}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Option({ id, label, checked, onChange, disabled = false }: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center space-x-2 ${disabled ? 'opacity-50' : ''}`}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={value => onChange(value === true)} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

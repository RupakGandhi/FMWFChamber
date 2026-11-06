import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { AlertTriangle, Download, Trophy } from "lucide-react";
import AdminLayout from "./AdminLayout";
import ProgramSubNav from "@/components/ProgramSubNav";

// Quotes a CSV cell and stops a nominee name from being run as a spreadsheet formula.
const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

function EntryLink({ programId, application }: { programId: number; application: { id: number; displayName: string } }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/programs/${programId}/applications/${application.id}`} className="font-medium underline-offset-2 hover:underline">
        {application.displayName}
      </Link>
    </span>
  );
}

function TieNote() {
  return (
    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      More than five are shown because of a tie at the cut-off. No tie-breaker has been applied.
    </p>
  );
}

export default function AdminTopNominees() {
  const { programId } = useParams<{ programId: string }>();
  const pid = parseInt(programId || '0');
  const [category, setCategory] = useState('');

  const { data: program } = trpc.programs.getById.useQuery({ id: pid });
  const { data, isLoading } = trpc.leaderboards.get.useQuery({
    programId: pid,
    category: category || undefined,
  });

  const downloadCsv = () => {
    if (!data) return;
    const header = ['List', 'Rank', 'Nominee', 'Application', 'Categories', 'Score', 'Reviews Submitted', 'Reviews Assigned'];
    const rows = [
      ...data.overall.entries.map(entry => [
        'Overall', entry.rank, entry.application.displayName, entry.application.applicationNumber,
        entry.application.categories.join('; '), entry.average, entry.reviewCount, entry.assignedCount,
      ]),
      ...data.reviewers.flatMap(reviewer => reviewer.entries.map(entry => [
        reviewer.reviewerName, entry.rank, entry.application.displayName, entry.application.applicationNumber,
        entry.application.categories.join('; '), entry.score, reviewer.submitted, reviewer.assigned,
      ])),
    ];
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${program?.slug || 'program'}-top-nominees${data.category ? `-${data.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Top Nominees
            </h1>
            <p className="text-muted-foreground">{program?.name}</p>
          </div>
          <Button variant="outline" onClick={downloadCsv} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>

        <ProgramSubNav programId={pid} programType={program?.programType} activeTab="top-nominees" />

        <Card>
          <CardContent className="pt-6 flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Award Category</Label>
              <select
                id="category-filter"
                className="h-10 min-w-56 px-3 rounded-md border bg-background"
                value={data?.category ?? ''}
                onChange={(e) => setCategory(e.target.value)}
              >
                {data?.categories.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        ) : !data ? null : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Overall Top Five</CardTitle>
                <CardDescription>Average of the reviewer totals submitted so far.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.overall.entries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No submitted reviews yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="p-2">Rank</th>
                          <th className="p-2">Nominee</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Average</th>
                          <th className="p-2">Reviews</th>
                          <th className="p-2">Reviewer Totals</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.overall.entries.map(entry => (
                          <tr key={entry.application.id} className="border-b last:border-0">
                            <td className="p-2 font-semibold">{entry.rank}</td>
                            <td className="p-2"><EntryLink programId={pid} application={entry.application} /></td>
                            <td className="p-2">{entry.application.categories.join(', ') || '—'}</td>
                            <td className="p-2">{entry.average.toFixed(2)}</td>
                            <td className="p-2">
                              {entry.reviewCount} of {entry.assignedCount}
                              {entry.reviewCount < entry.assignedCount && <Badge variant="outline" className="ml-2">Incomplete</Badge>}
                            </td>
                            <td className="p-2">
                              <Link href={`/admin/programs/${pid}/applications/${entry.application.id}/compare`} className="underline-offset-2 hover:underline">
                                {entry.reviews.map(review => `${review.reviewerName}: ${review.totalScore}`).join(', ')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {data.overall.tiedAtCutoff && <TieNote />}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {data.reviewers.map(reviewer => (
                <Card key={reviewer.reviewerId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{reviewer.reviewerName}</CardTitle>
                    <CardDescription>
                      Top scores from {reviewer.submitted} submitted of {reviewer.assigned} assigned
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reviewer.entries.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No scores submitted yet.</p>
                    ) : (
                      <ol className="space-y-2">
                        {reviewer.entries.map(entry => (
                          <li key={entry.application.id} className="flex items-start justify-between gap-3 text-sm">
                            <span className="flex gap-2">
                              <span className="font-semibold w-5 shrink-0">{entry.rank}</span>
                              <EntryLink programId={pid} application={entry.application} />
                            </span>
                            <span className="font-medium">{entry.score}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {reviewer.tiedAtCutoff && <TieNote />}
                  </CardContent>
                </Card>
              ))}
            </div>
            {data.excluded.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Excluded: Confirmed Ineligible</CardTitle>
                  <CardDescription>Left out of every list above and of rankings. Change this in Award Restrictions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {data.excluded.map(entry => (
                      <li key={entry.id}>
                        <EntryLink programId={pid} application={entry} />
                        {entry.ineligibleReason && <p className="text-muted-foreground">{entry.ineligibleReason}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {data.reviewers.length === 0 && (
              <p className="text-muted-foreground text-center py-6">No reviewers are assigned to these entries yet.</p>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

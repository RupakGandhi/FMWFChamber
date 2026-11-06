import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Award, Edit2, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import { categoryChoices as listCategoryChoices, DEFAULT_RESTRICTION_YEARS } from "@shared/awardEligibility";

type WinForm = {
  id?: number;
  recipientName: string;
  recipientType: 'business' | 'individual';
  category: string;
  categoryId: string;
  awardYear: number;
  restrictionYears: number;
  notes: string;
};

const emptyWin = (): WinForm => ({
  recipientName: '',
  recipientType: 'business',
  category: '',
  categoryId: '',
  awardYear: new Date().getFullYear(),
  restrictionYears: DEFAULT_RESTRICTION_YEARS,
  notes: '',
});

export default function AdminAwardRestrictions() {
  const search = new URLSearchParams(useSearch());
  const programParam = parseInt(search.get('program') || '0');

  const utils = trpc.useUtils();
  const { data: wins, isLoading } = trpc.awards.listWins.useQuery();
  const { data: programs } = trpc.programs.list.useQuery();
  const awardPrograms = useMemo(() => (programs ?? []).filter(program => program.programType === 'awards'), [programs]);
  const [selectedProgram, setSelectedProgram] = useState(programParam);
  const programId = selectedProgram || awardPrograms[0]?.id || 0;

  const { data: entries } = trpc.awards.eligibilityCheck.useQuery({ programId }, { enabled: programId > 0 });

  const refresh = () => {
    utils.awards.listWins.invalidate();
    utils.awards.eligibilityCheck.invalidate();
  };
  const onError = (error: { message: string }) => toast.error(error.message);
  const onWinSaved = () => {
    toast.success('Award record saved');
    setWinForm(null);
    refresh();
  };
  const createWin = trpc.awards.createWin.useMutation({ onSuccess: onWinSaved, onError });
  const updateWin = trpc.awards.updateWin.useMutation({ onSuccess: onWinSaved, onError });
  const deleteWin = trpc.awards.deleteWin.useMutation({
    onSuccess: () => {
      toast.success('Award record removed');
      refresh();
    },
    onError,
  });
  const setEligibility = trpc.awards.setEligibility.useMutation({
    onSuccess: () => {
      toast.success('Decision saved. No one was notified.');
      setDecision(null);
      refresh();
    },
    onError,
  });

  const [winForm, setWinForm] = useState<WinForm | null>(null);
  const [decision, setDecision] = useState<{ applicationId: number; name: string; reason: string } | null>(null);

  // Winners are linked to a form category by its stable value, so renaming it keeps the match.
  const categoryChoices = useMemo(() => listCategoryChoices(awardPrograms), [awardPrograms]);

  const saveWin = () => {
    if (!winForm) return;
    const { id, notes, categoryId, ...values } = winForm;
    const data = { ...values, categoryId: categoryId || null, notes: notes.trim() || null };
    if (id) updateWin.mutate({ id, ...data });
    else createWin.mutate(data);
  };

  const needsReview = (entries ?? []).filter(entry => entry.matches.length > 0 && entry.eligibilityStatus === 'not_reviewed').length;

  return (
    <AdminLayout currentPath="/admin/award-restrictions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" />
            Award Restrictions
          </h1>
          <p className="text-muted-foreground">
            A business or individual can win the same award category once every five years. Winning a different category is allowed.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Staff decide; nothing happens automatically</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Add past winners under Past Winners.</li>
              <li>Under Check Entries, a matching nominee and category shows Possible Match.</li>
              <li>Review it, then choose Confirm Ineligible (a reason is required) or Clear as Eligible.</li>
              <li>A confirmed-ineligible entry is kept on record but left out of Top Nominees and rankings, and cannot be accepted.</li>
            </ol>
            <p className="mt-2">
              Nothing here blocks a nomination, rejects an entry or emails anyone, and it is separate from Applicant Flags.
            </p>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue={programParam ? 'entries' : 'winners'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="winners">Past Winners</TabsTrigger>
            <TabsTrigger value="entries">Check Entries{needsReview > 0 ? ` (${needsReview})` : ''}</TabsTrigger>
          </TabsList>

          <TabsContent value="winners">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>Past Winners</CardTitle>
                  <CardDescription>Each record restricts one winner in one category.</CardDescription>
                </div>
                <Button onClick={() => setWinForm(emptyWin())}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Winner
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-24 bg-muted animate-pulse rounded-lg" />
                ) : !wins?.length ? (
                  <p className="text-muted-foreground text-center py-8">No past winners recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="p-2">Winner</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Year Won</th>
                          <th className="p-2">Eligible Again</th>
                          <th className="p-2">Notes</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {wins.map(win => (
                          <tr key={win.id} className="border-b last:border-0">
                            <td className="p-2">
                              <span className="font-medium">{win.recipientName}</span>{' '}
                              <Badge variant="outline">{win.recipientType === 'business' ? 'Business' : 'Individual'}</Badge>
                            </td>
                            <td className="p-2">{win.category}</td>
                            <td className="p-2">{win.awardYear}</td>
                            <td className="p-2">{win.eligibleAgainYear}</td>
                            <td className="p-2 whitespace-pre-line">{win.notes || '—'}</td>
                            <td className="p-2 text-right whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${win.recipientName}`}
                                onClick={() => setWinForm({
                                  id: win.id,
                                  recipientName: win.recipientName,
                                  recipientType: win.recipientType,
                                  category: win.category,
                                  categoryId: win.categoryId ?? '',
                                  awardYear: win.awardYear,
                                  restrictionYears: win.restrictionYears,
                                  notes: win.notes ?? '',
                                })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                aria-label={`Remove ${win.recipientName}`}
                                onClick={() => {
                                  if (confirm(`Remove the ${win.awardYear} ${win.category} record for ${win.recipientName}?`)) {
                                    deleteWin.mutate({ id: win.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entries">
            <Card>
              <CardHeader>
                <CardTitle>Check Entries</CardTitle>
                <CardDescription>
                  Compares each entry's nominee and category with past winners for the program's year.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="award-program">Awards Program</Label>
                  <select
                    id="award-program"
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    value={programId}
                    onChange={(e) => setSelectedProgram(parseInt(e.target.value))}
                  >
                    {awardPrograms.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
                  </select>
                </div>
                {!entries?.length ? (
                  <p className="text-muted-foreground text-center py-8">No entries in this program yet.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map(entry => (
                      <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Link href={`/admin/programs/${programId}/applications/${entry.id}`} className="font-medium underline-offset-2 hover:underline">
                              {entry.displayName}
                            </Link>
                            <span className="text-sm text-muted-foreground"> · {entry.categories.join(', ') || 'No category'}</span>
                          </div>
                          {entry.eligibilityStatus === 'ineligible' && <Badge variant="destructive">Confirmed Ineligible</Badge>}
                          {entry.eligibilityStatus === 'eligible' && <Badge variant="secondary">Cleared as Eligible</Badge>}
                          {entry.eligibilityStatus === 'not_reviewed' && entry.matches.length > 0 && <Badge variant="outline">Possible Match</Badge>}
                        </div>
                        {!entry.nominee && (
                          <p className="text-sm text-muted-foreground">
                            This entry has no nominee answer to compare. Check Award Restriction Matching in the program's Settings.
                          </p>
                        )}
                        {entry.matches.map(win => (
                          <p key={win.id} className="text-sm">
                            {win.recipientName} won {win.category} in {win.awardYear}; eligible again in {win.eligibleAgainYear}.
                          </p>
                        ))}
                        {entry.eligibilityReason && <p className="text-sm">Reason recorded: {entry.eligibilityReason}</p>}
                        <div className="flex flex-wrap gap-2">
                          {entry.eligibilityStatus !== 'ineligible' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const win = entry.matches[0];
                                setDecision({
                                  applicationId: entry.id,
                                  name: entry.displayName,
                                  reason: win ? `Won ${win.category} in ${win.awardYear}; eligible again in ${win.eligibleAgainYear}.` : '',
                                });
                              }}
                            >
                              Confirm Ineligible
                            </Button>
                          )}
                          {entry.eligibilityStatus !== 'eligible' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEligibility.mutate({ applicationId: entry.id, status: 'eligible' })}
                            >
                              Clear as Eligible
                            </Button>
                          )}
                          {entry.eligibilityStatus !== 'not_reviewed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEligibility.mutate({ applicationId: entry.id, status: 'not_reviewed' })}
                            >
                              Clear Decision
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={winForm !== null} onOpenChange={(open) => !open && setWinForm(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{winForm?.id ? 'Edit Winner' : 'Add Winner'}</DialogTitle>
              <DialogDescription>The category is linked to the award form, so renaming it later keeps the match.</DialogDescription>
            </DialogHeader>
            {winForm && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="win-name">Business or Individual Name</Label>
                  <Input
                    id="win-name"
                    value={winForm.recipientName}
                    maxLength={255}
                    onChange={(e) => setWinForm({ ...winForm, recipientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="win-type">Winner Type</Label>
                  <select
                    id="win-type"
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    value={winForm.recipientType}
                    onChange={(e) => setWinForm({ ...winForm, recipientType: e.target.value as WinForm['recipientType'] })}
                  >
                    <option value="business">Business</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="win-category">Award Category</Label>
                  <select
                    id="win-category"
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    value={winForm.categoryId}
                    onChange={(e) => {
                      const choice = categoryChoices.find(item => item.value === e.target.value);
                      setWinForm({
                        ...winForm,
                        categoryId: e.target.value,
                        category: choice ? choice.label.replace(/^\s*\d{4}\s+/, '') : winForm.category,
                      });
                    }}
                  >
                    <option value="">Choose a category...</option>
                    {categoryChoices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="win-year">Year Won</Label>
                    <Input
                      id="win-year"
                      type="number"
                      value={winForm.awardYear}
                      onChange={(e) => setWinForm({ ...winForm, awardYear: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="win-restriction">Years Before Eligible Again</Label>
                    <Input
                      id="win-restriction"
                      type="number"
                      value={winForm.restrictionYears}
                      onChange={(e) => setWinForm({ ...winForm, restrictionYears: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Eligible again in {winForm.awardYear + winForm.restrictionYears}.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="win-notes">Notes (Optional)</Label>
                  <Textarea
                    id="win-notes"
                    value={winForm.notes}
                    onChange={(e) => setWinForm({ ...winForm, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setWinForm(null)}>Cancel</Button>
              <Button onClick={saveWin} disabled={createWin.isPending || updateWin.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Ineligible</DialogTitle>
              <DialogDescription>
                Records the decision and reason for {decision?.name}. The entry stays on record but is left out of Top Nominees and rankings and cannot be accepted. No one is notified.
              </DialogDescription>
            </DialogHeader>
            {decision && (
              <div className="space-y-2 py-2">
                <Label htmlFor="decision-reason">Reason</Label>
                <Textarea
                  id="decision-reason"
                  value={decision.reason}
                  onChange={(e) => setDecision({ ...decision, reason: e.target.value })}
                />
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
              <Button
                disabled={setEligibility.isPending}
                onClick={() => decision && setEligibility.mutate({
                  applicationId: decision.applicationId,
                  status: 'ineligible',
                  reason: decision.reason,
                })}
              >
                Save Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

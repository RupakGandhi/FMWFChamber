import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { Hourglass, Info, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import ProgramSubNav from "@/components/ProgramSubNav";
import { RESUME_LINK_VARIABLE } from "@shared/applicationDrafts";

const when = (value: Date | string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function AdminUnfinishedApplications() {
  const { programId } = useParams<{ programId: string }>();
  const pid = parseInt(programId || '0');
  const utils = trpc.useUtils();
  const { data: program } = trpc.programs.getById.useQuery({ id: pid });
  const { data, isLoading } = trpc.applicationDrafts.list.useQuery({ programId: pid });
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState<{ ids: number[]; subject: string; body: string } | null>(null);

  const refresh = () => utils.applicationDrafts.list.invalidate({ programId: pid });
  const sendReminders = trpc.applicationDrafts.sendReminders.useMutation({
    onSuccess: (result) => {
      if (result.failed === 0) toast.success(`Reminder sent to ${result.sent} applicant${result.sent === 1 ? '' : 's'}.`);
      else toast.error(`${result.sent} sent, ${result.failed} failed. See the Last Reminder column for details.`);
      setMessage(null);
      setSelected([]);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteDraft = trpc.applicationDrafts.delete.useMutation({
    onSuccess: () => {
      toast.success('Saved application deleted');
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const drafts = data?.drafts ?? [];
  const openMessage = (ids: number[]) => {
    if (!data) return;
    setMessage({ ids, subject: data.reminderTemplate.subject, body: data.reminderTemplate.body });
  };

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hourglass className="h-6 w-6" />
              Unfinished Applications
            </h1>
            <p className="text-muted-foreground">{program?.name}</p>
          </div>
          <Button disabled={selected.length === 0 || !data?.emailEnabled} onClick={() => openMessage(selected)}>
            <Mail className="h-4 w-4 mr-2" />
            Send Reminder to Selected ({selected.length})
          </Button>
        </div>

        <ProgramSubNav programId={pid} programType={program?.programType} activeTab="unfinished" />

        {data && !data.enabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Save and Return is off for this program</AlertTitle>
            <AlertDescription>
              Turn it on in this program's <Link href={`/admin/programs/${pid}/settings`} className="underline">Settings</Link> to
              let applicants save and come back later.
            </AlertDescription>
          </Alert>
        )}
        {data && !data.emailEnabled && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertTitle>Email is not set up yet</AlertTitle>
            <AlertDescription>
              Reminders can be sent once email is turned on under <Link href="/admin/smtp-settings" className="underline">Email Configuration</Link>.
              Applicants still get their private link on screen when they save.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Saved but Not Submitted</CardTitle>
            <CardDescription>
              Answers stay private to the applicant. A saved application leaves this list once it is submitted.
              "Reopened" shows whether the applicant opened their saved application after the latest reminder. Email opens
              are not tracked, because most email apps block or misreport them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
            ) : drafts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No unfinished applications.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={selected.length === drafts.length}
                          onChange={(e) => setSelected(e.target.checked ? drafts.map(draft => draft.id) : [])}
                        />
                      </th>
                      <th className="p-2">Applicant</th>
                      <th className="p-2">Progress</th>
                      <th className="p-2">Last Saved</th>
                      <th className="p-2">Reminders</th>
                      <th className="p-2">Last Reminder</th>
                      <th className="p-2">Reopened</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map(draft => (
                      <tr key={draft.id} className="border-b last:border-0 align-top">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${draft.applicantName}`}
                            checked={selected.includes(draft.id)}
                            onChange={(e) => setSelected(e.target.checked ? [...selected, draft.id] : selected.filter(id => id !== draft.id))}
                          />
                        </td>
                        <td className="p-2">
                          <p className="font-medium">{draft.applicantName}</p>
                          <p className="text-muted-foreground">{draft.applicantEmail}</p>
                        </td>
                        <td className="p-2">{draft.progress}% of required questions</td>
                        <td className="p-2">{when(draft.savedAt)}</td>
                        <td className="p-2">{draft.reminderCount}</td>
                        <td className="p-2">
                          {draft.lastReminderAt ? (
                            <>
                              <p>{when(draft.lastReminderAt)}</p>
                              {draft.lastReminderStatus === 'failed'
                                ? <Badge variant="destructive" title={draft.lastReminderError ?? ''}>Not delivered</Badge>
                                : <Badge variant="secondary">Sent</Badge>}
                            </>
                          ) : '—'}
                        </td>
                        <td className="p-2">
                          {!draft.lastReminderAt ? '—' : draft.reopenedAfterReminder
                            ? <Badge variant="secondary">Yes, {when(draft.lastResumedAt)}</Badge>
                            : 'Not yet'}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <Button size="sm" variant="outline" disabled={!data?.emailEnabled} onClick={() => openMessage([draft.id])}>
                            Remind
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            aria-label={`Delete saved application for ${draft.applicantName}`}
                            onClick={() => {
                              if (confirm(`Delete ${draft.applicantName}'s saved application? Their private link will stop working.`)) {
                                deleteDraft.mutate({ id: draft.id });
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

        <Dialog open={message !== null} onOpenChange={(open) => !open && setMessage(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Reminder</DialogTitle>
              <DialogDescription>
                Sending to {message?.ids.length} applicant{message?.ids.length === 1 ? '' : 's'}. Each person gets their own private link
                in place of {RESUME_LINK_VARIABLE}, and their name in place of {'{{applicant_name}}'}.
              </DialogDescription>
            </DialogHeader>
            {message && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-subject">Subject</Label>
                  <Input id="reminder-subject" value={message.subject} onChange={(e) => setMessage({ ...message, subject: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-body">Message</Label>
                  <Textarea id="reminder-body" rows={12} value={message.body} onChange={(e) => setMessage({ ...message, body: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setMessage(null)}>Cancel</Button>
              <Button
                disabled={sendReminders.isPending || !message?.body.includes(RESUME_LINK_VARIABLE)}
                onClick={() => message && sendReminders.mutate({ programId: pid, draftIds: message.ids, subject: message.subject, body: message.body })}
              >
                {sendReminders.isPending ? 'Sending...' : 'Send Reminder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

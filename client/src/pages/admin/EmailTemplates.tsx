import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Mail, Save, Loader2, Info, Eye, RotateCcw } from "lucide-react";
import ProgramLevelNav from "@/components/ProgramLevelNav";
import { EditConflictDialog, StaffDraftNote, StaffDraftRestored, StaffDraftStatusLabel } from "@/components/StaffDraftBar";
import { useStaffDraft } from "@/hooks/useStaffDraft";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Default email templates
const defaultTemplates = {
  confirmation: {
    subject: "Application Received - {{program_name}}",
    body: `Dear {{applicant_name}},

Thank you for submitting your application to {{program_name}}!

Your application has been received and assigned confirmation number: {{application_number}}

You can check the status of your application at any time using this confirmation number.

We will review your application and notify you of any updates.

Best regards,
FMWF Chamber of Commerce`
  },
  reviewerAssignment: {
    subject: "New Review Assignment - {{program_name}}",
    body: `Dear {{reviewer_name}},

You have been assigned new applications to review for {{program_name}}.

Please click the link below to access your reviewer portal and complete your reviews:
{{reviewer_link}}

Number of pending reviews: {{pending_count}}

Thank you for your time and dedication to this process.

Best regards,
FMWF Chamber of Commerce`
  },
  statusUpdate: {
    subject: "Application Status Update - {{program_name}}",
    body: `Dear {{applicant_name}},

We are writing to inform you that your application status for {{program_name}} has been updated.

Application Number: {{application_number}}
New Status: {{application_status}}

{{participant_form_link}}

If you have any questions, please don't hesitate to contact us.

Best regards,
FMWF Chamber of Commerce`
  },
  reviewerReminder: {
    subject: "Reminder: Pending Reviews - {{program_name}}",
    body: `Dear {{reviewer_name}},

This is a friendly reminder that you have pending application reviews for {{program_name}}.

Number of pending reviews: {{pending_count}}

Please click the link below to access your reviewer portal:
{{reviewer_link}}

Thank you for your continued support.

Best regards,
FMWF Chamber of Commerce`
  }
};

// Available template variables
const templateVariables = [
  { name: "{{applicant_name}}", description: "Applicant's full name" },
  { name: "{{applicant_email}}", description: "Applicant's email address" },
  { name: "{{program_name}}", description: "Name of the program" },
  { name: "{{application_number}}", description: "Application confirmation number" },
  { name: "{{application_status}}", description: "Current application status" },
  { name: "{{reviewer_name}}", description: "Reviewer's name" },
  { name: "{{reviewer_link}}", description: "Secure link for reviewer access" },
  { name: "{{pending_count}}", description: "Number of pending reviews" },
  { name: "{{participant_form_link}}", description: "Link to participant registration form (auto-generated for approved registration programs)" },
];

export default function EmailTemplates() {
  const { id: programId } = useParams<{ id: string }>();
  const id = parseInt(programId || "0");
  
  const { data: program, isLoading, refetch } = trpc.programs.getById.useQuery({ id });
  
  const [templates, setTemplates] = useState({
    confirmationEnabled: true,
    confirmationSubject: defaultTemplates.confirmation.subject,
    confirmationBody: defaultTemplates.confirmation.body,
    reviewerNotificationEnabled: true,
    reviewerAssignmentSubject: defaultTemplates.reviewerAssignment.subject,
    reviewerAssignmentBody: defaultTemplates.reviewerAssignment.body,
    statusUpdateEnabled: false,
    statusUpdateSubject: defaultTemplates.statusUpdate.subject,
    statusUpdateBody: defaultTemplates.statusUpdate.body,
    reviewerReminderSubject: defaultTemplates.reviewerReminder.subject,
    reviewerReminderBody: defaultTemplates.reviewerReminder.body,
  });
  
  const [previewTemplate, setPreviewTemplate] = useState<{ subject: string; body: string } | null>(null);
  
  const [baseline, setBaseline] = useState('');
  const [baseRevision, setBaseRevision] = useState(0);
  const [conflict, setConflict] = useState(false);
  const reloadAfterSave = useRef(false);
  const hasUnsavedChanges = baseline !== '' && baseline !== JSON.stringify(templates);
  const unsavedRef = useRef(false);
  unsavedRef.current = hasUnsavedChanges;

  const loadTemplates = (source: NonNullable<typeof program>) => {
    const loaded = {
        ...templates,
        confirmationEnabled: source.emailConfig?.confirmationEnabled ?? true,
        confirmationSubject: source.emailConfig?.confirmationSubject || defaultTemplates.confirmation.subject,
        confirmationBody: source.emailConfig?.confirmationBody || defaultTemplates.confirmation.body,
        reviewerNotificationEnabled: source.emailConfig?.reviewerNotificationEnabled ?? true,
        reviewerAssignmentSubject: source.emailConfig?.reviewerAssignmentSubject || defaultTemplates.reviewerAssignment.subject,
        reviewerAssignmentBody: source.emailConfig?.reviewerAssignmentBody || defaultTemplates.reviewerAssignment.body,
        statusUpdateEnabled: source.emailConfig?.statusUpdateEnabled ?? false,
        statusUpdateSubject: source.emailConfig?.statusUpdateSubject || defaultTemplates.statusUpdate.subject,
        statusUpdateBody: source.emailConfig?.statusUpdateBody || defaultTemplates.statusUpdate.body,
        reviewerReminderSubject: source.emailConfig?.reviewerReminderSubject || defaultTemplates.reviewerReminder.subject,
        reviewerReminderBody: source.emailConfig?.reviewerReminderBody || defaultTemplates.reviewerReminder.body,
    };
    setTemplates(loaded);
    setBaseRevision(source.revision);
    setBaseline(JSON.stringify(loaded));
  };

  // Load existing email config when program data is available. A background refresh
  // must never replace work in progress.
  useEffect(() => {
    if (!program) return;
    if (unsavedRef.current && !reloadAfterSave.current) return;
    reloadAfterSave.current = false;
    loadTemplates(program);
  }, [program]);

  const draft = useStaffDraft<typeof templates>({
    programId: id,
    scope: 'email-templates',
    value: templates,
    dirty: hasUnsavedChanges,
    ready: baseline !== '',
    baseRevision,
    onRestore: (payload, revision) => {
      setTemplates(payload);
      setBaseRevision(revision);
    },
    onDiscard: () => {
      if (program) loadTemplates(program);
    },
  });

  useEffect(() => {
    if (draft.isProtected) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft.isProtected]);
  
  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      toast.success("Email templates saved successfully!");
      reloadAfterSave.current = true;
      refetch();
    },
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') setConflict(true);
      else toast.error(error.message);
    }
  });
  
  const handleSave = (expectedRevision = baseRevision) => {
    updateMutation.mutate({
      id,
      expectedRevision,
      emailConfig: {
        confirmationEnabled: templates.confirmationEnabled,
        confirmationSubject: templates.confirmationSubject,
        confirmationBody: templates.confirmationBody,
        reviewerNotificationEnabled: templates.reviewerNotificationEnabled,
        reviewerAssignmentSubject: templates.reviewerAssignmentSubject,
        reviewerAssignmentBody: templates.reviewerAssignmentBody,
        statusUpdateEnabled: templates.statusUpdateEnabled,
        statusUpdateSubject: templates.statusUpdateSubject,
        statusUpdateBody: templates.statusUpdateBody,
        reviewerReminderSubject: templates.reviewerReminderSubject,
        reviewerReminderBody: templates.reviewerReminderBody,
      }
    });
  };
  
  const replaceWithMine = async () => {
    setConflict(false);
    const latest = await refetch();
    if (latest.data) handleSave(latest.data.revision);
  };

  const loadLatest = async () => {
    setConflict(false);
    const latest = await refetch();
    if (latest.data) loadTemplates(latest.data);
  };

  const resetToDefault = (templateType: string) => {
    switch (templateType) {
      case 'confirmation':
        setTemplates(prev => ({
          ...prev,
          confirmationSubject: defaultTemplates.confirmation.subject,
          confirmationBody: defaultTemplates.confirmation.body,
        }));
        break;
      case 'reviewerAssignment':
        setTemplates(prev => ({
          ...prev,
          reviewerAssignmentSubject: defaultTemplates.reviewerAssignment.subject,
          reviewerAssignmentBody: defaultTemplates.reviewerAssignment.body,
        }));
        break;
      case 'statusUpdate':
        setTemplates(prev => ({
          ...prev,
          statusUpdateSubject: defaultTemplates.statusUpdate.subject,
          statusUpdateBody: defaultTemplates.statusUpdate.body,
        }));
        break;
      case 'reviewerReminder':
        setTemplates(prev => ({
          ...prev,
          reviewerReminderSubject: defaultTemplates.reviewerReminder.subject,
          reviewerReminderBody: defaultTemplates.reviewerReminder.body,
        }));
        break;
    }
    toast.success("Template reset to default");
  };
  
  const generatePreview = (subject: string, body: string) => {
    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      "{{applicant_name}}": "John Smith",
      "{{applicant_email}}": "john.smith@example.com",
      "{{program_name}}": program?.name || "Leadership FMWF",
      "{{application_number}}": "APP-2026-001",
      "{{application_status}}": "Under Review",
      "{{reviewer_name}}": "Sarah Johnson",
      "{{reviewer_link}}": "https://fmwfapps.manus.space/review/ABC123",
      "{{interview_date}}": "January 25, 2026 at 2:00 PM",
      "{{interview_location}}": "Chamber Office, 202 1st Ave N, Fargo",
      "{{pending_count}}": "3",
    };
    
    let previewSubject = subject;
    let previewBody = body;
    
    Object.entries(sampleData).forEach(([variable, value]) => {
      previewSubject = previewSubject.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      previewBody = previewBody.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    setPreviewTemplate({ subject: previewSubject, body: previewBody });
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  if (!program) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Program not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Email Templates
            </h1>
            <p className="text-muted-foreground">{program.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <StaffDraftStatusLabel status={draft.status} savedAt={draft.savedAt} />
            <Button onClick={() => handleSave()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Templates
            </Button>
          </div>
        </div>

        <StaffDraftNote saveLabel="Save Templates" />
        {draft.restoredFrom && (
          <StaffDraftRestored
            updatedAt={draft.restoredFrom.updatedAt}
            outdated={draft.restoredFrom.outdated}
            saveLabel="Save Templates"
            onDiscard={draft.discard}
          />
        )}
        <EditConflictDialog
          open={conflict}
          onKeepEditing={() => setConflict(false)}
          onOverwrite={replaceWithMine}
          onLoadLatest={loadLatest}
        />

        {/* Program Level Navigation */}
        <ProgramLevelNav programId={id} activeTab="email-templates" />
        
        {/* Template Variables Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Available Template Variables
            </CardTitle>
            <CardDescription>
              Use these variables in your email templates. They will be automatically replaced with actual values when emails are sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templateVariables.map((variable) => (
                <Tooltip key={variable.name}>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="cursor-help font-mono text-xs">
                      {variable.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{variable.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Email Templates Tabs */}
        <Tabs defaultValue="confirmation" className="space-y-4">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto">
            <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
            <TabsTrigger value="reviewer">Reviewer Assignment</TabsTrigger>
            <TabsTrigger value="status">Status Update</TabsTrigger>
            <TabsTrigger value="reminder">Reviewer Reminder</TabsTrigger>
          </TabsList>
          
          {/* Application Confirmation Email */}
          <TabsContent value="confirmation">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Application Confirmation Email</CardTitle>
                    <CardDescription>
                      Sent to applicants immediately after they submit their application
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templates.confirmationEnabled}
                        onCheckedChange={(checked) => setTemplates(prev => ({ ...prev, confirmationEnabled: checked }))}
                      />
                      <Label>Enabled</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conf-subject">Subject Line</Label>
                  <Input
                    id="conf-subject"
                    value={templates.confirmationSubject}
                    onChange={(e) => setTemplates(prev => ({ ...prev, confirmationSubject: e.target.value }))}
                    placeholder="Email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conf-body">Email Body</Label>
                  <Textarea
                    id="conf-body"
                    value={templates.confirmationBody}
                    onChange={(e) => setTemplates(prev => ({ ...prev, confirmationBody: e.target.value }))}
                    placeholder="Email content..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => generatePreview(templates.confirmationSubject, templates.confirmationBody)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                        <DialogDescription>
                          This is how the email will appear with sample data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <p className="font-medium">{previewTemplate?.subject}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Body</Label>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg mt-1">
                            {previewTemplate?.body}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" onClick={() => resetToDefault('confirmation')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Reviewer Assignment Email */}
          <TabsContent value="reviewer">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reviewer Assignment Email</CardTitle>
                    <CardDescription>
                      Sent to reviewers when they are assigned new applications to review
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templates.reviewerNotificationEnabled}
                        onCheckedChange={(checked) => setTemplates(prev => ({ ...prev, reviewerNotificationEnabled: checked }))}
                      />
                      <Label>Enabled</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rev-subject">Subject Line</Label>
                  <Input
                    id="rev-subject"
                    value={templates.reviewerAssignmentSubject}
                    onChange={(e) => setTemplates(prev => ({ ...prev, reviewerAssignmentSubject: e.target.value }))}
                    placeholder="Email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rev-body">Email Body</Label>
                  <Textarea
                    id="rev-body"
                    value={templates.reviewerAssignmentBody}
                    onChange={(e) => setTemplates(prev => ({ ...prev, reviewerAssignmentBody: e.target.value }))}
                    placeholder="Email content..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => generatePreview(templates.reviewerAssignmentSubject, templates.reviewerAssignmentBody)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                        <DialogDescription>
                          This is how the email will appear with sample data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <p className="font-medium">{previewTemplate?.subject}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Body</Label>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg mt-1">
                            {previewTemplate?.body}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" onClick={() => resetToDefault('reviewerAssignment')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Status Update Email */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Status Update Email</CardTitle>
                    <CardDescription>
                      Sent to applicants when their application status changes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={templates.statusUpdateEnabled}
                        onCheckedChange={(checked) => setTemplates(prev => ({ ...prev, statusUpdateEnabled: checked }))}
                      />
                      <Label>Enabled</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status-subject">Subject Line</Label>
                  <Input
                    id="status-subject"
                    value={templates.statusUpdateSubject}
                    onChange={(e) => setTemplates(prev => ({ ...prev, statusUpdateSubject: e.target.value }))}
                    placeholder="Email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-body">Email Body</Label>
                  <Textarea
                    id="status-body"
                    value={templates.statusUpdateBody}
                    onChange={(e) => setTemplates(prev => ({ ...prev, statusUpdateBody: e.target.value }))}
                    placeholder="Email content..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => generatePreview(templates.statusUpdateSubject, templates.statusUpdateBody)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                        <DialogDescription>
                          This is how the email will appear with sample data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <p className="font-medium">{previewTemplate?.subject}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Body</Label>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg mt-1">
                            {previewTemplate?.body}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" onClick={() => resetToDefault('statusUpdate')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Reviewer Reminder Email */}
          <TabsContent value="reminder">
            <Card>
              <CardHeader>
                <CardTitle>Reviewer Reminder Email</CardTitle>
                <CardDescription>
                  Sent to reviewers who have pending reviews (if reminders are enabled in program settings)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-subject">Subject Line</Label>
                  <Input
                    id="reminder-subject"
                    value={templates.reviewerReminderSubject}
                    onChange={(e) => setTemplates(prev => ({ ...prev, reviewerReminderSubject: e.target.value }))}
                    placeholder="Email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-body">Email Body</Label>
                  <Textarea
                    id="reminder-body"
                    value={templates.reviewerReminderBody}
                    onChange={(e) => setTemplates(prev => ({ ...prev, reviewerReminderBody: e.target.value }))}
                    placeholder="Email content..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => generatePreview(templates.reviewerReminderSubject, templates.reviewerReminderBody)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Email Preview</DialogTitle>
                        <DialogDescription>
                          This is how the email will appear with sample data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <p className="font-medium">{previewTemplate?.subject}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Body</Label>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg mt-1">
                            {previewTemplate?.body}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" onClick={() => resetToDefault('reviewerReminder')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
        </Tabs>
      </div>
    </AdminLayout>
  );
}

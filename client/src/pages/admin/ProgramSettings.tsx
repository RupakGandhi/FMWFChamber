import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Bell, Mail, Clock, ExternalLink, Users, UserPlus, Trash2, Edit2, X, Check, Send } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ProgramLevelNav from "@/components/ProgramLevelNav";

export default function ProgramSettings() {
  const params = useParams<{ id: string }>();
  const programId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  
  const { data: program, isLoading, refetch } = trpc.programs.getById.useQuery({ id: programId });
  const { data: reviewers, refetch: refetchReviewers } = trpc.reviewers.list.useQuery();
  const updateSettings = trpc.admin.updateProgramSettings.useMutation();
  const updateEmailSettings = trpc.admin.updateProgramEmailSettings.useMutation();
  const sendReminders = trpc.admin.sendReviewerReminders.useMutation();
  
  // Reviewer management mutations
  const createReviewer = trpc.reviewers.create.useMutation({
    onSuccess: () => {
      toast.success("Reviewer added successfully! They will receive an email with their access link.");
      refetchReviewers();
      setAddReviewerDialogOpen(false);
      setNewReviewerName("");
      setNewReviewerEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add reviewer");
    }
  });
  
  const updateReviewer = trpc.reviewers.update.useMutation({
    onSuccess: () => {
      toast.success("Reviewer updated successfully!");
      refetchReviewers();
      setEditReviewerId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update reviewer");
    }
  });
  
  const deleteReviewer = trpc.reviewers.delete.useMutation({
    onSuccess: () => {
      toast.success("Reviewer deleted successfully!");
      refetchReviewers();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to delete reviewer");
    }
  });
  
  const resendAccessLink = trpc.reviewers.resendAccessLink.useMutation({
    onSuccess: () => {
      toast.success("Access link sent to reviewer!");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to send access link");
    }
  });
  
  // Settings state
  const [reviewerRemindersEnabled, setReviewerRemindersEnabled] = useState(false);
  const [reminderDaysThreshold, setReminderDaysThreshold] = useState(3);
  const [statusUpdateEnabled, setStatusUpdateEnabled] = useState(false);
  
  // Phase 2 settings
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [reviewDeadlineEnabled, setReviewDeadlineEnabled] = useState(false);
  const [scoreEditingEnabled, setScoreEditingEnabled] = useState(false);
  const [mandatoryCommentsEnabled, setMandatoryCommentsEnabled] = useState(false);
  const [blindReviewEnabled, setBlindReviewEnabled] = useState(false);
  const [minScoreForComment, setMinScoreForComment] = useState(3);
  const [programCapacity, setProgramCapacity] = useState(0);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [autoWaitlistPromotionEnabled, setAutoWaitlistPromotionEnabled] = useState(false);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [tshirtTrackingEnabled, setTshirtTrackingEnabled] = useState(false);
  const [participantFormEnabled, setParticipantFormEnabled] = useState(true);
  const [noShowTrackingEnabled, setNoShowTrackingEnabled] = useState(true);
  const [ticketCapacityThreshold, setTicketCapacityThreshold] = useState(0);
  const [applicationDeadline, setApplicationDeadline] = useState('');
  
  // Reviewer management state
  const [addReviewerDialogOpen, setAddReviewerDialogOpen] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewerEmail, setNewReviewerEmail] = useState("");
  const [editReviewerId, setEditReviewerId] = useState<number | null>(null);
  const [editReviewerName, setEditReviewerName] = useState("");
  const [editReviewerEmail, setEditReviewerEmail] = useState("");
  
  // Load settings from program
  useEffect(() => {
    if (program) {
      const settings = program.settings || {};
      setReviewerRemindersEnabled(settings.reviewerRemindersEnabled || false);
      setReminderDaysThreshold(settings.reminderDaysThreshold || 3);
      setStatusUpdateEnabled(program.emailConfig?.statusUpdateEnabled || false);
      setReviewDeadline(settings.reviewDeadline || '');
      setReviewDeadlineEnabled(settings.reviewDeadlineEnabled || false);
      setScoreEditingEnabled(settings.scoreEditingEnabled || false);
      setMandatoryCommentsEnabled(settings.mandatoryCommentsEnabled || false);
      setBlindReviewEnabled(settings.blindReviewEnabled || false);
      setMinScoreForComment(settings.minScoreForComment || 3);
      setProgramCapacity(settings.maxCapacity || 0);
      setWaitlistEnabled(settings.waitlistEnabled || false);
      setAutoWaitlistPromotionEnabled(settings.autoWaitlistPromotionEnabled || false);
      setCheckinEnabled(settings.checkInEnabled || false);
      setTshirtTrackingEnabled(settings.tshirtTrackingEnabled || false);
      setParticipantFormEnabled(settings.participantFormEnabled !== false);
      setNoShowTrackingEnabled(settings.noShowTrackingEnabled !== false);
      setTicketCapacityThreshold(settings.ticketCapacityThreshold || 0);
      setApplicationDeadline(settings.applicationDeadline || '');
    }
  }, [program]);
  
  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        programId,
        settings: {
          reviewerRemindersEnabled,
          reminderDaysThreshold,
          documentUploadsEnabled: false,
          reviewDeadline: reviewDeadlineEnabled ? reviewDeadline : undefined,
          reviewDeadlineEnabled,
          scoreEditingEnabled,
          mandatoryCommentsEnabled,
          blindReviewEnabled,
          minScoreForComment: mandatoryCommentsEnabled ? minScoreForComment : 0,
          maxCapacity: programCapacity || undefined,
          waitlistEnabled,
          autoWaitlistPromotionEnabled,
          checkInEnabled: checkinEnabled,
          tshirtTrackingEnabled,
          participantFormEnabled,
          noShowTrackingEnabled,
          ticketCapacityThreshold: ticketCapacityThreshold || undefined,
          applicationDeadline: applicationDeadline || undefined,
        },
      });
      
      await updateEmailSettings.mutateAsync({
        programId,
        statusUpdateEnabled,
      });
      
      toast.success("Settings saved successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };
  
  const handleSendReminders = async () => {
    try {
      const result = await sendReminders.mutateAsync({ programId });
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to send reminders");
    }
  };
  
  const handleAddReviewer = () => {
    if (!newReviewerName.trim() || !newReviewerEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }
    createReviewer.mutate({
      name: newReviewerName.trim(),
      email: newReviewerEmail.trim(),
    });
  };
  
  const handleStartEdit = (reviewer: { id: number; name: string; email: string }) => {
    setEditReviewerId(reviewer.id);
    setEditReviewerName(reviewer.name);
    setEditReviewerEmail(reviewer.email);
  };
  
  const handleSaveEdit = () => {
    if (!editReviewerId || !editReviewerName.trim() || !editReviewerEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }
    updateReviewer.mutate({
      id: editReviewerId,
      name: editReviewerName.trim(),
      email: editReviewerEmail.trim(),
    });
  };
  
  const handleDeleteReviewer = (reviewerId: number, reviewerName: string) => {
    if (confirm(`Are you sure you want to delete reviewer "${reviewerName}"? This will also remove all their assignments.`)) {
      deleteReviewer.mutate({ id: reviewerId });
    }
  };
  
  const handleResendAccessLink = (reviewerId: number) => {
    resendAccessLink.mutate({ reviewerId });
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        {/* Header with Save Button */}
        <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -mt-3 border-b mb-4">
          <div>
            <h1 className="text-2xl font-bold">{program.name} - Settings</h1>
            <p className="text-muted-foreground">Configure program features and notifications</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? "Saving..." : "Save All Settings"}
          </Button>
        </div>

        {/* Program Level Navigation */}
        <ProgramLevelNav programId={programId} activeTab="settings" />
        
        {/* Reviewer Management Section - Prominent at top */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Program Reviewers
                </CardTitle>
                <CardDescription>
                  Add and manage reviewers for this program. Reviewers will receive an email with their access link.
                </CardDescription>
              </div>
              <Button onClick={() => setAddReviewerDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Reviewer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reviewers && reviewers.length > 0 ? (
              <div className="space-y-3">
                {reviewers.map((reviewer) => (
                  <div 
                    key={reviewer.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {editReviewerId === reviewer.id ? (
                      // Edit mode
                      <div className="flex-1 flex items-center gap-3">
                        <Input
                          value={editReviewerName}
                          onChange={(e) => setEditReviewerName(e.target.value)}
                          placeholder="Name"
                          className="max-w-[200px]"
                        />
                        <Input
                          value={editReviewerEmail}
                          onChange={(e) => setEditReviewerEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                          className="max-w-[250px]"
                        />
                        <Button size="sm" onClick={handleSaveEdit} disabled={updateReviewer.isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditReviewerId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{reviewer.name}</div>
                            <div className="text-sm text-muted-foreground">{reviewer.email}</div>
                          </div>
                          <Badge variant={reviewer.isActive ? "default" : "secondary"}>
                            {reviewer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleResendAccessLink(reviewer.id)}
                            disabled={resendAccessLink.isPending}
                            title="Resend access link"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleStartEdit(reviewer)}
                            title="Edit reviewer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteReviewer(reviewer.id, reviewer.name)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete reviewer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reviewers added yet.</p>
                <p className="text-sm mt-1">Click "Add Reviewer" to invite reviewers to evaluate applications.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Application Deadline */}
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Application Deadline
            </CardTitle>
            <CardDescription>
              Set the public-facing application deadline displayed on the homepage. This date tells applicants when submissions close.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="application-deadline">Deadline Date</Label>
              <Input
                id="application-deadline"
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-56"
              />
              <p className="text-sm text-muted-foreground">
                This date is shown on the public homepage with a countdown badge. Leave empty to hide the deadline.
              </p>
              {applicationDeadline && (
                <p className="text-sm font-medium text-amber-700">
                  Deadline: {new Date(applicationDeadline + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure automatic email notifications for this program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status-emails">Status Update Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Send emails to applicants when their status changes
                  </p>
                </div>
                <Switch
                  id="status-emails"
                  checked={statusUpdateEnabled}
                  onCheckedChange={setStatusUpdateEnabled}
                />
              </div>
              
              <div className="pt-4 border-t">
                <Link href={`/admin/programs/${programId}/email-templates`}>
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Customize Email Templates
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-2">
                  Edit the subject and body text for all email notifications
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Reviewer Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Reviewer Reminders
              </CardTitle>
              <CardDescription>
                Automatically remind reviewers who haven't completed their reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reviewer-reminders">Enable Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminder emails to reviewers with pending reviews
                  </p>
                </div>
                <Switch
                  id="reviewer-reminders"
                  checked={reviewerRemindersEnabled}
                  onCheckedChange={setReviewerRemindersEnabled}
                />
              </div>
              
              {reviewerRemindersEnabled && (
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="reminder-days" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Days before reminder
                  </Label>
                  <Input
                    id="reminder-days"
                    type="number"
                    min={1}
                    max={30}
                    value={reminderDaysThreshold}
                    onChange={(e) => setReminderDaysThreshold(parseInt(e.target.value) || 3)}
                    className="w-24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Send reminder after this many days of inactivity
                  </p>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSendReminders}
                    disabled={sendReminders.isPending}
                    className="mt-2"
                  >
                    {sendReminders.isPending ? "Sending..." : "Send Reminders Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Review Deadline & Scoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Review Rules
              </CardTitle>
              <CardDescription>
                Toggle review features on or off for this program. Each setting is independently configurable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Editing Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Score Editing</Label>
                    <p className="text-sm text-muted-foreground">
                      Reviewers can edit their submitted scores until the deadline
                    </p>
                  </div>
                  <Switch
                    checked={scoreEditingEnabled}
                    onCheckedChange={setScoreEditingEnabled}
                  />
                </div>
              </div>

              {/* Review Deadline Toggle */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Review Deadline</Label>
                    <p className="text-sm text-muted-foreground">
                      Set a deadline after which reviews are locked
                    </p>
                  </div>
                  <Switch
                    checked={reviewDeadlineEnabled}
                    onCheckedChange={setReviewDeadlineEnabled}
                  />
                </div>
                {reviewDeadlineEnabled && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                    <Label htmlFor="review-deadline">Deadline Date</Label>
                    <Input
                      id="review-deadline"
                      type="date"
                      value={reviewDeadline}
                      onChange={(e) => setReviewDeadline(e.target.value)}
                      className="w-48"
                    />
                    <p className="text-xs text-muted-foreground">
                      Scores are locked after this date
                    </p>
                  </div>
                )}
              </div>

              {/* Mandatory Comments Toggle */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mandatory Comments for Low Scores</Label>
                    <p className="text-sm text-muted-foreground">
                      Require reviewers to explain scores below a threshold
                    </p>
                  </div>
                  <Switch
                    checked={mandatoryCommentsEnabled}
                    onCheckedChange={setMandatoryCommentsEnabled}
                  />
                </div>
                {mandatoryCommentsEnabled && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                    <Label htmlFor="min-score-comment">Score Threshold</Label>
                    <Input
                      id="min-score-comment"
                      type="number"
                      min={1}
                      max={10}
                      value={minScoreForComment}
                      onChange={(e) => setMinScoreForComment(parseInt(e.target.value) || 3)}
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comments required when scoring below this value (1-10 scale)
                    </p>
                  </div>
                )}
              </div>

              {/* Blind Review Toggle */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Blind Review</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide applicant names from reviewers during evaluation
                    </p>
                  </div>
                  <Switch
                    checked={blindReviewEnabled}
                    onCheckedChange={setBlindReviewEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Capacity & Waitlist — event registration programs only */}
          {program?.programType === 'registration' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Capacity & Event Features
              </CardTitle>
              <CardDescription>
                Configure program capacity, waitlist, and event check-in features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Program Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={programCapacity}
                  onChange={(e) => setProgramCapacity(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of accepted applicants (0 = unlimited)
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Waitlist</Label>
                  <p className="text-sm text-muted-foreground">
                    Place new requests on the waitlist only after staff-approved allocations reach capacity; this never auto-approves requests
                  </p>
                </div>
                <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
              </div>
              {waitlistEnabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                  <div className="space-y-0.5">
                    <Label>Automatically Promote Next Waitlisted Applicant</Label>
                    <p className="text-sm text-muted-foreground">
                      Optional. Leave off for Military Appreciation Night so staff retain full manual allocation control.
                    </p>
                  </div>
                  <Switch checked={autoWaitlistPromotionEnabled} onCheckedChange={setAutoWaitlistPromotionEnabled} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Check-In</Label>
                  <p className="text-sm text-muted-foreground">Track ticket pickup and no-shows at events</p>
                </div>
                <Switch checked={checkinEnabled} onCheckedChange={setCheckinEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>T-Shirt Tracking</Label>
                  <p className="text-sm text-muted-foreground">Track t-shirt sizes and inventory for events</p>
                </div>
                <Switch checked={tshirtTrackingEnabled} onCheckedChange={setTshirtTrackingEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Participant & Commander Follow-Up Form</Label>
                  <p className="text-sm text-muted-foreground">Collect attendees, T-shirt sizes, pronunciation, rank, branch, and accommodations after approval</p>
                </div>
                <Switch checked={participantFormEnabled} onCheckedChange={setParticipantFormEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>No-Show Tracking & Flag Prompt</Label>
                  <p className="text-sm text-muted-foreground">Differentiate cancellations from no-contact no-shows and optionally flag future eligibility</p>
                </div>
                <Switch checked={noShowTrackingEnabled} onCheckedChange={setNoShowTrackingEnabled} />
              </div>
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="ticketThreshold">Ticket Capacity Threshold</Label>
                <Input
                  id="ticketThreshold"
                  type="number"
                  min={0}
                  value={ticketCapacityThreshold}
                  onChange={(e) => setTicketCapacityThreshold(parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Receive a notification when total ticket requests reach this number (0 = disabled). 
                  Notifications are sent both in-app and via email if SMTP is configured.
                </p>
              </div>
            </CardContent>
          </Card>
          )}

        </div>

        {/* Save Button - Bottom */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
      
      {/* Add Reviewer Dialog */}
      <Dialog open={addReviewerDialogOpen} onOpenChange={setAddReviewerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Reviewer</DialogTitle>
            <DialogDescription>
              Enter the reviewer's name and email. They will receive an email with a secure link to access their review portal. No account creation is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer-name">Name</Label>
              <Input
                id="reviewer-name"
                placeholder="John Smith"
                value={newReviewerName}
                onChange={(e) => setNewReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewer-email">Email</Label>
              <Input
                id="reviewer-email"
                type="email"
                placeholder="john@example.com"
                value={newReviewerEmail}
                onChange={(e) => setNewReviewerEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddReviewerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReviewer} disabled={createReviewer.isPending}>
              {createReviewer.isPending ? "Adding..." : "Add Reviewer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

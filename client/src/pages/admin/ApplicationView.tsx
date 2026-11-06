import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { ArrowLeft, User, Mail, Phone, Building, Calendar, Star, UserPlus, Check, Users, FileText, Download, FileUp, Trash2, RefreshCw, BarChart3, Copy, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Award } from "lucide-react";
import AnswerValue from "@/components/AnswerValue";
import { answerEntries } from "@shared/formLogic";

export default function AdminApplicationView() {
  const { programId, id } = useParams<{ programId: string; id: string }>();
  const pid = parseInt(programId || '0');
  const appId = parseInt(id || '0');
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<number[]>([]);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignFromReviewerId, setReassignFromReviewerId] = useState<number | null>(null);
  const [reassignToReviewerId, setReassignToReviewerId] = useState<string>("");

  const { data: application, isLoading, refetch } = trpc.applications.getById.useQuery({ id: appId });
  const { data: program } = trpc.programs.getById.useQuery({ id: pid });
  const { data: scores } = trpc.scores.getByApplication.useQuery({ applicationId: appId });
  const { data: reviewers } = trpc.reviewers.list.useQuery();
  const { data: assignments, refetch: refetchAssignments } = trpc.assignments.getByApplication.useQuery({ applicationId: appId });
  const { data: participantFormData } = trpc.participantForms.getByApplication.useQuery({ applicationId: appId });
  const { data: eligibilityEntries } = trpc.awards.eligibilityCheck.useQuery(
    { programId: pid },
    { enabled: program?.programType === 'awards' },
  );
  const eligibility = eligibilityEntries?.find(entry => entry.id === appId);

  const updateStatusMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated');
      refetch();
    }
  });

  const assignMutation = trpc.assignments.assign.useMutation({
    onSuccess: () => {
      toast.success('Reviewer assigned successfully!');
      refetchAssignments();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign reviewer');
    }
  });

  const unassignMutation = trpc.assignments.unassign.useMutation({
    onSuccess: () => {
      toast.success('Reviewer removed successfully!');
      refetchAssignments();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove reviewer');
    }
  });

  const reassignMutation = trpc.assignments.reassign.useMutation({
    onSuccess: () => {
      toast.success('Reviewer reassigned successfully!');
      setReassignDialogOpen(false);
      setReassignFromReviewerId(null);
      setReassignToReviewerId("");
      refetchAssignments();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reassign reviewer');
    }
  });

  const handleUnassignReviewer = (reviewerId: number) => {
    if (confirm('Are you sure you want to remove this reviewer from this application?')) {
      unassignMutation.mutate({ reviewerId, applicationId: appId });
    }
  };

  const handleOpenReassignDialog = (fromReviewerId: number) => {
    setReassignFromReviewerId(fromReviewerId);
    setReassignToReviewerId("");
    setReassignDialogOpen(true);
  };

  const handleReassign = () => {
    if (!reassignFromReviewerId || !reassignToReviewerId) {
      toast.error('Please select a reviewer to reassign to');
      return;
    }
    reassignMutation.mutate({
      applicationId: appId,
      fromReviewerId: reassignFromReviewerId,
      toReviewerId: parseInt(reassignToReviewerId),
      programId: pid,
    });
  };

  const handleAssignReviewers = () => {
    if (selectedReviewerIds.length === 0) {
      toast.error('Please select at least one reviewer');
      return;
    }
    // Assign all selected reviewers
    selectedReviewerIds.forEach(reviewerId => {
      assignMutation.mutate({
        reviewerId,
        applicationId: appId,
        programId: pid,
      });
    });
    setSelectedReviewerIds([]);
  };

  const toggleReviewerSelection = (reviewerId: number) => {
    setSelectedReviewerIds(prev => 
      prev.includes(reviewerId) 
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  // Get already assigned reviewer IDs
  const assignedReviewerIds = new Set(assignments?.map(a => a.reviewerId) || []);
  const availableReviewers = reviewers?.filter(r => !assignedReviewerIds.has(r.id) && r.isActive) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Application Not Found</h2>
          <Link href={`/admin/programs/${pid}/applications`}>
            <Button variant="outline">Back to Applications</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const formData = application.formData as Record<string, unknown> || {};

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/admin/programs/${pid}/applications`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Application #{application.applicationNumber}</h1>
              <p className="text-sm text-muted-foreground truncate">{program?.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href={`/admin/programs/${pid}/applications/${appId}/compare`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </Link>
            <Link href={`/admin/applications/${appId}/pdf`}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </Link>
            <Select
              value={application.status}
              onValueChange={(value) => updateStatusMutation.mutate({ id: appId, status: value as "submitted" | "under_review" | "accepted" | "rejected" | "waitlist" })}
            >
              <SelectTrigger className="w-32 sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="waitlist">Waitlist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Participant Form Link - shows for registration programs when accepted */}
        {program?.programType === 'registration' && application.status === 'accepted' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-4 w-4 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800">Participant Form Link</p>
                  <p className="text-xs text-green-600 truncate">
                    {window.location.origin}/participant-form/{application.participantAccessToken}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-green-300 text-green-700 hover:bg-green-100"
                onClick={() => {
                  const link = `${window.location.origin}/participant-form/${application.participantAccessToken}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Participant form link copied to clipboard!');
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Participant Details - shows submitted form data */}
        {participantFormData && participantFormData.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                Participant Details
              </CardTitle>
              <CardDescription className="text-blue-600">Submitted via participant registration form</CardDescription>
            </CardHeader>
            <CardContent>
              {participantFormData.map((form: any, idx: number) => (
                <div key={idx} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {form.tshirtSize && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">T-Shirt Size</p>
                        <p className="text-sm font-semibold mt-0.5">{form.tshirtSize}</p>
                      </div>
                    )}
                    {form.namePronunciation && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Name Pronunciation</p>
                        <p className="text-sm font-semibold mt-0.5">{form.namePronunciation}</p>
                      </div>
                    )}
                    {form.dietaryRestrictions && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Dietary Restrictions</p>
                        <p className="text-sm font-semibold mt-0.5">{form.dietaryRestrictions}</p>
                      </div>
                    )}
                    {form.specialNeeds && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Special Needs</p>
                        <p className="text-sm font-semibold mt-0.5">{form.specialNeeds}</p>
                      </div>
                    )}
                    {form.rank && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Rank</p>
                        <p className="text-sm font-semibold mt-0.5">{form.rank}</p>
                      </div>
                    )}
                    {form.branch && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Branch</p>
                        <p className="text-sm font-semibold mt-0.5">{form.branch}</p>
                      </div>
                    )}
                    {form.yearsOfService && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Years of Service</p>
                        <p className="text-sm font-semibold mt-0.5">{form.yearsOfService}</p>
                      </div>
                    )}
                  </div>
                  {form.plusOne && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Guest (+1)</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {form.plusOneName || 'Yes'}
                        {form.plusOneTshirtSize && ` — T-Shirt: ${form.plusOneTshirtSize}`}
                      </p>
                    </div>
                  )}
                  {form.attendees && (() => {
                    try {
                      const attendees = typeof form.attendees === 'string' ? JSON.parse(form.attendees) : form.attendees;
                      if (Array.isArray(attendees) && attendees.length > 0) {
                        return (
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Additional Attendees</p>
                            <div className="space-y-1.5">
                              {attendees.map((a: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium">{a.name}</span>
                                  {a.relationship && <span className="text-muted-foreground">({a.relationship})</span>}
                                  {a.tshirtSize && <Badge variant="secondary" className="text-[10px]">{a.tshirtSize}</Badge>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    } catch { return null; }
                  })()}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* PROMINENT REVIEWER ASSIGNMENT SECTION */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Reviewers
            </CardTitle>
            <CardDescription>
              Select reviewers to evaluate this application. Assigned reviewers will see it in their portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Currently Assigned Reviewers */}
              {assignments && assignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Currently Assigned:</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignments.map((assignment) => {
                      const reviewer = reviewers?.find(r => r.id === assignment.reviewerId);
                      return (
                        <Badge key={assignment.id} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                          <Check className="h-3 w-3 text-green-600" />
                          {reviewer?.name || `Reviewer #${assignment.reviewerId}`}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({assignment.status})
                          </span>
                          <button
                            onClick={() => handleOpenReassignDialog(assignment.reviewerId)}
                            className="ml-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded p-0.5"
                            title="Reassign to another reviewer"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleUnassignReviewer(assignment.reviewerId)}
                            className="ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-0.5"
                            title="Remove reviewer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assign New Reviewers - Multi-select */}
              <div className="space-y-3">
                <label className="text-sm font-medium block">Add Reviewers:</label>
                {availableReviewers.length > 0 ? (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {availableReviewers.map((reviewer) => (
                      <label 
                        key={reviewer.id} 
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedReviewerIds.includes(reviewer.id)}
                          onChange={() => toggleReviewerSelection(reviewer.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{reviewer.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{reviewer.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/50">
                    {reviewers?.length === 0 ? "No reviewers created yet" : "All reviewers already assigned"}
                  </p>
                )}
                <Button 
                  onClick={handleAssignReviewers} 
                  disabled={selectedReviewerIds.length === 0 || assignMutation.isPending}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {assignMutation.isPending 
                    ? "Assigning..." 
                    : `Assign ${selectedReviewerIds.length > 0 ? selectedReviewerIds.length : ''} Reviewer${selectedReviewerIds.length !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>

              {/* Help text */}
              {reviewers?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No reviewers have been created yet.{" "}
                  <Link href="/admin/reviewers" className="text-primary hover:underline">
                    Create reviewers first
                  </Link>
                  {" "}to assign them to applications.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Applicant Info */}
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.applicantName && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{application.applicantName}</span>
                </div>
              )}
              {application.applicantEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${application.applicantEmail}`} className="text-primary hover:underline">
                    {application.applicantEmail}
                  </a>
                </div>
              )}
              {application.applicantPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{application.applicantPhone}</span>
                </div>
              )}
              {application.organizationName && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{application.organizationName}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Submitted {new Date(application.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Scoring Summary</CardTitle>
              <CardDescription>
                {scores?.length || 0} reviews completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="text-2xl font-bold">
                    {application.averageScore ? parseFloat(application.averageScore).toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rank</span>
                  <span className="text-2xl font-bold">#{application.rank || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Score</span>
                  <span className="font-medium">
                    {application.totalScore ? parseFloat(application.totalScore).toFixed(0) : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Status - Shows all reviewer scores */}
          <Card>
            <CardHeader>
              <CardTitle>Review Status</CardTitle>
              <CardDescription>
                Individual scores from each assigned reviewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scores && scores.length > 0 ? (
                <div className="space-y-3">
                  {scores.map((score, idx) => {
                    const reviewer = reviewers?.find(r => r.id === score.reviewerId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {reviewer?.name || `Reviewer ${idx + 1}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Submitted {new Date(score.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-lg">{score.totalScore}</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Score breakdown summary */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Score Range</span>
                      <span className="font-medium">
                        {Math.min(...scores.map(s => parseFloat(s.totalScore || '0')))} - {Math.max(...scores.map(s => parseFloat(s.totalScore || '0')))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Star className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground">No reviews submitted yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign reviewers above to start collecting scores
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {eligibility && (eligibility.matches.length > 0 || eligibility.eligibilityStatus !== 'not_reviewed') && (
          <Alert>
            <Award className="h-4 w-4" />
            <AlertTitle>
              {eligibility.eligibilityStatus === 'ineligible' ? 'Confirmed ineligible: excluded from final selection'
                : eligibility.eligibilityStatus === 'eligible' ? 'Reviewed and cleared as eligible by staff'
                : 'Possible award restriction: needs staff review'}
            </AlertTitle>
            <AlertDescription>
              {eligibility.eligibilityReason && <p>{eligibility.eligibilityReason}</p>}
              {eligibility.matches.map(win => (
                <p key={win.id}>
                  {win.recipientName} won {win.category} in {win.awardYear}; eligible again in {win.eligibleAgainYear}.
                </p>
              ))}
              <Link href={`/admin/award-restrictions?program=${pid}`} className="underline">Review in Award Restrictions</Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Application Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Application Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {answerEntries(program?.formConfig?.fields, formData).map(({ id: key, label, value }) => (
                <div key={key} className="border-b pb-4 last:border-0">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    {label}
                  </h4>
                  <p className="whitespace-pre-wrap">
                    <AnswerValue fields={program?.formConfig?.fields} fieldId={key} value={value} />
                  </p>
                </div>
              ))}
              {Object.keys(formData).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No form data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reassign Reviewer Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Reviewer</DialogTitle>
            <DialogDescription>
              Move this application from {reviewers?.find(r => r.id === reassignFromReviewerId)?.name || 'the current reviewer'} to another reviewer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select New Reviewer:</label>
              <Select value={reassignToReviewerId} onValueChange={setReassignToReviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReviewers.length > 0 ? (
                    availableReviewers.map((reviewer) => (
                      <SelectItem key={reviewer.id} value={reviewer.id.toString()}>
                        {reviewer.name} ({reviewer.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No available reviewers
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassign} 
              disabled={!reassignToReviewerId || reassignMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {reassignMutation.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

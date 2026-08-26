import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Trash2, RefreshCw, Mail, AlertTriangle, Server } from "lucide-react";
import { useLocation } from "wouter";
import AdminLayout from "./AdminLayout";

export default function AdminSettings() {
  const [, navigate] = useLocation();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);

  const { data: programs, refetch: refetchPrograms } = trpc.programs.list.useQuery();
  const { data: applications, refetch: refetchApplications } = trpc.applications.list.useQuery(
    { programId: selectedProgram! },
    { enabled: !!selectedProgram }
  );

  const selectedProgramData = programs?.find((p: any) => p.id === selectedProgram);

  const deleteApplication = trpc.admin.deleteApplication.useMutation({
    onSuccess: () => {
      toast.success("Application deleted");
      refetchApplications();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkDeleteApplications = trpc.admin.bulkDeleteApplications.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.count} applications`);
      refetchApplications();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetProgram = trpc.admin.resetProgram.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setResetDialogOpen(false);
      refetchApplications();
      refetchPrograms();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateEmailSettings = trpc.admin.updateProgramEmailSettings.useMutation({
    onSuccess: () => {
      toast.success("Email settings updated");
      refetchPrograms();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleResetProgram = () => {
    if (!selectedProgram) return;
    resetProgram.mutate({ programId: selectedProgram, newYear });
  };

  const handleDeleteAllApplications = () => {
    if (!applications || applications.length === 0) return;
    const ids = applications.map((a: any) => a.id);
    bulkDeleteApplications.mutate({ ids });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground">
            Manage programs, delete applications, and reset for new years
          </p>
        </div>

        {/* Global Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Email Server (SMTP)
            </CardTitle>
            <CardDescription>
              Configure SMTP settings to send actual emails to applicants and reviewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/smtp-settings")}>
              <Mail className="h-4 w-4 mr-2" />
              Configure Email Settings
            </Button>
          </CardContent>
        </Card>

        {/* Program Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Program</CardTitle>
            <CardDescription>Choose a program to manage its settings and applications</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProgram?.toString() || ""}
              onValueChange={(v) => setSelectedProgram(v ? parseInt(v) : null)}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program: any) => (
                  <SelectItem key={program.id} value={program.id.toString()}>
                    {program.name} ({program.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProgram && selectedProgramData && (
          <>
            {/* Email Notification Settings */}
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
                    <Label>Status Change Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email to applicants when their status changes (interview, accepted, rejected)
                    </p>
                  </div>
                  <Switch
                    checked={selectedProgramData.emailConfig?.statusUpdateEnabled || false}
                    onCheckedChange={(checked) => {
                      updateEmailSettings.mutate({
                        programId: selectedProgram,
                        statusUpdateEnabled: checked,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Application Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Application Management
                </CardTitle>
                <CardDescription>
                  Delete individual applications or all applications for this program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Total Applications</p>
                    <p className="text-2xl font-bold">{applications?.length || 0}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={!applications || applications.length === 0}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Applications
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Delete All Applications?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {applications?.length} applications for {selectedProgramData.name}, 
                          including all scores, assignments, and interview records. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllApplications}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Individual Application List */}
                {applications && applications.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {applications.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-3">
                        <div>
                          <span className="font-medium">{app.applicationNumber}</span>
                          <span className="text-muted-foreground ml-2">- {app.applicantName}</span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete application {app.applicationNumber} and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteApplication.mutate({ id: app.id })}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset for New Year */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <RefreshCw className="h-5 w-5" />
                  Reset for New Year
                </CardTitle>
                <CardDescription>
                  Clear all applications and prepare this program for a new application cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    <strong>What this does:</strong>
                  </p>
                  <ul className="text-sm text-orange-700 list-disc list-inside mt-2 space-y-1">
                    <li>Deletes all applications for this program</li>
                    <li>Removes all scores and reviewer assignments</li>
                    <li>Deletes all scheduled interviews</li>
                    <li>Updates the program year to the new year</li>
                    <li>Keeps the form configuration and scoring criteria intact</li>
                  </ul>
                </div>

                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label>New Program Year</Label>
                    <Input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(parseInt(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="mt-6 border-orange-300 text-orange-700 hover:bg-orange-50">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Program
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Reset {selectedProgramData.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all {applications?.length || 0} applications and reset the program to year {newYear}. 
                          The form configuration will be preserved. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetProgram}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Reset Program
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

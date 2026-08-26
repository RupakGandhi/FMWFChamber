import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Clock, Search, Loader2, Shirt, UserCheck, AlertTriangle, RotateCcw, Ban, MessageSquareX } from "lucide-react";
import { toast } from "sonner";
import ProgramSubNav from "@/components/ProgramSubNav";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: "Awaiting Pickup", color: "bg-blue-100 text-blue-800", icon: Clock },
  picked_up: { label: "Picked Up", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  no_show: { label: "No-Show", color: "bg-red-100 text-red-800", icon: XCircle },
  no_show_communicated: { label: "Cancelled", color: "bg-yellow-100 text-yellow-800", icon: MessageSquareX },
};

export default function AdminCheckIn() {
  const [, params] = useRoute("/admin/programs/:programId/checkins");
  const programId = parseInt(params?.programId || "0");
  
  const { data: program } = trpc.programs.getById.useQuery({ id: programId });
  const { data: applications } = trpc.applications.list.useQuery({ programId });
  const { data: checkins, refetch: refetchCheckins } = trpc.checkins.getByProgram.useQuery({ programId });
  const { data: tshirtData } = trpc.participantForms.tshirtInventory.useQuery({ programId });
  
  const updateStatusMutation = trpc.checkins.updateStatus.useMutation({
    onSuccess: () => {
      refetchCheckins();
    },
    onError: (err) => toast.error(err.message),
  });

  const createFlagMutation = trpc.flags.create.useMutation({
    onSuccess: () => {
      toast.success("Applicant flagged for future eligibility review");
    },
    onError: (err) => toast.error(err.message),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [noShowDialog, setNoShowDialog] = useState<{ applicationId: number; name: string; email: string } | null>(null);
  const [noShowNotes, setNoShowNotes] = useState("");
  const [flagForNextYear, setFlagForNextYear] = useState(true);

  // Get approved applications for check-in
  const approvedApps = (applications || []).filter((app: any) => 
    app.status === 'accepted'
  );

  const filteredApps = approvedApps.filter((app: any) =>
    (app.applicantName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.applicantEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.applicationNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCheckinStatus = (applicationId: number) => {
    const checkin = (checkins || []).find((c: any) => c.applicationId === applicationId);
    return checkin?.status || 'approved';
  };

  const handleMarkPickedUp = (applicationId: number) => {
    updateStatusMutation.mutate({ applicationId, programId, status: 'picked_up' });
    toast.success("Marked as Picked Up");
  };

  const handleMarkCancelled = (applicationId: number) => {
    updateStatusMutation.mutate({ applicationId, programId, status: 'no_show_communicated' });
    toast.success("Marked as Cancelled");
  };

  const handleConfirmNoShow = () => {
    if (noShowDialog) {
      updateStatusMutation.mutate({ 
        applicationId: noShowDialog.applicationId, 
        programId, 
        status: 'no_show',
        notes: noShowNotes 
      });

      // If admin chose to flag for next year, create the flag
      if (flagForNextYear && noShowDialog.email) {
        createFlagMutation.mutate({
          applicantEmail: noShowDialog.email,
          applicantName: noShowDialog.name,
          flagType: 'no_show',
          reason: `No-show at ${program?.name || 'event'} without communication.${noShowNotes ? ` Notes: ${noShowNotes}` : ''}`,
          programId,
          year: program?.year || new Date().getFullYear(),
        });
      }

      toast.success("Marked as No-Show");
      setNoShowDialog(null);
      setNoShowNotes("");
      setFlagForNextYear(true);
    }
  };

  const pickedUpCount = (checkins || []).filter((c: any) => c.status === 'picked_up').length;
  const noShowCount = (checkins || []).filter((c: any) => c.status === 'no_show').length;
  const cancelledCount = (checkins || []).filter((c: any) => c.status === 'no_show_communicated').length;
  const noShowTrackingEnabled = program?.settings?.noShowTrackingEnabled !== false;

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Check-In: {program?.name || 'Loading...'}</h1>
          <p className="text-muted-foreground">Track ticket pickup and attendance for this event</p>
          <Badge variant="outline" className="mt-2">Enterprise Tier Feature</Badge>
        </div>

        {/* Program Sub-Navigation Tabs */}
        <ProgramSubNav programId={programId} programType={program?.programType} activeTab="checkins" />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{approvedApps.length}</p>
              <p className="text-xs text-muted-foreground">Total Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{pickedUpCount}</p>
              <p className="text-xs text-muted-foreground">Picked Up</p>
            </CardContent>
          </Card>
          {noShowTrackingEnabled && (
            <>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{noShowCount}</p>
                  <p className="text-xs text-muted-foreground">No-Shows</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{cancelledCount}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
            </>
          )}
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{approvedApps.length - pickedUpCount - noShowCount - cancelledCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting</p>
            </CardContent>
          </Card>
        </div>

        {/* T-Shirt Inventory */}
        {tshirtData && Object.keys(tshirtData.inventory).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                T-Shirt Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(tshirtData.inventory).map(([size, count]) => (
                  <div key={size} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                    <span className="font-medium text-sm">{size.toUpperCase()}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or application number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Action Legend */}
        {noShowTrackingEnabled && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-green-600" />
            <span><strong>Picked Up</strong> — Attendee collected their items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquareX className="h-3.5 w-3.5 text-yellow-600" />
            <span><strong>Cancelled</strong> — They let you know they can't attend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5 text-red-600" />
            <span><strong>No-Show</strong> — Didn't show up without any notice</span>
          </div>
        </div>
        )}

        {/* Applications List */}
        <div className="space-y-2">
          {filteredApps.map((app: any) => {
            const status = getCheckinStatus(app.id);
            const config = statusConfig[status];
            return (
              <Card key={app.id} className={status === 'picked_up' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <config.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{app.applicantName || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{app.applicantEmail || ''}</p>
                        <p className="text-xs text-muted-foreground">{app.applicationNumber || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      {status === 'approved' && (
                        <>
                          <Button size="sm" onClick={() => handleMarkPickedUp(app.id)} disabled={updateStatusMutation.isPending}>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Picked Up
                          </Button>
                          {noShowTrackingEnabled && <Button 
                            size="sm" 
                            variant="outline"
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                            onClick={() => handleMarkCancelled(app.id)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <MessageSquareX className="h-4 w-4 mr-1" />
                            Cancelled
                          </Button>}
                          {noShowTrackingEnabled && <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setNoShowDialog({ 
                              applicationId: app.id, 
                              name: app.applicantName || 'Unknown',
                              email: app.applicantEmail || ''
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            No-Show
                          </Button>}
                        </>
                      )}
                      {(status === 'picked_up' || status === 'no_show' || status === 'no_show_communicated') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ applicationId: app.id, programId, status: 'approved' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No-Show Confirmation Dialog */}
        {noShowTrackingEnabled && <Dialog open={!!noShowDialog} onOpenChange={() => setNoShowDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as No-Show</DialogTitle>
              <DialogDescription>
                <strong>{noShowDialog?.name}</strong> did not show up and did not communicate beforehand. This is different from a cancellation where they let you know in advance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={noShowNotes}
                  onChange={(e) => setNoShowNotes(e.target.value)}
                  placeholder="Any additional context about this no-show..."
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-amber-800">Flag for future eligibility?</p>
                <p className="text-xs text-amber-700">
                  Flagging this person will add them to the Applicant Flags list, which can be used to restrict their eligibility for future events. You can always manage flags manually later.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="flag-next-year" 
                    checked={flagForNextYear} 
                    onCheckedChange={(checked) => setFlagForNextYear(checked === true)}
                  />
                  <label htmlFor="flag-next-year" className="text-sm font-medium text-amber-900 cursor-pointer">
                    Yes, flag this person for next year's eligibility review
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoShowDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmNoShow} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm No-Show
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>
    </AdminLayout>
  );
}

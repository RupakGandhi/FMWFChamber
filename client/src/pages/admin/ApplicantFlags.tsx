import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Plus, Trash2, Loader2, AlertTriangle, Ban, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const flagTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  no_show: { label: "No-Show", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  repeat_no_show: { label: "Repeat No-Show", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  restricted: { label: "Restricted", color: "bg-red-100 text-red-800", icon: Ban },
  warning: { label: "Warning", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
};

export default function AdminApplicantFlags() {
  const { data: flags, isLoading, refetch } = trpc.flags.list.useQuery();
  const createMutation = trpc.flags.create.useMutation({
    onSuccess: () => {
      toast.success("Flag added");
      refetch();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });
  const removeMutation = trpc.flags.remove.useMutation({
    onSuccess: () => {
      toast.success("Flag removed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({
    applicantEmail: "",
    applicantName: "",
    flagType: "no_show" as "no_show" | "repeat_no_show" | "restricted" | "warning",
    reason: "",
    year: new Date().getFullYear(),
  });

  const resetForm = () => {
    setNewFlag({ applicantEmail: "", applicantName: "", flagType: "no_show", reason: "", year: new Date().getFullYear() });
  };

  return (
    <AdminLayout currentPath="/admin/flags">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Applicant Flags</h1>
            <p className="text-muted-foreground">Track no-shows, restrictions, and warnings for applicants</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Flag
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{flags?.filter(f => f.flagType === 'no_show').length || 0}</p>
              <p className="text-xs text-muted-foreground">No-Shows</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{flags?.filter(f => f.flagType === 'repeat_no_show').length || 0}</p>
              <p className="text-xs text-muted-foreground">Repeat No-Shows</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{flags?.filter(f => f.flagType === 'restricted').length || 0}</p>
              <p className="text-xs text-muted-foreground">Restricted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{flags?.filter(f => f.flagType === 'warning').length || 0}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : flags && flags.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Applicant</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Flag Type</th>
                      <th className="p-3 text-left">Reason</th>
                      <th className="p-3 text-left">Year</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((flag) => {
                      const typeInfo = flagTypeLabels[flag.flagType];
                      return (
                        <tr key={flag.id} className="border-t">
                          <td className="p-3 font-medium">{flag.applicantName || '-'}</td>
                          <td className="p-3">{flag.applicantEmail}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo?.color}`}>
                              {typeInfo?.label}
                            </span>
                          </td>
                          <td className="p-3 max-w-[200px] truncate">{flag.reason || '-'}</td>
                          <td className="p-3">{flag.year || '-'}</td>
                          <td className="p-3">{new Date(flag.createdAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeMutation.mutate({ id: flag.id })}
                              disabled={removeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Flags</h3>
              <p className="text-muted-foreground text-center mt-2">
                No applicants have been flagged yet. Flags are used to track no-shows and restrict future eligibility.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add Flag Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Applicant Flag</DialogTitle>
              <DialogDescription>
                Flag an applicant for no-show, restriction, or warning. Restricted applicants will be blocked from future applications.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Applicant Email *</label>
                <Input
                  value={newFlag.applicantEmail}
                  onChange={(e) => setNewFlag({ ...newFlag, applicantEmail: e.target.value })}
                  placeholder="applicant@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Applicant Name</label>
                <Input
                  value={newFlag.applicantName}
                  onChange={(e) => setNewFlag({ ...newFlag, applicantName: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Flag Type *</label>
                <Select value={newFlag.flagType} onValueChange={(v: any) => setNewFlag({ ...newFlag, flagType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_show">No-Show</SelectItem>
                    <SelectItem value="repeat_no_show">Repeat No-Show</SelectItem>
                    <SelectItem value="restricted">Restricted (blocks future applications)</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  value={newFlag.reason}
                  onChange={(e) => setNewFlag({ ...newFlag, reason: e.target.value })}
                  placeholder="Describe why this applicant is being flagged..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input
                  type="number"
                  value={newFlag.year}
                  onChange={(e) => setNewFlag({ ...newFlag, year: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newFlag)}
                disabled={!newFlag.applicantEmail || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Flag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

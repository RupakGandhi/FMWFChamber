import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminArchives() {
  const { data: archives, isLoading, refetch } = trpc.archives.list.useQuery();
  const { data: programs } = trpc.programs.list.useQuery();
  const archiveMutation = trpc.archives.create.useMutation({
    onSuccess: () => {
      toast.success("Program archived successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [viewingArchive, setViewingArchive] = useState<number | null>(null);
  
  const { data: archiveDetail } = trpc.archives.getById.useQuery(
    { id: viewingArchive! },
    { enabled: !!viewingArchive }
  );

  const handleArchive = () => {
    if (selectedProgramId) {
      archiveMutation.mutate({ programId: selectedProgramId });
      setShowArchiveDialog(false);
      setSelectedProgramId(null);
    }
  };

  const exportArchiveCSV = (archive: any) => {
    if (!archive?.data?.applications) return;
    const apps = archive.data.applications;
    if (apps.length === 0) return;
    
    const headers = Object.keys(apps[0]).join(",");
    const rows = apps.map((app: any) => 
      Object.values(app).map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive_${archive.programName}_${archive.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <AdminLayout currentPath="/admin/archives">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Archives</h1>
            <p className="text-muted-foreground">View and manage archived program data from previous years</p>
          </div>
          <Button onClick={() => setShowArchiveDialog(true)}>
            <Archive className="h-4 w-4 mr-2" />
            Archive a Program
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : archives && archives.length > 0 ? (
          <div className="grid gap-4">
            {archives.map((archive) => (
              <Card key={archive.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg">{archive.programName}</CardTitle>
                      <CardDescription>
                        Archived on {new Date(archive.archivedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Year {archive.year}</Badge>
                      <Badge variant="outline">{archive.applicationCount} applications</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingArchive(archive.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportArchiveCSV(archive)}>
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Archives Yet</h3>
              <p className="text-muted-foreground text-center mt-2">
                Archive a program to preserve its data before starting a new cycle.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Archive Dialog */}
        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive a Program</DialogTitle>
              <DialogDescription>
                This will create a snapshot of all applications, scores, and assignments for the selected program. 
                The original data will be preserved - archiving does not delete anything.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Program</label>
              {programs?.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProgramId === program.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <p className="font-medium">{program.name}</p>
                  <p className="text-sm text-muted-foreground">Year {program.year}</p>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Cancel</Button>
              <Button onClick={handleArchive} disabled={!selectedProgramId || archiveMutation.isPending}>
                {archiveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Archive Program
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Archive Dialog */}
        <Dialog open={!!viewingArchive} onOpenChange={() => setViewingArchive(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{archiveDetail?.programName} - Year {archiveDetail?.year}</DialogTitle>
              <DialogDescription>
                Archived on {archiveDetail?.archivedAt ? new Date(archiveDetail.archivedAt).toLocaleDateString() : ''}
              </DialogDescription>
            </DialogHeader>
            {archiveDetail?.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{(archiveDetail.data as any).applications?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Applications</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{(archiveDetail.data as any).scores?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Scores</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{(archiveDetail.data as any).reviewers?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Reviewers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{(archiveDetail.data as any).assignments?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Assignments</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Applications</h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((archiveDetail.data as any).applications || []).slice(0, 20).map((app: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{app.applicantName}</td>
                            <td className="p-2">{app.applicantEmail}</td>
                            <td className="p-2"><Badge variant="outline">{app.status}</Badge></td>
                            <td className="p-2">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {((archiveDetail.data as any).applications || []).length > 20 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing 20 of {(archiveDetail.data as any).applications.length} applications. Export CSV for full data.
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import ProgramSubNav from "@/components/ProgramSubNav";

export default function AdminWaitlist() {
  const [, params] = useRoute("/admin/programs/:programId/waitlist");
  const programId = parseInt(params?.programId || "0");
  
  const { data: program } = trpc.programs.getById.useQuery({ id: programId });
  const { data: waitlistEntries, isLoading, refetch } = trpc.waitlist.getByProgram.useQuery({ programId });
  
  const promoteMutation = trpc.waitlist.promote.useMutation({
    onSuccess: () => {
      toast.success("Applicant promoted from waitlist!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const waitingCount = (waitlistEntries || []).filter((e: any) => e.status === 'waiting').length;
  const promotedCount = (waitlistEntries || []).filter((e: any) => e.status === 'promoted').length;

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Waitlist: {program?.name || 'Loading...'}</h1>
          <p className="text-muted-foreground">Manage waitlisted applicants and promote when spots open</p>
          <Badge variant="outline" className="mt-2">Enterprise Tier Feature</Badge>
        </div>

        {/* Program Sub-Navigation Tabs */}
        <ProgramSubNav programId={programId} programType={program?.programType} activeTab="waitlist" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{waitingCount}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{promotedCount}</p>
              <p className="text-xs text-muted-foreground">Promoted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{(waitlistEntries || []).length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : waitlistEntries && waitlistEntries.length > 0 ? (
          <div className="space-y-2">
            {waitlistEntries.map((entry: any) => (
              <Card key={entry.id} className={entry.status === 'promoted' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        entry.status === 'waiting' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'
                      }`}>
                        {entry.status === 'promoted' ? <CheckCircle2 className="h-4 w-4" /> : `#${entry.position}`}
                      </div>
                      <div>
                        <p className="font-medium">{entry.applicantName || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{entry.applicantEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.status === 'waiting' ? (
                        <Button 
                          size="sm" 
                          onClick={() => promoteMutation.mutate({ id: entry.id })}
                          disabled={promoteMutation.isPending}
                        >
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Promote
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Promoted {entry.promotedAt ? new Date(entry.promotedAt).toLocaleDateString() : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Waitlist Entries</h3>
              <p className="text-muted-foreground text-center mt-2">
                When the program reaches capacity, new applicants will be added to the waitlist.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

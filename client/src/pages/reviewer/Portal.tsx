import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { ClipboardList, FileText, CheckCircle, Clock, Star, Loader2 } from "lucide-react";

export default function ReviewerPortal() {
  const { token } = useParams<{ token: string }>();
  
  const { data: reviewer, isLoading, error } = trpc.reviewer.validate.useQuery({ token: token || '' });
  const { data: assignmentData } = trpc.reviewer.getAssignments.useQuery(
    { token: token || '' },
    { enabled: !!reviewer }
  );
  const assignments = assignmentData?.map(a => a.assignment) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reviewer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Access Link</CardTitle>
            <CardDescription>
              This review link is invalid or has expired. Please contact the administrator for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingAssignments = assignments?.filter((a: { status: string }) => a.status === 'pending') || [];
  const completedAssignments = assignments?.filter((a: { status: string }) => a.status === 'completed') || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-3 sm:py-4 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">FMWF Chamber</h1>
                <p className="text-xs text-muted-foreground">Reviewer Portal</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-medium text-sm sm:text-base truncate">{reviewer.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{reviewer.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 sm:py-8 px-4">
        {/* Welcome */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome, {reviewer.name}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Thank you for serving as a reviewer. Below are your assigned applications.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-3 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Total Assigned</span>
                <span className="sm:hidden">Total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{assignments?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                <span className="hidden sm:inline">Pending Review</span>
                <span className="sm:hidden">Pending</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{pendingAssignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Done</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{completedAssignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Pending Reviews</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Applications waiting for your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAssignments.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-green-500" />
                <p className="text-sm sm:text-base">All caught up! No pending reviews.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map((assignment: { id: number; applicationId: number; assignedAt: Date }) => (
                  <div 
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                  >
                    <div>
                      <p className="font-medium text-sm sm:text-base">Application #{assignment.applicationId}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/review/${token}/application/${assignment.applicationId}`} className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">
                        <Star className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Applications */}
        {completedAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Completed Reviews</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Applications you have already reviewed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedAssignments.map((assignment: { id: number; applicationId: number; completedAt: Date | null }) => (
                  <div 
                    key={assignment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg bg-muted/30 gap-2"
                  >
                    <div>
                      <p className="font-medium text-sm sm:text-base">Application #{assignment.applicationId}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Completed {assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-medium">Reviewed</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Review Guidelines</h3>
            <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
              <li>• Review each application thoroughly before scoring</li>
              <li>• Applications are presented anonymously to ensure fair evaluation</li>
              <li>• Score each criteria based on the provided guidelines</li>
              <li>• Add comments to explain your scoring decisions</li>
              <li>• Your reviews are confidential and will not be shared with applicants</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

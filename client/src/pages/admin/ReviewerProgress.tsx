import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  Users, CheckCircle, Clock, AlertCircle, 
  ArrowLeft, RefreshCw, Mail, ExternalLink,
  TrendingUp, BarChart3
} from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function ReviewerProgress() {
  const { data: progress, isLoading, refetch } = trpc.reviewers.progress.useQuery();
  const { data: programs } = trpc.programs.list.useQuery();

  // Calculate overall stats
  const totalAssigned = progress?.reduce((sum, r) => sum + r.totalAssigned, 0) || 0;
  const totalCompleted = progress?.reduce((sum, r) => sum + r.completed, 0) || 0;
  const totalPending = progress?.reduce((sum, r) => sum + r.pending, 0) || 0;
  const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  // Sort reviewers by completion rate (lowest first to highlight those needing attention)
  const sortedProgress = [...(progress || [])].sort((a, b) => {
    if (a.totalAssigned === 0 && b.totalAssigned === 0) return 0;
    if (a.totalAssigned === 0) return 1;
    if (b.totalAssigned === 0) return -1;
    return a.completionRate - b.completionRate;
  });

  const getStatusColor = (completionRate: number, totalAssigned: number) => {
    if (totalAssigned === 0) return "bg-gray-100 text-gray-600";
    if (completionRate === 100) return "bg-green-100 text-green-700";
    if (completionRate >= 75) return "bg-blue-100 text-blue-700";
    if (completionRate >= 50) return "bg-yellow-100 text-yellow-700";
    if (completionRate >= 25) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const getProgressColor = (completionRate: number) => {
    if (completionRate === 100) return "bg-green-500";
    if (completionRate >= 75) return "bg-blue-500";
    if (completionRate >= 50) return "bg-yellow-500";
    if (completionRate >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <AdminLayout currentPath="/admin/reviewer-progress">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Reviewer Progress Dashboard
              </h1>
              <p className="text-muted-foreground">Monitor reviewer completion status across all programs</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviewers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active reviewers</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompleted}</div>
              <p className="text-xs text-muted-foreground">of {totalAssigned} total</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPending}</div>
              <p className="text-xs text-muted-foreground">Awaiting completion</p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallCompletionRate}%</div>
              <Progress value={overallCompletionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Reviewer Progress Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Status</CardTitle>
            <CardDescription>
              Individual reviewer progress sorted by completion rate (lowest first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : sortedProgress.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Reviewers Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add reviewers and assign them to applications to see progress here.
                </p>
                <Link href="/admin/reviewers">
                  <Button>Manage Reviewers</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedProgress.map(reviewer => (
                  <div 
                    key={reviewer.id}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold">{reviewer.name}</h4>
                          <Badge className={getStatusColor(reviewer.completionRate, reviewer.totalAssigned)}>
                            {reviewer.totalAssigned === 0 ? 'No Assignments' : 
                             reviewer.completionRate === 100 ? 'Complete' :
                             `${reviewer.completionRate}% Done`}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {reviewer.email}
                        </p>
                        {reviewer.lastAccessedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last active: {new Date(reviewer.lastAccessedAt).toLocaleDateString()} at {new Date(reviewer.lastAccessedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {reviewer.completed}/{reviewer.totalAssigned}
                        </div>
                        <p className="text-xs text-muted-foreground">reviews completed</p>
                      </div>
                    </div>
                    
                    {reviewer.totalAssigned > 0 && (
                      <>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(reviewer.completionRate)}`}
                            style={{ width: `${reviewer.completionRate}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            {reviewer.completed} completed
                          </span>
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            {reviewer.pending} pending
                          </span>
                          {reviewer.inProgress > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <AlertCircle className="h-4 w-4" />
                              {reviewer.inProgress} in progress
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/reviewers">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Reviewers
                </CardTitle>
                <CardDescription>
                  Add new reviewers, regenerate access links, or deactivate reviewers
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/programs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  View Applications
                </CardTitle>
                <CardDescription>
                  Assign more applications to reviewers or view submission details
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

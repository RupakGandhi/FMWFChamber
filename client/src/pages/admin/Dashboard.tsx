import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  ClipboardList, Users, FileText, BarChart3, 
  Plus, ArrowRight, CheckCircle, Clock, AlertCircle 
} from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: programs, isLoading } = trpc.programs.list.useQuery();

  const openPrograms = programs?.filter(p => p.status === 'open') || [];
  const draftPrograms = programs?.filter(p => p.status === 'draft') || [];

  return (
    <AdminLayout currentPath="/admin">
      <div className="space-y-6 px-2 sm:px-0">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.name || 'Admin'}</h1>
            <p className="text-sm text-muted-foreground">Manage your programs, applications, and reviewers.</p>
          </div>
          <Link href="/admin/programs">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Programs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{programs?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {openPrograms.length} open, {draftPrograms.length} draft
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Open Programs</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500 hidden sm:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{openPrograms.length}</div>
              <p className="text-xs text-muted-foreground">Accepting applications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Draft Programs</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500 hidden sm:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{draftPrograms.length}</div>
              <p className="text-xs text-muted-foreground">In preparation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Current Year</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{new Date().getFullYear()}</div>
              <p className="text-xs text-muted-foreground">Program cycle</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Programs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Active Programs</CardTitle>
            <CardDescription>Programs currently accepting applications</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : openPrograms.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Open Programs</h3>
                <p className="text-sm text-muted-foreground mb-4 px-4">
                  Create a new program or open an existing draft to start accepting applications.
                </p>
                <Link href="/admin/programs">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Program
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {openPrograms.map(program => (
                  <div 
                    key={program.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{program.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {program.programType === 'leadership' && 'Leadership Program'}
                        {program.programType === 'awards' && 'Awards Program'}
                        {program.programType === 'registration' && 'Event Registration'}
                        {' • '}{program.year}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/programs/${program.id}/applications`} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          View Applications
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/programs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ClipboardList className="h-5 w-5" />
                  Manage Programs
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Create, edit, and manage application programs
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/reviewers">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5" />
                  Manage Reviewers
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Add reviewers and generate secure access links
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/reviewer-progress" className="sm:col-span-2 lg:col-span-1">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BarChart3 className="h-5 w-5" />
                  View Reports
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Track reviewer progress and view analytics
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

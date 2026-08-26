import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Copy, Trash2, ExternalLink, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

export default function AdminReviewers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newReviewer, setNewReviewer] = useState({ name: '', email: '' });

  const { data: reviewers, isLoading, refetch } = trpc.reviewers.list.useQuery();
  
  const createMutation = trpc.reviewers.create.useMutation({
    onSuccess: () => {
      toast.success('Reviewer added successfully');
      setCreateOpen(false);
      setNewReviewer({ name: '', email: '' });
      refetch();
    },
    onError: (error) => toast.error(error.message)
  });

  const updateMutation = trpc.reviewers.update.useMutation({
    onSuccess: () => {
      toast.success('Reviewer updated');
      refetch();
    }
  });

  const regenerateTokenMutation = trpc.reviewers.regenerateToken.useMutation({
    onSuccess: () => {
      toast.success('New access link generated');
      refetch();
    }
  });

  const handleCreate = () => {
    if (!newReviewer.name || !newReviewer.email) {
      toast.error('Please fill in all fields');
      return;
    }
    createMutation.mutate(newReviewer);
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/review/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Review link copied to clipboard');
  };

  return (
    <AdminLayout currentPath="/admin/reviewers">
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Reviewers</h1>
            <p className="text-sm text-muted-foreground">Manage reviewers and their access links</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Reviewer</DialogTitle>
                <DialogDescription>
                  Add a reviewer and generate a secure access link. No account creation required.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={newReviewer.name}
                    onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newReviewer.email}
                    onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full sm:w-auto">
                  {createMutation.isPending ? 'Adding...' : 'Add Reviewer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3 sm:gap-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 text-sm sm:text-base">How Reviewer Access Works</h3>
                <p className="text-xs sm:text-sm text-blue-700 mt-1">
                  Each reviewer gets a unique secure link. They can access their assigned applications 
                  without creating an account. Share the link via email or copy it directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : reviewers?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2 text-center">No Reviewers Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Add reviewers to start assigning applications for review.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Reviewer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviewers?.map(reviewer => (
              <Card key={reviewer.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{reviewer.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{reviewer.email}</span>
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      reviewer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {reviewer.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Added {new Date(reviewer.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyLink(reviewer.accessToken)}
                        className="text-xs sm:text-sm"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/review/${reviewer.accessToken}`, '_blank')}
                        className="text-xs sm:text-sm"
                      >
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => regenerateTokenMutation.mutate({ id: reviewer.id })}
                        className="text-xs sm:text-sm"
                      >
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to deactivate this reviewer?')) {
                            updateMutation.mutate({ id: reviewer.id, isActive: false });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

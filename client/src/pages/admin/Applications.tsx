import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { ArrowLeft, Search, Download, Users, Eye, RefreshCw, UserPlus, CheckCircle2, ArrowRightLeft } from "lucide-react";
import ProgramSubNav from "@/components/ProgramSubNav";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

export default function AdminApplications() {
  const { programId } = useParams<{ programId: string }>();
  const pid = parseInt(programId || '0');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkUnassignOpen, setBulkUnassignOpen] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<number[]>([]);
  const [selectedUnassignReviewerIds, setSelectedUnassignReviewerIds] = useState<number[]>([]);
  const [fromReviewerId, setFromReviewerId] = useState<number | null>(null);
  const [toReviewerId, setToReviewerId] = useState<number | null>(null);

  const { data: program } = trpc.programs.getById.useQuery({ id: pid });
  const { data: applications, isLoading, refetch } = trpc.applications.list.useQuery({ 
    programId: pid,
    status: statusFilter !== 'all' ? statusFilter : undefined 
  });
  const { data: stats } = trpc.programs.getStats.useQuery({ id: pid });
  const { data: ticketStats } = trpc.programs.getTicketStats.useQuery({ id: pid });
  const { data: reviewers } = trpc.reviewers.list.useQuery();

  const updateStatusMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated');
      refetch();
    }
  });

  const bulkAssignMutation = trpc.assignments.bulkAssign.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.count} reviewer assignments!`);
      setSelectedIds([]);
      setSelectedReviewerIds([]);
      setBulkAssignOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign reviewers');
    }
  });

  const bulkUnassignMutation = trpc.assignments.bulkUnassign.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully removed ${data.count} reviewer assignments!`);
      setSelectedIds([]);
      setSelectedUnassignReviewerIds([]);
      setBulkUnassignOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unassign reviewers');
    }
  });

  const bulkReassignMutation = trpc.assignments.bulkReassign.useMutation({
    onSuccess: (data) => {
      if (data.success > 0) {
        toast.success(`Successfully reassigned ${data.success} application${data.success !== 1 ? 's' : ''}!`);
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} application${data.skipped !== 1 ? 's' : ''} skipped (not assigned or already assigned to target)`);
      }
      setSelectedIds([]);
      setFromReviewerId(null);
      setToReviewerId(null);
      setBulkReassignOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reassign reviewers');
    }
  });

  const recalculateRankingsMutation = trpc.applications.recalculateRankings.useMutation({
    onSuccess: () => {
      toast.success('Rankings recalculated');
      refetch();
    }
  });

  const filteredApplications = applications?.filter(app => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      app.applicantName?.toLowerCase().includes(searchLower) ||
      app.applicationNumber.toLowerCase().includes(searchLower) ||
      app.applicantEmail?.toLowerCase().includes(searchLower) ||
      app.organizationName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.map(a => a.id));
    }
  };

  const toggleReviewerSelect = (id: number) => {
    setSelectedReviewerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllReviewers = () => {
    const activeReviewers = reviewers?.filter(r => r.isActive) || [];
    if (selectedReviewerIds.length === activeReviewers.length) {
      setSelectedReviewerIds([]);
    } else {
      setSelectedReviewerIds(activeReviewers.map(r => r.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      waitlist: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
      waitlist: 'Waitlist',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.submitted}`}>
        {labels[status] || status}
      </span>
    );
  };

  const openBulkAssignDialog = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application first');
      return;
    }
    if (!reviewers || reviewers.filter(r => r.isActive).length === 0) {
      toast.error('No active reviewers available. Please add reviewers first.');
      return;
    }
    setSelectedReviewerIds([]);
    setBulkAssignOpen(true);
  };

  const handleBulkAssign = () => {
    if (selectedReviewerIds.length === 0) {
      toast.error('Please select at least one reviewer');
      return;
    }
    bulkAssignMutation.mutate({
      programId: pid,
      applicationIds: selectedIds,
      reviewerIds: selectedReviewerIds,
    });
  };

  const openBulkUnassignDialog = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application first');
      return;
    }
    if (!reviewers || reviewers.filter(r => r.isActive).length === 0) {
      toast.error('No reviewers available.');
      return;
    }
    setSelectedUnassignReviewerIds([]);
    setBulkUnassignOpen(true);
  };

  const handleBulkUnassign = () => {
    if (selectedUnassignReviewerIds.length === 0) {
      toast.error('Please select at least one reviewer to remove');
      return;
    }
    bulkUnassignMutation.mutate({
      applicationIds: selectedIds,
      reviewerIds: selectedUnassignReviewerIds,
      programId: pid,
    });
  };

  const openBulkReassignDialog = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application first');
      return;
    }
    if (!reviewers || reviewers.filter(r => r.isActive).length < 2) {
      toast.error('At least 2 active reviewers are required for reassignment.');
      return;
    }
    setFromReviewerId(null);
    setToReviewerId(null);
    setBulkReassignOpen(true);
  };

  const handleBulkReassign = () => {
    if (!fromReviewerId || !toReviewerId) {
      toast.error('Please select both source and target reviewers');
      return;
    }
    if (fromReviewerId === toReviewerId) {
      toast.error('Source and target reviewers must be different');
      return;
    }
    bulkReassignMutation.mutate({
      applicationIds: selectedIds,
      fromReviewerId,
      toReviewerId,
      programId: pid,
    });
  };

  const toggleUnassignReviewerSelect = (id: number) => {
    setSelectedUnassignReviewerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeReviewers = reviewers?.filter(r => r.isActive) || [];

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{program?.name || 'Applications'}</h1>
            <p className="text-sm text-muted-foreground">
              {stats?.totalApplications || 0} applications • {stats?.reviewed || 0} reviewed
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => recalculateRankingsMutation.mutate({ programId: pid })}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Recalculate</span>
            </Button>
            <Link href={`/admin/programs/${pid}/export`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Program Sub-Navigation Tabs */}
        <ProgramSubNav programId={pid} programType={program?.programType} activeTab="applications" />

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.reviewed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageScore || '—'}</div>
            </CardContent>
          </Card>
          {program?.programType === 'registration' && ticketStats && (
            <Card className={ticketStats.thresholdReached ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tickets Requested</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ticketStats.totalTickets}</div>
                {ticketStats.threshold && (
                  <p className={`text-xs mt-1 ${ticketStats.thresholdReached ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                    {ticketStats.thresholdReached ? '⚠ Threshold reached' : `Threshold: ${ticketStats.threshold}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedIds.length} application{selectedIds.length > 1 ? 's' : ''} selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={openBulkAssignDialog} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Assign</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={openBulkReassignDialog} className="gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Reassign</span>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={openBulkUnassignDialog} className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="waitlist">Waitlist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left text-sm font-medium">Rank</th>
                      <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Application #</th>
                      <th className="p-3 text-left text-sm font-medium">Applicant</th>
                      <th className="p-3 text-left text-sm font-medium hidden md:table-cell">Organization</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Score</th>
                      {program?.programType === 'registration' && (
                        <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Tickets</th>
                      )}
                      <th className="p-3 text-left text-sm font-medium hidden lg:table-cell">Reviews</th>
                      <th className="p-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => (
                      <tr key={app.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.includes(app.id)}
                            onCheckedChange={() => toggleSelect(app.id)}
                          />
                        </td>
                        <td className="p-3 font-medium">{app.rank || '—'}</td>
                        <td className="p-3 font-mono text-sm hidden sm:table-cell">{app.applicationNumber}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">{app.applicantName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{app.applicantEmail}</p>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">{app.organizationName || '—'}</td>
                        <td className="p-3">{getStatusBadge(app.status)}</td>
                        <td className="p-3 font-medium hidden sm:table-cell">
                          {app.averageScore ? parseFloat(app.averageScore).toFixed(1) : '—'}
                        </td>
                        {program?.programType === 'registration' && (
                          <td className="p-3 font-medium hidden sm:table-cell">
                            {(() => {
                              const fd = app.formData as Record<string, unknown> | null;
                              if (!fd) return '—';
                              const val = fd['ticket_count'] || fd['tickets'] || fd['num_tickets'];
                              return val ? String(val) : '—';
                            })()}
                          </td>
                        )}
                        <td className="p-3 hidden lg:table-cell">{app.reviewCount || 0}</td>
                        <td className="p-3">
                          <Link href={`/admin/programs/${pid}/applications/${app.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              <span className="ml-1 hidden sm:inline">View</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Reviewers
            </DialogTitle>
            <DialogDescription>
              Select which reviewers should evaluate the {selectedIds.length} selected application{selectedIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Reviewers</Label>
              <Button variant="ghost" size="sm" onClick={toggleSelectAllReviewers}>
                {selectedReviewerIds.length === activeReviewers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {activeReviewers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active reviewers available.
                  <Link href="/admin/reviewers" className="text-primary hover:underline block mt-1">
                    Add reviewers first
                  </Link>
                </p>
              ) : (
                activeReviewers.map(reviewer => (
                  <div
                    key={reviewer.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedReviewerIds.includes(reviewer.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleReviewerSelect(reviewer.id)}
                  >
                    <Checkbox
                      checked={selectedReviewerIds.includes(reviewer.id)}
                      onCheckedChange={() => toggleReviewerSelect(reviewer.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{reviewer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{reviewer.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedReviewerIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                This will create <strong>{selectedIds.length * selectedReviewerIds.length}</strong> reviewer assignments
                ({selectedIds.length} applications × {selectedReviewerIds.length} reviewers)
              </p>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={selectedReviewerIds.length === 0 || bulkAssignMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              {bulkAssignMutation.isPending ? 'Assigning...' : `Assign ${selectedReviewerIds.length} Reviewer${selectedReviewerIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Unassign Dialog */}
      <Dialog open={bulkUnassignOpen} onOpenChange={setBulkUnassignOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Users className="h-5 w-5" />
              Remove Reviewers
            </DialogTitle>
            <DialogDescription>
              Select which reviewers to remove from the {selectedIds.length} selected application{selectedIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Reviewers to Remove</Label>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {activeReviewers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reviewers available.
                </p>
              ) : (
                activeReviewers.map(reviewer => (
                  <div
                    key={reviewer.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUnassignReviewerIds.includes(reviewer.id) ? 'bg-destructive/10 border border-destructive/30' : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleUnassignReviewerSelect(reviewer.id)}
                  >
                    <Checkbox
                      checked={selectedUnassignReviewerIds.includes(reviewer.id)}
                      onCheckedChange={() => toggleUnassignReviewerSelect(reviewer.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{reviewer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{reviewer.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedUnassignReviewerIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                This will remove assignments for <strong>{selectedUnassignReviewerIds.length}</strong> reviewer{selectedUnassignReviewerIds.length !== 1 ? 's' : ''}
                from <strong>{selectedIds.length}</strong> application{selectedIds.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBulkUnassignOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBulkUnassign} 
              disabled={selectedUnassignReviewerIds.length === 0 || bulkUnassignMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              <Users className="h-4 w-4" />
              {bulkUnassignMutation.isPending ? 'Removing...' : `Remove ${selectedUnassignReviewerIds.length} Reviewer${selectedUnassignReviewerIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reassign Dialog */}
      <Dialog open={bulkReassignOpen} onOpenChange={setBulkReassignOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Reassign Reviewers
            </DialogTitle>
            <DialogDescription>
              Move {selectedIds.length} application{selectedIds.length > 1 ? 's' : ''} from one reviewer to another.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* From Reviewer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">From Reviewer</Label>
              <Select value={fromReviewerId?.toString() || ''} onValueChange={(v) => setFromReviewerId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {activeReviewers.map(reviewer => (
                    <SelectItem 
                      key={reviewer.id} 
                      value={reviewer.id.toString()}
                      disabled={reviewer.id === toReviewerId}
                    >
                      {reviewer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applications currently assigned to this reviewer will be moved
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* To Reviewer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">To Reviewer</Label>
              <Select value={toReviewerId?.toString() || ''} onValueChange={(v) => setToReviewerId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {activeReviewers.map(reviewer => (
                    <SelectItem 
                      key={reviewer.id} 
                      value={reviewer.id.toString()}
                      disabled={reviewer.id === fromReviewerId}
                    >
                      {reviewer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applications will be assigned to this reviewer instead
              </p>
            </div>

            {fromReviewerId && toReviewerId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Only applications that are currently assigned to the source reviewer will be moved. 
                  Applications already assigned to the target reviewer will be skipped.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBulkReassignOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkReassign} 
              disabled={!fromReviewerId || !toReviewerId || bulkReassignMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {bulkReassignMutation.isPending ? 'Reassigning...' : 'Reassign Applications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

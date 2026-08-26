import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Plus, FileEdit, FileText, Copy, ExternalLink, MoreHorizontal, Settings2, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminPrograms() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    slug: '',
    description: '',
    programType: 'leadership' as 'leadership' | 'awards' | 'registration',
    year: new Date().getFullYear(),
  });

  const { data: programs, isLoading, refetch } = trpc.programs.list.useQuery();
  const createMutation = trpc.programs.create.useMutation({
    onSuccess: () => {
      toast.success('Program created successfully');
      setCreateOpen(false);
      setNewProgram({ name: '', slug: '', description: '', programType: 'leadership', year: new Date().getFullYear() });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      toast.success('Program updated');
      refetch();
    }
  });
  const duplicateMutation = trpc.programs.duplicate.useMutation({
    onSuccess: () => {
      toast.success('Program duplicated for next year');
      refetch();
    }
  });

  const handleCreate = () => {
    if (!newProgram.name || !newProgram.slug) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(newProgram);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      open: 'bg-green-100 text-green-700',
      closed: 'bg-yellow-100 text-yellow-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Programs</h1>
            <p className="text-sm text-muted-foreground">Create and manage application programs</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
                <DialogDescription>
                  Set up a new application program. You can configure the form and scoring later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Program Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Leadership FMWF 2026"
                    value={newProgram.name}
                    onChange={(e) => {
                      setNewProgram({ 
                        ...newProgram, 
                        name: e.target.value,
                        slug: generateSlug(e.target.value + '-' + newProgram.year)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="e.g., leadership-fmwf-2026"
                    value={newProgram.slug}
                    onChange={(e) => setNewProgram({ ...newProgram, slug: generateSlug(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground break-all">
                    Public URL: /apply/{newProgram.slug || 'your-slug'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Program Type *</Label>
                  <Select
                    value={newProgram.programType}
                    onValueChange={(value: 'leadership' | 'awards' | 'registration') => 
                      setNewProgram({ ...newProgram, programType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leadership">Leadership Program</SelectItem>
                      <SelectItem value="awards">Awards / Nominations</SelectItem>
                      <SelectItem value="registration">Event Registration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newProgram.year}
                    onChange={(e) => setNewProgram({ ...newProgram, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the program..."
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full sm:w-auto">
                  {createMutation.isPending ? 'Creating...' : 'Create Program'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : programs?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 px-4">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2 text-center">No Programs Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Create your first program to start accepting applications.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {programs?.map(program => (
              <Card key={program.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                        <span className="truncate">{program.name}</span>
                        {getStatusBadge(program.status)}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {program.programType === 'leadership' && 'Leadership Program'}
                        {program.programType === 'awards' && 'Awards Program'}
                        {program.programType === 'registration' && 'Event Registration'}
                        {' • '}{program.year}
                        {program.description && (
                          <span className="hidden sm:inline"> • {program.description}</span>
                        )}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          updateMutation.mutate({ 
                            id: program.id, 
                            status: program.status === 'open' ? 'closed' : 'open' 
                          });
                        }}>
                          {program.status === 'open' ? 'Close Applications' : 'Open Applications'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          duplicateMutation.mutate({ id: program.id, newYear: program.year + 1 });
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate for {program.year + 1}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          updateMutation.mutate({ id: program.id, status: 'archived' });
                        }}>
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/programs/${program.id}`}>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        <FileEdit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Form Builder
                      </Button>
                    </Link>
                    <Link href={`/admin/programs/${program.id}/applications`}>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Applications
                      </Button>
                    </Link>
                    <Link href={`/admin/programs/${program.id}/settings`}>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Settings
                      </Button>
                    </Link>
                    <Link href={`/admin/programs/${program.id}/email-templates`}>
                      <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Email Templates
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/apply/${program.slug}`);
                        toast.success('Application link copied!');
                      }}
                    >
                      <Link2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Copy Link
                    </Button>
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

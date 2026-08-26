import { useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, Clipboard, KeyRound, Loader2, LockOpen, Plus, ShieldCheck, UserCog } from "lucide-react";

type CredentialResult = { username: string | null; temporaryPassword: string } | null;

export default function StaffAccounts() {
  const utils = trpc.useUtils();
  const { data: accounts = [], isLoading } = trpc.staffAccounts.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<CredentialResult>(null);
  const [createForm, setCreateForm] = useState({ username: "", name: "", email: "", temporaryPassword: "" });

  const selected = useMemo(() => accounts.find(account => account.id === editId), [accounts, editId]);
  const [editForm, setEditForm] = useState({ name: "", email: "", isActive: true });

  const createAccount = trpc.staffAccounts.create.useMutation({
    onSuccess: async result => {
      setCredentials({ username: result.username, temporaryPassword: result.temporaryPassword });
      setCreateOpen(false);
      setCreateForm({ username: "", name: "", email: "", temporaryPassword: "" });
      await utils.staffAccounts.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateAccount = trpc.staffAccounts.update.useMutation({
    onSuccess: async () => {
      toast.success("Staff account updated");
      setEditId(null);
      await utils.staffAccounts.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const resetPassword = trpc.staffAccounts.resetPassword.useMutation({
    onSuccess: async result => {
      setCredentials({ username: result.username, temporaryPassword: result.temporaryPassword });
      await utils.staffAccounts.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const unlock = trpc.staffAccounts.unlock.useMutation({
    onSuccess: async () => {
      toast.success("Account unlocked");
      await utils.staffAccounts.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const openEdit = (account: (typeof accounts)[number]) => {
    setEditForm({ name: account.name || "", email: account.email || "", isActive: account.isActive });
    setEditId(account.id);
  };

  return (
    <AdminLayout currentPath="/admin/staff-accounts">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Accounts</h1>
            <p className="text-muted-foreground mt-1">Create and manage Chamber staff access without external account registration.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Staff Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Staff Account</DialogTitle><DialogDescription>The user must replace the temporary password after first sign-in.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2"><Label>Full Name</Label><Input value={createForm.name} onChange={event => setCreateForm({ ...createForm, name: event.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={createForm.email} onChange={event => setCreateForm({ ...createForm, email: event.target.value })} /></div>
                <div className="space-y-2"><Label>Username</Label><Input autoCapitalize="none" value={createForm.username} onChange={event => setCreateForm({ ...createForm, username: event.target.value })} /><p className="text-xs text-muted-foreground">3-64 letters, numbers, periods, underscores, or hyphens.</p></div>
                <div className="rounded-lg border bg-slate-50 p-3 text-sm"><span className="font-medium">Access:</span> Administrator. Every staff account can manage the Chamber application platform.</div>
                <div className="space-y-2"><Label>Temporary Password <span className="text-muted-foreground font-normal">(optional)</span></Label><Input type="password" value={createForm.temporaryPassword} onChange={event => setCreateForm({ ...createForm, temporaryPassword: event.target.value })} /><p className="text-xs text-muted-foreground">Leave blank to generate a strong password automatically.</p></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={createAccount.isPending} onClick={() => createAccount.mutate({ ...createForm, temporaryPassword: createForm.temporaryPassword || undefined })}>{createAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Account</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Chamber-Managed Access</CardTitle><CardDescription>Reviewers remain separate and use secure assignment links; accounts here are for staff administration.</CardDescription></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : accounts.length === 0 ? <div className="p-8 text-center text-muted-foreground">No Chamber-managed staff accounts have been created yet.</div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Sign-In</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{accounts.map(account => {
                    const locked = Boolean(account.lockedUntil && new Date(account.lockedUntil).getTime() > Date.now());
                    return <TableRow key={account.id}>
                      <TableCell><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.email}</div></TableCell>
                      <TableCell className="font-mono text-sm">{account.username}</TableCell>
                      <TableCell><Badge>Administrator</Badge></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{account.isActive ? <Badge className="bg-emerald-100 text-emerald-800">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}{account.mustChangePassword && <Badge variant="outline">Password change required</Badge>}{locked && <Badge className="bg-amber-100 text-amber-900">Locked</Badge>}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{account.lastSignedIn && new Date(account.lastSignedIn).getFullYear() > 2000 ? new Date(account.lastSignedIn).toLocaleString() : "Never"}</TableCell>
                      <TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(account)}><UserCog className="h-4 w-4 mr-1" />Edit</Button><Button variant="outline" size="sm" onClick={() => resetPassword.mutate({ id: account.id })}><KeyRound className="h-4 w-4 mr-1" />Reset</Button>{locked && <Button variant="outline" size="sm" onClick={() => unlock.mutate({ id: account.id })}><LockOpen className="h-4 w-4 mr-1" />Unlock</Button>}</div></TableCell>
                    </TableRow>;
                  })}</TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(editId)} onOpenChange={open => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Staff Account</DialogTitle><DialogDescription>Update access for {selected?.username}.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={event => setEditForm({ ...editForm, email: event.target.value })} /></div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm"><span className="font-medium">Access:</span> Administrator</div>
            <div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Active Account</Label><p className="text-xs text-muted-foreground">Inactive accounts cannot sign in.</p></div><Switch checked={editForm.isActive} onCheckedChange={isActive => setEditForm({ ...editForm, isActive })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button><Button disabled={!selected || updateAccount.isPending} onClick={() => selected && updateAccount.mutate({ id: selected.id, ...editForm })}>{updateAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credentials)} onOpenChange={open => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Temporary Sign-In Created</DialogTitle><DialogDescription>Copy this now. For security, the temporary password will not be shown again.</DialogDescription></DialogHeader>
          <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
            <div><p className="text-xs font-medium text-muted-foreground">Username</p><p className="font-mono break-all">{credentials?.username}</p></div>
            <div><p className="text-xs font-medium text-muted-foreground">Temporary Password</p><p className="font-mono break-all">{credentials?.temporaryPassword}</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={async () => { if (!credentials) return; await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.temporaryPassword}\nSign in: ${window.location.origin}/staff-login`); toast.success("Credentials copied"); }}><Clipboard className="h-4 w-4 mr-2" />Copy Credentials</Button><Button onClick={() => setCredentials(null)}><Check className="h-4 w-4 mr-2" />Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

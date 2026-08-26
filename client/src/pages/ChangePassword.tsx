import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";

export default function ChangePassword() {
  const { user, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const utils = trpc.useUtils();
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      window.location.href = "/admin";
    },
  });

  useEffect(() => {
    if (!loading && !user) window.location.href = "/staff-login";
  }, [loading, user]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#1e3a5f] text-white flex items-center justify-center">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <CardTitle>Create Your Private Password</CardTitle>
          <CardDescription>
            Temporary passwords must be replaced before using the administrator workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={event => {
              event.preventDefault();
              setClientError("");
              if (newPassword !== confirmPassword) {
                setClientError("New password and confirmation do not match.");
                return;
              }
              changePassword.mutate({ currentPassword, newPassword });
            }}
          >
            {(clientError || changePassword.error) && (
              <Alert variant="destructive"><AlertDescription>{clientError || changePassword.error?.message}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current or Temporary Password</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" required />
              <p className="text-xs text-muted-foreground">Use 12-128 characters with uppercase, lowercase, a number, and a special character.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            </div>
            <Button className="w-full" type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Password and Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}


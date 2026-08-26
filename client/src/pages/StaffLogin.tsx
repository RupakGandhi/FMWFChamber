import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.nativeLogin.useMutation({
    onSuccess: async result => {
      await utils.auth.me.invalidate();
      window.location.href = result.mustChangePassword ? "/change-password" : "/admin";
    },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Return to Chamber Programs
        </Link>
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#1e3a5f] text-white flex items-center justify-center">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-[#1e3a5f]">Chamber Staff Sign In</CardTitle>
              <CardDescription className="mt-2">
                Use the staff account created for you by a Chamber administrator.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={event => {
                event.preventDefault();
                login.mutate({ username, password });
              }}
            >
              {login.error && (
                <Alert variant="destructive">
                  <AlertDescription>{login.error.message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="staff-username">Username</Label>
                <Input
                  id="staff-username"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={login.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={login.isPending}
                />
              </div>
              <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#162c48]" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Sign In
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Accounts are issued and managed by authorized Chamber staff. Contact an administrator if you need access or your account is locked.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


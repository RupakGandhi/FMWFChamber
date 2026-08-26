import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Mail, Server, Send, Eye, CheckCircle, AlertCircle, Loader2, HelpCircle, ExternalLink, Shield, Zap } from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function SmtpSettings() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  // Form state
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("FMWF Chamber");
  const [fromEmail, setFromEmail] = useState("");
  const [replyToName, setReplyToName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  
  // Preview state
  const [previewType, setPreviewType] = useState<"confirmation" | "reviewerAssignment" | "statusUpdate" | "reviewerReminder">("confirmation");
  
  // Load existing config
  const { data: config, isLoading } = trpc.smtp.getConfig.useQuery();
  
  // Preview query
  const { data: preview } = trpc.smtp.previewEmail.useQuery({ templateType: previewType });
  
  // Mutations
  const saveConfig = trpc.smtp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("SMTP configuration saved successfully");
      utils.smtp.getConfig.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save configuration");
    },
  });
  
  const testConnection = trpc.smtp.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Test email sent successfully! Check your inbox.");
      } else {
        toast.error(result.error || "Test failed");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to test connection");
    },
  });
  
  // Load config into form
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setHost(config.host);
      setPort(config.port);
      setSecure(config.secure);
      setUsername(config.username);
      setFromName(config.fromName);
      setFromEmail(config.fromEmail);
      setReplyToName(config.replyToName || "");
      setReplyToEmail(config.replyToEmail || "");
      setHasExistingPassword(config.hasPassword);
    }
  }, [config]);
  
  const handleSave = () => {
    saveConfig.mutate({
      enabled,
      host,
      port,
      secure,
      username,
      password: password || undefined,
      fromName,
      fromEmail,
      replyToName,
      replyToEmail,
    });
  };
  
  const handleTest = () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }
    testConnection.mutate({
      host,
      port,
      secure,
      username,
      password: password || undefined,
      fromName,
      fromEmail,
      replyToName,
      replyToEmail,
      testEmail,
    });
  };
  
  // Common SMTP presets with detailed guidance
  const applyPreset = (preset: string) => {
    setSelectedProvider(preset);
    switch (preset) {
      case "gmail":
        setHost("smtp.gmail.com");
        setPort(587);
        setSecure(false);
        setShowSetupGuide(true);
        break;
      case "outlook":
        setHost("smtp.office365.com");
        setPort(587);
        setSecure(false);
        setShowSetupGuide(true);
        break;
      case "yahoo":
        setHost("smtp.mail.yahoo.com");
        setPort(587);
        setSecure(false);
        setShowSetupGuide(true);
        break;
      case "custom":
        setShowSetupGuide(false);
        break;
    }
  };

  // Provider-specific setup guides
  const getProviderGuide = () => {
    switch (selectedProvider) {
      case "gmail":
        return {
          title: "Gmail Setup Guide",
          icon: "📧",
          steps: [
            "Go to your Google Account settings (myaccount.google.com)",
            "Navigate to Security → 2-Step Verification (enable if not already)",
            "Go to Security → App passwords",
            "Select 'Mail' and 'Other (Custom name)' → Enter 'FMWF Chamber'",
            "Click Generate and copy the 16-character password",
            "Use your Gmail address as username and the app password below"
          ],
          link: "https://myaccount.google.com/apppasswords",
          linkText: "Open Google App Passwords",
          warning: "Regular Gmail passwords won't work. You must use an App Password."
        };
      case "outlook":
        return {
          title: "Outlook / Office 365 Setup Guide",
          icon: "📬",
          steps: [
            "Sign in to your Microsoft account (account.microsoft.com)",
            "Go to Security → Advanced security options",
            "Enable Two-step verification if not already enabled",
            "Under App passwords, click 'Create a new app password'",
            "Copy the generated password",
            "Use your Outlook email as username and the app password below"
          ],
          link: "https://account.microsoft.com/security",
          linkText: "Open Microsoft Security Settings",
          warning: "For Office 365 business accounts, contact your IT admin for SMTP access."
        };
      case "yahoo":
        return {
          title: "Yahoo Mail Setup Guide",
          icon: "📮",
          steps: [
            "Go to Yahoo Account Security (login.yahoo.com/account/security)",
            "Enable Two-step verification",
            "Click 'Generate app password'",
            "Select 'Other App' and enter 'FMWF Chamber'",
            "Copy the generated password",
            "Use your Yahoo email as username and the app password below"
          ],
          link: "https://login.yahoo.com/account/security",
          linkText: "Open Yahoo Security Settings",
          warning: "App passwords are required for third-party email access."
        };
      default:
        return null;
    }
  };

  const guide = getProviderGuide();
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")} className="self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Email Settings (SMTP)</h1>
            <p className="text-sm text-muted-foreground">Configure email delivery for notifications</p>
          </div>
        </div>

        {/* Quick Status Card */}
        <Card className={enabled ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`p-3 rounded-full ${enabled ? "bg-green-100" : "bg-amber-100"}`}>
                {enabled ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${enabled ? "text-green-800" : "text-amber-800"}`}>
                  {enabled ? "Email Delivery Active" : "Email Delivery Disabled"}
                </p>
                <p className={`text-sm ${enabled ? "text-green-700" : "text-amber-700"}`}>
                  {enabled 
                    ? "Emails will be sent to applicants and reviewers via your SMTP server."
                    : "Notifications are only sent to the system owner. Enable SMTP to send emails to users."}
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="settings" className="gap-2 text-xs sm:text-sm">
              <Server className="h-4 w-4 hidden sm:block" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2 text-xs sm:text-sm">
              <HelpCircle className="h-4 w-4 hidden sm:block" />
              Setup Guide
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 text-xs sm:text-sm">
              <Eye className="h-4 w-4 hidden sm:block" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-6">
            {/* SMTP Server Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  SMTP Server
                </CardTitle>
                <CardDescription>
                  Configure your email server connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets */}
                <div className="space-y-2">
                  <Label>Quick Setup - Select Your Email Provider</Label>
                  <Select value={selectedProvider} onValueChange={applyPreset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">📧 Gmail (Personal or Workspace)</SelectItem>
                      <SelectItem value="outlook">📬 Outlook / Office 365</SelectItem>
                      <SelectItem value="yahoo">📮 Yahoo Mail</SelectItem>
                      <SelectItem value="custom">⚙️ Custom SMTP Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider-specific inline guide */}
                {showSetupGuide && guide && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{guide.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">{guide.title}</p>
                        <p className="text-sm text-blue-700 mt-1">{guide.warning}</p>
                      </div>
                    </div>
                    <a 
                      href={guide.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {guide.linkText}
                    </a>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Host</Label>
                    <Input
                      id="host"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={port}
                      onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="secure"
                      checked={secure}
                      onCheckedChange={setSecure}
                    />
                    <Label htmlFor="secure">Use SSL/TLS (port 465)</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {secure ? "Direct SSL connection" : "STARTTLS upgrade (recommended for port 587)"}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (Email Address)</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">App Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={hasExistingPassword ? "••••••••" : "Enter app password"}
                    />
                    {hasExistingPassword && !password && (
                      <p className="text-xs text-muted-foreground">Leave blank to keep existing password</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Sender Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Sender Information
                </CardTitle>
                <CardDescription>
                  Configure the "From" and "Reply-To" addresses for outgoing emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="FMWF Chamber"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="programs@fmwfchamber.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="replyToName">Reply-To Name (optional)</Label>
                    <Input
                      id="replyToName"
                      value={replyToName}
                      onChange={(e) => setReplyToName(e.target.value)}
                      placeholder="FMWF Chamber Programs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replyToEmail">Reply-To Email (optional)</Label>
                    <Input
                      id="replyToEmail"
                      type="email"
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      placeholder="programs@fmwfchamber.com"
                    />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Replies to emails will be sent to the Reply-To address if specified, otherwise to the From address.
                </p>
              </CardContent>
            </Card>
            
            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Test Connection
                </CardTitle>
                <CardDescription>
                  Send a test email to verify your SMTP configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="testEmail">Test Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleTest}
                      disabled={testConnection.isPending || !host || !fromEmail}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {testConnection.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Save Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button variant="outline" onClick={() => navigate("/admin/settings")} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveConfig.isPending} className="w-full sm:w-auto">
                {saveConfig.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            {/* Setup Guide Tab */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Email Setup Guide
                </CardTitle>
                <CardDescription>
                  Step-by-step instructions for configuring email delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gmail Guide */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <h3 className="font-semibold">Gmail Setup</h3>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                    <li>Go to your <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Account settings</a></li>
                    <li>Navigate to <strong>Security → 2-Step Verification</strong> (enable if not already)</li>
                    <li>Go to <strong>Security → App passwords</strong></li>
                    <li>Select 'Mail' and 'Other (Custom name)' → Enter 'FMWF Chamber'</li>
                    <li>Click <strong>Generate</strong> and copy the 16-character password</li>
                    <li>Use your Gmail address as username and the app password in Settings</li>
                  </ol>
                  <a 
                    href="https://myaccount.google.com/apppasswords" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Google App Passwords
                  </a>
                </div>

                {/* Outlook Guide */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📬</span>
                    <h3 className="font-semibold">Outlook / Office 365 Setup</h3>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                    <li>Sign in to your <a href="https://account.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft account</a></li>
                    <li>Go to <strong>Security → Advanced security options</strong></li>
                    <li>Enable <strong>Two-step verification</strong> if not already enabled</li>
                    <li>Under App passwords, click <strong>'Create a new app password'</strong></li>
                    <li>Copy the generated password</li>
                    <li>Use your Outlook email as username and the app password in Settings</li>
                  </ol>
                  <a 
                    href="https://account.microsoft.com/security" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Microsoft Security Settings
                  </a>
                </div>

                {/* Yahoo Guide */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📮</span>
                    <h3 className="font-semibold">Yahoo Mail Setup</h3>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
                    <li>Go to <a href="https://login.yahoo.com/account/security" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Yahoo Account Security</a></li>
                    <li>Enable <strong>Two-step verification</strong></li>
                    <li>Click <strong>'Generate app password'</strong></li>
                    <li>Select 'Other App' and enter 'FMWF Chamber'</li>
                    <li>Copy the generated password</li>
                    <li>Use your Yahoo email as username and the app password in Settings</li>
                  </ol>
                  <a 
                    href="https://login.yahoo.com/account/security" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Yahoo Security Settings
                  </a>
                </div>

                {/* Security Tips */}
                <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold">Security Tips</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Always use <strong>App Passwords</strong>, never your regular account password</li>
                    <li>App passwords are specific to this application and can be revoked anytime</li>
                    <li>Your credentials are encrypted and stored securely</li>
                    <li>Test your configuration before enabling email delivery</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Email Preview
                </CardTitle>
                <CardDescription>
                  Preview how emails will look with sample data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Type</Label>
                  <Select value={previewType} onValueChange={(v) => setPreviewType(v as typeof previewType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmation">Application Confirmation</SelectItem>
                      <SelectItem value="reviewerAssignment">Reviewer Assignment</SelectItem>
                      <SelectItem value="statusUpdate">Status Update</SelectItem>
                      <SelectItem value="reviewerReminder">Reviewer Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {preview && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 p-4 border-b">
                      <p className="text-sm text-muted-foreground">Subject:</p>
                      <p className="font-medium break-words">{preview.subject}</p>
                    </div>
                    <div className="p-4 bg-white">
                      <p className="text-sm text-muted-foreground mb-2">Body:</p>
                      <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm bg-slate-50 p-4 rounded border overflow-x-auto">
                        {preview.body}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Tip:</strong> To customize email templates, go to each program's settings and click "Customize Email Templates".
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

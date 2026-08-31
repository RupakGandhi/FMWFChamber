import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Search, CheckCircle, Clock, MapPin, Video, ArrowLeft, FileText } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any; description: string }> = {
  submitted: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
    icon: FileText,
    description: "Your application has been received and is awaiting review.",
  },
  under_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    description: "Your application is currently being reviewed by our selection committee.",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    description: "Congratulations! Your application has been accepted.",
  },
  rejected: {
    label: "Not Selected",
    color: "bg-gray-100 text-gray-800",
    icon: FileText,
    description: "Thank you for your application. Unfortunately, you were not selected at this time.",
  },
  waitlist: {
    label: "Waitlisted",
    color: "bg-orange-100 text-orange-800",
    icon: Clock,
    description: "You are on the waitlist. We will contact you if a spot becomes available.",
  },
};

export default function StatusCheck() {
  const [applicationNumber, setApplicationNumber] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: statusInfo, isLoading, error, refetch } = trpc.applicantPortal.checkStatus.useQuery(
    { applicationNumber },
    { enabled: false }
  );

  const handleSearch = async () => {
    if (!applicationNumber.trim()) return;
    setSearched(true);
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const status = statusInfo ? statusConfig[statusInfo.status] : null;
  const StatusIcon = status?.icon || FileText;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-4">
        <div className="container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/fmwf-logo.png" alt="FMWF Chamber" className="h-10 w-auto" />
            <span className="font-semibold text-lg">FMWF Chamber</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Check Application Status</h1>
            <p className="text-muted-foreground">
              Enter your confirmation number to view the status of your application
            </p>
          </div>

          {/* Search Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Application Lookup
              </CardTitle>
              <CardDescription>
                Your confirmation number was provided when you submitted your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="appNumber" className="sr-only">Confirmation Number</Label>
                  <Input
                    id="appNumber"
                    placeholder="Enter confirmation number (e.g., LEAD-2026-001)"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="text-lg"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading || !applicationNumber.trim()}>
                  {isLoading ? "Searching..." : "Check Status"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {searched && (
            <>
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-red-800 font-medium">Application Not Found</p>
                      <p className="text-red-600 text-sm mt-1">
                        Please check your confirmation number and try again.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {statusInfo && status && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Application #{statusInfo.applicationNumber}</CardTitle>
                        <CardDescription>{statusInfo.programName}</CardDescription>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Description */}
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="p-2 bg-white rounded-full shadow-sm">
                        <StatusIcon className="h-6 w-6 text-[#1e3a5f]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1e3a5f]">{status.label}</p>
                        <p className="text-sm text-muted-foreground">{status.description}</p>
                      </div>
                    </div>

                    {/* Application Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Applicant</p>
                        <p className="font-medium">{statusInfo.applicantName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {new Date(statusInfo.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Questions about your application? Contact the FMWF Chamber of Commerce.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Help Text */}
          {!searched && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have your confirmation number?</p>
              <p>Check your email for the confirmation message sent when you submitted your application.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

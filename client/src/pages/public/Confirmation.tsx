import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, Link } from "wouter";
import { CheckCircle, ClipboardList, Home, Search, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PublicConfirmation() {
  const { applicationNumber } = useParams<{ applicationNumber: string }>();
  const { data: statusInfo } = trpc.applicantPortal.checkStatus.useQuery(
    { applicationNumber: applicationNumber || "" },
    { enabled: !!applicationNumber },
  );
  const isWaitlisted = statusInfo?.status === "waitlist";
  const isRegistration = statusInfo?.programType === "registration";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">FMWF Chamber</h1>
              <p className="text-xs text-muted-foreground">Application Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-16 max-w-xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {isRegistration ? "Registration Submitted!" : "Application Submitted!"}
            </CardTitle>
            <CardDescription>
              {isWaitlisted
                ? "Thank you for your submission. We have received it, and it has been placed on the waitlist."
                : "Thank you for your submission. We have received it successfully."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Your Confirmation Number</p>
              <p className="text-xl font-mono font-bold">{applicationNumber}</p>
            </div>

            {isWaitlisted && (
              <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-left">
                <Clock className="h-5 w-5 shrink-0 text-orange-600" />
                <p className="text-sm text-orange-800">
                  Capacity has been reached, so your request has been placed on the waitlist. We will
                  contact you if a spot becomes available.
                </p>
              </div>
            )}

            {!isWaitlisted && (
              <div className="text-left space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <Search className="h-5 w-5 shrink-0 text-primary" />
                  <p>
                    You can check your status at any time using your confirmation number on the{" "}
                    <Link href="/status" className="text-primary underline">Check Status</Link> page.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                  <p>Chamber staff will follow up regarding the status of your submission.</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="text-sm text-muted-foreground text-left space-y-2">
                {isWaitlisted ? (
                  <>
                    <li>• You'll remain on the waitlist until a spot becomes available</li>
                    <li>• Chamber staff may contact you if your status changes</li>
                    <li>• You can check your status anytime using your confirmation number</li>
                  </>
                ) : (
                  <>
                    <li>• Chamber staff will review your submission</li>
                    <li>• You can check your status anytime using your confirmation number</li>
                    <li>• Chamber staff will contact you with updates</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/status" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

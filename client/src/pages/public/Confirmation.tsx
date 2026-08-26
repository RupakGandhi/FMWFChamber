import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, Link } from "wouter";
import { CheckCircle, ClipboardList, Home, Mail } from "lucide-react";

export default function PublicConfirmation() {
  const { applicationNumber } = useParams<{ applicationNumber: string }>();

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
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for your application. We have received it successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Your Application Number</p>
              <p className="text-xl font-mono font-bold">{applicationNumber}</p>
            </div>

            <div className="text-left space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <p>
                  A confirmation email has been sent to your email address with your application details.
                </p>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <p>
                  Your application will be reviewed by our selection committee. We will contact you 
                  regarding the status of your application.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="text-sm text-muted-foreground text-left space-y-2">
                <li>• Your application will be assigned to reviewers</li>
                <li>• Each reviewer will score your application based on the criteria</li>
                <li>• Top applicants may be invited for an interview</li>
                <li>• Final decisions will be communicated via email</li>
              </ul>
            </div>

            <Link href="/">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

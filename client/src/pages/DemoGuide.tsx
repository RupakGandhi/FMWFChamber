import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ClipboardList, 
  Users, 
  Settings, 
  ArrowRight, 
  CheckCircle2,
  Eye,
  FileText,
  Star,
  Download,
  Ticket,
  Archive,
  Shield,
  AlertTriangle,
  UserCheck
} from "lucide-react";

export default function DemoGuide() {
  // Demo reviewer token - this will be created in the database
  const demoReviewerToken = "DEMO-REVIEWER-2026";
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <ClipboardList className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-lg">FMWF Chamber</span>
            </div>
          </Link>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Demo Mode
          </Badge>
        </div>
      </header>

      <main className="container py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Demo Guide & Instructions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore the complete application management system. Follow the steps below 
            to experience the platform as an applicant, reviewer, and administrator.
          </p>
        </div>

        {/* Demo Credentials Box */}
        <Card className="mb-12 border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Demo Access Credentials
            </CardTitle>
            <CardDescription>
              Use these credentials to access different parts of the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-semibold text-gray-900 mb-2">Applicant Access</div>
                <div className="text-sm text-gray-600 mb-2">No login required</div>
                <div className="text-xs text-gray-500">
                  Simply click "Apply Now" on any program
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-semibold text-gray-900 mb-2">Admin Access</div>
                <div className="text-sm text-gray-600 mb-1">Credentials are issued privately by OptimizED.</div>
                <div className="text-xs text-gray-500">The permanent Chamber site uses individually managed staff accounts instead.</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-semibold text-gray-900 mb-2">Reviewer Access</div>
                <div className="text-sm text-gray-600 mb-2">Token-based link</div>
                <div className="text-xs text-gray-500">
                  Use the demo reviewer link below
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Workflows */}
        <div className="space-y-8">
          
          {/* Workflow 1: Applicant */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <CardTitle>Experience as an Applicant</CardTitle>
                  <CardDescription>Submit a test application (no account needed)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 1: Go to the Homepage</div>
                    <div className="text-sm text-gray-600">
                      Click the "FMWF Chamber" logo or navigate to the main page
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 2: Choose a Program</div>
                    <div className="text-sm text-gray-600">
                      Click "Apply Now" on Leadership FMWF, "Nominate Now" on Chamber Choice Awards, 
                      or "Register Now" on Military Appreciation Night
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 3: Complete the Application</div>
                    <div className="text-sm text-gray-600">
                      Fill out the multi-step form. Notice the conditional fields (e.g., family size 
                      determines t-shirt size fields in Military Appreciation Night)
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 4: Submit and Receive Confirmation</div>
                    <div className="text-sm text-gray-600">
                      After submission, you'll see a confirmation page with your application number
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/">
                  <Button className="gap-2">
                    <FileText className="h-4 w-4" />
                    Go to Application Portal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Workflow 2: Admin */}
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Experience as an Administrator</CardTitle>
                  <CardDescription>Manage programs, view applications, assign reviewers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 1: Access Admin Dashboard</div>
                    <div className="text-sm text-gray-600">
                      Click "Admin Dashboard" in the top-right corner or go to /admin. 
                      Log in with the admin credentials above.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 2: View Programs</div>
                    <div className="text-sm text-gray-600">
                      See all three programs (Leadership FMWF, Chamber Choice Awards, Military Appreciation Night). 
                      Click on any program to edit its form fields, scoring criteria, and settings.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 3: View Applications</div>
                    <div className="text-sm text-gray-600">
                      Click "View Applications" on any program to see submitted applications. 
                      You can filter by status, search, and view individual application details.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 4: Manage Reviewers</div>
                    <div className="text-sm text-gray-600">
                      Go to "Reviewers" in the sidebar. Add new reviewers, generate secure access links, 
                      and assign them to applications. Notice: reviewers don't need accounts - they use 
                      shareable links.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 5: Assign Reviewers to Applications</div>
                    <div className="text-sm text-gray-600">
                      Open an application and click "Assign Reviewers" to assign committee members. 
                      You can assign multiple reviewers per application.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 6: Export Data</div>
                    <div className="text-sm text-gray-600">
                      Go to "Export" to download applications and scores as Excel files. 
                      Data can be filtered by program and status.
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/demo-login">
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Settings className="h-4 w-4" />
                    Go to Admin Login
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Workflow 3: Reviewer */}
          <Card>
            <CardHeader className="bg-purple-50 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <CardTitle>Experience as a Reviewer</CardTitle>
                  <CardDescription>Score applications with blind review (no account needed)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 1: Access Reviewer Portal</div>
                    <div className="text-sm text-gray-600">
                      Click the demo reviewer link below. No login or account creation required - 
                      the secure link provides access.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 2: View Assigned Applications</div>
                    <div className="text-sm text-gray-600">
                      See all applications assigned to you for review. The list shows status 
                      (pending, in progress, completed) for each.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 3: Review Application (Blind Mode)</div>
                    <div className="text-sm text-gray-600">
                      Click on an application to review it. Notice: <strong>applicant names are hidden</strong> 
                      to ensure unbiased evaluation. You only see the application content.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 4: Score Using Criteria</div>
                    <div className="text-sm text-gray-600">
                      Use the scoring sliders to rate each criterion. Add comments for each criterion 
                      and overall notes. The system automatically calculates the total score.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Step 5: Submit Review</div>
                    <div className="text-sm text-gray-600">
                      Click "Submit Review" to save your scores. You can edit your review until 
                      the review period closes.
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-800 mb-3">
                  <strong>Note:</strong> To test the reviewer experience, first submit a test application 
                  as an applicant, then assign the demo reviewer to that application in the admin dashboard.
                </div>
                <Link href={`/review/${demoReviewerToken}`}>
                  <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <Eye className="h-4 w-4" />
                    Open Demo Reviewer Portal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Key Features Summary */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Key Features Demonstrated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">No Account Required for Applicants</div>
                    <div className="text-sm text-gray-600">Applicants can submit without creating accounts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Blind/Anonymous Review</div>
                    <div className="text-sm text-gray-600">Reviewer names hidden from reviewers during scoring</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Unlimited Reviewers</div>
                    <div className="text-sm text-gray-600">No seat limits - add as many reviewers as needed</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Shareable Reviewer Links</div>
                    <div className="text-sm text-gray-600">Committee members access via secure links, no accounts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Conditional Form Logic</div>
                    <div className="text-sm text-gray-600">Fields appear/hide based on previous answers</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Excel Export</div>
                    <div className="text-sm text-gray-600">Download applications and scores for analysis</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Automatic Score Ranking</div>
                    <div className="text-sm text-gray-600">Applications automatically ranked by average score</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Year-Over-Year Reusability</div>
                    <div className="text-sm text-gray-600">Update dates and questions easily each year</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

          {/* Feature Testing Guide */}
          <div className="mt-12" id="testing-guide">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Feature Testing Guide</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Step-by-step instructions for testing each feature. Log in as admin first, then follow the paths below.
              </p>
            </div>

            {/* Ticket Management Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-amber-50 border-b">
                <div className="flex items-center gap-3">
                  <Ticket className="h-6 w-6 text-amber-600" />
                  <div>
                    <CardTitle>Ticket Request Management (Military Night)</CardTitle>
                    <CardDescription>View ticket counts, set thresholds, and manage allocations</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="font-semibold text-gray-800 mb-2">How to test the Ticket Count Column:</div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Programs &gt; Military Appreciation Night &gt; View Applications</div>
                      <div className="text-sm text-gray-600">
                        You'll see a "Tickets" column in the application table showing how many tickets each person requested — no need to open each submission individually.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Look at the "Tickets Requested" stat card at the top</div>
                      <div className="text-sm text-gray-600">
                        This shows the total number of tickets requested across ALL submissions. When the threshold is reached, this card turns amber with a "Threshold reached" indicator.
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold text-gray-800 mt-6 mb-2">How to set the Capacity Threshold:</div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Programs &gt; Military Appreciation Night &gt; View Applications &gt; "Program Settings" tab</div>
                      <div className="text-sm text-gray-600">
                        Scroll to the "Capacity & Event Features" section. You'll see "Ticket Capacity Threshold" — enter your number (e.g., 1000). When total requests reach this number, you'll get a notification.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Notification delivery</div>
                      <div className="text-sm text-gray-600">
                        The in-app alert (amber card) always works. If SMTP email is configured (under System &gt; Settings &gt; Email Configuration), you'll also receive an email. The system works fully with or without email connected.
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold text-gray-800 mt-6 mb-2">Manual Allocation (what the system does NOT do):</div>
                  <div className="flex gap-4">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">No auto-approval, no first-come-first-served</div>
                      <div className="text-sm text-gray-600">
                        The system never automatically approves or notifies applicants. You retain full manual control over which requests to fulfill and in what order — so you can manage section availability as needed.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Workflow & Participant Form */}
            <Card className="mb-6">
              <CardHeader className="bg-blue-50 border-b">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle>Approval Workflow & Commander/Participant Form</CardTitle>
                    <CardDescription>How approval triggers the separate registration form with t-shirt sizes and commander details</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="font-semibold text-gray-800 mb-2">The Full Workflow (Step by Step):</div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <div className="font-medium">Applicant submits a ticket request via the public form</div>
                      <div className="text-sm text-gray-600">
                        Go to the homepage, click "Register Now" on Military Appreciation Night. Fill out the form (name, email, number of tickets, branch, rank). Application appears in admin panel as "Pending."
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <div className="font-medium">Admin reviews and changes status to "Accepted"</div>
                      <div className="text-sm text-gray-600">
                        Navigate to: Admin &gt; Programs &gt; Military Night &gt; View Applications. Click on any application, then use the status dropdown to change it to "Accepted." You have full manual control over who gets approved and in what order.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <div className="font-medium">System auto-sends approval email with Participant Form link</div>
                      <div className="text-sm text-gray-600">
                        When status changes to "Accepted" and SMTP email is configured, the system automatically sends an approval email containing a unique link to the Participant Registration Form. The email template is fully customizable under the "Email Templates" tab. If SMTP is not configured, you can manually copy the link.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <div className="font-medium">Approved applicant fills out the Participant Form (the separate "4th form")</div>
                      <div className="text-sm text-gray-600">
                        This is a dedicated page where each approved attendee enters: their full name, name pronunciation (for announcements), t-shirt size, whether they're a Commander/Senior Leader being honored (with Rank, Branch, Years of Service), plus-one/guest details with names and t-shirt sizes, and dietary restrictions.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">5</div>
                    <div>
                      <div className="font-medium">Admin can view all submitted participant forms and t-shirt inventory</div>
                      <div className="text-sm text-gray-600">
                        All participant form data (commander info, t-shirt sizes, guest details) is visible in the admin panel. The Check-In tab shows aggregated t-shirt inventory so you know exactly what sizes to order.
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold text-gray-800 mt-6 mb-2">How to Test This:</div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Copy the Participant Form Link manually:</div>
                      <div className="text-sm text-gray-600">
                        In the admin panel, open any Military Night application that has been accepted. You'll see a green "Participant Form Link" card with a "Copy Link" button. Click it to copy the URL, then open it in a new browser tab to see the form.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Test the Commander toggle:</div>
                      <div className="text-sm text-gray-600">
                        On the Participant Form, check "I am a Commander / Senior Leader being honored" — this expands to show Rank, Branch of Service, and Years of Service fields.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Customize the approval email:</div>
                      <div className="text-sm text-gray-600">
                        Navigate to: Admin &gt; Programs &gt; Military Night &gt; View Applications &gt; "Email Templates" tab. Edit the Status Update template to change the wording. The {'{{participant_form_link}}'} variable automatically inserts the form link.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-In System Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-green-50 border-b">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-green-600" />
                  <div>
                    <CardTitle>Digital Check-In System (Event Day)</CardTitle>
                    <CardDescription>Track ticket pickup and no-shows at events</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Programs &gt; Military Appreciation Night &gt; View Applications &gt; "Check-In" tab</div>
                      <div className="text-sm text-gray-600">
                        This tab only appears for registration-type programs (like Military Night). It shows all approved attendees.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">On event day: Mark attendees as "Picked Up" or "Did Not Pick Up"</div>
                      <div className="text-sm text-gray-600">
                        Staff can search by name, scan through the list, and mark each person's status. The system tracks who showed up and who didn't.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">No-show tracking carries forward</div>
                      <div className="text-sm text-gray-600">
                        Anyone marked as a no-show gets flagged. Next year when they apply again, you'll see a warning about their prior no-show history — helping you make eligibility decisions.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Distinguish: "No-show without notice" vs "Communicated inability"</div>
                      <div className="text-sm text-gray-600">
                        You can mark whether someone simply didn't show up or whether they communicated ahead of time that they couldn't attend.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* T-Shirt & Inventory Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-indigo-50 border-b">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-indigo-600" />
                  <div>
                    <CardTitle>T-Shirt Sizes & Inventory Tracking</CardTitle>
                    <CardDescription>Track t-shirt sizes tied to ticket count</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">How it works during application:</div>
                      <div className="text-sm text-gray-600">
                        When applicants register for Military Night, they select their t-shirt size (and plus-one's size if applicable). The total number of t-shirts must match the total ticket count — enforced during submission.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Programs &gt; Military Appreciation Night &gt; View Applications</div>
                      <div className="text-sm text-gray-600">
                        The application details show t-shirt size selections. The system aggregates all sizes across approved attendees so you know exactly how many S, M, L, XL, XXL to order.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">To test: Submit a Military Night application from the public portal</div>
                      <div className="text-sm text-gray-600">
                        Go to the homepage, click "Register Now" on Military Appreciation Night, and fill out the form. You'll see the t-shirt size fields tied to your ticket count.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Waitlist Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-orange-50 border-b">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-orange-600" />
                  <div>
                    <CardTitle>Waitlist Management</CardTitle>
                    <CardDescription>Auto-waitlist when capacity is reached, manual promotion</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Set capacity: Admin &gt; Programs &gt; [Program] &gt; View Applications &gt; "Program Settings" tab</div>
                      <div className="text-sm text-gray-600">
                        Under "Capacity & Event Features," set the maximum capacity (e.g., 500). Once approved applications reach this number, new applications automatically go to "Waitlisted" status.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">View waitlist: Admin &gt; Programs &gt; [Program] &gt; View Applications &gt; "Waitlist" tab</div>
                      <div className="text-sm text-gray-600">
                        See all waitlisted applicants in order. You can manually promote someone from the waitlist at any time.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Auto-promotion: When someone withdraws or is rejected</div>
                      <div className="text-sm text-gray-600">
                        If a spot opens up (someone withdraws or is rejected), the system can auto-promote the next person from the waitlist. You can also disable auto-promotion and manage it entirely manually.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Archive System Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center gap-3">
                  <Archive className="h-6 w-6 text-slate-600" />
                  <div>
                    <CardTitle>Annual Archive System</CardTitle>
                    <CardDescription>Preserve historical data, start fresh each year</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-blue-100 text-blue-700">PRO</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Archives (in the sidebar under "Management")</div>
                      <div className="text-sm text-gray-600">
                        View all archived years. Each archive preserves the complete data from that year — applications, scores, reviewer comments, everything.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">How archiving works:</div>
                      <div className="text-sm text-gray-600">
                        At the end of a program year, you "archive" the current data. This preserves everything and resets the program for the new year. You can always go back and view/export past years' data from the Archives section.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviewer Features Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-purple-50 border-b">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-purple-600" />
                  <div>
                    <CardTitle>Advanced Reviewer Features</CardTitle>
                    <CardDescription>Score editing, deadlines, mandatory comments</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-blue-100 text-blue-700">PRO</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Score editing with deadline: Reviewers can revise scores until the deadline you set</div>
                      <div className="text-sm text-gray-600">
                        Set the review deadline in Program Settings. After that date, scores are locked and can no longer be edited.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Mandatory comments for low scores:</div>
                      <div className="text-sm text-gray-600">
                        Configure in Program Settings — set a threshold (e.g., below 5). If a reviewer scores below that threshold, they MUST provide a written comment explaining why. This ensures accountability.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">To test: Open the demo reviewer portal and submit a score below the threshold</div>
                      <div className="text-sm text-gray-600">
                        You'll see the system require a comment before allowing submission.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Testing */}
            <Card className="mb-6">
              <CardHeader className="bg-teal-50 border-b">
                <div className="flex items-center gap-3">
                  <Download className="h-6 w-6 text-teal-600" />
                  <div>
                    <CardTitle>Data Export (CSV, Excel, PDF)</CardTitle>
                    <CardDescription>Export all application data and scores in multiple formats</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700">ALL</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Programs &gt; [Program] &gt; View Applications &gt; "Export" tab</div>
                      <div className="text-sm text-gray-600">
                        Choose what to include (scores, form data, reviewer comments) and export as CSV, Excel, or PDF.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">PDF Score Reports (for committee meetings):</div>
                      <div className="text-sm text-gray-600">
                        From the Score Comparison view (Admin &gt; Programs &gt; [Program] &gt; View Applications &gt; click "Score Comparison" button), you can export a formatted PDF report showing all scores side-by-side.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicant Status Portal */}
            <Card className="mb-6">
              <CardHeader className="bg-cyan-50 border-b">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-cyan-600" />
                  <div>
                    <CardTitle>Applicant Status Portal</CardTitle>
                    <CardDescription>Applicants can check their own application status</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">After submitting an application, applicants receive a confirmation number</div>
                      <div className="text-sm text-gray-600">
                        They can use this number on the "Check Status" page to see where their application is in the process (Submitted, Under Review, Accepted, Rejected, Waitlisted).
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">To test: Submit a test application, note the confirmation number, then visit the Status page</div>
                      <div className="text-sm text-gray-600">
                        The status page is accessible from the main navigation without any login required.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* No-Show Flagging */}
            <Card className="mb-6">
              <CardHeader className="bg-red-50 border-b">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <CardTitle>No-Show Tracking & Applicant Flags</CardTitle>
                    <CardDescription>Flag repeat no-shows to restrict future eligibility</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Navigate to: Admin &gt; Applicant Flags (in the sidebar under "Management")</div>
                      <div className="text-sm text-gray-600">
                        View all flagged applicants across all programs and years. Flags include no-show history, notes, and any restrictions you've applied.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">How flags are created:</div>
                      <div className="text-sm text-gray-600">
                        When you mark someone as a no-show in the Check-In system, a flag is automatically created. You can also manually add flags with custom notes. When that person applies again in a future year, you'll see a warning on their application.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Demo built by OptimizED Strategic Solutions</p>
          <p>For FMWF Chamber of Commerce Technology Assessment</p>
        </div>
      </main>
    </div>
  );
}

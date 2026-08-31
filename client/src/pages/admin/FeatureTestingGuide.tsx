import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Users,
  CheckCircle2,
  Eye,
  FileText,
  Star,
  Download,
  Ticket,
  Archive,
  Shield,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

export default function FeatureTestingGuide() {
  return (
    <AdminLayout currentPath="/admin/feature-testing-guide">
      <div className="max-w-5xl mx-auto space-y-8 py-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Feature Testing Guide</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Step-by-step instructions for testing each feature. Use a real temporary program and a
            real temporary reviewer for testing, then remove the test records when finished.
          </p>
        </div>

        {/* Ticket Management Testing */}
        <Card>
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
              <div className="font-semibold text-gray-800 mb-2">How to test the Ticket Count column:</div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Navigate to: Programs &gt; Military Appreciation Night &gt; Applications</div>
                  <div className="text-sm text-gray-600">
                    The application table shows how many tickets each person requested — no need to open
                    each submission individually.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Look at the ticket totals shown on the Applications page</div>
                  <div className="text-sm text-gray-600">
                    This reflects the total number of tickets requested across all submissions.
                  </div>
                </div>
              </div>

              <div className="font-semibold text-gray-800 mt-6 mb-2">How to set the capacity threshold:</div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Navigate to: Programs &gt; Military Appreciation Night &gt; Settings</div>
                  <div className="text-sm text-gray-600">
                    Scroll to the Capacity &amp; Event Features section. Enter the Ticket Capacity Threshold
                    (e.g., 1000). When total requests reach this number, you'll get a notification.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Notification delivery</div>
                  <div className="text-sm text-gray-600">
                    The in-app notification always works. If SMTP email is configured (System &gt; Email
                    Configuration), you'll also receive an email. Everything works with or without email
                    connected.
                  </div>
                </div>
              </div>

              <div className="font-semibold text-gray-800 mt-6 mb-2">Manual allocation (what the system does NOT do):</div>
              <div className="flex gap-4">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">No auto-approval, no first-come-first-served</div>
                  <div className="text-sm text-gray-600">
                    The system never automatically approves or notifies applicants. Staff retain full
                    manual control over which requests to fulfill and in what order.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow & Participant Form */}
        <Card>
          <CardHeader className="bg-blue-50 border-b">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Approval Workflow &amp; Commander/Participant Form</CardTitle>
                <CardDescription>How approval triggers the separate registration form with t-shirt sizes and commander details</CardDescription>
              </div>
              <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="font-semibold text-gray-800 mb-2">The full workflow, step by step:</div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <div className="font-medium">Applicant submits a ticket request via the public form</div>
                  <div className="text-sm text-gray-600">
                    From the homepage, click "Register Now" on Military Appreciation Night. The application
                    appears in the admin panel as Submitted.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <div className="font-medium">Admin reviews and changes status to Accepted</div>
                  <div className="text-sm text-gray-600">
                    Navigate to: Programs &gt; Military Night &gt; Applications. Open the application and use the
                    status control to change it to Accepted. Staff have full manual control over who gets
                    approved and in what order.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <div className="font-medium">System sends an approval email with the Participant Form link</div>
                  <div className="text-sm text-gray-600">
                    When status changes to Accepted and SMTP email is configured, the system sends the
                    configured status email containing a unique link to the Participant Registration Form.
                    Customize wording under the program's Email Templates page. If SMTP isn't configured,
                    copy the link manually from the application detail page.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <div className="font-medium">Approved applicant completes the Participant Form</div>
                  <div className="text-sm text-gray-600">
                    A dedicated page where each approved attendee enters: full name, name pronunciation,
                    t-shirt size, whether they're a Commander/Senior Leader being honored (with rank, branch,
                    years of service), guest details, and dietary/accessibility notes.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">5</div>
                <div>
                  <div className="font-medium">Admin can view submitted participant data and t-shirt inventory</div>
                  <div className="text-sm text-gray-600">
                    Participant form data appears on the application detail page. The Check-In page shows
                    aggregated t-shirt inventory.
                  </div>
                </div>
              </div>

              <div className="font-semibold text-gray-800 mt-6 mb-2">How to test this:</div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Copy the Participant Form link manually</div>
                  <div className="text-sm text-gray-600">
                    Open any accepted Military Night application; the Participant Form link is on the
                    detail page. Copy it and open it in a new tab.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Test the Commander toggle</div>
                  <div className="text-sm text-gray-600">
                    On the Participant Form, check "I am a Commander / Senior Leader being honored" — this
                    reveals Rank, Branch of Service, and Years of Service fields.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Customize the approval email</div>
                  <div className="text-sm text-gray-600">
                    Navigate to: Programs &gt; Military Night &gt; Email Templates. Edit the status update
                    template — the {"{{participant_form_link}}"} variable inserts the form link automatically.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-In System Testing */}
        <Card>
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
                  <div className="font-medium">Navigate to: Programs &gt; Military Appreciation Night &gt; Check-In</div>
                  <div className="text-sm text-gray-600">
                    This tab only appears for registration-type programs. It shows all approved attendees.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">On event day: mark attendees Picked Up, Cancelled, or No-Show</div>
                  <div className="text-sm text-gray-600">
                    Staff search by name and set each person's status. Every status change has an Undo
                    button to revert accidental clicks.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">No-show flagging is a manual, optional choice</div>
                  <div className="text-sm text-gray-600">
                    When marking someone as a no-contact No-Show, staff can optionally flag them for next
                    year's eligibility review (the flag checkbox defaults to checked but can be unchecked).
                    Nothing is flagged automatically without a staff decision.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Distinguish "No-Show" from "Cancelled"</div>
                  <div className="text-sm text-gray-600">
                    Use Cancelled for anyone who communicated ahead of time that they couldn't attend, and
                    No-Show only for those who gave no notice.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* T-Shirt & Inventory Testing */}
        <Card>
          <CardHeader className="bg-indigo-50 border-b">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-indigo-600" />
              <div>
                <CardTitle>T-Shirt Sizes &amp; Inventory Tracking</CardTitle>
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
                  <div className="font-medium">How it works during registration</div>
                  <div className="text-sm text-gray-600">
                    Applicants select a t-shirt size for themselves and each guest on the Participant Form,
                    which is aggregated for ordering.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Navigate to: Programs &gt; Military Appreciation Night &gt; Check-In</div>
                  <div className="text-sm text-gray-600">
                    The Check-In page aggregates all t-shirt sizes across approved, submitted participant
                    forms so you know exactly how many of each size to order.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waitlist Testing */}
        <Card>
          <CardHeader className="bg-orange-50 border-b">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-orange-600" />
              <div>
                <CardTitle>Waitlist Management</CardTitle>
                <CardDescription>Automatic waitlisting when capacity is reached, manual promotion</CardDescription>
              </div>
              <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Set capacity: Programs &gt; [Program] &gt; Settings</div>
                  <div className="text-sm text-gray-600">
                    Under Capacity &amp; Event Features, set the maximum capacity and enable waitlisting. Once
                    staff-accepted allocations reach that number, new submissions are placed on the waitlist
                    instead of being approved.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">View the waitlist: Programs &gt; [Program] &gt; Waitlist</div>
                  <div className="text-sm text-gray-600">
                    See waitlisted applicants in order. Staff can manually promote any entry at any time.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Automatic promotion is a separate, off-by-default toggle</div>
                  <div className="text-sm text-gray-600">
                    Keep automatic promotion off unless the Chamber expressly wants it — manual promotion
                    preserves full staff control over Military Night allocation.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archive System Testing */}
        <Card>
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
                  <div className="font-medium">Navigate to: Archives (Management section of the sidebar)</div>
                  <div className="text-sm text-gray-600">
                    View all archived years. Each archive preserves the complete data from that year —
                    applications, scores, reviewer assignments, check-ins, and participant forms.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">How archiving works</div>
                  <div className="text-sm text-gray-600">
                    Archiving a program saves an immutable snapshot and sets the program's status to
                    Archived. You can always return to view or export past years' data from Archives.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviewer Features Testing */}
        <Card>
          <CardHeader className="bg-purple-50 border-b">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle>Reviewer Features</CardTitle>
                <CardDescription>Blind review, score editing, deadlines, mandatory comments</CardDescription>
              </div>
              <Badge className="ml-auto bg-blue-100 text-blue-700">PRO</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Create a real temporary reviewer to test with</div>
                  <div className="text-sm text-gray-600">
                    Go to Reviewers in the sidebar, add a reviewer, and use its generated "Open" link — a
                    long opaque token, not a shared or guessable link. Assign it to a test application, then
                    delete the reviewer when you're done testing.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Blind review hides applicant names</div>
                  <div className="text-sm text-gray-600">
                    When blind review is enabled on a program, reviewers see only the application content,
                    not the applicant's identity.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Score editing with a deadline</div>
                  <div className="text-sm text-gray-600">
                    Set a review deadline in Program Settings. After that date, scores are locked.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Mandatory comments for low scores</div>
                  <div className="text-sm text-gray-600">
                    Configure a threshold in Program Settings. A reviewer scoring below that threshold must
                    provide a written comment before submitting.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Testing */}
        <Card>
          <CardHeader className="bg-teal-50 border-b">
            <div className="flex items-center gap-3">
              <Download className="h-6 w-6 text-teal-600" />
              <div>
                <CardTitle>Data Export (CSV, Excel, PDF)</CardTitle>
                <CardDescription>Export application data and scores in multiple formats</CardDescription>
              </div>
              <Badge className="ml-auto bg-green-100 text-green-700">ALL</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Navigate to: Programs &gt; [Program] &gt; Export</div>
                  <div className="text-sm text-gray-600">
                    Choose what to include (scores, form data, reviewer comments) and export as CSV, Excel,
                    or a printable PDF.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">PDF score reports for committee meetings</div>
                  <div className="text-sm text-gray-600">
                    From the Score Comparison view, export a formatted PDF report showing all scores
                    side-by-side.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicant Status Portal */}
        <Card>
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
                  <div className="font-medium">After submitting, applicants receive a confirmation number</div>
                  <div className="text-sm text-gray-600">
                    They use it on the public Check Status page to see whether the application is
                    Submitted, Under Review, Accepted, Rejected, or Waitlisted.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">To test: submit a test application, note the confirmation number, then visit Check Status</div>
                  <div className="text-sm text-gray-600">
                    The status page is accessible from the main navigation without any login.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No-Show Flagging */}
        <Card>
          <CardHeader className="bg-red-50 border-b">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <CardTitle>No-Show Tracking &amp; Applicant Flags</CardTitle>
                <CardDescription>Flag repeat no-shows to inform future eligibility decisions</CardDescription>
              </div>
              <Badge className="ml-auto bg-purple-100 text-purple-700">ENT</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Navigate to: Applicant Flags (Management section of the sidebar)</div>
                  <div className="text-sm text-gray-600">
                    View all flagged applicants across every program and year, with reason and date.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Flags are created by staff decision, not automatically</div>
                  <div className="text-sm text-gray-600">
                    When marking someone as a No-Show, staff choose whether to also create a flag (the
                    option defaults to checked, but staff can uncheck it). Flags can also be added manually
                    at any time. When that person applies again, staff see a warning on the application.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  HelpCircle, Search, ClipboardList, Users, Settings, Mail, 
  Download, Flag, UserCheck, Clock, Shirt, FileText, 
  ChevronDown, ChevronUp, Compass, ExternalLink
} from "lucide-react";
import { Link } from "wouter";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I create a new program?",
    answer: "Go to Programs from the sidebar, then click 'Create Program'. Fill in the program name, type (application or registration), year, and description. After creation, configure its settings including deadlines, capacity, and reviewer assignments.",
    category: "Programs",
  },
  {
    question: "What's the difference between 'application' and 'registration' program types?",
    answer: "Application programs use configurable reviewer scoring (for example, Leadership FMWF). Registration programs add capacity, waitlist, participant-form, T-shirt, and check-in tools. Registration requests are not automatically approved or fulfilled first-come-first-served; Chamber staff retain manual allocation control.",
    category: "Programs",
  },
  {
    question: "How do I assign reviewers to a program?",
    answer: "Go to the program's Settings page and scroll to the 'Program Reviewers' section. Add reviewers by email — they'll receive an access link. You can also manage all reviewers from the Reviewers page in the sidebar.",
    category: "Reviewers",
  },
  {
    question: "How do reviewers access their portal?",
    answer: "Reviewers receive a unique link via email. They don't need to create an account or log in. The link takes them directly to their assigned applications for scoring.",
    category: "Reviewers",
  },
  {
    question: "How do I send reminders to reviewers?",
    answer: "Go to the program's Settings page and use the 'Send Reminders' button in the Reviewer section. This sends an email to all reviewers who haven't completed their reviews.",
    category: "Reviewers",
  },
  {
    question: "How do I approve or reject applications?",
    answer: "Open an application from the Applications list and use its status dropdown. For an approved registration request, the configured status email includes that applicant's secure Participant Form link.",
    category: "Applications",
  },
  {
    question: "Where can I see participant form data (t-shirt sizes, guests, pronunciation)?",
    answer: "After an applicant is approved and completes their Participant Form, the data appears on their individual application detail page under the 'Participant Details' section. You can also see aggregate t-shirt inventory on the Check-In page.",
    category: "Applications",
  },
  {
    question: "How does the Check-In system work?",
    answer: "The Check-In page (available for registration programs) shows all approved participants. On event day, mark attendees as 'Picked Up' when they arrive. Use 'Cancelled' for those who communicated they can't attend, and 'No-Show' for those who didn't show without notice.",
    category: "Events",
  },
  {
    question: "What happens when I mark someone as No-Show?",
    answer: "You'll be prompted to optionally flag them for next year's eligibility review. This helps track repeat non-attendees who block spots for others. The flag is optional — you can mark No-Show without creating a flag.",
    category: "Events",
  },
  {
    question: "Can I undo a check-in status?",
    answer: "Yes! Every status (Picked Up, Cancelled, No-Show) has an 'Undo' button that reverts the person back to 'Awaiting Pickup' status. This is useful for accidental clicks.",
    category: "Events",
  },
  {
    question: "How do Applicant Flags work?",
    answer: "Flags are records attached to applicants to track issues across programs and years. They can be created manually from the Applicant Flags page, or prompted when marking a No-Show. Flag types include: No-Show, Repeat No-Show, Restricted, and Warning.",
    category: "Flags",
  },
  {
    question: "How do I customize email templates?",
    answer: "Open Programs from the sidebar and choose 'Email Templates' on the program's main card. You can customize confirmation, reviewer assignment, status update, and reviewer reminder emails. Use template variables such as {{applicant_name}} and {{participant_form_link}} for personalization.",
    category: "Email",
  },
  {
    question: "How do I export application data?",
    answer: "Open a program and select Export. Choose the included datasets, then export CSV, Excel, or a printable PDF comparison report. Individual application PDFs remain available from each application detail page.",
    category: "Export",
  },
  {
    question: "What does archiving a program do?",
    answer: "Archiving creates an immutable annual snapshot of the program, applications, scores, reviewer assignments, check-in records, and participant forms. Staff can view and export archived information; archiving does not overwrite or restore the active program database.",
    category: "Programs",
  },
  {
    question: "How do I set application deadlines?",
    answer: "Go to the program's Settings page and use the Application Deadline date picker. The date appears on the public homepage and the server rejects new submissions after the deadline in the Chamber's Central Time zone.",
    category: "Programs",
  },
  {
    question: "What is the waitlist?",
    answer: "If waitlisting is enabled and staff-approved allocations have reached the configured capacity, later requests are placed on the waitlist without being approved. Staff can promote any waitlisted applicant manually; the system then sends the configured approval email and secure Participant Form link. Optional automatic next-person promotion is a separate toggle and should remain off for Military Appreciation Night to preserve flexible manual allocation.",
    category: "Applications",
  },
];

const categories = Array.from(new Set(faqs.map(f => f.category)));

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout currentPath="/admin/help">
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">
            Quick answers to common questions about the FMWF Chamber Application System
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/guided-tour">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Compass className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Take the Guided Tour</p>
                  <p className="text-xs text-muted-foreground">Interactive walkthrough of all features</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/feature-testing-guide">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Feature Testing Guide</p>
                  <p className="text-xs text-muted-foreground">Step-by-step testing instructions</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-2">
          {filteredFaqs.map((faq, idx) => (
            <Card 
              key={idx} 
              className={`cursor-pointer transition-colors ${expandedFaq === idx ? 'border-primary/30' : ''}`}
              onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{faq.category}</Badge>
                    </div>
                    <p className="font-medium text-sm">{faq.question}</p>
                    {expandedFaq === idx && (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                  {expandedFaq === idx ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No matching help topics found.</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory(null); }} className="mt-2">
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Workflow Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete Workflow at a Glance</CardTitle>
            <CardDescription>The typical lifecycle of a chamber program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { step: 1, text: "Create program and configure settings (deadlines, capacity, form fields)" },
                { step: 2, text: "Assign reviewers and customize email templates" },
                { step: 3, text: "Open applications — applicants submit via public form" },
                { step: 4, text: "Reviewers score applications via their unique portal links" },
                { step: 5, text: "Review rankings and approve/reject applicants" },
                { step: 6, text: "Approved participants complete Participant Form (t-shirt, guests, etc.)" },
                { step: 7, text: "Event day: use Check-In to track attendance and manage no-shows" },
                { step: 8, text: "Export data for records, archive the program for next year" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary-foreground">{item.step}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

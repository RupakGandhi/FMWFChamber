import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Compass, ChevronRight, ChevronLeft, Play, CheckCircle2, 
  ClipboardList, Users, Settings, Mail, Download, Flag, 
  BarChart3, Archive, FileText, UserCheck, ListOrdered,
  Shirt, Clock, Star
} from "lucide-react";
import { useLocation } from "wouter";

interface TourStep {
  id: number;
  title: string;
  description: string;
  details: string[];
  icon: any;
  navigateTo?: string;
  category: 'setup' | 'workflow' | 'management' | 'advanced';
}

const tourSteps: TourStep[] = [
  {
    id: 1,
    title: "Programs Overview",
    description: "Create and manage all your chamber programs from one central hub.",
    details: [
      "Each program has its own application form, reviewers, settings, and deadlines.",
      "Scored programs use configurable reviewer criteria; registration programs add capacity, waitlist, participant-form, T-shirt, and check-in tools.",
      "Registration requests are not automatically approved or fulfilled first-come-first-served; Chamber staff retain allocation control.",
      "Click any program card to configure it, or use the quick-action buttons.",
    ],
    icon: ClipboardList,
    navigateTo: "/admin/programs",
    category: 'setup',
  },
  {
    id: 2,
    title: "Program Settings & Deadlines",
    description: "Configure each program's capacity, deadlines, reviewers, and features.",
    details: [
      "Set the Application Deadline — this is displayed on the public homepage countdown.",
      "The server also rejects new submissions after the deadline in Central Time.",
      "Assign reviewers who will score applications for this program.",
      "Toggle features like score editing, waitlist, and check-in per program.",
      "Capacity is based on staff-approved allocations; waitlisting never auto-approves a request.",
    ],
    icon: Settings,
    category: 'setup',
  },
  {
    id: 3,
    title: "Application Management",
    description: "View, filter, and manage all submissions for each program.",
    details: [
      "Applications are automatically ranked by reviewer scores.",
      "Use status filters to see pending, under review, approved, or rejected applications.",
      "Click any application to see full details, reviewer scores, and take actions.",
      "Bulk actions assign, remove, or reassign reviewers; status decisions remain deliberate per application.",
    ],
    icon: ListOrdered,
    navigateTo: "/admin/programs",
    category: 'workflow',
  },
  {
    id: 4,
    title: "Reviewer Portal & Assignment",
    description: "Assign external reviewers and track their scoring progress.",
    details: [
      "Add reviewers by email — they receive a unique access link (no login required).",
      "Reviewers score applications using each program's configurable criteria and score ranges.",
      "Track reviewer progress from the Reviewer Progress dashboard.",
      "Send reminder emails to reviewers who haven't completed their reviews.",
    ],
    icon: Users,
    navigateTo: "/admin/reviewers",
    category: 'workflow',
  },
  {
    id: 5,
    title: "Approval & Participant Forms",
    description: "Once approved, participants complete a follow-up form for event logistics.",
    details: [
      "When you approve an application, the configured status email is sent when SMTP delivery is enabled.",
      "For registration programs, approved participants receive an unguessable Participant Form link.",
      "The Participant Form collects T-shirt sizes, attendees, name pronunciation, dietary/accessibility needs, and commander rank/branch/service information.",
      "Staff can view all submitted participant data directly on each application's detail page.",
    ],
    icon: Shirt,
    navigateTo: "/admin/programs",
    category: 'workflow',
  },
  {
    id: 6,
    title: "Check-In & Event Day",
    description: "Track attendance and manage ticket pickup on event day.",
    details: [
      "The Check-In page shows all approved participants with their t-shirt sizes.",
      "Mark attendees as 'Picked Up' when they arrive.",
      "Use 'Cancelled' for those who communicated they can't attend (no penalty).",
      "Use 'No-Show' for those who didn't show without notice — you'll be prompted to flag them.",
      "All statuses are reversible with the Undo button in case of accidental clicks.",
    ],
    icon: UserCheck,
    navigateTo: "/admin/programs",
    category: 'workflow',
  },
  {
    id: 7,
    title: "Applicant Flags",
    description: "Track repeat no-shows and restrict future eligibility.",
    details: [
      "Flags are created manually or prompted when marking someone as No-Show.",
      "Flag types: No-Show, Repeat No-Show, Restricted, Warning.",
      "A Restricted flag blocks online submission and directs the applicant to contact Chamber staff; other flags remain administrative records.",
      "Use this to manage individuals who repeatedly request tickets but don't attend.",
    ],
    icon: Flag,
    navigateTo: "/admin/flags",
    category: 'management',
  },
  {
    id: 8,
    title: "Email Templates",
    description: "Customize all automated emails sent to applicants and reviewers.",
    details: [
      "Each program has its own set of email templates.",
      "Customize confirmation emails, reviewer notifications, status updates, and reminders.",
      "Use template variables like {{applicant_name}} for personalization.",
      "Preview emails before saving to see exactly what recipients will receive.",
    ],
    icon: Mail,
    navigateTo: "/admin/programs",
    category: 'management',
  },
  {
    id: 9,
    title: "Export & Reporting",
    description: "Export application data for reporting, analysis, or record-keeping.",
    details: [
      "Export CSV, Excel, or a printable PDF with configurable application, score, comment, and event datasets.",
      "Generate formatted PDF reports for individual applications and committee comparison use.",
      "Use exports for board presentations, committee reviews, or archival.",
    ],
    icon: Download,
    navigateTo: "/admin/programs",
    category: 'management',
  },
  {
    id: 10,
    title: "Reviewer Progress Dashboard",
    description: "Monitor reviewer completion rates across all programs.",
    details: [
      "See at a glance which reviewers have completed their assignments.",
      "Track scoring progress per program and per reviewer.",
      "Identify bottlenecks and send targeted reminders.",
    ],
    icon: BarChart3,
    navigateTo: "/admin/reviewer-progress",
    category: 'advanced',
  },
  {
    id: 11,
    title: "Waitlist Management",
    description: "Manage overflow after staff-approved allocations reach capacity.",
    details: [
      "When waitlisting is enabled and approved allocation reaches capacity, later requests are placed on the waitlist without being approved.",
      "Promote any waitlisted applicant manually when an appropriate allocation opens.",
      "Promotion sends the configured approval email and secure Participant Form link.",
      "Optional automatic next-person promotion is a separate toggle and should remain off for Military Appreciation Night.",
    ],
    icon: Clock,
    navigateTo: "/admin/programs",
    category: 'advanced',
  },
  {
    id: 12,
    title: "Archives",
    description: "Archive completed programs to keep your dashboard clean.",
    details: [
      "Archive programs after their cycle is complete.",
      "Archive snapshots retain applications, scores, reviewers, assignments, check-ins, and participant forms.",
      "Use archives to view and export past years; snapshots do not overwrite or restore the active database.",
    ],
    icon: Archive,
    navigateTo: "/admin/archives",
    category: 'advanced',
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  setup: { label: "Setup", color: "bg-blue-100 text-blue-700" },
  workflow: { label: "Core Workflow", color: "bg-green-100 text-green-700" },
  management: { label: "Management", color: "bg-purple-100 text-purple-700" },
  advanced: { label: "Advanced", color: "bg-amber-100 text-amber-700" },
};

export default function GuidedTour() {
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(window.localStorage.getItem('fmwf-tour-step') || 0);
    return Number.isInteger(saved) && saved >= 0 && saved < tourSteps.length ? saved : 0;
  });
  const [tourStarted, setTourStarted] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('fmwf-tour-started') === 'true');
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem('fmwf-tour-completed') || '[]');
      return Array.isArray(saved) ? saved.filter((value) => Number.isInteger(value) && value >= 0 && value < tourSteps.length) : [];
    } catch {
      return [];
    }
  });
  const [, navigate] = useLocation();

  useEffect(() => {
    window.localStorage.setItem('fmwf-tour-step', String(currentStep));
    window.localStorage.setItem('fmwf-tour-started', String(tourStarted));
    window.localStorage.setItem('fmwf-tour-completed', JSON.stringify(completedSteps));
  }, [currentStep, tourStarted, completedSteps]);

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (!tourStarted) {
    return (
      <AdminLayout currentPath="/admin/guided-tour">
        <div className="max-w-3xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to the Guided Tour</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              This interactive walkthrough will guide you through every feature of the FMWF Chamber Application Management System — from initial setup to event-day operations.
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    What You'll Learn
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• How to set up and configure programs</li>
                    <li>• The full application-to-approval workflow</li>
                    <li>• Managing reviewers and tracking progress</li>
                    <li>• Event-day check-in and attendance tracking</li>
                    <li>• Email templates and customization</li>
                    <li>• Exporting data and managing archives</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Tour Details
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• {tourSteps.length} interactive steps</li>
                    <li>• Approximately 10-15 minutes</li>
                    <li>• Navigate to features directly from each step</li>
                    <li>• Resume anytime — your progress is saved</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button size="lg" onClick={() => setTourStarted(true)} className="gap-2">
              <Play className="h-5 w-5" />
              Start Guided Tour
            </Button>
          </div>

          {/* Quick Jump - Step Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tour Overview</CardTitle>
              <CardDescription>Jump to any section or follow the tour in order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {tourSteps.map((s, idx) => {
                  const Icon = s.icon;
                  const cat = categoryLabels[s.category];
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setCurrentStep(idx); setTourStarted(true); }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
                          {cat.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{idx + 1}/{tourSteps.length}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const Icon = step.icon;
  const cat = categoryLabels[step.category];

  return (
    <AdminLayout currentPath="/admin/guided-tour">
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <span className="text-muted-foreground">
              {completedSteps.length} completed
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <Badge variant="secondary" className={`mt-1 ${cat.color}`}>
                    {cat.label}
                  </Badge>
                </div>
              </div>
              {completedSteps.includes(currentStep) && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
            <CardDescription className="text-base mt-3">
              {step.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {step.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {step.navigateTo && (
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleNavigate(step.navigateTo!)}
                  className="gap-2"
                >
                  <Compass className="h-4 w-4" />
                  Go to {step.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1.5">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentStep 
                    ? 'bg-primary' 
                    : completedSteps.includes(idx) 
                      ? 'bg-green-400' 
                      : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {currentStep < tourSteps.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={() => { 
                if (!completedSteps.includes(currentStep)) {
                  setCompletedSteps([...completedSteps, currentStep]);
                }
                navigate("/admin"); 
              }} 
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finish Tour
            </Button>
          )}
        </div>

        {/* Back to overview */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => setTourStarted(false)} className="text-muted-foreground">
            Back to Tour Overview
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

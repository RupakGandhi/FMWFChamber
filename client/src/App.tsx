import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DemoGuide from "./pages/DemoGuide";
import DemoLogin from "./pages/DemoLogin";
import StaffLogin from "./pages/StaffLogin";
import ChangePassword from "./pages/ChangePassword";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPrograms from "./pages/admin/Programs";
import AdminProgramEdit from "./pages/admin/ProgramEdit";
import AdminApplications from "./pages/admin/Applications";
import AdminApplicationView from "./pages/admin/ApplicationView";
import AdminReviewers from "./pages/admin/Reviewers";
import AdminExport from "./pages/admin/Export";
import AdminReviewerProgress from "./pages/admin/ReviewerProgress";
import PublicApply from "./pages/public/Apply";
import PublicConfirmation from "./pages/public/Confirmation";
import ReviewerPortal from "./pages/reviewer/Portal";
import ReviewerApplication from "./pages/reviewer/Application";
import StatusCheck from "./pages/public/StatusCheck";
// Interview scheduling removed per user request
import AdminSettings from "./pages/admin/Settings";
import AdminProgramSettings from "./pages/admin/ProgramSettings";
import AdminApplicationPdf from "./pages/admin/ApplicationPdf";
import AdminEmailTemplates from "./pages/admin/EmailTemplates";
import AdminSmtpSettings from "./pages/admin/SmtpSettings";
import AdminScoreComparison from "./pages/admin/ScoreComparison";
import AdminArchives from "./pages/admin/Archives";
import AdminApplicantFlags from "./pages/admin/ApplicantFlags";
import AdminCheckIn from "./pages/admin/CheckIn";
import AdminWaitlist from "./pages/admin/Waitlist";
import ParticipantForm from "./pages/public/ParticipantForm";
import AdminGuidedTour from "./pages/admin/GuidedTour";
import AdminHelpCenter from "./pages/admin/HelpCenter";
import AdminStaffAccounts from "./pages/admin/StaffAccounts";

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/" component={Home} />
      <Route path="/demo-guide" component={DemoGuide} />
      <Route path="/demo-login" component={DemoLogin} />
      <Route path="/staff-login" component={StaffLogin} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/apply/:slug" component={PublicApply} />
      <Route path="/confirmation/:applicationNumber" component={PublicConfirmation} />
      <Route path="/status" component={StatusCheck} />
      <Route path="/participant-form/:token" component={ParticipantForm} />
      
      {/* Reviewer portal (token-based, no login) */}
      <Route path="/review/:token" component={ReviewerPortal} />
      <Route path="/review/:token/application/:applicationId" component={ReviewerApplication} />
      <Route path="/reviewer/:token">{(params: any) => <Redirect to={`/review/${params.token}`} />}</Route>
      <Route path="/reviewer/:token/application/:applicationId">{(params: any) => <Redirect to={`/review/${params.token}/application/${params.applicationId}`} />}</Route>
      
      {/* Admin pages (requires login) */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/programs" component={AdminPrograms} />
      <Route path="/admin/programs/:id/edit">{(params: any) => <Redirect to={`/admin/programs/${params.id}`} />}</Route>
      <Route path="/admin/programs/:id" component={AdminProgramEdit} />
      <Route path="/admin/programs/:programId/applications" component={AdminApplications} />
      <Route path="/admin/programs/:programId/applications/:id" component={AdminApplicationView} />
      <Route path="/admin/programs/:programId/applications/:id/compare" component={AdminScoreComparison} />
      <Route path="/admin/reviewers" component={AdminReviewers} />
      <Route path="/admin/programs/:programId/export" component={AdminExport} />
      <Route path="/admin/export/:programId">{(params: any) => <Redirect to={`/admin/programs/${params.programId}/export`} />}</Route>
      <Route path="/admin/email-templates/:id">{(params: any) => <Redirect to={`/admin/programs/${params.id}/email-templates`} />}</Route>
      <Route path="/admin/reviewer-progress" component={AdminReviewerProgress} />

      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/staff-accounts" component={AdminStaffAccounts} />
      <Route path="/admin/programs/:id/settings" component={AdminProgramSettings} />
      <Route path="/admin/applications/:id/pdf" component={AdminApplicationPdf} />
            <Route path="/admin/programs/:id/email-templates" component={AdminEmailTemplates} />
      <Route path="/admin/smtp-settings" component={AdminSmtpSettings} />
      <Route path="/admin/archives" component={AdminArchives} />
      <Route path="/admin/flags" component={AdminApplicantFlags} />
      <Route path="/admin/programs/:programId/checkins" component={AdminCheckIn} />
      <Route path="/admin/programs/:programId/waitlist" component={AdminWaitlist} />
      <Route path="/admin/guided-tour" component={AdminGuidedTour} />
      <Route path="/admin/help" component={AdminHelpCenter} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

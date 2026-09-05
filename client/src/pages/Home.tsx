import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Users, Award, Shield, ArrowRight, Settings, Clock, Search, Menu, X, CalendarClock, CheckCircle2 } from "lucide-react";
import { useState } from "react";

// Calculate days remaining until deadline
function getDaysRemaining(deadline: Date | string | null | undefined): number | null {
  if (!deadline) return null;
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline + 'T23:59:59') : deadline;
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Deadline countdown badge component
function DeadlineCountdown({ deadline }: { deadline: string | null | undefined }) {
  const daysRemaining = getDaysRemaining(deadline);
  
  if (daysRemaining === null) return null;
  
  let bgColor = "bg-green-100 text-green-700";
  let message = `${daysRemaining} days left`;
  
  if (daysRemaining === 0) {
    bgColor = "bg-red-100 text-red-700";
    message = "Deadline today!";
  } else if (daysRemaining <= 7) {
    bgColor = "bg-amber-100 text-amber-700";
    message = `${daysRemaining} days left`;
  } else if (daysRemaining <= 14) {
    bgColor = "bg-yellow-100 text-yellow-700";
  }
  
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${bgColor}`}>
      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
      <span>{message}</span>
    </div>
  );
}

// Format deadline for display
function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const date = new Date(deadline + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Program card configuration
const programConfig: Record<string, { icon: any; borderColor: string; iconBg: string; iconHoverBg: string; iconColor: string; buttonBg: string; buttonHover: string; ctaText: string }> = {
  'leadership': { 
    icon: Users, borderColor: 'border-t-[#1e3a5f]', iconBg: 'bg-[#1e3a5f]/10', iconHoverBg: 'bg-[#1e3a5f]/20', 
    iconColor: 'text-[#1e3a5f]', buttonBg: 'bg-[#1e3a5f]', buttonHover: 'hover:bg-[#2a4a73]', ctaText: 'Apply Now' 
  },
  'awards': { 
    icon: Award, borderColor: 'border-t-[#4a90c2]', iconBg: 'bg-[#4a90c2]/10', iconHoverBg: 'bg-[#4a90c2]/20', 
    iconColor: 'text-[#4a90c2]', buttonBg: 'bg-[#4a90c2]', buttonHover: 'hover:bg-[#3a7db0]', ctaText: 'Nominate Now' 
  },
  'registration': { 
    icon: Shield, borderColor: 'border-t-green-600', iconBg: 'bg-green-100', iconHoverBg: 'bg-green-200', 
    iconColor: 'text-green-600', buttonBg: 'bg-green-600', buttonHover: 'hover:bg-green-700', ctaText: 'Register Now' 
  },
};

export default function Home() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fetch open programs dynamically (public endpoint - no auth required)
  const { data: openPrograms, isLoading: programsLoading } = trpc.programs.listOpen.useQuery();

  // Reviewer-based programs (leadership/awards) go through scoring; registration
  // programs (e.g. Military Appreciation Night) are just event sign-up, so the
  // "Fair Review"/"Expert Reviewers" copy below doesn't apply to them.
  const hasReviewedPrograms = (openPrograms || []).some(p => p.programType === 'leadership' || p.programType === 'awards');
  const hasOnlyRegistrationPrograms = (openPrograms || []).length > 0 && !hasReviewedPrograms;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header with FMWF Branding */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/fmwf-logo.png" 
              alt="FMWF Chamber of Commerce" 
              className="h-10 sm:h-12 w-auto"
            />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/status">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Search className="h-4 w-4 mr-1" />
                Check Status
              </Button>
            </Link>
            {authLoading ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link href="/admin">
                    <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2a4a73]">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-muted-foreground hidden lg:inline">
                  Welcome, {user?.name || 'User'}
                </span>
              </>
            ) : (
              <Link href="/staff-login">
                <Button variant="outline" size="sm" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                  Admin Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
            <Link href="/status" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Search className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a73]">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
            )}
            {!isAuthenticated && (
              <Link href="/staff-login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-[#1e3a5f] text-[#1e3a5f]">
                  Admin Login
                </Button>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Hero Section with FMWF Branding */}
      <section className="py-10 sm:py-16 md:py-20 bg-gradient-to-br from-[#1e3a5f] to-[#2a4a73] text-white px-4">
        <div className="container text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6">
            Chamber Programs & Applications
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-4">
            Apply for leadership programs, nominate businesses for awards, and register for special events with the Fargo Moorhead West Fargo Chamber of Commerce.
          </p>
          <div className="flex items-center justify-center gap-2 text-white/60 text-xs sm:text-sm">
            <span>Connecting Business. Building Community.</span>
          </div>
        </div>
      </section>

      {/* Program Cards */}
      <section className="py-10 sm:py-16 -mt-4 sm:-mt-8 px-4">
        <div className="container">
          {programsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="h-12 bg-muted rounded" />
                    <div className="h-6 bg-muted rounded w-3/4 mt-3" />
                    <div className="h-4 bg-muted rounded w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (openPrograms || []).length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CalendarClock className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">No programs are currently open</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                There are no applications or registrations open at this time. Please check back soon, or use Check Status above if you've already submitted an application.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(openPrograms || []).map((program) => {
                const config = programConfig[program.programType] || programConfig['registration'];
                const IconComponent = config.icon;
                const deadlineFormatted = formatDeadline(program.applicationDeadline);
                
                return (
                  <Card 
                    key={program.id} 
                    className={`group hover:shadow-xl transition-all duration-300 border-t-4 ${config.borderColor} bg-white ${
                      (openPrograms || []).length === 1 ? '' : 
                      (openPrograms || []).length === 2 ? '' : 
                      program.programType === 'registration' ? 'sm:col-span-2 lg:col-span-1' : ''
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${config.iconBg} flex items-center justify-center group-hover:${config.iconHoverBg} transition-colors shrink-0`}>
                          <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${config.iconColor}`} />
                        </div>
                        <DeadlineCountdown deadline={program.applicationDeadline} />
                      </div>
                      <CardTitle className="text-[#1e3a5f] text-lg sm:text-xl">{program.name}</CardTitle>
                      <CardDescription className="text-sm sm:text-base">
                        {program.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {deadlineFormatted && (
                        <div className="text-xs text-muted-foreground mb-3">
                          <strong>Deadline:</strong> {deadlineFormatted}
                        </div>
                      )}
                      <Link href={`/apply/${program.slug}`}>
                        <Button className={`w-full ${config.buttonBg} ${config.buttonHover} group-hover:shadow-md transition-all`}>
                          {config.ctaText}
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-16 bg-slate-50 px-4">
        <div className="container">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-3 sm:mb-4 text-[#1e3a5f]">Why Use Our System?</h3>
          <p className="text-center text-sm sm:text-base text-muted-foreground mb-8 sm:mb-12 max-w-2xl mx-auto">
            Our application management system streamlines the entire process from submission to selection.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="h-5 w-5 sm:h-7 sm:w-7 text-[#1e3a5f]" />
              </div>
              <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Easy Applications</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">No account required. Submit in minutes.</p>
            </div>
            {hasOnlyRegistrationPrograms ? (
              <>
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#4a90c2]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-[#4a90c2]" />
                  </div>
                  <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Simple Registration</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Register in just a few minutes.</p>
                </div>
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 text-[#1e3a5f]" />
                  </div>
                  <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Instant Confirmation</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Get a confirmation number right away.</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#4a90c2]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-[#4a90c2]" />
                  </div>
                  <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Fair Review</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Blind review ensures fair evaluation.</p>
                </div>
                <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Users className="h-5 w-5 sm:h-7 sm:w-7 text-[#1e3a5f]" />
                  </div>
                  <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Expert Reviewers</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Multiple leaders review each app.</p>
                </div>
              </>
            )}
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#4a90c2]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Award className="h-5 w-5 sm:h-7 sm:w-7 text-[#4a90c2]" />
              </div>
              <h4 className="font-semibold mb-1 sm:mb-2 text-[#1e3a5f] text-sm sm:text-base">Track Status</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">Receive updates as you progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with FMWF Branding */}
      <footer className="py-8 sm:py-10 bg-[#1e3a5f] text-white px-4">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <img 
                src="/fmwf-logo.png" 
                alt="FMWF Chamber of Commerce" 
                className="h-8 sm:h-10 w-auto brightness-0 invert"
              />
            </div>
            <div className="text-center sm:text-right text-xs sm:text-sm text-white/70">
              <p>© {new Date().getFullYear()} FMWF Chamber of Commerce. All rights reserved.</p>
              <p className="mt-1">Application Management System by OptimizED Strategic Solutions</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

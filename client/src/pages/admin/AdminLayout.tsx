import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, ClipboardList, Users, LogOut, 
  Menu, X, Home, ChevronRight, BarChart3, Settings, Archive, Flag,
  Mail, Wrench, HelpCircle, Compass, UserRoundCog
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  tier: string | null;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin", tier: null },
      { icon: ClipboardList, label: "Programs", path: "/admin/programs", tier: null },
    ]
  },
  {
    title: "Management",
    items: [
      { icon: Users, label: "Reviewers", path: "/admin/reviewers", tier: null },
      { icon: BarChart3, label: "Reviewer Progress", path: "/admin/reviewer-progress", tier: "pro" },
      { icon: Flag, label: "Applicant Flags", path: "/admin/flags", tier: "enterprise" },
      { icon: Archive, label: "Archives", path: "/admin/archives", tier: "pro" },
    ]
  },
  {
    title: "System",
    items: [
      { icon: Mail, label: "Email Configuration", path: "/admin/smtp-settings", tier: null },
      { icon: UserRoundCog, label: "Staff Accounts", path: "/admin/staff-accounts", tier: null },
      { icon: Wrench, label: "System Settings", path: "/admin/settings", tier: null },
    ]
  },
  {
    title: "Help & Guidance",
    items: [
      { icon: Compass, label: "Guided Tour", path: "/admin/guided-tour", tier: null },
      { icon: HelpCircle, label: "Help Center", path: "/admin/help", tier: null },
    ]
  },
];

const tierBadge = (tier: string | null) => {
  if (!tier) return null;
  const styles = tier === 'pro' 
    ? 'bg-blue-100 text-blue-700 border-blue-200' 
    : 'bg-purple-100 text-purple-700 border-purple-200';
  const label = tier === 'pro' ? 'PRO' : 'ENT';
  return <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${styles}`}>{label}</span>;
};

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export default function AdminLayout({ children, currentPath }: AdminLayoutProps) {
  const { loading, user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activePath = currentPath || location;

  useEffect(() => {
    if (!loading && user?.mustChangePassword) window.location.href = "/change-password";
  }, [loading, user?.mustChangePassword]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Admin Access Required
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Please sign in to access the admin dashboard.
            </p>
          </div>
          <Link href="/staff-login" className="w-full">
            <Button size="lg" className="w-full">Staff Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (user.mustChangePassword) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Access Denied
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You don't have permission to access the admin dashboard.
            </p>
          </div>
          <Link href="/">
            <Button size="lg">
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold">FMWF Chamber Admin</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-3 p-4 border-b">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <h1 className="font-bold">FMWF Chamber</h1>
                <p className="text-xs text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>

            {/* Navigation with Sections */}
            <nav className="flex-1 p-4 space-y-5 mt-14 lg:mt-0 overflow-y-auto">
              {menuSections.map((section, sectionIdx) => (
                <div key={section.title}>
                  {/* Section Header */}
                  <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(item => {
                      const isActive = activePath === item.path || 
                        (item.path !== '/admin' && activePath.startsWith(item.path));
                      return (
                        <Link key={item.path} href={item.path}>
                          <button
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                            `}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.label}
                            {isActive ? <ChevronRight className="h-4 w-4 ml-auto" /> : tierBadge(item.tier)}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                  {/* Divider between sections */}
                  {sectionIdx < menuSections.length - 1 && (
                    <div className="mt-4 border-b border-border/50" />
                  )}
                </div>
              ))}

              {/* Help text at bottom of nav */}
              <div className="px-3 pt-2">
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Program-specific settings (capacity, deadlines, templates) are inside each program.
                </p>
              </div>
            </nav>

            {/* User Menu */}
            <div className="hidden lg:block p-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

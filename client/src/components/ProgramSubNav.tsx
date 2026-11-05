import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ListOrdered, ClipboardCheck, Users, Download, FileEdit, Trophy } from "lucide-react";

interface ProgramSubNavProps {
  programId: number;
  programType?: string;
  activeTab: 'form-builder' | 'applications' | 'checkins' | 'waitlist' | 'top-nominees' | 'export';
}

export default function ProgramSubNav({ programId, programType, activeTab }: ProgramSubNavProps) {
  const pid = programId;

  const tabs = [
    { id: 'form-builder', label: 'Form Builder', icon: FileEdit, href: `/admin/programs/${pid}` },
    { id: 'applications', label: 'Applications', icon: ListOrdered, href: `/admin/programs/${pid}/applications` },
    ...(programType === 'registration' ? [
      { id: 'checkins', label: 'Check-In', icon: ClipboardCheck, href: `/admin/programs/${pid}/checkins` },
      { id: 'waitlist', label: 'Waitlist', icon: Users, href: `/admin/programs/${pid}/waitlist` },
    ] : []),
    ...(programType === 'awards' ? [
      { id: 'top-nominees', label: 'Top Nominees', icon: Trophy, href: `/admin/programs/${pid}/top-nominees` },
    ] : []),
    { id: 'export', label: 'Export', icon: Download, href: `/admin/programs/${pid}/export` },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b pb-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <Link key={tab.id} href={tab.href}>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 ${
                isActive
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {tab.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

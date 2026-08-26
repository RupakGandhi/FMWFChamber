import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Settings2, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ProgramLevelNavProps {
  programId: number;
  activeTab: 'settings' | 'email-templates';
}

export default function ProgramLevelNav({ programId, activeTab }: ProgramLevelNavProps) {
  const pid = programId;
  const { data: program } = trpc.programs.getById.useQuery({ id: pid });

  const tabs = [
    { id: 'settings', label: 'Settings', icon: Settings2, href: `/admin/programs/${pid}/settings` },
    { id: 'email-templates', label: 'Email Templates', icon: Mail, href: `/admin/programs/${pid}/email-templates` },
  ];

  const handleCopyLink = () => {
    const slug = program?.slug || String(pid);
    const link = `${window.location.origin}/apply/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Application link copied to clipboard!");
  };

  return (
    <div className="flex items-center justify-between border-b pb-0">
      <div className="flex flex-wrap gap-1">
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="mb-1"
      >
        <Link2 className="h-4 w-4 mr-1.5" />
        Copy Link
      </Button>
    </div>
  );
}

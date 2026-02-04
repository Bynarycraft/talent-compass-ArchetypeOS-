import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasRoleAccess } from '@/hooks/useRoleGuard';
import { cn } from '@/lib/utils';
import {
  Hexagon,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Clock,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  BarChart3,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: 'candidate' | 'learner' | 'supervisor' | 'admin';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredRole: 'learner' },
  { label: 'My Courses', href: '/courses', icon: BookOpen, requiredRole: 'learner' },
  { label: 'Roadmaps', href: '/roadmaps', icon: Map, requiredRole: 'learner' },
  { label: 'Tests', href: '/tests', icon: ClipboardCheck, requiredRole: 'learner' },
  { label: 'Learning Tracker', href: '/tracker', icon: Clock, requiredRole: 'learner' },
];

const supervisorItems: NavItem[] = [
  { label: 'My Learners', href: '/supervisor/learners', icon: Users, requiredRole: 'supervisor' },
  { label: 'Grading', href: '/supervisor/grading', icon: GraduationCap, requiredRole: 'supervisor' },
];

const adminItems: NavItem[] = [
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, requiredRole: 'admin' },
  { label: 'Manage Users', href: '/admin/users', icon: Users, requiredRole: 'admin' },
  { label: 'Manage Courses', href: '/admin/courses', icon: BookOpen, requiredRole: 'admin' },
  { label: 'Manage Tests', href: '/admin/tests', icon: ClipboardCheck, requiredRole: 'admin' },
];

export function Sidebar() {
  const location = useLocation();
  const { role, profile, signOut } = useAuth();

  const renderNavItems = (items: NavItem[]) => {
    return items
      .filter((item) => !item.requiredRole || hasRoleAccess(role, item.requiredRole))
      .map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      });
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <Hexagon className="h-8 w-8 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-foreground">ArchetypeOS</span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {renderNavItems(navItems)}
        </nav>

        {hasRoleAccess(role, 'supervisor') && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Supervisor
              </span>
            </div>
            <nav className="space-y-1">
              {renderNavItems(supervisorItems)}
            </nav>
          </>
        )}

        {hasRoleAccess(role, 'admin') && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Admin
              </span>
            </div>
            <nav className="space-y-1">
              {renderNavItems(adminItems)}
            </nav>
          </>
        )}
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">
              {role || 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent"
            asChild
          >
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

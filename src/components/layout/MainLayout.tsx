import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { AppRole } from '@/lib/types';
import { Hexagon } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function MainLayout({ children, requiredRole }: MainLayoutProps) {
  const { loading } = useRoleGuard(requiredRole);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft">
          <Hexagon className="h-12 w-12 text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-6 px-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

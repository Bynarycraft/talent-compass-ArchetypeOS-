import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { Hexagon } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (!loading && user && role) {
      // Redirect based on role
      if (role === 'candidate') {
        navigate('/candidate', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-2">
          <Hexagon className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">ArchetypeOS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Learning & Talent Intelligence
            </h1>
            <p className="text-muted-foreground">
              Discover your archetype, build skills, track progress
            </p>
          </div>

          <AuthForm mode={mode} onModeChange={setMode} />

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ArchetypeOS. All rights reserved.
      </footer>
    </div>
  );
}

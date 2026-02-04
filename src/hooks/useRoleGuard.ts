import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/lib/types';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 4,
  supervisor: 3,
  learner: 2,
  candidate: 1,
};

export function useRoleGuard(requiredRole?: AppRole, redirectTo: string = '/auth') {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check role if required
    if (requiredRole && role) {
      const userLevel = ROLE_HIERARCHY[role];
      const requiredLevel = ROLE_HIERARCHY[requiredRole];

      if (userLevel < requiredLevel) {
        // Redirect based on current role
        if (role === 'candidate') {
          navigate('/candidate', { replace: true });
        } else if (role === 'learner') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, role, loading, requiredRole, navigate, redirectTo]);

  return { user, role, loading };
}

export function hasRoleAccess(userRole: AppRole | null, requiredRole: AppRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

import { redirect } from 'next/navigation';

export const requireAuth = (isAuthenticated: boolean) => {
  if (!isAuthenticated) {
    redirect('/login');
  }
};

export const requireAdmin = (userRole: string | undefined) => {
  if (userRole !== 'ADMIN') {
    redirect('/dashboard');
  }
};


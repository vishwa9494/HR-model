'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfilesAction } from '@/app/actions';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Employee';
  job_title: string;
  department_id: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
  signIn: (email: string) => Promise<boolean>;
  signOut: () => void;
  switchRole: (role: 'Admin' | 'Manager' | 'Employee') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'authenticated' | 'unauthenticated' | 'loading'>('loading');

  useEffect(() => {
    // Load existing session from localStorage if present
    const saved = localStorage.getItem('hr_portal_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        setStatus('authenticated');
      } catch {
        setStatus('unauthenticated');
      }
    } else {
      // Default to Admin for first-time visits to make exploring the prototype easy
      signIn('admin@company.com');
    }
  }, []);

  const signIn = async (email: string): Promise<boolean> => {
    setStatus('loading');
    try {
      const profiles = await getProfilesAction();
      const profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      
      if (profile) {
        const authUser: AuthUser = {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: profile.role,
          job_title: profile.job_title,
          department_id: profile.department_id,
        };
        setUser(authUser);
        setStatus('authenticated');
        localStorage.setItem('hr_portal_session', JSON.stringify(authUser));
        return true;
      }
      setStatus('unauthenticated');
      return false;
    } catch (e) {
      console.error("Sign in failed:", e);
      setStatus('unauthenticated');
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    setStatus('unauthenticated');
    localStorage.removeItem('hr_portal_session');
  };

  const switchRole = async (role: 'Admin' | 'Manager' | 'Employee') => {
    const emailMap = {
      Admin: 'admin@company.com',
      Manager: 'manager@company.com',
      Employee: 'employee@company.com',
    };
    await signIn(emailMap[role]);
  };

  return (
    <AuthContext.Provider value={{ user, status, signIn, signOut, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Mock NextAuth-compatible hook alias for easy migration
export function useSession() {
  const { user, status } = useAuth();
  return {
    data: user ? { user } : null,
    status,
  };
}

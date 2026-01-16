import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type RoleCategory = 'employee' | 'management' | 'field_tech' | 'admin' | 'sales_rep' | 'sales_manager';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  role_category: RoleCategory;
  photo_url?: string;
  first_login?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  isEmployee: boolean;
  isSalesRep: boolean;
  isSalesManager: boolean;
  canEdit: boolean;
  requiresPasswordReset: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setMockUser: (roleCategory: RoleCategory) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          try {
            await loadUserData(session.user);
          } catch (error) {
            console.error('Error loading user during auth state change:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (authUser: SupabaseUser) => {
    try {
      const { data: appUser, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, role_category, photo_url, first_login')
        .eq('email', authUser.email)
        .maybeSingle();

      if (error) {
        console.error('Error querying app_users:', error);
        setUser(null);
        throw error;
      }

      if (appUser) {
        setUser({
          id: appUser.id,
          email: appUser.email,
          name: appUser.full_name,
          role: appUser.role,
          role_category: appUser.role_category as RoleCategory,
          photo_url: appUser.photo_url,
          first_login: appUser.first_login || false,
        });
      } else {
        console.warn('No app_users record found for:', authUser.email);
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserData(session.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        throw new Error(error.message || 'Failed to sign in');
      }

      if (data.user) {
        await loadUserData(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();

      await supabase.auth.signOut({ scope: 'local' });

      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const setMockUser = (roleCategory: RoleCategory) => {
    const emailMap: Record<RoleCategory, string> = {
      admin: 'isaias@solveraenergy.com',
      management: 'management@solvera.com',
      employee: 'employee@solvera.com',
      field_tech: 'FIELDTECH@GMAIL.COM',
      sales_rep: 'sales@solvera.com',
      sales_manager: 'salesmanager@solvera.com',
    };

    const mockUser: User = {
      id: `demo-user-${roleCategory}`,
      email: emailMap[roleCategory],
      name: `${roleCategory.charAt(0).toUpperCase() + roleCategory.slice(1)} User`,
      role: roleCategory,
      role_category: roleCategory,
    };
    setUser(mockUser);
  };

  const isAdmin = user?.role_category === 'admin';
  const isManagement = user?.role_category === 'management';
  const isEmployee = user?.role_category === 'employee';
  const isSalesRep = user?.role_category === 'sales_rep';
  const isSalesManager = user?.role === 'sales_manager';
  const canEdit = !isEmployee && !isSalesRep;
  const requiresPasswordReset = user?.first_login === true;

  const value = {
    user,
    loading,
    isAdmin,
    isManagement,
    isEmployee,
    isSalesRep,
    isSalesManager,
    canEdit,
    requiresPasswordReset,
    login,
    logout,
    setMockUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

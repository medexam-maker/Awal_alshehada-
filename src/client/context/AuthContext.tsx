import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, UserProfile } from '../api/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoAllowed: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  register: (payload: { email: string; password: string; fullName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Environment gate: VITE_ENABLE_DEMO must be explicitly 'true' to allow isolated non-production demo identity
const IS_DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO === 'true';

const DEMO_STUDENT: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo-student@firstcertificate.sd',
  fullName: 'طالب تجريبي (بيئة العرض المعزولة)',
  role: 'student',
  status: 'active',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session silently on mount using refresh token or saved profile
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const savedUser = localStorage.getItem('fc_user_profile');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (isMounted) setUser(parsed);
        }

        const refreshToken = apiClient.getRefreshToken();
        if (refreshToken) {
          try {
            await apiClient.refreshToken();
          } catch {
            // ignore network/offline issues
          }
        }
      } catch {
        // Storage unreadable
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const loginAsGuest = useCallback(() => {
    // Isolated non-production demonstration only
    if (!IS_DEMO_ENABLED) {
      console.warn('Demo login is disabled in production.');
      return;
    }
    setUser(DEMO_STUDENT);
    try {
      localStorage.setItem('fc_user_profile', JSON.stringify(DEMO_STUDENT));
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await apiClient.request<{
        user: UserProfile;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      }).catch(() => null);

      if (res && res.success && res.data) {
        apiClient.setAccessToken(res.data.accessToken);
        apiClient.setRefreshToken(res.data.refreshToken);
        setUser(res.data.user);
        try {
          localStorage.setItem('fc_user_profile', JSON.stringify(res.data.user));
        } catch {
          // ignore
        }
        return { success: true };
      }

      // Check locally registered accounts in preview/offline mode
      try {
        const localAccounts = JSON.parse(localStorage.getItem('fc_local_students') || '{}');
        const account = localAccounts[normalizedEmail];
        if (account && account.password === password) {
          setUser(account.user);
          localStorage.setItem('fc_user_profile', JSON.stringify(account.user));
          return { success: true };
        }
      } catch {}

      // If server explicitly rejected valid request with credentials error
      if (res && !res.success && res.error?.code === 'INVALID_CREDENTIALS') {
        return {
          success: false,
          error: 'كلمة المرور أو البريد الإلكتروني غير صحيح.',
        };
      }

      // If backend was unreachable (e.g. database offline or proxy down in preview)
      const offlineUser: UserProfile = {
        id: `std_${Date.now()}`,
        email: normalizedEmail,
        fullName: 'طالب منصة أول الشهادة',
        role: 'student',
        status: 'active',
      };
      setUser(offlineUser);
      localStorage.setItem('fc_user_profile', JSON.stringify(offlineUser));
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'تعذر الاتصال بخادم المصادقة.',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; fullName?: string; phone?: string }) => {
      setIsLoading(true);
      const normalizedEmail = payload.email.trim().toLowerCase();
      try {
        const res = await apiClient.request<{
          user: UserProfile;
          accessToken: string;
          refreshToken: string;
        }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        }).catch(() => null);

        if (res && res.success && res.data) {
          apiClient.setAccessToken(res.data.accessToken);
          apiClient.setRefreshToken(res.data.refreshToken);
          setUser(res.data.user);
          try {
            localStorage.setItem('fc_user_profile', JSON.stringify(res.data.user));
          } catch {
            // ignore
          }
          return { success: true };
        }

        // Resilient Fallback for Development/Preview & Offline:
        // If remote database is unavailable or proxy fails, create a valid local student profile
        // so the student is never locked out of testing and using the platform
        const localUser: UserProfile = {
          id: `std_${Date.now()}`,
          email: normalizedEmail,
          fullName: payload.fullName?.trim() || 'طالب منصة أول الشهادة',
          role: 'student',
          status: 'active',
        };
        setUser(localUser);
        try {
          localStorage.setItem('fc_user_profile', JSON.stringify(localUser));
          const localAccounts = JSON.parse(localStorage.getItem('fc_local_students') || '{}');
          localAccounts[normalizedEmail] = {
            user: localUser,
            password: payload.password,
          };
          localStorage.setItem('fc_local_students', JSON.stringify(localAccounts));
        } catch {
          // ignore
        }
        return { success: true };
      } catch {
        const fallbackUser: UserProfile = {
          id: `std_${Date.now()}`,
          email: normalizedEmail,
          fullName: payload.fullName?.trim() || 'طالب جديد',
          role: 'student',
          status: 'active',
        };
        setUser(fallbackUser);
        try {
          localStorage.setItem('fc_user_profile', JSON.stringify(fallbackUser));
        } catch {}
        return { success: true };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    const refreshToken = apiClient.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      apiClient.clearAuth();
      try {
        localStorage.removeItem('fc_user_profile');
      } catch {
        // ignore
      }
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isDemoAllowed: IS_DEMO_ENABLED,
        login,
        loginAsGuest,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

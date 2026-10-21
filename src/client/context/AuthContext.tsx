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
    try {
      const res = await apiClient.request<{
        user: UserProfile;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
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

      // Strictly return server error without fabricating fake production identity
      return {
        success: false,
        error: res.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من البريد وكلمة المرور.',
      };
    } catch {
      return {
        success: false,
        error: 'تعذر الاتصال بخادم المصادقة. يرجى التحقق من اتصالك بالإنترنت.',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; fullName?: string; phone?: string }) => {
      setIsLoading(true);
      try {
        const res = await apiClient.request<{
          user: UserProfile;
          accessToken: string;
          refreshToken: string;
        }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.success && res.data) {
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

        return {
          success: false,
          error: res.error?.message || 'فشل إنشاء الحساب.',
        };
      } catch {
        return {
          success: false,
          error: 'تعذر الاتصال بخادم المصادقة لإنشاء الحساب.',
        };
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

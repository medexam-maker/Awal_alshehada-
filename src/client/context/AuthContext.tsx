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
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; devCode?: string; emailConfigured?: boolean; error?: string }>;
  resetPassword: (payload: { email: string; resetCode: string; newPassword: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
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

  // Restore session strictly through server validation (PD-003)
  // NEVER trust localStorage or local files as proof of authentication
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const refreshToken = apiClient.getRefreshToken();
        if (!refreshToken) {
          apiClient.clearAuth();
          if (isMounted) setUser(null);
          return;
        }

        const verifiedUser = await apiClient.validateSession();
        if (isMounted) {
          if (verifiedUser) {
            setUser(verifiedUser);
            try {
              localStorage.setItem('fc_user_profile', JSON.stringify(verifiedUser));
            } catch {
              // ignore
            }
          } else {
            apiClient.clearAuth();
            setUser(null);
          }
        }
      } catch {
        apiClient.clearAuth();
        if (isMounted) setUser(null);
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
      });

      if (res && res.success && res.data) {
        apiClient.setAccessToken(res.data.accessToken);
        apiClient.setRefreshToken(res.data.refreshToken);
        apiClient.setVerifiedUser(res.data.user);
        setUser(res.data.user);
        try {
          localStorage.setItem('fc_user_profile', JSON.stringify(res.data.user));
        } catch {
          // ignore
        }
        return { success: true };
      }

      // Authoritative failure: never create mock/offline accounts on server errors
      return {
        success: false,
        error: res?.error?.message || 'كلمة المرور أو البريد الإلكتروني غير صحيح.',
      };
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
          body: JSON.stringify({
            ...payload,
            email: normalizedEmail,
          }),
        });

        if (res && res.success && res.data) {
          apiClient.setAccessToken(res.data.accessToken);
          apiClient.setRefreshToken(res.data.refreshToken);
          apiClient.setVerifiedUser(res.data.user);
          setUser(res.data.user);
          try {
            localStorage.setItem('fc_user_profile', JSON.stringify(res.data.user));
          } catch {
            // ignore
          }
          return { success: true };
        }

        // Authoritative failure: never create mock/offline accounts on server errors
        return {
          success: false,
          error: res?.error?.message || 'فشل إنشاء الحساب.',
        };
      } catch {
        return {
          success: false,
          error: 'تعذر الاتصال بخادم المصادقة.',
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
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      const res = await apiClient.request<{
        devCode?: string;
        emailConfigured: boolean;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res && res.success) {
        return {
          success: true,
          message: res.message || 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم تجهيز رمز استعادة كلمة المرور.',
          devCode: res.data?.devCode,
          emailConfigured: res.data?.emailConfigured,
        };
      }
      return {
        success: false,
        error: res?.error?.message || 'فشل إرسال طلب استعادة كلمة المرور.',
      };
    } catch {
      return {
        success: false,
        error: 'تعذر الاتصال بالخادم.',
      };
    }
  }, []);

  const resetPassword = useCallback(
    async (payload: { email: string; resetCode: string; newPassword: string }) => {
      try {
        const res = await apiClient.request<{ reset: boolean }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: payload.email.trim().toLowerCase(),
            resetCode: payload.resetCode.trim(),
            newPassword: payload.newPassword,
          }),
        });

        if (res && res.success) {
          return {
            success: true,
            message: res.message || 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
          };
        }
        return {
          success: false,
          error: res?.error?.message || 'فشل إعادة تعيين كلمة المرور.',
        };
      } catch {
        return {
          success: false,
          error: 'تعذر الاتصال بالخادم.',
        };
      }
    },
    []
  );

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
        forgotPassword,
        resetPassword,
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

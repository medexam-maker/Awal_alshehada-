/**
 * API Client for First Certificate (أول الشهادة)
 * - Manages in-memory access token and persistent refresh token in localStorage.
 * - Handles auto-refresh on 401 for normal operations.
 * - Adheres strictly to C4 error envelopes and PD-002 Zero-Request Invariant.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private lastVerifiedUser: UserProfile | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Access token is strictly in-memory.
    // Refresh token is in localStorage for persistence.
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    try {
      return localStorage.getItem('fc_refresh_token');
    } catch {
      return null;
    }
  }

  public setRefreshToken(token: string | null) {
    try {
      if (token) {
        localStorage.setItem('fc_refresh_token', token);
      } else {
        localStorage.removeItem('fc_refresh_token');
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  public clearAuth() {
    this.accessToken = null;
    this.lastVerifiedUser = null;
    this.setRefreshToken(null);
    try {
      localStorage.removeItem('fc_user_profile');
    } catch {
      // ignore
    }
  }

  public getVerifiedUser(): UserProfile | null {
    return this.lastVerifiedUser;
  }

  public setVerifiedUser(user: UserProfile | null) {
    this.lastVerifiedUser = user;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Concurrent 401s reuse the same ongoing refresh promise.
   */
  public async refreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentRefreshToken = this.getRefreshToken();
    if (!currentRefreshToken) {
      this.clearAuth();
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        const json: ApiResponse<{ accessToken: string; refreshToken: string; user?: UserProfile }> = await response.json();

        if (response.ok && json.success && json.data) {
          this.setAccessToken(json.data.accessToken);
          this.setRefreshToken(json.data.refreshToken);
          if (json.data.user) {
            this.lastVerifiedUser = json.data.user;
          }
          return json.data.accessToken;
        } else if (response.status === 401) {
          this.clearAuth();
          return null;
        } else {
          return null;
        }
      } catch {
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Authoritatively restores and validates the active session with the backend server.
   * Never relies on localStorage alone as proof of authentication.
   */
  public async validateSession(): Promise<UserProfile | null> {
    const token = await this.refreshToken();
    if (!token) {
      this.clearAuth();
      return null;
    }

    if (this.lastVerifiedUser) {
      return this.lastVerifiedUser;
    }

    const meRes = await this.request<{ user: UserProfile }>('/api/auth/me');
    if (meRes.success && meRes.data?.user) {
      this.lastVerifiedUser = meRes.data.user;
      return meRes.data.user;
    }

    this.clearAuth();
    return null;
  }

  /**
   * Generic fetch wrapper with automatic token inclusion and auto-refresh on 401.
   * Set skipAuthRefresh=true during exam submission when explicit retry rules apply (PD-002).
   */
  public async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    skipAuthRefresh = false
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (networkError) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Auto-refresh once on 401 if access token expired and not skipped
    if (response.status === 401 && !skipAuthRefresh) {
      const newAccessToken = await this.refreshToken();
      if (newAccessToken) {
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        try {
          response = await fetch(endpoint, {
            ...options,
            headers,
          });
        } catch {
          return {
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: 'فشل الاتصال بالخادم بعد تحديث الجلسة.',
            },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    try {
      const json: ApiResponse<T> = await response.json();
      return json;
    } catch {
      return {
        success: response.ok,
        error: response.ok
          ? undefined
          : {
              code: `HTTP_${response.status}`,
              message: 'استجابة غير متوقعة من الخادم.',
            },
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const apiClient = new ApiClient();

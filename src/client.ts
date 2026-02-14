export interface User {
  id: string;
  email: string;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
  confirmationSentAt: number | null;
  emailConfirmedAt: number | null;
  lastSignInAt: number | null;
  role: string | null;
  newEmail: string | null;
  emailChangeSentAt: number | null;
  recoverySentAt: number | null;
}

export interface Session {
  id: string;
  token: string;
  createdAt: number;
  lastVerifiedAt: number;
  user: User;
}

export interface SessionResponse {
  session: Session | null;
}

export interface SignUpResponse {
  user: User;
  confirmationToken: string;
}

export interface UserResponse {
  user: User;
}

export interface PasswordResetResponse {
  success: boolean;
  recoveryToken?: string;
}

export interface EmailChangeResponse {
  emailChangeToken: string;
}

export interface ConfirmationResponse {
  confirmationToken: string;
}

export type AuthStateChangeCallback = (
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED',
  session: Session | null,
  user: User | null,
) => void;

export interface AuthClientOptions {
  baseUrl?: string;
}

const TOKEN_STORAGE_KEY = 'auth_session_token';

export class AuthClient {
  private readonly baseUrl: string;
  private readonly listeners: Set<AuthStateChangeCallback> = new Set();
  private currentSession: Session | null = null;

  constructor(options: AuthClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
  }

  private getStoredToken(): string | null {
    if (globalThis.window === undefined) return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private setStoredToken(token: string | null): void {
    if (globalThis.window === undefined) return;
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private notifyListeners(
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED',
    session: Session | null,
  ): void {
    this.currentSession = session;
    this.listeners.forEach((callback) =>
      callback(event, session, session?.user ?? null),
    );
  }

  async getSession(): Promise<SessionResponse> {
    const token = this.getStoredToken();

    if (!token) return { session: null };

    const response = await fetch(`${this.baseUrl}/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      this.setStoredToken(null);
      return { session: null };
    }

    const data: SessionResponse = (await response.json()) as SessionResponse;

    if (!data.session) this.setStoredToken(null);

    this.currentSession = data.session;
    return data;
  }

  async validateSession(token: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/auth/session/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return { session: null };

    const data: SessionResponse = (await response.json()) as SessionResponse;
    return data;
  }

  async signOut(): Promise<void> {
    const token = this.getStoredToken();

    if (token) {
      try {
        await fetch(`${this.baseUrl}/auth/session`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore errors on sign out
      }
    }

    this.setStoredToken(null);
    this.notifyListeners('SIGNED_OUT', null);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): {
    unsubscribe: () => void;
  } {
    this.listeners.add(callback);

    return {
      unsubscribe: () => {
        this.listeners.delete(callback);
      },
    };
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  getToken(): string | null {
    return this.getStoredToken();
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<SignUpResponse | null> {
    const response = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) return null;

    return (await response.json()) as SignUpResponse;
  }

  async login(email: string, password: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) return { session: null };

    const data = (await response.json()) as SessionResponse;

    if (data.session) {
      this.setStoredToken(data.session.token);
      this.notifyListeners('SIGNED_IN', data.session);
    }

    return data;
  }

  async confirmEmail(email: string, token: string): Promise<UserResponse | null> {
    const encodedEmail = encodeURIComponent(email);
    const response = await fetch(
      `${this.baseUrl}/auth/confirm-email/${encodedEmail}/${token}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) return null;

    return (await response.json()) as UserResponse;
  }

  async resendConfirmation(
    email: string,
  ): Promise<ConfirmationResponse | null> {
    const response = await fetch(`${this.baseUrl}/auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) return null;

    return (await response.json()) as ConfirmationResponse;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    const response = await fetch(
      `${this.baseUrl}/auth/request-password-reset`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
    );

    if (!response.ok) return { success: false };

    return (await response.json()) as PasswordResetResponse;
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<UserResponse | null> {
    const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) return null;

    return (await response.json()) as UserResponse;
  }

  async requestEmailChange(
    newEmail: string,
  ): Promise<EmailChangeResponse | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    const response = await fetch(`${this.baseUrl}/auth/request-email-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newEmail }),
    });

    if (!response.ok) return null;

    return (await response.json()) as EmailChangeResponse;
  }

  async confirmEmailChange(token: string): Promise<UserResponse | null> {
    const response = await fetch(`${this.baseUrl}/auth/confirm-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return null;

    return (await response.json()) as UserResponse;
  }
}

let defaultClient: AuthClient | null = null;

export function createAuthClient(options: AuthClientOptions = {}): AuthClient {
  return new AuthClient(options);
}

export function getAuthClient(options: AuthClientOptions = {}): AuthClient {
  defaultClient ??= new AuthClient(options);

  return defaultClient;
}

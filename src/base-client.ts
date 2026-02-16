import type {
  AuthClientOptions,
  AuthStateChangeCallback,
  AuthStorage,
  ConfirmationResponse,
  EmailChangeResponse,
  PasswordResetResponse,
  Session,
  SessionResponse,
  SignUpResponse,
  UserResponse,
} from './types';

export abstract class BaseAuthClient {
  protected readonly baseUrl: string;
  protected readonly listeners: Set<AuthStateChangeCallback> = new Set();
  protected currentSession: Session | null = null;
  protected abstract storage: AuthStorage;

  constructor(options: AuthClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
  }

  protected abstract getStoredToken(): string | null | Promise<string | null>;
  protected abstract setStoredToken(token: string | null): void | Promise<void>;

  protected notifyListeners(
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED',
    session: Session | null,
  ): void {
    this.currentSession = session;
    this.listeners.forEach((callback) => {
      callback(event, session, session?.user ?? null);
    });
  }

  async getSession(): Promise<SessionResponse> {
    const token = await this.getStoredToken();

    if (!token) return { session: null };

    const response = await fetch(`${this.baseUrl}/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await this.setStoredToken(null);
      return { session: null };
    }

    const data: SessionResponse = (await response.json()) as SessionResponse;

    if (!data.session) await this.setStoredToken(null);

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
    const token = await this.getStoredToken();

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

    await this.setStoredToken(null);
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

  async getToken(): Promise<string | null> {
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
      await this.setStoredToken(data.session.token);
      this.notifyListeners('SIGNED_IN', data.session);
    }

    return data;
  }

  async confirmEmail(
    email: string,
    token: string,
  ): Promise<UserResponse | null> {
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
    const token = await this.getStoredToken();
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

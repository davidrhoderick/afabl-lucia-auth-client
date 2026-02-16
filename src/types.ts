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

export interface AuthStorage {
  getToken(): string | null | Promise<string | null>;
  setToken(token: string | null): void | Promise<void>;
}

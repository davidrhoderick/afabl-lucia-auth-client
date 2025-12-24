export { setAccessToken, getAccessToken } from './auth';
export {
  AuthClient,
  createAuthClient,
  getAuthClient,
  type User,
  type Session,
  type SessionResponse,
  type SignUpResponse,
  type UserResponse,
  type PasswordResetResponse,
  type EmailChangeResponse,
  type ConfirmationResponse,
  type AuthStateChangeCallback,
  type AuthClientOptions,
} from './client';
export { UserProvider, useUser, type UserProviderProps } from './user';

import { BaseAuthClient } from './base-client';
import type { AuthClientOptions, AuthStorage } from './types';

const TOKEN_STORAGE_KEY = 'auth_session_token';

class WebStorage implements AuthStorage {
  getToken(): string | null {
    if (globalThis.window === undefined) return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  setToken(token: string | null): void {
    if (globalThis.window === undefined) return;
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class WebAuthClient extends BaseAuthClient {
  protected storage: AuthStorage = new WebStorage();

  protected getStoredToken(): string | null {
    return this.storage.getToken() as string | null;
  }

  protected setStoredToken(token: string | null): void {
    this.storage.setToken(token);
  }
}

let defaultClient: WebAuthClient | null = null;

export function createWebAuthClient(
  options: AuthClientOptions = {},
): WebAuthClient {
  return new WebAuthClient(options);
}

export function getWebAuthClient(
  options: AuthClientOptions = {},
): WebAuthClient {
  defaultClient ??= new WebAuthClient(options);
  return defaultClient;
}

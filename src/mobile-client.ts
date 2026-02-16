import { BaseAuthClient } from './base-client';
import type { AuthClientOptions, AuthStorage } from './types';

export interface MobileAuthClientOptions extends AuthClientOptions {
  storage: AuthStorage;
}

export class MobileAuthClient extends BaseAuthClient {
  protected storage: AuthStorage;

  constructor(options: MobileAuthClientOptions) {
    super(options);
    this.storage = options.storage;
  }

  protected async getStoredToken(): Promise<string | null> {
    return this.storage.getToken();
  }

  protected async setStoredToken(token: string | null): Promise<void> {
    await this.storage.setToken(token);
  }
}

let defaultClient: MobileAuthClient | null = null;

export function createMobileAuthClient(
  options: MobileAuthClientOptions,
): MobileAuthClient {
  return new MobileAuthClient(options);
}

export function getMobileAuthClient(
  options: MobileAuthClientOptions,
): MobileAuthClient {
  defaultClient ??= new MobileAuthClient(options);
  return defaultClient;
}

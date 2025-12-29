import { Injectable } from 'injection-js';
import type { AbstractSecurityStorage } from './abstract-security-storage';

@Injectable()
export class DefaultSessionStorageService implements AbstractSecurityStorage {
  read(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  write(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}

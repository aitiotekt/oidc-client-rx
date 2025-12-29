import { Injectable } from 'injection-js';
import type { AbstractSecurityStorage } from './abstract-security-storage';

@Injectable()
export class DefaultLocalStorageService implements AbstractSecurityStorage {
  read(key: string): string | null {
    return localStorage.getItem(key);
  }

  write(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

import { Injectable, InjectionToken, inject } from 'injection-js';

export type PlatformId = 'browser' | 'server';

export const PLATFORM_ID = new InjectionToken<PlatformId>('PLATFORM_ID');

@Injectable()
export class PlatformProvider {
  private readonly platformId = inject<string>(PLATFORM_ID);

  isBrowser(): boolean {
    return this.platformId === 'browser';
  }
}

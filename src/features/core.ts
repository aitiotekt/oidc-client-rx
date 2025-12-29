import type { HttpFeature } from '@ngify/http';
import type { Provider } from 'injection-js';
import { NEVER, fromEvent, shareReplay, take } from 'rxjs';
import { DESTORY_REF } from 'src/resources';
import { DOCUMENT } from '../dom';
import { provideHttpClient } from '../http';
import {
  AbstractRouter,
  VanillaHistoryRouter,
  VanillaLocationRouter,
} from '../router';
import { AbstractSecurityStorage } from '../storage/abstract-security-storage';
import { DefaultLocalStorageService } from '../storage/default-localstorage.service';
import { DefaultSessionStorageService } from '../storage/default-sessionstorage.service';
import { PLATFORM_ID } from '../utils/platform-provider/platform.provider';

/**
 * A feature to be used with `provideAuth`.
 */
export interface AuthFeature {
  ɵproviders: Provider[];
}

export interface BrowserPlatformFeatureOptions {
  enabled?: boolean;
}

export function withBrowserPlatform({
  enabled = true,
}: BrowserPlatformFeatureOptions = {}): AuthFeature {
  return {
    ɵproviders: enabled
      ? [
          {
            provide: DOCUMENT,
            useFactory: () => document,
          },
          {
            provide: PLATFORM_ID,
            useValue: 'browser',
          },
          {
            provide: DESTORY_REF,
            useFactory: (document: Document) => {
              if (document?.defaultView) {
                return fromEvent(document.defaultView, 'beforeunload').pipe(
                  take(1),
                  shareReplay(1)
                );
              }
              return NEVER;
            },
            deps: [DOCUMENT],
          },
        ]
      : [],
  };
}

export interface HttpClientFeatureOptions {
  enabled?: boolean;
  features?: HttpFeature[];
}

export function withHttpClient({
  features,
  enabled = true,
}: HttpClientFeatureOptions = {}): AuthFeature {
  return {
    ɵproviders: enabled ? provideHttpClient(features) : [],
  };
}

export type SecurityStorageType = 'session-storage' | 'local-storage';

export interface SecurityStorageFeatureOptions {
  enabled?: boolean;
  type?: SecurityStorageType;
}

export function withSecurityStorage({
  enabled = true,
  type = 'session-storage',
}: SecurityStorageFeatureOptions = {}): AuthFeature {
  return {
    ɵproviders: enabled
      ? [
          type === 'local-storage'
            ? {
                provide: AbstractSecurityStorage,
                useClass: DefaultLocalStorageService,
              }
            : {
                provide: AbstractSecurityStorage,
                useClass: DefaultSessionStorageService,
              },
        ]
      : [],
  };
}

export type VanillaRouterType = 'location' | 'history';

export interface VanillaRouterFeatureOptions {
  enabled?: boolean;
  type?: VanillaRouterType;
}

export function withVanillaRouter({
  enabled = true,
  type = 'history',
}: VanillaRouterFeatureOptions = {}): AuthFeature {
  return {
    ɵproviders: enabled
      ? [
          type === 'location'
            ? {
                provide: AbstractRouter,
                useClass: VanillaLocationRouter,
              }
            : {
                provide: AbstractRouter,
                useClass: VanillaHistoryRouter,
              },
        ]
      : [],
  };
}

export interface DefaultFeaturesOptions {
  browserPlatform?: BrowserPlatformFeatureOptions;
  securityStorage?: SecurityStorageFeatureOptions;
  router?: VanillaRouterFeatureOptions;
  httpClient?: HttpClientFeatureOptions;
}

export function withDefaultFeatures(
  options: DefaultFeaturesOptions = {}
): AuthFeature[] {
  return [
    withBrowserPlatform(options.browserPlatform),
    withSecurityStorage(options.securityStorage),
    withHttpClient(options.httpClient),
    withVanillaRouter(options.router),
  ].filter(Boolean) as AuthFeature[];
}

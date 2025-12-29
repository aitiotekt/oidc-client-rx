import {
  // biome-ignore lint/nursery/noExportedImports: <explanation>
  HttpClient as DefaultHttpClient,
  type HttpBackend,
  type HttpFeature,
  HttpFeatureKind,
  // biome-ignore lint/nursery/noExportedImports: <explanation>
  HttpHeaders,
  type HttpInterceptor,
  type HttpInterceptorFn,
  type HttpRequest,
  type HttpParams as NgifyHttpParams,
  withInterceptors,
  withLegacyInterceptors,
} from '@ngify/http';
import {
  InjectionToken,
  Optional,
  type Provider,
} from 'injection-js';
import type { Observable } from 'rxjs';
import type { ArrayOrNullableOne } from '../utils/types';
// biome-ignore lint/nursery/noExportedImports: <explanation>
import { HttpParams, type HttpParamsOptions } from './params';

export { HttpParams, HttpHeaders, type HttpParamsOptions, DefaultHttpClient };

export const HTTP_FEATURES = new InjectionToken<HttpFeature[]>('HTTP_FEATURES');

export const HTTP_INTERCEPTOR_FNS = new InjectionToken<HttpInterceptorFn[]>(
  'HTTP_INTERCEPTOR_FNS'
);

export const HTTP_LEGACY_INTERCEPTORS = new InjectionToken<HttpInterceptor[]>(
  'HTTP_LEGACY_INTERCEPTORS'
);

export const HTTP_BACKEND = new InjectionToken<HttpBackend>('HTTP_BACKEND');

export const HTTP_XSRF_PROTECTION = new InjectionToken<HttpInterceptorFn>(
  'HTTP_XSRF_PROTECTION'
);

export function provideHttpClient(features: HttpFeature[] = []): Provider[] {
  return [
    {
      provide: HTTP_INTERCEPTOR_FNS,
      multi: true,
      useValue: [],
    },
    {
      provide: HTTP_LEGACY_INTERCEPTORS,
      multi: true,
      useValue: [],
    },
    {
      provide: HTTP_FEATURES,
      useFactory: (
        interceptors: ArrayOrNullableOne<HttpInterceptorFn>[]
      ): HttpFeature[] => {
        const normalizedInterceptors = [interceptors]
          .flat(Number.MAX_SAFE_INTEGER)
          .filter(Boolean) as HttpInterceptorFn[];
        return normalizedInterceptors.length
          ? [withInterceptors(normalizedInterceptors)]
          : [];
      },
      multi: true,
      deps: [HTTP_INTERCEPTOR_FNS],
    },
    {
      provide: HTTP_FEATURES,
      useFactory: (
        interceptors: ArrayOrNullableOne<HttpInterceptor>[]
      ): HttpFeature[] => {
        const normalizedInterceptors = [interceptors]
          .flat(Number.MAX_SAFE_INTEGER)
          .filter(Boolean) as HttpInterceptor[];
        return normalizedInterceptors.length
          ? [withLegacyInterceptors(normalizedInterceptors)]
          : [];
      },
      multi: true,
      deps: [HTTP_LEGACY_INTERCEPTORS],
    },
    {
      provide: HTTP_FEATURES,
      useFactory: (backend: HttpBackend | null | undefined): HttpFeature[] => {
        return backend
          ? [
              {
                kind: HttpFeatureKind.Backend,
                value: backend,
              },
            ]
          : [];
      },
      multi: true,
      deps: [[new Optional(), HTTP_BACKEND]],
    },
    {
      provide: HTTP_FEATURES,
      useFactory: (
        interceptor: HttpInterceptorFn | null | undefined
      ): HttpFeature[] => {
        return interceptor
          ? [
              {
                kind: HttpFeatureKind.XsrfProtection,
                value: interceptor,
              },
            ]
          : [];
      },
      multi: true,
      deps: [[new Optional(), HTTP_XSRF_PROTECTION]],
    },
    {
      provide: HTTP_FEATURES,
      useValue: features,
      multi: true,
    },
    {
      provide: HTTP_CLIENT,
      useFactory: (features: ArrayOrNullableOne<HttpFeature>[]) => {
        const normalizedFeatures = [features]
          .flat(Number.MAX_SAFE_INTEGER)
          .filter(Boolean) as HttpFeature[];
        return new DefaultHttpClient(...normalizedFeatures);
      },
      deps: [HTTP_FEATURES],
    },
  ];
}

export type HttpClient = {
  get<T>(
    url: string,
    options?: { headers?: HttpHeaders; params?: NgifyHttpParams }
  ): Observable<T>;

  post<T>(
    url: string,
    body?: HttpRequest<any>['body'],
    options?: { headers?: HttpHeaders; params?: NgifyHttpParams }
  ): Observable<T>;
};

export const HTTP_CLIENT = new InjectionToken<HttpClient>('HTTP_CLIENT');

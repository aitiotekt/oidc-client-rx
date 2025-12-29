import { HttpClientTestingBackend } from '@ngify/http/testing';
import { InjectionToken, type Provider } from 'injection-js';
import { HTTP_BACKEND, provideHttpClient } from 'oidc-client-rx';

export { HttpTestingController as DefaultHttpTestingController } from '@ngify/http/testing';

export const HTTP_CLIENT_TEST_CONTROLLER =
  new InjectionToken<HttpClientTestingBackend>('HTTP_CLIENT_TEST_CONTROLLER');

export function provideHttpClientTesting(): Provider[] {
  const backend = new HttpClientTestingBackend();
  return [
    {
      provide: HTTP_CLIENT_TEST_CONTROLLER,
      useValue: backend,
    },
    {
      provide: HTTP_BACKEND,
      useValue: backend,
    },
    ...provideHttpClient(),
  ];
}

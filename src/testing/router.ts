import type { Provider } from 'injection-js';
import {
  AbstractRouter,
  type UrlTree,
  VanillaLocationRouter,
} from 'oidc-client-rx';

export class MockRouter extends VanillaLocationRouter {
  parseUrl(url: string): UrlTree {
    const u = new URL(url, this.document.baseURI);
    return `${u.pathname}${u.search}${u.hash}`;
  }
}

export function mockRouterProvider(): Provider {
  return {
    useClass: MockRouter,
    provide: AbstractRouter, // This is the token that will be injected into components
  };
}

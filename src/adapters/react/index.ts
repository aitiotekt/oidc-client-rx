import type { InjectionToken, Injector, Type } from 'injection-js';
import {
  type PropsWithChildren,
  createContext,
  createElement,
  useContext,
  useMemo,
} from 'react';
import { OidcSecurityService } from '../../oidc.security.service';

export const InjectorContextVoidInjector: Injector = {
  get: <T>(_token: Type<T> | InjectionToken<T>, _notFoundValue?: T): T => {
    throw new Error('Please wrap with a InjectorContext.Provider first');
  },
};

export const InjectorContext = createContext<Injector>(
  InjectorContextVoidInjector
);

export function InjectorProvider({
  injector,
  ...props
}: PropsWithChildren<{ injector: Injector }>) {
  return createElement(InjectorContext, {
    ...props,
    value: injector,
  });
}

export function useInjector() {
  return useContext(InjectorContext);
}

export function useOidcClient() {
  const injector = useInjector();

  const oidcSecurityService = useMemo(
    () => injector.get(OidcSecurityService),
    [injector]
  );

  return {
    injector,
    oidcSecurityService,
  };
}

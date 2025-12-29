import type { InjectionToken, Injector, Type } from 'injection-js';
import {
  type FlowProps,
  createContext,
  createMemo,
  mergeProps,
  splitProps,
  useContext,
} from 'solid-js';
import { OidcSecurityService } from '../../oidc.security.service';

export const InjectorContextVoidInjector: Injector = {
  get: <T>(_token: Type<T> | InjectionToken<T>, _notFoundValue?: T): T => {
    throw new Error('Please wrap with a InjectorContext.Provider first');
  },
};

export const InjectorContext = createContext<Injector>(
  InjectorContextVoidInjector
);

export function InjectorProvider(props: FlowProps<{ injector: Injector }>) {
  const [local, others] = splitProps(props, ['injector']);
  const providerProps = mergeProps(others, { value: local.injector });
  return InjectorContext.Provider(providerProps);
}

export function useInjector() {
  return useContext(InjectorContext);
}

export function useOidcClient() {
  const injector = useInjector();

  const oidcSecurityService = createMemo(() =>
    injector.get(OidcSecurityService)
  );

  return {
    injector,
    oidcSecurityService: oidcSecurityService(),
  };
}

import type { Provider } from 'injection-js';

export function mockClass<T>(
  obj: new (...args: any[]) => T
): new (
  ...args: any[]
) => T {
  const keys = Object.getOwnPropertyNames(obj.prototype);
  const allMethods = keys.filter((key) => {
    try {
      return typeof obj.prototype[key] === 'function';
    } catch {
      return false;
    }
  });
  const allProperties = keys.filter((x) => !allMethods.includes(x));

  const mockedClass = class T {};

  for (const method of allMethods) {
    const mockImplementation = Reflect.getMetadata(
      'mock:implementation',
      obj.prototype,
      method
    );
    (mockedClass.prototype as any)[method] =
      mockImplementation ??
      ((): any => {
        return;
      });
  }

  for (const method of allProperties) {
    Object.defineProperty(mockedClass.prototype, method, {
      get() {
        return '';
      },
      configurable: true,
    });
  }

  return mockedClass as any;
}

export function mockProvider<T>(
  obj: new (...args: any[]) => T,
  token?: any
): Provider {
  return {
    provide: token ?? obj,
    useClass: mockClass(obj),
  };
}

export function mockAbstractProvider<T, M extends T>(
  type: abstract new (...args: any[]) => T,
  mockType: new (...args: any[]) => M
): Provider {
  const mock = mockClass(mockType);

  return { provide: type, useClass: mock };
}

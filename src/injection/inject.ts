import { inject } from 'injection-js';

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export interface AbstractType<T> extends Function {
  prototype: T;
}

export function injectAbstractType<T>(abstractType: AbstractType<T>): T {
  return inject<T>(abstractType as any);
}

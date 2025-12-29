import {
  type InjectionToken,
  type Injector,
  type Provider,
  ReflectiveInjector,
  type Type,
  runInInjectionContext,
} from 'injection-js';

export interface TestModuleMetadata {
  providers?: Provider[];
  imports?: ((parentInjector: Injector) => Injector)[];
}

export class TestBed {
  static environmentInjector?: Injector;
  private injector: ReflectiveInjector;
  private providers: Provider[] = [];
  private imports: Injector[] = [];

  constructor(
    metadata: TestModuleMetadata = {},
    environmentInjector?: Injector
  ) {
    const providers = metadata.providers ?? [];
    const imports = metadata.imports ?? [];
    this.injector = ReflectiveInjector.resolveAndCreate(
      providers,
      environmentInjector
    );
    this.imports = imports.map((importFn) => importFn(this.injector));
  }

  static #instance?: TestBed;

  static initTestEnvironment(providers: Provider[] = []) {
    TestBed.environmentInjector =
      ReflectiveInjector.resolveAndCreate(providers);
  }

  static configureTestingModule(metadata: TestModuleMetadata = {}) {
    const newTestBed = new TestBed(metadata, TestBed.environmentInjector);
    TestBed.#instance = newTestBed;

    return newTestBed;
  }

  static runInInjectionContext<T>(fn: () => T): T {
    const injector = TestBed.#instance?.injector;
    if (!injector) {
      throw new Error(
        'TestBed is not configured. Call configureTestingModule first.'
      );
    }

    return runInInjectionContext(injector, fn);
  }

  compileComponents(): Promise<any> {
    return Promise.resolve();
  }

  static get instance(): TestBed {
    if (!TestBed.#instance) {
      throw new Error('TestBest.configureTestingModule should be called first');
    }
    return TestBed.#instance;
  }

  static get<T>(token: Type<T> | InjectionToken<T>): T;
  static get(token: any): any;
  static get(token: unknown): any {
    const g = TestBed.instance;
    return g.injector.get(token);
  }

  static inject<T>(token: Type<T> | InjectionToken<T>): T;
  static inject(token: any): any;
  static inject(token: unknown): any {
    return TestBed.get(token as any);
  }

  static [Symbol.dispose]() {
    TestBed.#instance = undefined;
  }

  static getImportByType<T extends Injector>(typeClass: Type<T>): T {
    const importItem = TestBed.instance.imports.find(
      (i): i is T => i instanceof typeClass
    );
    if (!importItem) {
      throw new Error(
        `can not find import by type ${typeClass.prototype.constructor.name}`
      );
    }

    return importItem;
  }
}

export function getTestBed() {
  return TestBed.instance;
}

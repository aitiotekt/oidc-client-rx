import { isEqual } from "lodash-es";
import { type MockInstance, vi } from "vitest";

export function createSpyObj<T>(baseName: string, methods: (keyof T)[]): T {
	const SpyClass = new Function(
		`return class Spy${baseName} {
      constructor() {}
    }`,
	) as new () => T;

	const spyObj = new SpyClass();

	for (const method of methods) {
		Object.defineProperty(spyObj, method, {
			value: vi.fn(),
			writable: true,
		});
	}

	return spyObj;
}

export function mockImplementationWhenArgsEqual<M extends MockInstance<any>>(
	mockInstance: M,
	whenArgs: Parameters<M extends MockInstance<infer T> ? T : never>,
	implementation: Exclude<ReturnType<M["getMockImplementation"]>, undefined>,
): M {
	const spyImpl = mockInstance.getMockImplementation()!;

	return mockInstance.mockImplementation((...args) => {
		if (isEqual(args, whenArgs)) {
			return implementation(...args);
		}
		return spyImpl?.(...args);
	});
}

type Procedure = (...args: any[]) => any;
type Methods<T> = keyof {
	[K in keyof T as T[K] extends Procedure ? K : never]: T[K];
};
type Classes<T> = {
	[K in keyof T]: T[K] extends new (...args: any[]) => any ? K : never;
}[keyof T] &
	(string | symbol);

export type MockInstanceWithOrigin<M extends Procedure> = MockInstance<M> & {
	getOriginImplementation?: () => any;
};

export function spyOnWithOrigin<
	T,
	M extends Classes<Required<T>> | Methods<Required<T>>,
>(
	obj: T,
	methodName: M,
): Required<T>[M] extends {
	new (...args: infer A): infer R;
}
	? MockInstanceWithOrigin<(this: R, ...args: A) => R>
	: T[M] extends Procedure
		? MockInstanceWithOrigin<T[M]>
		: never {
	let currentObj = obj;
	let origin:
		| (Required<T>[M] extends {
				new (...args: infer A): infer R;
		  }
				? (this: R, ...args: A) => R
				: T[M] extends Procedure
					? T[M]
					: never)
		| undefined;
	while (currentObj) {
		origin = currentObj[methodName] as any;
		if (origin) {
			break;
		}
		currentObj = Object.getPrototypeOf(currentObj);
	}

	const spy = vi.spyOn(obj, methodName as any) as Required<T>[M] extends {
		new (...args: infer A): infer R;
	}
		? MockInstanceWithOrigin<(this: R, ...args: A) => R>
		: T[M] extends Procedure
			? MockInstanceWithOrigin<T[M]>
			: never;

	spy.getOriginImplementation = () => origin;

	return spy;
}

export function mockImplementationWhenArgs<T extends Procedure = Procedure>(
	mockInstance: MockInstance<T> & { getOriginImplementation?: () => T },
	whenArgs: (...args: Parameters<T>) => boolean,
	implementation: T,
): MockInstance<T> {
	const spyImpl =
		mockInstance.getMockImplementation() ??
		mockInstance.getOriginImplementation?.();

	return mockInstance.mockImplementation((...args) => {
		if (whenArgs(...args)) {
			return implementation(...args);
		}
		if (spyImpl) {
			return spyImpl(...args);
		}
		throw new Error("Mock implementation not defined for these arguments.");
	});
}

/**
 * mock Jasmine spyOnProperty
 */
export function spyOnProperty<T, K extends keyof T>(
	obj: T,
	propertyKey: K,
	accessType: "get" | "set" = "get",
) {
	const ownDescriptor = Object.getOwnPropertyDescriptor(obj, propertyKey);
	let finalDescriptor: PropertyDescriptor | undefined;
	let currentObj = obj;
	while (currentObj) {
		finalDescriptor = Object.getOwnPropertyDescriptor(currentObj, propertyKey);
		if (finalDescriptor) {
			break;
		}
		currentObj = Object.getPrototypeOf(currentObj);
	}

	const spy = vi.fn();

	if (accessType === "get") {
		Object.defineProperty(obj, propertyKey, {
			get: spy,
			configurable: true,
		});
	} else if (accessType === "set") {
		Object.defineProperty(obj, propertyKey, {
			set: spy,
			configurable: true,
		});
	}

	// 恢复原始属性
	spy.mockRestore = () => {
		if (ownDescriptor) {
			Object.defineProperty(obj, propertyKey, ownDescriptor);
		} else {
			delete obj[propertyKey];
		}
	};

	return spy;
}

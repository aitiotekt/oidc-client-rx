/// <reference types="reflect-metadata" />

// biome-ignore lint/complexity/noBannedTypes: false positive
export function MockUtil<F = Function>(options: { implementation: F }) {
	return (
		targetClass: any,
		propertyKey: string,
		_descriptor?: TypedPropertyDescriptor<(...args: any[]) => any>,
	): void => {
		Reflect?.defineMetadata?.(
			"mock:implementation",
			options.implementation,
			targetClass,
			propertyKey,
		);
	};
}

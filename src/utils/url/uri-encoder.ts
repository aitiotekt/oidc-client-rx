import type { HttpParameterCodec } from "@ngify/http";

export class UriEncoder implements HttpParameterCodec {
	encodeKey(key: string): string {
		return encodeURIComponent(key);
	}

	encodeValue(value: string): string {
		return encodeURIComponent(value);
	}

	decodeKey(key: string): string {
		return decodeURIComponent(key);
	}

	decodeValue(value: string): string {
		return decodeURIComponent(value);
	}
}

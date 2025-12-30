import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { DataService } from "../../api/data.service";
import { LoggerService } from "../../logging/logger.service";
import { createRetriableStream } from "../../testing/create-retriable-stream.helper";
import { mockProvider } from "../../testing/mock";
import { AuthWellKnownDataService } from "./auth-well-known-data.service";
import type { AuthWellKnownEndpoints } from "./auth-well-known-endpoints";

const DUMMY_WELL_KNOWN_DOCUMENT = {
	issuer: "https://identity-server.test/realms/main",
	authorization_endpoint:
		"https://identity-server.test/realms/main/protocol/openid-connect/auth",
	token_endpoint:
		"https://identity-server.test/realms/main/protocol/openid-connect/token",
	userinfo_endpoint:
		"https://identity-server.test/realms/main/protocol/openid-connect/userinfo",
	end_session_endpoint:
		"https://identity-server.test/realms/main/master/protocol/openid-connect/logout",
	jwks_uri:
		"https://identity-server.test/realms/main/protocol/openid-connect/certs",
	check_session_iframe:
		"https://identity-server.test/realms/main/protocol/openid-connect/login-status-iframe.html",
	introspection_endpoint:
		"https://identity-server.test/realms/main/protocol/openid-connect/token/introspect",
};

describe("AuthWellKnownDataService", () => {
	let service: AuthWellKnownDataService;
	let dataService: DataService;
	let loggerService: LoggerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AuthWellKnownDataService,
				mockProvider(DataService),
				mockProvider(LoggerService),
			],
		});
		service = TestBed.inject(AuthWellKnownDataService);
		loggerService = TestBed.inject(LoggerService);
		dataService = TestBed.inject(DataService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("getWellKnownDocument", () => {
		it("should add suffix if it does not exist on current URL", async () => {
			const dataServiceSpy = vi
				.spyOn(dataService, "get")
				.mockReturnValue(of(null));
			const urlWithoutSuffix = "myUrl";
			const urlWithSuffix = `${urlWithoutSuffix}/.well-known/openid-configuration`;

			await firstValueFrom(
				(service as any).getWellKnownDocument(urlWithoutSuffix, {
					configId: "configId1",
				}),
			);
			expect(dataServiceSpy).toHaveBeenCalledExactlyOnceWith(urlWithSuffix, {
				configId: "configId1",
			});
		});

		it("should not add suffix if it does exist on current url", async () => {
			const dataServiceSpy = vi
				.spyOn(dataService, "get")
				.mockReturnValue(of(null));
			const urlWithSuffix = "myUrl/.well-known/openid-configuration";

			await firstValueFrom(
				(service as any).getWellKnownDocument(urlWithSuffix, {
					configId: "configId1",
				}),
			);
			expect(dataServiceSpy).toHaveBeenCalledExactlyOnceWith(urlWithSuffix, {
				configId: "configId1",
			});
		});

		it("should not add suffix if it does exist in the middle of current url", async () => {
			const dataServiceSpy = vi
				.spyOn(dataService, "get")
				.mockReturnValue(of(null));
			const urlWithSuffix =
				"myUrl/.well-known/openid-configuration/and/some/more/stuff";

			await firstValueFrom(
				(service as any).getWellKnownDocument(urlWithSuffix, {
					configId: "configId1",
				}),
			);
			expect(dataServiceSpy).toHaveBeenCalledExactlyOnceWith(urlWithSuffix, {
				configId: "configId1",
			});
		});

		it("should use the custom suffix provided in the config", async () => {
			const dataServiceSpy = vi
				.spyOn(dataService, "get")
				.mockReturnValue(of(null));
			const urlWithoutSuffix = "myUrl";
			const urlWithSuffix = `${urlWithoutSuffix}/.well-known/test-openid-configuration`;

			await firstValueFrom(
				(service as any).getWellKnownDocument(urlWithoutSuffix, {
					configId: "configId1",
					authWellknownUrlSuffix: "/.well-known/test-openid-configuration",
				}),
			);
			expect(dataServiceSpy).toHaveBeenCalledExactlyOnceWith(urlWithSuffix, {
				configId: "configId1",
				authWellknownUrlSuffix: "/.well-known/test-openid-configuration",
			});
		});

		it("should retry once", async () => {
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("one")),
					of(DUMMY_WELL_KNOWN_DOCUMENT),
				),
			);

			const res: unknown = await firstValueFrom(
				(service as any).getWellKnownDocument("anyurl", {
					configId: "configId1",
				}),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual(DUMMY_WELL_KNOWN_DOCUMENT);
		});

		it("should retry twice", async () => {
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("one")),
					throwError(() => new Error("two")),
					of(DUMMY_WELL_KNOWN_DOCUMENT),
				),
			);

			const res: any = await firstValueFrom(
				(service as any).getWellKnownDocument("anyurl", {
					configId: "configId1",
				}),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual(DUMMY_WELL_KNOWN_DOCUMENT);
		});

		it("should fail after three tries", async () => {
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("one")),
					throwError(() => new Error("two")),
					throwError(() => new Error("three")),
					of(DUMMY_WELL_KNOWN_DOCUMENT),
				),
			);

			try {
				await firstValueFrom(
					(service as any).getWellKnownDocument("anyurl", "configId"),
				);
			} catch (err: unknown) {
				expect(err).toBeTruthy();
			}
		});
	});

	describe("getWellKnownEndPointsForConfig", () => {
		it("calling internal getWellKnownDocument and maps", async () => {
			vi.spyOn(dataService, "get").mockReturnValue(
				of({ jwks_uri: "jwks_uri" }),
			);

			const spy = vi.spyOn(service as any, "getWellKnownDocument");

			const result = await firstValueFrom(
				service.getWellKnownEndPointsForConfig({
					configId: "configId1",
					authWellknownEndpointUrl: "any-url",
				}),
			);
			expect(spy).toHaveBeenCalled();
			expect((result as any).jwks_uri).toBeUndefined();
			expect(result.jwksUri).toBe("jwks_uri");
		});

		it("throws error and logs if no authwellknownUrl is given", async () => {
			const loggerSpy = vi.spyOn(loggerService, "logError");
			const config = {
				configId: "configId1",
				authWellknownEndpointUrl: undefined,
			};

			try {
				await firstValueFrom(service.getWellKnownEndPointsForConfig(config));
			} catch (error: any) {
				expect(loggerSpy).toHaveBeenCalledExactlyOnceWith(
					config,
					"no authWellknownEndpoint given!",
				);
				expect(error.message).toEqual("no authWellknownEndpoint given!");
			}
		});

		it("should merge the mapped endpoints with the provided endpoints", async () => {
			vi.spyOn(dataService, "get").mockReturnValue(
				of(DUMMY_WELL_KNOWN_DOCUMENT),
			);

			const expected: AuthWellKnownEndpoints = {
				endSessionEndpoint: "config-endSessionEndpoint",
				revocationEndpoint: "config-revocationEndpoint",
				jwksUri: DUMMY_WELL_KNOWN_DOCUMENT.jwks_uri,
			};

			const result = await firstValueFrom(
				service.getWellKnownEndPointsForConfig({
					configId: "configId1",
					authWellknownEndpointUrl: "any-url",
					authWellknownEndpoints: {
						endSessionEndpoint: "config-endSessionEndpoint",
						revocationEndpoint: "config-revocationEndpoint",
					},
				}),
			);
			expect(result).toEqual(expect.objectContaining(expected));
		});
	});
});

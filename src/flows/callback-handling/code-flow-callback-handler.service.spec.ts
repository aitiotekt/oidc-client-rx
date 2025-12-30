import { HttpErrorResponse, HttpHeaders } from "@ngify/http";
import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { DataService } from "../../api/data.service";
import { LoggerService } from "../../logging/logger.service";
import { StoragePersistenceService } from "../../storage/storage-persistence.service";
import { createRetriableStream } from "../../testing/create-retriable-stream.helper";
import { mockProvider } from "../../testing/mock";
import { UrlService } from "../../utils/url/url.service";
import { TokenValidationService } from "../../validation/token-validation.service";
import type { CallbackContext } from "../callback-context";
import { FlowsDataService } from "../flows-data.service";
import { CodeFlowCallbackHandlerService } from "./code-flow-callback-handler.service";

describe("CodeFlowCallbackHandlerService", () => {
	let service: CodeFlowCallbackHandlerService;
	let dataService: DataService;
	let storagePersistenceService: StoragePersistenceService;
	let tokenValidationService: TokenValidationService;
	let urlService: UrlService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				CodeFlowCallbackHandlerService,
				mockProvider(UrlService),
				mockProvider(LoggerService),
				mockProvider(TokenValidationService),
				mockProvider(FlowsDataService),
				mockProvider(StoragePersistenceService),
				mockProvider(DataService),
			],
		});
		service = TestBed.inject(CodeFlowCallbackHandlerService);
		dataService = TestBed.inject(DataService);
		urlService = TestBed.inject(UrlService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		tokenValidationService = TestBed.inject(TokenValidationService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("codeFlowCallback", () => {
		it("throws error if no state is given", async () => {
			const getUrlParameterSpy = vi
				.spyOn(urlService, "getUrlParameter")
				.mockReturnValue("params");

			mockImplementationWhenArgsEqual(
				getUrlParameterSpy,
				["test-url", "state"],
				() => "",
			);

			try {
				await firstValueFrom(
					service.codeFlowCallback("test-url", { configId: "configId1" }),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("throws error if no code is given", async () => {
			const getUrlParameterSpy = vi
				.spyOn(urlService, "getUrlParameter")
				.mockReturnValue("params");

			mockImplementationWhenArgsEqual(
				getUrlParameterSpy,
				["test-url", "code"],
				() => "",
			);

			try {
				await firstValueFrom(
					service.codeFlowCallback("test-url", { configId: "configId1" }),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("returns callbackContext if all params are good", async () => {
			vi.spyOn(urlService, "getUrlParameter").mockReturnValue("params");

			const expectedCallbackContext = {
				code: "params",
				refreshToken: "",
				state: "params",
				sessionState: "params",
				authResult: null,
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: null,
			} as CallbackContext;

			const callbackContext = await firstValueFrom(
				service.codeFlowCallback("test-url", { configId: "configId1" }),
			);
			expect(callbackContext).toEqual(expectedCallbackContext);
		});
	});

	describe("codeFlowCodeRequest ", () => {
		const HTTP_ERROR = new HttpErrorResponse({});
		const CONNECTION_ERROR = new HttpErrorResponse({
			error: new ProgressEvent("error"),
			status: 0,
			statusText: "Unknown Error",
			url: "https://identity-server.test/openid-connect/token",
		});

		it("throws error if state is not correct", async () => {
			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(false);

			try {
				await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, {
						configId: "configId1",
					}),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("throws error if authWellknownEndpoints is null is given", async () => {
			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => null,
			);

			try {
				await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, {
						configId: "configId1",
					}),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("throws error if tokenendpoint is null is given", async () => {
			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ tokenEndpoint: null }),
			);

			try {
				await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, {
						configId: "configId1",
					}),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("calls dataService if all params are good", async () => {
			const postSpy = vi.spyOn(dataService, "post").mockReturnValue(of({}));

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);

			await firstValueFrom(
				service.codeFlowCodeRequest({} as CallbackContext, {
					configId: "configId1",
				}),
			);
			expect(postSpy).toHaveBeenCalledExactlyOnceWith(
				"tokenEndpoint",
				undefined,
				{ configId: "configId1" },
				expect.any(HttpHeaders),
			);
		});

		it("calls url service with custom token params", async () => {
			const urlServiceSpy = vi.spyOn(
				urlService,
				"createBodyForCodeFlowCodeRequest",
			);
			const config = {
				configId: "configId1",
				customParamsCodeRequest: { foo: "bar" },
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);

			const postSpy = vi.spyOn(dataService, "post").mockReturnValue(of({}));

			await firstValueFrom(
				service.codeFlowCodeRequest({ code: "foo" } as CallbackContext, config),
			);
			expect(urlServiceSpy).toHaveBeenCalledExactlyOnceWith("foo", config, {
				foo: "bar",
			});
			expect(postSpy).toHaveBeenCalledTimes(1);
		});

		it("calls dataService with correct headers if all params are good", async () => {
			const postSpy = vi.spyOn(dataService, "post").mockReturnValue(of({}));
			const config = {
				configId: "configId1",
				customParamsCodeRequest: { foo: "bar" },
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);

			await firstValueFrom(
				service.codeFlowCodeRequest({} as CallbackContext, config),
			);
			const httpHeaders = postSpy.mock.calls.at(-1)?.[3] as HttpHeaders;
			expect(httpHeaders.has("Content-Type")).toBeTruthy();
			expect(httpHeaders.get("Content-Type")).toBe(
				"application/x-www-form-urlencoded",
			);
		});

		it("returns error in case of http error", async () => {
			vi.spyOn(dataService, "post").mockReturnValue(
				throwError(() => HTTP_ERROR),
			);
			const config = {
				configId: "configId1",
				customParamsCodeRequest: { foo: "bar" },
				authority: "authority",
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			try {
				await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, config),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("retries request in case of no connection http error and succeeds", async () => {
			const postSpy = vi.spyOn(dataService, "post").mockReturnValue(
				createRetriableStream(
					throwError(() => CONNECTION_ERROR),
					of({}),
				),
			);
			const config = {
				configId: "configId1",
				customParamsCodeRequest: { foo: "bar" },
				authority: "authority",
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);

			try {
				const res = await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, config),
				);
				expect(res).toBeTruthy();
				expect(postSpy).toHaveBeenCalledTimes(1);
			} catch (err: any) {
				expect(err).toBeFalsy();
			}
		});

		it("retries request in case of no connection http error and fails because of http error afterwards", async () => {
			const postSpy = vi.spyOn(dataService, "post").mockReturnValue(
				createRetriableStream(
					throwError(() => CONNECTION_ERROR),
					throwError(() => HTTP_ERROR),
				),
			);
			const config = {
				configId: "configId1",
				customParamsCodeRequest: { foo: "bar" },
				authority: "authority",
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ tokenEndpoint: "tokenEndpoint" }),
			);

			vi.spyOn(
				tokenValidationService,
				"validateStateFromHashCallback",
			).mockReturnValue(true);

			try {
				const res = await firstValueFrom(
					service.codeFlowCodeRequest({} as CallbackContext, config),
				);
				expect(res).toBeFalsy();
			} catch (err: any) {
				expect(err).toBeTruthy();
				expect(postSpy).toHaveBeenCalledTimes(1);
			}
		});
	});
});

import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { spyOnProperty, TestBed } from "@/testing";
import { CheckAuthService } from "../../auth-state/check-auth.service";
import { AuthWellKnownService } from "../../config/auth-well-known/auth-well-known.service";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import { RedirectService } from "../../utils/redirect/redirect.service";
import { UrlService } from "../../utils/url/url.service";
import type { LoginResponse } from "../login-response";
import { PopUpService } from "../popup/popup.service";
import type { PopupResult } from "../popup/popup-result";
import { ResponseTypeValidationService } from "../response-type-validation/response-type-validation.service";
import { ParService } from "./par.service";
import { ParLoginService } from "./par-login.service";
import type { ParResponse } from "./par-response";

describe("ParLoginService", () => {
	let service: ParLoginService;
	let responseTypeValidationService: ResponseTypeValidationService;
	let loggerService: LoggerService;
	let authWellKnownService: AuthWellKnownService;
	let parService: ParService;
	let urlService: UrlService;
	let redirectService: RedirectService;
	let popupService: PopUpService;
	let checkAuthService: CheckAuthService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ParLoginService,
				mockProvider(LoggerService),
				mockProvider(ResponseTypeValidationService),
				mockProvider(UrlService),
				mockProvider(RedirectService),
				mockProvider(AuthWellKnownService),
				mockProvider(PopUpService),
				mockProvider(CheckAuthService),
				mockProvider(ParService),
			],
		});
		service = TestBed.inject(ParLoginService);
		loggerService = TestBed.inject(LoggerService);
		responseTypeValidationService = TestBed.inject(
			ResponseTypeValidationService,
		);
		authWellKnownService = TestBed.inject(AuthWellKnownService);
		parService = TestBed.inject(ParService);
		urlService = TestBed.inject(UrlService);
		redirectService = TestBed.inject(RedirectService);
		popupService = TestBed.inject(PopUpService);
		checkAuthService = TestBed.inject(CheckAuthService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("loginPar", () => {
		it("does nothing if it has an invalid response type", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(false);
			const loggerSpy = vi.spyOn(loggerService, "logError");

			const result = await firstValueFrom(service.loginPar({}));

			expect(result).toBeUndefined();
			expect(loggerSpy).toHaveBeenCalled();
		});

		it("calls parService.postParRequest without custom params when no custom params are passed", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			const spy = vi
				.spyOn(parService, "postParRequest")
				.mockReturnValue(of({ requestUri: "requestUri" } as ParResponse));

			const result = await firstValueFrom(
				service.loginPar({
					authWellknownEndpointUrl: "authWellknownEndpoint",
					responseType: "stubValue",
				}),
			);

			expect(result).toBeUndefined();
			expect(spy).toHaveBeenCalled();
		});

		it("calls parService.postParRequest with custom params when custom params are passed", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			const spy = vi
				.spyOn(parService, "postParRequest")
				.mockReturnValue(of({ requestUri: "requestUri" } as ParResponse));

			const result = await firstValueFrom(
				service.loginPar(config, {
					customParams: { some: "thing" },
				}),
			);

			expect(result).toBeUndefined();
			expect(spy).toHaveBeenCalledExactlyOnceWith(config, {
				customParams: { some: "thing" },
			});
		});

		it("returns undefined and logs error when no url could be created", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue("");
			const spy = vi.spyOn(loggerService, "logError");

			const result = await firstValueFrom(service.loginPar(config));

			expect(result).toBeUndefined();
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it("calls redirect service redirectTo when url could be created", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			const authOptions = {};

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue(
				"some-par-url",
			);
			const spy = vi.spyOn(redirectService, "redirectTo");

			await firstValueFrom(service.loginPar(config, authOptions));

			expect(spy).toHaveBeenCalledExactlyOnceWith("some-par-url");
		});

		it("calls urlHandler when URL is passed", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue(
				"some-par-url",
			);
			const redirectToSpy = vi.spyOn(redirectService, "redirectTo");
			const spy = vi.fn();
			const urlHandler = (url: any): void => {
				spy(url);
			};

			await firstValueFrom(service.loginPar(config, { urlHandler }));

			expect(spy).toHaveBeenCalledExactlyOnceWith("some-par-url");
			expect(redirectToSpy).not.toHaveBeenCalled();
		});
	});

	describe("loginWithPopUpPar", () => {
		it("does nothing if it has an invalid response type", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(false);
			const loggerSpy = vi.spyOn(loggerService, "logError");
			const config = {};
			const allConfigs = [config];

			try {
				await firstValueFrom(service.loginWithPopUpPar(config, allConfigs));
			} catch (err: any) {
				expect(loggerSpy).toHaveBeenCalled();
				expect(err.message).toBe("Invalid response type!");
			}
		});

		it("calls parService.postParRequest without custom params when no custom params are passed", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			const spy = vi
				.spyOn(parService, "postParRequest")
				.mockReturnValue(of({ requestUri: "requestUri" } as ParResponse));

			try {
				await firstValueFrom(service.loginWithPopUpPar(config, allConfigs));
			} catch (err: any) {
				expect(spy).toHaveBeenCalled();
				expect(err.message).toBe(
					"Could not create URL with param requestUri: 'url'",
				);
			}
		});

		it("calls parService.postParRequest with custom params when custom params are passed", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			const spy = vi
				.spyOn(parService, "postParRequest")
				.mockReturnValue(of({ requestUri: "requestUri" } as ParResponse));

			try {
				await firstValueFrom(
					service.loginWithPopUpPar(config, allConfigs, {
						customParams: { some: "thing" },
					}),
				);
			} catch (err: any) {
				expect(spy).toHaveBeenCalledExactlyOnceWith(config, {
					customParams: { some: "thing" },
				});
				expect(err.message).toBe(
					"Could not create URL with param requestUri: 'url'",
				);
			}
		});

		it("returns undefined and logs error when no URL could be created", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue("");
			const spy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(
					service.loginWithPopUpPar(config, allConfigs, {
						customParams: { some: "thing" },
					}),
				);
			} catch (err: any) {
				expect(err.message).toBe(
					"Could not create URL with param requestUri: 'url'",
				);
				expect(spy).toHaveBeenCalledTimes(1);
			}
		});

		it("calls popupService openPopUp when URL could be created", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue(
				"some-par-url",
			);
			vi.spyOn(checkAuthService, "checkAuth").mockReturnValue(
				of({} as LoginResponse),
			);
			spyOnProperty(popupService, "result$").mockReturnValue(
				of({} as PopupResult),
			);
			const spy = vi.spyOn(popupService, "openPopUp");

			await firstValueFrom(service.loginWithPopUpPar(config, allConfigs));
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"some-par-url",
				undefined,
				config,
			);
		});

		it("returns correct properties if URL is received", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
				configId: "configId1",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue(
				"some-par-url",
			);

			const checkAuthSpy = vi
				.spyOn(checkAuthService, "checkAuth")
				.mockReturnValue(
					of({
						isAuthenticated: true,
						configId: "configId1",
						idToken: "",
						userData: { any: "userData" },
						accessToken: "anyAccessToken",
					}),
				);
			const popupResult: PopupResult = {
				userClosed: false,
				receivedUrl: "someUrl",
			};

			spyOnProperty(popupService, "result$").mockReturnValue(of(popupResult));

			const result = await firstValueFrom(
				service.loginWithPopUpPar(config, allConfigs),
			);
			expect(checkAuthSpy).toHaveBeenCalledExactlyOnceWith(
				config,
				allConfigs,
				"someUrl",
			);
			expect(result).toEqual({
				isAuthenticated: true,
				configId: "configId1",
				idToken: "",
				userData: { any: "userData" },
				accessToken: "anyAccessToken",
			});
		});

		it("returns correct properties if popup was closed by user", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
				configId: "configId1",
			};
			const allConfigs = [config];

			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(parService, "postParRequest").mockReturnValue(
				of({ requestUri: "requestUri" } as ParResponse),
			);
			vi.spyOn(urlService, "getAuthorizeParUrl").mockReturnValue(
				"some-par-url",
			);

			const checkAuthSpy = vi.spyOn(checkAuthService, "checkAuth");
			const popupResult = { userClosed: true } as PopupResult;

			spyOnProperty(popupService, "result$").mockReturnValue(of(popupResult));

			const result = await firstValueFrom(
				service.loginWithPopUpPar(config, allConfigs),
			);
			expect(checkAuthSpy).not.toHaveBeenCalled();
			expect(result).toEqual({
				isAuthenticated: false,
				errorMessage: "User closed popup",
				configId: "configId1",
				idToken: "",
				userData: null,
				accessToken: "",
			});
		});
	});
});

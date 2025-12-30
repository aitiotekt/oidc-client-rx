import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { spyOnProperty, TestBed } from "@/testing";
import { CheckAuthService } from "../../auth-state/check-auth.service";
import { AuthWellKnownService } from "../../config/auth-well-known/auth-well-known.service";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import { UrlService } from "../../utils/url/url.service";
import type { LoginResponse } from "../login-response";
import { ResponseTypeValidationService } from "../response-type-validation/response-type-validation.service";
import { PopUpService } from "./popup.service";
import { PopUpLoginService } from "./popup-login.service";
import type { PopupResult } from "./popup-result";

describe("PopUpLoginService", () => {
	let popUpLoginService: PopUpLoginService;
	let urlService: UrlService;
	let loggerService: LoggerService;
	let responseTypValidationService: ResponseTypeValidationService;
	let authWellKnownService: AuthWellKnownService;
	let popupService: PopUpService;
	let checkAuthService: CheckAuthService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				PopUpLoginService,
				mockProvider(LoggerService),
				mockProvider(ResponseTypeValidationService),
				mockProvider(UrlService),
				mockProvider(AuthWellKnownService),
				mockProvider(PopUpService),
				mockProvider(CheckAuthService),
			],
		});
		popUpLoginService = TestBed.inject(PopUpLoginService);
		urlService = TestBed.inject(UrlService);
		loggerService = TestBed.inject(LoggerService);
		responseTypValidationService = TestBed.inject(
			ResponseTypeValidationService,
		);
		authWellKnownService = TestBed.inject(AuthWellKnownService);
		popupService = TestBed.inject(PopUpService);
		checkAuthService = TestBed.inject(CheckAuthService);
	});

	it("should create", () => {
		expect(popUpLoginService).toBeTruthy();
	});

	describe("loginWithPopUpStandard", () => {
		it("does nothing if it has an invalid response type", async () => {
			const config = { responseType: "stubValue" };

			vi.spyOn(
				responseTypValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(false);
			const loggerSpy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(
					popUpLoginService.loginWithPopUpStandard(config, [config]),
				);
			} catch (err: any) {
				expect(loggerSpy).toHaveBeenCalled();
				expect(err.message).toBe("Invalid response type!");
			}
		});

		it("calls urlService.getAuthorizeUrl() if everything fits", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			spyOnProperty(popupService, "result$").mockReturnValue(
				of({} as PopupResult),
			);
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			vi.spyOn(checkAuthService, "checkAuth").mockReturnValue(
				of({} as LoginResponse),
			);

			await firstValueFrom(
				popUpLoginService.loginWithPopUpStandard(config, [config]),
			);
			expect(urlService.getAuthorizeUrl).toHaveBeenCalled();
		});

		it("opens popup if everything fits", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			spyOnProperty(popupService, "result$").mockReturnValue(
				of({} as PopupResult),
			);
			vi.spyOn(checkAuthService, "checkAuth").mockReturnValue(
				of({} as LoginResponse),
			);
			const popupSpy = vi.spyOn(popupService, "openPopUp");

			await firstValueFrom(
				popUpLoginService.loginWithPopUpStandard(config, [config]),
			);
			expect(popupSpy).toHaveBeenCalled();
		});

		it("returns three properties when popupservice received an url", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			vi.spyOn(popupService, "openPopUp");
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
				popUpLoginService.loginWithPopUpStandard(config, [config]),
			);
			expect(checkAuthSpy).toHaveBeenCalledExactlyOnceWith(
				config,
				[config],
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

		it("returns two properties if popup was closed by user", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
				configId: "configId1",
			};

			vi.spyOn(
				responseTypValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			vi.spyOn(popupService, "openPopUp");
			const checkAuthSpy = vi
				.spyOn(checkAuthService, "checkAuth")
				.mockReturnValue(of({} as LoginResponse));
			const popupResult = { userClosed: true } as PopupResult;

			spyOnProperty(popupService, "result$").mockReturnValue(of(popupResult));

			const result = await firstValueFrom(
				popUpLoginService.loginWithPopUpStandard(config, [config]),
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

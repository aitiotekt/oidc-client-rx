import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthWellKnownService } from "../../config/auth-well-known/auth-well-known.service";
import { FlowsDataService } from "../../flows/flows-data.service";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import { RedirectService } from "../../utils/redirect/redirect.service";
import { UrlService } from "../../utils/url/url.service";
import { ResponseTypeValidationService } from "../response-type-validation/response-type-validation.service";
import { StandardLoginService } from "./standard-login.service";

describe("StandardLoginService", () => {
	let standardLoginService: StandardLoginService;
	let loggerService: LoggerService;
	let responseTypeValidationService: ResponseTypeValidationService;
	let urlService: UrlService;
	let redirectService: RedirectService;
	let authWellKnownService: AuthWellKnownService;
	let flowsDataService: FlowsDataService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				StandardLoginService,
				mockProvider(LoggerService),
				mockProvider(ResponseTypeValidationService),
				mockProvider(UrlService),
				mockProvider(RedirectService),
				mockProvider(AuthWellKnownService),
				mockProvider(FlowsDataService),
			],
		});
		standardLoginService = TestBed.inject(StandardLoginService);
		loggerService = TestBed.inject(LoggerService);
		responseTypeValidationService = TestBed.inject(
			ResponseTypeValidationService,
		);
		standardLoginService = TestBed.inject(StandardLoginService);
		urlService = TestBed.inject(UrlService);
		redirectService = TestBed.inject(RedirectService);
		authWellKnownService = TestBed.inject(AuthWellKnownService);
		flowsDataService = TestBed.inject(FlowsDataService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(standardLoginService).toBeTruthy();
	});

	describe("loginStandard", () => {
		it("does nothing if it has an invalid response type", async () => {
			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(false);
			const loggerSpy = vi.spyOn(loggerService, "logError");

			const result = await firstValueFrom(
				standardLoginService.loginStandard({
					configId: "configId1",
				}),
			);

			expect(result).toBeUndefined();
			expect(loggerSpy).toHaveBeenCalled();
		});

		it("calls flowsDataService.setCodeFlowInProgress() if everything fits", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			const flowsDataSpy = vi.spyOn(flowsDataService, "setCodeFlowInProgress");

			const result = await firstValueFrom(
				standardLoginService.loginStandard(config),
			);

			expect(result).toBeUndefined();
			expect(flowsDataSpy).toHaveBeenCalled();
		});

		it("calls urlService.getAuthorizeUrl() if everything fits", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));

			const result = await firstValueFrom(
				standardLoginService.loginStandard(config),
			);

			expect(result).toBeUndefined();
		});

		it("redirects to URL with no URL handler", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			const redirectSpy = vi.spyOn(redirectService, "redirectTo");

			await firstValueFrom(standardLoginService.loginStandard(config));
			await vi.advanceTimersByTimeAsync(0);
			expect(redirectSpy).toHaveBeenCalledExactlyOnceWith("someUrl");
		});

		it("redirects to URL with URL handler when urlHandler is given", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			const redirectSpy = vi
				.spyOn(redirectService, "redirectTo")
				.mockImplementation(() => undefined);
			const spy = vi.fn();
			const urlHandler = (url: any): void => {
				spy(url);
			};

			await firstValueFrom(
				standardLoginService.loginStandard(config, { urlHandler }),
			);
			await vi.advanceTimersByTimeAsync(0);
			expect(spy).toHaveBeenCalledExactlyOnceWith("someUrl");
			expect(redirectSpy).not.toHaveBeenCalled();
		});

		it("calls resetSilentRenewRunning", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of("someUrl"));
			const flowsDataSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);

			await firstValueFrom(standardLoginService.loginStandard(config, {}));
			await vi.advanceTimersByTimeAsync(0);

			expect(flowsDataSpy).toHaveBeenCalled();
		});

		it("calls getAuthorizeUrl with custom params if they are given as parameter", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			const getAuthorizeUrlSpy = vi
				.spyOn(urlService, "getAuthorizeUrl")
				.mockReturnValue(of("someUrl"));
			const redirectSpy = vi
				.spyOn(redirectService, "redirectTo")
				.mockImplementation(() => undefined);

			await firstValueFrom(
				standardLoginService.loginStandard(config, {
					customParams: { to: "add", as: "well" },
				}),
			);
			await vi.advanceTimersByTimeAsync(0);
			expect(redirectSpy).toHaveBeenCalledExactlyOnceWith("someUrl");
			expect(getAuthorizeUrlSpy).toHaveBeenCalledExactlyOnceWith(config, {
				customParams: { to: "add", as: "well" },
			});
		});

		it("does nothing, logs only if getAuthorizeUrl returns falsy", async () => {
			const config = {
				authWellknownEndpointUrl: "authWellknownEndpoint",
				responseType: "stubValue",
			};

			vi.spyOn(
				responseTypeValidationService,
				"hasConfigValidResponseType",
			).mockReturnValue(true);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));
			const loggerSpy = vi.spyOn(loggerService, "logError");

			vi.spyOn(urlService, "getAuthorizeUrl").mockReturnValue(of(""));
			const redirectSpy = vi
				.spyOn(redirectService, "redirectTo")
				.mockImplementation(() => undefined);

			await firstValueFrom(standardLoginService.loginStandard(config));
			await vi.advanceTimersByTimeAsync(0);
			expect(loggerSpy).toHaveBeenCalledExactlyOnceWith(
				config,
				"Could not create URL",
				"",
			);
			expect(redirectSpy).not.toHaveBeenCalled();
		});
	});
});

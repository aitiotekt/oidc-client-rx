import {
	firstValueFrom,
	Observable,
	of,
	ReplaySubject,
	share,
	throwError,
} from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthStateService } from "../auth-state/auth-state.service";
import { ImplicitFlowCallbackService } from "../callback/implicit-flow-callback.service";
import { IntervalService } from "../callback/interval.service";
import type { CallbackContext } from "../flows/callback-context";
import { FlowsService } from "../flows/flows.service";
import { FlowsDataService } from "../flows/flows-data.service";
import { ResetAuthDataService } from "../flows/reset-auth-data.service";
import { LoggerService } from "../logging/logger.service";
import { mockProvider } from "../testing/mock";
import { FlowHelper } from "../utils/flowHelper/flow-helper.service";
import { ValidationResult } from "../validation/validation-result";
import { IFrameService } from "./existing-iframe.service";
import { SilentRenewService } from "./silent-renew.service";

describe("SilentRenewService  ", () => {
	let silentRenewService: SilentRenewService;
	let flowHelper: FlowHelper;
	let implicitFlowCallbackService: ImplicitFlowCallbackService;
	let iFrameService: IFrameService;
	let flowsDataService: FlowsDataService;
	let loggerService: LoggerService;
	let flowsService: FlowsService;
	let authStateService: AuthStateService;
	let resetAuthDataService: ResetAuthDataService;
	let intervalService: IntervalService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [
				SilentRenewService,
				IFrameService,
				mockProvider(FlowsService),
				mockProvider(ResetAuthDataService),
				mockProvider(FlowsDataService),
				mockProvider(AuthStateService),
				mockProvider(LoggerService),
				mockProvider(ImplicitFlowCallbackService),
				mockProvider(IntervalService),
				FlowHelper,
			],
		});
		silentRenewService = TestBed.inject(SilentRenewService);
		iFrameService = TestBed.inject(IFrameService);
		flowHelper = TestBed.inject(FlowHelper);
		implicitFlowCallbackService = TestBed.inject(ImplicitFlowCallbackService);
		flowsDataService = TestBed.inject(FlowsDataService);
		flowsService = TestBed.inject(FlowsService);
		loggerService = TestBed.inject(LoggerService);
		authStateService = TestBed.inject(AuthStateService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
		intervalService = TestBed.inject(IntervalService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(silentRenewService).toBeTruthy();
	});

	describe("refreshSessionWithIFrameCompleted", () => {
		it("is of type observable", () => {
			expect(silentRenewService.refreshSessionWithIFrameCompleted$).toEqual(
				expect.any(Observable),
			);
		});
	});

	describe("isSilentRenewConfigured", () => {
		it("returns true if refreshToken is configured false and silentRenew is configured true", () => {
			const config = { useRefreshToken: false, silentRenew: true };
			const result = silentRenewService.isSilentRenewConfigured(config);

			expect(result).toBe(true);
		});

		it("returns false if refreshToken is configured true and silentRenew is configured true", () => {
			const config = { useRefreshToken: true, silentRenew: true };

			const result = silentRenewService.isSilentRenewConfigured(config);

			expect(result).toBe(false);
		});

		it("returns false if refreshToken is configured false and silentRenew is configured false", () => {
			const config = { useRefreshToken: false, silentRenew: false };

			const result = silentRenewService.isSilentRenewConfigured(config);

			expect(result).toBe(false);
		});
	});

	describe("getOrCreateIframe", () => {
		it("returns iframe if iframe is truthy", () => {
			vi.spyOn(silentRenewService as any, "getExistingIframe").mockReturnValue({
				name: "anything",
			});

			const result = silentRenewService.getOrCreateIframe({
				configId: "configId1",
			});

			expect(result).toEqual({ name: "anything" } as HTMLIFrameElement);
		});

		it("adds iframe to body if existing iframe is falsy", () => {
			const config = { configId: "configId1" };

			vi.spyOn(silentRenewService as any, "getExistingIframe").mockReturnValue(
				null,
			);

			const spy = vi
				.spyOn(iFrameService, "addIFrameToWindowBody")
				.mockReturnValue({ name: "anything" } as HTMLIFrameElement);

			const result = silentRenewService.getOrCreateIframe(config);

			expect(result).toEqual({ name: "anything" } as HTMLIFrameElement);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"myiFrameForSilentRenew",
				config,
			);
		});
	});

	describe("codeFlowCallbackSilentRenewIframe", () => {
		it("calls processSilentRenewCodeFlowCallback with correct arguments", async () => {
			const config = { configId: "configId1" };
			const allConfigs = [config];

			const spy = vi
				.spyOn(flowsService, "processSilentRenewCodeFlowCallback")
				.mockReturnValue(of({} as CallbackContext));
			const expectedContext = {
				code: "some-code",
				refreshToken: "",
				state: "some-state",
				sessionState: "some-session-state",
				authResult: null,
				isRenewProcess: true,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: null,
			} as CallbackContext;
			const url = "url-part-1";
			const urlParts =
				"code=some-code&state=some-state&session_state=some-session-state";

			await firstValueFrom(
				silentRenewService.codeFlowCallbackSilentRenewIframe(
					[url, urlParts],
					config,
					allConfigs,
				),
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				expectedContext,
				config,
				allConfigs,
			);
		});

		it("throws error if url has error param and resets everything on error", async () => {
			const config = { configId: "configId1" };
			const allConfigs = [config];

			const spy = vi
				.spyOn(flowsService, "processSilentRenewCodeFlowCallback")
				.mockReturnValue(of({} as CallbackContext));
			const authStateServiceSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);
			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const setNonceSpy = vi.spyOn(flowsDataService, "setNonce");
			const stopPeriodicTokenCheckSpy = vi.spyOn(
				intervalService,
				"stopPeriodicTokenCheck",
			);

			const url = "url-part-1";
			const urlParts = "error=some_error";

			try {
				await firstValueFrom(
					silentRenewService.codeFlowCallbackSilentRenewIframe(
						[url, urlParts],
						config,
						allConfigs,
					),
				);
			} catch (error) {
				expect(error).toEqual(new Error("some_error"));
				expect(spy).not.toHaveBeenCalled();
				expect(authStateServiceSpy).toHaveBeenCalledExactlyOnceWith({
					isAuthenticated: false,
					validationResult: ValidationResult.LoginRequired,
					isRenewProcess: true,
				});
				expect(resetAuthorizationDataSpy).toHaveBeenCalledExactlyOnceWith(
					config,
					allConfigs,
				);
				expect(setNonceSpy).toHaveBeenCalledExactlyOnceWith("", config);
				expect(stopPeriodicTokenCheckSpy).toHaveBeenCalledTimes(1);
			}
		});
	});

	describe("silentRenewEventHandler", () => {
		it("returns if no details is given", async () => {
			const isCurrentFlowCodeFlowSpy = vi
				.spyOn(flowHelper, "isCurrentFlowCodeFlow")
				.mockReturnValue(false);

			vi.spyOn(
				implicitFlowCallbackService,
				"authenticatedImplicitFlowCallback",
			).mockReturnValue(of({} as CallbackContext));
			const eventData = { detail: null } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			silentRenewService.silentRenewEventHandler(
				eventData,
				allConfigs[0]!,
				allConfigs,
			);
			await vi.advanceTimersByTimeAsync(1000);
			expect(isCurrentFlowCodeFlowSpy).not.toHaveBeenCalled();
		});

		it("calls authorizedImplicitFlowCallback if current flow is not code flow", async () => {
			const isCurrentFlowCodeFlowSpy = vi
				.spyOn(flowHelper, "isCurrentFlowCodeFlow")
				.mockReturnValue(false);
			const authorizedImplicitFlowCallbackSpy = vi
				.spyOn(implicitFlowCallbackService, "authenticatedImplicitFlowCallback")
				.mockReturnValue(of({} as CallbackContext));
			const eventData = { detail: "detail" } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			silentRenewService.silentRenewEventHandler(
				eventData,
				allConfigs[0]!,
				allConfigs,
			);
			await vi.advanceTimersByTimeAsync(1000);
			expect(isCurrentFlowCodeFlowSpy).toHaveBeenCalled();
			expect(authorizedImplicitFlowCallbackSpy).toHaveBeenCalledExactlyOnceWith(
				allConfigs[0]!,
				allConfigs,
				"detail",
			);
		});

		it("calls codeFlowCallbackSilentRenewIframe if current flow is code flow", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			const codeFlowCallbackSilentRenewIframe = vi
				.spyOn(silentRenewService, "codeFlowCallbackSilentRenewIframe")
				.mockReturnValue(of({} as CallbackContext));
			const eventData = { detail: "detail?detail2" } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			silentRenewService.silentRenewEventHandler(
				eventData,
				allConfigs[0]!,
				allConfigs,
			);
			await vi.advanceTimersByTimeAsync(1000);
			expect(codeFlowCallbackSilentRenewIframe).toHaveBeenCalledExactlyOnceWith(
				["detail", "detail2"],
				allConfigs[0]!,
				allConfigs,
			);
		});

		it("calls authorizedImplicitFlowCallback if current flow is not code flow", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			const codeFlowCallbackSilentRenewIframe = vi
				.spyOn(silentRenewService, "codeFlowCallbackSilentRenewIframe")
				.mockReturnValue(of({} as CallbackContext));
			const eventData = { detail: "detail?detail2" } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			silentRenewService.silentRenewEventHandler(
				eventData,
				allConfigs[0]!,
				allConfigs,
			);
			await vi.advanceTimersByTimeAsync(1000);
			expect(codeFlowCallbackSilentRenewIframe).toHaveBeenCalledExactlyOnceWith(
				["detail", "detail2"],
				allConfigs[0]!,
				allConfigs,
			);
		});

		it("calls next on refreshSessionWithIFrameCompleted with callbackcontext", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			vi.spyOn(
				silentRenewService,
				"codeFlowCallbackSilentRenewIframe",
			).mockReturnValue(
				of({ refreshToken: "callbackContext" } as CallbackContext),
			);
			const eventData = { detail: "detail?detail2" } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			const test$ = silentRenewService.refreshSessionWithIFrameCompleted$.pipe(
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: true,
				}),
			);

			test$.subscribe();

			await firstValueFrom(
				silentRenewService.silentRenewEventHandler(
					eventData,
					allConfigs[0]!,
					allConfigs,
				),
			);
			await vi.advanceTimersByTimeAsync(1000);

			const result = await firstValueFrom(test$);

			expect(result).toEqual({
				refreshToken: "callbackContext",
			} as CallbackContext);
		});

		it("loggs and calls flowsDataService.resetSilentRenewRunning in case of an error", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			vi.spyOn(
				silentRenewService,
				"codeFlowCallbackSilentRenewIframe",
			).mockReturnValue(throwError(() => new Error("ERROR")));
			const resetSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);
			const logErrorSpy = vi.spyOn(loggerService, "logError");
			const allConfigs = [{ configId: "configId1" }];
			const eventData = { detail: "detail?detail2" } as CustomEvent;

			await firstValueFrom(
				silentRenewService.silentRenewEventHandler(
					eventData,
					allConfigs[0]!,
					allConfigs,
				),
			);
			await vi.advanceTimersByTimeAsync(1000);
			expect(resetSilentRenewRunningSpy).toHaveBeenCalledTimes(1);
			expect(logErrorSpy).toHaveBeenCalledTimes(1);
		});

		it("calls next on refreshSessionWithIFrameCompleted with null in case of error", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			vi.spyOn(
				silentRenewService,
				"codeFlowCallbackSilentRenewIframe",
			).mockReturnValue(throwError(() => new Error("ERROR")));
			const eventData = { detail: "detail?detail2" } as CustomEvent;
			const allConfigs = [{ configId: "configId1" }];

			const test$ = silentRenewService.refreshSessionWithIFrameCompleted$.pipe(
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: true,
				}),
			);

			test$.subscribe();

			await firstValueFrom(
				silentRenewService.silentRenewEventHandler(
					eventData,
					allConfigs[0]!,
					allConfigs,
				),
			);
			await vi.advanceTimersByTimeAsync(1000);

			const result = await firstValueFrom(test$);
			expect(result).toBeNull();
		});
	});
});

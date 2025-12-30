import { AbstractRouter } from "oidc-client-rx";
import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { mockRouterProvider, TestBed } from "@/testing";
import type { CallbackContext } from "../flows/callback-context";
import { FlowsService } from "../flows/flows.service";
import { FlowsDataService } from "../flows/flows-data.service";
import { mockProvider } from "../testing/mock";
import { ImplicitFlowCallbackService } from "./implicit-flow-callback.service";
import { IntervalService } from "./interval.service";

describe("ImplicitFlowCallbackService ", () => {
	let implicitFlowCallbackService: ImplicitFlowCallbackService;
	let intervalService: IntervalService;
	let flowsService: FlowsService;
	let flowsDataService: FlowsDataService;
	let router: AbstractRouter;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				ImplicitFlowCallbackService,
				mockRouterProvider(),
				mockProvider(FlowsService),
				mockProvider(FlowsDataService),
				mockProvider(IntervalService),
			],
		});
		implicitFlowCallbackService = TestBed.inject(ImplicitFlowCallbackService);
		intervalService = TestBed.inject(IntervalService);
		flowsDataService = TestBed.inject(FlowsDataService);
		flowsService = TestBed.inject(FlowsService);
		router = TestBed.inject(AbstractRouter);
	});

	it("should create", () => {
		expect(implicitFlowCallbackService).toBeTruthy();
	});

	describe("authorizedImplicitFlowCallback", () => {
		it("calls flowsService.processImplicitFlowCallback with hash if given", () => {
			const spy = vi
				.spyOn(flowsService, "processImplicitFlowCallback")
				.mockReturnValue(of({} as CallbackContext));
			const config = {
				configId: "configId1",
				triggerAuthorizationResultEvent: true,
			};

			implicitFlowCallbackService.authenticatedImplicitFlowCallback(
				config,
				[config],
				"some-hash",
			);

			expect(spy).toHaveBeenCalledExactlyOnceWith(
				config,
				[config],
				"some-hash",
			);
		});

		it("does nothing if triggerAuthorizationResultEvent is true and isRenewProcess is true", async () => {
			const callbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: null,
				isRenewProcess: true,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: "",
			};
			const spy = vi
				.spyOn(flowsService, "processImplicitFlowCallback")
				.mockReturnValue(of(callbackContext));
			const routerSpy = vi.spyOn(router, "navigateByUrl");
			const config = {
				configId: "configId1",
				triggerAuthorizationResultEvent: true,
			};

			await firstValueFrom(
				implicitFlowCallbackService.authenticatedImplicitFlowCallback(
					config,
					[config],
					"some-hash",
				),
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				config,
				[config],
				"some-hash",
			);
			expect(routerSpy).not.toHaveBeenCalled();
		});

		it("calls router if triggerAuthorizationResultEvent is false and isRenewProcess is false", async () => {
			const callbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: null,
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: "",
			};
			const spy = vi
				.spyOn(flowsService, "processImplicitFlowCallback")
				.mockReturnValue(of(callbackContext));
			const routerSpy = vi.spyOn(router, "navigateByUrl");
			const config = {
				configId: "configId1",
				triggerAuthorizationResultEvent: false,
				postLoginRoute: "postLoginRoute",
			};

			await firstValueFrom(
				implicitFlowCallbackService.authenticatedImplicitFlowCallback(
					config,
					[config],
					"some-hash",
				),
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				config,
				[config],
				"some-hash",
			);
			expect(routerSpy).toHaveBeenCalledExactlyOnceWith("postLoginRoute");
		});

		it("resetSilentRenewRunning and stopPeriodicallyTokenCheck in case of error", async () => {
			vi.spyOn(flowsService, "processImplicitFlowCallback").mockReturnValue(
				throwError(() => new Error("error")),
			);
			const resetSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);
			const stopPeriodicallyTokenCheckSpy = vi.spyOn(
				intervalService,
				"stopPeriodicTokenCheck",
			);
			const config = {
				configId: "configId1",
				triggerAuthorizationResultEvent: false,
				postLoginRoute: "postLoginRoute",
			};

			try {
				await firstValueFrom(
					implicitFlowCallbackService.authenticatedImplicitFlowCallback(
						config,
						[config],
						"some-hash",
					),
				);
			} catch (err: any) {
				expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
				expect(stopPeriodicallyTokenCheckSpy).toHaveBeenCalled();
				expect(err).toBeTruthy();
			}
		});

		it(`navigates to unauthorizedRoute in case of error and  in case of error and
        triggerAuthorizationResultEvent is false`, async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(false);
			vi.spyOn(flowsService, "processImplicitFlowCallback").mockReturnValue(
				throwError(() => new Error("error")),
			);
			const resetSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);
			const stopPeriodicallTokenCheckSpy = vi.spyOn(
				intervalService,
				"stopPeriodicTokenCheck",
			);
			const routerSpy = vi.spyOn(router, "navigateByUrl");
			const config = {
				configId: "configId1",
				triggerAuthorizationResultEvent: false,
				unauthorizedRoute: "unauthorizedRoute",
			};

			try {
				await firstValueFrom(
					implicitFlowCallbackService.authenticatedImplicitFlowCallback(
						config,
						[config],
						"some-hash",
					),
				);
			} catch (err: any) {
				expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
				expect(stopPeriodicallTokenCheckSpy).toHaveBeenCalled();
				expect(err).toBeTruthy();
				expect(routerSpy).toHaveBeenCalledExactlyOnceWith("unauthorizedRoute");
			}
		});
	});
});

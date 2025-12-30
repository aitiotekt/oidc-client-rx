import { firstValueFrom } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { DOCUMENT } from "../../dom";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import type { CallbackContext } from "../callback-context";
import { FlowsDataService } from "../flows-data.service";
import { ResetAuthDataService } from "../reset-auth-data.service";
import { ImplicitFlowCallbackHandlerService } from "./implicit-flow-callback-handler.service";

describe("ImplicitFlowCallbackHandlerService", () => {
	let service: ImplicitFlowCallbackHandlerService;
	let flowsDataService: FlowsDataService;
	let resetAuthDataService: ResetAuthDataService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ImplicitFlowCallbackHandlerService,
				mockProvider(FlowsDataService),
				mockProvider(ResetAuthDataService),
				mockProvider(LoggerService),
				{
					provide: DOCUMENT,
					useValue: {
						location: {
							get hash(): string {
								return "&anyFakeHash";
							},
							set hash(_value) {
								// ...
							},
						},
					},
				},
			],
		});
		service = TestBed.inject(ImplicitFlowCallbackHandlerService);
		flowsDataService = TestBed.inject(FlowsDataService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("implicitFlowCallback", () => {
		it('calls "resetAuthorizationData" if silent renew is not running', async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(false);
			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			await firstValueFrom(
				service.implicitFlowCallback(allConfigs[0]!, allConfigs, "any-hash"),
			);
			expect(resetAuthorizationDataSpy).toHaveBeenCalled();
		});

		it('does NOT calls "resetAuthorizationData" if silent renew is running', async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(true);
			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			await firstValueFrom(
				service.implicitFlowCallback(allConfigs[0]!, allConfigs, "any-hash"),
			);
			expect(resetAuthorizationDataSpy).not.toHaveBeenCalled();
		});

		it("returns callbackContext if all params are good", async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(true);
			const expectedCallbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: { anyHash: "" },
				isRenewProcess: true,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			const callbackContext = await firstValueFrom(
				service.implicitFlowCallback(allConfigs[0]!, allConfigs, "anyHash"),
			);
			expect(callbackContext).toEqual(expectedCallbackContext);
		});

		it("uses window location hash if no hash is passed", async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(true);
			const expectedCallbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: { anyFakeHash: "" },
				isRenewProcess: true,
				jwtKeys: null,
				validationResult: null,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			const callbackContext = await firstValueFrom(
				service.implicitFlowCallback(allConfigs[0]!, allConfigs),
			);
			expect(callbackContext).toEqual(expectedCallbackContext);
		});
	});
});

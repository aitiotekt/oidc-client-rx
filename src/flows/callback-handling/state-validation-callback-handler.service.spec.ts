import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthStateService } from "../../auth-state/auth-state.service";
import { DOCUMENT } from "../../dom";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import { StateValidationService } from "../../validation/state-validation.service";
import type { StateValidationResult } from "../../validation/state-validation-result";
import { ValidationResult } from "../../validation/validation-result";
import type { CallbackContext } from "../callback-context";
import { ResetAuthDataService } from "../reset-auth-data.service";
import { StateValidationCallbackHandlerService } from "./state-validation-callback-handler.service";

describe("StateValidationCallbackHandlerService", () => {
	let service: StateValidationCallbackHandlerService;
	let stateValidationService: StateValidationService;
	let loggerService: LoggerService;
	let authStateService: AuthStateService;
	let resetAuthDataService: ResetAuthDataService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				StateValidationCallbackHandlerService,
				mockProvider(LoggerService),
				mockProvider(StateValidationService),
				mockProvider(AuthStateService),
				mockProvider(ResetAuthDataService),
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
		service = TestBed.inject(StateValidationCallbackHandlerService);
		stateValidationService = TestBed.inject(StateValidationService);
		loggerService = TestBed.inject(LoggerService);
		authStateService = TestBed.inject(AuthStateService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("callbackStateValidation", () => {
		it("returns callbackContext with validationResult if validationResult is valid", async () => {
			vi.spyOn(
				stateValidationService,
				"getValidatedStateResult",
			).mockReturnValue(
				of({
					idToken: "idTokenJustForTesting",
					authResponseIsValid: true,
				} as StateValidationResult),
			);
			const allConfigs = [{ configId: "configId1" }];

			const newCallbackContext = await firstValueFrom(
				service.callbackStateValidation(
					{} as CallbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(newCallbackContext).toEqual({
				validationResult: {
					idToken: "idTokenJustForTesting",
					authResponseIsValid: true,
				},
			} as CallbackContext);
		});

		it("logs error in case of an error", async () => {
			vi.spyOn(
				stateValidationService,
				"getValidatedStateResult",
			).mockReturnValue(
				of({
					authResponseIsValid: false,
				} as StateValidationResult),
			);

			const loggerSpy = vi.spyOn(loggerService, "logWarning");
			const allConfigs = [{ configId: "configId1" }];

			try {
				await firstValueFrom(
					service.callbackStateValidation(
						{} as CallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch {
				expect(loggerSpy).toHaveBeenCalledExactlyOnceWith(
					allConfigs[0]!,
					"authorizedCallback, token(s) validation failed, resetting. Hash: &anyFakeHash",
				);
			}
		});

		it("calls resetAuthDataService.resetAuthorizationData and authStateService.updateAndPublishAuthState in case of an error", async () => {
			vi.spyOn(
				stateValidationService,
				"getValidatedStateResult",
			).mockReturnValue(
				of({
					authResponseIsValid: false,
					state: ValidationResult.LoginRequired,
				} as StateValidationResult),
			);

			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);
			const allConfigs = [{ configId: "configId1" }];

			try {
				await firstValueFrom(
					service.callbackStateValidation(
						{ isRenewProcess: true } as CallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch {
				expect(resetAuthorizationDataSpy).toHaveBeenCalledTimes(1);
				expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
					isAuthenticated: false,
					validationResult: ValidationResult.LoginRequired,
					isRenewProcess: true,
				});
			}
		});
	});
});

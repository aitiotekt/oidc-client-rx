import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthStateService } from "../../auth-state/auth-state.service";
import { LoggerService } from "../../logging/logger.service";
import { StoragePersistenceService } from "../../storage/storage-persistence.service";
import { mockProvider } from "../../testing/mock";
import type { JwtKey, JwtKeys } from "../../validation/jwtkeys";
import { ValidationResult } from "../../validation/validation-result";
import type { AuthResult, CallbackContext } from "../callback-context";
import { FlowsDataService } from "../flows-data.service";
import { ResetAuthDataService } from "../reset-auth-data.service";
import { SigninKeyDataService } from "../signin-key-data.service";
import { HistoryJwtKeysCallbackHandlerService } from "./history-jwt-keys-callback-handler.service";

const DUMMY_JWT_KEYS: JwtKeys = {
	keys: [
		{
			kty: "some-value1",
			use: "some-value2",
			kid: "some-value3",
			x5t: "some-value4",
			e: "some-value5",
			n: "some-value6",
			x5c: ["some-value7"],
		},
	],
};

describe("HistoryJwtKeysCallbackHandlerService", () => {
	let service: HistoryJwtKeysCallbackHandlerService;
	let storagePersistenceService: StoragePersistenceService;
	let signInKeyDataService: SigninKeyDataService;
	let resetAuthDataService: ResetAuthDataService;
	let flowsDataService: FlowsDataService;
	let authStateService: AuthStateService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				HistoryJwtKeysCallbackHandlerService,
				mockProvider(LoggerService),
				mockProvider(AuthStateService),
				mockProvider(FlowsDataService),
				mockProvider(SigninKeyDataService),
				mockProvider(StoragePersistenceService),
				mockProvider(ResetAuthDataService),
			],
		});
		service = TestBed.inject(HistoryJwtKeysCallbackHandlerService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
		signInKeyDataService = TestBed.inject(SigninKeyDataService);
		flowsDataService = TestBed.inject(FlowsDataService);
		authStateService = TestBed.inject(AuthStateService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("callbackHistoryAndResetJwtKeys", () => {
		it("writes authResult into the storage", async () => {
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);
			const DUMMY_AUTH_RESULT = {
				refresh_token: "dummy_refresh_token",
				id_token: "some-id-token",
			};

			const callbackContext = {
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({ keys: [] } as JwtKeys),
			);
			await firstValueFrom(
				service.callbackHistoryAndResetJwtKeys(
					callbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(storagePersistenceServiceSpy.mock.calls).toEqual([
				["authnResult", DUMMY_AUTH_RESULT, allConfigs[0]],
				["jwtKeys", { keys: [] }, allConfigs[0]],
			]);
			expect(storagePersistenceServiceSpy).toHaveBeenCalledTimes(2);
		});

		it("writes refresh_token into the storage without reuse (refresh token rotation)", async () => {
			const DUMMY_AUTH_RESULT = {
				refresh_token: "dummy_refresh_token",
				id_token: "some-id-token",
			};

			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);
			const callbackContext = {
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({ keys: [] } as JwtKeys),
			);

			await firstValueFrom(
				service.callbackHistoryAndResetJwtKeys(
					callbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(storagePersistenceServiceSpy.mock.calls).toEqual([
				["authnResult", DUMMY_AUTH_RESULT, allConfigs[0]],
				["jwtKeys", { keys: [] }, allConfigs[0]],
			]);
			expect(storagePersistenceServiceSpy).toHaveBeenCalledTimes(2);
		});

		it("writes refresh_token into the storage with reuse (without refresh token rotation)", async () => {
			const DUMMY_AUTH_RESULT = {
				refresh_token: "dummy_refresh_token",
				id_token: "some-id-token",
			};

			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);
			const callbackContext = {
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
					allowUnsafeReuseRefreshToken: true,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({ keys: [] } as JwtKeys),
			);
			await firstValueFrom(
				service.callbackHistoryAndResetJwtKeys(
					callbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(storagePersistenceServiceSpy.mock.calls).toEqual([
				["authnResult", DUMMY_AUTH_RESULT, allConfigs[0]],
				["reusable_refresh_token", "dummy_refresh_token", allConfigs[0]],
				["jwtKeys", { keys: [] }, allConfigs[0]],
			]);
			expect(storagePersistenceServiceSpy).toHaveBeenCalledTimes(3);
		});

		it("resetBrowserHistory if historyCleanup is turned on and is not in a renewProcess", async () => {
			const DUMMY_AUTH_RESULT = {
				id_token: "some-id-token",
			};
			const callbackContext = {
				isRenewProcess: false,
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: false,
				},
			];

			const windowSpy = vi.spyOn(window.history, "replaceState");

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({ keys: [] } as JwtKeys),
			);
			await firstValueFrom(
				service.callbackHistoryAndResetJwtKeys(
					callbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(windowSpy).toHaveBeenCalledTimes(1);
		});

		it("returns callbackContext with jwtkeys filled if everything works fine", async () => {
			const DUMMY_AUTH_RESULT = {
				id_token: "some-id-token",
			};

			const callbackContext = {
				isRenewProcess: false,
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: false,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({ keys: [{ kty: "henlo" } as JwtKey] } as JwtKeys),
			);
			const result = await firstValueFrom(
				service.callbackHistoryAndResetJwtKeys(
					callbackContext,
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(result).toEqual({
				isRenewProcess: false,
				authResult: DUMMY_AUTH_RESULT,
				jwtKeys: { keys: [{ kty: "henlo" }] },
			} as CallbackContext);
		});

		it("returns error if no jwtKeys have been in the call --> keys are null", async () => {
			const DUMMY_AUTH_RESULT = {
				id_token: "some-id-token",
			};

			const callbackContext = {
				isRenewProcess: false,
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: false,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of({} as JwtKeys),
			);
			try {
				await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						callbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch (err: any) {
				expect(err.message).toEqual(
					"Failed to retrieve signing key with error: Error: Failed to retrieve signing key",
				);
			}
		});

		it("returns error if no jwtKeys have been in the call --> keys throw an error", async () => {
			const DUMMY_AUTH_RESULT = {
				id_token: "some-id-token",
			};
			const callbackContext = {
				isRenewProcess: false,
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: false,
				},
			];

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				throwError(() => new Error("error")),
			);
			try {
				await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						callbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch (err: any) {
				expect(err.message).toEqual(
					"Failed to retrieve signing key with error: Error: Error: error",
				);
			}
		});

		it("returns error if callbackContext.authresult has an error property filled", async () => {
			const callbackContext = {
				authResult: { error: "someError" },
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			try {
				await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						callbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch (err: any) {
				expect(err.message).toEqual(
					"AuthCallback AuthResult came with error: someError",
				);
			}
		});

		it("calls resetAuthorizationData, resets nonce and authStateService in case of an error", async () => {
			const callbackContext = {
				authResult: { error: "someError" },
				isRenewProcess: false,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const setNonceSpy = vi.spyOn(flowsDataService, "setNonce");
			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);

			try {
				await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						callbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch {
				expect(resetAuthorizationDataSpy).toHaveBeenCalledTimes(1);
				expect(setNonceSpy).toHaveBeenCalledTimes(1);
				expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
					isAuthenticated: false,
					validationResult: ValidationResult.SecureTokenServerError,
					isRenewProcess: false,
				});
			}
		});

		it("calls authStateService.updateAndPublishAuthState with login required if the error is `login_required`", async () => {
			const callbackContext = {
				authResult: { error: "login_required" },
				isRenewProcess: false,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);
			const setNonceSpy = vi.spyOn(flowsDataService, "setNonce");
			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);

			try {
				await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						callbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch {
				expect(resetAuthorizationDataSpy).toHaveBeenCalledTimes(1);
				expect(setNonceSpy).toHaveBeenCalledTimes(1);
				expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
					isAuthenticated: false,
					validationResult: ValidationResult.LoginRequired,
					isRenewProcess: false,
				});
			}
		});

		it("should store jwtKeys", async () => {
			const DUMMY_AUTH_RESULT = {
				id_token: "some-id-token",
			};

			const initialCallbackContext = {
				authResult: DUMMY_AUTH_RESULT,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				of(DUMMY_JWT_KEYS),
			);

			try {
				const callbackContext: CallbackContext = await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						initialCallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
				expect(storagePersistenceServiceSpy).toHaveBeenCalledTimes(2);
				expect(storagePersistenceServiceSpy.mock.calls).toEqual([
					["authnResult", DUMMY_AUTH_RESULT, allConfigs[0]],
					["jwtKeys", DUMMY_JWT_KEYS, allConfigs[0]],
				]);
				expect(callbackContext.jwtKeys).toEqual(DUMMY_JWT_KEYS);
			} catch (err: any) {
				expect(err).toBeFalsy();
			}
		});

		it("should not store jwtKeys on error", async () => {
			const authResult = {
				id_token: "some-id-token",
				access_token: "some-access-token",
			} as AuthResult;
			const initialCallbackContext = {
				authResult,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);

			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				throwError(() => new Error("Error")),
			);

			try {
				const callbackContext: CallbackContext = await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						initialCallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
				expect(callbackContext).toBeFalsy();
			} catch (err: any) {
				expect(err).toBeTruthy();
				expect(storagePersistenceServiceSpy).toHaveBeenCalledExactlyOnceWith(
					"authnResult",
					authResult,
					allConfigs[0],
				);
			}
		});

		it("should fallback to stored jwtKeys on error", async () => {
			const authResult = {
				id_token: "some-id-token",
				access_token: "some-access-token",
			} as AuthResult;
			const initialCallbackContext = {
				authResult,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"read",
			);

			storagePersistenceServiceSpy.mockReturnValue(DUMMY_JWT_KEYS);
			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				throwError(() => new Error("Error")),
			);

			try {
				const callbackContext: CallbackContext = await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						initialCallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
				expect(storagePersistenceServiceSpy).toHaveBeenCalledExactlyOnceWith(
					"jwtKeys",
					allConfigs[0],
				);
				expect(callbackContext.jwtKeys).toEqual(DUMMY_JWT_KEYS);
			} catch (err: any) {
				expect(err).toBeFalsy();
			}
		});

		it("should throw error if no jwtKeys are stored", async () => {
			const authResult = {
				id_token: "some-id-token",
				access_token: "some-access-token",
			} as AuthResult;

			const initialCallbackContext = { authResult } as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					historyCleanupOff: true,
				},
			];

			vi.spyOn(storagePersistenceService, "read").mockReturnValue(null);
			vi.spyOn(signInKeyDataService, "getSigningKeys").mockReturnValue(
				throwError(() => new Error("Error")),
			);

			try {
				const callbackContext: CallbackContext = await firstValueFrom(
					service.callbackHistoryAndResetJwtKeys(
						initialCallbackContext,
						allConfigs[0]!,
						allConfigs,
					),
				);
				expect(callbackContext).toBeFalsy();
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});
	});

	describe("historyCleanUpTurnedOn ", () => {
		it("check for false if historyCleanUpTurnedOn is on", () => {
			const config = {
				configId: "configId1",
				historyCleanupOff: true,
			};

			const value = (service as any).historyCleanUpTurnedOn(config);

			expect(value).toEqual(false);
		});

		it("check for true if historyCleanUpTurnedOn is off", () => {
			const config = {
				configId: "configId1",
				historyCleanupOff: false,
			};

			const value = (service as any).historyCleanUpTurnedOn(config);

			expect(value).toEqual(true);
		});
	});
});

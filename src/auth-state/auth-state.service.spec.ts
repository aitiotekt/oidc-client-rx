import { Observable } from "rxjs";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { LoggerService } from "../logging/logger.service";
import { EventTypes } from "../public-events/event-types";
import { PublicEventsService } from "../public-events/public-events.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockProvider } from "../testing/mock";
import { PlatformProvider } from "../utils/platform-provider/platform.provider";
import { TokenValidationService } from "../validation/token-validation.service";
import type { ValidationResult } from "../validation/validation-result";
import { AuthStateService } from "./auth-state.service";

describe("Auth State Service", () => {
	let authStateService: AuthStateService;
	let storagePersistenceService: StoragePersistenceService;
	let eventsService: PublicEventsService;
	let tokenValidationService: TokenValidationService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AuthStateService,
				PublicEventsService,
				mockProvider(LoggerService),
				mockProvider(TokenValidationService),
				mockProvider(PlatformProvider),
				mockProvider(StoragePersistenceService),
			],
		});
		authStateService = TestBed.inject(AuthStateService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		eventsService = TestBed.inject(PublicEventsService);
		tokenValidationService = TestBed.inject(TokenValidationService);
	});

	it("should create", () => {
		expect(authStateService).toBeTruthy();
	});

	it("authorize$ is observable$", () => {
		expect(authStateService.authenticated$).toBeInstanceOf(Observable);
	});

	describe("setAuthorizedAndFireEvent", () => {
		it("throws correct event with single config", () => {
			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setAuthenticatedAndFireEvent([
				{ configId: "configId1" },
			]);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: true,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: true },
				],
			});
		});

		it("throws correct event with multiple configs", () => {
			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setAuthenticatedAndFireEvent([
				{ configId: "configId1" },
				{ configId: "configId2" },
			]);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: false,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: false },
					{ configId: "configId2", isAuthenticated: false },
				],
			});
		});

		it("throws correct event with multiple configs, one is authenticated", () => {
			const allConfigs = [{ configId: "configId1" }, { configId: "configId2" }];

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "getAccessToken"),
					[allConfigs[0]!],
					() => "someAccessToken",
				),
				[allConfigs[1]!],
				() => "",
			);

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "getIdToken"),
					[allConfigs[0]!],
					() => "someIdToken",
				),
				[allConfigs[1]!],
				() => "",
			);

			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setAuthenticatedAndFireEvent(allConfigs);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: false,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: true },
					{ configId: "configId2", isAuthenticated: false },
				],
			});
		});
	});

	describe("setUnauthorizedAndFireEvent", () => {
		it("persist AuthState In Storage", () => {
			const spy = vi.spyOn(
				storagePersistenceService,
				"resetAuthStateInStorage",
			);

			authStateService.setUnauthenticatedAndFireEvent(
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith({ configId: "configId1" });
		});

		it("throws correct event with single config", () => {
			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setUnauthenticatedAndFireEvent(
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: false,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: false },
				],
			});
		});

		it("throws correct event with multiple configs", () => {
			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setUnauthenticatedAndFireEvent(
				{ configId: "configId1" },
				[{ configId: "configId1" }, { configId: "configId2" }],
			);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: false,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: false },
					{ configId: "configId2", isAuthenticated: false },
				],
			});
		});

		it("throws correct event with multiple configs, one is authenticated", () => {
			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "getAccessToken"),
					[{ configId: "configId1" }],
					() => "someAccessToken",
				),
				[{ configId: "configId2" }],
				() => "",
			);

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "getIdToken"),
					[{ configId: "configId1" }],
					() => "someIdToken",
				),
				[{ configId: "configId2" }],
				() => "",
			);

			const spy = vi.spyOn(
				(authStateService as any).authenticatedInternal$,
				"next",
			);

			authStateService.setUnauthenticatedAndFireEvent(
				{ configId: "configId1" },
				[{ configId: "configId1" }, { configId: "configId2" }],
			);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: false,
				allConfigsAuthenticated: [
					{ configId: "configId1", isAuthenticated: true },
					{ configId: "configId2", isAuthenticated: false },
				],
			});
		});
	});

	describe("updateAndPublishAuthState", () => {
		it("calls eventsService", () => {
			vi.spyOn(eventsService, "fireEvent");

			const arg = {
				isAuthenticated: false,
				isRenewProcess: false,
				validationResult: {} as ValidationResult,
			};

			authStateService.updateAndPublishAuthState(arg);

			expect(eventsService.fireEvent).toHaveBeenCalledOnce();
			expect(eventsService.fireEvent).toHaveBeenCalledExactlyOnceWith(
				EventTypes.NewAuthenticationResult,
				arg,
			);
		});
	});

	describe("setAuthorizationData", () => {
		it("stores accessToken", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");
			const authResult = {
				id_token: "idtoken",
				access_token: "accesstoken",
				expires_in: 330,
				token_type: "Bearer",
				refresh_token: "9UuSQKx_UaGJSEvfHW2NK6FxAPSVvK-oVyeOb1Sstz0",
				scope: "openid profile email taler_api offline_access",
				state: "7bad349c97cd7391abb6dfc41ec8c8e8ee8yeprJL",
				session_state:
					"gjNckdb8h4HS5us_3oz68oqsAhvNMOMpgsJNqrhy7kM.rBe66j0WPYpSx_c4vLM-5w",
			};

			authStateService.setAuthorizationData(
				"accesstoken",
				authResult,
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls).toEqual([
				["authzData", "accesstoken", { configId: "configId1" }],
				[
					"access_token_expires_at",
					expect.any(Number),
					{ configId: "configId1" },
				],
			]);
		});

		it("does not crash and store accessToken when authResult is null", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");
			const authResult = null;

			authStateService.setAuthorizationData(
				"accesstoken",
				authResult,
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);

			expect(spy).toHaveBeenCalledTimes(1);
		});

		it("calls setAuthenticatedAndFireEvent() method", () => {
			const spy = vi.spyOn(authStateService, "setAuthenticatedAndFireEvent");
			const authResult = {
				id_token: "idtoken",
				access_token: "accesstoken",
				expires_in: 330,
				token_type: "Bearer",
				refresh_token: "9UuSQKx_UaGJSEvfHW2NK6FxAPSVvK-oVyeOb1Sstz0",
				scope: "openid profile email taler_api offline_access",
				state: "7bad349c97cd7391abb6dfc41ec8c8e8ee8yeprJL",
				session_state:
					"gjNckdb8h4HS5us_3oz68oqsAhvNMOMpgsJNqrhy7kM.rBe66j0WPYpSx_c4vLM-5w",
			};

			authStateService.setAuthorizationData(
				"not used",
				authResult,
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);

			expect(spy).toHaveBeenCalled();
		});
	});

	describe("getAccessToken", () => {
		it("isAuthorized is false returns null", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue("");
			const result = authStateService.getAccessToken({ configId: "configId1" });

			expect(result).toBe("");
		});

		it("returns false if storagePersistenceService returns something falsy but authorized", () => {
			vi.spyOn(authStateService, "isAuthenticated").mockReturnValue(true);
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			const result = authStateService.getAccessToken({ configId: "configId1" });

			expect(result).toBe("");
		});

		it("isAuthorized is true returns decodeURIComponent(token)", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			const result = authStateService.getAccessToken({ configId: "configId1" });

			expect(result).toBe(decodeURIComponent("HenloLegger"));
		});
	});

	describe("getAuthenticationResult", () => {
		it("isAuthorized is false returns null", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue("");

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "getAuthenticationResult"),
				[{ configId: "configId1" }],
				() => ({}),
			);

			const result = authStateService.getAuthenticationResult({
				configId: "configId1",
			});

			expect(result).toBe(null);
		});

		it("returns false if storagePersistenceService returns something falsy but authorized", () => {
			vi.spyOn(authStateService, "isAuthenticated").mockReturnValue(true);

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "getAuthenticationResult"),
				[{ configId: "configId1" }],
				() => ({}),
			);

			const result = authStateService.getAuthenticationResult({
				configId: "configId1",
			});

			expect(result).toEqual({});
		});

		it("isAuthorized is true returns object", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "getAuthenticationResult"),
				[{ configId: "configId1" }],
				() => ({ scope: "HenloFuriend" }),
			);

			const result = authStateService.getAuthenticationResult({
				configId: "configId1",
			});

			expect(result?.scope).toBe("HenloFuriend");
		});
	});

	describe("getIdToken", () => {
		it("isAuthorized is false returns null", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue("");
			const result = authStateService.getIdToken({ configId: "configId1" });

			expect(result).toBe("");
		});

		it("isAuthorized is true returns decodeURIComponent(token)", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);
			const result = authStateService.getIdToken({ configId: "configId1" });

			expect(result).toBe(decodeURIComponent("HenloFuriend"));
		});
	});

	describe("getRefreshToken", () => {
		it("isAuthorized is false returns null", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue("");
			const result = authStateService.getRefreshToken({
				configId: "configId1",
			});

			expect(result).toBe("");
		});

		it("isAuthorized is true returns decodeURIComponent(token)", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);
			vi.spyOn(storagePersistenceService, "getRefreshToken").mockReturnValue(
				"HenloRefreshLegger",
			);
			const result = authStateService.getRefreshToken({
				configId: "configId1",
			});

			expect(result).toBe(decodeURIComponent("HenloRefreshLegger"));
		});
	});

	describe("areAuthStorageTokensValid", () => {
		it("isAuthorized is false returns false", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue("");
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue("");
			const result = authStateService.areAuthStorageTokensValid({
				configId: "configId1",
			});

			expect(result).toBeFalsy();
		});

		it("isAuthorized is true and id_token is expired returns true", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			vi.spyOn(
				authStateService as any,
				"hasIdTokenExpiredAndRenewCheckIsEnabled",
			).mockReturnValue(true);
			vi.spyOn(
				authStateService as any,
				"hasAccessTokenExpiredIfExpiryExists",
			).mockReturnValue(false);
			const result = authStateService.areAuthStorageTokensValid({
				configId: "configId1",
			});

			expect(result).toBeFalsy();
		});

		it("isAuthorized is true  and access_token is expired returns true", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			vi.spyOn(
				authStateService as any,
				"hasIdTokenExpiredAndRenewCheckIsEnabled",
			).mockReturnValue(false);
			vi.spyOn(
				authStateService as any,
				"hasAccessTokenExpiredIfExpiryExists",
			).mockReturnValue(true);
			const result = authStateService.areAuthStorageTokensValid({
				configId: "configId1",
			});

			expect(result).toBeFalsy();
		});

		it("isAuthorized is true  and id_token is not expired returns true", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			vi.spyOn(
				authStateService as any,
				"hasIdTokenExpiredAndRenewCheckIsEnabled",
			).mockReturnValue(false);
			vi.spyOn(
				authStateService as any,
				"hasAccessTokenExpiredIfExpiryExists",
			).mockReturnValue(false);
			const result = authStateService.areAuthStorageTokensValid({
				configId: "configId1",
			});

			expect(result).toBeTruthy();
		});

		it("authState is AuthorizedState.Authorized and id_token is not expired fires event", () => {
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"HenloLegger",
			);
			vi.spyOn(storagePersistenceService, "getIdToken").mockReturnValue(
				"HenloFuriend",
			);

			vi.spyOn(
				authStateService as any,
				"hasIdTokenExpiredAndRenewCheckIsEnabled",
			).mockReturnValue(false);
			vi.spyOn(
				authStateService as any,
				"hasAccessTokenExpiredIfExpiryExists",
			).mockReturnValue(false);
			const result = authStateService.areAuthStorageTokensValid({
				configId: "configId1",
			});

			expect(result).toBeTruthy();
		});
	});

	describe("hasIdTokenExpiredAndRenewCheckIsEnabled", () => {
		it("tokenValidationService gets called with id token if id_token is set", () => {
			const config = {
				configId: "configId1",
				renewTimeBeforeTokenExpiresInSeconds: 30,
				triggerRefreshWhenIdTokenExpired: true,
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "getIdToken"),
				[config],
				() => "idToken",
			);
			const spy = vi
				.spyOn(tokenValidationService, "hasIdTokenExpired")
				.mockImplementation((_a, _b) => true);

			authStateService.hasIdTokenExpiredAndRenewCheckIsEnabled(config);

			expect(spy).toHaveBeenCalledExactlyOnceWith("idToken", config, 30);
		});

		it("fires event if idToken is expired", () => {
			vi.spyOn(tokenValidationService, "hasIdTokenExpired").mockImplementation(
				(_a, _b) => true,
			);

			const spy = vi.spyOn(eventsService, "fireEvent");
			const config = {
				configId: "configId1",
				renewTimeBeforeTokenExpiresInSeconds: 30,
				triggerRefreshWhenIdTokenExpired: true,
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authnResult", config],
				() => "idToken",
			);

			const result =
				authStateService.hasIdTokenExpiredAndRenewCheckIsEnabled(config);

			expect(result).toBe(true);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				EventTypes.IdTokenExpired,
				true,
			);
		});

		it("does NOT fire event if idToken is NOT expired", () => {
			vi.spyOn(tokenValidationService, "hasIdTokenExpired").mockImplementation(
				(_a, _b) => false,
			);

			const spy = vi.spyOn(eventsService, "fireEvent");
			const config = {
				configId: "configId1",
				renewTimeBeforeTokenExpiresInSeconds: 30,
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authnResult", config],
				() => "idToken",
			);

			const result =
				authStateService.hasIdTokenExpiredAndRenewCheckIsEnabled(config);

			expect(result).toBe(false);
			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe("hasAccessTokenExpiredIfExpiryExists", () => {
		it("negates the result of internal call of `validateAccessTokenNotExpired`", () => {
			const validateAccessTokenNotExpiredResult = true;
			const expectedResult = !validateAccessTokenNotExpiredResult;
			const date = new Date(new Date().toUTCString());
			const config = {
				configId: "configId1",
				renewTimeBeforeTokenExpiresInSeconds: 5,
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["access_token_expires_at", config],
				() => date,
			);
			const spy = vi
				.spyOn(tokenValidationService, "validateAccessTokenNotExpired")
				.mockReturnValue(validateAccessTokenNotExpiredResult);
			const result =
				authStateService.hasAccessTokenExpiredIfExpiryExists(config);

			expect(spy).toHaveBeenCalledExactlyOnceWith(date, config, 5);
			expect(result).toEqual(expectedResult);
		});

		it("throws event when token is expired", () => {
			const validateAccessTokenNotExpiredResult = false;
			const expectedResult = !validateAccessTokenNotExpiredResult;
			// vi.spyOn(configurationProvider, 'getOpenIDConfiguration').mockReturnValue({ renewTimeBeforeTokenExpiresInSeconds: 5 });
			const date = new Date(new Date().toUTCString());
			const config = {
				configId: "configId1",
				renewTimeBeforeTokenExpiresInSeconds: 5,
			};

			vi.spyOn(eventsService, "fireEvent");

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["access_token_expires_at", config],
				() => date,
			);

			vi.spyOn(
				tokenValidationService,
				"validateAccessTokenNotExpired",
			).mockReturnValue(validateAccessTokenNotExpiredResult);
			authStateService.hasAccessTokenExpiredIfExpiryExists(config);
			expect(eventsService.fireEvent).toHaveBeenCalledExactlyOnceWith(
				EventTypes.TokenExpired,
				expectedResult,
			);
		});
	});
});

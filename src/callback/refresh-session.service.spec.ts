import {
	EmptyError,
	firstValueFrom,
	of,
	ReplaySubject,
	throwError,
} from "rxjs";
import { delay, share } from "rxjs/operators";
import { vi } from "vitest";
import { spyOnProperty, TestBed } from "@/testing";
import { AuthStateService } from "../auth-state/auth-state.service";
import { AuthWellKnownService } from "../config/auth-well-known/auth-well-known.service";
import type { CallbackContext } from "../flows/callback-context";
import { FlowsDataService } from "../flows/flows-data.service";
import { RefreshSessionIframeService } from "../iframe/refresh-session-iframe.service";
import { SilentRenewService } from "../iframe/silent-renew.service";
import { LoggerService } from "../logging/logger.service";
import type { LoginResponse } from "../login/login-response";
import { PublicEventsService } from "../public-events/public-events.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockProvider } from "../testing/mock";
import { UserService } from "../user-data/user.service";
import { FlowHelper } from "../utils/flowHelper/flow-helper.service";
import {
	MAX_RETRY_ATTEMPTS,
	RefreshSessionService,
} from "./refresh-session.service";
import { RefreshSessionRefreshTokenService } from "./refresh-session-refresh-token.service";

describe("RefreshSessionService ", () => {
	vi.useFakeTimers();
	let refreshSessionService: RefreshSessionService;
	let flowHelper: FlowHelper;
	let authStateService: AuthStateService;
	let silentRenewService: SilentRenewService;
	let storagePersistenceService: StoragePersistenceService;
	let flowsDataService: FlowsDataService;
	let refreshSessionIframeService: RefreshSessionIframeService;
	let refreshSessionRefreshTokenService: RefreshSessionRefreshTokenService;
	let authWellKnownService: AuthWellKnownService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				FlowHelper,
				mockProvider(FlowsDataService),
				RefreshSessionService,
				mockProvider(LoggerService),
				mockProvider(SilentRenewService),
				mockProvider(AuthStateService),
				mockProvider(AuthWellKnownService),
				mockProvider(RefreshSessionIframeService),
				mockProvider(StoragePersistenceService),
				mockProvider(RefreshSessionRefreshTokenService),
				mockProvider(UserService),
				mockProvider(PublicEventsService),
			],
		});
		refreshSessionService = TestBed.inject(RefreshSessionService);
		flowsDataService = TestBed.inject(FlowsDataService);
		flowHelper = TestBed.inject(FlowHelper);
		authStateService = TestBed.inject(AuthStateService);
		refreshSessionIframeService = TestBed.inject(RefreshSessionIframeService);
		refreshSessionRefreshTokenService = TestBed.inject(
			RefreshSessionRefreshTokenService,
		);
		silentRenewService = TestBed.inject(SilentRenewService);
		authWellKnownService = TestBed.inject(AuthWellKnownService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(refreshSessionService).toBeTruthy();
	});

	describe("userForceRefreshSession", () => {
		it("should persist params refresh when extra custom params given and useRefreshToken is true", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				true,
			);
			const writeSpy = vi.spyOn(storagePersistenceService, "write");
			const allConfigs = [
				{
					configId: "configId1",
					useRefreshToken: true,
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const extraCustomParams = { extra: "custom" };

			await firstValueFrom(
				refreshSessionService.userForceRefreshSession(
					allConfigs[0]!,
					allConfigs,
					extraCustomParams,
				),
			);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith(
				"storageCustomParamsRefresh",
				extraCustomParams,
				allConfigs[0],
			);
		});

		it("should persist storageCustomParamsAuthRequest when extra custom params given and useRefreshToken is false", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				true,
			);
			const allConfigs = [
				{
					configId: "configId1",
					useRefreshToken: false,
					silentRenewTimeoutInSeconds: 10,
				},
			];
			const writeSpy = vi.spyOn(storagePersistenceService, "write");

			const extraCustomParams = { extra: "custom" };

			await firstValueFrom(
				refreshSessionService.userForceRefreshSession(
					allConfigs[0]!,
					allConfigs,
					extraCustomParams,
				),
			);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith(
				"storageCustomParamsAuthRequest",
				extraCustomParams,
				allConfigs[0],
			);
		});

		it("should NOT persist customparams if no customparams are given", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				true,
			);
			const allConfigs = [
				{
					configId: "configId1",
					useRefreshToken: false,
					silentRenewTimeoutInSeconds: 10,
				},
			];
			const writeSpy = vi.spyOn(storagePersistenceService, "write");

			await firstValueFrom(
				refreshSessionService.userForceRefreshSession(
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(writeSpy).not.toHaveBeenCalled();
		});

		it("should call resetSilentRenewRunning in case of an error", async () => {
			vi.spyOn(refreshSessionService, "forceRefreshSession").mockReturnValue(
				throwError(() => new Error("error")),
			);
			vi.spyOn(flowsDataService, "resetSilentRenewRunning");
			const allConfigs = [
				{
					configId: "configId1",
					useRefreshToken: false,
					silentRenewTimeoutInSeconds: 10,
				},
			];

			try {
				const result = await firstValueFrom(
					refreshSessionService.userForceRefreshSession(
						allConfigs[0]!,
						allConfigs,
					),
				);
				if (result) {
					expect.fail("It should not return any result.");
				} else {
					expect(
						flowsDataService.resetSilentRenewRunning,
					).toHaveBeenCalledExactlyOnceWith(allConfigs[0]);
				}
			} catch (error: any) {
				expect(error).toBeInstanceOf(Error);
			}
		});
		it("should call resetSilentRenewRunning in case of no error", async () => {
			vi.spyOn(refreshSessionService, "forceRefreshSession").mockReturnValue(
				of({} as LoginResponse),
			);
			vi.spyOn(flowsDataService, "resetSilentRenewRunning");
			const allConfigs = [
				{
					configId: "configId1",
					useRefreshToken: false,
					silentRenewTimeoutInSeconds: 10,
				},
			];

			try {
				await firstValueFrom(
					refreshSessionService.userForceRefreshSession(
						allConfigs[0]!,
						allConfigs,
					),
				);
			} catch (err: any) {
				if (err instanceof EmptyError) {
					expect(
						flowsDataService.resetSilentRenewRunning,
					).toHaveBeenCalledExactlyOnceWith(allConfigs[0]);
				} else {
					expect.fail("It should not return any error.");
				}
			}
		});
	});

	describe("forceRefreshSession", () => {
		it("only calls start refresh session and returns idToken and accessToken if auth is true", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				true,
			);
			vi.spyOn(authStateService, "getIdToken").mockReturnValue("id-token");
			vi.spyOn(authStateService, "getAccessToken").mockReturnValue(
				"access-token",
			);
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const result = await firstValueFrom(
				refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
			);
			expect(result.idToken).toEqual("id-token");
			expect(result.accessToken).toEqual("access-token");
		});

		it("only calls start refresh session and returns null if auth is false", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				false,
			);
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const result = await firstValueFrom(
				refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
			);
			expect(result).toEqual({
				isAuthenticated: false,
				errorMessage: "",
				userData: null,
				idToken: "",
				accessToken: "",
				configId: "configId1",
			});
		});

		it("calls start refresh session and waits for completed, returns idtoken and accesstoken if auth is true", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(false);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				true,
			);
			spyOnProperty(
				silentRenewService,
				"refreshSessionWithIFrameCompleted$",
			).mockReturnValue(
				of({
					authResult: {
						id_token: "some-id_token",
						access_token: "some-access_token",
					},
				} as CallbackContext),
			);
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const result = await firstValueFrom(
				refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
			);
			expect(result.idToken).toBeDefined();
			expect(result.accessToken).toBeDefined();
		});

		it("calls start refresh session and waits for completed, returns LoginResponse if auth is false", async () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(false);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				false,
			);
			spyOnProperty(
				silentRenewService,
				"refreshSessionWithIFrameCompleted$",
			).mockReturnValue(of(null));
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const result = await firstValueFrom(
				refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
			);
			expect(result).toEqual({
				isAuthenticated: false,
				errorMessage: "",
				userData: null,
				idToken: "",
				accessToken: "",
				configId: "configId1",
			});
		});

		it("occurs timeout error and retry mechanism exhausted max retry count throws error", async () => {
			vi.useRealTimers();
			vi.useFakeTimers();
			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(false);
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(of(null));
			spyOnProperty(
				silentRenewService,
				"refreshSessionWithIFrameCompleted$",
			).mockReturnValue(of(null).pipe(delay(11000)));

			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				false,
			);
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const resetSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);
			const expectedInvokeCount = MAX_RETRY_ATTEMPTS;

			try {
				const o$ = refreshSessionService
					.forceRefreshSession(allConfigs[0]!, allConfigs)
					.pipe(
						share({
							connector: () => new ReplaySubject(1),
							resetOnError: false,
							resetOnComplete: false,
							resetOnRefCountZero: true,
						}),
					);

				o$.subscribe();

				await vi.advanceTimersByTimeAsync(
					allConfigs[0]!.silentRenewTimeoutInSeconds * 10000,
				);

				const result = await firstValueFrom(o$);

				if (result) {
					expect.fail("It should not return any result.");
				}
			} catch (error: any) {
				expect(error).toBeInstanceOf(Error);
				expect(resetSilentRenewRunningSpy).toHaveBeenCalledTimes(
					expectedInvokeCount,
				);
			}
		});

		it("occurs unknown error throws it to subscriber", async () => {
			const allConfigs = [
				{
					configId: "configId1",
					silentRenewTimeoutInSeconds: 10,
				},
			];

			const expectedErrorMessage = "Test error message";

			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(false);
			spyOnProperty(
				silentRenewService,
				"refreshSessionWithIFrameCompleted$",
			).mockReturnValue(of(null));
			vi.spyOn(
				refreshSessionService as any,
				"startRefreshSession",
			).mockReturnValue(throwError(() => new Error(expectedErrorMessage)));
			vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
				false,
			);

			const resetSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"resetSilentRenewRunning",
			);

			try {
				await firstValueFrom(
					refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
				);
				expect.fail("It should not return any result.");
			} catch (error: any) {
				expect(error).toBeInstanceOf(Error);
				expect(error.message).toEqual(`Error: ${expectedErrorMessage}`);
				expect(resetSilentRenewRunningSpy).not.toHaveBeenCalled();
			}
		});

		describe("NOT isCurrentFlowCodeFlowWithRefreshTokens", () => {
			it("does return null when not authenticated", async () => {
				const allConfigs = [
					{
						configId: "configId1",
						silentRenewTimeoutInSeconds: 10,
					},
				];

				vi.spyOn(
					flowHelper,
					"isCurrentFlowCodeFlowWithRefreshTokens",
				).mockReturnValue(false);
				vi.spyOn(
					refreshSessionService as any,
					"startRefreshSession",
				).mockReturnValue(of(null));
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				spyOnProperty(
					silentRenewService,
					"refreshSessionWithIFrameCompleted$",
				).mockReturnValue(of(null));

				const result = await firstValueFrom(
					refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
				);
				expect(result).toEqual({
					isAuthenticated: false,
					errorMessage: "",
					userData: null,
					idToken: "",
					accessToken: "",
					configId: "configId1",
				});
			});

			it("return value only returns once", async () => {
				const allConfigs = [
					{
						configId: "configId1",
						silentRenewTimeoutInSeconds: 10,
					},
				];

				vi.spyOn(
					flowHelper,
					"isCurrentFlowCodeFlowWithRefreshTokens",
				).mockReturnValue(false);
				vi.spyOn(
					refreshSessionService as any,
					"startRefreshSession",
				).mockReturnValue(of(null));
				spyOnProperty(
					silentRenewService,
					"refreshSessionWithIFrameCompleted$",
				).mockReturnValue(
					of({
						authResult: {
							id_token: "some-id_token",
							access_token: "some-access_token",
						},
					} as CallbackContext),
				);
				const spyInsideMap = vi
					.spyOn(authStateService, "areAuthStorageTokensValid")
					.mockReturnValue(true);

				const result = await firstValueFrom(
					refreshSessionService.forceRefreshSession(allConfigs[0]!, allConfigs),
				);
				expect(result).toEqual({
					idToken: "some-id_token",
					accessToken: "some-access_token",
					isAuthenticated: true,
					userData: undefined,
					configId: "configId1",
				});
				expect(spyInsideMap).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("startRefreshSession", () => {
		it("returns null if no auth well known endpoint defined", async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(true);

			const result = await firstValueFrom(
				(refreshSessionService as any).startRefreshSession(),
			);
			expect(result).toBe(null);
		});

		it("returns null if silent renew Is running", async () => {
			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(true);

			const result = await firstValueFrom(
				(refreshSessionService as any).startRefreshSession(),
			);
			expect(result).toBe(null);
		});

		it("calls `setSilentRenewRunning` when should be executed", async () => {
			const setSilentRenewRunningSpy = vi.spyOn(
				flowsDataService,
				"setSilentRenewRunning",
			);
			const allConfigs = [
				{
					configId: "configId1",
					authWellknownEndpointUrl: "https://authWell",
				},
			];

			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(false);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			vi.spyOn(
				refreshSessionRefreshTokenService,
				"refreshSessionWithRefreshTokens",
			).mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				(refreshSessionService as any).startRefreshSession(
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(setSilentRenewRunningSpy).toHaveBeenCalled();
		});

		it("calls refreshSessionWithRefreshTokens when current flow is codeflow with refresh tokens", async () => {
			vi.spyOn(flowsDataService, "setSilentRenewRunning");
			const allConfigs = [
				{
					configId: "configId1",
					authWellknownEndpointUrl: "https://authWell",
				},
			];

			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(false);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(true);
			const refreshSessionWithRefreshTokensSpy = vi
				.spyOn(
					refreshSessionRefreshTokenService,
					"refreshSessionWithRefreshTokens",
				)
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				(refreshSessionService as any).startRefreshSession(
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(refreshSessionWithRefreshTokensSpy).toHaveBeenCalled();
		});

		it("calls refreshSessionWithIframe when current flow is NOT codeflow with refresh tokens", async () => {
			vi.spyOn(flowsDataService, "setSilentRenewRunning");
			const allConfigs = [
				{
					configId: "configId1",
					authWellknownEndpointUrl: "https://authWell",
				},
			];

			vi.spyOn(flowsDataService, "isSilentRenewRunning").mockReturnValue(false);
			vi.spyOn(
				authWellKnownService,
				"queryAndStoreAuthWellKnownEndPoints",
			).mockReturnValue(of({}));

			vi.spyOn(
				flowHelper,
				"isCurrentFlowCodeFlowWithRefreshTokens",
			).mockReturnValue(false);
			const refreshSessionWithRefreshTokensSpy = vi
				.spyOn(
					refreshSessionRefreshTokenService,
					"refreshSessionWithRefreshTokens",
				)
				.mockReturnValue(of({} as CallbackContext));

			const refreshSessionWithIframeSpy = vi
				.spyOn(refreshSessionIframeService, "refreshSessionWithIframe")
				.mockReturnValue(of(false));

			await firstValueFrom(
				(refreshSessionService as any).startRefreshSession(
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(refreshSessionWithRefreshTokensSpy).not.toHaveBeenCalled();
			expect(refreshSessionWithIframeSpy).toHaveBeenCalled();
		});
	});
});

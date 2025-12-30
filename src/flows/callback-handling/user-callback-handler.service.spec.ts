import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthStateService } from "../../auth-state/auth-state.service";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import { UserService } from "../../user-data/user.service";
import { StateValidationResult } from "../../validation/state-validation-result";
import { ValidationResult } from "../../validation/validation-result";
import type { CallbackContext } from "../callback-context";
import { FlowsDataService } from "../flows-data.service";
import { ResetAuthDataService } from "../reset-auth-data.service";
import { UserCallbackHandlerService } from "./user-callback-handler.service";

describe("UserCallbackHandlerService", () => {
	let service: UserCallbackHandlerService;
	let authStateService: AuthStateService;
	let flowsDataService: FlowsDataService;
	let userService: UserService;
	let resetAuthDataService: ResetAuthDataService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				UserCallbackHandlerService,
				mockProvider(LoggerService),
				mockProvider(AuthStateService),
				mockProvider(FlowsDataService),
				mockProvider(UserService),
				mockProvider(ResetAuthDataService),
			],
		});
		service = TestBed.inject(UserCallbackHandlerService);
		flowsDataService = TestBed.inject(FlowsDataService);
		authStateService = TestBed.inject(AuthStateService);
		userService = TestBed.inject(UserService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("callbackUser", () => {
		it("calls flowsDataService.setSessionState with correct params if autoUserInfo is false, isRenewProcess is false and refreshToken is null", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
			);
			const callbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: "",
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: false,
				},
			];

			const spy = vi.spyOn(flowsDataService, "setSessionState");

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith("mystate", allConfigs[0]);
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("does NOT call flowsDataService.setSessionState if autoUserInfo is false, isRenewProcess is true and refreshToken is null", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
			);
			const callbackContext = {
				code: "",
				refreshToken: "",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: true,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: false,
				},
			];
			const spy = vi.spyOn(flowsDataService, "setSessionState");

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(spy).not.toHaveBeenCalled();
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("does NOT call flowsDataService.setSessionState if autoUserInfo is false isRenewProcess is false, refreshToken has value", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: false,
				},
			];
			const spy = vi.spyOn(flowsDataService, "setSessionState");

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(spy).not.toHaveBeenCalled();
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("does NOT call flowsDataService.setSessionState if autoUserInfo is false isRenewProcess is false, refreshToken has value, id_token is false", async () => {
			const svr = new StateValidationResult("accesstoken", "", true, "");
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;
			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: false,
				},
			];

			const spy = vi.spyOn(flowsDataService, "setSessionState");

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(spy).not.toHaveBeenCalled();
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("calls authStateService.updateAndPublishAuthState with correct params if autoUserInfo is false", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: false,
				},
			];

			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: true,
				validationResult: ValidationResult.NotSet,
				isRenewProcess: false,
			});
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("calls userService.getAndPersistUserDataInStore with correct params if autoUserInfo is true", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: true,
				},
			];

			const getAndPersistUserDataInStoreSpy = vi
				.spyOn(userService, "getAndPersistUserDataInStore")
				.mockReturnValue(of({ user: "some_data" }));

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(getAndPersistUserDataInStoreSpy).toHaveBeenCalledExactlyOnceWith(
				allConfigs[0]!,
				allConfigs,
				false,
				"idtoken",
				"decoded",
			);
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("calls authStateService.updateAndPublishAuthState with correct params if autoUserInfo is true", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
				ValidationResult.MaxOffsetExpired,
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: true,
				},
			];

			vi.spyOn(userService, "getAndPersistUserDataInStore").mockReturnValue(
				of({ user: "some_data" }),
			);
			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
				isAuthenticated: true,
				validationResult: ValidationResult.MaxOffsetExpired,
				isRenewProcess: false,
			});
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("calls flowsDataService.setSessionState with correct params if user data is present and NOT refresh token", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
				ValidationResult.MaxOffsetExpired,
			);
			const callbackContext = {
				code: "",
				refreshToken: "", // something falsy
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: true,
				},
			];

			vi.spyOn(userService, "getAndPersistUserDataInStore").mockReturnValue(
				of({ user: "some_data" }),
			);
			const setSessionStateSpy = vi.spyOn(flowsDataService, "setSessionState");

			const resultCallbackContext = await firstValueFrom(
				service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
			);
			expect(setSessionStateSpy).toHaveBeenCalledExactlyOnceWith(
				"mystate",
				allConfigs[0],
			);
			expect(resultCallbackContext).toEqual(callbackContext);
		});

		it("calls authStateService.publishUnauthorizedState with correct params if user info which are coming back are null", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
				ValidationResult.MaxOffsetExpired,
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: true,
				},
			];

			vi.spyOn(userService, "getAndPersistUserDataInStore").mockReturnValue(
				of(null),
			);
			const updateAndPublishAuthStateSpy = vi.spyOn(
				authStateService,
				"updateAndPublishAuthState",
			);

			try {
				await firstValueFrom(
					service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
				);
			} catch (err: any) {
				expect(updateAndPublishAuthStateSpy).toHaveBeenCalledExactlyOnceWith({
					isAuthenticated: false,
					validationResult: ValidationResult.MaxOffsetExpired,
					isRenewProcess: false,
				});
				expect(err.message).toEqual(
					"Failed to retrieve user info with error:  Error: Called for userData but they were null",
				);
			}
		});

		it("calls resetAuthDataService.resetAuthorizationData if user info which are coming back are null", async () => {
			const svr = new StateValidationResult(
				"accesstoken",
				"idtoken",
				true,
				"decoded",
				ValidationResult.MaxOffsetExpired,
			);
			const callbackContext = {
				code: "",
				refreshToken: "somerefreshtoken",
				state: "",
				sessionState: null,
				authResult: { session_state: "mystate" },
				isRenewProcess: false,
				jwtKeys: null,
				validationResult: svr,
				existingIdToken: null,
			} as CallbackContext;

			const allConfigs = [
				{
					configId: "configId1",
					autoUserInfo: true,
				},
			];

			vi.spyOn(userService, "getAndPersistUserDataInStore").mockReturnValue(
				of(null),
			);
			const resetAuthorizationDataSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);

			try {
				await firstValueFrom(
					service.callbackUser(callbackContext, allConfigs[0]!, allConfigs),
				);
			} catch (err: any) {
				expect(resetAuthorizationDataSpy).toHaveBeenCalledTimes(1);
				expect(err.message).toEqual(
					"Failed to retrieve user info with error:  Error: Called for userData but they were null",
				);
			}
		});
	});
});

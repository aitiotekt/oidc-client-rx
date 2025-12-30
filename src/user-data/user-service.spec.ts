import { firstValueFrom, Observable, of, throwError } from "rxjs";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { DataService } from "../api/data.service";
import type { OpenIdConfiguration } from "../config/openid-configuration";
import { LoggerService } from "../logging/logger.service";
import { EventTypes } from "../public-events/event-types";
import { PublicEventsService } from "../public-events/public-events.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { createRetriableStream } from "../testing/create-retriable-stream.helper";
import { mockProvider } from "../testing/mock";
import { FlowHelper } from "../utils/flowHelper/flow-helper.service";
import { PlatformProvider } from "../utils/platform-provider/platform.provider";
import { TokenHelperService } from "../utils/tokenHelper/token-helper.service";
import { UserService } from "./user.service";

const DUMMY_USER_DATA = {
	sub: "a5461470-33eb-4b2d-82d4-b0484e96ad7f",
	preferred_username: "john@test.com",
	organization: "testing",
};

describe("User Service", () => {
	let loggerService: LoggerService;
	let userService: UserService;
	let storagePersistenceService: StoragePersistenceService;
	let eventsService: PublicEventsService;
	let dataService: DataService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				UserService,
				mockProvider(StoragePersistenceService),
				mockProvider(LoggerService),
				mockProvider(DataService),
				mockProvider(PlatformProvider),
				PublicEventsService,
				TokenHelperService,
				FlowHelper,
			],
		});
		loggerService = TestBed.inject(LoggerService);
		userService = TestBed.inject(UserService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		eventsService = TestBed.inject(PublicEventsService);
		dataService = TestBed.inject(DataService);
	});

	it("should create", () => {
		expect(userService).toBeTruthy();
	});

	it("authorize$ is observable$", () => {
		expect(userService.userData$).toBeInstanceOf(Observable);
	});

	describe("getAndPersistUserDataInStore", () => {
		it("if not currentFlow is NOT id Token or Code flow, return decoded ID Token - passed as argument", async () => {
			const isRenewProcess = false;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "";

			const config = {
				responseType: "notcode",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);

			expect(decodedIdToken).toBe(token);
		});

		it('if not currentFlow is NOT id Token or Code flow, "setUserDataToStore" is called with the decodedIdToken', async () => {
			const isRenewProcess = false;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "";

			const config = {
				responseType: "notcode",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);
			vi.spyOn(userService, "setUserDataToStore");

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);

			expect(decodedIdToken).toBe(token);

			expect(userService.setUserDataToStore).toHaveBeenCalled();
		});

		it("if not currentFlow is id token or code flow with renewProcess going -> return existing data from storage", async () => {
			const isRenewProcess = true;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "userDataInstore";

			const config = {
				responseType: "code",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);

			expect(userDataInstore).toBe(token);
		});

		it("if not currentFlow is id token or code flow and not renewProcess --> ask server for data", async () => {
			const isRenewProcess = false;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "";
			const userDataFromSts = "userDataFromSts";

			const config = {
				responseType: "code",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);
			const spy = vi
				.spyOn(userService as any, "getIdentityUserData")
				.mockReturnValue(of(userDataFromSts));

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);

			expect(userDataFromSts).toEqual(token);

			expect(spy).toHaveBeenCalled();
		});

		it(`if not currentFlow is id token or code flow and not renewprocess
          --> ask server for data
          --> logging if it has userdata`, async () => {
			const isRenewProcess = false;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "";
			const userDataFromSts = "userDataFromSts";

			const config = {
				responseType: "code",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);
			const spy = vi
				.spyOn(userService as any, "getIdentityUserData")
				.mockReturnValue(of(userDataFromSts));

			vi.spyOn(loggerService, "logDebug");
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"accessToken",
			);

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);

			expect(userDataFromSts).toEqual(token);

			expect(spy).toHaveBeenCalled();
			expect(loggerService.logDebug).toHaveBeenCalled();
		});

		it(`if not currentFlow is id token or code flow and not renewprocess
          --> ask server for data
          --> throwing Error if it has no userdata `, async () => {
			const isRenewProcess = false;
			const idToken = "";
			const decodedIdToken = { sub: "decodedIdToken" };
			const userDataInstore = "";
			const userDataFromSts = null;

			const config = {
				responseType: "code",
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);
			const spyGetIdentityUserData = vi
				.spyOn(userService as any, "getIdentityUserData")
				.mockReturnValue(of(userDataFromSts));

			vi.spyOn(loggerService, "logDebug");
			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"accessToken",
			);

			try {
				await firstValueFrom(
					userService.getAndPersistUserDataInStore(
						config,
						[config],
						isRenewProcess,
						idToken,
						decodedIdToken,
					),
				);
			} catch (err: any) {
				expect(err.message).toEqual("Received no user data, request failed");
			}

			expect(spyGetIdentityUserData).toHaveBeenCalled();
		});

		it(`if not currentFlow is id token or code flow and renewprocess and renewUserInfoAfterTokenRenew
          --> ask server for data`, async () => {
			const isRenewProcess = true;
			const idToken = "";
			const decodedIdToken = "decodedIdToken";
			const userDataInstore = "userDataInStore";
			const userDataFromSts = "userDataFromSts";

			const config = {
				responseType: "code",
				renewUserInfoAfterTokenRenew: true,
				configId: "configId1",
			} as OpenIdConfiguration;

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				userDataInstore,
			);
			const spy = vi
				.spyOn(userService as any, "getIdentityUserData")
				.mockReturnValue(of(userDataFromSts));

			const token = await firstValueFrom(
				userService.getAndPersistUserDataInStore(
					config,
					[config],
					isRenewProcess,
					idToken,
					decodedIdToken,
				),
			);
			expect(userDataFromSts).toEqual(token);

			expect(spy).toHaveBeenCalled();
		});
	});

	describe("getUserDataFromStore", () => {
		it("returns null if there is not data", () => {
			const config = { configId: "configId1" };
			const result = userService.getUserDataFromStore(config);

			expect(result).toBeNull();
		});

		it("returns value if there is data", () => {
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["userData", config],
				() => "userData",
			);
			const result = userService.getUserDataFromStore(config);

			expect(result).toBeTruthy();
		});
	});

	describe("setUserDataToStore", () => {
		it("sets userData in storagePersistenceService", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(storagePersistenceService, "write");

			userService.setUserDataToStore("userDataForTest", config, [config]);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"userData",
				"userDataForTest",
				config,
			);
		});

		it("userDataInternal$ is called when userData is set", () => {
			const config = { configId: "configId1" };

			const spy = vi.spyOn((userService as any).userDataInternal$, "next");

			userService.setUserDataToStore("userDataForTest", config, [config]);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				userData: "userDataForTest",
				allUserData: [{ configId: "configId1", userData: "userDataForTest" }],
			});
		});

		it("eventService.fireEvent is called when userData is set", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(eventsService, "fireEvent");

			userService.setUserDataToStore("userDataForTest", config, [config]);

			expect(spy).toHaveBeenCalledExactlyOnceWith(EventTypes.UserDataChanged, {
				configId: "configId1",
				userData: "userDataForTest",
			});
		});
	});

	describe("resetUserDataInStore", () => {
		it("resets userData sets null in storagePersistenceService", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(storagePersistenceService, "remove");

			userService.resetUserDataInStore(config, [config]);

			expect(spy).toHaveBeenCalledExactlyOnceWith("userData", config);
		});

		it("userDataInternal$ is called with null when userData is reset", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn((userService as any).userDataInternal$, "next");

			userService.resetUserDataInStore(config, [config]);

			expect(spy).toHaveBeenCalledExactlyOnceWith({
				userData: null,
				allUserData: [{ configId: "configId1", userData: null }],
			});
		});

		it("eventService.fireEvent is called with null when userData is reset", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(eventsService, "fireEvent");

			userService.resetUserDataInStore(config, [config]);

			expect(spy).toHaveBeenCalledExactlyOnceWith(EventTypes.UserDataChanged, {
				configId: "configId1",
				userData: null,
			});
		});
	});

	describe("publishUserDataIfExists", () => {
		it("do nothing if no userData is stored", () => {
			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue("");
			const observableSpy = vi.spyOn(
				(userService as any).userDataInternal$,
				"next",
			);
			const eventSpy = vi.spyOn(eventsService, "fireEvent");
			const config = { configId: "configId1" };

			userService.publishUserDataIfExists(config, [config]);

			expect(observableSpy).not.toHaveBeenCalled();
			expect(eventSpy).not.toHaveBeenCalled();
		});

		it("userDataInternal is fired if userData exists with single config", () => {
			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				"something",
			);
			const observableSpy = vi.spyOn(
				(userService as any).userDataInternal$,
				"next",
			);
			const config = { configId: "configId1" };

			userService.publishUserDataIfExists(config, [config]);

			expect(observableSpy).toHaveBeenCalledExactlyOnceWith({
				userData: "something",
				allUserData: [{ configId: "configId1", userData: "something" }],
			});
		});

		it("userDataInternal is fired if userData exists with multiple configs", () => {
			const allConfigs = [{ configId: "configId1" }, { configId: "configId2" }];
			const observableSpy = vi.spyOn(
				(userService as any).userDataInternal$,
				"next",
			);

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "read"),
					["userData", allConfigs[0]!],
					() => "somethingForConfig1",
				),
				["userData", allConfigs[1]!],
				() => "somethingForConfig2",
			);

			userService.publishUserDataIfExists(allConfigs[0]!, allConfigs);

			expect(observableSpy).toHaveBeenCalledExactlyOnceWith({
				userData: null,
				allUserData: [
					{ configId: "configId1", userData: "somethingForConfig1" },
					{ configId: "configId2", userData: "somethingForConfig2" },
				],
			});
		});

		it("event service UserDataChanged is fired if userData exists", () => {
			const allConfigs = [{ configId: "configId1" }, { configId: "configId2" }];

			vi.spyOn(userService, "getUserDataFromStore").mockReturnValue(
				"something",
			);
			const eventSpy = vi.spyOn(eventsService, "fireEvent");

			userService.publishUserDataIfExists(allConfigs[0]!, allConfigs);

			expect(eventSpy).toHaveBeenCalledExactlyOnceWith(
				EventTypes.UserDataChanged,
				{
					configId: "configId1",
					userData: "something",
				},
			);
		});
	});

	describe("validateUserDataSubIdToken", () => {
		it("with no idTokenSub returns false", () => {
			const serviceAsAny = userService as any;
			const config = { configId: "configId1" };

			const result = serviceAsAny.validateUserDataSubIdToken(
				config,
				"",
				"anything",
			);

			expect(result).toBeFalsy();
		});

		it("with no userDataSub returns false", () => {
			const serviceAsAny = userService as any;
			const config = { configId: "configId1" };

			const result = serviceAsAny.validateUserDataSubIdToken(
				config,
				"something",
				"",
			);

			expect(result).toBeFalsy();
		});

		it("with idTokenSub and userDataSub not match logs and returns false", () => {
			const serviceAsAny = userService as any;
			const loggerSpy = vi.spyOn(loggerService, "logDebug");
			const config = { configId: "configId1" };

			const result = serviceAsAny.validateUserDataSubIdToken(
				config,
				"something",
				"something2",
			);

			expect(result).toBeFalsy();
			expect(loggerSpy).toHaveBeenCalledExactlyOnceWith(
				config,
				"validateUserDataSubIdToken failed",
				"something",
				"something2",
			);
		});
	});

	describe("getIdentityUserData", () => {
		it("does nothing if no authWellKnownEndPoints are set", async () => {
			const config = { configId: "configId1" };
			const serviceAsAny = userService as any;

			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"accessToken",
			);

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => null,
			);
			try {
				await firstValueFrom(serviceAsAny.getIdentityUserData(config));
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("does nothing if no userInfoEndpoint is set", async () => {
			const config = { configId: "configId1" };
			const serviceAsAny = userService as any;

			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"accessToken",
			);

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ userInfoEndpoint: null }),
			);

			try {
				await firstValueFrom(serviceAsAny.getIdentityUserData(config));
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("gets userData if authwell and userInfoEndpoint is set", async () => {
			const config = { configId: "configId1" };
			const serviceAsAny = userService as any;
			const spy = vi.spyOn(dataService, "get").mockReturnValue(of({}));

			vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
				"accessToken",
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => ({ userInfoEndpoint: "userInfoEndpoint" }),
			);

			await firstValueFrom(serviceAsAny.getIdentityUserData(config));
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"userInfoEndpoint",
				config,
				"accessToken",
			);
		});
	});

	it("should retry once", async () => {
		const config = { configId: "configId1" };

		vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
			"accessToken",
		);
		mockImplementationWhenArgsEqual(
			vi.spyOn(storagePersistenceService, "read"),
			["authWellKnownEndPoints", config],
			() => ({ userInfoEndpoint: "userInfoEndpoint" }),
		);
		vi.spyOn(dataService, "get").mockReturnValue(
			createRetriableStream(
				throwError(() => new Error("Error")),
				of(DUMMY_USER_DATA),
			),
		);

		const res = await firstValueFrom(
			(userService as any).getIdentityUserData(config),
		);

		expect(res).toBeTruthy();
		expect(res).toEqual(DUMMY_USER_DATA);
	});

	it("should retry twice", async () => {
		const config = { configId: "configId1" };

		vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
			"accessToken",
		);
		mockImplementationWhenArgsEqual(
			vi.spyOn(storagePersistenceService, "read"),
			["authWellKnownEndPoints", config],
			() => ({ userInfoEndpoint: "userInfoEndpoint" }),
		);
		vi.spyOn(dataService, "get").mockReturnValue(
			createRetriableStream(
				throwError(() => new Error("Error")),
				throwError(() => new Error("Error")),
				of(DUMMY_USER_DATA),
			),
		);

		const res = await firstValueFrom(
			(userService as any).getIdentityUserData(config),
		);
		expect(res).toBeTruthy();
		expect(res).toEqual(DUMMY_USER_DATA);
	});

	it("should fail after three tries", async () => {
		const config = { configId: "configId1" };

		vi.spyOn(storagePersistenceService, "getAccessToken").mockReturnValue(
			"accessToken",
		);
		mockImplementationWhenArgsEqual(
			vi.spyOn(storagePersistenceService, "read"),
			["authWellKnownEndPoints", config],
			() => ({ userInfoEndpoint: "userInfoEndpoint" }),
		);
		vi.spyOn(dataService, "get").mockReturnValue(
			createRetriableStream(
				throwError(() => new Error("Error")),
				throwError(() => new Error("Error")),
				throwError(() => new Error("Error")),
				of(DUMMY_USER_DATA),
			),
		);

		try {
			await firstValueFrom((userService as any).getIdentityUserData(config));
		} catch (err: any) {
			expect(err).toBeTruthy();
		}
	});
});

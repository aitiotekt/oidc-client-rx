import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { LoggerService } from "../logging/logger.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockProvider } from "../testing/mock";
import { CryptoService } from "../utils/crypto/crypto.service";
import { FlowsDataService } from "./flows-data.service";
import { RandomService } from "./random/random.service";

describe("Flows Data Service", () => {
	let service: FlowsDataService;
	let storagePersistenceService: StoragePersistenceService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				FlowsDataService,
				RandomService,
				CryptoService,
				mockProvider(LoggerService),
				mockProvider(StoragePersistenceService),
			],
		});
		service = TestBed.inject(FlowsDataService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("createNonce", () => {
		it("createNonce returns nonce and stores it", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");

			const result = service.createNonce({ configId: "configId1" });

			expect(result).toBeTruthy();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authNonce", result, {
				configId: "configId1",
			});
		});
	});

	describe("AuthStateControl", () => {
		it("getAuthStateControl returns property from store", () => {
			const spy = vi.spyOn(storagePersistenceService, "read");

			service.getAuthStateControl({ configId: "configId1" });

			expect(spy).toHaveBeenCalledExactlyOnceWith("authStateControl", {
				configId: "configId1",
			});
		});

		it("setAuthStateControl saves property in store", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");

			service.setAuthStateControl("ToSave", { configId: "configId1" });

			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"authStateControl",
				"ToSave",
				{
					configId: "configId1",
				},
			);
		});
	});

	describe("getExistingOrCreateAuthStateControl", () => {
		it("if nothing stored it creates a 40 char one and saves the authStateControl", () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authStateControl", { configId: "configId1" }],
				() => null,
			);
			const setSpy = vi.spyOn(storagePersistenceService, "write");

			const result = service.getExistingOrCreateAuthStateControl({
				configId: "configId1",
			});

			expect(result).toBeTruthy();
			expect(result.length).toBe(41);
			expect(setSpy).toHaveBeenCalledExactlyOnceWith(
				"authStateControl",
				result,
				{
					configId: "configId1",
				},
			);
		});

		it("if stored it returns the value and does NOT Store the value again", () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authStateControl", { configId: "configId1" }],
				() => "someAuthStateControl",
			);
			const setSpy = vi.spyOn(storagePersistenceService, "write");

			const result = service.getExistingOrCreateAuthStateControl({
				configId: "configId1",
			});

			expect(result).toEqual("someAuthStateControl");
			expect(result.length).toBe("someAuthStateControl".length);
			expect(setSpy).not.toHaveBeenCalled();
		});
	});

	describe("setSessionState", () => {
		it("setSessionState saves the value in the storage", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");

			service.setSessionState("Genesis", { configId: "configId1" });

			expect(spy).toHaveBeenCalledExactlyOnceWith("session_state", "Genesis", {
				configId: "configId1",
			});
		});
	});

	describe("resetStorageFlowData", () => {
		it("resetStorageFlowData calls correct method on storagePersistenceService", () => {
			const spy = vi.spyOn(storagePersistenceService, "resetStorageFlowData");

			service.resetStorageFlowData({ configId: "configId1" });

			expect(spy).toHaveBeenCalled();
		});
	});

	describe("codeVerifier", () => {
		it("getCodeVerifier returns value from the store", () => {
			const spy = mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["codeVerifier", { configId: "configId1" }],
				() => "Genesis",
			);

			const result = service.getCodeVerifier({ configId: "configId1" });

			expect(result).toBe("Genesis");
			expect(spy).toHaveBeenCalledExactlyOnceWith("codeVerifier", {
				configId: "configId1",
			});
		});

		it("createCodeVerifier returns random createCodeVerifier and stores it", () => {
			const setSpy = vi.spyOn(storagePersistenceService, "write");

			const result = service.createCodeVerifier({ configId: "configId1" });

			expect(result).toBeTruthy();
			expect(result.length).toBe(67);
			expect(setSpy).toHaveBeenCalledExactlyOnceWith("codeVerifier", result, {
				configId: "configId1",
			});
		});
	});

	describe("isCodeFlowInProgress", () => {
		it("checks code flow is in progress and returns result", () => {
			const config = {
				configId: "configId1",
			};

			vi.useRealTimers();
			vi.useFakeTimers();

			const baseTime = new Date();

			vi.setSystemTime(baseTime);

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["storageCodeFlowInProgress", config],
				() => true,
			);
			const spyWrite = vi.spyOn(storagePersistenceService, "write");

			const isCodeFlowInProgressResult = service.isCodeFlowInProgress(config);

			expect(spyWrite).not.toHaveBeenCalled();
			expect(isCodeFlowInProgressResult).toBeTruthy();
		});

		it("state object does not exist returns false result", () => {
			// arrange
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["storageCodeFlowInProgress", { configId: "configId1" }],
				() => null,
			);

			// act
			const isCodeFlowInProgressResult = service.isCodeFlowInProgress({
				configId: "configId1",
			});

			// assert
			expect(isCodeFlowInProgressResult).toBeFalsy();
		});
	});

	describe("setCodeFlowInProgress", () => {
		it("set setCodeFlowInProgress to `in progress` when called", () => {
			vi.useRealTimers();
			vi.useFakeTimers();
			const baseTime = new Date();

			vi.setSystemTime(baseTime);

			const spy = vi.spyOn(storagePersistenceService, "write");

			service.setCodeFlowInProgress({ configId: "configId1" });
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"storageCodeFlowInProgress",
				true,
				{
					configId: "configId1",
				},
			);
		});
	});

	describe("resetCodeFlowInProgress", () => {
		it("set resetCodeFlowInProgress to false when called", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");

			service.resetCodeFlowInProgress({ configId: "configId1" });
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"storageCodeFlowInProgress",
				false,
				{
					configId: "configId1",
				},
			);
		});
	});

	describe("isSilentRenewRunning", () => {
		it("silent renew process timeout exceeded reset state object and returns false result", async () => {
			const config = {
				silentRenewTimeoutInSeconds: 10,
				configId: "configId1",
			};

			vi.useRealTimers();
			const baseTime = new Date();
			vi.useFakeTimers();

			vi.setSystemTime(baseTime);

			const storageObject = {
				state: "running",
				dateOfLaunchedProcessUtc: baseTime.toISOString(),
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["storageSilentRenewRunning", config],
				() => JSON.stringify(storageObject),
			);
			const spyWrite = vi.spyOn(storagePersistenceService, "write");

			await vi.advanceTimersByTimeAsync(
				(config.silentRenewTimeoutInSeconds + 1) * 1000,
			);

			const isSilentRenewRunningResult = service.isSilentRenewRunning(config);

			expect(spyWrite).toHaveBeenCalledExactlyOnceWith(
				"storageSilentRenewRunning",
				"",
				config,
			);
			expect(isSilentRenewRunningResult).toBeFalsy();
		});

		it("checks silent renew process and returns result", () => {
			const config = {
				silentRenewTimeoutInSeconds: 10,
				configId: "configId1",
			};

			vi.useRealTimers();
			vi.useFakeTimers();
			const baseTime = new Date();

			vi.setSystemTime(baseTime);

			const storageObject = {
				state: "running",
				dateOfLaunchedProcessUtc: baseTime.toISOString(),
			};

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["storageSilentRenewRunning", config],
				() => JSON.stringify(storageObject),
			);
			const spyWrite = vi.spyOn(storagePersistenceService, "write");

			const isSilentRenewRunningResult = service.isSilentRenewRunning(config);

			expect(spyWrite).not.toHaveBeenCalled();
			expect(isSilentRenewRunningResult).toBeTruthy();
		});

		it("state object does not exist returns false result", () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["storageSilentRenewRunning", { configId: "configId1" }],
				() => null,
			);

			const isSilentRenewRunningResult = service.isSilentRenewRunning({
				configId: "configId1",
			});

			expect(isSilentRenewRunningResult).toBeFalsy();
		});
	});

	describe("setSilentRenewRunning", () => {
		it("set setSilentRenewRunning to `running` with lauched time when called", () => {
			vi.useRealTimers();
			vi.useFakeTimers();
			const baseTime = new Date();

			vi.setSystemTime(baseTime);

			const storageObject = {
				state: "running",
				dateOfLaunchedProcessUtc: baseTime.toISOString(),
			};

			const spy = vi.spyOn(storagePersistenceService, "write");

			service.setSilentRenewRunning({ configId: "configId1" });
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"storageSilentRenewRunning",
				JSON.stringify(storageObject),
				{ configId: "configId1" },
			);
		});
	});

	describe("resetSilentRenewRunning", () => {
		it("set resetSilentRenewRunning to empty string when called", () => {
			const spy = vi.spyOn(storagePersistenceService, "write");

			service.resetSilentRenewRunning({ configId: "configId1" });
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"storageSilentRenewRunning",
				"",
				{
					configId: "configId1",
				},
			);
		});
	});
});

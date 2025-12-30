import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { mockProvider } from "../testing/mock";
import { BrowserStorageService } from "./browser-storage.service";
import { StoragePersistenceService } from "./storage-persistence.service";

describe("Storage Persistence Service", () => {
	let service: StoragePersistenceService;
	let securityStorage: BrowserStorageService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				StoragePersistenceService,
				mockProvider(BrowserStorageService),
			],
		});
		service = TestBed.inject(StoragePersistenceService);
		securityStorage = TestBed.inject(BrowserStorageService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("read", () => {
		it("reads from oidcSecurityStorage with configId", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(securityStorage, "read");

			service.read("authNonce", config);
			expect(spy).toHaveBeenCalledExactlyOnceWith("authNonce", config);
		});

		it("returns undefined (not throws exception) if key to read is not present on config", () => {
			const config = { configId: "configId1" };

			vi.spyOn(securityStorage, "read").mockReturnValue({ some: "thing" });
			const result = service.read("authNonce", config);

			expect(result).toBeUndefined();
		});
	});

	describe("write", () => {
		it("writes to oidcSecurityStorage with correct key and correct config", () => {
			const config = { configId: "configId1" };
			const readSpy = vi.spyOn(securityStorage, "read");
			const writeSpy = vi.spyOn(securityStorage, "write");

			service.write("authNonce", "anyValue", config);

			expect(readSpy).toHaveBeenCalledExactlyOnceWith("authNonce", config);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith(
				{ authNonce: "anyValue" },
				config,
			);
		});
	});

	describe("remove", () => {
		it("should remove key from config", () => {
			const config = { configId: "configId1" };
			const readSpy = vi.spyOn(securityStorage, "read").mockReturnValue({
				authNonce: "anyValue",
			});
			const writeSpy = vi.spyOn(securityStorage, "write");

			service.remove("authNonce", config);

			expect(readSpy).toHaveBeenCalledExactlyOnceWith("authNonce", config);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith({}, config);
		});

		it("does not crash when read with configId returns null", () => {
			const config = { configId: "configId1" };
			const readSpy = vi.spyOn(securityStorage, "read").mockReturnValue(null);
			const writeSpy = vi.spyOn(securityStorage, "write");

			service.remove("authNonce", config);

			expect(readSpy).toHaveBeenCalledExactlyOnceWith("authNonce", config);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith({}, config);
		});
	});

	describe("clear", () => {
		it("should call oidcSecurityStorage.clear()", () => {
			const clearSpy = vi.spyOn(securityStorage, "clear");

			service.clear({});

			expect(clearSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("resetStorageFlowData", () => {
		it("resets the correct values", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(service, "remove");

			service.resetStorageFlowData(config);

			expect(spy).toHaveBeenCalledTimes(10);
			expect(vi.mocked(spy).mock.calls[0]).toEqual(["session_state", config]);
			expect(vi.mocked(spy).mock.calls[1]).toEqual([
				"storageSilentRenewRunning",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[2]).toEqual([
				"storageCodeFlowInProgress",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[3]).toEqual(["codeVerifier", config]);
			expect(vi.mocked(spy).mock.calls[4]).toEqual(["userData", config]);
			expect(vi.mocked(spy).mock.calls[5]).toEqual([
				"storageCustomParamsAuthRequest",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[6]).toEqual([
				"access_token_expires_at",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[7]).toEqual([
				"storageCustomParamsRefresh",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[8]).toEqual([
				"storageCustomParamsEndSession",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[9]).toEqual([
				"reusable_refresh_token",
				config,
			]);
		});
	});

	describe("resetAuthStateInStorage", () => {
		it("resets the correct values", () => {
			const config = { configId: "configId1" };
			const spy = vi.spyOn(service, "remove");

			service.resetAuthStateInStorage(config);

			expect(vi.mocked(spy).mock.calls[0]).toEqual(["authzData", config]);
			expect(vi.mocked(spy).mock.calls[1]).toEqual([
				"reusable_refresh_token",
				config,
			]);
			expect(vi.mocked(spy).mock.calls[2]).toEqual(["authnResult", config]);
		});
	});

	describe("getAccessToken", () => {
		it("get calls oidcSecurityStorage.read with correct key and returns the value", () => {
			const returnValue = { authzData: "someValue" };
			const config = { configId: "configId1" };
			const spy = vi
				.spyOn(securityStorage, "read")
				.mockReturnValue(returnValue);
			const result = service.getAccessToken(config);

			expect(result).toBe("someValue");
			expect(spy).toHaveBeenCalledExactlyOnceWith("authzData", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns null", () => {
			const spy = vi.spyOn(securityStorage, "read").mockReturnValue(null);
			const config = { configId: "configId1" };
			const result = service.getAccessToken(config);

			expect(result).toBeFalsy();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authzData", config);
		});
	});

	describe("getIdToken", () => {
		it("get calls oidcSecurityStorage.read with correct key and returns the value", () => {
			const returnValue = { authnResult: { id_token: "someValue" } };
			const spy = vi
				.spyOn(securityStorage, "read")
				.mockReturnValue(returnValue);
			const config = { configId: "configId1" };
			const result = service.getIdToken(config);

			expect(result).toBe("someValue");
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns null", () => {
			const spy = vi.spyOn(securityStorage, "read").mockReturnValue(null);
			const config = { configId: "configId1" };
			const result = service.getIdToken(config);

			expect(result).toBeFalsy();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});
	});

	describe("getAuthenticationResult", () => {
		it("get calls oidcSecurityStorage.read with correct key and returns the value", () => {
			const returnValue = { authnResult: { id_token: "someValue" } };
			const config = { configId: "configId1" };
			const spy = vi
				.spyOn(securityStorage, "read")
				.mockReturnValue(returnValue);
			const result = service.getAuthenticationResult(config);

			expect(result.id_token).toBe("someValue");
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns null", () => {
			const spy = vi.spyOn(securityStorage, "read").mockReturnValue(null);
			const config = { configId: "configId1" };
			const result = service.getAuthenticationResult(config);

			expect(result).toBeFalsy();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});
	});

	describe("getRefreshToken", () => {
		it("get calls oidcSecurityStorage.read with correct key and returns the value (refresh token with mandatory rotation - default)", () => {
			const returnValue = { authnResult: { refresh_token: "someValue" } };
			const spy = vi
				.spyOn(securityStorage, "read")
				.mockReturnValue(returnValue);
			const config = { configId: "configId1" };
			const result = service.getRefreshToken(config);

			expect(result).toBe("someValue");
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns the value (refresh token without rotation)", () => {
			const returnValue = { reusable_refresh_token: "test_refresh_token" };
			const config = {
				configId: "configId1",
				allowUnsafeReuseRefreshToken: true,
			};
			const spy = vi.spyOn(securityStorage, "read");

			mockImplementationWhenArgsEqual(
				spy,
				["reusable_refresh_token", config],
				() => returnValue,
			);
			mockImplementationWhenArgsEqual(
				spy,
				["authnResult", config],
				() => undefined,
			);
			const result = service.getRefreshToken(config);

			expect(result).toBe(returnValue.reusable_refresh_token);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenCalledWith("authnResult", config);
			expect(spy).toHaveBeenCalledWith("reusable_refresh_token", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns null", () => {
			const returnValue = { authnResult: { NO_refresh_token: "someValue" } };
			const spy = vi
				.spyOn(securityStorage, "read")
				.mockReturnValue(returnValue);
			const config = { configId: "configId1" };
			const result = service.getRefreshToken(config);

			expect(result).toBeUndefined();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});

		it("get calls oidcSecurityStorage.read with correct key and returns null", () => {
			const spy = vi.spyOn(securityStorage, "read").mockReturnValue(null);
			const config = { configId: "configId1" };
			const result = service.getRefreshToken(config);

			expect(result).toBeUndefined();
			expect(spy).toHaveBeenCalledExactlyOnceWith("authnResult", config);
		});
	});
});

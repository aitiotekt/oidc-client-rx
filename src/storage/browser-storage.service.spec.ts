import { vi } from "vitest";
import { TestBed } from "@/testing";
import { LoggerService } from "../logging/logger.service";
import { mockClass, mockProvider } from "../testing/mock";
import { AbstractSecurityStorage } from "./abstract-security-storage";
import { BrowserStorageService } from "./browser-storage.service";
import { DefaultSessionStorageService } from "./default-sessionstorage.service";

describe("BrowserStorageService", () => {
	let service: BrowserStorageService;
	let abstractSecurityStorage: AbstractSecurityStorage;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				BrowserStorageService,
				mockProvider(LoggerService),
				{
					provide: AbstractSecurityStorage,
					useClass: mockClass(DefaultSessionStorageService),
				},
			],
		});
		abstractSecurityStorage = TestBed.inject(AbstractSecurityStorage);
		service = TestBed.inject(BrowserStorageService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("read", () => {
		it("returns null if there is no storage", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(false);

			expect(service.read("anything", config)).toBeNull();
		});

		it("returns null if getItem returns null", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);

			const result = service.read("anything", config);

			expect(result).toBeNull();
		});

		it("returns the item if getItem returns an item", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);
			const returnValue = `{ "name":"John", "age":30, "city":"New York"}`;

			vi.spyOn(abstractSecurityStorage, "read").mockReturnValue(returnValue);
			const result = service.read("anything", config);

			expect(result).toEqual(JSON.parse(returnValue));
		});
	});

	describe("write", () => {
		it("returns false if there is no storage", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(false);

			expect(service.write("anyvalue", config)).toBeFalsy();
		});

		it("writes object correctly with configId", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);
			const writeSpy = vi.spyOn(abstractSecurityStorage, "write");

			const result = service.write({ anyKey: "anyvalue" }, config);

			expect(result).toBe(true);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith(
				"configId1",
				JSON.stringify({ anyKey: "anyvalue" }),
			);
		});

		it("writes null if item is falsy", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);

			const writeSpy = vi.spyOn(abstractSecurityStorage, "write");
			const somethingFalsy = "";

			const result = service.write(somethingFalsy, config);

			expect(result).toBe(true);
			expect(writeSpy).toHaveBeenCalledExactlyOnceWith(
				"configId1",
				JSON.stringify(null),
			);
		});
	});

	describe("remove", () => {
		it("returns false if there is no storage", () => {
			const config = { configId: "configId1" };

			vi.spyOn(service as any, "hasStorage").mockReturnValue(false);
			expect(service.remove("anything", config)).toBeFalsy();
		});

		it("returns true if removeItem is called", () => {
			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);
			const config = { configId: "configId1" };

			const setItemSpy = vi.spyOn(abstractSecurityStorage, "remove");

			const result = service.remove("anyKey", config);

			expect(result).toBe(true);
			expect(setItemSpy).toHaveBeenCalledExactlyOnceWith("anyKey");
		});
	});

	describe("clear", () => {
		it("returns false if there is no storage", () => {
			vi.spyOn(service as any, "hasStorage").mockReturnValue(false);
			const config = { configId: "configId1" };

			expect(service.clear(config)).toBeFalsy();
		});

		it("returns true if clear is called", () => {
			vi.spyOn(service as any, "hasStorage").mockReturnValue(true);

			const setItemSpy = vi.spyOn(abstractSecurityStorage, "clear");
			const config = { configId: "configId1" };

			const result = service.clear(config);

			expect(result).toBe(true);
			expect(setItemSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("hasStorage", () => {
		it("returns false if there is no storage", () => {
			// biome-ignore lint/suspicious/noGlobalAssign: false positive
			(Storage as any) = undefined;
			expect((service as any).hasStorage()).toBeFalsy();
			// biome-ignore lint/correctness/noSelfAssign: false positive
			// biome-ignore lint/suspicious/noGlobalAssign: false positive
			Storage = Storage;
		});
	});
});

import { vi } from "vitest";
import { TestBed } from "@/testing";
import { DefaultSessionStorageService } from "./default-sessionstorage.service";

/**
 * if use jsdom, then use Storage.prototype, https://github.com/jsdom/jsdom/issues/2318
 */
describe("DefaultSessionStorageService", () => {
	let service: DefaultSessionStorageService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [DefaultSessionStorageService],
		});
		service = TestBed.inject(DefaultSessionStorageService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("read", () => {
		it("should call sessionstorage.getItem", () => {
			const spy = vi.spyOn(sessionStorage, "getItem");

			service.read("henlo");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo");
		});
	});

	describe("write", () => {
		it("should call sessionstorage.setItem", () => {
			const spy = vi.spyOn(sessionStorage, "setItem");

			service.write("henlo", "furiend");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo", "furiend");
		});
	});

	describe("remove", () => {
		it("should call sessionstorage.removeItem", () => {
			const spy = vi.spyOn(sessionStorage, "removeItem");

			service.remove("henlo");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo");
		});
	});

	describe("clear", () => {
		it("should call sessionstorage.clear", () => {
			const spy = vi.spyOn(sessionStorage, "clear");

			service.clear();

			expect(spy).toHaveBeenCalledTimes(1);
		});
	});
});

import { vi } from "vitest";
import { TestBed } from "@/testing";
import { DefaultLocalStorageService } from "./default-localstorage.service";

/**
 * if use jsdom, then use Storage.prototype, https://github.com/jsdom/jsdom/issues/2318
 */

describe("DefaultLocalStorageService", () => {
	let service: DefaultLocalStorageService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [DefaultLocalStorageService],
		});
		service = TestBed.inject(DefaultLocalStorageService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("read", () => {
		it("should call localstorage.getItem", () => {
			const spy = vi.spyOn(localStorage, "getItem");

			service.read("henlo");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo");
		});
	});

	describe("write", () => {
		it("should call localstorage.setItem", () => {
			const spy = vi.spyOn(localStorage, "setItem");

			service.write("henlo", "furiend");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo", "furiend");
		});
	});

	describe("remove", () => {
		it("should call localstorage.removeItem", () => {
			const spy = vi.spyOn(localStorage, "removeItem");

			service.remove("henlo");

			expect(spy).toHaveBeenCalledExactlyOnceWith("henlo");
		});
	});

	describe("clear", () => {
		it("should call localstorage.clear", () => {
			const spy = vi.spyOn(localStorage, "clear");

			service.clear();

			expect(spy).toHaveBeenCalledTimes(1);
		});
	});
});

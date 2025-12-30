import { HttpResponse } from "@ngify/http";
import { EmptyError, firstValueFrom, isObservable, of, throwError } from "rxjs";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { DataService } from "../api/data.service";
import { LoggerService } from "../logging/logger.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { createRetriableStream } from "../testing/create-retriable-stream.helper";
import { mockProvider } from "../testing/mock";
import { SigninKeyDataService } from "./signin-key-data.service";

const DUMMY_JWKS = {
	keys: [
		{
			kid: "random-id",
			kty: "RSA",
			alg: "RS256",
			use: "sig",
			n: "some-value",
			e: "AQAB",
			x5c: ["some-value"],
			x5t: "some-value",
			"x5t#S256": "some-value",
		},
	],
};

describe("Signin Key Data Service", () => {
	let service: SigninKeyDataService;
	let storagePersistenceService: StoragePersistenceService;
	let dataService: DataService;
	let loggerService: LoggerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				SigninKeyDataService,
				mockProvider(DataService),
				mockProvider(LoggerService),
				mockProvider(StoragePersistenceService),
			],
		});
		service = TestBed.inject(SigninKeyDataService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		dataService = TestBed.inject(DataService);
		loggerService = TestBed.inject(LoggerService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("getSigningKeys", () => {
		it("throws error when no wellKnownEndpoints given", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => null,
			);
			const result = service.getSigningKeys({ configId: "configId1" });

			try {
				await firstValueFrom(result);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("throws error when no jwksUri given", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ jwksUri: null }),
			);
			const result = service.getSigningKeys({ configId: "configId1" });

			try {
				await firstValueFrom(result);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});

		it("calls dataservice if jwksurl is given", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ jwksUri: "someUrl" }),
			);
			const spy = vi.spyOn(dataService, "get").mockImplementation(() => of());

			const result = service.getSigningKeys({ configId: "configId1" });

			try {
				await firstValueFrom(result);
			} catch (err: any) {
				if (err instanceof EmptyError) {
					expect(spy).toHaveBeenCalledExactlyOnceWith("someUrl", {
						configId: "configId1",
					});
				}
			}
		});

		it("should retry once", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ jwksUri: "someUrl" }),
			);
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("Error")),
					of(DUMMY_JWKS),
				),
			);

			const res = await firstValueFrom(
				service.getSigningKeys({ configId: "configId1" }),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual(DUMMY_JWKS);
		});

		it("should retry twice", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ jwksUri: "someUrl" }),
			);
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("Error")),
					throwError(() => new Error("Error")),
					of(DUMMY_JWKS),
				),
			);

			const res = await firstValueFrom(
				service.getSigningKeys({ configId: "configId1" }),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual(DUMMY_JWKS);
		});

		it("should fail after three tries", async () => {
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ jwksUri: "someUrl" }),
			);
			vi.spyOn(dataService, "get").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("Error")),
					throwError(() => new Error("Error")),
					throwError(() => new Error("Error")),
					of(DUMMY_JWKS),
				),
			);

			try {
				await firstValueFrom(service.getSigningKeys({ configId: "configId1" }));
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});
	});

	describe("handleErrorGetSigningKeys", () => {
		it("keeps observable if error is catched", () => {
			const result = (service as any).handleErrorGetSigningKeys(
				new HttpResponse(),
			);
			const hasTypeObservable = isObservable(result);

			expect(hasTypeObservable).toBeTruthy();
		});

		it("logs error if error is response", async () => {
			const logSpy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(
					(service as any).handleErrorGetSigningKeys(
						new HttpResponse({ status: 400, statusText: "nono" }),
						{ configId: "configId1" },
					),
				);
			} catch {
				expect(logSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"400 - nono {}",
				);
			}
		});

		it("logs error if error is not a response", async () => {
			const logSpy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(
					(service as any).handleErrorGetSigningKeys("Just some Error", {
						configId: "configId1",
					}),
				);
			} catch {
				expect(logSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"Just some Error",
				);
			}
		});

		it("logs error if error with message property is not a response", async () => {
			const logSpy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(
					(service as any).handleErrorGetSigningKeys(
						{ message: "Just some Error" },
						{ configId: "configId1" },
					),
				);
			} catch {
				expect(logSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"Just some Error",
				);
			}
		});
	});
});

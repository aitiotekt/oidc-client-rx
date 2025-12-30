import { HttpHeaders } from "@ngify/http";
import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { DataService } from "../../api/data.service";
import { LoggerService } from "../../logging/logger.service";
import { StoragePersistenceService } from "../../storage/storage-persistence.service";
import { createRetriableStream } from "../../testing/create-retriable-stream.helper";
import { mockProvider } from "../../testing/mock";
import { UrlService } from "../../utils/url/url.service";
import { ParService } from "./par.service";

describe("ParService", () => {
	let service: ParService;
	let loggerService: LoggerService;
	let urlService: UrlService;
	let dataService: DataService;
	let storagePersistenceService: StoragePersistenceService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ParService,
				mockProvider(LoggerService),
				mockProvider(UrlService),
				mockProvider(DataService),
				mockProvider(StoragePersistenceService),
			],
		});
		service = TestBed.inject(ParService);
		dataService = TestBed.inject(DataService);
		loggerService = TestBed.inject(LoggerService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		urlService = TestBed.inject(UrlService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("postParRequest", () => {
		it("throws error if authWellKnownEndPoints does not exist in storage", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of(null),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => null,
			);
			try {
				await firstValueFrom(service.postParRequest({ configId: "configId1" }));
			} catch (err: any) {
				expect(err.message).toBe(
					"Could not read PAR endpoint because authWellKnownEndPoints are not given",
				);
			}
		});

		it("throws error if par endpoint does not exist in storage", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of(null),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ some: "thing" }),
			);
			try {
				await firstValueFrom(service.postParRequest({ configId: "configId1" }));
			} catch (err: any) {
				expect(err.message).toBe(
					"Could not read PAR endpoint from authWellKnownEndpoints",
				);
			}
		});

		it("calls data service with correct params", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url123"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);

			const dataServiceSpy = vi
				.spyOn(dataService, "post")
				.mockReturnValue(of({}));

			await firstValueFrom(service.postParRequest({ configId: "configId1" }));
			expect(dataServiceSpy).toHaveBeenCalledExactlyOnceWith(
				"parEndpoint",
				"some-url123",
				{ configId: "configId1" },
				expect.any(HttpHeaders),
			);
		});

		it("Gives back correct object properties", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url456"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);
			vi.spyOn(dataService, "post").mockReturnValue(
				of({ expires_in: 123, request_uri: "request_uri" }),
			);
			const result = await firstValueFrom(
				service.postParRequest({ configId: "configId1" }),
			);
			expect(result).toEqual({ expiresIn: 123, requestUri: "request_uri" });
		});

		it("throws error if data service has got an error", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url789"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);
			vi.spyOn(dataService, "post").mockReturnValue(
				throwError(() => new Error("ERROR")),
			);
			const loggerSpy = vi.spyOn(loggerService, "logError");

			try {
				await firstValueFrom(service.postParRequest({ configId: "configId1" }));
			} catch (err: any) {
				expect(err.message).toBe(
					"There was an error on ParService postParRequest",
				);
				expect(loggerSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"There was an error on ParService postParRequest",
					expect.any(Error),
				);
			}
		});

		it("should retry once", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url456"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);
			vi.spyOn(dataService, "post").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("ERROR")),
					of({ expires_in: 123, request_uri: "request_uri" }),
				),
			);

			const res = await firstValueFrom(
				service.postParRequest({ configId: "configId1" }),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual({ expiresIn: 123, requestUri: "request_uri" });
		});

		it("should retry twice", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url456"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);
			vi.spyOn(dataService, "post").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("ERROR")),
					throwError(() => new Error("ERROR")),
					of({ expires_in: 123, request_uri: "request_uri" }),
				),
			);

			const res = await firstValueFrom(
				service.postParRequest({ configId: "configId1" }),
			);
			expect(res).toBeTruthy();
			expect(res).toEqual({ expiresIn: 123, requestUri: "request_uri" });
		});

		it("should fail after three tries", async () => {
			vi.spyOn(urlService, "createBodyForParCodeFlowRequest").mockReturnValue(
				of("some-url456"),
			);
			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", { configId: "configId1" }],
				() => ({ parEndpoint: "parEndpoint" }),
			);
			vi.spyOn(dataService, "post").mockReturnValue(
				createRetriableStream(
					throwError(() => new Error("ERROR")),
					throwError(() => new Error("ERROR")),
					throwError(() => new Error("ERROR")),
					of({ expires_in: 123, request_uri: "request_uri" }),
				),
			);

			try {
				await firstValueFrom(service.postParRequest({ configId: "configId1" }));
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
		});
	});
});

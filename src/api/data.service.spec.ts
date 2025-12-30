import { HttpHeaders } from "@ngify/http";
import { firstValueFrom, ReplaySubject, share } from "rxjs";
import { TestBed } from "@/testing";
import {
	type DefaultHttpTestingController,
	HTTP_CLIENT_TEST_CONTROLLER,
	provideHttpClientTesting,
} from "@/testing/http";
import { DataService } from "./data.service";
import { HttpBaseService } from "./http-base.service";

describe("Data Service", () => {
	let dataService: DataService;
	let httpMock: DefaultHttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [DataService, HttpBaseService, provideHttpClientTesting()],
		});
		dataService = TestBed.inject(DataService);
		httpMock = TestBed.inject(HTTP_CLIENT_TEST_CONTROLLER);
	});

	it("should create", () => {
		expect(dataService).toBeTruthy();
	});

	describe("get", () => {
		it("get call sets the accept header", async () => {
			const url = "testurl";

			const test$ = dataService.get(url, { configId: "configId1" }).pipe(
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("GET");
			expect(req.request.headers.get("Accept")).toBe("application/json");

			req.flush("bodyData");

			const data = await firstValueFrom(test$);
			expect(data).toBe("bodyData");

			httpMock.verify();
		});

		it("get call with token the accept header and the token", async () => {
			const url = "testurl";
			const token = "token";

			const test$ = dataService.get(url, { configId: "configId1" }, token).pipe(
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("GET");
			expect(req.request.headers.get("Accept")).toBe("application/json");
			expect(req.request.headers.get("Authorization")).toBe(`Bearer ${token}`);

			req.flush("bodyData");

			const data = await firstValueFrom(test$);
			expect(data).toBe("bodyData");

			httpMock.verify();
		});

		it("call without ngsw-bypass param by default", async () => {
			const url = "testurl";

			const test$ = dataService.get(url, { configId: "configId1" }).pipe(
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("GET");
			expect(req.request.headers.get("Accept")).toBe("application/json");
			expect(req.request.params.get("ngsw-bypass")).toBeNull();

			req.flush("bodyData");

			const data = await firstValueFrom(test$);
			expect(data).toBe("bodyData");

			httpMock.verify();
		});

		it("call with ngsw-bypass param", async () => {
			const url = "testurl";

			const test$ = dataService
				.get(url, {
					configId: "configId1",
					ngswBypass: true,
				})
				.pipe(
					share({
						connector: () => new ReplaySubject(1),
						resetOnError: false,
						resetOnComplete: false,
						resetOnRefCountZero: false,
					}),
				);

			test$.subscribe();

			const req = httpMock.expectOne(`${url}?ngsw-bypass=`);

			expect(req.request.method).toBe("GET");
			expect(req.request.headers.get("Accept")).toBe("application/json");

			// @TODO: should make a issue to ngify
			// expect(req.request.params.('ngsw-bypass')).toBe('');

			expect(req.request.params.has("ngsw-bypass")).toBeTruthy();

			req.flush("bodyData");

			const data = await firstValueFrom(test$);
			expect(data).toBe("bodyData");

			httpMock.verify();
		});
	});

	describe("post", () => {
		it("call sets the accept header when no other params given", async () => {
			const url = "testurl";

			const test$ = dataService
				.post(url, { some: "thing" }, { configId: "configId1" })
				.pipe(
					share({
						connector: () => new ReplaySubject(1),
						resetOnError: false,
						resetOnComplete: false,
						resetOnRefCountZero: false,
					}),
				);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("POST");
			expect(req.request.headers.get("Accept")).toBe("application/json");

			req.flush("bodyData");

			await firstValueFrom(test$);

			await httpMock.verify();
		});

		it("call sets custom headers ONLY (No ACCEPT header) when custom headers are given", async () => {
			const url = "testurl";
			let headers = new HttpHeaders();

			headers = headers.set("X-MyHeader", "Genesis");

			const test$ = dataService
				.post(url, { some: "thing" }, { configId: "configId1" }, headers)
				.pipe(
					share({
						connector: () => new ReplaySubject(1),
						resetOnError: false,
						resetOnComplete: false,
						resetOnRefCountZero: false,
					}),
				);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("POST");
			expect(req.request.headers.get("X-MyHeader")).toEqual("Genesis");
			expect(req.request.headers.get("X-MyHeader")).not.toEqual("Genesis333");

			req.flush("bodyData");

			await firstValueFrom(test$);

			httpMock.verify();
		});

		it("call without ngsw-bypass param by default", async () => {
			const url = "testurl";

			const test$ = dataService
				.post(url, { some: "thing" }, { configId: "configId1" })
				.pipe(
					share({
						connector: () => new ReplaySubject(1),
						resetOnError: false,
						resetOnComplete: false,
						resetOnRefCountZero: false,
					}),
				);

			test$.subscribe();

			const req = httpMock.expectOne(url);

			expect(req.request.method).toBe("POST");
			expect(req.request.headers.get("Accept")).toBe("application/json");
			expect(req.request.params.get("ngsw-bypass")).toBeNull();

			req.flush("bodyData");

			await firstValueFrom(test$);

			httpMock.verify();
		});

		it("call with ngsw-bypass param", async () => {
			const url = "testurl";

			const test$ = dataService
				.post(
					url,
					{ some: "thing" },
					{ configId: "configId1", ngswBypass: true },
				)
				.pipe(
					share({
						connector: () => new ReplaySubject(1),
						resetOnError: false,
						resetOnComplete: false,
						resetOnRefCountZero: false,
					}),
				);

			test$.subscribe();

			const req = httpMock.expectOne(`${url}?ngsw-bypass=`);

			expect(req.request.method).toBe("POST");
			expect(req.request.headers.get("Accept")).toBe("application/json");

			// @TODO: should make a issue to ngify
			// expect(req.request.params.('ngsw-bypass')).toBe('');

			expect(req.request.params.has("ngsw-bypass")).toBeTruthy();

			req.flush("bodyData");

			await firstValueFrom(test$);

			httpMock.verify();
		});
	});
});

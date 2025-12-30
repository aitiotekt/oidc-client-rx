import {
	type DefaultHttpClient,
	HTTP_CLIENT,
	HTTP_INTERCEPTOR_FNS,
	HTTP_LEGACY_INTERCEPTORS,
} from "oidc-client-rx";
import { firstValueFrom, ReplaySubject, share } from "rxjs";
import { vi } from "vitest";
import {
	type DefaultHttpTestingController,
	HTTP_CLIENT_TEST_CONTROLLER,
	provideHttpClientTesting,
	TestBed,
} from "@/testing";
import { AuthStateService } from "../auth-state/auth-state.service";
import { ConfigurationService } from "../config/config.service";
import { LoggerService } from "../logging/logger.service";
import { mockProvider } from "../testing/mock";
import { AuthInterceptor, authInterceptor } from "./auth.interceptor";
import { ClosestMatchingRouteService } from "./closest-matching-route.service";

describe("AuthHttpInterceptor", () => {
	let httpTestingController: DefaultHttpTestingController;
	let configurationService: ConfigurationService;
	let httpClient: DefaultHttpClient;
	let authStateService: AuthStateService;
	let closestMatchingRouteService: ClosestMatchingRouteService;

	describe("with Class Interceptor", () => {
		beforeEach(() => {
			TestBed.configureTestingModule({
				imports: [],
				providers: [
					ClosestMatchingRouteService,
					{
						provide: HTTP_LEGACY_INTERCEPTORS,
						useClass: AuthInterceptor,
						multi: true,
					},
					mockProvider(AuthStateService),
					mockProvider(LoggerService),
					mockProvider(ConfigurationService),
					provideHttpClientTesting(),
				],
			});

			httpClient = TestBed.inject(HTTP_CLIENT) as DefaultHttpClient;
			httpTestingController = TestBed.inject(HTTP_CLIENT_TEST_CONTROLLER);
			configurationService = TestBed.inject(ConfigurationService);
			authStateService = TestBed.inject(AuthStateService);
			closestMatchingRouteService = TestBed.inject(ClosestMatchingRouteService);
		});

		afterEach(() => {
			httpTestingController.verify();
		});

		runTests();
	});

	describe("with Functional Interceptor", () => {
		beforeEach(() => {
			TestBed.configureTestingModule({
				providers: [
					{
						provide: HTTP_INTERCEPTOR_FNS,
						useFactory: authInterceptor,
						multi: true,
					},
					ClosestMatchingRouteService,
					provideHttpClientTesting(),
					mockProvider(AuthStateService),
					mockProvider(LoggerService),
					mockProvider(ConfigurationService),
				],
			});

			httpClient = TestBed.inject(HTTP_CLIENT) as DefaultHttpClient;
			httpTestingController = TestBed.inject(HTTP_CLIENT_TEST_CONTROLLER);
			configurationService = TestBed.inject(ConfigurationService);
			authStateService = TestBed.inject(AuthStateService);
			closestMatchingRouteService = TestBed.inject(ClosestMatchingRouteService);
		});

		afterEach(() => {
			httpTestingController.verify();
		});

		runTests();
	});

	function runTests(): void {
		it("should add an Authorization header when route matches and token is present", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					secureRoutes: [actionUrl],
					configId: "configId1",
				},
			]);

			vi.spyOn(authStateService, "getAccessToken").mockReturnValue(
				"thisIsAToken",
			);
			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			httpRequest.flush("something");

			expect(httpRequest.request.headers.has("Authorization")).toEqual(true);

			const response = await firstValueFrom(test$);

			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when `secureRoutes` is not given", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					configId: "configId1",
				},
			]);
			vi.spyOn(authStateService, "getAccessToken").mockReturnValue(
				"thisIsAToken",
			);
			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);
			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when no routes configured", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					secureRoutes: [],
					configId: "configId1",
				},
			]);

			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);
			vi.spyOn(authStateService, "getAccessToken").mockReturnValue(
				"thisIsAToken",
			);
			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);

			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when no routes configured", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					secureRoutes: [],
					configId: "configId1",
				},
			]);

			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);
			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when route is configured but no token is present", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					secureRoutes: [actionUrl],
					configId: "configId1",
				},
			]);

			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);
			vi.spyOn(authStateService, "getAccessToken").mockReturnValue("");

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);

			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when no config is present", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				false,
			);

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);
			expect(response).toBeTruthy();

			httpTestingController.verify();
		});

		it("should not add an Authorization header when no configured route is matching the request", async () => {
			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);
			const actionUrl = "https://jsonplaceholder.typicode.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{
					secureRoutes: [actionUrl],
					configId: "configId1",
				},
			]);
			vi.spyOn(
				closestMatchingRouteService,
				"getConfigIdForClosestMatchingRoute",
			).mockReturnValue({
				matchingRoute: null,
				matchingConfig: null,
			});

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(false);

			httpRequest.flush("something");

			const response = await firstValueFrom(test$);
			expect(response).toBeTruthy();
			httpTestingController.verify();
		});

		it("should add an Authorization header when multiple routes are configured and token is present", async () => {
			const actionUrl = "https://jsonplaceholder.typicode.com/";
			const actionUrl2 = "https://some-other-url.com/";

			vi.spyOn(configurationService, "getAllConfigurations").mockReturnValue([
				{ secureRoutes: [actionUrl, actionUrl2], configId: "configId1" },
			]);

			vi.spyOn(authStateService, "getAccessToken").mockReturnValue(
				"thisIsAToken",
			);
			vi.spyOn(configurationService, "hasAtLeastOneConfig").mockReturnValue(
				true,
			);

			const test$ = httpClient.get(actionUrl).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);
			const test2$ = httpClient.get(actionUrl2).pipe(
				share({
					connector: () => new ReplaySubject(),
					resetOnComplete: false,
					resetOnError: false,
					resetOnRefCountZero: false,
				}),
			);

			test$.subscribe();
			test2$.subscribe();

			const httpRequest = httpTestingController.expectOne(actionUrl);

			expect(httpRequest.request.headers.has("Authorization")).toEqual(true);

			const httpRequest2 = httpTestingController.expectOne(actionUrl2);

			expect(httpRequest2.request.headers.has("Authorization")).toEqual(true);

			httpRequest.flush("something");
			httpRequest2.flush("something");

			const [response, response2] = await Promise.all([
				firstValueFrom(test$),
				firstValueFrom(test2$),
			]);
			expect(response).toBeTruthy();
			expect(response2).toBeTruthy();

			httpTestingController.verify();
		});
	}
});

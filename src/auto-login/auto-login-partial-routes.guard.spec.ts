import {
	AbstractRouter,
	type ActivatedRouteSnapshot,
	type RouterStateSnapshot,
} from "oidc-client-rx";
import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { type MockRouter, mockRouterProvider, TestBed } from "@/testing";
import { AuthStateService } from "../auth-state/auth-state.service";
import { CheckAuthService } from "../auth-state/check-auth.service";
import { ConfigurationService } from "../config/config.service";
import { LoginService } from "../login/login.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockProvider } from "../testing/mock";
import { AutoLoginService } from "./auto-login.service";
import {
	AutoLoginPartialRoutesGuard,
	autoLoginPartialRoutesGuard,
	autoLoginPartialRoutesGuardWithConfig,
} from "./auto-login-partial-routes.guard";

describe("AutoLoginPartialRoutesGuard", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				AutoLoginPartialRoutesGuard,
				mockRouterProvider(),
				AutoLoginService,
				mockProvider(AuthStateService),
				mockProvider(LoginService),
				mockProvider(StoragePersistenceService),
				mockProvider(CheckAuthService),
				mockProvider(ConfigurationService),
			],
		});
	});

	describe("Class based", () => {
		let guard: AutoLoginPartialRoutesGuard;
		let loginService: LoginService;
		let authStateService: AuthStateService;
		let storagePersistenceService: StoragePersistenceService;
		let configurationService: ConfigurationService;
		let autoLoginService: AutoLoginService;
		let router: MockRouter;

		beforeEach(() => {
			authStateService = TestBed.inject(AuthStateService);
			loginService = TestBed.inject(LoginService);
			storagePersistenceService = TestBed.inject(StoragePersistenceService);
			configurationService = TestBed.inject(ConfigurationService);

			vi.spyOn(configurationService, "getOpenIDConfiguration").mockReturnValue(
				of({ configId: "configId1" }),
			);

			guard = TestBed.inject(AutoLoginPartialRoutesGuard);
			autoLoginService = TestBed.inject(AutoLoginService);
			router = TestBed.inject(AbstractRouter);
		});

		afterEach(() => {
			storagePersistenceService.clear({});
		});

		it("should create", () => {
			expect(guard).toBeTruthy();
		});

		describe("canActivate", () => {
			it("should save current route and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivate(
						{} as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url1",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should save current route and call `login` if not authenticated already and add custom params", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivate(
						{ data: { custom: "param" } } as unknown as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url1",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					{ customParams: { custom: "param" } },
				);
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should call `checkSavedRedirectRouteAndNavigate` if authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					true,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivate(
						{} as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).not.toHaveBeenCalled();
				expect(loginSpy).not.toHaveBeenCalled();
				expect(
					checkSavedRedirectRouteAndNavigateSpy,
				).toHaveBeenCalledExactlyOnceWith({ configId: "configId1" });
			});
		});

		describe("canActivateChild", () => {
			it("should save current route and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivateChild(
						{} as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url1",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should save current route and call `login` if not authenticated already with custom params", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivateChild(
						{ data: { custom: "param" } } as unknown as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url1",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					{ customParams: { custom: "param" } },
				);
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should call `checkSavedRedirectRouteAndNavigate` if authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					true,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(
					guard.canActivateChild(
						{} as ActivatedRouteSnapshot,
						{ url: "some-url1" } as RouterStateSnapshot,
					),
				);
				expect(saveRedirectRouteSpy).not.toHaveBeenCalled();
				expect(loginSpy).not.toHaveBeenCalled();
				expect(
					checkSavedRedirectRouteAndNavigateSpy,
				).toHaveBeenCalledExactlyOnceWith({ configId: "configId1" });
			});
		});

		describe("canLoad", () => {
			it("should save current route (empty) and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(guard.canLoad());
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should save current route (with router extractedUrl) and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				vi.spyOn(router, "getCurrentNavigation").mockReturnValue({
					extractedUrl: router
						.parseUrl("some-url12/with/some-param?queryParam=true")
						.toString(),
				});

				await firstValueFrom(guard.canLoad());
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url12/with/some-param?queryParam=true",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should call `checkSavedRedirectRouteAndNavigate` if authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					true,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				await firstValueFrom(guard.canLoad());
				expect(saveRedirectRouteSpy).not.toHaveBeenCalled();
				expect(loginSpy).not.toHaveBeenCalled();
				expect(
					checkSavedRedirectRouteAndNavigateSpy,
				).toHaveBeenCalledExactlyOnceWith({ configId: "configId1" });
			});
		});
	});

	describe("functional", () => {
		describe("autoLoginPartialRoutesGuard", () => {
			let loginService: LoginService;
			let authStateService: AuthStateService;
			let storagePersistenceService: StoragePersistenceService;
			let configurationService: ConfigurationService;
			let autoLoginService: AutoLoginService;
			let router: MockRouter;

			beforeEach(() => {
				authStateService = TestBed.inject(AuthStateService);
				loginService = TestBed.inject(LoginService);
				storagePersistenceService = TestBed.inject(StoragePersistenceService);
				configurationService = TestBed.inject(ConfigurationService);

				vi.spyOn(
					configurationService,
					"getOpenIDConfiguration",
				).mockReturnValue(of({ configId: "configId1" }));

				autoLoginService = TestBed.inject(AutoLoginService);
				router = TestBed.inject(AbstractRouter);
			});

			afterEach(() => {
				storagePersistenceService.clear({});
			});

			it("should save current route (empty) and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				const guard$ = TestBed.runInInjectionContext(
					autoLoginPartialRoutesGuard,
				);

				await firstValueFrom(guard$);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should save current route (with router extractedUrl) and call `login` if not authenticated already", async () => {
				vi.spyOn(router, "getCurrentNavigation").mockReturnValue({
					extractedUrl: router
						.parseUrl("some-url12/with/some-param?queryParam=true")
						.toString(),
				});

				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				const guard$ = TestBed.runInInjectionContext(
					autoLoginPartialRoutesGuard,
				);

				await firstValueFrom(guard$);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"some-url12/with/some-param?queryParam=true",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should save current route and call `login` if not authenticated already and add custom params", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				const guard$ = TestBed.runInInjectionContext(() =>
					autoLoginPartialRoutesGuard({
						data: { custom: "param" },
					} as unknown as ActivatedRouteSnapshot),
				);

				await firstValueFrom(guard$);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					{ customParams: { custom: "param" } },
				);
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});

			it("should call `checkSavedRedirectRouteAndNavigate` if authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					true,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				const guard$ = TestBed.runInInjectionContext(
					autoLoginPartialRoutesGuard,
				);

				await firstValueFrom(guard$);
				expect(saveRedirectRouteSpy).not.toHaveBeenCalled();
				expect(loginSpy).not.toHaveBeenCalled();
				expect(
					checkSavedRedirectRouteAndNavigateSpy,
				).toHaveBeenCalledExactlyOnceWith({ configId: "configId1" });
			});
		});

		describe("autoLoginPartialRoutesGuardWithConfig", () => {
			let loginService: LoginService;
			let authStateService: AuthStateService;
			let storagePersistenceService: StoragePersistenceService;
			let configurationService: ConfigurationService;
			let autoLoginService: AutoLoginService;

			beforeEach(() => {
				authStateService = TestBed.inject(AuthStateService);
				loginService = TestBed.inject(LoginService);
				storagePersistenceService = TestBed.inject(StoragePersistenceService);
				configurationService = TestBed.inject(ConfigurationService);

				vi.spyOn(
					configurationService,
					"getOpenIDConfiguration",
				).mockImplementation((configId: string) => of({ configId }));

				autoLoginService = TestBed.inject(AutoLoginService);
			});

			afterEach(() => {
				storagePersistenceService.clear({});
			});

			it("should save current route (empty) and call `login` if not authenticated already", async () => {
				vi.spyOn(authStateService, "areAuthStorageTokensValid").mockReturnValue(
					false,
				);
				const checkSavedRedirectRouteAndNavigateSpy = vi.spyOn(
					autoLoginService,
					"checkSavedRedirectRouteAndNavigate",
				);
				const saveRedirectRouteSpy = vi.spyOn(
					autoLoginService,
					"saveRedirectRoute",
				);
				const loginSpy = vi.spyOn(loginService, "login");

				const guard$ = TestBed.runInInjectionContext(
					autoLoginPartialRoutesGuardWithConfig("configId1"),
				);

				await firstValueFrom(guard$);
				expect(saveRedirectRouteSpy).toHaveBeenCalledExactlyOnceWith(
					{ configId: "configId1" },
					"",
				);
				expect(loginSpy).toHaveBeenCalledExactlyOnceWith({
					configId: "configId1",
				});
				expect(checkSavedRedirectRouteAndNavigateSpy).not.toHaveBeenCalled();
			});
		});
	});
});

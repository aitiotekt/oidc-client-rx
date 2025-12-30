import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockProvider } from "../testing/mock";
import { LoginService } from "./login.service";
import type { LoginResponse } from "./login-response";
import { ParLoginService } from "./par/par-login.service";
import { PopUpService } from "./popup/popup.service";
import { PopUpLoginService } from "./popup/popup-login.service";
import { StandardLoginService } from "./standard/standard-login.service";

describe("LoginService", () => {
	let service: LoginService;
	let parLoginService: ParLoginService;
	let popUpLoginService: PopUpLoginService;
	let standardLoginService: StandardLoginService;
	let storagePersistenceService: StoragePersistenceService;
	let popUpService: PopUpService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				LoginService,
				mockProvider(ParLoginService),
				mockProvider(PopUpLoginService),
				mockProvider(StandardLoginService),
				mockProvider(StoragePersistenceService),
				mockProvider(PopUpService),
			],
		});
		service = TestBed.inject(LoginService);
		parLoginService = TestBed.inject(ParLoginService);
		popUpLoginService = TestBed.inject(PopUpLoginService);
		standardLoginService = TestBed.inject(StandardLoginService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
		popUpService = TestBed.inject(PopUpService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("login", () => {
		it("calls parLoginService loginPar if usePushedAuthorisationRequests is true", () => {
			const config = { usePushedAuthorisationRequests: true };
			const loginParSpy = vi.spyOn(parLoginService, "loginPar");
			const standardLoginSpy = vi.spyOn(standardLoginService, "loginStandard");

			service.login(config);

			expect(loginParSpy).toHaveBeenCalledTimes(1);
			expect(standardLoginSpy).not.toHaveBeenCalled();
		});

		it("calls standardLoginService loginStandard if usePushedAuthorisationRequests is false", () => {
			const config = { usePushedAuthorisationRequests: false };
			const loginParSpy = vi.spyOn(parLoginService, "loginPar");
			const standardLoginSpy = vi.spyOn(standardLoginService, "loginStandard");

			service.login(config);

			expect(loginParSpy).not.toHaveBeenCalled();
			expect(standardLoginSpy).toHaveBeenCalledTimes(1);
		});

		it("stores the customParams to the storage if customParams are given", () => {
			// arrange
			const config = { usePushedAuthorisationRequests: false };
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);
			const authOptions = { customParams: { custom: "params" } };

			service.login(config, authOptions);

			expect(storagePersistenceServiceSpy).toHaveBeenCalledExactlyOnceWith(
				"storageCustomParamsAuthRequest",
				{ custom: "params" },
				config,
			);
		});

		it("should throw error if configuration is null and doesn't call loginPar or loginStandard", async () => {
			// arrange
			const config = null;
			const loginParSpy = vi.spyOn(parLoginService, "loginPar");
			const standardLoginSpy = vi.spyOn(standardLoginService, "loginStandard");
			const authOptions = { customParams: { custom: "params" } };

			try {
				await firstValueFrom(service.login(config, authOptions));
				expect.fail("should be error");
			} catch (error: unknown) {
				expect(error).toEqual(
					new Error(
						"Please provide a configuration before setting up the module",
					),
				);
			}
			expect(loginParSpy).not.toHaveBeenCalled();
			expect(standardLoginSpy).not.toHaveBeenCalled();
		});
	});

	describe("loginWithPopUp", () => {
		it("calls parLoginService loginWithPopUpPar if usePushedAuthorisationRequests is true", async () => {
			// arrange
			const config = { usePushedAuthorisationRequests: true };
			const loginWithPopUpPar = vi
				.spyOn(parLoginService, "loginWithPopUpPar")
				.mockReturnValue(of({} as LoginResponse));
			const loginWithPopUpStandardSpy = vi
				.spyOn(popUpLoginService, "loginWithPopUpStandard")
				.mockReturnValue(of({} as LoginResponse));

			// act
			await firstValueFrom(service.loginWithPopUp(config, [config]));
			expect(loginWithPopUpPar).toHaveBeenCalledTimes(1);
			expect(loginWithPopUpStandardSpy).not.toHaveBeenCalled();
		});

		it("calls standardLoginService loginstandard if usePushedAuthorisationRequests is false", async () => {
			// arrange
			const config = { usePushedAuthorisationRequests: false };
			const loginWithPopUpPar = vi
				.spyOn(parLoginService, "loginWithPopUpPar")
				.mockReturnValue(of({} as LoginResponse));
			const loginWithPopUpStandardSpy = vi
				.spyOn(popUpLoginService, "loginWithPopUpStandard")
				.mockReturnValue(of({} as LoginResponse));

			// act
			await firstValueFrom(service.loginWithPopUp(config, [config]));
			expect(loginWithPopUpPar).not.toHaveBeenCalled();
			expect(loginWithPopUpStandardSpy).toHaveBeenCalledTimes(1);
		});

		it("stores the customParams to the storage if customParams are given", async () => {
			// arrange
			const config = { usePushedAuthorisationRequests: false };
			const storagePersistenceServiceSpy = vi.spyOn(
				storagePersistenceService,
				"write",
			);
			const authOptions = { customParams: { custom: "params" } };

			vi.spyOn(popUpLoginService, "loginWithPopUpStandard").mockReturnValue(
				of({} as LoginResponse),
			);

			// act
			await firstValueFrom(
				service.loginWithPopUp(config, [config], authOptions),
			);
			expect(storagePersistenceServiceSpy).toHaveBeenCalledExactlyOnceWith(
				"storageCustomParamsAuthRequest",
				{ custom: "params" },
				config,
			);
		});

		it("returns error if there is already a popup open", async () => {
			// arrange
			const config = { usePushedAuthorisationRequests: false };
			const authOptions = { customParams: { custom: "params" } };
			const loginWithPopUpPar = vi
				.spyOn(parLoginService, "loginWithPopUpPar")
				.mockReturnValue(of({} as LoginResponse));
			const loginWithPopUpStandardSpy = vi
				.spyOn(popUpLoginService, "loginWithPopUpStandard")
				.mockReturnValue(of({} as LoginResponse));

			vi.spyOn(popUpService, "isCurrentlyInPopup").mockReturnValue(true);

			// act
			const result = await firstValueFrom(
				service.loginWithPopUp(config, [config], authOptions),
			);
			expect(result).toEqual({
				errorMessage: "There is already a popup open.",
			} as LoginResponse);
			expect(loginWithPopUpPar).not.toHaveBeenCalled();
			expect(loginWithPopUpStandardSpy).not.toHaveBeenCalled();
		});
	});
});

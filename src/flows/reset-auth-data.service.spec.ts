import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AuthStateService } from "../auth-state/auth-state.service";
import { LoggerService } from "../logging/logger.service";
import { mockProvider } from "../testing/mock";
import { UserService } from "../user-data/user.service";
import { FlowsDataService } from "./flows-data.service";
import { ResetAuthDataService } from "./reset-auth-data.service";

describe("ResetAuthDataService", () => {
	let service: ResetAuthDataService;
	let userService: UserService;
	let flowsDataService: FlowsDataService;
	let authStateService: AuthStateService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ResetAuthDataService,
				mockProvider(AuthStateService),
				mockProvider(FlowsDataService),
				mockProvider(UserService),
				mockProvider(LoggerService),
			],
		});
		service = TestBed.inject(ResetAuthDataService);
		userService = TestBed.inject(UserService);
		flowsDataService = TestBed.inject(FlowsDataService);
		authStateService = TestBed.inject(AuthStateService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("resetAuthorizationData", () => {
		it("calls resetUserDataInStore when autoUserInfo is true", () => {
			const resetUserDataInStoreSpy = vi.spyOn(
				userService,
				"resetUserDataInStore",
			);
			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			service.resetAuthorizationData(allConfigs[0]!, allConfigs);
			expect(resetUserDataInStoreSpy).toHaveBeenCalled();
		});

		it("calls correct methods", () => {
			const resetStorageFlowDataSpy = vi.spyOn(
				flowsDataService,
				"resetStorageFlowData",
			);
			const setUnauthorizedAndFireEventSpy = vi.spyOn(
				authStateService,
				"setUnauthenticatedAndFireEvent",
			);
			const allConfigs = [
				{
					configId: "configId1",
				},
			];

			service.resetAuthorizationData(allConfigs[0]!, allConfigs);

			expect(resetStorageFlowDataSpy).toHaveBeenCalled();
			expect(setUnauthorizedAndFireEventSpy).toHaveBeenCalled();
		});
	});
});

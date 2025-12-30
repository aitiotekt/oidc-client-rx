import { firstValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import type { CallbackContext } from "../flows/callback-context";
import { FlowsService } from "../flows/flows.service";
import { ResetAuthDataService } from "../flows/reset-auth-data.service";
import { LoggerService } from "../logging/logger.service";
import { mockProvider } from "../testing/mock";
import { IntervalService } from "./interval.service";
import { RefreshSessionRefreshTokenService } from "./refresh-session-refresh-token.service";

describe("RefreshSessionRefreshTokenService", () => {
	let refreshSessionRefreshTokenService: RefreshSessionRefreshTokenService;
	let intervalService: IntervalService;
	let resetAuthDataService: ResetAuthDataService;
	let flowsService: FlowsService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				RefreshSessionRefreshTokenService,
				mockProvider(LoggerService),
				mockProvider(FlowsService),
				mockProvider(ResetAuthDataService),
				mockProvider(IntervalService),
			],
		});
		flowsService = TestBed.inject(FlowsService);
		refreshSessionRefreshTokenService = TestBed.inject(
			RefreshSessionRefreshTokenService,
		);
		intervalService = TestBed.inject(IntervalService);
		resetAuthDataService = TestBed.inject(ResetAuthDataService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(refreshSessionRefreshTokenService).toBeTruthy();
	});

	describe("refreshSessionWithRefreshTokens", () => {
		it("calls flowsService.processRefreshToken()", async () => {
			const spy = vi
				.spyOn(flowsService, "processRefreshToken")
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				refreshSessionRefreshTokenService.refreshSessionWithRefreshTokens(
					{ configId: "configId1" },
					[{ configId: "configId1" }],
				),
			);
			expect(spy).toHaveBeenCalled();
		});

		it("resetAuthorizationData in case of error", async () => {
			vi.spyOn(flowsService, "processRefreshToken").mockReturnValue(
				throwError(() => new Error("error")),
			);
			const resetSilentRenewRunningSpy = vi.spyOn(
				resetAuthDataService,
				"resetAuthorizationData",
			);

			try {
				await firstValueFrom(
					refreshSessionRefreshTokenService.refreshSessionWithRefreshTokens(
						{ configId: "configId1" },
						[{ configId: "configId1" }],
					),
				);
			} catch (err: any) {
				expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
				expect(err).toBeTruthy();
			}
		});

		it("finalize with stopPeriodicTokenCheck in case of error", async () => {
			vi.spyOn(flowsService, "processRefreshToken").mockReturnValue(
				throwError(() => new Error("error")),
			);
			const stopPeriodicallyTokenCheckSpy = vi.spyOn(
				intervalService,
				"stopPeriodicTokenCheck",
			);

			try {
				await firstValueFrom(
					refreshSessionRefreshTokenService.refreshSessionWithRefreshTokens(
						{ configId: "configId1" },
						[{ configId: "configId1" }],
					),
				);
			} catch (err: any) {
				expect(err).toBeTruthy();
			}
			await vi.advanceTimersByTimeAsync(0);
			expect(stopPeriodicallyTokenCheckSpy).toHaveBeenCalled();
		});
	});
});

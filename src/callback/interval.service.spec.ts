import { Subscription } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { IntervalService } from "./interval.service";

describe("IntervalService", () => {
	let intervalService: IntervalService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [
				IntervalService,
				{
					provide: Document,
					useValue: {
						defaultView: {
							setInterval: window.setInterval,
						},
					},
				},
			],
		});
		intervalService = TestBed.inject(IntervalService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create", () => {
		expect(intervalService).toBeTruthy();
	});

	describe("stopPeriodicTokenCheck", () => {
		it("calls unsubscribe and sets to null", () => {
			intervalService.runTokenValidationRunning = new Subscription();
			const spy = vi.spyOn(
				intervalService.runTokenValidationRunning,
				"unsubscribe",
			);

			intervalService.stopPeriodicTokenCheck();

			expect(spy).toHaveBeenCalled();
			expect(intervalService.runTokenValidationRunning).toBeNull();
		});

		it("does nothing if `runTokenValidationRunning` is null", () => {
			intervalService.runTokenValidationRunning = new Subscription();
			const spy = vi.spyOn(
				intervalService.runTokenValidationRunning,
				"unsubscribe",
			);

			intervalService.runTokenValidationRunning = null;
			intervalService.stopPeriodicTokenCheck();

			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe("startPeriodicTokenCheck", () => {
		it("starts check after correct milliseconds", async () => {
			const periodicCheck = intervalService.startPeriodicTokenCheck(0.5);
			const spy = vi.fn();
			const sub = periodicCheck.subscribe(() => {
				spy();
			});

			await vi.advanceTimersByTimeAsync(500);
			expect(spy).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(500);
			expect(spy).toHaveBeenCalledTimes(2);

			sub.unsubscribe();
		});
	});
});

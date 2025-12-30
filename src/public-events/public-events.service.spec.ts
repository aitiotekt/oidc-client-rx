import { firstValueFrom, ReplaySubject, timer } from "rxjs";
import { filter, share } from "rxjs/operators";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { EventTypes } from "./event-types";
import { PublicEventsService } from "./public-events.service";

describe("Events Service", () => {
	let eventsService: PublicEventsService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [PublicEventsService],
		});
		eventsService = TestBed.inject(PublicEventsService);
	});

	it("should create", () => {
		expect(eventsService).toBeTruthy();
	});

	it("registering to single event with one event emit works", async () => {
		eventsService.fireEvent(EventTypes.ConfigLoaded, { myKey: "myValue" });

		const firedEvent = await firstValueFrom(eventsService.registerForEvents());
		expect(firedEvent).toBeTruthy();
		expect(firedEvent).toEqual({
			type: EventTypes.ConfigLoaded,
			value: { myKey: "myValue" },
		});
	});

	it("registering to single event with multiple same event emit works", async () => {
		const spy = vi.fn();

		eventsService.registerForEvents().subscribe((firedEvent) => {
			spy(firedEvent);
			expect(firedEvent).toBeTruthy();
		});

		eventsService.fireEvent(EventTypes.ConfigLoaded, { myKey: "myValue" });
		eventsService.fireEvent(EventTypes.ConfigLoaded, { myKey: "myValue2" });

		expect(spy.mock.calls.length).toBe(2);
		expect(spy.mock.calls[0]?.[0]).toEqual({
			type: EventTypes.ConfigLoaded,
			value: { myKey: "myValue" },
		});
		expect(spy.mock.calls.at(-1)?.[0]).toEqual({
			type: EventTypes.ConfigLoaded,
			value: { myKey: "myValue2" },
		});

		await firstValueFrom(timer(0));
	});

	it("registering to single event with multiple emit works", async () => {
		const o$ = eventsService.registerForEvents().pipe(
			filter((x) => x.type === EventTypes.ConfigLoaded),
			share({
				connector: () => new ReplaySubject(1),
				resetOnError: false,
				resetOnComplete: false,
				resetOnRefCountZero: true,
			}),
		);

		o$.subscribe((firedEvent) => {
			expect(firedEvent).toBeTruthy();
			expect(firedEvent).toEqual({
				type: EventTypes.ConfigLoaded,
				value: { myKey: "myValue" },
			});
			return firedEvent;
		});

		eventsService.fireEvent(EventTypes.ConfigLoaded, { myKey: "myValue" });
		eventsService.fireEvent(EventTypes.NewAuthenticationResult, true);

		await firstValueFrom(o$);
	});
});

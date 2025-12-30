import { DESTORY_REF } from "oidc-client-rx";
import { firstValueFrom, NEVER, of, ReplaySubject } from "rxjs";
import { share, skip } from "rxjs/operators";
import { vi } from "vitest";
import { mockImplementationWhenArgsEqual, TestBed } from "@/testing";
import { LoggerService } from "../logging/logger.service";
import { OidcSecurityService } from "../oidc.security.service";
import { PublicEventsService } from "../public-events/public-events.service";
import { AbstractSecurityStorage } from "../storage/abstract-security-storage";
import { DefaultSessionStorageService } from "../storage/default-sessionstorage.service";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import { mockAbstractProvider, mockProvider } from "../testing/mock";
import { PlatformProvider } from "../utils/platform-provider/platform.provider";
import { CheckSessionService } from "./check-session.service";
import { IFrameService } from "./existing-iframe.service";

describe("CheckSessionService", () => {
	let checkSessionService: CheckSessionService;
	let loggerService: LoggerService;
	let iFrameService: IFrameService;
	let storagePersistenceService: StoragePersistenceService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				CheckSessionService,
				OidcSecurityService,
				IFrameService,
				PublicEventsService,
				{
					provide: DESTORY_REF,
					useFactory: () => NEVER,
				},
				mockProvider(StoragePersistenceService),
				mockProvider(LoggerService),
				mockProvider(PlatformProvider),
				mockAbstractProvider(
					AbstractSecurityStorage,
					DefaultSessionStorageService,
				),
			],
		});
		checkSessionService = TestBed.inject(CheckSessionService);
		loggerService = TestBed.inject(LoggerService);
		iFrameService = TestBed.inject(IFrameService);
		storagePersistenceService = TestBed.inject(StoragePersistenceService);
	});

	afterEach(() => {
		const iFrameIdwhichshouldneverexist = window.document.getElementById(
			"idwhichshouldneverexist",
		);

		if (iFrameIdwhichshouldneverexist) {
			iFrameIdwhichshouldneverexist.parentNode?.removeChild(
				iFrameIdwhichshouldneverexist,
			);
		}
		const myiFrameForCheckSession = window.document.getElementById(
			"myiFrameForCheckSession",
		);

		if (myiFrameForCheckSession) {
			myiFrameForCheckSession.parentNode?.removeChild(myiFrameForCheckSession);
		}
	});

	it("should create", () => {
		expect(checkSessionService).toBeTruthy();
	});

	it("getOrCreateIframe calls iFrameService.addIFrameToWindowBody if no Iframe exists", () => {
		vi.spyOn(iFrameService, "addIFrameToWindowBody");

		const result = (checkSessionService as any).getOrCreateIframe({
			configId: "configId1",
		});

		expect(result).toBeTruthy();
		expect(iFrameService.addIFrameToWindowBody).toHaveBeenCalled();
	});

	it("getOrCreateIframe returns true if document found on window.document", () => {
		iFrameService.addIFrameToWindowBody("myiFrameForCheckSession", {
			configId: "configId1",
		});

		const result = (checkSessionService as any).getOrCreateIframe();

		expect(result).toBeDefined();
	});

	it("init appends iframe on body with correct values", () => {
		expect((checkSessionService as any).sessionIframe).toBeFalsy();
		vi.spyOn(loggerService, "logDebug").mockImplementation(() => undefined);

		(checkSessionService as any).init();
		const iframe = (checkSessionService as any).getOrCreateIframe({
			configId: "configId1",
		});

		expect(iframe).toBeTruthy();
		expect(iframe.id).toBe("myiFrameForCheckSession");
		expect(iframe.style.display).toBe("none");
		const iFrame = document.getElementById("myiFrameForCheckSession");

		expect(iFrame).toBeDefined();
	});

	it("log warning if authWellKnownEndpoints.check_session_iframe is not existing", () => {
		const spyLogWarning = vi.spyOn<any, any>(loggerService, "logWarning");
		const config = { configId: "configId1" };

		vi.spyOn<any, any>(loggerService, "logDebug").mockImplementation(
			() => undefined,
		);

		mockImplementationWhenArgsEqual(
			vi.spyOn(storagePersistenceService, "read"),
			["authWellKnownEndPoints", config],
			() => ({ checkSessionIframe: undefined }),
		);
		(checkSessionService as any).init(config);

		expect(spyLogWarning).toHaveBeenCalledExactlyOnceWith(
			config,
			expect.any(String),
		);
	});

	it("start() calls pollserversession() with clientId if no scheduledheartbeat is set", () => {
		const spy = vi.spyOn<any, any>(checkSessionService, "pollServerSession");
		const config = { clientId: "clientId", configId: "configId1" };

		checkSessionService.start(config);
		expect(spy).toHaveBeenCalledExactlyOnceWith("clientId", config);
	});

	it("start() does not call pollServerSession() if scheduledHeartBeatRunning is set", () => {
		const config = { configId: "configId1" };
		const spy = vi.spyOn<any, any>(checkSessionService, "pollServerSession");

		(checkSessionService as any).scheduledHeartBeatRunning = (): void =>
			undefined;
		checkSessionService.start(config);
		expect(spy).not.toHaveBeenCalled();
	});

	it("stopCheckingSession sets heartbeat to null", () => {
		(checkSessionService as any).scheduledHeartBeatRunning = setTimeout(
			() => undefined,
			999,
		);
		checkSessionService.stop();
		const heartBeat = (checkSessionService as any).scheduledHeartBeatRunning;

		expect(heartBeat).toBeNull();
	});

	it("stopCheckingSession does nothing if scheduledHeartBeatRunning is not set", () => {
		(checkSessionService as any).scheduledHeartBeatRunning = null;
		const spy = vi.spyOn<any, any>(
			checkSessionService,
			"clearScheduledHeartBeat",
		);

		checkSessionService.stop();
		expect(spy).not.toHaveBeenCalledExactlyOnceWith();
	});

	describe("serverStateChanged", () => {
		it("returns false if startCheckSession is not configured", () => {
			const config = { startCheckSession: false, configId: "configId1" };
			const result = checkSessionService.serverStateChanged(config);

			expect(result).toBeFalsy();
		});

		it("returns false if checkSessionReceived is false", () => {
			(checkSessionService as any).checkSessionReceived = false;
			const config = { startCheckSession: true, configId: "configId1" };
			const result = checkSessionService.serverStateChanged(config);

			expect(result).toBeFalsy();
		});

		it("returns true if startCheckSession is configured and checkSessionReceived is true", () => {
			(checkSessionService as any).checkSessionReceived = true;
			const config = { startCheckSession: true, configId: "configId1" };
			const result = checkSessionService.serverStateChanged(config);

			expect(result).toBeTruthy();
		});
	});

	describe("pollServerSession", () => {
		beforeEach(() => {
			vi.spyOn<any, any>(checkSessionService, "init").mockReturnValue(
				of(undefined),
			);
		});

		it("increases outstandingMessages", () => {
			vi.spyOn<any, any>(
				checkSessionService,
				"getExistingIframe",
			).mockReturnValue({
				contentWindow: { postMessage: () => undefined },
			});
			const authWellKnownEndpoints = {
				checkSessionIframe: "https://some-testing-url.com",
			};
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "read"),
					["authWellKnownEndPoints", config],
					() => authWellKnownEndpoints,
				),
				["session_state", config],
				() => "session_state",
			);

			vi.spyOn(loggerService, "logDebug").mockImplementation(() => undefined);
			(checkSessionService as any).pollServerSession("clientId", config);
			expect((checkSessionService as any).outstandingMessages).toBe(1);
		});

		it("logs warning if iframe does not exist", () => {
			vi.spyOn<any, any>(
				checkSessionService,
				"getExistingIframe",
			).mockReturnValue(null);
			const authWellKnownEndpoints = {
				checkSessionIframe: "https://some-testing-url.com",
			};
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => authWellKnownEndpoints,
			);
			const spyLogWarning = vi
				.spyOn(loggerService, "logWarning")
				.mockImplementation(() => undefined);

			vi.spyOn(loggerService, "logDebug").mockImplementation(() => undefined);
			(checkSessionService as any).pollServerSession("clientId", config);
			expect(spyLogWarning).toHaveBeenCalledExactlyOnceWith(
				config,
				expect.any(String),
			);
		});

		it("logs warning if clientId is not set", () => {
			vi.spyOn<any, any>(
				checkSessionService,
				"getExistingIframe",
			).mockReturnValue({});
			const authWellKnownEndpoints = {
				checkSessionIframe: "https://some-testing-url.com",
			};
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				vi.spyOn(storagePersistenceService, "read"),
				["authWellKnownEndPoints", config],
				() => authWellKnownEndpoints,
			);
			const spyLogWarning = vi
				.spyOn(loggerService, "logWarning")
				.mockImplementation(() => undefined);

			vi.spyOn(loggerService, "logDebug").mockImplementation(() => undefined);
			(checkSessionService as any).pollServerSession("", config);
			expect(spyLogWarning).toHaveBeenCalledExactlyOnceWith(
				config,
				expect.any(String),
			);
		});

		it("logs debug if session_state is not set", () => {
			vi.spyOn<any, any>(
				checkSessionService,
				"getExistingIframe",
			).mockReturnValue({});
			const authWellKnownEndpoints = {
				checkSessionIframe: "https://some-testing-url.com",
			};
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "read"),
					["authWellKnownEndPoints", config],
					() => authWellKnownEndpoints,
				),
				["session_state", config],
				() => null,
			);

			const spyLogDebug = vi
				.spyOn(loggerService, "logDebug")
				.mockImplementation(() => undefined);

			(checkSessionService as any).pollServerSession("clientId", config);
			expect(spyLogDebug).toHaveBeenCalledTimes(2);
		});

		it("logs debug if session_state is set but authWellKnownEndpoints are not set", () => {
			vi.spyOn(checkSessionService, "getExistingIframe").mockReturnValue(
				{} as any,
			);
			const authWellKnownEndpoints = null;
			const config = { configId: "configId1" };

			mockImplementationWhenArgsEqual(
				mockImplementationWhenArgsEqual(
					vi.spyOn(storagePersistenceService, "read"),
					["authWellKnownEndPoints", config],
					() => authWellKnownEndpoints,
				),
				["session_state", config],
				() => "some_session_state",
			);

			const spyLogDebug = vi
				.spyOn(loggerService, "logDebug")
				.mockImplementation(() => undefined);

			(checkSessionService as any).pollServerSession("clientId", config);
			expect(spyLogDebug).toHaveBeenCalledTimes(2);
		});
	});

	describe("init", () => {
		it("angular oidc client", async () => {
			const serviceAsAny = checkSessionService as any;
			const dateNow = new Date();
			const lastRefresh = dateNow.setMinutes(dateNow.getMinutes() + 30);

			serviceAsAny.lastIFrameRefresh = lastRefresh;
			serviceAsAny.iframeRefreshInterval = lastRefresh;

			const result = await firstValueFrom(serviceAsAny.init());
			expect(result).toBeUndefined();
		});
	});

	describe("isCheckSessionConfigured", () => {
		it("returns true if startCheckSession on config is true", () => {
			const config = { configId: "configId1", startCheckSession: true };

			const result = checkSessionService.isCheckSessionConfigured(config);

			expect(result).toBe(true);
		});

		it("returns true if startCheckSession on config is true", () => {
			const config = { configId: "configId1", startCheckSession: false };

			const result = checkSessionService.isCheckSessionConfigured(config);

			expect(result).toBe(false);
		});
	});

	describe("checkSessionChanged$", () => {
		it("emits when internal event is thrown", async () => {
			const test$ = checkSessionService.checkSessionChanged$.pipe(
				skip(1),
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: true,
				}),
			);

			test$.subscribe();
			const serviceAsAny = checkSessionService as any;

			serviceAsAny.checkSessionChangedInternal$.next(true);

			const result = await firstValueFrom(test$);
			expect(result).toBe(true);
		});

		it("emits false initially", async () => {
			const result = await firstValueFrom(
				checkSessionService.checkSessionChanged$,
			);
			expect(result).toBe(false);
		});

		it("emits false then true when emitted", async () => {
			const expectedResultsInOrder = [false, true];
			let counter = 0;

			const result = await firstValueFrom(
				checkSessionService.checkSessionChanged$,
			);
			expect(result).toBe(expectedResultsInOrder[counter]);
			counter++;

			(checkSessionService as any).checkSessionChangedInternal$.next(true);
		});
	});
});

import { firstValueFrom, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import { LoggerService } from "../logging/logger.service";
import { mockProvider } from "../testing/mock";
import { UrlService } from "../utils/url/url.service";
import { RefreshSessionIframeService } from "./refresh-session-iframe.service";
import { SilentRenewService } from "./silent-renew.service";

describe("RefreshSessionIframeService ", () => {
	let refreshSessionIframeService: RefreshSessionIframeService;
	let urlService: UrlService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				RefreshSessionIframeService,
				mockProvider(SilentRenewService),
				mockProvider(LoggerService),
				mockProvider(UrlService),
			],
		});
		refreshSessionIframeService = TestBed.inject(RefreshSessionIframeService);
		urlService = TestBed.inject(UrlService);
	});

	it("should create", () => {
		expect(refreshSessionIframeService).toBeTruthy();
	});

	describe("refreshSessionWithIframe", () => {
		it("calls sendAuthorizeRequestUsingSilentRenew with created url", async () => {
			vi.spyOn(urlService, "getRefreshSessionSilentRenewUrl").mockReturnValue(
				of("a-url"),
			);
			const sendAuthorizeRequestUsingSilentRenewSpy = vi
				.spyOn(
					refreshSessionIframeService as any,
					"sendAuthorizeRequestUsingSilentRenew",
				)
				.mockReturnValue(of(null));
			const allConfigs = [{ configId: "configId1" }];

			await firstValueFrom(
				refreshSessionIframeService.refreshSessionWithIframe(
					allConfigs[0]!,
					allConfigs,
				),
			);
			expect(
				sendAuthorizeRequestUsingSilentRenewSpy,
			).toHaveBeenCalledExactlyOnceWith("a-url", allConfigs[0]!, allConfigs);
		});
	});

	describe("initSilentRenewRequest", () => {
		it("dispatches customevent to window object", () => {
			const dispatchEventSpy = vi.spyOn(
				document.defaultView?.window!,
				"dispatchEvent",
			);

			(refreshSessionIframeService as any).initSilentRenewRequest();
			expect(dispatchEventSpy).toHaveBeenCalledOnce();
			expect(dispatchEventSpy.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
			expect(
				(dispatchEventSpy.mock.calls[0][0] as CustomEvent).detail,
			).toBeTypeOf("number");
		});
	});
});

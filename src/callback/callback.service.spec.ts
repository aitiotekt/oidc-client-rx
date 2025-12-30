import { firstValueFrom, Observable, of } from "rxjs";
import { vi } from "vitest";
import { TestBed } from "@/testing";
import type { CallbackContext } from "../flows/callback-context";
import { mockProvider } from "../testing/mock";
import { FlowHelper } from "../utils/flowHelper/flow-helper.service";
import { UrlService } from "../utils/url/url.service";
import { CallbackService } from "./callback.service";
import { CodeFlowCallbackService } from "./code-flow-callback.service";
import { ImplicitFlowCallbackService } from "./implicit-flow-callback.service";

describe("CallbackService ", () => {
	let callbackService: CallbackService;
	let implicitFlowCallbackService: ImplicitFlowCallbackService;
	let codeFlowCallbackService: CodeFlowCallbackService;
	let flowHelper: FlowHelper;
	let urlService: UrlService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [
				CallbackService,
				mockProvider(UrlService),
				FlowHelper,
				mockProvider(ImplicitFlowCallbackService),
				mockProvider(CodeFlowCallbackService),
			],
		});
		callbackService = TestBed.inject(CallbackService);
		flowHelper = TestBed.inject(FlowHelper);
		implicitFlowCallbackService = TestBed.inject(ImplicitFlowCallbackService);
		codeFlowCallbackService = TestBed.inject(CodeFlowCallbackService);
		urlService = TestBed.inject(UrlService);
	});

	describe("isCallback", () => {
		it("calls urlService.isCallbackFromSts with passed url", () => {
			const urlServiceSpy = vi.spyOn(urlService, "isCallbackFromSts");

			callbackService.isCallback("anyUrl");
			expect(urlServiceSpy).toHaveBeenCalledExactlyOnceWith(
				"anyUrl",
				undefined,
			);
		});
	});

	describe("stsCallback$", () => {
		it("is of type Observable", () => {
			expect(callbackService.stsCallback$).toBeInstanceOf(Observable);
		});
	});

	describe("handleCallbackAndFireEvents", () => {
		it("calls authorizedCallbackWithCode if current flow is code flow", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			const authorizedCallbackWithCodeSpy = vi
				.spyOn(codeFlowCallbackService, "authenticatedCallbackWithCode")
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				callbackService.handleCallbackAndFireEvents(
					"anyUrl",
					{ configId: "configId1" },
					[{ configId: "configId1" }],
				),
			);

			expect(authorizedCallbackWithCodeSpy).toHaveBeenCalledExactlyOnceWith(
				"anyUrl",
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);
		});

		it("calls authorizedImplicitFlowCallback without hash if current flow is implicit flow and callbackurl does not include a hash", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(false);
			vi.spyOn(flowHelper, "isCurrentFlowAnyImplicitFlow").mockReturnValue(
				true,
			);
			const authorizedCallbackWithCodeSpy = vi
				.spyOn(implicitFlowCallbackService, "authenticatedImplicitFlowCallback")
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				callbackService.handleCallbackAndFireEvents(
					"anyUrl",
					{ configId: "configId1" },
					[{ configId: "configId1" }],
				),
			);
			expect(authorizedCallbackWithCodeSpy.mock.calls).toEqual([
				[{ configId: "configId1" }, [{ configId: "configId1" }]],
			]);
		});

		it("calls authorizedImplicitFlowCallback with hash if current flow is implicit flow and callbackurl does include a hash", async () => {
			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(false);
			vi.spyOn(flowHelper, "isCurrentFlowAnyImplicitFlow").mockReturnValue(
				true,
			);
			const authorizedCallbackWithCodeSpy = vi
				.spyOn(implicitFlowCallbackService, "authenticatedImplicitFlowCallback")
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				callbackService.handleCallbackAndFireEvents(
					"anyUrlWithAHash#some-string",
					{ configId: "configId1" },
					[{ configId: "configId1" }],
				),
			);

			expect(authorizedCallbackWithCodeSpy.mock.calls).toEqual([
				[{ configId: "configId1" }, [{ configId: "configId1" }], "some-string"],
			]);
		});

		it("emits callbackinternal no matter which flow it is", async () => {
			const callbackSpy = vi.spyOn(
				(callbackService as any).stsCallbackInternal$,
				"next",
			);

			vi.spyOn(flowHelper, "isCurrentFlowCodeFlow").mockReturnValue(true);
			const authenticatedCallbackWithCodeSpy = vi
				.spyOn(codeFlowCallbackService, "authenticatedCallbackWithCode")
				.mockReturnValue(of({} as CallbackContext));

			await firstValueFrom(
				callbackService.handleCallbackAndFireEvents(
					"anyUrl",
					{ configId: "configId1" },
					[{ configId: "configId1" }],
				),
			);

			expect(authenticatedCallbackWithCodeSpy).toHaveBeenCalledExactlyOnceWith(
				"anyUrl",
				{ configId: "configId1" },
				[{ configId: "configId1" }],
			);
			expect(callbackSpy).toHaveBeenCalled();
		});
	});
});

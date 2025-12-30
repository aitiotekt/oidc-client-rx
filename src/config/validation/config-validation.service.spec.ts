import { vi } from "vitest";
import { TestBed } from "@/testing";
import { mockImplementationWhenArgs, spyOnWithOrigin } from "@/testing/spy";
import { LogLevel } from "../../logging/log-level";
import { LoggerService } from "../../logging/logger.service";
import { mockProvider } from "../../testing/mock";
import type { OpenIdConfiguration } from "../openid-configuration";
import { ConfigValidationService } from "./config-validation.service";
import { allMultipleConfigRules } from "./rules";

describe("Config Validation Service", () => {
	let configValidationService: ConfigValidationService;
	let loggerService: LoggerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ConfigValidationService, mockProvider(LoggerService)],
		});
		configValidationService = TestBed.inject(ConfigValidationService);
		loggerService = TestBed.inject(LoggerService);
	});

	const VALID_CONFIG = {
		authority: "https://offeringsolutions-sts.azurewebsites.net",
		redirectUrl: window.location.origin,
		postLogoutRedirectUri: window.location.origin,
		clientId: "angularClient",
		scope: "openid profile email",
		responseType: "code",
		silentRenew: true,
		silentRenewUrl: `${window.location.origin}/silent-renew.html`,
		renewTimeBeforeTokenExpiresInSeconds: 10,
		logLevel: LogLevel.Debug,
	};

	it("should create", () => {
		expect(configValidationService).toBeTruthy();
	});

	it("should return false for empty config", () => {
		const config = {};
		const result = configValidationService.validateConfig(config);

		expect(result).toBeFalsy();
	});

	it("should return true for valid config", () => {
		const result = configValidationService.validateConfig(VALID_CONFIG);

		expect(result).toBeTruthy();
	});

	it("calls `logWarning` if one rule has warning level", () => {
		const loggerWarningSpy = vi.spyOn(loggerService, "logWarning");
		const messageTypeSpy = spyOnWithOrigin(
			configValidationService,
			"getAllMessagesOfType" as any,
		);

		mockImplementationWhenArgs(
			messageTypeSpy,
			(arg1: any, arg2: any) => arg1 === "warning" && Array.isArray(arg2),
			() => ["A warning message"],
		);

		configValidationService.validateConfig(VALID_CONFIG);
		expect(loggerWarningSpy).toHaveBeenCalled();
	});

	describe("ensure-clientId.rule", () => {
		it("return false when no clientId is set", () => {
			const config = { ...VALID_CONFIG, clientId: "" } as OpenIdConfiguration;
			const result = configValidationService.validateConfig(config);

			expect(result).toBeFalsy();
		});
	});

	describe("ensure-authority-server.rule", () => {
		it("return false when no security token service is set", () => {
			const config = {
				...VALID_CONFIG,
				authority: "",
			} as OpenIdConfiguration;
			const result = configValidationService.validateConfig(config);

			expect(result).toBeFalsy();
		});
	});

	describe("ensure-redirect-url.rule", () => {
		it("return false for no redirect Url", () => {
			const config = { ...VALID_CONFIG, redirectUrl: "" };
			const result = configValidationService.validateConfig(config);

			expect(result).toBeFalsy();
		});
	});

	describe("ensureSilentRenewUrlWhenNoRefreshTokenUsed", () => {
		it("return false when silent renew is used with no useRefreshToken and no silentrenewUrl", () => {
			const config = {
				...VALID_CONFIG,
				silentRenew: true,
				useRefreshToken: false,
				silentRenewUrl: "",
			} as OpenIdConfiguration;
			const result = configValidationService.validateConfig(config);

			expect(result).toBeFalsy();
		});
	});

	describe("use-offline-scope-with-silent-renew.rule", () => {
		it("return true but warning when silent renew is used with useRefreshToken but no offline_access scope is given", () => {
			const config = {
				...VALID_CONFIG,
				silentRenew: true,
				useRefreshToken: true,
				scopes: "scope1 scope2 but_no_offline_access",
			};

			const loggerSpy = vi.spyOn(loggerService, "logError");
			const loggerWarningSpy = vi.spyOn(loggerService, "logWarning");

			const result = configValidationService.validateConfig(config);

			expect(result).toBeTruthy();
			expect(loggerSpy).not.toHaveBeenCalled();
			expect(loggerWarningSpy).toHaveBeenCalled();
		});
	});

	describe("ensure-no-duplicated-configs.rule", () => {
		it("should print out correct error when mutiple configs with same properties are passed", () => {
			const config1 = {
				...VALID_CONFIG,
				silentRenew: true,
				useRefreshToken: true,
				scopes: "scope1 scope2 but_no_offline_access",
			};
			const config2 = {
				...VALID_CONFIG,
				silentRenew: true,
				useRefreshToken: true,
				scopes: "scope1 scope2 but_no_offline_access",
			};

			const loggerErrorSpy = vi.spyOn(loggerService, "logError");
			const loggerWarningSpy = vi.spyOn(loggerService, "logWarning");

			const result = configValidationService.validateConfigs([
				config1,
				config2,
			]);

			expect(result).toBeTruthy();
			expect(loggerErrorSpy).not.toHaveBeenCalled();
			expect(vi.mocked(loggerWarningSpy).mock.calls[0]).toEqual([
				config1,
				"You added multiple configs with the same authority, clientId and scope",
			]);
			expect(vi.mocked(loggerWarningSpy).mock.calls[1]).toEqual([
				config2,
				"You added multiple configs with the same authority, clientId and scope",
			]);
		});

		it("should return false and a better error message when config is not passed as object with config property", () => {
			const loggerWarningSpy = vi.spyOn(loggerService, "logWarning");

			const result = configValidationService.validateConfigs([]);

			expect(result).toBeFalsy();
			expect(loggerWarningSpy).not.toHaveBeenCalled();
		});
	});

	describe("validateConfigs", () => {
		it("calls internal method with empty array if something falsy is passed", () => {
			const spy = vi.spyOn(
				configValidationService as any,
				"validateConfigsInternal",
			);

			const result = configValidationService.validateConfigs([]);

			expect(result).toBeFalsy();
			expect(spy).toHaveBeenCalledExactlyOnceWith([], allMultipleConfigRules);
		});
	});
});

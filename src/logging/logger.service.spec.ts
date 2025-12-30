import { vi } from "vitest";
import { TestBed } from "@/testing";
import { AbstractLoggerService } from "./abstract-logger.service";
import { ConsoleLoggerService } from "./console-logger.service";
import { LogLevel } from "./log-level";
import { LoggerService } from "./logger.service";

describe("Logger Service", () => {
	let loggerService: LoggerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				LoggerService,
				{ provide: AbstractLoggerService, useClass: ConsoleLoggerService },
			],
		});
		loggerService = TestBed.inject(LoggerService);
	});

	it("should create", () => {
		expect(loggerService).toBeTruthy();
	});

	describe("logError", () => {
		it("should not log error if loglevel is None", () => {
			const spy = vi.spyOn(console, "error");

			loggerService.logError(
				{ configId: "configId1", logLevel: LogLevel.None },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should log error as default if error is string", () => {
			const spy = vi.spyOn(console, "error");

			loggerService.logError({ configId: "configId1" }, "some message");
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[ERROR] configId1 - some message",
			);
		});

		it("should log error as default if error is object", () => {
			const spy = vi.spyOn(console, "error");

			loggerService.logError({ configId: "configId1" }, { some: "message" });
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				'[ERROR] configId1 - {"some":"message"}',
			);
		});

		it("should always log error with args", () => {
			const spy = vi.spyOn(console, "error");

			loggerService.logError(
				{ configId: "configId1" },
				"some message",
				"arg1",
				"arg2",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[ERROR] configId1 - some message",
				"arg1",
				"arg2",
			);
		});
	});

	describe("logWarn", () => {
		it("should not log if no log level is set (null)", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: undefined },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log if no config is given", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning({}, "some message");
			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log if no log level is set (undefined)", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning({ configId: "configId1" }, "some message");

			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log if log level is turned off", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.None },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should log warning when loglevel is Warn and message is string", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.Warn },
				"some message",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[WARN] configId1 - some message",
			);
		});

		it("should log warning when loglevel is Warn and message is object", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.Warn },
				{ some: "message" },
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				'[WARN] configId1 - {"some":"message"}',
			);
		});

		it("should log warning when loglevel is Warn with args", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.Warn },
				"some message",
				"arg1",
				"arg2",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[WARN] configId1 - some message",
				"arg1",
				"arg2",
			);
		});

		it("should log warning when loglevel is Debug", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.Debug },
				"some message",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[WARN] configId1 - some message",
			);
		});

		it("should not log warning when loglevel is error", () => {
			const spy = vi.spyOn(console, "warn");

			loggerService.logWarning(
				{ configId: "configId1", logLevel: LogLevel.Error },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe("logDebug", () => {
		it("should not log if no log level is set (null)", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: undefined },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log if no log level is set (undefined)", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug({ configId: "configId1" }, "some message");
			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log if log level is turned off", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.None },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should log when loglevel is Debug and value is string", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.Debug },
				"some message",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[DEBUG] configId1 - some message",
			);
		});

		it("should log when loglevel is Debug and value is object", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.Debug },
				{ some: "message" },
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				'[DEBUG] configId1 - {"some":"message"}',
			);
		});

		it("should log when loglevel is Debug with args", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.Debug },
				"some message",
				"arg1",
				"arg2",
			);
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				"[DEBUG] configId1 - some message",
				"arg1",
				"arg2",
			);
		});

		it("should not log when loglevel is Warn", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.Warn },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});

		it("should not log when loglevel is error", () => {
			const spy = vi.spyOn(console, "debug");

			loggerService.logDebug(
				{ configId: "configId1", logLevel: LogLevel.Error },
				"some message",
			);
			expect(spy).not.toHaveBeenCalled();
		});
	});
});

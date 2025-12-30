import { vi } from "vitest";
import { TestBed } from "@/testing";
import { FlowHelper } from "./flow-helper.service";

describe("Flow Helper Service", () => {
	let flowHelper: FlowHelper;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [FlowHelper],
		});
		flowHelper = TestBed.inject(FlowHelper);
	});

	it("should create", () => {
		expect(flowHelper).toBeTruthy();
	});

	it("isCurrentFlowCodeFlow returns false if current flow is not code flow", () => {
		const config = { responseType: "id_token token", configId: "configId1" };

		expect(flowHelper.isCurrentFlowCodeFlow(config)).toBeFalsy();
	});

	it("isCurrentFlowCodeFlow returns true if current flow is code flow", () => {
		const config = { responseType: "code" };

		expect(flowHelper.isCurrentFlowCodeFlow(config)).toBeTruthy();
	});

	it("currentFlowIs returns true if current flow is code flow", () => {
		const config = { responseType: "code" };

		expect(flowHelper.currentFlowIs("code", config)).toBeTruthy();
	});

	it("currentFlowIs returns true if current flow is code flow (array)", () => {
		const config = { responseType: "code" };

		expect(flowHelper.currentFlowIs(["code"], config)).toBeTruthy();
	});

	it("currentFlowIs returns true if current flow is id_token token or code (array)", () => {
		const config = { responseType: "id_token token" };

		expect(
			flowHelper.currentFlowIs(["id_token token", "code"], config),
		).toBeTruthy();
	});

	it("currentFlowIs returns true if current flow is code flow", () => {
		const config = { responseType: "id_token token" };

		expect(flowHelper.currentFlowIs("code", config)).toBeFalsy();
	});

	it('isCurrentFlowImplicitFlowWithAccessToken return true if flow is "id_token token"', () => {
		const config = { responseType: "id_token token" };

		const result = flowHelper.isCurrentFlowImplicitFlowWithAccessToken(config);

		expect(result).toBeTruthy();
	});

	it('isCurrentFlowImplicitFlowWithAccessToken return false if flow is not "id_token token"', () => {
		const config = { responseType: "id_token2 token2" };

		const result = flowHelper.isCurrentFlowImplicitFlowWithAccessToken(config);

		expect(result).toBeFalsy();
	});

	it('isCurrentFlowImplicitFlowWithoutAccessToken return true if flow is "id_token"', () => {
		const config = { responseType: "id_token" };

		const result = (
			flowHelper as any
		).isCurrentFlowImplicitFlowWithoutAccessToken(config);

		expect(result).toBeTruthy();
	});

	it('isCurrentFlowImplicitFlowWithoutAccessToken return false if flow is not "id_token token"', () => {
		const config = { responseType: "id_token2" };

		const result = (
			flowHelper as any
		).isCurrentFlowImplicitFlowWithoutAccessToken(config);

		expect(result).toBeFalsy();
	});

	it("isCurrentFlowCodeFlowWithRefreshTokens return false if flow is not code flow", () => {
		const config = { responseType: "not code" };

		const result = flowHelper.isCurrentFlowCodeFlowWithRefreshTokens(config);

		expect(result).toBeFalsy();
	});

	it("isCurrentFlowCodeFlowWithRefreshTokens return false if useRefreshToken is set to false", () => {
		const config = { responseType: "not code", useRefreshToken: false };

		const result = flowHelper.isCurrentFlowCodeFlowWithRefreshTokens(config);

		expect(result).toBeFalsy();
	});

	it("isCurrentFlowCodeFlowWithRefreshTokens return true if useRefreshToken is set to true and code flow", () => {
		const config = { responseType: "code", useRefreshToken: true };

		const result = flowHelper.isCurrentFlowCodeFlowWithRefreshTokens(config);

		expect(result).toBeTruthy();
	});

	describe("isCurrentFlowAnyImplicitFlow", () => {
		it("returns true if currentFlowIsImplicitFlowWithAccessToken is true", () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowImplicitFlowWithAccessToken",
			).mockReturnValue(true);
			vi.spyOn(
				flowHelper as any,
				"isCurrentFlowImplicitFlowWithoutAccessToken",
			).mockReturnValue(false);

			const result = flowHelper.isCurrentFlowAnyImplicitFlow({
				configId: "configId1",
			});

			expect(result).toBeTruthy();
		});

		it("returns true if isCurrentFlowImplicitFlowWithoutAccessToken is true", () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowImplicitFlowWithAccessToken",
			).mockReturnValue(false);
			vi.spyOn(
				flowHelper as any,
				"isCurrentFlowImplicitFlowWithoutAccessToken",
			).mockReturnValue(true);

			const result = flowHelper.isCurrentFlowAnyImplicitFlow({
				configId: "configId1",
			});

			expect(result).toBeTruthy();
		});

		it("returns false it is not any implicit flow", () => {
			vi.spyOn(
				flowHelper,
				"isCurrentFlowImplicitFlowWithAccessToken",
			).mockReturnValue(false);
			vi.spyOn(
				flowHelper as any,
				"isCurrentFlowImplicitFlowWithoutAccessToken",
			).mockReturnValue(false);

			const result = flowHelper.isCurrentFlowAnyImplicitFlow({
				configId: "configId1",
			});

			expect(result).toBeFalsy();
		});
	});
});

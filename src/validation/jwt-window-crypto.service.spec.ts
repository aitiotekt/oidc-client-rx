import { firstValueFrom } from "rxjs";
import { TestBed } from "@/testing";
import { CryptoService } from "../utils/crypto/crypto.service";
import { JwtWindowCryptoService } from "./jwt-window-crypto.service";

describe("JwtWindowCryptoService", () => {
	let service: JwtWindowCryptoService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [],
			providers: [JwtWindowCryptoService, CryptoService],
		});
		service = TestBed.inject(JwtWindowCryptoService);
	});

	it("should create", () => {
		expect(service).toBeTruthy();
	});

	describe("generateCodeChallenge", () => {
		it("returns good result with correct codeVerifier", async () => {
			const outcome = "R2TWD45Vtcf_kfAqjuE3LMSRF3JDE5fsFndnn6-a0nQ";
			const observable = service.generateCodeChallenge(
				"44445543344242132145455aaabbdc3b4",
			);

			const value = await firstValueFrom(observable);
			expect(value).toBe(outcome);
		});
	});
});

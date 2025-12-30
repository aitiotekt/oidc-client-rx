import { of } from "rxjs";
import { TestBed } from "@/testing";
import { mockProvider } from "@/testing/mock";
import { PASSED_CONFIG } from "./auth-config";
import { ConfigurationService } from "./config/config.service";
import {
	StsConfigHttpLoader,
	StsConfigLoader,
	StsConfigStaticLoader,
} from "./config/loader/config-loader";
import { provideAuth } from "./provide-auth";

describe("provideAuth", () => {
	describe("APP_CONFIG", () => {
		beforeEach(async () => {
			await TestBed.configureTestingModule({
				providers: [
					provideAuth({ config: { authority: "something" } }),
					mockProvider(ConfigurationService),
				],
			}).compileComponents();
		});

		it("should provide config", () => {
			const config = TestBed.inject(PASSED_CONFIG);

			expect(config).toEqual({ config: { authority: "something" } });
		});

		it("should create StsConfigStaticLoader if config is passed", () => {
			const configLoader = TestBed.inject(StsConfigLoader);

			expect(configLoader instanceof StsConfigStaticLoader).toBe(true);
		});
	});

	describe("StsConfigHttpLoader", () => {
		beforeEach(async () => {
			await TestBed.configureTestingModule({
				providers: [
					provideAuth({
						loader: {
							provide: StsConfigLoader,
							useFactory: () => new StsConfigHttpLoader(of({})),
						},
					}),
					mockProvider(ConfigurationService),
				],
			}).compileComponents();
		});

		it("should create StsConfigStaticLoader if config is passed", () => {
			const configLoader = TestBed.inject(StsConfigLoader);

			expect(configLoader instanceof StsConfigHttpLoader).toBe(true);
		});
	});

	// describe('features', () => {
	//   let oidcSecurityServiceMock: OidcSecurityService;
	//   let spy: any;

	//   beforeEach(async () => {
	//     //@ts-expect-error

	//     oidcSecurityServiceMock = new (mockClass(OidcSecurityService))();
	//     spy = vi.spyOn(oidcSecurityServiceMock, 'checkAuthMultiple');
	//     await TestBed.configureTestingModule({
	//       providers: [
	//         provideAuth(
	//           { config: { authority: 'something' } },
	//           withAppInitializerAuthCheck()
	//         ),
	//         mockProvider(ConfigurationService),
	//         {
	//           provide: OidcSecurityService,
	//           useValue: oidcSecurityServiceMock,
	//         },
	//       ],
	//     }).compileComponents();
	//   });

	// it('should provide APP_INITIALIZER config', () => {
	//   const config = TestBed.inject(APP_INITIALIZER);
	//   expect(
	//     config.length,
	//     'Expected an APP_INITIALIZER to be registered'
	//   ).toBe(1);
	//   expect(spy).toHaveBeenCalledTimes(1);
	// });
	// });
});

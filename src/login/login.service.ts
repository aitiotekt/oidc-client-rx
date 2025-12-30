import { Injectable, inject } from "injection-js";
import { BehaviorSubject, type Observable, of, throwError } from "rxjs";
import { MockUtil } from "src/utils/reflect";
import type { AuthOptions } from "../auth-options";
import type { OpenIdConfiguration } from "../config/openid-configuration";
import { StoragePersistenceService } from "../storage/storage-persistence.service";
import type { LoginResponse } from "./login-response";
import { ParLoginService } from "./par/par-login.service";
import { PopUpService } from "./popup/popup.service";
import { PopUpLoginService } from "./popup/popup-login.service";
import type { PopupOptions } from "./popup/popup-options";
import { StandardLoginService } from "./standard/standard-login.service";

@Injectable()
export class LoginService {
	private readonly parLoginService = inject(ParLoginService);

	private readonly popUpLoginService = inject(PopUpLoginService);

	private readonly standardLoginService = inject(StandardLoginService);

	private readonly storagePersistenceService = inject(
		StoragePersistenceService,
	);

	private readonly popupService = inject(PopUpService);

	@MockUtil({ implementation: () => new BehaviorSubject(undefined) })
	login(
		configuration: OpenIdConfiguration | null,
		authOptions?: AuthOptions,
	): Observable<void> {
		if (!configuration) {
			return throwError(
				() =>
					new Error(
						"Please provide a configuration before setting up the module",
					),
			);
		}

		const { usePushedAuthorisationRequests } = configuration;

		if (authOptions?.customParams) {
			this.storagePersistenceService.write(
				"storageCustomParamsAuthRequest",
				authOptions.customParams,
				configuration,
			);
		}

		if (usePushedAuthorisationRequests) {
			return this.parLoginService.loginPar(configuration, authOptions);
		}
		return this.standardLoginService.loginStandard(configuration, authOptions);
	}

	loginWithPopUp(
		configuration: OpenIdConfiguration | null,
		allConfigs: OpenIdConfiguration[],
		authOptions?: AuthOptions,
		popupOptions?: PopupOptions,
	): Observable<LoginResponse> {
		if (!configuration) {
			throw new Error(
				"Please provide a configuration before setting up the module",
			);
		}

		const isAlreadyInPopUp =
			this.popupService.isCurrentlyInPopup(configuration);

		if (isAlreadyInPopUp) {
			return of({
				errorMessage: "There is already a popup open.",
			} as LoginResponse);
		}

		const { usePushedAuthorisationRequests } = configuration;

		if (authOptions?.customParams) {
			this.storagePersistenceService.write(
				"storageCustomParamsAuthRequest",
				authOptions.customParams,
				configuration,
			);
		}

		if (usePushedAuthorisationRequests) {
			return this.parLoginService.loginWithPopUpPar(
				configuration,
				allConfigs,
				authOptions,
				popupOptions,
			);
		}

		return this.popUpLoginService.loginWithPopUpStandard(
			configuration,
			allConfigs,
			authOptions,
			popupOptions,
		);
	}
}

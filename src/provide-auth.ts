import type { Provider } from "injection-js";
import { DataService } from "./api/data.service";
import { HttpBaseService } from "./api/http-base.service";
import {
	createStaticLoader,
	PASSED_CONFIG,
	type PassedInitialConfig,
} from "./auth-config";
import { AuthStateService } from "./auth-state/auth-state.service";
import { CheckAuthService } from "./auth-state/check-auth.service";
import { AutoLoginService } from "./auto-login/auto-login.service";
import { CallbackService } from "./callback/callback.service";
import { CodeFlowCallbackService } from "./callback/code-flow-callback.service";
import { ImplicitFlowCallbackService } from "./callback/implicit-flow-callback.service";
import { IntervalService } from "./callback/interval.service";
import { PeriodicallyTokenCheckService } from "./callback/periodically-token-check.service";
import { RefreshSessionService } from "./callback/refresh-session.service";
import { RefreshSessionRefreshTokenService } from "./callback/refresh-session-refresh-token.service";
import { AuthWellKnownService } from "./config/auth-well-known/auth-well-known.service";
import { AuthWellKnownDataService } from "./config/auth-well-known/auth-well-known-data.service";
import { ConfigurationService } from "./config/config.service";
import { StsConfigLoader } from "./config/loader/config-loader";
import { ConfigValidationService } from "./config/validation/config-validation.service";
import { JwkExtractor } from "./extractors/jwk.extractor";
import type { AuthFeature } from "./features";
import { CodeFlowCallbackHandlerService } from "./flows/callback-handling/code-flow-callback-handler.service";
import { HistoryJwtKeysCallbackHandlerService } from "./flows/callback-handling/history-jwt-keys-callback-handler.service";
import { ImplicitFlowCallbackHandlerService } from "./flows/callback-handling/implicit-flow-callback-handler.service";
import { RefreshSessionCallbackHandlerService } from "./flows/callback-handling/refresh-session-callback-handler.service";
import { RefreshTokenCallbackHandlerService } from "./flows/callback-handling/refresh-token-callback-handler.service";
import { StateValidationCallbackHandlerService } from "./flows/callback-handling/state-validation-callback-handler.service";
import { UserCallbackHandlerService } from "./flows/callback-handling/user-callback-handler.service";
import { FlowsService } from "./flows/flows.service";
import { FlowsDataService } from "./flows/flows-data.service";
import { RandomService } from "./flows/random/random.service";
import { ResetAuthDataService } from "./flows/reset-auth-data.service";
import { SigninKeyDataService } from "./flows/signin-key-data.service";
import { CheckSessionService } from "./iframe/check-session.service";
import { IFrameService } from "./iframe/existing-iframe.service";
import { RefreshSessionIframeService } from "./iframe/refresh-session-iframe.service";
import { SilentRenewService } from "./iframe/silent-renew.service";
import { ClosestMatchingRouteService } from "./interceptor/closest-matching-route.service";
import { AbstractLoggerService } from "./logging/abstract-logger.service";
import { ConsoleLoggerService } from "./logging/console-logger.service";
import { LoggerService } from "./logging/logger.service";
import { LoginService } from "./login/login.service";
import { ParService } from "./login/par/par.service";
import { ParLoginService } from "./login/par/par-login.service";
import { PopUpService } from "./login/popup/popup.service";
import { PopUpLoginService } from "./login/popup/popup-login.service";
import { ResponseTypeValidationService } from "./login/response-type-validation/response-type-validation.service";
import { StandardLoginService } from "./login/standard/standard-login.service";
import { LogoffRevocationService } from "./logoff-revoke/logoff-revocation.service";
import { OidcSecurityService } from "./oidc.security.service";
import { PublicEventsService } from "./public-events/public-events.service";
import { AbstractSecurityStorage } from "./storage/abstract-security-storage";
import { BrowserStorageService } from "./storage/browser-storage.service";
import { DefaultSessionStorageService } from "./storage/default-sessionstorage.service";
import { StoragePersistenceService } from "./storage/storage-persistence.service";
import { UserService } from "./user-data/user.service";
import { CryptoService } from "./utils/crypto/crypto.service";
import { EqualityService } from "./utils/equality/equality.service";
import { FlowHelper } from "./utils/flowHelper/flow-helper.service";
import { PlatformProvider } from "./utils/platform-provider/platform.provider";
import { RedirectService } from "./utils/redirect/redirect.service";
import { TokenHelperService } from "./utils/tokenHelper/token-helper.service";
import { CurrentUrlService } from "./utils/url/current-url.service";
import { UrlService } from "./utils/url/url.service";
import { JwkWindowCryptoService } from "./validation/jwk-window-crypto.service";
import { JwtWindowCryptoService } from "./validation/jwt-window-crypto.service";
import { StateValidationService } from "./validation/state-validation.service";
import { TokenValidationService } from "./validation/token-validation.service";

export function provideAuth(
	passedConfig: PassedInitialConfig,
	...features: (AuthFeature | AuthFeature[])[]
): Provider[] {
	const providers = _provideAuth(passedConfig);

	const normailizedFeatures = features
		.flat(Number.MAX_SAFE_INTEGER)
		.filter(Boolean) as AuthFeature[];

	for (const feature of normailizedFeatures) {
		providers.push(...feature.ɵproviders);
	}

	return providers;
}

export function _provideAuth(passedConfig: PassedInitialConfig): Provider[] {
	return [
		// Make the PASSED_CONFIG available through injection
		{ provide: PASSED_CONFIG, useValue: passedConfig },
		// Create the loader: Either the one getting passed or a static one
		passedConfig?.loader || {
			provide: StsConfigLoader,
			useFactory: createStaticLoader,
			deps: [PASSED_CONFIG],
		},
		{
			provide: AbstractSecurityStorage,
			useClass: DefaultSessionStorageService,
		},
		{ provide: AbstractLoggerService, useClass: ConsoleLoggerService },
		StandardLoginService,
		JwkWindowCryptoService,
		ParLoginService,
		AuthStateService,
		RefreshTokenCallbackHandlerService,
		JwkExtractor,
		TokenHelperService,
		RefreshSessionIframeService,
		ImplicitFlowCallbackHandlerService,
		CallbackService,
		EqualityService,
		FlowsDataService,
		PopUpService,
		FlowsService,
		StoragePersistenceService,
		ClosestMatchingRouteService,
		CryptoService,
		AutoLoginService,
		RedirectService,
		LoginService,
		CurrentUrlService,
		UserCallbackHandlerService,
		IFrameService,
		BrowserStorageService,
		ParService,
		LoggerService,
		RandomService,
		PopUpLoginService,
		AuthWellKnownService,
		RefreshSessionRefreshTokenService,
		CodeFlowCallbackService,
		StateValidationService,
		FlowHelper,
		ImplicitFlowCallbackService,
		PublicEventsService,
		CodeFlowCallbackHandlerService,
		UrlService,
		ConfigValidationService,
		RefreshSessionService,
		HttpBaseService,
		AuthWellKnownDataService,
		CheckAuthService,
		SilentRenewService,
		StateValidationCallbackHandlerService,
		JwtWindowCryptoService,
		ResetAuthDataService,
		IntervalService,
		LogoffRevocationService,
		HistoryJwtKeysCallbackHandlerService,
		PlatformProvider,
		RefreshSessionCallbackHandlerService,
		CheckSessionService,
		ConfigurationService,
		ResponseTypeValidationService,
		DataService,
		UserService,
		PeriodicallyTokenCheckService,
		SigninKeyDataService,
		TokenValidationService,
		OidcSecurityService,
	];
}

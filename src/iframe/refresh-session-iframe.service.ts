import { Injectable, inject } from "injection-js";
import {
	fromEventPattern,
	Observable,
	ReplaySubject,
	type Subscription,
} from "rxjs";
import { filter, share, switchMap, takeUntil } from "rxjs/operators";
import type { OpenIdConfiguration } from "../config/openid-configuration";
import { DOCUMENT } from "../dom";
import { LoggerService } from "../logging/logger.service";
import { UrlService } from "../utils/url/url.service";
import { SilentRenewService } from "./silent-renew.service";

@Injectable()
export class RefreshSessionIframeService {
	private readonly loggerService = inject(LoggerService);

	private readonly urlService = inject(UrlService);

	private readonly silentRenewService = inject(SilentRenewService);

	private readonly document = inject(DOCUMENT);

	private silentRenewEventHandlerSubscription?: Subscription;

	refreshSessionWithIframe(
		config: OpenIdConfiguration,
		allConfigs: OpenIdConfiguration[],
		customParams?: { [key: string]: string | number | boolean },
	): Observable<boolean> {
		this.loggerService.logDebug(
			config,
			"BEGIN refresh session Authorize Iframe renew",
		);

		return this.urlService
			.getRefreshSessionSilentRenewUrl(config, customParams)
			.pipe(
				switchMap((url) => {
					return this.sendAuthorizeRequestUsingSilentRenew(
						url,
						config,
						allConfigs,
					);
				}),
			);
	}

	private sendAuthorizeRequestUsingSilentRenew(
		url: string | null,
		config: OpenIdConfiguration,
		allConfigs: OpenIdConfiguration[],
	): Observable<boolean> {
		const sessionIframe = this.silentRenewService.getOrCreateIframe(config);

		this.initSilentRenewRequest(config, allConfigs);
		this.loggerService.logDebug(
			config,
			`sendAuthorizeRequestUsingSilentRenew for URL: ${url}`,
		);

		return new Observable((observer) => {
			const onLoadHandler = (): void => {
				sessionIframe.removeEventListener("load", onLoadHandler);
				this.loggerService.logDebug(
					config,
					"removed event listener from IFrame",
				);
				observer.next(true);
				observer.complete();
			};

			sessionIframe.addEventListener("load", onLoadHandler);
			sessionIframe.contentWindow?.location.replace(url ?? "");
		});
	}

	private initSilentRenewRequest(
		config: OpenIdConfiguration,
		allConfigs: OpenIdConfiguration[],
	): void {
		const instanceId = Math.random();

		const oidcSilentRenewInit$ = fromEventPattern<CustomEvent>(
			(handler) =>
				this.document.defaultView?.window?.addEventListener(
					"oidc-silent-renew-init",
					handler,
				),
			(handler) =>
				this.document.defaultView?.window?.removeEventListener(
					"oidc-silent-renew-init",
					handler,
				),
		);

		const oidcSilentRenewInitNotSelf$ = oidcSilentRenewInit$.pipe(
			filter((e: CustomEvent) => e.detail !== instanceId),
		);

		if (this.silentRenewEventHandlerSubscription) {
			this.silentRenewEventHandlerSubscription.unsubscribe();
		}
		this.silentRenewEventHandlerSubscription = fromEventPattern<CustomEvent>(
			(handler) =>
				this.document.defaultView?.window?.addEventListener(
					"oidc-silent-renew-message",
					handler,
				),
			(handler) =>
				this.document.defaultView?.window?.removeEventListener(
					"oidc-silent-renew-message",
					handler,
				),
		)
			.pipe(
				takeUntil(oidcSilentRenewInitNotSelf$),
				switchMap((e) =>
					this.silentRenewService.silentRenewEventHandler(
						e,
						config,
						allConfigs,
					),
				),
				share({
					connector: () => new ReplaySubject(1),
					resetOnError: false,
					resetOnComplete: false,
					resetOnRefCountZero: true,
				}),
			)
			.subscribe();

		this.document.defaultView?.window.dispatchEvent(
			new CustomEvent("oidc-silent-renew-init", {
				detail: instanceId,
			}),
		);
	}
}

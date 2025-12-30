import type { AnyRouter, RouterEvents } from "@tanstack/solid-router";
import { InjectionToken, inject } from "injection-js";
import { fromEventPattern, takeUntil } from "rxjs";
import type { AuthFeature } from "../../features";
import { DESTORY_REF } from "../../resources";
import { AbstractRouter, ROUTER_ABS_PATH_PATTERN } from "../../router";

export type TanStackRouter = AnyRouter;

export const TANSTACK_ROUTER = new InjectionToken<TanStackRouter>(
	"TANSTACK_ROUTER",
);

export class TanStackRouterAdapter implements AbstractRouter<string> {
	private router = inject(TANSTACK_ROUTER);
	private beforeLoadToLocation:
		| RouterEvents["onBeforeLoad"]["toLocation"]
		| null = null;
	private destoryRef$ = inject(DESTORY_REF);

	constructor() {
		fromEventPattern<RouterEvents["onBeforeLoad"]>(
			(handler) => this.router.subscribe("onBeforeLoad", handler),
			(unsubscribe) => unsubscribe(),
		)
			.pipe(takeUntil(this.destoryRef$))
			.subscribe((event) => {
				this.beforeLoadToLocation = event.toLocation;
			});

		fromEventPattern<RouterEvents["onResolved"]>(
			(handler) => this.router.subscribe("onResolved", handler),
			(unsubscribe) => unsubscribe(),
		)
			.pipe(takeUntil(this.destoryRef$))
			.subscribe(() => {
				this.beforeLoadToLocation = null;
			});
	}

	navigateByUrl(url: string): void {
		this.router.navigate({
			href: ROUTER_ABS_PATH_PATTERN.test(url) ? url : `/${url}`,
		});
	}

	getCurrentNavigation() {
		return {
			extractedUrl:
				this.beforeLoadToLocation?.href || this.router.state.location.href,
		};
	}
}

export function withTanstackRouter(router: TanStackRouter): AuthFeature {
	return {
		ɵproviders: [
			{
				provide: TANSTACK_ROUTER,
				useValue: router,
			},
			{
				provide: AbstractRouter,
				useClass: TanStackRouterAdapter,
			},
		],
	};
}

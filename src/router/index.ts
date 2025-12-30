import { inject } from "injection-js";
import { DOCUMENT } from "src/dom";

export type RouteData = {
	[key: string | symbol]: any;
};

export interface ActivatedRouteSnapshot {
	data: RouteData;
}

export interface RouterStateSnapshot {
	url: string;
}

export interface UrlTree {
	toString(): string;
}

export interface Navigation<URL extends UrlTree = UrlTree> {
	extractedUrl: URL;
}

export abstract class AbstractRouter<
	URL extends UrlTree = UrlTree,
	NAVIGATION extends Navigation<URL> = Navigation<URL>,
> {
	abstract navigateByUrl(url: string): void;

	abstract getCurrentNavigation(): NAVIGATION;
}

export const ROUTER_ABS_PATH_PATTERN = /^\//;

export class VanillaLocationRouter extends AbstractRouter<string> {
	protected document = inject(DOCUMENT);

	private get location(): Location {
		const location = this.document.defaultView?.window?.location;
		if (!location) {
			throw new Error("current document do not support Location API");
		}
		return location;
	}

	navigateByUrl(url: string): void {
		this.location.href = ROUTER_ABS_PATH_PATTERN.test(url) ? url : `/${url}`;
	}

	getCurrentNavigation() {
		return {
			extractedUrl: `${this.location.pathname}${this.location.search}${this.location.hash}`,
		};
	}
}

export class VanillaHistoryRouter extends AbstractRouter<string> {
	private document = inject(DOCUMENT);

	private get history(): History {
		const history = this.document.defaultView?.window?.history;
		if (!history) {
			throw new Error("current document do not support History API");
		}
		return history;
	}

	private get location(): Location {
		const location = this.document.defaultView?.window?.location;
		if (!location) {
			throw new Error("current document do not support Location API");
		}
		return location;
	}

	navigateByUrl(url: string): void {
		this.history.pushState(
			{},
			"",
			ROUTER_ABS_PATH_PATTERN.test(url) ? url : `/${url}`,
		);
	}

	getCurrentNavigation() {
		return {
			extractedUrl: `${this.location.pathname}${this.location.search}${this.location.hash}`,
		};
	}
}

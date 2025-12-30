import { InjectionToken, inject } from "injection-js";
import { filter, type Observable, shareReplay } from "rxjs";
import { EventTypes } from "../public-events/event-types";
import { PublicEventsService } from "../public-events/public-events.service";
import type { AuthFeature } from "./core";

export type CheckAuthResultEventType =
	| { type: EventTypes.CheckingAuthFinished }
	| {
			type: EventTypes.CheckingAuthFinishedWithError;
			value: string;
	  };

export const CHECK_AUTH_RESULT_EVENT = new InjectionToken<
	Observable<CheckAuthResultEventType>
>("CHECK_AUTH_RESULT_EVENT");

export interface WithCheckAuthResultEventProps {
	shareReplayCount?: number;
}

export function withCheckAuthResultEvent({
	shareReplayCount = 1,
}: WithCheckAuthResultEventProps = {}): AuthFeature {
	return {
		ɵproviders: [
			{
				provide: CHECK_AUTH_RESULT_EVENT,
				useFactory: () => {
					const publishEventService = inject(PublicEventsService);

					return publishEventService.registerForEvents().pipe(
						filter(
							(e) =>
								e.type === EventTypes.CheckingAuthFinishedWithError ||
								e.type === EventTypes.CheckingAuthFinished,
						),
						shareReplay(shareReplayCount),
					);
				},
				deps: [PublicEventsService],
			},
		],
	};
}
